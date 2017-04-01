describe("glosses", "data", "bson", "to bson", () => {
    const { data: { bson: { BSON, ObjectID } } } = adone;

    it("should correctly handle toBson function for an object", () => {
        const doc = {
            hello: new ObjectID(),
            a: 1
        };

        doc.toBSON = () => ({ b: 1 });

        let serializedData = new BSON().serialize(doc, false, true);
        let deserializedDoc = new BSON().deserialize(serializedData);
        expect({ b: 1 }).to.be.deep.equal(deserializedDoc);

        serializedData = new BSON().serialize(doc, false, true);
        deserializedDoc = new BSON().deserialize(serializedData);
        expect({ b: 1 }).to.be.deep.equal(deserializedDoc);
    });

    it("should correctly handle embedded toBson function for an object", () => {
        const doc = {
            hello: new ObjectID(),
            a: 1,
            b: {
                d: 1
            }
        };

        doc.b.toBSON = () => ({ e: 1 });

        let serializedData = new BSON().serialize(doc, false, true);
        let deserializedDoc = new BSON().deserialize(serializedData);
        expect({ e: 1 }).to.be.deep.equal(deserializedDoc.b);

        serializedData = new BSON().serialize(doc, false, true);
        deserializedDoc = new BSON().deserialize(serializedData);
        expect({ e: 1 }).to.be.deep.equal(deserializedDoc.b);
    });

    it("should correctly serialize when embedded non object returned by toBSON", () => {
        const doc = {
            hello: new ObjectID(),
            a: 1,
            b: {
                d: 1
            }
        };

        doc.b.toBSON = () => "hello";

        let serializedData = new BSON().serialize(doc, false, true);
        let deserializedDoc = new BSON().deserialize(serializedData);
        expect("hello").to.be.deep.equal(deserializedDoc.b);

        serializedData = new BSON().serialize(doc, false, true);
        deserializedDoc = new BSON().deserialize(serializedData);
        expect("hello").to.be.deep.equal(deserializedDoc.b);
    });

    it("should fail when top level object returns a non object type", () => {
        const doc = {
            hello: new ObjectID(),
            a: 1,
            b: {
                d: 1
            }
        };

        doc.toBSON = () => "hello";

        let test1 = false;
        let test2 = false;

        try {
            const serializedData = new BSON().serialize(doc, false, true);
            new BSON().deserialize(serializedData);
        } catch (err) {
            test1 = true;
        }

        try {
            const serializedData = new BSON().serialize(doc, false, true);
            new BSON().deserialize(serializedData);
        } catch (err) {
            test2 = true;
        }

        expect(true).to.be.equal(test1);
        expect(true).to.be.equal(test2);
    });
});
