const mongoose = adone.odm;
const { Schema } = adone.odm;

const {
    is
} = adone;

/**
 * Test.
 */

describe("schema.documentarray", () => {
    it("defaults should be preserved", (done) => {
        const child = new Schema({ title: String });

        const schema1 = new Schema({ x: { type: [child], default: [{ title: "Prometheus" }] } });
        const schema2 = new Schema({ x: { type: [child], default: { title: "Prometheus" } } });
        const schema3 = new Schema({
            x: {
                type: [child], default() {
                    return [{ title: "Prometheus" }];
                }
            }
        });

        const M = mongoose.model("DefaultDocArrays1", schema1);
        const N = mongoose.model("DefaultDocArrays2", schema2);
        const O = mongoose.model("DefaultDocArrays3", schema3);

        [M, N, O].forEach((M) => {
            let m = new M();
            assert.ok(is.array(m.x));
            assert.equal(m.x.length, 1);
            assert.equal(m.x[0].title, "Prometheus");
        });
        done();
    });

    it("only sets if document has same schema (gh-3701)", (done) => {
        const schema1 = new Schema({
            arr: [new Schema({ a: Number, b: Number }, { _id: false })]
        });
        const schema2 = new Schema({
            arr: [new Schema({ a: Number }, { _id: false })]
        });

        const Model1 = mongoose.model("gh3701_0", schema1);
        const Model2 = mongoose.model("gh3701_1", schema2);

        const source = new Model1({ arr: [{ a: 1, b: 1 }, { a: 2, b: 2 }] });
        const dest = new Model2({ arr: source.arr });

        assert.deepEqual(dest.toObject().arr, [{ a: 1 }, { a: 2 }]);
        done();
    });

    it("sets $implicitlyCreated if created by interpretAsType (gh-4271)", (done) => {
        const schema1 = new Schema({
            arr: [{ name: String }]
        });
        const schema2 = new Schema({
            arr: [new Schema({ name: String })]
        });

        assert.equal(schema1.childSchemas.length, 1);
        assert.equal(schema2.childSchemas.length, 1);
        assert.ok(schema1.childSchemas[0].schema.$implicitlyCreated);
        assert.ok(!schema2.childSchemas[0].schema.$implicitlyCreated);
        done();
    });
});
