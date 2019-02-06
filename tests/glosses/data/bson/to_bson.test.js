const {
    data: { bson }
} = adone;

const ObjectId = bson.ObjectId;

describe("toBSON", () => {
    /**
     * @ignore
     */
    it("Should correctly handle toBson function for an object", (done) => {
        // Test object
        const doc = {
            hello: new ObjectId(),
            a: 1
        };

        // Add a toBson method to the object
        doc.toBSON = function () {
            return { b: 1 };
        };

        // Serialize the data
        let serializedData = bson.encode(doc, false, true);
        let deserializedDoc = bson.decode(serializedData);
        expect({ b: 1 }).to.deep.equal(deserializedDoc);

        // Serialize the data
        serializedData = bson.encode(doc, false, true);
        deserializedDoc = bson.decode(serializedData);
        expect({ b: 1 }).to.deep.equal(deserializedDoc);
        done();
    });

    /**
     * @ignore
     */
    it("Should correctly handle embedded toBson function for an object", (done) => {
        // Test object
        const doc = {
            hello: new ObjectId(),
            a: 1,
            b: {
                d: 1
            }
        };

        // Add a toBson method to the object
        doc.b.toBSON = function () {
            return { e: 1 };
        };

        // Serialize the data
        let serializedData = bson.encode(doc, false, true);
        let deserializedDoc = bson.decode(serializedData);
        expect({ e: 1 }).to.deep.equal(deserializedDoc.b);

        serializedData = bson.encode(doc, false, true);
        deserializedDoc = bson.decode(serializedData);
        expect({ e: 1 }).to.deep.equal(deserializedDoc.b);
        done();
    });

    /**
     * @ignore
     */
    it("Should correctly serialize when embedded non object returned by toBSON", (done) => {
        // Test object
        const doc = {
            hello: new ObjectId(),
            a: 1,
            b: {
                d: 1
            }
        };

        // Add a toBson method to the object
        doc.b.toBSON = function () {
            return "hello";
        };

        // Serialize the data
        let serializedData = bson.encode(doc, false, true);
        let deserializedDoc = bson.decode(serializedData);
        expect("hello").to.deep.equal(deserializedDoc.b);

        // Serialize the data
        serializedData = bson.encode(doc, false, true);
        deserializedDoc = bson.decode(serializedData);
        expect("hello").to.deep.equal(deserializedDoc.b);
        done();
    });

    /**
     * @ignore
     */
    it("Should fail when top level object returns a non object type", (done) => {
        // Test object
        const doc = {
            hello: new ObjectId(),
            a: 1,
            b: {
                d: 1
            }
        };

        // Add a toBson method to the object
        doc.toBSON = function () {
            return "hello";
        };

        let test1 = false;
        let test2 = false;
        let serializedData;
        try {
            serializedData = bson.encode(doc, false, true);
            bson.decode(serializedData);
        } catch (err) {
            test1 = true;
        }

        try {
            serializedData = bson.encode(doc, false, true);
            bson.decode(serializedData);
        } catch (err) {
            test2 = true;
        }

        expect(true).to.equal(test1);
        expect(true).to.equal(test2);
        done();
    });
});
