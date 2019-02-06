const {
    data: { bson },
    is
} = adone;

const BinaryParser = require("./binary_parser").BinaryParser;

const {
    ObjectId,
    Binary,
    BSONRegExp    
} = bson;

describe("Full BSON", () => {
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
        const serializedData = bson.encode(testString);
        expect(testString).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Integer", (done) => {
        const testNumber = { doc: 5 };
        const serializedData = bson.encode(testNumber);
        expect(testNumber).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize null value", (done) => {
        const testNull = { doc: null };
        const serializedData = bson.encode(testNull);
        const object = bson.decode(serializedData);
        expect(testNull).to.deep.equal(object);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize undefined value", (done) => {
        const testUndefined = { doc: undefined };
        const serializedData = bson.encode(testUndefined);
        const object = bson.decode(Buffer.from(serializedData, "binary"));
        expect(undefined).to.equal(object.doc);
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Number 3", (done) => {
        const testNumber = { doc: 5.5 };
        const serializedData = bson.encode(testNumber);
        expect(testNumber).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Integer", (done) => {
        let testInt = { doc: 42 };
        let serializedData = bson.encode(testInt);
        expect(testInt).to.deep.equal(bson.decode(serializedData));

        testInt = { doc: -5600 };
        serializedData = bson.encode(testInt);
        expect(testInt).to.deep.equal(bson.decode(serializedData));

        testInt = { doc: 2147483647 };
        serializedData = bson.encode(testInt);
        expect(testInt).to.deep.equal(bson.decode(serializedData));

        testInt = { doc: -2147483648 };
        serializedData = bson.encode(testInt);
        expect(testInt).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Object", (done) => {
        const doc = { doc: { age: 42, name: "Spongebob", shoe_size: 9.5 } };
        const serializedData = bson.encode(doc);
        expect(doc).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Array", (done) => {
        const doc = { doc: [1, 2, "a", "b"] };
        const serializedData = bson.encode(doc);
        expect(doc).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Array with added on functions", (done) => {
        const doc = { doc: [1, 2, "a", "b"] };
        const serializedData = bson.encode(doc);
        expect(doc).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize A Boolean", (done) => {
        const doc = { doc: true };
        const serializedData = bson.encode(doc);
        expect(doc).to.deep.equal(bson.decode(serializedData));
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
        expect(doc).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Oid", (done) => {
        const doc = { doc: new ObjectId() };
        const serializedData = bson.encode(doc);
        expect(doc.doc.toHexString()).to.deep.equal(
            bson.decode(serializedData).doc.toHexString()
        );

        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Buffer", (done) => {
        const doc = { doc: Buffer.from("123451234512345") };
        const serializedData = bson.encode(doc);

        expect("123451234512345").to.equal(
            bson.decode(serializedData).doc.buffer.toString("ascii")
        );

        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Buffer with promoteBuffers option", (done) => {
        const doc = { doc: Buffer.from("123451234512345") };
        const serializedData = bson.encode(doc);

        const options = { promoteBuffers: true };
        expect("123451234512345").to.equal(
            bson.decode(serializedData, options).doc.toString("ascii")
        );

        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly encode Empty Hash", (done) => {
        const testCode = {};
        const serializedData = bson.encode(testCode);
        expect(testCode).to.deep.equal(bson.decode(serializedData));
        done();
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Ordered Hash", (done) => {
        const doc = { doc: { b: 1, a: 2, c: 3, d: 4 } };
        const serializedData = bson.encode(doc);
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
        const doc = { doc: /foobar/im };
        const serializedData = bson.encode(doc);
        const doc2 = bson.decode(serializedData);
        expect(doc.doc.toString()).to.equal(doc2.doc.toString());
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
        const deserializedData = bson.decode(serializedData);
        expect(doc.doc.value()).to.equal(deserializedData.doc.value());
        done();
    });

    it("Should Correctly fail due to attempting serialization of illegal key values", (done) => {
        const k = Buffer.alloc(15);
        for (let i = 0; i < 15; i++) {
            k[i] = 0;
        }

        k.write("hello");
        k[6] = 0x06;
        k.write("world", 10);

        const v = Buffer.alloc(65801);
        for (let i = 0; i < 65801; i++) {
            v[i] = 1;
        }
        v[0] = 0x0a;
        const doc = {};
        doc[k.toString()] = v.toString();

        // Should throw due to null character
        try {
            bson.encode(doc, {
                checkKeys: true
            });
            expect(false).to.be.ok;
        } catch (err) {
            expect(true).to.be.ok;
        }

        done();
    });

    it("Should correctly fail to serialize regexp with null bytes", (done) => {
        const doc = {};
        doc.test = new RegExp("a\0b"); // eslint-disable-line no-control-regex

        try {
            bson.encode(doc, {
                checkKeys: true
            });
            expect(false).to.be.ok;
        } catch (err) {
            expect(true).to.be.ok;
        }

        done();
    });

    it("Should correctly fail to serialize BSONRegExp with null bytes", (done) => {
        const doc = {};
        doc.test = new BSONRegExp("a\0b");

        try {
            bson.encode(doc, {
                checkKeys: true
            });
            expect(false).to.be.ok;
        } catch (err) {
            expect(true).to.be.ok;
        }

        done();
    });
});
