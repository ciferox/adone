describe("replset operations", function () {
    if (this.topology !== "replicaset") {
        return;
    }

    const { database: { mongo }, std } = adone;

    it("should fail due to w:5 and wtimeout:1 with ordered batch api", async () => {
        const db = await mongo.connect(this.url({ search: { readPreference: "primary" } }));
        const collection = db.collection("batch_write_ordered_ops_0");
        await collection.remove();
        await collection.ensureIndex({ a: 1 }, { unique: true });
        const batch = collection.initializeOrderedBulkOp();
        batch.insert({ a: 1 });
        batch.insert({ a: 2 });
        const result = await batch.execute({ w: 5, wtimeout: 1 });
        expect(result).to.include({
            nInserted: 2,
            nMatched: 0,
            nUpserted: 0,
            nRemoved: 0
        });
        expect(result.nModified).to.be.oneOf([0, null, undefined]);
        const writeConcernError = result.getWriteConcernError();
        expect(writeConcernError).to.be.ok;
        expect(writeConcernError.code).to.be.ok;
        expect(writeConcernError.errmsg).to.be.ok;
        expect(result.getWriteErrorCount()).to.be.equal(0);
        await db.close();
    });

    it("should fail due to w:5 and wtimeout:1 combined with duplicate key errors with ordered batch api", async () => {
        const db = await mongo.connect(this.url({ search: { readPreference: "primary" } }));
        const collection = db.collection("batch_write_ordered_ops_1");
        await collection.remove();
        await collection.ensureIndex({ a: 1 }, { unique: true });
        const batch = collection.initializeOrderedBulkOp();
        batch.insert({ a: 1 });
        batch.find({ a: 3 }).upsert().updateOne({ a: 3, b: 1 });
        batch.insert({ a: 1 });
        batch.insert({ a: 2 });
        // TODO
        const [err, result] = await new Promise((resolve) => {
            batch.execute({ w: 5, wtimeout: 1 }, (err, result) => resolve([err, result]));
        });
        expect(err).to.be.an("error");
        expect(err.message).to.include("duplicate key");
        expect(result).to.include({
            nInserted: 1,
            nMatched: 0,
            nUpserted: 1,
            nRemoved: 0
        });
        expect(result.nModified).to.be.oneOf([0, null, undefined]);
        const writeConcernError = result.getWriteConcernError();
        expect(writeConcernError).to.be.ok;
        expect(writeConcernError.code).to.be.ok;
        expect(writeConcernError.errmsg).to.be.ok;
        expect(result.getWriteErrorCount()).to.be.equal(1);
        const error = result.getWriteErrorAt(0);
        expect(error.index).to.be.equal(2);
        expect(error.code).to.be.equal(11000);
        expect(error.errmsg).to.be.ok;
        expect(error.getOperation().a).to.be.equal(1);
        await db.close();
    });

    it("should fail due to w:5 and wtimeout:1 with unordered batch api", async () => {
        const db = await mongo.connect(this.url({ search: { readPreference: "primary" } }));
        const collection = db.collection("batch_write_unordered_ops_0");
        await collection.remove();
        await collection.ensureIndex({ a: 1 }, { unique: true });
        const batch = collection.initializeUnorderedBulkOp();
        batch.insert({ a: 1 });
        batch.find({ a: 3 }).upsert().updateOne({ a: 3, b: 1 });
        batch.insert({ a: 2 });
        const result = await batch.execute({ w: 5, wtimeout: 1 });
        expect(result).to.include({
            nInserted: 2,
            nMatched: 0,
            nUpserted: 1,
            nRemoved: 0
        });
        expect(result.nModified).to.be.oneOf([0, null, undefined]);
        const writeConcernError = result.getWriteConcernError();
        expect(writeConcernError).to.be.ok;
        expect(writeConcernError.code).to.be.ok;
        expect(writeConcernError.errmsg).to.be.ok;
        expect(result.getWriteErrorCount()).to.be.equal(0);
        await db.close();
    });

    it("should fail due to w:5 and wtimeout:1 combined with duplicate key errors with unordered batch api", async () => {
        const db = await mongo.connect(this.url({ search: { readPreference: "primary" } }));
        const collection = db.collection("batch_write_unordered_ops_1");
        await collection.remove();
        await collection.ensureIndex({ a: 1 }, { unique: true });
        const batch = collection.initializeUnorderedBulkOp();
        batch.insert({ a: 1 });
        batch.find({ a: 3 }).upsert().updateOne({ a: 3, b: 1 });
        batch.insert({ a: 1 });
        batch.insert({ a: 2 });
        // TODO
        const [err, result] = await new Promise((resolve) => {
            batch.execute({ w: 5, wtimeout: 1 }, (err, result) => resolve([err, result]));
        });
        expect(err).to.be.an("error");
        expect(err.message).to.include("duplicate key");
        expect(result).to.include({
            nInserted: 2,
            nMatched: 0,
            nUpserted: 1,
            nRemoved: 0
        });
        expect(result.nModified).to.be.oneOf([0, null, undefined]);
        const writeConcernError = result.getWriteConcernError();
        expect(writeConcernError).to.be.ok;
        expect(writeConcernError.code).to.be.ok;
        expect(writeConcernError.errmsg).to.be.ok;
        // Might or might not have a write error depending on
        // Unordered execution order
        expect(result.getWriteErrorCount()).to.be.oneOf([0, 1]);
        if (result.getWriteErrorCount() === 1) {
            const error = result.getWriteErrorAt(0);
            expect(error.index).to.be.equal(1);
            expect(error.code).to.be.equal(11000);
            expect(error.errmsg).to.be.ok;
            expect(error.getOperation().a).to.be.equal(1);
        }
        await db.close();
    });

    it("should fail to do map reduce to out collection", async () => {
        const db = await mongo.connect(this.url({ search: { readPreference: "primary" } }));
        const collection = db.collection("test_map_reduce_functions_notInline_map_reduce", {
            readPreference: mongo.ReadPreference.SECONDARY,
            w: 2,
            wtimeout: 10000
        });
        await db.admin().serverInfo();
        const map = function () {
            emit(this.userId, 1);
        };
        const reduce = function (k, vals) {
            return 1;
        };
        await assert.throws(async () => {
            await collection.mapReduce(map, reduce, { out: { replace: "replacethiscollection" }, readPreference: mongo.ReadPreference.SECONDARY });
        });
        await db.close();
    });

    it("should correctly execute ensureIndex with readPreference primaryPreferred", async () => {
        const db = await mongo.connect(this.url({ search: { readPreference: "primaryPreferred" } }));
        const collection = db.collection("ensureIndexWithPrimaryPreferred");
        await collection.ensureIndex({ a: 1 });
        await db.close();
    });

    it("should correctly group using replicaset", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet: "rs",
                readPreference: "primary"
            }).toString()
        });
        const db = await mongo.connect(url);
        const collection = db.collection("testgroup_replicaset", {
            readPreference: mongo.ReadPreference.SECONDARY,
            w: 2,
            wtimeout: 10000
        });
        await collection.insert([{ key: 1, x: 10 }, { key: 2, x: 30 }, { key: 1, x: 20 }, { key: 3, x: 20 }]);
        const primary = await this.server.primary();
        const left = spy();
        db.serverConfig.on("left", left);
        const primaryLeft = left.waitForArgs("primary");
        await primary.stop();
        await primaryLeft;
        const items = await collection.group(["key"], {}, { sum: 0 }, function reduce(record, memo) {
            memo.sum += record.x;
        }, true);
        expect(items).to.have.lengthOf(3);
        await db.close();
        await this.server.restart();
    });

    it("should correctly execute createIndex with secondary readPreference", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet: "rs",
                readPreference: "secondary"
            }).toString()
        });
        const db = await mongo.connect(url);
        const collection = db.collection("testgroup_replicaset_2", {
            readPreference: mongo.ReadPreference.SECONDARY,
            w: 2, wtimeout: 10000
        });

        await collection.createIndexes([{ name: "a_1", key: { a: 1 } }]);
        await db.close();
        await this.server.restart();
    });
});
