const {
    is,
    data: { bson },
    std: { vm }
} = adone;

const {
    Code,
    BSONRegExp,
    Binary,
    Timestamp,
    Long,
    ObjectId,
    BSONSymbol,
    DBRef,
    Decimal128,
    Int32,
    Double,
    MinKey,
    MaxKey
} = bson;

const BinaryParser = require("./binary_parser").BinaryParser;
const assertBuffersEqual = require("./tools/utils").assertBuffersEqual;

// for tests
bson.BSON_BINARY_SUBTYPE_DEFAULT = 0;
bson.BSON_BINARY_SUBTYPE_FUNCTION = 1;
bson.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
bson.BSON_BINARY_SUBTYPE_UUID = 3;
bson.BSON_BINARY_SUBTYPE_MD5 = 4;
bson.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

bson.BSON_BINARY_SUBTYPE_DEFAULT = 0;
bson.BSON_BINARY_SUBTYPE_FUNCTION = 1;
bson.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
bson.BSON_BINARY_SUBTYPE_UUID = 3;
bson.BSON_BINARY_SUBTYPE_MD5 = 4;
bson.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

/**
 * Module for parsing an ISO 8601 formatted string into a Date object.
 */
const ISO_REGEX = /^(\d{4})(-(\d{2})(-(\d{2})(T(\d{2}):(\d{2})(:(\d{2})(\.(\d+))?)?(Z|((\+|-)(\d{2}):(\d{2}))))?)?)?$/;
const ISODate = function (string) {
    if (is.function(string.getTime)) {
        return string;
    }

    const match = string.match(ISO_REGEX);
    if (!match) {
        throw new Error(`Invalid ISO 8601 date given: ${string}`);
    }

    let date = new Date();
    date.setUTCFullYear(Number(match[1]));
    date.setUTCMonth(Number(match[3]) - 1 || 0);
    date.setUTCDate(Number(match[5]) || 0);
    date.setUTCHours(Number(match[7]) || 0);
    date.setUTCMinutes(Number(match[8]) || 0);
    date.setUTCSeconds(Number(match[10]) || 0);
    date.setUTCMilliseconds(Number(`.${match[12]}`) * 1000 || 0);

    if (match[13] && match[13] !== "Z") {
        let h = Number(match[16]) || 0;


        let m = Number(match[17]) || 0;

        h *= 3600000;
        m *= 60000;

        let offset = h + m;
        if (match[15] === "+") {
            offset = -offset;
        }

        date = new Date(date.valueOf() + offset);
    }

    return date;
};

describe("BSON", () => {
    /**
     * @ignore
     */
    it("Should Correctly convert ObjectId to itself", (done) => {
        let myObject; let newObject;
        const selfConvertion = function () {
            myObject = new ObjectId();
            newObject = ObjectId(myObject);
        };

        expect(selfConvertion).to.not.throw;
        expect(myObject).to.equal(newObject);
        done();
    });

    // /**
    //  * @ignore
    //  */
    // it("Should Correctly get BSON types from require", (done) => {
    //     const _mongodb = require("../../lib/bson");
    //     expect(_mongodb.ObjectId === ObjectId).to.be.ok;
    //     expect(_mongodb.Binary === Binary).to.be.ok;
    //     expect(_mongodb.Long === Long).to.be.ok;
    //     expect(_mongodb.Timestamp === Timestamp).to.be.ok;
    //     expect(_mongodb.Code === Code).to.be.ok;
    //     expect(_mongodb.DBRef === DBRef).to.be.ok;
    //     expect(_mongodb.BSONSymbol === BSONSymbol).to.be.ok;
    //     expect(_mongodb.MinKey === MinKey).to.be.ok;
    //     expect(_mongodb.MaxKey === MaxKey).to.be.ok;
    //     expect(_mongodb.Double === Double).to.be.ok;
    //     expect(_mongodb.Decimal128 === Decimal128).to.be.ok;
    //     expect(_mongodb.Int32 === Int32).to.be.ok;
    //     expect(_mongodb.BSONRegExp === BSONRegExp).to.be.ok;
    //     done();
    // });

    /**
     * @ignore
     */
    it("Should Correctly Deserialize object", (done) => {
        const bytes = [
            95,
            0,
            0,
            0,
            2,
            110,
            115,
            0,
            42,
            0,
            0,
            0,
            105,
            110,
            116,
            101,
            103,
            114,
            97,
            116,
            105,
            111,
            110,
            95,
            116,
            101,
            115,
            116,
            115,
            95,
            46,
            116,
            101,
            115,
            116,
            95,
            105,
            110,
            100,
            101,
            120,
            95,
            105,
            110,
            102,
            111,
            114,
            109,
            97,
            116,
            105,
            111,
            110,
            0,
            8,
            117,
            110,
            105,
            113,
            117,
            101,
            0,
            0,
            3,
            107,
            101,
            121,
            0,
            12,
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
            0,
            2,
            110,
            97,
            109,
            101,
            0,
            4,
            0,
            0,
            0,
            97,
            95,
            49,
            0,
            0
        ];
        let serializedData = "";
        // Convert to chars
        for (let i = 0; i < bytes.length; i++) {
            serializedData = serializedData + BinaryParser.fromByte(bytes[i]);
        }

        const object = bson.decode(Buffer.from(serializedData, "binary"));
        expect("a_1").to.equal(object.name);
        expect(false).to.equal(object.unique);
        expect(1).to.equal(object.key.a);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Deserialize object with all types", (done) => {
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

        const object = bson.decode(Buffer.from(serializedData, "binary"));
        // Perform tests
        expect("hello").to.equal(object.string);
        expect([1, 2, 3]).to.deep.equal(object.array);
        expect(1).to.equal(object.hash.a);
        expect(2).to.equal(object.hash.b);
        expect(!is.nil(object.date)).to.be.ok;
        expect(!is.nil(object.oid)).to.be.ok;
        expect(!is.nil(object.binary)).to.be.ok;
        expect(42).to.equal(object.int);
        expect(33.3333).to.equal(object.float);
        expect(!is.nil(object.regexp)).to.be.ok;
        expect(true).to.equal(object.boolean);
        expect(!is.nil(object.where)).to.be.ok;
        expect(!is.nil(object.dbref)).to.be.ok;
        expect(is.nil(object.null)).to.be.ok;
        done();
    });

    /**
     * @ignore
     */
    it("Should Serialize and Deserialize String", (done) => {
        const testString = { hello: "world" };
        const serializedData = bson.encode(testString, {
            checkKeys: false
        });

        bson.encodeWithBufferAndIndex(testString, serializedData, {
            checkKeys: false,
            index: 0
        });

        expect(testString).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Serialize and Deserialize Empty String", (done) => {
        const testString = { hello: "" };
        const serializedData = bson.encode(testString);
        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(testString));
        bson.encodeWithBufferAndIndex(testString, serializedData2);

        assertBuffersEqual(done, serializedData, serializedData2, 0);
        expect(testString).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Integer", (done) => {
        const testNumber = { doc: 5 };

        const serializedData = bson.encode(testNumber);
        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(testNumber));
        bson.encodeWithBufferAndIndex(testNumber, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        expect(testNumber).to.deep.equal(bson.decode(serializedData));
        expect(testNumber).to.deep.equal(bson.decode(serializedData2));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize null value", (done) => {
        const testNull = { doc: null };
        const serializedData = bson.encode(testNull);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(testNull));
        bson.encodeWithBufferAndIndex(testNull, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const object = bson.decode(serializedData);
        expect(null).to.equal(object.doc);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Number 1", (done) => {
        const testNumber = { doc: 5.5 };
        const serializedData = bson.encode(testNumber);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(testNumber));
        bson.encodeWithBufferAndIndex(testNumber, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        expect(testNumber).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Integer", (done) => {
        let testInt = { doc: 42 };
        let serializedData = bson.encode(testInt);

        let serializedData2 = Buffer.alloc(bson.calculateObjectSize(testInt));
        bson.encodeWithBufferAndIndex(testInt, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        expect(testInt.doc).to.deep.equal(bson.decode(serializedData).doc);

        testInt = { doc: -5600 };
        serializedData = bson.encode(testInt);

        serializedData2 = Buffer.alloc(bson.calculateObjectSize(testInt));
        bson.encodeWithBufferAndIndex(testInt, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        expect(testInt.doc).to.deep.equal(bson.decode(serializedData).doc);

        testInt = { doc: 2147483647 };
        serializedData = bson.encode(testInt);

        serializedData2 = Buffer.alloc(bson.calculateObjectSize(testInt));
        bson.encodeWithBufferAndIndex(testInt, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        expect(testInt.doc).to.deep.equal(bson.decode(serializedData).doc);

        testInt = { doc: -2147483648 };
        serializedData = bson.encode(testInt);

        serializedData2 = Buffer.alloc(bson.calculateObjectSize(testInt));
        bson.encodeWithBufferAndIndex(testInt, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        expect(testInt.doc).to.deep.equal(bson.decode(serializedData).doc);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Object", (done) => {
        const doc = { doc: { age: 42, name: "Spongebob", shoe_size: 9.5 } };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        expect(doc.doc.age).to.deep.equal(bson.decode(serializedData).doc.age);
        expect(doc.doc.name).to.deep.equal(bson.decode(serializedData).doc.name);
        expect(doc.doc.shoe_size).to.deep.equal(bson.decode(serializedData).doc.shoe_size);

        done();
    });

    /**
     * @ignore
     */
    it("Should correctly ignore undefined values in arrays", (done) => {
        const doc = { doc: { notdefined: undefined } };
        const serializedData = bson.encode(doc, {
            ignoreUndefined: true
        });
        const serializedData2 = Buffer.alloc(
            bson.calculateObjectSize(doc, {
                ignoreUndefined: true
            })
        );
        bson.encodeWithBufferAndIndex(doc, serializedData2, {
            ignoreUndefined: true
        });

        assertBuffersEqual(done, serializedData, serializedData2, 0);
        const doc1 = bson.decode(serializedData);

        expect(undefined).to.deep.equal(doc1.doc.notdefined);
        done();
    });

    it("Should correctly serialize undefined array entries as null values", (done) => {
        const doc = { doc: { notdefined: undefined }, a: [1, 2, undefined, 3] };
        const serializedData = bson.encode(doc, {
            ignoreUndefined: true
        });
        const serializedData2 = Buffer.alloc(
            bson.calculateObjectSize(doc, {
                ignoreUndefined: true
            })
        );
        bson.encodeWithBufferAndIndex(doc, serializedData2, {
            ignoreUndefined: true
        });
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        const doc1 = bson.decode(serializedData);
        expect(undefined).to.deep.equal(doc1.doc.notdefined);
        expect(null).to.equal(doc1.a[2]);
        done();
    });

    it("Should correctly serialize undefined array entries as undefined values", (done) => {
        const doc = { doc: { notdefined: undefined }, a: [1, 2, undefined, 3] };
        const serializedData = bson.encode(doc, {
            ignoreUndefined: false
        });
        const serializedData2 = Buffer.alloc(
            bson.calculateObjectSize(doc, {
                ignoreUndefined: false
            })
        );
        bson.encodeWithBufferAndIndex(doc, serializedData2, {
            ignoreUndefined: false
        });

        // console.log("======================================== 0")
        // console.log(serializedData.toString('hex'))
        // console.log(serializedData2.toString('hex'))

        assertBuffersEqual(done, serializedData, serializedData2, 0);
        const doc1 = bson.decode(serializedData);
        const doc2 = bson.decode(serializedData2);
        // console.log("======================================== 0")
        // console.dir(doc1)
        // console.dir(doc2)

        expect(null).to.deep.equal(doc1.doc.notdefined);
        expect(null).to.deep.equal(doc2.doc.notdefined);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Array", (done) => {
        const doc = { doc: [1, 2, "a", "b"] };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserialized = bson.decode(serializedData);
        expect(doc.doc[0]).to.equal(deserialized.doc[0]);
        expect(doc.doc[1]).to.equal(deserialized.doc[1]);
        expect(doc.doc[2]).to.equal(deserialized.doc[2]);
        expect(doc.doc[3]).to.equal(deserialized.doc[3]);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Buffer", (done) => {
        const doc = { doc: Buffer.from("hello world") };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserialized = bson.decode(serializedData);
        expect(deserialized.doc instanceof Binary).to.be.ok;
        expect("hello world").to.equal(deserialized.doc.toString());
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Buffer with promoteBuffers option", (done) => {
        const doc = { doc: Buffer.from("hello world") };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserialized = bson.decode(serializedData, {
            promoteBuffers: true
        });
        expect(deserialized.doc instanceof Buffer).to.be.ok;
        expect("hello world").to.equal(deserialized.doc.toString());
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Number 4", (done) => {
        const doc = { doc: bson.BSON_INT32_MAX + 10 };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserialized = bson.decode(serializedData);
        // expect(deserialized.doc instanceof Binary).to.be.ok;
        expect(bson.BSON_INT32_MAX + 10).to.equal(deserialized.doc);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Array with added on functions", (done) => {
        Array.prototype.toXml = function () { };
        const doc = { doc: [1, 2, "a", "b"] };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserialized = bson.decode(serializedData);
        expect(doc.doc[0]).to.equal(deserialized.doc[0]);
        expect(doc.doc[1]).to.equal(deserialized.doc[1]);
        expect(doc.doc[2]).to.equal(deserialized.doc[2]);
        expect(doc.doc[3]).to.equal(deserialized.doc[3]);
        done();
    });

    /**
     * @ignore
     */
    it("Should correctly deserialize a nested object", (done) => {
        const doc = { doc: { doc: 1 } };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        expect(doc.doc.doc).to.deep.equal(bson.decode(serializedData).doc.doc);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize A Boolean", (done) => {
        const doc = { doc: true };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        expect(doc.doc).to.equal(bson.decode(serializedData).doc);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a Date", (done) => {
        const date = new Date();
        //(2009, 11, 12, 12, 00, 30)
        date.setUTCDate(12);
        date.setUTCFullYear(2009);
        date.setUTCMonth(11 - 1);
        date.setUTCHours(12);
        date.setUTCMinutes(0);
        date.setUTCSeconds(30);
        const doc = { doc: date };
        const serializedData = bson.encode(doc);
        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);

        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const doc1 = bson.decode(serializedData);
        expect(doc).to.deep.equal(doc1);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a Date from another VM", (done) => {
        const script = "date1 = new Date();";


        const ctx = vm.createContext({
            date1: null
        });
        vm.runInContext(script, ctx, "myfile.vm");

        const date = ctx.date1;
        //(2009, 11, 12, 12, 00, 30)
        date.setUTCDate(12);
        date.setUTCFullYear(2009);
        date.setUTCMonth(11 - 1);
        date.setUTCHours(12);
        date.setUTCMinutes(0);
        date.setUTCSeconds(30);
        const doc = { doc: date };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        expect(doc.date).to.equal(bson.decode(serializedData).doc.date);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize nested doc", (done) => {
        const doc = {
            string: "Strings are great",
            decimal: 3.14159265,
            bool: true,
            integer: 5,

            subObject: {
                moreText: "Bacon ipsum dolor.",
                longKeylongKeylongKeylongKeylongKeylongKey: "Pork belly."
            },

            subArray: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            anotherString: "another string"
        };

        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Oid", (done) => {
        const doc = { doc: new ObjectId() };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        expect(doc).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly encode Empty Hash", (done) => {
        const doc = {};
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        expect(doc).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Ordered Hash", (done) => {
        const doc = { doc: { b: 1, a: 2, c: 3, d: 4 } };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const decodedHash = bson.decode(serializedData).doc;
        const keys = [];

        for (const name in decodedHash) {
            keys.push(name);
        }
        expect(["b", "a", "c", "d"]).to.deep.equal(keys);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Regular Expression", (done) => {
        // Serialize the regular expression
        const doc = { doc: /foobar/im };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const doc2 = bson.decode(serializedData);

        expect(doc.doc.toString()).to.deep.equal(doc2.doc.toString());
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a Binary object", (done) => {
        const bin = new Binary();
        const string = "binstring";
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc = { doc: bin };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);

        expect(doc.doc.value()).to.deep.equal(deserializedData.doc.value());
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a Type 2 Binary object", (done) => {
        const bin = new Binary(Buffer.from("binstring"), Binary.SUBTYPE_BYTE_ARRAY);
        const string = "binstring";
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc = { doc: bin };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);

        expect(doc.doc.value()).to.deep.equal(deserializedData.doc.value());
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize DBRef", (done) => {
        const oid = new ObjectId();
        const doc = { dbref: new DBRef("namespace", oid, null, {}) };

        const serializedData = bson.encode(doc);
        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.deep.equal(serializedData2);

        const doc2 = bson.decode(serializedData);
        expect(doc).to.deep.equal(doc2);
        expect(doc2.dbref.oid.toHexString()).to.deep.equal(oid.toHexString());
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize partial DBRef", (done) => {
        const id = new ObjectId();
        const doc = { name: "something", user: { $ref: "username", $id: id } };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const doc2 = bson.decode(serializedData);
        expect("something").to.equal(doc2.name);
        expect("username").to.equal(doc2.user.collection);
        expect(id.toString()).to.equal(doc2.user.oid.toString());
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize simple Int", (done) => {
        const doc = { doc: 2147483648 };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const doc2 = bson.decode(serializedData);
        expect(doc.doc).to.deep.equal(doc2.doc);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Long Integer", (done) => {
        let doc = { doc: Long.fromNumber(9223372036854775807) };
        let serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        let deserializedData = bson.decode(serializedData);
        expect(doc.doc).to.deep.equal(deserializedData.doc);

        doc = { doc: Long.fromNumber(-9223372036854775) };
        serializedData = bson.encode(doc);
        deserializedData = bson.decode(serializedData);
        expect(doc.doc).to.deep.equal(deserializedData.doc);

        doc = { doc: Long.fromNumber(-9223372036854775809) };
        serializedData = bson.encode(doc);
        deserializedData = bson.decode(serializedData);
        expect(doc.doc).to.deep.equal(deserializedData.doc);
        done();
    });

    /**
     * @ignore
     */
    it("Should Deserialize Large Integers as Number not Long", (done) => {
        const roundTrip = function (val) {
            const doc = { doc: val };
            const serializedData = bson.encode(doc);

            const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
            bson.encodeWithBufferAndIndex(doc, serializedData2);
            assertBuffersEqual(done, serializedData, serializedData2, 0);

            const deserializedData = bson.decode(serializedData);
            expect(doc.doc).to.deep.equal(deserializedData.doc);
        };

        roundTrip(Math.pow(2, 52));
        roundTrip(Math.pow(2, 53) - 1);
        roundTrip(Math.pow(2, 53));
        roundTrip(-Math.pow(2, 52));
        roundTrip(-Math.pow(2, 53) + 1);
        roundTrip(-Math.pow(2, 53));
        roundTrip(Math.pow(2, 65)); // Too big for Long.
        roundTrip(-Math.pow(2, 65));
        roundTrip(9223372036854775807);
        roundTrip(1234567890123456800); // Bigger than 2^53, stays a double.
        roundTrip(-1234567890123456800);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Timestamp as subclass of Long", (done) => {
        const long = Long.fromNumber(9223372036854775807);
        const timestamp = Timestamp.fromNumber(9223372036854775807);
        expect(long instanceof Long).to.be.ok;
        expect(!(long instanceof Timestamp)).to.be.ok;
        expect(timestamp instanceof Timestamp).to.be.ok;
        expect(timestamp instanceof Long).to.be.ok;

        const testInt = { doc: long, doc2: timestamp };
        const serializedData = bson.encode(testInt);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(testInt));
        bson.encodeWithBufferAndIndex(testInt, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);
        expect(testInt.doc).to.deep.equal(deserializedData.doc);
        done();
    });

    /**
     * @ignore
     */
    it("Should Always put the id as the first item in a hash", (done) => {
        const hash = { doc: { not_id: 1, _id: 2 } };
        const serializedData = bson.encode(hash);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(hash));
        bson.encodeWithBufferAndIndex(hash, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);
        const keys = [];

        for (const name in deserializedData.doc) {
            keys.push(name);
        }

        expect(["not_id", "_id"]).to.deep.equal(keys);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a User defined Binary object", (done) => {
        const bin = new Binary();
        bin.subType = bson.BSON_BINARY_SUBTYPE_USER_DEFINED;
        const string = "binstring";
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc = { doc: bin };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        const deserializedData = bson.decode(serializedData);

        expect(deserializedData.doc.subType).to.deep.equal(bson.BSON_BINARY_SUBTYPE_USER_DEFINED);
        expect(doc.doc.value()).to.deep.equal(deserializedData.doc.value());
        done();
    });

    /**
     * @ignore
     */
    it("Should Correclty Serialize and Deserialize a Code object", (done) => {
        const doc = { doc: { doc2: new Code("this.a > i", { i: 1 }) } };
        const serializedData = bson.encode(doc);
        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);
        expect(doc.doc.doc2.code).to.deep.equal(deserializedData.doc.doc2.code);
        expect(doc.doc.doc2.scope.i).to.deep.equal(deserializedData.doc.doc2.scope.i);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly serialize and deserialize and embedded array", (done) => {
        const doc = {
            a: 0,
            b: [
                "tmp1",
                "tmp2",
                "tmp3",
                "tmp4",
                "tmp5",
                "tmp6",
                "tmp7",
                "tmp8",
                "tmp9",
                "tmp10",
                "tmp11",
                "tmp12",
                "tmp13",
                "tmp14",
                "tmp15",
                "tmp16"
            ]
        };

        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);
        expect(doc.a).to.deep.equal(deserializedData.a);
        expect(doc.b).to.deep.equal(deserializedData.b);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize UTF8", (done) => {
        // Serialize utf8
        const doc = {
            name: "本荘由利地域に洪水警報",
            name1: "öüóőúéáűíÖÜÓŐÚÉÁŰÍ",
            name2: "abcdedede",
            name3: "本荘由利地域に洪水警報",
            name4: "abcdedede",
            本荘由利地域に洪水警報: "本荘由利地域に洪水警報",
            本荘由利地本荘由利地: {
                本荘由利地域に洪水警報: "本荘由利地域に洪水警報",
                地域に洪水警報本荘由利: "本荘由利地域に洪水警報",
                洪水警報本荘地域に洪水警報本荘由利: "本荘由利地域に洪水警報"
            }
        };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);
        expect(doc).to.deep.equal(deserializedData);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize query object", (done) => {
        const doc = { count: "remove_with_no_callback_bug_test", query: {}, fields: null };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);
        expect(doc).to.deep.equal(deserializedData);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize empty query object", (done) => {
        const doc = {};
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);
        expect(doc).to.deep.equal(deserializedData);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize array based doc", (done) => {
        const doc = { b: [1, 2, 3], _id: new ObjectId() };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);
        expect(doc.b).to.deep.equal(deserializedData.b);
        expect(doc).to.deep.equal(deserializedData);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Symbol", (done) => {
        if (!is.nil(BSONSymbol)) {
            // symbols are deprecated, so upgrade to strings... so I'm not sure
            // we really need this test anymore...
            //var doc = { b: [new BSONSymbol('test')] };

            const doc = { b: ["test"] };
            const serializedData = bson.encode(doc);
            const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
            bson.encodeWithBufferAndIndex(doc, serializedData2);
            assertBuffersEqual(done, serializedData, serializedData2, 0);

            const deserializedData = bson.decode(serializedData);
            expect(doc).to.deep.equal(deserializedData);
            expect(typeof deserializedData.b[0]).to.equal("string");
        }

        done();
    });

    /**
     * @ignore
     */
    it("Should handle Deeply nested document", (done) => {
        const doc = { a: { b: { c: { d: 2 } } } };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);
        expect(doc).to.deep.equal(deserializedData);
        done();
    });

    /**
     * @ignore
     */
    it("Should handle complicated all typed object", (done) => {
        // First doc
        const date = new Date();
        let oid = new ObjectId();
        let string = "binstring";
        let bin = new Binary();
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc = {
            string: "hello",
            array: [1, 2, 3],
            hash: { a: 1, b: 2 },
            date,
            oid,
            binary: bin,
            int: 42,
            float: 33.3333,
            regexp: /regexp/,
            boolean: true,
            long: date.getTime(),
            where: new Code("this.a > i", { i: 1 }),
            dbref: new DBRef("namespace", oid, "integration_tests_")
        };

        // Second doc
        oid = ObjectId.createFromHexString(oid.toHexString());
        string = "binstring";
        bin = new Binary();
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc2 = {
            string: "hello",
            array: [1, 2, 3],
            hash: { a: 1, b: 2 },
            date,
            oid,
            binary: bin,
            int: 42,
            float: 33.3333,
            regexp: /regexp/,
            boolean: true,
            long: date.getTime(),
            where: new Code("this.a > i", { i: 1 }),
            dbref: new DBRef("namespace", oid, "integration_tests_")
        };

        const serializedData = bson.encode(doc);

        let serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);

        expect(serializedData).to.deep.equal(serializedData2);

        serializedData2 = bson.encode(doc2, false, true);

        expect(serializedData).to.deep.equal(serializedData2);

        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize Complex Nested Object", (done) => {
        const doc = {
            email: "email@email.com",
            encrypted_password: "password",
            friends: ["4db96b973d01205364000006", "4dc77b24c5ba38be14000002"],
            location: [72.4930088, 23.0431957],
            name: "Amit Kumar",
            password_salt: "salty",
            profile_fields: [],
            username: "amit",
            _id: new ObjectId()
        };

        const serializedData = bson.encode(doc);

        let serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const doc2 = doc;
        doc2._id = ObjectId.createFromHexString(doc2._id.toHexString());
        serializedData2 = bson.encode(doc2, false, true);

        for (let i = 0; i < serializedData2.length; i++) {
            require("assert").equal(serializedData2[i], serializedData[i]);
        }

        done();
    });

    /**
     * @ignore
     */
    it("Should correctly massive doc", (done) => {
        const oid1 = new ObjectId();
        const oid2 = new ObjectId();

        // JS doc
        const doc = {
            dbref2: new DBRef("namespace", oid1, "integration_tests_"),
            _id: oid2
        };

        const doc2 = {
            dbref2: new DBRef(
                "namespace",
                ObjectId.createFromHexString(oid1.toHexString()),
                "integration_tests_"
            ),
            _id: ObjectId.createFromHexString(oid2.toHexString())
        };

        const serializedData = bson.encode(doc);
        let serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.deep.equal(serializedData2);

        serializedData2 = bson.encode(doc2, false, true);
        expect(serializedData).to.deep.equal(serializedData2);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize/Deserialize regexp object", (done) => {
        const doc = { b: /foobaré/ };

        const serializedData = bson.encode(doc);

        let serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        serializedData2 = bson.encode(doc);

        for (let i = 0; i < serializedData2.length; i++) {
            require("assert").equal(serializedData2[i], serializedData[i]);
        }

        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize/Deserialize complicated object", (done) => {
        const doc = { a: { b: { c: [new ObjectId(), new ObjectId()] } }, d: { f: 1332.3323 } };

        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const doc2 = bson.decode(serializedData);

        expect(doc).to.deep.equal(doc2);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize/Deserialize nested object", (done) => {
        const doc = {
            _id: { date: new Date(), gid: "6f35f74d2bea814e21000000" },
            value: {
                b: { countries: { "--": 386 }, total: 1599 },
                bc: { countries: { "--": 3 }, total: 10 },
                gp: { countries: { "--": 2 }, total: 13 },
                mgc: { countries: { "--": 2 }, total: 14 }
            }
        };

        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const doc2 = bson.decode(serializedData);

        expect(doc).to.deep.equal(doc2);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize/Deserialize nested object with even more nesting", (done) => {
        const doc = {
            _id: { date: { a: 1, b: 2, c: new Date() }, gid: "6f35f74d2bea814e21000000" },
            value: {
                b: { countries: { "--": 386 }, total: 1599 },
                bc: { countries: { "--": 3 }, total: 10 },
                gp: { countries: { "--": 2 }, total: 13 },
                mgc: { countries: { "--": 2 }, total: 14 }
            }
        };

        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const doc2 = bson.decode(serializedData);
        expect(doc).to.deep.equal(doc2);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize empty name object", (done) => {
        const doc = {
            "": "test",
            bbbb: 1
        };
        const serializedData = bson.encode(doc);
        const doc2 = bson.decode(serializedData);
        expect(doc2[""]).to.equal("test");
        expect(doc2.bbbb).to.equal(1);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly handle Forced Doubles to ensure we allocate enough space for cap collections", (done) => {
        if (!is.nil(Double)) {
            const doubleValue = new Double(100);
            const doc = { value: doubleValue };

            // Serialize
            const serializedData = bson.encode(doc);

            const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
            bson.encodeWithBufferAndIndex(doc, serializedData2);
            assertBuffersEqual(done, serializedData, serializedData2, 0);

            const doc2 = bson.decode(serializedData);
            expect({ value: 100 }).to.deep.equal(doc2);
        }

        done();
    });

    /**
     * @ignore
     */
    it("Should deserialize correctly", (done) => {
        const doc = {
            _id: new ObjectId("4e886e687ff7ef5e00000162"),
            str: "foreign",
            type: 2,
            timestamp: ISODate("2011-10-02T14:00:08.383Z"),
            links: [
                "http://www.reddit.com/r/worldnews/comments/kybm0/uk_home_secretary_calls_for_the_scrapping_of_the/"
            ]
        };

        const serializedData = bson.encode(doc);
        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        const doc2 = bson.decode(serializedData);

        expect(JSON.stringify(doc)).to.deep.equal(JSON.stringify(doc2));
        done();
    });

    /**
     * @ignore
     */
    it("Should correctly serialize and deserialize MinKey and MaxKey values", (done) => {
        const doc = {
            _id: new ObjectId("4e886e687ff7ef5e00000162"),
            minKey: new MinKey(),
            maxKey: new MaxKey()
        };

        const serializedData = bson.encode(doc);
        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        const doc2 = bson.decode(serializedData);

        // Peform equality checks
        expect(JSON.stringify(doc)).to.equal(JSON.stringify(doc2));
        expect(doc._id.equals(doc2._id)).to.be.ok;
        // process.exit(0)
        expect(doc2.minKey instanceof MinKey).to.be.ok;
        expect(doc2.maxKey instanceof MaxKey).to.be.ok;
        done();
    });

    /**
     * @ignore
     */
    it("Should correctly serialize Double value", (done) => {
        const doc = {
            value: new Double(34343.2222)
        };

        const serializedData = bson.encode(doc);
        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);
        const doc2 = bson.decode(serializedData);

        expect(doc.value.valueOf(), doc2.value).to.be.ok;
        expect(doc.value.value, doc2.value).to.be.ok;
        done();
    });

    /**
     * @ignore
     */
    it("ObjectId should correctly create objects", (done) => {
        try {
            ObjectId.createFromHexString("000000000000000000000001");
            ObjectId.createFromHexString("00000000000000000000001");
            expect(false).to.be.ok;
        } catch (err) {
            expect(!is.nil(err)).to.be.ok;
        }

        done();
    });

    /**
     * @ignore
     */
    it("ObjectId should correctly retrieve timestamp", (done) => {
        const testDate = new Date();
        const object1 = new ObjectId();
        expect(Math.floor(testDate.getTime() / 1000)).to.equal(
            Math.floor(object1.getTimestamp().getTime() / 1000)
        );

        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly throw error on bsonparser errors", (done) => {
        let data = Buffer.alloc(3);

        expect(() => {
            bson.decode(data);
        }).to.throw();

        data = Buffer.alloc(5);
        data[0] = 0xff;
        data[1] = 0xff;
        expect(() => {
            bson.decode(data);
        }).to.throw();

        // Finish up
        done();
    });

    /**
     * A simple example showing the usage of bson.calculateObjectSize function returning the number of BSON bytes a javascript object needs.
     *
     * @_class bson
     * @_function bson.calculateObjectSize
     * @ignore
     */
    it("Should correctly calculate the size of a given javascript object", (done) => {
        // Create a simple object
        const doc = { a: 1, func() { } };
        // Calculate the size of the object without serializing the function
        let size = bson.calculateObjectSize(doc, {
            serializeFunctions: false
        });
        expect(12).to.equal(size);
        // Calculate the size of the object serializing the function
        size = bson.calculateObjectSize(doc, {
            serializeFunctions: true
        });
        // Validate the correctness
        expect(32).to.equal(size);
        done();
    });

    /**
     * A simple example showing the usage of bson.calculateObjectSize function returning the number of BSON bytes a javascript object needs.
     *
     * @_class bson
     * @_function calculateObjectSize
     * @ignore
     */
    it("Should correctly calculate the size of a given javascript object using instance method", (done) => {
        // Create a simple object
        const doc = { a: 1, func() { } };
        // Calculate the size of the object without serializing the function
        let size = bson.calculateObjectSize(doc, {
            serializeFunctions: false
        });
        expect(12).to.equal(size);
        // Calculate the size of the object serializing the function
        size = bson.calculateObjectSize(doc, {
            serializeFunctions: true
        });
        // Validate the correctness
        expect(32).to.equal(size);
        done();
    });

    /**
     * A simple example showing the usage of bson.encodeWithBufferAndIndex function.
     *
     * @_class bson
     * @_function bson.encodeWithBufferAndIndex
     * @ignore
     */
    it("Should correctly encodeWithBufferAndIndex a given javascript object", (done) => {
        // Create a simple object
        const doc = { a: 1, func() { } };

        // Calculate the size of the document, no function serialization
        let size = bson.calculateObjectSize(doc, { serializeFunctions: false });
        let buffer = Buffer.alloc(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        let index = bson.encodeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: false,
            index: 0
        });

        // Validate the correctness
        expect(size).to.equal(12);
        expect(index).to.equal(11);

        // Serialize with functions
        // Calculate the size of the document, no function serialization
        size = bson.calculateObjectSize(doc, {
            serializeFunctions: true
        });
        // Allocate a buffer
        buffer = Buffer.alloc(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        index = bson.encodeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: true,
            index: 0
        });

        // Validate the correctness
        expect(32).to.equal(size);
        expect(31).to.equal(index);
        done();
    });

    /**
     * A simple example showing the usage of bson.encodeWithBufferAndIndex function.
     *
     * @_class bson
     * @_function encodeWithBufferAndIndex
     * @ignore
     */
    it("Should correctly encodeWithBufferAndIndex a given javascript object using a BSON instance", (done) => {
        // Create a simple object
        const doc = { a: 1, func() { } };
        // Calculate the size of the document, no function serialization
        let size = bson.calculateObjectSize(doc, {
            serializeFunctions: false
        });
        // Allocate a buffer
        let buffer = Buffer.alloc(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        let index = bson.encodeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: false
        });

        expect(size).to.equal(12);
        expect(index).to.equal(11);

        // Serialize with functions
        // Calculate the size of the document, no function serialization
        size = bson.calculateObjectSize(doc, {
            serializeFunctions: true
        });
        // Allocate a buffer
        buffer = Buffer.alloc(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        index = bson.encodeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: true
        });
        // Validate the correctness
        expect(size).to.equal(32);
        expect(index).to.equal(31);

        done();
    });

    /**
     * A simple example showing the usage of bson.encode function returning serialized BSON Buffer object.
     *
     * @_class bson
     * @_function bson.encode
     * @ignore
     */
    it("Should correctly serialize a given javascript object", (done) => {
        // Create a simple object
        const doc = { a: 1, func() { } };

        let buffer = bson.encode(doc, {
            checkKeys: true,
            serializeFunctions: false
        });

        expect(buffer.length).to.equal(12);

        // Serialize the object to a buffer, checking keys and serializing functions
        buffer = bson.encode(doc, {
            checkKeys: true,
            serializeFunctions: true
        });
        // Validate the correctness
        expect(buffer.length).to.equal(32);

        done();
    });

    /**
     * A simple example showing the usage of bson.encode function returning serialized BSON Buffer object.
     *
     * @_class bson
     * @_function serialize
     * @ignore
     */
    it("Should correctly serialize a given javascript object using a bson instance", (done) => {
        // Create a simple object
        const doc = { a: 1, func() { } };

        // Serialize the object to a buffer, checking keys and not serializing functions
        let buffer = bson.encode(doc, {
            checkKeys: true,
            serializeFunctions: false
        });
        // Validate the correctness
        expect(buffer.length).to.equal(12);

        // Serialize the object to a buffer, checking keys and serializing functions
        buffer = bson.encode(doc, {
            checkKeys: true,
            serializeFunctions: true
        });
        // Validate the correctness
        expect(32).to.equal(buffer.length);

        done();
    });

    // /**
    //  * A simple example showing the usage of bson.decode function returning a deserialized Javascript function.
    //  *
    //  * @_class bson
    //  * @_function bson.decode
    //  * @ignore
    //  */
    //  it('Should correctly deserialize a buffer using the BSON class level parser', function(done) {
    //   // Create a simple object
    //   var doc = {a: 1, func:function(){ console.log('hello world'); }}
    //   // Create a BSON parser instance
    //   var bson = BSON;
    //   // Serialize the object to a buffer, checking keys and serializing functions
    //   var buffer = bson.serialize(doc, {
    //     checkKeys: true,
    //     serializeFunctions: true
    //   });
    //   // Validate the correctness
    //   expect(65).to.equal(buffer.length);
    //
    //   // Deserialize the object with no eval for the functions
    //   var deserializedDoc = bson.deserialize(buffer);
    //   // Validate the correctness
    //   expect('object').to.equal(typeof deserializedDoc.func);
    //   expect(1).to.equal(deserializedDoc.a);
    //
    //   // Deserialize the object with eval for the functions caching the functions
    //   deserializedDoc = bson.deserialize(buffer, {evalFunctions:true, cacheFunctions:true});
    //   // Validate the correctness
    //   expect('function').to.equal(typeof deserializedDoc.func);
    //   expect(1).to.equal(deserializedDoc.a);
    //   done();
    // }

    // /**
    //  * A simple example showing the usage of BSON instance deserialize function returning a deserialized Javascript function.
    //  *
    //  * @_class bson
    //  * @_function deserialize
    //  * @ignore
    //  */
    // it('Should correctly deserialize a buffer using the BSON instance parser', function(done) {
    //   // Create a simple object
    //   var doc = {a: 1, func:function(){ console.log('hello world'); }}
    //   // Create a BSON parser instance
    //   var bson = BSON;
    //   // Serialize the object to a buffer, checking keys and serializing functions
    //   var buffer = bson.serialize(doc, true, true, true);
    //   // Validate the correctness
    //   expect(65).to.equal(buffer.length);
    //
    //   // Deserialize the object with no eval for the functions
    //   var deserializedDoc = bson.deserialize(buffer);
    //   // Validate the correctness
    //   expect('object').to.equal(typeof deserializedDoc.func);
    //   expect(1).to.equal(deserializedDoc.a);
    //
    //   // Deserialize the object with eval for the functions caching the functions
    //   deserializedDoc = bson.deserialize(buffer, {evalFunctions:true, cacheFunctions:true});
    //   // Validate the correctness
    //   expect('function').to.equal(typeof deserializedDoc.func);
    //   expect(1).to.equal(deserializedDoc.a);
    //   done();
    // }

    // /**
    //  * A simple example showing the usage of bson.decodeStream function returning deserialized Javascript objects.
    //  *
    //  * @_class bson
    //  * @_function bson.decodeStream
    //  * @ignore
    //  */
    // it('Should correctly deserializeStream a buffer object', function(done) {
    //   // Create a simple object
    //   var doc = {a: 1, func:function(){ console.log('hello world'); }}
    //   var bson = BSON;
    //   // Serialize the object to a buffer, checking keys and serializing functions
    //   var buffer = bson.serialize(doc, {
    //     checkKeys: true,
    //     serializeFunctions: true
    //   });
    //   // Validate the correctness
    //   expect(65).to.equal(buffer.length);
    //
    //   // The array holding the number of retuned documents
    //   var documents = new Array(1);
    //   // Deserialize the object with no eval for the functions
    //   var index = bson.deserializeStream(buffer, 0, 1, documents, 0);
    //   // Validate the correctness
    //   expect(65).to.equal(index);
    //   expect(1).to.equal(documents.length);
    //   expect(1).to.equal(documents[0].a);
    //   expect('object').to.equal(typeof documents[0].func);
    //
    //   // Deserialize the object with eval for the functions caching the functions
    //   // The array holding the number of retuned documents
    //   var documents = new Array(1);
    //   // Deserialize the object with no eval for the functions
    //   var index = bson.deserializeStream(buffer, 0, 1, documents, 0, {evalFunctions:true, cacheFunctions:true});
    //   // Validate the correctness
    //   expect(65).to.equal(index);
    //   expect(1).to.equal(documents.length);
    //   expect(1).to.equal(documents[0].a);
    //   expect('function').to.equal(typeof documents[0].func);
    //   done();
    // }

    // /**
    //  * A simple example showing the usage of BSON instance deserializeStream function returning deserialized Javascript objects.
    //  *
    //  * @_class bson
    //  * @_function deserializeStream
    //  * @ignore
    //  */
    // it('Should correctly deserializeStream a buffer object', function(done) {
    //   // Create a simple object
    //   var doc = {a: 1, func:function(){ console.log('hello world'); }}
    //   // Create a BSON parser instance
    //   var bson = BSON;
    //   // Serialize the object to a buffer, checking keys and serializing functions
    //   var buffer = bson.serialize(doc, true, true, true);
    //   // Validate the correctness
    //   expect(65).to.equal(buffer.length);
    //
    //   // The array holding the number of retuned documents
    //   var documents = new Array(1);
    //   // Deserialize the object with no eval for the functions
    //   var index = bson.deserializeStream(buffer, 0, 1, documents, 0);
    //   // Validate the correctness
    //   expect(65).to.equal(index);
    //   expect(1).to.equal(documents.length);
    //   expect(1).to.equal(documents[0].a);
    //   expect('object').to.equal(typeof documents[0].func);
    //
    //   // Deserialize the object with eval for the functions caching the functions
    //   // The array holding the number of retuned documents
    //   var documents = new Array(1);
    //   // Deserialize the object with no eval for the functions
    //   var index = bson.deserializeStream(buffer, 0, 1, documents, 0, {evalFunctions:true, cacheFunctions:true});
    //   // Validate the correctness
    //   expect(65).to.equal(index);
    //   expect(1).to.equal(documents.length);
    //   expect(1).to.equal(documents[0].a);
    //   expect('function').to.equal(typeof documents[0].func);
    //   done();
    // }

    it("should properly deserialize multiple documents using deserializeStream", () => {
        const docs = [{ foo: "bar" }, { foo: "baz" }, { foo: "quux" }];

        // Serialize the test data
        const serializedDocs = [];
        for (let i = 0; i < docs.length; i++) {
            serializedDocs[i] = bson.encode(docs[i]);
        }
        const buf = Buffer.concat(serializedDocs);

        const parsedDocs = [];
        bson.decodeStream(buf, 0, docs.length, parsedDocs, 0);

        docs.forEach((doc, i) => expect(doc).to.deep.equal(parsedDocs[i]));
    });

    /**
     * @ignore
     */
    it("ObjectId should have a correct cached representation of the hexString", (done) => {
        ObjectId.cacheHexString = true;
        let a = new ObjectId();
        let __id = a.__id;
        expect(__id).to.equal(a.toHexString());

        // hexString
        a = new ObjectId(__id);
        expect(__id).to.equal(a.toHexString());

        // fromHexString
        a = ObjectId.createFromHexString(__id);
        expect(a.__id).to.equal(a.toHexString());
        expect(__id).to.equal(a.toHexString());

        // number
        const genTime = a.generationTime;
        a = new ObjectId(genTime);
        __id = a.__id;
        expect(__id).to.equal(a.toHexString());

        // generationTime
        delete a.__id;
        a.generationTime = genTime;
        expect(__id).to.equal(a.toHexString());

        // createFromTime
        a = ObjectId.createFromTime(genTime);
        __id = a.__id;
        expect(__id).to.equal(a.toHexString());
        ObjectId.cacheHexString = false;

        done();
    });

    /**
     * @ignore
     */
    it("Should fail to create ObjectId due to illegal hex code", (done) => {
        try {
            new ObjectId("zzzzzzzzzzzzzzzzzzzzzzzz");
            expect(false).to.be.ok;
        } catch (err) {
            expect(true).to.be.ok;
        }

        expect(false).to.equal(ObjectId.isValid(null));
        expect(false).to.equal(ObjectId.isValid({}));
        expect(false).to.equal(ObjectId.isValid({ length: 12 }));
        expect(false).to.equal(ObjectId.isValid([]));
        expect(false).to.equal(ObjectId.isValid(true));
        expect(true).to.equal(ObjectId.isValid(0));
        expect(false).to.equal(ObjectId.isValid("invalid"));
        expect(true).to.equal(ObjectId.isValid("zzzzzzzzzzzz"));
        expect(false).to.equal(ObjectId.isValid("zzzzzzzzzzzzzzzzzzzzzzzz"));
        expect(true).to.equal(ObjectId.isValid("000000000000000000000000"));
        expect(true).to.equal(ObjectId.isValid(new ObjectId("thisis12char")));

        const tmp = new ObjectId();
        // Cloning tmp so that instanceof fails to fake import from different version/instance of the same npm package
        const objectIdLike = {
            id: tmp.id,
            toHexString() {
                return tmp.toHexString();
            }
        };

        expect(true).to.equal(tmp.equals(objectIdLike));
        expect(true).to.equal(tmp.equals(new ObjectId(objectIdLike)));
        expect(true).to.equal(ObjectId.isValid(objectIdLike));

        done();
    });

    /**
     * @ignore
     */
    it("Should correctly serialize the BSONRegExp type", (done) => {
        const doc = { regexp: new BSONRegExp("test", "i") };
        let doc1 = { regexp: /test/i };
        const serializedData = bson.encode(doc);
        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        doc1 = bson.decode(serializedData);
        const regexp = new RegExp("test", "i");
        expect(regexp).to.deep.equal(doc1.regexp);
        done();
    });

    /**
     * @ignore
     */
    it("Should correctly deserialize the BSONRegExp type", (done) => {
        const doc = { regexp: new BSONRegExp("test", "i") };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const doc1 = bson.decode(serializedData, { bsonRegExp: true });
        expect(doc1.regexp instanceof BSONRegExp).to.be.ok;
        expect("test").to.equal(doc1.regexp.pattern);
        expect("i").to.equal(doc1.regexp.options);
        done();
    });

    /**
     * @ignore
     */
    it("Should return boolean for ObjectId equality check", (done) => {
        const id = new ObjectId();
        expect(true).to.equal(id.equals(new ObjectId(id.toString())));
        expect(true).to.equal(id.equals(id.toString()));
        expect(false).to.equal(id.equals("1234567890abcdef12345678"));
        expect(false).to.equal(id.equals("zzzzzzzzzzzzzzzzzzzzzzzz"));
        expect(false).to.equal(id.equals("foo"));
        expect(false).to.equal(id.equals(null));
        expect(false).to.equal(id.equals(undefined));
        done();
    });

    it("should serialize ObjectIds from old bson versions", () => {
        // create a wrapper simulating the old ObjectID class
        class ObjectID {
            constructor() {
                this.oid = new ObjectId();
            }

            get id() {
                return this.oid.id;
            }

            toString() {
                return this.oid.toString();
            }
        }
        Object.defineProperty(ObjectID.prototype, "_bsontype", { value: "ObjectID" });

        // Array
        const array = [new ObjectID(), new ObjectId()];
        const deserializedArrayAsMap = bson.decode(bson.encode(array));
        const deserializedArray = Object.keys(deserializedArrayAsMap).map(
            (x) => deserializedArrayAsMap[x]
        );
        expect(deserializedArray.map((x) => x.toString())).to.eql(array.map((x) => x.toString()));

        // Map
        const map = new Map();
        map.set("oldBsonType", new ObjectID());
        map.set("newBsonType", new ObjectId());
        const deserializedMapAsObject = bson.decode(bson.encode(map), { relaxed: false });
        const deserializedMap = new Map(
            Object.keys(deserializedMapAsObject).map((k) => [k, deserializedMapAsObject[k]])
        );

        map.forEach((value, key) => {
            expect(deserializedMap.has(key)).to.be.true;
            const deserializedMapValue = deserializedMap.get(key);
            expect(deserializedMapValue.toString()).to.equal(value.toString());
        });

        // Object
        const record = { oldBsonType: new ObjectID(), newBsonType: new ObjectId() };
        const deserializedObject = bson.decode(bson.encode(record));
        expect(deserializedObject).to.have.keys(["oldBsonType", "newBsonType"]);
        expect(record.oldBsonType.toString()).to.equal(deserializedObject.oldBsonType.toString());
        expect(record.newBsonType.toString()).to.equal(deserializedObject.newBsonType.toString());
    });
});
