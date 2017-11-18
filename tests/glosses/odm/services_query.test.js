const { selectPopulatedFields, Query, Schema } = adone.odm;

describe("Query helpers", () => {
    describe("selectPopulatedFields", () => {
        it("handles nested populate if parent key is projected in (gh-5669)", (done) => {
            const schema = new Schema({
                nested: {
                    key1: String,
                    key2: String
                }
            });

            const q = new Query({});
            q.schema = schema;

            assert.strictEqual(q._fields, void 0);

            q.select("nested");
            q.populate("nested.key1");
            assert.deepEqual(q._fields, { nested: 1 });

            selectPopulatedFields(q);

            assert.deepEqual(q._fields, { nested: 1 });

            done();
        });

        it("handles nested populate if parent key is projected out (gh-5669)", (done) => {
            const schema = new Schema({
                nested: {
                    key1: String,
                    key2: String
                }
            });

            const q = new Query({});
            q.schema = schema;

            assert.strictEqual(q._fields, void 0);

            q.select("-nested");
            q.populate("nested.key1");
            assert.deepEqual(q._fields, { nested: 0 });

            selectPopulatedFields(q);

            assert.deepEqual(q._fields, { nested: 0 });

            done();
        });
    });
});
