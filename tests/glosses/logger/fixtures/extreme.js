require("adone");
global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
require("os").hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const extreme = adone.logger(adone.logger.extreme());
adone.logger.final(extreme, (_, logger) => logger.info("h"))();
