const { Promise } = adone.odm;

/**
 * Test.
 */

describe.skip("Promise", () => {
    it("events fire right after complete()", (done) => {
        let promise = new Promise(),
            called = 0;

        promise.on("fulfill", (a, b) => {
            assert.equal(a, '1');
            assert.equal(b, '2');
            called++;
        });

        promise.complete("1", "2");

        promise.on("fulfill", (a, b) => {
            assert.equal(a, '1');
            assert.equal(b, '2');
            called++;
        });

        assert.equal(called, 2);
        done();
    });

    it("events fire right after error()", (done) => {
        let promise = new Promise(),
            called = 0;

        promise.on("reject", (err) => {
            assert.ok(err instanceof Error);
            called++;
        });

        promise.error("booyah");

        promise.on("reject", (err) => {
            assert.ok(err instanceof Error);
            called++;
        });

        assert.equal(called, 2);
        done();
    });

    it("events fire right after reject()", (done) => {
        let promise = new Promise(),
            called = 0;

        promise.on("reject", (err) => {
            assert.equal(err, 9);
            called++;
        });

        promise.reject(9);

        promise.on("reject", (err) => {
            assert.equal(err, 9);
            called++;
        });

        assert.equal(called, 2);
        done();
    });

    describe("onResolve()", () => {
        it("from constructor works", (done) => {
            var called = 0;

            var promise = new Promise(function (err) {
                assert.ok(err instanceof Error);
                called++;
            });

            promise.reject(new Error('dawg'));

            assert.equal(called, 1);
            done();
        });

        it("after fulfill()", (done) => {
            var promise = new Promise(),
                called = 0;

            promise.fulfill('woot');

            promise.onResolve(function (err, data) {
                assert.equal(data, 'woot');
                called++;
            });

            promise.onResolve(function (err) {
                assert.strictEqual(err, null);
                called++;
            });

            assert.equal(called, 2);
            done();
        });

        it("after error()", (done) => {
            var promise = new Promise(),
                called = 0;

            promise.error(new Error('woot'));

            promise.onResolve(function (err) {
                assert.ok(err instanceof Error);
                called++;
            });

            promise.onResolve(function (err) {
                assert.ok(err instanceof Error);
                called++;
            });
            assert.equal(called, 2);
            done();
        });
    });

    describe("onFulfill() shortcut", () => {
        it("works", (done) => {
            var promise = new Promise(),
                called = 0;

            promise.onFulfill(function (woot) {
                assert.strictEqual(woot, undefined);
                called++;
            });

            promise.fulfill();

            assert.equal(called, 1);
            done();
        });
    });

    describe("onReject shortcut", () => {
        it("works", (done) => {
            var promise = new Promise(),
                called = 0;

            promise.onReject(function (err) {
                assert.ok(err instanceof Error);
                called++;
            });

            promise.reject(new Error);
            assert.equal(called, 1);
            done();
        });
    });

    describe("return values", () => {
        it("on()", (done) => {
            var promise = new Promise();
            assert.ok(promise.on('jump', function () { }) instanceof Promise);
            done();
        });

        it("onFulfill()", (done) => {
            var promise = new Promise();
            assert.ok(promise.onFulfill(function () { }) instanceof Promise);
            done();
        });
        it("onReject()", (done) => {
            var promise = new Promise();
            assert.ok(promise.onReject(function () { }) instanceof Promise);
            done();
        });
        it("onResolve()", (done) => {
            var promise = new Promise();
            assert.ok(promise.onResolve(function () { }) instanceof Promise);
            done();
        });
    });

    describe("casting errors", () => {
        describe("error()", () => {
            it('casts arguments to Error', function (done) {
                var p = new Promise(function (err) {
                    assert.ok(err instanceof Error);
                    assert.equal(err.message, '3');
                    done();
                });

                p.error(3);
            });
        });

        describe("reject()", () => {
            it('does not cast arguments to Error', function (done) {
                var p = new Promise(function (err) {
                    assert.equal(err, 3);
                    done();
                });

                p.reject(3);
            });
        });
    });

    it("doesnt swallow exceptions (gh-3222)", (done) => {
        assert.throws(() => {
            new Promise.ES6(function () {
                throw new Error('bacon');
            });
        });
        done();
    });

    it(".catch() works correctly (gh-4189)", (done) => {
        let promise = new Promise.ES6(((resolve, reject) => {
            reject(new Error('error1'));
        }));
        promise.
            catch((error) => {
                assert.ok(error);
                return new Promise.ES6(function (resolve, reject) {
                    reject(new Error('error2'));
                });
            }).
            catch((error) => {
                assert.equal(error.message, 'error2');
                done();
            });
    });
});
