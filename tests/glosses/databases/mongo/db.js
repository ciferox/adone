describe("db", function () {
    const { database: { mongo }, data: { bson } } = adone;
    const { __: { Db } } = mongo;

    if (this.topology === "single") {
        it("should correctly handle illegal db names", async () => {
            assert.throws(() => {
                new Db(5);
            }, "database name must be a string");

            assert.throws(() => {
                new Db("");
            }, "database name cannot be the empty string");

            assert.throws(() => {
                new Db("te$t");
            }, "database names cannot contain the character '$'");

            assert.throws(() => {
                new Db(".test");
            }, "database names cannot contain the character '.'");

            assert.throws(() => {
                new Db("\\test");
            }, "database names cannot contain the character '\\'");

            assert.throws(() => {
                new Db("test test");
            }, "database names cannot contain the character ' '");
        });

        it("should correctly perform automatic connect", async () => {
            const client = await mongo.connect(this.url(), { autoReconnect: true });
            const close = new Promise((resolve) => client.once("close", resolve));
            client.serverConfig.connections()[0].destroy();
            await close;
            const collection = client.collection("test_object_id_generation_data2");
            const r = await collection.insert({ name: "Patty", age: 34 });
            expect(r.ops).to.have.lengthOf(1);
            expect(r.ops[0]._id.toHexString()).to.have.lengthOf(24);
            const document = await collection.findOne({ name: "Patty" });
            expect(r.ops[0]._id.toHexString()).to.be.equal(document._id.toHexString());
            await client.close();
        });

        it("should correctly perform automatic connect with max buffer size = 0", async () => {
            const client = await mongo.connect(this.url(), { bufferMaxEntries: 0, autoReconnect: true });
            const close = new Promise((resolve) => client.once("close", resolve));
            client.serverConfig.connections()[0].destroy();
            await close;
            const collection = client.collection("test_object_id_generation_data3");
            await assert.throws(async () => {
                await collection.insert({ name: "Patty", age: 34 });
            }, "no connection available for operation and number of stored operation > 0");
            await client.close();
        });
    }

    it("should correctly handle failed connection", async () => {
        await assert.throws(async () => {
            await mongo.connect("mongodb://localhost:12312/test");
        });
    });

    it("should correctly resave dbref", async () => {
        const { db } = this;
        await db.dropCollection("test_resave_dbref").catch(() => { });
        const collection = await db.createCollection("test_resave_dbref");
        const r = await collection.insert({ name: "parent" }, { safe: true });
        expect(r.ops).to.have.lengthOf(1);
        expect(r.ops[0]._id).to.be.ok;
        const parent = r.ops[0];
        let child = {
            name: "child",
            parent: new bson.DBRef("test_resave_dbref", parent._id)
        };

        await collection.insert(child, { safe: true });
        child = await collection.findOne({ name: "child" });
        await collection.save(child, { save: true });
        expect(await collection.findOne({ parent: new mongo.DBRef("test_resave_dbref", parent._id) })).to.be.ok;
    });

    if (this.topology === "single" || this.topology === "replicaset") {
        it("should correctly force reindex on collection", async () => {
            const { db } = this;
            const collection = await db.createCollection("create_and_drop_all_indexes");
            await collection.insert([
                { a: 1, b: 1 },
                { a: 2, b: 2 },
                { a: 3, b: 3 },
                { a: 4, b: 4, c: 4 }
            ]);
            await collection.ensureIndex({ a: 1, b: 1 }, { unique: true, background: true, w: 1 });
            expect(await collection.reIndex("create_and_drop_all_indexes")).to.be.true;
            const indexInformation = await collection.indexInformation();
            expect(indexInformation._id_).to.be.deep.equal([["_id", 1]]);
            expect(indexInformation.a_1_b_1).to.be.deep.equal([["a", 1], ["b", 1]]);
        });
    }

    it("should correctly get error dropping non existing db", async () => {
        expect(await this.db.db("nonexistingdb").dropDatabase()).to.be.true;
    });

    it("should correctly throw when trying ro reppen connection", async () => {
        await assert.throws(async () => {
            await this.db.open();
        }, "connected");
    });

    it.skip("should correctly reconnect when error", async () => {
        //
    });

    it("should not cut collection name when it is the same as the database", async () => {
        const db = this.db.db("node972");
        await db.collection("node972.test").insertOne({ a: 1 });
        const collections = await db.collections();
        expect(collections.map((x) => x.collectionName)).to.include("node972.test");
    });

    it("should correctly use cursor with list collections command", async () => {
        const db = this.db.db("shouldCorrectlyUseCursorWithListCollectionsCommand");
        await db.collection("test").insertOne({ a: 1 });
        await db.collection("test1").insertOne({ a: 1 });
        const cursor = db.listCollections({ name: "test1" });
        const names = await cursor.toArray();
        expect(names).to.have.lengthOf(1);
        expect(names[0].name).to.be.equal("test1");
    });

    it("should correctly use cursor with list collections command and batchSize", async () => {
        const db = this.db.db("shouldCorrectlyUseCursorWithListCollectionsCommandAndBatchSize");
        await db.collection("test").insertOne({ a: 1 });
        await db.collection("test1").insertOne({ a: 1 });
        const cursor = db.listCollections({ name: "test" }, { batchSize: 1 });
        const names = await cursor.toArray();
        expect(names).to.have.lengthOf(1);
        expect(names[0].name).to.be.equal("test");
    });

    it("should correctly list collection names with . in the middle", async () => {
        const db = this.db.db("shouldCorrectlyListCollectionsWithDotsOnThem");
        await db.collection("test.collection1").insertOne({ a: 1 });
        await db.collection("test.collection2").insertOne({ a: 1 });
        {
            const cursor = db.listCollections({ name: /test.collection/ });
            const names = await cursor.toArray();
            expect(names).to.have.lengthOf(2);
        }
        {
            const cursor = db.listCollections({ name: "test.collection1" }, {});
            const names = await cursor.toArray();
            expect(names).to.have.lengthOf(1);
        }
    });

    it("should correctly list collection names with batchSize 1 for 2.8 or higher", async () => {
        const db = this.db.db("shouldCorrectlyListCollectionsWithDotsOnThemFor28");
        await db.collection("test.collection1").insertOne({ a: 1 });
        await db.collection("test.collection2").insertOne({ a: 1 });
        const cursor = db.listCollections({ name: /test.collection/ }, { batchSize: 1 });
        const names = await cursor.toArray();
        expect(names).to.have.lengthOf(2);
    });
});
