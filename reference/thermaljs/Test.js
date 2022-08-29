console.log('Test Start');
// var e1 = new Element(0.0, 0.0, 1.0, 1.0, 0.0);
// console.log(Element.count);
// var simu = new Simulation();
// console.log(simu.elements);

// var c1 = new Contact(1, 5.5);
// c1.print();

// var tt1 = new TimeTemp(12, 270)
// tt1.print();

// var th1 = new TempHistory();
// th1.initialize(0.0, 270);
// console.log(th1.getLatestTime());
// console.log(th1.getLatestTemp());
// console.log(1 !== 3);
// console.log(Math.max(1, 6.0));

//// test dictionary
// dict = {};
// dict[[1, 2, 3]] = [0, 1, 2]
// console.log(dict[[1, 2, 3]])
// dict[[1, 2, 4]] = [10, 9, 8, 8]
// console.log(dict[[1, 2, 4]])
// console.log([1, 2])
// console.log([1, 2, 3] in dict)
// console.log([1] in dict)
// console.log(dict[3] === undefined)

// var myset = new Set();
// myset.add(1);
// myset.add(2);
// myset.add(2);
// myset.add(3);
// console.log(myset);
// console.log(!myset.has(2))
// for (let item of myset) console.log(item);

// throw new Error();

// var lst = [];
// lst.push(1);
// lst.push(2);
// lst.push(3);
// lst.push(4);
// lst.push(5);
// lst.push(6);
//
// for(let item of lst) {
//   console.log(item);
//   if (item === 3) break;
//   console.log("Hello");
// }
//
// var x = 3;
// x *= 10;
// console.log(x)

// var x = Math.floor(0.1);
// console.log(x/2);
// console.log(0 < NaN);

// var p1 = new Point(0, 0);
// var p2 = new Point(1, 0);
// var p3 = new Point(1, 1);
// var p4 = new Point(0, 2);
// var polygon = [];
// polygon.push(p1);
// polygon.push(p2);
// polygon.push(p3);
// polygon.push(p4);
// console.log("area of polygon = " + Utility.computePolygonArea(polygon));
// console.log(Utility.computePolygonFromLineAndWidth(0, 0, 1, 0, 2));

// var p1 = new Point(0, 0);
// var p2 = new Point(1, 1);
// var p3 = new Point(0, 1);
// var p4 = new Point(1, 0);
//
// console.log(Utility.computeIntersectPoint(p1, p2, p3, p4));

// xs = [1, 2, 3]
// ys = xs.slice();
// ys[0] = 0;
// console.log(xs);
// console.log(ys);

//// test computeOverlapArea()
// var p1 = new Point(0, 0);
// var p2 = new Point(1, 0);
// var p3 = new Point(1, 1);
// var p4 = new Point(0, 1);
// var polygon1 = [];
// polygon1.push(p1);
// polygon1.push(p2);
// polygon1.push(p3);
// polygon1.push(p4);
//
// var p5 = new Point(0.5, 0);
// var p6 = new Point(1.5, 0);
// var p7 = new Point(1.5, 1);
// var p8 = new Point(0.5, 1);
// var polygon2 = [];
// polygon2.push(p5);
// polygon2.push(p6);
// polygon2.push(p7);
// polygon2.push(p8);
//
// var p9 = new Point(0.25, -1);
// var p10 = new Point(0.5, -1);
// var p11 = new Point(0.5, 1.5);
// var p12 = new Point(0.25, 1.5);
// var polygon3 = [];
// polygon3.push(p9);
// polygon3.push(p10);
// polygon3.push(p11);
// polygon3.push(p12);
//
//
//
// console.log(Utility.computeOverlapArea(polygon1, polygon2));
// console.log(Utility.computeOverlapArea(polygon1, polygon2));
// console.log(Utility.computeOverlapArea(polygon1, polygon3));

// degrees = [0, 30, 60, 90, 180, 360]
// for (let degree of degrees) console.log(degree + " : " + Utility.degreeToRadians(degree));

//// Test isNearlyParallel()
// var e1 = new Element(0, 0, 1, 0, 1);
// degrees = [0, 1, 2, 3, 4, 10, 11, 20, 60, 90, 100, 130, 169, 170, 171, 175, 180]
// threshold = Math.cos(Utility.degreeToRadians(10));
// for (let degree of degrees) {
//   var e2 = new Element(0, 0, Math.cos(Utility.degreeToRadians(degree)), Math.sin(Utility.degreeToRadians(degree)));
//   console.log(degree + " : " + Utility.isNearlyParallel(e1, e2, threshold));
// }

//// test computeOverlapLength()
var e1 = new Element(0, 0, 1, 0, 0, 0);
var e2 = new Element(0.99, 0, 2, 0, 0);
console.log("Overlap length = " + Utility.computeOverlapLength(e1, e2));

//// test computemmDistanceFromPointToElement()
// var e1 = new Element(0, 0, 1, 1, 0, 0);
// console.log("Distance = " + Utility.computemmDistanceFromPointToElement(1, 0, e1));


console.log('Test End');
