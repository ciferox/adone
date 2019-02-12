const testCommon = require("./common");

const {
    database: { level: { concatIterator } }
} = adone;

const sourceData = [];

for (let i = 0; i < 1e3; i++) {
    sourceData.push({
        type: "put",
        key: i.toString(),
        value: Math.random().toString()
    });
}

it("setUp", testCommon.setUp);

// When you have a database open with an active iterator, but no references to
// the db, V8 will GC the database and you'll get an failed assert from LevelDB.
it("db without ref does not get GCed while iterating", (done) => {
    let db = testCommon.factory();

    const iterate = function (itr) {
        // No reference to db here, could be GCed. It shouldn't..
        concatIterator(itr, (err, entries) => {
            assert.notExists(err, "no iterator error");
            assert.equal(entries.length, sourceData.length, "got data");

            // Because we also have a reference on the iterator. That's the fix.
            assert.ok(itr.db, "abstract iterator has reference to db");

            // Which as luck would have it, also allows us to properly end this test.
            itr.db.close((err) => {
                assert.notExists(err, "no close error");
                done();
            });
        });
    };

    db.open((err) => {
        assert.notExists(err, "no open error");

        // Insert test data
        db.batch(sourceData.slice(), (err) => {
            assert.notExists(err, "no batch error");

            // Set highWaterMark to 0 so that we don't preemptively fetch.
            const itr = db.iterator({ highWaterMark: 0 });

            // Remove reference
            db = null;

            if (global.gc) {
                // This is the reliable way to trigger GC (and the bug if it exists).
                // Useful for manual testing with "node --expose-gc".
                global.gc();
                iterate(itr);
            } else {
                // But a timeout usually also allows GC to kick in. If not, the time
                // between iterator ticks might. That's when "highWaterMark: 0" helps.
                setTimeout(iterate.bind(null, itr), 1000);
            }
        });
    });
});

it("tearDown", testCommon.tearDown);
