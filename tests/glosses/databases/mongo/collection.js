describe("collection", function () {
    const { data: { bson } } = adone;

    it("should correctly execute basic collection methods", async () => {
        const { db } = this;
        {
            const collection = await db.createCollection("test_collection_methods");
            expect(collection.collectionName).to.be.equal("test_collection_methods");

            const documents = await db.listCollections().toArray();
            expect(documents.map((x) => x.name)).to.contain("test_collection_methods");
            await db.renameCollection("test_collection_methods", "test_collection_methods2");
            expect(await db.dropCollection("test_collection_methods2")).to.be.true;
        }
        {
            const collection = await db.createCollection("test_collection_methods3");
            expect(collection.collectionName).to.be.equal("test_collection_methods3");
        }
        {
            const collection = await db.createCollection("test_collection_methods4");
            expect(collection.collectionName).to.be.equal("test_collection_methods4");
        }
        await db.renameCollection("test_collection_methods4", "test_collection_methods3", { dropTarget: true });
        expect(await db.dropCollection("test_collection_methods3")).to.be.true;
    });

    it("should correctly list back collection names containing .", async () => {
        const db1 = this.db.db("test");
        const collection = await db1.createCollection("test.game");
        expect(collection.collectionName).to.be.equal("test.game");
        const documents = await db1.listCollections().toArray();
        expect(documents.map((x) => x.name)).to.include("test.game");
    });

    it("should access to collections", async () => {
        const { db } = this;
        await db.createCollection("test.spiderman");
        await db.createCollection("test.mario");
        const spiderman = await db.collection("test.spiderman");
        await spiderman.insert({ foo: 5 });
        const mario = await db.collection("test.mario");
        await mario.insert({ bar: 0 });
        const collections = (await db.collections()).map((x) => x.collectionName);
        expect(collections).to.include("test.spiderman");
        expect(collections).to.include("test.mario");
        expect(collections).not.to.include("does_not_exist");
    });

    it("should correctly retrive listCollections", async () => {
        const { db } = this;
        await db.createCollection("test_collection_names");
        let documents = await db.listCollections().toArray();
        expect(documents.map((x) => x.name)).to.include("test_collection_names");

        const collection = db.collection("test_collection_names2");
        await collection.insert({ a: 1 });
        documents = await db.listCollections().toArray();
        expect(documents.map((x) => x.name)).to.include("test_collection_names").and.to.include("test_collection_names2");
    });

    it("should ensure strict access collection", async () => {
        const { db } = this;
        await assert.throws(async () => {
            await new Promise((resolve, reject) => {
                db.collection("does-not-exist", { strict: true }, (err) => {
                    err ? reject(err) : resolve();
                });
            });
        }, "Collection does-not-exist does not exist. Currently in strict mode.");
        await db.createCollection("test_strict_access_collection");
        const collection = await db.collection("test_strict_access_collection");
        expect(collection.collectionName).to.be.equal("test_strict_access_collection");
    });

    it("should perform strict create collection", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_strict_create_collection");
        expect(collection.collectionName).to.be.equal("test_strict_create_collection");
        await assert.throws(async () => {
            await db.createCollection("test_strict_create_collection", { strict: true });
        }, "Collection test_strict_create_collection already exists. Currently in strict mode.");

        // Switch out of strict mode and try to re-create collection
        await assert.doesNotThrow(async () => {
            await db.createCollection("test_strict_create_collection", { strict: false });
        });
    });

    it("should fail to insert due to illegal keys", async () => {
        const collection = await this.db.createCollection("test_invalid_key_names");
        // Legal inserts
        await collection.insert([{ hello: "world" }, { hello: { hello: "world" } }]);
        // Illegal insert for key
        await assert.throws(async () => {
            await collection.insert({ $hello: "world" });
        }, "key $hello must not start with '$'");
        await assert.throws(async () => {
            await collection.insert({ hello: { $hello: "world" } });
        }, "key $hello must not start with '$'");
        await assert.doesNotThrow(async () => {
            await collection.insert({ he$llo: "world" });
        });
        await assert.doesNotThrow(async () => {
            await collection.insert({ hello: { hell$o: "world" } });
        });
        await assert.throws(async () => {
            await collection.insert({ ".hello": "world" });
        }, "key .hello must not contain '.'");
        await assert.throws(async () => {
            await collection.insert({ hello: { ".hello": "world" } });
        }, "key .hello must not contain '.'");
        await assert.throws(async () => {
            await collection.insert({ "hello.": "world" });
        }, "key hello. must not contain '.'");
        await assert.throws(async () => {
            await collection.insert({ hello: { "hello.": "world" } });
        }, "key hello. must not contain '.'");
    });

    it("should fail due to illegal listCollections", async () => {
        const { db } = this;
        await assert.throws(async () => {
            await db.collection(5);
        }, "collection name must be a String");

        await assert.throws(async () => {
            await db.collection("");
        }, "collection names cannot be empty");

        await assert.throws(async () => {
            await db.collection("te$t");
        }, "collection names must not contain '$'");

        await assert.throws(async () => {
            await db.collection(".test");
        }, "collection names must not start or end with '.'");

        await assert.throws(async () => {
            await db.collection("test.");
        }, "collection names must not start or end with '.'");

        await assert.throws(async () => {
            await db.collection("test..t");
        }, "collection names cannot be empty");
    });

    it("should correctly count on non existing collection", async () => {
        const collection = await this.db.collection("test_multiple_insert_2");
        expect(await collection.count()).to.be.equal(0);
    });

    it("should correctly execute save", async () => {
        const collection = await this.db.createCollection("test_save");
        const doc = { hello: "world" };
        const r = await collection.save(doc);
        expect(r.ops[0]._id).to.be.ok;
        expect(await collection.count()).to.be.equal(1);
        await collection.save(r.ops[0]);
        expect(await collection.count()).to.be.equal(1);
        const doc3 = await collection.findOne();
        expect(doc3.hello).to.be.equal("world");
        doc3.hello = "mike";
        await collection.save(doc3);
        expect(await collection.count()).to.be.equal(1);
        const doc5 = await collection.findOne();
        expect(doc5.hello).to.be.equal("mike");
        await collection.save({ hello: "world" });
        expect(await collection.count()).to.be.equal(2);
    });

    it("should correctly save document with Long value", async () => {
        const collection = await this.db.createCollection("test_save_long");
        await collection.insert({ x: bson.Long.fromNumber(9223372036854775807) });
        const doc = await collection.findOne();
        expect(doc.x).to.be.deep.equal(bson.Long.fromNumber(9223372036854775807));
    });

    it("should save object that has id but does not exist in collection", async () => {
        const collection = await this.db.createCollection("test_save_with_object_that_has_id_but_does_not_actually_exist_in_collection");
        const a = { _id: "1", hello: "world" };
        await collection.save(a);
        expect(await collection.count()).to.be.equal(1);
        const doc = await collection.findOne();
        expect(doc.hello).to.be.equal("world");
        doc.hello = "mike";
        await collection.save(doc);
        const doc2 = await collection.findOne();
        expect(await collection.count()).to.be.equal(1);
        expect(doc2.hello).to.be.equal("mike");
    });

    it("should correctly update with no docs", async () => {
        const collection = await this.db.createCollection("test_should_correctly_do_update_with_no_docs");
        const id = new bson.ObjectId(null);
        const doc = { _id: id, a: 1 };

        const r = await collection.update({ _id: id }, doc);
        expect(r.result.n).to.be.equal(0);
    });

    it("should correctly execute insert/update/delete safe mode", async () => {
        const collection = await this.db.createCollection("test_should_execute_insert_update_delete_safe_mode");
        expect(collection.collectionName).to.be.equal("test_should_execute_insert_update_delete_safe_mode");
        let r = await collection.insert({ i: 1 });
        expect(r.ops).to.have.lengthOf(1);
        expect(r.ops[0]._id.toHexString()).to.have.lengthOf(24);

        r = await collection.update({ i: 1 }, { $set: { i: 2 } });
        expect(r.result.n).to.be.equal(1);

        await collection.remove({});
    });

    it("should perform multiple saves", async () => {
        // ?
        const collection = await this.db.createCollection("multiple_save_test");
        const doc = {
            name: "amit",
            text: "some text"
        };

        //insert new user
        await collection.save(doc);
        const users = await collection.find({}, { name: 1 }).limit(1).toArray();
        const user = users[0];

        user.pants = "worn";

        const r = await collection.save(user);
        expect(r.result.n).to.be.equal(1);
    });

    it("should correctly save document with nested array", async () => {
        const collection = await this.db.createCollection("save_error_on_save_test");
        await collection.createIndex([["username", 1]]);
        const doc = {
            email: "email@email.com",
            encryptedPassword: "password",
            friends: [
                "4db96b973d01205364000006",
                "4db94a1948a683a176000001",
                "4dc77b24c5ba38be14000002"
            ],
            location: [72.4930088, 23.0431957],
            name: "Amit Kumar",
            passwordSalt: "salty",
            profileFields: [],
            username: "amit"
        };
        await collection.save(doc);
        const users = await collection.find({}).limit(1).toArray();
        const user = users[0];
        user.friends.splice(1, 1);

        await collection.save(user);
        const result = await collection.update({
            _id: new bson.ObjectId(user._id.toString())
        }, {
            friends: user.friends
        }, {
            upsert: true,
            w: 1
        });
        expect(result.result.n).to.be.equal(1);
    });

    it("should perform collection remove with no callback", async () => {
        // ?
        const collection = await this.db.collection("remove_with_no_callback_bug_test");
        await collection.save({ a: 1 });
        await collection.save({ b: 1 });
        await collection.save({ c: 1 });
        await collection.remove({ a: 1 });
        expect(await collection.count()).to.be.equal(2);
    });

    it("should correctly create TTL collection with index using ensureIndex", async () => {
        const collection = await this.db.createCollection("shouldCorrectlyCreateTTLCollectionWithIndexUsingEnsureIndex");
        await collection.ensureIndex({ createdAt: 1 }, { expireAfterSeconds: 1, w: 1 });
        await collection.insert({ a: 1, createdAt: new Date() });
        const indexes = await collection.indexInformation({ full: true });
        let found = false;
        for (let i = 0; i < indexes.length; i++) {
            if (indexes[i].name === "createdAt_1") {
                expect(indexes[i].expireAfterSeconds).to.be.equal(1);
                found = true;
                break;
            }
        }
        expect(found).to.be.true;
    });

    it("should correctly create TTL collection with index using createIndex", async () => {
        const collection = await this.db.createCollection("shouldCorrectlyCreateTTLCollectionWithIndexCreateIndex", {});
        await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 1, w: 1 });
        await collection.insert({ a: 1, createdAt: new Date() });
        const indexes = await collection.indexInformation({ full: true });
        let found = false;
        for (let i = 0; i < indexes.length; i++) {
            if (indexes[i].name === "createdAt_1") {
                expect(indexes[i].expireAfterSeconds).to.be.equal(1);
                found = true;
                break;
            }
        }
        expect(found).to.be.true;
    });

    it("should correctly read back document with null", async () => {
        const collection = await this.db.createCollection("shouldCorrectlyReadBackDocumentWithNull", {});
        await collection.insert({ test: null });
        const item = await collection.findOne();
        expect(item.test).to.be.null;
    });

    it.skip("should throw error due to illegal update", async () => {
        const collection = await this.db.createCollection("shouldThrowErrorDueToIllegalUpdate", {});
        expect(() => {
            collection.update({}, null, () => { });
        }).to.throw("document must be a valid JavaScript object");
        expect(() => {
            collection.update(null, null, () => { });
        }).to.throw("selector must be a valid JavaScript object");
    });

    it("should correctly handle 0 as id for save", async () => {
        const { db } = this;
        await db.collection("shouldCorrectlyHandle0asIdForSave").save({ _id: 0 });
        expect(await db.collection("shouldCorrectlyHandle0asIdForSave").count()).to.be.equal(1);
    });

    it("should correctly execute update with . field in selector", async () => {
        const collection = this.db.collection("executeUpdateWithElemMatch");
        await collection.insert({ item: { i: 1 } });
        await collection.update({ "item.i": 1 }, { $set: { a: 1 } });
        expect(await collection.findOne()).to.include({ a: 1 });
    });

    it("should correctly execute update with elemMatch field in selector", async () => {
        await this.db.collection("executeUpdateWithElemMatch").update({ item: { $elemMatch: { name: "my_name" } } }, { $set: { a: 1 } });
    });

    it("should fail due to exiting collection", async () => {
        await this.db.createCollection("shouldFailDueToExistingCollection", { strict: true });

        await assert.throws(async () => {
            await this.db.createCollection("shouldFailDueToExistingCollection", { strict: true });
        });
    });

    it("should filter correctly during list", async () => {
        const testCollection = "integration_tests_collection_123";
        await this.db.createCollection(testCollection);
        const docs = await this.db.listCollections({ name: testCollection }).toArray();
        expect(docs).to.have.lengthOf(1);
        expect(docs[0].name).to.be.equal(testCollection);
    });


    it("should filter correctly with index during list", async () => {
        const testCollection = "collection_124";
        await this.db.createCollection(testCollection);
        const indexName = await this.db.createIndex(testCollection, "collection_124", { w: 1 });
        expect(indexName).to.be.equal("collection_124_1");
        const docs = await this.db.listCollections().toArray();
        expect(docs.length).to.be.at.least(1);
        expect(docs.map((x) => x.name)).to.include(testCollection);
    });

    it("should correctly list multipleCollections", async () => {
        const emptyDb = this.db.db("listCollectionsDb");
        await emptyDb.createCollection("test1");
        await emptyDb.createCollection("test2");
        await emptyDb.createCollection("test3");
        const collections = await emptyDb.listCollections().toArray();
        const names = collections.map((x) => x.name);
        expect(names).to.include("test1");
        expect(names).to.include("test2");
        expect(names).to.include("test3");
    });

    it("should correctly handle namespace when using collections method", async () => {
        const emptyDb = this.db.db("listCollectionsDb2");
        await emptyDb.createCollection("test1");
        await emptyDb.createCollection("test.test");
        await emptyDb.createCollection("test3");
        const collections = (await emptyDb.collections()).map((collection) => {
            return {
                collectionName: collection.collectionName,
                namespace: collection.namespace
            };
        });

        expect(collections).to.satisfy((collections) => {
            for (const x of collections) {
                if (x.namespace === "listCollectionsDb2.test.test" && x.collectionName === "test.test") {
                    return true;
                }
            }
            return false;
        });
    });
});
