const fs = require("fs");
const { sleep, getPathToNull } = require("./helper");

describe("final", () => {
    it("throws if not supplied a logger instance", async () => {
        assert.throws(() => {
            adone.logger.final();
        }, /Expected logger instance/);
    });

    it("throws if the supplied handler is not a function", async () => {
        assert.throws(() => {
            adone.logger.final(adone.logger(), "dummy");
        }, /if supplied, the handler parameter should be a function/);
    });

    it("throws if not supplied logger with adone.logger.extreme instance", async () => {
        assert.throws(() => {
            adone.logger.final(adone.logger(fs.createWriteStream(getPathToNull())), () => { });
        }, /final requires a stream that has a flushSync method, such as adone.logger.destination and adone.logger.extreme/);

        adone.logger.final(adone.logger(adone.logger.extreme()), () => { });
        adone.logger.final(adone.logger(adone.logger.extreme()), () => { });
    });

    it("returns an exit listener function", async () => {
        assert.equal(typeof adone.logger.final(adone.logger(adone.logger.extreme()), () => { }), "function");
    });

    it("listener function immediately sync flushes when fired", async (done) => {
        const dest = adone.logger.extreme(getPathToNull());
        let passed = false;
        dest.flushSync = () => {
            passed = true;
            done();
            // pass("flushSync called");
        };
        adone.logger.final(adone.logger(dest), () => { })();
        await sleep(10);
        if (passed === false) {
            assert.fail("flushSync not called");
        }
    });

    it("listener function immediately sync flushes when fired (adone.logger.destination)", async (done) => {
        const dest = adone.logger.destination(getPathToNull());
        let passed = false;
        dest.flushSync = () => {
            passed = true;
            done();
            // pass("flushSync called");
        };
        adone.logger.final(adone.logger(dest), () => { })();
        await sleep(10);
        if (passed === false) {
            assert.fail("flushSync not called");
        }
    });

    it("swallows the non-ready error", async () => {
        const dest = adone.logger.extreme(getPathToNull());
        adone.logger.final(adone.logger(dest), () => { })();
    });

    it("listener function triggers handler function parameter", async (done) => {
        const dest = adone.logger.extreme(getPathToNull());
        let passed = false;
        adone.logger.final(adone.logger(dest), () => {
            passed = true;
            done();
            // pass("handler function triggered");
        })();
        await sleep(10);
        if (passed === false) {
            assert.fail("handler function not triggered");
        }
    });

    it("passes any error to the handler", async () => {
        const dest = adone.logger.extreme(getPathToNull());
        adone.logger.final(adone.logger(dest), (err) => {
            assert.equal(err.message, "test");
        })(Error("test"));
    });

    it("passes a specialized final logger instance", async () => {
        const dest = adone.logger.extreme(getPathToNull());
        const logger = adone.logger(dest);
        adone.logger.final(logger, (err, finalLogger) => {
            assert.notExists(err);
            assert.equal(typeof finalLogger.trace, "function");
            assert.equal(typeof finalLogger.debug, "function");
            assert.equal(typeof finalLogger.info, "function");
            assert.equal(typeof finalLogger.warn, "function");
            assert.equal(typeof finalLogger.error, "function");
            assert.equal(typeof finalLogger.fatal, "function");

            assert.notEqual(finalLogger.trace, logger.trace);
            assert.notEqual(finalLogger.debug, logger.debug);
            assert.notEqual(finalLogger.info, logger.info);
            assert.notEqual(finalLogger.warn, logger.warn);
            assert.notEqual(finalLogger.error, logger.error);
            assert.notEqual(finalLogger.fatal, logger.fatal);

            assert.equal(finalLogger.child, logger.child);
            assert.equal(finalLogger.levels, logger.levels);
        })();
    });

    it("returns a specialized final logger instance if no handler is passed", async () => {
        const dest = adone.logger.extreme(getPathToNull());
        const logger = adone.logger(dest);
        const finalLogger = adone.logger.final(logger);
        assert.equal(typeof finalLogger.trace, "function");
        assert.equal(typeof finalLogger.debug, "function");
        assert.equal(typeof finalLogger.info, "function");
        assert.equal(typeof finalLogger.warn, "function");
        assert.equal(typeof finalLogger.error, "function");
        assert.equal(typeof finalLogger.fatal, "function");

        assert.notEqual(finalLogger.trace, logger.trace);
        assert.notEqual(finalLogger.debug, logger.debug);
        assert.notEqual(finalLogger.info, logger.info);
        assert.notEqual(finalLogger.warn, logger.warn);
        assert.notEqual(finalLogger.error, logger.error);
        assert.notEqual(finalLogger.fatal, logger.fatal);

        assert.equal(finalLogger.child, logger.child);
        assert.equal(finalLogger.levels, logger.levels);
    });

    it("final logger instances synchronously flush after a log method call", async (done) => {
        const dest = adone.logger.extreme(getPathToNull());
        const logger = adone.logger(dest);
        let passed = false;
        let count = 0;
        dest.flushSync = () => {
            count++;
            if (count === 2) {
                passed = true;
                done();
                // pass("flushSync called");
            }
        };
        adone.logger.final(logger, (err, finalLogger) => {
            assert.notExists(err);
            finalLogger.info("hello");
        })();
        await sleep(10);
        if (passed === false) {
            assert.fail("flushSync not called");
        }
    });

    it("also instruments custom log methods", async (done) => {
        const dest = adone.logger.extreme(getPathToNull());
        const logger = adone.logger({
            customLevels: {
                foo: 35
            }
        }, dest);
        let passed = false;
        let count = 0;
        dest.flushSync = () => {
            count++;
            if (count === 2) {
                passed = true;
                done();
                // pass("flushSync called");
            }
        };
        adone.logger.final(logger, (err, finalLogger) => {
            assert.notExists(err);
            finalLogger.foo("hello");
        })();
        await sleep(10);
        if (passed === false) {
            assert.fail("flushSync not called");
        }
    });
});
