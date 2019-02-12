const testCommon = require("./common");

let db;

it("setUp common", testCommon.setUp);

it("setUp db", (done) => {
    db = testCommon.factory();
    db.open(() => done());
});

it("test compactRange() frees disk space after key deletion", (done) => {
    const key1 = "000000";
    const key2 = "000001";
    const val1 = Buffer.allocUnsafe(64).fill(1);
    const val2 = Buffer.allocUnsafe(64).fill(1);

    db.batch().put(key1, val1).put(key2, val2).write((err) => {
        assert.notExists(err, "no batch put error");

        db.compactRange(key1, key2, (err) => {
            assert.notExists(err, "no compactRange1 error");

            db.approximateSize("0", "z", (err, sizeAfterPuts) => {
                assert.notExists(err, "no approximateSize1 error");

                db.batch().del(key1).del(key2).write((err) => {
                    assert.notExists(err, "no batch del error");

                    db.compactRange(key1, key2, (err) => {
                        assert.notExists(err, "no compactRange2 error");

                        db.approximateSize("0", "z", (err, sizeAfterCompact) => {
                            assert.notExists(err, "no approximateSize2 error");
                            assert.ok(sizeAfterCompact < sizeAfterPuts);
                            done();
                        });
                    });
                });
            });
        });
    });
});

it("test compactRange() serializes start and end", (done) => {
    const clone = Object.create(db);
    let count = 0;

    clone._serializeKey = function (key) {
        assert.equal(key, count++);
        return db._serializeKey(key);
    };

    clone.compactRange(0, 1, (err) => {
        assert.notExists(err, "no compactRange error");
        done();
    });
});

it("tearDown", (done) => {
    db.close(testCommon.tearDown.bind(null, done));
});
