const location = require("./location");

module.exports = function (level, nonPersistent) {
    it("test db values", (done) => {
        let c = 0;
        const db = level(location);
        const setup = nonPersistent ? function (callback) {
            db.batch([
                { type: "put", key: "test1", value: "success" },
                { type: "put", key: "test2", value: "success" },
                { type: "put", key: "test3", value: "success" }
            ], callback);
        } : function (callback) {
            callback();
        };

        const read = function (err, value) {
            assert.notOk(err, "no error");
            assert.equal(value, "success");
            if (++c === 3) {
                db.close(done);
            }
        };

        setup((err) => {
            assert.notOk(err, "no error");
            db.get("test1", read);
            db.get("test2", read);
            db.get("test3", read);
        });
    });
};
