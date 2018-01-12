describe("custom headers object", function () {
    // TODO: for some reason these tests do not work with net.http.server.Server...
    const {
        FormData,
        createServer,
        submit
    } = this;

    const {
        is
    } = adone;

    const servers = [];

    after(async () => {
        while (servers.length) {
            const serv = servers.shift();
            await new Promise((resolve) => serv.close(resolve));
        }
    });

    it("works with objects", async () => {
        let expectedLength;

        const server = adone.std.http.createServer((req, res) => {
            assert.ok( !is.undefined(req.headers["content-length"]) );
            assert.equal(req.headers["content-length"], expectedLength);

            req.on("data", (data) => {
                assert.equal(
                    data.toString("utf8").split("\n")[3],
                    "X-Test-Fake: 123\r"
                );
            });

            res.writeHead(200);
            res.end("OK");
        });
        await new Promise((resolve) => {
            server.listen(0, resolve);
        });
        servers.push(server);

        const form = new FormData();

        const options = {
            header: { "X-Test-Fake": 123 },
            // override content-length,
            // much lower than actual buffer size (1000)
            knownLength: 1
        };

        const buffer = Buffer.alloc(1000, 0x01);

        form.append("my_buffer", buffer, options);

        // (available to req handler)
        expectedLength = form._lastBoundary().length + form._overheadLength + options.knownLength;

        await submit(server, form);
    });

    it("works with strings", async () => {
        let expectedLength;

        const server = adone.std.http.createServer((req, res) => {
            assert.ok( !is.undefined(req.headers["content-length"]) );
            assert.equal(req.headers["content-length"], expectedLength);

            req.on("data", (data) => {
                assert.equal(
                    data.toString("utf8").split("\n")[2],
                    "X-Test-Fake: 123\r"
                );
            });

            res.writeHead(200);
            res.end("OK");
        });
        await new Promise((resolve) => {
            server.listen(0, resolve);
        });
        servers.push(server);

        const form = new FormData();

        const testHeader = "X-Test-Fake: 123";

        const options = {
            header: `\r\n--${form.getBoundary()}\r\n${testHeader}\r\n\r\n`,

            // override content-length,
            // much lower than actual buffer size (1000)
            knownLength: 1
        };

        const buffer = Buffer.alloc(1000, 0x01);

        form.append("my_buffer", buffer, options);

        // (available to req handler)
        expectedLength = form._lastBoundary().length + form._overheadLength + options.knownLength;

        expect(await submit(server, form)).to.include({
            data: "OK"
        });
    });
});
