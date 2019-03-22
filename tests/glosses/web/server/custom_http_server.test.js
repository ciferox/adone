const {
    web: { server }
} = adone;

const http = require("http");
const sget = require("simple-get").concat;

it("Should support a custom http server", (done) => {
    expect(3).checks(() => { 
        fastify.close();
        done();
    });

    const serverFactory = (handler, opts) => {
        assert.ok(opts.serverFactory);
        expect(true).to.be.ok.mark();

        const server = http.createServer((req, res) => {
            req.custom = true;
            handler(req, res);
        });

        return server;
    };

    const fastify = server({ serverFactory });


    fastify.get("/", (req, reply) => {
        assert.ok(req.raw.custom);
        expect(true).to.be.ok.mark();
        reply.send({ hello: "world" });
    });

    fastify.listen(0, (err) => {
        assert.notExists(err);

        sget({
            method: "GET",
            url: `http://localhost:${fastify.server.address().port}`
        }, (err, response, body) => {
            assert.notExists(err);
            assert.strictEqual(response.statusCode, 200);
            assert.deepEqual(JSON.parse(body), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });
});
