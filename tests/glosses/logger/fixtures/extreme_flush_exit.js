require("adone");

global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
require("os").hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const dest = adone.logger.extreme(1);
const logger = adone.logger({}, dest);
logger.info("hello");
logger.info("world");
dest.flushSync();
process.exit(0);
