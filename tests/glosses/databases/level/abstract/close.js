let db;

export const setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
    it("setUp db", (done) => {
        db = testCommon.factory();
        db.open(() => done());
    });
};

export const close = function (testCommon) {
    it("test close()", (done) => {
        assert.throws(() => {
            db.close();
        }, /close\(\) requires a callback argument/, "no-arg close() throws");
        assert.throws(() => {
            db.close("foo");
        }, /close\(\) requires a callback argument/, "non-callback close() throws");

        db.close((err) => {
            assert.notExists(err);
            done();
        });
    });
};

export const tearDown = function (testCommon) {
    it("tearDown", testCommon.tearDown);
};

export const all = function (testCommon) {
    setUp(testCommon);
    close(testCommon);
    tearDown(testCommon);
};
