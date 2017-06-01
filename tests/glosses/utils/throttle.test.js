const { util: { throttle, range }, noop, promise } = adone;
const sentA = {};
const sentB = {};
const sentC = {};

const job = () => {
    let resolve;
    let reject;
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    const executeJob = function () {
        if (executeJob.isRun) {
            throw new Error("Job was run multiple times");
        }
        executeJob.isRun = true;
        executeJob.args = Array.prototype.slice.call(arguments);
        return promise;
    };

    executeJob.fail = function (err) {
        reject(err);
    };
    executeJob.complete = function (val) {
        resolve(val);
    };
    executeJob.isRun = false;
    return executeJob;
};

class Processed {
    constructor(val) {
        this.val = val;
    }
}

const worker = (max) => {
    let concurrent = 0;
    return function () {
        concurrent++;
        if (concurrent > max) {
            throw new Error("Extra processes were run in parallel.");
        }
        const res = new Processed(Array.prototype.slice.call(arguments));
        return new Promise((resolve) => {
            setTimeout(() => {
                concurrent--;
                resolve(res);
            }, 100);
        });
    };
};

describe("utils", "throttle", () => {
    describe("no intervals", () => {
        describe("throttle({ max: n })", () => {
            it("1 acts as a lock", () => {
                const lock = throttle({ max: 1 });
                const a = job();
                const b = job();
                const c = job();
                const resA = lock(a, 123);
                const resB = lock(b, 456);
                const resC = lock(c, 789);
                assert(a.isRun);
                assert(!b.isRun);
                assert(!c.isRun);
                a.complete(sentA);
                return resA.then((resA) => {
                    assert(resA === sentA);
                    assert(a.isRun);
                    assert(b.isRun);
                    assert(!c.isRun);
                    b.fail(sentB);
                    return resB.then(() => {
                        throw new Error("b should have been rejected");
                    }, (errB) => {
                        assert(errB === sentB);
                    });
                }).then(() => {
                    assert(a.isRun);
                    assert(b.isRun);
                    assert(c.isRun);
                    assert.deepEqual(a.args, [123]);
                    assert.deepEqual(b.args, [456]);
                    assert.deepEqual(c.args, [789]);
                    c.complete(sentC);
                    return resC;
                }).then((resC) => {
                    assert(resC === sentC);
                });
            });

            it("2 lets two processes acquire the same lock", () => {
                const lock = throttle({ max: 2 });
                const a = job();
                const b = job();
                const c = job();
                const resA = lock(a);
                const resB = lock(b);
                const resC = lock(c);
                assert(a.isRun);
                assert(b.isRun);
                assert(!c.isRun);
                a.complete(sentA);
                return resA.then((resA) => {
                    assert(resA === sentA);
                    assert(a.isRun);
                    assert(b.isRun);
                    assert(c.isRun);
                    b.fail(sentB);
                    return resB
                        .then(() => {
                            throw new Error("b should have been rejected");
                        }, (errB) => {
                            assert(errB === sentB);
                        });
                }).then(() => {
                    assert(a.isRun);
                    assert(b.isRun);
                    assert(c.isRun);
                    c.complete(sentC);
                    return resC;
                }).then((resC) => {
                    assert(resC === sentC);
                });
            });

            it("3 lets three processes acquire the same lock", () => {
                const lock = throttle({ max: 3 });
                const a = job();
                const b = job();
                const c = job();
                const resA = lock(a);
                const resB = lock(b);
                const resC = lock(c);
                assert(a.isRun);
                assert(b.isRun);
                assert(c.isRun);
                a.complete(sentA);
                return resA.then((resA) => {
                    assert(resA === sentA);
                    assert(a.isRun);
                    assert(b.isRun);
                    assert(c.isRun);
                    b.fail(sentB);
                    return resB
                        .then(() => {
                            throw new Error("b should have been rejected");
                        }, (errB) => {
                            assert(errB === sentB);
                        });
                }).then(() => {
                    assert(a.isRun);
                    assert(b.isRun);
                    assert(c.isRun);
                    c.complete(sentC);
                    return resC;
                }).then((resC) => {
                    assert(resC === sentC);
                });
            });
        });

        describe("throttle({ max: n }, fn)", () => {
            it("1 acts as a sequential worker", () => {
                return Promise.all([sentA, sentB, sentC].map(throttle({ max: 1 }, worker(1)))).then((res) => {
                    assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                    assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                    assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                });
            });

            it("2 works on two inputs in parallel", () => {
                return Promise.all([sentA, sentB, sentC].map(throttle({ max: 2 }, worker(2)))).then((res) => {
                    assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                    assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                    assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                });
            });

            it("3 works on three inputs in parallel", () => {
                return Promise.all([sentA, sentB, sentC].map(throttle({ max: 3 }, worker(3)))).then((res) => {
                    assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                    assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                    assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                });
            });
        });

        describe("throttle(fn, { max: n })", () => {
            it("1 acts as a sequential worker", () => {
                return Promise.all([sentA, sentB, sentC].map(throttle(worker(1), { max: 1 }))).then((res) => {
                    assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                    assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                    assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                });
            });

            it("2 works on two inputs in parallel", () => {
                return Promise.all([sentA, sentB, sentC].map(throttle(worker(2), { max: 2 }))).then((res) => {
                    assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                    assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                    assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                });
            });

            it("3 works on three inputs in parallel", () => {
                return Promise.all([sentA, sentB, sentC].map(throttle(worker(3), { max: 3 }))).then((res) => {
                    assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                    assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                    assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                });
            });
        });
    });

    describe("intervals", () => {
        it("should execute function once per second", async () => {
            const f = throttle(noop, { interval: 1000 });
            const start = new Date();
            for (let i = 0; i < 3; ++i) {
                await f();
            }
            expect(new Date() - start).to.be.at.least(2000);
        });

        it("should execute function twice per second", async () => {
            const f = throttle(noop, { max: 2, interval: 1000 });
            const start = new Date();
            for (let i = 0; i < 6; ++i) {
                await f();
            }
            expect(new Date() - start).to.be.at.least(2000);
        });

        it("should order calls", async () => {
            const vals = [];
            const f = throttle((i) => {
                vals.push(i);
            }, { interval: 100, max: 10, ordered: true });
            await Promise.all(range(50).map(f));
            expect(vals).to.be.deep.equal(range(50));
        });

        it("should not order calls", async () => {
            // will it fail sometimes?
            const vals = [];
            const f = throttle((i) => {
                vals.push(i);
            }, { interval: 100, max: 10, ordered: false });
            await Promise.all(range(100).map(f));
            expect(vals).not.to.be.deep.equal(range(100));
        });

        it("should wait for return", async () => {
            const vals = [];
            const f = throttle(async (i) => {
                vals.push(["start", i]);
                await promise.delay(100);
                vals.push(["end", i]);
            }, { interval: 100, max: 10, waitForReturn: true });
            await Promise.all(range(20).map(f));
            expect(vals).to.be.deep.equal(range(20).reduce((expected, i) => {
                expected.push(["start", i]);
                expected.push(["end", i]);
                return expected;
            }, []));
        });

        it("should wait for return: late", async () => {
            const vals = [];
            const f = throttle({ interval: 100, max: 10, waitForReturn: true });
            await Promise.all(range(20).map((i) => f(async () => {
                vals.push(["start", i]);
                await promise.delay(100);
                vals.push(["end", i]);
            })));
            expect(vals).to.be.deep.equal(range(20).reduce((expected, i) => {
                expected.push(["start", i]);
                expected.push(["end", i]);
                return expected;
            }, []));
        });

        it("should not wait for return: late", async () => {
            const vals = [];
            const f = throttle({ interval: 100, max: 10, waitForReturn: false });
            await Promise.all(range(20).map((i) => f(async () => {
                vals.push(["start", i]);
                await promise.delay(100);
                vals.push(["end", i]);
            })));
            expect(vals).not.to.be.deep.equal(range(20).reduce((expected, i) => {
                expected.push(["start", i]);
                expected.push(["end", i]);
                return expected;
            }, []));
        });

        it("should not wait for return", async () => {
            const vals = [];
            const f = throttle(async (i) => {
                vals.push(["start", i]);
                await promise.delay(100);
                vals.push(["end", i]);
            }, { interval: 100, max: 10, waitForReturn: false });
            await Promise.all(range(20).map(f));
            expect(vals).not.to.be.deep.equal(range(20).reduce((expected, i) => {
                expected.push(["start", i]);
                expected.push(["end", i]);
                return expected;
            }, []));
        });

        it("should order calls when wait for return and ordered = false", async () => {
            const vals = [];
            const f = throttle((i) => {
                vals.push(i);
            }, { interval: 100, max: 10, ordered: false, waitForReturn: true });
            await Promise.all(range(50).map(f));
            expect(vals).to.be.deep.equal(range(50));
        });

        describe("args", () => {
            it("should pass context", async () => {
                const ctx = {};
                const s = spy();
                const f = throttle(s, { interval: 1000 });
                await f.call(ctx);
                expect(s).to.be.calledOnce;
                expect(s).to.be.calledOn(ctx);
            });

            it("should pass context: late", async () => {
                const ctx = {};
                const s = spy();
                const f = throttle({ interval: 1000 });
                await f.call(ctx, s);
                expect(s).to.be.calledOnce;
                expect(s).to.be.calledOn(ctx);
            });

            it("should pass arguments", async () => {
                const s = spy();
                const f = throttle(s, { interval: 1000 });
                await f(1, 2, 3);
                expect(s).to.be.calledOnce;
                expect(s).to.be.calledWith(1, 2, 3);
            });

            it("should pass arguments: late", async () => {
                const s = spy();
                const f = throttle({ interval: 1000 });
                await f(s, 1, 2, 3);
                expect(s).to.be.calledOnce;
                expect(s).to.be.calledWith(1, 2, 3);
            });
        });
    });
});
