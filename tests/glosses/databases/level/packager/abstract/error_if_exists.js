const location = require("./location");

module.exports = function (level) {
    it("test db open and use, level(location, options, cb) force error", (done) => {
        level(location, { errorIfExists: true }, (err, db) => {
            assert.ok(err, "got error opening existing db");
            assert.notOk(db, "no db");
            done();
        });
    });
};
