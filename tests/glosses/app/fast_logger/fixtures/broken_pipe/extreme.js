global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
adone.std.os.hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const l = adone.app.fastLogger(adone.app.fastLogger.extreme());

for (let i = 0; i < 1000; i++) {
    l.info("hello world");
}
