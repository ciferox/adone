describe("net", "http", "helpers", "cookies", () => {
    const { net: { http: { server: { helper: { Cookies } } } }, std: { http }, crypto: { Keygrip } } = adone;

    const createServer = (proto, opts) => {
        return http.createServer((req, res) => {
            const cookies = new Cookies(req, res, opts);
            req.protocol = proto;

            try {
                cookies.set("foo", "bar", { secure: true, signed: true });
            } catch (e) {
                res.statusCode = 500;
                res.write(e.message);
            }

            res.end();
        });
    };

    const keys = new Keygrip.UrlSafe(["a", "b"]);
    let server;
    let header;

    before(() => {
        server = http.createServer((req, res) => {
            const cookies = new Cookies(req, res, { keys });

            assert.equal(cookies.constructor, Cookies);

            if (req.url === "/set") {
                cookies
                    // set a regular cookie
                    .set("unsigned", "foo", { signed: false, httpOnly: false })

                    // set a signed cookie
                    .set("signed", "bar", { signed: true })

                    // mimic a signed cookie, but with a bogus signature
                    .set("tampered", "baz")
                    .set("tampered.sig", "bogus")

                    // set a cookie that will be overwritten
                    .set("overwrite", "old-value", { signed: true })
                    .set("overwrite", "new-value", { overwrite: true, signed: true })

                    // set a secure cookie
                    .set("sec", "yes", { secureProxy: true });

                res.writeHead(302, { Location: "/" });
                return res.end("Now let's check.");
            }

            const unsigned = cookies.get("unsigned");
            const signed = cookies.get("signed", { signed: true });
            const tampered = cookies.get("tampered", { signed: true });
            const overwrite = cookies.get("overwrite", { signed: true });

            assert.equal(unsigned, "foo");
            assert.equal(cookies.get("unsigned.sig", { signed: false }), undefined);
            assert.equal(signed, "bar");
            assert.equal(cookies.get("signed.sig", { signed: false }), keys.sign("signed=bar"));
            assert.notEqual(tampered, "baz");
            assert.equal(tampered, undefined);
            assert.equal(overwrite, "new-value");
            assert.equal(cookies.get("overwrite.sig", { signed: false }), keys.sign("overwrite=new-value"));

            assert.equal(res.getHeader("Set-Cookie"), "tampered.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly");

            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(
                `${"unsigned expected: foo\n" +
                "unsigned actual: "}${unsigned}\n\n` +
                "signed expected: bar\n" +
                `signed actual: ${signed}\n\n` +
                "tampered expected: undefined\n" +
                `tampered: ${tampered}\n`
            );
        }).listen(0, "127.0.0.1");
    });

    after(() => {
        server.close();
    });

    it("should set cookies", async () => {
        await request(server)
            .get("/set")
            .expectStatus(302)
            .expect((res) => {
                header = res.headers["set-cookie"];
                expect(header).to.have.lengthOf(9);
            });
    });

    it("should get cookies", async () => {
        await request(server)
            .get("/")
            .setHeader("Cookie", header.join(";"))
            .expectStatus(200);
    });

    describe('with "secure" option', () => {
        it("should check connection when undefined; unencrypted", async () => {
            await request(createServer("http", { keys }))
                .get("/")
                .expectStatus(500)
                .expectBody("Cannot send secure cookie over unencrypted connection");
        });

        it("should check connection when undefined; encrypted", async () => {
            await request(createServer("https", { keys }))
                .get("/")
                .expectStatus(200);
        });

        it("should not check connection when defined; true", async () => {
            await request(createServer("http", { keys, secure: true }))
                .get("/")
                .expectStatus(200);
        });

        it("should not check connection when defined; false", async () => {
            await request(createServer("https", { keys, secure: false }))
                .get("/")
                .expectStatus(500)
                .expectBody("Cannot send secure cookie over unencrypted connection");
        });
    });

    describe('with array "keys" options', () => {
        it("should create keygrip with options.keys", async () => {
            await request(createServer("http", { keys: ["a", "b"], secure: true }))
                .get("/")
                .expectStatus(200);
        });
    });
});
