describe("custom pk", function () {
    const { data: { bson }, database: { mongo } } = adone;

    it("should create records with custom pk factory", async () => {
        const factory = {
            createPk: () => new bson.ObjectID("aaaaaaaaaaaa")
        };

        const client = await mongo.connect(this.url(), { pkFactory: factory, poolSize: 1 });

        const collection = client.collection("test_custom_key");
        const s = spy(factory, "createPk");
        await collection.insert({ a: 1 }, { w: 1 });
        expect(s).to.have.been.calledOnce;
        const items = await collection.find({ _id: new bson.ObjectID("aaaaaaaaaaaa") }).toArray();
        expect(items).to.have.lengthOf(1);
        expect(items[0]).to.include({ a: 1 });
    });
});
