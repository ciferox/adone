const {
    database: { level: { concatIterator } }
} = adone;

module.exports = function (testCommon) {
    it("setUp common", testCommon.setUp);

    it("testCommon.factory() returns a unique database", (done) => {
        const db1 = testCommon.factory();
        const db2 = testCommon.factory();

        const close = function () {
            db1.close((err) => {
                assert.notExists(err, "no error while closing db1");
                db2.close((err) => {
                    assert.notExists(err, "no error while closing db2");
                    done();
                });
            });
        };

        db1.open((err) => {
            assert.notExists(err, "no error while opening db1");
            db2.open((err) => {
                assert.notExists(err, "no error while opening db2");
                db1.put("key", "value", (err) => {
                    assert.notExists(err, "put key in db1");
                    concatIterator(db2.iterator(), (err, entries) => {
                        assert.notExists(err, "got items from db2");
                        assert.sameMembers(entries, [], "db2 should be empty");
                        close();
                    });
                });
            });
        });
    });

    it("tearDown", testCommon.tearDown);
};
