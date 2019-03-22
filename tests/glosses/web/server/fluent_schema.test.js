/* eslint-disable func-style */
const {
    web: { server }
} = adone;

const S = require("fluent-schema");

describe("fluent schema", () => {
    it('fluent-schema generate a valid JSON Schema in "$ref-way"', (done) => {
        const fastify = new server();

        const addressSchema = S.object()
            .id("#address")
            .prop("line1").required()
            .prop("line2")
            .prop("country").required()
            .prop("city").required()
            .prop("zipcode").required()
            .valueOf();

        const commonSchemas = S.object()
            .id("https://fastify/demo")
            .definition("addressSchema", addressSchema)
            .valueOf();

        fastify.addSchema(commonSchemas);

        const bodyJsonSchema = S.object()
            .prop("residence", S.ref("https://fastify/demo#address")).required()
            .prop("office", S.ref("https://fastify/demo#/definitions/addressSchema")).required()
            .valueOf();

        const schema = { body: bodyJsonSchema };
        fastify.post("/the/url", { schema }, () => { });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it('fluent-schema generate a valid JSON Schema in "replace-way"', (done) => {
        const fastify = new server();

        const sharedAddressSchema = {
            $id: "sharedAddress",
            type: "object",
            required: ["line1", "country", "city", "zipcode"],
            properties: {
                line1: { type: "string" },
                line2: { type: "string" },
                country: { type: "string" },
                city: { type: "string" },
                zipcode: { type: "string" }
            }
        };

        fastify.addSchema(sharedAddressSchema);

        const bodyJsonSchema = {
            type: "object",
            properties: {
                vacation: "sharedAddress#"
            }
        };
        const schema = { body: bodyJsonSchema };

        fastify.post("/the/url", { schema }, () => { });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });

    it('fluent-schema mix-up of "$ref-way" and "replace-way"', (done) => {
        const fastify = new server();

        const addressSchema = S.object()
            .id("#address")
            .prop("line1").required()
            .prop("line2")
            .prop("country").required()
            .prop("city").required()
            .prop("zipcode").required()
            .valueOf();

        const commonSchemas = S.object()
            .id("https://fastify/demo")
            .definition("addressSchema", addressSchema)
            .valueOf();

        const sharedAddressSchema = {
            $id: "sharedAddress",
            type: "object",
            required: ["line1", "country", "city", "zipcode"],
            properties: {
                line1: { type: "string" },
                line2: { type: "string" },
                country: { type: "string" },
                city: { type: "string" },
                zipcode: { type: "string" }
            }
        };

        fastify.addSchema(commonSchemas);
        fastify.addSchema(sharedAddressSchema);

        const bodyJsonSchema = S.object()
            .prop("residence", S.ref("https://fastify/demo#address")).required()
            .prop("office", S.ref("https://fastify/demo#/definitions/addressSchema")).required()
            .valueOf();

        // add the key with the string value to use shared schema in "replace-way"
        bodyJsonSchema.properties.vacation = "sharedAddress#";

        const schema = { body: bodyJsonSchema };

        fastify.post("/the/url", { schema }, () => { });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });
});
