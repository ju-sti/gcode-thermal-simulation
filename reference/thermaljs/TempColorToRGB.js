// the original temperaute is from 1000 to 40000
// function colorTemperatureToRGB(kelvin){
//     kelvin = 1000 + (40000 - 1000)*(kelvin - ENVELOP_T)/(DEPO_T - ENVELOP_T);
//     var temp = kelvin / 100;
//
//     var red, green, blue;
//
//     if( temp <= 66 ){
//
//         red = 255;
//
//         green = temp;
//         green = 99.4708025861 * Math.log(green) - 161.1195681661;
//
//
//         if( temp <= 19){
//
//             blue = 0;
//
//         } else {
//
//             blue = temp-10;
//             blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
//
//         }
//
//     } else {
//
//         red = temp - 60;
//         red = 329.698727446 * Math.pow(red, -0.1332047592);
//
//         green = temp - 60;
//         green = 288.1221695283 * Math.pow(green, -0.0755148492 );
//
//         blue = 255;
//
//     }
//
//     return rgbToHex(Math.round(clamp(red, 0, 255)), Math.round(clamp(green, 0, 255)), Math.round(clamp(blue, 0, 255)));
//
//     // return {
//     //     r : clamp(red,   0, 255),
//     //     g : clamp(green, 0, 255),
//     //     b : clamp(blue,  0, 255)
//     // }
//
// }


function clamp(x, min, max) {

    if (x < min) {
        return min;
    }
    if (x > max) {
        return max;
    }

    return x;

}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    // console.log(r, g, b);
    // return "0x" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    return parseInt("0x" + componentToHex(r) + componentToHex(g) + componentToHex(b), 16);
}

// R = (255 * n) / 100
// G = (255 * (100 - n)) / 100
// B = 0

// alert( rgbToHex(0, 51, 255) ); // #0033ff
var tempdiff = DEPO_T - ENVELOP_T;
var colorsdict = []
var degree = ENVELOP_T;
var r, g, b;
for (; degree <= DEPO_T; degree++) {
    // console.log(colorTemperatureToRGB(kelvin));
    // colorsdict.push(colorTemperatureToRGB(kelvin));
    r = Math.floor(255 * (degree - ENVELOP_T) / tempdiff);
    g = Math.floor(255 * (DEPO_T - degree) / tempdiff);
    b = 0;
    colorsdict.push(rgbToHex(r, g, b));
    // console.log(1000 + (40000 - 1000)*(kelvin - ENVELOP_T)/(DEPO_T - ENVELOP_T))

}
