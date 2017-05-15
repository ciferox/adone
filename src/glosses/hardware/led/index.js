const Led = require("./led");
Led.Collection = require("./leds");
Led.RGB = require("./rgb");
Led.RGB.Collection = require("./rgbs");
Led.Matrix = require("./matrix");
Led.Digits = require("./digits");

// TODO: Eliminate .Array for 1.0.0
Led.Array = Led.Collection;
Led.RGBs = Led.RGB.Collection;

module.exports = Led;
