const {
    is,
    data: { bson2 }
} = adone;

const {
    Int32,
    Double
} = bson2;

import BinaryParser from "./binary_parser";

// for tests
bson2.BSON_BINARY_SUBTYPE_DEFAULT = 0;
bson2.BSON_BINARY_SUBTYPE_FUNCTION = 1;
bson2.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
bson2.BSON_BINARY_SUBTYPE_UUID = 3;
bson2.BSON_BINARY_SUBTYPE_MD5 = 4;
bson2.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

bson2.BSON_BINARY_SUBTYPE_DEFAULT = 0;
bson2.BSON_BINARY_SUBTYPE_FUNCTION = 1;
bson2.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
bson2.BSON_BINARY_SUBTYPE_UUID = 3;
bson2.BSON_BINARY_SUBTYPE_MD5 = 4;
bson2.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

describe("data", "bson", "promote values", () => {
    it("Should Correctly Deserialize object with all wrapper types", (done) => {
        const bytes = [
            26,
            1,
            0,
            0,
            7,
            95,
            105,
            100,
            0,
            161,
            190,
            98,
            75,
            118,
            169,
            3,
            0,
            0,
            3,
            0,
            0,
            4,
            97,
            114,
            114,
            97,
            121,
            0,
            26,
            0,
            0,
            0,
            16,
            48,
            0,
            1,
            0,
            0,
            0,
            16,
            49,
            0,
            2,
            0,
            0,
            0,
            16,
            50,
            0,
            3,
            0,
            0,
            0,
            0,
            2,
            115,
            116,
            114,
            105,
            110,
            103,
            0,
            6,
            0,
            0,
            0,
            104,
            101,
            108,
            108,
            111,
            0,
            3,
            104,
            97,
            115,
            104,
            0,
            19,
            0,
            0,
            0,
            16,
            97,
            0,
            1,
            0,
            0,
            0,
            16,
            98,
            0,
            2,
            0,
            0,
            0,
            0,
            9,
            100,
            97,
            116,
            101,
            0,
            161,
            190,
            98,
            75,
            0,
            0,
            0,
            0,
            7,
            111,
            105,
            100,
            0,
            161,
            190,
            98,
            75,
            90,
            217,
            18,
            0,
            0,
            1,
            0,
            0,
            5,
            98,
            105,
            110,
            97,
            114,
            121,
            0,
            7,
            0,
            0,
            0,
            2,
            3,
            0,
            0,
            0,
            49,
            50,
            51,
            16,
            105,
            110,
            116,
            0,
            42,
            0,
            0,
            0,
            1,
            102,
            108,
            111,
            97,
            116,
            0,
            223,
            224,
            11,
            147,
            169,
            170,
            64,
            64,
            11,
            114,
            101,
            103,
            101,
            120,
            112,
            0,
            102,
            111,
            111,
            98,
            97,
            114,
            0,
            105,
            0,
            8,
            98,
            111,
            111,
            108,
            101,
            97,
            110,
            0,
            1,
            15,
            119,
            104,
            101,
            114,
            101,
            0,
            25,
            0,
            0,
            0,
            12,
            0,
            0,
            0,
            116,
            104,
            105,
            115,
            46,
            120,
            32,
            61,
            61,
            32,
            51,
            0,
            5,
            0,
            0,
            0,
            0,
            3,
            100,
            98,
            114,
            101,
            102,
            0,
            37,
            0,
            0,
            0,
            2,
            36,
            114,
            101,
            102,
            0,
            5,
            0,
            0,
            0,
            116,
            101,
            115,
            116,
            0,
            7,
            36,
            105,
            100,
            0,
            161,
            190,
            98,
            75,
            2,
            180,
            1,
            0,
            0,
            2,
            0,
            0,
            0,
            10,
            110,
            117,
            108,
            108,
            0,
            0
        ];
        let serializedData = "";

        // Convert to chars
        for (let i = 0; i < bytes.length; i++) {
            serializedData = serializedData + BinaryParser.fromByte(bytes[i]);
        }

        const object = bson2.decode(Buffer.from(serializedData, "binary"), {
            promoteValues: false
        });

        // Perform tests
        expect("hello").to.equal(object.string);
        expect([new Int32(1), new Int32(2), new Int32(3)]).to.deep.equal(object.array);
        expect(new Int32(1)).to.deep.equal(object.hash.a);
        expect(new Int32(2)).to.deep.equal(object.hash.b);
        expect(!is.nil(object.date)).to.be.ok;
        expect(!is.nil(object.oid)).to.be.ok;
        expect(!is.nil(object.binary)).to.be.ok;
        expect(new Int32(42)).to.deep.equal(object.int);
        expect(new Double(33.3333)).to.deep.equal(object.float);
        expect(!is.nil(object.regexp)).to.be.ok;
        expect(true).to.equal(object.boolean);
        expect(!is.nil(object.where)).to.be.ok;
        expect(!is.nil(object.dbref)).to.be.ok;
        expect(is.nil(object.null)).to.be.ok;
        done();
    });
});