describe("index", function () {
    const { database: { mongo } } = adone;

    it("should correctly extract index information", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_index_information");
        await collection.insert({ a: 1 });
        const indexName = await db.createIndex(collection.collectionName, "a");
        expect(indexName).to.be.equal("a_1");
        const info = await db.indexInformation(collection.collectionName);
        expect(info._id_).to.be.ok;
        expect(info._id_[0][0]).to.be.equal("_id");
        expect(info.a_1).to.be.deep.equal([["a", 1]]);

        const info2 = await db.indexInformation(collection.collectionName);
        let count1 = 0;
        let count2 = 0;
        // Get count of indexes
        for (const i in info) {
            count1 += 1;
        }
        for (const i in info2) {
            count2 += 1;
        }

        expect(count2).to.be.at.least(count1);
        expect(info2._id_).to.be.ok;
        expect(info2._id_[0][0]).to.be.equal("_id");
        expect(info2.a_1).to.be.deep.equal([["a", 1]]);
    });

    it("should correctly handle multiple column indexes", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_multiple_index_cols");
        await collection.insert({ a: 1 });
        const indexName = await db.createIndex(collection.collectionName, [["a", -1], ["b", 1], ["c", -1]]);
        expect(indexName).to.be.equal("a_-1_b_1_c_-1");
        const info = await db.indexInformation(collection.collectionName);
        let count1 = 0;
        for (const i in info) {
            count1 += 1;
        }
        expect(count1).to.be.equal(2);
        expect(info[indexName]).to.be.deep.equal([["a", -1], ["b", 1], ["c", -1]]);
    });

    it("should correctly handle unique index", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_unique_index");
        await db.createIndex(collection.collectionName, "hello");
        await collection.insert([{ hello: "world" }, { hello: "mike" }, { hello: "world" }]);
        const collection2 = await db.createCollection("test_unique_index2");
        await db.createIndex(collection2.collectionName, "hello", { unique: true, w: 1 });
        const err = await assert.throws(async () => {
            await collection2.insert([{ hello: "world" }, { hello: "mike" }, { hello: "world" }]);
        });
        expect(err.code).to.be.equal(11000); // dup
    });

    it("should correctly create subfield index", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_index_on_subfield");
        await collection.insert([{ hello: { a: 4, b: 5 } }, { hello: { a: 7, b: 2 } }, { hello: { a: 4, b: 10 } }]);
        const collection2 = await db.createCollection("test_index_on_subfield2");
        await db.createIndex(collection2.collectionName, "hello_a", { w: 1, unique: true });
        await assert.throws(async () => {
            await collection2.insert([
                { hello: { a: 4, b: 5 } },
                { hello: { a: 7, b: 2 } },
                { hello: { a: 4, b: 10 } }
            ]);
        });
    });

    it("should correctly drop indexes", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_drop_indexes");
        await collection.insert({ a: 1 });
        const indexName = await db.createIndex(collection.collectionName, "a");
        expect(indexName).to.be.equal("a_1");
        expect(await collection.dropAllIndexes()).to.be.true;
        const info = await collection.indexInformation();
        expect(info).not.to.have.property(indexName);
    });

    it.skip("should throw error on attempting safe create index with no callback", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldThrowErrorOnAttemptingSafeUpdateWithNoCallback");
        expect(() => {
            collection.createIndex({ a: 1 });
        }).to.throw();
    });

    it.skip("should throw error on attempting safe ensure index with no callback", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldThrowErrorOnAttemptingSafeUpdateWithNoCallback");
        expect(() => {
            collection.ensureIndex({ a: 1 });
        }).to.throw();
    });

    it("should correctly handle distinct indexes", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_distinct_queries");
        await collection.insert([
            { a: 0, b: { c: "a" } },
            { a: 1, b: { c: "b" } },
            { a: 1, b: { c: "c" } },
            { a: 2, b: { c: "a" } },
            { a: 3 }, { a: 3 }
        ]);
        {
            const docs = await collection.distinct("a");
            expect(docs.sort()).to.be.deep.equal([0, 1, 2, 3]);
        }
        {
            const docs = await collection.distinct("b.c");
            expect(docs.sort()).to.be.deep.equal(["a", "b", "c"]);
        }
    });

    it("should correctly execute ensure index", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_ensure_index");
        const indexName = await db.ensureIndex(collection.collectionName, "a");
        expect(indexName).to.be.equal("a_1");
        const info = await db.indexInformation(collection.collectionName);
        expect(info._id_).to.be.ok;
        expect(info._id_[0][0]).to.be.equal("_id");
        expect(info[indexName]).to.be.deep.equal([["a", 1]]);
        expect(await db.ensureIndex(collection.collectionName, "a")).to.be.equal(indexName);
        const info2 = await db.indexInformation(collection.collectionName);
        expect(info2._id_).to.be.ok;
        expect(info2._id_[0][0]).to.be.equal("_id");
        expect(info2[indexName]).to.be.deep.equal([["a", 1]]);
    });

    it("should correctly create and use sparse index", async () => {
        const { db } = this;
        const collection = await db.createCollection("create_and_use_sparse_index_test");
        await collection.ensureIndex({ title: 1 }, { sparse: true, w: 1 });
        await collection.insert([{ name: "Jim" }, { name: "Sarah", title: "Princess" }]);
        const items = await collection.find({ title: { $ne: null } }).sort({ title: 1 }).toArray();
        expect(items).to.have.lengthOf(1);
        expect(items[0].name).to.be.equal("Sarah");
        const info = await collection.indexInformation({ full: true });
        expect(info).to.have.lengthOf(2);
    });

    it("should correctly handle geospatial indexes", async () => {
        const { db } = this;
        const collection = await db.createCollection("geospatial_index_test");
        await collection.ensureIndex({ loc: "2d" });
        await collection.insert({ loc: [-100, 100] });
        await assert.throws(async () => {
            await collection.insert({ loc: [200, 200] });
        }, /point not in interval of.+-180.+180/);
    });

    it("should correctly handle geospatial indexes altered range", async () => {
        const { db } = this;
        const collection = await db.createCollection("geospatial_index_altered_test");
        await collection.ensureIndex({ loc: "2d" }, { min: 0, max: 1024, w: 1 });
        await collection.insert({ loc: [100, 100] });
        await collection.insert({ loc: [200, 200] });
        await assert.throws(async () => {
            await collection.insert({ loc: [-200, -200] });
        }, /point not in interval of.+0.+1024/);
    });

    it("should throw duplicate key error when creating index", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldThrowDuplicateKeyErrorWhenCreatingIndex");
        await collection.insert([{ a: 1 }, { a: 1 }]);
        await assert.throws(async () => {
            await collection.ensureIndex({ a: 1 }, { unique: true, w: 1 });
        }, "duplicate key");
    });

    it.skip("should throw duplicate key error when driver in strict mode", async () => {
        // ?
    });

    it("should correctly use min/max for setting range in ensure index", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlyUseMinMaxForSettingRangeInEnsureIndex");
        await collection.ensureIndex({ loc: "2d" }, { min: 200, max: 1400, w: 1 });
        await collection.insert({ loc: [600, 600] });
    });

    it("should correctly create an index with overriden name", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlyCreateAnIndexWithOverridenName");
        await collection.ensureIndex("name", { name: "myfunky_name" });
        const info = await collection.indexInformation({ full: false });
        expect(info.myfunky_name).to.be.ok;
    });

    it.skip("should handle index declarations using objects from other contexts", async () => {
    });

    it("should correctly return error message when applying unique index to duplicate documents", async () => {
        const { db } = this;
        const collection = db.collection("should_throw_error_due_to_duplicates");
        await collection.insert([{ a: 1 }, { a: 1 }, { a: 1 }]);
        await assert.throws(async () => {
            await collection.ensureIndex({ a: 1 }, { w: 1, unique: true });
        }, "duplicate key");
    });

    it("should correctly drop index with no callback", async () => {
        const { db } = this;
        const collection = db.collection("should_correctly_drop_index");
        await collection.insert([{ a: 1 }]);
        await collection.ensureIndex({ a: 1 });
        collection.dropIndex("a_1");
    });

    it("should correctly apply hint to find", async () => {
        const { db } = this;
        const collection = db.collection("should_correctly_apply_hint");
        await collection.insert([{ a: 1 }]);
        await collection.ensureIndex({ a: 1 });
        await collection.indexInformation({ full: false });
        const docs = await collection.find({}, { hint: "a_1" }).toArray();
        expect(docs).to.have.lengthOf(1);
        expect(docs[0]).to.include({ a: 1 });
    });

    it("should correctly set language_override option", async () => {
        const { db } = this;
        const collection = db.collection("should_correctly_set_language_override");
        await collection.insert([{ text: "Lorem ipsum dolor sit amet.", langua: "italian" }]);
        await collection.ensureIndex({ text: "text" }, { language_override: "langua", name: "language_override_index" });
        const info = await collection.indexInformation({ full: true });
        expect(info).not.to.be.empty;
        for (let i = 0; i < info.length; i++) {
            if (info[i].name === "language_override_index") {
                expect(info[i].language_override).to.be.equal("langua");
            }
        }
    });

    if (this.topology === "single") {
        it("should correctly use listIndexes to retrieve index list", async () => {
            const { db } = this;
            await db.collection("testListIndexes").ensureIndex({ a: 1 });
            expect(await db.collection("testListIndexes").listIndexes().toArray()).to.have.lengthOf(2);
        });

        it("should correctly use listIndexes to retrieve index list using hasNext", async () => {
            const { db } = this;
            await db.collection("testListIndexes_2").ensureIndex({ a: 1 });
            expect(await db.collection("testListIndexes_2").listIndexes().hasNext()).to.be.true;
        });

        it("should correctly ensureIndex for nested style index name c.d", async () => {
            const { db } = this;
            await db.collection("ensureIndexWithNestedStyleIndex").ensureIndex({ "c.d": 1 });
            expect(await db.collection("ensureIndexWithNestedStyleIndex").listIndexes().toArray()).to.have.lengthOf(2);
        });

        it("should correctly execute createIndexes", async () => {
            const { db } = this;
            const r = await db.collection("createIndexes").createIndexes([
                { key: { a: 1 } }, { key: { b: 1 }, name: "hello1" }
            ]);
            expect(r.numIndexesAfter).to.be.equal(3);
            const docs = await db.collection("createIndexes").listIndexes().toArray();
            const names = docs.map((x) => x.name);
            expect(names).to.include.members(["hello1", "a_1"]);
        });
    }

    it("should correctly create text index", async () => {
        const { db } = this;
        const r = await db.collection("text_index").createIndex({ "$**": "text" }, { name: "TextIndex" });
        expect(r).to.be.equal("TextIndex");
    });

    it("should correctly pass partialIndexes through to createIndexCommand", async () => {
        const { db } = this;
        const started = [];
        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "createIndexes") {
                started.push(event);
            }
        });
        await db.collection("partialIndexes").createIndex({ a: 1 }, { partialFilterExpression: { a: 1 } });
        expect(started[0].command.indexes[0].partialFilterExpression).to.be.deep.equal({ a: 1 });
        listener.uninstrument();
    });

    it("should not retry partial index expression error", async () => {
        const { db } = this;
        // Can't use $exists: false in partial filter expression, see
        // https://jira.mongodb.org/browse/SERVER-17853
        const opts = { partialFilterExpression: { a: { $exists: false } } };
        const err = await assert.throws(async () => {
            await db.collection("partialIndexes").createIndex({ a: 1 }, opts);
        });
        expect(err.code).to.be.equal(67);
        // expect(err.message).to.include("key $exists must not start with '$'");
        // ?
    });

    if (this.topology === "single") {
        it("should correctly error out due to driver close", async () => {
            const { db } = this;
            await db.close();
            await assert.throws(async () => {
                await db.createCollection("nonexisting", { w: 1 });
            });
            await assert.throws(async () => {
                await db.collection("nonexisting", { strict: true });
            });
            assert.doesNotThrow(async () => {
                db.collection("nonexisting", { strict: false });
            });
        });
    }

    it("should correctly create index on embedded key", async () => {
        const { db } = this;
        const collection = db.collection("embedded_key_indes");

        await collection.insertMany([{
            a: { a: 1 }
        }, {
            a: { a: 2 }
        }]);

        await collection.ensureIndex({ "a.a": 1 });
    });

    it("should correctly create index using .", async () => {
        const { db } = this;
        const collection = db.collection("embedded_key_indes_1");
        await collection.createIndex(
            { "key.external_id": 1, "key.type": 1 },
            { unique: true, sparse: true, name: "indexname" }
        );
    });

    it("error on duplicate key index", async () => {
        const { db } = this;
        const collection = db.collection("embedded_key_indes_2");
        await collection.insertMany([{
            key: { externalId: 1, type: 1 }
        }, {
            key: { externalId: 1, type: 1 }
        }]);
        const err = await assert.throws(async () => {
            await collection.createIndex(
                { "key.external_id": 1, "key.type": 1 },
                { unique: true, sparse: true, name: "indexname" }
            );
        });
        expect(err.code).to.be.equal(11000); // dup
    });

    it("should correctly create Index with sub element", async () => {
        const { db } = this;
        await db.collection("messed_up_index").createIndex({ temporary: 1, "store.addressLines": 1, lifecycleStatus: 1 });
    });

    it("should correctly fail detect error code 85 when peforming createIndex", async () => {
        const { db } = this;
        const collection = db.collection("messed_up_options");

        await collection.ensureIndex({ "a.one": 1, "a.two": 1 }, { name: "n1", partialFilterExpression: { "a.two": { $exists: true } } });
        const err = await assert.throws(async () => {
            await collection.ensureIndex({ "a.one": 1, "a.two": 1 }, { name: "n2", partialFilterExpression: { "a.too": { $exists: true } } });
        });
        expect(err.code).to.be.equal(85);
    });

    it("should correctly create Index with sub element running in background", async () => {
        const { db } = this;
        await db.collection("messed_up_index_2").createIndex({ "accessControl.get": 1 }, { background: true });
    });
});
