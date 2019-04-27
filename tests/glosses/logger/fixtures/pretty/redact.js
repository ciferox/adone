require("adone");

global.process = { __proto__: process, pid: 123456 };
Date.now = function () {
    return 1459875739796; 
};
require("os").hostname = function () {
    return "abcdefghijklmnopqr"; 
};

const log = adone.logger({
    prettyPrint: true,
    redact: ["foo.an"]
});
log.info({ foo: { an: "object" } }, "h");
