describe("error", function () {
    it("should fail insert due to unique index", async () => {
        const collection = this.db.collection("test_failing_insert_due_to_unique_index");
        await collection.ensureIndex([["a", 1]], { unique: true, w: 1 });
        await collection.insert({ a: 2 }, { w: 1 });
        await assert.throws(async () => {
            await collection.insert({ a: 2 }, { w: 1 });
        }, "duplicate key");
    });

    it("should fail insert due to unique index strict", async () => {
        const { db } = this;
        await db.dropCollection("test_failing_insert_due_to_unique_index_strict").catch(() => { });
        await db.createCollection("test_failing_insert_due_to_unique_index_strict");
        const collection = db.collection("test_failing_insert_due_to_unique_index_strict");
        await collection.ensureIndex([["a", 1]], { unique: true, w: 1 });
        await collection.insert({ a: 2 }, { w: 1 });
        await assert.throws(async () => {
            await collection.insert({ a: 2 }, { w: 1 });
        });
    });

    it("mixing included and excluded fields should return an error object with message", async () => {
        const collection = this.db.collection("test_error_object_should_include_message");
        await collection.insert({ a: 2, b: 5 }, { w: 1 });
        await assert.throws(async () => {
            await collection.findOne({ a: 2 }, { fields: { a: 1, b: 0 } });
        });
    });
});
