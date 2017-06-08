describe("net", "proxy", "http", "client", "createSocket", () => {
    const { std: { http }, net: { proxy: { http: { Server: HTTPProxyServer, createSocket } } } } = adone;

    it("should connect to a socket through proxy", async () => {
        const realServer = http.createServer((req, res) => {
            res.end("HELLO");
        });
        const realPort = await new Promise((resolve) => {
            realServer.listen(0, () => {
                resolve(realServer.address().port);
            });
        });
        const proxyServer = new HTTPProxyServer();
        proxyServer.use(async (ctx) => {
            await ctx.connect();
        });
        await proxyServer.listen(0);
        const proxyPort = proxyServer.address().port;

        try {
            const socket = await createSocket(`http://localhost:${proxyPort}`, realPort, "localhost");
            const data = await new Promise((resolve) => {
                socket.once("data", (chunk) => {
                    resolve(chunk);
                    socket.destroy();
                    proxyServer.close();
                    realServer.close();
                });
                socket.write("GET / HTTP/1.1\r\n\r\n");
            });
            expect(data.toString()).to.be.include("HELLO");
        } finally {
            proxyServer.close();
            realServer.close();
        }
    });

    it("should connect to a socket through proxy with auth", async () => {
        const realServer = http.createServer((req, res) => {
            res.end("HELLO");
        });
        const realPort = await new Promise((resolve) => {
            realServer.listen(0, () => {
                resolve(realServer.address().port);
            });
        });
        const proxyServer = new HTTPProxyServer();
        proxyServer.authenticate = (req) => {
            return req.headers["proxy-authorization"] === "Basic dGVzdDpwZXN0";
        };
        proxyServer.use(async (ctx) => {
            await ctx.connect();
        });
        await proxyServer.listen(0);
        const proxyPort = proxyServer.address().port;
        try {
            const socket = await createSocket(`http://test:pest@localhost:${proxyPort}`, realPort, "localhost");
            const data = await new Promise((resolve) => {
                socket.once("data", (chunk) => {
                    resolve(chunk);
                    socket.destroy();
                    proxyServer.close();
                    realServer.close();
                });
                socket.write("GET / HTTP/1.1\r\n\r\n");
            });
            expect(data.toString()).to.be.include("HELLO");
        } finally {
            proxyServer.close();
            realServer.close();
        }
    });

    it("should should fail auth", async () => {
        const realServer = http.createServer((req, res) => {
            res.end("HELLO");
        });
        const realPort = await new Promise((resolve) => {
            realServer.listen(0, () => {
                resolve(realServer.address().port);
            });
        });
        const proxyServer = new HTTPProxyServer();
        proxyServer.authenticate = (req) => {
            return req.headers["proxy-authorization"] === "Basic dGVzdDpwZXN1";
        };
        proxyServer.use(async (ctx) => {
            await ctx.connect();
        });
        await proxyServer.listen(0);
        const proxyPort = proxyServer.address().port;
        try {
            await expect(async () => {
                await createSocket(`http://test:kest@localhost:${proxyPort}`, realPort, "localhost");
            }).to.throw();
        } finally {
            proxyServer.close();
            realServer.close();
        }
    });
});
