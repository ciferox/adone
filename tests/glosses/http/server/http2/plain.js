const {
    http: { server }
} = adone;

const h2url = require("h2url");
const msg = { hello: "world" };

describe("plain", () => {
    let fastify;

    before((done) => {
        try {
            fastify = server({
                http2: true
            });
            // t.pass("http2 successfully loaded");
        } catch (e) {
            assert.fail("http2 loading failed", e);
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

    it("http get request", async () => {
        const url = `http://localhost:${fastify.server.address().port}`;
        const res = await h2url.concat({ url });

        assert.strictEqual(res.headers[":status"], 200);
        assert.strictEqual(res.headers["content-length"], `${JSON.stringify(msg).length}`);

        assert.deepEqual(JSON.parse(res.body), msg);
    });
});
