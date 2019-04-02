const {
    is,
    http: { server }
} = adone;

const http = require("http");
const stream = require("stream");
const split = require("split2");
const pino = require("pino");
const path = require("path");
const os = require("os");
const fs = require("fs");
const sget = require("simple-get").concat;

const files = [];
let count = 0;

const file = function () {
    const file = path.join(os.tmpdir(), `sonic-boom-${process.pid}-${process.hrtime().toString()}-${count++}`);
    files.push(file);
    return file;
};

describe("logger", () => {
    after(() => {
        files.forEach((file) => {
            try {
                fs.unlinkSync(file);
            } catch (e) {
                console.log(e);
            }
        });
    });

    it("defaults to info level", (done) => {
        let fastify = null;
        const stream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream
                }
            });
        } catch (e) {
            assert.fail();
        }

        fastify.get("/", (req, reply) => {
            assert.ok(req.log);
            reply.send({ hello: "world" });
        });

        stream.once("data", (listenAtLogLine) => {
            assert.ok(listenAtLogLine, "listen at log message is ok");

            stream.once("data", (line) => {
                const id = line.reqId;
                assert.ok(line.reqId, "reqId is defined");
                assert.ok(line.req, "req is defined");
                assert.equal(line.msg, "incoming request", "message is set");
                assert.equal(line.req.method, "GET", "method is get");

                stream.once("data", (line) => {
                    assert.equal(line.reqId, id);
                    assert.ok(line.reqId, "reqId is defined");
                    assert.ok(line.res, "res is defined");
                    assert.equal(line.msg, "request completed", "message is set");
                    assert.equal(line.res.statusCode, 200, "statusCode is 200");
                    assert.ok(line.responseTime, "responseTime is defined");
                    done();
                });
            });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            http.get(`http://localhost:${fastify.server.address().port}`);
        });
    });

    it("test log stream", (done) => {
        let fastify = null;
        const stream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream,
                    level: "info"
                }
            });
        } catch (e) {
            assert.fail();
        }

        fastify.get("/", (req, reply) => {
            assert.ok(req.log);
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            http.get(`http://localhost:${fastify.server.address().port}`);
            stream.once("data", (listenAtLogLine) => {
                assert.ok(listenAtLogLine, "listen at log message is ok");

                stream.once("data", (line) => {
                    const id = line.reqId;
                    assert.ok(line.reqId, "reqId is defined");
                    assert.ok(line.req, "req is defined");
                    assert.equal(line.msg, "incoming request", "message is set");
                    assert.equal(line.req.method, "GET", "method is get");

                    stream.once("data", (line) => {
                        assert.equal(line.reqId, id);
                        assert.ok(line.reqId, "reqId is defined");
                        assert.ok(line.res, "res is defined");
                        assert.equal(line.msg, "request completed", "message is set");
                        assert.equal(line.res.statusCode, 200, "statusCode is 200");
                        done();
                    });
                });
            });
        });
    });

    it("test error log stream", (done) => {
        let fastify = null;
        const stream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream,
                    level: "info"
                }
            });
        } catch (e) {
            assert.fail();
        }

        fastify.get("/error", (req, reply) => {
            assert.ok(req.log);
            reply.send(new Error("kaboom"));
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            http.get(`http://localhost:${fastify.server.address().port}/error`);
            stream.once("data", (listenAtLogLine) => {
                assert.ok(listenAtLogLine, "listen at log message is ok");

                stream.once("data", (line) => {
                    assert.ok(line.reqId, "reqId is defined");
                    assert.ok(line.req, "req is defined");
                    assert.equal(line.msg, "incoming request", "message is set");
                    assert.equal(line.req.method, "GET", "method is get");

                    stream.once("data", (line) => {
                        assert.ok(line.reqId, "reqId is defined");
                        assert.ok(line.res, "res is defined");
                        assert.equal(line.msg, "kaboom", "message is set");
                        assert.equal(line.res.statusCode, 500, "statusCode is 500");
                        done();
                    });
                });
            });
        });
    });

    it("can use external logger instance", (done) => {
        const lines = [/^Server listening at /, /^incoming request$/, /^log success$/, /^request completed$/];
        expect(lines.length).checks(done);

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            const regex = lines.shift();
            assert.ok(regex.test(line.msg), `"${line.msg}" dont match "${regex}"`);
            expect(true).to.be.ok.mark();
        });

        const logger = require("pino")(splitStream);

        const localFastify = server({ logger });

        localFastify.get("/foo", (req, reply) => {
            assert.ok(req.log);
            req.log.info("log success");
            reply.send({ hello: "world" });
        });

        localFastify.listen(0, (err) => {
            assert.notExists(err);
            http.get(`http://localhost:${localFastify.server.address().port}/foo`, (res) => {
                res.resume();
                res.on("end", () => {
                    localFastify.server.close();
                });
            });
        });
    });

    it("can use external logger instance with custom serializer", (done) => {
        const lines = [["level", 30], ["req", { url: "/foo" }], ["level", 30], ["res", { statusCode: 200 }]];
        expect(lines.length).checks(done);

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            const check = lines.shift();
            const key = check[0];
            const value = check[1];

            assert.deepEqual(line[key], value);
            expect(true).to.be.ok.mark();
        });

        const logger = require("pino")({
            level: "info",
            serializers: {
                req(req) {
                    return {
                        url: req.url
                    };
                }
            }
        }, splitStream);

        const localFastify = server({
            logger
        });

        localFastify.get("/foo", (req, reply) => {
            assert.ok(req.log);
            req.log.info("log success");
            reply.send({ hello: "world" });
        });

        localFastify.listen(0, (err) => {
            assert.notExists(err);
            http.get(`http://localhost:${localFastify.server.address().port}/foo`, (res) => {
                res.resume();
                res.on("end", () => {
                    localFastify.server.close();
                });
            });
        });
    });

    it("expose the logger", () => {
        let fastify = null;
        const stream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream,
                    level: "info"
                }
            });
        } catch (e) {
            assert.fail();
        }

        assert.ok(fastify.log);
        assert.equal(typeof fastify.log, "object");
    });

    it("The request id header key can be customized", (done) => {
        const REQUEST_ID = "42";

        const stream = split(JSON.parse);
        const fastify = server({
            logger: { stream, level: "info" },
            requestIdHeader: "my-custom-request-id"
        });

        expect(2).checks(() => {
            fastify.close();
            done();
        });

        fastify.get("/", (req, reply) => {
            assert.equal(req.raw.id, REQUEST_ID);
            expect(true).to.be.ok.mark();
            req.log.info("some log message");
            reply.send({ id: req.raw.id });
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "my-custom-request-id": REQUEST_ID
            }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.equal(payload.id, REQUEST_ID);

            stream.once("data", (line) => {
                assert.equal(line.reqId, REQUEST_ID);
                assert.equal(line.msg, "incoming request", "message is set");

                stream.once("data", (line) => {
                    assert.equal(line.reqId, REQUEST_ID);
                    assert.equal(line.msg, "some log message", "message is set");

                    stream.once("data", (line) => {
                        assert.equal(line.reqId, REQUEST_ID);
                        assert.equal(line.msg, "request completed", "message is set");
                        expect(true).to.be.ok.mark();
                    });
                });
            });
        });
    });

    it("The logger should accept custom serializer", (done) => {
        expect(2).checks(done);

        const stream = split(JSON.parse);
        const fastify = server({
            logger: {
                stream,
                level: "info",
                serializers: {
                    req(req) {
                        return {
                            url: req.url
                        };
                    }
                }
            }
        });

        fastify.get("/custom", (req, reply) => {
            assert.ok(req.log);
            expect(true).to.be.ok.mark();
            reply.send(new Error("kaboom"));
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            http.get(`http://localhost:${fastify.server.address().port}/custom`);
            stream.once("data", (listenAtLogLine) => {
                assert.ok(listenAtLogLine, "listen at log message is ok");

                stream.once("data", (line) => {
                    assert.ok(line.req, "req is defined");
                    assert.equal(line.msg, "incoming request", "message is set");
                    assert.deepEqual(line.req, { url: "/custom" }, "custom req serialiser is use");

                    stream.once("data", (line) => {
                        assert.ok(line.res, "res is defined");
                        assert.equal(line.msg, "kaboom", "message is set");
                        assert.deepEqual(line.res, { statusCode: 500 }, "default res serialiser is use");
                        expect(true).to.be.ok.mark();
                    });
                });
            });
        });
    });

    it("reply.send logs an error if called twice in a row", (done) => {
        const lines = ["incoming request", "request completed", "Reply already sent", "Reply already sent"];
        expect(lines.length + 1).checks(done);

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            assert.equal(line.msg, lines.shift());
            expect(true).to.be.ok.mark();
        });

        const logger = pino(splitStream);

        const fastify = server({
            logger
        });

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
            reply.send({ hello: "world2" });
            reply.send({ hello: "world3" });
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("logger can be silented", () => {
        const fastify = server({
            logger: false
        });
        assert.ok(fastify.log);
        assert.equal(typeof fastify.log, "object");
        assert.equal(typeof fastify.log.fatal, "function");
        assert.equal(typeof fastify.log.error, "function");
        assert.equal(typeof fastify.log.warn, "function");
        assert.equal(typeof fastify.log.info, "function");
        assert.equal(typeof fastify.log.debug, "function");
        assert.equal(typeof fastify.log.trace, "function");
        assert.equal(typeof fastify.log.child, "function");

        const childLog = fastify.log.child();

        assert.equal(typeof childLog, "object");
        assert.equal(typeof childLog.fatal, "function");
        assert.equal(typeof childLog.error, "function");
        assert.equal(typeof childLog.warn, "function");
        assert.equal(typeof childLog.info, "function");
        assert.equal(typeof childLog.debug, "function");
        assert.equal(typeof childLog.trace, "function");
        assert.equal(typeof childLog.child, "function");
    });

    it("Should set a custom logLevel for a plugin", (done) => {
        const lines = ["incoming request", "Hello", "request completed"];
        expect(5).checks(done);

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            assert.equal(line.msg, lines.shift());
            expect(true).to.be.ok.mark();
        });

        const logger = pino({ level: "error" }, splitStream);

        const fastify = server({
            logger
        });

        fastify.get("/", (req, reply) => {
            req.log.info("Hello"); // we should not see this log
            reply.send({ hello: "world" });
        });

        fastify.register((instance, opts, next) => {
            instance.get("/plugin", (req, reply) => {
                req.log.info("Hello"); // we should see this log
                reply.send({ hello: "world" });
            });
            next();
        }, { logLevel: "info" });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/plugin"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("Should set a custom logLevel for every plugin", (done) => {
        const lines = ["incoming request", "request completed", "info", "debug"];
        expect(9).checks(done);

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            assert.ok(line.level === 30 || line.level === 20);
            assert.ok(lines.indexOf(line.msg) > -1);
            expect(true).to.be.ok.mark();
        });

        const logger = pino({ level: "error" }, splitStream);

        const fastify = server({
            logger
        });

        fastify.get("/", (req, reply) => {
            req.log.warn("Hello"); // we should not see this log
            reply.send({ hello: "world" });
        });

        fastify.register((instance, opts, next) => {
            instance.get("/info", (req, reply) => {
                req.log.info("info"); // we should see this log
                req.log.debug("hidden log");
                reply.send({ hello: "world" });
            });
            next();
        }, { logLevel: "info" });

        fastify.register((instance, opts, next) => {
            instance.get("/debug", (req, reply) => {
                req.log.debug("debug"); // we should see this log
                req.log.trace("hidden log");
                reply.send({ hello: "world" });
            });
            next();
        }, { logLevel: "debug" });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/info"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/debug"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("Should increase the log level for a specific plugin", (done) => {
        expect(2).checks(done);

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            assert.equal(line.msg, "Hello");
            assert.ok(line.level === 50);
            expect(true).to.be.ok.mark();
        });

        const logger = pino({ level: "info" }, splitStream);

        const fastify = server({
            logger
        });

        fastify.register((instance, opts, next) => {
            instance.get("/", (req, reply) => {
                req.log.error("Hello"); // we should see this log
                reply.send({ hello: "world" });
            });
            next();
        }, { logLevel: "error" });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("Should set the log level for the customized 404 handler", (done) => {
        expect(2).checks(done);

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            assert.equal(line.msg, "Hello");
            assert.ok(line.level === 50);
            expect(true).to.be.ok.mark();
        });

        const logger = pino({ level: "warn" }, splitStream);

        const fastify = server({
            logger
        });

        fastify.register((instance, opts, next) => {
            instance.setNotFoundHandler((req, reply) => {
                req.log.error("Hello");
                reply.code(404).send();
            });
            next();
        }, { logLevel: "error" });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });

    it("Should set the log level for the customized 500 handler", (done) => {
        expect(2).checks(done);

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            assert.equal(line.msg, "Hello");
            assert.ok(line.level === 60);
            expect(true).to.be.ok.mark();
        });

        const logger = pino({ level: "warn" }, splitStream);

        const fastify = server({
            logger
        });

        fastify.register((instance, opts, next) => {
            instance.get("/", (req, reply) => {
                req.log.error("kaboom");
                reply.send(new Error("kaboom"));
            });

            instance.setErrorHandler((e, request, reply) => {
                reply.log.fatal("Hello");
                reply.code(500).send();
            });
            next();
        }, { logLevel: "fatal" });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 500);
            expect(true).to.be.ok.mark();
        });
    });

    it("Should set a custom log level for a specific route", (done) => {
        const lines = ["incoming request", "Hello", "request completed"];
        expect(5).checks(done);

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            assert.equal(line.msg, lines.shift());
            expect(true).to.be.ok.mark();
        });

        const logger = pino({ level: "error" }, splitStream);

        const fastify = server({
            logger
        });

        fastify.get("/log", { logLevel: "info" }, (req, reply) => {
            req.log.info("Hello");
            reply.send({ hello: "world" });
        });

        fastify.get("/no-log", (req, reply) => {
            req.log.info("Hello");
            reply.send({ hello: "world" });
        });

        fastify.inject({
            method: "GET",
            url: "/log"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/no-log"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("The default 404 handler logs the incoming request", (done) => {
        expect(4).checks(done);

        const expectedMessages = ["incoming request", "Not Found", "request completed"];

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            assert.equal(line.msg, expectedMessages.shift());
            expect(true).to.be.ok.mark();
        });

        const logger = pino({ level: "trace" }, splitStream);

        const fastify = server({
            logger
        });

        fastify.inject({
            method: "GET",
            url: "/not-found"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });

    it("should serialize request and response", (done) => {
        const lines = [];
        const dest = new stream.Writable({
            write(chunk, enc, cb) {
                lines.push(JSON.parse(chunk));
                cb();
            }
        });
        const fastify = server({ logger: { level: "info", stream: dest } });

        fastify.get("/500", (req, reply) => {
            reply.code(500).send(Error("500 error"));
        });

        fastify.inject({
            url: "/500",
            method: "GET"
        }, (e, res) => {
            const l = lines.find((line) => line.res && line.res.statusCode === 500);
            assert.ok(l.req);
            assert.equal(l.req.method, "GET");
            assert.equal(l.req.url, "/500");
            done();
        });
    });

    {
        const interfaces = os.networkInterfaces();
        const ipv6 = Object.keys(interfaces)
            .filter((name) => name.substr(0, 2) === "lo")
            .map((name) => interfaces[name])
            .reduce((list, set) => list.concat(set), [])
            .filter((info) => info.family === "IPv6")
            .map((info) => info.address)
            .shift();

        if (!is.undefined(ipv6)) {
            it("Wrap IPv6 address in listening log message", (done) => {
                const stream = split(JSON.parse);
                const fastify = server({
                    logger: {
                        stream,
                        level: "info"
                    }
                });
                fastify.listen(0, ipv6, (err) => {
                    assert.notExists(err);
                    stream.once("data", (line) => {
                        const expected = `Server listening at http://[${ipv6}]:${fastify.server.address().port}`;
                        assert.equal(line.msg, expected);
                        fastify.close();
                        done();
                    });
                });
            });
        }
    }

    it("Do not wrap IPv4 address", (done) => {
        const stream = split(JSON.parse);
        const fastify = server({
            logger: {
                stream,
                level: "info"
            }
        });
        fastify.listen(0, "127.0.0.1", (err) => {
            assert.notExists(err);
            stream.once("data", (line) => {
                const expected = `Server listening at http://127.0.0.1:${fastify.server.address().port}`;
                assert.equal(line.msg, expected);
                fastify.close();
                done();
            });
        });
    });

    it("file option", (done) => {
        expect(2).checks(done);
        let fastify = null;
        const dest = file();

        fastify = server({
            logger: {
                file: dest
            }
        });

        fastify.get("/", (req, reply) => {
            assert.ok(req.log);
            reply.send({ hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            http.get(`http://localhost:${fastify.server.address().port}`, () => {
                const stream = fs.createReadStream(dest).pipe(split(JSON.parse));

                stream.once("data", (listenAtLogLine) => {
                    assert.ok(listenAtLogLine, "listen at log message is ok");

                    stream.once("data", (line) => {
                        const id = line.reqId;
                        assert.ok(line.reqId, "reqId is defined");
                        assert.ok(line.req, "req is defined");
                        assert.equal(line.msg, "incoming request", "message is set");
                        assert.equal(line.req.method, "GET", "method is get");

                        stream.once("data", (line) => {
                            assert.equal(line.reqId, id);
                            assert.ok(line.reqId, "reqId is defined");
                            assert.ok(line.res, "res is defined");
                            assert.equal(line.msg, "request completed", "message is set");
                            assert.equal(line.res.statusCode, 200, "statusCode is 200");
                            assert.ok(line.responseTime, "responseTime is defined");
                            stream.resume();
                            expect(true).to.be.ok.mark();
                        });
                    });
                });
            });
        });
    });

    it("should log the error if no error handler is defined", (done) => {
        expect(2).checks(done);
        const stream = split(JSON.parse);
        const fastify = server({
            logger: {
                stream,
                level: "info"
            }
        });
        fastify.get("/error", (req, reply) => {
            assert.ok(req.log);
            expect(true).to.be.ok.mark();
            reply.send(new Error("a generic error"));
        });
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
            http.get(`http://localhost:${fastify.server.address().port}/error`);
            stream.once("data", (listenAtLogLine) => {
                assert.ok(listenAtLogLine, "listen at log message is ok");
                stream.once("data", (line) => {
                    assert.equal(line.msg, "incoming request", "message is set");
                    stream.once("data", (line) => {
                        assert.equal(line.level, 50, "level is correct");
                        assert.equal(line.msg, "a generic error", "message is set");
                        stream.once("data", (line) => {
                            assert.equal(line.msg, "request completed", "message is set");
                            assert.deepEqual(line.res, { statusCode: 500 }, "status code is set");
                            expect(true).to.be.ok.mark();
                        });
                    });
                });
            });
        });
    });

    it("should log as info if error status code >= 400 and < 500 if no error handler is defined", (done) => {
        const stream = split(JSON.parse);
        const fastify = server({
            logger: {
                stream,
                level: "info"
            }
        });
        fastify.get("/400", (req, reply) => {
            assert.ok(req.log);
            reply.send(Object.assign(new Error("a 400 error"), { statusCode: 400 }));
        });
        fastify.get("/503", (req, reply) => {
            assert.ok(req.log);
            reply.send(Object.assign(new Error("a 503 error"), { statusCode: 503 }));
        });
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
            http.get(`http://localhost:${fastify.server.address().port}/400`);
            stream.once("data", (listenAtLogLine) => {
                assert.ok(listenAtLogLine, "listen at log message is ok");
                stream.once("data", (line) => {
                    assert.equal(line.msg, "incoming request", "message is set");
                    stream.once("data", (line) => {
                        assert.equal(line.level, 30, "level is correct");
                        assert.equal(line.msg, "a 400 error", "message is set");
                        stream.once("data", (line) => {
                            assert.equal(line.msg, "request completed", "message is set");
                            assert.deepEqual(line.res, { statusCode: 400 }, "status code is set");
                            done();
                        });
                    });
                });
            });
        });
    });

    it("should log as error if error status code >= 500 if no error handler is defined", (done) => {
        const stream = split(JSON.parse);
        const fastify = server({
            logger: {
                stream,
                level: "info"
            }
        });
        fastify.get("/503", (req, reply) => {
            assert.ok(req.log);
            reply.send(Object.assign(new Error("a 503 error"), { statusCode: 503 }));
        });
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
            http.get(`http://localhost:${fastify.server.address().port}/503`);
            stream.once("data", (listenAtLogLine) => {
                assert.ok(listenAtLogLine, "listen at log message is ok");
                stream.once("data", (line) => {
                    assert.equal(line.msg, "incoming request", "message is set");
                    stream.once("data", (line) => {
                        assert.equal(line.level, 50, "level is correct");
                        assert.equal(line.msg, "a 503 error", "message is set");
                        stream.once("data", (line) => {
                            assert.equal(line.msg, "request completed", "message is set");
                            assert.deepEqual(line.res, { statusCode: 503 }, "status code is set");
                            done();
                        });
                    });
                });
            });
        });
    });

    it("should not log the error if error handler is defined", (done) => {
        const stream = split(JSON.parse);
        const fastify = server({
            logger: {
                stream,
                level: "info"
            }
        });
        fastify.get("/error", (req, reply) => {
            assert.ok(req.log);
            reply.send(new Error("something happened"));
        });
        fastify.setErrorHandler((err, req, reply) => {
            reply.send(err);
        });
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
            http.get(`http://localhost:${fastify.server.address().port}/error`);
            stream.once("data", (listenAtLogLine) => {
                assert.ok(listenAtLogLine, "listen at log message is ok");
                stream.once("data", (line) => {
                    assert.equal(line.msg, "incoming request", "message is set");
                    stream.once("data", (line) => {
                        assert.equal(line.level, 30, "level is correct");
                        assert.equal(line.msg, "request completed", "message is set");
                        assert.deepEqual(line.res, { statusCode: 500 }, "status code is set");
                        done();
                    });
                });
            });
        });
    });

    it("should redact the authorization header if so specified", (done) => {
        expect(3).checks(done);
        const stream = split(JSON.parse);
        const fastify = server({
            logger: {
                stream,
                redact: ["req.headers.authorization"],
                level: "info",
                serializers: {
                    req(req) {
                        return {
                            method: req.method,
                            url: req.url,
                            headers: req.headers,
                            hostname: req.hostname,
                            remoteAddress: req.ip,
                            remotePort: req.connection.remotePort
                        };
                    }
                }
            }
        });
        fastify.get("/", (req, reply) => {
            assert.equal(req.headers.authorization, "Bearer abcde");
            expect(true).to.be.ok.mark();
            reply.send({ hello: "world" });
        });
        stream.once("data", (listenAtLogLine) => {
            assert.ok(listenAtLogLine, "listen at log message is ok");
            expect(true).to.be.ok.mark();
            stream.once("data", (line) => {
                assert.equal(line.req.headers.authorization, "[Redacted]", "authorization is redacted");
            });
        });
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    authorization: "Bearer abcde"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                expect(true).to.be.ok.mark();
            });
        });
    });
});
