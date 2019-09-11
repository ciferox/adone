const fs = require("fs");
const path = require("path");
const location = require("./location");

module.exports = function (level) {
    it("test destroy", (done) => {
        assert.ok(fs.statSync(location).isDirectory(), "sanity check, directory exists");
        assert.ok(fs.existsSync(path.join(location, "CURRENT")), "sanity check, CURRENT exists");
        level.destroy(location, (err) => {
            assert.notOk(err, "no error");
            assert.notOk(fs.existsSync(path.join(location, "CURRENT")), "db gone (mostly)");
            done();
        });
    });
};
