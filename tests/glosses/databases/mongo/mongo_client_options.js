describe("mongo client options", function () {
    if (this.topology !== "single") {
        return;
    }

    const { database: { mongo } } = adone;

    it("pass in server and db top level options", async () => {
        const db = await mongo.connect(this.url(), {
            autoReconnect: true,
            poolSize: 4
        });
        const collection = db.collection("testConnectServerOptions");
        await collection.insert({ foo: 123 }, { w: 1 });
        expect(await collection.count()).to.be.equal(1);
        expect(await collection.find({ foo: 123 })).to.be.ok();
        expect(await db.dropDatabase()).to.be.true();
        expect(db.serverConfig.poolSize).to.be.equal(1);
        expect(db.serverConfig.s.server.s.pool.size).to.be.equal(4);
        expect(db.serverConfig.autoReconnect).to.be.true();
        await db.close();
    });

    it("should error on unexpected options", async () => {
        await assert.throws(async () => {
            await mongo.connect(this.url(), {
                autoReconnect: true,
                poolSize: 4,
                notlegal: {},
                validateOptions: true
            });
        }, "option notlegal is not supported");
    });
});
