const {
    http: { server },
    std: { https, fs, path }
} = adone;

const sget = require("simple-get").concat;

describe("custom https server", () => {
    it("Should support a custom https server", (done) => {
        const serverFactory = (handler, opts) => {
            assert.ok(opts.serverFactory);

            const options = {
                key: fs.readFileSync(path.join(__dirname, "fastify.key")),
                cert: fs.readFileSync(path.join(__dirname, "fastify.cert"))
            };

            const server = https.createServer(options, (req, res) => {
                req.custom = true;
                handler(req, res);
            });

            return server;
        };

        const fastify = server({ serverFactory });

        fastify.get("/", (req, reply) => {
            assert.ok(req.raw.custom);
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `https://localhost:${fastify.server.address().port}`,
                rejectUnauthorized: false
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(JSON.parse(body), { hello: "world" });

                fastify.close();
                done();
            });
        });
    });
});
