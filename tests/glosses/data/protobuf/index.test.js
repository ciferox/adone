const protobufNpm = require("protocol-buffers");

const {
    data: { protobuf },
    std: { fs, path }
} = adone;

const testBuffer = fs.readFileSync(path.join(__dirname, "fixtures", "test.proto"));
const npmProto = protobufNpm(testBuffer);
const proto = protobuf.create(testBuffer);

describe("data", "protobuf", () => {
    describe("basic", () => {
        const Basic = proto.Basic;
        const BasicNpm = npmProto.Basic;

        it("basic encode", () => {
            const first = {
                num: 1,
                payload: Buffer.from("lol")
            };

            const b1 = Basic.encode(first);

            const bn1 = BasicNpm.encode(first);

            assert.deepEqual(b1, bn1);

            const b2 = Basic.encode({
                num: 1,
                payload: Buffer.from("lol"),
                meeeh: 42
            });

            const b3 = Basic.encode({
                num: 1,
                payload: "lol",
                meeeh: 42
            });

            assert.deepEqual(b2, b1);
            assert.deepEqual(b3, b1);
        });

        it("basic encode + decode", () => {
            const b1 = Basic.encode({
                num: 1,
                payload: Buffer.from("lol")
            });

            const o1 = Basic.decode(b1);

            assert.deepEqual(o1.num, 1);
            assert.deepEqual(o1.payload, Buffer.from("lol"));

            const b2 = Basic.encode({
                num: 1,
                payload: Buffer.from("lol"),
                meeeh: 42
            });

            const o2 = Basic.decode(b2);

            assert.deepEqual(o2, o1);
        });

        it("basic encode + decode floats", () => {
            const b1 = Basic.encode({
                num: 1.1,
                payload: Buffer.from("lol")
            });

            const o1 = Basic.decode(b1);

            assert.deepEqual(o1.num, 1.1);
            assert.deepEqual(o1.payload, Buffer.from("lol"));
        });
    });

    describe("currupted", () => {
        const protoStr = "enum AbcType {\n" +
            "  IGNORE                 =  0;\n" +
            "  ACK_CONFIRMATION_TOKEN =  1;\n" +
            "}\n" +
            "message AbcAcknowledgeConfirmationToken { // 0x01\n" +
            "  optional uint64 confirmation_token = 1;\n" +
            "  extensions 1000 to max;\n" +
            "}\n" +
            "message ABC {\n" +
            "  required AbcType type = 9;\n" +
            "  required uint32 api_version = 8;\n" +
            "  optional AbcAcknowledgeConfirmationToken ack_confirmation_token = 1;\n" +
            "  extensions 1000 to max;\n" +
            "}\n" +
            "message Open {\n" +
            "  required bytes feed = 1;\n" +
            "  required bytes nonce = 2;\n" +
            "}";

        const messages = protobuf.create(protoStr);

        it("invalid message decode", () => {
            let didFail = false;
            try {
                messages.ABC.decode(Buffer.from([8, 182, 168, 235, 144, 178, 41]));
            } catch (e) {
                didFail = true;
            }
            assert.deepEqual(didFail, true, "bad input");
        });

        it("non buffers should fail", () => {
            let didFail = false;
            try {
                messages.ABC.decode({});
            } catch (e) {
                didFail = true;
            }
            assert.deepEqual(didFail, true, "bad input");
        });

        it("protocol parser test case", () => {
            let didFail = false;
            const buf = Buffer.from("cec1", "hex");
            try {
                messages.Open.decode(buf);
            } catch (err) {
                didFail = true;
            }
            assert.deepEqual(didFail, true, "bad input");
        });
    });

    describe("defaults", () => {
        const Defaults = proto.Defaults;

        it("defaults decode", () => {
            const o1 = Defaults.decode(Buffer.alloc(0)); // everything default

            const b2 = Defaults.encode({
                num: 10,
                foos: [1]
            });

            const b3 = Defaults.encode({
                num: 10,
                foo2: 2
            });

            assert.deepEqual(Defaults.decode(b3), {
                num: 10,
                foo1: 2,
                foo2: 2,
                foos: []
            }, "1 default");

            assert.deepEqual(o1, {
                num: 42,
                foo1: 2,
                foo2: 1,
                foos: []
            }, "all defaults");

            assert.deepEqual(Defaults.decode(b2), {
                num: 10,
                foo1: 2,
                foo2: 1,
                foos: [1]
            }, "2 defaults");
        });
    });

    describe("enums", () => {
        const messages = proto;

        it("enums", () => {
            const e = messages.FOO;

            assert.deepEqual(e, { A: 1, B: 2 }, "enum is defined");
        });

        it("hex enums", () => {
            const e = messages.FOO_HEX;

            assert.deepEqual(e, { A: 1, B: 2 }, "enum is defined using hex");
        });
    });

    describe("float", () => {
        const Float = proto.Float;

        it("float encode + decode", () => {
            const arr = new Float32Array(3);
            arr[0] = 1.1;
            arr[1] = 0;
            arr[2] = -2.3;

            const obj = {
                float1: arr[0],
                float2: arr[1],
                float3: arr[2]
            };

            const b1 = Float.encode(obj);

            const o1 = Float.decode(b1);

            assert.deepEqual(o1, obj);
        });
    });

    describe("integers", () => {
        const Integers = proto.Integers;

        it("integers encode + decode", () => {
            const b1 = Integers.encode({
                sint32: 1,
                sint64: 2,
                int32: 3,
                uint32: 4,
                int64: 5
            });

            const o1 = Integers.decode(b1);

            assert.deepEqual(o1, {
                sint32: 1,
                sint64: 2,
                int32: 3,
                uint32: 4,
                int64: 5
            });
        });

        it("integers encode + decode + negative", () => {
            const b1 = Integers.encode({
                sint32: -1,
                sint64: -2,
                int32: -3,
                uint32: 0,
                int64: -1 * Math.pow(2, 52) - 5
            });

            const o1 = Integers.decode(b1);

            assert.deepEqual(o1, {
                sint32: -1,
                sint64: -2,
                int32: -3,
                uint32: 0,
                int64: -1 * Math.pow(2, 52) - 5
            });
        });
    });

    describe("map", () => {
        const Map = proto.Map;

        it("map encode + decode", () => {
            const b1 = Map.encode({
                foo: {
                    hello: "world"
                }
            });

            const o1 = Map.decode(b1);

            assert.deepEqual(o1.foo, { hello: "world" });

            const doc = {
                foo: {
                    hello: "world",
                    hi: "verden"
                }
            };

            const b2 = Map.encode(doc);
            const o2 = Map.decode(b2);

            assert.deepEqual(o2, doc);
        });
    });

    describe("nan", () => {
        const protoStr = "message MyMessage {\n" +
            "  optional uint32 my_number = 1;\n" +
            "  required string my_other = 2;\n" +
            "}";

        const messages = protobuf.create(protoStr);

        it("NaN considered not defined", () => {
            let didFail = false;
            let error;
            let encoded;
            let decoded;
            const testString = "hello!";
            const properResult = Buffer.from([0x12, 0x06, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x21]);
            try {
                encoded = messages.MyMessage.encode({ my_number: NaN, my_other: testString });
                decoded = messages.MyMessage.decode(encoded);
                assert.deepEqual(decoded.my_other, testString, "object is parsable");
                assert.deepEqual(encoded, properResult, "object was encoded properly");
            } catch (e) {
                error = e;
                didFail = true;
            }
            assert.deepEqual(didFail, false, error ? `parsing error: ${error.toString()}` : "no parsing error");
        });
    });

    describe("nested", () => {
        const Nested = proto.Nested;

        it("nested encode", () => {
            const b1 = Nested.encode({
                num: 1,
                payload: Buffer.from("lol"),
                meh: {
                    num: 2,
                    payload: Buffer.from("bar")
                }
            });

            const b2 = Nested.encode({
                num: 1,
                payload: Buffer.from("lol"),
                meeeh: 42,
                meh: {
                    num: 2,
                    payload: Buffer.from("bar")
                }
            });

            assert.deepEqual(b2, b1);
        });

        it("nested encode + decode", () => {
            const b1 = Nested.encode({
                num: 1,
                payload: Buffer.from("lol"),
                meh: {
                    num: 2,
                    payload: Buffer.from("bar")
                }
            });

            const o1 = Nested.decode(b1);

            assert.deepEqual(o1.num, 1);
            assert.deepEqual(o1.payload, Buffer.from("lol"));
            assert.isOk(o1.meh, "has nested property");
            assert.deepEqual(o1.meh.num, 2);
            assert.deepEqual(o1.meh.payload, Buffer.from("bar"));

            const b2 = Nested.encode({
                num: 1,
                payload: Buffer.from("lol"),
                meeeh: 42,
                meh: {
                    num: 2,
                    payload: Buffer.from("bar")
                }
            });

            const o2 = Nested.decode(b2);

            assert.deepEqual(o2, o1);
        });
    });

    describe("packed", () => {
        const Packed = proto.Packed;

        it("Packed encode", () => {
            const b1 = Packed.encode({
                packed: [
                    12,
                    13,
                    14
                ]
            });

            const b2 = Packed.encode({
                packed: [
                    12,
                    13,
                    14
                ],
                meeh: 42
            });

            assert.deepEqual(b2, b1);
        });

        it("Packed encode + decode", () => {
            const b1 = Packed.encode({
                packed: [
                    12,
                    13,
                    14
                ]
            });

            const o1 = Packed.decode(b1);

            assert.deepEqual(o1.packed.length, 3);
            assert.deepEqual(o1.packed[0], 12);
            assert.deepEqual(o1.packed[1], 13);
            assert.deepEqual(o1.packed[2], 14);

            const b2 = Packed.encode({
                packed: [
                    12,
                    13,
                    14
                ],
                meeh: 42
            });

            const o2 = Packed.decode(b2);

            assert.deepEqual(o2, o1);
        });
    });

    describe("notpacked", () => {
        const NotPacked = proto.NotPacked;
        const FalsePacked = proto.FalsePacked;

        it("NotPacked encode + FalsePacked decode", () => {
            const b1 = NotPacked.encode({
                id: [9847136125],
                value: 10000
            });

            const o1 = FalsePacked.decode(b1);

            assert.deepEqual(o1.id.length, 1);
            assert.deepEqual(o1.id[0], 9847136125);
        });

        it("FalsePacked encode + NotPacked decode", () => {
            const b1 = FalsePacked.encode({
                id: [9847136125],
                value: 10000
            });

            const o1 = NotPacked.decode(b1);

            assert.deepEqual(o1.id.length, 1);
            assert.deepEqual(o1.id[0], 9847136125);
        });
    });

    describe("oneof", () => {
        const Property = proto.Property;
        const PropertyNoOneof = proto.PropertyNoOneof;

        const data = {
            name: "Foo",
            desc: "optional description",
            int_value: 12345
        };

        it("oneof encode", () => {
            assert.isOk(Property.encode(data), "oneof encode");
        });

        it("oneof encode + decode", () => {
            const buf = Property.encode(data);
            const out = Property.decode(buf);
            assert.deepEqual(out, data);
        });

        it("oneof encode of overloaded json throws", () => {
            const invalidData = {
                name: "Foo",
                desc: "optional description",
                string_value: "Bar", // ignored
                bool_value: true, // ignored
                int_value: 12345 // retained, was last entered
            };
            try {
                Property.encode(invalidData);
            } catch (err) {
                assert.isOk(true, "should throw");
            }
        });

        it("oneof encode + decode of overloaded oneof buffer", () => {
            const invalidData = {
                name: "Foo",
                desc: "optional description",
                string_value: "Bar", // retained, has highest tag number
                bool_value: true, // ignored
                int_value: 12345 // ignored
            };
            const validData = {
                name: "Foo",
                desc: "optional description",
                string_value: "Bar"
            };

            const buf = PropertyNoOneof.encode(invalidData);
            const out = Property.decode(buf);
            assert.deepEqual(validData, out);
        });
    });

    describe("repeated", () => {
        const Repeated = proto.Repeated;

        it("repeated encode", () => {
            const b1 = Repeated.encode({
                list: [{
                    num: 1,
                    payload: Buffer.from("lol")
                }, {
                    num: 2,
                    payload: Buffer.from("lol1")
                }]
            });

            const b2 = Repeated.encode({
                list: [{
                    num: 1,
                    payload: Buffer.from("lol")
                }, {
                    num: 2,
                    payload: Buffer.from("lol1"),
                    meeeeh: 100
                }],
                meeh: 42
            });

            assert.deepEqual(b2, b1);
        });

        it("repeated encode + decode", () => {
            const b1 = Repeated.encode({
                list: [{
                    num: 1,
                    payload: Buffer.from("lol")
                }, {
                    num: 2,
                    payload: Buffer.from("lol1")
                }]
            });

            const o1 = Repeated.decode(b1);

            assert.deepEqual(o1.list.length, 2);
            assert.deepEqual(o1.list[0].num, 1);
            assert.deepEqual(o1.list[0].payload, Buffer.from("lol"));
            assert.deepEqual(o1.list[1].num, 2);
            assert.deepEqual(o1.list[1].payload, Buffer.from("lol1"));

            const b2 = Repeated.encode({
                list: [{
                    num: 1,
                    payload: Buffer.from("lol")
                }, {
                    num: 2,
                    payload: Buffer.from("lol1"),
                    meeeeh: 100
                }],
                meeh: 42
            });

            const o2 = Repeated.decode(b2);

            assert.deepEqual(o2, o1);
        });
    });

    describe("utf8", () => {
        const UTF8 = proto.UTF8;

        it("strings can be utf-8", () => {
            const ex = {
                foo: "ビッグデータ「人間の解釈が必要」「量の問題ではない」論と、もう一つのビッグデータ「人間の解釈が必要」「量の問題ではない」論と、もう一つの",
                bar: 42
            };
            const b1 = UTF8.encode(ex);

            assert.deepEqual(UTF8.decode(b1), ex);
        });
    });
});
