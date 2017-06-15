describe("read preference", function () {
    if (this.topology !== "single") {
        return;
    }

    const { database: { mongo } } = adone;
    const { ReadPreference } = mongo;

    it("should correctly apply collection level read preference to count", async () => {
        const { db } = this;
        const collection = db.collection("read_pref_1", { readPreference: ReadPreference.SECONDARY_PREFERRED });
        const s = spy(db.serverConfig, "command");
        await collection.count();
        expect(s).to.have.been.calledOnce;
        const { args } = s.getCall(0);
        expect(args[2].readPreference.preference).to.be.equal(ReadPreference.SECONDARY_PREFERRED);
    });

    it("should correctly apply collection level read preference to group", async () => {
        const { db } = this;
        const collection = db.collection("read_pref_1", { readPreference: ReadPreference.SECONDARY_PREFERRED });
        const s = spy(db.serverConfig, "command");
        await collection.group([], {}, { count: 0 }, "function (obj, prev) { prev.count++; }");
        expect(s).to.have.been.calledOnce;
        const { args } = s.getCall(0);
        expect(args[2].readPreference.preference).to.be.equal(ReadPreference.SECONDARY_PREFERRED);
    });

    it("should not allow user to clobber geoNear with options", async () => {
        const { db } = this;
        const collection = db.collection("simple_geo_near_command");
        await collection.ensureIndex({ loc: "2d" });
        await collection.insert([{ a: 1, loc: [50, 30] }, { a: 1, loc: [30, 50] }], { w: 1 });
        const options = { query: { a: 1 }, num: 1, geoNear: "bacon", near: "butter" };
        const docs = await collection.geoNear(50, 50, options);
        expect(docs.results).to.have.lengthOf(1);
    });

    it("should correctly apply collection level read preference to geoNear", async () => {
        const { db } = this;
        const collection = db.collection("read_pref_1", { readPreference: ReadPreference.SECONDARY_PREFERRED });
        const s = spy(db.serverConfig, "command");
        await collection.geoNear(50, 50, { query: { a: 1 }, num: 1 }).catch(() => { });
        expect(s).to.have.been.calledOnce;
        const { args } = s.getCall(0);
        expect(args[2].readPreference.preference).to.be.equal(ReadPreference.SECONDARY_PREFERRED);
    });

    it("should correctly apply collection level read preference to geoHaystackSearch", async () => {
        const { db } = this;
        const collection = db.collection("read_pref_1", { readPreference: ReadPreference.SECONDARY_PREFERRED });
        const s = spy(db.serverConfig, "command");
        await collection.geoHaystackSearch(50, 50, { search: { a: 1 }, limit: 1, maxDistance: 100 }).catch(() => { });
        expect(s).to.have.been.calledOnce;
        const { args } = s.getCall(0);
        expect(args[2].readPreference.preference).to.be.equal(ReadPreference.SECONDARY_PREFERRED);
    });

    it("should correctly apply collection level read preference to mapReduce", async () => {
        const { db } = this;
        const collection = db.collection("read_pref_1", { readPreference: ReadPreference.SECONDARY_PREFERRED });
        const s = spy(db.serverConfig, "command");
        const map = function () {
            emit(this.userId, 1);
        };
        const reduce = function (k, vals) {
            return 1;
        };
        await collection.mapReduce(map, reduce, { out: { inline: 1 } }).catch(() => { });
        expect(s).to.have.been.calledOnce;
        const { args } = s.getCall(0);
        expect(args[2].readPreference.preference).to.be.equal(ReadPreference.SECONDARY_PREFERRED);
    });

    it("should correctly apply collection level read preference to mapReduce backward compatibility", async () => {
        const { db } = this;
        const collection = db.collection("read_pref_1", { readPreference: ReadPreference.SECONDARY_PREFERRED });
        const s = spy(db.serverConfig, "command");
        const map = function () {
            emit(this.userId, 1);
        };
        const reduce = function (k, vals) {
            return 1;
        };
        await collection.mapReduce(map, reduce, { out: "inline" }).catch(() => { });
        expect(s).to.have.been.calledOnce;
        const { args } = s.getCall(0);
        expect(args[2].readPreference.preference).to.be.equal(ReadPreference.SECONDARY_PREFERRED);
    });

    it("should fail due to not using mapReduce inline with read preference", async () => {
        const { db } = this;
        const collection = db.collection("read_pref_1", { readPreference: ReadPreference.SECONDARY_PREFERRED });
        const map = function () {
            emit(this.userId, 1);
        };
        const reduce = function (k, vals) {
            return 1;
        };
        await assert.throws(async () => {
            await collection.mapReduce(map, reduce, { out: { append: "test" } });
        });
    });

    it.skip("should correctly apply collection level read preference to aggregate", async () => {
        const { db } = this;
        const collection = db.collection("read_pref_1", { readPreference: ReadPreference.SECONDARY_PREFERRED });
        const s = spy(db.serverConfig, "command");
        await collection.aggregate([
            {
                $project: {
                    author: 1,
                    tags: 1
                }
            },
            { $unwind: "$tags" },
            {
                $group: {
                    _id: { tags: "$tags" },
                    authors: { $addToSet: "$author" }
                }
            }
        ]);
        expect(s).to.have.been.calledOnce;
        const { args } = s.getCall(0);
        expect(args[2].readPreference.preference).to.be.equal(ReadPreference.SECONDARY_PREFERRED);
    });

    it("should correctly apply collection level read Preference to stats", async () => {
        const { db } = this;
        const collection = db.collection("read_pref_1", { readPreference: ReadPreference.SECONDARY_PREFERRED });
        const s = spy(db.serverConfig, "command");
        await collection.stats().catch(() => { });
        expect(s).to.have.been.calledOnce;
        const { args } = s.getCall(0);
        expect(args[2].readPreference.preference).to.be.equal(ReadPreference.SECONDARY_PREFERRED);
    });

    it("should correctly honor the readPreferences at DB and individual command level", async () => {
        const db = await mongo.connect(this.url(), { readPreference: "secondary" });
        const s = spy(db.serverConfig, "command");
        await db.command({ dbStats: true });
        {
            expect(s).to.have.been.calledOnce;
            const { args } = s.getCall(0);
            expect(args[2].readPreference.preference).to.be.equal(ReadPreference.SECONDARY);
        }

        await db.command({ dbStats: true }, { readPreference: "secondaryPreferred" });
        {
            expect(s).to.have.been.calledTwice;
            const { args } = s.getCall(1);
            expect(args[2].readPreference.preference).to.be.equal(ReadPreference.SECONDARY_PREFERRED);
        }
        await db.close();
    });

    it("should correctly apply readPreferences specified as objects", async () => {
        const { db } = this;
        const mySecondaryPreferred = { mode: "secondaryPreferred", tags: [] };
        await db.command({ dbStats: true }, { readPreference: mySecondaryPreferred });
    });

    it("should correctly pass readPreferences specified as objects to cursors", async () => {
        const { db } = this;
        const mySecondaryPreferred = { mode: "secondaryPreferred", tags: [] };
        await db.listCollections({}, { readPreference: mySecondaryPreferred }).toArray();
    });

    it("should correctly pass readPreferences specified as objects to collection methods", async () => {
        const { db } = this;
        const mySecondaryPreferred = { mode: "secondaryPreferred", tags: [] };
        const cursor = db.collection("test").find({}, { readPreference: mySecondaryPreferred });
        await cursor.toArray();
    });

    it("should correctly pass readPreferences on the Collection to listIndexes", async () => {
        const { db } = this;
        const cursor = db.collection("test", { readPreference: ReadPreference.SECONDARY_PREFERRED }).listIndexes();
        expect(cursor.s.options.readPreference.preference).to.be.equal("secondaryPreferred");
    });
});
