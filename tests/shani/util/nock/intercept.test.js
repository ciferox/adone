describe("shani", "util", "nock", "intercept", () => {
    const {
        is,
        std: {
            http,
            https,
            stream,
            querystring: qs
        },
        net: {
            http: {
                client: { create: createHttpClient },
                server: { Server: HTTPServer }
            }
        },
        shani: {
            util: { nock }
        }
    } = adone;

    const request = createHttpClient({
        rejectUnauthorized: false
    });

    const fixtures = new adone.fs.Directory(__dirname, "fixtures");
    const httpsOpts = {
        secure: {
            key: fixtures.getFile("key", "private.key").contentsSync(),
            cert: fixtures.getFile("key", "certificate.crt").contentsSync()
        }
    };

    let servers = [];

    const createHttpServer = () => {
        const serv = new HTTPServer();
        servers.push(serv);
        return serv;
    };

    afterEach(async () => {
        await Promise.all(servers.map((x) => x.unbind()));
        servers = [];
    });

    nock.enableNetConnect();

    class Dest extends adone.event.Emitter {
        constructor() {
            super();
            this.buffer = Buffer.allocUnsafe(0);
            this.writable = true;
        }

        end() {
            this.emit("end");
        }

        write(chunk) {
            const buf = Buffer.allocUnsafe(this.buffer.length + chunk.length);

            this.buffer.copy(buf);
            chunk.copy(buf, this.buffer.length);

            this.buffer = buf;

            return true;
        }
    }

    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    it("double activation throws error", () => {
        nock.restore();
        expect(nock.isActive()).to.be.false();
        nock.activate();
        expect(nock.isActive()).to.be.true();
        expect(() => {
            nock.activate();
        }).to.throw("already active");
        expect(nock.isActive()).to.be.true();
    });

    it("allow unmocked works (2)", async () => {
        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind(httpsOpts);
        const { port } = serv.address();

        const scope = nock(`https://localhost:${port}`, { allowUnmocked: true })
            .post("/post")
            .reply(200, "99problems");

        {
            const resp = await request.post(`https://localhost:${port}`, {
                some: "data"
            });
            expect(resp.data).to.be.equal("hello");
        }
        {
            const resp = await request.post(`https://localhost:${port}/post`, {
                some: "data"
            });
            expect(resp.data).to.be.equal("99problems");
        }
        scope.done();
    });

    it("allows unmocked works after one interceptor is removed", async () => {
        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind(httpsOpts);
        const { port } = serv.address();

        nock(`https://localhost:${port}`, { allowUnmocked: true }).
            get("/").
            reply(200, "Mocked");

        {
            const resp = await request.get(`https://localhost:${port}`);
            expect(resp.data).to.be.equal("Mocked");
        }
        {
            const resp = await request.get(`https://localhost:${port}/unmocked`);
            expect(resp.data).to.be.equal("hello");
        }
    });

    it("reply callback's requestBody should automatically parse to JSON", async () => {
        const requestBodyFixture = {
            id: 1,
            name: "bob"
        };

        const scope = nock("http://service")
            .post("/endpoint")
            .reply(200, (uri, requestBody) => {
                assert.deepEqual(requestBody, requestBodyFixture);
                requestBody.id = "overwrite";
                return requestBody;
            });

        const resp = await request.post("http://service/endpoint", requestBodyFixture);
        scope.done();
        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.deep.equal({
            ...requestBodyFixture,
            id: "overwrite"
        });
    });

    it("reply can take a callback", (done) => {
        let dataCalled = false;

        const scope = nock("http://www.google.com")
            .get("/")
            .reply(200, (path, requestBody, callback) => {
                callback(null, "Hello World!");
            });

        const req = http.request({
            host: "www.google.com",
            path: "/",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 200, "Status code is 200");
            res.on("end", () => {
                assert.ok(dataCalled, "data handler was called");
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "Hello World!", "response should match");
            });

        });

        req.end();
    });

    it("reply takes a callback for status code", (done) => {
        const statusCode = 202;
        const responseBody = "Hello, world!";
        const headers = {
            "X-Custom-Header": "abcdef"
        };

        const scope = nock("http://www.google.com")
            .get("/test-path/")
            .reply((path, requestBody, cb) => {
                setTimeout(() => {
                    cb(null, [statusCode, responseBody, headers]);
                }, 1);
            });

        const req = http.request({
            host: "www.google.com",
            path: "/test-path/",
            port: 80
        }, (res) => {
            assert.equal(res.statusCode, statusCode, "sends status code");
            assert.deepEqual(res.headers, headers, "sends headers");
            let hasData = false;
            res.on("data", (data) => {
                assert.equal(data.toString(), responseBody, "sends request body");
                hasData = true;
            });
            res.on("end", () => {
                scope.done();
                assert.isTrue(hasData);
                done();
            });

        });

        req.end();
    });

    it("reply should throw on error on the callback", (done) => {
        let dataCalled = false;

        const scope = nock("http://www.google.com")
            .get("/")
            .reply(500, (path, requestBody, callback) => {
                callback(new Error("Database failed"));
            });

        const req = http.request({
            host: "www.google.com",
            path: "/",
            port: 80
        }, (res) => {
            assert.equal(res.statusCode, 500, "Status code is 500");

            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.ok(data.toString().indexOf("Error: Database failed") === 0, "response should match");
            });

            res.on("end", () => {
                assert.ok(dataCalled, "data handler was called");
                scope.done();
                done();
            });
        });

        req.end();
    });

    it("get gets mocked", (done) => {
        let dataCalled = false;

        const scope = nock("http://www.google.com")
            .get("/")
            .reply(200, "Hello World!");

        const req = http.request({
            host: "www.google.com",
            path: "/",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 200, "Status code is 200");
            res.on("end", () => {
                assert.ok(dataCalled, "data handler was called");
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "Hello World!", "response should match");
            });

        });

        req.end();
    });

    it("get gets mocked with relative base path", (done) => {
        let dataCalled = false;

        const scope = nock("http://www.google.com/abc")
            .get("/def")
            .reply(200, "Hello World!");

        const req = http.request({
            host: "www.google.com",
            path: "/abc/def",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                assert.ok(dataCalled);
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "Hello World!", "response should match");
            });

        });

        req.end();
    });

    it("post", (done) => {
        let dataCalled = false;

        const scope = nock("http://www.google.com")
            .post("/form")
            .reply(201, "OK!");

        const req = http.request({
            host: "www.google.com",
            method: "POST",
            path: "/form",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 201);
            res.on("end", () => {
                assert.ok(dataCalled);
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "OK!", "response should match");
            });

        });

        req.end();
    });

    it("post with empty response body", (done) => {
        const scope = nock("http://www.google.com")
            .post("/form")
            .reply(200);

        const req = http.request({
            host: "www.google.com",
            method: "POST",
            path: "/form",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                done();
            });
            res.on("data", () => {
                assert.fail("No body should be returned");
            });

        });
        req.end();
    });

    it("post, lowercase", (done) => {
        let dataCalled = false;

        const scope = nock("http://www.google.com")
            .post("/form")
            .reply(200, "OK!");

        const req = http.request({
            host: "www.google.com",
            method: "post",
            path: "/form",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                assert.ok(dataCalled);
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "OK!", "response should match");
            });

        });

        req.end();
    });

    it("get with reply callback", (done) => {
        const scope = nock("http://www.google.com")
            .get("/")
            .reply(200, () => {
                return "OK!";
            });

        const req = http.request({
            host: "www.google.com",
            path: "/",
            port: 80
        }, (res) => {
            let dataCalled = false;
            res.on("end", () => {
                scope.done();
                assert.ok(dataCalled);
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), "OK!", "response should match");
            });
        });

        req.end();
    });

    it("get to different subdomain with reply callback and filtering scope", (done) => {
        //  We scope for www.google.com but through scope filtering we
        //  will accept any <subdomain>.google.com
        const scope = nock("http://www.google.com", {
            filteringScope(scope) {
                return /^http:\/\/.*\.google\.com/.test(scope);
            }
        })
            .get("/")
            .reply(200, () => {
                return "OK!";
            });

        const req = http.request({
            host: "any-subdomain-will-do.google.com",
            path: "/",
            port: 80
        }, (res) => {
            let dataCalled = false;
            res.on("end", () => {
                scope.done();
                assert.ok(dataCalled);
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), "OK!", "response should match");
            });
        });

        req.end();
    });

    it("get with reply callback returning object", (done) => {
        const scope = nock("http://www.googlezzzz.com")
            .get("/")
            .reply(200, () => {
                return { message: "OK!" };
            });

        const req = http.request({
            host: "www.googlezzzz.com",
            path: "/",
            port: 80
        }, (res) => {
            let dataCalled = false;

            res.on("end", () => {
                scope.done();
                assert.ok(dataCalled);
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), JSON.stringify({ message: "OK!" }), "response should match");
            });
        });

        req.end();
    });

    it("get with reply callback returning array with headers", (done) => {
        nock("http://replyheaderland")
            .get("/")
            .reply(() => {
                return [202, "body", { "x-key": "value", "x-key-2": "value 2" }];
            });

        http.get({
            host: "replyheaderland",
            path: "/",
            port: 80
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 202);
            assert.deepEqual(res.headers, {
                "x-key": "value",
                "x-key-2": "value 2"
            });
            assert.deepEqual(res.rawHeaders, [
                "x-key", "value",
                "x-key-2", "value 2"]);
            res.on("data", (data) => {
                assert.equal(data, "body");
                res.once("end", done);
            });
        });
    });

    it("post with reply callback, uri, and request body", (done) => {
        const input = "key=val";

        const scope = nock("http://www.google.com")
            .post("/echo", input)
            .reply(200, (uri, body) => {
                return ["OK", uri, body].join(" ");
            });

        const req = http.request({
            host: "www.google.com",
            method: "POST",
            path: "/echo",
            port: 80
        }, (res) => {
            let dataCalled = false;
            res.on("end", () => {
                scope.done();
                assert.ok(dataCalled);
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), "OK /echo key=val", "response should match");
            });
        });

        req.write(input);
        req.end();
    });

    it("post with regexp as spec", (done) => {
        const scope = nock("http://www.google.com")
            .post("/echo", /key=v.?l/g)
            .reply(200, (uri, body) => {
                return ["OK", uri, body].join(" ");
            });

        const req = http.request({
            host: "www.google.com",
            method: "POST",
            path: "/echo",
            port: 80
        }, (res) => {
            let dataCalled = false;
            res.on("end", () => {
                scope.done();
                assert.ok(dataCalled);
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), "OK /echo key=val", "response should match");
            });
        });

        req.write("key=val");
        req.end();
    });

    it("post with function as spec", (done) => {
        const scope = nock("http://www.google.com")
            .post("/echo", (body) => {
                return body === "key=val";
            })
            .reply(200, (uri, body) => {
                return ["OK", uri, body].join(" ");
            });

        const req = http.request({
            host: "www.google.com",
            method: "POST",
            path: "/echo",
            port: 80
        }, (res) => {
            let dataCalled = false;
            res.on("end", () => {
                scope.done();
                assert.ok(dataCalled);
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), "OK /echo key=val", "response should match");
            });
        });

        req.write("key=val");
        req.end();
    });

    it("post with chaining on call", (done) => {
        const input = "key=val";

        const scope = nock("http://www.google.com")
            .post("/echo", input)
            .reply(200, (uri, body) => {
                return ["OK", uri, body].join(" ");
            });

        const req = http.request({
            host: "www.google.com",
            method: "POST",
            path: "/echo",
            port: 80
        }, (res) => {
            let dataCalled = false;
            res.on("end", () => {
                scope.done();
                assert.ok(dataCalled);
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), "OK /echo key=val", "response should match");
            });
        });
        req.end(input);
    });

    it("reply with callback and filtered path and body", (done) => {
        let noPrematureExecution = false;

        const scope = nock("http://www.realcallback.com")
            .filteringPath(/.*/, "*")
            .filteringRequestBody(/.*/, "*")
            .post("*", "*")
            .reply(200, (uri, body) => {
                assert.ok(noPrematureExecution);
                return ["OK", uri, body].join(" ");
            });

        const req = http.request({
            host: "www.realcallback.com",
            method: "POST",
            path: "/original/path",
            port: 80
        }, (res) => {
            let dataCalled = false;
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                assert.ok(dataCalled);
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), "OK /original/path original=body", "response should match");
            });
        });

        noPrematureExecution = true;
        req.end("original=body");
    });

    it("isDone", (done) => {
        const scope = nock("http://www.google.com")
            .get("/")
            .reply(200, "Hello World!");

        assert.notOk(scope.isDone(), "not done when a request is outstanding");

        const req = http.request({
            host: "www.google.com",
            path: "/",
            port: 80
        }, (res) => {
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                assert.ok(scope.isDone(), "done after request is made");
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end();
    });

    it("request headers exposed", (done) => {

        const scope = nock("http://www.headdy.com")
            .get("/")
            .reply(200, "Hello World!", { "X-My-Headers": "My Header value" });

        const req = http.get({
            host: "www.headdy.com",
            method: "GET",
            path: "/",
            port: 80,
            headers: { "X-My-Headers": "My custom Header value" }
        }, (res) => {
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        assert.deepEqual(req._headers, { "x-my-headers": "My custom Header value", host: "www.headdy.com" });
    });

    it("headers work", (done) => {
        const scope = nock("http://www.headdy.com")
            .get("/")
            .reply(200, "Hello World!", { "X-My-Headers": "My Header value" });

        const req = http.request({
            host: "www.headdy.com",
            method: "GET",
            path: "/",
            port: 80
        }, (res) => {
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                assert.deepEqual(res.headers, { "x-my-headers": "My Header value" });
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end();

    });

    it("reply headers work with function", (done) => {

        const scope = nock("http://replyheadersworkwithfunction.xxx")
            .get("/")
            .reply(200, () => {
                return "ABC";
            }, { "X-My-Headers": "My custom header value" });

        http.get({
            host: "replyheadersworkwithfunction.xxx",
            path: "/",
            port: 80
        }, (res) => {
            assert.deepEqual(res.headers, { "x-my-headers": "My custom header value" });
            scope.done();
            done();
        });
    });

    it("reply headers as function work", (done) => {
        nock("http://example.com")
            .get("/")
            .reply(200, "boo!", {
                "X-My-Headers"(req, res, body) {
                    return body.toString();
                }
            });

        http.get({
            host: "example.com",
            path: "/"
        }, (res) => {
            assert.deepEqual(res.headers, { "x-my-headers": "boo!" });
            assert.deepEqual(res.rawHeaders, ["X-My-Headers", "boo!"]); // 67
            done();
        });
    });

    it("reply headers as function are evaluated only once per request", (done) => {
        let counter = 0;
        nock("http://example.com")
            .get("/")
            .reply(200, "boo!", {
                "X-My-Headers"(req, res, body) {
                    ++counter;
                    return body.toString();
                }
            });

        http.get({
            host: "example.com",
            path: "/"
        }, (res) => {
            assert.deepEqual(res.headers, { "x-my-headers": "boo!" });
            assert.deepEqual(res.rawHeaders, ["X-My-Headers", "boo!"]);
            assert.equal(counter, 1);
            done();
        });
    });

    it("reply headers as function are evaluated on each request", (done) => {
        let counter = 0;
        nock("http://example.com")
            .get("/")
            .times(2)
            .reply(200, "boo!", {
                "X-My-Headers"(req, res, body) {
                    return String(++counter);
                }
            });

        http.get({
            host: "example.com",
            path: "/"
        }, (res) => {
            assert.deepEqual(res.headers, { "x-my-headers": "1" });
            assert.deepEqual(res.rawHeaders, ["X-My-Headers", "1"]);
            assert.equal(counter, 1);
            http.get({
                host: "example.com",
                path: "/"
            }, (res) => {
                assert.deepEqual(res.headers, { "x-my-headers": "2" });
                assert.deepEqual(res.rawHeaders, ["X-My-Headers", "2"]);
                assert.equal(counter, 2);
                done();
            });
        });
    });

    it("match headers", (done) => {
        const scope = nock("http://www.headdy.com")
            .get("/")
            .matchHeader("x-my-headers", "My custom Header value")
            .reply(200, "Hello World!");

        http.get({
            host: "www.headdy.com",
            method: "GET",
            path: "/",
            port: 80,
            headers: { "X-My-Headers": "My custom Header value" }
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200);

            res.on("data", (data) => {
                assert.equal(data, "Hello World!");
            });

            res.on("end", () => {
                scope.done();
                done();
            });
        });

    });

    it("multiple match headers", (done) => {
        const scope = nock("http://www.headdy.com")
            .get("/")
            .matchHeader("x-my-headers", "My custom Header value")
            .reply(200, "Hello World!")
            .get("/")
            .matchHeader("x-my-headers", "other value")
            .reply(200, "Hello World other value!");

        http.get({
            host: "www.headdy.com",
            method: "GET",
            path: "/",
            port: 80,
            headers: { "X-My-Headers": "other value" }
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200);

            res.on("data", (data) => {
                assert.equal(data, "Hello World other value!");
            });

            res.on("end", () => {
                http.get({
                    host: "www.headdy.com",
                    method: "GET",
                    path: "/",
                    port: 80,
                    headers: { "X-My-Headers": "My custom Header value" }
                }, (res) => {
                    res.setEncoding("utf8");
                    assert.equal(res.statusCode, 200);

                    res.on("data", (data) => {
                        assert.equal(data, "Hello World!");
                    });

                    res.on("end", () => {
                        scope.done();
                        done();
                    });
                });
            });
        });

    });

    it("match headers with regexp", (done) => {
        const scope = nock("http://www.headier.com")
            .get("/")
            .matchHeader("x-my-headers", /My He.d.r [0-9.]+/)
            .reply(200, "Hello World!");

        http.get({
            host: "www.headier.com",
            method: "GET",
            path: "/",
            port: 80,
            headers: { "X-My-Headers": "My Header 1.0" }
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200);

            res.on("data", (data) => {
                assert.equal(data, "Hello World!");
            });

            res.on("end", () => {
                scope.done();
                done();
            });
        });

    });

    it("match headers on number with regexp", (done) => {
        const scope = nock("http://www.headier.com")
            .get("/")
            .matchHeader("x-my-headers", /\d+/)
            .reply(200, "Hello World!");

        http.get({
            host: "www.headier.com",
            method: "GET",
            path: "/",
            port: 80,
            headers: { "X-My-Headers": 123 }
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200);

            res.on("data", (data) => {
                assert.equal(data, "Hello World!");
            });

            res.on("end", () => {
                scope.done();
                done();
            });
        });

    });

    it("match headers with function", (done) => {
        const scope = nock("http://www.headier.com")
            .get("/")
            .matchHeader("x-my-headers", (val) => {
                return val > 123;
            })
            .reply(200, "Hello World!");

        http.get({
            host: "www.headier.com",
            method: "GET",
            path: "/",
            port: 80,
            headers: { "X-My-Headers": 456 }
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200);

            res.on("data", (data) => {
                assert.equal(data, "Hello World!");
            });

            res.on("end", () => {
                scope.done();
                done();
            });
        });

    });

    it("match all headers", (done) => {
        const scope = nock("http://api.headdy.com")
            .matchHeader("accept", "application/json")
            .get("/one")
            .reply(200, { hello: "world" })
            .get("/two")
            .reply(200, { a: 1, b: 2, c: 3 });

        let ended = 0;
        const callback = () => {
            ended += 1;
            if (ended === 2) {
                scope.done();
                done();
            }
        };

        http.get({
            host: "api.headdy.com",
            path: "/one",
            port: 80,
            headers: { Accept: "application/json" }
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200);

            res.on("data", (data) => {
                assert.equal(data, '{"hello":"world"}');
            });

            res.on("end", callback);
        });

        http.get({
            host: "api.headdy.com",
            path: "/two",
            port: 80,
            headers: { accept: "application/json" }
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200);

            res.on("data", (data) => {
                assert.equal(data, '{"a":1,"b":2,"c":3}');
            });

            res.on("end", callback);
        });

    });

    it("header manipulation", (done) => {
        const scope = nock("http://example.com")
            .get("/accounts")
            .reply(200, { accounts: [{ id: 1, name: "Joe Blow" }] });

        const req = http.get({ host: "example.com", path: "/accounts" }, (res) => {
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.setHeader("X-Custom-Header", "My Value");
        assert.equal(req.getHeader("X-Custom-Header"), "My Value", "Custom header was not set");

        req.removeHeader("X-Custom-Header");
        assert.notOk(req.getHeader("X-Custom-Header"), "Custom header was not removed");

        req.end();
    });

    it("head", (done) => {
        const scope = nock("http://www.google.com")
            .head("/form")
            .reply(201, "OK!");

        const req = http.request({
            host: "www.google.com",
            method: "HEAD",
            path: "/form",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 201);
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end();
    });

    it("body data is differentiating", (done) => {
        const scope = nock("http://www.boddydiff.com")
            .post("/", "abc")
            .reply(200, "Hey 1")
            .post("/", "def")
            .reply(200, "Hey 2");

        const req = http.request({
            host: "www.boddydiff.com",
            method: "POST",
            path: "/",
            port: 80
        }, (res) => {
            let dataCalled = false;
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                assert.ok(dataCalled);
                const req = http.request({
                    host: "www.boddydiff.com",
                    method: "POST",
                    path: "/",
                    port: 80
                }, (res) => {
                    let dataCalled = false;
                    assert.equal(res.statusCode, 200);
                    res.on("end", () => {
                        assert.ok(dataCalled);
                        scope.done();
                        done();
                    });
                    res.on("data", (data) => {
                        dataCalled = true;
                        assert.ok(data instanceof Buffer, "data should be buffer");
                        assert.equal(data.toString(), "Hey 2", "response should match");
                    });
                });

                req.end("def");
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "Hey 1", "response should match");
            });
        });

        req.end("abc");
    });

    describe("chaining", () => {
        let scope;

        beforeEach(() => {
            scope = nock("http://www.spiffy.com")
                .get("/")
                .reply(200, "Hello World!")
                .post("/form")
                .reply(201, "OK!");
        });

        it("post", (done) => {
            const req = http.request({
                host: "www.spiffy.com",
                method: "POST",
                path: "/form",
                port: 80
            }, (res) => {

                assert.equal(res.statusCode, 201);
                res.once("data", (data) => {
                    assert.ok(data instanceof Buffer, "data should be buffer");
                    assert.equal(data.toString(), "OK!", "response should match");

                    res.once("end", done);
                });

            });

            req.end();
        });

        it("get", (done) => {
            const req = http.request({
                host: "www.spiffy.com",
                method: "GET",
                path: "/",
                port: 80
            }, (res) => {

                assert.equal(res.statusCode, 200);
                res.once("data", (data) => {
                    assert.ok(data instanceof Buffer, "data should be buffer");
                    assert.equal(data.toString(), "Hello World!", "response should match");

                    res.once("end", done);
                });

            });

            req.end();
        });
    });

    it("encoding", (done) => {
        let dataCalled = false;

        const scope = nock("http://www.encoderz.com")
            .get("/")
            .reply(200, "Hello World!");

        const req = http.request({
            host: "www.encoderz.com",
            path: "/",
            port: 80
        }, (res) => {

            res.setEncoding("base64");

            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                assert.ok(dataCalled);
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.typeOf(data, "string", "data should be string");
                assert.equal(data, "SGVsbG8gV29ybGQh", "response should match base64 encoding");
            });

        });

        req.end();
    });

    it("reply with file", (done) => {
        let dataCalled = false;

        nock("http://www.filereplier.com")
            .get("/")
            .replyWithFile(200, fixtures.getFile("reply_file_1.txt").path())
            .get("/test")
            .reply(200, "Yay!");

        const req = http.request({
            host: "www.filereplier.com",
            path: "/",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                assert.ok(dataCalled);
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), "Hello from the file!", "response should match");
            });

        });

        req.end();

    });

    it("reply with file and pipe response", (done) => {
        nock("http://www.files.com")
            .get("/")
            .replyWithFile(200, fixtures.getFile("reply_file_1.txt").path());

        http.get({
            host: "www.files.com",
            path: "/",
            port: 80
        }, (res) => {
            let str = "";
            const fakeStream = new (require("stream").Stream)();
            fakeStream.writable = true;

            fakeStream.write = function (d) {
                str += d;
            };

            fakeStream.end = function () {
                assert.equal(str, "Hello from the file!", "response should match");
                done();
            };

            res.pipe(fakeStream);
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200);
        });

    });

    it("reply with file with headers", (done) => {
        let dataCalled = false;

        nock("http://www.filereplier2.com")
            .get("/")
            .replyWithFile(200, fixtures.getFile("reply_file_2.txt.gz").path(), {
                "content-encoding": "gzip"
            });

        const req = http.request({
            host: "www.filereplier2.com",
            path: "/",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                assert.ok(dataCalled);
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.length, 57);
            });

        });

        req.end();

    });

    it("reply with file with request", async () => {
        nock("http://www.files.com")
            .get("/")
            .replyWithFile(200, fixtures.getFile("reply_file_1.txt").path());

        const resp = await request.get("http://www.files.com/");

        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.equal("Hello from the file!");
    });

    it("reply with JSON", (done) => {
        let dataCalled = false;

        const scope = nock("http://www.jsonreplier.com")
            .get("/")
            .reply(200, { hello: "world" });

        const req = http.request({
            host: "www.jsonreplier.com",
            path: "/",
            port: 80
        }, (res) => {

            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200);
            assert.notOk(res.headers.date);
            assert.notOk(res.headers["content-length"]);
            assert.equal(res.headers["content-type"], "application/json");
            res.on("end", () => {
                assert.ok(dataCalled);
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), '{"hello":"world"}', "response should match");
            });

        });

        req.end();

    });

    it("reply with content-length header", (done) => {
        const scope = nock("http://www.jsonreplier.com")
            .replyContentLength()
            .get("/")
            .reply(200, { hello: "world" });

        http.get({
            host: "www.jsonreplier.com",
            path: "/",
            port: 80
        }, (res) => {
            assert.equal(res.headers["content-length"], 17);
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });
    });

    it("reply with date header", (done) => {
        const date = new Date();

        const scope = nock("http://www.jsonreplier.com")
            .replyDate(date)
            .get("/")
            .reply(200, { hello: "world" });

        http.get({
            host: "www.jsonreplier.com",
            path: "/",
            port: 80
        }, (res) => {
            assert.equal(res.headers.date, date.toUTCString());
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });
    });

    it("filter path with function", (done) => {
        const scope = nock("http://www.filterurls.com")
            .filteringPath((path) => {
                return "/?a=2&b=1";
            })
            .get("/?a=2&b=1")
            .reply(200, "Hello World!");

        const req = http.request({
            host: "www.filterurls.com",
            method: "GET",
            path: "/?a=1&b=2",
            port: 80
        }, (res) => {
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end();
    });

    it("filter path with regexp", (done) => {
        const scope = nock("http://www.filterurlswithregexp.com")
            .filteringPath(/\d/g, "3")
            .get("/?a=3&b=3")
            .reply(200, "Hello World!");

        const req = http.request({
            host: "www.filterurlswithregexp.com",
            method: "GET",
            path: "/?a=1&b=2",
            port: 80
        }, (res) => {
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end();
    });

    it("filter body with function", (done) => {
        let filteringRequestBodyCounter = 0;

        const scope = nock("http://www.filterboddiez.com")
            .filteringRequestBody((body) => {
                ++filteringRequestBodyCounter;
                assert.equal(body, "mamma mia");
                return "mamma tua";
            })
            .post("/", "mamma tua")
            .reply(200, "Hello World!");

        const req = http.request({
            host: "www.filterboddiez.com",
            method: "POST",
            path: "/",
            port: 80
        }, (res) => {
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                assert.equal(filteringRequestBodyCounter, 1);
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end("mamma mia");
    });

    it("filter body with regexp", (done) => {
        const scope = nock("http://www.filterboddiezregexp.com")
            .filteringRequestBody(/mia/, "nostra")
            .post("/", "mamma nostra")
            .reply(200, "Hello World!");

        const req = http.request({
            host: "www.filterboddiezregexp.com",
            method: "POST",
            path: "/",
            port: 80
        }, (res) => {
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end("mamma mia");
    });

    it("abort request", (done) => {
        const scope = nock("http://www.google.com")
            .get("/hey")
            .reply(200, "nobody");

        const req = http.request({
            host: "www.google.com",
            path: "/hey"
        });

        req.on("response", (res) => {
            res.on("close", (err) => {
                assert.equal(err.code, "aborted");
                scope.done();
            });

            res.on("end", () => {
                assert.isTrue(false, "this should never execute");
            });

            req.once("error", (err) => {
                assert.equal(err.code, "ECONNRESET");
                done();
            });

            req.abort();
        });

        req.end();
    });

    it("pause response before data", (done) => {
        const scope = nock("http://www.mouse.com")
            .get("/pauser")
            .reply(200, "nobody");

        const req = http.request({
            host: "www.mouse.com",
            path: "/pauser"
        });

        req.on("response", (res) => {
            res.pause();

            let waited = false;
            setTimeout(() => {
                waited = true;
                res.resume();
            }, 500);

            res.on("data", (data) => {
                assert.isTrue(waited);
            });

            res.on("end", () => {
                scope.done();
                done();
            });
        });

        req.end();
    });

    it("pause response after data", (done) => {
        const response = new stream.PassThrough();
        const scope = nock("http://pauseme.com")
            .get("/")
            // Node does not pause the 'end' event so we need to use a stream to simulate
            // multiple 'data' events.
            .reply(200, response);

        http.get({
            host: "pauseme.com",
            path: "/"
        }, (res) => {
            let waited = false;
            setTimeout(() => {
                waited = true;
                res.resume();
            }, 500);

            res.on("data", (data) => {
                res.pause();
            });

            res.on("end", () => {
                assert.isTrue(waited);
                scope.done();
                done();
            });
        });

        // Manually simulate multiple 'data' events.
        response.emit("data", "one");
        setTimeout(() => {
            response.emit("data", "two");
            response.end();
        }, 0);
    });

    it("response pipe", (done) => {
        const dest = new Dest();

        const scope = nock("http://pauseme.com")
            .get("/")
            .reply(200, "nobody");

        http.get({
            host: "pauseme.com",
            path: "/"
        }, (res) => {
            let piped = false;
            dest.on("pipe", () => {
                piped = true;
            });

            dest.on("end", () => {
                scope.done();
                assert.ok(piped);
                assert.equal(dest.buffer.toString(), "nobody");
                done();
            });

            res.pipe(dest);
        });
    });

    it("response pipe without implicit end", (done) => {
        const dest = new Dest();

        const scope = nock("http://pauseme.com")
            .get("/")
            .reply(200, "nobody");

        http.get({
            host: "pauseme.com",
            path: "/"
        }, (res) => {
            dest.on("end", () => {
                assert.fail("should not call end implicitly");
            });

            res.on("end", () => {
                scope.done();
                done();
            });

            res.pipe(dest, { end: false });
        });
    });

    it("chaining API", (done) => {
        const scope = nock("http://chainchomp.com")
            .get("/one")
            .reply(200, "first one")
            .get("/two")
            .reply(200, "second one");

        http.get({
            host: "chainchomp.com",
            path: "/one"
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200, "status should be ok");
            res.on("data", (data) => {
                assert.equal(data, "first one", "should be equal to first reply");
            });

            res.on("end", () => {

                http.get({
                    host: "chainchomp.com",
                    path: "/two"
                }, (res) => {
                    res.setEncoding("utf8");
                    assert.equal(res.statusCode, 200, "status should be ok");
                    res.on("data", (data) => {
                        assert.equal(data, "second one", "should be qual to second reply");
                    });

                    res.on("end", () => {
                        scope.done();
                        done();
                    });
                });

            });
        });
    });

    it("same URI", (done) => {
        const scope = nock("http://sameurii.com")
            .get("/abc")
            .reply(200, "first one")
            .get("/abc")
            .reply(200, "second one");

        http.get({
            host: "sameurii.com",
            path: "/abc"
        }, (res) => {
            res.on("data", (data) => {
                res.setEncoding("utf8");
                assert.equal(data.toString(), "first one", "should be qual to first reply");
                res.on("end", () => {
                    http.get({
                        host: "sameurii.com",
                        path: "/abc"
                    }, (res) => {
                        res.setEncoding("utf8");
                        res.on("data", (data) => {
                            assert.equal(data.toString(), "second one", "should be qual to second reply");
                            res.on("end", () => {
                                scope.done();
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it("can use hostname instead of host", (done) => {
        const scope = nock("http://www.google.com")
            .get("/")
            .reply(200, "Hello World!");

        const req = http.request({
            hostname: "www.google.com",
            path: "/"
        }, (res) => {

            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end();
    });

    it("hostname is case insensitive", (done) => {
        const scope = nock("http://caseinsensitive.com")
            .get("/path")
            .reply(200, "hey");

        const options = {
            hostname: "cASEinsensitivE.com",
            path: "/path",
            method: "GET"
        };

        const req = http.request(options, (res) => {
            scope.done();
            done();
        });

        req.end();
    });

    it("can take a port", (done) => {
        const scope = nock("http://www.myserver.com:3333")
            .get("/")
            .reply(200, "Hello World!");

        const req = http.request({
            hostname: "www.myserver.com",
            path: "/",
            port: 3333
        }, (res) => {

            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end();
    });

    it("can use https", (done) => {
        let dataCalled = false;

        const scope = nock("https://google.com")
            .get("/")
            .reply(200, "Hello World!");

        const req = https.request({
            host: "google.com",
            path: "/"
        }, (res) => {
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                assert.ok(dataCalled, "data event called");
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "Hello World!", "response should match");
            });
        });

        req.end();
    });

    it("emits error if https route is missing", (done) => {
        nock("https://google.com")
            .get("/")
            .reply(200, "Hello World!");

        const req = https.request({
            host: "google.com",
            path: "/abcdef892932"
        }, (res) => {
            throw new Error("should not come here!");
        });

        req.end();

        // This listener is intentionally after the end call so make sure that
        // listeners added after the end will catch the error
        req.on("error", (err) => {
            const headerOptions = JSON.stringify({ method: "GET", url: "https://google.com/abcdef892932" }, null, 2);
            const expectedError = `Nock: No match for request ${headerOptions}`;

            assert.equal(err.message.trim(), expectedError);
            done();
        });
    });

    it("emits error if https route is missing", (done) => {
        nock("https://google.com:123")
            .get("/")
            .reply(200, "Hello World!");

        const req = https.request({
            host: "google.com",
            port: 123,
            path: "/dsadsads"
        }, (res) => {
            throw new Error("should not come here!");
        });

        req.end();

        // This listener is intentionally after the end call so make sure that
        // listeners added after the end will catch the error
        req.on("error", (err) => {
            assert.equal(err.message.trim(), `Nock: No match for request ${JSON.stringify({ method: "GET", url: "https://google.com:123/dsadsads" }, null, 2)}`);
            done();
        });
    });

    it("can use ClientRequest using GET", (done) => {

        let dataCalled = false;

        const scope = nock("http://www2.clientrequester.com")
            .get("/dsad")
            .reply(202, "HEHE!");

        const req = new http.ClientRequest({
            host: "www2.clientrequester.com",
            path: "/dsad"
        });
        req.end();

        req.on("response", (res) => {
            assert.equal(res.statusCode, 202);
            res.on("end", () => {
                assert.ok(dataCalled, "data event was called");
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "HEHE!", "response should match");
            });
        });

        req.end();
    });

    it("can use ClientRequest using POST", (done) => {

        let dataCalled = false;

        const scope = nock("http://www2.clientrequester.com")
            .post("/posthere/please", "heyhey this is the body")
            .reply(201, "DOOONE!");

        const req = new http.ClientRequest({
            host: "www2.clientrequester.com",
            path: "/posthere/please",
            method: "POST"
        });
        req.write("heyhey this is the body");
        req.end();

        req.on("response", (res) => {
            assert.equal(res.statusCode, 201);
            res.on("end", () => {
                assert.ok(dataCalled, "data event was called");
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "DOOONE!", "response should match");
            });
        });

        req.end();
    });

    it("same url matches twice", (done) => {
        const scope = nock("http://www.twicematcher.com")
            .get("/hey")
            .reply(200, "First match")
            .get("/hey")
            .reply(201, "Second match");

        let replied = 0;

        const callback = () => {
            replied += 1;
            if (replied === 2) {
                scope.done();
                done();
            }
        };

        http.get({
            host: "www.twicematcher.com",
            path: "/hey"
        }, (res) => {
            assert.equal(res.statusCode, 200);

            res.on("data", (data) => {
                assert.equal(data.toString(), "First match", "should match first request response body");
            });

            res.on("end", callback);
        });

        http.get({
            host: "www.twicematcher.com",
            path: "/hey"
        }, (res) => {
            assert.equal(res.statusCode, 201);

            res.on("data", (data) => {
                assert.equal(data.toString(), "Second match", "should match second request response body");
            });

            res.on("end", callback);
        });

    });

    it("scopes are independent", (done) => {
        const scope1 = nock("http://www34.google.com")
            .get("/")
            .reply(200, "Hello World!");
        const scope2 = nock("http://www34.google.com")
            .get("/")
            .reply(200, "Hello World!");

        const req = http.request({
            host: "www34.google.com",
            path: "/",
            port: 80
        }, (res) => {
            res.on("end", () => {
                assert.ok(scope1.isDone());
                assert.ok(!scope2.isDone()); // fails
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end();
    });

    it("two scopes with the same request are consumed", (done) => {
        nock("http://www36.google.com")
            .get("/")
            .reply(200, "Hello World!");

        nock("http://www36.google.com")
            .get("/")
            .reply(200, "Hello World!");

        let doneCount = 0;
        const _done = () => {
            doneCount += 1;
            if (doneCount === 2) {
                done();
            }
        };

        for (let i = 0; i < 2; i += 1) {
            const req = http.request({
                host: "www36.google.com",
                path: "/",
                port: 80
            }, (res) => {
                res.on("end", _done);
                // Streams start in 'paused' mode and must be started.
                // See https://nodejs.org/api/stream.html#stream_class_stream_readable
                res.resume();
            });

            req.end();
        }
    });

    it("allow unmocked option works", async () => {
        const serv = await createHttpServer()
            .use((ctx) => {
                if (ctx.request.path.includes("exist")) {
                    ctx.throw(404);
                }
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        const scope = nock(`http://localhost:${port}`, { allowUnmocked: true })
            .get("/abc")
            .reply(200, "Hey!")
            .get("/wont/get/here")
            .reply(200, "Hi!");

        {
            const resp = await request.get(`http://localhost:${port}/abc`);
            expect(resp.data).to.be.equal("Hey!");
        }
        assert.ok(!scope.isDone());
        {
            const err = await assert.throws(async () => {
                await request.get(`http://localhost:${port}/doest/not/exist`);
            });
            expect(err.response.status).to.be.equal(404);
        }
        assert.ok(!scope.isDone());
        {
            const resp = await request.get(`http://localhost:${port}`);
            expect(resp.data).to.be.equal("hello");
        }
    });

    it("default reply headers work", (done) => {
        nock("http://default.reply.headers.com")
            .defaultReplyHeaders({ "X-Powered-By": "Meeee", "X-Another-Header": "Hey man!" })
            .get("/")
            .reply(200, "", { A: "b" });

        http.request({
            host: "default.reply.headers.com",
            path: "/"
        }, (res) => {
            assert.deepEqual(res.headers, { "x-powered-by": "Meeee", "x-another-header": "Hey man!", a: "b" });
            done();
        }).end();
    });

    it("default reply headers as functions work", (done) => {
        const date = (new Date()).toUTCString();
        const message = "A message.";

        nock("http://default.reply.headers.com")
            .defaultReplyHeaders({
                "Content-Length"(req, res, body) {
                    return body.length;
                },

                Date() {
                    return date;
                },

                Foo() {
                    return "foo";
                }
            })
            .get("/")
            .reply(200, message, { foo: "bar" });

        http.request({
            host: "default.reply.headers.com",
            path: "/"
        }, (res) => {
            assert.deepEqual(
                res.headers,
                {
                    "content-length": message.length,
                    date,
                    foo: "bar"
                }
            );
            done();
        }).end();
    });

    it("JSON encoded replies set the content-type header", (done) => {
        const scope = nock("http://localhost")
            .get("/")
            .reply(200, {
                A: "b"
            });

        http.request({
            host: "localhost",
            path: "/"
        }, (res) => {
            scope.done();
            assert.equal(res.statusCode, 200);
            assert.equal(res.headers["content-type"], "application/json");
            done();
        }).end();
    });

    it("JSON encoded replies does not overwrite existing content-type header", (done) => {
        const scope = nock("http://localhost")
            .get("/")
            .reply(200, {
                A: "b"
            }, {
                "Content-Type": "unicorns"
            });

        http.request({
            host: "localhost",
            path: "/"
        }, (res) => {
            scope.done();
            assert.equal(res.statusCode, 200);
            assert.equal(res.headers["content-type"], "unicorns");
            done();
        }).end();
    });

    it("blank response doesn't have content-type application/json attached to it", (done) => {
        nock("http://localhost")
            .get("/")
            .reply(200);

        http.request({
            host: "localhost",
            path: "/"
        }, (res) => {
            assert.equal(res.statusCode, 200);
            assert.notEqual(res.headers["content-type"], "application/json");
            done();
        }).end();
    });

    it("clean all works", async () => {
        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        nock(`http://localhost:${port}`)
            .get("/nonexistent")
            .reply(200, "world");

        {
            const resp = await request.get(`http://localhost:${port}/nonexistent`);
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("world");
        }
        nock.cleanAll();
        {
            const resp = await request.get(`http://localhost:${port}/nonexistent`);
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("hello");
        }
    });

    it("cleanAll should remove pending mocks from all scopes", () => {
        const scope1 = nock("http://example.org")
            .get("/somepath")
            .reply(200, "hey");
        assert.deepEqual(scope1.pendingMocks(), ["GET http://example.org:80/somepath"]);
        const scope2 = nock("http://example.com")
            .get("/somepath")
            .reply(200, "hey");
        assert.deepEqual(scope2.pendingMocks(), ["GET http://example.com:80/somepath"]);

        nock.cleanAll();

        assert.deepEqual(scope1.pendingMocks(), []);
        assert.deepEqual(scope2.pendingMocks(), []);
    });

    it("is done works", (done) => {
        nock("http://amazon.com")
            .get("/nonexistent")
            .reply(200);

        assert.ok(!nock.isDone());

        http.get({ host: "amazon.com", path: "/nonexistent" }, (res) => {
            assert.ok(res.statusCode === 200, "should mock before cleanup");
            assert.ok(nock.isDone());
            done();
        });
    });

    it("pending mocks works", (done) => {
        nock("http://amazon.com")
            .get("/nonexistent")
            .reply(200);

        assert.deepEqual(nock.pendingMocks(), ["GET http://amazon.com:80/nonexistent"]);

        http.get({ host: "amazon.com", path: "/nonexistent" }, (res) => {
            assert.ok(res.statusCode === 200, "should mock before cleanup");
            assert.deepEqual(nock.pendingMocks(), []);
            done();
        });
    });

    it("pending mocks doesn't include optional mocks", () => {
        nock("http://example.com")
            .get("/nonexistent")
            .optionally()
            .reply(200);

        assert.deepEqual(nock.pendingMocks(), []);
    });

    it("optional mocks are still functional", (done) => {
        nock("http://example.com")
            .get("/abc")
            .optionally()
            .reply(200);

        http.get({ host: "example.com", path: "/abc" }, (res) => {
            assert.ok(res.statusCode === 200, "should still mock requests");
            assert.deepEqual(nock.pendingMocks(), []);
            done();
        });
    });

    it("isDone is true with optional mocks outstanding", () => {
        const scope = nock("http://example.com")
            .get("/abc")
            .optionally()
            .reply(200);

        assert.ok(scope.isDone());
    });

    it("optional but persisted mocks persist, but never appear as pending", (done) => {
        nock("http://example.com")
            .get("/123")
            .optionally()
            .reply(200)
            .persist();

        assert.deepEqual(nock.pendingMocks(), []);
        http.get({ host: "example.com", path: "/123" }, (res) => {
            assert.ok(res.statusCode === 200, "should mock first request");
            assert.deepEqual(nock.pendingMocks(), []);

            http.get({ host: "example.com", path: "/123" }, (res) => {
                assert.ok(res.statusCode === 200, "should mock second request");
                assert.deepEqual(nock.pendingMocks(), []);
                done();
            });
        });
    });

    it("optional repeated mocks execute repeatedly, but never appear as pending", (done) => {
        nock("http://example.com")
            .get("/456")
            .optionally()
            .times(2)
            .reply(200);

        assert.deepEqual(nock.pendingMocks(), []);
        http.get({ host: "example.com", path: "/456" }, (res) => {
            assert.ok(res.statusCode === 200, "should mock first request");
            assert.deepEqual(nock.pendingMocks(), []);

            http.get({ host: "example.com", path: "/456" }, (res) => {
                assert.ok(res.statusCode === 200, "should mock second request");
                assert.deepEqual(nock.pendingMocks(), []);
                done();
            });
        });
    });

    it("activeMocks returns optional mocks only before they're completed", (done) => {
        nock.cleanAll();
        nock("http://example.com")
            .get("/optional")
            .optionally()
            .reply(200);

        assert.deepEqual(nock.activeMocks(), ["GET http://example.com:80/optional"]);
        http.get({ host: "example.com", path: "/optional" }, (res) => {
            assert.deepEqual(nock.activeMocks(), []);
            done();
        });
    });

    it("activeMocks always returns persisted mocks", (done) => {
        nock.cleanAll();
        nock("http://example.com")
            .get("/persisted")
            .reply(200)
            .persist();

        assert.deepEqual(nock.activeMocks(), ["GET http://example.com:80/persisted"]);
        http.get({ host: "example.com", path: "/persisted" }, (res) => {
            assert.deepEqual(nock.activeMocks(), ["GET http://example.com:80/persisted"]);
            done();
        });
    });

    it("activeMocks returns incomplete mocks", () => {
        nock.cleanAll();
        nock("http://example.com")
            .get("/incomplete")
            .reply(200);

        assert.deepEqual(nock.activeMocks(), ["GET http://example.com:80/incomplete"]);
    });

    it("activeMocks doesn't return completed mocks", (done) => {
        nock.cleanAll();
        nock("http://example.com")
            .get("/complete-me")
            .reply(200);

        http.get({ host: "example.com", path: "/complete-me" }, (res) => {
            assert.deepEqual(nock.activeMocks(), []);
            done();
        });
    });

    it("username and password works", (done) => {
        const scope = nock("http://passwordyy.com")
            .get("/")
            .reply(200, "Welcome, username");

        http.request({
            hostname: "passwordyy.com",
            auth: "username:password",
            path: "/"
        }, (res) => {
            scope.done();
            done();
        }).end();
    });

    it("works with request and username and password", async () => {
        const scope = nock("http://passwordyyyyy.com")
            .get("/abc")
            .reply(200, "Welcome, username");

        const resp = await request.get("http://username:password@passwordyyyyy.com/abc");
        assert.ok(scope.isDone());
        assert.equal(resp.data, "Welcome, username");
    });

    it("different ports work works", (done) => {
        const scope = nock("http://abc.portyyyy.com:8081")
            .get("/pathhh")
            .reply(200, "Welcome, username");

        http.request({
            hostname: "abc.portyyyy.com",
            port: 8081,
            path: "/pathhh"
        }, (res) => {
            scope.done();
            done();
        }).end();
    });

    it("different ports work work with Mikeal request", async () => {
        const scope = nock("http://abc.portyyyy.com:8082")
            .get("/pathhh")
            .reply(200, "Welcome to Mikeal Request!");

        const resp = await request.get("http://abc.portyyyy.com:8082/pathhh");
        assert.equal(resp.data, "Welcome to Mikeal Request!");
        assert.ok(scope.isDone());
    });

    it("explicitly specifiying port 80 works", (done) => {
        const scope = nock("http://abc.portyyyy.com:80")
            .get("/pathhh")
            .reply(200, "Welcome, username");

        http.request({
            hostname: "abc.portyyyy.com",
            port: 80,
            path: "/pathhh"
        }, (res) => {
            scope.done();
            done();
        }).end();
    });

    it("post with object", (done) => {
        const scope = nock("http://uri")
            .post("/claim", { some_data: "something" })
            .reply(200);

        http.request({
            hostname: "uri",
            port: 80,
            method: "POST",
            path: "/claim"
        }, (res) => {
            scope.done();
            done();
        }).end('{"some_data":"something"}');

    });

    it("accept string as request target", (done) => {
        let dataCalled = false;
        const scope = nock("http://www.example.com")
            .get("/")
            .reply(200, "Hello World!");

        http.get("http://www.example.com", (res) => {
            assert.equal(res.statusCode, 200);

            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "Hello World!", "response should match");
            });

            res.on("end", () => {
                assert.ok(dataCalled);
                scope.done();
                done();
            });
        });
    });

    it("request has path", (done) => {
        const scope = nock("http://haspath.com")
            .get("/the/path/to/infinity")
            .reply(200);

        const req = http.request({
            hostname: "haspath.com",
            port: 80,
            method: "GET",
            path: "/the/path/to/infinity"
        }, (res) => {
            scope.done();
            assert.equal(req.path, "/the/path/to/infinity", "should have req.path set to /the/path/to/infinity");
            done();
        });
        req.end();
    });

    it("persists interceptors", (done) => {
        const scope = nock("http://persisssists.con")
            .persist()
            .get("/")
            .reply(200, "Persisting all the way");

        assert.ok(!scope.isDone());
        http.get("http://persisssists.con/", (res) => {
            assert.ok(scope.isDone());
            http.get("http://persisssists.con/", (res) => {
                assert.ok(scope.isDone());
                done();
            }).end();
        }).end();
    });

    it("Persisted interceptors are in pendingMocks initially", () => {
        const scope = nock("http://example.com")
            .get("/abc")
            .reply(200, "Persisted reply")
            .persist();

        assert.deepEqual(scope.pendingMocks(), ["GET http://example.com:80/abc"]);
    });

    it("Persisted interceptors are not in pendingMocks after the first request", (done) => {
        const scope = nock("http://example.com")
            .get("/def")
            .reply(200, "Persisted reply")
            .persist();

        http.get("http://example.com/def", (res) => {
            assert.deepEqual(scope.pendingMocks(), []);
            done();
        });
    });

    it("persist reply with file", async () => {
        nock("http://www.filereplier.com")
            .persist()
            .get("/")
            .replyWithFile(200, fixtures.getFile("reply_file_1.txt").path())
            .get("/test")
            .reply(200, "Yay!");

        await Promise.all([1, 2].map(async () => {
            const resp = await request.get("http://www.filereplier.com/");
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("Hello from the file!");
        }));
    });

    it("(re-)activate after restore", (done) => {
        const scope = nock("http://google.com")
            .get("/")
            .reply(200, "Hello, World!");

        nock.restore();
        assert.isFalse(nock.isActive());

        http.get("http://google.com/", (res) => {
            res.resume();
            res.on("end", () => {
                assert.ok(!scope.isDone());

                nock.activate();
                assert.isTrue(nock.isActive());
                http.get("http://google.com", (res) => {
                    res.resume();
                    res.on("end", () => {
                        assert.ok(scope.isDone());
                        done();
                    });
                }).end();
            });
        }).end();
    });

    it("allow unmocked option works with https", async () => {
        const serv = await createHttpServer()
            .use((ctx) => {
                if (ctx.request.path.includes("exist")) {
                    ctx.throw(404);
                }
                ctx.body = "hello";
            })
            .bind(httpsOpts);
        const { port } = serv.address();

        const scope = nock(`https://localhost:${port}`, { allowUnmocked: true })
            .get("/abc")
            .reply(200, "Hey!")
            .get("/wont/get/here")
            .reply(200, "Hi!");

        {
            const resp = await request.get(`https://localhost:${port}/abc`);
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("Hey!");
        }
        assert.ok(!scope.isDone());
        {
            const err = await assert.throws(async () => {
                await request.get(`https://localhost:${port}/does/not/exist`);
            });
            expect(err.response.status).to.be.equal(404);
        }
        assert.ok(!scope.isDone());
        {
            const resp = await request.get(`https://localhost:${port}/`);
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("hello");
        }
    });

    it("allow unmocked post with json data", async () => {
        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind(httpsOpts);
        const { port } = serv.address();
        nock(`https://localhost:${port}`, { allowUnmocked: true }).
            get("/abc").
            reply(200, "Hey!");

        const resp = await request.post(`https://localhost:${port}/post`, {
            some: "data"
        });
        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.equal("hello");
    });

    it("allow unmocked passthrough with mismatched bodies", async () => {
        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();
        nock(`http://localhost:${port}`, { allowUnmocked: true }).
            post("/post", { some: "otherdata" }).
            reply(404, "Hey!");

        const resp = await request.post(`http://localhost:${port}/post`, {
            some: "data"
        });
        expect(resp.status).to.be.equal(200);
    });

    it("allow unordered body with json encoding", async () => {
        const scope =
            nock("http://wtfjs.org")
                .post("/like-wtf", {
                    foo: "bar",
                    bar: "foo"
                })
                .reply(200, "Heyyyy!");

        const resp = await request.post("http://wtfjs.org/like-wtf", {
            bar: "foo",
            foo: "bar"
        });
        scope.done();
        expect(resp.data).to.be.equal("Heyyyy!");
    });

    it("allow unordered body with form encoding", async () => {
        const scope =
            nock("http://wtfjs.org")
                .post("/like-wtf", {
                    foo: "bar",
                    bar: "foo"
                })
                .reply(200, "Heyyyy!");

        const resp = await request.post("http://wtfjs.org/like-wtf", qs.stringify({
            bar: "foo",
            foo: "bar"
        }));
        scope.done();
        expect(resp.data).to.be.equal("Heyyyy!");
    });

    it("allow string json spec", async () => {
        const bodyObject = { bar: "foo", foo: "bar" };

        const scope =
            nock("http://wtfjs.org")
                .post("/like-wtf", JSON.stringify(bodyObject))
                .reply(200, "Heyyyy!");

        const resp = await request.post("http://wtfjs.org/like-wtf", {
            bar: "foo",
            foo: "bar"
        });
        scope.done();
        expect(resp.data).to.be.equal("Heyyyy!");
    });

    it("has a req property on the response", (done) => {
        const scope = nock("http://wtfjs.org").get("/like-wtf").reply(200);
        const req = http.request("http://wtfjs.org/like-wtf", (res) => {
            res.on("end", () => {
                assert.ok(res.req, "req property doesn't exist");
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });
        req.end();
    });

    it("disabled real HTTP request", (done) => {
        nock.disableNetConnect();

        http.get("http://www.amazon.com", (res) => {
            done(new Error("should not request this"));
        }).on("error", (err) => {
            assert.equal(err.message, 'Not allow net connect for "www.amazon.com:80/"');
            done();
        });

        nock.enableNetConnect();
    });

    it("NetConnectNotAllowedError is instance of Error", (done) => {
        nock.disableNetConnect();

        http.get("http://www.amazon.com", (res) => {
            done(new Error("should not request this"));
        }).on("error", (err) => {
            assert.instanceOf(err, Error);
            done();
        });

        nock.enableNetConnect();
    });

    it("NetConnectNotAllowedError exposes the stack and has a code", (done) => {
        nock.disableNetConnect();

        http.get("http://www.amazon.com", (res) => {
            done(new Error("should not request this"));
        }).on("error", (err) => {
            assert.equal(err.code, "ENETUNREACH");
            assert.notEqual(err.stack, undefined);
            done();
        });

        nock.enableNetConnect();
    });

    it("enable real HTTP request only for google.com, via string", (done) => {
        nock.enableNetConnect("google.com");

        http.get("http://google.com.br/").on("error", done);

        http.get("http://www.amazon.com", (res) => {
            done(new Error("should not deliver this request"));
        }).on("error", (err) => {
            assert.equal(err.message, 'Not allow net connect for "www.amazon.com:80/"');
            done();
        });

        nock.enableNetConnect();
    });

    it("enable real HTTP request only for google.com, via regexp", (done) => {
        nock.enableNetConnect(/google\.com/);

        http.get("http://google.com.br/").on("error", done);

        http.get("http://www.amazon.com", (res) => {
            done(new Error("should not request this"));
        }).on("error", (err) => {
            assert.equal(err.message, 'Not allow net connect for "www.amazon.com:80/"');
            done();
        });

        nock.enableNetConnect();
    });

    it("repeating once", (done) => {
        nock.disableNetConnect();

        nock("http://zombo.com")
            .get("/")
            .once()
            .reply(200, "Hello World!");

        http.get("http://zombo.com", (res) => {
            assert.equal(200, res.statusCode, "first request");
            done();
        });

        nock.cleanAll();

        nock.enableNetConnect();
    });

    it("repeating twice", async () => {
        nock.disableNetConnect();

        nock("http://zombo.com")
            .get("/")
            .twice()
            .reply(200, "Hello World!");

        expect(await request.get("http://zombo.com")).to.have.property("data", "Hello World!");
        expect(await request.get("http://zombo.com")).to.have.property("data", "Hello World!");
    });

    it("repeating thrice", async () => {
        nock.disableNetConnect();

        nock("http://zombo.com")
            .get("/")
            .thrice()
            .reply(200, "Hello World!");

        expect(await request.get("http://zombo.com")).to.have.property("data", "Hello World!");
        expect(await request.get("http://zombo.com")).to.have.property("data", "Hello World!");
    });

    it("repeating response 4 times", async () => {
        nock.disableNetConnect();

        nock("http://zombo.com")
            .get("/")
            .times(4)
            .reply(200, "Hello World!");

        expect(await request.get("http://zombo.com")).to.have.property("data", "Hello World!");
        expect(await request.get("http://zombo.com")).to.have.property("data", "Hello World!");
    });

    it("response is streams2 compatible", (done) => {
        const responseText = "streams2 streams2 streams2";
        nock("http://stream2hostnameftw")
            .get("/somepath")
            .reply(200, responseText);


        http.request({
            host: "stream2hostnameftw",
            path: "/somepath"
        }, (res) => {
            res.setEncoding("utf8");

            let body = "";

            res.on("readable", () => {
                let buf;
                while ((buf = res.read())) {
                    body += buf;
                }
            });

            res.once("end", () => {
                assert.equal(body, responseText);
                done();
            });

        }).end();

    });

    it("response is an http.IncomingMessage instance", (done) => {
        const responseText = "incoming message!";
        nock("http://example.com")
            .get("/somepath")
            .reply(200, responseText);


        http.request({
            host: "example.com",
            path: "/somepath"
        }, (res) => {

            res.resume();
            assert.instanceOf(res, http.IncomingMessage);
            done();

        }).end();

    });

    const checkDuration = async (ms, f) => {
        const start = process.hrtime();
        await f();
        const fin = process.hrtime(start);
        const finMs = (fin[0] * 1e+9) + (fin[1] * 1e-6);

        /// innaccurate timers
        ms = ms * 0.9;

        assert.ok(finMs >= ms, `Duration of ${Math.round(finMs)}ms should be longer than ${ms}ms`);
    };

    it("calling delay could cause request timeout error", async () => {
        const scope = nock("http://funk")
            .get("/")
            .delay({
                head: 300
            })
            .reply(200, "OK");

        const err = await assert.throws(async () => {
            await request.get("http://funk", { timeout: 100 });
        });
        scope.done();
        expect(err.code).to.be.equal("ECONNABORTED");
    });

    it("Body delay does not have impact on timeout", async () => {
        const scope = nock("http://funk")
            .get("/")
            .delay({
                head: 300,
                body: 300
            })
            .reply(200, "OK");

        const resp = await request.get("http://funk", { timedout: 500 });
        scope.done();
        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.equal("OK");
    });

    it('calling delay with "body" and "head" delays the response', async () => {
        nock("http://funk")
            .get("/")
            .delay({
                head: 300,
                body: 300
            })
            .reply(200, "OK");

        await checkDuration(600, async () => {
            const resp = await request.get("http://funk");
            expect(resp.data).to.be.equal("OK");
        });
    });

    it('calling delay with "body" delays the response body', async () => {
        nock("http://funk")
            .get("/")
            .delay({
                body: 100
            })
            .reply(200, "OK");

        await checkDuration(100, async () => {
            const resp = await request.get("http://funk");
            expect(resp.data).to.be.equal("OK");
        });
    });

    it("calling delayBody delays the response", async () => {
        nock("http://funk")
            .get("/")
            .delayBody(100)
            .reply(200, "OK");

        await checkDuration(100, async () => {
            const resp = await request.get("http://funk");
            expect(resp.data).to.be.equal("OK");
        });
    });

    it("calling delay delays the response", async () => {
        nock("http://funk")
            .get("/")
            .delay(100)
            .reply(200, "OK");

        await checkDuration(100, async () => {
            const resp = await request.get("http://funk");
            expect(resp.data).to.be.equal("OK");
        });
    });

    it("using reply callback with delay provides proper arguments", (done) => {
        nock("http://localhost")
            .get("/")
            .delay(100)
            .reply(200, (path, requestBody) => {
                assert.equal(path, "/", "path arg should be set");
                assert.equal(requestBody, "OK", "requestBody arg should be set");
                done();
            });

        http.request("http://localhost/", () => { }).end("OK");
    });

    it("using reply callback with delay can reply JSON", async () => {
        nock("http://delayfunctionreplyjson")
            .get("/")
            .delay(100)
            .reply(200, (path, requestBody) => {
                return { a: 1 };
            });

        const resp = await request.get("http://delayfunctionreplyjson/");
        expect(resp.data).to.be.deep.equal({ a: 1 });
    });

    it("delay works with replyWithFile", async () => {
        nock("http://localhost")
            .get("/")
            .delay(100)
            .replyWithFile(200, fixtures.getFile("reply_file_1.txt").path());

        await checkDuration(100, async () => {
            const resp = await request.get("http://localhost/");
            expect(resp.data).to.be.equal("Hello from the file!");
        });
    });

    it("delay works with when you return a generic stream from the reply callback", async () => {
        nock("http://localhost")
            .get("/")
            .delay(100)
            .reply(200, (path, reqBody) => {
                return fixtures.getFile("reply_file_1.txt").contentsStream();
            });

        await checkDuration(100, async () => {
            const resp = await request.get("http://localhost/");
            expect(resp.data).to.be.equal("Hello from the file!");
        });
    });

    it("delay works with replyWithError", (done) => {
        nock("http://errorland")
            .get("/")
            .delay(100)
            .replyWithError("this is an error message");

        const req = http.get("http://errorland/");

        req.once("error", (err) => {
            assert.equal(err.message, "this is an error message");
            done();
        });
    });

    it("write callback called", (done) => {
        const scope = nock("http://www.filterboddiezregexp.com")
            .filteringRequestBody(/mia/, "nostra")
            .post("/", "mamma nostra")
            .reply(200, "Hello World!");

        let callbackCalled = false;
        const req = http.request({
            host: "www.filterboddiezregexp.com",
            method: "POST",
            path: "/",
            port: 80
        }, (res) => {
            assert.equal(callbackCalled, true);
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.write("mamma mia", null, () => {
            callbackCalled = true;
            req.end();
        });
    });

    it("end callback called", (done) => {
        const scope = nock("http://www.filterboddiezregexp.com")
            .filteringRequestBody(/mia/, "nostra")
            .post("/", "mamma nostra")
            .reply(200, "Hello World!");

        let callbackCalled = false;
        const req = http.request({
            host: "www.filterboddiezregexp.com",
            method: "POST",
            path: "/",
            port: 80
        }, (res) => {
            assert.equal(callbackCalled, true);
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.end("mamma mia", null, () => {
            callbackCalled = true;
        });
    });

    it("finish event fired before end event (bug-139)", (done) => {
        const scope = nock("http://www.filterboddiezregexp.com")
            .filteringRequestBody(/mia/, "nostra")
            .post("/", "mamma nostra")
            .reply(200, "Hello World!");

        let finishCalled = false;
        const req = http.request({
            host: "www.filterboddiezregexp.com",
            method: "POST",
            path: "/",
            port: 80
        }, (res) => {
            assert.equal(finishCalled, true);
            assert.equal(res.statusCode, 200);
            res.on("end", () => {
                scope.done();
                done();
            });
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();
        });

        req.on("finish", () => {
            finishCalled = true;
        });

        req.end("mamma mia");

    });

    it("when a stream is used for the response body, it will not be read until after the response event", (done) => {
        let responseEvent = false;
        const text = "Hello World\n";

        class SimpleStream extends stream.Readable {
            _read() {
                assert.ok(responseEvent);
                this.push(text);
                this.push(null);
            }
        }

        nock("http://localhost")
            .get("/")
            .reply(200, (path, reqBody) => {
                return new SimpleStream();
            });

        http.get("http://localhost/", (res) => {
            responseEvent = true;
            res.setEncoding("utf8");

            let body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });

            res.once("end", () => {
                assert.equal(body, text);
                done();
            });
        });
    });

    it("calling delayConnection delays the connection", async () => {
        nock("http://funk")
            .get("/")
            .delayConnection(100)
            .reply(200, "OK");

        await checkDuration(100, async () => {
            const resp = await request.get("http://funk");
            expect(resp.data).to.be.equal("OK");
        });
    });

    it("using reply callback with delayConnection provides proper arguments", (done) => {
        nock("http://localhost")
            .get("/")
            .delayConnection(100)
            .reply(200, (path, requestBody) => {
                assert.equal(path, "/", "path arg should be set");
                assert.equal(requestBody, "OK", "requestBody arg should be set");
                done();
            });

        http.request("http://localhost/", () => { }).end("OK");
    });

    it("delayConnection works with replyWithFile", async () => {
        nock("http://localhost")
            .get("/")
            .delayConnection(100)
            .replyWithFile(200, fixtures.getFile("reply_file_1.txt").path());

        await checkDuration(100, async () => {
            const resp = await request.get("http://localhost");
            expect(resp.data).to.be.equal("Hello from the file!");
        });
    });

    it("delayConnection works with when you return a generic stream from the reply callback", async () => {
        nock("http://localhost")
            .get("/")
            .delayConnection(100)
            .reply(200, (path, reqBody) => {
                return fixtures.getFile("reply_file_1.txt").contentsStream();
            });

        await checkDuration(100, async () => {
            const resp = await request.get("http://localhost");
            expect(resp.data).to.be.equal("Hello from the file!");
        });
    });

    it("define() is backward compatible", (done) => {
        const nockDef = {
            scope: "http://example.com",
            //  "port" has been deprecated
            port: 12345,
            method: "GET",
            path: "/",
            //  "reply" has been deprected
            reply: "500"
        };

        const nocks = nock.define([nockDef]);

        assert.ok(nocks);

        const req = http.request({
            host: "example.com",
            port: nockDef.port,
            method: nockDef.method,
            path: nockDef.path
        }, ((res) => {
                assert.equal(res.statusCode, 500);

                res.once("end", () => {
                    done();
                });
                // Streams start in 'paused' mode and must be started.
                // See https://nodejs.org/api/stream.html#stream_class_stream_readable
                res.resume();
            }));

        req.on("error", done);

        req.end();

    });

    it("define() works with non-JSON responses", (done) => {
        const nockDef = {
            scope: "http://example.com",
            method: "POST",
            path: "/",
            body: "�",
            status: 200,
            response: "�"
        };

        const nocks = nock.define([nockDef]);

        assert.ok(nocks);

        const req = http.request({
            host: "example.com",
            method: nockDef.method,
            path: nockDef.path
        }, ((res) => {
                assert.equal(res.statusCode, nockDef.status);

                const dataChunks = [];

                res.on("data", (chunk) => {
                    dataChunks.push(chunk);
                });

                res.once("end", () => {
                    const response = Buffer.concat(dataChunks);
                    assert.equal(response.toString("utf8"), nockDef.response, "responses match");
                    done();
                });
            }));

        req.on("error", done);

        req.write(nockDef.body);
        req.end();

    });

    it("define() works with binary buffers", (done) => {
        const nockDef = {
            scope: "http://example.com",
            method: "POST",
            path: "/",
            body: "8001",
            status: 200,
            response: "8001"
        };

        const nocks = nock.define([nockDef]);

        assert.ok(nocks);

        const req = http.request({
            host: "example.com",
            method: nockDef.method,
            path: nockDef.path
        }, ((res) => {
                assert.equal(res.statusCode, nockDef.status);

                const dataChunks = [];

                res.on("data", (chunk) => {
                    dataChunks.push(chunk);
                });

                res.once("end", () => {
                    const response = Buffer.concat(dataChunks);
                    assert.equal(response.toString("hex"), nockDef.response, "responses match");
                    done();
                });
            }));

        req.on("error", done);

        req.write(Buffer.from(nockDef.body, "hex"));
        req.end();

    });

    it("issue #163 - Authorization header isn't mocked", (done) => {
        nock.enableNetConnect();
        const makeRequest = (cb) => {
            const r = http.request(
                {
                    hostname: "www.example.com",
                    path: "/",
                    method: "GET",
                    auth: "foo:bar"
                },
                (res) => {
                    cb(res.req._headers);
                }
            );
            r.end();
        };

        makeRequest((headers) => {
            const n = nock("http://www.example.com", {
                reqheaders: { authorization: "Basic Zm9vOmJhcg==" }
            }).get("/").reply(200);

            makeRequest((nockHeader) => {
                n.done();
                assert.deepEqual(headers, nockHeader);
                done();
            });
        });
    });

    it("define() uses reqheaders", (done) => {
        const nockDef = {
            scope: "http://example.com",
            method: "GET",
            path: "/",
            status: 200,
            reqheaders: {
                host: "example.com",
                authorization: "Basic Zm9vOmJhcg=="
            }
        };

        const nocks = nock.define([nockDef]);

        assert.ok(nocks);

        const req = http.request({
            host: "example.com",
            method: nockDef.method,
            path: nockDef.path,
            auth: "foo:bar"
        }, ((res) => {
                assert.equal(res.statusCode, nockDef.status);

                res.once("end", () => {
                    assert.deepEqual(res.req._headers, nockDef.reqheaders);
                    done();
                });
                // Streams start in 'paused' mode and must be started.
                // See https://nodejs.org/api/stream.html#stream_class_stream_readable
                res.resume();
            }));
        req.end();

    });

    it("define() uses badheaders", (done) => {
        const nockDef = [{
            scope: "http://example.com",
            method: "GET",
            path: "/",
            status: 401,
            badheaders: ["x-foo"]
        }, {
            scope: "http://example.com",
            method: "GET",
            path: "/",
            status: 200,
            reqheaders: {
                "x-foo": "bar"
            }
        }];

        const nocks = nock.define(nockDef);

        assert.ok(nocks);

        const req = http.request({
            host: "example.com",
            method: "GET",
            path: "/",
            headers: {
                "x-foo": "bar"
            }
        }, ((res) => {
                assert.equal(res.statusCode, 200);

                res.once("end", () => {
                    done();
                });
                // Streams start in 'paused' mode and must be started.
                // See https://nodejs.org/api/stream.html#stream_class_stream_readable
                res.resume();
            }));
        req.end();
    });

    it("sending binary and receiving JSON should work ", async () => {
        const scope = nock("http://example.com")
            .filteringRequestBody(/.*/, "*")
            .post("/some/path", "*")
            .reply(201, { foo: "61" }, {
                "Content-Type": "application/json"
            });

        const resp = await request.post("http://example.com/some/path", Buffer.from("ffd8ffe000104a46494600010101006000600000ff", "hex"), {
            headers: {
                Accept: "application/json",
                "Content-Length": 23861
            }
        });
        scope.done();
        expect(resp.status).to.be.equal(201);
        expect(resp.data).to.be.deep.equal({ foo: "61" });
    });

    it("fix #146 - resume() is automatically invoked when the response is drained", async () => {
        const replyLength = 1024 * 1024;
        const replyBuffer = Buffer.from(".".repeat(replyLength));
        assert.equal(replyBuffer.length, replyLength);

        nock("http://www.abc.com")
            .get("/abc")
            .reply(200, replyBuffer);

        const resp = await request.get("http://www.abc.com/abc");
        expect(resp.data).to.be.equal(replyBuffer.toString());
    });

    it("done fails when specified request header is missing", async () => {
        nock("http://example.com", {
            reqheaders: {
                "X-App-Token": "apptoken",
                "X-Auth-Token": "apptoken"
            }
        })
            .post("/resource")
            .reply(200, { status: "ok" });

        // ?????????????? or use domain? the way it fails a bit hacky

        await assert.throws(async () => {
            await request.post("http://example.com/resource", {
                headers: {
                    "X-App-Token": "apptoken"
                }
            });
        }, "No match");
    });

    it("matches request header with regular expression", async () => {
        nock("http://example.com", {
            reqheaders: {
                "X-My-Super-Power": /.+/
            }
        })
            .post("/superpowers")
            .reply(200, { status: "ok" });


        const resp = await request.post("http://example.com/superpowers", {}, {
            headers: {
                "X-My-Super-Power": "mullet growing"
            }
        });
        expect(resp.data).to.be.deep.equal({ status: "ok" });
    });

    it("request header satisfies the header function", async () => {
        nock("http://example.com", {
            reqheaders: {
                "X-My-Super-Power"(value) {
                    return value === "mullet growing";
                }
            }
        })
            .post("/superpowers")
            .reply(200, { status: "ok" });


        const resp = await request.post("http://example.com/superpowers", {}, {
            headers: {
                "X-My-Super-Power": "mullet growing"
            }
        });
        expect(resp.data).to.be.deep.equal({ status: "ok" });
    });

    it("done fails when specified request header doesn't match regular expression", async () => {
        nock("http://example.com", {
            reqheaders: {
                "X-My-Super-Power": /Mullet.+/
            }
        })
            .post("/resource")
            .reply(200, { status: "ok" });

        await assert.throws(async () => {
            await request.post("http://example.com/resource", {
                headers: {
                    "X-My-Super-Power": "mullet growing"
                }
            });
        }, "No match");
    });

    it("done fails when specified request header doesn't satisfy the header function", async () => {
        nock("http://example.com", {
            reqheaders: {
                "X-My-Super-Power"(value) {
                    return value === "Mullet Growing";
                }
            }
        })
            .post("/resource")
            .reply(200, { status: "ok" });

        await assert.throws(async () => {
            await request.post("http://example.com/resource", {
                headers: {
                    "X-My-Super-Power": "mullet growing"
                }
            });
        }, "No match");
    });

    it("done does not fail when specified request header is not missing", async () => {
        nock("http://example.com", {
            reqheaders: {
                "X-App-Token": "apptoken",
                "X-Auth-Token": "apptoken"
            }
        })
            .post("/resource")
            .reply(200, { status: "ok" });

        const resp = await request.post("http://example.com/resource", {}, {
            headers: {
                "X-App-Token": "apptoken",
                "X-Auth-Token": "apptoken"
            }
        });
        expect(resp.data).to.be.deep.equal({ status: "ok" });
    });

    it("done fails when specified bad request header is present", async () => {
        nock("http://example.com", {
            badheaders: ["cookie"]
        })
            .post("/resource")
            .reply(200, { status: "ok" });

        await assert.throws(async () => {
            await request.post("http://example.com/resource", {}, {
                headers: {
                    Cookie: "cookie"
                }
            });
        }, "No match");
    });

    it("get correct filtering with scope and request headers filtering", (done) => {
        const responseText = "OK!";
        const responseHeaders = { "Content-Type": "text/plain" };
        const requestHeaders = { host: "a.subdomain.of.google.com" };

        const scope = nock("http://a.subdomain.of.google.com", {
            filteringScope(scope) {
                return (/^http:\/\/.*\.google\.com/).test(scope);
            }
        })
            .get("/somepath")
            .reply(200, responseText, responseHeaders);

        let dataCalled = false;
        const host = "some.other.subdomain.of.google.com";
        const req = http.get({
            host,
            method: "GET",
            path: "/somepath",
            port: 80
        }, (res) => {
            res.on("data", (data) => {
                dataCalled = true;
                assert.equal(data.toString(), responseText);
            });
            res.on("end", () => {
                assert.isTrue(dataCalled);
                scope.done();
                done();
            });
        });

        assert.deepEqual(req._headers, { host: requestHeaders.host });

    });

    it("mocking succeeds even when mocked and specified request header names have different cases", async () => {
        nock("http://example.com", {
            reqheaders: {
                "x-app-token": "apptoken",
                "x-auth-token": "apptoken"
            }
        })
            .post("/resource")
            .reply(200, { status: "ok" });

        const resp = await request.post("http://example.com/resource", {}, {
            headers: {
                "X-App-TOKEN": "apptoken",
                "X-Auth-TOKEN": "apptoken"
            }
        });

        expect(resp.data).to.be.deep.equal({ status: "ok" });
    });

    it("mocking succeeds when mocked and specified request headers have falsy values (#966)", async () => {
        nock("http://example.com", {
            reqheaders: {
                "x-foo": 0
            }
        })
            .post("/resource")
            .reply(200, { status: "ok" });

        const resp = await request.post("http://example.com/resource", {}, {
            headers: {
                "X-Foo": 0
            }
        });

        expect(resp.data).to.be.deep.equal({ status: "ok" });
    });

    it("mocking succeeds even when host request header is not specified", async () => {
        nock("http://example.com")
            .post("/resource")
            .reply(200, { status: "ok" });

        const resp = await request.post("http://example.com/resource", {}, {
            headers: {
                "X-App-TOKEN": "apptoken",
                "X-Auth-TOKEN": "apptoken"
            }
        });
        expect(resp.data).to.be.deep.equal({ status: "ok" });
    });

    it("response readable pull stream works as expected", (done) => {
        nock("http://streamingalltheway.com")
            .get("/ssstream")
            .reply(200, "this is the response body yeah");

        const req = http.request({
            host: "streamingalltheway.com",
            path: "/ssstream",
            port: 80
        }, (res) => {

            let ended = false;
            let responseBody = "";
            assert.equal(res.statusCode, 200);
            res.on("readable", () => {
                let chunk;
                while (!is.null(chunk = res.read())) {
                    responseBody += chunk.toString();
                }
                if (is.null(chunk) && !ended) {
                    ended = true;
                    assert.equal(responseBody, "this is the response body yeah");
                    done();
                }
            });
        });

        req.end();
    });

    it(".setNoDelay", (done) => {
        nock("http://nodelayyy.com")
            .get("/yay")
            .reply(200, "Hi");

        const req = http.request({
            host: "nodelayyy.com",
            path: "/yay",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 200);
            res.on("end", done);
            // Streams start in 'paused' mode and must be started.
            // See https://nodejs.org/api/stream.html#stream_class_stream_readable
            res.resume();

        });

        req.setNoDelay(true);

        req.end();
    });

    it("match basic authentication header", (done) => {
        const username = "testuser";
        const password = "testpassword";
        const authString = `${username}:${password}`;
        const encrypted = Buffer.from(authString).toString("base64");

        const scope = nock("http://www.headdy.com")
            .get("/")
            .matchHeader("Authorization", (val) => {
                const expected = `Basic ${encrypted}`;
                return val === expected;
            })
            .reply(200, "Hello World!");

        http.get({
            host: "www.headdy.com",
            path: "/",
            port: 80,
            auth: authString
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 200);

            res.on("data", (data) => {
                assert.equal(data, "Hello World!");
            });

            res.on("end", () => {
                scope.done();
                done();
            });
        });

    });

    it("request emits socket", (done) => {
        nock("http://gotzsocketz.com")
            .get("/")
            .reply(200, "hey");

        const req = http.get("http://gotzsocketz.com");
        req.once("socket", function (socket) {
            assert.equal(this, req);
            assert.isObject(socket);
            assert.isString(socket.getPeerCertificate());
            done();
        });
    });

    it("socket emits connect and secureConnect", (done) => {
        nock("http://gotzsocketz.com")
            .post("/")
            .reply(200, "hey");

        const req = http.request({
            host: "gotzsocketz.com",
            path: "/",
            method: "POST"
        });

        let connect = false;
        let secureConnect = false;

        req.on("socket", (socket) => {
            socket.once("connect", () => {
                req.end();
                connect = true;
            });
            socket.once("secureConnect", () => {
                secureConnect = true;
            });
        });

        req.once("response", (res) => {
            res.setEncoding("utf8");
            res.on("data", (d) => {
                assert.equal(d, "hey");
                assert(connect && secureConnect);
                res.once("end", done);
            });
        });
    });

    it("socket setKeepAlive", (done) => {
        nock("http://setkeepalive.com")
            .get("/")
            .reply(200, "hey");

        const req = http.get("http://setkeepalive.com");
        req.once("socket", (socket) => {
            socket.setKeepAlive(true);
            done();
        });
    });

    it("abort destroys socket", (done) => {
        nock("http://socketdestroyer.com")
            .get("/")
            .reply(200, "hey");

        const req = http.get("http://socketdestroyer.com");
        req.once("error", () => {
            // ignore
        });
        req.once("socket", (socket) => {
            req.abort();
            assert.ok(socket.destroyed);
            done();
        });

    });

    it("match domain using regexp", async () => {
        nock(/regexexample\.com/)
            .get("/resources")
            .reply(200, "Match regex");

        const resp = await request.get("http://www.regexexample.com/resources");
        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.equal("Match regex");
    });

    it("match multiple interceptors with regexp domain (issue-508)", async () => {
        nock(/chainregex/)
            .get("/")
            .reply(200, "Match regex")
            .get("/")
            .reply(500, "Match second intercept");

        {
            const resp = await request.get("http://www.chainregex.com");
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("Match regex");
        }
        {
            const err = await assert.throws(async () => {
                await request.get("http://www.chainregex.com");
            });
            expect(err.response.status).to.be.equal(500);
            expect(err.response.data).to.be.equal("Match second intercept");
        }
    });

    it("match domain using intercept callback", async () => {
        const validUrl = [
            "/cats",
            "/dogs"
        ];

        nock("http://www.interceptexample.com")
            .get((uri) => {
                return validUrl.includes(uri);
            })
            .reply(200, "Match intercept")
            .get("/cats")
            .reply(200, "Match intercept 2");

        {
            const resp = await request.get("http://www.interceptexample.com/cats");
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("Match intercept");
        }
        {
            const resp = await request.get("http://www.interceptexample.com/cats");
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("Match intercept 2");
        }
    });

    it("match path using regexp", async () => {
        nock("http://www.pathregex.com")
            .get(/regex$/)
            .reply(200, "Match regex");

        const resp = await request.get("http://www.pathregex.com/resources/regex");
        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.equal("Match regex");
    });

    it("remove interceptor for GET resource", (done) => {
        const scope = nock("http://example.org")
            .get("/somepath")
            .reply(200, "hey");

        const mocks = scope.pendingMocks();
        assert.deepEqual(mocks, ["GET http://example.org:80/somepath"]);

        const result = nock.removeInterceptor({
            hostname: "example.org",
            path: "/somepath"
        });
        assert.ok(result, "result should be true");

        nock("http://example.org")
            .get("/somepath")
            .reply(202, "other-content");

        http.get({
            host: "example.org",
            path: "/somepath"
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 202);

            res.on("data", (data) => {
                assert.equal(data, "other-content");
            });

            res.on("end", () => {
                done();
            });
        });
    });

    it("remove interceptor removes given interceptor", (done) => {
        const givenInterceptor = nock("http://example.org")
            .get("/somepath");
        const scope = givenInterceptor
            .reply(200, "hey");

        const mocks = scope.pendingMocks();
        assert.deepEqual(mocks, ["GET http://example.org:80/somepath"]);

        const result = nock.removeInterceptor(givenInterceptor);
        assert.ok(result, "result should be true");

        nock("http://example.org")
            .get("/somepath")
            .reply(202, "other-content");

        http.get({
            host: "example.org",
            path: "/somepath"
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 202);

            res.on("data", (data) => {
                assert.equal(data, "other-content");
            });

            res.on("end", () => {
                done();
            });
        });
    });

    it("remove interceptor removes interceptor from pending requests", () => {
        const givenInterceptor = nock("http://example.org")
            .get("/somepath");
        const scope = givenInterceptor
            .reply(200, "hey");

        const mocks = scope.pendingMocks();
        assert.deepEqual(mocks, ["GET http://example.org:80/somepath"]);

        const result = nock.removeInterceptor(givenInterceptor);
        assert.ok(result, "result should be true");

        const mocksAfterRemove = scope.pendingMocks();
        assert.deepEqual(mocksAfterRemove, []);
    });

    it("remove interceptor removes given interceptor for https", (done) => {
        const givenInterceptor = nock("https://example.org")
            .get("/somepath");
        const scope = givenInterceptor
            .reply(200, "hey");

        const mocks = scope.pendingMocks();
        assert.deepEqual(mocks, ["GET https://example.org:443/somepath"]);

        const result = nock.removeInterceptor(givenInterceptor);
        assert.ok(result, "result should be true");

        nock("https://example.org")
            .get("/somepath")
            .reply(202, "other-content");

        https.get({
            host: "example.org",
            path: "/somepath"
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 202);

            res.on("data", (data) => {
                assert.equal(data, "other-content");
            });

            res.on("end", () => {
                done();
            });
        });
    });

    it("remove interceptor removes given interceptor for regex path", (done) => {
        const givenInterceptor = nock("http://example.org")
            .get(/somePath$/);
        const scope = givenInterceptor
            .reply(200, "hey");

        const mocks = scope.pendingMocks();
        assert.deepEqual(mocks, ["GET http://example.org:80//somePath$/"]);

        const result = nock.removeInterceptor(givenInterceptor);
        assert.ok(result, "result should be true");

        nock("http://example.org")
            .get(/somePath$/)
            .reply(202, "other-content");

        http.get({
            host: "example.org",
            path: "/get-somePath"
        }, (res) => {
            res.setEncoding("utf8");
            assert.equal(res.statusCode, 202);

            res.once("data", (data) => {
                assert.equal(data, "other-content");
            });

            res.on("end", () => {
                done();
            });
        });
    });

    it("remove interceptor for not found resource", () => {
        const result = nock.removeInterceptor({
            hostname: "example.org",
            path: "/somepath"
        });
        assert.notOk(result, "result should be false as no interceptor was found");
    });

    it("isDone() must consider repeated responses", (done) => {
        const scope = nock("http://www.example.com")
            .get("/")
            .times(2)
            .reply(204);

        const makeRequest = (callback) => {
            const req = http.request({
                host: "www.example.com",
                path: "/",
                port: 80
            }, (res) => {
                assert.equal(res.statusCode, 204);
                res.on("end", callback);
                // Streams start in 'paused' mode and must be started.
                // See https://nodejs.org/api/stream.html#stream_class_stream_readable
                res.resume();
            });
            req.end();
        };

        assert.notOk(scope.isDone(), "should not be done before all requests");
        makeRequest(() => {
            assert.notOk(scope.isDone(), "should not yet be done after the first request");
            makeRequest(() => {
                assert.ok(scope.isDone(), "should be done after the two requests are made");
                scope.done();
                done();
            });
        });
    });

    it("you must setup an interceptor for each request", async () => {
        const scope = nock("http://www.example.com")
            .get("/hey")
            .reply(200, "First match");

        {
            const resp = await request.get("http://www.example.com/hey");
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("First match");
        }
        await assert.throws(async () => {
            await request.get("http://www.example.com/hey");
        }, "No match");
    });

    it("calling socketDelay will emit a timeout", (done) => {
        nock("http://www.example.com")
            .get("/")
            .socketDelay(10000)
            .reply(200, "OK");

        let timedout = false;
        let ended = false;

        const req = http.request("http://www.example.com", (res) => {
            res.setEncoding("utf8");

            res.once("end", () => {
                ended = true;
                if (!timedout) {
                    assert.fail("socket did not timeout when idle");
                }
            });
        });

        req.setTimeout(5000, () => {
            timedout = true;
            if (!ended) {
                done();
            }
        });

        req.end();
    });

    it("calling socketDelay not emit a timeout if not idle for long enough", (done) => {
        nock("http://www.example.com")
            .get("/")
            .socketDelay(10000)
            .reply(200, "OK");

        const req = http.request("http://www.example.com", (res) => {
            res.setEncoding("utf8");

            let body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });

            res.once("end", () => {
                assert.equal(body, "OK");
                done();
            });
        });

        req.setTimeout(60000, () => {
            assert.fail("socket timed out unexpectedly");
        });

        req.end();
    });

    it("replyWithError returns an error on request", (done) => {
        const scope = nock("http://www.google.com")
            .post("/echo")
            .replyWithError("Service not found");

        const req = http.request({
            host: "www.google.com",
            method: "POST",
            path: "/echo",
            port: 80
        });

        // An error should have have been raised
        req.on("error", (e) => {
            scope.done();
            assert.equal(e.message, "Service not found");
            done();
        });

        req.end();
    });

    it("replyWithError allows json response", (done) => {
        const scope = nock("http://www.google.com")
            .post("/echo")
            .replyWithError({ message: "Service not found", code: "test" });

        const req = http.request({
            host: "www.google.com",
            method: "POST",
            path: "/echo",
            port: 80
        });

        // An error should have have been raised
        req.on("error", (e) => {
            scope.done();
            assert.equal(e.message, "Service not found");
            assert.equal(e.code, "test");
            done();
        });

        req.end();
    });

    it("no content type provided", (done) => {
        const scope = nock("http://nocontenttype.com")
            .replyContentLength()
            .post("/httppost", () => {
                return true;
            })
            .reply(401, "");

        http.request({
            host: "nocontenttype.com",
            path: "/httppost",
            method: "POST",
            headers: {}
        }, (res) => {
            res.on("data", () => { });
            res.once("end", () => {
                scope.done();
                assert.ok(true);
                done();
            });
        }).end("WHAA");

    });

    it("query() matches a query string of the same name=value", async () => {
        nock("http://google.com")
            .get("/")
            .query({ foo: "bar" })
            .reply(200);

        const resp = await request.get("http://google.com/?foo=bar");
        expect(resp.status).to.be.equal(200);
    });

    it("query() matches multiple query strings of the same name=value", async () => {
        nock("http://google.com")
            .get("/")
            .query({ foo: "bar", baz: "foz" })
            .reply(200);

        const resp = await request.get("http://google.com/?foo=bar&baz=foz");
        expect(resp.status).to.be.equal(200);
    });

    it("query() matches multiple query strings of the same name=value regardless of order", async () => {
        nock("http://google.com")
            .get("/")
            .query({ foo: "bar", baz: "foz" })
            .reply(200);

        const resp = await request.get("http://google.com/?baz=foz&foo=bar");
        expect(resp.status).to.be.equal(200);
    });

    it("query() matches query values regardless of their type of declaration", async () => {
        nock("http://google.com")
            .get("/")
            .query({ num: 1, bool: true, empty: null, str: "fou" })
            .reply(200);

        const resp = await request.get("http://google.com/?num=1&bool=true&empty=&str=fou");
        expect(resp.status).to.be.equal(200);
    });

    it("query() doesn't match query values of requests without query string", async () => {
        nock("http://google.com")
            .get("/")
            .query({ num: 1, bool: true, empty: null, str: "fou" })
            .reply(200, "scope1");

        nock("http://google.com")
            .get("/")
            .reply(200, "scope2");

        const resp = await request.get("http://google.com/");
        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.equal("scope2");
    });

    it("query() matches a query string using regexp", async () => {
        nock("http://google.com")
            .get("/")
            .query({ foo: /.*/ })
            .reply(200);

        const resp = await request.get("http://google.com/?foo=bar");
        expect(resp.status).to.be.equal(200);
    });

    it("query() matches a query string that contains special RFC3986 characters", async () => {
        nock("http://google.com")
            .get("/")
            .query({ "foo&bar": "hello&world" })
            .reply(200);

        const resp = await request.get("http://google.com/", {
            params: {
                "foo&bar": "hello&world"
            }
        });
        expect(resp.status).to.be.equal(200);
    });

    it("query() expects unencoded query params", async () => {
        nock("http://google.com")
            .get("/")
            .query({ foo: "hello%20world" })
            .reply(200);

        await assert.throws(async () => {
            await request.get("http://google.com?foo=hello%20world");
        }, "No match");
    });

    it("query() matches a query string with pre-encoded values", async () => {
        nock("http://google.com", { encodedQueryParams: true })
            .get("/")
            .query({ foo: "hello%20world" })
            .reply(200);

        const resp = await request.get("http://google.com?foo=hello%20world");
        expect(resp.status).to.be.equal(200);
    });

    it('query() with "true" will allow all query strings to pass', async () => {
        nock("http://google.com")
            .get("/")
            .query(true)
            .reply(200);

        const resp = await request.get("http://google.com/?foo=bar&a=1&b=2");
        expect(resp.status).to.be.equal(200);
    });

    it('query() with "{}" will allow a match against ending in ?', async () => {
        nock("http://querystringmatchland.com")
            .get("/noquerystring")
            .query({})
            .reply(200);

        const resp = await request.get("http://querystringmatchland.com/noquerystring?");
        expect(resp.status).to.be.equal(200);
    });

    it("query() with a function, function called with actual queryObject", async () => {
        let queryObject;

        const queryValidator = function (qs) {
            queryObject = qs;
            return true;
        };

        nock("http://google.com")
            .get("/")
            .query(queryValidator)
            .reply(200);

        const resp = await request.get("http://google.com/?foo=bar&a=1&b=2");
        expect(resp.status).to.be.equal(200);
        expect(queryObject).to.be.deep.equal({ foo: "bar", a: "1", b: "2" });
    });

    it("query() with a function, function return true the query treat as matched", async () => {
        const alwasyTrue = function () {
            return true;
        };

        nock("http://google.com")
            .get("/")
            .query(alwasyTrue)
            .reply(200);

        const resp = await request.get("http://google.com/?igore=the&actual=query");
        expect(resp.status).to.be.equal(200);
    });

    it("query() with a function, function return false the query treat as Un-matched", async () => {

        const alwayFalse = function () {
            return false;
        };

        nock("http://google.com")
            .get("/")
            .query(alwayFalse)
            .reply(200);

        await assert.throws(async () => {
            await request.get("http://google.com/?i=should&pass=?");
        }, "No match");
    });

    it("query() will not match when a query string does not match name=value", async () => {
        nock("https://c.com")
            .get("/b")
            .query({ foo: "bar" })
            .reply(200);

        await assert.throws(async () => {
            await request.get("https://c.com/b?foo=baz");
        }, "No match");
    });

    it("query() will not match when a query string is present that was not registered", async () => {
        nock("https://b.com")
            .get("/c")
            .query({ foo: "bar" })
            .reply(200);

        await assert.throws(async () => {
            await request.get("https://b.com/c?foo=bar&baz=foz");
        }, "No match");
    });

    it("query() will not match when a query string is malformed", async () => {
        nock("https://a.com")
            .get("/d")
            .query({ foo: "bar" })
            .reply(200);

        await assert.throws(async () => {
            await request.get("https://a.com/d?foobar");
        }, "No match");
    });

    it("query() will not match when a query string has fewer correct values than expected", async () => {
        nock("http://google.com")
            .get("/")
            .query({
                num: 1,
                bool: true,
                empty: null,
                str: "fou"
            })
            .reply(200);

        await assert.throws(async () => {
            await request.get("http://google.com/?num=1str=fou");
        }, "No match");
    });

    it("query(true) will match when the path has no query", async () => {
        nock("http://google.com")
            .get("/")
            .query(true)
            .reply(200);

        const resp = await request.get("http://google.com");
        expect(resp.status).to.be.equal(200);
    });

    it("match domain and path using regexp (#835)", async () => {
        nock.cleanAll();
        const imgResponse = "Matched Images Page";

        const scope = nock(/google/)
            .get(/img/)
            .reply(200, imgResponse);

        const resp = await request.get("http://www.google.com/imghp?hl=en");
        scope.done();
        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.equal(imgResponse);
    });

    it("match multiple paths to domain using regexp with allowUnmocked (#835)", async () => {
        nock.cleanAll();

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        const nockOpts = { allowUnmocked: true };
        const searchResponse = "Matched Google Search Results Page";
        const imgResponse = "Matched Google Images Page";

        const scope1 = nock(/localhost/, nockOpts)
            .get(/imghp/)
            .reply(200, imgResponse);

        const scope2 = nock(/localhost/, nockOpts)
            .get(/search/)
            .reply(200, searchResponse);

        {
            const resp = await request.get(`http://localhost:${port}`);
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("hello");
        }
        {
            const resp = await request.get(`http://localhost:${port}/imghp?hl=en`);
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal(imgResponse);
        }
        scope1.done();
        {
            const resp = await request.get(`http://localhost:${port}/search?q=pugs`);
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal(searchResponse);
        }
        scope2.done();
    });

    it("match domain and path using regexp with query params and allow unmocked", async () => {
        nock.cleanAll();
        const imgResponse = "Matched Images Page";
        const opts = { allowUnmocked: true };

        const scope = nock(/google/, opts)
            .get(/imghp\?hl=en/)
            .reply(200, imgResponse);

        const resp = await request.get("http://www.google.com/imghp?hl=en");
        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.equal(imgResponse);
        scope.done();
    });

    it("multiple interceptors override headers from unrelated request", async () => {
        nock.cleanAll();

        nock.define([
            {
                scope: "https://api.github.com:443",
                method: "get",
                path: "/bar",
                reqheaders: {
                    "x-foo": "bar"
                },
                status: 200,
                response: {}
            },
            {
                scope: "https://api.github.com:443",
                method: "get",
                path: "/baz",
                reqheaders: {
                    "x-foo": "baz"
                },
                status: 200,
                response: {}
            }
        ]);

        {
            const resp = await request.get("https://api.github.com/bar", {
                headers: {
                    "x-foo": "bar"
                }
            });
            expect(resp.status).to.be.equal(200);
        }
        {
            const resp = await request.get("https://api.github.com/baz", {
                headers: {
                    "x-foo": "baz"
                }
            });
            expect(resp.status).to.be.equal(200);
        }
    });

    it("match when query is specified with allowUnmocked (#490)", async () => {
        nock.cleanAll();

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        const nockOpts = { allowUnmocked: true };
        const searchResponse = "Matched body";

        const scope = nock(`http://localhost:${port}/`, nockOpts)
            .get("/search")
            .query({ q: "js" })
            .reply(200, searchResponse);

        {
            const resp = await request.get(`http://localhost:${port}`);
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("hello");
        }
        {
            const resp = await request.get(`http://localhost:${port}/search?q=js`);
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal(searchResponse);
        }
    });

    it("correctly parse request without specified path (#1003)", (done) => {
        nock.cleanAll();

        const scope1 = nock("https://example.com")
            .get("")
            .reply(200);

        https.request({ hostname: "example.com" }, (res) => {
            assert.equal(res.statusCode, 200);
            res.on("data", () => { });
            res.on("end", () => {
                scope1.done();
                done();
            });
        }).end();
    });

    it("data is sent with flushHeaders", (done) => {
        nock.cleanAll();

        const scope1 = nock("https://example.com")
            .get("")
            .reply(200, "this is data");

        https.request({ hostname: "example.com" }, (res) => {
            assert.equal(res.statusCode, 200);
            res.on("data", (data) => {
                assert.equal(data.toString(), "this is data");
            });
            res.on("end", () => {
                scope1.done();
                done();
            });
        }).flushHeaders();
    });

    it("stops persisting a persistent nock", (done) => {
        nock.cleanAll();
        const scope = nock("http://persist.com")
            .persist(true)
            .get("/")
            .reply(200, "Persisting all the way");

        assert.ok(!scope.isDone());
        http.get("http://persist.com/", () => {
            assert.ok(scope.isDone());
            assert.deepEqual(nock.activeMocks(), ["GET http://persist.com:80/"]);
            scope.persist(false);
            http.get("http://persist.com/", () => {
                assert.equal(nock.activeMocks().length, 0);
                assert.ok(scope.isDone());
                http.get("http://persist.com/")
                    .on("error", (e) => {
                        assert.match(e.toString(), /No match for request/);
                        done();
                    })
                    .end();
            }).end();
        }).end();
    });

    it("should throw an error when persist flag isn't a boolean", () => {
        assert.throws(() => {
            nock("http://persist.com").persist("string");
        }, "argument should be a boolean");
    });
});
