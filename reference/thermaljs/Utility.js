class Utility {
    constructor() {
    }

    // check if c is on the left of ab
    static isLeft(ax, ay, bx, by, cx, cy) {
        var crossProduct = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
        if (Math.abs(crossProduct) < ZERO_TOL) {
            return 0;
        } else if (crossProduct > 0) {
            return 1;
        } else {
            return -1;
        }
    } // end isLeft(ax, ay, bx, by, cx, cy)

    // check if C is on the left of line A->B
    static isLeftPointVersion(A, B, C) {
        return Utility.isLeft(A.getX(), A.getY(), B.getX(), B.getY(), C.getX(), C.getY());
    } // end isLeftPointVersion()

    // transfer degree to radian
    static degreeToRadians(degree) {
        return degree * Math.PI / 180.0;
    } // end degreeToRadians()

    // check if angle of element1 and element2 are within
    static isNearlyParallel(element1, element2, costhreshold) {
        var dx1 = element1.x1 - element1.x0;
        var dy1 = element1.y1 - element1.y0;
        var dx2 = element2.x1 - element2.x0;
        var dy2 = element2.y1 - element2.y0;
        var cosAngle = Math.abs((dx1 * dx2 + dy1 * dy2) / (Math.sqrt((dx1 * dx1 + dy1 * dy1) * (dx2 * dx2 + dy2 * dy2))));
        if (cosAngle > costhreshold) {
            return true;
        }
        return false;
    } // end isNearlyParallel()

    // compute overlap length of element1 and element2 using projection
    static computeOverlapLength(element1, element2) {
        // 1. compute the unit vector of element2
        var dx2 = element2.x1 - element2.x0;
        var dy2 = element2.y1 - element2.y0;
        var length2 = element2.getLength() * 1000.0;
        var ux = dx2 / length2;
        var uy = dy2 / length2;
        // 2. compute root v and w, v and w are vector points from (element2.x0, element2.y0) to two ends of element 1
        // v
        var vx = element1.x0 - element2.x0;
        var vy = element1.y0 - element2.y0;
        var projvLength = ux * vx + uy * vy;
        var vrootx = element2.x0 + ux * projvLength;
        var vrooty = element2.y0 + uy * projvLength;

        // w
        var wx = element1.x1 - element2.x0;
        var wy = element1.y1 - element2.y0;
        var projwLength = ux * wx + uy * wy;
        var wrootx = element2.x0 + ux * projwLength;
        var wrooty = element2.y0 + uy * projwLength;

        var leftx, lefty, rightx, righty;
        if (Math.abs(element2.x0 - element2.x1) >= Math.abs(element2.y0 - element2.y1)) { // pick x direction
            if (element2.x0 <= element2.x1) {
                leftx = element2.x0;
                lefty = element2.y0;
                rightx = element2.x1;
                righty = element2.y1;
            } else { // element2.x0 > element2.x1
                leftx = element2.x1;
                lefty = element2.y1;
                rightx = element2.x0;
                righty = element2.y0;
            }
            if (vrootx < leftx) {
                vrootx = leftx;
                vrooty = lefty;
            }
            if (vrootx > rightx) {
                vrootx = rightx;
                vrooty = righty;
            }
            if (wrootx < leftx) {
                wrootx = leftx;
                wrooty = lefty;
            }
            if (wrootx > rightx) {
                wrootx = rightx;
                wrooty = righty;
            }
        } else { // pick y direction
            if (element2.y0 <= element2.y1) {
                lefty = element2.y0;
                leftx = element2.x0;
                righty = element2.y1;
                rightx = element2.x1;
            } else { // element2.y0 > element2.y1
                lefty = element2.y1;
                leftx = element2.x1;
                righty = element2.y0;
                rightx = element2.x0;
            }
            if (vrooty < lefty) {
                vrooty = lefty;
                vrootx = leftx;
            }
            if (vrooty > righty) {
                vrooty = righty;
                vrootx = rightx;
            }
            if (wrooty < lefty) {
                wrooty = lefty;
                wrootx = leftx;
            }
            if (wrooty > righty) {
                wrooty = righty;
                wrootx = rightx;
            }
        }
        var overlap = Math.sqrt((vrootx - wrootx) * (vrootx - wrootx) + (vrooty - wrooty) * (vrooty - wrooty)) / 1000;
        return overlap;

    } // end computeOverlapLength()

    // compute minimum m distance between two elements
    static computeMinElementDistance(element1, element2) {
        var distance1 = Utility.computemmDistanceFromPointToElement(element1.x0, element1.y0, element2);
        var distance2 = Utility.computemmDistanceFromPointToElement(element1.x1, element1.y1, element2);
        return Math.min(distance1, distance2) / 1000.0;
    } // end computemmDistanceFromPointToElement()

    // compute mm distance from point (x, y) to element
    static computemmDistanceFromPointToElement(x, y, element) {
        var denominator = element.getLength() * 1000.0;
        var numerator = Math.abs((element.y1 - element.y0) * x - (element.x1 - element.x0) * y + element.x1 * element.y0 - element.y1 * element.x0);
        return numerator / denominator;
    } // end computemmDistanceFromPointToElement()

    // calculate mm length of a road
    static mmLength(road) {
        var dx = road[2] - road[0];
        var dy = road[3] - road[1];
        return Math.sqrt(dx * dx + dy * dy);
    } // end mmLength()

    // computet area of a polygon, vertices is array of points
    static computePolygonArea(vertices) {
        var area = 0.0;
        var nVertices = vertices.length;
        for (var i = 0; i < nVertices; i++) {
            area += vertices[i].getX() * vertices[(i + 1) % nVertices].getY() - vertices[(i + 1) % nVertices].getX() * vertices[i].getY();
        }
        return 0.5 * Math.abs(area);
    } // end computePolygonArea()

    // calculate polygon vertices from middle axis and width
    static computePolygonFromLineAndWidth(startX, startY, endX, endY, width) {
        var vertices = [];
        var dx = endX - startX;
        var dy = endY - startY;
        var theta = Math.atan2(dy, dx);
        var beta = theta + Math.PI / 2;
        var w = width * 0.5;
        var cosBeta = Math.cos(beta);
        var sinBeta = Math.sin(beta);
        vertices.push(new Point(startX - w * cosBeta, startY - w * sinBeta));
        vertices.push(new Point(endX - w * cosBeta, endY - w * sinBeta));
        vertices.push(new Point(endX + w * cosBeta, endY + w * sinBeta));
        vertices.push(new Point(startX + w * cosBeta, startY + w * sinBeta));
        return vertices;
    } // end computePolygonFromLineAndWidth()

    // compute the intersect point of P1-->P2 and P3-->P4
    static computeIntersectPoint(P1, P2, P3, P4) {
        var x1 = P1.getX();
        var y1 = P1.getY();
        var x2 = P2.getX();
        var y2 = P2.getY();
        var x3 = P3.getX();
        var y3 = P3.getY();
        var x4 = P4.getX();
        var y4 = P4.getY();
        var denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        var Px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator;
        var Py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator;
        return new Point(Px, Py);
    } // end computeIntersectPoint()

    // compute overlap area of subjecctRect and clipRect
    static computeOverlapArea(subjectRect, clipRect) {
        var outputList = subjectRect.slice();
        var inputList;
        var P1;
        var P2;
        var S = null;
        for (var i = 0; i < clipRect.length; i++) {
            inputList = outputList;
            outputList = [];
            P1 = clipRect[i];
            P2 = clipRect[(i + 1) % clipRect.length];
            if (inputList.length != 0) {
                S = inputList[inputList.length - 1];
            } else {
                return 0.0;
            }
            for (let E of inputList) {
                if (Utility.isLeftPointVersion(P1, P2, E) !== -1) {
                    if (Utility.isLeftPointVersion(P1, P2, S) === -1) {
                        outputList.push(Utility.computeIntersectPoint(S, E, P1, P2));
                    }
                    outputList.push(E);

                } else if (Utility.isLeftPointVersion(P1, P2, S) !== -1) {
                    outputList.push(Utility.computeIntersectPoint(S, E, P1, P2));
                }
                S = E;
            }

        } // end for
        return Utility.computePolygonArea(outputList)
    } // end computeOverlapArea()

    //calculate travel time
    // static computeTravelTime(elements, end, start) {
    //   var e1 = elements[start];
    //   var e2 = elements[end];
    //   var distance = (Math.abs(e1.x1 - e2.x0) + Math.abs(e1.y1 - e2.y0) + Math.abs(e1.z - e2.z))/1000;
    //   var tTravel = distance/(TRAVEL_SPEED);
    //   // console.log("Travel Time = " + tTravel);
    //   return tTravel;
    // }
}
