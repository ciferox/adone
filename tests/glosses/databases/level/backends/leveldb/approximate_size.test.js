const testCommon = require("./common");

let db;

it("setUp common for approximate size", testCommon.setUp);

it("setUp db", (done) => {
    db = testCommon.factory();
    db.open(() => done());
});

it("test argument-less approximateSize() throws", () => {
    assert.throws(() => {
        db.approximateSize();
    }, "approximateSize() requires valid `start` and `end` arguments", "no-arg approximateSize() throws");
});

it("test callback-less, 1-arg, approximateSize() throws", () => {
    assert.throws(() => {
        db.approximateSize("foo");
    }, "approximateSize() requires valid `start` and `end` arguments", "callback-less, 1-arg approximateSize() throws");
});

it("test callback-less, 2-arg, approximateSize() throws", () => {
    assert.throws(() => {
        db.approximateSize("foo", "bar");
    }, "approximateSize() requires a callback argument", "callback-less, 2-arg approximateSize() throws");
});

it("test callback-less, 3-arg, approximateSize() throws", () => {
    assert.throws(() => {
        db.approximateSize(() => { });
    }, "approximateSize() requires valid `start` and `end` arguments", "callback-only approximateSize() throws");
});

it("test callback-only approximateSize() throws", () => {
    assert.throws(() => {
        db.approximateSize(() => { });
    }, "approximateSize() requires valid `start` and `end` arguments", "callback-only approximateSize() throws");
});

it("test 1-arg + callback approximateSize() throws", () => {
    assert.throws(() => {
        db.approximateSize("foo", () => { });
    }, "approximateSize() requires valid `start` and `end` arguments", "1-arg + callback approximateSize() throws");
});

it("test custom _serialize*", (done) => {
    const db = testCommon.factory();
    db._serializeKey = function (data) {
        return data;
    };
    db.approximateSize = function (start, end, callback) {
        assert.deepEqual(start, { foo: "bar" });
        assert.deepEqual(end, { beep: "boop" });
        process.nextTick(callback);
    };
    db.open(() => {
        db.approximateSize({ foo: "bar" }, { beep: "boop" }, (err) => {
            assert.notExists(err);
            db.close((err) => {
                assert.notExists(err);
                done();
            });
        });
    });
});

it("test approximateSize()", (done) => {
    const data = Array.apply(null, Array(10000)).map(() => {
        return "aaaaaaaaaa";
    }).join("");

    db.batch(Array.apply(null, Array(10)).map((x, i) => {
        return { type: "put", key: `foo${i}`, value: data };
    }), (err) => {
        assert.notExists(err);

        // cycle open/close to ensure a pack to .sst

        db.close((err) => {
            assert.notExists(err);

            db.open((err) => {
                assert.notExists(err);

                db.approximateSize("!", "~", (err, size) => {
                    assert.notExists(err);

                    assert.equal(typeof size, "number");
                    // account for snappy compression, original would be ~100000
                    assert.ok(size > 40000, `size reports a reasonable amount (${size})`);
                    done();
                });
            });
        });
    });
});

it("tearDown", (done) => {
    db.close(testCommon.tearDown.bind(null, done));
});
