class Contact {
    constructor(index, area) {
        this.area = area;
        this.index = index;
    }

    getArea() {
        return this.area;
    }

    getIndex() {
        return this.index;
    }

    // compute contact...
    static updateContact(element, elements, neighborList, iType) {
        for (var i = 0; i < neighborList.length; i++) {
            Contact.updateContactHelper(element, elements[neighborList[i]], iType);
        }
    } // end updateContact

    static updateContactHelper(element1, element2, iType) {
        var area = 0.0;
        if (iType === 0) { // in the same layer
            if (element1.getLayerNum() === element2.getLayerNum()) {
                area = Contact.detectContactInSameLayer(element1, element2);
            } else {
                area = 0.0;
            }
            if (area !== 0.0) {
                element1.addAdjacent(new Contact(element2.getIndex(), area));
                element2.addAdjacent(new Contact(element1.getIndex(), area));
            }

        } else { // iType === -1 in below layer
            if (element2.getLayerNum() === element1.getLayerNum() - 1) {
                area = Contact.detectContactInAdjacentLayers(element1, element2);
            } else {
                area = 0.0;
            }
            if (area !== 0.0) {
                element1.addBelow(new Contact(element2.getIndex(), area));
                element2.addAbove(new Contact(element1.getIndex(), area));
            }
        }

    } // end updateContactHelper


    // calculate contact area between elements in the same layer
    static detectContactInSameLayer(element1, element2) {
        var isParellel = Utility.isNearlyParallel(element1, element2, INLAYER_PARALLEL_COSTHRESHOLD);
        if (isParellel && Utility.computeMinElementDistance(element1, element2) <= 1.5 * ROAD_WIDTH) {
            var contactLength = Utility.computeOverlapLength(element1, element2);
            var area = NECK_LENGTH_IN_LAYER * contactLength;
            // if (area !== 0) console.log("area = " + area);
            return area;
        }
        return 0.0;
    }

    // calculate contact area between elements in adjacent layers
    static detectContactInAdjacentLayers(element1, element2) {
        var area = Utility.computeOverlapArea(element1.getUBSurface(), element2.getUBSurface())
        return 0.0;
    }


    print() {
        console.log("Area: " + this.area);
        console.log("Index: " + this.index);
    }


}
