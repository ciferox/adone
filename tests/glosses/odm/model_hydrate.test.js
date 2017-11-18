const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;
const DocumentObjectId = mongoose.Types.ObjectId;

describe("model", () => {
    let schemaB;
    let schemaC;

    before(() => {
        schemaB = new Schema({
            title: String,
            type: String
        }, { discriminatorKey: "type" });

        schemaC = new Schema({
            test: {
                type: String,
                default: "test"
            }
        }, { discriminatorKey: "type" });
    });

    describe("hydrate()", () => {
        let db;
        let B;
        let Breakfast;

        let breakfastSchema;

        before(() => {
            breakfastSchema = new Schema({
                food: { type: String, enum: ["bacon", "eggs"] }
            });

            db = start();
            B = db.model("model-create", schemaB, "gh-2637-1");
            B.discriminator("C", schemaC);
            Breakfast = db.model("gh-2637-2", breakfastSchema, "gh-2637-2");
        });

        after((done) => {
            db.close(done);
        });

        it("hydrates documents with no modified paths", (done) => {
            let hydrated = B.hydrate({ _id: "541085faedb2f28965d0e8e7", title: "chair" });

            assert.ok(hydrated.get("_id") instanceof DocumentObjectId);
            assert.equal(hydrated.title, "chair");

            assert.equal(hydrated.isNew, false);
            assert.equal(hydrated.isModified(), false);
            assert.equal(hydrated.isModified("title"), false);

            done();
        });

        it("runs validators", (done) => {
            let hydrated = Breakfast.hydrate({
                _id: "000000000000000000000001",
                food: "waffles"
            });

            hydrated.validate((err) => {
                assert.ok(err);
                assert.ok(err.errors.food);
                assert.deepEqual(['food'], Object.keys(err.errors));
                done();
            });
        });

        it("works correctly with model discriminators", (done) => {
            let hydrated = B.hydrate({ _id: "541085faedb2f28965d0e8e8", title: "chair", type: "C" });

            assert.equal(hydrated.test, "test");
            assert.deepEqual(hydrated.schema, schemaC);
            done();
        });
    });
});
