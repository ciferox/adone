describe("net", "http", "follow-redirects ", () => {
    const {
        fs,
        net: {
            http: {
                server: {
                    Server: HTTPServer
                },
                followRedirects
            },
            util: {
                getPort
            }
        },
        std: {
            url,
            net,
            path
        }
    } = adone;

    const {
        http,
        https
    } = followRedirects;

    const httpsOptions = {
        secure: {
            cert: fs.readFileSync(path.join(__dirname, "lib", "TestServer.crt")),
            key: fs.readFileSync(path.join(__dirname, "lib", "TestServer.pem"))
        }
    };

    const ca = fs.readFileSync(path.join(__dirname, "lib", "TestCA.crt"));

    let servers = [];

    const createHttpServer = (opts) => {
        const server = new HTTPServer(opts);
        servers.push(server);
        return server;
    };

    let app;
    let app2;
    let originalMaxRedirects;
    let originalMaxBodyLength;

    beforeEach(() => {
        originalMaxRedirects = followRedirects.maxRedirects;
        originalMaxBodyLength = followRedirects.maxBodyLength;
    });

    afterEach(async () => {
        followRedirects.maxRedirects = originalMaxRedirects;
        followRedirects.maxBodyLength = originalMaxBodyLength;
        await Promise.all(servers.map((x) => x.unbind()));
        servers = [];
    });

    const getUrl = (app, path) => {
        const { port } = app.address();
        const protocol = app.secure ? "https" : "http";
        return `${protocol}://localhost:${port}${path}`;
    };

    const httpGet = (app, path, { follow = true, postRequest } = {}) => {
        return new Promise((resolve, reject) => {
            const url = adone.std.url.parse(getUrl(app, path));
            url.ca = ca; // force ca for all requests

            let mod = http;

            if (app.secure) {
                mod = https;
            }

            url.followRedirects = follow;

            const req = mod.get(url, (res) => {
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.once("end", () => {
                    resolve({
                        responseUrl: res.responseUrl,
                        data: Buffer.concat(chunks),
                        status: res.statusCode
                    });
                });
            }).once("error", reject);
            if (postRequest) {
                postRequest(req);
            }
        });
    };

    const httpRequest = (app, path, { method = "GET", postRequest } = {}) => {
        return new Promise((resolve, reject) => {
            const url = adone.std.url.parse(getUrl(app, path));

            let mod = http;

            if (app.secure) {
                url.ca = ca;
                mod = https;
            }

            url.method = method;

            const req = mod.request(url, (res) => {
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.once("end", () => {
                    resolve({
                        responseUrl: res.responseUrl,
                        data: Buffer.concat(chunks),
                        status: res.statusCode
                    });
                });
            }).once("error", reject);
            if (postRequest) {
                postRequest(req);
            }
            req.end();
        });
    };

    const httpGetJSON = async (app, path, { follow = true, postRequest } = {}) => {
        const res = await httpGet(app, path, { follow, postRequest });
        try {
            res.data = JSON.parse(res.data.toString());
        } catch (err) {
            res.err = err;
            res.data = null;
        }
        return res;
    };

    const httpRequestJSON = async (app, path, { method, postRequest } = {}) => {
        const res = await httpRequest(app, path, { method, postRequest });
        try {
            res.data = JSON.parse(res.data.toString());
        } catch (err) {
            res.err = err;
            res.data = null;
        }
        return res;
    };

    it("http.get with callback", async () => {
        const app = createHttpServer();
        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    return ctx.redirect("/c");
                case "/c":
                    return ctx.redirect("/d");
                case "/d":
                    return ctx.redirect("/e");
                case "/e":
                    return ctx.redirect("/f");
                case "/f":
                    ctx.body = { a: "b" };
            }
        });

        await app.bind();

        const res = await httpGetJSON(app, "/a");
        expect(res).to.deep.include({
            data: { a: "b" },
            responseUrl: getUrl(app, "/f")
        });
    });

    it("http.get with response event", async () => {
        const app = createHttpServer();
        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    return ctx.redirect("/c");
                case "/c":
                    return ctx.redirect("/d");
                case "/d":
                    return ctx.redirect("/e");
                case "/e":
                    return ctx.redirect("/f");
                case "/f":
                    ctx.body = { a: "b" };
            }
        });

        await app.bind();
        const { port } = app.address();

        const res = await new Promise((resolve, reject) => {
            http.get(`http://localhost:${port}/a`)
                .on("response", (res) => {
                    const chunks = [];
                    res.on("data", (chunk) => {
                        chunks.push(chunk);
                    });
                    res.on("end", () => {
                        resolve({
                            responseUrl: res.responseUrl,
                            data: JSON.parse(Buffer.concat(chunks).toString())
                        });
                    });
                })
                .on("error", reject);
        });

        expect(res).to.be.deep.equal({
            data: { a: "b" },
            responseUrl: `http://localhost:${port}/f`
        });
    });

    it("should return with the original status code if the response does not contain a location header", async () => {
        const app = await createHttpServer();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            if (ctx.path === "/a") {
                ctx.status = 307;
            }
        });

        await app.bind();

        const res = await httpGet(app, "/a");
        expect(res).to.deep.include({
            status: 307,
            responseUrl: getUrl(app, "/a")
        });
    });

    it("should emit connection errors on the returned stream", async () => {
        const app = createHttpServer();

        const freePort = await getPort();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            return ctx.redirect(`http://localhost:${freePort}/b`);
        });

        await app.bind();

        const err = await assert.throws(async () => {
            await httpGet(app, "/a");
        });
        expect(err.code).to.be.equal("ECONNREFUSED");
    });

    it("should emit socket events on the returned stream", async () => {
        const app = createHttpServer();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            if (ctx.path === "/a") {
                ctx.body = { a: "b" };
            }
        });

        await app.bind();

        const sock = await new Promise((resolve, reject) => {
            http.get(getUrl(app, "/a"))
                .on("socket", resolve)
                .on("error", reject);
        });
        expect(sock).to.be.instanceOf(net.Socket, "socket event should emit with socket");
    });

    it("should follow redirects over https", async () => {
        const app = createHttpServer();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    return ctx.redirect("/c");
                case "/c":
                    ctx.body = { baz: "quz" };
            }
        });

        await app.bind(httpsOptions);
        const res = await httpGetJSON(app, "/a");
        expect(res).to.deep.include({
            data: { baz: "quz" },
            responseUrl: getUrl(app, "/c")
        });
    });

    it("should honor query params in redirects", async () => {
        const app = createHttpServer();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b?greeting=hello");
                case "/b":
                    ctx.body = { greeting: ctx.request.query.greeting };
            }
        });

        await app.bind();

        const res = await httpGetJSON(app, "/a");
        expect(res).to.deep.include({
            data: { greeting: "hello" },
            responseUrl: `http://localhost:${app.address().port}/b?greeting=hello`
        });
    });

    it("should allow aborting", async () => {
        const app = createHttpServer();

        let request;

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    return ctx.redirect("/c");
                case "/c":
                    request.abort();
            }
        });

        await app.bind();

        await new Promise((resolve, reject) => {
            request = http.get(getUrl(app, "/a"))
                .on("response", reject)
                .on("error", reject)
                .on("abort", resolve);
        });
    });


    it("should provide connection", async () => {
        const app = createHttpServer();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            ctx.body = { foo: "bar" };
        });

        await app.bind();

        let request;

        await httpRequest(app, "/a", {
            postRequest(req) {
                request = req;
            }
        });

        assert.instanceOf(request.connection, net.Socket);
    });

    it("should provide flushHeaders", async () => {
        const app = createHttpServer();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    ctx.body = { foo: "bar" };
            }
        });

        await app.bind();

        await new Promise((resolve, reject) => {
            const request = http.get(getUrl(app, "/a"), resolve);
            request.flushHeaders();
            request.on("response", resolve);
            request.on("error", reject);
        });
    });

    it("should provide getHeader", () => {
        const req = http.request("http://localhost:3600/a");
        req.setHeader("my-header", "my value");
        assert.equal(req.getHeader("my-header"), "my value");
        req.abort();
    });

    it("should provide removeHeader", async () => {
        const app = createHttpServer();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    ctx.body = ctx.headers;
                    break;
            }
        });

        await app.bind();

        const res = await httpRequestJSON(app, "/a", {
            postRequest(req) {
                req.setHeader("my-header", "my value");
                assert.equal(req.getHeader("my-header"), "my value");
                req.removeHeader("my-header");
                assert.undefined(req.getHeader("my-header"));
            }
        });

        assert.undefined(res.data["my-header"]);
    });

    it("should provide setHeader", async () => {
        const app = createHttpServer();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    ctx.body = ctx.headers;
            }
        });

        await app.bind();

        const res = await httpRequestJSON(app, "/a", {
            postRequest(req) {
                req.setHeader("my-header", "my value");
                assert.equal(req.getHeader("my-header"), "my value");
            }
        });

        assert.equal(res.data["my-header"], "my value");
    });

    it("should provide setNoDelay", async () => {
        const app = createHttpServer();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    ctx.body = { foo: "bar" };
            }
        });

        await app.bind();

        await new Promise((resolve, reject) => {
            const request = http.get(getUrl(app, "/a"), resolve);
            request.setNoDelay(true);
            request.on("response", resolve);
            request.on("error", reject);
        });
    });

    it("should provide setSocketKeepAlive", async () => {
        const app = createHttpServer();
        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    ctx.body = { foo: "bar" };
            }
        });

        await app.bind();

        await new Promise((resolve) => {
            const request = http.get(getUrl(app, "/a"), resolve);
            request.setSocketKeepAlive(true);
        });
    });

    it("should provide setTimeout", async () => {
        const app = createHttpServer();
        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    ctx.body = { foo: "bar" };
            }
        });
        await app.bind();

        await new Promise((resolve) => {
            const request = http.get(getUrl(app, "/a"), resolve);
            request.setTimeout(1000);
        });
    });

    it("should provide socket", async () => {
        const app = createHttpServer();

        app.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            ctx.body = "OK";
        });

        await app.bind();

        let request;

        await httpRequest(app, "/a", {
            postRequest(req) {
                request = req;
            }
        });

        assert.instanceOf(request.socket, net.Socket);
    });

    describe("should obey a `maxRedirects` property", () => {
        let app;

        beforeEach(() => {
            app = createHttpServer();

            app.use((ctx, next) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                return next();
            });

            for (let i = 22; i > 0; --i) {
                app.use((ctx, next) => { // eslint-disable-line
                    if (ctx.path === `/r${i}`) {
                        return ctx.redirect(`/r${i - 1}`);
                    }
                    return next();
                });
            }
            app.use((ctx) => {
                if (ctx.path === "/r0") {
                    ctx.body = { foo: "bar" };
                }
            });
        });

        it("which defaults to 21", async () => {
            await app.bind();

            const res = await httpGetJSON(app, "/r21");
            expect(res).to.deep.include({
                data: { foo: "bar" },
                responseUrl: getUrl(app, "/r0")
            });

            await assert.throws(async () => {
                await httpGetJSON(app, "/r22");
            }, "Max redirects exceeded");
        });

        it("which can be set globally", async () => {
            followRedirects.maxRedirects = 22;
            await app.bind();

            const res = await httpGetJSON(app, "/r22");
            expect(res).to.deep.include({
                data: { foo: "bar" },
                responseUrl: getUrl(app, "/r0")
            });
        });

        it("set as an option on an individual request", async () => {

            await app.bind();
            const u = url.parse(`http://localhost:${app.address().port}/r2`);
            u.maxRedirects = 1;

            const err = await new Promise((resolve, reject) => {
                http.get(u, reject).on("error", resolve);
            });

            expect(err.message).to.include("Max redirects exceeded");
        });
    });

    describe("should switch to safe methods when appropriate", () => {
        const itRedirectsWith = function (statusCode, originalMethod, redirectedMethod) {
            const description = `should ${
                originalMethod === redirectedMethod
                    ? `reuse ${originalMethod}`
                    : `switch from ${originalMethod} to ${redirectedMethod}`
            }`;
            it(description, async () => {
                const app = createHttpServer();
                app.use((ctx, next) => {
                    if (ctx.method === originalMethod && ctx.path === "/a") {
                        ctx.status = statusCode;
                        return ctx.redirect("/b");
                    }
                    return next();
                });
                app.use((ctx) => {
                    if (ctx.method === redirectedMethod && ctx.path === "/b") {
                        ctx.body = { a: "b" };
                    }
                });
                await app.bind();
                const res = await httpRequestJSON(app, "/a", { method: originalMethod });
                expect(res).to.deep.include({
                    status: 200,
                    responseUrl: getUrl(app, "/b")
                });
                if (redirectedMethod !== "HEAD") {
                    expect(res.data).to.be.deep.equal({ a: "b" });
                }
            });
        };

        const mustUseSameMethod = function (statusCode, useSameMethod) {
            describe(`when redirecting with status code ${statusCode}`, () => {
                itRedirectsWith(statusCode, "GET", "GET");
                itRedirectsWith(statusCode, "HEAD", "HEAD");
                itRedirectsWith(statusCode, "OPTIONS", "OPTIONS");
                itRedirectsWith(statusCode, "TRACE", "TRACE");
                itRedirectsWith(statusCode, "POST", useSameMethod ? "POST" : "GET");
                itRedirectsWith(statusCode, "PUT", useSameMethod ? "PUT" : "GET");
            });
        };

        mustUseSameMethod(300, false);
        mustUseSameMethod(301, false);
        mustUseSameMethod(302, false);
        mustUseSameMethod(303, false);
        mustUseSameMethod(307, true);
    });

    describe("should handle cross protocol redirects ", () => {
        it("(https -> http -> https)", async () => {
            const app1 = createHttpServer();
            const app2 = createHttpServer();
            app1.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                switch (ctx.path) {
                    case "/a":
                        return ctx.redirect(getUrl(app2, "/b"));
                    case "/c":
                        ctx.body = { yes: "no" };
                }
            });
            app2.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                if (ctx.path === "/b") {
                    return ctx.redirect(getUrl(app1, "/c"));
                }
            });

            await app1.bind(httpsOptions);
            await app2.bind();

            const res = await httpGetJSON(app1, "/a");
            expect(res).to.deep.include({
                status: 200,
                data: { yes: "no" },
                responseUrl: getUrl(app1, "/c")
            });
        });

        it("(http -> https -> http)", async () => {
            const app1 = createHttpServer();
            const app2 = createHttpServer();
            app1.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                switch (ctx.path) {
                    case "/a":
                        return ctx.redirect(getUrl(app2, "/b"));
                    case "/c":
                        ctx.body = { hello: "goodbye" };
                }
            });
            app2.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                if (ctx.path === "/b") {
                    return ctx.redirect(getUrl(app1, "/c"));
                }
            });

            await app1.bind();
            await app2.bind(httpsOptions);

            const res = await httpGetJSON(app1, "/a");
            expect(res).to.deep.include({
                status: 200,
                data: { hello: "goodbye" },
                responseUrl: getUrl(app1, "/c")
            });
        });
    });

    it("should support writing into request stream without redirects", async () => {
        const app = createHttpServer();
        app.use((ctx) => {
            if (ctx.method === "POST" && ctx.path === "/a") {
                ctx.body = ctx.request.req;
            }
        });

        await app.bind();

        const opts = url.parse(getUrl(app, "/a"));
        opts.method = "POST";

        const buf = await fs.readFile(__filename);

        const res = await new Promise((resolve, reject) => {
            http.request(opts, (res) => {
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            }).on("error", reject).end(buf);
        });

        expect(res).to.be.deep.equal(buf);
    });

    it("should support writing into request stream with redirects", async () => {
        const app = createHttpServer();
        app.use((ctx) => {
            if (ctx.method !== "POST") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    ctx.status = 307;
                    return ctx.redirect("/b");
                case "/b":
                    ctx.body = ctx.request.req;
            }
        });

        await app.bind();

        const opts = url.parse(`http://localhost:${app.address().port}/a`);
        opts.method = "POST";

        const buf = await fs.readFile(__filename);

        const res = await new Promise((resolve, reject) => {
            http.request(opts, (res) => {
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            }).on("error", reject).end(buf);
        });

        expect(res).to.be.deep.equal(buf);
    });

    it("should support piping into request stream without redirects", async () => {
        const app = createHttpServer();
        app.use((ctx) => {
            if (ctx.method === "POST" && ctx.path === "/a") {
                ctx.body = ctx.request.req;
            }
        });

        await app.bind();

        const opts = url.parse(`http://localhost:${app.address().port}/a`);
        opts.method = "POST";

        const res = await new Promise((resolve, reject) => {
            const req = http.request(opts, (res) => {
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            }).on("error", reject);
            fs.createReadStream(__filename).pipe(req);
        });

        expect(res).to.be.deep.equal(await fs.readFile(__filename));
    });

    it("should support piping into request stream with redirects", async () => {
        const app = createHttpServer();
        app.use((ctx) => {
            if (ctx.method !== "POST") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    ctx.status = 307;
                    return ctx.redirect("/b");
                case "/b":
                    ctx.body = ctx.request.req;
            }
        });

        await app.bind();

        const opts = url.parse(`http://localhost:${app.address().port}/a`);
        opts.method = "POST";

        const res = await new Promise((resolve, reject) => {
            const req = http.request(opts, (res) => {
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            }).on("error", reject);
            fs.createReadStream(__filename).pipe(req);
        });

        expect(res).to.be.deep.equal(await fs.readFile(__filename));
    });

    it("should support piping into request stream with explicit Content-Length without redirects", async () => {
        const app = createHttpServer();
        const length = fs.readFileSync(__filename).byteLength;
        app.use((ctx) => {
            if (ctx.method === "POST" && ctx.path === "/a") {
                expect(ctx.request.length).to.be.equal(length);
                ctx.body = ctx.request.req;
            }
        });

        await app.bind();

        const opts = url.parse(`http://localhost:${app.address().port}/a`);
        opts.method = "POST";
        opts.headers = {
            "Content-Length": length
        };

        const res = await new Promise((resolve, reject) => {
            const req = http.request(opts, (res) => {
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            }).on("error", reject);
            fs.createReadStream(__filename).pipe(req);
        });

        expect(res).to.be.deep.equal(await fs.readFile(__filename));
    });

    it("should support piping into request stream with explicit Content-Length with redirects", async () => {
        const app = createHttpServer();
        const length = fs.readFileSync(__filename).byteLength;
        app.use((ctx) => {
            if (ctx.method !== "POST") {
                ctx.throw(404);
            }
            expect(ctx.request.length).to.be.equal(length);
            switch (ctx.path) {
                case "/a":
                    ctx.status = 307;
                    return ctx.redirect("/b");
                case "/b":
                    ctx.body = ctx.request.req;
            }
        });

        await app.bind();

        const opts = url.parse(`http://localhost:${app.address().port}/a`);
        opts.method = "POST";
        opts.headers = {
            "Content-Length": length
        };

        const res = await new Promise((resolve, reject) => {
            const req = http.request(opts, (res) => {
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            }).on("error", reject);
            fs.createReadStream(__filename).pipe(req);
        });

        expect(res).to.be.deep.equal(await fs.readFile(__filename));
    });

    describe("should obey a `maxBodyLength` property", () => {
        it("which defaults to 10MB", () => {
            assert.equal(followRedirects.maxBodyLength, 10 * 1024 * 1024);
        });

        it("set globally, on write", async () => {
            const app = createHttpServer();

            app.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                ctx.body = ctx.req;
            });

            await app.bind();

            const opts = url.parse(`http://localhost:${app.address().port}/a`);
            opts.method = "POST";

            followRedirects.maxBodyLength = 8;

            const err = await new Promise((resolve, reject) => {
                const req = http.request(opts, reject);
                req.write("12345678");
                req.on("error", resolve);
                req.write("9");
            });

            assert.equal(err.message, "Request body larger than maxBodyLength limit");
        });

        it("set per request, on write", async () => {
            const app = createHttpServer();

            app.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                ctx.body = ctx.req;
            });

            await app.bind();

            const opts = url.parse(`http://localhost:${app.address().port}/a`);
            opts.method = "POST";
            opts.maxBodyLength = 8;

            const err = await new Promise((resolve, reject) => {
                const req = http.request(opts, reject);
                req.write("12345678");
                req.on("error", resolve);
                req.write("9");
            });

            assert.equal(err.message, "Request body larger than maxBodyLength limit");
        });

        it("set globally, on end", async () => {
            const app = createHttpServer();

            app.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                ctx.body = ctx.req;
            });

            await app.bind();

            const opts = url.parse(`http://localhost:${app.address().port}/a`);
            opts.method = "POST";

            followRedirects.maxBodyLength = 8;

            const err = await new Promise((resolve, reject) => {
                const req = http.request(opts, reject);
                req.write("12345678");
                req.on("error", resolve);
                req.end("9");
            });

            assert.equal(err.message, "Request body larger than maxBodyLength limit");
        });

        it("set per request, on end", async () => {
            const app = createHttpServer();

            app.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                ctx.body = ctx.req;
            });

            await app.bind();

            const opts = url.parse(`http://localhost:${app.address().port}/a`);
            opts.method = "POST";
            opts.maxBodyLength = 8;

            const err = await new Promise((resolve, reject) => {
                const req = http.request(opts, reject);
                req.write("12345678");
                req.on("error", resolve);
                req.end("9");
            });

            assert.equal(err.message, "Request body larger than maxBodyLength limit");
        });
    });

    describe("should drop the entity and associated headers", () => {
        const itDropsBodyAndHeaders = function (originalMethod) {
            it(`when switching from ${originalMethod} to GET`, async () => {
                const app = createHttpServer();
                app.use((ctx) => {
                    if (ctx.method === originalMethod && ctx.path === "/a") {
                        return ctx.redirect("/b");
                    }
                    if (ctx.method === "GET" && ctx.path === "/b") {
                        ctx.status = 200;
                        ctx.response.res.write(JSON.stringify(ctx.header));
                        ctx.request.req.pipe(ctx.response.res);
                    }
                });

                await app.bind();

                const opts = url.parse(`http://localhost:${app.address().port}/a`);
                opts.method = originalMethod;
                opts.headers = {
                    other: "value",
                    "content-type": "application/javascript",
                    "Content-Length": fs.readFileSync(__filename).byteLength
                };

                const res = await new Promise((resolve, reject) => {
                    const req = http.request(opts, (res) => {
                        const chunks = [];
                        res.on("data", (chunk) => {
                            chunks.push(chunk);
                        });
                        res.on("end", () => {
                            resolve(Buffer.concat(chunks));
                        });
                    }).on("error", reject);
                    fs.createReadStream(__filename).pipe(req);
                });

                const body = JSON.parse(res.toString());
                assert.equal(body.host, `localhost:${app.address().port}`);
                assert.equal(body.other, "value");
                assert.equal(body["content-type"], undefined);
                assert.equal(body["content-length"], undefined);
            });
        };
        itDropsBodyAndHeaders("POST");
        itDropsBodyAndHeaders("PUT");
    });

    describe("when the followRedirects option is set to false", () => {
        it("does not redirect", async () => {
            const app = createHttpServer();
            app.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                switch (ctx.path) {
                    case "/a":
                        return ctx.redirect("/b");
                    case "/b":
                        ctx.body = { a: "b" };
                }
            });

            await app.bind();

            const res = await httpGetJSON(app, "/a", { follow: false });
            expect(res).to.include({
                status: 302,
                responseUrl: getUrl(app, "/a")
            });
        });
    });

    describe("should choose the right agent per protocol", () => {
        it("(https -> http -> https)", async () => {
            const app = createHttpServer();
            const app2 = createHttpServer();

            app.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                switch (ctx.path) {
                    case "/a":
                        return ctx.redirect(`http://localhost:${app2.address().port}/b`);
                    case "/c":
                        ctx.body = { yes: "no" };
                        break;
                }
            });

            app2.use((ctx) => {
                if (ctx.method !== "GET") {
                    ctx.throw(404);
                }
                switch (ctx.path) {
                    case "/b":
                        return ctx.redirect(`https://localhost:${app.address().port}/c`);
                }
            });

            await app.bind(httpsOptions);

            await app2.bind();


            const addRequestLogging = function (agent) {
                agent._requests = [];
                agent._addRequest = agent.addRequest;
                agent.addRequest = function (request, options) {
                    this._requests.push(options.path);
                    this._addRequest(request, options);
                };
                return agent;
            };

            const httpAgent = addRequestLogging(new http.Agent());
            const httpsAgent = addRequestLogging(new https.Agent());

            const res = await new Promise((resolve, reject) => {
                const opts = url.parse(`https://localhost:${app.address().port}/a`);
                opts.ca = ca;
                opts.agents = { http: httpAgent, https: httpsAgent };

                https.get(opts, (res) => {
                    const chunks = [];
                    res.on("data", (chunk) => {
                        chunks.push(chunk);
                    });
                    res.on("end", () => {
                        resolve({
                            data: JSON.parse(Buffer.concat(chunks)),
                            responseUrl: res.responseUrl
                        });
                    });

                    res.on("error", reject);
                });
            });

            assert.deepEqual(httpAgent._requests, ["/b"]);
            assert.deepEqual(httpsAgent._requests, ["/a", "/c"]);
            assert.deepEqual(res.data, { yes: "no" });
            assert.deepEqual(res.responseUrl, `https://localhost:${app.address().port}/c`);
        });
    });

    it("should resume streams when redirects", async () => {
        const app1 = createHttpServer();
        app1.use((ctx) => {
            if (ctx.method !== "GET") {
                ctx.throw(404);
            }
            switch (ctx.path) {
                case "/a":
                    return ctx.redirect("/b");
                case "/b":
                    return ctx.redirect("/c");
                case "/c":
                    return ctx.redirect("/d");
                case "/d":
                    return ctx.redirect("/e");
                case "/e":
                    return ctx.redirect("/f");
                case "/f":
                    ctx.body = { a: "b" };
            }
        });


        await app1.bind();

        const addr = app1.address();

        const agent = new adone.std.http.Agent({
            keepAlive: true
        });

        const s = spy();

        agent.on("free", s);

        await adone.net.http.client.request.get(`http://localhost:${addr.port}/a`, {
            httpAgent: agent
        });

        expect(s).to.have.callCount(6); // it must free the socket, not "lock" it
    });
});

