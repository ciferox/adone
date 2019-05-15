const util = require("util");
const fs = require("fs");

// mock fs.statSync to return signed uids/gids
const realStatSync = fs.statSync;
fs.statSync = function (path) {
    const stats = realStatSync.call(fs, path);
    stats.uid = -2;
    stats.gid = -2;
    return stats;
};

const gfs = adone.fs.base;

it("base fs uses same stats constructor as fs", (done) => {
    assert.equal(gfs.Stats, fs.Stats, "should reference the same constructor");

    assert.equal(fs.statSync(__filename).uid, -2);
    assert.equal(fs.statSync(__filename).gid, -2);

    assert.equal(gfs.statSync(__filename).uid, 0xfffffffe);
    assert.equal(gfs.statSync(__filename).gid, 0xfffffffe);

    done();
});

it("does not throw when async stat fails", (done) => {
    gfs.stat(`${__filename} this does not exist`, (er, stats) => {
        assert.ok(er);
        assert.notOk(stats);
        done();
    });
});

it("throws ENOENT when sync stat fails", (done) => {
    assert.throws(() => {
        gfs.statSync(`${__filename} this does not exist`);
    }, /ENOENT/);
    done();
});
