const { throat } = adone.util;
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

describe("utils", "throat", () => {
    describe("throat(n)", () => {
        it("throat(1) acts as a lock", () => {
            const lock = throat(1);
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

        it("throat(2) lets two processes acquire the same lock", () => {
            const lock = throat(2);
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

        it("throat(3) lets three processes acquire the same lock", () => {
            const lock = throat(3);
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

    describe("throat(n, fn)", () => {
        it("throat(1, fn) acts as a sequential worker", () => {
            return Promise.all([sentA, sentB, sentC].map(throat(1, worker(1)))).then((res) => {
                assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
            });
        });

        it("throat(2, fn) works on two inputs in parallel", () => {
            return Promise.all([sentA, sentB, sentC].map(throat(2, worker(2)))).then((res) => {
                assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
            });
        });

        it("throat(3, fn) works on three inputs in parallel", () => {
            return Promise.all([sentA, sentB, sentC].map(throat(3, worker(3)))).then((res) => {
                assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
            });
        });
    });

    describe("throat(fn, n)", () => {
        it("throat(fn, 1) acts as a sequential worker", () => {
            return Promise.all([sentA, sentB, sentC].map(throat(worker(1), 1))).then((res) => {
                assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
            });
        });

        it("throat(fn, 2) works on two inputs in parallel", () => {
            return Promise.all([sentA, sentB, sentC].map(throat(worker(2), 2))).then((res) => {
                assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
            });
        });

        it("throat(fn, 3) works on three inputs in parallel", () => {
            return Promise.all([sentA, sentB, sentC].map(throat(worker(3), 3))).then((res) => {
                assert(res[0] instanceof Processed && res[0].val.length > 1 && res[0].val[0] === sentA);
                assert(res[1] instanceof Processed && res[1].val.length > 1 && res[1].val[0] === sentB);
                assert(res[2] instanceof Processed && res[2].val.length > 1 && res[2].val[0] === sentC);
            });
        });
    });

    describe("type errors", () => {
        it("size as a string", () => {
            try {
                throat("foo");
            } catch (ex) {
                assert(/Expected throat size to be a number/.test(ex.message));
                return;
            }
            throw new Error("Expected a failure");
        });

        it("fn as a string", () => {
            try {
                throat(2, "foo");
            } catch (ex) {
                assert(/Expected throat fn to be a function/.test(ex.message));
                return;
            }
            throw new Error("Expected a failure");
        });

        it("late fn as a string", () => {
            try {
                throat(2)("foo");
            } catch (ex) {
                assert(/Expected throat fn to be a function/.test(ex.message));
                return;
            }
            throw new Error("Expected a failure");
        });
    });
});
