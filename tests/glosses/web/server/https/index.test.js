const {
    web: { server },
    std: { fs, path }
} = adone;

const sget = require("simple-get").concat;

describe("common", () => {

    let fastify;

    try {
        fastify = server({
            https: {
                key: fs.readFileSync(path.join(__dirname, "fastify.key")),
                cert: fs.readFileSync(path.join(__dirname, "fastify.cert"))
            }
        });
        // t.pass("Key/cert successfully loaded");
    } catch (e) {
        assert.fail("Key/cert loading failed", e);
    }


    it("https get", () => {
        try {
            fastify.get("/", (req, reply) => {
                reply.code(200).send({ hello: "world" });
            });
        } catch (e) {
            assert.fail();
        }
    });

    it("https get request", (done) => {
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
            
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
    });
});
