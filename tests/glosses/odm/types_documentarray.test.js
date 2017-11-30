const start = require("./common");
const mongoose = adone.odm;
const random = adone.odm.utils.random;
const setValue = adone.odm.utils.setValue;
const MongooseDocumentArray = mongoose.Types.DocumentArray;
const { DocumentArray, Embedded } = adone.odm.types;
const Schema = mongoose.Schema;
const collection = `types.documentarray_${random()}`;

const {
    is
} = adone;

function TestDoc(schema) {
    const Subdocument = function () {
        Embedded.call(this, {}, new DocumentArray());
    };

    /**
   * Inherits from Embedded.
   */

    Subdocument.prototype.__proto__ = Embedded.prototype;

    /**
   * Set schema.
   */

    const SubSchema = new Schema({
        title: { type: String }
    });

    Subdocument.prototype.$__setSchema(schema || SubSchema);

    return Subdocument;
}

/**
 * Test.
 */

describe("types.documentarray", () => {
    it("behaves and quacks like an array", (done) => {
        const a = new MongooseDocumentArray();

        assert.ok(a instanceof Array);
        assert.ok(a.isMongooseArray);
        assert.ok(a.isMongooseDocumentArray);
        assert.ok(is.array(a));

        assert.deepEqual(a._atomics.constructor, Object);

        done();
    });

    it("#id", (done) => {
        let Subdocument = TestDoc();

        let sub1 = new Subdocument();
        sub1.title = "Hello again to all my friends";
        let id = sub1.id;

        let a = new MongooseDocumentArray([sub1]);
        assert.equal(a.id(id).title, "Hello again to all my friends");
        assert.equal(a.id(sub1._id).title, "Hello again to all my friends");

        // test with custom string _id
        let Custom = new Schema({
            title: { type: String },
            _id: { type: String, required: true }
        });

        Subdocument = TestDoc(Custom);

        let sub2 = new Subdocument();
        sub2.title = "together we can play some rock-n-roll";
        sub2._id = "a25";
        const id2 = sub2.id;

        a = new MongooseDocumentArray([sub2]);
        assert.equal(a.id(id2).title, "together we can play some rock-n-roll");
        assert.equal(a.id(sub2._id).title, "together we can play some rock-n-roll");

        // test with custom number _id
        const CustNumber = new Schema({
            title: { type: String },
            _id: { type: Number, required: true }
        });

        Subdocument = TestDoc(CustNumber);

        const sub3 = new Subdocument();
        sub3.title = "rock-n-roll";
        sub3._id = 1995;
        const id3 = sub3.id;

        a = new MongooseDocumentArray([sub3]);
        assert.equal(a.id(id3).title, "rock-n-roll");
        assert.equal(a.id(sub3._id).title, "rock-n-roll");

        // test with object as _id
        Custom = new Schema({
            title: { type: String },
            _id: { one: { type: String }, two: { type: String } }
        });

        Subdocument = TestDoc(Custom);

        sub1 = new Subdocument();
        sub1._id = { one: "rolling", two: "rock" };
        sub1.title = "to be a rock and not to roll";

        sub2 = new Subdocument();
        sub2._id = { one: "rock", two: "roll" };
        sub2.title = "rock-n-roll";

        a = new MongooseDocumentArray([sub1, sub2]);
        assert.notEqual(a.id({ one: "rolling", two: "rock" }).title, "rock-n-roll");
        assert.equal(a.id({ one: "rock", two: "roll" }).title, "rock-n-roll");

        // test with no _id
        let NoId = new Schema({
            title: { type: String }
        }, { noId: true });

        Subdocument = TestDoc(NoId);

        let sub4 = new Subdocument();
        sub4.title = "rock-n-roll";

        a = new MongooseDocumentArray([sub4]);
        let threw = false;
        try {
            a.id("i better not throw");
        } catch (err) {
            threw = err;
        }
        assert.equal(threw, false);

        // test the _id option, noId is deprecated
        NoId = new Schema({
            title: { type: String }
        }, { _id: false });

        Subdocument = TestDoc(NoId);

        sub4 = new Subdocument();
        sub4.title = "rock-n-roll";

        a = new MongooseDocumentArray([sub4]);
        threw = false;
        try {
            a.id("i better not throw");
        } catch (err) {
            threw = err;
        }
        assert.equal(threw, false);
        // undefined and null should not match a nonexistent _id
        assert.strictEqual(null, a.id(undefined));
        assert.strictEqual(null, a.id(null));

        // test when _id is a populated document
        Custom = new Schema({
            title: { type: String }
        });

        const Custom1 = new Schema({}, { id: false });

        Subdocument = TestDoc(Custom);
        const Subdocument1 = TestDoc(Custom1);

        const sub = new Subdocument1();
        sub1 = new Subdocument1();
        sub.title = "Hello again to all my friends";
        id = sub1._id.toString();
        setValue("_id", sub1, sub);

        a = new MongooseDocumentArray([sub]);
        assert.equal(a.id(id).title, "Hello again to all my friends");

        done();
    });

    describe("inspect", () => {
        it("works with bad data", (done) => {
            let threw = false;
            let a = new MongooseDocumentArray([null]);
            try {
                a.inspect();
            } catch (err) {
                threw = true;
                console.error(err.stack);
            }
            assert.ok(!threw);
            done();
        });
    });

    describe("toObject", () => {
        it("works with bad data", (done) => {
            let threw = false;
            let a = new MongooseDocumentArray([null]);
            try {
                a.toObject();
            } catch (err) {
                threw = true;
                console.error(err.stack);
            }
            assert.ok(!threw);
            done();
        });
        it("passes options to its documents (gh-1415) (gh-4455)", (done) => {
            let subSchema = new Schema({
                title: { type: String }
            });

            subSchema.set("toObject", {
                transform(doc, ret) {
                    // this should not be called because custom options are
                    // passed during MongooseArray#toObject() calls
                    ret.changed = 123;
                    return ret;
                }
            });

            let db = mongoose.createConnection();
            let M = db.model("gh-1415", { docs: [subSchema] });
            let m = new M();
            m.docs.push({ docs: [{ title: "hello" }] });
            let delta = m.$__delta()[1];
            assert.equal(delta.$pushAll.docs[0].changed, undefined);

            M = db.model("gh-1415-1", new Schema({ docs: [subSchema] }, {
                usePushEach: true
            }));
            m = new M();
            m.docs.push({ docs: [{ title: "hello" }] });
            delta = m.$__delta()[1];
            assert.equal(delta.$push.docs.$each[0].changed, undefined);

            done();
        });
        it("uses the correct transform (gh-1412)", (done) => {
            let db = start();
            let SecondSchema = new Schema({});

            SecondSchema.set("toObject", {
                transform: function second(doc, ret) {
                    ret.secondToObject = true;
                    return ret;
                }
            });

            let FirstSchema = new Schema({
                second: [SecondSchema]
            });

            FirstSchema.set("toObject", {
                transform: function first(doc, ret) {
                    ret.firstToObject = true;
                    return ret;
                }
            });

            let First = db.model("first", FirstSchema);
            let Second = db.model("second", SecondSchema);

            let first = new First({});

            first.second.push(new Second());
            first.second.push(new Second());
            let obj = first.toObject();

            assert.ok(obj.firstToObject);
            assert.ok(obj.second[0].secondToObject);
            assert.ok(obj.second[1].secondToObject);
            assert.ok(!obj.second[0].firstToObject);
            assert.ok(!obj.second[1].firstToObject);
            db.close(done);
        });
    });

    describe("create()", () => {
        it("works", (done) => {
            let a = new MongooseDocumentArray([]);
            assert.equal(typeof a.create, "function");

            let schema = new Schema({ docs: [new Schema({ name: "string" })] });
            let T = mongoose.model("embeddedDocument#create_test", schema, "asdfasdfa" + random());
            let t = new T();
            assert.equal(typeof t.docs.create, "function");
            let subdoc = t.docs.create({ name: 100 });
            assert.ok(subdoc._id);
            assert.equal(subdoc.name, "100");
            assert.ok(subdoc instanceof EmbeddedDocument);
            done();
        });
    });

    describe("push()", () => {
        it("does not re-cast instances of its embedded doc", (done) => {
            let db = start();

            let child = new Schema({ name: String, date: Date });
            child.pre("save", function (next) {
                this.date = new Date();
                next();
            });
            let schema = new Schema({ children: [child] });
            let M = db.model("embeddedDocArray-push-re-cast", schema, "edarecast-" + random());
            let m = new M();
            m.save((err) => {
                assert.ifError(err);
                M.findById(m._id, function (err, doc) {
                    assert.ifError(err);
                    var c = doc.children.create({ name: 'first' });
                    assert.equal(c.date, undefined);
                    doc.children.push(c);
                    assert.equal(c.date, undefined);
                    doc.save(function (err) {
                        assert.ifError(err);
                        assert.ok(doc.children[doc.children.length - 1].date);
                        assert.equal(c.date, doc.children[doc.children.length - 1].date);

                        doc.children.push(c);
                        doc.children.push(c);

                        doc.save(function (err) {
                            assert.ifError(err);
                            M.findById(m._id, function (err, doc) {
                                assert.ifError(err);
                                assert.equal(doc.children.length, 3);
                                doc.children.forEach(function (child) {
                                    assert.equal(doc.children[0].id, child.id);
                                });
                                db.close(done);
                            });
                        });
                    });
                });
            });
        });
        it("corrects #ownerDocument() if value was created with array.create() (gh-1385)", (done) => {
            let mg = new mongoose.Mongoose();
            let M = mg.model("1385", { docs: [{ name: String }] });
            let m = new M();
            let doc = m.docs.create({ name: "test 1385" });
            assert.notEqual(String(doc.ownerDocument()._id), String(m._id));
            m.docs.push(doc);
            assert.equal(doc.ownerDocument()._id, String(m._id));
            done();
        });
    });

    it("#push should work on EmbeddedDocuments more than 2 levels deep", (done) => {
        const Comments = new Schema();
        Comments.add({
            title: String,
            comments: [Comments]
        });
        const BlogPost = new Schema({
            title: String,
            comments: [Comments]
        });

        let db = start(),
            Post = db.model("docarray-BlogPost", BlogPost, collection);

        const p = new Post({ title: "comment nesting" });
        const c1 = p.comments.create({ title: "c1" });
        const c2 = c1.comments.create({ title: "c2" });
        const c3 = c2.comments.create({ title: "c3" });

        p.comments.push(c1);
        c1.comments.push(c2);
        c2.comments.push(c3);

        p.save((err) => {
            assert.ifError(err);

            Post.findById(p._id, (err, p) => {
                assert.ifError(err);

                p.comments[0].comments[0].comments[0].comments.push({ title: 'c4' });
                p.save(function (err) {
                    assert.ifError(err);

                    Post.findById(p._id, function (err, p) {
                        assert.ifError(err);
                        assert.equal(p.comments[0].comments[0].comments[0].comments[0].title, 'c4');
                        db.close(done);
                    });
                });
            });
        });
    });

    describe("invalidate()", () => {
        it("works", (done) => {
            let schema = new Schema({ docs: [{ name: "string" }] });
            schema.pre("validate", function (next) {
                let subdoc = this.docs[this.docs.length - 1];
                subdoc.invalidate("name", "boo boo", "%");
                next();
            });
            let T = mongoose.model("embeddedDocument#invalidate_test", schema, "asdfasdfa" + random());
            let t = new T();
            t.docs.push({ name: 100 });

            let subdoc = t.docs.create({ name: "yep" });
            assert.throws(() => {
                // has no parent array
                subdoc.invalidate('name', 'junk', 47);
            });
            t.validate(() => {
                var e = t.errors['docs.0.name'];
                assert.ok(e);
                assert.equal(e.path, 'docs.0.name');
                assert.equal(e.kind, 'user defined');
                assert.equal(e.message, 'boo boo');
                assert.equal(e.value, '%');
                done();
            });
        });

        it("handles validation failures", (done) => {
            let db = start();
            let nested = new Schema({ v: { type: Number, max: 30 } });
            let schema = new Schema({
                docs: [nested]
            }, { collection: "embedded-invalidate-" + random() });
            let M = db.model("embedded-invalidate", schema);
            let m = new M({ docs: [{ v: 900 }] });
            m.save((err) => {
                assert.equal(err.errors['docs.0.v'].value, 900);
                db.close(done);
            });
        });

        it("removes attached event listeners when creating new doc array", (done) => {
            let db = start();
            let nested = new Schema({ v: { type: Number } });
            let schema = new Schema({
                docs: [nested]
            }, { collection: "gh-2159" });
            let M = db.model("gh-2159", schema);
            M.create({ docs: [{ v: 900 }] }, (error, m) => {
                m.shouldPrint = true;
                assert.ifError(error);
                var numListeners = m.listeners('save').length;
                assert.ok(numListeners > 0);
                m.docs = [{ v: 9000 }];
                m.save(function (error, m) {
                    assert.ifError(error);
                    assert.equal(numListeners, m.listeners('save').length);
                    db.close(done);
                });
            });
        });
    });
});
