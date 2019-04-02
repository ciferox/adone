const {
    is,
    http: { server },
    std: { fs }
} = adone;

const sget = require("simple-get").concat;
const jsonParser = require("fast-json-body");

const plainTextParser = function (request, callback) {
    let body = "";
    request.setEncoding("utf8");

    const onError = function (err) {
        callback(err, null);
    };
    const onData = function (chunk) {
        body += chunk;
    };
    const onEnd = function () {
        callback(null, body);
    };

    request.on("error", onError);
    request.on("data", onData);
    request.on("end", onEnd);
};

describe("custom parser", () => {
    describe("contentTypeParser should add a custom async parser", () => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.options("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("application/jsoff", async (req) => {
            const res = await new Promise((resolve, reject) => resolve(req));
            return res;
        });

        before((done) => {
            fastify.listen(0, (err) => {
                assert.notExists(err);
                done();
            });
        });

        it("in POST", (done) => {
            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/jsoff"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                done();
            });
        });

        it("in OPTIONS", (done) => {
            sget({
                method: "OPTIONS",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/jsoff"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                done();
            });
        });
    });

    it("contentTypeParser method should exist", () => {
        const fastify = server();
        assert.ok(fastify.addContentTypeParser);
    });

    describe("contentTypeParser should add a custom parser", () => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.options("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("application/jsoff", (req, done) => {
            jsonParser(req, (err, body) => {
                done(err, body);
            });
        });

        before((done) => {
            fastify.listen(0, (err) => {
                assert.notExists(err);
                done();
            });
        });

        after(() => {
            fastify.close();
        });

        it("in POST", (done) => {
            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/jsoff"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                done();
            });
        });

        it("in OPTIONS", (done) => {
            sget({
                method: "OPTIONS",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/jsoff"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                done();
            });
        });
    });

    it("contentTypeParser should handle multiple custom parsers", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.post("/hello", (req, reply) => {
            reply.send(req.body);
        });

        function customParser(req, done) {
            jsonParser(req, (err, body) => {
                done(err, body);
            });
        }

        fastify.addContentTypeParser("application/jsoff", customParser);
        fastify.addContentTypeParser("application/ffosj", customParser);

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/jsoff"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                expect(true).that.be.ok.mark();
            });

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}/hello`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/ffosj"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                expect(true).that.be.ok.mark();
            });
        });
    });

    it("contentTypeParser should handle an array of custom contentTypes", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.post("/hello", (req, reply) => {
            reply.send(req.body);
        });

        function customParser(req, done) {
            jsonParser(req, (err, body) => {
                done(err, body);
            });
        }

        fastify.addContentTypeParser(["application/jsoff", "application/ffosj"], customParser);

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/jsoff"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                expect(true).that.be.ok.mark();
            });

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}/hello`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/ffosj"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                expect(true).that.be.ok.mark();
            });
        });
    });

    it("contentTypeParser should handle errors", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("application/jsoff", (req, done) => {
            done(new Error("kaboom!"), {});
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/jsoff"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 500);
                fastify.close();
                done();
            });
        });
    });

    it("contentTypeParser should support encapsulation", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, opts, next) => {
            instance.addContentTypeParser("application/jsoff", () => { });
            assert.ok(instance.hasContentTypeParser("application/jsoff"));

            instance.register((instance, opts, next) => {
                instance.addContentTypeParser("application/ffosj", () => { });
                assert.ok(instance.hasContentTypeParser("application/jsoff"));
                assert.ok(instance.hasContentTypeParser("application/ffosj"));
                expect(true).that.be.ok.mark();
                next();
            });

            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            assert.notOk(fastify.hasContentTypeParser("application/jsoff"));
            assert.notOk(fastify.hasContentTypeParser("application/ffosj"));
            expect(true).that.be.ok.mark();
        });
    });

    it("contentTypeParser should support encapsulation, second try", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            instance.post("/", (req, reply) => {
                reply.send(req.body);
            });

            instance.addContentTypeParser("application/jsoff", (req, done) => {
                jsonParser(req, (err, body) => {
                    done(err, body);
                });
            });

            next();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/jsoff"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                fastify.close();
                done();
            });
        });
    });

    it('contentTypeParser shouldn\'t support request with undefined "Content-Type"', (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("application/jsoff", (req, done) => {
            jsonParser(req, (err, body) => {
                done(err, body);
            });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "unknown content type!",
                headers: {
                    // 'Content-Type': undefined
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 415);
                fastify.close();
                done();
            });
        });
    });

    it("the content type should be a string", () => {
        const fastify = server();

        try {
            fastify.addContentTypeParser(null, () => { });
            assert.fail();
        } catch (err) {
            assert.equal(err.message, "FST_ERR_CTP_INVALID_TYPE: The content type should be a string");
        }
    });

    it("the content type cannot be an empty string", () => {
        const fastify = server();

        try {
            fastify.addContentTypeParser("", () => { });
            assert.fail();
        } catch (err) {
            assert.equal(err.message, "FST_ERR_CTP_EMPTY_TYPE: The content type cannot be an empty string");
        }
    });

    it("the content type handler should be a function", () => {
        const fastify = server();

        try {
            fastify.addContentTypeParser("aaa", null);
            assert.fail();
        } catch (err) {
            assert.equal(err.message, "FST_ERR_CTP_INVALID_HANDLER: The content type handler should be a function");
        }
    });

    it("catch all content type parser", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("*", (req, done) => {
            let data = "";
            req.on("data", (chunk) => {
                data += chunk;
            });
            req.on("end", () => {
                done(null, data);
            });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "hello",
                headers: {
                    "Content-Type": "application/jsoff"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), "hello");

                sget({
                    method: "POST",
                    url: `http://localhost:${fastify.server.address().port}`,
                    body: "hello",
                    headers: {
                        "Content-Type": "very-weird-content-type"
                    }
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.deepEqual(body.toString(), "hello");
                    fastify.close();
                    done();
                });
            });
        });
    });

    it("catch all content type parser should not interfere with other conte type parsers", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("*", (req, done) => {
            let data = "";
            req.on("data", (chunk) => {
                data += chunk;
            });
            req.on("end", () => {
                done(null, data);
            });
        });

        fastify.addContentTypeParser("application/jsoff", (req, done) => {
            jsonParser(req, (err, body) => {
                done(err, body);
            });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/jsoff"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));

                sget({
                    method: "POST",
                    url: `http://localhost:${fastify.server.address().port}`,
                    body: "hello",
                    headers: {
                        "Content-Type": "very-weird-content-type"
                    }
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.deepEqual(body.toString(), "hello");
                    fastify.close();
                    done();
                });
            });
        });
    });

    // Issue 492 https://github.com/fastify/fastify/issues/492
    it("'*' catch undefined Content-Type requests", (done) => {
        const fastify = server();

        fastify.addContentTypeParser("*", (req, done) => {
            let data = "";
            req.on("data", (chunk) => {
                data += chunk;
            });
            req.on("end", () => {
                done(null, data);
            });
        });

        fastify.post("/", (req, res) => {
            // Needed to avoid json stringify
            res.type("text/plain").send(req.body);
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            const fileStream = fs.createReadStream(__filename);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}/`,
                body: fileStream
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(`${body}`, fs.readFileSync(__filename).toString());

                fastify.close();
                done();
            });
        });
    });

    it("cannot add custom parser after binding", (done) => {
        const fastify = server();

        fastify.post("/", (req, res) => {
            res.type("text/plain").send(req.body);
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            try {
                fastify.addContentTypeParser("*", () => { });
                assert.fail();
            } catch (e) {
                fastify.close();
                done();
            }
        });
    });

    it("Can override the default json parser", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("application/json", (req, done) => {
            assert.ok("called");
            jsonParser(req, (err, body) => {
                done(err, body);
            });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/json"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), '{"hello":"world"}');
                fastify.close();
                done();
            });
        });
    });

    it("Can override the default plain text parser", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("text/plain", (req, done) => {
            assert.ok("called");
            plainTextParser(req, (err, body) => {
                done(err, body);
            });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "hello world",
                headers: {
                    "Content-Type": "text/plain"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), "hello world");
                fastify.close();
                done();
            });
        });
    });

    it("Can override the default json parser in a plugin", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            instance.addContentTypeParser("application/json", (req, done) => {
                assert.ok("called");
                jsonParser(req, (err, body) => {
                    done(err, body);
                });
            });

            instance.post("/", (req, reply) => {
                reply.send(req.body);
            });

            next();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/json"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), '{"hello":"world"}');
                fastify.close();
                done();
            });
        });
    });

    it("Can't override the json parser multiple times", (done) => {
        const fastify = server();

        fastify.addContentTypeParser("application/json", (req, done) => {
            jsonParser(req, (err, body) => {
                done(err, body);
            });
        });

        try {
            fastify.addContentTypeParser("application/json", (req, done) => {
                assert.ok("called");
                jsonParser(req, (err, body) => {
                    done(err, body);
                });
            });
        } catch (err) {
            assert.equal(err.message, "FST_ERR_CTP_ALREADY_PRESENT: Content type parser 'application/json' already present.");
            done();
        }
    });

    it("Can't override the plain text parser multiple times", (done) => {
        const fastify = server();

        fastify.addContentTypeParser("text/plain", (req, done) => {
            plainTextParser(req, (err, body) => {
                done(err, body);
            });
        });

        try {
            fastify.addContentTypeParser("text/plain", (req, done) => {
                assert.ok("called");
                plainTextParser(req, (err, body) => {
                    done(err, body);
                });
            });
        } catch (err) {
            assert.equal(err.message, "FST_ERR_CTP_ALREADY_PRESENT: Content type parser 'text/plain' already present.");
            done();
        }
    });

    it("Should get the body as string", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
            assert.ok("called");
            assert.ok(is.string(body));
            try {
                const json = JSON.parse(body);
                done(null, json);
            } catch (err) {
                err.statusCode = 400;
                done(err, undefined);
            }
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/json"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), '{"hello":"world"}');
                fastify.close();
                done();
            });
        });
    });

    it("Should return defined body with no custom parser defined and content type = 'text/plain'", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "hello world",
                headers: {
                    "Content-Type": "text/plain"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), "hello world");
                fastify.close();
                done();
            });
        });
    });

    it("Should have typeof body object with no custom parser defined, no body defined and content type = 'text/plain'", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    "Content-Type": "text/plain"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(typeof body, "object");
                fastify.close();
                done();
            });
        });
    });

    it("Should have typeof body object with no custom parser defined, null body and content type = 'text/plain'", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: null,
                headers: {
                    "Content-Type": "text/plain"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(typeof body, "object");
                fastify.close();
                done();
            });
        });
    });

    it("Should have typeof body object with no custom parser defined, undefined body and content type = 'text/plain'", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: undefined,
                headers: {
                    "Content-Type": "text/plain"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(typeof body, "object");
                fastify.close();
                done();
            });
        });
    });

    it("Should get the body as string", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("text/plain", { parseAs: "string" }, (req, body, done) => {
            assert.ok("called");
            assert.ok(is.string(body));
            try {
                const plainText = body;
                done(null, plainText);
            } catch (err) {
                err.statusCode = 400;
                done(err, undefined);
            }
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "hello world",
                headers: {
                    "Content-Type": "text/plain"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), "hello world");
                fastify.close();
                done();
            });
        });
    });

    it("Should get the body as buffer", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
            assert.ok("called");
            assert.ok(body instanceof Buffer);
            try {
                const json = JSON.parse(body);
                done(null, json);
            } catch (err) {
                err.statusCode = 400;
                done(err, undefined);
            }
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/json"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), '{"hello":"world"}');
                fastify.close();
                done();
            });
        });
    });

    it("Should get the body as buffer", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("text/plain", { parseAs: "buffer" }, (req, body, done) => {
            assert.ok("called");
            assert.ok(body instanceof Buffer);
            try {
                const plainText = body;
                done(null, plainText);
            } catch (err) {
                err.statusCode = 400;
                done(err, undefined);
            }
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "hello world",
                headers: {
                    "Content-Type": "text/plain"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), "hello world");
                fastify.close();
                done();
            });
        });
    });

    it("Should parse empty bodies as a string", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.addContentTypeParser("text/plain", { parseAs: "string" }, (req, body, done) => {
            assert.strictEqual(body, "");
            done(null, body);
        });

        fastify.route({
            method: ["POST", "DELETE"],
            url: "/",
            handler(request, reply) {
                reply.send(request.body);
            }
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "",
                headers: {
                    "Content-Type": "text/plain"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), "");
                expect(true).that.be.ok.mark();
            });

            sget({
                method: "DELETE",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "",
                headers: {
                    "Content-Type": "text/plain",
                    "Content-Length": "0"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), "");
                expect(true).that.be.ok.mark();
            });
        });
    });

    it("Should parse empty bodies as a buffer", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("text/plain", { parseAs: "buffer" }, (req, body, done) => {
            assert.ok(body instanceof Buffer);
            assert.strictEqual(body.length, 0);
            done(null, body);
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "",
                headers: {
                    "Content-Type": "text/plain"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.length, 0);
                fastify.close();
                done();
            });
        });
    });

    it("The charset should not interfere with the content type handling", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser("application/json", (req, done) => {
            assert.ok("called");
            jsonParser(req, (err, body) => {
                done(err, body);
            });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: '{"hello":"world"}',
                headers: {
                    "Content-Type": "application/json charset=utf-8"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body.toString(), '{"hello":"world"}');
                fastify.close();
                done();
            });
        });
    });

    it("Wrong parseAs parameter", (done) => {
        const fastify = server();

        try {
            fastify.addContentTypeParser("application/json", { parseAs: "fireworks" }, () => { });
            assert.fail("should throw");
        } catch (err) {
            assert.equal(err.message, "FST_ERR_CTP_INVALID_PARSE_TYPE: The body parser can only parse your data as 'string' or 'buffer', you asked 'fireworks' which is not supported.");
            done();
        }
    });

    it("Should allow defining the bodyLimit per parser", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.addContentTypeParser(
            "x/foo",
            { parseAs: "string", bodyLimit: 5 },
            (req, body, done) => {
                assert.fail("should not be invoked");
                done();
            }
        );

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "1234567890",
                headers: {
                    "Content-Type": "x/foo"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(body.toString()), {
                    statusCode: 413,
                    code: "FST_ERR_CTP_BODY_TOO_LARGE",
                    error: "Payload Too Large",
                    message: "FST_ERR_CTP_BODY_TOO_LARGE: Request body is too large"
                });
                fastify.close();
                done();
            });
        });
    });

    it("route bodyLimit should take precedence over a custom parser bodyLimit", (done) => {
        const fastify = server();

        fastify.post("/", { bodyLimit: 5 }, (request, reply) => {
            reply.send(request.body);
        });

        fastify.addContentTypeParser(
            "x/foo",
            { parseAs: "string", bodyLimit: 100 },
            (req, body, done) => {
                assert.fail("should not be invoked");
                done();
            }
        );

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                body: "1234567890",
                headers: { "Content-Type": "x/foo" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(body.toString()), {
                    statusCode: 413,
                    code: "FST_ERR_CTP_BODY_TOO_LARGE",
                    error: "Payload Too Large",
                    message: "FST_ERR_CTP_BODY_TOO_LARGE: Request body is too large"
                });
                fastify.close();
                done();
            });
        });
    });
});
