global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
adone.std.os.hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const log = adone.app.fastLogger({
    prettyPrint: true,
    serializers: {
        foo(obj) {
            if (obj.an !== "object") {
                throw new Error("kaboom");
            }

            return "bar";
        }
    }
});
log.info({ foo: { an: "object" } }, "h");
