import collections
from collections import OrderedDict

import math
import itertools
import re

import shapely.geometry
import shapely.strtree
import shapely.speedups
from shapely.geometry.point import Point

assert shapely.speedups.enabled

MINIMUM_CONTACT_AREA = 0.02

EXTRUSION_TEMPERATURE = 220.0

FILAMENT_DIAMETER = 1.75  # mm

XY_PRINTER_RESOLUTION = 0.05  # mm

# maximum resolution of the printer, make sure the slicer does not create shorter segments
MINIMUM_SEGMENT_LENGTH = XY_PRINTER_RESOLUTION

# the maximum resolution of the thermal simulation
MAXIMUM_SEGMENT_LENGTH = 2  # mm

NOZZLE_AREA = 0.25 * math.pi * (FILAMENT_DIAMETER ** 2)  # mm^2

# material constants
# material name: density (in kg/m^3), heat capacity (in J/(kg*K)), thermal conductivity (W/(m*K)
_MATERIALS = {"ABS": (1050, 1900, 0.177), "PETG": (1260, 1200, 0.2)}  # source: matweb (petg), Yaqi Zhang (ABS)
_PRINTED_MATERIAL = "PETG"
_DENSITY = _MATERIALS[_PRINTED_MATERIAL][0]
_CAPACITY = _MATERIALS[_PRINTED_MATERIAL][1]
# in J/(m³*K)
VOLUMETRIC_HEAT_CAPACITY = _DENSITY * _CAPACITY
THERMAL_CONDUCTIVITY = _MATERIALS[_PRINTED_MATERIAL][2]
# Plastics 0.90 - 0.97, Yaqi Zhang: 0.96, 0.92 from https://www.osti.gov/biblio/1341825
EMISSIVITY = 0.92

# thermal simulation constants
# "gap conductance between roads" = 100 (Yaqi Zhang)
# https://doi.org/10.1122/1.5093033 uses a value between 1000 und 10000 (3000)
HC_ROAD = 3000

# Heat transfer coefficient (Wärmeübergangskoeffizient) in W/(m²*K)
# ~100 when using strong cooling (impingment cooling directly after plastic sheet extrusion, from literature)
# assuming 75 when proper cooling the build chamber, e.g.Stratasys
# assuming 12-25 without active cooling, see https://www.schweizer-fn.de/stoff/wuebergang_gase/wuebergang_gase.php
ENVIRONMENT_CONVECTION_COEFFICIENT = 50

environment_temperature = 25
# used for radiation
BOLTZMAN_CONSTANT = 5.6703e-8
abs_zero_temp = -273.15
ENVIRONMENT_TEMPERATURE_IN_KELVIN = environment_temperature - abs_zero_temp


class Road(object):
    """
    Units: mm, s
    """
    __slots__ = 'gcode_line_number', \
                'start_x', \
                'start_y', \
                'end_x', \
                'end_y', \
                'width', \
                'length', \
                'layer_height', \
                'layer_number', \
                'duration', \
                'free_area', \
                'contacts', \
                'geometry', \
                'temperature', \
                'heat_capacity', \
                'duration_temp_above_hdt', \
                'avg_contact_temperatures_at_deposition'

    def __init__(self):
        # road: contact_area
        self.contacts: dict[Road, float] = dict()
        self.duration_temp_above_hdt = 0
        self.avg_contact_temperatures_at_deposition = 0

    def __str__(self) -> str:
        return "Road (gcode_line_number=%s, layer_number=%s)" % (self.gcode_line_number, self.layer_number)

    def is_travel(self):
        return self.width == 0


roads_contacts_conduction_thickness_cache: dict[tuple[int, int], float] = dict()


def gcode_moves(file_path):
    valid_gcode_fields = ("X", "Y", "Z", "E", "F")
    for gcode_line_number, line in enumerate(open(file_path), start=1):
        # M204 (acceleration) is ignored
        # G28 (homing) in the middle of the file is not supported
        # relative extrusion mode not supported
        if line.startswith(("G0", "G1")):  # filters empty lines as well
            move = {field[:1]: float(field[1:]) for field in line.split() if field[:1] in valid_gcode_fields}
            # hint: count layers here when gcode_key z changes
            move['gcode_line_number'] = gcode_line_number
            yield move


def convert_move_to_road(move, position_and_state):
    # hint: infill with higher layer height will have no contact to lower layers
    road = Road()
    road.gcode_line_number = move["gcode_line_number"]

    if "Z" in move:
        # layer increased
        # hint: this is confused by the long z-axis moves at the start and end of the production
        new_z_position = move["Z"]
        old_z_position = position_and_state["Z"]
        layer_height = new_z_position - old_z_position

        if layer_height < 0:
            # illegal move (positioning at the beginning)
            layer_height = new_z_position

        if layer_height < 1:
            # when layer height is too high for extrusion, skip this
            position_and_state["Z"] = move["Z"]
            position_and_state["layer_height"] = layer_height
            position_and_state["layer_number"] = position_and_state["layer_number"] + 1

    road.layer_number = position_and_state["layer_number"]
    road.layer_height = position_and_state["layer_height"]

    road.start_x = position_and_state["X"]
    if "X" in move:
        road.end_x = move["X"]
        position_and_state["X"] = move["X"]
    else:
        road.end_x = position_and_state["X"]

    road.start_y = position_and_state["Y"]
    if "Y" in move:
        road.end_y = move["Y"]
        position_and_state["Y"] = move["Y"]
    else:
        road.end_y = position_and_state["Y"]

    road.length = math.dist((road.start_x, road.start_y), (road.end_x, road.end_y))

    if "F" in move:
        #  velocity changed
        position_and_state["F"] = move["F"]  # mm/minute
    velocity = position_and_state["F"] / 60  # mm/s
    road.duration = road.length / velocity  # s

    if "E" in move:
        extruder_move = move["E"] - position_and_state["E"]
        position_and_state["E"] = move["E"]
        if road.length > 0:
            extruded_volume = extruder_move * NOZZLE_AREA
            road.width = extruded_volume / (road.length * road.layer_height)
        else:
            # extrusion without movement
            road.width = 0
    else:
        # travel move
        road.width = 0

    # road.free_area = 0  # is calculated somewhere else

    return road, position_and_state


def split_road(road, maximum_segment_length):
    """
    Split a road into multiple ones, each shorter than the given length. This increases the simulation resolution.
    :param road:
    :param maximum_segment_length: float
    :return:
    """
    # todo: implement when the simulation is running actually
    return road,


def calculate_road_free_area(road: Road) -> float:
    """
    Calculates the free area of a road.
    :param road:
    :return:
    """
    assert (not road.is_travel())
    surface_topbottom = road.length * road.width
    surface_sides = 2 * (road.layer_height * road.length) + 2 * (road.layer_height * road.width)

    contact_bottom = sum([contact_area for contact_road, contact_area in road.contacts.items() if
                          contact_road.layer_number == road.layer_number - 1])
    # if this is too much then reduce all contact areas by the ratio
    if contact_bottom > surface_topbottom * 1.0001:
        area_reduction_factor = surface_topbottom/contact_bottom
        assert(area_reduction_factor < 1)
        for contact_road, contact_area in road.contacts.items():
            if contact_road.layer_number == road.layer_number - 1:
                road.contacts[contact_road] = contact_area * area_reduction_factor
    contact_bottom = sum([contact_area for contact_road, contact_area in road.contacts.items() if
                          contact_road.layer_number == road.layer_number - 1])
    assert (contact_bottom < surface_topbottom * 1.0001)

    contact_top = sum([contact_area for contact_road, contact_area in road.contacts.items() if
                       contact_road.layer_number == road.layer_number + 1])
    # if this is too much then reduce all contact areas by the ratio
    if contact_top > surface_topbottom * 1.0001:
        area_reduction_factor = surface_topbottom/contact_top
        assert(area_reduction_factor < 1)
        for contact_road, contact_area in road.contacts.items():
            if contact_road.layer_number == road.layer_number + 1:
                road.contacts[contact_road] = contact_area * area_reduction_factor
    contact_top = sum([contact_area for contact_road, contact_area in road.contacts.items() if
                       contact_road.layer_number == road.layer_number + 1])
    assert (contact_top < surface_topbottom * 1.0001)

    contact_sides = sum([contact_area for contact_road, contact_area in road.contacts.items() if
                         contact_road.layer_number == road.layer_number])
    if contact_sides > surface_sides * 1.0001:
        area_reduction_factor = surface_sides/contact_sides
        assert(area_reduction_factor < 1)
        for contact_road, contact_area in road.contacts.items():
            if contact_road.layer_number == road.layer_number:
                road.contacts[contact_road] = contact_area * area_reduction_factor
    contact_sides = sum([contact_area for contact_road, contact_area in road.contacts.items() if
                         contact_road.layer_number == road.layer_number])
    assert (contact_sides < surface_sides * 1.0001)

    total_contact_area = sum((road.contacts.values()))
    total_surface = 2 * (road.length * road.width) + \
                    2 * (road.layer_height * road.length) + \
                    2 * (road.layer_height * road.width)

    free_area = total_surface - total_contact_area
    if 0 > free_area > -0.02:
        free_area = 0  # rounding error
    assert (free_area >= 0)
    return free_area


def calculate_road_heat_capacity(road: Road) -> float:
    # it's okay to calculate the extrusion as cube, no need to make rounded edges,
    # see e.g. https://doi.org/10.1122/1.5093033
    road_volume = road.length * road.width * road.layer_height
    road_volume_in_m3 = road_volume * 0.000000001
    road_heat_capacity = road_volume_in_m3 * VOLUMETRIC_HEAT_CAPACITY
    return road_heat_capacity


def update_contacts_after_deposition(road: Road):
    """
    After deposition of a road, the roads which are contacted by the new road are updated to know the new contact.
    :param road:
    :return:
    """
    # for all contacted roads which do not have the current road in their contacts, add the current road
    # with contact area and reduce the free area of the newly contacted road
    for contact_road, contact_area in road.contacts.items():
        if not contact_road.is_travel() and road not in contact_road.contacts:
            if abs(contact_road.gcode_line_number - road.gcode_line_number) == 1:
                # predecessor/successor -> use minimum contact area by using both line widths into account
                contact_area = min((road.width * road.layer_height, contact_road.width * contact_road.layer_height))

            if contact_area > MINIMUM_CONTACT_AREA:
                # filter too small contact areas
                contact_road.contacts[road] = contact_area  # contact area is mostly the same in both directions
                contact_road.free_area = calculate_road_free_area(contact_road)


def calculate_temperature(road: Road, simulation_step_duration: float) -> tuple[Road, float]:
    """
    Calculates the new temperature of the road after the given duration.
    :param road:
    :param simulation_step_duration:
    :return:
    """
    # 1. temperature change from contacts
    # contact_energy = calculate_contact_convection(road, simulation_step_duration)
    contact_energy = calculate_contact_conduction(road, simulation_step_duration)

    # if conduction_contact_energy > 0:
    #     assert(convection_contact_energy/conduction_contact_energy > 10)

    # 2. convection and radiation from free area
    free_area_in_m = 0.000001 * road.free_area  # convert area from mm² in m²
    convection_energy = simulation_step_duration * free_area_in_m * ENVIRONMENT_CONVECTION_COEFFICIENT * \
                        (road.temperature - environment_temperature)

    # https://pawn.physik.uni-wuerzburg.de/video/thermodynamik/t/st12.html
    road_temperature_in_kelvin = road.temperature - abs_zero_temp
    radiation_energy = simulation_step_duration * free_area_in_m * EMISSIVITY * BOLTZMAN_CONSTANT * \
                       (road_temperature_in_kelvin ** 4 - ENVIRONMENT_TEMPERATURE_IN_KELVIN ** 4)

    total_energy_change = contact_energy + convection_energy + radiation_energy
    temperature_change = total_energy_change / road.heat_capacity

    if road.layer_number == 1:
        new_temperature = environment_temperature
    # elif road.heat_capacity < 0.0002:  # todo: simulation is apparently not precise enough for super small roads
    #    # new_temperature = max([r.temperature for r in road.contacts])
    #    new_temperature = environment_temperature
    else:
        new_temperature = road.temperature - temperature_change
        if (new_temperature < environment_temperature or new_temperature >= EXTRUSION_TEMPERATURE)\
                and road.heat_capacity < 0.0001:  # todo: simulation is apparently not precise enough for small roads
            if len(road.contacts) > 0:
                new_temperature = min([r.temperature for r in road.contacts])
            else:
                new_temperature = environment_temperature
        assert (new_temperature >= environment_temperature * 0.99)
        assert (new_temperature <= EXTRUSION_TEMPERATURE)

    # if road.gcode_line_number == 827:
    #    print(new_temperature)
    return road, new_temperature


def calculate_contact_convection(road, simulation_step_duration):
    # Using convection!
    mm2_to_m2_conversion_factor = 0.000001
    contact_energy_sum = 0
    road_temperature = road.temperature
    for contact_road, contact_area in road.contacts.items():
        contact_energy_sum += contact_area * (road_temperature - contact_road.temperature)
    convection_contact_energy = mm2_to_m2_conversion_factor * contact_energy_sum * simulation_step_duration * HC_ROAD
    return convection_contact_energy


def calculate_contact_conduction(road, simulation_step_duration):
    # Using conduction:
    # todo: This is using thickness of the layer as distance but it should be zero. Not sure if the calculation is correct.
    conduction_contact_energy = 0
    for contact_road, contact_area in road.contacts.items():
        if road.gcode_line_number - contact_road.gcode_line_number == 1 or road.gcode_line_number - contact_road.gcode_line_number == -1:
            # thickness of predecessor or successor in extrusion process and own thickness (=length)
            thickness = road.length + contact_road.length
        elif road.layer_number != contact_road.layer_number:
            # thickness of layer above or below and the current layer (=layer height)
            thickness = road.layer_height + contact_road.layer_height
        else:
            # thickness of neighboring/adjacent road (=layer width)
            thickness = road.width + contact_road.width

        thickness_in_m = thickness * 0.001
        conduction_contact_energy += THERMAL_CONDUCTIVITY * (0.000001 * contact_area) * ((road.temperature - contact_road.temperature) / thickness_in_m)
    conduction_contact_energy *= simulation_step_duration
    return conduction_contact_energy


def calculate_contacts_in_layer(tree: shapely.strtree.STRtree, roads_in_layer: list[Road],
                                all_roads: OrderedDict[int, Road]):
    for road in roads_in_layer:
        current_geometry = road.geometry
        inflated_geometry = current_geometry.buffer(XY_PRINTER_RESOLUTION, 1, cap_style=3)
        for overlapping_geometry in tree.query(inflated_geometry):
            if id(overlapping_geometry) != id(current_geometry):  # a geometry intersects itself
                overlapping_road = all_roads[id(overlapping_geometry)]
                # ignore roads which are deposited after the current road
                if overlapping_road.gcode_line_number < road.gcode_line_number:
                    if overlapping_road.gcode_line_number == road.gcode_line_number - 1:
                        # previous extrusion
                        contact_area = road.layer_height * road.width
                    else:
                        if False:
                            # Idea 1: no buffer, using longest length as intersection_length
                            intersection = overlapping_geometry.boundary.intersection(current_geometry)

                            if not intersection.is_empty and not intersection.geom_type == "LineString":
                                x, y = intersection.minimum_rotated_rectangle.exterior.coords.xy
                                edge_length = (Point(x[0], y[0]).distance(Point(x[1], y[1])),
                                               Point(x[1], y[1]).distance(Point(x[2], y[2])))
                                max_edge_length = max(edge_length)
                                min_edge_length = min(edge_length)  # width, should be ca. 0.05

                        # Idea 2: with buffer, simple area calculation
                        intersecting_area = overlapping_geometry.boundary\
                            .buffer(XY_PRINTER_RESOLUTION, 1, cap_style=3)\
                            .intersection(current_geometry).area
                        # intersecting_geometry.length has shit values (e.g. 16 instead of 8), using the area and
                        # then dividing by the buffer distance works much better.
                        intersection_length = intersecting_area / XY_PRINTER_RESOLUTION

                        if False:
                            # Idea 3: using buffer and longest length (ignoring width)
                            intersecting_inflated = overlapping_geometry.boundary.intersection(inflated_geometry)
                            if not intersection.is_empty and not intersection.geom_type == "LineString":
                                x, y = intersecting_inflated.minimum_rotated_rectangle.exterior.coords.xy
                                edge_length = (Point(x[0], y[0]).distance(Point(x[1], y[1])),
                                               Point(x[1], y[1]).distance(Point(x[2], y[2])))
                                inflated_max_edge_length = max(edge_length)
                                inflated_min_edge_length = min(edge_length)  # breite, sollte so um 0.05 sein

                            # Idea 4: without buffer, simple length
                            actual_intersection_length = overlapping_geometry.boundary.intersection(current_geometry).length

                            if intersection.geom_type == "LineString":
                                # if 2 roads are overlapping a very short road exists and we can ignore/approximate it
                                intersection_length = intersection.length

                        # assert (intersection_length <= road.length and intersection_length <= overlapping_road.length)
                        # The initial buffer operation on each road makes them a bit longer than they are in the
                        # GCode (simulating the round nozzle). However, we calculate with the GCode
                        # length, so here the length gets trimmed down.
                        if intersection_length > road.length or intersection_length > overlapping_road.length:
                            intersection_length = min(road.length, overlapping_road.length)
                        contact_area = intersection_length * road.layer_height

                    # todo: with previous value, short segments (e.g. in round areas) were ignored
                    if contact_area > MINIMUM_CONTACT_AREA:  # 0.001:  # 0.015:  # ignore tiny contact areas
                        road.contacts[overlapping_road] = contact_area


def calculate_contacts_to_previous_layer(previous_layer_tree: shapely.strtree.STRtree, roads_in_layer: list[Road],
                                         all_roads: OrderedDict[int, Road]):
    for road in roads_in_layer:
        current_geometry = road.geometry
        for overlapping_geometry in previous_layer_tree.query(current_geometry):
            contact_intersection = overlapping_geometry.intersection(current_geometry)
            contact_area = contact_intersection.area
            overlapping_road = all_roads[id(overlapping_geometry)]
            if contact_area > MINIMUM_CONTACT_AREA:  # XY_PRINTER_RESOLUTION ** 2:
                overlapping_road = all_roads[id(overlapping_geometry)]
                road.contacts[overlapping_road] = contact_area


def main():
    roads_by_geomid: OrderedDict[int, Road] = OrderedDict()
    roads_by_layer_number: dict[int, list[Road]] = collections.defaultdict(list)

    # implicit defaults at the beginning of the gcode. speed shouldn't matter at the start.
    position_and_state = {"X": 0, "Y": 0, "Z": 0, "E": 0, "F": 3000, "layer_number": 0, "layer_height": 0}

    gcode_filename = "sample-input-output/uberhangtest_6s.gcode"
    for move in gcode_moves(gcode_filename):  # cube_test.gcode
        road, position_and_state = convert_move_to_road(move, position_and_state)
        # if road.length <= MINIMUM_SEGMENT_LENGTH:
        #    # if road.length > 0:
        #    #     print("WARNING: Filtered very short segment with length %s" % road.length)
        #    continue

        if not road.is_travel():
            roads = split_road(road, MAXIMUM_SEGMENT_LENGTH)
            for road in roads:
                road_geometry: shapely.geometry.LineString = shapely.geometry.LineString((
                    (road.start_x, road.start_y), (road.end_x, road.end_y))) \
                    .buffer(road.width / 2, 1, cap_style=2)
                road.geometry = road_geometry
                roads_by_geomid[id(road.geometry)] = road
                roads_by_layer_number[road.layer_number].append(road)
        else:
            road.geometry = shapely.geometry.Point()  # empty geometry
            roads_by_geomid[id(road.geometry)] = road
            roads_by_layer_number[road.layer_number].append(road)

    previous_layer_tree = None
    for layer in range(1, position_and_state["layer_number"]+1):
        print(layer)
        roads_in_layer = [road for road in roads_by_layer_number[layer] if not road.geometry.is_empty]
        geometries_in_layer = [road.geometry for road in roads_in_layer]
        tree = shapely.strtree.STRtree(geometries_in_layer)

        calculate_contacts_in_layer(tree, roads_in_layer, roads_by_geomid)
        if previous_layer_tree:
            calculate_contacts_to_previous_layer(previous_layer_tree, roads_in_layer, roads_by_geomid)

        previous_layer_tree = tree

    for geometry_id, road in roads_by_geomid.items():
        if not road.is_travel():
            free_area = calculate_road_free_area(road)
            roads_by_geomid[geometry_id].free_area = free_area

    current_simulation_time = 0
    current_gcode_time = 0
    roads_in_simulation: set[Road] = set()
    print("Simulation")
    count_roads = len(roads_by_geomid)
    for road in roads_by_geomid.values():
        current_gcode_line_number = road.gcode_line_number
        if current_gcode_line_number % 100 == 0:
            progress = current_gcode_line_number / count_roads
            print(int(progress * 100), end=" ")

        road.heat_capacity = calculate_road_heat_capacity(road)

        if not road.is_travel():  # hint: improve performance by joining multiple travel moves
            if road.layer_number == 1:
                road.temperature = environment_temperature
            else:
                road.temperature = EXTRUSION_TEMPERATURE  # hint: read extrusion temp from gcode
            roads_in_simulation.add(road)
            update_contacts_after_deposition(road)

            calculate_contact_temperature_at_deposition(road)

        # Active Body:
        # roads which were added 8 seconds before are removed from simulation (computeStartIndex) (ACTIVE_TIME)
        # using max 200 elements (N_CORE_ELEMENTS)
        # using max distance of 3 roads to the current one (NEIGHBOR_DEPTH)
        # instead of Active Body:
        # roads are removed from simulation when their temperature does not change anymore (environment temp+10%)
        # AND the layer number of the road is lower by 20 than the current road (keep them when they are close)

        # 0.5s lead to problems with temperatures being too high (>extrusion temp) or too low (<environment)
        MAX_SIMULATION_TIME_STEP = 0.2  # seconds
        MIN_SIMULATION_TIME_STEP = 0.1  # seconds
        current_layer_number = road.layer_number
        current_gcode_time += road.duration
        simulation_time_step_duration = current_gcode_time - current_simulation_time

        if simulation_time_step_duration > MAX_SIMULATION_TIME_STEP:
            whole_time_steps = simulation_time_step_duration // MAX_SIMULATION_TIME_STEP
            remainder_time_step = simulation_time_step_duration % MAX_SIMULATION_TIME_STEP
            for step in range(int(whole_time_steps)):
                current_simulation_time = simulate_time_step(current_simulation_time, current_layer_number, roads_in_simulation, MAX_SIMULATION_TIME_STEP)
            current_simulation_time = simulate_time_step(current_simulation_time, current_layer_number, roads_in_simulation, remainder_time_step)

        elif simulation_time_step_duration < MIN_SIMULATION_TIME_STEP:
            # don't simulate too litte time steps, but only when enough time has passed
            pass
        else:
            current_simulation_time = simulate_time_step(current_simulation_time, current_layer_number, roads_in_simulation, simulation_time_step_duration)

    # todo: after depositing all roads continue running the simulation until all roads cooled to environment temp
    end_temperatures = [road.temperature for road in roads_by_geomid.values() if hasattr(road, "temperature")]
    max_duration = 0
    line_number = 0
    for road in roads_by_geomid.values():
        if road.duration_temp_above_hdt > max_duration:
            line_number = road.gcode_line_number
    print("Road with longest duration over PETG HDT: %s" % line_number)
    print(max(end_temperatures))
    print(min(end_temperatures))
    print(sum(end_temperatures) / len(end_temperatures))
    print("Printing duration in minutes:", current_simulation_time / 60)

    # Visualisation
    # export_for_threejs(roads_by_geomid)
    export_for_gcode(gcode_filename, roads_by_geomid)


def calculate_contact_temperature_at_deposition(road):
    # only use previous layer
    contact_temperatures_at_deposition = [contact_road.temperature for contact_road in road.contacts.keys() if
                                          contact_road.gcode_line_number != road.gcode_line_number - 1]
    contact_area_at_deposition = [contact_area for contact_road, contact_area in road.contacts.items() if
                                  contact_road.gcode_line_number != road.gcode_line_number - 1]
    sum_contact_areas = sum(contact_area_at_deposition)
    # weight temperature by contact area
    contact_temperatures = []
    for temp, area in zip(contact_temperatures_at_deposition, contact_area_at_deposition):
        weight = area / sum_contact_areas
        contact_temperatures.append(temp * weight)
    if road.layer_number == 1:
        road.avg_contact_temperatures_at_deposition = environment_temperature
    else:
        if len(contact_temperatures_at_deposition) > 0:
            avg_contact_temperatures_at_deposition = sum(contact_temperatures)
            road.avg_contact_temperatures_at_deposition = avg_contact_temperatures_at_deposition
        else:
            road.avg_contact_temperatures_at_deposition = EXTRUSION_TEMPERATURE


def simulate_time_step(current_time, current_layer_number: int, roads_in_simulation, simulation_time_step_duration):
    args = [(r, simulation_time_step_duration) for r in roads_in_simulation]
    new_temperatures = itertools.starmap(calculate_temperature, args)
    # new_temperatures: set[tuple[Road, float]] = set()
    # for simulated_road in roads_in_simulation:
    #    temp = calculate_temperature(simulated_road, simulation_time_step_duration)
    #    new_temperatures.add((simulated_road, temp))
    current_time += simulation_time_step_duration
    # setzt die neuen Temperaturen aller roads (erst nachdem alles durch berechnet ist!)
    for updated_road, new_temp in new_temperatures:
        if current_layer_number - updated_road.layer_number >= 3 and environment_temperature * 1.1 > new_temp:
            # temperatur ist fast umgebungstemp und viele Schichten her -> rauswerfen
            roads_in_simulation.remove(updated_road)
        if new_temp > 80:  # above Tgt of PETG, todo: move to constants
            updated_road.duration_temp_above_hdt += simulation_time_step_duration
        updated_road.temperature = new_temp
    return current_time


def export_for_gcode(gcode_filename, roads_by_geomid):
    """Visualise the temps by using the Gcode speed value as duration over HDT"""
    with open("sample-input-output/export_contact_temps.gcode", "w") as contact_temps_target:
        with open("sample-input-output/export_time_over_tgt.gcode", "w") as tgt_target:
            with open(gcode_filename) as source:
                line_number = 1
                regex = re.compile(r"(F\d+)")
                for road in roads_by_geomid.values():  # sorted by gcode_line_number
                    while line_number != road.gcode_line_number:
                        road_line = source.readline()
                        contact_temps_target.write(road_line)  # skip until next G0/G1 line is reached
                        tgt_target.write(road_line)
                        line_number += 1
                    road_line = source.readline()
                    contact_temps_road_line = road_line
                    tgt_road_line = road_line
                    line_number += 1
                    if road.avg_contact_temperatures_at_deposition > 0:
                        # F in the gcode is in mm/minute, gcode viewer convert it to mm/s
                        if road.avg_contact_temperatures_at_deposition > 80:  # Tgt of PETG
                            new_value = int(road.avg_contact_temperatures_at_deposition * 60 * 10)
                        else:
                            new_value = int(road.avg_contact_temperatures_at_deposition * 60 * 10)
                        if "F" in road_line:
                            contact_temps_road_line = regex.sub(" F%s" % new_value, road_line)
                        else:
                            contact_temps_road_line = road_line.replace("\n", " F%s\n" % new_value)
                    if road.duration_temp_above_hdt > 0:
                        # F in the gcode is in mm/minute, gcode viewer convert it to mm/s and this should be the time in ms above HDT
                        if "F" in road_line:
                            tgt_road_line = regex.sub(" F%s" % (int(road.duration_temp_above_hdt * 60 * 1000)), road_line)
                        else:
                            tgt_road_line = road_line.replace("\n", " F%s\n" % (int(road.duration_temp_above_hdt * 60 * 1000)))
                    contact_temps_target.write(contact_temps_road_line)
                    tgt_target.write(tgt_road_line)


def export_for_threejs(roads_by_geomid):
    """
    I can't get the three.js working.
    :param roads_by_geomid:
    :return:
    """
    with open("export.gcodesim", "w") as f:
        for road in roads_by_geomid.values():
            if road.duration > 0:
                speed = road.length / road.duration
            else:
                speed = 0
            line = (road.gcode_line_number,
                    road.layer_number,
                    road.start_x, road.start_y,
                    road.end_x, road.end_y,
                    round(road.width, 1), round(road.layer_height, 2),
                    round(speed),
                    round(road.duration_temp_above_hdt, 1))
            f.write(";".join(map(str, line)) + "\n")


if __name__ == '__main__':
    main()

# in js: move contains X/Y coordinates of start and end
# 1. create mesh _mesh(roads)_
#  - are moves connected and connect successors and predecessors (travel=no predecessor) (not necessary)
#  - find length of road (/)
#  - filter too short segments (/)
#  - splitting too long segments (in _addRoad_) (do later)
#  - calculate free surface per element _this.updateElementInfo()_ (/)
# 2. create bins (?? create a grid over the build volume) _new Bins_ (/)
# 3. generate contact graph _updateContactInfo_ (/)
#  - get list of neighbors (using the cells) in current layer (/)
#  - calculate contact areas and create adjacency entries to elements _detectContactInSameLayer_ (/)
#  - get list of neighbors in layer below (/)
#  - calculate contact areas and create adjacency entries to elements _detectContactInAdjacentLayers_ (/)
# 4. simulate step after step (with visualization) _simu.thermalNSteps_
