describe("promote values", function () {
    const { data: { bson }, database: { mongo }, util, stream: { core } } = adone;
    const { range } = util;

    it("should correctly honor promoteValues", async () => {
        const db = await mongo.connect(this.url(), { promoteValues: false });
        const collection = db.collection("shouldCorrectlyHonorPromoteValues");
        await collection.insert({
            doc: bson.Long.fromNumber(10),
            int: 10,
            double: 2.2222,
            array: [[bson.Long.fromNumber(10)]]
        });
        const doc = await collection.findOne();
        expect(doc.doc).to.be.deep.equal(bson.Long.fromNumber(10));
        expect(doc.int).to.be.deep.equal(new bson.Int32(10));
        expect(doc.double).to.be.deep.equal(new bson.Double(2.2222));
        await db.close();
    });

    it("should correctly honor promoteValues at cursor level", async () => {
        const db = await mongo.connect(this.url(), { promoteValues: false });
        const collection = db.collection("shouldCorrectlyHonorPromoteValues");
        await collection.insert({
            doc: bson.Long.fromNumber(10),
            int: 10,
            double: 2.2222,
            array: [[bson.Long.fromNumber(10)]]
        });
        const doc = await collection.find().next();
        expect(doc.doc).to.be.deep.equal(bson.Long.fromNumber(10));
        expect(doc.int).to.be.deep.equal(new bson.Int32(10));
        expect(doc.double).to.be.deep.equal(new bson.Double(2.2222));
        await db.close();
    });

    it("should correctly honor promoteValues at cursor find level", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("shouldCorrectlyHonorPromoteValues");
        await collection.insert({
            doc: bson.Long.fromNumber(10),
            int: 10,
            double: 2.2222,
            array: [[bson.Long.fromNumber(10)]]
        });
        const doc = await collection.find({}, {}, { promoteValues: false }).next();
        expect(doc.doc).to.be.deep.equal(bson.Long.fromNumber(10));
        expect(doc.int).to.be.deep.equal(new bson.Int32(10));
        expect(doc.double).to.be.deep.equal(new bson.Double(2.2222));
        await db.close();
    });

    it("should correctly honor promoteValues at aggregate level", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("shouldCorrectlyHonorPromoteValues2");
        await collection.insert({
            doc: bson.Long.fromNumber(10),
            int: 10,
            double: 2.2222,
            array: [[bson.Long.fromNumber(10)]]
        });
        const doc = await collection.aggregate([{ $match: {} }], { promoteValues: false, cursor: true }).next();
        expect(doc.doc).to.be.deep.equal(bson.Long.fromNumber(10));
        expect(doc.int).to.be.deep.equal(new bson.Int32(10));
        expect(doc.double).to.be.deep.equal(new bson.Double(2.2222));
        await db.close();
    });

    it("should correctly promoteValues when calling getMore on queries", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("haystack");
        await collection.insert(range(150).map((i) => ({
            _id: `needle_${i}`,
            isEven: i % 2,
            long: bson.Long.fromString("1234567890"),
            double: 0.23456,
            int: 1234
        })));
        const cursor = collection.find({}, { limit: 102, promoteValues: false });
        const docs = await cursor.stream().pipe(core());
        for (const doc of docs) {
            expect(doc.int).to.be.instanceOf(bson.Int32);
            expect(doc.long).to.be.instanceOf(bson.Long);
            expect(doc.double).to.be.instanceOf(bson.Double);
        }
        await db.dropCollection("haystack");
        await db.close();
    });
});
