const Schema = adone.odm.Schema;
const cast = adone.odm.cast;
const ObjectId = require("bson").ObjectId;

describe("cast: ", () => {
    describe("when casting an array", () => {
        it("casts array with ObjectIds to $in query", (done) => {
            const schema = new Schema({ x: Schema.Types.ObjectId });
            const ids = [new ObjectId(), new ObjectId()];
            assert.deepEqual(cast(schema, { x: ids }), { x: { $in: ids } });
            done();
        });

        it("casts array with ObjectIds to $in query when values are strings", (done) => {
            const schema = new Schema({ x: Schema.Types.ObjectId });
            const ids = [new ObjectId(), new ObjectId()];
            assert.deepEqual(cast(schema, { x: ids.map(String) }), { x: { $in: ids } });
            done();
        });

        it("throws when ObjectIds not valid", (done) => {
            const schema = new Schema({ x: Schema.Types.ObjectId });
            const ids = [123, 456, "asfds"];
            assert.throws(() => {
                cast(schema, { x: ids });
            }, /Cast to ObjectId failed/);
            done();
        });

        it("casts array with Strings to $in query", (done) => {
            const schema = new Schema({ x: String });
            const strings = ["bleep", "bloop"];
            assert.deepEqual(cast(schema, { x: strings }), { x: { $in: strings } });
            done();
        });

        it("casts array with Strings when necessary", (done) => {
            const schema = new Schema({ x: String });
            const strings = [123, 456];
            assert.deepEqual(cast(schema, { x: strings }), { x: { $in: strings.map(String) } });
            done();
        });

        it("casts array with Numbers to $in query", (done) => {
            const schema = new Schema({ x: Number });
            const numbers = [42, 25];
            assert.deepEqual(cast(schema, { x: numbers }), { x: { $in: numbers } });
            done();
        });

        it("casts array with Numbers to $in query when values are strings", (done) => {
            const schema = new Schema({ x: Number });
            const numbers = ["42", "25"];
            assert.deepEqual(cast(schema, { x: numbers }), { x: { $in: numbers.map(Number) } });
            done();
        });

        it("throws when Numbers are not valid", (done) => {
            const schema = new Schema({ x: Number });
            const numbers = [123, 456, "asfds"];
            assert.throws(() => {
                cast(schema, { x: numbers });
            }, /Cast to number failed for value "asfds"/);
            done();
        });
    });

    describe("bitwise query operators: ", () => {
        it("with a number", (done) => {
            const schema = new Schema({ x: Buffer });
            assert.deepEqual(cast(schema, { x: { $bitsAllClear: 3 } }), { x: { $bitsAllClear: 3 } });
            done();
        });

        it("with an array", (done) => {
            const schema = new Schema({ x: Buffer });
            assert.deepEqual(cast(schema, { x: { $bitsAllSet: [2, "3"] } }),
                { x: { $bitsAllSet: [2, 3] } });
            done();
        });

        it("with a buffer", (done) => {
            const schema = new Schema({ x: Number });
            assert.deepEqual(cast(schema, { x: { $bitsAnyClear: new Buffer([3]) } }),
                { x: { $bitsAnyClear: new Buffer([3]) } });
            done();
        });

        it("throws when invalid", (done) => {
            const schema = new Schema({ x: Number });
            assert.throws(() => {
                cast(schema, { x: { $bitsAnySet: "Not a number" } });
            }, /Cast to number failed/);
            done();
        });
    });
});
