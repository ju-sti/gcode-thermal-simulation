class ActiveBody {

    constructor(startIndex, nActiveElments) {
        this.startIndex = startIndex;
        this.nActiveElments = nActiveElments;
        this.activeIndexes = new Set();
    }

    BFS(elements) {
        // put temperal set into activeIndexes
        for (var i = this.startIndex; i < this.nActiveElments; i++) {
            this.activeIndexes.add(i);
        }
        if (NEIGHBOR_DEPTH === 0 || N_CORE_ELEMENTS === 0 || this.startIndex === 0) {
            // do nothing
        } else {
            var temp = null;
            var start = null;
            var depth = Math.min(NEIGHBOR_DEPTH, elements[this.nActiveElments - 1].getLayerNum());
            for (var j = 0; j < depth; j++) {
                if (j === 0) {
                    var nCoreElements = Math.min(N_CORE_ELEMENTS, this.nActiveElments - this.startIndex);
                    // start = [];
                    start = new Set();
                    for (var k = this.nActiveElments - nCoreElements; k < this.nActiveElments; k++) {
                        // start.push(k);
                        start.add(k);
                    }

                } else {
                    start = temp;
                }
                // temp = [];
                temp = new Set();
                // for (var p = 0; p < start.length; p++) {
                //   var element = elements[start[p]];
                //   this.addList(element.getAdjacent(), temp);
                //   this.addList(elmenet.getBelow(), temp);
                // }
                for (let index of start) {
                    var element = elements[index];
                    this.addList(element.getAdjacent(), temp);
                    this.addList(element.getBelow(), temp);
                }
            } // end depth loop
        }

    } // end BFS()

    getActiveIndexes(elements) {
        this.BFS(elements);
        return this.activeIndexes;
    } // end getActiveIndexes()

    // add contact list to
    addList(contactList, temp) {
        for (var i = 0; i < contactList.length; i++) {
            var index = contactList[i].getIndex();
            if (index >= this.nActiveElments) {
                break; // ...
            }
            if (!this.activeIndexes.has(index)) {
                this.activeIndexes.add(index);
                // temp.push(index);
                temp.add(index);
            }
        }
    } // end addList()

} // end class
