global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
adone.std.os.hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const log = adone.app.fastLogger({ prettyPrint: true });
log.info("h");
adone.app.fastLogger.final(log).info("after");
