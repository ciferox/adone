const testCommon = require("./common");

// Open issue: https://github.com/Level/leveldown/issues/157
it.skip("close() does not segfault if there is a pending write", (done) => {
    const db = testCommon.factory();

    db.open((err) => {
        t.ifError(err, "no open error");

        // The "sync" option seems to be a reliable way to trigger a segfault,
        // but is not necessarily the cause of that segfault. More likely, it
        // exposes a race condition that's already there.
        db.put("foo", "bar", { sync: true }, (err) => {
            // We never get here, due to segfault.
            t.ifError(err, "no put error");
        });

        db.close((err) => {
            // We never get here, due to segfault.
            t.ifError(err, "no close error");
        });
    });
});

// See https://github.com/Level/leveldown/issues/134
it("iterator() does not segfault if db is not open", (done) => {
    const db = testCommon.factory();

    try {
        db.iterator();
    } catch (err) {
        assert.equal(err.message, "cannot call iterator() before open()");
    }

    db.close((err) => {
        assert.notExists(err, "no close error");
        done();
    });
});
