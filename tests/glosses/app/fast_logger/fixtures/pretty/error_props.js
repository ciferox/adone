global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
adone.std.os.hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const log = adone.app.fastLogger({
    prettyPrint: { errorProps: "code,errno" }
});
const err = Object.assign(new Error("kaboom"), { code: "ENOENT", errno: 1 });
log.error(err);
