global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
require("os").hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const {
    app: { fastLogger }
} = adone;

const dest = fastLogger.extreme(1);
const l = fastLogger({}, dest);
l.info("hello");
l.info("world");
process.exit(0);
