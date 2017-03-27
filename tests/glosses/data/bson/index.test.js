/* global describe it beforeEach afterEach */

"use strict";


const { bson } = adone.data;
const { BSON } = bson;
const { fs, vm, path } = adone.std;
const Code = bson.Code;
const BSONRegExp = bson.BSONRegExp;
const Binary = bson.Binary;
const Timestamp = bson.Timestamp;
const Long = bson.Long;
const MongoReply = bson.MongoReply;
const ObjectId = bson.ObjectId;
const Symbol = bson.Symbol;
const DBRef = bson.DBRef;
const Decimal128 = bson.Decimal128;
const Int32 = bson.Int32;
const Double = bson.Double;
const MinKey = bson.MinKey;
const MaxKey = bson.MaxKey;
import { BinaryParser } from "./binary_parser";


function createBSON() {
    return new BSON();
}

// for tests
Binary.BSON_BINARY_SUBTYPE_DEFAULT = 0;
Binary.BSON_BINARY_SUBTYPE_FUNCTION = 1;
Binary.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
Binary.BSON_BINARY_SUBTYPE_UUID = 3;
Binary.BSON_BINARY_SUBTYPE_MD5 = 4;
Binary.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

Binary.BSON_BINARY_SUBTYPE_DEFAULT = 0;
Binary.BSON_BINARY_SUBTYPE_FUNCTION = 1;
Binary.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
Binary.BSON_BINARY_SUBTYPE_UUID = 3;
Binary.BSON_BINARY_SUBTYPE_MD5 = 4;
Binary.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

const hexStringToBinary = function (string) {
    const numberofValues = string.length / 2;
    let array = "";

    for (let i = 0; i < numberofValues; i++) {
        array += String.fromCharCode(parseInt(string[i * 2] + string[i * 2 + 1], 16));
    }
    return array;
};

const assertBuffersEqual = function (buffer1, buffer2) {
    if (buffer1.length != buffer2.length) {
        throw new Error("Buffers do not have the same length");
    }

    for (let i = 0; i < buffer1.length; i++) {
        expect(buffer1[i]).to.be.equal(buffer2[i]);
    }
};

/**
 * Module for parsing an ISO 8601 formatted string into a Date object.
 */
const ISODate = function (string) {
    let match;

    if (typeof string.getTime === "function")
        return string;
    else if (match = string.match(/^(\d{4})(-(\d{2})(-(\d{2})(T(\d{2}):(\d{2})(:(\d{2})(\.(\d+))?)?(Z|((\+|-)(\d{2}):(\d{2}))))?)?)?$/)) {
        let date = new Date();
        date.setUTCFullYear(Number(match[1]));
        date.setUTCMonth(Number(match[3]) - 1 || 0);
        date.setUTCDate(Number(match[5]) || 0);
        date.setUTCHours(Number(match[7]) || 0);
        date.setUTCMinutes(Number(match[8]) || 0);
        date.setUTCSeconds(Number(match[10]) || 0);
        date.setUTCMilliseconds(Number("." + match[12]) * 1000 || 0);

        if (match[13] && match[13] !== "Z") {
            let h = Number(match[16]) || 0,
                m = Number(match[17]) || 0;

            h *= 3600000;
            m *= 60000;

            let offset = h + m;
            if (match[15] == "+")
                offset = -offset;

            date = new Date(date.valueOf() + offset);
        }

        return date;
    } else
        throw new Error("Invalid ISO 8601 date given.", __filename);
};

describe("bson", () => {
    it("Should Correctly convert ObjectID to itself", function () {
        let myObject, newObject;
        const selfConvertion = function () {
            myObject = new ObjectId();
            newObject = ObjectId(myObject);
        };

        expect(selfConvertion).not.to.throw();
        expect(myObject).to.be.equal(newObject);
    });

    /**
     * @ignore
     */
    it("Should Correctly Deserialize object", function () {
        const bytes = [95, 0, 0, 0, 2, 110, 115, 0, 42, 0, 0, 0, 105, 110, 116, 101, 103, 114, 97, 116, 105, 111, 110, 95, 116, 101, 115, 116, 115, 95, 46, 116, 101, 115, 116, 95, 105, 110, 100, 101, 120, 95, 105, 110, 102, 111, 114, 109, 97, 116, 105, 111, 110, 0, 8, 117, 110, 105, 113, 117, 101, 0, 0, 3, 107, 101, 121, 0, 12, 0, 0, 0, 16, 97, 0, 1, 0, 0, 0, 0, 2, 110, 97, 109, 101, 0, 4, 0, 0, 0, 97, 95, 49, 0, 0];
        let serialized_data = "";
        // Convert to chars
        for (let i = 0; i < bytes.length; i++) {
            serialized_data = serialized_data + BinaryParser.fromByte(bytes[i]);
        }

        const object = createBSON().deserialize(new Buffer(serialized_data, "binary"));
        expect("a_1").to.be.equal(object.name);
        expect(false).to.be.equal(object.unique);
        expect(1).to.be.equal(object.key.a);
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

        const object = createBSON().deserialize(new Buffer(serialized_data, "binary"));
        // Perform tests
        expect("hello").to.be.equal(object.string);
        expect([1, 2, 3]).to.be.deep.equal(object.array);
        expect(1).to.be.equal(object.hash.a);
        expect(2).to.be.equal(object.hash.b);
        expect(object.date != null).to.be.ok;
        expect(object.oid != null).to.be.ok;
        expect(object.binary != null).to.be.ok;
        expect(42).to.be.equal(object.int);
        expect(33.3333).to.be.equal(object.float);
        expect(object.regexp != null).to.be.ok;
        expect(true).to.be.equal(object.boolean);
        expect(object.where != null).to.be.ok;
        expect(object.dbref != null).to.be.ok;
        expect(object[null] == null).to.be.ok;
    });

    /**
     * @ignore
     */
    it("Should Serialize and Deserialize String", function () {
        const test_string = { hello: "world" };
        const serialized_data = createBSON().serialize(test_string, {
            checkKeys: false
        });

        createBSON().serializeWithBufferAndIndex(test_string, serialized_data, {
            checkKeys: false, index: 0
        });

        expect(test_string).to.be.deep.equal(createBSON().deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Serialize and Deserialize Empty String", function () {
        const test_string = { hello: "" };
        const serialized_data = createBSON().serialize(test_string);
        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(test_string));
        createBSON().serializeWithBufferAndIndex(test_string, serialized_data2);

        assertBuffersEqual(serialized_data, serialized_data2, 0);
        expect(test_string).to.be.deep.equal(createBSON().deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Integer", function () {
        const test_number = { doc: 5 };

        const serialized_data = createBSON().serialize(test_number);
        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(test_number));
        createBSON().serializeWithBufferAndIndex(test_number, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        expect(test_number).to.be.deep.equal(createBSON().deserialize(serialized_data));
        expect(test_number).to.be.deep.equal(createBSON().deserialize(serialized_data2));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize null value", function () {
        const test_null = { doc: null };
        const serialized_data = createBSON().serialize(test_null);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(test_null));
        createBSON().serializeWithBufferAndIndex(test_null, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const object = createBSON().deserialize(serialized_data);
        expect(null).to.be.equal(object.doc);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Number 1", function () {
        const test_number = { doc: 5.5 };
        const serialized_data = createBSON().serialize(test_number);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(test_number));
        createBSON().serializeWithBufferAndIndex(test_number, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        expect(test_number).to.be.deep.equal(createBSON().deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Integer", function () {
        let test_int = { doc: 42 };
        let serialized_data = createBSON().serialize(test_int);

        var serialized_data2 = new Buffer(createBSON().calculateObjectSize(test_int));
        createBSON().serializeWithBufferAndIndex(test_int, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        expect(test_int.doc).to.be.deep.equal(createBSON().deserialize(serialized_data).doc);

        test_int = { doc: -5600 };
        serialized_data = createBSON().serialize(test_int);

        var serialized_data2 = new Buffer(createBSON().calculateObjectSize(test_int));
        createBSON().serializeWithBufferAndIndex(test_int, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        expect(test_int.doc).to.be.deep.equal(createBSON().deserialize(serialized_data).doc);

        test_int = { doc: 2147483647 };
        serialized_data = createBSON().serialize(test_int);

        var serialized_data2 = new Buffer(createBSON().calculateObjectSize(test_int));
        createBSON().serializeWithBufferAndIndex(test_int, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        expect(test_int.doc).to.be.deep.equal(createBSON().deserialize(serialized_data).doc);

        test_int = { doc: -2147483648 };
        serialized_data = createBSON().serialize(test_int);

        var serialized_data2 = new Buffer(createBSON().calculateObjectSize(test_int));
        createBSON().serializeWithBufferAndIndex(test_int, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        expect(test_int.doc).to.be.deep.equal(createBSON().deserialize(serialized_data).doc);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Object", function () {
        const doc = { doc: { age: 42, name: "Spongebob", shoe_size: 9.5 } };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        expect(doc.doc.age).to.be.deep.equal(createBSON().deserialize(serialized_data).doc.age);
        expect(doc.doc.name).to.be.deep.equal(createBSON().deserialize(serialized_data).doc.name);
        expect(doc.doc.shoe_size).to.be.deep.equal(createBSON().deserialize(serialized_data).doc.shoe_size);
    });

    /**
     * @ignore
     */
    it("Should correctly ignore undefined values in arrays", function () {
        const doc = { doc: { notdefined: undefined } };
        const serialized_data = createBSON().serialize(doc, {
            ignoreUndefined: true
        });
        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc, {
            ignoreUndefined: true
        }));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2, {
            ignoreUndefined: true
        });

        assertBuffersEqual(serialized_data, serialized_data2, 0);
        const doc1 = createBSON().deserialize(serialized_data);
        const doc2 = createBSON().deserialize(serialized_data2);

        expect(undefined).to.be.deep.equal(doc1.doc.notdefined);
    });

    it("Should correctly serialize undefined array entries as null values", function () {
        const doc = { doc: { notdefined: undefined }, a: [1, 2, undefined, 3] };
        const serialized_data = createBSON().serialize(doc, {
            ignoreUndefined: true
        });
        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc, {
            ignoreUndefined: true
        }));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2, {
            ignoreUndefined: true
        });
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        const doc1 = createBSON().deserialize(serialized_data);
        expect(undefined).to.be.deep.equal(doc1.doc.notdefined);
        expect(null).to.be.equal(doc1.a[2]);
    });

    it("Should correctly serialize undefined array entries as undefined values", function () {
        const doc = { doc: { notdefined: undefined }, a: [1, 2, undefined, 3] };
        const serialized_data = createBSON().serialize(doc, {
            ignoreUndefined: false
        });
        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc, {
            ignoreUndefined: false
        }));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2, {
            ignoreUndefined: false
        });

        // console.log("======================================== 0")
        // console.log(serialized_data.toString('hex'))
        // console.log(serialized_data2.toString('hex'))

        assertBuffersEqual(serialized_data, serialized_data2, 0);
        const doc1 = createBSON().deserialize(serialized_data);
        const doc2 = createBSON().deserialize(serialized_data2);
        // console.log("======================================== 0")
        // console.dir(doc1)
        // console.dir(doc2)

        expect(null).to.be.deep.equal(doc1.doc.notdefined);
        expect(null).to.be.deep.equal(doc2.doc.notdefined);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Array", function () {
        const doc = { doc: [1, 2, "a", "b"] };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized = createBSON().deserialize(serialized_data);
        expect(doc.doc[0]).to.be.equal(deserialized.doc[0]);
        expect(doc.doc[1]).to.be.equal(deserialized.doc[1]);
        expect(doc.doc[2]).to.be.equal(deserialized.doc[2]);
        expect(doc.doc[3]).to.be.equal(deserialized.doc[3]);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Buffer", function () {
        const doc = { doc: new Buffer("hello world") };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized = createBSON().deserialize(serialized_data);
        expect(deserialized.doc instanceof Binary).to.be.ok;
        expect("hello world").to.be.equal(deserialized.doc.toString());
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Buffer with promoteBuffers option", function () {
        const doc = { doc: new Buffer("hello world") };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized = createBSON().deserialize(serialized_data, {
            promoteBuffers: true
        });
        expect(deserialized.doc instanceof Buffer).to.be.ok;
        expect("hello world").to.be.equal(deserialized.doc.toString());
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Number 4", function () {
        const doc = { doc: bson.c.BSON_INT32_MAX + 10 };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized = createBSON().deserialize(serialized_data);
        // test.ok(deserialized.doc instanceof Binary);
        expect(bson.c.BSON_INT32_MAX + 10).to.be.equal(deserialized.doc);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Array with added on functions", function () {
        Array.prototype.toXml = function () { };
        try {
            const doc = { doc: [1, 2, "a", "b"] };
            const serialized_data = createBSON().serialize(doc);

            const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
            createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
            assertBuffersEqual(serialized_data, serialized_data2, 0);

            const deserialized = createBSON().deserialize(serialized_data);
            expect(doc.doc[0]).to.be.equal(deserialized.doc[0]);
            expect(doc.doc[1]).to.be.equal(deserialized.doc[1]);
            expect(doc.doc[2]).to.be.equal(deserialized.doc[2]);
            expect(doc.doc[3]).to.be.equal(deserialized.doc[3]);
        } finally {
            delete Array.prototype.toXml;
        }
    });

    /**
     * @ignore
     */
    it("Should correctly deserialize a nested object", function () {
        const doc = { doc: { doc: 1 } };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        expect(doc.doc.doc).to.be.deep.equal(createBSON().deserialize(serialized_data).doc.doc);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize A Boolean", function () {
        const doc = { doc: true };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        expect(doc.doc).to.be.equal(createBSON().deserialize(serialized_data).doc);
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
        const serialized_data = createBSON().serialize(doc);
        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);

        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const doc1 = createBSON().deserialize(serialized_data);
        expect(doc).to.be.deep.equal(doc1);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a Date from another VM", function () {
        let script = "date1 = new Date();",
            ctx = vm.createContext({
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
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        expect(doc.date).to.be.equal(createBSON().deserialize(serialized_data).doc.date);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize nested doc", function () {
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

        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Oid", function () {
        const doc = { doc: new ObjectId() };
        const doc2 = { doc: ObjectId.createFromHexString(doc.doc.toHexString()) };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        expect(doc).to.be.deep.equal(createBSON().deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly encode Empty Hash", function () {
        const doc = {};
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        expect(doc).to.be.deep.equal(createBSON().deserialize(serialized_data));
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Ordered Hash", function () {
        const doc = { doc: { b: 1, a: 2, c: 3, d: 4 } };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const decoded_hash = createBSON().deserialize(serialized_data).doc;
        const keys = [];

        for (const name in decoded_hash) keys.push(name);
        expect(["b", "a", "c", "d"]).to.be.deep.equal(keys);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Regular Expression", function () {
        // Serialize the regular expression
        const doc = { doc: /foobar/mi };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const doc2 = createBSON().deserialize(serialized_data);

        expect(doc.doc.toString()).to.be.deep.equal(doc2.doc.toString());
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
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);

        expect(doc.doc.value()).to.be.deep.equal(deserialized_data.doc.value());
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a Type 2 Binary object", function () {
        const bin = new Binary(new Buffer("binstring"), Binary.SUBTYPE_BYTE_ARRAY);
        const string = "binstring";
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc = { doc: bin };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);

        expect(doc.doc.value()).to.be.deep.equal(deserialized_data.doc.value());
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a big Binary object", function () {
        const data = fs.readFileSync(path.join(__dirname, "data", "test_gs_weird_bug.png"), "binary");
        const bin = new Binary();
        bin.write(data);
        const doc = { doc: bin };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc.doc.value()).to.be.deep.equal(deserialized_data.doc.value());
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize DBRef", function () {
        const oid = new ObjectId();
        const doc = { dbref: new DBRef("namespace", oid, null) };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const doc2 = createBSON().deserialize(serialized_data);
        expect("namespace").to.be.equal(doc2.dbref.namespace);
        expect(doc2.dbref.oid.toHexString()).to.be.deep.equal(oid.toHexString());
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize partial DBRef", function () {
        const id = new ObjectId();
        const doc = { "name": "something", "user": { "$ref": "username", "$id": id } };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const doc2 = createBSON().deserialize(serialized_data);
        expect("something").to.be.equal(doc2.name);
        expect("username").to.be.equal(doc2.user.namespace);
        expect(id.toString()).to.be.equal(doc2.user.oid.toString());
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize simple Int", function () {
        const doc = { doc: 2147483648 };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const doc2 = createBSON().deserialize(serialized_data);
        expect(doc.doc).to.be.deep.equal(doc2.doc);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Long Integer", function () {
        let doc = { doc: Long.fromNumber(9223372036854775807) };
        let serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        let deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc.doc).to.be.deep.equal(deserialized_data.doc);

        doc = { doc: Long.fromNumber(-9223372036854775) };
        serialized_data = createBSON().serialize(doc);
        deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc.doc).to.be.deep.equal(deserialized_data.doc);

        doc = { doc: Long.fromNumber(-9223372036854775809) };
        serialized_data = createBSON().serialize(doc);
        deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc.doc).to.be.deep.equal(deserialized_data.doc);
    });

    /**
     * @ignore
     */
    it("Should Deserialize Large Integers as Number not Long", function () {
        function roundTrip(val) {
            const doc = { doc: val };
            const serialized_data = createBSON().serialize(doc);

            const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
            createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
            assertBuffersEqual(serialized_data, serialized_data2, 0);

            const deserialized_data = createBSON().deserialize(serialized_data);
            expect(doc.doc).to.be.deep.equal(deserialized_data.doc);
        }

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
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Long Integer and Timestamp as different types", function () {
        const long = Long.fromNumber(9223372036854775807);
        const timestamp = Timestamp.fromNumber(9223372036854775807);
        expect(long instanceof Long).to.be.ok;
        expect(!(long instanceof Timestamp)).to.be.ok;
        expect(timestamp instanceof Timestamp).to.be.ok;
        expect(!(timestamp instanceof Long)).to.be.ok;

        const test_int = { doc: long, doc2: timestamp };
        const serialized_data = createBSON().serialize(test_int);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(test_int));
        createBSON().serializeWithBufferAndIndex(test_int, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);
        expect(test_int.doc).to.be.deep.equal(deserialized_data.doc);
    });

    /**
     * @ignore
     */
    it("Should Always put the id as the first item in a hash", function () {
        const hash = { doc: { not_id: 1, "_id": 2 } };
        const serialized_data = createBSON().serialize(hash);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(hash));
        createBSON().serializeWithBufferAndIndex(hash, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);
        const keys = [];

        for (const name in deserialized_data.doc) {
            keys.push(name);
        }

        expect(["not_id", "_id"]).to.be.deep.equal(keys);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize a User defined Binary object", function () {
        const bin = new Binary();
        bin.subType = Binary.BSON_BINARY_SUBTYPE_USER_DEFINED;
        const string = "binstring";
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc = { doc: bin };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        const deserialized_data = createBSON().deserialize(serialized_data);

        expect(deserialized_data.doc.subType).to.be.deep.equal(Binary.BSON_BINARY_SUBTYPE_USER_DEFINED);
        expect(doc.doc.value()).to.be.deep.equal(deserialized_data.doc.value());
    });

    /**
     * @ignore
     */
    it("Should Correclty Serialize and Deserialize a Code object", function () {
        const doc = { "doc": { "doc2": new Code("this.a > i", { i: 1 }) } };
        const serialized_data = createBSON().serialize(doc);
        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc.doc.doc2.code).to.be.deep.equal(deserialized_data.doc.doc2.code);
        expect(doc.doc.doc2.scope.i).to.be.deep.equal(deserialized_data.doc.doc2.scope.i);
    });

    /**
     * @ignore
     */
    it("Should Correctly serialize and deserialize and embedded array", function () {
        const doc = {
            "a": 0,
            "b": ["tmp1", "tmp2", "tmp3", "tmp4", "tmp5", "tmp6", "tmp7", "tmp8", "tmp9", "tmp10", "tmp11", "tmp12", "tmp13", "tmp14", "tmp15", "tmp16"]
        };

        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc.a).to.be.deep.equal(deserialized_data.a);
        expect(doc.b).to.be.deep.equal(deserialized_data.b);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize UTF8", function () {
        // Serialize utf8
        const doc = {
            "name": "本荘由利地域に洪水警報",
            "name1": "öüóőúéáűíÖÜÓŐÚÉÁŰÍ",
            "name2": "abcdedede",
            "name3": "本荘由利地域に洪水警報",
            "name4": "abcdedede",
            "本荘由利地域に洪水警報": "本荘由利地域に洪水警報",
            "本荘由利地本荘由利地": {
                "本荘由利地域に洪水警報": "本荘由利地域に洪水警報",
                "地域に洪水警報本荘由利": "本荘由利地域に洪水警報",
                "洪水警報本荘地域に洪水警報本荘由利": "本荘由利地域に洪水警報"
            }
        };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc).to.be.deep.equal(deserialized_data);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize query object", function () {
        const doc = { count: "remove_with_no_callback_bug_test", query: {}, fields: null };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc).to.be.deep.equal(deserialized_data);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize empty query object", function () {
        const doc = {};
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc).to.be.deep.equal(deserialized_data);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize array based doc", function () {
        const doc = { b: [1, 2, 3], _id: new ObjectId() };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc.b).to.be.deep.equal(deserialized_data.b);
        expect(doc).to.be.deep.equal(deserialized_data);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize and Deserialize Symbol", function () {
        if (Symbol != null) {
            const doc = { b: [new Symbol("test")] };
            const serialized_data = createBSON().serialize(doc);

            const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
            createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
            assertBuffersEqual(serialized_data, serialized_data2, 0);

            const deserialized_data = createBSON().deserialize(serialized_data);
            expect(doc.b).to.be.deep.equal(deserialized_data.b);
            expect(doc).to.be.deep.equal(deserialized_data);
            expect(deserialized_data.b[0] instanceof Symbol).to.be.ok;
        }
    });

    /**
     * @ignore
     */
    it("Should handle Deeply nested document", function () {
        const doc = { a: { b: { c: { d: 2 } } } };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const deserialized_data = createBSON().deserialize(serialized_data);
        expect(doc).to.be.deep.equal(deserialized_data);
    });

    /**
     * @ignore
     */
    it("Should handle complicated all typed object", function () {
        // First doc
        const date = new Date();
        var oid = new ObjectId();
        var string = "binstring";
        var bin = new Binary();
        for (var index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc = {
            "string": "hello",
            "array": [1, 2, 3],
            "hash": { "a": 1, "b": 2 },
            "date": date,
            "oid": oid,
            "binary": bin,
            "int": 42,
            "float": 33.3333,
            "regexp": /regexp/,
            "boolean": true,
            "long": date.getTime(),
            "where": new Code("this.a > i", { i: 1 }),
            "dbref": new DBRef("namespace", oid, "integration_tests_")
        };

        // Second doc
        var oid = new ObjectId.createFromHexString(oid.toHexString());
        var string = "binstring";
        var bin = new Binary();
        for (var index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc2 = {
            "string": "hello",
            "array": [1, 2, 3],
            "hash": { "a": 1, "b": 2 },
            "date": date,
            "oid": oid,
            "binary": bin,
            "int": 42,
            "float": 33.3333,
            "regexp": /regexp/,
            "boolean": true,
            "long": date.getTime(),
            "where": new Code("this.a > i", { i: 1 }),
            "dbref": new DBRef("namespace", oid, "integration_tests_")
        };

        const serialized_data = createBSON().serialize(doc);

        var serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        var serialized_data2 = createBSON().serialize(doc2, false, true);

        for (let i = 0; i < serialized_data2.length; i++) {
            require("assert").equal(serialized_data2[i], serialized_data[i]);
        }
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize Complex Nested Object", function () {
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

        const serialized_data = createBSON().serialize(doc);

        var serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const doc2 = doc;
        doc2._id = ObjectId.createFromHexString(doc2._id.toHexString());
        var serialized_data2 = createBSON().serialize(doc2, false, true);

        for (let i = 0; i < serialized_data2.length; i++) {
            require("assert").equal(serialized_data2[i], serialized_data[i]);
        }
    });

    /**
     * @ignore
     */
    it("Should correctly massive doc", function () {
        const oid1 = new ObjectId();
        const oid2 = new ObjectId();

        // JS doc
        const doc = {
            dbref2: new DBRef("namespace", oid1, "integration_tests_"),
            _id: oid2
        };

        const doc2 = {
            dbref2: new DBRef("namespace", ObjectId.createFromHexString(oid1.toHexString()), "integration_tests_"),
            _id: new ObjectId.createFromHexString(oid2.toHexString())
        };

        const serialized_data = createBSON().serialize(doc);

        var serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        var serialized_data2 = createBSON().serialize(doc2, false, true);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize/Deserialize regexp object", function () {
        const doc = { "b": /foobaré/ };

        const serialized_data = createBSON().serialize(doc);

        var serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        var serialized_data2 = createBSON().serialize(doc);

        for (let i = 0; i < serialized_data2.length; i++) {
            require("assert").equal(serialized_data2[i], serialized_data[i]);
        }
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize/Deserialize complicated object", function () {
        const doc = { a: { b: { c: [new ObjectId(), new ObjectId()] } }, d: { f: 1332.3323 } };

        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const doc2 = createBSON().deserialize(serialized_data);

        expect(doc).to.be.deep.equal(doc2);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize/Deserialize nested object", function () {
        const doc = {
            "_id": { "date": new Date(), "gid": "6f35f74d2bea814e21000000" },
            "value": {
                "b": { "countries": { "--": 386 }, "total": 1599 },
                "bc": { "countries": { "--": 3 }, "total": 10 },
                "gp": { "countries": { "--": 2 }, "total": 13 },
                "mgc": { "countries": { "--": 2 }, "total": 14 }
            }
        };

        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const doc2 = createBSON().deserialize(serialized_data);

        expect(doc).to.be.deep.equal(doc2);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize/Deserialize nested object with even more nesting", function () {
        const doc = {
            "_id": { "date": { a: 1, b: 2, c: new Date() }, "gid": "6f35f74d2bea814e21000000" },
            "value": {
                "b": { "countries": { "--": 386 }, "total": 1599 },
                "bc": { "countries": { "--": 3 }, "total": 10 },
                "gp": { "countries": { "--": 2 }, "total": 13 },
                "mgc": { "countries": { "--": 2 }, "total": 14 }
            }
        };

        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const doc2 = createBSON().deserialize(serialized_data);
        expect(doc).to.be.deep.equal(doc2);
    });

    /**
     * @ignore
     */
    it("Should Correctly Serialize empty name object", function () {
        const doc = {
            "": "test",
            "bbbb": 1
        };
        const serialized_data = createBSON().serialize(doc);
        const doc2 = createBSON().deserialize(serialized_data);
        expect(doc2[""]).to.be.equal("test");
        expect(doc2["bbbb"]).to.be.equal(1);
    });

    /**
     * @ignore
     */
    it("Should Correctly handle Forced Doubles to ensure we allocate enough space for cap collections", function () {
        if (Double != null) {
            const doubleValue = new Double(100);
            const doc = { value: doubleValue };

            // Serialize
            const serialized_data = createBSON().serialize(doc);

            const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
            createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
            assertBuffersEqual(serialized_data, serialized_data2, 0);

            const doc2 = createBSON().deserialize(serialized_data);
            expect({ value: 100 }).to.be.deep.equal(doc2);
        }
    });

    /**
     * @ignore
     */
    it("Should deserialize correctly", function () {
        const doc = {
            "_id": new ObjectId("4e886e687ff7ef5e00000162"),
            "str": "foreign",
            "type": 2,
            "timestamp": ISODate("2011-10-02T14:00:08.383Z"),
            "links": ["http://www.reddit.com/r/worldnews/comments/kybm0/uk_home_secretary_calls_for_the_scrapping_of_the/"]
        };

        const serialized_data = createBSON().serialize(doc);
        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        const doc2 = createBSON().deserialize(serialized_data);

        expect(JSON.stringify(doc)).to.be.deep.equal(JSON.stringify(doc2));
    });

    /**
     * @ignore
     */
    it("Should correctly serialize and deserialize MinKey and MaxKey values", function () {
        const doc = {
            _id: new ObjectId("4e886e687ff7ef5e00000162"),
            minKey: new MinKey(),
            maxKey: new MaxKey()
        };

        const serialized_data = createBSON().serialize(doc);
        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        const doc2 = createBSON().deserialize(serialized_data);

        // Peform equality checks
        expect(JSON.stringify(doc)).to.be.equal(JSON.stringify(doc2));
        expect(doc._id.equals(doc2._id)).to.be.ok;
        // process.exit(0)
        expect(doc2.minKey instanceof MinKey).to.be.ok;
        expect(doc2.maxKey instanceof MaxKey).to.be.ok;
    });

    /**
     * @ignore
     */
    it("Should correctly serialize Double value", function () {
        const doc = {
            value: new Double(34343.2222)
        };

        const serialized_data = createBSON().serialize(doc);
        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);
        const doc2 = createBSON().deserialize(serialized_data);

        expect(doc.value.valueOf()).to.be.ok;
        expect(doc.value.value).to.be.ok;
    });

    /**
     * @ignore
     */
    it("ObjectID should correctly create objects", function () {
        try {
            const object1 = ObjectId.createFromHexString("000000000000000000000001");
            const object2 = ObjectId.createFromHexString("00000000000000000000001");
            expect(false).to.be.ok;
        } catch (err) {
            expect(err != null).to.be.ok;
        }
    });

    /**
     * @ignore
     */
    it("ObjectID should correctly retrieve timestamp", function () {
        const testDate = new Date();
        const object1 = new ObjectId();
        expect(Math.floor(testDate.getTime() / 1000)).to.be.equal(Math.floor(object1.getTimestamp().getTime() / 1000));
    });

    /**
     * @ignore
     */
    it("Should Correctly throw error on bsonparser errors", function () {
        let data = new Buffer(3);
        const parser = createBSON();

        // Catch to small buffer error
        try {
            parser.deserialize(data);
            expect(false).to.be.ok;
        } catch (err) { }

        data = new Buffer(5);
        data[0] = 0xff;
        data[1] = 0xff;
        // Catch illegal size
        try {
            parser.deserialize(data);
            expect(false).to.be.ok;
        } catch (err) { }

        // Finish up
    });

    /**
     * A simple example showing the usage of BSON.calculateObjectSize function returning the number of BSON bytes a javascript object needs.
     *
     * @_class bson
     * @_function BSON.calculateObjectSize
     * @ignore
     */
    it("Should correctly calculate the size of a given javascript object", function () {
        // Create a simple object
        const doc = { a: 1, func: function () { } };
        const bson = createBSON();
        // Calculate the size of the object without serializing the function
        let size = bson.calculateObjectSize(doc, {
            serializeFunctions: false
        });
        expect(12).to.be.equal(size);
        // Calculate the size of the object serializing the function
        size = bson.calculateObjectSize(doc, {
            serializeFunctions: true
        });
        // Validate the correctness
        expect(37).to.be.equal(size);
    });

    /**
     * A simple example showing the usage of BSON.calculateObjectSize function returning the number of BSON bytes a javascript object needs.
     *
     * @_class bson
     * @_function calculateObjectSize
     * @ignore
     */
    it("Should correctly calculate the size of a given javascript object using instance method", function () {
        // Create a simple object
        const doc = { a: 1, func: function () { } };
        // Create a BSON parser instance
        const bson = createBSON();
        // Calculate the size of the object without serializing the function
        let size = bson.calculateObjectSize(doc, {
            serializeFunctions: false
        });
        expect(12).to.be.equal(size);
        // Calculate the size of the object serializing the function
        size = bson.calculateObjectSize(doc, {
            serializeFunctions: true
        });
        // Validate the correctness
        expect(37).to.be.equal(size);
    });

    /**
     * A simple example showing the usage of BSON.serializeWithBufferAndIndex function.
     *
     * @_class bson
     * @_function BSON.serializeWithBufferAndIndex
     * @ignore
     */
    it("Should correctly serializeWithBufferAndIndex a given javascript object", function () {
        // Create a simple object
        const doc = { a: 1, func: function () { } };
        const bson = createBSON();
        // Calculate the size of the document, no function serialization
        var size = bson.calculateObjectSize(doc, {
            serializeFunctions: false
        });

        // Allocate a buffer
        var buffer = new Buffer(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        var index = bson.serializeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: false, index: 0
        });

        // Validate the correctness
        expect(12).to.be.equal(size);
        expect(11).to.be.equal(index);

        // Serialize with functions
        // Calculate the size of the document, no function serialization
        var size = bson.calculateObjectSize(doc, {
            serializeFunctions: true
        });
        // Allocate a buffer
        var buffer = new Buffer(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        var index = bson.serializeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: true, index: 0
        });
        // Validate the correctness
        expect(37).to.be.equal(size);
        expect(36).to.be.equal(index);
    });

    /**
     * A simple example showing the usage of BSON.serializeWithBufferAndIndex function.
     *
     * @_class bson
     * @_function serializeWithBufferAndIndex
     * @ignore
     */
    it("Should correctly serializeWithBufferAndIndex a given javascript object using a BSON instance", function () {
        // Create a simple object
        const doc = { a: 1, func: function () { } };
        // Create a BSON parser instance
        const bson = createBSON();
        // Calculate the size of the document, no function serialization
        var size = bson.calculateObjectSize(doc, {
            serializeFunctions: false
        });
        // Allocate a buffer
        var buffer = new Buffer(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        var index = bson.serializeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: false
        });
        // Validate the correctness
        expect(12).to.be.equal(size);
        expect(11).to.be.equal(index);

        // Serialize with functions
        // Calculate the size of the document, no function serialization
        var size = bson.calculateObjectSize(doc, {
            serializeFunctions: true
        });
        // Allocate a buffer
        var buffer = new Buffer(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        var index = bson.serializeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: true
        });
        // Validate the correctness
        expect(37).to.be.equal(size);
        expect(36).to.be.equal(index);
    });

    /**
     * A simple example showing the usage of BSON.serialize function returning serialized BSON Buffer object.
     *
     * @_class bson
     * @_function BSON.serialize
     * @ignore
     */
    it("Should correctly serialize a given javascript object", function () {
        // Create a simple object
        const doc = { a: 1, func: function () { } };
        // Create a BSON parser instance
        const bson = createBSON();
        // Serialize the object to a buffer, checking keys and not serializing functions
        var buffer = bson.serialize(doc, {
            checkKeys: true,
            serializeFunctions: false
        });
        // Validate the correctness
        expect(12).to.be.equal(buffer.length);

        // Serialize the object to a buffer, checking keys and serializing functions
        var buffer = bson.serialize(doc, {
            checkKeys: true,
            serializeFunctions: true
        });
        // Validate the correctness
        expect(37).to.be.equal(buffer.length);
    });

    /**
     * A simple example showing the usage of BSON.serialize function returning serialized BSON Buffer object.
     *
     * @_class bson
     * @_function serialize
     * @ignore
     */
    it("Should correctly serialize a given javascript object using a bson instance", function () {
        // Create a simple object
        const doc = { a: 1, func: function () { } };
        // Create a BSON parser instance
        const bson = createBSON();
        // Serialize the object to a buffer, checking keys and not serializing functions
        var buffer = bson.serialize(doc, {
            checkKeys: true,
            serializeFunctions: false
        });
        // Validate the correctness
        expect(12).to.be.equal(buffer.length);

        // Serialize the object to a buffer, checking keys and serializing functions
        var buffer = bson.serialize(doc, {
            checkKeys: true,
            serializeFunctions: true
        });
        // Validate the correctness
        expect(37).to.be.equal(buffer.length);
    });

    // /**
    //  * A simple example showing the usage of BSON.deserialize function returning a deserialized Javascript function.
    //  *
    //  * @_class bson
    //  * @_function BSON.deserialize
    //  * @ignore
    //  */
    //  exports['Should correctly deserialize a buffer using the BSON class level parser'] = function(test) {
    //   // Create a simple object
    //   var doc = {a: 1, func:function(){ console.log('hello world'); }}
    //   // Create a BSON parser instance
    //   var bson = createBSON();
    //   // Serialize the object to a buffer, checking keys and serializing functions
    //   var buffer = bson.serialize(doc, {
    //     checkKeys: true,
    //     serializeFunctions: true
    //   });
    //   // Validate the correctness
    //   test.equal(65, buffer.length);
    //
    //   // Deserialize the object with no eval for the functions
    //   var deserializedDoc = bson.deserialize(buffer);
    //   // Validate the correctness
    //   test.equal('object', typeof deserializedDoc.func);
    //   test.equal(1, deserializedDoc.a);
    //
    //   // Deserialize the object with eval for the functions caching the functions
    //   deserializedDoc = bson.deserialize(buffer, {evalFunctions:true, cacheFunctions:true});
    //   // Validate the correctness
    //   test.equal('function', typeof deserializedDoc.func);
    //   test.equal(1, deserializedDoc.a);
    //   test.done();
    // }

    // /**
    //  * A simple example showing the usage of BSON instance deserialize function returning a deserialized Javascript function.
    //  *
    //  * @_class bson
    //  * @_function deserialize
    //  * @ignore
    //  */
    // exports['Should correctly deserialize a buffer using the BSON instance parser'] = function(test) {
    //   // Create a simple object
    //   var doc = {a: 1, func:function(){ console.log('hello world'); }}
    //   // Create a BSON parser instance
    //   var bson = createBSON();
    //   // Serialize the object to a buffer, checking keys and serializing functions
    //   var buffer = bson.serialize(doc, true, true, true);
    //   // Validate the correctness
    //   test.equal(65, buffer.length);
    //
    //   // Deserialize the object with no eval for the functions
    //   var deserializedDoc = bson.deserialize(buffer);
    //   // Validate the correctness
    //   test.equal('object', typeof deserializedDoc.func);
    //   test.equal(1, deserializedDoc.a);
    //
    //   // Deserialize the object with eval for the functions caching the functions
    //   deserializedDoc = bson.deserialize(buffer, {evalFunctions:true, cacheFunctions:true});
    //   // Validate the correctness
    //   test.equal('function', typeof deserializedDoc.func);
    //   test.equal(1, deserializedDoc.a);
    //   test.done();
    // }

    // /**
    //  * A simple example showing the usage of BSON.deserializeStream function returning deserialized Javascript objects.
    //  *
    //  * @_class bson
    //  * @_function BSON.deserializeStream
    //  * @ignore
    //  */
    // exports['Should correctly deserializeStream a buffer object'] = function(test) {
    //   // Create a simple object
    //   var doc = {a: 1, func:function(){ console.log('hello world'); }}
    //   var bson = createBSON();
    //   // Serialize the object to a buffer, checking keys and serializing functions
    //   var buffer = bson.serialize(doc, {
    //     checkKeys: true,
    //     serializeFunctions: true
    //   });
    //   // Validate the correctness
    //   test.equal(65, buffer.length);
    //
    //   // The array holding the number of retuned documents
    //   var documents = new Array(1);
    //   // Deserialize the object with no eval for the functions
    //   var index = bson.deserializeStream(buffer, 0, 1, documents, 0);
    //   // Validate the correctness
    //   test.equal(65, index);
    //   test.equal(1, documents.length);
    //   test.equal(1, documents[0].a);
    //   test.equal('object', typeof documents[0].func);
    //
    //   // Deserialize the object with eval for the functions caching the functions
    //   // The array holding the number of retuned documents
    //   var documents = new Array(1);
    //   // Deserialize the object with no eval for the functions
    //   var index = bson.deserializeStream(buffer, 0, 1, documents, 0, {evalFunctions:true, cacheFunctions:true});
    //   // Validate the correctness
    //   test.equal(65, index);
    //   test.equal(1, documents.length);
    //   test.equal(1, documents[0].a);
    //   test.equal('function', typeof documents[0].func);
    //   test.done();
    // }

    // /**
    //  * A simple example showing the usage of BSON instance deserializeStream function returning deserialized Javascript objects.
    //  *
    //  * @_class bson
    //  * @_function deserializeStream
    //  * @ignore
    //  */
    // exports['Should correctly deserializeStream a buffer object'] = function(test) {
    //   // Create a simple object
    //   var doc = {a: 1, func:function(){ console.log('hello world'); }}
    //   // Create a BSON parser instance
    //   var bson = createBSON();
    //   // Serialize the object to a buffer, checking keys and serializing functions
    //   var buffer = bson.serialize(doc, true, true, true);
    //   // Validate the correctness
    //   test.equal(65, buffer.length);
    //
    //   // The array holding the number of retuned documents
    //   var documents = new Array(1);
    //   // Deserialize the object with no eval for the functions
    //   var index = bson.deserializeStream(buffer, 0, 1, documents, 0);
    //   // Validate the correctness
    //   test.equal(65, index);
    //   test.equal(1, documents.length);
    //   test.equal(1, documents[0].a);
    //   test.equal('object', typeof documents[0].func);
    //
    //   // Deserialize the object with eval for the functions caching the functions
    //   // The array holding the number of retuned documents
    //   var documents = new Array(1);
    //   // Deserialize the object with no eval for the functions
    //   var index = bson.deserializeStream(buffer, 0, 1, documents, 0, {evalFunctions:true, cacheFunctions:true});
    //   // Validate the correctness
    //   test.equal(65, index);
    //   test.equal(1, documents.length);
    //   test.equal(1, documents[0].a);
    //   test.equal('function', typeof documents[0].func);
    //   test.done();
    // }

    /**
     * @ignore
     */
    it("ObjectID should have a correct cached representation of the hexString", function () {
        ObjectId.cacheHexString = true;
        let a = new ObjectId();
        let __id = a.__id;
        expect(__id).to.be.equal(a.toHexString());

        // hexString
        a = new ObjectId(__id);
        expect(__id).to.be.equal(a.toHexString());

        // fromHexString
        a = ObjectId.createFromHexString(__id);
        expect(a.__id).to.be.equal(a.toHexString());
        expect(__id).to.be.equal(a.toHexString());

        // number
        const genTime = a.generationTime;
        a = new ObjectId(genTime);
        __id = a.__id;
        expect(__id).to.be.equal(a.toHexString());

        // generationTime
        delete a.__id;
        a.generationTime = genTime;
        expect(__id).to.be.equal(a.toHexString());

        // createFromTime
        a = ObjectId.createFromTime(genTime);
        __id = a.__id;
        expect(__id).to.be.equal(a.toHexString());
        ObjectId.cacheHexString = false;
    });

    /**
     * @ignore
     */
    it("Should fail to create ObjectID due to illegal hex code", function () {
        try {
            new ObjectId("zzzzzzzzzzzzzzzzzzzzzzzz");
            expect(false).to.be.ok;
        } catch (err) { }

        expect(false).to.be.equal(ObjectId.isValid(null));
        expect(false).to.be.equal(ObjectId.isValid({}));
        expect(false).to.be.equal(ObjectId.isValid({ length: 12 }));
        expect(false).to.be.equal(ObjectId.isValid([]));
        expect(false).to.be.equal(ObjectId.isValid(true));
        expect(true).to.be.equal(ObjectId.isValid(0));
        expect(false).to.be.equal(ObjectId.isValid("invalid"));
        expect(true).to.be.equal(ObjectId.isValid("zzzzzzzzzzzz"));
        expect(false).to.be.equal(ObjectId.isValid("zzzzzzzzzzzzzzzzzzzzzzzz"));
        expect(true).to.be.equal(ObjectId.isValid("000000000000000000000000"));
        expect(true).to.be.equal(ObjectId.isValid(new ObjectId("thisis12char")));

        const tmp = new ObjectId();
        // Cloning tmp so that instanceof fails to fake import from different version/instance of the same npm package
        const objectIdLike = {
            id: tmp.id,
            toHexString: function () {
                return tmp.toHexString();
            }
        };

        expect(true).to.be.equal(tmp.equals(objectIdLike));
        expect(true).to.be.equal(tmp.equals(new ObjectId(objectIdLike)));
        expect(true).to.be.equal(ObjectId.isValid(objectIdLike));
    });

    /**
     * @ignore
     */
    it("Should correctly serialize the BSONRegExp type", function () {
        const doc = { regexp: new BSONRegExp("test", "i") };
        var doc1 = { regexp: /test/i };
        const serialized_data = createBSON().serialize(doc);
        const serialized_data3 = createBSON().serialize(doc1);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        var doc1 = createBSON().deserialize(serialized_data);
        const regexp = new RegExp("test", "i");
        expect(regexp).to.be.deep.equal(doc1.regexp);
    });

    /**
     * @ignore
     */
    it("Should correctly deserialize the BSONRegExp type", function () {
        const doc = { regexp: new BSONRegExp("test", "i") };
        const serialized_data = createBSON().serialize(doc);

        const serialized_data2 = new Buffer(createBSON().calculateObjectSize(doc));
        createBSON().serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(serialized_data, serialized_data2, 0);

        const doc1 = createBSON().deserialize(serialized_data, { bsonRegExp: true });
        expect(doc1.regexp instanceof BSONRegExp).to.be.ok;
        expect("test").to.be.equal(doc1.regexp.pattern);
        expect("i").to.be.equal(doc1.regexp.options);
    });

    /**
     * @ignore
     */
    it("Should return boolean for ObjectID equality check", function () {
        const id = new ObjectId();
        expect(true).to.be.equal(id.equals(new ObjectId(id.toString())));
        expect(true).to.be.equal(id.equals(id.toString()));
        expect(false).to.be.equal(id.equals("1234567890abcdef12345678"));
        expect(false).to.be.equal(id.equals("zzzzzzzzzzzzzzzzzzzzzzzz"));
        expect(false).to.be.equal(id.equals("foo"));
        expect(false).to.be.equal(id.equals(null));
        expect(false).to.be.equal(id.equals(undefined));
    });
});
