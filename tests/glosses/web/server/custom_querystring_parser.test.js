const {
    web: { server }
} = adone;

const querystring = require("querystring");
const sget = require("simple-get").concat;

describe("custom querystring parser", () => {
    it("Custom querystring parser", (done) => {
        const fastify = server({
            querystringParser(str) {
                assert.strictEqual(str, "foo=bar&baz=faz");
                return querystring.parse(str);
            }
        });

        expect(2).checks(() => {
            fastify.close();
            done();
        })

        fastify.get("/", (req, reply) => {
            assert.deepEqual(req.query, {
                foo: "bar",
                baz: "faz"
            });
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err, address) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `${address}?foo=bar&baz=faz`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                expect(true).to.be.ok.mark();
            });

            fastify.inject({
                method: "GET",
                url: `${address}?foo=bar&baz=faz`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("Custom querystring parser should be called also if there is nothing to parse", (done) => {
        const fastify = server({
            querystringParser(str) {
                assert.strictEqual(str, "");
                return querystring.parse(str);
            }
        });

        expect(2).checks(() => {
            fastify.close();
            done();
        });

        fastify.get("/", (req, reply) => {
            assert.deepEqual(req.query, {});
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err, address) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: address
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                expect(true).to.be.ok.mark();
            });

            fastify.inject({
                method: "GET",
                url: address
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("Querystring without value", (done) => {
        const fastify = server({
            querystringParser(str) {
                assert.strictEqual(str, "foo");
                return querystring.parse(str);
            }
        });

        expect(2).checks(() => {
            done();
        });

        fastify.get("/", (req, reply) => {
            assert.deepEqual(req.query, { foo: "" });
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err, address) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `${address}?foo`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                expect(true).to.be.ok.mark();
            });

            fastify.inject({
                method: "GET",
                url: `${address}?foo`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("Custom querystring parser should be a function", (done) => {
        try {
            server({
                querystringParser: 10
            });
            assert.fail("Should throw");
        } catch (err) {
            assert.strictEqual(
                err.message,
                "querystringParser option should be a function, instead got 'number'"
            );
            done();
        }
    });
});
