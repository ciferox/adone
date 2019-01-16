const {
    app: { fastLogger },
    std: { os }
} = adone;

global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};

os.hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const dest = fastLogger.extreme(1);
const l = fastLogger({}, dest);
l.info("hello");
l.info("world");
dest.flushSync();
process.exit(0);
