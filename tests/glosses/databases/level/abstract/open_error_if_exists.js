export const setUp = function (testCommon) {
    it("setUp", testCommon.setUp);
};

export const errorIfExists = function (testCommon) {
    it("test database open errorIfExists:true", (done) => {
        const db = testCommon.factory();

        db.open({}, (err) => {
            assert.notExists(err);
            db.close((err) => {
                assert.notExists(err);

                let async = false;

                db.open({ createIfMissing: false, errorIfExists: true }, (err) => {
                    assert.ok(err, "error");
                    assert.ok(/exists/.test(err.message), "error is about already existing");
                    assert.ok(async, "callback is asynchronous");
                    done();
                });

                async = true;
            });
        });
    });
};

export const tearDown = function (testCommon) {
    it("tearDown", testCommon.tearDown);
};

export const all = function (testCommon) {
    exports.setUp(testCommon);
    exports.errorIfExists(testCommon);
    exports.tearDown(testCommon);
};
