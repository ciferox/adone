describe("document validation", function () {
    it("should allow bypassing document validation in 3.2 or higher on inserts", async () => {
        const { db } = this;
        const collection = db.collection("createValidationCollection");
        await collection.drop().catch(() => { });
        await db.createCollection("createValidationCollection", { validator: { a: { $exists: true } } });
        await assert.throws(async () => {
            await collection.insert({ b: 1 });
        }, "Document failed validation");
        await collection.insert({ b: 1 }, { bypassDocumentValidation: true });
        await collection.insertOne({ b: 1 }, { bypassDocumentValidation: true });
        await collection.insertMany([{ b: 1 }], { bypassDocumentValidation: true });
    });

    it("should allow bypassing document validation in 3.2 or higher on updates", async () => {
        const collection = this.db.collection("createValidationCollection");
        await collection.drop().catch(() => { });
        await this.db.createCollection("createValidationCollection", { validator: { a: { $exists: true } } });
        await assert.throws(async () => {
            await collection.update({ b: 1 }, { $set: { b: 1 } }, { upsert: true });
        });
        await collection.update({ b: 1 }, { $set: { b: 1 } }, { upsert: true, bypassDocumentValidation: true });
        await collection.updateOne({ c: 1 }, { $set: { c: 1 } }, { upsert: true, bypassDocumentValidation: true });
        await collection.updateMany({ d: 1 }, { $set: { d: 1 } }, { upsert: true, bypassDocumentValidation: true });
        await collection.replaceOne({ e: 1 }, { $set: { e: 1 } }, { upsert: true, bypassDocumentValidation: true });
    });

    it("should allow bypassing document validation in 3.2 or higher on bulkWrite", async () => {
        const collection = this.db.collection("createValidationCollection");
        await collection.drop().catch(() => { });
        await this.db.createCollection("createValidationCollection", { validator: { a: { $exists: true } } });
        {
            const r = await collection.bulkWrite([
                { insertOne: { b: 1 } }
            ]);
            expect(r.hasWriteErrors()).to.be.true();
        }
        {
            const r = await collection.bulkWrite([
                { insertOne: { b: 1 } }
            ], { bypassDocumentValidation: true });
            expect(r.hasWriteErrors()).to.be.false();
        }
    });

    it("should allow bypassing document validation in 3.2 or higher on findAndModify", async () => {
        const collection = this.db.collection("createValidationCollection");
        await collection.drop().catch(() => { });
        await this.db.createCollection("createValidationCollection", { validator: { a: { $exists: true } } });
        await assert.throws(async () => {
            await collection.findOneAndUpdate({ b: 1 }, { $set: { b: 1 } }, { upsert: true });
        });
        await collection.findOneAndUpdate({ b: 1 }, { $set: { b: 1 } }, {
            upsert: true, bypassDocumentValidation: true
        });
        await collection.findOneAndReplace({ c: 1 }, { c: 1 }, { upsert: true, bypassDocumentValidation: true });
    });

    it("should correctly bypass validation for aggregation using out", async () => {
        const docs = [{
            title: "this is my title", author: "bob", posted: new Date(),
            pageViews: 5, tags: ["fun", "good", "fun"], other: { foo: 5 },
            comments: [
                { author: "joe", text: "this is cool" }, { author: "sam", text: "this is bad" }
            ]
        }];
        const collection = this.db.collection("createValidationCollectionOut");
        await collection.drop().catch(() => { });
        await this.db.createCollection("createValidationCollectionOut", { validator: { a: { $exists: true } } });
        await collection.insertMany(docs, { w: 1, bypassDocumentValidation: true });
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
            }, { $out: "createValidationCollectionOut" }
        ], { bypassDocumentValidation: true });
    });

    it("should correctly bypass validation for mapReduce using out", async () => {
        const collection = this.db.collection("createValidationCollectionOut");
        await collection.drop().catch(() => {});
        await this.db.createCollection("createValidationCollectionOut", { validator: { a: { $exists: true } } });
        await collection.insertMany([{ userId: 1 }, { userId: 2 }], { bypassDocumentValidation: true });
        const map = "function() { emit(this.userId, 1); }";
        const reduce = "function(k,vals) { return 1; }";
        await collection.mapReduce(map, reduce, { out: { replace: "createValidationCollectionOut" }, bypassDocumentValidation: true });
    });
});
