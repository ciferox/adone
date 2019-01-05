import Parent from "./fixtures/parent";
const { testLevels, testOrder } = require("./fixtures");
const {
    infosFor,
    logFor,
    levelAndMessage,
    toException,
    toWriteReq
} = require("./utils");

const {
    app: { logger: { format, TransportStream, LEVEL, MESSAGE } },
    std: { stream: { Writable } }
} = adone;

/**
 * Returns the provided `info` object with the appropriate LEVEL,
 * and MESSAGE symbols defined.
 */
const infoify = function (info) {
    info[LEVEL] = info.level;
    info[MESSAGE] = info.message;
    return info;
};

describe("app", "logger", "TransportStream", () => {
    it("should have the appropriate methods defined", () => {
        const transport = new TransportStream();
        assert.instanceOf(transport, Writable);
        assert.function(transport._write);
        // eslint-disable-next-line no-undefined
        assert.undefined(transport.log);
    });

    it("should accept a custom log function invoked on _write", () => {
        const log = logFor(1);
        const transport = new TransportStream({ log });
        assert.equal(transport.log, log);
    });

    it("should invoke a custom log function on _write", (done) => {
        const info = {
            [LEVEL]: "test",
            level: "test",
            message: "Testing ... 1 2 3."
        };

        const transport = new TransportStream({
            log(actual) {
                assert.strictEqual(actual, info);
                done();
            }
        });

        transport.write(info);
    });

    describe("_write(info, enc, callback)", () => {
        it("should log to any level when { level: undefined }", (done) => {
            const expected = testOrder.map(levelAndMessage);
            const transport = new TransportStream({
                log: logFor(testOrder.length, (err, infos) => {
                    if (err) {
                        return done(err);
                    }

                    assert.strictEqual(infos.length, expected.length);
                    assert.deepEqual(infos, expected);
                    done();
                })
            });

            expected.forEach(transport.write.bind(transport));
        });

        it("should not log when no info object is provided", (done) => {
            const expected = testOrder.map(levelAndMessage).map((info, i) => {
                if (testOrder.length > (i + 1)) {
                    info.private = true;
                }

                return info;
            });
            const transport = new TransportStream({
                format: format((info) => {
                    if (info.private) {
                        return false;
                    }
                    return info;
                })(),
                log: logFor(1, (err, infos) => {
                    if (err) {
                        return done(err);
                    }

                    assert.lengthOf(infos, 1);
                    assert.deepEqual(infos.pop(), expected.pop());
                    done();
                })
            });

            expected.forEach(transport.write.bind(transport));
        });

        it("should only log messages BELOW the level priority", (done) => {
            const expected = testOrder.map(levelAndMessage);
            const transport = new TransportStream({
                level: "info",
                log: logFor(5, (err, infos) => {
                    if (err) {
                        return done(err);
                    }

                    assert.lengthOf(infos, 5);
                    assert.deepEqual(infos, expected.slice(0, 5));
                    done();
                })
            });

            transport.levels = testLevels;
            expected.forEach(transport.write.bind(transport));
        });

        it("{ level } should be ignored when { handleExceptions: true }", () => {
            const expected = testOrder.map(levelAndMessage).map((info) => {
                info.exception = true;
                return info;
            });

            const transport = new TransportStream({
                level: "info",
                log: logFor(testOrder.length, (err, infos) => {
                    // eslint-disable-next-line no-undefined
                    assert.undefined(err);
                    assert.strictEqual(infos.length, expected.length);
                    assert.deepEqual(infos, expected);
                })
            });

            transport.levels = testLevels;
            expected.forEach(transport.write.bind(transport));
        });

        describe("when { exception: true } in info", () => {
            it("should not invoke log when { handleExceptions: false }", (done) => {
                const expected = [{
                    exception: true,
                    [LEVEL]: "error",
                    level: "error",
                    message: "Test exception handling"
                }, {
                    [LEVEL]: "test",
                    level: "test",
                    message: "Testing ... 1 2 3."
                }];

                const transport = new TransportStream({
                    log(info) {
                        // eslint-disable-next-line no-undefined
                        assert.undefined(info.exception);
                        done();
                    }
                });

                expected.forEach(transport.write.bind(transport));
            });

            it("should invoke log when { handleExceptions: true }", (done) => {
                const actual = [];
                const expected = [{
                    exception: true, [LEVEL]: "error",
                    level: "error",
                    message: "Test exception handling"
                }, {
                    [LEVEL]: "test",
                    level: "test",
                    message: "Testing ... 1 2 3."
                }];

                const transport = new TransportStream({
                    handleExceptions: true,
                    log(info, next) {
                        actual.push(info);
                        if (actual.length === expected.length) {
                            assert.deepEqual(actual, expected);
                            return done();
                        }

                        next();
                    }
                });

                expected.forEach(transport.write.bind(transport));
            });
        });
    });

    describe("_writev(chunks, callback)", () => {
        it("invokes .log() for each of the valid chunks when necessary in streams plumbing", (done) => {
            const expected = infosFor({
                count: 50,
                levels: testOrder
            });

            const transport = new TransportStream({
                log: logFor(50 * testOrder.length, (err, infos) => {
                    if (err) {
                        return done(err);
                    }

                    assert.strictEqual(infos.length, expected.length);
                    assert.deepEqual(infos, expected);
                    done();
                })
            });

            //
            // Make the standard _write throw to ensure that _writev is called.
            //
            transport._write = () => {
                throw new Error("TransportStream.prototype._write should never be called.");
            };

            transport.cork();
            expected.forEach(transport.write.bind(transport));
            transport.uncork();
        });

        it("should not log when no info object is provided in streams plumbing", (done) => {
            const expected = testOrder.map(levelAndMessage).map((info, i) => {
                if (testOrder.length > (i + 1)) {
                    info.private = true;
                }

                return info;
            });

            const transport = new TransportStream({
                format: format((info) => {
                    if (info.private) {
                        return false;
                    }

                    return info;
                })(),
                log: logFor(1, (err, infos) => {
                    if (err) {
                        return done(err);
                    }

                    assert.equal(infos.length, 1);
                    assert.deepEqual(infos.pop(), expected.pop());
                    done();
                })
            });

            //
            // Make the standard _write throw to ensure that _writev is called.
            //
            transport._write = () => {
                throw new Error("TransportStream.prototype._write should never be called.");
            };

            transport.cork();
            expected.forEach(transport.write.bind(transport));
            transport.uncork();
        });


        it("ensures a format is applied to each info when no .logv is defined", (done) => {
            const expected = infosFor({ count: 10, levels: testOrder });
            const transport = new TransportStream({
                format: format.json(),
                log: logFor(10 * testOrder.length, (err, infos) => {
                    if (err) {
                        return done(err);
                    }

                    assert.strictEqual(infos.length, expected.length);
                    infos.forEach((info, i) => {
                        assert.strictEqual(info[MESSAGE], JSON.stringify(expected[i]));
                    });

                    done();
                })
            });

            //
            // Make the standard _write throw to ensure that _writev is called.
            //
            transport._write = () => {
                throw new Error("TransportStream.prototype._write should never be called.");
            };

            transport.cork();
            expected.forEach(transport.write.bind(transport));
            transport.uncork();
        });

        it("invokes .logv with all valid chunks when necessary in streams plumbing", (done) => {
            const expected = infosFor({
                count: 50,
                levels: testOrder
            });
            const transport = new TransportStream({
                level: "info",
                log() {
                    throw new Error(".log() should never be called");
                },
                logv(chunks, callback) {
                    assert.equal(chunks.length, 250);
                    callback(); // eslint-disable-line callback-return
                    done();
                }
            });

            //
            // Make the standard _write throw to ensure that _writev is called.
            //
            transport._write = () => {
                throw new Error("TransportStream.prototype._write should never be called.");
            };

            transport.cork();
            transport.levels = testLevels;
            expected.forEach(transport.write.bind(transport));
            transport.uncork();
        });
    });

    describe('parent (i.e. "logger") ["pipe", "unpipe"]', () => {
        it('should define { level, levels } on "pipe"', (done) => {
            const parent = new Parent({
                level: "info",
                levels: testLevels
            });

            const transport = new TransportStream({
                log(info, next) {
                    assert.equal(info.level, "info");
                    assert.equal(info.message, "ok sure");
                    next();
                    done();
                }
            });

            parent.pipe(transport);
            setImmediate(() => {
                assert.undefined(transport.level);
                assert.equal(transport.levels, testLevels);
                assert.equal(transport.parent, parent);
                assert.equal(transport.parent.level, "info");
                transport.write(infoify({ level: "parrot", message: "never logged" }));
                transport.write(infoify({ level: "info", message: "ok sure" }));
            });
        });

        it('should not overwrite existing { level } on "pipe"', (done) => {
            const parent = new Parent({
                level: "info",
                levels: testLevels
            });

            const transport = new TransportStream({
                level: "error",
                log(info, next) {
                    assert.equal(info.level, "error");
                    assert.equal(info.message, "ok sure");
                    next();
                    done();
                }
            });

            parent.pipe(transport);
            setImmediate(() => {
                assert.equal(transport.level, "error");
                assert.equal(transport.levels, testLevels);
                assert.equal(transport.parent, parent);
                transport.write(infoify({ level: "info", message: "never logged" }));
                transport.write(infoify({ level: "error", message: "ok sure" }));
            });
        });

        it("should respond to changes in parent logging level", (done) => {
            const parent = new Parent({
                level: "error",
                levels: testLevels
            });

            const transport = new TransportStream({
                log(info, next) {
                    assert.equal(info.level, "parrot");
                    assert.equal(info.message, "eventually log this");
                    next();
                    done();
                }
            });

            parent.pipe(transport);
            setImmediate(() => {
                assert.equal(transport.levels, testLevels);
                assert.equal(transport.parent, parent);
                transport.write(infoify({ level: "info", message: "never logged" }));

                parent.level = "parrot";
                transport.write(infoify({ level: "parrot", message: "eventually log this" }));
            });
        });

        it('should unset parent on "unpipe"', (done) => {
            const parent = new Parent({
                level: "info",
                levels: testLevels
            });

            const transport = new TransportStream({
                level: "error",
                log() { }
            });

            //
            // Trigger "pipe" first so that transport.parent is set.
            //
            parent.pipe(transport);
            setImmediate(() => {
                assert.equal(transport.parent, parent);

                //
                // Now verify that after "unpipe" it is set to 'null'.
                //
                parent.unpipe(transport);
                setImmediate(() => {
                    assert.null(transport.parent);
                    done();
                });
            });
        });

        it('should invoke a close method on "unpipe"', (done) => {
            const parent = new Parent({
                level: "info",
                levels: testLevels
            });

            const transport = new TransportStream({
                log() { }
            });

            //
            // Test will only successfully complete when `close`
            // is invoked
            //
            transport.close = () => {
                assert.null(transport.parent);
                done();
            };

            //
            // Trigger "pipe" first so that transport.parent is set.
            //
            parent.pipe(transport);
            setImmediate(() => {
                assert.equal(transport.parent, parent);
                parent.unpipe(transport);
            });
        });
    });

    describe("_accept(info)", () => {
        it("should filter only log messages BELOW the level priority", () => {
            const expected = testOrder
                .map(levelAndMessage)
                .map(toWriteReq);

            const transport = new TransportStream({
                level: "info"
            });

            transport.levels = testLevels;
            const filtered = expected.filter(transport._accept, transport)
                .map((write) => write.chunk.level);

            assert.sameMembers(filtered, [
                "error",
                "warn",
                "dog",
                "cat",
                "info"
            ]);
        });

        it("should filter out { exception: true } when { handleExceptions: false }", () => {
            const expected = testOrder
                .map(toException)
                .map(toWriteReq);

            const transport = new TransportStream({
                handleExceptions: false,
                level: "info"
            });

            transport.levels = testLevels;
            const filtered = expected.filter(transport._accept, transport)
                .map((info) => info.level);

            assert.sameMembers(filtered, []);
        });

        it("should include ALL { exception: true } when { handleExceptions: true }", () => {
            const expected = testOrder
                .map(toException)
                .map(toWriteReq);

            const transport = new TransportStream({
                handleExceptions: true,
                level: "info"
            });

            transport.levels = testLevels;
            const filtered = expected.filter(transport._accept, transport)
                .map((write) => write.chunk.level);

            assert.sameMembers(filtered, testOrder);
        });
    });

    describe("{ format }", () => {
        it("logs the output of the provided format", (done) => {
            const expected = {
                [LEVEL]: "info",
                level: "info",
                message: "there will be json"
            };

            const transport = new TransportStream({
                format: format.json(),
                log(info) {
                    assert.equal(info[MESSAGE], JSON.stringify(expected));
                    done();
                }
            });

            transport.write(expected);
        });

        it("treats the original object immutable", (done) => {
            const expected = {
                [LEVEL]: "info",
                level: "info",
                message: "there will be json"
            };

            const transport = new TransportStream({
                format: format.json(),
                log(info) {
                    assert.notEqual(info, expected);
                    done();
                }
            });

            transport.write(expected);
        });

        it("_write continues to write after a format throws", (done) => {
            const transport = new TransportStream({
                format: format.printf((info) => {
                    // Set a trap.
                    if (info.message === "ENDOR") {
                        throw new Error("ITS A TRAP!");
                    }

                    return info.message;
                }),
                log(info, callback) {
                    callback();
                    assert.equal(info.level, "info");
                    assert.equal(info.message, "safe");
                    done();
                }
            });

            try {
                transport.write({ level: "info", message: "ENDOR" });
            } catch (ex) {
                assert.equal(ex.message, "ITS A TRAP!");
            }

            transport.write({ level: "info", message: "safe" });
        });

        it("_writev continues to write after a format throws", (done) => {
            const transport = new TransportStream({
                format: format.printf((info) => {
                    // Set a trap.
                    if (info.message === "ENDOR") {
                        throw new Error("ITS A TRAP!");
                    }

                    return info.message;
                }),
                log(info, callback) {
                    assert.string(info.level);
                    assert.string(info.message);
                    callback();

                    if (info.message === "safe") {
                        done();
                    }
                }
            });

            const infos = infosFor({
                count: 10,
                levels: testOrder
            });

            try {
                transport.cork();
                infos.forEach((info) => transport.write(info));
                transport.write({ level: "info", message: "ENDOR" });
                transport.uncork();
            } catch (ex) {
                assert.equal(ex.message, "ITS A TRAP!");
            }

            transport.write({ level: "info", message: "safe" });
        });
    });

    describe("{ silent }", () => {
        const silentTransport = new TransportStream({
            silent: true,
            format: format.json(),
            log() {
                assert(false, ".log() was called improperly");
            }
        });

        it("{ silent: true } ._write() never calls `.log`", (done) => {
            const expected = {
                [LEVEL]: "info",
                level: "info",
                message: "there will be json"
            };

            silentTransport.write(expected);
            setImmediate(() => done());
        });

        it("{ silent: true } ._writev() never calls `.log`", (done) => {
            const expected = {
                [LEVEL]: "info",
                level: "info",
                message: "there will be json"
            };

            silentTransport.cork();
            for (let i = 0; i < 15; i++) {
                silentTransport.write(expected);
            }

            silentTransport.uncork();
            setImmediate(() => done());
        });

        it("{ silent: true } ensures ._accept(write) always returns false", () => {
            const accepted = silentTransport._accept({ chunk: {} });
            assert.false(accepted);
        });
    });
});
