const start = require("./common");
const mongoose = adone.odm;
const random = adone.odm.utils.random;
const Schema = mongoose.Schema;

describe("document: strict mode:", () => {
    describe("should work", () => {
        let db, Lax, Strict;

        before(() => {
            db = start();

            const raw = {
                ts: { type: Date, default: Date.now },
                content: String,
                mixed: {},
                deepMixed: { "4a": {} },
                arrayMixed: []
            };

            const lax = new Schema(raw, { strict: false, minimize: false });
            const strict = new Schema(raw);

            Lax = db.model("Lax", lax);
            Strict = db.model("Strict", strict);
        });

        after((done) => {
            db.close(done);
        });

        it("when creating models with non-strict schemas (gh-4274)", (done) => {
            const l = new Lax({ content: "sample", rouge: "data", items: {} });
            assert.equal(l.$__.strictMode, false);

            const lo = l.toObject();
            assert.ok("ts" in l);
            assert.ok("ts" in lo);
            assert.equal(l.content, "sample");
            assert.equal(lo.content, "sample");
            assert.equal(l.rouge, "data");
            assert.equal(lo.rouge, "data");
            assert.deepEqual(l.items, {});
            assert.deepEqual(lo.items, {});

            l.save((error) => {
                assert.ifError(error);
                Lax.findById(l).exec((error, doc) => {
                    assert.ifError(error);
                    var lo = doc.toObject();
                    assert.equal(lo.content, 'sample');
                    assert.equal(lo.rouge, 'data');
                    assert.deepEqual(lo.items, {});
                    done();
                });
            });
        });

        it("when creating models with strict schemas", (done) => {
            const s = new Strict({ content: "sample", rouge: "data" });
            assert.equal(s.$__.strictMode, true);

            const so = s.toObject();
            assert.ok("ts" in s);
            assert.ok("ts" in so);
            assert.equal(s.content, "sample");
            assert.equal(so.content, "sample");
            assert.ok(!("rouge" in s));
            assert.ok(!("rouge" in so));
            assert.ok(!s.rouge);
            assert.ok(!so.rouge);
            done();
        });

        it("when overriding strictness", (done) => {
            // instance override
            let instance = new Lax({ content: "sample", rouge: "data" }, true);
            assert.ok(instance.$__.strictMode);

            instance = instance.toObject();
            assert.equal(instance.content, "sample");
            assert.ok(!instance.rouge);
            assert.ok("ts" in instance);

            // hydrate works as normal, but supports the schema level flag.
            let s2 = new Strict({ content: "sample", rouge: "data" }, false);
            assert.equal(s2.$__.strictMode, false);
            s2 = s2.toObject();
            assert.ok("ts" in s2);
            assert.equal(s2.content, "sample");
            assert.ok("rouge" in s2);

            // testing init
            const s3 = new Strict();
            s3.init({ content: "sample", rouge: "data" });
            s3.toObject();
            assert.equal(s3.content, "sample");
            assert.ok(!("rouge" in s3));
            assert.ok(!s3.rouge);
            done();
        });

        it("when using Model#create", (done) => {
            // strict on create
            Strict.create({ content: "sample2", rouge: "data" }, (err, doc) => {
                assert.equal(doc.content, "sample2");
                assert.ok(!("rouge" in doc));
                assert.ok(!doc.rouge);
                done();
            });
        });

        after(() => {
            db.close();
        });
    });

    it("nested doc", (done) => {
        const db = start();

        const lax = new Schema({
            name: { last: String }
        }, { strict: false });

        const strict = new Schema({
            name: { last: String }
        });

        const Lax = db.model("NestedLax", lax, `nestdoc${random()}`);
        const Strict = db.model("NestedStrict", strict, `nestdoc${random()}`);

        let l = new Lax();
        l.set("name", { last: "goose", hack: "xx" });
        l = l.toObject();
        assert.equal(l.name.last, "goose");
        assert.equal(l.name.hack, "xx");

        let s = new Strict();
        s.set({ name: { last: "goose", hack: "xx" } });
        s = s.toObject();
        assert.equal(s.name.last, "goose");
        assert.ok(!("hack" in s.name));
        assert.ok(!s.name.hack);

        s = new Strict();
        s.set("name", { last: "goose", hack: "xx" });
        s.set("shouldnt.exist", ":(");
        s = s.toObject();
        assert.equal(s.name.last, "goose");
        assert.ok(!("hack" in s.name));
        assert.ok(!s.name.hack);
        assert.ok(!s.shouldnt);
        db.close(done);
    });

    it("sub doc", (done) => {
        const db = start();

        const lax = new Schema({
            ts: { type: Date, default: Date.now },
            content: String
        }, { strict: false });

        const strict = new Schema({
            ts: { type: Date, default: Date.now },
            content: String
        });

        const Lax = db.model("EmbeddedLax", new Schema({ dox: [lax] }, { strict: false }), `embdoc${ random()}`);
        const Strict = db.model("EmbeddedStrict", new Schema({ dox: [strict] }, { strict: false }), `embdoc${random()}`);

        let l = new Lax({ dox: [{ content: "sample", rouge: "data" }] });
        assert.equal(l.dox[0].$__.strictMode, false);
        l = l.dox[0].toObject();
        assert.equal(l.content, "sample");
        assert.equal(l.rouge, "data");
        assert.ok(l.rouge);

        let s = new Strict({ dox: [{ content: "sample", rouge: "data" }] });
        assert.equal(s.dox[0].$__.strictMode, true);
        s = s.dox[0].toObject();
        assert.ok("ts" in s);
        assert.equal(s.content, "sample");
        assert.ok(!("rouge" in s));
        assert.ok(!s.rouge);

        // testing init
        const s3 = new Strict();
        s3.init({ dox: [{ content: "sample", rouge: "data" }] });
        s3.toObject();
        assert.equal(s3.dox[0].content, "sample");
        assert.ok(!("rouge" in s3.dox[0]));
        assert.ok(!s3.dox[0].rouge);

        // strict on create
        Strict.create({ dox: [{ content: "sample2", rouge: "data" }] }, (err, doc) => {
            assert.equal(doc.dox[0].content, "sample2");
            assert.ok(!("rouge" in doc.dox[0]));
            assert.ok(!doc.dox[0].rouge);
            db.close(done);
        });
    });

    it("virtuals", (done) => {
        const db = start();

        let getCount = 0,
            setCount = 0;

        const strictSchema = new Schema({
            email: String,
            prop: String
        });

        strictSchema
            .virtual("myvirtual")
            .get(() => {
                getCount++;
                return "ok";
            })
            .set(function (v) {
                setCount++;
                this.prop = v;
            });

        const StrictModel = db.model("StrictVirtual", strictSchema);

        const strictInstance = new StrictModel({
            email: "hunter@skookum.com",
            myvirtual: "test"
        });

        assert.equal(getCount, 0);
        assert.equal(setCount, 1);

        strictInstance.myvirtual = "anotherone";
        assert.equal(getCount, 0);
        assert.equal(setCount, 2);

        const temp = strictInstance.myvirtual;
        assert.equal("string", typeof temp);
        assert.equal(getCount, 1);
        assert.equal(setCount, 2);

        db.close(done);
    });

    it("can be overridden during set()", (done) => {
        const db = start();

        const strict = new Schema({
            bool: Boolean
        });

        const Strict = db.model("Strict", strict);
        const s = new Strict({ bool: true });

        // insert non-schema property
        const doc = s.toObject();
        doc.notInSchema = true;

        Strict.collection.insert(doc, { w: 1 }, (err) => {
            assert.ifError(err);
            Strict.findById(doc._id, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc._doc.bool, true);
                assert.equal(doc._doc.notInSchema, true);
                doc.bool = undefined;
                doc.set("notInSchema", undefined, { strict: false });
                doc.save(() => {
                    Strict.findById(doc._id, function (err, doc) {
                        assert.ifError(err);
                        assert.equal(doc._doc.bool, undefined);
                        assert.equal(doc._doc.notInSchema, undefined);
                        db.close(done);
                    });
                });
            });
        });
    });

    it("can be overridden during update()", (done) => {
        const db = start();

        const strict = new Schema({
            bool: Boolean
        });

        const Strict = db.model("Strict", strict);
        const s = new Strict({ bool: true });

        // insert non-schema property
        const doc = s.toObject();
        doc.notInSchema = true;

        Strict.collection.insert(doc, (err) => {
            assert.ifError(err);

            Strict.findById(doc._id, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc._doc.bool, true);
                assert.equal(doc._doc.notInSchema, true);

                Strict.update({ _id: doc._id }, { $unset: { bool: 1, notInSchema: 1 } }, { strict: false },
                    (err) => {
                        assert.ifError(err);

                        Strict.findById(doc._id, function (err, doc) {
                            db.close();
                            assert.ifError(err);
                            assert.equal(doc._doc.bool, undefined);
                            assert.equal(doc._doc.notInSchema, undefined);
                            done();
                        });
                    });
            });
        });
    });

    it("can be overwritten with findOneAndUpdate (gh-1967)", (done) => {
        const db = start();

        const strict = new Schema({
            bool: Boolean
        });

        const Strict = db.model("Strict", strict);
        const s = new Strict({ bool: true });

        // insert non-schema property
        const doc = s.toObject();
        doc.notInSchema = true;

        Strict.collection.insert(doc, { w: 1 }, (err) => {
            assert.ifError(err);

            Strict.findById(doc._id, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc._doc.bool, true);
                assert.equal(doc._doc.notInSchema, true);

                Strict.findOneAndUpdate({ _id: doc._id }, { $unset: { bool: 1, notInSchema: 1 } }, { strict: false, w: 1 },
                    (err) => {
                        assert.ifError(err);

                        Strict.findById(doc._id, function (err, doc) {
                            assert.ifError(err);
                            assert.equal(doc._doc.bool, undefined);
                            assert.equal(doc._doc.notInSchema, undefined);
                            db.close(done);
                        });
                    });
            });
        });
    });

    describe('"throws" mode', () => {
        it("throws on set() of unknown property", (done) => {
            const schema = new Schema({ n: String, docs: [{ x: [{ y: String }] }] });
            schema.set("strict", "throw");
            const M = mongoose.model("throwStrictSet", schema, `tss_${  random()}`);
            const m = new M();

            const badField = /Field `[\w\.]+` is not in schema/;

            assert.throws(() => {
                m.set("unknown.stuff.is.here", 3);
            }, badField);

            assert.throws(() => {
                m.set("n.something", 3);
            }, badField);

            assert.throws(() => {
                m.set("n.3", 3);
            }, badField);

            assert.throws(() => {
                m.set("z", 3);
            }, badField);

            assert.throws(() => {
                m.set("docs.z", 3);
            }, badField);

            assert.throws(() => {
                m.set("docs.0.z", 3);
            }, badField);

            assert.throws(() => {
                m.set("docs.0.x.z", 3);
            }, badField);

            assert.throws(() => {
                m.set("docs.0.x.4.z", 3);
            }, badField);

            assert.throws(() => {
                m.set("docs.0.x.4.y.z", 3);
            }, badField);

            done();
        });

        it("fails with extra fields", (done) => {
            // Simple schema with throws option
            const FooSchema = new mongoose.Schema({
                name: { type: String }
            }, { strict: "throw" });

            // Create the model
            const Foo = mongoose.model("Foo1234", FooSchema);

            assert.doesNotThrow(() => {
                new Foo({ name: "bar" });
            });

            assert.throws(() => {
                // The extra baz field should throw
                new Foo({ name: "bar", baz: "bam" });
            }, /Field `baz` is not in schema/);

            done();
        });

        it("doesnt throw with refs (gh-2665)", (done) => {
            // Simple schema with throws option
            const FooSchema = new mongoose.Schema({
                name: { type: mongoose.Schema.Types.ObjectId, ref: "test", required: false, default: null },
                father: { name: { full: String } }
            }, { strict: "throw" });

            // Create the model
            const Foo = mongoose.model("gh2665", FooSchema);

            assert.doesNotThrow(() => {
                new Foo({ name: mongoose.Types.ObjectId(), father: { name: { full: "bacon" } } });
            });

            done();
        });

        it("set nested to num throws ObjectExpectedError (gh-3735)", (done) => {
            const schema = new Schema({
                resolved: {
                    by: { type: String }
                }
            }, { strict: "throw" });

            const Test = mongoose.model("gh3735", schema);

            const err = assert.throws(() => {
                new Test({ resolved: 123 });
            });
            assert.match(err.stack, /ObjectExpectedError/);
            done();
        });
    });
});