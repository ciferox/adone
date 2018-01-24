const { request, create } = adone.net.http.client;

describe("net", "http", "client", "options", () => {
    describe("common", () => {
        beforeEach(() => {
            nock.cleanAll();
            nock.restore();
            nock.activate();
        });

        after(() => {
            nock.cleanAll();
            nock.restore();
        });

        it("should default method to get", (done) => {
            nock("http://example.org")
                .get("/foo")
                .reply(200, () => {
                    done();
                });

            request("http://example.org/foo");
        });

        it("should accept headers", (done) => {
            nock("http://example.org", {
                "X-Requested-With": "XMLHttpRequest"
            })
                .get("/foo")
                .reply(200, () => {
                    done();
                });

            request("http://example.org/foo", {
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            });
        });

        it("should accept params", (done) => {
            nock("http://example.org")
                .get("/foo?foo=123&bar=456")
                .reply(200, () => {
                    done();
                });

            request("http://example.org/foo", {
                params: {
                    foo: 123,
                    bar: 456
                }
            });
        });

        it("should allow overriding default headers", (done) => {
            nock("http://example.org", {
                Accept: "foo/bar"
            })
                .get("/foo")
                .reply(200, () => {
                    done();
                });

            request("http://example.org/foo", {
                headers: {
                    Accept: "foo/bar"
                }
            });
        });

        it("should accept base URL", (done) => {
            nock("http://test.com")
                .get("/foo")
                .reply(200, () => {
                    done();
                });

            const instance = create({
                baseURL: "http://test.com/"
            });

            instance.get("/foo");
        });

        it("should ignore base URL if request URL is absolute", (done) => {
            nock("http://someotherurl.com/")
                .get("/")
                .reply(200, () => {
                    done();
                });

            const instance = create({
                baseURL: "http://someurl.com/"
            });

            instance.get("http://someotherurl.com/");
        });
    });


    describe("formData", () => {
        const {
            net: {
                http: {
                    server
                }
            }
        } = adone;

        it("should support fields", async () => {
            const serv = new server.Server();

            serv.use(async (ctx) => {
                const res = await ctx.request.multipart();
                expect(res.fields.key).to.be.equal("value");
                ctx.body = "OK";
            });

            await serv.bind();

            const res = await request.post(`http://localhost:${serv.address().port}`, null, {
                formData: {
                    key: "value"
                }
            });
            assert.equal(res.data, "OK");
        });

        it("should support streams", async () => {
            const serv = new server.Server();

            serv.use(async (ctx) => {
                const res = await ctx.request.multipart();
                expect(res.fields).to.have.property("key");
                expect(res.fields.key).to.be.an("array");
                expect(res.fields.key).to.have.length(1);
                expect(await adone.fs.readFile(res.fields.key[0].path, "utf8")).to.be.equal(await adone.fs.readFile(__filename, "utf8"));
                ctx.body = "OK";
            });

            await serv.bind();

            const res = await request.post(`http://localhost:${serv.address().port}`, null, {
                formData: {
                    key: adone.fs.createReadStream(__filename)
                }
            });
            assert.equal(res.data, "OK");
        });

        it("should support multiple values for a key", async () => {
            const serv = new server.Server();

            serv.use(async (ctx) => {
                const res = await ctx.request.multipart();
                expect(res.fields.key).to.be.deep.equal(["hello", "world"]);
                ctx.body = "OK";
            });

            await serv.bind();

            const res = await request.post(`http://localhost:${serv.address().port}`, null, {
                formData: {
                    key: [
                        Buffer.from("hello"),
                        "world"
                    ]
                }
            });
            assert.equal(res.data, "OK");
        });

        it("should support custom options", async () => {
            const serv = new server.Server();

            serv.use(async (ctx) => {
                const res = await ctx.request.multipart();
                expect(res.files).to.have.length(1);
                expect(res.files[0].name).to.be.equal("wtf.jpg");
                expect(res.files[0].type).to.be.equal("image/jpeg");
                expect(await adone.fs.readFile(res.files[0].path, "utf8")).to.be.equal("aaaa");
                ctx.body = "OK";
            });

            await serv.bind();

            const res = await request.post(`http://localhost:${serv.address().port}`, null, {
                formData: {
                    key: {
                        value: Buffer.from("aaaa"),
                        options: {
                            filename: "wtf.jpg",
                            contentType: "image/jpeg"
                        }
                    }
                }
            });
            assert.equal(res.data, "OK");
        });
    });
});
