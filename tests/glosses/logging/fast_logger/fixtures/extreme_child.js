global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
adone.std.os.hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const extreme = adone.app.fastLogger(adone.app.fastLogger.extreme()).child({ hello: "world" });
adone.app.fastLogger.final(extreme, (_, logger) => logger.info("h"))();
