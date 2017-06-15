describe("raw", function () {
    const { data: { bson } } = adone;

    it("should correctly save documents and return as raw", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlySaveDocumentsAndReturnAsRaw");
        await collection.insert([{ a: 1 }, { b: 2000 }, { c: 2.3 }], { w: 1 });
        const items = await collection.find({}, null, { raw: true, batchSize: 2 }).toArray();
        expect(items).to.have.lengthOf(3);
        const objects = items.map((item) => {
            expect(item).to.be.instanceOf(Buffer);
            return bson.decode(item);
        });
        expect(objects[0].a).to.be.equal(1);
        expect(objects[1].b).to.be.equal(2000);
        expect(objects[2].c).to.be.equal(2.3);

        const item = await collection.findOne({ a: 1 }, { raw: true });
        expect(item).to.be.instanceOf(Buffer);
        const object = bson.decode(item);
        expect(object.a).to.be.equal(1);
    });

    it("should correctly save documents and return as raw with raw set at collection level", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlySaveDocumentsAndReturnAsRaw_2", { raw: true });
        await collection.insert([{ a: 1 }, { b: 2000 }, { c: 2.3 }], { w: 1 });
        const items = await collection.find({}, null, { batchSize: 2 }).toArray();
        expect(items).to.have.lengthOf(3);
        const objects = items.map((item) => {
            expect(item).to.be.instanceOf(Buffer);
            return bson.decode(item);
        });
        expect(objects[0].a).to.be.equal(1);
        expect(objects[1].b).to.be.equal(2000);
        expect(objects[2].c).to.be.equal(2.3);

        const item = await collection.findOne({ a: 1 });
        expect(item).to.be.instanceOf(Buffer);
        const object = bson.decode(item);
        expect(object.a).to.be.equal(1);
    });
});
