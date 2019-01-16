global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
adone.std.os.hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const l = adone.app.fastLogger();

l.info("hello world");
