global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
require("os").hostname = function () {
    return "abcdefghijklmnopqr"; 
};
const pino = require(require.resolve("./../../"));
const dest = pino.extreme(1);
const logger = pino({}, dest);
logger.info("hello");
logger.info("world");
process.exit(0);
