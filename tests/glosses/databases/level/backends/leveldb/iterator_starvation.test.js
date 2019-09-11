const {
    is
} = adone;

const testCommon = require("./common");
const sourceData = [];

// For this test the number of records in the db must be a multiple of
// the hardcoded fast-future limit (1000) or a cache size limit in C++.
for (let i = 0; i < 1e4; i++) {
    sourceData.push({
        type: "put",
        key: i.toString(),
        value: ""
    });
}

it("setUp common", testCommon.setUp);

it.todo("iterator does not starve event loop", (done) => {
    const db = testCommon.factory();

    db.open((err) => {
        assert.notExists(err, "no open error");

        // Insert test data
        db.batch(sourceData.slice(), (err) => {
            assert.notExists(err, "no batch error");

            // Set a high highWaterMark to fill up the cache entirely
            const it = db.iterator({ highWaterMark: Math.pow(1024, 3) });

            let breaths = 0;
            let entries = 0;
            let scheduled = false;

            // Iterate continuously while also scheduling work with setImmediate(),
            // which should be given a chance to run because we limit the tick depth.
            const next = function () {
                it.next((err, key, value) => {
                    if (err || (is.undefined(key) && is.undefined(value))) {
                        assert.notExists(err, "no next error");
                        assert.equal(entries, sourceData.length, "got all data");
                        assert.equal(breaths, sourceData.length / 1000, "breathed while iterating");

                        return db.close((err) => {
                            assert.notExists(err, "no close error");
                            done();
                        });
                    }

                    entries++;

                    if (!scheduled) {
                        scheduled = true;
                        setImmediate(() => {
                            breaths++;
                            scheduled = false;
                        });
                    }

                    next();
                });
            };

            next();
        });
    });
});

it("iterator with seeks does not starve event loop", (done) => {
    const db = testCommon.factory();

    db.open((err) => {
        assert.notExists(err, "no open error");

        db.batch(sourceData.slice(), (err) => {
            assert.notExists(err, "no batch error");

            const it = db.iterator({ highWaterMark: Math.pow(1024, 3), limit: sourceData.length });

            let breaths = 0;
            let entries = 0;
            let scheduled = false;

            const next = function () {
                it.next((err, key, value) => {
                    if (err || (is.undefined(key) && is.undefined(value))) {
                        assert.notExists(err, "no next error");
                        assert.equal(entries, sourceData.length, "got all data");
                        assert.equal(breaths, sourceData.length, "breathed while iterating");

                        return db.close((err) => {
                            assert.notExists(err, "no close error");
                            done();
                        });
                    }

                    entries++;

                    if (!scheduled) {
                        // Seeking clears the cache, which should only have a positive
                        // effect because it means the cache must be refilled, which
                        // again gives us time to breathe. This is a smoke test, really.
                        it.seek(sourceData[0].key);

                        scheduled = true;
                        setImmediate(() => {
                            breaths++;
                            scheduled = false;
                        });
                    }

                    next();
                });
            };

            next();
        });
    });
});

it("tearDown", testCommon.tearDown);
