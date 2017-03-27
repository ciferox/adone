describe("glosses", "net", "http", "helper", "raw body", "using http streams", () => {
    const { net: { http: { server: { helper: { getRawBody } } } }, std: { net, http } } = adone;

    it("should read body streams", async () => {
        const server = http.createServer((req, res) => {
            getRawBody(req, { length: req.headers["content-length"] }).then((body) => {
                res.end(body);
            }, (err) => {
                req.resume();
                res.status = 500;
                res.end(err.message);
            });
        });

        await new Promise((resolve) => server.listen(resolve));
        const addr = server.address();
        const client = http.request({ method: "POST", port: addr.port });
        client.end("hello, world!");
        const res = await new Promise((resolve) => client.once("response", resolve));
        const str = await getRawBody(res, { encoding: true });
        server.close();
        expect(str).to.be.equal("hello, world!");
    });

    it("should throw if stream encoding is set", async () => {
        const server = http.createServer((req, res) => {
            req.setEncoding("utf8");
            getRawBody(req, { length: req.headers["content-length"] }).then((body) => {
                res.end(body);
            }, (err) => {
                req.resume();
                res.status = 500;
                res.end(err.message);
            });
        });

        await new Promise((resolve) => server.listen(resolve));
        const addr = server.address();
        const client = http.request({ method: "POST", port: addr.port });
        client.end("hello, world!");
        const res = await new Promise((resolve) => client.once("response", resolve));
        const str = await getRawBody(res, { encoding: true });
        server.close();
        expect(str).to.be.equal("stream encoding should not be set");
    });

    it("should throw if connection ends", (done) => {
        let socket;
        const server = http.createServer((req) => {
            getRawBody(req, { length: req.headers["content-length"] }).then(() => {
                done(new Error("should not be there"));
            }, (err) => {
                server.close();
                assert.ok(err);
                assert.equal(err.code, "ECONNABORTED");
                assert.equal(err.expected, 50);
                assert.equal(err.message, "request aborted");
                assert.equal(err.received, 10);
                assert.equal(err.status, 400);
                assert.equal(err.type, "request.aborted");
                done();
            });
            setTimeout(socket.destroy.bind(socket), 10);
        });

        server.listen(() => {
            socket = net.connect(server.address().port, () => {
                socket.write("POST / HTTP/1.0\r\n");
                socket.write("Connection: keep-alive\r\n");
                socket.write("Content-Length: 50\r\n");
                socket.write("\r\n");
                socket.write("testing...");
            });
        });
    });
});
