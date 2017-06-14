import { BinaryParser } from "./binary_parser";

describe("data", "bson", () => {
    const { is, data: { bson }, std: { fs, vm, path } } = adone;
    const {
        BSON,
        Code,
        BSONRegExp,
        Binary,
        Timestamp,
        Long,
        ObjectId,
        Symbol,
        DBRef,
        Double,
        MinKey,
        MaxKey
    } = bson;

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

    const ISODate = function (string) {
        let match;

        if (is.function(string.getTime)) {
            return string;
        }
        if ((match = string.match(/^(\d{4})(-(\d{2})(-(\d{2})(T(\d{2}):(\d{2})(:(\d{2})(\.(\d+))?)?(Z|((\+|-)(\d{2}):(\d{2}))))?)?)?$/))) {
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
        }
        throw new Error("Invalid ISO 8601 date given.", __filename);
    };

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
        let serializedData = "";
        for (let i = 0; i < bytes.length; i++) {
            serializedData = serializedData + BinaryParser.fromByte(bytes[i]);
        }

        const object = new BSON().deserialize(new Buffer(serializedData, "binary"));
        expect("a_1").to.be.equal(object.name);
        expect(false).to.be.equal(object.unique);
        expect(1).to.be.equal(object.key.a);
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
            0, 0, 104, 101, 108, 108, 111, 0,
            3, 104, 97, 115, 104, 0, 19, 0,
            0, 0, 16, 97, 0, 1, 0, 0,
            0, 16, 98, 0, 2, 0, 0, 0,
            0, 9, 100, 97, 116, 101, 0, 161,
            190, 98, 75, 0, 0, 0, 0, 7,
            111, 105, 100, 0, 161, 190, 98, 75,
            90, 217, 18, 0, 0, 1, 0, 0,
            5, 98, 105, 110, 97, 114, 121, 0,
            7, 0, 0, 0, 2, 3, 0, 0,
            0, 49, 50, 51, 16, 105, 110, 116,
            0, 42, 0, 0, 0, 1, 102, 108,
            111, 97, 116, 0, 223, 224, 11, 147,
            169, 170, 64, 64, 11, 114, 101, 103,
            101, 120, 112, 0, 102, 111, 111, 98,
            97, 114, 0, 105, 0, 8, 98, 111,
            111, 108, 101, 97, 110, 0, 1, 15,
            119, 104, 101, 114, 101, 0, 25, 0,
            0, 0, 12, 0, 0, 0, 116, 104,
            105, 115, 46, 120, 32, 61, 61, 32,
            51, 0, 5, 0, 0, 0, 0, 3,
            100, 98, 114, 101, 102, 0, 37, 0, 0,
            0, 2, 36, 114, 101, 102, 0, 5,
            0, 0, 0, 116, 101, 115, 116, 0,
            7, 36, 105, 100, 0, 161, 190, 98,
            75, 2, 180, 1, 0, 0, 2, 0,
            0, 0, 10, 110, 117, 108, 108, 0,
            0
        ];
        let serializedData = "";

        for (let i = 0; i < bytes.length; i++) {
            serializedData = serializedData + BinaryParser.fromByte(bytes[i]);
        }

        const object = new BSON().deserialize(new Buffer(serializedData, "binary"));
        expect("hello").to.be.equal(object.string);
        expect([1, 2, 3]).to.be.deep.equal(object.array);
        expect(1).to.be.equal(object.hash.a);
        expect(2).to.be.equal(object.hash.b);
        expect(object.date).to.be.ok;
        expect(object.oid).to.be.ok;
        expect(object.binary).to.be.ok;
        expect(42).to.be.equal(object.int);
        expect(33.3333).to.be.equal(object.float);
        expect(object.regexp).to.be.ok;
        expect(true).to.be.equal(object.boolean);
        expect(object.where).to.be.ok;
        expect(object.dbref).to.be.ok;
        expect(object.null === null).to.be.ok;
    });

    it("should serialize and deserialize String", () => {
        const testString = { hello: "world" };
        const serializedData = new BSON().serialize(testString, {
            checkKeys: false
        });

        new BSON().serializeWithBufferAndIndex(testString, serializedData, {
            checkKeys: false, index: 0
        });

        expect(testString).to.be.deep.equal(new BSON().deserialize(serializedData));
    });

    it("should serialize and deserialize Empty String", () => {
        const testString = { hello: "" };
        const serializedData = new BSON().serialize(testString);
        const serializedData2 = new Buffer(new BSON().calculateObjectSize(testString));
        new BSON().serializeWithBufferAndIndex(testString, serializedData2);

        expect(serializedData).to.be.deep.equal(serializedData2);
        expect(testString).to.be.deep.equal(new BSON().deserialize(serializedData));
    });

    it("should correctly serialize and deserialize Integer", () => {
        const testNumber = { doc: 5 };

        const serializedData = new BSON().serialize(testNumber);
        const serializedData2 = new Buffer(new BSON().calculateObjectSize(testNumber));
        new BSON().serializeWithBufferAndIndex(testNumber, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
        expect(testNumber).to.be.deep.equal(new BSON().deserialize(serializedData));
        expect(testNumber).to.be.deep.equal(new BSON().deserialize(serializedData2));
    });

    it("should correctly serialize and deserialize null value", () => {
        const testNull = { doc: null };
        const serializedData = new BSON().serialize(testNull);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(testNull));
        new BSON().serializeWithBufferAndIndex(testNull, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const object = new BSON().deserialize(serializedData);
        expect(null).to.be.equal(object.doc);
    });

    it("should correctly serialize and deserialize Number 1", () => {
        const testNumber = { doc: 5.5 };
        const serializedData = new BSON().serialize(testNumber);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(testNumber));
        new BSON().serializeWithBufferAndIndex(testNumber, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        expect(testNumber).to.be.deep.equal(new BSON().deserialize(serializedData));
    });

    it("should correctly serialize and deserialize Integer", () => {
        let testInt = { doc: 42 };
        let serializedData = new BSON().serialize(testInt);

        let serializedData2 = new Buffer(new BSON().calculateObjectSize(testInt));
        new BSON().serializeWithBufferAndIndex(testInt, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
        expect(testInt.doc).to.be.deep.equal(new BSON().deserialize(serializedData).doc);

        testInt = { doc: -5600 };
        serializedData = new BSON().serialize(testInt);

        serializedData2 = new Buffer(new BSON().calculateObjectSize(testInt));
        new BSON().serializeWithBufferAndIndex(testInt, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
        expect(testInt.doc).to.be.deep.equal(new BSON().deserialize(serializedData).doc);

        testInt = { doc: 2147483647 };
        serializedData = new BSON().serialize(testInt);

        serializedData2 = new Buffer(new BSON().calculateObjectSize(testInt));
        new BSON().serializeWithBufferAndIndex(testInt, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
        expect(testInt.doc).to.be.deep.equal(new BSON().deserialize(serializedData).doc);

        testInt = { doc: -2147483648 };
        serializedData = new BSON().serialize(testInt);

        serializedData2 = new Buffer(new BSON().calculateObjectSize(testInt));
        new BSON().serializeWithBufferAndIndex(testInt, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
        expect(testInt.doc).to.be.deep.equal(new BSON().deserialize(serializedData).doc);
    });

    it("should correctly serialize and deserialize Object", () => {
        const doc = { doc: { age: 42, name: "Spongebob", shoeSize: 9.5 } };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        expect(doc.doc.age).to.be.deep.equal(new BSON().deserialize(serializedData).doc.age);
        expect(doc.doc.name).to.be.deep.equal(new BSON().deserialize(serializedData).doc.name);
        expect(doc.doc.shoeSize).to.be.deep.equal(
            new BSON().deserialize(serializedData).doc.shoeSize
        );
    });

    it("should correctly ignore undefined values in arrays", () => {
        const doc = { doc: { notdefined: undefined } };
        const serializedData = new BSON().serialize(doc, {
            ignoreUndefined: true
        });
        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc, {
            ignoreUndefined: true
        }));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2, {
            ignoreUndefined: true
        });

        expect(serializedData).to.be.deep.equal(serializedData2);
        const doc1 = new BSON().deserialize(serializedData);
        new BSON().deserialize(serializedData2);

        expect(undefined).to.be.deep.equal(doc1.doc.notdefined);
    });

    it("should correctly serialize undefined array entries as null values", () => {
        const doc = { doc: { notdefined: undefined }, a: [1, 2, undefined, 3] };
        const serializedData = new BSON().serialize(doc, {
            ignoreUndefined: true
        });
        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc, {
            ignoreUndefined: true
        }));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2, {
            ignoreUndefined: true
        });
        expect(serializedData).to.be.deep.equal(serializedData2);
        const doc1 = new BSON().deserialize(serializedData);
        expect(undefined).to.be.deep.equal(doc1.doc.notdefined);
        expect(null).to.be.equal(doc1.a[2]);
    });

    it("should correctly serialize undefined array entries as undefined values", () => {
        const doc = { doc: { notdefined: undefined }, a: [1, 2, undefined, 3] };
        const serializedData = new BSON().serialize(doc, {
            ignoreUndefined: false
        });
        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc, {
            ignoreUndefined: false
        }));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2, {
            ignoreUndefined: false
        });

        expect(serializedData).to.be.deep.equal(serializedData2);
        const doc1 = new BSON().deserialize(serializedData);
        const doc2 = new BSON().deserialize(serializedData2);
        expect(null).to.be.deep.equal(doc1.doc.notdefined);
        expect(null).to.be.deep.equal(doc2.doc.notdefined);
    });

    it("should correctly serialize and deserialize Array", () => {
        const doc = { doc: [1, 2, "a", "b"] };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserialized = new BSON().deserialize(serializedData);
        expect(doc.doc[0]).to.be.equal(deserialized.doc[0]);
        expect(doc.doc[1]).to.be.equal(deserialized.doc[1]);
        expect(doc.doc[2]).to.be.equal(deserialized.doc[2]);
        expect(doc.doc[3]).to.be.equal(deserialized.doc[3]);
    });

    it("should correctly serialize and deserialize Buffer", () => {
        const doc = { doc: new Buffer("hello world") };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserialized = new BSON().deserialize(serializedData);
        expect(deserialized.doc instanceof Binary).to.be.ok;
        expect("hello world").to.be.equal(deserialized.doc.toString());
    });

    it("should correctly serialize and deserialize Buffer with promoteBuffers option", () => {
        const doc = { doc: new Buffer("hello world") };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserialized = new BSON().deserialize(serializedData, {
            promoteBuffers: true
        });
        expect(deserialized.doc instanceof Buffer).to.be.ok;
        expect("hello world").to.be.equal(deserialized.doc.toString());
    });

    it("should correctly serialize and deserialize Number 4", () => {
        const doc = { doc: bson.c.BSON_INT32_MAX + 10 };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserialized = new BSON().deserialize(serializedData);
        // test.ok(deserialized.doc instanceof Binary);
        expect(bson.c.BSON_INT32_MAX + 10).to.be.equal(deserialized.doc);
    });

    it("should correctly serialize and deserialize Array with added on functions", () => {
        Array.prototype.toXml = function () { };
        try {
            const doc = { doc: [1, 2, "a", "b"] };
            const serializedData = new BSON().serialize(doc);

            const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
            new BSON().serializeWithBufferAndIndex(doc, serializedData2);
            expect(serializedData).to.be.deep.equal(serializedData2);

            const deserialized = new BSON().deserialize(serializedData);
            expect(doc.doc[0]).to.be.equal(deserialized.doc[0]);
            expect(doc.doc[1]).to.be.equal(deserialized.doc[1]);
            expect(doc.doc[2]).to.be.equal(deserialized.doc[2]);
            expect(doc.doc[3]).to.be.equal(deserialized.doc[3]);
        } finally {
            delete Array.prototype.toXml;
        }
    });

    it("should correctly deserialize a nested object", () => {
        const doc = { doc: { doc: 1 } };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        expect(doc.doc.doc).to.be.deep.equal(new BSON().deserialize(serializedData).doc.doc);
    });

    it("should correctly serialize and deserialize A Boolean", () => {
        const doc = { doc: true };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        expect(doc.doc).to.be.equal(new BSON().deserialize(serializedData).doc);
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
        const serializedData = new BSON().serialize(doc);
        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);

        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc1 = new BSON().deserialize(serializedData);
        expect(doc).to.be.deep.equal(doc1);
    });

    it("should correctly serialize and deserialize a Date from another VM", () => {
        const script = "date1 = new Date();";
        const ctx = vm.createContext({ date1: null });
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
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
        expect(doc.date).to.be.equal(new BSON().deserialize(serializedData).doc.date);
    });

    it("should correctly serialize nested doc", () => {
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

        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
    });

    it("should correctly serialize and deserialize Oid", () => {
        const doc = { doc: new ObjectId() };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        expect(doc).to.be.deep.equal(new BSON().deserialize(serializedData));
    });

    it("should correctly encode Empty Hash", () => {
        const doc = {};
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        expect(doc).to.be.deep.equal(new BSON().deserialize(serializedData));
    });

    it("should correctly serialize and deserialize Ordered Hash", () => {
        const doc = { doc: { b: 1, a: 2, c: 3, d: 4 } };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const decodedHash = new BSON().deserialize(serializedData).doc;
        const keys = [];

        for (const name in decodedHash) {
            keys.push(name);
        }
        expect(["b", "a", "c", "d"]).to.be.deep.equal(keys);
    });

    it("should correctly serialize and deserialize Regular Expression", () => {
        const doc = { doc: /foobar/mi };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc2 = new BSON().deserialize(serializedData);

        expect(doc.doc.toString()).to.be.deep.equal(doc2.doc.toString());
    });

    it("should correctly serialize and deserialize a Binary object", () => {
        const bin = new Binary();
        const string = "binstring";
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc = { doc: bin };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);

        expect(doc.doc.value()).to.be.deep.equal(deserializedData.doc.value());
    });

    it("should correctly serialize and deserialize a Type 2 Binary object", () => {
        const bin = new Binary(new Buffer("binstring"), Binary.SUBTYPE_BYTE_ARRAY);
        const string = "binstring";
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc = { doc: bin };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);

        expect(doc.doc.value()).to.be.deep.equal(deserializedData.doc.value());
    });

    it("should correctly serialize and deserialize a big Binary object", () => {
        const data = fs.readFileSync(path.join(__dirname, "data", "test_gs_weird_bug.png"), "binary");
        const bin = new Binary();
        bin.write(data);
        const doc = { doc: bin };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        expect(doc.doc.value()).to.be.deep.equal(deserializedData.doc.value());
    });

    it("should correctly serialize and deserialize DBRef", () => {
        const oid = new ObjectId();
        const doc = { dbref: new DBRef("namespace", oid, null) };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc2 = new BSON().deserialize(serializedData);
        expect("namespace").to.be.equal(doc2.dbref.namespace);
        expect(doc2.dbref.oid.toHexString()).to.be.deep.equal(oid.toHexString());
    });

    it("should correctly serialize and deserialize partial DBRef", () => {
        const id = new ObjectId();
        const doc = { name: "something", user: { $ref: "username", $id: id } };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc2 = new BSON().deserialize(serializedData);
        expect("something").to.be.equal(doc2.name);
        expect("username").to.be.equal(doc2.user.namespace);
        expect(id.toString()).to.be.equal(doc2.user.oid.toString());
    });

    it("should correctly serialize and deserialize simple Int", () => {
        const doc = { doc: 2147483648 };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc2 = new BSON().deserialize(serializedData);
        expect(doc.doc).to.be.deep.equal(doc2.doc);
    });

    it("should correctly serialize and deserialize Long Integer", () => {
        let doc = { doc: Long.fromNumber(9223372036854775807) };
        let serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        let deserializedData = new BSON().deserialize(serializedData);
        expect(doc.doc).to.be.deep.equal(deserializedData.doc);

        doc = { doc: Long.fromNumber(-9223372036854775) };
        serializedData = new BSON().serialize(doc);
        deserializedData = new BSON().deserialize(serializedData);
        expect(doc.doc).to.be.deep.equal(deserializedData.doc);

        doc = { doc: Long.fromNumber(-9223372036854775809) };
        serializedData = new BSON().serialize(doc);
        deserializedData = new BSON().deserialize(serializedData);
        expect(doc.doc).to.be.deep.equal(deserializedData.doc);
    });

    it("should deserialize Large Integers as Number not Long", () => {
        const roundTrip = (val) => {
            const doc = { doc: val };
            const serializedData = new BSON().serialize(doc);

            const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
            new BSON().serializeWithBufferAndIndex(doc, serializedData2);
            expect(serializedData).to.be.deep.equal(serializedData2);

            const deserializedData = new BSON().deserialize(serializedData);
            expect(doc.doc).to.be.deep.equal(deserializedData.doc);
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
    });

    it("should correctly serialize and deserialize Long Integer and Timestamp as different types", () => {
        const long = Long.fromNumber(9223372036854775807);
        const timestamp = Timestamp.fromNumber(9223372036854775807);
        expect(long instanceof Long).to.be.ok;
        expect(!(long instanceof Timestamp)).to.be.ok;
        expect(timestamp instanceof Timestamp).to.be.ok;
        expect(!(timestamp instanceof Long)).to.be.ok;

        const testInt = { doc: long, doc2: timestamp };
        const serializedData = new BSON().serialize(testInt);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(testInt));
        new BSON().serializeWithBufferAndIndex(testInt, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        expect(testInt.doc).to.be.deep.equal(deserializedData.doc);
    });

    it("should always put the id as the first item in a hash", () => {
        const hash = { doc: { notId: 1, _id: 2 } };
        const serializedData = new BSON().serialize(hash);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(hash));
        new BSON().serializeWithBufferAndIndex(hash, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        const keys = [];

        for (const name in deserializedData.doc) {
            keys.push(name);
        }

        expect(["notId", "_id"]).to.be.deep.equal(keys);
    });

    it("should correctly serialize and deserialize a User defined Binary object", () => {
        const bin = new Binary();
        bin.subType = Binary.BSON_BINARY_SUBTYPE_USER_DEFINED;
        const string = "binstring";
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const doc = { doc: bin };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
        const deserializedData = new BSON().deserialize(serializedData);

        expect(deserializedData.doc.subType).to.be.deep.equal(
            Binary.BSON_BINARY_SUBTYPE_USER_DEFINED
        );
        expect(doc.doc.value()).to.be.deep.equal(deserializedData.doc.value());
    });

    it("should correclty serialize and deserialize a code object", () => {
        const doc = { doc: { doc2: new Code("this.a > i", { i: 1 }) } };
        const serializedData = new BSON().serialize(doc);
        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        expect(doc.doc.doc2.code).to.be.deep.equal(deserializedData.doc.doc2.code);
        expect(doc.doc.doc2.scope.i).to.be.deep.equal(deserializedData.doc.doc2.scope.i);
    });

    it("should correctly serialize and deserialize and embedded array", () => {
        const doc = {
            a: 0,
            b: [
                "tmp1", "tmp2", "tmp3", "tmp4",
                "tmp5", "tmp6", "tmp7", "tmp8",
                "tmp9", "tmp10", "tmp11", "tmp12",
                "tmp13", "tmp14", "tmp15", "tmp16"
            ]
        };

        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        expect(doc.a).to.be.deep.equal(deserializedData.a);
        expect(doc.b).to.be.deep.equal(deserializedData.b);
    });

    it("should correctly serialize and deserialize UTF8", () => {
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
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        expect(doc).to.be.deep.equal(deserializedData);
    });

    it("should correctly serialize and deserialize query object", () => {
        const doc = { count: "remove_with_no_callback_bug_test", query: {}, fields: null };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        expect(doc).to.be.deep.equal(deserializedData);
    });

    it("should correctly serialize and deserialize empty query object", () => {
        const doc = {};
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        expect(doc).to.be.deep.equal(deserializedData);
    });

    it("should correctly serialize and deserialize array based doc", () => {
        const doc = { b: [1, 2, 3], _id: new ObjectId() };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        expect(doc.b).to.be.deep.equal(deserializedData.b);
        expect(doc).to.be.deep.equal(deserializedData);
    });

    it("should correctly serialize and deserialize Symbol", () => {
        const doc = { b: [new Symbol("test")] };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        expect(doc.b).to.be.deep.equal(deserializedData.b);
        expect(doc).to.be.deep.equal(deserializedData);
        expect(deserializedData.b[0] instanceof Symbol).to.be.ok;
    });

    it("should handle Deeply nested document", () => {
        const doc = { a: { b: { c: { d: 2 } } } };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const deserializedData = new BSON().deserialize(serializedData);
        expect(doc).to.be.deep.equal(deserializedData);
    });

    it("should handle complicated all typed object", () => {
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

        const serializedData = new BSON().serialize(doc);

        let serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        serializedData2 = new BSON().serialize(doc2, false, true);

        for (let i = 0; i < serializedData2.length; i++) {
            require("assert").equal(serializedData2[i], serializedData[i]);
        }
    });

    it("should correctly serialize Complex Nested Object", () => {
        const doc = {
            email: "email@email.com",
            encryptedPassword: "password",
            friends: ["4db96b973d01205364000006", "4dc77b24c5ba38be14000002"],
            location: [72.4930088, 23.0431957],
            name: "Amit Kumar",
            passwordSalt: "salty",
            profileFields: [],
            username: "amit",
            _id: new ObjectId()
        };

        const serializedData = new BSON().serialize(doc);

        let serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc2 = doc;
        doc2._id = ObjectId.createFromHexString(doc2._id.toHexString());
        serializedData2 = new BSON().serialize(doc2, false, true);

        for (let i = 0; i < serializedData2.length; i++) {
            require("assert").equal(serializedData2[i], serializedData[i]);
        }
    });

    it("should correctly massive doc", () => {
        const oid1 = new ObjectId();
        const oid2 = new ObjectId();

        const doc = {
            dbref2: new DBRef("namespace", oid1, "integration_tests_"),
            _id: oid2
        };

        const doc2 = {
            dbref2: new DBRef("namespace", ObjectId.createFromHexString(oid1.toHexString()), "integration_tests_"),
            _id: ObjectId.createFromHexString(oid2.toHexString())
        };

        const serializedData = new BSON().serialize(doc);

        let serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        serializedData2 = new BSON().serialize(doc2, false, true);
    });

    it("should correctly serialize/deserialize regexp object", () => {
        const doc = { b: /foobaré/ };

        const serializedData = new BSON().serialize(doc);

        let serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        serializedData2 = new BSON().serialize(doc);

        for (let i = 0; i < serializedData2.length; i++) {
            require("assert").equal(serializedData2[i], serializedData[i]);
        }
    });

    it("should correctly serialize/deserialize complicated object", () => {
        const doc = { a: { b: { c: [new ObjectId(), new ObjectId()] } }, d: { f: 1332.3323 } };

        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc2 = new BSON().deserialize(serializedData);

        expect(doc).to.be.deep.equal(doc2);
    });

    it("should correctly serialize/deserialize nested object", () => {
        const doc = {
            _id: { date: new Date(), gid: "6f35f74d2bea814e21000000" },
            value: {
                b: { countries: { "--": 386 }, total: 1599 },
                bc: { countries: { "--": 3 }, total: 10 },
                gp: { countries: { "--": 2 }, total: 13 },
                mgc: { countries: { "--": 2 }, total: 14 }
            }
        };

        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc2 = new BSON().deserialize(serializedData);

        expect(doc).to.be.deep.equal(doc2);
    });

    it("should correctly serialize/deserialize nested object with even more nesting", () => {
        const doc = {
            _id: { date: { a: 1, b: 2, c: new Date() }, gid: "6f35f74d2bea814e21000000" },
            value: {
                b: { countries: { "--": 386 }, total: 1599 },
                bc: { countries: { "--": 3 }, total: 10 },
                gp: { countries: { "--": 2 }, total: 13 },
                mgc: { countries: { "--": 2 }, total: 14 }
            }
        };

        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc2 = new BSON().deserialize(serializedData);
        expect(doc).to.be.deep.equal(doc2);
    });

    it("should correctly serialize empty name object", () => {
        const doc = {
            "": "test",
            bbbb: 1
        };
        const serializedData = new BSON().serialize(doc);
        const doc2 = new BSON().deserialize(serializedData);
        expect(doc2[""]).to.be.equal("test");
        expect(doc2.bbbb).to.be.equal(1);
    });

    it("should correctly handle Forced Doubles to ensure we allocate enough space for cap collections", () => {
        const doubleValue = new Double(100);
        const doc = { value: doubleValue };

        // Serialize
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc2 = new BSON().deserialize(serializedData);
        expect({ value: 100 }).to.be.deep.equal(doc2);
    });

    it("should deserialize correctly", () => {
        const doc = {
            _id: new ObjectId("4e886e687ff7ef5e00000162"),
            str: "foreign",
            type: 2,
            timestamp: ISODate("2011-10-02T14:00:08.383Z"),
            links: ["http://www.reddit.com/r/worldnews/comments/kybm0/uk_home_secretary_calls_for_the_scrapping_of_the/"]
        };

        const serializedData = new BSON().serialize(doc);
        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
        const doc2 = new BSON().deserialize(serializedData);

        expect(JSON.stringify(doc)).to.be.deep.equal(JSON.stringify(doc2));
    });

    it("should correctly serialize and deserialize MinKey and MaxKey values", () => {
        const doc = {
            _id: new ObjectId("4e886e687ff7ef5e00000162"),
            minKey: new MinKey(),
            maxKey: new MaxKey()
        };

        const serializedData = new BSON().serialize(doc);
        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
        const doc2 = new BSON().deserialize(serializedData);

        expect(JSON.stringify(doc)).to.be.equal(JSON.stringify(doc2));
        expect(doc._id.equals(doc2._id)).to.be.ok;
        expect(doc2.minKey instanceof MinKey).to.be.ok;
        expect(doc2.maxKey instanceof MaxKey).to.be.ok;
    });

    it("should correctly serialize Double value", () => {
        const doc = {
            value: new Double(34343.2222)
        };

        const serializedData = new BSON().serialize(doc);
        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);
        new BSON().deserialize(serializedData);
        expect(doc.value.valueOf()).to.be.ok;
        expect(doc.value.value).to.be.ok;
    });

    it("ObjectId should correctly create objects", () => {
        try {
            ObjectId.createFromHexString("000000000000000000000001");
            ObjectId.createFromHexString("00000000000000000000001");
            expect(false).to.be.ok;
        } catch (err) {
            expect(err).to.be.ok;
        }
    });

    it("ObjectId should correctly retrieve timestamp", () => {
        const testDate = new Date();
        const object1 = new ObjectId();
        expect(Math.floor(testDate.getTime() / 1000)).to.be.equal(
            Math.floor(object1.getTimestamp().getTime() / 1000)
        );
    });

    it("should correctly throw error on bsonparser errors", () => {
        let data = new Buffer(3);
        const parser = new BSON();

        try {
            parser.deserialize(data);
            expect(false).to.be.ok;
        } catch (err) {
            //
        }

        data = new Buffer(5);
        data[0] = 0xff;
        data[1] = 0xff;
        // Catch illegal size
        try {
            parser.deserialize(data);
            expect(false).to.be.ok;
        } catch (err) {
            //
        }
    });

    it("should correctly calculate the size of a given javascript object", () => {
        // wtf
        // eslint-disable-next-line
        const doc = { a: 1, func: function () { } };
        const bson = new BSON();
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

    it("should correctly calculate the size of a given javascript object using instance method", () => {
        // wtf
        // eslint-disable-next-line
        const doc = { a: 1, func: function () { } };
        // Create a BSON parser instance
        const bson = new BSON();
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

    it("should correctly serializeWithBufferAndIndex a given javascript object", () => {
        // wtf
        // eslint-disable-next-line
        const doc = { a: 1, func: function () { } };
        const bson = new BSON();
        // Calculate the size of the document, no function serialization
        let size = bson.calculateObjectSize(doc, {
            serializeFunctions: false
        });

        // Allocate a buffer
        let buffer = new Buffer(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        let index = bson.serializeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: false, index: 0
        });

        // Validate the correctness
        expect(12).to.be.equal(size);
        expect(11).to.be.equal(index);

        // Serialize with functions
        // Calculate the size of the document, no function serialization
        size = bson.calculateObjectSize(doc, {
            serializeFunctions: true
        });
        // Allocate a buffer
        buffer = new Buffer(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        index = bson.serializeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: true, index: 0
        });
        // Validate the correctness
        expect(37).to.be.equal(size);
        expect(36).to.be.equal(index);
    });

    it("should correctly serializeWithBufferAndIndex a given javascript object using a BSON instance", () => {
        // wtf
        // eslint-disable-next-line
        const doc = { a: 1, func: function () { } };
        // Create a BSON parser instance
        const bson = new BSON();
        // Calculate the size of the document, no function serialization
        let size = bson.calculateObjectSize(doc, {
            serializeFunctions: false
        });
        // Allocate a buffer
        let buffer = new Buffer(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        let index = bson.serializeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: false
        });
        // Validate the correctness
        expect(12).to.be.equal(size);
        expect(11).to.be.equal(index);

        // Serialize with functions
        // Calculate the size of the document, no function serialization
        size = bson.calculateObjectSize(doc, {
            serializeFunctions: true
        });
        // Allocate a buffer
        buffer = new Buffer(size);
        // Serialize the object to the buffer, checking keys and not serializing functions
        index = bson.serializeWithBufferAndIndex(doc, buffer, {
            serializeFunctions: true
        });
        // Validate the correctness
        expect(37).to.be.equal(size);
        expect(36).to.be.equal(index);
    });

    it("should correctly serialize a given javascript object", () => {
        // wtf
        // eslint-disable-next-line
        const doc = { a: 1, func: function () { } };
        // Create a BSON parser instance
        const bson = new BSON();
        // Serialize the object to a buffer, checking keys and not serializing functions
        let buffer = bson.serialize(doc, {
            checkKeys: true,
            serializeFunctions: false
        });
        // Validate the correctness
        expect(12).to.be.equal(buffer.length);

        // Serialize the object to a buffer, checking keys and serializing functions
        buffer = bson.serialize(doc, {
            checkKeys: true,
            serializeFunctions: true
        });
        // Validate the correctness
        expect(37).to.be.equal(buffer.length);
    });

    it("should correctly serialize a given javascript object using a bson instance", () => {
        // wtf
        // eslint-disable-next-line
        const doc = { a: 1, func: function () { } };
        // Create a BSON parser instance
        const bson = new BSON();
        // Serialize the object to a buffer, checking keys and not serializing functions
        let buffer = bson.serialize(doc, {
            checkKeys: true,
            serializeFunctions: false
        });
        // Validate the correctness
        expect(12).to.be.equal(buffer.length);

        // Serialize the object to a buffer, checking keys and serializing functions
        buffer = bson.serialize(doc, {
            checkKeys: true,
            serializeFunctions: true
        });
        // Validate the correctness
        expect(37).to.be.equal(buffer.length);
    });

    it("ObjectId should have a correct cached representation of the hexString", () => {
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

    it("should fail to create ObjectId due to illegal hex code", () => {
        try {
            new ObjectId("zzzzzzzzzzzzzzzzzzzzzzzz");
            expect(false).to.be.ok;
        } catch (err) {
            //
        }

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
            toHexString() {
                return tmp.toHexString();
            }
        };

        expect(true).to.be.equal(tmp.equals(objectIdLike));
        expect(true).to.be.equal(tmp.equals(new ObjectId(objectIdLike)));
        expect(true).to.be.equal(ObjectId.isValid(objectIdLike));
    });

    it("should correctly serialize the BSONRegExp type", () => {
        const doc = { regexp: new BSONRegExp("test", "i") };
        let doc1 = { regexp: /test/i };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        doc1 = new BSON().deserialize(serializedData);
        const regexp = new RegExp("test", "i");
        expect(regexp).to.be.deep.equal(doc1.regexp);
    });

    it("should correctly deserialize the BSONRegExp type", () => {
        const doc = { regexp: new BSONRegExp("test", "i") };
        const serializedData = new BSON().serialize(doc);

        const serializedData2 = new Buffer(new BSON().calculateObjectSize(doc));
        new BSON().serializeWithBufferAndIndex(doc, serializedData2);
        expect(serializedData).to.be.deep.equal(serializedData2);

        const doc1 = new BSON().deserialize(serializedData, { bsonRegExp: true });
        expect(doc1.regexp instanceof BSONRegExp).to.be.ok;
        expect("test").to.be.equal(doc1.regexp.pattern);
        expect("i").to.be.equal(doc1.regexp.options);
    });

    it("should return boolean for ObjectId equality check", () => {
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
