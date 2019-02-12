const testCommon = require("./common");

const makeTest = function (name, testFn) {
    it(name, (dn) => {
        const db = testCommon.factory();
        const done = function (err, close) {
            assert.notExists(err, "no error from done()");

            if (close === false) {
                dn();
                return;
            }

            db.close((err) => {
                assert.notExists(err, "no error from close()");
                dn();
            });
        };
        db.open((err) => {
            assert.notExists(err, "no error from open()");
            db.batch([
                { type: "put", key: "one", value: "1" },
                { type: "put", key: "two", value: "2" },
                { type: "put", key: "three", value: "3" }
            ], (err) => {
                assert.notExists(err, "no error from batch()");
                testFn(db, done);
            });
        });
    });
};

module.exports = makeTest;
