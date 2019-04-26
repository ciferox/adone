const fs = require("fs");
const gfs = adone.fs2.base;

it("base fs uses same stats constructor as fs", () => {
    assert.equal(gfs.Stats, fs.Stats, "should reference the same constructor");
    assert.ok(fs.statSync(__filename) instanceof fs.Stats,
        "should be instance of fs.Stats");
    assert.ok(gfs.statSync(__filename) instanceof fs.Stats,
        "should be instance of fs.Stats");
});
