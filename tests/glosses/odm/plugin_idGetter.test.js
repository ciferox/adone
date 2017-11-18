const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;

describe("id virtual getter", () => {
    it("should work as expected with an ObjectId", (done) => {
        const db = start();

        const schema = new Schema({});

        const S = db.model("Basic", schema);
        S.create({}, (err, s) => {
            assert.ifError(err);

            // Comparing with virtual getter
            assert.equal(s._id.toString(), s.id);
            done();
        });
    });

    it("should be turned off when `id` option is set to false", (done) => {
        const db = start();

        const schema = new Schema({}, { id: false });

        const S = db.model("NoIdGetter", schema);
        S.create({}, (err, s) => {
            assert.ifError(err);

            // Comparing with virtual getter
            assert.equal(s.id, undefined);
            done();
        });
    });


    it("should be turned off when the schema has a set `id` path", (done) => {
        const db = start();

        const schema = new Schema({
            id: String
        });

        const S = db.model("NoIdGetter", schema);
        S.create({ id: "test" }, (err, s) => {
            assert.ifError(err);

            // Comparing with expected value
            assert.equal(s.id, "test");
            done();
        });
    });
});
