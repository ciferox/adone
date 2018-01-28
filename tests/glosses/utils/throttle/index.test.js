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

describe("util", "throttle", () => {
    describe("for promises", () => {
        describe("no intervals", () => {
            describe("create({ concurrency: n })", () => {
                it("1 acts as a lock", () => {
                    const lock = throttle.create({ concurrency: 1 });
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
                    const lock = throttle.create({ concurrency: 2 });
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
                    const lock = throttle.create({ concurrency: 3 });
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

            describe("create({ concurrency: n }, fn)", () => {
                it("1 acts as a sequential worker", () => {
                    return Promise.all([sentA, sentB, sentC].map(throttle.create({ concurrency: 1 }, worker(1)))).then((res) => {
                        assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                        assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                        assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                    });
                });

                it("2 works on two inputs in parallel", () => {
                    return Promise.all([sentA, sentB, sentC].map(throttle.create({ concurrency: 2 }, worker(2)))).then((res) => {
                        assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                        assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                        assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                    });
                });

                it("3 works on three inputs in parallel", () => {
                    return Promise.all([sentA, sentB, sentC].map(throttle.create({ concurrency: 3 }, worker(3)))).then((res) => {
                        assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                        assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                        assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                    });
                });
            });

            describe("throttle.create(fn, { concurrency: n })", () => {
                it("1 acts as a sequential worker", () => {
                    return Promise.all([sentA, sentB, sentC].map(throttle.create(worker(1), { concurrency: 1 }))).then((res) => {
                        assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                        assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                        assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                    });
                });

                it("2 works on two inputs in parallel", () => {
                    return Promise.all([sentA, sentB, sentC].map(throttle.create(worker(2), { concurrency: 2 }))).then((res) => {
                        assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                        assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                        assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                    });
                });

                it("3 works on three inputs in parallel", () => {
                    return Promise.all([sentA, sentB, sentC].map(throttle.create(worker(3), { concurrency: 3 }))).then((res) => {
                        assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                        assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                        assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
                    });
                });
            });

            describe("drops", () => {
                const { DROPPED } = throttle;

                it("dropes other calls if concurrency is reached", async () => {
                    let i = 0;
                    const fn = throttle.create(() => adone.promise.delay(100).then(() => ++i), { concurrency: 2, drop: true });

                    let [a, b, c, d] = await Promise.all([
                        fn(),
                        fn(),
                        fn(),
                        fn()
                    ]);
                    expect(a).to.be.equal(1);
                    expect(b).to.be.equal(2);
                    expect(c).to.be.equal(DROPPED);
                    expect(d).to.be.equal(DROPPED);

                    [a, b, c, d] = await Promise.all([
                        fn(),
                        fn(),
                        fn(),
                        fn()
                    ]);
                    expect(a).to.be.equal(3);
                    expect(b).to.be.equal(4);
                    expect(c).to.be.equal(DROPPED);
                    expect(d).to.be.equal(DROPPED);
                });

                it("should not drop last call if dropLast is false", async () => {
                    let i = 0;
                    const fn = throttle.create(() => adone.promise.delay(100).then(() => ++i), { concurrency: 2, drop: true, dropLast: false });

                    let [a, b, c, d] = await Promise.all([
                        fn(),
                        fn(),
                        fn(),
                        fn()
                    ]);
                    expect(a).to.be.equal(1);
                    expect(b).to.be.equal(2);
                    expect(c).to.be.equal(DROPPED);
                    expect(d).to.be.equal(3);

                    [a, b, c, d] = await Promise.all([
                        fn(),
                        fn(),
                        fn(),
                        fn()
                    ]);
                    expect(a).to.be.equal(4);
                    expect(b).to.be.equal(5);
                    expect(c).to.be.equal(DROPPED);
                    expect(d).to.be.equal(6);
                });
            });
        });

        describe("intervals", () => {
            it("should execute function once per second", async () => {
                const f = throttle.create(noop, { interval: 1000 });
                const start = new Date();
                for (let i = 0; i < 3; ++i) {
                    await f();
                }
                expect(new Date() - start).to.be.at.least(2000);
            });

            it("should execute function twice per second", async () => {
                const f = throttle.create(noop, { concurrency: 2, interval: 1000 });
                const start = new Date();
                for (let i = 0; i < 6; ++i) {
                    await f();
                }
                expect(new Date() - start).to.be.at.least(2000);
            });

            it("should order calls", async () => {
                const vals = [];
                const f = throttle.create((i) => {
                    vals.push(i);
                }, { interval: 100, concurrency: 10, ordered: true, waitForReturn: false });
                await Promise.all(range(50).map(f));
                expect(vals).to.be.deep.equal(range(50));
            });

            it("should not order calls", async () => {
                // will it fail sometimes?
                const vals = [];
                const f = throttle.create((i) => {
                    vals.push(i);
                }, { interval: 100, concurrency: 10, ordered: false, waitForReturn: false });
                await Promise.all(range(100).map(f));
                expect(vals).not.to.be.deep.equal(range(100));
            });

            it("should wait for return", async () => {
                const vals = [];
                const f = throttle.create(async (i) => {
                    vals.push(["start", i]);
                    await promise.delay(100);
                    vals.push(["end", i]);
                }, { interval: 100, concurrency: 10, waitForReturn: true });
                await Promise.all(range(20).map(f));
                expect(vals).to.be.deep.equal(range(20).reduce((expected, i) => {
                    expected.push(["start", i]);
                    expected.push(["end", i]);
                    return expected;
                }, []));
            });

            it("should wait for return: late", async () => {
                const vals = [];
                const f = throttle.create({ interval: 100, concurrency: 10, waitForReturn: true });
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
                const f = throttle.create({ interval: 100, concurrency: 10, waitForReturn: false });
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
                const f = throttle.create(async (i) => {
                    vals.push(["start", i]);
                    await promise.delay(100);
                    vals.push(["end", i]);
                }, { interval: 100, concurrency: 10, waitForReturn: false });
                await Promise.all(range(20).map(f));
                expect(vals).not.to.be.deep.equal(range(20).reduce((expected, i) => {
                    expected.push(["start", i]);
                    expected.push(["end", i]);
                    return expected;
                }, []));
            });

            it("should order calls when wait for return and ordered = false", async () => {
                const vals = [];
                const f = throttle.create((i) => {
                    vals.push(i);
                }, { interval: 100, concurrency: 10, ordered: false, waitForReturn: true });
                await Promise.all(range(50).map(f));
                expect(vals).to.be.deep.equal(range(50));
            });

            describe("args", () => {
                it("should pass context", async () => {
                    const ctx = {};
                    const s = spy();
                    const f = throttle.create(s, { interval: 1000 });
                    await f.call(ctx);
                    expect(s).to.be.calledOnce;
                    expect(s).to.be.calledOn(ctx);
                });

                it("should pass context: late", async () => {
                    const ctx = {};
                    const s = spy();
                    const f = throttle.create({ interval: 1000 });
                    await f.call(ctx, s);
                    expect(s).to.be.calledOnce;
                    expect(s).to.be.calledOn(ctx);
                });

                it("should pass arguments", async () => {
                    const s = spy();
                    const f = throttle.create(s, { interval: 1000 });
                    await f(1, 2, 3);
                    expect(s).to.be.calledOnce;
                    expect(s).to.be.calledWith(1, 2, 3);
                });

                it("should pass arguments: late", async () => {
                    const s = spy();
                    const f = throttle.create({ interval: 1000 });
                    await f(s, 1, 2, 3);
                    expect(s).to.be.calledOnce;
                    expect(s).to.be.calledWith(1, 2, 3);
                });
            });

            describe("drops", () => {
                const { DROPPED } = throttle;

                describe.todo("waitForReturn = true", () => {
                    it("works", () => { });
                });

                it("should drop calls if concurrency is reached", async () => {
                    const fn = throttle.create(() => null, { concurrency: 2, interval: 1000, drop: true, waitForReturn: false });

                    const [a, b, c, d] = await Promise.all([
                        fn(1),
                        fn(2),
                        fn(3),
                        fn(4)
                    ]);

                    expect(a).to.be.equal(null);
                    expect(b).to.be.equal(null);
                    expect(c).to.be.equal(DROPPED);
                    expect(d).to.be.equal(DROPPED);
                });

                it("should not drop last call if dropLast = false", async () => {
                    const fn = throttle.create(() => null, { concurrency: 2, interval: 1000, drop: true, dropLast: false, waitForReturn: false });

                    const a = fn();
                    const b = fn();
                    const c = fn();

                    await promise.delay(100);

                    const d = fn();

                    await promise.delay(2000);

                    const e = fn();
                    const f = fn();

                    await promise.delay(100);

                    const g = fn();
                    const h = fn();

                    expect(await a).to.be.equal(null);
                    expect(await b).to.be.equal(null);
                    expect(await c).to.be.equal(DROPPED);
                    expect(await d).to.be.equal(null);
                    expect(await e).to.be.equal(null);
                    expect(await f).to.be.equal(null);
                    expect(await g).to.be.equal(DROPPED);
                    expect(await h).to.be.equal(null);
                });
            });
        });
    });

    describe("with callback", () => {
        it("runs through three items linearly", (done) => {
            const expected = ["one", "two", "three"];
            const actual = [];
            const limiter = throttle.create({ concurrency: 10 });
            let numEndHandlers = 0;

            const check = () => {
                numEndHandlers++;
                assert.strictEqual(actual.length, numEndHandlers);

                for (const i in actual) {
                    assert.strictEqual(actual[i], expected[i]);
                }

                if (numEndHandlers === 3) {
                    done();
                }
            };

            limiter((cb) => {
                actual.push("one");
                cb();
                check();
            });

            limiter((cb) => {
                actual.push("two");
                cb();
                check();
            });

            setTimeout(() => {
                limiter((cb) => {
                    actual.push("three");
                    cb();
                    check();
                });
            }, 10);
        });

        it("runs through three items concurrently", (done) => {
            const actual = [];
            const limiter = throttle.create({
                concurrency: 10,
                onDone() {
                    const expected = ["one", "two", "three"];
                    assert.strictEqual(actual.length, expected.length);

                    for (const i in actual) {
                        const a = actual[i];
                        const e = expected[i];
                        assert(a === e);
                    }
                    done();
                }
            });

            limiter((cb) => {
                setTimeout(() => {
                    actual.push("one");
                    cb();
                }, 0);
            });

            limiter((cb) => {
                setTimeout(() => {
                    actual.push("three");
                    cb();
                }, 20);
            });

            limiter((cb) => {
                setTimeout(() => {
                    actual.push("two");
                    cb();
                }, 10);
            });
        });
    });
});
