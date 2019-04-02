const {
    http: { server }
} = adone;
const symbols = server.symbol;

describe("shared schemas", () => {
    it("Should expose addSchema function", () => {
        const fastify = server();
        assert.equal(typeof fastify.addSchema, "function");
    });

    it("Should expose getSchemas function", () => {
        const fastify = server();
        assert.equal(typeof fastify.getSchemas, "function");
    });

    it("The schemas should be added to an internal store", () => {
        const fastify = server();

        const schema = { $id: "id", my: "schema" };
        fastify.addSchema(schema);
        assert.deepEqual(fastify[symbols.kSchemas].store, { id: schema });
    });

    it("The schemas should be accessible via getSchemas", () => {
        const fastify = server();

        const schemas = [
            { $id: "id", my: "schema" },
            { $id: "abc", my: "schema" },
            { $id: "bcd", my: "schema", properties: { a: "a", b: 1 } }
        ];
        const expected = {};
        schemas.forEach((schema) => {
            expected[schema.$id] = schema;
            fastify.addSchema(schema);
        });
        assert.deepEqual(fastify.getSchemas(), expected);
    });

    it("Should throw if the $id property is missing", (done) => {
        const fastify = server();

        try {
            fastify.addSchema({ type: "string" });
        } catch (err) {
            assert.equal(err.code, "FST_ERR_SCH_MISSING_ID");
            assert.equal(err.message, "FST_ERR_SCH_MISSING_ID: Missing schema $id property");
            done();
        }
    });

    it("Cannot add multiple times the same id", (done) => {
        const fastify = server();

        fastify.addSchema({ $id: "id" });
        try {
            fastify.addSchema({ $id: "id" });
        } catch (err) {
            assert.equal(err.code, "FST_ERR_SCH_ALREADY_PRESENT");
            assert.equal(err.message, "FST_ERR_SCH_ALREADY_PRESENT: Schema with id 'id' already declared!");
            done();
        }
    });

    it("Should throw of the schema does not exists", (done) => {
        const fastify = server();

        fastify.route({
            method: "GET",
            url: "/:id",
            schema: {
                params: "test#"
            },
            handler: (req, reply) => {
                reply.send(typeof req.params.id);
            }
        });

        fastify.ready((err) => {
            assert.equal(err.code, "FST_ERR_SCH_NOT_PRESENT");
            assert.equal(err.message, "FST_ERR_SCH_NOT_PRESENT: Schema with id 'test' does not exist!");
            done();
        });
    });

    it("Should use a stored schema", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "test",
            type: "object",
            properties: {
                id: { type: "number" }
            }
        });

        fastify.route({
            method: "GET",
            url: "/:id",
            schema: {
                params: "test#"
            },
            handler: (req, reply) => {
                reply.send(typeof req.params.id);
            }
        });

        fastify.inject({
            method: "GET",
            url: "/123"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, "number");
            done();
        });
    });

    it("Should work with nested ids", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "test",
            type: "object",
            properties: {
                id: { type: "number" }
            }
        });

        fastify.addSchema({
            $id: "greetings",
            type: "string"
        });

        fastify.route({
            method: "POST",
            url: "/:id",
            schema: {
                params: "test#",
                body: {
                    type: "object",
                    properties: {
                        hello: "greetings#"
                    }
                }
            },
            handler: (req, reply) => {
                reply.send(typeof req.params.id);
            }
        });

        fastify.inject({
            method: "POST",
            url: "/123",
            payload: {
                hello: "world"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, "number");
            done();
        });
    });

    it("Use the same schema across multiple routes", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.addSchema({
            $id: "test",
            type: "object",
            properties: {
                id: { type: "number" }
            }
        });

        fastify.route({
            method: "GET",
            url: "/first/:id",
            schema: {
                params: "test#"
            },
            handler: (req, reply) => {
                reply.send(typeof req.params.id);
            }
        });

        fastify.route({
            method: "GET",
            url: "/second/:id",
            schema: {
                params: "test#"
            },
            handler: (req, reply) => {
                reply.send(typeof req.params.id);
            }
        });

        fastify.inject({
            method: "GET",
            url: "/first/123"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, "number");
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/second/123"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, "number");
            expect(true).to.be.ok.mark();
        });
    });

    it("Encapsulation should intervene", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            instance.addSchema({
                $id: "encapsulation",
                type: "object",
                properties: {
                    id: { type: "number" }
                }
            });
            next();
        });

        fastify.register((instance, opts, next) => {
            instance.route({
                method: "GET",
                url: "/:id",
                schema: {
                    params: "encapsulation#"
                },
                handler: (req, reply) => {
                    reply.send(typeof req.params.id);
                }
            });
            next();
        });

        fastify.ready((err) => {
            assert.equal(err.code, "FST_ERR_SCH_NOT_PRESENT");
            assert.equal(err.message, "FST_ERR_SCH_NOT_PRESENT: Schema with id 'encapsulation' does not exist!");
            done();
        });
    });

    it("Encapsulation isolation", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            instance.addSchema({ $id: "id" });
            next();
        });

        fastify.register((instance, opts, next) => {
            instance.addSchema({ $id: "id" });
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it("Encapsulation isolation for getSchemas", (done) => {
        const fastify = server();

        let pluginDeepOneSide;
        let pluginDeepOne;
        let pluginDeepTwo;

        const schemas = {
            z: { $id: "z", my: "schema" },
            a: { $id: "a", my: "schema" },
            b: { $id: "b", my: "schema" },
            c: { $id: "c", my: "schema", properties: { a: "a", b: 1 } }
        };

        fastify.addSchema(schemas.z);

        fastify.register((instance, opts, next) => {
            instance.addSchema(schemas.a);
            pluginDeepOneSide = instance;
            next();
        });

        fastify.register((instance, opts, next) => {
            instance.addSchema(schemas.b);
            instance.register((subinstance, opts, next) => {
                subinstance.addSchema(schemas.c);
                pluginDeepTwo = subinstance;
                next();
            });
            pluginDeepOne = instance;
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            assert.deepEqual(fastify.getSchemas(), { z: schemas.z });
            assert.deepEqual(pluginDeepOneSide.getSchemas(), { z: schemas.z, a: schemas.a });
            assert.deepEqual(pluginDeepOne.getSchemas(), { z: schemas.z, b: schemas.b });
            assert.deepEqual(pluginDeepTwo.getSchemas(), { z: schemas.z, b: schemas.b, c: schemas.c });
            done();
        });
    });

    it("Encapsulation isolation for $ref to shared schema", (done) => {
        const fastify = server();

        expect(4).checks(done);

        const commonSchemaAbsoluteUri = {
            $id: "http://example.com/asset.json",
            type: "object",
            definitions: {
                id: {
                    $id: "#uuid",
                    type: "string",
                    format: "uuid"
                },
                email: {
                    $id: "#email",
                    type: "string",
                    format: "email"
                }
            }
        };

        fastify.register((instance, opts, next) => {
            instance.addSchema(commonSchemaAbsoluteUri);
            instance.route({
                method: "POST",
                url: "/id",
                schema: {
                    body: {
                        type: "object",
                        properties: { id: { $ref: "http://example.com/asset.json#uuid" } },
                        required: ["id"]
                    }
                },
                handler: (req, reply) => {
                    reply.send("id is ok");
                }
            });
            next();
        });

        fastify.register((instance, opts, next) => {
            instance.addSchema(commonSchemaAbsoluteUri);
            instance.route({
                method: "POST",
                url: "/email",
                schema: {
                    body: {
                        type: "object",
                        properties: { email: { $ref: "http://example.com/asset.json#/definitions/email" } },
                        required: ["email"]
                    }
                },
                handler: (req, reply) => {
                    reply.send("email is ok");
                }
            });
            next();
        });

        const requestId = { id: "550e8400-e29b-41d4-a716-446655440000" };
        const requestEmail = { email: "foo@bar.it" };

        fastify.inject({
            method: "POST",
            url: "/id",
            payload: requestId
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });
        fastify.inject({
            method: "POST",
            url: "/id",
            payload: requestEmail
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 400);
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Bad Request",
                message: "body should have required property 'id'",
                statusCode: 400
            });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "POST",
            url: "/email",
            payload: requestEmail
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });
        fastify.inject({
            method: "POST",
            url: "/email",
            payload: requestId
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 400);
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Bad Request",
                message: "body should have required property 'email'",
                statusCode: 400
            });
            expect(true).to.be.ok.mark();
        });
    });

    it("JSON Schema validation keywords", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "test",
            type: "object",
            properties: {
                ip: {
                    type: "string",
                    format: "ipv4"
                }
            }
        });

        fastify.route({
            method: "GET",
            url: "/:id",
            schema: {
                params: "test#"
            },
            handler: (req, reply) => {
                reply.send(typeof req.params.id);
            }
        });

        fastify.inject({
            method: "GET",
            url: "/127.0.0.1"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, "string");
            done();
        });
    });

    it("Nested id calls", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "test",
            type: "object",
            properties: {
                ip: {
                    type: "string",
                    format: "ipv4"
                }
            }
        });

        fastify.addSchema({
            $id: "hello",
            type: "object",
            properties: {
                host: "test#"
            }
        });

        fastify.route({
            method: "POST",
            url: "/",
            schema: {
                body: "hello#"
            },
            handler: (req, reply) => {
                reply.send(typeof req.body.host.ip);
            }
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: {
                host: {
                    ip: "127.0.0.1"
                }
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, "string");
            done();
        });
    });

    it("Use the same schema id in diferent places", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "test",
            type: "object",
            properties: {
                id: { type: "number" }
            }
        });

        fastify.route({
            method: "GET",
            url: "/:id",
            schema: {
                response: {
                    200: {
                        type: "array",
                        items: "test#"
                    }
                }
            },
            handler: () => { }
        });

        fastify.route({
            method: "POST",
            url: "/:id",
            schema: {
                body: "test#",
                response: {
                    200: "test#"
                }
            },
            handler: () => { }
        });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it("Use shared schema and $ref with $id ($ref to $id)", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "test",
            type: "object",
            properties: {
                id: { type: "number" }
            }
        });

        const body = {
            $schema: "http://json-schema.org/draft-07/schema#",
            $id: "http://foo/user",
            type: "object",
            definitions: {
                address: {
                    $id: "#address",
                    type: "object",
                    properties: {
                        city: { type: "string" }
                    }
                }
            },
            properties: {
                test: "test#",
                address: { $ref: "#address" }
            }
        };

        fastify.route({
            method: "POST",
            url: "/",
            schema: {
                body,
                response: {
                    200: "test#"
                }
            },
            handler: (req, reply) => {
                reply.send(req.body.test);
            }
        });

        const id = Date.now();
        fastify.inject({
            method: "POST",
            url: "/",
            payload: {
                address: { city: "New Node" },
                test: { id }
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { id });
            done();
        });
    });

    it("Use shared schema and $ref with $id in response ($ref to $id)", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "test",
            type: "object",
            properties: {
                id: { type: "number" }
            }
        });

        const body = {
            $schema: "http://json-schema.org/draft-07/schema#",
            $id: "http://foo/user",
            type: "object",
            definitions: {
                address: {
                    $id: "#address",
                    type: "object",
                    properties: {
                        city: { type: "string" }
                    }
                }
            },
            properties: {
                test: "test#",
                address: { $ref: "#address" }
            },
            required: ["address", "test"]
        };

        fastify.route({
            method: "POST",
            url: "/",
            schema: {
                body,
                response: {
                    200: body
                }
            },
            handler: (req, reply) => {
                req.body.removeThis = "it should not be serialized";
                reply.send(req.body);
            }
        });

        const payload = {
            address: { city: "New Node" },
            test: { id: Date.now() }
        };
        fastify.inject({
            method: "POST",
            url: "/",
            payload
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), payload);
            done();
        });
    });

    // https://github.com/fastify/fastify/issues/1043
    it("The schema resolver should clean the $id key before passing it to the compiler", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "first",
            type: "object",
            properties: {
                first: {
                    type: "number"
                }
            }
        });

        fastify.addSchema({
            $id: "second",
            type: "object",
            allOf: [
                {
                    type: "object",
                    properties: {
                        second: {
                            type: "number"
                        }
                    }
                },
                "first#"
            ]
        });

        fastify.route({
            url: "/",
            method: "GET",
            schema: {
                description: "get",
                body: "second#",
                response: {
                    200: "second#"
                }
            },
            handler: (request, reply) => {
                reply.send({ hello: "world" });
            }
        });

        fastify.route({
            url: "/",
            method: "PATCH",
            schema: {
                description: "patch",
                body: "first#",
                response: {
                    200: "first#"
                }
            },
            handler: (request, reply) => {
                reply.send({ hello: "world" });
            }
        });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it("Get schema anyway should not add `properties` if allOf is present", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "first",
            type: "object",
            properties: {
                first: { type: "number" }
            }
        });

        fastify.addSchema({
            $id: "second",
            type: "object",
            allOf: [
                {
                    type: "object",
                    properties: {
                        second: { type: "number" }
                    }
                },
                "first#"
            ]
        });

        fastify.route({
            url: "/",
            method: "GET",
            schema: {
                querystring: "second#",
                response: { 200: "second#" }
            },
            handler: () => { }
        });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it("Get schema anyway should not add `properties` if oneOf is present", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "first",
            type: "object",
            properties: {
                first: { type: "number" }
            }
        });

        fastify.addSchema({
            $id: "second",
            type: "object",
            oneOf: [
                {
                    type: "object",
                    properties: {
                        second: { type: "number" }
                    }
                },
                "first#"
            ]
        });

        fastify.route({
            url: "/",
            method: "GET",
            schema: {
                querystring: "second#",
                response: { 200: "second#" }
            },
            handler: () => { }
        });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it("Get schema anyway should not add `properties` if anyOf is present", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "first",
            type: "object",
            properties: {
                first: { type: "number" }
            }
        });

        fastify.addSchema({
            $id: "second",
            type: "object",
            anyOf: [
                {
                    type: "object",
                    properties: {
                        second: { type: "number" }
                    }
                },
                "first#"
            ]
        });

        fastify.route({
            url: "/",
            method: "GET",
            schema: {
                querystring: "second#",
                response: { 200: "second#" }
            },
            handler: () => { }
        });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it("Shared schema should be pass to serializer and validator ($ref to shared schema /definitions)", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "http://example.com/asset.json",
            $schema: "http://json-schema.org/draft-07/schema#",
            title: "Physical Asset",
            description: "A generic representation of a physical asset",
            type: "object",
            required: [
                "id",
                "model",
                "location"
            ],
            properties: {
                id: {
                    type: "string",
                    format: "uuid"
                },
                model: {
                    type: "string"
                },
                location: { $ref: "http://example.com/point.json#" }
            },
            definitions: {
                inner: {
                    $id: "#innerId",
                    type: "string",
                    format: "email"
                }
            }
        });

        fastify.addSchema({
            $id: "http://example.com/point.json",
            $schema: "http://json-schema.org/draft-07/schema#",
            title: "Longitude and Latitude Values",
            description: "A geographical coordinate.",
            type: "object",
            required: [
                "latitude",
                "longitude"
            ],
            properties: {
                email: { $ref: "http://example.com/asset.json#/definitions/inner" },
                latitude: {
                    type: "number",
                    minimum: -90,
                    maximum: 90
                },
                longitude: {
                    type: "number",
                    minimum: -180,
                    maximum: 180
                },
                altitude: {
                    type: "number"
                }
            }
        });

        const schemaLocations = {
            $id: "http://example.com/locations.json",
            $schema: "http://json-schema.org/draft-07/schema#",
            title: "List of Asset locations",
            type: "array",
            items: { $ref: "http://example.com/asset.json#" },
            default: []
        };

        const locations = [
            { id: "550e8400-e29b-41d4-a716-446655440000", model: "mod", location: { latitude: 10, longitude: 10, email: "foo@bar.it" } },
            { id: "550e8400-e29b-41d4-a716-446655440000", model: "mod", location: { latitude: 10, longitude: 10, email: "foo@bar.it" } }
        ];
        fastify.post("/", {
            schema: {
                body: schemaLocations,
                response: { 200: schemaLocations }
            }
        }, (req, reply) => {
            reply.send(locations.map((i) => Object.assign({ serializer: "remove me" }, i)));
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: locations
        }, (err, res) => {
            assert.notExists(err);
            locations.forEach((_) => delete _.remove);
            assert.deepEqual(JSON.parse(res.payload), locations);
            done();
        });
    });

    it("Shared schema should be pass to serializer and validator ($ref to shared schema $id)", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "http://example.com/asset.json",
            $schema: "http://json-schema.org/draft-07/schema#",
            title: "Physical Asset",
            description: "A generic representation of a physical asset",
            type: "object",
            required: [
                "id",
                "model",
                "location"
            ],
            properties: {
                id: {
                    type: "string",
                    format: "uuid"
                },
                model: {
                    type: "string"
                },
                location: { $ref: "http://example.com/point.json#" }
            },
            definitions: {
                inner: {
                    $id: "#innerId",
                    type: "string",
                    format: "email"
                }
            }
        });

        fastify.addSchema({
            $id: "http://example.com/point.json",
            $schema: "http://json-schema.org/draft-07/schema#",
            title: "Longitude and Latitude Values",
            description: "A geographical coordinate.",
            type: "object",
            required: [
                "latitude",
                "longitude"
            ],
            properties: {
                email: { $ref: "http://example.com/asset.json#innerId" },
                latitude: {
                    type: "number",
                    minimum: -90,
                    maximum: 90
                },
                longitude: {
                    type: "number",
                    minimum: -180,
                    maximum: 180
                },
                altitude: {
                    type: "number"
                }
            }
        });

        const schemaLocations = {
            $id: "http://example.com/locations.json",
            $schema: "http://json-schema.org/draft-07/schema#",
            title: "List of Asset locations",
            type: "array",
            items: { $ref: "http://example.com/asset.json#" },
            default: []
        };

        const locations = [
            { id: "550e8400-e29b-41d4-a716-446655440000", model: "mod", location: { latitude: 10, longitude: 10, email: "foo@bar.it" } },
            { id: "550e8400-e29b-41d4-a716-446655440000", model: "mod", location: { latitude: 10, longitude: 10, email: "foo@bar.it" } }
        ];

        fastify.post("/", {
            schema: {
                body: schemaLocations,
                response: { 200: schemaLocations }
            }
        }, (req, reply) => {
            reply.send(locations.map((i) => Object.assign({ serializer: "remove me" }, i)));
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: locations
        }, (err, res) => {
            assert.notExists(err);
            locations.forEach((_) => delete _.remove);
            assert.deepEqual(JSON.parse(res.payload), locations);
            done();
        });
    });

    it("Use shared schema and $ref", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "http://example.com/ref-to-external-validator.json",
            type: "object",
            properties: {
                hello: { type: "string" }
            }
        });

        const body = {
            type: "array",
            items: { $ref: "http://example.com/ref-to-external-validator.json#" },
            default: []
        };

        fastify.route({
            method: "POST",
            url: "/",
            schema: { body },
            handler: (_, r) => {
                r.send("ok");
            }
        });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it("Use shared schema and $ref to /definitions", (done) => {
        const fastify = server();

        fastify.addSchema({
            $id: "test",
            type: "object",
            properties: {
                id: { type: "number" }
            }
        });

        const body = {
            type: "object",
            definitions: {
                address: {
                    $id: "#otherId",
                    type: "object",
                    properties: {
                        city: { type: "string" }
                    }
                }
            },
            properties: {
                test: "test#",
                address: { $ref: "#/definitions/address" }
            },
            required: ["address", "test"]
        };

        fastify.route({
            method: "POST",
            url: "/",
            schema: {
                body,
                response: {
                    200: body
                }
            },
            handler: (req, reply) => {
                req.body.removeThis = "it should not be serialized";
                reply.send(req.body);
            }
        });

        const payload = {
            address: { city: "New Node" },
            test: { id: Date.now() }
        };
        fastify.inject({
            method: "POST",
            url: "/",
            payload
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), payload);
            done();
        });
    });

    it("Cross shared schema reference", (done) => {
        const fastify = server();
        fastify.addSchema({ $id: "item", type: "object", properties: { foo: { type: "string" } } });
        fastify.addSchema({
            $id: "itemList",
            type: "array",
            items: "item#"
        });

        fastify.post("/post", { schema: { body: "itemList#", response: { 200: "item#" } } }, () => { });
        fastify.get("/get", { schema: { body: "itemList#", response: { 200: "item#" } } }, () => { });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it("Cross shared schema reference with unused shared schema", (done) => {
        const fastify = server();
        fastify.addSchema({ $id: "item", type: "object", properties: { foo: { type: "string" } } });
        fastify.addSchema({
            $id: "itemList",
            type: "array",
            items: "item#"
        });

        fastify.get("/get", { schema: { response: { 200: "item#" } } }, () => { });
        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it("Cross shared schema reference with multiple references", (done) => {
        const fastify = server();
        fastify.addSchema({ $id: "item", type: "object", properties: { foo: { type: "string" } } });

        // This schema is not used
        fastify.addSchema({
            $id: "itemList",
            type: "array",
            items: "item#"
        });

        const multipleRefReplaceWay = {
            type: "object",
            properties: {
                a: "item#",
                b: "item#"
            }
        };

        fastify.get("/get", { schema: { response: { 200: multipleRefReplaceWay } } }, () => { });
        fastify.post("/post", { schema: { body: multipleRefReplaceWay, response: { 200: multipleRefReplaceWay } } }, () => { });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it("Cross shared schema reference with encapsulation references", (done) => {
        const fastify = server();
        fastify.addSchema({ $id: "item", type: "object", properties: { foo: { type: "string" } } });
        fastify.addSchema({
            $id: "itemList",
            type: "array",
            items: "item#"
        });

        fastify.register((instance, opts, next) => {
            // this schema is not used
            instance.addSchema({
                $id: "encapsulation",
                type: "object",
                properties: {
                    id: { type: "number" },
                    item: "item#",
                    secondItem: "item#"
                }
            });

            const multipleRefReplaceWay = {
                type: "object",
                properties: {
                    a: "itemList#",
                    b: "item#",
                    c: "item#",
                    d: "item#"
                }
            };

            instance.post("/post", { schema: { body: multipleRefReplaceWay, response: { 200: multipleRefReplaceWay } } }, () => { });
            instance.post("/double", { schema: { response: { 200: "encapsulation#" } } }, () => { });
            instance.get("/get", { schema: { response: { 200: multipleRefReplaceWay } } }, () => { });
            instance.get("/double-get", { schema: { body: multipleRefReplaceWay, response: { 200: multipleRefReplaceWay } } }, () => { });
            next();
        }, { prefix: "/foo" });

        fastify.post("/post", { schema: { body: "item#", response: { 200: "item#" } } }, () => { });
        fastify.get("/get", { schema: { body: "item#", response: { 200: "item#" } } }, () => { });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });
});
