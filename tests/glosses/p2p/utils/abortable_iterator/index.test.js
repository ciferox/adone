const {
    p2p: { util: { AbortController, abortableIterator } }
} = adone;

describe("", () => {
    it("should abort", async () => {
        const controller = new AbortController();
        const iterator = (async function* () {
            // Never ends!
            while (true) {
                yield new Promise((resolve, reject) => {
                    setTimeout(() => resolve(Math.random()));
                });
            }
        })();

        // Abort after 10ms
        setTimeout(() => controller.abort(), 10);

        const err = await assert.throws(async () => {
            for await (const value of abortableIterator(iterator, controller.signal)) {
                console.log(value);
            }
        });

        assert.equal(err.type, "aborted");
        assert.equal(err.code, "ABORT_ERR");
    });

    it("should multi abort", async () => {
        const controller0 = new AbortController();
        const controller1 = new AbortController();

        const iterator = (async function* () {
            // Never ends!
            while (true) {
                yield new Promise((resolve, reject) => {
                    setTimeout(() => resolve(Math.random()));
                });
            }
        })();

        // Abort after 10ms
        setTimeout(() => controller1.abort(), 10);

        const err = await assert.throws(async () => {
            for await (const value of abortableIterator.multi(iterator, [
                { signal: controller0.signal },
                { signal: controller1.signal }
            ])) {
                console.log(value);
            }
        });

        assert.equal(err.type, "aborted");
        assert.equal(err.code, "ABORT_ERR");
    });

    it("should abort with onAbort handler", async () => {
        const controller = new AbortController();

        const iterator = (async function* () {
            while (true) {
                yield new Promise((resolve) => setTimeout(() => resolve(Math.random()), 1000));
            }
        })();

        // Ensure we allow async cleanup
        let onAbortCalled = false;
        const onAbort = () => new Promise((resolve) => {
            setTimeout(() => {
                onAbortCalled = true;
                resolve();
            }, 1000);
        });

        // Abort after 10ms
        setTimeout(() => controller.abort(), 10);

        const err = await assert.throws(async () => {
            for await (const value of abortableIterator(iterator, controller.signal, { onAbort })) {
                console.log(value);
            }
        });

        assert.equal(err.type, "aborted");
        assert.equal(err.code, "ABORT_ERR");
        expect(onAbortCalled).to.be.true;
    });

    it("should complete successfully", async () => {
        const controller = new AbortController();
        const iterator = (async function* () {
            yield new Promise((resolve, reject) => {
                setTimeout(() => resolve(Math.random()));
            });
        })();

        // Abort after 10ms
        setTimeout(() => controller.abort(), 10);

        for await (const value of abortableIterator(iterator, controller.signal)) {
            console.log(value);
        }
    });

    it("should throw for non iterator/iterable", () => {
        const controller = new AbortController();
        const nonIterator = {};
        const err = assert.throws(() => abortableIterator(nonIterator, controller.signal));
        expect(err.message.includes("not an iterator")).to.be.true;
    });

    it("should abort if already aborted", async () => {
        const controller = new AbortController();
        const iterator = abortableIterator(Array(100).fill(5), controller.signal);

        // Abort before we start consuming
        controller.abort();

        const err = await assert.throws(async () => {
            for await (const value of iterator) {
                console.log(value);
            }
        });

        assert.equal(err.type, "aborted");
        assert.equal(err.code, "ABORT_ERR");
    });
});
