require("adone");

global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
require("os").hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const log = adone.logger({ prettyPrint: { levelFirst: true } });
log.info("h");