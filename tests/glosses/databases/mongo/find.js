describe("find", function () {
    const { is, data: { bson }, util, promise, database: { mongo }, stream: { core } } = adone;
    const { range, enumerate } = util;

    it("should correctly perform simple find", async () => {
        const { db } = this;
        const collection = db.collection("test_find_simple");
        const r = await collection.insert([{ a: 2 }, { b: 3 }]);
        const [doc1] = r.ops;
        expect(await collection.find().toArray()).to.have.lengthOf(2);
        expect(await collection.count()).to.be.equal(2);
        {
            const docs = await collection.find({ a: doc1.a }).toArray();
            expect(docs).to.have.lengthOf(1);
            expect(docs[0].a).to.be.equal(doc1.a);
        }
    });

    it("should correctly perform simple chained find", async () => {
        const { db } = this;
        await db.createCollection("test_find_simple_chained");
        const collection = db.collection("test_find_simple_chained");
        const r = await collection.insert([{ a: 2 }, { b: 3 }]);
        const [doc1] = r.ops;
        expect(await collection.find().toArray()).to.have.lengthOf(2);
        expect(await collection.count()).to.be.equal(2);
        const docs = await collection.find({ a: doc1.a }).toArray();
        expect(docs).to.have.lengthOf(1);
        expect(docs[0].a).to.be.equal(doc1.a);
    });

    it("should correctly perform advanced finds", async () => {
        const { db } = this;
        const collection = db.collection("test_find_advanced");
        const r = await collection.insert([{ a: 1 }, { a: 2 }, { b: 3 }]);
        const [doc1, doc2] = r.ops;
        {
            const docs = (await collection.find({ a: { $lt: 10 } }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(2);
            expect(docs).to.include.members([1, 2]);
        }
        {
            const docs = (await collection.find({ a: { $gt: 1 } }).toArray()).map((x) => x.a);
            expect(docs).to.be.deep.equal([2]);
        }
        {
            const docs = (await collection.find({ a: { $lte: 1 } }).toArray()).map((x) => x.a);
            expect(docs).to.be.deep.equal([1]);
        }
        {
            const docs = (await collection.find({ a: { $gte: 1 } }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(2);
            expect(docs).to.include.members([1, 2]);
        }
        {
            const docs = (await collection.find({ a: { $gt: 1, $lt: 3 } }).toArray()).map((x) => x.a);
            expect(docs).to.deep.equal([2]);
        }
        {
            const docs = (await collection.find({ a: { $in: [1, 2] } }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(2);
            expect(docs).to.include.members([1, 2]);
        }
        {
            const docs = (await collection.find({ _id: { $in: [doc1._id, doc2._id] } }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(2);
            expect(docs).to.include.members([1, 2]);
        }
    });

    it("should correctly perform find with sort", async () => {
        const { db } = this;
        await db.createCollection("test_find_sorting");
        const collection = await db.collection("test_find_sorting");
        await collection.insert([{ a: 1, b: 2 },
            { a: 2, b: 1 },
            { a: 3, b: 2 },
            { a: 4, b: 1 }
        ]);
        {
            const docs = (await collection.find({ a: { $lt: 10 } }, { sort: [["a", 1]] }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(4);
            expect(docs).to.be.deep.equal([1, 2, 3, 4]);
        }
        {
            const docs = (await collection.find({ a: { $lt: 10 } }, { sort: [["a", -1]] }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(4);
            expect(docs).to.be.deep.equal([4, 3, 2, 1]);
        }
        {
            const docs = (await collection.find({ a: { $lt: 10 } }, { sort: { a: -1 } }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(4);
            expect(docs).to.be.deep.equal([4, 3, 2, 1]);
        }
        {
            const docs = (await collection.find({ a: { $lt: 10 } }, { sort: ["a"] }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(4);
            expect(docs).to.be.deep.equal([1, 2, 3, 4]);
        }
        {
            const docs = (await collection.find({ a: { $lt: 10 } }, { sort: "a" }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(4);
            expect(docs).to.be.deep.equal([1, 2, 3, 4]);
        }
        {
            const docs = (await collection.find({ a: { $lt: 10 } }, { sort: { a: 1 } }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(4);
            expect(docs).to.be.deep.equal([1, 2, 3, 4]);
        }
        {
            const docs = (await collection.find({ a: { $lt: 10 } }, { sort: ["b", "a"] }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(4);
            expect(docs).to.be.deep.equal([2, 4, 1, 3]);
        }
        {
            const docs = (await collection.find({ a: { $lt: 10 } }, { sort: [] }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(4);
        }
        {
            const docs = (await collection.find({ a: { $lt: 10 } }, { sort: { a: -1 } }).toArray()).map((x) => x.a);
            expect(docs).to.have.lengthOf(4);
        }
    });

    it("should correctly perform find with limit", async () => {
        const { db } = this;
        await db.createCollection("test_find_limits");
        const collection = db.collection("test_find_limits");
        await collection.insert([
            { a: 1 },
            { b: 2 },
            { c: 3 },
            { d: 4 }
        ]);

        expect(await collection.find({}, { limit: 1 }).toArray()).to.have.lengthOf(1);
        expect(await collection.find({}, { limit: 2 }).toArray()).to.have.lengthOf(2);
        expect(await collection.find({}, { limit: 3 }).toArray()).to.have.lengthOf(3);
        expect(await collection.find({}, { limit: 4 }).toArray()).to.have.lengthOf(4);
        expect(await collection.find({}, {}).toArray()).to.have.lengthOf(4);
        expect(await collection.find({}, { limit: 99 }).toArray()).to.have.lengthOf(4);
    });

    it("should correctly find with non quoted values", async () => {
        const { db } = this;
        await db.createCollection("test_find_non_quoted_values");
        const collection = db.collection("test_find_non_quoted_values");
        await collection.insert([
            { a: 19, b: "teststring", c: 59920303 },
            { a: "19", b: "teststring", c: 3984929 }
        ]);
        expect(await collection.find({ a: 19 }).toArray()).to.have.lengthOf(1);
    });

    it("should correctly find embedded document", async () => {
        const { db } = this;
        await db.createCollection("test_find_embedded_document");
        const collection = db.collection("test_find_embedded_document");
        await collection.insert([
            { a: { id: 10, value: "foo" }, b: "bar", c: { id: 20, value: "foobar" } },
            { a: { id: 11, value: "foo" }, b: "bar2", c: { id: 20, value: "foobar" } }
        ]);
        {
            const docs = await collection.find({ "a.id": 10 }).toArray();
            expect(docs).to.have.lengthOf(1);
            expect(docs[0]).to.have.property("b", "bar");
        }
        {
            const docs = await collection.find({ "a.value": "foo" }).toArray();
            expect(docs).to.have.lengthOf(2);
            expect(docs[0]).to.have.property("b", "bar");
            expect(docs[1]).to.have.property("b", "bar2");
        }
        {
            const docs = await collection.find({ "a.value": "foo" }).toArray();
            expect(docs).to.have.lengthOf(2);
            expect(docs[0]).to.have.property("b", "bar");
            expect(docs[1]).to.have.property("b", "bar2");
        }
    });

    it("should correctly find no records", async () => {
        const { db } = this;
        await db.createCollection("test_find_one_no_records");
        const collection = db.collection("test_find_one_no_records");
        expect(await collection.find({ a: 1 }, {}).toArray()).to.be.empty;
    });

    it("should correctly perform find by $where", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_where");
        await collection.insert([{ a: 1 }, { a: 2 }, { a: 3 }]);
        expect(await collection.count()).to.be.equal(3);
        expect(await collection.find({ $where: new bson.Code("this.a > 2") }).count()).to.be.equal(1);
        expect(await collection.find({ $where: new bson.Code("this.a > i", { i: 1 }) }).count()).to.be.equal(2);
    });

    it("should correctly perform finds with hint turned on", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_hint");
        await collection.insert({ a: 1 });
        await db.createIndex(collection.collectionName, "a");
        await assert.throws(async () => {
            await collection.find({ a: 1 }, { hint: "a" }).toArray();
        });
        {
            const items = await collection.find({ a: 1 }, { hint: ["a"] }).toArray();
            expect(items).to.have.lengthOf(1);
        }
        {
            const items = await collection.find({ a: 1 }, { hint: { a: 1 } }).toArray();
            expect(items).to.have.lengthOf(1);
        }
        // Modify hints
        collection.hint = "a_1";
        expect(collection.hint).to.be.equal("a_1");
        {
            const items = await collection.find({ a: 1 }).toArray();
            expect(items).to.have.lengthOf(1);
        }
        collection.hint = ["a"];
        expect(collection.hint).to.have.property("a", 1);
        {
            const items = await collection.find({ a: 1 }).toArray();
            expect(items).to.have.lengthOf(1);
        }
        collection.hint = { a: 1 };
        expect(collection.hint).to.have.property("a", 1);
        {
            const items = await collection.find({ a: 1 }).toArray();
            expect(items).to.have.lengthOf(1);
        }
        collection.hint = null;
        expect(collection.hint).to.be.null;
        {
            const items = await collection.find({ a: 1 }).toArray();
            expect(items).to.have.lengthOf(1);
        }
    });

    it("should correctly perform find by ObjectId", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_find_by_oid");
        const { ops: [doc] } = await collection.save({ hello: "mike" });
        expect(doc._id).to.be.instanceOf(bson.ObjectId);
        const doc1 = await collection.findOne({ _id: doc._id });
        expect(doc1).to.have.property("hello", "mike");
        const id = doc._id.toString();
        const doc2 = await collection.findOne({ _id: new bson.ObjectId(id) });
        expect(doc2).to.have.property("hello", "mike");
    });

    it("should correctly return document with original structure", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_find_by_oid_with_subdocs");
        const c1 = { _id: new bson.ObjectId(), comments: [], title: "number 1" };
        const c2 = { _id: new bson.ObjectId(), comments: [], title: "number 2" };
        const doc = {
            numbers: [],
            owners: [],
            comments: [c1, c2],
            _id: new bson.ObjectId()
        };

        await collection.insert(doc);
        const doc1 = await collection.findOne({ _id: doc._id }, { w: 1, fields: undefined });
        expect(doc1.comments).to.have.lengthOf(2);
        expect(doc1.comments[0]).to.have.property("title", "number 1");
        expect(doc1.comments[1]).to.have.property("title", "number 2");
    });

    it("should correctly retrieve single record", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_should_correctly_retrieve_one_record");
        await collection.insert({ a: 0 });
        expect(await collection.findOne({ a: 0 })).to.have.property("a", 0);
    });

    it("should correctly handle error", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_find_one_error_handling");
        // Try to fetch an object using a totally invalid and wrong hex string... what we're interested in here
        // is the error handling of the findOne Method
        expect(() => {
            collection.findOne({ _id: bson.ObjectId.createFromHexString("5e9bd59248305adf18ebc15703a1") });
        }).to.throw("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
    });

    it("should correctly perform find with options", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_field_select_with_options");
        await collection.insert(range(25).map((x) => ({ a: 24 - x, b: 24 - x })));
        {
            const docs = await collection.find({}, { a: 1 }, { limit: 3, sort: [["a", -1]] }).toArray();
            expect(docs).to.have.lengthOf(3);
            for (const [idx, doc] of enumerate(docs)) {
                expect(doc).not.to.have.property("b");
                expect(doc).to.have.property("a", 24 - idx);
            }
        }
        // {
        //     const docs = await collection.find({}, {}, 10, 3).toArray();
        //     expect(docs).to.have.lengthOf(3);
        //     for (const [idx, doc] of enumerate(docs)) {
        //         expect(doc.a).to.be.equal(doc.b);
        //         expect(doc).to.have.property("a", 14 - idx);
        //     }
        // }
    });

    it("should correctly find and modify document", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_find_and_modify_a_document_1");
        await collection.insert({ a: 1, b: 2 });
        {
            const updatedDoc = await collection.findAndModify({ a: 1 }, [["a", 1]], { $set: { b: 3 } }, { new: true });
            expect(updatedDoc.value).to.include({ a: 1, b: 3 });
        }
        await collection.insert({ a: 2, b: 2 });
        {
            const updatedDoc = await collection.findAndModify({ a: 2 }, [["a", 1]], { $set: { b: 3 } });
            expect(updatedDoc.value).to.include({ a: 2, b: 2 });
        }
        await collection.insert({ a: 3, b: 2 });
        {
            const updatedDoc = await collection.findAndModify({ a: 3 }, [], { $set: { b: 3 } }, { remove: true });
            expect(updatedDoc.value).to.include({ a: 3, b: 2 });
        }
        {
            const updatedDoc = await collection.findAndModify({ a: 4 }, [], { $set: { b: 3 } }, {
                new: true, upsert: true
            });
            expect(updatedDoc.value).to.include({ a: 4, b: 3 });
        }
        const r = await collection.insert({ a: 100, b: 101 });
        {
            const updatedDoc = await collection.findAndModify({ a: 100 }, [], { $set: { b: 5 } }, {
                new: true, fields: { b: 1 }
            });
            expect(updatedDoc.value).to.have.keys("b", "_id");
            expect(updatedDoc.value.b).to.be.equal(5);
            expect(r.ops[0]._id.toHexString()).to.be.equal(updatedDoc.value._id.toHexString());
        }
    });

    it("should correctly find and modify document and return selected fields only", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_find_and_modify_a_document_2");
        await collection.insert({ a: 1, b: 2 });
        const updatedDoc = await collection.findAndModify({ a: 1 }, [["a", 1]], { $set: { b: 3 } }, { new: true, fields: { a: 1 } });
        expect(updatedDoc.value).to.have.keys("a", "_id");
        expect(updatedDoc.value.a).to.be.equal(1);
    });

    it("should correctly locate post and inc values", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlyExecuteFindOneWithAnInSearchTag");
        const { ops: [{ _id: id }] } = await collection.insert({
            title: "Tobi",
            author: "Brian",
            newTitle: "Woot", meta: { visitors: 0 }
        });
        const r = await collection.update({ _id: id }, { $inc: { "meta.visitors": 1 } });
        expect(r.result.n).to.be.equal(1);
        const item = await collection.findOne({ _id: id });
        expect(item.meta.visitors).to.be.equal(1);
    });

    it("should correctly handle findAndModify duplicate key error", async () => {
        const { db } = this;
        const collection = await db.createCollection("FindAndModifyDuplicateKeyError");
        await collection.ensureIndex(["name", 1], { unique: true, w: 1 });
        await collection.insert([{ name: "test1" }, { name: "test2" }]);
        await assert.throws(async () => {
            await collection.findAndModify({ name: "test1" }, [], { $set: { name: "test2" } }, {});
        }, "duplicate key");
    });

    it("should correctly return null when attempting to modify a non-existing document", async () => {
        const { db } = this;
        const collection = await db.createCollection("AttemptToFindAndModifyNonExistingDocument");
        const updatedDoc = await collection.findAndModify({ name: "test1" }, [], { $set: { name: "test2" } }, {});
        expect(updatedDoc.value).to.be.null;
    });

    it("should correctly handle chained skip and limit on find with toArray", async () => {
        const { db } = this;
        const collection = await db.createCollection("skipAndLimitOnFindWithToArray");
        await collection.insert([{ a: 1 }, { b: 2 }, { c: 3 }]);
        const items = await collection.find().skip(1).limit(-1).toArray();
        expect(items).to.have.lengthOf(1);
        expect(items[0]).to.have.property("b", 2);
    });

    it("should correctly handle chained skip and negative limit on find with toArray", async () => {
        const { db } = this;
        const collection = await db.createCollection("skipAndNegativeLimitOnFindWithToArray");
        await collection.insert([{ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }, { e: 5 }]);
        const items = await collection.find().skip(1).limit(-3).toArray();
        expect(items).to.have.lengthOf(3);
        expect(items[0]).to.have.property("b", 2);
        expect(items[1]).to.have.property("c", 3);
        expect(items[2]).to.have.property("d", 4);
    });

    it("should correctly pass timeout options to cursor", async () => {
        const { db } = this;
        const collection = await db.createCollection("timeoutFalse");
        {
            const cursor = collection.find({}, { timeout: false });
            expect(cursor.s.cmd.noCursorTimeout).to.be.false;
        }
        {
            const cursor = collection.find({}, { timeout: true });
            expect(cursor.s.cmd.noCursorTimeout).to.be.true;
        }
        {
            const cursor = collection.find({});
            expect(cursor.s.cmd).not.to.have.property("noCursorTimeout");
        }
    });

    it("should correctly findAndModify document with db strict", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlyFindAndModifyDocumentWithDBStrict");
        await collection.insert({ a: 2, b: 2 });
        const result = await collection.findAndModify({ a: 2 }, [["a", 1]], { $set: { b: 3 } }, { new: true });
        expect(result.value).to.include({ a: 2, b: 3 });
    });

    it("should correctly findAndModify document that fails in first step", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlyFindAndModifyDocumentThatFailsInFirstStep");
        await collection.ensureIndex([["failIndex", 1]], { unique: true, w: 1 });
        await collection.insert({ a: 2, b: 2, failIndex: 2 });
        await assert.throws(async () => {
            await collection.findAndModify({ c: 2 }, [["a", 1]], { a: 10, b: 10, failIndex: 2 }, { w: 1, upsert: true });
        }, "duplicate key");
    });

    it("should correctly return new modified document", async () => {
        const { db } = this;
        const collection = await db.createCollection("Should_correctly_return_new_modified_document");
        const id = new bson.ObjectId();
        const doc = { _id: id, a: 1, b: 1, c: { a: 1, b: 1 } };

        await collection.insert(doc);
        const item = await collection.findAndModify({ _id: id }, [], { $set: { "c.c": 100 } }, { new: true });
        expect(doc._id.toString()).to.be.equal(item.value._id.toString());
        expect(item.value.a).to.be.equal(doc.a);
        expect(item.value.b).to.be.equal(doc.b);
        expect(item.value.c.a).to.be.equal(doc.c.a);
        expect(item.value.c.b).to.be.equal(doc.c.b);
        expect(item.value.c.c).to.be.equal(100);
    });

    it("should correctly execute findAndModify", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlyExecuteFindAndModify");
        const self = { _id: new bson.ObjectId() };
        const _uuid = "sddffdss";

        await collection.findAndModify(
            { _id: self._id, "plays.uuid": _uuid },
            [],
            { $set: { "plays.$.active": true } },
            { new: true, fields: { plays: 0, results: 0 }, safe: true }
        );
    });

    it("should correctly return record with 64-bit id", async () => {
        const { db } = this;
        const collection = await db.createCollection("should_correctly_return_record_with_64bit_id");
        const _lowerId = new bson.ObjectId();
        const _higherId = new bson.ObjectId();
        const lowerId = bson.Long.fromString("133118461172916224", 10);
        const higherId = bson.Long.fromString("133118461172916225", 10);

        const lowerDoc = { _id: _lowerId, id: lowerId };
        const higherDoc = { _id: _higherId, id: higherId };

        await collection.insert([lowerDoc, higherDoc]);
        const docs = await collection.find({ id: { $gt: lowerId } }, {}).toArray();
        expect(docs).to.have.lengthOf(1);
        expect(docs[0].id.toString()).to.equal("133118461172916225");
    });

    it("should correctly find a Document using findOne excluding _id field", async () => {
        const { db } = this;
        const collection = await db.createCollection("Should_Correctly_find_a_Document_using_findOne_excluding__id_field");
        const doc = { _id: new bson.ObjectId(), a: 1, c: 2 };
        await collection.insert(doc);
        const item = await collection.findOne({ a: 1 }, { fields: { _id: 0 } });
        expect(item).not.to.have.property("_id");
        expect(item).to.have.property("a", 1);
        expect(item).to.have.property("c", 2);
        const items = await collection.find({ a: 1 }, { fields: { _id: 0 } }).toArray();
        expect(items).to.have.lengthOf(1);
        expect(items[0]).not.to.have.property("_id");
        expect(items[0]).to.have.property("a", 1);
        expect(items[0]).to.have.property("c", 2);
    });

    it("should correctly execute find and findOne queries in the same way", async () => {
        const { db } = this;
        const collection = await db.createCollection("Should_correctly_execute_find_and_findOne_queries_in_the_same_way");
        const doc = { _id: new bson.ObjectId(), a: 1, c: 2, comments: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
        await collection.insert(doc);
        const docs = await collection.find({ _id: doc._id }, { comments: { $slice: -5 } }).toArray();
        expect(docs).to.have.lengthOf(1);
        expect(docs[0].comments).to.be.deep.equal([5, 6, 7, 8, 9]);
        const item = await collection.findOne({ _id: doc._id }, { comments: { $slice: -5 } });
        expect(item.comments).to.be.deep.equal([5, 6, 7, 8, 9]);
    });

    it("Should correctly execute find and findOne queries with selector set to null", async () => {
        const { db } = this;
        const collection = await db.createCollection("Should_correctly_execute_find_and_findOne_queries_in_the_same_way");
        const doc = { _id: new bson.ObjectId(), a: 1, c: 2, comments: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
        await collection.insert(doc);
        const docs = await collection.find(null, { comments: { $slice: -5 } }).toArray();
        expect(docs[0].comments).to.be.deep.equal([5, 6, 7, 8, 9]);
        const item = await collection.findOne(null, { comments: { $slice: -5 } });
        expect(item.comments).to.be.deep.equal([5, 6, 7, 8, 9]);
    });

    it("should correctly handler error for findAndModify when no record exists", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlyHandlerErrorForFindAndModifyWhenNoRecordExists");
        const updatedDoc = await collection.findAndModify({ a: 1 }, [], { $set: { b: 3 } }, { new: true });
        expect(updatedDoc.value).to.be.null;
    });

    it("should correctly execute findAndModify should generate correct BSON", async () => {
        const { db } = this;
        const transaction = {};
        transaction.document = {};
        transaction.document.type = "documentType";
        transaction.document.id = new bson.ObjectId();
        transaction.transactionId = new bson.ObjectId();
        transaction.amount = 12.3333;
        const transactions = [];
        transactions.push(transaction);
        const wrapingObject = {
            funds: {
                remaining: 100.5
            },
            transactions
        };
        const collection = await db.createCollection("shouldCorrectlyExecuteFindAndModify");
        const r = await collection.insert(wrapingObject);
        expect(await collection.findOne({
            _id: r.ops[0]._id,
            "funds.remaining": { $gte: 3.0 },
            "transactions.id": { $ne: transaction.transactionId }
        })).to.be.ok;
        await collection.findAndModify({
            _id: r.ops[0]._id,
            "funds.remaining": { $gte: 3.0 },
            "transactions.id": { $ne: transaction.transactionId }
        }, [], {
            $push: { transactions: transaction }
        }, { new: true, safe: true });
    });

    it("should correctly execute multiple finds in parallel", async () => {
        const { db } = this;
        const collection = await db.createCollection("tasks");
        await collection.insert({ a: 2, b: 2 });
        await Promise.all([
            collection.find({
                userId: "4e9fc8d55883d90100000003",
                lcStatus: { $ne: "deleted" },
                ownerRating: { $exists: false }
            }, {
                skip: 0,
                limit: 10,
                sort: { updated: -1 }
            }).count(),
            collection.find({
                userId: "4e9fc8d55883d90100000003",
                lcStatus: { $ne: "deleted" },
                ownerRating: { $exists: false }
            }, {
                skip: 0,
                limit: 10,
                sort: { updated: -1 }
            }).count()
        ]);
    });

    it("should correctly return error from mongodb on findAndModify forced error", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlyReturnErrorFromMongodbOnFindAndModifyForcedError");
        const q = { x: 1 };
        const set = { y: 2, _id: new bson.ObjectId() };
        const opts = { new: true, upsert: true };
        const doc = { _id: new bson.ObjectId(), x: 1 };

        await collection.insert(doc);
        await assert.throws(async () => {
            await collection.findAndModify(q, [], set, opts);
        });
    });

    it("should correctly execute findAndModify under concurrent load", async () => {
        const { db } = this;
        const collection = await db.collection("collection1");

        let running = true;
        let cnt = 0;
        (async () => {
            while (running) {
                ++cnt;
                await collection.findAndModify({ a: cnt }, [], { $set: { b: 3 } }, { upsert: true });
            }
        })();

        await promise.delay(500);

        const id = new bson.ObjectId();
        await collection.insert({ _id: id, a: 1 });
        await assert.throws(async () => {
            await collection.insert({ _id: id, a: 1 });
        });
        running = false;
        expect(await collection.find().count()).to.be.equal(cnt + 1);
    });

    it("should correctly iterate over collection", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyIterateOverCollection");
        await Promise.all(range(1000).map((i) => collection.insert({
            a: i,
            b: 2,
            c: {
                d: 3,
                f: "sfdsffffffffffffffffffffffffffffff"
            }
        })));
        const cursor = collection.find({}, {});
        expect(await cursor.count()).to.be.equal(1000);
        let cnt = 0;
        await new Promise((resolve, reject) => {
            cursor.each((err, obj) => {
                if (err) {
                    return reject(err);
                }
                if (is.null(obj)) {
                    resolve();
                } else {
                    ++cnt;
                }
            });
        });
        expect(cnt).to.be.equal(1000);
    });

    it("should correctly error out findAndModify on duplicate record", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlyErrorOutFindAndModifyOnDuplicateRecord");
        const { ops: [, { _id: id }] } = await collection.insert([{ login: "user1" }, { login: "user2" }]);
        await collection.ensureIndex("login", { unique: true, w: 1 });
        await assert.throws(async () => {
            await collection.findAndModify({ _id: id }, [], { $set: { login: "user1" } }, {});
        });
    });

    it("should perform simple find in array", async () => {
        const { db } = this;
        const collection = await db.createCollection("simple_find_in_array");
        await collection.insert(range(100).map((i) => ({ a: i })));
        const items = await collection.find({ a: { $in: range(100) } }).toArray();
        expect(items).to.have.lengthOf(100);
    });

    it("should return instanceOf error with bad field selection", async () => {
        const { db } = this;
        const collection = db.collection("bad_field_selection");
        await collection.insert([{ a: 1, b: 1 }, { a: 2, b: 2 }, { a: 3, b: 3 }]);
        await assert.throws(async () => {
            await collection.find({}, { skip: 1, limit: 1, fields: { _id: 1, b: 0 } }).toArray();
        }, Error);
    });

    it("should perform a simple limit skip find with fields", async () => {
        const { db } = this;
        const collection = await db.createCollection("simple_find_with_fields");
        await collection.insert([{ a: 1, b: 1 }, { a: 2, b: 2 }, { a: 3, b: 3 }]);
        {
            const docs = await collection.find({ a: 2 }, ["b"]).toArray();
            expect(docs).to.have.lengthOf(1);
            expect(docs[0]).to.have.keys("_id", "b");
            expect(docs[0].b).to.be.equal(2);
        }
        {
            const docs = await collection.find({ a: 2 }, { b: 1 }).toArray();
            expect(docs).to.have.lengthOf(1);
            expect(docs[0]).to.have.keys("_id", "b");
            expect(docs[0].b).to.be.equal(2);
        }
        {
            const docs = await collection.find({ a: 2 }, { fields: ["b"] }).toArray();
            expect(docs).to.have.lengthOf(1);
            expect(docs[0]).to.have.keys("_id", "b");
            expect(docs[0].b).to.be.equal(2);
        }
    });

    it("should perform query with batchSize different to standard", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldPerformQueryWithBatchSizeDifferentToStandard");
        await collection.insert(range(1000).map((i) => ({ a: i })));
        const docs = await collection.find({}, { batchSize: 1000 }).toArray();
        expect(docs).to.have.lengthOf(1000);
    });

    it("should correctly perform negative limit", async () => {
        const { db } = this;
        const collection = await db.collection("shouldCorrectlyPerformNegativeLimit");
        await collection.insert(range(1000).map((i) => ({ a: i, b: "helloworld".repeat(25) })));
        const docs = await collection.find({}).limit(-10).toArray();
        expect(docs).to.have.lengthOf(10);
    });

    it("should correctly execute exhaust query", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyExecuteExhaustQuery");
        await collection.insert(range(1000).map((i) => ({
            a: i,
            b: "helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld",
            c: new bson.Binary(Buffer.alloc(1024))
        })));
        await collection.insert(range(1000).map((i) => ({
            a: i,
            b: "helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld",
            c: new bson.Binary(Buffer.alloc(1024))
        })));
        const docs = await collection.find({}, { exhaust: true }).toArray();
        expect(docs).to.have.lengthOf(2000);
    });

    it("readpreferences should work fine when using a single server instance", async () => {
        // ?
        const db = await mongo.connect(this.url(), { readPreference: mongo.ReadPreference.PRIMARY_PREFERRED });
        const collection = db.collection("Readpreferencesshouldworkfine");
        await collection.insert(range(1000).map((i) => ({
            a: i,
            b: "helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld",
            c: new bson.Binary(Buffer.alloc(1024))
        })));
        await collection.insert(range(1000).map((i) => ({
            a: i,
            b: "helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld helloworld",
            c: new bson.Binary(Buffer.alloc(1024))
        })));
        const docs = await collection.find({}, { exhaust: true }).toArray();
        expect(docs).to.have.lengthOf(2000);
    });

    it("each should not hang on iterating over no results", async () => {
        const { db } = this;
        const collection = db.collection("noresultAvailableForEachToIterate");
        await new Promise((resolve, reject) => {
            collection.find().each((err, item) => {
                if (err) {
                    return reject(err);
                }
                if (is.null(item)) {
                    resolve();
                }
            });
        });
    });

    it("should correctly find documents by RegExp", async () => {
        // Serialized regexes contain extra trailing chars. Sometimes these trailing chars contain / which makes
        // the original regex invalid, and leads to segmentation fault.
        const { db } = this;
        const collection = await db.createCollection("test_regex_serialization");
        await collection.insert({ keywords: ["test", "segmentation", "fault", "regex", "serialization", "native"] });
        await Promise.all(range(20).map(async () => {
            const item = await collection.findOne({ keywords: { $all: [/ser/, /test/, /seg/, /fault/, /nat/] } });
            expect(item.keywords).to.have.lengthOf(6);
        }));
    });

    it("should correctly do find min/max", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldCorrectlyDoFindMinMax");
        await collection.insert({ _id: 123, name: "some name", min: 1, max: 10 });
        {
            const docs = await collection.find({ _id: { $in: ["some", "value", 123] } }, { _id: 1, max: 1 }, {}).toArray();
            expect(docs[0].max).to.be.equal(10);
        }
        {
            const docs = await collection.find({ _id: { $in: ["some", "value", 123] } }, { fields: { _id: 1, max: 1 } }).toArray();
            expect(docs[0].max).to.be.equal(10);
        }
    });

    if (this.topology !== "sharded") {
        // https://docs.mongodb.com/manual/reference/command/parallelCollectionScan/#dbcmd.parallelCollectionScan
        // "parallelCollectionScan is only available for mongod, and it cannot operate on a sharded cluster."
        it("should correctly execute parallelCollectionScan with multiple cursors using each", async () => {
            const { db } = this;
            const collection = db.collection("parallelCollectionScan_2");
            await collection.insert(range(2000).map((i) => ({ a: i })));
            const cursors = await collection.parallelCollectionScan({ numCursors: 3 });
            expect(cursors).to.have.length.at.least(1).and.at.most(3);
            const results = [];
            await Promise.all(cursors.map((cursor) => new Promise((resolve, reject) => {
                cursor.each((err, item) => {
                    if (err) {
                        return reject(err);
                    }
                    if (is.null(item)) {
                        return resolve();
                    }
                    results.push(item);
                });
            })));
            expect(results.length).to.be.equal(2000);
            for (const cursor of cursors) {
                expect(cursor.isClosed()).to.be.true;
            }
        });

        it("should correctly execute parallelCollectionScan with multiple cursors using next", async () => {
            const { db } = this;
            const collection = db.collection("parallelCollectionScan_3");
            await collection.insert(range(2000).map((i) => ({ a: i })));
            const cursors = await collection.parallelCollectionScan({ numCursors: 3 });
            expect(cursors).to.have.length.at.least(1).and.at.most(3);
            const results = [];
            await Promise.all(cursors.map(async (cursor) => {
                while (!cursor.isClosed()) {
                    const item = await cursor.next();
                    if (!is.null(item)) {
                        results.push(item);
                    }
                }
            }));
            expect(results.length).to.be.equal(2000);
            for (const cursor of cursors) {
                expect(cursor.isClosed()).to.be.true;
            }
        });

        it.skip("should correctly execute parallelCollectionScan with single cursor and close", async () => {
            const { db } = this;
            const collection = db.collection("parallelCollectionScan_4");
            await collection.insert(range(2000).map((i) => ({ a: i })));
            const cursors = await collection.parallelCollectionScan({ numCursors: 1 });
            expect(cursors).to.have.lengthOf(1);
            await cursors[0].close();
            expect(cursors[0].isClosed()).to.be.true;
        });

        it("should correctly execute parallelCollectionScan with single cursor streaming", async () => {
            const { db } = this;
            const collection = db.collection("parallelCollectionScan_5");
            await collection.insert(range(2000).map((i) => ({ a: i })));
            const cursors = await collection.parallelCollectionScan({ numCursors: 3 });
            expect(cursors).to.have.length.at.least(1).and.at.most(3);
            const results = await core.merge(cursors.map((x) => x.stream()));
            expect(results.length).to.be.equal(2000);
            for (const cursor of cursors) {
                expect(cursor.isClosed()).to.be.true;
            }
        });

        it("should correctly execute parallelCollectionScan with single cursor emitting raw buffers and close", async () => {
            const { db } = this;
            const collection = db.collection("parallelCollectionScan_6");
            await collection.insert(range(2000).map((i) => ({ a: i })));
            const cursors = await collection.parallelCollectionScan({ numCursors: 3, raw: true });
            expect(cursors).to.have.length.at.least(1).and.at.most(3);
            const results = [];
            await Promise.all(cursors.map(async (cursor) => {
                while (!cursor.isClosed()) {
                    const item = await cursor.next();
                    if (!is.null(item)) {
                        results.push(item);
                    }
                }
            }));
            expect(results.length).to.be.equal(2000);
            for (const cursor of cursors) {
                expect(cursor.isClosed()).to.be.true;
            }
        });
    }

    it("should correctly sort using text search on 2.6 or higher in find", async () => {
        const { db } = this;
        const collection = db.collection("textSearchWithSort");
        await collection.ensureIndex({ s: "text" });
        await collection.insert([
            { s: "spam" },
            { s: "spam eggs and spam" },
            { s: "sausage and eggs" }
        ]);
        const items = await collection.find({ $text: { $search: "spam" } }, { fields: { _id: false, s: true, score: { $meta: "textScore" } } }).sort({ score: { $meta: "textScore" } }).toArray();
        expect(items[0].s).to.be.equal("spam eggs and spam");
    });

    it("should not mutate user options", async () => {
        const { db } = this;
        const collection = db.collection("shouldNotMutateUserOptions");
        const options = { raw: "TEST" };
        await collection.find({}, {});
        expect(options).to.have.keys("raw");
    });

    it("should simulate closed cursor", async () => {
        const { db } = this;
        const collection = db.collection("simulateClosedCursor");
        await collection.insert(range(1000).map((i) => ({ a: i })));
        const cursor = collection.find({}).batchSize(2);
        await cursor.next();
        cursor.s.state = 2;
        await assert.throws(async () => {
            await cursor.next();
        });
    });

    it("should correctly execute a findAndModify with a write concern", async () => {
        // ?
        const { db } = this;
        const collection = await db.createCollection("test_find_and_modify_a_document_3");
        await collection.insert({ a: 1, b: 2 });
        const updatedDoc = await collection.findAndModify({ a: 1 }, [["a", 1]], { $set: { b: 3 } }, { new: true });
        expect(updatedDoc.value).to.include({ a: 1, b: 3 });
    });

    it("should execute query using batchSize of 0", async () => {
        const { db } = this;
        const collection = db.collection("test_find_simple_batchsize_0");
        await collection.insert([{ a: 2 }, { b: 3 }, { b: 4 }]);
        const docs = await collection.find({}).batchSize(-5).toArray();
        expect(docs).to.have.lengthOf(3);
    });

    it("should execute query using limit of 0", async () => {
        const { db } = this;
        const collection = db.collection("test_find_simple_limit_0");
        await collection.insert([{ a: 2 }, { b: 3 }, { b: 4 }]);
        const docs = await collection.find().limit(-5).toArray();
        expect(docs).to.have.lengthOf(3);
    });

    it("should execute query using $elemMatch", async () => {
        const { db } = this;
        const collection = db.collection("elem_match_test");
        await collection.insert([{ _id: 1, results: [82, 85, 88] }, { _id: 2, results: [75, 88, 89] }]);
        const docs = await collection.find({ results: { $elemMatch: { $gte: 80, $lt: 85 } } }).toArray();
        expect(docs).to.be.deep.equal([{ _id: 1, results: [82, 85, 88] }]);
    });

    it("should execute query using limit of 200", async () => {
        const { db } = this;
        const collection = db.collection("test_find_simple_limit_101");
        await collection.insertMany(range(1000).map((i) => ({
            linkid: "12633170",
            advertisercid: "4612127",
            websitename: "Car Rental 8",
            destinationurl: "https://www.carrental8.com/en/",
            who: "8027061-12633170-1467924618000",
            href: "http://www.tkqlhce.com",
            src: "http://www.awltovhc.com",
            r1: 3,
            r2: 44,
            r3: 24,
            r4: 58,
            a: i
        })));
        const docs = await collection.find().limit(200).toArray();
        expect(docs).to.have.lengthOf(200);
    });

    it("should correctly apply db level options to find cursor", async () => {
        const db = await mongo.connect(this.url(), { ignoreUndefined: true });
        const collection = db.collection("test_find_simple_cursor_inheritance");
        await collection.insert([{ a: 2 }, { b: 3, c: undefined }]);
        const cursor = collection.find({ c: undefined });
        expect(cursor.s.options.ignoreUndefined).to.be.true;
        const docs = await cursor.toArray();
        expect(docs).to.have.lengthOf(2);
    });
});
