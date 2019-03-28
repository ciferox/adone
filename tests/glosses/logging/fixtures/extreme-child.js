global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
require("os").hostname = function () {
    return "abcdefghijklmnopqr"; 
};
const pino = require(require.resolve("./../../"));
const extreme = pino(pino.extreme()).child({ hello: "world" });
pino.final(extreme, (_, logger) => logger.info("h"))();
