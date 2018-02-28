describe("net", "http", "proxy", "socks", "agent", "http", () => {
    const {
        fs,
        net: {
            proxy: {
                socks
            },
            http: {
                client: {
                    request
                },
                server: {
                    Server: HTTPServer
                }
            }
        }
    } = adone;

    const fixtures = new fs.Directory(__dirname, "fixtures");

    let servers = [];

    const createHttpServer = (opts) => {
        const server = new HTTPServer(opts);
        servers.push(server);
        return server;
    };


    const privateKey = fixtures.getFile("private.key").contentsSync();
    const certificate = fixtures.getFile("certificate.crt").contentsSync();

    const httpsOpts = {
        secure: {
            key: privateKey,
            cert: certificate
        }
    };

    afterEach(async () => {
        await Promise.all(servers.map((x) => x.unbind()));
        servers = [];
    });

    let proxyServer;
    let proxyPort;

    before((done) => {
        proxyServer = socks.createServer({
            auths: [socks.auth.None()]
        }, (reqInfo, accept) => {
            proxyServer.emit("info", reqInfo);
            accept();
        });
        proxyServer.listen(0, () => {
            const addr = proxyServer.address();
            proxyPort = addr.port;
            done();
        });
    });

    after((done) => {
        proxyServer.close(done);
    });

    it("should make a http request through proxy", async () => {
        const serv = createHttpServer();
        serv.use((ctx) => {
            ctx.body = "hello";
        });
        await serv.bind();
        const { port } = serv.address();

        const s = spy();
        proxyServer.once("info", s);
        const res = await request.get(`http://localhost:${port}`, {
            httpAgent: new socks.Agent({
                proxyHost: "localhost",
                proxyPort
            })
        });
        expect(res.data).to.be.equal("hello");
        expect(s).to.have.been.calledOnce();
        expect(s).to.have.been.calledWith(match({
            dstAddr: "127.0.0.1",
            dstPort: port
        }));
    });

    it("should make a https request through proxy", async () => {
        const serv = createHttpServer();
        serv.use((ctx) => {
            ctx.body = "hello";
        });
        await serv.bind(httpsOpts);
        const { port } = serv.address();

        const s = spy();
        proxyServer.once("info", s);
        const res = await request.get(`https://localhost:${port}`, {
            rejectUnauthorized: false,
            httpsAgent: new socks.Agent({
                proxyHost: "localhost",
                proxyPort,
                https: true,
                rejectUnauthorized: false
            })
        });
        expect(res.data).to.be.equal("hello");
        expect(s).to.have.been.calledOnce();
        expect(s).to.have.been.calledWith(match({
            dstAddr: "127.0.0.1",
            dstPort: port
        }));
    });

    it("should throw if there is no proxy", async () => {
        const port = await adone.net.util.getPort();

        const err = await assert.throws(async () => {
            await request.get("https://google.com", {
                rejectUnauthorized: false,
                httpsAgent: new socks.Agent({
                    proxyHost: "localhost",
                    proxyPort: port,
                    https: true
                })
            });
        });

        // TODO: better message? like "cannot connect to the proxy server"
        expect(err.message).to.be.equal(`connect ECONNREFUSED 127.0.0.1:${port}`);
    });

    it("should throw if the dest is down", async () => {
        const port = await adone.net.util.getPort();

        const s = spy();
        proxyServer.once("info", s);
        const err = await assert.throws(async () => {
            await request.get(`http://localhost:${port}`, {
                httpAgent: new socks.Agent({
                    proxyHost: "localhost",
                    proxyPort
                })
            });
        });
        expect(err.message).to.be.equal("connection refused");
        expect(s).to.have.been.calledOnce();
        expect(s).to.have.been.calledWith(match({
            dstAddr: "127.0.0.1",
            dstPort: port
        }));
    });
});
