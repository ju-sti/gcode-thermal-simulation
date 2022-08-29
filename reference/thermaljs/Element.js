class Element {
    constructor(x0, y0, x1, y1, z, layerNum) {
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.z = z;
        this.isActive = false;
        this.layerNum = layerNum;
        this.mLength = Math.sqrt(Math.pow(this.x0 - this.x1, 2) + Math.pow(this.y0 - this.y1, 2)) / 1000.0;
        this.massCap = this.mLength * AREA * DENSITY * CAPACITY;
        this.deltaT = this.mLength / INFILL_SPEED;
        this.depositTime = -1.0;
        this.depositStep = -1.0;
        // this.temperatures = []; // change this to TempHistory
        // this.timeStamps = [];   // change this to TempHistory
        this.tempHistory = new TempHistory();
        this.suc = -1;
        this.pre = -1;
        this.freeSurface = -1;
        this.below = [];
        this.above = [];
        this.adjacent = [];
        this.xCell = -1;
        this.yCell = -1;
        this.index = -1;
        this.freeSurface = null;
        // Element.count += 1;
        this.UBSurface = null; // up and below surface: point array
        this.MSurface = null;  // middle surface: point array
        this.updateCrossShape();
    }

    // set UBSurface and MSurface
    updateCrossShape() {
        this.UBSurface = Utility.computePolygonFromLineAndWidth(this.x0 / 1000.0, this.y0 / 1000.0, this.x1 / 1000.0, this.y1 / 1000.0, NECK_LENGTH_BETWEEN_LAYER);
        this.MSurface = Utility.computePolygonFromLineAndWidth(this.x0 / 1000.0, this.y0 / 1000.0, this.x1 / 1000.0, this.y1 / 1000.0, ROAD_WIDTH);
    }

    setSuc(suc) {
        this.suc = suc;
    }

    setPre(pre) {
        this.pre = pre;
    }

    setDepositTime(depositTime) {
        this.depositTime = depositTime;
    }

    setDepositStep(depositStep) {
        this.depositStep = depositStep;
    }

    setFreeSurface(freeSurface) {
        this.freeSurface = freeSurface;
    }

    setXCell(xCell) {
        this.xCell = xCell;
    }

    setYCell(yCell) {
        this.yCell = yCell;
    }

    setIndex(index) {
        this.index = index;
    }

    addAbove(c) {
        this.above.push(c);
    }

    addBelow(c) {
        this.below.push(c);
    }

    addAdjacent(c) {
        this.adjacent.push(c);
    }

    isOutdated() {
        return this.tempHistory.getLatestTime() !== Element.currentTime;
    }

    refreshTemperature() {
        var t0 = this.tempHistory.getLatestTime();
        var T0 = this.tempHistory.getLatestTemp();
        var newtonK = 0.0;
        newtonK = -this.freeSurface * CONVECTION_COEFFICIENT / this.massCap;
        var dt = Element.currentTime - t0;
        var T = ENVELOP_T + (T0 - ENVELOP_T) * (Math.pow(Math.E, newtonK * dt));
        this.addTempRecord(Element.currentTime, T);
    }

    initializeTempHistory(depositTime, initialTemp) {
        this.tempHistory.initialize(depositTime, initialTemp);
    }

    active() {
        this.isActive = true;
    }

    hasBelow() {
        return this.below.length !== 0;
    }

    hasAbove() {
        return this.above.length !== 0;
    }

    hasAdjacent() {
        return this.adjacent.length !== 0;
    }

    getLength() {
        return this.mLength;
    }

    getLayerNum() {
        return this.layerNum;
    }

    getFreeSurface() {
        return this.freeSurface;
    }

    getMassCap() {
        return this.massCap;
    }

    getXCell() {
        return this.xCell;
    }

    getYCell() {
        return this.yCell;
    }

    getIndex() {
        return this.index;
    }

    getPre() {
        return this.pre;
    }

    getSuc() {
        return this.suc;
    }

    getAbove() {
        return this.above;
    }

    getBelow() {
        return this.below;
    }

    getAdjacent() {
        return this.adjacent;
    }

    getDepositTime() {
        return this.depositTime;
    }

    getDepositStep() {
        return this.depositStep;
    }

    getUBSurface() {
        return this.UBSurface;
    }

    getMSurface() {
        return this.MSurface;
    }

    currentTemperature() {
        // return this.temperatures[this.temperatures.length - 1];
        if (this.isOutdated()) {
            this.refreshTemperature();
        }
        return this.tempHistory.getLatestTemp();
    }

    addTempRecord(time, temperature) {
        // this.timeStamps.push(time);
        // this.temperatures.push(temperature);
        this.tempHistory.updateTemperature(time, temperature);
    }


    computeInterEnergy(elements, iType, dt, nActiveElments) {
        var T = this.currentTemperature();
        var energy = 0.0;
        var contactLst = null;
        // assign contactLst
        if (iType == 0) {
            contactLst = this.adjacent;
        } else if (iType == -1) {
            contactLst = this.below;
        } else if (iType == 1) {
            contactLst = this.above;
        } else {
            console.log("Unknown iType");
        }
        for (let contact of contactLst) {
            var index = contact.getIndex();
            if (index >= nActiveElments) break;
            var area = contact.getArea();
            var cT = elements[index].currentTemperature();
            energy += area * (T - cT);
        }
        energy = energy * dt * HC_ROAD;
        return energy;
    } // end computeInterEnergy


    // print temperature history
    printTempHistory() {
        // var nRecords = this.timeStamps.length;
        // for(var i = 0; i < nRecords; i++) {
        //   console.log(this.timeStamps[i] + " : " + this.temperatures[i]);
        // }
        var history = this.tempHistory.getTempHistory();
        for (var i = 0; i < history.length; i++) {
            console.log(history[i].time + " : " + history[i].temp);
        }
    }

    print() {
        console.log("(" + this.x0 + ", " + this.y0 + ", " + this.z + ") \
    --> (" + this.x1 + ", " + this.y1 + ", " + this.z + ")");
    }

    /* static methods */

    // road = [x0, y0, x1, y1, z, layerNum]
    static isConnected(road1, road2) {
        if (road1[2] !== road2[0] || road1[3] !== road2[1] || road1[4] !== road2[4]) {
            return false;
        }
        return true;
    }
} // end Element class

/* static variables */
// Element.count = 0;
// Element.nTravels = -1;
Element.currentTime = -1.0;
