const {
    http: { server },
    std: { path, fs }
} = adone;

const h2url = require("h2url");
const msg = { hello: "world" };

describe("secure", () => {
    let fastify;
    before((done) => {
        try {
            fastify = server({
                http2: true,
                https: {
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

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
            done();
        });
    });

    it("https get request", async () => {
        const url = `https://localhost:${fastify.server.address().port}`;
        const res = await h2url.concat({ url });

        assert.strictEqual(res.headers[":status"], 200);
        assert.strictEqual(res.headers["content-length"], `${JSON.stringify(msg).length}`);
        assert.deepEqual(JSON.parse(res.body), msg);
    });
});
