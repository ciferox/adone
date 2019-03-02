describe("shani", "util", "nock", "recorder", () => {
    const {
        is,
        shani: {
            util: { nock }
        },
        net: {
            http: {
                client: { create: createHttpClient },
                server: { Server: HTTPServer }
            }
        },
        compressor: { gz },
        std: { http }
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

    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    it("recording turns off nock interception (backward compatibility behavior)", () => {

        //  We ensure that there are no overrides.
        nock.restore();
        assert.isFalse(nock.isActive());
        //  We active the nock overriding - as it's done by merely loading nock.
        nock.activate();
        assert.isTrue(nock.isActive());
        //  We start recording.
        nock.recorder.rec();
        //  Nothing happens (nothing has been thrown) - which was the original behavior -
        //  and mocking has been deactivated.
        assert.isFalse(nock.isActive());
    });

    it("records", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        nock.recorder.rec(true);
        await request.post(`http://localhost:${port}/`, "ABCDEF");
        nock.restore();
        const ret = nock.recorder.play();
        assert.equal(ret.length, 1);
        assert.typeOf(ret[0], "string");
        assert.equal(ret[0].indexOf(`\nnock('http://localhost:${port}', {"encodedQueryParams":true})\n  .post('/', "ABCDEF")\n  .reply(`), 0);
    });

    it("records objects", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        nock.recorder.rec({
            dontPrint: true,
            outputObjects: true
        });

        await request.post(`http://localhost:${port}`, "012345");
        nock.restore();
        let ret = nock.recorder.play();
        assert.equal(ret.length, 1);
        ret = ret[0];
        assert.typeOf(ret, "object");
        assert.equal(ret.scope, `http://localhost:${port}`);
        assert.equal(ret.method, "POST");
        assert.ok(!is.undefined(ret.status));
        assert.ok(!is.undefined(ret.response));
    });

    it("records and replays objects correctly", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);
        const handler = spy();
        const serv = await createHttpServer()
            .use((ctx) => {
                handler();
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        nock.recorder.rec({
            dontPrint: true,
            outputObjects: true
        });

        const resp1 = await request.get(`http://localhost:${port}`);

        nock.restore();
        const nockDefs = nock.recorder.play();
        nock.recorder.clear();
        nock.activate();

        assert.equal(nockDefs.length, 1);
        const nocks = nock.define(nockDefs);

        const resp2 = await request.get(`http://localhost:${port}`);
        expect(resp2.data).to.be.equal(resp1.data);
        expect(handler).to.have.been.calledOnce();
        for (const nock of nocks) {
            nock.done();
        }
    });

    it("records and replays correctly with filteringRequestBody", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const handler = spy();
        const serv = await createHttpServer()
            .use((ctx) => {
                handler();
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        nock.recorder.rec({
            dontPrint: true,
            outputObjects: true
        });

        const resp1 = await request.get(`http://localhost:${port}`);

        nock.restore();
        const nockDefs = nock.recorder.play();
        nock.recorder.clear();
        nock.activate();

        assert.equal(nockDefs.length, 1);
        const nockDef = nockDefs[0];
        let filteringRequestBodyCounter = 0;
        nockDef.filteringRequestBody = function (body, aRecodedBody) {
            ++filteringRequestBodyCounter;
            assert.strictEqual(body, aRecodedBody);
            return body;
        };
        const nocks = nock.define(nockDefs);

        const resp2 = await request.get(`http://localhost:${port}`);
        expect(resp1.data).to.be.equal(resp2.data);

        for (const nock of nocks) {
            nock.done();
        }
        expect(filteringRequestBodyCounter).to.be.equal(1);
        expect(handler).to.have.been.calledOnce();
    });

    it("when request body is json, it goes unstringified", async () => {
        const handler = spy();
        const serv = await createHttpServer()
            .use((ctx) => {
                handler();
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        const payload = { a: 1, b: true };

        nock.restore();
        nock.recorder.clear();
        nock.recorder.rec(true);

        await request.post(`http://localhost:${port}/`, payload);

        let ret = nock.recorder.play();
        assert.ok(ret.length >= 1);
        ret = ret[1] || ret[0];
        assert.equal(ret.indexOf(`\nnock('http://localhost:${port}', {"encodedQueryParams":true})\n  .post('/', {"a":1,"b":true})\n  .reply(`), 0);
    });

    it("when request body is json, it goes unstringified in objects", async () => {
        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        const payload = { a: 1, b: true };

        nock.restore();
        nock.recorder.clear();
        nock.recorder.rec({
            dontPrint: true,
            outputObjects: true
        });

        await request.post(`http://localhost:${port}/`, payload);

        let ret = nock.recorder.play();
        assert.ok(ret.length >= 1);
        ret = ret[1] || ret[0];
        assert.typeOf(ret, "object");
        assert.equal(ret.scope, `http://localhost:${port}`);
        assert.equal(ret.method, "POST");
        assert.ok(ret.body && ret.body.a && ret.body.a === payload.a && ret.body.b && ret.body.b === payload.b);
        assert.ok(!is.undefined(ret.status));
        assert.ok(!is.undefined(ret.response));
    });

    it("rec() throws when reenvoked with already recorder requests", () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        nock.recorder.rec();
        assert.throws(() => {
            nock.recorder.rec();
        }, "recording already in progress");
    });

    it("records https correctly", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind(httpsOpts);
        const { port } = serv.address();

        nock.recorder.rec({
            dontPrint: true,
            outputObjects: true
        });

        await request.post(`https://localhost:${port}/`, "012345");

        nock.restore();
        let ret = nock.recorder.play();
        assert.equal(ret.length, 1);
        ret = ret[0];
        assert.typeOf(ret, "object");
        assert.equal(ret.scope, `https://localhost:${port}`);
        assert.equal(ret.method, "POST");
        assert.ok(!is.undefined(ret.status));
        assert.ok(!is.undefined(ret.response));
    });

    it("records request headers correctly", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        nock.recorder.rec({
            dontPrint: true,
            outputObjects: true,
            enableReqheadersRecording: true
        });

        await request.get(`http://localhost:${port}`, {
            auth: {
                username: "foo",
                password: "bar"
            }
        });

        nock.restore();
        let ret = nock.recorder.play();
        assert.equal(ret.length, 1);
        ret = ret[0];
        assert.typeOf(ret, "object");
        assert.deepInclude(ret.reqheaders, {
            host: `localhost:${port}`,
            authorization: "Basic Zm9vOmJhcg=="
        });
    });

    it("records and replays gzipped nocks correctly", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);
        const handler = spy();
        const serv = await createHttpServer()
            .use((ctx) => {
                handler();
                ctx.response.set("Content-Encoding", "gzip");
                ctx.body = gz.compressSync("hello");
            })
            .bind();
        const { port } = serv.address();

        nock.recorder.rec({
            dontPrint: true,
            outputObjects: true
        });


        const resp1 = await request.get(`http://localhost:${port}/`);
        expect(resp1.data).to.be.equal("hello");

        nock.restore();
        const nockDefs = nock.recorder.play();
        nock.recorder.clear();
        nock.activate();

        assert.equal(nockDefs.length, 1);
        const nocks = nock.define(nockDefs);

        const resp2 = await request.get(`http://localhost:${port}/`);
        expect(resp1.data).to.be.equal(resp2.data);
        expect(handler).to.have.been.calledOnce();
        for (const nock of nocks) {
            nock.done();
        }
    });

    it("records and replays nocks correctly", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const handler = spy();
        const serv = await createHttpServer()
            .use((ctx) => {
                handler();
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        nock.recorder.rec({
            dontPrint: true,
            outputObjects: true
        });

        const resp1 = await request.get(`http://localhost:${port}`);
        expect(resp1.data).to.be.equal("hello");

        nock.restore();
        const nockDefs = nock.recorder.play();
        nock.recorder.clear();
        nock.activate();

        assert.equal(nockDefs.length, 1);
        const nocks = nock.define(nockDefs);

        const resp2 = await request.get(`http://localhost:${port}`);
        expect(resp2.data).to.be.equal("hello");
        expect(handler).to.have.been.calledOnce();

        for (const nock of nocks) {
            nock.done();
        }
    });

    it("doesn't record request headers by default", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        nock.recorder.rec({
            dontPrint: true,
            outputObjects: true
        });

        await request.get(`http://localhost:${port}`, {
            auth: {
                username: "foo",
                password: "bar"
            }
        });
        nock.restore();
        let ret = nock.recorder.play();
        assert.equal(ret.length, 1);
        ret = ret[0];
        assert.typeOf(ret, "object");
        assert.notExists(ret.reqheaders);
    });

    it("will call a custom logging function", async () => {
        // This also tests that useSeparator is on by default.
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        const record = [];
        const arrayLog = function (content) {
            record.push(content);
        };

        nock.recorder.rec({
            logging: arrayLog
        });

        await request.get(`http://localhost:${port}`, {
            auth: {
                username: "foo",
                password: "bar"
            }
        });

        nock.restore();

        assert.equal(record.length, 1);
        const ret = record[0];
        assert.typeOf(ret, "string");
    });

    it("useSeparator:false is respected", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        const record = [];
        const arrayLog = function (content) {
            record.push(content);
        };

        nock.recorder.rec({
            logging: arrayLog,
            outputObjects: true,
            useSeparator: false
        });

        await request.get(`http://localhost:${port}`, {
            auth: {
                username: "foo",
                password: "bar"
            }
        });

        nock.restore();
        assert.equal(record.length, 1);
        const ret = record[0];
        assert.typeOf(ret, "object"); // this is still an object, because the "cut here" strings have not been appended
    });

    it("records request headers except user-agent if enableReqheadersRecording is set to true", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        nock.recorder.rec({
            dontPrint: true,
            outputObjects: true,
            enableReqheadersRecording: true
        });

        await request.get(`http://localhost:${port}`, {
            auth: {
                username: "foo",
                password: "bar"
            }
        });

        let ret = nock.recorder.play();
        assert.equal(ret.length, 1);
        ret = ret[0];
        assert.typeOf(ret, "object");
        assert.ok(ret.reqheaders);
        assert.notExists(ret.reqheaders["user-agent"]);
    });

    it("encodes the query parameters when not outputing objects", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        nock.recorder.rec({
            dont_print: true,
            output_objects: false,
            logging: adone.noop
        });

        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();
        const { port } = serv.address();

        await request.get(`http://localhost:${port}`, {
            params: { q: "test search++" }
        });

        nock.restore();
        const recording = nock.recorder.play();
        assert.isTrue(recording.length >= 1);
        assert.isTrue(recording[0].indexOf("test%20search%2B%2B") !== -1);
    });

    it("works with clients listening for readable", (done) => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);

        const REQUEST_BODY = "ABCDEF";
        const RESPONSE_BODY = "012345";

        //  Create test http server and perform the tests while it's up.
        const testServer = http.createServer((req, res) => {
            res.end(RESPONSE_BODY);
        }).listen(0, (err) => {
            const options = {
                host: "localhost",
                port: testServer.address().port,
                path: "/"
            };
            const recOptions = {
                dontPrint: true,
                outputObjects: true
            };

            nock.recorder.rec(recOptions);

            const req = http.request(options, (res) => {
                let readableCount = 0;
                let chunkCount = 0;
                res.on("readable", () => {
                    ++readableCount;
                    let chunk;
                    while (!is.null(chunk = res.read())) {
                        assert.equal(chunk.toString(), RESPONSE_BODY);
                        ++chunkCount;
                    }
                });
                res.once("end", () => {
                    nock.restore();
                    let ret = nock.recorder.play();
                    assert.equal(ret.length, 1);
                    ret = ret[0];
                    assert.typeOf(ret, "object");
                    assert.equal(readableCount, 1);
                    assert.equal(chunkCount, 1);
                    assert.equal(ret.scope, `http://localhost:${options.port}`);
                    assert.equal(ret.method, "GET");
                    assert.equal(ret.body, REQUEST_BODY);
                    assert.equal(ret.status, 200);
                    assert.equal(ret.response, RESPONSE_BODY);
                    //  Close the test server, we are done with it.
                    testServer.close();
                    done();
                });
            });

            req.end(REQUEST_BODY);
        });

    });

    it("outputs query string parameters using query()", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);


        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind(httpsOpts);
        const { port } = serv.address();

        nock.recorder.rec(true);

        const resp = await request.get(`https://localhost:${port}`, {
            params: {
                param1: 1,
                param2: 2
            }
        });

        expect(resp.data).to.be.equal("hello");

        const ret = nock.recorder.play();
        assert.equal(ret.length, 1);
        assert.typeOf(ret[0], "string");
        const match = `\nnock('https://localhost:${port}', {"encodedQueryParams":true})\n  .get('/')\n  .query({"param1":"1","param2":"2"})\n  .reply(`;
        assert.equal(ret[0].substring(0, match.length), match);
    });

    it("outputs query string arrays correctly", async () => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);


        const serv = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind(httpsOpts);
        const { port } = serv.address();

        nock.recorder.rec(true);

        const resp = await request.get(`https://localhost:${port}`, {
            params: {
                foo: ["bar", "baz"]
            }
        });
        expect(resp.data).to.be.equal("hello");

        const ret = nock.recorder.play();
        assert.equal(ret.length, 1);
        assert.typeOf(ret[0], "string");
        const match = `\nnock('https://localhost:${port}', {"encodedQueryParams":true})\n  .get('/')\n  .query({"foo":["bar","baz"]})\n  .reply(`;
        assert.equal(ret[0].substring(0, match.length), match);
    });

    it("removes query params from that path and puts them in query()", (done) => {
        nock.restore();
        nock.recorder.clear();
        assert.equal(nock.recorder.play().length, 0);


        const serv = createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            });

        serv.bind().then(() => {
            const { port } = serv.address();

            const options = {
                method: "POST",
                host: "localhost",
                port,
                path: "/?param1=1&param2=2"
            };

            nock.recorder.rec(true);
            const req = http.request(options, (res) => {
                res.resume();
                let ret;
                res.once("end", () => {
                    nock.restore();
                    ret = nock.recorder.play();
                    assert.equal(ret.length, 1);
                    assert.typeOf(ret[0], "string");
                    assert.equal(ret[0].indexOf(`\nnock('http://localhost:${port}', {"encodedQueryParams":true})\n  .post('/', "ABCDEF")\n  .query({"param1":"1","param2":"2"})\n  .reply(`), 0);
                    done();
                });
            });
            req.end("ABCDEF");
        });
    });

    it("respects http.request() consumers", (done) => {
        //  Create test http server and perform the tests while it's up.
        const testServer = http.createServer((req, res) => {
            res.write("foo");
            setTimeout(() => {
                res.end("bar");
            }, 25);
        }).listen(0, (err) => {
            assert.equal(err, undefined);

            nock.restore();
            nock.recorder.clear();
            nock.recorder.rec({
                dontPrint: true,
                outputObjects: true
            });


            const options = {
                host: "localhost",
                port: testServer.address().port,
                path: "/"
            };

            const req = http.request(options, (res) => {
                let buffer = Buffer.from("");

                setTimeout(() => {
                    res
                        .on("data", (data) => {
                            buffer = Buffer.concat([buffer, data]);
                        })
                        .on("end", () => {
                            nock.restore();
                            assert.equal(buffer.toString(), "foobar");
                            done();

                            //  Close the test server, we are done with it.
                            testServer.close();
                        });
                });
            }, 50);

            req.end();
        });
    });
});
