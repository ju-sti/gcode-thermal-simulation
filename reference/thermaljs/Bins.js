class Bins {
    constructor(elements) {
        this.dict = {}; // dictinary
        this.xCells = [];
        this.yCells = [];
        this.nXCells = -1;
        this.nYCells = -1;

        // calculate minX, minY, maxX, maxY
        this.minX = elements[0].x0;
        this.maxX = elements[0].x0;
        this.minY = elements[0].y0;
        this.maxY = elements[0].y0;
        var element = null;
        for (var i = 0; i < elements.length; i++) {
            element = elements[i];
            var eminX = Math.min(element.x0, element.x1);
            var emaxX = Math.max(element.x0, element.x1);
            var eminY = Math.min(element.y0, element.y1);
            var emaxY = Math.max(element.y0, element.y1);
            if (eminX < this.minX) {
                this.minX = eminX
            }
            ;
            if (emaxX > this.maxX) {
                this.maxX = emaxX
            }
            ;
            if (eminY < this.minY) {
                this.minY = eminY
            }
            ;
            if (emaxY > this.maxY) {
                this.maxY = emaxY
            }
            ;
        }

        this.nXCells = Math.round((this.maxX - this.minX) / Bins.GRID_SIZE);
        this.nYCells = Math.round((this.maxY - this.minY) / Bins.GRID_SIZE);

        for (var i = 0; i < elements.length; i++) {
            element = elements[i];
            // this.add(element);
            var layerNum = element.getLayerNum();
            var xc = (element.x0 + element.x1) / 2.0;
            var yc = (element.y0 + element.y1) / 2.0;
            var xCell = Math.round((xc - this.minX) / Bins.GRID_SIZE);
            var yCell = Math.round((yc - this.minY) / Bins.GRID_SIZE);
            // set XCell and yCell in readGcode;
            element.setXCell(xCell);
            element.setYCell(yCell);

            var key = [layerNum, xCell, yCell];
            // put key into dictionary
            if (key in this.dict) {
                this.dict[key].push(element.getIndex());
            } else {
                this.dict[key] = [element.getIndex()];
            }
        }

        console.log("number of elements in dictionary " + Object.keys(this.dict).length);
        console.log("nXCells = " + this.nXCells);
        console.log("nYCells = " + this.nYCells);

    } // end constructor

    // add elements into dictionary
    add(element) {
        var layerNum = element.getLayerNum();
        var xc = (element.x0 + element.x1) / 2.0;
        var yc = (element.y0 + element.y1) / 2.0;
        var xCell = Math.round((xc - this.minX) / Bins.GRID_SIZE);
        var yCell = Math.round((yc - this.minY) / Bins.GRID_SIZE);
        element.setXCell(xCell);
        element.setYCell(yCell);
        var key = [layerNum, xCell, yCell];
        // put key into dictionary
        if (key in this.dict) {
            this.dict[key].push(element.getIndex());
        } else {
            this.dict[key] = [element.getIndex()];
        }
    }

    // get neighbor element indexes list
    getNeighborList(element, iType) {
        var xCell = element.getXCell();
        var yCell = element.getYCell();
        var layerNum = element.getLayerNum() + iType;
        var neighborXCell = 0;
        var neighborYCell = 0;
        var neighborList = [];
        for (var i = -1; i < 2; i++) {
            for (var j = -1; j < 2; j++) {
                neighborXCell = xCell + i;
                neighborYCell = yCell + j;
                if (neighborXCell >= 0 && neighborXCell <= this.nXCells && neighborYCell >= 0 && neighborYCell <= this.nYCells) {
                    var cell = [layerNum, neighborXCell, neighborYCell];
                    if (cell in this.dict) {
                        var lst = this.dict[cell];
                        for (var k = 0; k < lst.length; k++) {
                            if (lst[k] < element.getIndex() && lst[k] !== element.getPre()) {
                                neighborList.push(lst[k]);
                            }
                        }
                    } // end if lst exist
                } // end valid cell
            } // end for j
        } // end for i
        return neighborList;
    } // end getNeighborList()

    // update contact information
    updateContactInfo(element, elements) {
        var iType = null;
        var neighborList = null;
        // 1. update adj
        iType = 0;
        neighborList = this.getNeighborList(element, iType);
        Contact.updateContact(element, elements, neighborList, iType);
        // 2. update below
        if (element.getLayerNum() > 1) {
            iType = -1;
            neighborList = this.getNeighborList(element, iType);
            // if (neighborList.length !== 0) console.log("Hello");
            Contact.updateContact(element, elements, neighborList, iType);
        }

    }

    // generate contact graph
    generateContactGraph(elements) {
        var nSteps = simu.nElements + simu.nTravels;
        console.log("nSteps = " + nSteps);
        var nActiveElments = 0;
        var travelled = false;
        var nElements = simu.nElements;
        console.log("nElements = " + nElements);
        for (var i = 0; i < nSteps; i++) {
            if (nActiveElments < nElements) {
                if (nActiveElments !== 0 && elements[nActiveElments].getPre() != -1 && travelled === false) {
                    travelled = true;
                } else {
                    travelled = false;
                    var activeElement = elements[nActiveElments];
                    nActiveElments++;
                    this.updateContactInfo(activeElement, elements);
                }
            } // only check this
        }
    }

    // print Bins
    print() {
        console.log("nXCells = " + this.nXCells + ", nYCells = " + this.nYCells);
        for (var key in this.dict) {
            var value = this.dict[key];
            console.log(key + " : " + value);
        }
    }

} // end class

Bins.GRID_SIZE = ELEMENT_LENGTH;
