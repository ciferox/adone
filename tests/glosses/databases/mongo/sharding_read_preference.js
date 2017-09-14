describe("sharding read preference", function () {
    if (this.topology !== "sharded") {
        return;
    }

    const { database: { mongo } } = adone;
    const { ReadPreference } = mongo;
    const { Mongos, Server, Db } = adone.private(mongo);

    it("should correctly perform a mongos secondary read using the read preferences", async () => {
        const mongos = new Mongos([
            new Server(this.host, this.port, { autoReconnect: true }),
            new Server(this.host, this.port + 1, { autoReconnect: true })
        ]);
        const db = new Db("tests_", mongos, { w: 0, debug: true });
        await db.open();
        const collection = db.collection("shard_test1");
        await collection.insert({ test: 1 }, { w: "majority", wtimeout: 10000 });
        const cursor = collection.find({ test: 1 }, {}, {
            readPreference: new ReadPreference(ReadPreference.SECONDARY)
        });
        expect(cursor.options.readPreference.preference).to.be.equal(ReadPreference.SECONDARY);
        const [item] = await cursor.toArray();
        expect(item.test).to.be.equal(1);
        await db.close();
    });

    it("should correctly fail a mongos read using a unsupported read preference", async () => {
        const mongos = new Mongos([
            new Server(this.host, this.port, { autoReconnect: true }),
            new Server(this.host, this.port + 1, { autoReconnect: true })
        ]);
        const db = new Db("tests_", mongos, { w: 0, debug: true });
        await db.open();
        const collection = db.collection("shard_test2");
        await collection.insert({ test: 1 }, { w: "majority", wtimeout: 10000 });
        const cursor = collection.find({ test: 1 }, {}, {
            readPreference: new ReadPreference("unsupported")
        });
        expect(cursor.options.readPreference.preference).to.be.equal("unsupported");
        await assert.throws(async () => {
            await cursor.toArray();
        });
        await db.close();
    });

    it("should fail a mongos secondary read using the read preference and tags that dont exist", async () => {
        const mongos = new Mongos([
            new Server(this.host, this.port, { autoReconnect: true }),
            new Server(this.host, this.port + 1, { autoReconnect: true })
        ]);
        const db = new Db("tests_", mongos, { w: 0, debug: true });
        await db.open();
        const collection = db.collection("shard_test3");
        await collection.insert({ test: 1 }, { w: "majority", wtimeout: 10000 });
        const cursor = collection.find({ test: 1 }, {}, {
            readPreference: new ReadPreference(ReadPreference.SECONDARY, [{ dc: "sf", s: "1" }, { dc: "ma", s: "2" }])
        });
        expect(cursor.options.readPreference.tags).to.be.deep.equal([{ dc: "sf", s: "1" }, { dc: "ma", s: "2" }]);
        await assert.throws(async () => {
            await cursor.toArray();
        });
        await db.close();
    });

    it("should correctly read from a tagged secondary using mongos", async () => {
        const mongos = new Mongos([
            new Server(this.host, this.port, { autoReconnect: true }),
            new Server(this.host, this.port + 1, { autoReconnect: true })
        ]);
        const db = new Db("tests_", mongos, { w: 0, debug: true });
        await db.open();
        const collection = db.collection("shard_test4");
        await collection.insert({ test: 1 }, { w: "majority", wtimeout: 10000 });
        const cursor = collection.find({ test: 1 }, {}, {
            readPreference: new ReadPreference(ReadPreference.SECONDARY, [{ loc: "ny" }, { loc: "sf" }])
        });
        expect(cursor.options.readPreference.tags).to.be.deep.equal([{ loc: "ny" }, { loc: "sf" }]);
        const [item] = await cursor.toArray();
        expect(item.test).to.be.equal(1);
        await db.close();
    });

    it("should correctly connect to mongos using single server instance", async () => {
        const mongos = new Server(this.host, this.port, { autoReconnect: true });
        const db = new Db("tests_", mongos, { w: 1 });
        await db.open();
        const collection = db.collection("shard_test5");
        await collection.insert({ test: 1 }, { w: "majority", wtimeout: 10000 });
        const item = await collection.findOne({ test: 1 }, {}, {
            readPreference: new ReadPreference(ReadPreference.SECONDARY)
        });
        expect(item.test).to.be.equal(1);
        await db.close();
    });

    it("should correctly connect to the mongos using Server connection", async () => {
        const db = new Db("test", new Server(this.host, this.port), { w: 0 });
        await db.open();
        await db.createCollection("shard_test6");
        await db.close();
    });

    it("should correctly emit open event", async () => {
        const mongos = new Mongos([
            new Server(this.host, this.port, { autoReconnect: true }),
            new Server(this.host, this.port + 1, { autoReconnect: true })
        ]);
        const db = new Db("tests_", mongos, { w: 0 });
        const open = spy();
        db.on("open", open);
        await db.open();
        expect(open).to.have.been.calledOnce;
        await db.close();
    });

    it("should correctly apply readPreference when performing inline mapReduce", async () => {
        const mongos = new Mongos([
            new Server(this.host, this.port, { autoReconnect: true })
        ]);
        const db = new Db("integration_test_2", mongos);
        await db.open();
        const collection = db.collection("items");
        await collection.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);
        await db.db("admin").command({ enableSharding: "integration_test_2" });
        await collection.createIndex({ _id: "hashed" });
        await db.db("admin").command({
            shardCollection: "integration_test_2.items",
            key: { _id: "hashed" }
        });
        const map = function () {
            emit(this._id, this._id);
        };
        const reduce = function (key, values) {
            return 123;
        };
        const r = await collection.mapReduce(map, reduce, {
            out: {
                inline: 1
            },
            readPreference: ReadPreference.SECONDARY_PREFERRED
        });
        expect(r).to.have.lengthOf(3);
        await db.close();
    });
});
