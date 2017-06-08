describe("net", "http", "server", "response", "writable", () => {
    const { net: { http: { server: { Server } } }, std: { net } } = adone;

    describe("when continuous requests in one persistent connection", () => {
        const requestTwice = (server, done) => {
            const port = server.address().port;
            const buf = new Buffer(`GET / HTTP/1.1\r\nHost: localhost:${port}\r\nConnection: keep-alive\r\n\r\n`);
            const client = net.connect(port);
            const datas = [];
            client.on("error", done).on("data", (data) => datas.push(data)).on("end", () => done(null, datas));
            setImmediate(() => client.write(buf));
            setImmediate(() => client.write(buf));
            setTimeout(() => client.end(), 100);
        };

        it("should always writable and response all requests", (done) => {
            const server = new Server();
            let count = 0;
            server.use((ctx) => {
                count++;
                ctx.body = `request ${count}, writable: ${ctx.writable}`;
            });

            server.bind().then(() => {
                requestTwice(server.server, (_, datas) => {
                    server.unbind();
                    const responses = Buffer.concat(datas).toString();
                    expect(responses).to.match(/request 1, writable: true/);
                    expect(responses).to.match(/request 2, writable: true/);
                    done();
                });
            });

        });
    });

    describe("when socket closed before response sent", () => {
        const requsetClosed = (server) => {
            const port = server.address().port;
            const buf = new Buffer(`GET / HTTP/1.1\r\nHost: localhost:${port}\r\nConnection: keep-alive\r\n\r\n`);
            const client = net.connect(port);
            setImmediate(() => {
                client.write(buf);
                client.end();
            });
        };

        it("should not writable", (done) => {
            const server = new Server();
            server.use((ctx) => {
                adone.promise.delay(1000).then(() => {
                    server.unbind();  // eslint-disable-line no-use-before-define
                    if (ctx.writable) {
                        return done(new Error("ctx.writable should not be true"));
                    }
                    done();
                });
            });
            server.bind().then(() => {
                requsetClosed(server.server);
            });
        });
    });

    describe("when response finished", () => {
        const request = (server) => {
            const port = server.address().port;
            const buf = new Buffer(`GET / HTTP/1.1\r\nHost: localhost:${port}\r\nConnection: keep-alive\r\n\r\n`);
            const client = net.connect(port);
            setImmediate(() => {
                client.write(buf);
            });
            setTimeout(() => {
                client.end();
            }, 100);
        };

        it("should not writable", (done) => {
            const server = new Server();
            server.use((ctx) => {
                server.unbind();  // eslint-disable-line no-use-before-define
                ctx.res.end();
                if (ctx.writable) {
                    return done(new Error("ctx.writable should not be true"));
                }
                done();
            });
            server.bind().then(() => {
                request(server.server);
            });
        });
    });
});
