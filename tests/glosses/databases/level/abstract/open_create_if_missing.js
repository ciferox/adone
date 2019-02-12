export const setUp = function (testCommon) {
    it("setUp", testCommon.setUp);
};

export const createIfMissing = function (testCommon) {
    it("test database open createIfMissing:false", (done) => {
        const db = testCommon.factory();
        let async = false;

        db.open({ createIfMissing: false }, (err) => {
            assert.ok(err, "error");
            assert.ok(/does not exist/.test(err.message), "error is about dir not existing");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });
};

export const tearDown = function (testCommon) {
    it("tearDown", testCommon.tearDown);
};

export const all = function (testCommon) {
    exports.setUp(testCommon);
    exports.createIfMissing(testCommon);
    exports.tearDown(testCommon);
};
