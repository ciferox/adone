const { Cancel, CancelToken } = adone.net.http.client;

describe("CancelToken", () => {
    describe("constructor", () => {
        it("throws when executor is not specified", () => {
            expect(() => {
                new CancelToken();
            }).to.throw(adone.x.InvalidArgument, "executor must be a function.");
        });

        it("throws when executor is not a function", () => {
            expect(() => {
                new CancelToken(123);
            }).to.throw(adone.x.InvalidArgument, "executor must be a function.");
        });
    });

    describe("reason", () => {
        it("returns a Cancel if cancellation has been requested", () => {
            let cancel;
            const token = new CancelToken((c) => {
                cancel = c;
            });
            cancel("Operation has been canceled.");
            expect(token.reason).to.be.instanceOf(Cancel);
            expect(token.reason.message).to.be.equal("Operation has been canceled.");
        });

        it("returns undefined if cancellation has not been requested", () => {
            const token = new CancelToken(() => { });
            expect(token.reason).to.be.undefined;
        });
    });

    describe("promise", () => {
        it("returns a Promise that resolves when cancellation is requested", (done) => {
            let cancel;
            const token = new CancelToken((c) => {
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

    describe("throwIfRequested", () => {
        it("throws if cancellation has been requested", (done) => {
            // Note: we cannot use expect.toThrowError here as Cancel does not inherit from Error
            let cancel;
            const token = new CancelToken((c) => {
                cancel = c;
            });
            cancel("Operation has been canceled.");
            try {
                token.throwIfRequested();
                done(new Error("Expected throwIfRequested to throw."));
            } catch (thrown) {
                if (!(thrown instanceof Cancel)) {
                    done(new Error(`Expected throwIfRequested to throw a Cancel, but it threw ${thrown}.`));
                }
                expect(thrown.message).to.be.equal("Operation has been canceled.");
            }
            done();
        });

        it("does not throw if cancellation has not been requested", () => {
            const token = new CancelToken(() => { });
            token.throwIfRequested();
        });
    });

    describe("source", () => {
        it("returns an object containing token and cancel function", () => {
            const source = CancelToken.source();
            expect(source.token).to.be.instanceOf(CancelToken);
            expect(source.cancel).to.be.a("function");
            expect(source.token.reason).to.be.undefined;
            source.cancel("Operation has been canceled.");
            expect(source.token.reason).to.be.instanceOf(Cancel);
            expect(source.token.reason.message).to.be.equal("Operation has been canceled.");
        });
    });
});
