describe("net", "http", "helpers", () => {
    const createReq = (url, originalUrl) => ({ url, originalUrl });
    const { parseURL } = adone.net.http.server.helper;

    describe("parseURL", () => {
        it("should parse the requrst URL", () => {
            const req = createReq("/foo/bar");
            const url = parseURL(req);
            assert.equal(url.host, null);
            assert.equal(url.hostname, null);
            assert.equal(url.href, "/foo/bar");
            assert.equal(url.pathname, "/foo/bar");
            assert.equal(url.port, null);
            assert.equal(url.query, null);
            assert.equal(url.search, null);
        });

        it("should parse with query string", () => {
            const req = createReq("/foo/bar?fizz=buzz");
            const url = parseURL(req);
            assert.equal(url.host, null);
            assert.equal(url.hostname, null);
            assert.equal(url.href, "/foo/bar?fizz=buzz");
            assert.equal(url.pathname, "/foo/bar");
            assert.equal(url.port, null);
            assert.equal(url.query, "fizz=buzz");
            assert.equal(url.search, "?fizz=buzz");
        });

        it("should parse a full URL", () => {
            const req = createReq("http://localhost:8888/foo/bar");
            const url = parseURL(req);
            assert.equal(url.host, "localhost:8888");
            assert.equal(url.hostname, "localhost");
            assert.equal(url.href, "http://localhost:8888/foo/bar");
            assert.equal(url.pathname, "/foo/bar");
            assert.equal(url.port, "8888");
            assert.equal(url.query, null);
            assert.equal(url.search, null);
        });

        it("should not choke on auth-looking URL", () => {
            const req = createReq("//todo@txt");
            assert.equal(parseURL(req).pathname, "//todo@txt");
        });

        it("should return undefined missing url", () => {
            const req = createReq();
            const url = parseURL(req);
            assert.strictEqual(url, undefined);
        });

        describe("when using the same request", () => {
            it("should parse multiple times", () => {
                const req = createReq("/foo/bar");
                assert.equal(parseURL(req).pathname, "/foo/bar");
                assert.equal(parseURL(req).pathname, "/foo/bar");
                assert.equal(parseURL(req).pathname, "/foo/bar");
            });

            it("should reflect url changes", () => {
                const req = createReq("/foo/bar");
                let url = parseURL(req);
                const val = Math.random();

                url._token = val;
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");

                req.url = "/bar/baz";
                url = parseURL(req);
                assert.equal(url._token, undefined);
                assert.equal(parseURL(req).pathname, "/bar/baz");
            });

            it("should cache parsing", () => {
                const req = createReq("/foo/bar");
                let url = parseURL(req);
                const val = Math.random();

                url._token = val;
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");

                url = parseURL(req);
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");
            });

            it("should cache parsing where href does not match", () => {
                const req = createReq("/foo/bar ");
                let url = parseURL(req);
                const val = Math.random();

                url._token = val;
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");

                url = parseURL(req);
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");
            });
        });
    });

    describe("parseURL.original", () => {
        it("should parse the request original URL", () => {
            const req = createReq("/foo/bar", "/foo/bar");
            const url = parseURL.original(req);
            assert.equal(url.host, null);
            assert.equal(url.hostname, null);
            assert.equal(url.href, "/foo/bar");
            assert.equal(url.pathname, "/foo/bar");
            assert.equal(url.port, null);
            assert.equal(url.query, null);
            assert.equal(url.search, null);
        });

        it("should parse originalUrl when different", () => {
            const req = createReq("/bar", "/foo/bar");
            const url = parseURL.original(req);
            assert.equal(url.host, null);
            assert.equal(url.hostname, null);
            assert.equal(url.href, "/foo/bar");
            assert.equal(url.pathname, "/foo/bar");
            assert.equal(url.port, null);
            assert.equal(url.query, null);
            assert.equal(url.search, null);
        });

        it("should parse req.url when originalUrl missing", () => {
            const req = createReq("/foo/bar");
            const url = parseURL.original(req);
            assert.equal(url.host, null);
            assert.equal(url.hostname, null);
            assert.equal(url.href, "/foo/bar");
            assert.equal(url.pathname, "/foo/bar");
            assert.equal(url.port, null);
            assert.equal(url.query, null);
            assert.equal(url.search, null);
        });

        it("should return undefined missing req.url and originalUrl", () => {
            const req = createReq();
            const url = parseURL.original(req);
            assert.strictEqual(url, undefined);
        });

        describe("when using the same request", () => {
            it("should parse multiple times", () => {
                const req = createReq("/foo/bar", "/foo/bar");
                assert.equal(parseURL.original(req).pathname, "/foo/bar");
                assert.equal(parseURL.original(req).pathname, "/foo/bar");
                assert.equal(parseURL.original(req).pathname, "/foo/bar");
            });

            it("should reflect changes", () => {
                const req = createReq("/foo/bar", "/foo/bar");
                let url = parseURL.original(req);
                const val = Math.random();

                url._token = val;
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");

                req.originalUrl = "/bar/baz";
                url = parseURL.original(req);
                assert.equal(url._token, undefined);
                assert.equal(parseURL.original(req).pathname, "/bar/baz");
            });

            it("should cache parsing", () => {
                const req = createReq("/foo/bar", "/foo/bar");
                let url = parseURL.original(req);
                const val = Math.random();

                url._token = val;
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");

                url = parseURL.original(req);
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");
            });

            it("should cache parsing if req.url changes", () => {
                const req = createReq("/foo/bar", "/foo/bar");
                let url = parseURL.original(req);
                const val = Math.random();

                url._token = val;
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");

                req.url = "/baz";
                url = parseURL.original(req);
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");
            });

            it("should cache parsing where href does not match", () => {
                const req = createReq("/foo/bar ", "/foo/bar ");
                let url = parseURL.original(req);
                const val = Math.random();

                url._token = val;
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");

                url = parseURL.original(req);
                assert.equal(url._token, val);
                assert.equal(url.pathname, "/foo/bar");
            });
        });
    });
});
