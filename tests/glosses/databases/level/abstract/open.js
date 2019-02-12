export const setUp = function (testCommon) {
    it("setUp", testCommon.setUp);
};

export const args = function (testCommon) {
    it("test database open no-arg throws", () => {
        const db = testCommon.factory();
        assert.throws(() => {
            db.open();
        }, /open\(\) requires a callback argument/, "no-arg open() throws");
    });

    it("test callback-less, 1-arg, open() throws", () => {
        const db = testCommon.factory();
        assert.throws(() => {
            db.open({});
        }, /open\(\) requires a callback argument/, "callback-less, 1-arg open() throws");
    });
};

export const open = function (testCommon) {
    it("test database open, no options", (done) => {
        const db = testCommon.factory();

        // default createIfMissing=true, errorIfExists=false
        db.open((err) => {
            assert.notExists(err);
            db.close(() => {
                done();
            });
        });
    });

    it("test database open, options and callback", (done) => {
        const db = testCommon.factory();

        // default createIfMissing=true, errorIfExists=false
        db.open({}, (err) => {
            assert.notExists(err);
            db.close(() => {
                done();
            });
        });
    });

    it("test database open, close and open", (done) => {
        const db = testCommon.factory();

        db.open((err) => {
            assert.notExists(err);
            db.close((err) => {
                assert.notExists(err);
                db.open((err) => {
                    assert.notExists(err);
                    db.close(() => {
                        done();
                    });
                });
            });
        });
    });
};

export const tearDown = function (testCommon) {
    it("tearDown", testCommon.tearDown);
};

export const all = function (testCommon) {
    setUp(testCommon);
    args(testCommon);
    open(testCommon);
    tearDown(testCommon);
};
