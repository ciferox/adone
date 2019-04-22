process.env.GRACEFUL_FS_PLATFORM = "win32";

const fs = require("fs");
fs.rename = function (a, b, cb) {
    setTimeout(() => {
        const er = new Error("EPERM blerg");
        er.code = "EPERM";
        cb(er);
    });
};

const { base } = adone.fs2;
const a = `${__dirname}/a`;
const b = `${__dirname}/b`;

it("setup", (done) => {
    try {
        fs.mkdirSync(a);
    } catch (e) { }
    try {
        fs.mkdirSync(b);
    } catch (e) { }
    done();
});

it("rename", { timeout: 100 }, (done) => {
    base.rename(a, b, (er) => {
        assert.ok(er);
        done();
    });
});

it("cleanup", (done) => {
    try {
        fs.rmdirSync(a);
    } catch (e) { }
    try {
        fs.rmdirSync(b);
    } catch (e) { }
    done();
});
