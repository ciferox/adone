const sget = require("simple-get").concat;
const fastify = adone.web.server();

const opts = {
    schema: {
        response: {
            "2xx": {
                type: "object",
                properties: {
                    hello: {
                        type: "string"
                    }
                }
            }
        }
    }
};

describe("promises", () => {

    fastify.get("/return", opts, (req, reply) => {
        const promise = new Promise((resolve, reject) => {
            resolve({ hello: "world" });
        });
        return promise;
    });

    fastify.get("/return-error", opts, (req, reply) => {
        const promise = new Promise((resolve, reject) => {
            reject(new Error("some error"));
        });
        return promise;
    });

    fastify.get("/double", (req, reply) => {
        setTimeout(() => {
            // this should not throw
            reply.send({ hello: "world" });
        }, 20);
        return Promise.resolve({ hello: "42" });
    });

    before((done) => {
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
            done();
        });
    });

    it("shorthand - sget return promise es6 get", (done) => {
        sget({
            method: "GET",
            url: `http://localhost:${fastify.server.address().port}/return`
        }, (err, response, body) => {
            assert.notExists(err);
            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.headers["content-length"], `${body.length}`);
            assert.deepEqual(JSON.parse(body), { hello: "world" });
            done();
        });
    });

    it("shorthand - sget promise es6 get return error", (done) => {
        sget({
            method: "GET",
            url: `http://localhost:${fastify.server.address().port}/return-error`
        }, (err, response, body) => {
            assert.notExists(err);
            assert.strictEqual(response.statusCode, 500);
            done();
        });
    });

    it("sget promise double send", (done) => {
        sget({
            method: "GET",
            url: `http://localhost:${fastify.server.address().port}/double`
        }, (err, response, body) => {
            assert.notExists(err);
            assert.strictEqual(response.statusCode, 200);
            assert.deepEqual(JSON.parse(body), { hello: "42" });
            done();
        });
    });
});
