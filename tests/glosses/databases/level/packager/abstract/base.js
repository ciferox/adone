const location = require("./location");

module.exports = function (level) {
    it("test db open and use, level(location, cb)", (done) => {
        level(location, (err, db) => {
            assert.notOk(err, "no error");
            db.put("test1", "success", (err) => {
                assert.notOk(err, "no error");
                db.close(done);
            });
        });
    });

    it("test db open and use, level(location, options, cb)", (done) => {
        level(location, { createIfMissing: false, errorIfExists: false }, (err, db) => {
            assert.notOk(err, "no error");
            db.put("test2", "success", (err) => {
                assert.notOk(err, "no error");
                db.close(done);
            });
        });
    });

    it("test db open and use, db=level(location)", (done) => {
        const db = level(location);
        db.put("test3", "success", (err) => {
            assert.notOk(err, "no error");
            db.close(done);
        });
    });

    it("options.keyEncoding and options.valueEncoding are passed on to encoding-down", (done) => {
        const db = level(location, { keyEncoding: "json", valueEncoding: "json" });
        db.on("ready", () => {
            const codec = db.db.codec;
            assert.equal(codec.opts.keyEncoding, "json", "keyEncoding correct");
            assert.equal(codec.opts.valueEncoding, "json", "valueEncoding correct");
            db.close(done);
        });
    });

    it("encoding options default to utf8", (done) => {
        const db = level(location);
        db.on("ready", () => {
            const codec = db.db.codec;
            assert.equal(codec.opts.keyEncoding, "utf8", "keyEncoding correct");
            assert.equal(codec.opts.valueEncoding, "utf8", "valueEncoding correct");
            db.close(done);
        });
    });
};
