class Simulation {
    constructor(nSteps) {
        console.log("Simulation Constructor: " + "nSteps = " + nSteps);
        this.elements = [];
        this.travelled = false; // finish travel
        this.currentTime = 0.0;
        this.times = [];
        this.nElements = 0;
        this.temperatures = null;
        this.nActiveElments = 0;
        this.travelRecords = new Array(nSteps).fill(0);
        this.startIndex = 0; // start index of ActiveBody
        this.currentStep = 0;
        this.nTravelStepsInThisPeriod = 0;
        this.travelStepInThisPeriod = 0;
        this.inTravelPeriod = false;
        this.nTravels = -1; // number of travel periods
        // this.layerHeights = null;
        this.nLayers = 0;
        this.activeBody = null;
        this.activeIndexes = null;
        this.currentLayer = 0;
    }

    getCurrentLayer() {
        return this.currentLayer;
    }

    getActiveIndexes() {
        return this.activeIndexes;
    }

    // updateXYCell(minX, minY, gridSize) {
    //   for(let element of this.elements) {
    //     var xc = (element.x0 + element.x1)/2.0;
    //     var yc = (element.y0 + element.y1)/2.0;
    //     var xCell = Math.round((xc - minX)/gridSize);
    //     var yCell = Math.round((yc - minY)/gridSize);
    //     element.setXCell(xCell);
    //     element.setYCell(yCell);
    //   }
    // }

    // mesh the roads and update elements information (such as )
    mesh(roads) {
        if (roads.length == 0) return;
        var nRoads = roads.length;
        var road = roads[0];
        var x0 = road[0];
        var y0 = road[1];
        var x1 = road[2];
        var y1 = road[3];
        var z = road[4];
        var layerNum = road[5];
        var oldRoad;
        var i;
        for (i = 1; i < nRoads; i++) {
            oldRoad = road;
            road = roads[i];
            if (!Element.isConnected(oldRoad, road)) {
                this.addRoad(x0, y0, x1, y1, z, layerNum);
                x0 = road[0];
                y0 = road[1];
                x1 = road[2];
                y1 = road[3];
                z = road[4];
                layerNum = road[5];
            } else { // isconnected
                if (Utility.isLeft(x0, y0, x1, y1, road[2], road[3]) == 0 || Utility.mmLength(road) < MIN_ELEMENT_LENGTH) {
                    x1 = road[2];
                    y1 = road[3];
                } else {
                    this.addRoad(x0, y0, x1, y1, z, layerNum);
                    x0 = road[0];
                    y0 = road[1];
                    x1 = road[2];
                    y1 = road[3];
                }
            }
        } // end for
        if (x0 !== x1 || y0 !== y1) {
            this.addRoad(x0, y0, x1, y1, z, layerNum)
        }
        this.nElements = this.elements.length;
        this.updateElementInfo();
        // update element index
        for (var i = 0; i < this.nElements; i++) {
            this.elements[i].setIndex(i);
        }
        this.temperatures = Array(this.nElements).fill(0.0);
    } // end remesh

    addRoad(x0, y0, x1, y1, z, layerNum) {
        var length = Math.sqrt((x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1));
        if (length > ELEMENT_LENGTH) {
            var dx = (x1 - x0) / length * ELEMENT_LENGTH;
            var dy = (y1 - y0) / length * ELEMENT_LENGTH;
            var n = Math.floor(length / ELEMENT_LENGTH);
            if (length % ELEMENT_LENGTH > 0.5 * ELEMENT_LENGTH) {
                n++;
            }
            for (var i = 0; i < n - 1; i++) {
                this.elements.push(new Element(x0, y0, x0 + dx, y0 + dy, z, layerNum));
                x0 += dx;
                y0 += dy;
            }
        }
        this.elements.push(new Element(x0, y0, x1, y1, z, layerNum));
    }

    // update pre and suc elements, # of travels, nLayers, freeSurface;
    updateElementInfo() {
        var nElements = this.elements.length;
        var element = new Element(0.0, 0.0, 0.0, 0.0, -1.0, 1);
        var oldElement;
        var pre, suc;
        for (var i = 0; i < nElements; i++) {
            oldElement = element;
            element = this.elements[i];
            if (element.z !== oldElement.z) this.nLayers++;
            if (element.x0 == oldElement.x1 && element.y0 == oldElement.y1 && element.z == oldElement.z) {
                pre = i - 1;
                if (i !== 0) {
                    this.elements[i - 1].setSuc(i);
                }
            } else {
                pre = -1;
                // Element.nTravels++;
                this.nTravels++;
            }
            this.elements[i].setPre(pre);
        } // end for
        console.log("nLayers = " + this.nLayers);

        // update freeSurface
        for (var i = 0; i < nElements; i++) {
            element = this.elements[i];
            element.freeSurface = PERIMETER * element.mLength;
            if (element.getLayerNum === 1) element.freeSurface -= NECK_LENGTH_BETWEEN_LAYER * element.mLength;
            if (element.getPre() === -1) element.freeSurface += AREA;
            if (element.getSuc() === -1) element.freeSurface += AREA;
        }// end update freeSurface

    } // end updateElementInfo()

    computeTravelTime(elements, end, start) {
        var e1 = elements[start];
        var e2 = elements[end];
        var distance = (Math.abs(e1.x1 - e2.x0) + Math.abs(e1.y1 - e2.y0) + Math.abs(e1.z - e2.z)) / 1000.0;
        var tTravel = distance / (TRAVEL_SPEED); // travel time;
        this.nTravelStepsInThisPeriod = Math.floor(tTravel / TIME_STEP) + 1;
        this.travelStepInThisPeriod = tTravel * 1.0 / this.nTravelStepsInThisPeriod;
        this.inTravelPeriod = true;
    }

    // after the deposition of new element, update the free surface
    updateFreeSurface(newElementIndex) {
        var adjLst = this.elements[newElementIndex].getAdjacent();
        var belowLst = this.elements[newElementIndex].getBelow();
        var index;
        var area;
        // update contact area with adjacent elements in the same layer
        for (let adjContact of adjLst) {
            index = adjContact.getIndex();
            if (index < newElementIndex) {
                area = adjContact.getArea();
                this.elements[newElementIndex].freeSurface -= area;
                this.elements[index].freeSurface -= area;
            }
        }
        // update contact area with contact elements in below layer
        for (let belowContact of belowLst) {
            index = belowContact.getIndex();
            area = belowContact.getArea();
            this.elements[newElementIndex].freeSurface -= area;
            this.elements[index].freeSurface -= area;
        }

    } // end updateFreeSurface()

    // thermal simulation for n steps
    thermalNSteps(nSteps) {
        for (var i = 0; i < nSteps; i++) {
            this.thermalOneStep();
        }
        // var n = 0;
        // this.elements[n].printTempHistory();
    }

    // thermal simulation for one step
    thermalOneStep() {
        var t;
        var activeElement;
        // 1. deposit a new element or travel the nozzle
        if (this.nActiveElments < this.nElements) {
            if (this.nActiveElments !== 0 && this.elements[this.nActiveElments].pre === -1 && this.travelled === false) {

                if (!this.inTravelPeriod) { // have not computed ...
                    this.computeTravelTime(this.elements, this.nActiveElments, this.nActiveElments - 1);
                }
                t = this.travelStepInThisPeriod;
                this.nTravelStepsInThisPeriod--;
                if (this.nTravelStepsInThisPeriod === 0) {
                    this.travelled = true; // quit this case
                    this.inTravelPeriod = false;
                }
                // console.log("travel time step: " + t);
            } else {
                this.travelled = false;
                activeElement = this.elements[this.nActiveElments];
                this.currentLayer = activeElement.getLayerNum();
                t = activeElement.deltaT;
                activeElement.setDepositTime(this.currentTime);
                activeElement.setDepositStep(this.currentStep);
                activeElement.active();
                activeElement.initializeTempHistory(this.currentTime, DEPO_T);
                // activeElement.addTempRecord(this.currentTime, DEPO_T);
                // update freesurface of activeElement and its neighbor elements
                this.updateFreeSurface(this.nActiveElments);
                this.nActiveElments++;
                this.travelRecords[this.currentStep] = 1;
            }
        } else {
            t = TIME_STEP;
        }

        this.times.push(t);
        this.currentStep++;
        // 2. determine active body
        // var startIndex = Math.max(0, this.nActiveElments - 1000);
        this.startIndex = this.computeStartIndex(this.startIndex);
        this.activeBody = new ActiveBody(this.startIndex, this.nActiveElments);
        this.activeIndexes = this.activeBody.getActiveIndexes(this.elements);
        // console.log("Active body size = " + this.activeIndexes.size);
        // 3. thermal computation
        var j;
        for (let j of this.activeIndexes) {
            // for (j = this.startIndex; j < this.nActiveElments; j++) {
            this.temperatures[j] = this.updateTemperature(j, t, this.nActiveElments);
        }
        // 4. update (refresh) the temperature
        this.currentTime += t;
        Element.currentTime = this.currentTime;
        for (let j of this.activeIndexes) {
            // for (j = this.startIndex; j < this.nActiveElments; j++) {
            this.elements[j].addTempRecord(this.currentTime, this.temperatures[j]);
        }
        // return [this.startIndex, this.nActiveElments]
        // return this.activeIndexes;
    }

    // apply one step method to update temperature of one element
    updateTemperature(j, t, nActiveElments) {
        var element = this.elements[j];
        var newTemp = 0.0;
        var T = element.currentTemperature();
        var layerNum = element.getLayerNum();
        var length = element.getLength();
        var massCap = element.getMassCap();
        var area = AREA;
        var perimeter = PERIMETER;
        // var freeSurface = perimeter*length; // change this freesurface to Element variable
        var freeSurface = element.getFreeSurface();
        var ePlat, eAbove, eBelow, eAdj, ePre, eSuc, eConv, eRadi;
        var iType;

        // 1. platform
        ePlat = 0.0;
        if (element.getLayerNum() == 1 && E_PLATFORM_ON) {
            // calculate ePlat
            // ePlat = t*perimeter*length*RATIO_PLAT*HC_PLATFORM*(T - PLATFORM_T);
            ePlat = t * NECK_LENGTH_BETWEEN_LAYER * length * HC_PLATFORM * (T - PLATFORM_T);
        }

        // 2. above
        eAbove = 0.0;
        if (E_ABOVE_ON && element.hasAbove()) {
            // calculate eAbove
            iType = 1;
            eAbove = element.computeInterEnergy(this.elements, iType, t, nActiveElments);
        }

        // 3. below
        eBelow = 0.0;
        if (E_BELOW_ON && element.hasBelow()) {
            // calculate eBelow
            iType = -1;
            eBelow = element.computeInterEnergy(this.elements, iType, t, nActiveElments);
        }

        // 4. adjacent
        eAdj = 0.0;
        if (E_ADJACENT_ON && element.hasAdjacent()) {
            // calculate eAdj
            iType = 0;
            eAdj = element.computeInterEnergy(this.elements, iType, t, nActiveElments);
        }

        // 5. pre
        ePre = 0.0;
        var preIndex = element.pre;
        if (E_PRE_ON && preIndex !== -1) {
            ePre = 2 * t * AREA * CONDUCTIVITY * (T - this.elements[preIndex].currentTemperature()) / (length + this.elements[preIndex].mLength);
        }
        // 6. suc
        eSuc = 0.0;
        var sucIndex = element.suc;
        // console.log("sucIndex " + sucIndex);
        if (E_SUC_ON && sucIndex !== -1 && sucIndex < nActiveElments) {
            eSuc = 2 * t * AREA * CONDUCTIVITY * (T - this.elements[sucIndex].currentTemperature()) / (length + this.elements[sucIndex].mLength);
        }
        // 7. convection
        eConv = 0.0;
        if (E_CONVECTION_ON) {
            eConv = t * freeSurface * CONVECTION_COEFFICIENT * (T - ENVELOP_T);
        }
        // 8. radiation
        eRadi = 0.0;
        if (E_RADIATION_ON) {
            eRadi = t * freeSurface * EMI_S_B * (Math.pow(T - ABS_ZERO, 4) - DIFF_ENVE_ABS_T_QUAD);
        }
        var energyLost = ePlat + eAbove + eBelow + eAdj + ePre + eSuc + eConv + eRadi;
        newTemp = T - energyLost / massCap;
        // throw new Error();
        return newTemp;
    } // end updateTemperature

    // compute the start index of temperal set in active body
    computeStartIndex(oldStartIndex) {
        if (oldStartIndex >= this.elements.length) {
            return oldStartIndex;
        }
        if (this.currentTime < ACTIVE_TIME) {
            return 0;
        } else {
            var overTime = this.currentTime - this.elements[oldStartIndex].getDepositTime() - ACTIVE_TIME; // time
            if (overTime <= 0) {
                return oldStartIndex;
            } else {
                var timeSum = 0.0;
                var newStartIndex = oldStartIndex;
                for (var i = this.elements[oldStartIndex].getDepositStep(); i < this.currentStep; i++) {
                    timeSum += this.times[i];
                    if (timeSum >= overTime) {
                        return newStartIndex;
                    }
                    newStartIndex += this.travelRecords[i];
                }
            }

        } // end else
    } // end computeStartIndex()

} // end Simulation class
