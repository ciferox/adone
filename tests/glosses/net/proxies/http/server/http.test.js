describe("net", "proxies", "http", "server", "http", () => {
    const {
        fs,
        collection: {
            BufferList
        },
        net: {
            proxy: {
                http: {
                    Server: ProxyServer,
                    tunnel
                }
            },
            http: {
                server: { Server: HTTPServer },
                client
            },
            ws
        },
        std
    } = adone;

    const fixtures = new fs.Directory(__dirname, "fixtures");

    const request = (proxyServer, realServer, opts) => client.create({
        baseURL: `${realServer.secure ? "https" : "http"}://localhost:${realServer.address().port}`,
        proxy: proxyServer.address(),
        ...opts
    });

    let servers = [];

    const createHttpServer = (opts) => {
        const server = new HTTPServer(opts);
        servers.push(server);
        return server;
    };

    const privateKey = fixtures.getFile("private.key").contentsSync();
    const certificate = fixtures.getFile("certificate.crt").contentsSync();

    const mitmServerCertificate = fixtures.getFile("mitm_server", "certificate.crt").contentsSync();
    const mitmServerPrivateKey = fixtures.getFile("mitm_server", "private.key").contentsSync();
    const mitmSiteCertificate = fixtures.getFile("mitm_server", "site", "certificate.crt").contentsSync();
    const mitmSitePrivateKey = fixtures.getFile("mitm_server", "site", "private.key").contentsSync();

    const httpsOpts = {
        secure: {
            key: privateKey,
            cert: certificate
        }
    };

    const createProxyServer = (opts) => {
        const server = new ProxyServer(opts);
        servers.push(server);
        return server;
    };

    const createWsServer = async (opts) => {
        const server = await new Promise((resolve) => {
            const serv = new ws.Server(opts, () => resolve(serv));
        });
        server.unbind = () => new Promise((resolve) => server.close(resolve)); // ...
        servers.push(server);
        return server;
    };

    const createWssServer = async () => {
        const httpsServer = std.https.createServer(httpsOpts.secure);
        const wss = new ws.Server({
            server: httpsServer
        });
        await new Promise((resolve) => httpsServer.listen(0, "localhost", resolve));
        wss.unbind = () => new Promise((resolve) => httpsServer.close(resolve)); // ...
        servers.push(wss);
        return wss;
    };

    afterEach(async () => {
        await Promise.all(servers.map((x) => x.unbind()));
        servers = [];
    });

    it("should proxy requests", async () => {
        const responseBody = new BufferList();
        const proxyServer = await createProxyServer()
            .use(async (ctx) => {
                expect(ctx.type).to.be.equal("http");
                ctx.saveResponseBody(responseBody);
                await ctx.connect();
            })
            .bind();
        const httpServer = await createHttpServer()
            .use((ctx) => {
                ctx.body = "hello";
            })
            .bind();

        expect(await request(proxyServer, httpServer).get("/")).to.have.property("data", "hello");
        expect(await responseBody).to.be.deep.equal(Buffer.from("hello"));
    });

    it("should send post body", async () => {
        const requestBody = new BufferList();
        const proxyServer = await createProxyServer()
            .use(async (ctx) => {
                expect(ctx.type).to.be.equal("http");
                ctx.saveRequestBody(requestBody);
                await ctx.connect();
            })
            .bind();
        const httpServer = await createHttpServer()
            .use(async (ctx) => {
                expect(await ctx.request.body()).to.be.deep.equal({ hello: "world" });
                ctx.body = "hello";
            })
            .bind();

        const resp = await request(proxyServer, httpServer).post("/", { hello: "world" });
        expect(resp.data).to.be.equal("hello");
        expect(await requestBody).to.be.deep.equal(Buffer.from('{"hello":"world"}'));
    });

    it("should throw error if the dest is unreachable", async () => {
        const proxyServer = await createProxyServer()
            .use(async (ctx) => {
                expect(ctx.type).to.be.equal("http");
                try {
                    await ctx.connect();
                } catch (err) {
                    expect(err.code).to.be.equal("ECONNREFUSED");
                    expect(err.port).to.be.equal(11234);
                    ctx.fakeResponse({ body: "hello" });
                    await ctx.writeLocalResponse();
                }
            })
            .bind();
        const resp = await client.request.get("http://localhost:11234", {
            proxy: proxyServer.address()
        });
        expect(resp.data).to.be.equal("hello");
    });

    it.skip("should throw if client closes connection while sending response body", async () => {
        assert.fail();
    });

    it.skip("should throw if server errors while sending response body", async () => {
        assert.fail();
    });

    it.skip("should throw if client closes/aborts connection while sendind request body", async () => {
        assert.fail();
    });

    it.skip("should throw if server closes/aborts connection while sendind request body", async () => {
        assert.fail();
    });

    describe("connect", () => {
        it("should handle https over http", async () => {
            const proxyHandler = spy();
            const proxyServer = await createProxyServer()
                .use(async (ctx) => {
                    proxyHandler(ctx);
                    await ctx.connect();
                })
                .bind();

            const httpsServer = await createHttpServer()
                .use((ctx) => {
                    ctx.body = "hello";
                })
                .bind(httpsOpts);

            const resp = await client.request.get(`https://localhost:${httpsServer.address().port}`, {
                httpsAgent: tunnel.https.http({
                    proxy: proxyServer.address(),
                    rejectUnauthorized: false
                })
            });

            expect(resp.data).to.be.deep.equal("hello");
            expect(proxyHandler).to.have.been.calledTwice;
            expect(proxyHandler.getCall(0)).to.have.been.calledWithMatch((ctx) => ctx.type === "http.connect");
            expect(proxyHandler.getCall(1)).to.have.been.calledWithMatch((ctx) => ctx.type === "stream");
        });

        it("should handle upgrade request", async () => {
            const proxyHandler = spy();
            const proxyServer = await createProxyServer()
                .use(async (ctx) => {
                    if (ctx.type === "http.connect") {
                        ctx.handleUpgrade = true;
                    }
                    proxyHandler(ctx);
                    await ctx.connect();
                })
                .bind();

            const wsServer = await createWsServer({ port: 0 });

            const client = new ws.Client(`ws://localhost:${wsServer.address().port}`, {
                agent: tunnel.http.http({
                    proxy: proxyServer.address(),
                    rejectUnauthorized: false
                })
            });

            const [conn] = await Promise.all([
                new Promise((resolve) => wsServer.once("connection", resolve)),
                new Promise((resolve) => client.once("open", resolve))
            ]);

            client.send("hello");
            const clientMsg = await new Promise((resolve) => conn.once("message", resolve));
            expect(clientMsg).to.be.equal("hello");
            conn.send("world");
            const serverMsg = await new Promise((resolve) => client.once("message", resolve));
            expect(serverMsg).to.be.equal("world");
            expect(proxyHandler).to.have.been.calledThrice;
            expect(proxyHandler.getCall(0)).to.have.been.calledWithMatch((ctx) => ctx.type === "http.connect");
            expect(proxyHandler.getCall(1)).to.have.been.calledWithMatch((ctx) => ctx.type === "http.upgrade");
            expect(proxyHandler.getCall(2)).to.have.been.calledWithMatch((ctx) => ctx.type === "stream");
        });

        it("should decrypt https", async () => {
            const getInternalCert = stub().returns(Promise.resolve({
                key: mitmServerPrivateKey,
                cert: mitmServerCertificate
            }));
            const getCertificate = stub().returns(Promise.resolve({
                key: mitmSitePrivateKey,
                cert: mitmSiteCertificate
            }));

            const responseBody = new BufferList();

            const proxyHandler = spy();

            const proxyServer = await createProxyServer({
                https: {
                    getInternalCert,
                    getCertificate
                }
            })
                .use(async (ctx) => {
                    proxyHandler(ctx);
                    if (ctx.type === "http.connect") {
                        ctx.decryptHTTPS = true;
                    }
                    if (ctx.type === "http") {
                        ctx.saveResponseBody(responseBody);
                    }
                    await ctx.connect();
                })
                .bind();

            const httpsServer = await createHttpServer()
                .use((ctx) => {
                    ctx.body = "hello";
                })
                .bind(httpsOpts);

            const resp = await client.request.get(`https://localhost:${httpsServer.address().port}`, {
                httpsAgent: tunnel.https.http({
                    proxy: proxyServer.address(),
                    rejectUnauthorized: false
                })
            });
            expect(resp.data).to.be.equal("hello");
            expect(getInternalCert).to.have.been.calledOnce;
            expect(getCertificate).to.have.been.calledOnce;
            expect(await responseBody).to.be.deep.equal(Buffer.from("hello"));
            expect(proxyHandler).to.have.been.calledTwice;
            expect(proxyHandler.getCall(0)).to.have.been.calledWithMatch((ctx) => ctx.type === "http.connect");
            expect(proxyHandler.getCall(1)).to.have.been.calledWithMatch((ctx) => ctx.type === "http" && ctx.localRequest.secure === true);
        });

        it("should handle upgrade with https descrypt", async () => {
            const getInternalCert = stub().returns(Promise.resolve({
                key: mitmServerPrivateKey,
                cert: mitmServerCertificate
            }));
            const getCertificate = stub().returns(Promise.resolve({
                key: mitmSitePrivateKey,
                cert: mitmSiteCertificate
            }));

            const proxyHandler = spy();

            const proxyServer = await createProxyServer({
                https: {
                    getInternalCert,
                    getCertificate
                }
            })
                .use(async (ctx) => {
                    proxyHandler(ctx);
                    if (ctx.type === "http.connect") {
                        ctx.decryptHTTPS = true;
                        ctx.handleUpgrade = true;
                    }
                    await ctx.connect();
                })
                .bind();

            const wssServer = await createWssServer();

            const client = new ws.Client(`wss://localhost:${wssServer.address().port}`, {
                agent: tunnel.https.http({
                    proxy: proxyServer.address(),
                    rejectUnauthorized: false
                }),
                rejectUnauthorized: false
            });

            const [conn] = await Promise.all([
                new Promise((resolve) => wssServer.once("connection", resolve)),
                new Promise((resolve) => client.once("open", resolve))
            ]);
            try {
                client.send("hello");
                const clientMsg = await new Promise((resolve) => conn.once("message", resolve));
                expect(clientMsg).to.be.equal("hello");
                conn.send("world");
                const serverMsg = await new Promise((resolve) => client.once("message", resolve));
                expect(serverMsg).to.be.equal("world");
            } finally {
                conn.terminate();
            }
            expect(proxyHandler).to.have.been.calledThrice;
            expect(proxyHandler.getCall(0)).to.have.been.calledWithMatch((ctx) => ctx.type === "http.connect");
            expect(proxyHandler.getCall(1)).to.have.been.calledWithMatch((ctx) => ctx.type === "http.upgrade" && ctx.localRequest.secure === true);
            expect(proxyHandler.getCall(2)).to.have.been.calledWithMatch((ctx) => ctx.type === "stream");
        });
    });
});
