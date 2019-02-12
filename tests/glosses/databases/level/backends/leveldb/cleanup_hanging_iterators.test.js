const makeTest = require("./make");

makeTest("test ended iterator", (db, done) => {
    // standard iterator with an end() properly called, easy
    const itr = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });
    itr.next((err, key, value) => {
        assert.notExists(err, "no error from next()");
        assert.equal(key, "one", "correct key");
        assert.equal(value, "1", "correct value");
        itr.end((err) => {
            assert.notExists(err, "no error from end()");
            done();
        });
    });
});

makeTest("test non-ended iterator", (db, done) => {
    // no end() call on our iterator, cleanup should crash Node if not handled properly
    const itr = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });
    itr.next((err, key, value) => {
        assert.notExists(err, "no error from next()");
        assert.equal(key, "one", "correct key");
        assert.equal(value, "1", "correct value");
        done();
    });
});

makeTest("test multiple non-ended iterators", (db, done) => {
    // no end() call on our iterator, cleanup should crash Node if not handled properly
    db.iterator();
    db.iterator().next(() => { });
    db.iterator().next(() => { });
    db.iterator().next(() => { });
    setTimeout(done, 50);
});

makeTest("test ending iterators", (db, done) => {
    // at least one end() should be in progress when we try to close the db
    const itr1 = db.iterator().next(() => {
        itr1.end(() => { });
    });
    const itr2 = db.iterator().next(() => {
        itr2.end(() => { });
        done();
    });
});
