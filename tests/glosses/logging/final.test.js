const {
    logging: { fastLogger }
} = adone;

const fs = require("fs");
const { sleep } = require("./helper");

describe.todo("final", () => {
    it("replaces onTerminated option", async () => {
        assert.throws(() => {
            fastLogger({
                onTerminated: () => { }
            });
        }, Error("The onTerminated option has been removed, use pino.final instead"));
    });

    it("throws if not supplied a logger instance", async () => {
        assert.throws(() => {
            fastLogger.final();
        }, Error("expected a pino logger instance"));
    });

    it("throws if the supplied handler is not a function", async () => {
        assert.throws(() => {
            fastLogger.final(fastLogger(), "dummy");
        }, Error("if supplied, the handler parameter should be a function"));
    });

    it("throws if not supplied logger with pino.extreme instance", async () => {
        assert.throws(() => {
            fastLogger.final(fastLogger(fs.createWriteStream("/dev/null")), () => { });
        }, Error("final requires a stream that has a flushSync method, such as pino.destination and pino.extreme"));

        fastLogger.final(fastLogger(fastLogger.extreme()), () => { });

        fastLogger.final(fastLogger(fastLogger.extreme()), () => { });
    });

    it("returns an exit listener function", async ({ is }) => {
        assert.equal(typeof fastLogger.final(fastLogger(fastLogger.extreme()), () => { }), "function");
    });

    it("listener function immediately sync flushes when fired", async (done) => {
        const dest = fastLogger.extreme("/dev/null");
        let passed = false;
        dest.flushSync = () => {
            passed = true;
            done(/*"flushSync called"*/);
        };
        fastLogger.final(fastLogger(dest), () => { })();
        await sleep(10);
        if (passed === false) {
            assert.fail("flushSync not called");
        }
    });

    it("listener function immediately sync flushes when fired (pino.destination)", async (done) => {
        const dest = fastLogger.destination("/dev/null");
        let passed = false;
        dest.flushSync = () => {
            passed = true;
            done(/*"flushSync called"*/);
        };
        fastLogger.final(fastLogger(dest), () => { })();
        await sleep(10);
        if (passed === false) {
            assert.fail("flushSync not called");
        }
    });

    it("swallows the non-ready error", async () => {
        const dest = fastLogger.extreme("/dev/null");
        fastLogger.final(fastLogger(dest), () => { })();
    });

    it("listener function triggers handler function parameter", async (done) => {
        const dest = fastLogger.extreme("/dev/null");
        let passed = false;
        fastLogger.final(fastLogger(dest), () => {
            passed = true;
            done(/*"handler function triggered"*/);
        })();
        await sleep(10);
        if (passed === false) {
            assert.fail("handler function not triggered");
        }
    });

    it("passes any error to the handler", async ({ is }) => {
        const dest = fastLogger.extreme("/dev/null");
        fastLogger.final(fastLogger(dest), (err) => {
            assert.equal(err.message, "test");
        })(Error("test"));
    });

    it("passes a specialized final logger instance", async () => {
        const dest = fastLogger.extreme("/dev/null");
        const logger = fastLogger(dest);
        fastLogger.final(logger, (err, finalLogger) => {
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
        const dest = fastLogger.extreme("/dev/null");
        const logger = fastLogger(dest);
        const finalLogger = fastLogger.final(logger);
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

    it("final logger instances synchronously flush after a log method call", async () => {
        const dest = fastLogger.extreme("/dev/null");
        const logger = fastLogger(dest);
        let passed = false;
        let count = 0;
        dest.flushSync = () => {
            count++;
            if (count === 2) {
                passed = true;
                // done(/*"flushSync called"*/);
            }
        };
        fastLogger.final(logger, (err, finalLogger) => {
            assert.notExists(err);
            finalLogger.info("hello");
        })();
        await sleep(10);
        if (passed === false) {
            assert.fail("flushSync not called");
        }
    });

    it("also instruments custom log methods", async () => {
        const dest = fastLogger.extreme("/dev/null");
        const logger = fastLogger({
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
                // done(/*"flushSync called"*/);
            }
        };
        fastLogger.final(logger, (err, finalLogger) => {
            assert.notExists(err);
            finalLogger.foo("hello");
        })();
        await sleep(10);
        if (passed === false) {
            assert.fail("flushSync not called");
        }
    });
});
