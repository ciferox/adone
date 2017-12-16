const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const Document = adone.odm.Document;
const { Embedded } = adone.odm.types;

class TestDocument extends Document {
}

/**
 * Set a dummy schema to simulate compilation.
 */

const em = new Schema({ title: String, body: String });
em.virtual("works").get(() => {
    return "em virtual works";
});
const schema = new Schema({
    test: String,
    oids: [ObjectId],
    numbers: [Number],
    nested: {
        age: Number,
        cool: ObjectId,
        deep: { x: String },
        path: String,
        setr: String
    },
    nested2: {
        nested: String,
        yup: {
            nested: Boolean,
            yup: String,
            age: Number
        }
    },
    em: [em]
});
TestDocument.prototype.$__setSchema(schema);

schema.virtual("nested.agePlus2").get(function () {
    return this.nested.age + 2;
});
schema.virtual("nested.setAge").set(function (v) {
    this.nested.age = v;
});
schema.path("nested.path").get(function (v) {
    return this.nested.age + (v ? v : "");
});
schema.path("nested.setr").set((v) => {
    return `${v} setter`;
});

/**
 * Method subject to hooks. Simply fires the callback once the hooks are
 * executed.
 */

TestDocument.prototype.hooksTest = function (fn) {
    fn(null, arguments);
};

describe("document: hooks:", () => {
    it("step order", (done) => {
        let doc = new TestDocument(),
            steps = 0;

        // serial
        doc.$pre("hooksTest", (next) => {
            steps++;
            setTimeout(() => {
                // make sure next step hasn't executed yet
                assert.equal(steps, 1);
                next();
            }, 50);
        });

        doc.$pre("hooksTest", (next) => {
            steps++;
            next();
        });

        // parallel
        doc.$pre("hooksTest", true, (next, done) => {
            steps++;
            assert.equal(steps, 3);
            setTimeout(() => {
                assert.equal(steps, 4);
            }, 10);
            setTimeout(() => {
                steps++;
                done();
            }, 110);
            next();
        });

        doc.$pre("hooksTest", true, (next, done) => {
            steps++;
            setTimeout(() => {
                assert.equal(steps, 4);
            }, 10);
            setTimeout(() => {
                steps++;
                done();
            }, 110);
            next();
        });

        doc.hooksTest((err) => {
            assert.ifError(err);
            assert.equal(steps, 6);
            done();
        });
    });

    it("calling next twice does not break", (done) => {
        let doc = new TestDocument(),
            steps = 0;

        doc.$pre("hooksTest", (next) => {
            steps++;
            next();
            next();
        });

        doc.$pre("hooksTest", (next) => {
            steps++;
            next();
        });

        doc.hooksTest((err) => {
            assert.ifError(err);
            assert.equal(steps, 2);
            done();
        });
    });

    it("calling done twice does not break", (done) => {
        let doc = new TestDocument(),
            steps = 0;

        doc.$pre("hooksTest", true, (next, done) => {
            steps++;
            next();
            done();
            done();
        });

        doc.$pre("hooksTest", true, (next, done) => {
            steps++;
            next();
            done();
            done();
        });

        doc.hooksTest((err) => {
            assert.ifError(err);
            assert.equal(steps, 2);
            done();
        });
    });

    it("errors from a serial hook", (done) => {
        let doc = new TestDocument(),
            steps = 0;

        doc.$pre("hooksTest", (next) => {
            steps++;
            next();
        });

        doc.$pre("hooksTest", (next) => {
            steps++;
            next(new Error());
        });

        doc.$pre("hooksTest", () => {
            steps++;
        });

        doc.hooksTest((err) => {
            assert.ok(err instanceof Error);
            assert.equal(steps, 2);
            done();
        });
    });

    it("errors from last serial hook", (done) => {
        const doc = new TestDocument();

        doc.$pre("hooksTest", (next) => {
            next(new Error());
        });

        doc.hooksTest((err) => {
            assert.ok(err instanceof Error);
            done();
        });
    });

    it("mutating incoming args via middleware", (done) => {
        const doc = new TestDocument();

        doc.$pre("set", (next, path, val) => {
            next(path, `altered-${  val}`);
        });

        doc.set("test", "me");
        assert.equal(doc.test, "altered-me");
        done();
    });

    it("test hooks system errors from a parallel hook", (done) => {
        let doc = new TestDocument(),
            steps = 0;

        doc.$pre("hooksTest", true, (next, done) => {
            steps++;
            next();
            done();
        });

        doc.$pre("hooksTest", true, (next, done) => {
            steps++;
            next();
            done();
        });

        doc.$pre("hooksTest", true, (next, done) => {
            steps++;
            next();
            done(new Error());
        });

        doc.hooksTest((err) => {
            assert.ok(err instanceof Error);
            assert.equal(steps, 3);
            done();
        });
    });

    it("passing two arguments to a method subject to hooks and return value", (done) => {
        const doc = new TestDocument();

        doc.$pre("hooksTest", (next) => {
            next();
        });

        doc.hooksTest((err, args) => {
            assert.equal(args.length, 2);
            assert.equal(args[1], "test");
            done();
        }, "test");
    });

    it("hooking set works with document arrays (gh-746)", (done) => {
        const db = start();

        const child = new Schema({ text: String });

        child.pre("set", (next, path, value, type) => {
            next(path, value, type);
        });

        const schema = new Schema({
            name: String,
            e: [child]
        });

        const S = db.model("docArrayWithHookedSet", schema);

        const s = new S({ name: "test" });
        s.e = [{ text: "hi" }];
        s.save((err) => {
            assert.ifError(err);

            S.findById(s.id, (err, s) => {
                assert.ifError(err);

                s.e = [{ text: "bye" }];
                s.save((err) => {
                    assert.ifError(err);

                    S.findById(s.id, function (err, s) {
                        db.close();
                        assert.ifError(err);
                        assert.equal(s.e[0].text, 'bye');
                        done();
                    });
                });
            });
        });
    });

    it("pre save hooks on sub-docs should not exec after validation errors", (done) => {
        const db = start();
        let presave = false;

        const child = new Schema({ text: { type: String, required: true } });

        child.pre("save", (next) => {
            presave = true;
            next();
        });

        const schema = new Schema({
            name: String,
            e: [child]
        });

        const S = db.model("docArrayWithHookedSave", schema);
        const s = new S({ name: "hi", e: [{}] });
        s.save((err) => {
            db.close();

            try {
                assert.ok(err);
                assert.ok(err.errors["e.0.text"]);
                assert.equal(presave, false);
                done();
            } catch (e) {
                done(e);
            }
        });
    });

    it("post remove hooks on subdocuments work", (done) => {
        const db = start();
        const sub = new Schema({ _id: Number });
        const called = { pre: 0, post: 0 };

        sub.pre("remove", (next) => {
            called.pre++;
            next();
        });

        sub.post("remove", (doc) => {
            called.post++;
            assert.ok(doc instanceof Document);
        });

        const par = new Schema({ sub: [sub], name: String });
        const M = db.model("post-remove-hooks-sub", par);

        const m = new M({ sub: [{ _id: 1 }, { _id: 2 }] });
        m.save((err) => {
            assert.ifError(err);
            assert.equal(called.pre, 0);
            assert.equal(called.post, 0);

            M.findById(m, (err1, doc) => {
                assert.ifError(err1);

                doc.sub.id(1).remove();
                doc.save((err2) => {
                    assert.ifError(err2);
                    assert.equal(called.pre, 1);
                    assert.equal(called.post, 1);

                    // does not get called when not removed
                    doc.name = 'changed1';
                    doc.save(function (err3) {
                        assert.ifError(err3);
                        assert.equal(called.pre, 1);
                        assert.equal(called.post, 1);

                        doc.sub.id(2).remove();
                        doc.remove(function (err4) {
                            assert.ifError(err4);
                            assert.equal(called.pre, 2);
                            assert.equal(called.post, 2);

                            // does not get called twice
                            doc.remove(function (err5) {
                                assert.ifError(err5);
                                assert.equal(called.pre, 2);
                                assert.equal(called.post, 2);
                                db.close(done);
                            });
                        });
                    });
                });
            });
        });
    });

    it("can set nested schema to undefined in pre save (gh-1335)", (done) => {
        const db = start();
        const FooSchema = new Schema({});
        db.model("gh-1335-1", FooSchema);
        const BarSchema = new Schema({
            foos: [FooSchema]
        });
        const Bar = db.model("gh-1335-2", BarSchema);

        const b = new Bar();
        b.$pre("save", function (next) {
            if (this.isNew && this.foos.length === 0) {
                this.foos = undefined;
            }
            next();
        });

        b.save((error, dbBar) => {
            assert.ifError(error);
            assert.ok(!dbBar.foos);
            assert.equal(typeof dbBar.foos, "undefined");
            assert.ok(!b.foos);
            assert.equal(typeof b.foos, "undefined");
            db.close(done);
        });
    });

    it("post save hooks on subdocuments work (gh-915) (gh-3780)", (done) => {
        let doneCalled = false;
        const _done = function (e) {
            if (!doneCalled) {
                doneCalled = true;
                done(e);
            }
        };
        const db = start();
        const called = { post: 0 };

        const subSchema = new Schema({
            name: String
        });

        subSchema.post("save", (doc) => {
            called.post++;
            try {
                assert.ok(doc instanceof Embedded);
            } catch (e) {
                _done(e);
            }
        });

        const postSaveHooks = new Schema({
            subs: [subSchema]
        });

        const M = db.model("post-save-hooks-sub", postSaveHooks);

        const m = new M({
            subs: [
                { name: "mee" },
                { name: "moo" }
            ]
        });

        m.save((err) => {
            assert.ifError(err);
            assert.equal(called.post, 2);
            called.post = 0;

            M.findById(m, (err, doc) => {
                assert.ifError(err);
                doc.subs.push({ name: "maa" });
                doc.save((err) => {
                    assert.ifError(err);
                    assert.equal(called.post, 3);

                    _done();
                });
            });
        });
    });

    it("pre save hooks should run in parallel", function (done) {
        // we set the time out to be double that of the validator - 1
        // (so that running in serial will be greater than that)
        this.timeout(1000);
        let db = start(),
            count = 0;

        const SchemaWithPreSaveHook = new Schema({
            preference: String
        });
        SchemaWithPreSaveHook.pre("save", true, function hook(next, done) {
            setTimeout(() => {
                count++;
                next();
                if (count === 3) {
                    done(new Error("gaga"));
                } else {
                    done();
                }
            }, 500);
        });

        const MWPSH = db.model("mwpsh", new Schema({ subs: [SchemaWithPreSaveHook] }));
        const m = new MWPSH({
            subs: [{
                preference: "xx"
            }, {
                preference: "yy"
            }, {
                preference: "1"
            }, {
                preference: "2"
            }]
        });

        m.save((err) => {
            db.close();

            try {
                assert.equal(err.message, "gaga");
                assert.ok(count >= 3);
                done();
            } catch (e) {
                done(e);
            }
        });
    });

    it("parallel followed by serial (gh-2521)", (done) => {
        const schema = new Schema({ name: String });

        schema.pre("save", true, (next, done) => {
            process.nextTick(() => {
                done();
            });
            next();
        });

        schema.pre("save", (done) => {
            process.nextTick(() => {
                done();
            });
        });

        const db = start();
        const People = db.model("gh-2521", schema, "gh-2521");

        const p = new People({ name: "Val" });
        p.save((error) => {
            assert.ifError(error);
            db.close(done);
        });
    });

    it("runs post hooks after function (gh-2949)", (done) => {
        const schema = new Schema({ name: String });

        let postCount = 0;
        schema.post("init", (doc) => {
            assert.equal(doc.name, "Val");
            ++postCount;
        });

        const db = start();
        const People = db.model("gh-2949", schema, "gh-2949");

        People.create({ name: "Val" }, (err, doc) => {
            People.findOne({ _id: doc._id }, () => {
                assert.equal(postCount, 1);
                db.close(done);
            });
        });
    });

    it("pre-init hooks work", (done) => {
        const schema = new Schema({ text: String });

        schema.pre("init", (next, data) => {
            data.text = "pre init'd";
            next();
        });

        let db = start(),
            Parent = db.model("Parent", schema);

        Parent.create({
            text: "not init'd"
        }, (err, doc) => {
            Parent.findOne({ _id: doc._id }, (err, doc) => {
                db.close();

                assert.strictEqual(doc.text, "pre init'd");

                done();
            });
        });
    });

    it("post save handles multiple args (gh-3155)", (done) => {
        const schema = new Schema({});

        schema.post("save", (item, next) => {
            next();
        });

        const db = start();
        const Test = db.model("gh3155", schema);

        const t = new Test();
        t.save((error, doc, numAffected) => {
            assert.strictEqual(numAffected, 1);

            db.close(done);
        });
    });

    it("pre-init hooks on subdocuments work", (done) => {
        const childSchema = new Schema({ age: Number });

        childSchema.pre("init", function (next, data) {
            ++data.age;
            next();
            // On subdocuments, you have to return `this`
            return this;
        });

        const parentSchema = new Schema({ name: String, children: [childSchema] });
        let db = start(),
            Parent = db.model("ParentWithChildren", parentSchema);

        Parent.create({
            name: "Bob",
            children: [{ age: 8 }, { age: 5 }]
        }, (err, doc) => {
            Parent.findOne({ _id: doc._id }, (err, doc) => {
                db.close();

                assert.strictEqual(doc.children.length, 2);
                assert.strictEqual(doc.children[0].constructor.name, "EmbeddedDocument");
                assert.strictEqual(doc.children[1].constructor.name, "EmbeddedDocument");
                assert.strictEqual(doc.children[0].age, 9);
                assert.strictEqual(doc.children[1].age, 6);

                done();
            });
        });
    });

    it("pre-save hooks fire on subdocs before their parent doc", (done) => {
        const childSchema = new Schema({ name: String, count: Number });

        childSchema.pre("save", function (next) {
            ++this.count;
            next();
            // On subdocuments, you have to return `this`
            return this;
        });

        const parentSchema = new Schema({
            cumulativeCount: Number,
            children: [childSchema]
        });

        parentSchema.pre("save", function (next) {
            this.cumulativeCount = this.children.reduce((seed, child) => {
                seed += child.count;
                return seed;
            }, 0);
            next();
        });

        let db = start(),
            Parent = db.model("ParentWithChildren", parentSchema),
            doc = new Parent({ children: [{ count: 0, name: "a" }, { count: 1, name: "b" }] });

        doc.save((err, doc1) => {
            db.close();

            try {
                assert.strictEqual(doc1.children[0].count, 1);
                assert.strictEqual(doc1.children[1].count, 2);
                assert.strictEqual(doc1.cumulativeCount, 3);
            } catch (e) {
                done(e);
                return;
            }

            done();
        });
    });

    describe("gh-3284", () => {
        it("should call pre hooks on nested subdoc", async () => {
            const _this = this;

            const childSchema = new Schema({
                title: String
            });

            ["init", "save", "validate"].forEach((type) => {
                childSchema.pre(type, (next) => {
                    _this["pre" + type + "Called"] = true;
                    next();
                });
            });

            const parentSchema = new Schema({
                nested: {
                    children: [childSchema]
                }
            });

            const db = start();
            db.model("gh-3284", parentSchema);

            const Parent = db.model("gh-3284");

            const parent = new Parent({
                nested: {
                    children: [{
                        title: "banana"
                    }]
                }
            });

            await parent.save();
            await Parent.findById(parent._id);
            db.close();
            assert.ok(_this.preinitCalled);
            assert.ok(_this.prevalidateCalled);
            assert.ok(_this.presaveCalled);
        });
    });

    it("pre set hooks on real documents (gh-3479)", (done) => {
        const bookSchema = new Schema({
            title: String
        });

        const preCalls = [];
        bookSchema.pre("set", (next, path, val) => {
            preCalls.push({ path, val });
            next();
        });

        const Book = mongoose.model("gh3479", bookSchema);

        const book = new Book({});

        book.title = "Professional AngularJS";
        assert.equal(preCalls.length, 1);
        assert.equal(preCalls[0].path, "title");
        assert.equal(preCalls[0].val, "Professional AngularJS");

        done();
    });

    it("sync exceptions get passed as errors (gh-5738)", (done) => {
        const bookSchema = new Schema({ title: String });

        /* eslint-disable no-unused-vars */
        bookSchema.pre("save", (next) => {
            throw new Error("woops!");
        });

        const Book = mongoose.model("gh5738", bookSchema);

        const book = new Book({ title: "Professional AngularJS" });
        book.save((error) => {
            assert.ok(error);
            assert.equal(error.message, "woops!");
            done();
        });
    });

    it("nested subdocs only fire once (gh-3281)", (done) => {
        const L3Schema = new Schema({
            title: String
        });

        let calls = 0;
        L3Schema.pre("save", (next) => {
            ++calls;
            return next();
        });

        const L2Schema = new Schema({
            items: [L3Schema]
        });

        const L1Schema = new Schema({
            items: [L2Schema]
        });

        const db = start();
        const L1 = db.model("gh3281", L1Schema);

        const data = {
            items: [{
                items: [{
                    title: "test"
                }]
            }]
        };

        L1.create(data, (error) => {
            assert.ifError(error);
            assert.equal(calls, 1);
            db.close(done);
        });
    });

    it("remove hooks for single nested (gh-3754)", (done) => {
        const db = start();
        let postCount = 0;
        const PhotoSchema = new mongoose.Schema({
            bla: String
        });

        PhotoSchema.post("remove", () => {
            ++postCount;
        });

        const PersonSchema = new mongoose.Schema({
            photo: PhotoSchema
        });

        const Person = db.model("Person", PersonSchema);

        Person.create({ photo: { bla: "test" } }, (error, person) => {
            assert.ifError(error);
            person.photo.remove();
            person.save((error1) => {
                assert.ifError(error1);
                setTimeout(() => {
                    assert.equal(postCount, 1);
                    done();
                }, 0);
            });
        });
    });
});
