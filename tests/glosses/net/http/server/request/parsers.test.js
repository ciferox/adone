describe("glosses", "net", "http", "server", "request", "parsers", () => {
    const { net: { http: { server: { Server } } }, fs, noop } = adone;

    describe("json", () => {
        it("should parse a json body", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                ctx.body = await ctx.request.json();
            });
            await request(server)
                .post("/")
                .send({ message: "lol" })
                .expectStatus(200)
                .expectBody({ message: "lol" });
        });

        it("should throw on non-objects in strict mode", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                ctx.body = await ctx.request.json();
            });
            return request(server)
                .post("/")
                .setHeader("Content-Type", "application/json")
                .send('"lol"')
                .expectStatus(400);
        });

        it("should not throw on non-objects in non-strict mode", async () => {
            const server = new Server();
            server.jsonStrict = false;
            server.use(async (ctx) => {
                ctx.body = await ctx.request.json();
            });
            await request(server)
                .post("/")
                .setHeader("Content-Type", "application/json")
                .send('"lol"')
                .expectStatus(200)
                .expectBody("lol");
        });
    });

    describe("urlencoded", () => {
        it("should parse a urlencoded body", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                ctx.body = await ctx.request.urlencoded();
            });
            await request(server)
                .post("/")
                .send("message=lol")
                .expectStatus(200)
                .expectBody({ message: "lol" });
        });
    });

    describe("text", () => {
        it("should get the raw text body", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                ctx.body = await ctx.request.text();
                expect(ctx.body).to.be.a("string");
            });
            await request(server)
                .post("/")
                .send("message=lol")
                .expectStatus(200)
                .expectBody("message=lol");
        });

        it("should throw if the body is too large", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                await ctx.request.text("1kb");
                this.body = 204;
            });
            await request(server)
                .post("/")
                .send(Buffer.alloc(2048))
                .expectStatus(413);
        });
    });

    describe("buffer", () => {
        it("should get the raw buffer body", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                ctx.type = "text";
                ctx.body = await ctx.request.buffer();
                assert(Buffer.isBuffer(ctx.body));
            });
            await request(server)
                .post("/")
                .send("message=lol")
                .expectStatus(200)
                .expectBody("message=lol");
        });

        it("should throw if the body is too large", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                await ctx.request.buffer("1kb");
                ctx.body = 204;
            });
            await request(server)
                .post("/")
                .send(new Buffer(2048))
                .expectStatus(413);
        });
    });

    describe("body", () => {
        it("should parse a json body", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                ctx.body = await ctx.request.body();
            });
            await request(server)
                .post("/")
                .send({ message: "lol" })
                .expectStatus(200)
                .expectBody({ message: "lol" });
        });

        it("should parse a urlencoded body", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                ctx.body = await ctx.request.body();
            });
            await request(server)
                .post("/")
                .setHeader("Content-Type", "application/x-www-form-urlencoded")
                .send("message=lol")
                .expectStatus(200)
                .expectBody({ message: "lol" });
        });
    });

    describe("Expect: 100-continue", () => {
        it("should send 100-continue", (done) => {
            const server = new Server();
            server.use(async (ctx) => {
                ctx.body = await ctx.request.json();
            });
            server.listen(function onListen() {
                adone.std.http.request({
                    port: this.address().port,
                    path: "/",
                    headers: {
                        expect: "100-continue",
                        "content-type": "application/json"
                    }
                })
                    .once("continue", function onContinue() {
                        this.end(JSON.stringify({
                            message: "lol"
                        }));
                    })
                    .once("response", () => {
                        done();
                    })
                    .once("error", done);
            });
        });
    });

    describe("multipart", () => {
        const _files = [];

        after("clean", async () => {
            await Promise.all(_files.map(({ path }) => {
                return fs.rm(path).catch(noop);
            }));
        });

        it("should get multipart body", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                const { fields, files } = await ctx.request.multipart();
                _files.push(...files);
                expect(fields).to.have.all.keys(["foo", "bar"]);
                expect(files).to.have.lengthOf(3);
                ctx.status = 200;
            });
            await request(server)
                .get("/")
                .attach("foo", "some content", {
                    type: "text/plain",
                    filename: "file.txt"
                })
                .attach("foo", "some content", {
                    type: "text/plain",
                    filename: "file2.txt"
                })
                .attach("bar", "some content", {
                    type: "application/javascript",
                    filename: "file3.js"
                })
                .expectStatus(200);
        });

        it("should get multipart files and fields", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                const { fields, files } = await ctx.request.multipart();
                _files.push(...files);
                expect(fields).to.have.all.keys(["a", "bar"]);
                expect(files).to.have.lengthOf(1);
                expect(fields.a).to.be.equal("b");
                expect(fields.bar[0].name).to.be.equal("file3.js");
                expect(files[0]).to.be.equal(fields.bar[0]);
                ctx.status = 200;
            });
            await request(server)
                .get("/")
                .field("a", "b")
                .attach("bar", "some content", {
                    type: "application/javascript",
                    filename: "file3.js"
                })
                .expectStatus(200);
        });

        it("should get multiple files on same field name", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                const { fields, files } = await ctx.request.multipart();
                _files.push(...files);
                expect(fields).to.have.all.keys(["bar"]);
                expect(files).to.have.lengthOf(2);
                expect(fields.bar.map((x) => x.name).sort()).to.be.deep.equal(["file3.js", "file4.js"]);
                expect(files.map((x) => x.name).sort()).to.be.deep.equal(["file3.js", "file4.js"]);
                ctx.status = 200;
            });
            await request(server)
                .get("/")
                .attach("bar", "some content", {
                    type: "application/javascript",
                    filename: "file3.js"
                })
                .attach("bar", "some content", {
                    type: "application/javascript",
                    filename: "file4.js"
                })
                .expectStatus(200);
        });

        it("should get multiple fields on same field name", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                const { fields, files } = await ctx.request.multipart();
                _files.push(...files);
                expect(fields).to.have.all.keys(["foo", "bar"]);
                expect(files).to.be.empty;
                expect(fields.foo).to.be.an("array");
                expect(fields.foo).to.be.deep.equal(["1", "2", "3"]);
                expect(fields.bar).to.be.an("array");
                expect(fields.bar).to.be.deep.equal(["4", "5", "6"]);
                ctx.status = 200;
            });
            await request(server)
                .get("/")
                .field("foo", "1")
                .field("foo", "2")
                .field("foo", "3")
                .field("bar", "4")
                .field("bar", "5")
                .field("bar", "6")
                .expectStatus(200);
        });

        it("should **conflicts** between fields and files", async () => {
            const server = new Server();
            server.use(async (ctx) => {
                const { fields, files } = await ctx.request.multipart();
                _files.push(...files);
                expect(files).to.have.lengthOf(2);
                expect(files.map((x) => x.name).sort()).to.be.deep.equal(["foo.1", "foo.2"]);
                expect(fields).to.have.all.keys(["foo", "a"]);
                expect(fields.foo).to.be.an("array");
                expect(fields.foo).to.have.lengthOf(2);
                expect(fields.foo.map((x) => x.name).sort()).to.be.deep.equal(["foo.1", "foo.2"]);
                expect(fields.a).to.be.an("array");
                expect(fields.a).to.be.deep.equal(["b", "c"]);
                ctx.status = 200;
            });
            await request(server)
                .get("/")
                .field("foo", "1")
                .attach("foo", "content", {
                    type: "text/plain",
                    filename: "foo.1"
                })
                .attach("foo", "content2", {
                    type: "text/plain",
                    filename: "foo.2"
                })
                .field("a", "b")
                .field("a", "c")
                .expectStatus(200);
        });
    });
});
