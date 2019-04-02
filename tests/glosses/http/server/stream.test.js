const {
    http: { server }
} = adone;

const sget = require("simple-get").concat;
const fs = require("fs");
const resolve = require("path").resolve;
const zlib = require("zlib");
const pump = require("pump");
const errors = require("http-errors");
const JSONStream = require("JSONStream");
const send = require("send");
const Readable = require("stream").Readable;
const split = require("split2");

describe("stream", () => {
    it("should respond with a stream", (done) => {
        const fastify = server();

        expect(2).checks(done);
    
        fastify.get("/", (req, reply) => {
            const stream = fs.createReadStream(__filename, "utf8");
            reply.code(200).send(stream);
        });
    
        fastify.get("/error", (req, reply) => {
            const stream = fs.createReadStream("not-existing-file", "utf8");
            reply.code(200).send(stream);
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
    
            sget(`http://localhost:${fastify.server.address().port}`, (err, response, data) => {
                assert.notExists(err);
                assert.strictEqual(response.headers["content-type"], "application/octet-stream");
                assert.strictEqual(response.statusCode, 200);
    
                fs.readFile(__filename, (err, expected) => {
                    assert.notExists(err);
                    assert.equal(expected.toString(), data.toString());
                    expect(true).to.be.ok.mark();
                });
            });
    
            sget(`http://localhost:${fastify.server.address().port}/error`, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 500);
                expect(true).to.be.ok.mark();
            });
        });
    });
    
    it("should trigger the onSend hook", (done) => {
        const fastify = server();

        expect(2).checks(done);
    
        fastify.get("/", (req, reply) => {
            reply.send(fs.createReadStream(__filename, "utf8"));
        });
    
        fastify.addHook("onSend", (req, reply, payload, next) => {
            assert.ok(payload._readableState);
            expect(true).to.be.ok.mark();
            reply.header("Content-Type", "application/javascript");
            next();
        });
    
        fastify.inject({
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.headers["content-type"], "application/javascript");
            assert.strictEqual(res.payload, fs.readFileSync(__filename, "utf8"));
            fastify.close();
            expect(true).to.be.ok.mark();
        });
    });
    
    it("should trigger the onSend hook only twice if pumping the stream fails, first with the stream, second with the serialized error", (done) => {
        const fastify = server();

        expect(3).checks(done);
    
        fastify.get("/", (req, reply) => {
            reply.send(fs.createReadStream("not-existing-file", "utf8"));
        });
    
        let counter = 0;
        fastify.addHook("onSend", (req, reply, payload, next) => {
            if (counter === 0) {
                assert.ok(payload._readableState);
            } else if (counter === 1) {
                const error = JSON.parse(payload);
                assert.strictEqual(error.statusCode, 500);
            }
            expect(true).to.be.ok.mark();
            counter++;
            next();
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
    
            fastify.server.unref();
    
            sget(`http://localhost:${fastify.server.address().port}`, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 500);
                expect(true).to.be.ok.mark();
            });
        });
    });
    
    it("onSend hook stream", (done) => {
        const fastify = server();

        expect(2).checks(done);
    
        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });
    
        fastify.addHook("onSend", (req, reply, payload, next) => {
            const gzStream = zlib.createGzip();
    
            reply.header("Content-Encoding", "gzip");
            pump(
                fs.createReadStream(resolve(adone.std.path.join(__dirname, "stream.test.js")), "utf8"),
                gzStream,
                (err) => {
                    assert.notExists(err);
                    expect(true).to.be.ok.mark();
                }
            );
            next(null, gzStream);
        });
    
        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.headers["content-encoding"], "gzip");
            const file = fs.readFileSync(resolve(adone.std.path.join(__dirname, "stream.test.js")), "utf8");
            const payload = zlib.gunzipSync(res.rawPayload);
            assert.strictEqual(payload.toString("utf-8"), file);
            fastify.close();
            expect(true).to.be.ok.mark();
        });
    });
    
    it("Destroying streams prematurely", (done) => {
        expect(2).checks(done);
    
        let fastify = null;
        const logStream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream: logStream,
                    level: "warn"
                }
            });
        } catch (e) {
            assert.fail();
        }
        const stream = require("stream");
        const http = require("http");
    
        // Test that "premature close" errors are logged with level warn
        logStream.once("data", (line) => {
            assert.equal(line.msg, "response terminated with an error with headers already sent");
            assert.equal(line.level, 40);
            expect(true).to.be.ok.mark();
        });
    
        fastify.get("/", (request, reply) => {
            // t.pass("Received request");
            expect(true).to.be.ok.mark();
    
            let sent = false;
            const reallyLongStream = new stream.Readable({
                read() {
                    if (!sent) {
                        this.push(Buffer.from("hello\n"));
                    }
                    sent = true;
                }
            });
    
            reply.send(reallyLongStream);
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
    
            const port = fastify.server.address().port;
    
            http.get(`http://localhost:${port}`, (response) => {
                assert.strictEqual(response.statusCode, 200);
                response.on("readable", () => {
                    response.destroy();
                });
                response.on("close", () => {
                    // t.pass("Response closed");
                    expect(true).to.be.ok.mark();
                });
            });
        });
    });
    
    it("Destroying streams prematurely should call close method", (done) => {
        expect(2).checks(done);
    
        let fastify = null;
        const logStream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream: logStream,
                    level: "warn"
                }
            });
        } catch (e) {
            assert.fail();
        }
        const stream = require("stream");
        const http = require("http");
    
        // Test that "premature close" errors are logged with level warn
        logStream.once("data", (line) => {
            assert.equal(line.msg, "response terminated with an error with headers already sent");
            assert.equal(line.level, 40);
            expect(true).to.be.ok.mark();
        });
    
        fastify.get("/", (request, reply) => {
            // t.pass("Received request");
            expect(true).to.be.ok.mark();
    
            let sent = false;
            const reallyLongStream = new stream.Readable({
                read() {
                    if (!sent) {
                        this.push(Buffer.from("hello\n"));
                    }
                    sent = true;
                }
            });
            reallyLongStream.destroy = undefined;
            reallyLongStream.close = () => assert.ok("called");
            reply.send(reallyLongStream);
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
    
            const port = fastify.server.address().port;
    
            http.get(`http://localhost:${port}`, (response) => {
                assert.strictEqual(response.statusCode, 200);
                response.on("readable", () => {
                    response.destroy();
                });
                response.on("close", () => {
                    // t.pass("Response closed");
                    expect(true).to.be.ok.mark();
                });
            });
        });
    });
    
    it("Destroying streams prematurely should call abort method", (done) => {
        expect(2).checks(done);

        let fastify = null;
        const logStream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream: logStream,
                    level: "warn"
                }
            });
        } catch (e) {
            assert.fail();
        }
        const stream = require("stream");
        const http = require("http");
    
        // Test that "premature close" errors are logged with level warn
        logStream.once("data", (line) => {
            assert.equal(line.msg, "response terminated with an error with headers already sent");
            assert.equal(line.level, 40);
            expect(true).to.be.ok.mark();
        });
    
        fastify.get("/", (request, reply) => {
            // t.pass("Received request");
            expect(true).to.be.ok.mark();
    
            let sent = false;
            const reallyLongStream = new stream.Readable({
                read() {
                    if (!sent) {
                        this.push(Buffer.from("hello\n"));
                    }
                    sent = true;
                }
            });
            reallyLongStream.destroy = undefined;
            reallyLongStream.close = undefined;
            reallyLongStream.abort = () => assert.ok("called");
            reply.send(reallyLongStream);
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
    
            const port = fastify.server.address().port;
    
            http.get(`http://localhost:${port}`, (response) => {
                assert.strictEqual(response.statusCode, 200);
                response.on("readable", () => {
                    response.destroy();
                });
                response.on("close", () => {
                    // t.pass("Response closed");
                    expect(true).to.be.ok.mark();
                });
            });
        });
    });
    
    it("should respond with a stream1", (done) => {
        const fastify = server();
    
        fastify.get("/", (req, reply) => {
            const stream = JSONStream.stringify();
            reply.code(200).type("application/json").send(stream);
            stream.write({ hello: "world" });
            stream.end({ a: 42 });
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
    
            sget(`http://localhost:${fastify.server.address().port}`, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.headers["content-type"], "application/json");
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(JSON.parse(body), [{ hello: "world" }, { a: 42 }]);
                done();
            });
        });
    });
    
    it("return a 404 if the stream emits a 404 error", (done) => {
        expect(2).checks(done);
    
        const fastify = server();
    
        fastify.get("/", (request, reply) => {
            // t.pass("Received request");
            expect(true).to.be.ok.mark();
    
            const reallyLongStream = new Readable({
                read() {
                    setImmediate(() => {
                        this.emit("error", new errors.NotFound());
                    });
                }
            });
    
            reply.send(reallyLongStream);
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
    
            const port = fastify.server.address().port;
    
            sget(`http://localhost:${port}`, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark();
            });
        });
    });
    
    it("should support send module 200 and 404", (done) => {
        const fastify = server();

        expect(2).checks(done);
    
        fastify.get("/", (req, reply) => {
            const stream = send(req.req, __filename);
            reply.code(200).send(stream);
        });
    
        fastify.get("/error", (req, reply) => {
            const stream = send(req.req, "non-existing-file");
            reply.code(200).send(stream);
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
    
            sget(`http://localhost:${fastify.server.address().port}`, (err, response, data) => {
                assert.notExists(err);
                assert.strictEqual(response.headers["content-type"], "application/octet-stream");
                assert.strictEqual(response.statusCode, 200);
    
                fs.readFile(__filename, (err, expected) => {
                    assert.notExists(err);
                    assert.equal(expected.toString(), data.toString());
                    expect(true).to.be.ok.mark();
                });
            });
    
            sget(`http://localhost:${fastify.server.address().port}/error`, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark();
            });
        });
    });    
});
