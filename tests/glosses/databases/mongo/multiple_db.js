describe("multiple db", function () {
    const { database: { mongo } } = adone;

    it("should correctly emit on pool close", async () => {
        const { db } = this;
        const s = spy();
        db.on("close", s);
        const collection = await db.createCollection("shouldCorrectlyErrorOnAllDbs");
        await collection.insert({ a: 1 }, { w: 1 });
        const db2 = db.db("tests_2");
        db2.on("close", s);
        const db3 = db2.db("tests_3");
        db3.on("close", s);
        await Promise.all([
            s.waitForNCalls(3),
            db.close()
        ]);
    });

    it("should correctly use same connections for two different dbs", async () => {
        const { db } = this;
        const collection = await db.db(`${this.database}_2`).createCollection("shouldCorrectlyUseSameConnectionsForTwoDifferentDbs");
        await collection.insert({ a: 20 }, { safe: true });
        {
            const item = await collection.findOne();
            expect(item.a).to.be.equal(20);
        }
        const collection2 = await db.createCollection("shouldCorrectlyUseSameConnectionsForTwoDifferentDbs");
        await collection2.insert({ b: 20 }, { safe: true });
        {
            const item = await collection2.findOne();
            expect(item.b).to.be.equal(20);
        }
    });

    it("should correctly handle multiple dbs findAndModifies", async function () {
        if (this.topology === "sharded") {
            this.skip();
            // throws database rss not found
            return;
        }
        // ?
        this.db.db("site1");
        this.db.db("site2");
        const db = this.db.db("rss");

        const collection = await db.collection("counters");
        await collection.findAndModify({}, {}, { $inc: { db: 1 } }, { new: true });
    });

    it("should not leak listeners", async () => {
        // ?
        const db = await mongo.connect(this.url(), { server: { sslValidate: false } });
        for (let i = 0; i < 100; i++) {
            db.db("test");
        }
        db.close();
    });
});
