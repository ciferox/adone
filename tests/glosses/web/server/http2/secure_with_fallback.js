const {
    web: { server },
    std: { fs, path }
} = adone;

const h2url = require("h2url");
const sget = require("simple-get").concat;
const msg = { hello: "world" };

describe("secure with fallback", () => {
    let fastify;

    before((done) => {
        try {
            fastify = server({
                http2: true,
                https: {
                    allowHTTP1: true,
                    key: fs.readFileSync(path.join(__dirname, "..", "https", "fastify.key")),
                    cert: fs.readFileSync(path.join(__dirname, "..", "https", "fastify.cert"))
                }
            });
            // t.pass("Key/cert successfully loaded");
        } catch (e) {
            assert.fail("Key/cert loading failed", e);
        }

        fastify.get("/", (req, reply) => {
            reply.code(200).send(msg);
        });

        fastify.post("/", (req, reply) => {
            reply.code(200).send(req.body);
        });

        fastify.get("/error", async (req, reply) => {
            throw new Error("kaboom");
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
            done();
        });
    });

    it("https get error", async () => {
        const url = `https://localhost:${fastify.server.address().port}/error`;
        const res = await h2url.concat({ url });

        assert.strictEqual(res.headers[":status"], 500);
    });

    it("https post", async () => {
        const url = `https://localhost:${fastify.server.address().port}`;
        const res = await h2url.concat({
            url,
            method: "POST",
            body: JSON.stringify({ hello: "http2" }),
            headers: {
                "content-type": "application/json"
            }
        });

        assert.strictEqual(res.headers[":status"], 200);
        assert.deepEqual(JSON.parse(res.body), { hello: "http2" });
    });

    it("https get request", async () => {
        const url = `https://localhost:${fastify.server.address().port}`;
        const res = await h2url.concat({ url });

        assert.strictEqual(res.headers[":status"], 200);
        assert.strictEqual(res.headers["content-length"], `${JSON.stringify(msg).length}`);
        assert.deepEqual(JSON.parse(res.body), msg);
    });

    it("http1 get request", (done) => {
        sget({
            method: "GET",
            url: `https://localhost:${fastify.server.address().port}`,
            rejectUnauthorized: false
        }, (err, response, body) => {
            assert.notExists(err);
            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.headers["content-length"], `${body.length}`);
            assert.deepEqual(JSON.parse(body), { hello: "world" });
            done();
        });
    });

    it("http1 get error", (done) => {
        sget({
            method: "GET",
            url: `https://localhost:${fastify.server.address().port}/error`,
            rejectUnauthorized: false
        }, (err, response, body) => {
            assert.notExists(err);
            assert.strictEqual(response.statusCode, 500);
            done();
        });
    });
});

