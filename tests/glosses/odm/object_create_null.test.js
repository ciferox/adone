const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;

let schema;

describe("is compatible with object created using Object.create(null) (gh-1484)", () => {
    let db;
    let M;

    before(() => {
        schema = new Schema({
            a: String,
            b: {
                c: Number,
                d: [{ e: String }]
            },
            f: { g: Date },
            h: {}
        });
    });

    before(() => {
        db = start();
        M = db.model("1484", schema);
    });

    after((done) => {
        db.close(done);
    });

    it("during construction", (done) => {
        assert.doesNotThrow(() => {
            new M(Object.create(null));
        });

        assert.doesNotThrow(() => {
            const o = Object.create(null);
            o.b = Object.create(null);
            new M(o);
        });

        assert.doesNotThrow(() => {
            const o = Object.create(null);

            o.b = Object.create(null);
            o.b.c = 9;

            const e = Object.create(null);
            e.e = "hi i am a string";
            o.b.d = [e];

            const date = new Date();
            const f = Object.create(null);
            f.g = date;
            o.f = f;

            const h = Object.create(null);
            h.ad = 1;
            h.hoc = 2;
            h.obj = Object.create(null);
            o.h = h;

            const m = new M(o);

            assert.equal(m.b.c, 9);
            assert.equal(m.b.d[0].e, "hi i am a string");
            assert.equal(date, m.f.g);
            assert.equal(m.h.ad, 1);
            assert.equal(m.h.hoc, 2);
            assert.deepEqual({}, m.h.obj);
        });

        done();
    });

    it("with .set(path, obj)", (done) => {
        const m = new M();

        const b = Object.create(null);
        b.c = 9;
        m.set("b", b);

        const ee = Object.create(null);
        ee.e = "hi i am a string";
        const e = [ee];
        m.set("b.d", e);

        const date = new Date();
        const f = Object.create(null);
        f.g = date;
        m.set("f", f);

        const thing = Object.create(null);
        thing.h = "yes";
        m.set("h.obj.thing", thing);

        assert.equal(m.b.c, 9);
        assert.equal(m.b.d[0].e, "hi i am a string");
        assert.equal(date, m.f.g);
        assert.deepEqual("yes", m.h.obj.thing.h);
        done();
    });

    it("with schema", (done) => {
        const o = Object.create(null);
        o.name = String;
        o.created = Date;
        o.nested = Object.create(null);
        o.nested.n = Number;

        assert.doesNotThrow(() => {
            new Schema(o);
        });

        assert.doesNotThrow(() => {
            const s = new Schema();
            const o = Object.create(null);
            o.yay = Number;
            s.path("works", o);
        });

        assert.doesNotThrow(() => {
            const s = new Schema();
            let o = Object.create(null);
            o = {};
            o.name = String;
            const x = { type: [o] };
            s.path("works", x);
        });

        done();
    });
});
