const helpers = require("./helpers");

const stdMocks = require("std-mocks");
import { createMockTransport } from "./helpers/mocks/mock-transport";
const split = require("split2");


const {
    logging: { logger },
    is,
    noop,
    std: { fs, util: { format }, path, stream, childProcess: { spawn }, os }
} = adone;

const {
    Stream,
    Writable
} = stream;

const {
    MESSAGE, SPLAT,
    ExceptionStream,
    TransportStream,
    Profiler,
    tailFile
} = logger;

describe("logger", () => {
    describe("transports", () => {
        it("common", () => {
            assert.isTrue(is.object(logger.transport));
            assert.isTrue(is.function(logger.TransportStream));
            assert.isTrue(is.function(logger.transport.Console));
            assert.isTrue(is.function(logger.transport.File));
        });

        describe("Console", () => {
            const defaultLevels = logger.config.npm;
            const transports = {
                defaults: new logger.transport.Console(),
                noStderr: new logger.transport.Console({ stderrLevels: [] }),
                stderrLevels: new logger.transport.Console({
                    stderrLevels: ["info", "error"]
                }),
                consoleWarnLevels: new logger.transport.Console({
                    consoleWarnLevels: ["warn", "debug"]
                }),
                eol: new logger.transport.Console({ eol: "X" }),
                syslog: new logger.transport.Console({
                    config: logger.config.syslog
                }),
                customLevelStderr: new logger.transport.Console({
                    config: {
                        alpha: {
                            id: 0
                        },
                        beta: {
                            id: 1
                        },
                        gamma: {
                            id: 2
                        },
                        delta: {
                            id: 3
                        },
                        epsilon: {
                            id: 4
                        }
                    },
                    stderrLevels: ["delta", "epsilon"]
                })
            };

            /**
             * Returns a function that asserts the `transport` has the specified
             * logLevels values in the appropriate logLevelsName member.
             *
             * @param  {TransportStream} transport Transport to assert against
             * @param  {Array} logLevels Set of levels assumed to exist for the specified map
             * @param  {String} logLevelsName The name of the array/map that holdes the log leveles values (ie: 'stderrLevels', 'consoleWarnLevels')
             * @return {function} Assertion function to execute comparison
             */
            const assertLogLevelsValues = function (transport, logLevels, logLevelsName = "stderrLevels") {
                return function () {
                    assert.strictEqual(JSON.stringify(Object.keys(transport[logLevelsName]).sort()), JSON.stringify(logLevels.sort()));
                };
            };

            describe("with defaults", () => {
                it.skip("logs all levels to stdout", () => {
                    stdMocks.use();
                    transports.defaults.config = defaultLevels;
                    Object.keys(defaultLevels).forEach((level) => {
                        const info = {
                            [logger.LEVEL]: level,
                            message: `This is level ${level}`,
                            level
                        };

                        info[MESSAGE] = JSON.stringify(info);
                        transports.defaults.log(info);
                    });

                    stdMocks.restore();
                    const output = stdMocks.flush();
                    assert.array(output.stderr);
                    assert.lengthOf(output.stderr, 0);
                    assert.array(output.stdout);
                    assert.lengthOf(output.stdout, 7);
                });

                it("should set stderrLevels to [] by default", assertLogLevelsValues(
                    transports.defaults,
                    [],
                    "stderrLevels"
                ));
            });

            describe("throws an appropriate error when", () => {
                it("if stderrLevels is set, but not an Array { stderrLevels: 'Not an Array' }", () => {
                    assert.throws(() => {
                        const throwing = new logger.transport.Console({
                            stderrLevels: "Not an Array"
                        });
                    }, /Cannot make set from type other than Array of string elements/);
                });

                it("if stderrLevels contains non-string elements { stderrLevels: ['good', /^invalid$/, 'valid']", () => {
                    assert.throws(() => {
                        const throwing = new logger.transport.Console({
                            stderrLevels: ["good", /^invalid$/, "valid"]
                        });
                    }, /Cannot make set from type other than Array of string elements/);
                });
            });

            it("{ stderrLevels: ['info', 'error'] } logs to them appropriately", () => {
                assertLogLevelsValues(
                    transports.stderrLevels,
                    ["info", "error"],
                    "stderrLevels"
                )();
            });

            it("{ consoleWarnLevels: ['warn', 'debug'] } logs to them appropriately", () => {
                assertLogLevelsValues(
                    transports.consoleWarnLevels,
                    ["warn", "debug"],
                    "consoleWarnLevels"
                )();
            });

            it.skip("{ eol } adds a custom EOL delimiter", (done) => {
                stdMocks.use();
                transports.eol.log({ [MESSAGE]: "info: testing. 1 2 3..." }, () => {
                    stdMocks.restore();

                    const output = stdMocks.flush();


                    const line = output.stdout[0];

                    assert.strictEqual(line, "info: testing. 1 2 3...X");
                    done();
                });
            });
        });

        describe("Stream({ stream })", () => {
            const { writeable } = helpers;

            it("should support objectMode streams", (done) => {
                const expected = {
                    level: "info",
                    message: "lolwut testing!"
                };

                const stream = writeable((info) => {
                    assert.equal(info, expected);
                    done();
                });

                const transport = new logger.transport.Stream({ stream });
                transport.log(expected);
            });

            it("should support UTF8 encoding streams", (done) => {
                const expected = {
                    level: "info",
                    message: "lolwut testing!",
                    [MESSAGE]: "info: lolwut testing!"
                };

                const stream = writeable((raw) => {
                    assert.equal(raw.toString(), `${expected[MESSAGE]}${os.EOL}`);
                    done();
                }, false);

                const transport = new logger.transport.Stream({ stream });
                transport.log(expected);
            });

            it("should throw when not passed a stream", () => {
                assert.throws(() => {
                    new logger.transport.Stream();
                }, "options.stream is required."); "";
            });
        });


        describe("File({ filename })", function () {
            this.timeout(10 * 1000);

            it("should write to the file when logged to with expected object", (done) => {
                const filename = path.join(__dirname, "fixtures", "file", "simple.log");
                const transport = new logger.transport.File({
                    filename
                });

                const info = { [MESSAGE]: "this is my log message" };
                let logged = 0;
                let read = 0;

                const cleanup = () => {
                    fs.unlinkSync(filename);
                };

                transport.log(info, noop);
                setImmediate(() => {
                    helpers.tryRead(filename)
                        .on("error", (err) => {
                            assert.isFalse(err);
                            cleanup();
                            done();
                        })
                        .pipe(split())
                        .on("data", (d) => {
                            assert.isAtLeast(++read, logged);
                            assert.strictEqual(d, info[MESSAGE]);
                        })
                        .on("end", () => {
                            cleanup();
                            done();
                        });
                });

                transport.once("logged", () => {
                    logged++;
                });
            });
        });

        describe("logger.transport.File tailrolling", () => {
            //
            // Remove all log fixtures
            //
            const removeFixtures = async () => {
                await adone.fs.rm(path.join(__dirname, "fixtures", "logs", "testtailrollingfiles*"));
            };

            let tailrollTransport = null;


            describe("An instance of the File Transport", () => {
                before(removeFixtures);
                after(removeFixtures);

                it("init logger AFTER cleaning up old files", () => {
                    tailrollTransport = new logger.transport.File({
                        timestamp: false,
                        json: false,
                        filename: path.join(__dirname, "fixtures", "logs", "testtailrollingfiles.log"),
                        maxsize: 4096,
                        maxFiles: 3,
                        tailable: true
                    }).on("open", console.log); // eslint-disable-line no-console
                });

                it("and when passed more files than the maxFiles", (done) => {
                    let created = 0;
                    let loggedTotal = 0;

                    const data = (ch, kb) => {
                        return String.fromCharCode(65 + ch).repeat(kb * 1024 - 1);
                    };

                    const logKbytes = (kbytes, txt) => {
                        const toLog = {};
                        toLog[MESSAGE] = data(txt, kbytes);
                        tailrollTransport.log(toLog);
                    };

                    tailrollTransport.on("logged", (info) => {
                        loggedTotal += info[MESSAGE].length + 1;
                        if (loggedTotal >= 14 * 1024) { // just over 3 x 4kb files
                            return done();
                        }

                        if (loggedTotal % 4096 === 0) {
                            created++;
                        }
                        // eslint-disable-next-line max-nested-callbacks
                        setTimeout(() => logKbytes(1, created), 1);
                    });

                    logKbytes(1, created);
                });

                it("should be 3 log files, base to maxFiles - 1", () => {
                    for (let num = 0; num < 4; num++) {
                        const file = !num ? "testtailrollingfiles.log" : `testtailrollingfiles${num}.log`;
                        const fullpath = path.join(__dirname, "fixtures", "logs", file);

                        if (num === 3) {
                            return assert.ok(!fs.existsSync(fullpath));
                        }

                        assert.ok(fs.existsSync(fullpath));
                    }

                    return false;
                });

                it("should have files in correct order", () => {
                    ["D", "C", "B"].forEach((letter, i) => {
                        const file = !i ? "testtailrollingfiles.log" : `testtailrollingfiles${i}.log`;
                        let content = fs.readFileSync(path.join(__dirname, "fixtures", "logs", file), "ascii");
                        content = content.replace(/\s+/g, "");

                        assert(content.match(new RegExp(letter, "g"))[0].length, content.length);
                    });
                });
            });
        });

        describe("File (maxsize)", function () {
            this.timeout(10000);

            //
            // Remove all log fixtures
            //
            const removeFixtures = async () => {
                await adone.fs.rm(path.join(__dirname, "fixtures", "logs", "testmaxsize*"));
            };

            let testDone = false;
            before(removeFixtures);
            after(async () => {
                testDone = true;
                await removeFixtures();
            });

            it("should create multiple files correctly when passed more than the maxsize", (done) => {
                const fillWith = ["a", "b", "c", "d", "e"];
                const maxsizeTransport = new logger.transport.File({
                    level: "info",
                    format: logger.format.printf((info) => info.message),
                    filename: path.join(__dirname, "fixtures", "logs", "testmaxsize.log"),
                    maxsize: 4096
                });

                //
                // Have to wait for `fs.stats` to be done in `maxsizeTransport.open()`.
                // Otherwise the maxsizeTransport._dest is undefined. See https://github.com/winstonjs/winston/issues/1174
                //
                setTimeout(() => logKbytes(4), 100);

                //
                // Setup a list of files which we will later stat.
                //
                const files = [];

                //
                // Assets all the files have been created with the
                // correct filesize
                //
                const assumeFilesCreated = function () {
                    files.map((file, i) => {
                        let stats;
                        try {
                            stats = fs.statSync(file);
                        } catch (ex) {
                            assert.isObject(stats, `${file} failed to open: ${ex.message}`);
                        }

                        const text = fs.readFileSync(file, "utf8");
                        assert.strictEqual(text[0], fillWith[i]);
                        // Either 4096 on Unix or 4100 on Windows
                        // because of the eol.
                        if (process.platform === "win32") {
                            assert.equal(stats.size, 4100);
                        } else {
                            assert.equal(stats.size, 4096);
                        }
                    });

                    done();
                };

                //
                // Log the specified kbytes to the transport
                //
                const logKbytes = (kbytes) => {
                    //
                    // Shift the next fill char off the array then push it back
                    // to rotate the chars.
                    //
                    const filler = fillWith.shift();
                    fillWith.push(filler);

                    //
                    //
                    // To not make each file not fail the assertion of the filesize we can
                    // make the array 1023 characters long.
                    //
                    const kbStr = Array(1023).fill(filler).join("");

                    //
                    // With printf format that displays the message only
                    // logger adds exactly 0 characters.
                    //
                    for (let i = 0; i < kbytes; i++) {
                        maxsizeTransport.log({ level: "info", [MESSAGE]: kbStr });
                    }
                };

                maxsizeTransport.on("open", (file) => {
                    if (testDone) {
                        return;
                    } // ignore future notifications

                    const match = file.match(/(\d+)\.log$/);
                    const count = match ? match[1] : 0;

                    if (files.length === 5) {
                        return assumeFilesCreated();
                    }

                    files.push(file);
                    setImmediate(() => logKbytes(4));
                });
            });
        });

        describe("logger.transport.File zippedArchive", () => {
            const removeFixtures = async () => {
                await adone.fs.rm(path.join(__dirname, "fixtures", "logs", "testarchive*"));
            };

            let archiveTransport = null;


            describe("An instance of the File Transport with tailable true", () => {
                before(removeFixtures);
                after(removeFixtures);

                it("init logger AFTER cleaning up old files", () => {
                    archiveTransport = new logger.transport.File({
                        timestamp: true,
                        json: false,
                        zippedArchive: true,
                        tailable: true,
                        filename: "testarchive.log",
                        dirname: path.join(__dirname, "fixtures", "logs"),
                        maxsize: 4096,
                        maxFiles: 3
                    });
                });

                it("when created archived files are rolled", (done) => {
                    let created = 0;
                    let loggedTotal = 0;

                    const data = (ch, kb) => {
                        return String.fromCharCode(65 + ch).repeat(kb * 1024 - 1);
                    };

                    const logKbytes = (kbytes, txt) => {
                        const toLog = {};
                        toLog[MESSAGE] = data(txt, kbytes);
                        archiveTransport.log(toLog);
                    };

                    archiveTransport.on("logged", (info) => {
                        loggedTotal += info[MESSAGE].length + 1;
                        if (loggedTotal >= 14 * 1024) { // just over 3 x 4kb files
                            return done();
                        }

                        if (loggedTotal % 4096 === 0) {
                            created++;
                        }
                        // eslint-disable-next-line max-nested-callbacks
                        setTimeout(() => logKbytes(1, created), 1);
                    });

                    logKbytes(1, created);
                });

                it("should be only 3 files called testarchive.log, testarchive1.log.gz and testarchive2.log.gz", () => {
                    for (let num = 0; num < 4; num++) {
                        const file = !num ? "testarchive.log" : `testarchive${num}.log.gz`;
                        const fullpath = path.join(__dirname, "fixtures", "logs", file);

                        if (num === 3) {
                            return assert.throws(() => {
                                fs.statSync(fullpath);
                            }, Error);
                        }

                        assert.doesNotThrow(() => {
                            fs.statSync(fullpath);
                        }, Error);
                    }
                });
            });
        });


        describe("File (stress)", function () {
            this.timeout(30 * 1000);

            const logPath = path.resolve(__dirname, "fixtures/logs/file-stress-test.log");
            beforeEach((done) => {
                try {
                    fs.unlinkSync(logPath);
                } catch (ex) {
                    if (ex && ex.code !== "ENOENT") {
                        return done(ex);
                    }
                }
                done();
            });

            it("should handle a high volume of writes", (done) => {
                const l = logger.create({
                    transports: [new logger.transport.File({
                        filename: logPath
                    })]
                });

                const counters = {
                    write: 0,
                    read: 0
                };

                const interval = setInterval(() => {
                    l.info(++counters.write);
                }, 0);

                setTimeout(() => {
                    clearInterval(interval);

                    helpers.tryRead(logPath)
                        .on("error", (err) => {
                            assert.isFalse(err);
                            l.close();
                            done();
                        })
                        .pipe(split())
                        .on("data", (d) => {
                            const json = JSON.parse(d);
                            assert.strictEqual(json.level, "info");
                            assert.strictEqual(json.message, ++counters.read);
                        })
                        .on("end", () => {
                            assert.strictEqual(counters.write, counters.read);
                            l.close();
                            done();
                        });
                }, 10000);
            });

            it("should handle a high volume of large writes", (done) => {
                const l = logger.create({
                    transports: [new logger.transport.File({
                        filename: logPath
                    })]
                });

                const counters = {
                    write: 0,
                    read: 0
                };

                const interval = setInterval(() => {
                    const msg = {
                        counter: ++counters.write,
                        message: "a".repeat(16384 - os.EOL.length - 1)
                    };
                    l.info(msg);
                }, 0);

                setTimeout(() => {
                    clearInterval(interval);

                    helpers.tryRead(logPath)
                        .on("error", (err) => {
                            assert.isFalse(err);
                            l.close();
                            done();
                        })
                        .pipe(split())
                        .on("data", (d) => {
                            const json = JSON.parse(d);
                            assert.strictEqual(json.level, "info");
                            assert.strictEqual(json.message, "a".repeat(16384 - os.EOL.length - 1));
                            assert.strictEqual(json.counter, ++counters.read);
                        })
                        .on("end", () => {
                            assert.equal(counters.write, counters.read);
                            l.close();
                            done();
                        });
                }, 10000);
            });

            it("should handle a high volume of large writes synchronous", (done) => {
                const l = logger.create({
                    transports: [new logger.transport.File({
                        filename: logPath
                    })]
                });

                const counters = {
                    write: 0,
                    read: 0
                };

                const msgs = new Array(10).fill().map(() => ({
                    counter: ++counters.write,
                    message: "a".repeat(16384 - os.EOL.length - 1)
                }));
                msgs.forEach((msg) => l.info(msg));

                setTimeout(() => {
                    helpers.tryRead(logPath)
                        .on("error", (err) => {
                            assert.isFalse(err);
                            l.close();
                            done();
                        })
                        .pipe(split())
                        .on("data", (d) => {
                            const json = JSON.parse(d);
                            assert.strictEqual(json.level, "info");
                            assert.strictEqual(json.message, "a".repeat(16384 - os.EOL.length - 1));
                            assert.strictEqual(json.counter, ++counters.read);
                        })
                        .on("end", () => {
                            assert.equal(counters.write, counters.read);
                            l.close();
                            done();
                        });
                }, 10000);
            });
        });
    });

    // var path = require("path"),
    //     http = require("http"),
    //     fs = require("fs"),
    //     hock = require("hock"),
    //     assume = require("assume"),
    //     Http = require("../../lib/winston/transports/http"),
    //     helpers = require("../helpers");

    // const host = "127.0.0.1";

    // function mockHttpServer(opts, done) {
    //     if (!done && is.function(opts)) {
    //         done = opts;
    //         opts = {};
    //     }

    //     const mock = hock.createHock();
    //     opts.path = opts.path || "log";
    //     opts.payload = opts.payload || {
    //         level: "info",
    //         message: "hello",
    //         meta: {}
    //     };

    //     mock
    //         .post(`/${opts.path}`, opts.payload)
    //         .min(1)
    //         .max(1)
    //         .reply(200);

    //     const server = http.createServer(mock.handler);
    //     server.listen(0, "0.0.0.0", done);
    //     return { server, mock };
    // }

    // describe("Http({ host, port, path })", () => {
    //     let context;
    //     let server;
    //     beforeEach((done) => {
    //         context = mockHttpServer(done);
    //         server = context.server;
    //     });

    //     it("should send logs over HTTP", (done) => {
    //         const port = server.address().port;
    //         const httpTransport = new Http({
    //             host,
    //             port,
    //             path: "log"
    //         }).on("error", (err) => {
    //             assume(err).falsy();
    //         }).on("logged", () => {
    //             context.mock.done((err) => {
    //                 if (err) { assume(err).falsy(); }
    //                 done();
    //             });
    //         });

    //         httpTransport.log({
    //             level: "info",
    //             message: "hello",
    //             meta: {}
    //         }, (err) => {
    //             if (err) {
    //                 assume(err).falsy();
    //             }
    //         });
    //     });

    //     afterEach((done) => {
    //         server.close(done.bind(null, null));
    //     });
    // });


    it("has expected initial state", () => {
        assert.lengthOf(adone.runtime.logger.transports, 0);
        assert.strictEqual(adone.runtime.logger.level, "info");
    });

    it("has expected methods", () => {
        assert.isTrue(is.object(logger.config));
        ["add", "remove", "clear"]
            .concat(Object.keys(logger.config.adone))
            .forEach((key) => {
                assert.isFunction(adone.runtime.logger[key], `logger.${key}`);
            });
    });

    describe("config", () => {
        it("should have expected methods", () => {
            assert.isTrue(is.object(logger.config));
            assert.isTrue(is.object(logger.config.cli));
            assert.isTrue(is.object(logger.config.npm));
            assert.isTrue(is.object(logger.config.syslog));
        });
    });

    describe("Container", () => {
        describe("no transports", () => {
            const container = new logger.Container();
            let defaultTest;

            it(".add(default-test)", () => {
                defaultTest = container.add("default-test");
                assert.isFunction(defaultTest.log);
            });

            it(".get(default-test)", () => {
                assert.strictEqual(container.get("default-test"), defaultTest);
            });

            it(".has(default-test)", () => {
                assert.isTrue(container.has("default-test"));
            });

            it(".has(not-has)", () => {
                assert.isFalse(container.has("not-has"));
            });

            it(".close(default-test)", () => {
                container.close("default-test");
                assert.isFalse(container.loggers.has("default-test"));
            });

            it(".close(non-existent)", () => {
                container.close("non-existent");
                assert.isFalse(container.loggers.has("non-existent"));
            });

            it(".close()", () => {
                container.close();
                assert.isFalse(container.loggers.has());
            });
        });

        describe("explicit transports", () => {
            const transports = [new logger.transport.Http({ port: 9412 })];
            const container = new logger.Container({ transports });
            const all = {};

            it(".get(some-logger)", () => {
                all.someLogger = container.get("some-logger");
                assert.instanceOf(all.someLogger._readableState.pipes, logger.transport.Http);
                assert.strictEqual(all.someLogger._readableState.pipes, transports[0]);
            });

            it(".get(some-other-logger)", () => {
                all.someOtherLogger = container.get("some-other-logger");

                assert.instanceOf(all.someOtherLogger._readableState.pipes, logger.transport.Http);
                assert.strictEqual(all.someOtherLogger._readableState.pipes, transports[0]);
                assert.strictEqual(all.someOtherLogger._readableState.pipes, all.someLogger._readableState.pipes);
            });
        });
    });

    // //
    // // This is an awful and fragile hack that
    // // needs to be changed ASAP.
    // // https://github.com/mochajs/mocha/issues/1985
    // //
    // const _runTest = mocha.Runner.prototype.runTest;
    // mocha.Runner.prototype.runTest = function () {
    //     this.allowUncaught = true;
    //     _runTest.apply(this, arguments);
    // };

    describe("ExceptionHandler", function () {
        this.timeout(5000);

        it("has expected methods", () => {
            const handler = helpers.exceptionHandler();
            assert.isFunction(handler.handle);
            assert.isFunction(handler.unhandle);
            assert.isFunction(handler.getAllInfo);
            assert.isFunction(handler.getProcessInfo);
            assert.isFunction(handler.getOsInfo);
            assert.isFunction(handler.getTrace);
        });

        it("new ExceptionHandler()", () => {
            assert.throws(() => {
                new logger.ExceptionHandler();
            }, /Logger is required/);
        });

        it("new ExceptionHandler(logger)", () => {
            const l = logger.create();
            const handler = new logger.ExceptionHandler(l);
            assert.equal(handler.logger, l);
        });

        it(".getProcessInfo()", () => {
            const handler = helpers.exceptionHandler();
            helpers.assertProcessInfo(handler.getProcessInfo());
        });

        it(".getOsInfo()", () => {
            const handler = helpers.exceptionHandler();
            helpers.assertOsInfo(handler.getOsInfo());
        });

        it(".getTrace(new Error)", () => {
            const handler = helpers.exceptionHandler();
            helpers.assertTrace(handler.getTrace(new Error()));
        });

        it(".getTrace()", () => {
            const handler = helpers.exceptionHandler();
            helpers.assertTrace(handler.getTrace());
        });

        it.skip(".handle()", (done) => {
            const existing = helpers.clearExceptions();
            const writeable = new stream.Writable({
                objectMode: true,
                write(info) {
                    assert.isObject(info);
                    assert.instanceOf(info.error, Error);
                    assert.strictEqual(info.error.message, "wtf this error");
                    assert.isTrue(info.message.includes("uncaughtException: wtf this error"));
                    assert.isString(info.stack);
                    assert.isObject(info.process);
                    assert.isObject(info.os);
                    assert.array(info.trace);

                    existing.restore();
                    done();
                }
            });

            const transport = new logger.transport.Stream({ stream: writeable });
            const handler = helpers.exceptionHandler({
                exitOnError: false,
                transports: [transport]
            });

            assert.isUndefined(handler.catcher);

            transport.handleExceptions = true;
            handler.handle();

            assert.isFunction(handler.catcher);
            assert.deepEqual(process.listeners("uncaughtException"), [
                handler.catcher
            ]);

            helpers.throw("wtf this error");
        });

        // after(() => {
        //     //
        //     // Restore normal `runTest` functionality
        //     // so that we only affect the current suite.
        //     //
        //     mocha.Runner.prototype.runTest = _runTest;
        // });
    });

    describe("ExceptionStream", () => {
        it("has expected methods", () => {
            const filename = path.join(__dirname, "fixtures", "logs", "exception-stream.log");
            const transport = new logger.transport.File({ filename });
            const instance = new ExceptionStream(transport);

            assert.isTrue(instance.handleExceptions);
            assert.equal(instance.transport, transport);
            assert.isFunction(instance._write);
            assert.instanceOf(instance, ExceptionStream);
        });

        it("throws without a transport", () => {
            assert.throws(() => {
                const stream = new ExceptionStream();
                stream._write({ exception: true });
            }, "ExceptionStream requires a TransportStream instance.");
        });
    });

    describe("Logger, ExceptionHandler", function () {
        this.timeout(5000);

        describe(".exceptions.unhandle()", () => {
            it("does not log to any transports", async (done) => {
                const logFile = path.join(__dirname, "fixtures", "logs", "unhandle-exception.log");

                helpers.tryUnlink(logFile);

                try {
                    const result = await forkProcess(path.join(__dirname, "helpers", "scripts", "unhandle-exceptions.js"))
                } catch (err) { }
                fs.exists(logFile, (exists) => {
                    assert.isFalse(exists);
                    done();
                });
            });

            it("handlers immutable", () => {
                //
                // A single default listener is added by mocha confirming
                // that our assumptions about mocha are maintained.
                //
                assert.strictEqual(process.listeners("uncaughtException").length, 1);
                const l = logger.create({
                    exceptionHandlers: [
                        new logger.transport.Console(),
                        new logger.transport.File({ filename: path.join(__dirname, "fixtures", "logs", "filelog.log") })
                    ]
                });

                assert.strictEqual(l.exceptions.handlers.size, 2);
                assert.strictEqual(process.listeners("uncaughtException").length, 2);
                l.exceptions.unhandle();
                assert.strictEqual(l.exceptions.handlers.size, 2);
                assert.strictEqual(process.listeners("uncaughtException").length, 1);
            });
        });

        it("Custom exitOnError function does not exit", async () => {
            const result = await forkProcess(path.join(__dirname, "helpers", "scripts", "exit-on-error.js"));
            assert.isFalse(result.killed);
            assert.strictEqual(result.stdout, "Ignore this error");
        });

        describe(".exceptions.handle()", () => {
            describe("should save the error information to the specified file", () => {
                it("when strings are thrown as errors", async (done) => {
                    const asyncFn = helpers.assertHandleExceptions({
                        script: path.join(__dirname, "helpers", "scripts", "log-string-exception.js"),
                        logfile: path.join(__dirname, "fixtures", "logs", "string-exception.log"),
                        message: "OMG NEVER DO THIS STRING EXCEPTIONS ARE AWFUL"
                    });

                    await asyncFn(done);
                });

                it("with a custom Logger instance", async (done) => {
                    const asyncFn = helpers.assertHandleExceptions({
                        script: path.join(__dirname, "helpers", "scripts", "log-exceptions.js"),
                        logfile: path.join(__dirname, "fixtures", "logs", "exception.log")
                    });

                    await asyncFn(done);
                });

                it("with the default logger", async (done) => {
                    const asynFn = helpers.assertHandleExceptions({
                        script: path.join(__dirname, "helpers", "scripts", "default-exceptions.js"),
                        logfile: path.join(__dirname, "fixtures", "logs", "default-exception.log")
                    });

                    await asynFn(done);
                });
            });
        });
    });

    describe("Profiler", () => {
        it("new Profiler()", () => {
            assert.throws(() => {
                new Profiler();
            });
        });

        it(".done({ info })", (done) => {
            const profiler = new Profiler({
                write(info) {
                    assert.isObject(info);
                    assert.strictEqual(info.something, "ok");
                    assert.strictEqual(info.level, "info");
                    assert.isNumber(info.durationMs);
                    assert.strictEqual(info.message, "testing1");
                    done();
                }
            });

            setTimeout(() => {
                profiler.done({
                    something: "ok",
                    level: "info",
                    message: "testing1"
                });
            }, 200);
        });
    });



    describe("tailFile", function () {
        // Test helper that performs writes to a specific log file
        // on a given interval
        //
        const logOnInterval = function (opts, done) {
            const filename = opts.file;
            const interval = opts.interval || 100;
            const timeout = opts.timeout || 10 * 1000;
            const message = opts.message || "";
            const open = opts.open;
            const transport = new logger.transport.File({ filename });
            const l = logger.create({ transports: [transport] });

            if (open) {
                transport.once("open", open);
            }

            const counters = {
                write: 0,
                read: 0
            };

            fs.unlink(filename, () => {
                const intervalId = setInterval(() => {
                    l.info({ message: ++counters.write + message });
                }, interval);

                setTimeout(() => {
                    //
                    // Clear the interval to stop writes, then pause
                    // briefly to let any listening streams flush.
                    //
                    clearInterval(intervalId);
                    setTimeout(done.bind(null, null, counters), 100);
                }, timeout);
            });
        };


        this.timeout(10 * 1000);
        it("is a function", () => {
            assert.isFunction(tailFile);
            assert.strictEqual(tailFile.length, 2);
        });

        it('returns a stream that emits "line" for every line', (done) => {
            const tailable = path.join(__dirname, "fixtures", "logs", "common-tail-file.log");
            let expected = 0;
            //
            // Performs the actual tail and asserts it.
            //
            const startTailFile = function () {
                const stream = tailFile({ file: tailable });
                assert.isTrue(stream instanceof Stream);

                stream.on("line", (buff) => {
                    expected += 1;
                    assert.isObject(JSON.parse(String(buff)));
                });
            };

            logOnInterval({
                file: tailable,
                open: startTailFile,
                timeout: 5000
            }, (err, actual) => {
                assert.strictEqual(expected, actual.write);
                done();
            });
        });
    });

    describe("Logger", () => {
        it("new Logger()", () => {
            const l = logger.create();
            assert.isObject(l);
            // assert.isTrue(is.stream(l.format));
            assert.strictEqual(l.level, "info");
            assert.isTrue(l.exitOnError);
        });

        it("new Logger({ parameters })", () => {
            const myFormat = logger.format((info, opts) => {
                return info;
            })();

            const l = logger.create({
                format: myFormat,
                level: "error",
                exitOnError: false,
                transports: []
            });

            assert.strictEqual(l.format, myFormat);
            assert.strictEqual(l.level, "error");
            assert.isFalse(l.exitOnError);
            assert.strictEqual(l._readableState.pipesCount, 0);
        });

        it("new Logger({ config }) defines custom methods", () => {
            const myFormat = logger.format((info, opts) => {
                return info;
            })();

            const l = logger.create({
                config: logger.config.syslog,
                format: myFormat,
                level: "error",
                exitOnError: false,
                transports: []
            });

            Object.keys(logger.config.syslog).forEach((level) => {
                assert.isFunction(l[level]);
            });
        });

        it("new Logger({ config }) custom methods are not bound to instance", () => {
            const l = logger.create({
                level: "error",
                exitOnError: false,
                transports: []
            });

            const logs = [];
            const extendedLogger = Object.create(l, {
                write: {
                    value(...args) {
                        logs.push(args);
                    }
                }
            });

            extendedLogger.log({ test: 1 });
            extendedLogger.warn({ test: 2 });

            assert.strictEqual(logs.length, 2);
            assert.sameDeepMembers(logs[0] || [], [{ test: 1 }]);
            assert.sameDeepMembers(logs[1] || [], [{ message: { test: 2 }, level: "warn", icon: adone.logging.logger.config.adone.warn.icon }]);
        });

        it(".add({ invalid Transport })", () => {
            const l = logger.create();
            assert.throws(() => {
                l.add(5);
            }, /invalid transport/i);
        });

        it(".add(TransportStream)", (done) => {
            const l = logger.create();
            const expected = { message: "foo", level: "info" };
            const transport = new TransportStream({
                log(info) {
                    assert.strictEqual(info.message, "foo");
                    assert.strictEqual(info.level, "info");
                    assert.strictEqual(info[MESSAGE], JSON.stringify({ message: "foo", level: "info" }));
                    done();
                }
            });

            l.add(transport);
            l.log(expected);
        });

        it(".stream()", () => {
            const l = logger.create();
            const outStream = l.stream();

            assert.isTrue(is.stream(outStream));
        });

        it(".configure()", () => {
            const l = logger.create({
                transports: [new logger.transport.Console()]
            });

            assert.strictEqual(l.transports.length, 1);
            assert.strictEqual(l.transports[0].name, "console");

            l.configure();

            assert.strictEqual(l.transports.length, 0);
        });

        it(".configure({ transports })", () => {
            const l = logger.create();

            assert.strictEqual(l.transports.length, 0);

            l.configure({
                transports: [new logger.transport.Console()]
            });

            assert.strictEqual(l.transports.length, 1);
            assert.strictEqual(l.transports[0].name, "console");
        });

        it(".configure({ transports, format })", () => {
            const l = logger.create();

            assert.strictEqual(l.transports.length, 0);

            l.configure({
                transports: [new logger.transport.Console()],
                format: logger.format.json()
            });

            assert.strictEqual(l.transports.length, 1);
            assert.strictEqual(l.transports[0].name, "console");
            assert.notEqual(l.format, logger.format);
        });

        it(".remove() [transport not added]", () => {
            const transports = [
                new logger.transport.Console(),
                new logger.transport.File({ filename: path.join(__dirname, "fixtures", "logs", "filelog.log") })
            ];

            const l = logger.create({ transports })
                .remove(new logger.transport.Console());

            assert.strictEqual(l.transports.length, 2);
            assert.sameDeepMembers(l.transports.map((wrap) => {
                // Unwrap LegacyTransportStream instances
                return wrap.transport || wrap;
            }), transports);
        });

        it(".remove() [TransportStream]", () => {
            const transports = [
                new logger.transport.Console(),
                new logger.transport.File({ filename: path.join(__dirname, "fixtures", "logs", "filelog.log") })
            ];

            const l = logger.create({ transports });

            assert.strictEqual(l.transports.length, 2);
            l.remove(transports[0]);
            assert.strictEqual(l.transports.length, 1);
            assert.strictEqual(l.transports[0], transports[1]);
        });

        it(".clear() [no transports]", () => {
            const l = logger.create();
            assert.strictEqual(l.transports.length, 0);
            l.clear();
            assert.strictEqual(l.transports.length, 0);
        });

        it(".clear() [transports]", () => {
            const l = logger.create({
                transports: [new logger.transport.Console()]
            });

            assert.strictEqual(l.transports.length, 1);
            l.clear();
            assert.strictEqual(l.transports.length, 0);
        });

        it("{ silent: true }", (done) => {
            const neverLogTo = new TransportStream({
                log(info) {
                    assert.isTrue(false, "TransportStream was improperly written to");
                }
            });

            const l = logger.create({
                transports: [neverLogTo],
                silent: true
            });

            l.log({
                level: "info",
                message: "This should be ignored"
            });

            setImmediate(() => done());
        });
    });

    describe("Logger (multiple transports of the same type)", () => {
        let l;
        let transports;

        before(() => {
            transports = [
                new logger.transport.File({
                    name: "filelog-info.log",
                    filename: path.join(__dirname, "fixtures", "logs", "filelog-info.log"),
                    level: "info"
                }),
                new logger.transport.File({
                    name: "filelog-error.log",
                    filename: path.join(__dirname, "fixtures", "logs", "filelog-error.log"),
                    level: "error"
                })
            ];

            l = logger.create({
                transports
            });
        });

        it("should have both transports", () => {
            assert.strictEqual(l.transports.length, 2);
            assert.sameDeepMembers(l.transports.map((wrap) => {
                return wrap.transport || wrap;
            }), transports);
        });

        it(".remove() of one transport", () => {
            l.remove(transports[0]);
            assert.strictEqual(l.transports.length, 1);
            assert.strictEqual(l.transports[0], transports[1]);
        });
    });

    describe("Logger (config)", () => {
        it.skip("report unknown levels", () => {
            stdMocks.use();
            const l = helpers.createLogger((info) => { });
            const expected = { message: "foo", level: "bar" };
            l.log(expected);

            stdMocks.restore();
            const output = stdMocks.flush();

            assert.sameMembers(output.stderr, ["[adone.logging.logger] Unknown logger level: bar\n"]);
        });

        it("default config", (done) => {
            const l = logger.create();
            const expected = { message: "foo", level: "debug" };

            const logLevelTransport = function (level) {
                return new TransportStream({
                    level,
                    log(obj) {
                        if (level === "info") {
                            assert.isUndefined(obj, undefined, "Transport on level info should never be called");
                        }

                        assert.strictEqual(obj.message, "foo");
                        assert.strictEqual(obj.level, "debug");
                        assert.strictEqual(obj[MESSAGE], JSON.stringify({ message: "foo", level: "debug" }));
                        done();
                    }
                });
            };

            assert.isFunction(l.info);
            assert.isFunction(l.debug);

            l
                .add(logLevelTransport("info"))
                .add(logLevelTransport("debug"))
                .log(expected);
        });

        it("custom config", (done) => {
            const l = logger.create({
                config: {
                    bad: {
                        id: 0
                    },
                    test: {
                        id: 1
                    },
                    ok: {
                        id: 2
                    }
                }
            });

            const expected = { message: "foo", level: "test" };
            const filterLevelTransport = function (level) {
                return new TransportStream({
                    level,
                    log(obj) {
                        if (level === "bad") {
                            assert.isUndefined(obj, 'transport on level "bad" should never be called');
                        }

                        assert.strictEqual(obj.message, "foo");
                        assert.strictEqual(obj.level, "test");
                        assert.strictEqual(obj[MESSAGE], JSON.stringify({ message: "foo", level: "test" }));
                        done();
                    }
                });
            };

            assert.isFunction(l.bad);
            assert.isFunction(l.test);
            assert.isFunction(l.ok);

            l
                .add(filterLevelTransport("bad"))
                .add(filterLevelTransport("ok"))
                .log(expected);
        });

        it("sets transports config", (done) => {
            let l;
            const transport = new TransportStream({
                log(obj) {
                    if (obj.level === "info") {
                        assert.udnefined(obj, "Transport on level info should never be called");
                    }

                    assert.strictEqual(obj.message, "foo");
                    assert.strictEqual(obj.level, "error");
                    assert.strictEqual(obj[MESSAGE], JSON.stringify({ message: "foo", level: "error" }));
                    done();
                }
            });

            // Begin our test in the next tick after the pipe event is
            // emitted from the transport.
            transport.once("pipe", () => setImmediate(() => {
                const expectedError = { message: "foo", level: "error" };
                const expectedInfo = { message: "bar", level: "info" };

                assert.isFunction(l.error);
                assert.isFunction(l.info);

                // Set the level
                l.level = "error";

                // Log the messages. "info" should never arrive.
                l
                    .log(expectedInfo)
                    .log(expectedError);
            }));

            l = logger.create({
                transports: [transport]
            });
        });
    });

    describe("Logger (level enabled/disabled)", () => {
        it("default config", () => {
            const l = logger.create({
                level: "verbose",
                config: logger.config.npm,
                transports: [new logger.transport.Console()]
            });

            assert.isFunction(l.isLevelEnabled);

            assert.isFunction(l.isErrorEnabled);
            assert.isFunction(l.isWarnEnabled);
            assert.isFunction(l.isInfoEnabled);
            assert.isFunction(l.isVerboseEnabled);
            assert.isFunction(l.isDebugEnabled);
            assert.isFunction(l.isSillyEnabled);

            assert.isTrue(l.isLevelEnabled("error"));
            assert.isTrue(l.isLevelEnabled("warn"));
            assert.isTrue(l.isLevelEnabled("info"));
            assert.isTrue(l.isLevelEnabled("verbose"));
            assert.isFalse(l.isLevelEnabled("debug"));
            assert.isFalse(l.isLevelEnabled("silly"));

            assert.isTrue(l.isErrorEnabled());
            assert.isTrue(l.isWarnEnabled());
            assert.isTrue(l.isInfoEnabled());
            assert.isTrue(l.isVerboseEnabled());
            assert.isFalse(l.isDebugEnabled());
            assert.isFalse(l.isSillyEnabled());
        });

        it("default config, transport override", () => {
            const transport = new logger.transport.Console();
            transport.level = "debug";

            const l = logger.create({
                level: "info",
                config: logger.config.npm,
                transports: [transport]
            });

            assert.isFunction(l.isLevelEnabled);

            assert.isFunction(l.isErrorEnabled);
            assert.isFunction(l.isWarnEnabled);
            assert.isFunction(l.isInfoEnabled);
            assert.isFunction(l.isVerboseEnabled);
            assert.isFunction(l.isDebugEnabled);
            assert.isFunction(l.isSillyEnabled);

            assert.isTrue(l.isLevelEnabled("error"));
            assert.isTrue(l.isLevelEnabled("warn"));
            assert.isTrue(l.isLevelEnabled("info"));
            assert.isTrue(l.isLevelEnabled("verbose"));
            assert.isTrue(l.isLevelEnabled("debug"));
            assert.isFalse(l.isLevelEnabled("silly"));

            assert.isTrue(l.isErrorEnabled());
            assert.isTrue(l.isWarnEnabled());
            assert.isTrue(l.isInfoEnabled());
            assert.isTrue(l.isVerboseEnabled());
            assert.isTrue(l.isDebugEnabled());
            assert.isFalse(l.isSillyEnabled());
        });

        it("default config, no transports", () => {
            const l = logger.create({
                level: "verbose",
                config: logger.config.npm,
                transports: []
            });

            assert.isFunction(l.isLevelEnabled);

            assert.isFunction(l.isErrorEnabled);
            assert.isFunction(l.isWarnEnabled);
            assert.isFunction(l.isInfoEnabled);
            assert.isFunction(l.isVerboseEnabled);
            assert.isFunction(l.isDebugEnabled);
            assert.isFunction(l.isSillyEnabled);

            assert.isTrue(l.isLevelEnabled("error"));
            assert.isTrue(l.isLevelEnabled("warn"));
            assert.isTrue(l.isLevelEnabled("info"));
            assert.isTrue(l.isLevelEnabled("verbose"));
            assert.isFalse(l.isLevelEnabled("debug"));
            assert.isFalse(l.isLevelEnabled("silly"));

            assert.isTrue(l.isErrorEnabled());
            assert.isTrue(l.isWarnEnabled());
            assert.isTrue(l.isInfoEnabled());
            assert.isTrue(l.isVerboseEnabled());
            assert.isFalse(l.isDebugEnabled());
            assert.isFalse(l.isSillyEnabled());
        });

        it("custom config", () => {
            const l = logger.create({
                level: "test",
                config: {
                    bad: {
                        id: 0
                    },
                    test: {
                        id: 1
                    },
                    ok: {
                        id: 2
                    }
                },
                transports: [new logger.transport.Console()]
            });

            assert.isFunction(l.isLevelEnabled);

            assert.isFunction(l.isBadEnabled);
            assert.isFunction(l.isTestEnabled);
            assert.isFunction(l.isOkEnabled);

            assert.isTrue(l.isLevelEnabled("bad"));
            assert.isTrue(l.isLevelEnabled("test"));
            assert.isFalse(l.isLevelEnabled("ok"));

            assert.isTrue(l.isBadEnabled());
            assert.isTrue(l.isTestEnabled());
            assert.isFalse(l.isOkEnabled());
        });

        it("custom config, no transports", () => {
            const l = logger.create({
                level: "test",
                config: {
                    bad: {
                        id: 0
                    },
                    test: {
                        id: 1
                    },
                    ok: {
                        id: 2
                    }
                },
                transports: []
            });

            assert.isFunction(l.isLevelEnabled);

            assert.isFunction(l.isBadEnabled);
            assert.isFunction(l.isTestEnabled);
            assert.isFunction(l.isOkEnabled);

            assert.isTrue(l.isLevelEnabled("bad"));
            assert.isTrue(l.isLevelEnabled("test"));
            assert.isFalse(l.isLevelEnabled("ok"));

            assert.isTrue(l.isBadEnabled());
            assert.isTrue(l.isTestEnabled());
            assert.isFalse(l.isOkEnabled());
        });

        it("custom config, transport override", () => {
            const transport = new logger.transport.Console();
            transport.level = "ok";

            const l = logger.create({
                level: "bad",
                config: {
                    bad: {
                        id: 0
                    },
                    test: {
                        id: 1
                    },
                    ok: {
                        id: 2
                    }
                },
                transports: [transport]
            });

            assert.isFunction(l.isLevelEnabled);

            assert.isFunction(l.isBadEnabled);
            assert.isFunction(l.isTestEnabled);
            assert.isFunction(l.isOkEnabled);

            assert.isTrue(l.isLevelEnabled("bad"));
            assert.isTrue(l.isLevelEnabled("test"));
            assert.isTrue(l.isLevelEnabled("ok"));

            assert.isTrue(l.isBadEnabled());
            assert.isTrue(l.isTestEnabled());
            assert.isTrue(l.isOkEnabled());
        });
    });

    describe("Logger (stream semantics)", () => {
        it("'finish' event awaits transports to emit 'finish'", (done) => {
            const transports = [
                new TransportStream({ log() { } }),
                new TransportStream({ log() { } }),
                new TransportStream({ log() { } })
            ];

            const finished = [];
            const l = logger.create({ transports });

            // Assert each transport emits finish
            transports.forEach((transport, i) => {
                transport.on("finish", () => finished[i] = true);
            });

            // Manually end the last transport to simulate mixed
            // finished state
            transports[2].end();

            // Assert that all transport 'finish' events have been
            // emitted when the logger emits 'finish'.
            l.on("finish", () => {
                assert.isTrue(finished[0]);
                assert.isTrue(finished[1]);
                assert.isTrue(finished[2]);
                done();
            });

            setImmediate(() => l.end());
        });

        it.skip("rethrows errors from user-defined formats", () => {
            stdMocks.use();
            const l = logger.create({
                transports: [new logger.transport.Console()],
                format: logger.format.printf((info) => {
                    // Set a trap.
                    if (info.message === "ENDOR") {
                        throw new Error("ITS A TRAP!");
                    }

                    return info.message;
                })
            });

            // Trigger the trap.  Swallow the error so processing continues.
            try {
                l.info("ENDOR");
            } catch (err) {
                assert.strictEqual(err.message, "ITS A TRAP!");
            }

            const expected = [
                "Now witness the power of the fully armed and operational logger",
                "Consider the philosophical and metaphysical – BANANA BANANA BANANA",
                "I was god once. I saw – you were doing well until everyone died."
            ];

            expected.forEach((msg) => l.info(msg));

            stdMocks.restore();
            const actual = stdMocks.flush();
            assert.sameMembers(actual.stdout, expected.map((msg) => `${msg}${os.EOL}`));
            assert.sameMembers(actual.stderr, []);
        });
    });

    describe("Logger", () => {
        it(".log(level, message)", (done) => {
            const l = helpers.createLogger((info) => {
                assert.isObject(info);
                assert.strictEqual(info.level, "info");
                assert.strictEqual(info.message, "Some super awesome log message");
                assert.isString(info[MESSAGE]);
                done();
            });

            l.log("info", "Some super awesome log message");
        });

        it(".log(level, undefined) creates info with { message: undefined }", (done) => {
            const l = helpers.createLogger((info) => {
                assert.isUndefined(info.message);
                done();
            });

            l.log("info", undefined);
        });

        it(".log(level, null) creates info with { message: null }", (done) => {
            const l = helpers.createLogger((info) => {
                assert.isNull(info.message);
                done();
            });

            l.log("info", null);
        });

        it(".log(level, new Error()) uses Error instance as info", (done) => {
            const err = new Error("test");
            const l = helpers.createLogger((info) => {
                assert.instanceOf(info, Error);
                assert.strictEqual(info, err);
                done();
            });

            l.log("info", err);
        });

        it(".log(level, message, meta)", (done) => {
            const meta = { one: 2 };
            const l = helpers.createLogger((info) => {
                assert.isObject(info);
                assert.strictEqual(info.level, "info");
                assert.strictEqual(info.message, "Some super awesome log message");
                assert.strictEqual(info.one, 2);
                assert.isString(info[MESSAGE]);
                done();
            });

            l.log("info", "Some super awesome log message", meta);
        });

        it(".log(level, formatStr, ...splat)", (done) => {
            const format = logger.format.combine(
                logger.format.splat(),
                logger.format.printf((info) => `${info.level}: ${info.message}`)
            );

            const l = helpers.createLogger((info) => {
                assert.isObject(info);
                assert.strictEqual(info.level, "info");
                assert.strictEqual(info.message, '100% such wow {"much":"javascript"}');
                assert.sameDeepMembers(info[SPLAT], [100, "wow", { much: "javascript" }]);
                assert.strictEqual(info[MESSAGE], 'info: 100% such wow {"much":"javascript"}');
                done();
            }, format);

            l.log("info", "%d%% such %s %j", 100, "wow", { much: "javascript" });
        });

        it(".log(level, formatStr, ...splat, meta)", (done) => {
            const format = logger.format.combine(
                logger.format.splat(),
                logger.format.printf((info) => `${info.level}: ${info.message} ${JSON.stringify({ thisIsMeta: info.thisIsMeta })}`)
            );

            const l = helpers.createLogger((info) => {
                assert.isObject(info);
                assert.strictEqual(info.level, "info");
                assert.strictEqual(info.message, '100% such wow {"much":"javascript"}');
                assert.sameDeepMembers(info[SPLAT], [100, "wow", { much: "javascript" }]);
                assert.isTrue(info.thisIsMeta);
                assert.strictEqual(info[MESSAGE], 'info: 100% such wow {"much":"javascript"} {"thisIsMeta":true}');
                done();
            }, format);

            l.log("info", "%d%% such %s %j", 100, "wow", { much: "javascript" }, { thisIsMeta: true });
        });
    });

    describe("Logger (logging exotic data types)", () => {
        describe(".log", () => {
            it(".log(new Error()) uses Error instance as info", (done) => {
                const err = new Error("test");
                err.level = "info";

                const l = helpers.createLogger((info) => {
                    assert.instanceOf(info, Error);
                    assert.strictEqual(info, err);
                    done();
                });

                l.log(err);
            });

            it(".info('Hello') preserve meta without splat format", (done) => {
                const logged = [];
                const l = helpers.createLogger((info, enc, next) => {
                    logged.push(info);
                    assert.strictEqual(info.label, "world");
                    next();

                    if (logged.length === 1) {
                        done();
                    }
                });

                l.info("Hello", { label: "world" });
            });

            it(".info('Hello %d') does not mutate unnecessarily with string interpolation tokens", (done) => {
                const logged = [];
                const logger = helpers.createLogger((info, enc, next) => {
                    logged.push(info);
                    assert.isUndefined(info.label);
                    next();

                    if (logged.length === 1) {
                        done();
                    }
                });

                logger.info("Hello %j", { label: "world" }, { extra: true });
            });

            it(".info('Hello') and .info('Hello %d') preserve meta with splat format", (done) => {
                const logged = [];
                const l = helpers.createLogger((info, enc, next) => {
                    logged.push(info);
                    assert.strictEqual(info.label, "world");
                    next();

                    if (logged.length === 2) {
                        done();
                    }
                }, logger.format.splat());

                l.info("Hello", { label: "world" });
                l.info("Hello %d", 10, { label: "world" });
                l.info("Hello %d", 100, { label: "world" });
            });
        });

        describe(".info", () => {
            it(".info(undefined) creates info with { message: undefined }", (done) => {
                const l = helpers.createLogger((info) => {
                    assert.isUndefined(info.message);
                    done();
                });

                l.info(undefined);
            });

            it(".info(null) creates info with { message: null }", (done) => {
                const l = helpers.createLogger((info) => {
                    assert.isNull(info.message);
                    done();
                });

                l.info(null);
            });

            it(".info(new Error()) uses Error instance as info", (done) => {
                const err = new Error("test");
                const l = helpers.createLogger((info) => {
                    assert.instanceOf(info, Error);
                    assert.strictEqual(info, err);
                    done();
                });

                l.info(err);
            });

            it.skip(".info('any string', new Error())", (done) => {
                const err = new Error("test");
                const logger = helpers.createLogger((info) => {
                    // TODO (indexzero): assert this works.
                    done();
                });

                logger.info(err);
            });
        });
    });

    describe("Logger (profile, startTimer)", () => {
        it("profile(id, info)", (done) => {
            const l = helpers.createLogger((info) => {
                assert.isObject(info);
                assert.strictEqual(info.something, "ok");
                assert.strictEqual(info.level, "info");
                assert.isNumber(info.durationMs);
                assert.strictEqual(info.message, "testing1");
                assert.isString(info[MESSAGE]);
                done();
            });

            l.profile("testing1");
            setTimeout(() => {
                l.profile("testing1", {
                    something: "ok",
                    level: "info"
                });
            }, 100);
        });

        it("profile(id, callback) ignores callback", (done) => {
            const l = helpers.createLogger((info) => {
                assert.isObject(info);
                assert.strictEqual(info.something, "ok");
                assert.strictEqual(info.level, "info");
                assert.isNumber(info.durationMs);
                assert.strictEqual(info.message, "testing2");
                assert.isString(info[MESSAGE]);
                done();
            });

            l.profile("testing2", () => {
                done(new Error("Unexpected callback invoked"));
            });

            setTimeout(() => {
                l.profile("testing2", {
                    something: "ok",
                    level: "info"
                });
            }, 100);
        });

        it("startTimer()", (done) => {
            const l = helpers.createLogger((info) => {
                assert.isObject(info);
                assert.strictEqual(info.something, "ok");
                assert.strictEqual(info.level, "info");
                assert.isNumber(info.durationMs);
                assert.strictEqual(info.message, "testing1");
                assert.isString(info[MESSAGE]);
                done();
            });

            const timer = l.startTimer();
            setTimeout(() => {
                timer.done({
                    message: "testing1",
                    something: "ok",
                    level: "info"
                });
            }, 100);
        });
    });

    describe("Should bubble transport events", () => {
        it("error", (done) => {
            const consoleTransport = new logger.transport.Console();
            const l = logger.create({
                transports: [consoleTransport]
            });

            l.on("error", (err, transport) => {
                assert.instanceOf(err, Error);
                assert.isObject(transport);
                done();
            });
            consoleTransport.emit("error", new Error());
        });

        it("warn", (done) => {
            const consoleTransport = new logger.transport.Console();
            const l = logger.create({
                transports: [consoleTransport]
            });

            l.on("warn", (err, transport) => {
                assert.instanceOf(err, Error);
                assert.isObject(transport);
                done();
            });
            consoleTransport.emit("warn", new Error());
        });
    });

    describe("Should support child loggers", () => {
        it("sets default meta for text messages correctly", (done) => {
            const assertFn = ((msg) => {
                assert.strictEqual(msg.level, "info");
                assert.strictEqual(msg.message, "dummy message");
                assert.strictEqual(msg.req_id, "451");
                done();
            });

            const l = logger.create({
                transports: [
                    createMockTransport(assertFn)
                ]
            });

            const childLogger = l.child({ req_id: "451" });
            childLogger.info("dummy message");
        });

        it("sets default meta for json messages correctly", (done) => {
            const assertFn = ((msg) => {
                assert.strictEqual(msg.level, "info");
                assert.strictEqual(msg.message.text, "dummy");
                assert.strictEqual(msg.req_id, "451");
                done();
            });

            const l = logger.create({
                transports: [
                    createMockTransport(assertFn)
                ]
            });

            const childLogger = l.child({ req_id: "451" });
            childLogger.info({ text: "dummy" });
        });

        it("merges default and non-default meta correctly", (done) => {
            const assertFn = ((msg) => {
                assert.strictEqual(msg.level, "info");
                assert.strictEqual(msg.message, "dummy message");
                assert.strictEqual(msg.service, "user-service");
                assert.strictEqual(msg.req_id, "451");
                done();
            });

            const l = logger.create({
                transports: [
                    createMockTransport(assertFn)
                ]
            });

            const childLogger = l.child({ service: "user-service" });
            childLogger.info("dummy message", { req_id: "451" });
        });

        it("non-default take precedence over default meta", (done) => {
            const assertFn = ((msg) => {
                assert.strictEqual(msg.level, "info");
                assert.strictEqual(msg.message, "dummy message");
                assert.strictEqual(msg.service, "audit-service");
                assert.strictEqual(msg.req_id, "451");
                done();
            });

            const l = logger.create({
                transports: [
                    createMockTransport(assertFn)
                ]
            });

            const childLogger = l.child({ service: "user-service" });
            childLogger.info("dummy message", {
                req_id: "451",
                service: "audit-service"
            });
        });

        it("handles error stacktraces in child loggers correctly", (done) => {
            const assertFn = ((msg) => {
                assert.strictEqual(msg.level, "error");
                assert.strictEqual(msg.message, "dummy error");


                assert.isTrue(msg.stack.includes("/index.test.js"));
                assert.strictEqual(msg.service, "user-service");
                done();
            });

            const l = logger.create({
                transports: [
                    createMockTransport(assertFn)
                ]
            });

            const childLogger = l.child({ service: "user-service" });
            childLogger.error(Error("dummy error"));
        });
    });

    describe("logger.format.colorize (Integration)", () => {
        const targetScript = path.join(__dirname, "helpers", "scripts", "colorize.js");

        it("non-TTY environment", async () => {
            const child = forkProcess(targetScript, [], {
                stdio: "pipe"
            });
            let data = "";
            child.stdout.setEncoding("utf8");
            child.stdout.on("data", (str) => {
                data += str;
            });
            await child;
            assert.isFalse(data.includes("\u001b[32mSimply a test\u001b[39m"));
            assert.isTrue(data.includes("Simply a test"));
        });
    });

    describe("UnhandledRejectionHandler", function () {
        this.timeout(5000);

        it("has expected methods", () => {
            const handler = helpers.rejectionHandler();
            assert.isFunction(handler.handle);
            assert.isFunction(handler.unhandle);
            assert.isFunction(handler.getAllInfo);
            assert.isFunction(handler.getProcessInfo);
            assert.isFunction(handler.getOsInfo);
            assert.isFunction(handler.getTrace);
        });

        it("new RejectionHandler()", () => {
            assert.throws(() => {
                new logger.RejectionHandler();
            }, /Logger is required/);
        });

        it("new RejectionHandler(logger)", () => {
            const l = logger.create();
            const handler = new logger.RejectionHandler(l);
            assert.equal(handler.logger, l);
        });

        it(".getProcessInfo()", () => {
            const handler = helpers.rejectionHandler();
            helpers.assertProcessInfo(handler.getProcessInfo());
        });

        it(".getOsInfo()", () => {
            const handler = helpers.rejectionHandler();
            helpers.assertOsInfo(handler.getOsInfo());
        });

        it(".getTrace(new Error)", () => {
            const handler = helpers.rejectionHandler();
            helpers.assertTrace(handler.getTrace(new Error()));
        });

        it(".getTrace()", () => {
            const handler = helpers.rejectionHandler();
            helpers.assertTrace(handler.getTrace());
        });

        it.skip(".handle()", (done) => {
            const existing = helpers.clearRejections();
            const writeable = new stream.Writable({
                objectMode: true,
                write(info) {
                    assert.isObject(info);
                    assert.instanceOf(info.error, Error);
                    assert.strictEqual(info.error.message, "wtf this rejection");
                    assert.isTrue(info.message.includes("unhandledRejection: wtf this rejection"));
                    assert.isString(info.stack);
                    assert.isObject(info.process);
                    assert.isObject(info.os);
                    assert.array(info.trace);

                    existing.restore();
                    done();
                }
            });

            const transport = new logger.transport.Stream({ stream: writeable });
            const handler = helpers.rejectionHandler({
                exitOnError: false,
                transports: [transport]
            });

            assert.isUndefined(handler.catcher);

            transport.handleRejections = true;
            handler.handle();

            assert.isFunction(handler.catcher);
            assert.sameDeepMembers(process.listeners("unhandledRejection"), [
                handler.catcher
            ]);

            helpers.reject("wtf this rejection").then(done());
        });
    });


    describe("config", () => {
        const {
            logging: { logger }
        } = adone;

        describe("LEVEL constant", () => {
            it("is exposed", () => {
                assert.exists(logger.LEVEL);
            });

            it("is a Symbol", () => {
                assert.isTrue(is.symbol(logger.LEVEL));
            });

            it("is not mutable", () => {
                //
                // Assert that the symbol does not change
                // even though the operation does not throw.
                //
                const OVERWRITE = Symbol("overwrite");
                const LEVEL = logger.LEVEL;

                assert.notEqual(LEVEL, OVERWRITE);
                assert.throws(() => logger.LEVEL = OVERWRITE, TypeError);
                assert.equal(logger.LEVEL, LEVEL);
            });
        });

        describe("MESSAGE constant", () => {
            it("is exposed", () => {
                assert.exists(MESSAGE);
            });

            it("is a Symbol", () => {
                assert.isTrue(is.symbol(MESSAGE));
            });

            it("is not mutable", () => {
                //
                // Assert that the symbol does not change
                // even though the operation does not throw.
                //
                const OVERWRITE = Symbol("overwrite");
                const MESSAGE = logger.MESSAGE;

                assert.notEqual(MESSAGE, OVERWRITE);
                assert.throws(() => logger.MESSAGE = OVERWRITE, TypeError);
                assert.equal(logger.MESSAGE, MESSAGE);
            });
        });

        describe("SPLAT constant", () => {
            it("is exposed", () => {
                assert.exists(logger.SPLAT);
            });

            it("is a Symbol", () => {
                assert.isTrue(is.symbol(logger.SPLAT));
            });

            it("is not mutable", () => {
                //
                // Assert that the symbol does not change
                // even though the operation does not throw.
                //
                const OVERWRITE = Symbol("overwrite");
                const SPLAT = logger.SPLAT;

                assert.notEqual(SPLAT, OVERWRITE);
                assert.throws(() => logger.SPLAT = OVERWRITE, TypeError);
                assert.equal(logger.SPLAT, SPLAT);
            });
        });

        describe("config constant", () => {
            it("is exposed", () => {
                assert.exists(logger.config);
            });

            it("is a Symbol", () => {
                assert.isObject(logger.config);
            });

            it("is not mutable", () => {
                //
                // Assert that the object does not change
                // even though the operation does not throw.
                //
                const overwrite = {
                    overwrite: "overwrite"
                };
                const config = logger.config;

                assert.notEqual(config, overwrite);
                assert.throws(() => logger.config = overwrite, TypeError);
                assert.deepEqual(logger.config, config);
            });
        });
    });
});
