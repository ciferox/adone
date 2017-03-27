/* global describe it */

import { BinaryParser } from "./binary_parser";

const { bson } = adone.data;
const BSON = bson.BSON;
const ObjectId = bson.ObjectId;
const Binary = bson.Binary;
const BSONRegExp = bson.BSONRegExp;
const { fs, assert, path } = adone.std;

function createBSON() {
    return new BSON();
}

const serializer = createBSON();

describe("", () => {
    it("Should Correctly Deserialize object", function () {
        const bytes = [95, 0, 0, 0, 2, 110, 115, 0, 42, 0, 0, 0, 105, 110, 116, 101, 103, 114, 97, 116, 105, 111, 110, 95, 116, 101, 115, 116, 115, 95, 46, 116, 101, 115, 116, 95, 105, 110, 100, 101, 120, 95, 105, 110, 102, 111, 114, 109, 97, 116, 105, 111, 110, 0, 8, 117, 110, 105, 113, 117, 101, 0, 0, 3, 107, 101, 121, 0, 12, 0, 0, 0, 16, 97, 0, 1, 0, 0, 0, 0, 2, 110, 97, 109, 101, 0, 4, 0, 0, 0, 97, 95, 49, 0, 0];
        let serialized_data = "";
        // Convert to chars
        for (let i = 0; i < bytes.length; i++) {
            serialized_data = serialized_data + BinaryParser.fromByte(bytes[i]);
        }

        const object = serializer.deserialize(new Buffer(serialized_data, "binary"));
        assert.equal("a_1", object.name);
        assert.equal(false, object.unique);
        assert.equal(1, object.key.a);
    });

    /**
     * @ignore
     */
    it("Should Correctly Deserialize object with all types", function () {
        const bytes = [26, 1, 0, 0, 7, 95, 105, 100, 0, 161, 190, 98, 75, 118, 169, 3, 0, 0, 3, 0, 0, 4, 97, 114, 114, 97, 121, 0, 26, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 16, 50, 0, 3, 0, 0, 0, 0, 2, 115, 116, 114, 105, 110, 103, 0, 6, 0, 0, 0, 104, 101, 108, 108, 111, 0, 3, 104, 97, 115, 104, 0, 19, 0, 0, 0, 16, 97, 0, 1, 0, 0, 0, 16, 98, 0, 2, 0, 0, 0, 0, 9, 100, 97, 116, 101, 0, 161, 190, 98, 75, 0, 0, 0, 0, 7, 111, 105, 100, 0, 161, 190, 98, 75, 90, 217, 18, 0, 0, 1, 0, 0, 5, 98, 105, 110, 97, 114, 121, 0, 7, 0, 0, 0, 2, 3, 0, 0, 0, 49, 50, 51, 16, 105, 110, 116, 0, 42, 0, 0, 0, 1, 102, 108, 111, 97, 116, 0, 223, 224, 11, 147, 169, 170, 64, 64, 11, 114, 101, 103, 101, 120, 112, 0, 102, 111, 111, 98, 97, 114, 0, 105, 0, 8, 98, 111, 111, 108, 101, 97, 110, 0, 1, 15, 119, 104, 101, 114, 101, 0, 25, 0, 0, 0, 12, 0, 0, 0, 116, 104, 105, 115, 46, 120, 32, 61, 61, 32, 51, 0, 5, 0, 0, 0, 0, 3, 100, 98, 114, 101, 102, 0, 37, 0, 0, 0, 2, 36, 114, 101, 102, 0, 5, 0, 0, 0, 116, 101, 115, 116, 0, 7, 36, 105, 100, 0, 161, 190, 98, 75, 2, 180, 1, 0, 0, 2, 0, 0, 0, 10, 110, 117, 108, 108, 0, 0];
        let serialized_data = "";
        // Convert to chars
        for (let i = 0; i < bytes.length; i++) {
            serialized_data = serialized_data + BinaryParser.fromByte(bytes[i]);
        }

        const object = serializer.deserialize(new Buffer(serialized_data, "binary"));
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
        assert.ok(object["null"] == null);
    });

    /**
     * @ignore
     */
    it("Should Serialize and Deserialize String", function () {
        const test_string = { hello: "world" };
        const serialized_data = serializer.serialize(test_string);
        assert.deepEqual(test_string, serializer.deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Integer", function () {
        const test_number = { doc: 5 };
        const serialized_data = serializer.serialize(test_number);
        assert.deepEqual(test_number, serializer.deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize null value", function () {
        const test_null = { doc: null };
        const serialized_data = serializer.serialize(test_null);
        const object = serializer.deserialize(serialized_data);
        assert.deepEqual(test_null, object);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize undefined value", function () {
        const test_undefined = { doc: undefined };
        const serialized_data = serializer.serialize(test_undefined);
        const object = serializer.deserialize(new Buffer(serialized_data, "binary"));
        assert.equal(null, object.doc);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Number 3", function () {
        const test_number = { doc: 5.5 };
        const serialized_data = serializer.serialize(test_number);
        assert.deepEqual(test_number, serializer.deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Integer", function () {
        let test_int = { doc: 42 };
        let serialized_data = serializer.serialize(test_int);
        assert.deepEqual(test_int, serializer.deserialize(serialized_data));

        test_int = { doc: -5600 };
        serialized_data = serializer.serialize(test_int);
        assert.deepEqual(test_int, serializer.deserialize(serialized_data));

        test_int = { doc: 2147483647 };
        serialized_data = serializer.serialize(test_int);
        assert.deepEqual(test_int, serializer.deserialize(serialized_data));

        test_int = { doc: -2147483648 };
        serialized_data = serializer.serialize(test_int);
        assert.deepEqual(test_int, serializer.deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Object", function () {
        const doc = { doc: { age: 42, name: "Spongebob", shoe_size: 9.5 } };
        const serialized_data = serializer.serialize(doc);
        assert.deepEqual(doc, serializer.deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Array", function () {
        const doc = { doc: [1, 2, "a", "b"] };
        const serialized_data = serializer.serialize(doc);
        assert.deepEqual(doc, serializer.deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Array with added on functions", function () {
        const doc = { doc: [1, 2, "a", "b"] };
        const serialized_data = serializer.serialize(doc);
        assert.deepEqual(doc, serializer.deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize A Boolean", function () {
        const doc = { doc: true };
        const serialized_data = serializer.serialize(doc);
        assert.deepEqual(doc, serializer.deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a Date", function () {
        const date = new Date();
        //(2009, 11, 12, 12, 00, 30)
        date.setUTCDate(12);
        date.setUTCFullYear(2009);
        date.setUTCMonth(11 - 1);
        date.setUTCHours(12);
        date.setUTCMinutes(0);
        date.setUTCSeconds(30);
        const doc = { doc: date };
        const serialized_data = serializer.serialize(doc);
        assert.deepEqual(doc, serializer.deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Oid", function () {
        const doc = { doc: new ObjectId() };
        const serialized_data = serializer.serialize(doc);
        assert.deepEqual(doc.doc.toHexString(), serializer.deserialize(serialized_data).doc.toHexString());
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Buffer", function () {
        const doc = { doc: new Buffer("123451234512345") };
        const serialized_data = serializer.serialize(doc);

        assert.equal("123451234512345", serializer.deserialize(serialized_data).doc.buffer.toString("ascii"));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Buffer with promoteBuffers option", function () {
        const doc = { doc: new Buffer("123451234512345") };
        const serialized_data = serializer.serialize(doc);

        const options = { promoteBuffers: true };
        assert.equal("123451234512345", serializer.deserialize(serialized_data, options).doc.toString("ascii"));
    });

    /**
     * @ignore
     */
    it("Should Correctly encode Empty Hash", function () {
        const test_code = {};
        const serialized_data = serializer.serialize(test_code);
        assert.deepEqual(test_code, serializer.deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Ordered Hash", function () {
        const doc = { doc: { b: 1, a: 2, c: 3, d: 4 } };
        const serialized_data = serializer.serialize(doc);
        const decoded_hash = serializer.deserialize(serialized_data).doc;
        const keys = [];
        for (const name in decoded_hash) keys.push(name);
        assert.deepEqual(["b", "a", "c", "d"], keys);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Regular Expression", function () {
        const doc = { doc: /foobar/mi };
        const serialized_data = serializer.serialize(doc);
        const doc2 = serializer.deserialize(serialized_data);
        assert.equal(doc.doc.toString(), doc2.doc.toString());
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a Binary object", function () {
        const bin = new Binary();
        const string = "binstring";
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }
        const doc = { doc: bin };
        const serialized_data = serializer.serialize(doc);
        const deserialized_data = serializer.deserialize(serialized_data);
        assert.equal(doc.doc.value(), deserialized_data.doc.value());
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a big Binary object", function () {
        const data = fs.readFileSync(path.join(__dirname, "data/test_gs_weird_bug.png"), "binary");
        const bin = new Binary();
        bin.write(data);
        const doc = { doc: bin };
        const serialized_data = serializer.serialize(doc);
        const deserialized_data = serializer.deserialize(serialized_data);
        assert.equal(doc.doc.value(), deserialized_data.doc.value());
    });

    it("Should Correctly Deserialize bson file from mongodump", function () {
        const data = fs.readFileSync(path.join(__dirname, "data/test.bson"), { encoding: null });
        const docs = [];
        let bsonIndex = 0;
        while (bsonIndex < data.length) bsonIndex = serializer.deserializeStream(data, bsonIndex, 1, docs, docs.length, { isArray: true });

        assert.equal(docs.length, 1);
    });

    it("Should Correctly fail due to attempting serialization of illegal key values", function () {
        const k = new Buffer(15);
        for (let i = 0; i < 15; i++) k[i] = 0;

        k.write("hello");
        k[6] = 0x06;
        k.write("world", 10);

        const v = new Buffer(65801);
        for (let i = 0; i < 65801; i++) v[i] = 1;
        v[0] = 0x0A;
        const doc = {};
        doc[k.toString()] = v.toString();

        // Should throw due to null character
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

    it("Should correctly fail to serialize regexp with null bytes", function () {
        const doc = {};
        doc.test = new RegExp("a\0b");

        try {
            serializer.serialize(doc, {
                checkKeys: true
            });
            expect(false).to.be.ok;
        } catch (err) {
            //
        }
    });

    it("Should correctly fail to serialize BSONRegExp with null bytes", function () {
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