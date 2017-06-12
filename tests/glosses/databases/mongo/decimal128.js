describe("decimal128", function () {
    const { data: { bson } } = adone;

    it("should correctly insert decimal128 value", async () => {
        const { db } = this;

        const object = {
            id: 1,
            value: bson.Decimal128.fromString("1")
        };

        await db.collection("decimal128").insertOne(object);
        const doc = await db.collection("decimal128").findOne({
            id: 1
        });
        expect(doc.value).to.be.instanceOf(bson.Decimal128);
        expect(doc.value.toString()).to.be.equal("1");
    });
});
