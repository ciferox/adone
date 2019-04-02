const sget = require("simple-get").concat;
const Ajv = require("ajv");
const Joi = require("joi");

module.exports.payloadMethod = function (method) {
    const fastify = adone.http.server();
    const upMethod = method.toUpperCase();
    const loMethod = method.toLowerCase();

    const opts = {
        schema: {
            body: {
                type: "object",
                properties: {
                    hello: {
                        type: "integer"
                    }
                }
            }
        }
    };

    const ajv = new Ajv({ coerceTypes: true, removeAdditional: true });
    const optsWithCustomValidator = {
        schema: {
            body: {
                type: "object",
                properties: {
                    hello: {
                        type: "integer"
                    }
                },
                additionalProperties: false
            }
        },
        schemaCompiler(schema) {
            return ajv.compile(schema);
        }
    };

    const optsWithJoiValidator = {
        schema: {
            body: Joi.object().keys({
                hello: Joi.string().required()
            }).required()
        },
        schemaCompiler(schema) {
            return schema.validate.bind(schema);
        }
    };

    it(`${upMethod} can be created`, (done) => {
        try {
            fastify[loMethod]("/", opts, (req, reply) => {
                reply.send(req.body);
            });
            fastify[loMethod]("/custom", optsWithCustomValidator, (req, reply) => {
                reply.send(req.body);
            });
            fastify[loMethod]("/joi", optsWithJoiValidator, (req, reply) => {
                reply.send(req.body);
            });

            fastify.register((fastify2, opts, next) => {
                fastify2.setSchemaCompiler(function schema(schema) {
                    return (body) => ({ error: new Error("From custom schema compiler!") });
                });
                const withInstanceCustomCompiler = {
                    schema: {
                        body: {
                            type: "object",
                            properties: {},
                            additionalProperties: false
                        }
                    }
                };
                fastify2[loMethod]("/plugin", withInstanceCustomCompiler, (req, reply) => reply.send({ hello: "never here!" }));

                const optsWithCustomValidator2 = {
                    schema: {
                        body: {
                            type: "object",
                            properties: {},
                            additionalProperties: false
                        }
                    },
                    schemaCompiler(schema) {
                        return function (body) {
                            return { error: new Error("Always fail!") };
                        };
                    }
                };
                fastify2[loMethod]("/plugin/custom", optsWithCustomValidator2, (req, reply) => reply.send({ hello: "never here!" }));

                next();
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });


    describe(upMethod, () => {
        before((done) => {
            fastify.listen(0, (err) => {
                if (err) {
                    assert.notExists(err);
                }

                fastify.server.unref();
                done();
            });
        });

        it(`${upMethod} - correctly replies`, (done) => {
            if (upMethod === "HEAD") {
                sget({
                    method: upMethod,
                    url: `http://localhost:${fastify.server.address().port}`
                }, (err, response) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    done();
                });
            } else {
                sget({
                    method: upMethod,
                    url: `http://localhost:${fastify.server.address().port}`,
                    body: {
                        hello: 42
                    },
                    json: true
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.deepEqual(body, { hello: 42 });
                    done();
                });
            }
        });

        it(`${upMethod} - 400 on bad parameters`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                body: {
                    hello: "world"
                },
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                assert.deepEqual(body, {
                    error: "Bad Request",
                    message: "body.hello should be integer",
                    statusCode: 400
                });
                done();
            });
        });

        it(`${upMethod} - input-validation coerce`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                body: {
                    hello: "42"
                },
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body, { hello: 42 });
                done();
            });
        });

        it(`${upMethod} - input-validation custom schema compiler`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}/custom`,
                body: {
                    hello: "42",
                    world: 55
                },
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body, { hello: 42 });
                done();
            });
        });

        it.todo(`${upMethod} - input-validation joi schema compiler ok`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}/joi`,
                body: {
                    hello: 42
                },
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body, { hello: 42 });
                done();
            });
        });

        it(`${upMethod} - input-validation joi schema compiler ko`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}/joi`,
                body: {
                    hello: 44
                },
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                assert.deepEqual(body, {
                    error: "Bad Request",
                    message: 'child "hello" fails because ["hello" must be a string]',
                    statusCode: 400
                });
                done();
            });
        });

        it(`${upMethod} - input-validation instance custom schema compiler encapsulated`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}/plugin`,
                body: {},
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                assert.deepEqual(body, {
                    error: "Bad Request",
                    message: "From custom schema compiler!",
                    statusCode: 400
                });
                done();
            });
        });

        it(`${upMethod} - input-validation custom schema compiler encapsulated`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}/plugin/custom`,
                body: {},
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                assert.deepEqual(body, {
                    error: "Bad Request",
                    message: "Always fail!",
                    statusCode: 400
                });
                done();
            });
        });
    });
};
