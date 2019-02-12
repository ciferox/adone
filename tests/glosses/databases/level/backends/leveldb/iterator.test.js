const make = require("./make");

const {
    is
} = adone;

// This test isn't included in abstract-leveldown because
// the empty-check is currently performed by leveldown.
make("iterator#seek throws if target is empty", (db, done) => {
    const targets = ["", Buffer.alloc(0), []];
    let pending = targets.length;

    const end = function (err) {
        assert.notExists(err, "no error from end()");
        if (!--pending) {
            done();
        }
    }

    targets.forEach((target) => {
        const ite = db.iterator();
        let error;

        try {
            ite.seek(target);
        } catch (err) {
            error = err.message;
        }

        assert.equal(error, "cannot seek() to an empty target", "got error");
        ite.end(end);
    });
});

make("iterator optimized for seek", (db, done) => {
    const batch = db.batch();
    batch.put("a", 1);
    batch.put("b", 1);
    batch.put("c", 1);
    batch.put("d", 1);
    batch.put("e", 1);
    batch.put("f", 1);
    batch.put("g", 1);
    batch.write((err) => {
        const ite = db.iterator();
        assert.notExists(err, "no error from batch()");
        ite.next((err, key, value) => {
            assert.notExists(err, "no error from next()");
            assert.equal(key.toString(), "a", "key matches");
            assert.equal(ite.cache.length, 0, "no cache");
            ite.next((err, key, value) => {
                assert.notExists(err, "no error from next()");
                assert.equal(key.toString(), "b", "key matches");
                assert.ok(ite.cache.length > 0, "has cached items");
                ite.seek("d");
                assert.notOk(ite.cache, "cache is removed");
                ite.next((err, key, value) => {
                    assert.notExists(err, "no error from next()");
                    assert.equal(key.toString(), "d", "key matches");
                    assert.equal(ite.cache.length, 0, "no cache");
                    ite.next((err, key, value) => {
                        assert.notExists(err, "no error from next()");
                        assert.equal(key.toString(), "e", "key matches");
                        assert.ok(ite.cache.length > 0, "has cached items");
                        ite.end(done);
                    });
                });
            });
        });
    });
});

make("close db with open iterator", (db, done) => {
    const ite = db.iterator();
    let cnt = 0;
    let hadError = false;

    ite.next(function loop(err, key, value) {
        if (cnt++ === 0) {
            assert.notExists(err, "no error from next()");
        } else {
            assert.equal(err.message, "iterator has ended");
            hadError = true;
        }
        if (!is.undefined(key)) {
            ite.next(loop);
        }
    });

    db.close((err) => {
        assert.notExists(err, "no error from close()");
        assert.ok(hadError);

        done(null, false);
    });
});
