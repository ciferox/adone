const {
    event: { AsyncEmitter }
} = adone;

describe("AsyncEmitter", () => {
    it("is.emitter() should return true", () => {
        const emitter = new AsyncEmitter();
        assert.true(adone.is.emitter(emitter));
        assert.true(adone.is.asyncEmitter(emitter));
    });
    
    describe("emitParallel()", () => {
        it("should receive the return value of listeners asynchronously", async () => {
            const emitter = new AsyncEmitter();
            emitter.on("foo", (action) => action);
            emitter.on("foo", (action) => new Promise((resolve) => {
                setTimeout(() => resolve(action));
            }));

            const values = await emitter.emitParallel("foo", "bar");
            assert.equal(values.length, 2);
            assert.equal(values[0], "bar");
            assert.equal(values[1], "bar");
        });

        it("if an error occurs, it should throw an error only the first one", async () => {
            const emitter = new AsyncEmitter();
            emitter.on("foo", (action) => action);
            emitter.on("foo", () => new Promise(() => {
                throw new Error("beep");
            }));
            emitter.on("foo", () => Promise.reject(new Error("boop")));

            try {
                await emitter.emitParallel("foo", "bar");
            } catch (err) {
                assert.equal(err.message, "beep");
            }
        });

        it("if the promise was rejected, it should throw only the first of the reject", async () => {
            const emitter = new AsyncEmitter();
            emitter.on("foo", (action) => action);
            emitter.on("foo", () => Promise.reject(new Error("boop")));
            emitter.on("foo", () => new Promise(() => {
                throw new Error("beep");
            }));

            try {
                await emitter.emitParallel("foo", "bar");
            } catch (err) {
                assert.equal(err.message, "boop");
            }
        });

        it("if throws error, it should be handled as reject", async () => {
            const emitter = new AsyncEmitter();
            emitter.on("foo", (action) => action);
            emitter.on("foo", () => {
                throw new Error("boop");
            });
            emitter.on("foo", () => Promise.reject(new Error("beep")));
            try {
                await emitter.emitParallel("foo", "bar");
            } catch (err) {
                assert.equal(err.message, "boop");
            }
        });
    });

    describe("emitSerial()", () => {
        it("listener should be run serially", async () => {
            const delay = 100;
            const expectedArray = new Array(3);
            let index = 0;
            const emitter = new AsyncEmitter();
            emitter.on("delay", (ms) => new Promise((resolve) => {
                setTimeout(() => {
                    expectedArray[index] = index;
                    resolve(index++);
                }, ms);
            }));
            emitter.on("delay", (ms) => new Promise((resolve) => {
                setTimeout(() => {
                    expectedArray[index] = index;
                    resolve(index++);
                }, ms);
            }));
            emitter.on("delay", (ms) => new Promise((resolve) => {
                setTimeout(() => {
                    expectedArray[index] = index;
                    resolve(index++);
                }, ms);
            }));

            const values = await emitter.emitSerial("delay", delay);
            assert.sameMembers(expectedArray, values);
        });

        it("if an error occurs, it should throw an error only the first one", async () => {
            const delay = 100;
            const emitter = new AsyncEmitter();
            emitter.on("delay", (ms) => new Promise((resolve) => {
                setTimeout(() => resolve(Date.now()), ms);
            }));
            emitter.on("delay", (ms) => new Promise((resolve, reject) => {
                setTimeout(() => reject(new Error("foo")), ms);
            }));
            emitter.on("delay", (ms) => new Promise((resolve, reject) => {
                setTimeout(() => reject(new Error("bar")), ms);
            }));

            try {
                await emitter.emitSerial("delay", delay);
            } catch (err) {
                assert.equal(err.message, "foo");
            }
        });
    });

    describe("emitReduce()/emitReduceRight()", () => {
        it("listener should be run serially using previous listener return value", async () => {
            assert.deepEqual((await (new AsyncEmitter().emitReduce("noop"))), []);
            assert.deepEqual((await (new AsyncEmitter().emitReduce("noop", 1))), [1]);

            const emitter = new AsyncEmitter();
            emitter.on("square", (keys, value) => Promise.resolve([keys.concat(1), value * value]));
            emitter.on("square", (keys, value) => Promise.resolve([keys.concat(2), value * value]));
            emitter.on("square", (keys, value) => Promise.resolve([keys.concat(3), value * value]));

            assert.deepEqual(
                (await emitter.emitReduce("square", [], 2)),
                [[1, 2, 3], 256]
            );
            assert.deepEqual(
                (await emitter.emitReduceRight("square", [], 2)),
                [[3, 2, 1], 256]
            );
        });

        it("if listener returns a non-array, it should be passed on correctly value to the next listener", async () => {
            const emitter = new AsyncEmitter();
            emitter.on("normal", () => 1);
            emitter.on("normal", (value) => [value]);

            assert.deepEqual(
                (await emitter.emitReduce("normal")),
                [1]
            );
        });

        it("if an error occurs, it should throw an error only the first one", async () => {
            const emitter = new AsyncEmitter();
            emitter.on("square", (keys, value1) => Promise.resolve([keys.concat(1), value1 * 2]));
            emitter.on("square", () => Promise.reject(new Error("foo")));
            emitter.on("square", () => Promise.reject(new Error("bar")));

            try {
                await emitter.emitReduce("square", [], 1);
            } catch (err) {
                assert.equal(err.message, "foo");
            }

            try {
                await emitter.emitReduceRight("square", [], 1);
            } catch (err) {
                assert.equal(err.message, "bar");
            }
        });
    });

    describe("once()", () => {
        it("listeners that have been executed should be removed immediately", async () => {
            const emitter = new AsyncEmitter();
            emitter.once("foo", (action) => action);

            let values;
            values = await emitter.emitParallel("foo", "bar");
            assert.equal(values.length, 1);
            assert.equal(values[0], "bar");

            values = await emitter.emitParallel("foo", "bar");
            assert.equal(values.length, 0);
            assert.equal(values[0], undefined);
        });

        it("if the argument isn't function, should throw an error", async () => {
            const emitter = new AsyncEmitter();
            try {
                await emitter.once("foo", "bad argument!");
            } catch (err) {
                assert.equal(err.message, "listener must be a function");
            }
        });
    });

    describe("subscribe()", () => {
        it("if executed the return value, should remove the listener", async () => {
            const emitter = new AsyncEmitter();
            const unsubcribe = emitter.subscribe("foo", (action) => action);

            let values;
            values = await emitter.emitParallel("foo", "bar");
            assert.equal(values.length, 1);
            assert.equal(values[0], "bar");

            unsubcribe();

            values = await emitter.emitParallel("foo", "bar");
            assert.equal(values.length, 0);
            assert.equal(values[0], undefined);
        });

        it("if specify third argument is true, should remove the listener after executed", async () => {
            const emitter = new AsyncEmitter();

            const unsubscribe = emitter.subscribe("foo", (action) => action, true);
            unsubscribe();

            emitter.subscribe("foo", (action) => action, true);
            let values;
            values = await emitter.emitParallel("foo", "bar");
            assert.equal(values.length, 1);
            assert.equal(values[0], "bar");

            values = await emitter.emitParallel("foo", "bar");
            assert.equal(values.length, 0);
            assert.equal(values[0], undefined);
        });
    });

    describe("setConcurrency()", () => {
        const delay = 100;
        const delayTolerance = 10;
        const delayListener = () => new Promise((resolve) => {
            setTimeout(() => resolve(Date.now()), delay);
        });

        it("should set max concurrency in the constructor", async () => {
            const emitter = new AsyncEmitter(2);
            emitter.on("foo", delayListener);
            emitter.on("foo", delayListener);
            emitter.on("foo", delayListener);
            emitter.on("foo", delayListener);
            emitter.on("foo", delayListener);

            const [a, b, c, d, e] = await emitter.emitParallel("foo");
            assert.ok(b - a < delay + delayTolerance);
            assert.ok(c - b >= delay - delayTolerance);
            assert.ok(d - c < delay + delayTolerance);
            assert.ok(e - d >= delay - delayTolerance);
        });

        it("the limit should be managed by an instance", async () => {
            const emitter = new AsyncEmitter(2);
            emitter.on("foo", delayListener);

            const [[a], [b], [c], [d], [e]] = await Promise.all([
                emitter.emitSerial("foo"),
                emitter.emitSerial("foo"),
                emitter.emitSerial("foo"),
                emitter.emitSerial("foo"),
                emitter.emitSerial("foo")
            ]);
            assert.ok(b - a < delay + delayTolerance);
            assert.ok(c - b >= delay - delayTolerance);
            assert.ok(d - c < delay + delayTolerance);
            assert.ok(e - d >= delay - delayTolerance);
        });

        it("should the maximum number that changed are applied", async () => {
            const emitter = new AsyncEmitter(1);
            emitter.on("foo", delayListener);
            emitter.on("foo", delayListener);

            const [[a, b], [c, d]] = await Promise.all([
                emitter.emitParallel("foo"),
                emitter.setConcurrency(2).emitParallel("foo")
            ]);
            assert.ok(b - a >= delay - delayTolerance);
            assert.ok(d - c < delay + delayTolerance);
        });
    });

    describe("issues (regression test)", () => {
        describe("once()", () => {
            it("#3: always the listener should be stopped at the removeListener", async () => {
                const listener = () => 1;
                const emitter = new AsyncEmitter();
                emitter.once("foo", listener);
                emitter.removeListener("foo", listener);

                const values = await emitter.emitParallel("foo");
                assert.equal(values.length, 0);
                assert.equal(values[0], undefined);
            });
        });
        describe("emitSerial()", () => {
            it("#4: should not be destroying a listener for the return values", async () => {
                const delay = 100;
                const emitter = new AsyncEmitter();
                emitter.on("delay", () => [1]);
                emitter.on("delay", () => [2]);

                const values = await emitter.emitSerial("delay", delay);
                assert.equal(values[0][0], 1);
                assert.equal(values[1][0], 2);
            });
        });
    });
});
