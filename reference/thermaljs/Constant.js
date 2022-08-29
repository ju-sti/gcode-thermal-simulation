/*user input*/

// manufacturing constants
var INFILL_SPEED = 0.06;
var TRAVEL_SPEED = 0.13;
var DEPO_T = 270.0;
var ENVELOP_T = 70.0;
var PLATFORM_T = 70.0;

// material properties constants
var DENSITY = 1050;
var CAPACITY = 1900;
var CONDUCTIVITY = 0.177;
var CONVECTION_COEFFICIENT = 75;
var HC_PLATFORM = 10; // gap conductance with platform
var HC_ROAD = 100; // gap conductance between roads

// Geometry constrants
const RATIO_PLAT = 0.05;


/**/
// simulation constants
const MIN_ELEMENT_LENGTH = 0.1; // mm
const ELEMENT_LENGTH = 1;
const ZERO_TOL = 1e-12;
const E_PLATFORM_ON = true;
const E_ABOVE_ON = true;
const E_BELOW_ON = true;
const E_ADJACENT_ON = true;
const E_SUC_ON = true;
const E_PRE_ON = true;
const E_CONVECTION_ON = true;
const E_RADIATION_ON = true;
const TIME_STEP = 0.1; // used for travel and after manufacturing

// physics constants
const ABS_ZERO = -273.15;
const DIFF_ENVE_ABS_T_QUAD = Math.pow(ENVELOP_T - ABS_ZERO, 4);
const S_B = 5.6703e-8;
const EMISSIVITY = 0.96;
const EMI_S_B = EMISSIVITY * S_B;

// geometry constants
const RADIUS = 0.000265;
var LAYER_HEIGHT = 0.0004;
const EXTRUSION_FACTOR = 0.9;
var ROAD_WIDTH = 0.00053;
const NECK_LENGTH_IN_LAYER = LAYER_HEIGHT - Math.sqrt(2 * (1 - EXTRUSION_FACTOR) * LAYER_HEIGHT * ROAD_WIDTH);
const NECK_LENGTH_BETWEEN_LAYER = ROAD_WIDTH - Math.sqrt(2 * (1 - EXTRUSION_FACTOR) * LAYER_HEIGHT * ROAD_WIDTH);
const INLAYER_PARALLEL_COSTHRESHOLD = Math.cos(20 / 180 * Math.PI);

// console.log("NECK_LENGTH_IN_LAYER = " + NECK_LENGTH_IN_LAYER*1000 + " mm");
// console.log("NECK_LENGTH_BETWEEN_LAYER = " + NECK_LENGTH_BETWEEN_LAYER*1000 + " mm");

// const AREA = Math.PI*RADIUS*RADIUS;
const AREA = LAYER_HEIGHT * ROAD_WIDTH * EXTRUSION_FACTOR;
// const PERIMETER = 2*Math.PI*RADIUS;
const PERIMETER = 2 * LAYER_HEIGHT + 2 * ROAD_WIDTH - (8 - 4 * Math.sqrt(2)) * Math.sqrt(0.5 * (1 - EXTRUSION_FACTOR) * LAYER_HEIGHT * ROAD_WIDTH);
// console.log("Previous Perimeter = " + 2*Math.PI*RADIUS);
// console.log("Current Perimeter = " + PERIMETER);


// Active Body Parameters
var ACTIVE_TIME = 8.0;
var N_CORE_ELEMENTS = 200;
var NEIGHBOR_DEPTH = 3;

/*
var ManuConstant = {
  INFILL_SPEED : 0.06,
  TRAVEL_SPEED : 0.13,
  DEPO_T : 270.0,
  ENVELOP_T : 70.0,
  PLATFORM_T : 70.0
}
var SimuConstant ={
  MIN_ELEMENT_LENGTH : 0.1, // mm
  ELEMENT_LENGTH : 1,
  ZERO_TOL : 1e-12
}
var PhyConstant = {
  ABS_ZERO : -273.15,
  S_B : 5.6703e-8,
  EMISSIVITY : 0.96
}
var PropertyConstant = {
  DENSITY : 1050,
  CONDUCTIVITY : 0.177,
  CONVECTION_COEFFICIENT : 75
}
var ElementConstant = {
  RADIUS : radius, // m
  AREA : Math.PI*radius*radius,
  PERIMETER : 2*Math.PI*radius
}
*/
