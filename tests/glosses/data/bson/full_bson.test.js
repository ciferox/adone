import { BinaryParser } from "./binary_parser";

describe("data", "bson", "full", () => {
    const {
        data: { bson: { BSON, ObjectId, Binary, BSONRegExp } },
        std: { fs, assert, path }
    } = adone;

    const serializer = new BSON();

    it("should correctly deserialize object", () => {
        const bytes = [
            95, 0, 0, 0, 2, 110, 115, 0,
            42, 0, 0, 0, 105, 110, 116, 101,
            103, 114, 97, 116, 105, 111, 110, 95,
            116, 101, 115, 116, 115, 95, 46, 116,
            101, 115, 116, 95, 105, 110, 100, 101,
            120, 95, 105, 110, 102, 111, 114, 109,
            97, 116, 105, 111, 110, 0, 8, 117,
            110, 105, 113, 117, 101, 0, 0, 3,
            107, 101, 121, 0, 12, 0, 0, 0,
            16, 97, 0, 1, 0, 0, 0, 0,
            2, 110, 97, 109, 101, 0, 4, 0,
            0, 0, 97, 95, 49, 0, 0
        ];
        let serializedВata = "";
        // Convert to chars
        for (let i = 0; i < bytes.length; i++) {
            serializedВata = serializedВata + BinaryParser.fromByte(bytes[i]);
        }

        const object = serializer.deserialize(new Buffer(serializedВata, "binary"));
        assert.equal("a_1", object.name);
        assert.equal(false, object.unique);
        assert.equal(1, object.key.a);
    });

    it("should correctly deserialize object with all types", () => {
        const bytes = [
            26, 1, 0, 0, 7, 95, 105, 100,
            0, 161, 190, 98, 75, 118, 169, 3,
            0, 0, 3, 0, 0, 4, 97, 114,
            114, 97, 121, 0, 26, 0, 0, 0,
            16, 48, 0, 1, 0, 0, 0, 16,
            49, 0, 2, 0, 0, 0, 16, 50,
            0, 3, 0, 0, 0, 0, 2, 115,
            116, 114, 105, 110, 103, 0, 6, 0,
            0, 0, 104, 101, 108, 108, 111, 0, 3,
            104, 97, 115, 104, 0, 19, 0, 0, 0,
            16, 97, 0, 1, 0, 0, 0, 16,
            98, 0, 2, 0, 0, 0, 0, 9,
            100, 97, 116, 101, 0, 161, 190, 98,
            75, 0, 0, 0, 0, 7, 111, 105, 100,
            0, 161, 190, 98, 75, 90, 217, 18,
            0, 0, 1, 0, 0, 5, 98, 105,
            110, 97, 114, 121, 0, 7, 0, 0, 0,
            2, 3, 0, 0, 0, 49, 50, 51,
            16, 105, 110, 116, 0, 42, 0, 0,
            0, 1, 102, 108, 111, 97, 116, 0,
            223, 224, 11, 147, 169, 170, 64, 64,
            11, 114, 101, 103, 101, 120, 112, 0,
            102, 111, 111, 98, 97, 114, 0, 105,
            0, 8, 98, 111, 111, 108, 101, 97,
            110, 0, 1, 15, 119, 104, 101, 114,
            101, 0, 25, 0, 0, 0, 12, 0,
            0, 0, 116, 104, 105, 115, 46, 120,
            32, 61, 61, 32, 51, 0, 5, 0,
            0, 0, 0, 3, 100, 98, 114, 101,
            102, 0, 37, 0, 0, 0, 2, 36,
            114, 101, 102, 0, 5, 0, 0, 0,
            116, 101, 115, 116, 0, 7, 36, 105,
            100, 0, 161, 190, 98, 75, 2, 180,
            1, 0, 0, 2, 0, 0, 0, 10,
            110, 117, 108, 108, 0, 0
        ];
        let serializedВata = "";
        // Convert to chars
        for (let i = 0; i < bytes.length; i++) {
            serializedВata = serializedВata + BinaryParser.fromByte(bytes[i]);
        }

        const object = serializer.deserialize(new Buffer(serializedВata, "binary"));
        assert.equal("hello", object.string);
        assert.deepEqual([1, 2, 3], object.array);
        assert.equal(1, object.hash.a);
        assert.equal(2, object.hash.b);
        assert.ok(object.date !== null);
        assert.ok(object.oid !== null);
        assert.ok(object.binary !== null);
        assert.equal(42, object.int);
        assert.equal(33.3333, object.float);
        assert.ok(object.regexp !== null);
        assert.equal(true, object.boolean);
        assert.ok(object.where !== null);
        assert.ok(object.dbref !== null);
        assert.ok(object.null === null);
    });

    it("should serialize and deserialize String", () => {
        const testЫtring = { hello: "world" };
        const serializedВata = serializer.serialize(testЫtring);
        assert.deepEqual(testЫtring, serializer.deserialize(serializedВata));
    });

    it("should correctly serialize and deserialize Integer", () => {
        const testNumber = { doc: 5 };
        const serializedData = serializer.serialize(testNumber);
        assert.deepEqual(testNumber, serializer.deserialize(serializedData));
    });

    it("should correctly serialize and deserialize null value", () => {
        const testNull = { doc: null };
        const serializedData = serializer.serialize(testNull);
        const object = serializer.deserialize(serializedData);
        assert.deepEqual(testNull, object);
    });

    it("should correctly serialize and deserialize undefined value", () => {
        const testUndefined = { doc: undefined };
        const serializedData = serializer.serialize(testUndefined);
        const object = serializer.deserialize(new Buffer(serializedData, "binary"));
        assert.equal(null, object.doc);
    });

    it("should correctly serialize and deserialize Number 3", () => {
        const testNumber = { doc: 5.5 };
        const serializedData = serializer.serialize(testNumber);
        assert.deepEqual(testNumber, serializer.deserialize(serializedData));
    });

    it("should correctly serialize and deserialize Integer", () => {
        let testInt = { doc: 42 };
        let serializedData = serializer.serialize(testInt);
        assert.deepEqual(testInt, serializer.deserialize(serializedData));

        testInt = { doc: -5600 };
        serializedData = serializer.serialize(testInt);
        assert.deepEqual(testInt, serializer.deserialize(serializedData));

        testInt = { doc: 2147483647 };
        serializedData = serializer.serialize(testInt);
        assert.deepEqual(testInt, serializer.deserialize(serializedData));

        testInt = { doc: -2147483648 };
        serializedData = serializer.serialize(testInt);
        assert.deepEqual(testInt, serializer.deserialize(serializedData));
    });

    it("should correctly serialize and deserialize Object", () => {
        const doc = { doc: { age: 42, name: "Spongebob", shoeSize: 9.5 } };
        const serializedData = serializer.serialize(doc);
        assert.deepEqual(doc, serializer.deserialize(serializedData));
    });

    it("should correctly serialize and deserialize Array", () => {
        const doc = { doc: [1, 2, "a", "b"] };
        const serializedData = serializer.serialize(doc);
        assert.deepEqual(doc, serializer.deserialize(serializedData));
    });

    it("should correctly serialize and deserialize Array with added on functions", () => {
        const doc = { doc: [1, 2, "a", "b"] };
        const serializedData = serializer.serialize(doc);
        assert.deepEqual(doc, serializer.deserialize(serializedData));
    });

    it("should correctly serialize and deserialize A Boolean", () => {
        const doc = { doc: true };
        const serializedData = serializer.serialize(doc);
        assert.deepEqual(doc, serializer.deserialize(serializedData));
    });

    it("should correctly serialize and deserialize a Date", () => {
        const date = new Date();
        //(2009, 11, 12, 12, 00, 30)
        date.setUTCDate(12);
        date.setUTCFullYear(2009);
        date.setUTCMonth(11 - 1);
        date.setUTCHours(12);
        date.setUTCMinutes(0);
        date.setUTCSeconds(30);
        const doc = { doc: date };
        const serializedData = serializer.serialize(doc);
        assert.deepEqual(doc, serializer.deserialize(serializedData));
    });

    it("should correctly serialize and deserialize Oid", () => {
        const doc = { doc: new ObjectId() };
        const serializedData = serializer.serialize(doc);
        assert.deepEqual(
            doc.doc.toHexString(),
            serializer.deserialize(serializedData).doc.toHexString()
        );
    });

    it("should correctly serialize and deserialize Buffer", () => {
        const doc = { doc: new Buffer("123451234512345") };
        const serializedData = serializer.serialize(doc);

        assert.equal("123451234512345", serializer.deserialize(serializedData).doc.buffer.toString("ascii"));
    });

    it("should correctly serialize and deserialize Buffer with promoteBuffers option", () => {
        const doc = { doc: new Buffer("123451234512345") };
        const serializedData = serializer.serialize(doc);

        const options = { promoteBuffers: true };
        assert.equal("123451234512345", serializer.deserialize(serializedData, options).doc.toString("ascii"));
    });

    it("should correctly encode Empty Hash", () => {
        const testCode = {};
        const serializedData = serializer.serialize(testCode);
        assert.deepEqual(testCode, serializer.deserialize(serializedData));
    });

    it("should correctly serialize and deserialize Ordered Hash", () => {
        const doc = { doc: { b: 1, a: 2, c: 3, d: 4 } };
        const serializedData = serializer.serialize(doc);
        const decodedHash = serializer.deserialize(serializedData).doc;
        const keys = [];
        for (const name in decodedHash) {
            keys.push(name);
        }
        assert.deepEqual(["b", "a", "c", "d"], keys);
    });

    it("should correctly serialize and deserialize Regular Expression", () => {
        const doc = { doc: /foobar/mi };
        const serializedData = serializer.serialize(doc);
        const doc2 = serializer.deserialize(serializedData);
        assert.equal(doc.doc.toString(), doc2.doc.toString());
    });

    it("should correctly serialize and deserialize a Binary object", () => {
        const bin = new Binary();
        const string = "binstring";
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }
        const doc = { doc: bin };
        const serializedData = serializer.serialize(doc);
        const deserializedData = serializer.deserialize(serializedData);
        assert.equal(doc.doc.value(), deserializedData.doc.value());
    });

    it("should correctly serialize and deserialize a big Binary object", () => {
        const data = fs.readFileSync(path.join(__dirname, "data/test_gs_weird_bug.png"), "binary");
        const bin = new Binary();
        bin.write(data);
        const doc = { doc: bin };
        const serializedData = serializer.serialize(doc);
        const deserializedData = serializer.deserialize(serializedData);
        assert.equal(doc.doc.value(), deserializedData.doc.value());
    });

    it("should correctly deserialize bson file from mongodump", () => {
        const data = fs.readFileSync(path.join(__dirname, "data/test.bson"), { encoding: null });
        const docs = [];
        let bsonIndex = 0;
        while (bsonIndex < data.length) {
            bsonIndex = serializer.deserializeStream(
                data,
                bsonIndex,
                1,
                docs,
                docs.length,
                { isArray: true }
            );
        }

        assert.equal(docs.length, 1);
    });

    it("should correctly fail due to attempting serialization of illegal key values", () => {
        const k = new Buffer(15);
        for (let i = 0; i < 15; i++) {
            k[i] = 0;
        }

        k.write("hello");
        k[6] = 0x06;
        k.write("world", 10);

        const v = new Buffer(65801);
        for (let i = 0; i < 65801; i++) {
            v[i] = 1;
        }
        v[0] = 0x0A;
        const doc = {};
        doc[k.toString()] = v.toString();

        // should throw due to null character
        try {
            serializer.serialize(doc, {
                checkKeys: true
            });
            expect(false).to.be.ok;
        } catch (err) {
            //
        }

        try {
            serializer.serialize(doc, {
                checkKeys: true
            });
            expect(false).to.be.ok;
        } catch (err) {
            //
        }
    });

    it("should correctly fail to serialize regexp with null bytes", () => {
        const doc = {};
        doc.test = new RegExp("a\0b");  // eslint-disable-line

        try {
            serializer.serialize(doc, {
                checkKeys: true
            });
            expect(false).to.be.ok;
        } catch (err) {
            //
        }
    });

    it("should correctly fail to serialize BSONRegExp with null bytes", () => {
        const doc = {};
        doc.test = new BSONRegExp("a\0b");

        try {
            serializer.serialize(doc, {
                checkKeys: true
            });
            expect(false).to.be.ok;
        } catch (err) {
            //
        }
    });
});
