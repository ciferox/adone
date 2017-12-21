const {
    data: { protobuf: { schema } },
    std: { fs, path }
} = adone;

const fixture = (name) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf-8");

describe("data", "protobuf", "schema", () => {
    it("basic parse", () => {
        assert.deepEqual(schema.parse(fixture("basic.proto")), require("./fixtures/basic.json"));
    });

    it("basic parse + stringify", () => {
        const syntax = 'syntax = "proto3";\n\n';
        assert.deepEqual(schema.stringify(schema.parse(fixture("basic.proto"))), syntax + fixture("basic.proto"));
    });

    it("complex parse", () => {
        assert.deepEqual(schema.parse(fixture("complex.proto")), require("./fixtures/complex.json"));
    });

    it("complex parse + stringify", () => {
        const syntax = 'syntax = "proto3";\n\n';
        assert.deepEqual(schema.stringify(schema.parse(fixture("complex.proto"))), syntax + fixture("complex.proto"));
    });

    it("throws on invalid", () => {
        try {
            schema.parse("hello world");
        } catch (err) {
            assert.isOk(true, "should fail");
        }
        try {
            schema.parse("message Foo { lol }");
        } catch (err) {
            assert.isOk(true, "should fail");
        }
    });

    it("comments parse", () => {
        assert.deepEqual(schema.parse(fixture("comments.proto")), require("./fixtures/comments.json"));
    });

    it("schema with imports", () => {
        assert.deepEqual(schema.parse(fixture("search.proto")), require("./fixtures/search.json"));
    });

    it("schema with imports loaded by path", () => {
        assert.deepEqual(schema.parse(fixture("search.proto")), require("./fixtures/search.json"));
    });

    it("schema with extends", () => {
        assert.deepEqual(schema.parse(fixture("extend.proto")), require("./fixtures/extend.json"));
    });

    it("comparing extended and not extended schema", () => {
        const sch = schema.parse(fixture("extend.proto"));
        assert.deepEqual(sch.messages.MsgNormal, sch.messages.MsgExtend);
    });

    it("schema with oneof", () => {
        assert.deepEqual(schema.parse(fixture("oneof.proto")), require("./fixtures/oneof.json"));
    });

    it("schema with map", () => {
        assert.deepEqual(schema.parse(fixture("map.proto")), require("./fixtures/map.json"));
    });

    it("schema with syntax version", () => {
        assert.deepEqual(schema.parse(fixture("version.proto")), require("./fixtures/version.json"));
    });

    it("throws on misplaced syntax version", () => {
        try {
            schema.parse('message Foo { required int32 a = 1; }\n syntax = "proto3"');
        } catch (err) {
            assert.isOk(true, "should fail");
        }
    });

    it("schema with reserved characters in options", () => {
        assert.deepEqual(schema.parse(fixture("options.proto")), require("./fixtures/options.json"));
    });

    it("service parse", () => {
        assert.deepEqual(schema.parse(fixture("service.proto")), require("./fixtures/service.json"));
    });

    it("service parse + stringify", () => {
        const syntax = 'syntax = "proto3";\n\n';
        assert.deepEqual(schema.stringify(schema.parse(fixture("service.proto"))), syntax + fixture("service.proto"));
    });

    it("enums with options", () => {
        assert.deepEqual(schema.parse(fixture("enum.proto")), require("./fixtures/enum.json"));
    });

    it("fail on no tags", () => {
        assert.throws(() => {
            schema.parse(fixture("no-tags.proto"));
        });
    });

    it("reserved", () => {
        assert.deepEqual(schema.parse(fixture("reserved.proto")), require("./fixtures/reserved.json"));
    });

    it("varint, 64-bit and 32-bit wire types can be packed", () => {
        schema.parse(fixture("valid-packed.proto"));
    });

    it("non-primitive packed should throw", () => {
        assert.throws(() => {
            schema.parse(fixture("pheromon-trajectories.proto"));
        });
    });

    it("custom options parse", () => {
        assert.deepEqual(schema.parse(fixture("option.proto")), require("./fixtures/option.json"));
    });
});
