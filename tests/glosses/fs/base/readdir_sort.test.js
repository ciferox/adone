const fs = require("fs");

const readdir = fs.readdir;
fs.readdir = function (path, cb) {
    process.nextTick(() => {
        cb(null, ["b", "z", "a"]);
    });
};

const g = adone.fs.base;

it("readdir reorder", (done) => {
    g.readdir("whatevers", (er, files) => {
        if (er) {
            throw er; 
        }
        assert.deepEqual(files, ["a", "b", "z"]);
        done();
    });
});
