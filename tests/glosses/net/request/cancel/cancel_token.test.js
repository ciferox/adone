/* global describe it */


const { request: { Cancel, CancelToken } } = adone.net;

describe("CancelToken", function () {
    describe("constructor", function () {
        it("throws when executor is not specified", function () {
            expect(function () {
                new CancelToken();
            }).to.throw(adone.x.InvalidArgument, "executor must be a function.");
        });

        it("throws when executor is not a function", function () {
            expect(function () {
                new CancelToken(123);
            }).to.throw(adone.x.InvalidArgument, "executor must be a function.");
        });
    });

    describe("reason", function () {
        it("returns a Cancel if cancellation has been requested", function () {
            var cancel;
            var token = new CancelToken(function (c) {
                cancel = c;
            });
            cancel("Operation has been canceled.");
            expect(token.reason).to.be.instanceOf(Cancel);
            expect(token.reason.message).to.be.equal("Operation has been canceled.");
        });

        it("returns undefined if cancellation has not been requested", function () {
            var token = new CancelToken(function () { });
            expect(token.reason).to.be.undefined;
        });
    });

    describe("promise", function () {
        it("returns a Promise that resolves when cancellation is requested", function (done) {
            var cancel;
            var token = new CancelToken(function (c) {
                cancel = c;
            });
            token.promise.then(function onFulfilled(value) {
                expect(value).to.be.instanceOf(Cancel);
                expect(value.message).to.be.equal("Operation has been canceled.");
                done();
            });
            cancel("Operation has been canceled.");
        });
    });

    describe("throwIfRequested", function () {
        it("throws if cancellation has been requested", function (done) {
            // Note: we cannot use expect.toThrowError here as Cancel does not inherit from Error
            var cancel;
            var token = new CancelToken(function (c) {
                cancel = c;
            });
            cancel("Operation has been canceled.");
            try {
                token.throwIfRequested();
                done(new Error("Expected throwIfRequested to throw."));
            } catch (thrown) {
                if (!(thrown instanceof Cancel)) {
                    done(new Error("Expected throwIfRequested to throw a Cancel, but it threw " + thrown + "."));
                }
                expect(thrown.message).to.be.equal("Operation has been canceled.");
            }
            done();
        });

        it("does not throw if cancellation has not been requested", function () {
            var token = new CancelToken(function () { });
            token.throwIfRequested();
        });
    });

    describe("source", function () {
        it("returns an object containing token and cancel function", function () {
            var source = CancelToken.source();
            expect(source.token).to.be.instanceOf(CancelToken);
            expect(source.cancel).to.be.a("function");
            expect(source.token.reason).to.be.undefined;
            source.cancel("Operation has been canceled.");
            expect(source.token.reason).to.be.instanceOf(Cancel);
            expect(source.token.reason.message).to.be.equal("Operation has been canceled.");
        });
    });
});