const {
    web: { server }
} = adone;

const Joi = require("joi");

const schema = {
    body: {
        type: "object",
        properties: {
            name: { type: "string" },
            work: { type: "string" }
        },
        required: ["name", "work"]
    }
};

describe("validation error handling", () => {
    it("should work with valid payload", (done) => {
        const fastify = server();

        fastify.post("/", { schema }, (req, reply) => {
            reply.code(200).send(req.body.name);
        });

        fastify.inject({
            method: "POST",
            payload: {
                name: "michelangelo",
                work: "sculptor, painter, architect and poet"
            },
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(res.payload, "michelangelo");
            assert.strictEqual(res.statusCode, 200);
            done();
        });
    });

    it("should fail immediately with invalid payload", (done) => {
        const fastify = server();

        fastify.post("/", { schema }, (req, reply) => {
            reply.code(200).send(req.body.name);
        });

        fastify.inject({
            method: "POST",
            payload: {
                hello: "michelangelo"
            },
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), {
                statusCode: 400,
                error: "Bad Request",
                message: "body should have required property 'name', body should have required property 'work'"
            });
            assert.strictEqual(res.statusCode, 400);
            done();
        });
    });

    it("should be able to use setErrorHandler specify custom validation error", (done) => {
        const fastify = server();

        fastify.post("/", { schema }, (req, reply) => {
            t.fail("should not be here");
            reply.code(200).send(req.body.name);
        });

        fastify.setErrorHandler((error, request, reply) => {
            if (error.validation) {
                reply.status(422).send(new Error("validation failed"));
            }
        });

        fastify.inject({
            method: "POST",
            payload: {
                hello: "michelangelo"
            },
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), {
                statusCode: 422,
                error: "Unprocessable Entity",
                message: "validation failed"
            });
            assert.strictEqual(res.statusCode, 422);
            done();
        });
    });

    it("should be able to attach validation to request", (done) => {
        const fastify = server();

        fastify.post("/", { schema, attachValidation: true }, (req, reply) => {
            reply.code(400).send(req.validationError.validation);
        });

        fastify.inject({
            method: "POST",
            payload: {
                hello: "michelangelo"
            },
            url: "/"
        }, (err, res) => {
            assert.notExists(err);

            assert.deepEqual(JSON.parse(res.payload), [{
                keyword: "required",
                dataPath: "",
                schemaPath: "#/required",
                params: { missingProperty: "name" },
                message: "should have required property 'name'"
            },
            {
                keyword: "required",
                dataPath: "",
                schemaPath: "#/required",
                params: { missingProperty: "work" },
                message: "should have required property 'work'"
            }]);
            assert.strictEqual(res.statusCode, 400);
            done();
        });
    });

    it("should respect when attachValidation is explicitly set to false", (done) => {
        const fastify = server();

        fastify.post("/", { schema, attachValidation: false }, (req, reply) => {
            t.fail("should not be here");
            reply.code(200).send(req.validationError.validation);
        });

        fastify.inject({
            method: "POST",
            payload: {
                hello: "michelangelo"
            },
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), {
                statusCode: 400,
                error: "Bad Request",
                message: "body should have required property 'name', body should have required property 'work'"
            });
            assert.strictEqual(res.statusCode, 400);
            done();
        });
    });

    it("Attached validation error should take precendence over setErrorHandler", (done) => {
        const fastify = server();

        fastify.post("/", { schema, attachValidation: true }, (req, reply) => {
            reply.code(400).send(`Attached: ${req.validationError}`);
        });

        fastify.setErrorHandler((error, request, reply) => {
            t.fail("should not be here");
            if (error.validation) {
                reply.status(422).send(new Error("validation failed"));
            }
        });

        fastify.inject({
            method: "POST",
            payload: {
                hello: "michelangelo"
            },
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(res.payload, "Attached: Error: body should have required property 'name', body should have required property 'work'");
            assert.strictEqual(res.statusCode, 400);
            done();
        });
    });

    it("should handle response validation error", (done) => {
        const response = {
            200: {
                type: "object",
                required: ["name", "work"],
                properties: {
                    name: { type: "string" },
                    work: { type: "string" }
                }
            }
        };

        const fastify = server();

        fastify.get("/", { schema: { response } }, (req, reply) => {
            try {
                reply.code(200).send({ work: "actor" });
            } catch (error) {
                reply.code(500).send(error);
            }
        });

        fastify.inject({
            method: "GET",
            payload: {},
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, '{"statusCode":500,"error":"Internal Server Error","message":"name is required!"}');
            done();
        });
    });

    it("should handle response validation error with promises", (done) => {
        const response = {
            200: {
                type: "object",
                required: ["name", "work"],
                properties: {
                    name: { type: "string" },
                    work: { type: "string" }
                }
            }
        };

        const fastify = server();

        fastify.get("/", { schema: { response } }, (req, reply) => {
            return Promise.resolve({ work: "actor" });
        });

        fastify.inject({
            method: "GET",
            payload: {},
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, '{"statusCode":500,"error":"Internal Server Error","message":"name is required!"}');
            done();
        });
    });

    it("should return a defined output message parsing AJV errors", (done) => {
        const body = {
            type: "object",
            required: ["name", "work"],
            properties: {
                name: { type: "string" },
                work: { type: "string" }
            }
        };

        const fastify = server();

        fastify.post("/", { schema: { body } }, (req, reply) => {
            t.fail();
        });

        fastify.inject({
            method: "POST",
            payload: {},
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, "{\"statusCode\":400,\"error\":\"Bad Request\",\"message\":\"body should have required property 'name', body should have required property 'work'\"}");
            done();
        });
    });

    it("should return a defined output message parsing JOI errors", (done) => {
        const body = Joi.object().keys({
            name: Joi.string().required(),
            work: Joi.string().required()
        }).required();

        const fastify = server();

        fastify.post("/", {
            schema: { body },
            schemaCompiler: (schema) => (data) => Joi.validate(data, schema)
        },
            (req, reply) => {
                t.fail();
            });

        fastify.inject({
            method: "POST",
            payload: {},
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, "{\"statusCode\":400,\"error\":\"Bad Request\",\"message\":\"child \\\"name\\\" fails because [\\\"name\\\" is required]\"}");
            done();
        });
    });

    it("should return a defined output message parsing JOI error details", (done) => {
        const body = Joi.object().keys({
            name: Joi.string().required(),
            work: Joi.string().required()
        }).required();

        const fastify = server();

        fastify.post("/", {
            schema: { body },
            schemaCompiler: (schema) => (data) => {
                const validation = Joi.validate(data, schema);
                return { error: validation.error.details };
            }
        },
            (req, reply) => {
                t.fail();
            });

        fastify.inject({
            method: "POST",
            payload: {},
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, "{\"statusCode\":400,\"error\":\"Bad Request\",\"message\":\"body \\\"name\\\" is required\"}");
            done();
        });
    });
});
