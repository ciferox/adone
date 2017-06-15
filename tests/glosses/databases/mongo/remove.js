describe("remove", function () {
    it("should correctly clear out collection", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_clear");
        await collection.insert({ i: 1 }, { w: 1 });
        await collection.insert({ i: 2 }, { w: 1 });
        expect(await collection.count()).to.be.equal(2);
        const r = await collection.remove({}, { w: 1 });
        expect(r.result.n).to.be.equal(2);
        expect(await collection.count()).to.be.equal(0);
    });

    it("should correctly remove document using regexp", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_remove_regexp");
        await collection.insert({ address: "485 7th ave new york" }, { w: 1 });
        const r = await collection.remove({ address: /485 7th ave/ }, { w: 1 });
        expect(r.result.n).to.be.equal(1);
        expect(await collection.count()).to.be.equal(0);
    });

    it("should correctly remove only first document", async () => {
        const { db } = this;
        const collection = await db.createCollection("should correctly remove only first document");
        await collection.insert([{ a: 1 }, { a: 1 }, { a: 1 }, { a: 1 }], { w: 1 });
        const r = await collection.remove({ a: 1 }, { w: 1, single: true });
        expect(r.result.n).to.be.equal(1);
        expect(await collection.find({ a: 1 }).count()).to.be.equal(3);
    });
});
