const {
    http: { server }
} = adone;

const h2url = require("h2url");
const msg = { hello: "world" };

describe("unknown http method", () => {
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

    it("http UNKNOWN_METHOD request", async () => {
        const url = `http://localhost:${fastify.server.address().port}`;
        const res = await h2url.concat({ url, method: "UNKNOWN_METHOD" });

        assert.strictEqual(res.headers[":status"], 404);
        assert.deepEqual(JSON.parse(res.body), {
            statusCode: 404,
            error: "Not Found",
            message: "Not Found"
        });
    });
});    
