describe("promote buffers", function () {
    const { database: { mongo } } = adone;

    it("should correctly honor promoteBuffers", async () => {
        const db = await mongo.connect(this.url(), { promoteBuffers: true });
        const collection = db.collection("shouldCorrectlyHonorPromoteBuffer1");
        await collection.insert({ doc: Buffer.alloc(256) });
        const doc = await collection.findOne();
        expect(doc.doc).to.be.instanceOf(Buffer);
        await db.close();
    });

    it("should correctly honor promoteBuffers at cursor level", async () => {
        const db = await mongo.connect(this.url(), { promoteBuffers: true });
        const collection = db.collection("shouldCorrectlyHonorPromoteBuffer3");
        await collection.insert({ doc: Buffer.alloc(256) });
        const doc = await collection.find().next();
        expect(doc.doc).to.be.instanceOf(Buffer);
        await db.close();
    });

    it("should correctly honor promoteBuffers at cursor find level", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("shouldCorrectlyHonorPromoteBuffer4");
        await collection.insert({ doc: Buffer.alloc(256) });
        const doc = await collection.find({}, {}, { promoteBuffers: true }).next();
        expect(doc.doc).to.be.instanceOf(Buffer);
        await db.close();
    });

    it("should correctly honor promoteBuffers at aggregate level", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("shouldCorrectlyHonorPromoteBuffer5");
        await collection.insert({ doc: Buffer.alloc(256) });
        const doc = await collection.aggregate([{ $match: {} }], { promoteBuffers: true }).next();
        expect(doc.doc).to.be.instanceOf(Buffer);
        await db.close();
    });
});
