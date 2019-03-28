const {
    app: { fastLogger }
} = adone;

global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
require("os").hostname = function () {
    return "abcdefghijklmnopqr"; 
};
const l = fastLogger({}, fastLogger.destination(1));
l.info("hello");
l.info("world");
process.exit(0);
