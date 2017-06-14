describe("ignore undefined", function () {
    if (this.topology !== "single") {
        return;
    }

    const { database: { mongo }, data: { bson } } = adone;

    it("should correctly insert document ignoring undefined field", async () => {
        const db = await mongo.connect(this.url(), { ignoreUndefined: true });
        const collection = db.collection("shouldCorrectlyIgnoreUndefinedValue");
        await collection.insert({ a: 1, b: undefined });
        const item = await collection.findOne();
        expect(item).to.have.property("a");
        expect(item).not.to.have.property("b");
        await db.close();
    });

    it("should correctly update document ignoring undefined field", async () => {
        const db = await mongo.connect(this.url(), { ignoreUndefined: true });
        const collection = db.collection("shouldCorrectlyIgnoreUndefinedValue2");
        {
            const id = new bson.ObjectId();

            await collection.updateOne({ _id: id, a: 1, b: undefined }, {
                $set: { a: 1, b: undefined }
            }, { upsert: true });
            const item = await collection.findOne({ _id: id });
            expect(item).to.have.property("a", 1);
            expect(item).not.to.have.property("b");
        }
        {
            const id = new bson.ObjectId();
            await collection.updateMany({ _id: id, a: 1, b: undefined }, {
                $set: { a: 1, b: undefined }
            }, { upsert: true });
            const item = await collection.findOne({ _id: id });
            expect(item).to.have.property("a", 1);
            expect(item).not.to.have.property("b");
        }
        {
            const id = new bson.ObjectId();
            await collection.update({ _id: id, a: 1, b: undefined }, {
                $set: { a: 1, b: undefined }
            }, { upsert: true });
            const item = await collection.findOne({ _id: id });
            expect(item).to.have.property("a", 1);
            expect(item).not.to.have.property("b");
        }
    });
});
