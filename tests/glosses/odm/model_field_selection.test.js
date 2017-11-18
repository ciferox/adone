const start = require("./common");
const mongoose = adone.odm;
const random = adone.odm.utils.random;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;

describe("model field selection", () => {
    let Comments;
    let BlogPostB;
    let modelName;
    let collection;

    before(() => {
        Comments = new Schema();

        Comments.add({
            title: String,
            date: Date,
            body: String,
            comments: [Comments]
        });

        BlogPostB = new Schema({
            title: String,
            author: String,
            slug: String,
            date: Date,
            meta: {
                date: Date,
                visitors: Number
            },
            published: Boolean,
            mixed: {},
            numbers: [Number],
            tags: [String],
            sigs: [Buffer],
            owners: [ObjectId],
            comments: [Comments],
            def: { type: String, default: "kandinsky" }
        });

        modelName = "model.select.blogpost";
        mongoose.model(modelName, BlogPostB);
        collection = `blogposts_${random()}`;
    });

    it("excluded fields should be undefined", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection),
            date = new Date();

        const doc = {
            title: "subset 1",
            author: "me",
            comments: [{ title: "first comment", date: new Date() }, { title: "2nd", date: new Date() }],
            meta: { date }
        };

        BlogPostB.create(doc, (err, created) => {
            assert.ifError(err);

            let id = created.id;
            BlogPostB.findById(id, { title: 0, "meta.date": 0, owners: 0, "comments.user": 0 }, (err, found) => {
                db.close();
                assert.ifError(err);
                assert.equal(found._id.toString(), created._id);
                assert.strictEqual(undefined, found.title);
                assert.strictEqual('kandinsky', found.def);
                assert.strictEqual('me', found.author);
                assert.strictEqual(true, Array.isArray(found.numbers));
                assert.equal(found.meta.date, undefined);
                assert.equal(found.numbers.length, 0);
                assert.equal(found.owners, undefined);
                assert.strictEqual(true, Array.isArray(found.comments));
                assert.equal(found.comments.length, 2);
                found.comments.forEach(function (comment) {
                    assert.equal(comment.user, undefined);
                });
                done();
            });
        });
    });

    it("excluded fields should be undefined and defaults applied to other fields", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection),
            id = new DocumentObjectId(),
            date = new Date();

        BlogPostB.collection.insert({ _id: id, title: "hahaha1", meta: { date } }, (err) => {
            assert.ifError(err);

            BlogPostB.findById(id, { title: 0 }, (err, found) => {
                db.close();
                assert.ifError(err);
                assert.equal(found._id.toString(), id);
                assert.strictEqual(undefined, found.title);
                assert.strictEqual('kandinsky', found.def);
                assert.strictEqual(undefined, found.author);
                assert.strictEqual(true, Array.isArray(found.comments));
                assert.equal(date.toString(), found.meta.date.toString());
                assert.equal(found.comments.length, 0);
                done();
            });
        });
    });

    it("where subset of fields excludes _id", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection);
        BlogPostB.create({ title: "subset 1" }, (err) => {
            assert.ifError(err);
            BlogPostB.findOne({ title: "subset 1" }, { title: 1, _id: 0 }, (err, found) => {
                db.close();
                assert.ifError(err);
                assert.strictEqual(undefined, found._id);
                assert.equal(found.title, 'subset 1');
                done();
            });
        });
    });

    it("works with subset of fields, excluding _id", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection);
        BlogPostB.create({ title: "subset 1", author: "me" }, (err) => {
            assert.ifError(err);
            BlogPostB.find({ title: "subset 1" }, { title: 1, _id: 0 }, (err, found) => {
                db.close();
                assert.ifError(err);
                assert.strictEqual(undefined, found[0]._id);
                assert.equal(found[0].title, 'subset 1');
                assert.strictEqual(undefined, found[0].def);
                assert.strictEqual(undefined, found[0].author);
                assert.strictEqual(false, Array.isArray(found[0].comments));
                done();
            });
        });
    });

    it("works with just _id and findOneAndUpdate (gh-3407)", (done) => {
        const db = start();

        const MyModel = db.model("gh3407", { test: { type: Number, default: 1 } });

        MyModel.collection.insert({}, (error) => {
            assert.ifError(error);
            MyModel.findOne({}, { _id: 1 }, (error, doc) => {
                assert.ifError(error);
                assert.ok(!doc.test);
                db.close(done);
            });
        });
    });

    it("works with subset of fields excluding emebedded doc _id (gh-541)", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection);

        BlogPostB.create({ title: "LOTR", comments: [{ title: ":)" }] }, (err, created) => {
            assert.ifError(err);
            BlogPostB.find({ _id: created }, { _id: 0, "comments._id": 0 }, (err, found) => {
                db.close();
                assert.ifError(err);
                assert.strictEqual(undefined, found[0]._id);
                assert.equal(found[0].title, 'LOTR');
                assert.strictEqual('kandinsky', found[0].def);
                assert.strictEqual(undefined, found[0].author);
                assert.strictEqual(true, Array.isArray(found[0].comments));
                assert.equal(found[0].comments.length, 1);
                assert.equal(found[0].comments[0].title, ':)');
                assert.strictEqual(undefined, found[0].comments[0]._id);
                // gh-590
                assert.ok(!found[0].comments[0].id);
                done();
            });
        });
    });

    it("included fields should have defaults applied when no value exists in db (gh-870)", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection),
            id = new DocumentObjectId();

        BlogPostB.collection.insert(
            { _id: id, title: "issue 870" }, { safe: true }, (err) => {
                assert.ifError(err);

                BlogPostB.findById(id, "def comments", (err, found) => {
                    db.close();
                    assert.ifError(err);
                    assert.ok(found);
                    assert.equal(found._id.toString(), id);
                    assert.strictEqual(undefined, found.title);
                    assert.strictEqual('kandinsky', found.def);
                    assert.strictEqual(undefined, found.author);
                    assert.strictEqual(true, Array.isArray(found.comments));
                    assert.equal(found.comments.length, 0);
                    done();
                });
            });
    });

    it("including subdoc field excludes other subdoc fields (gh-1027)", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection);

        BlogPostB.create({ comments: [{ title: "a" }, { title: "b" }] }, (err, doc) => {
            assert.ifError(err);

            BlogPostB.findById(doc._id).select("_id comments.title").exec((err, found) => {
                db.close();
                assert.ifError(err);
                assert.ok(found);
                assert.equal(doc._id.toString(), found._id.toString());
                assert.strictEqual(undefined, found.title);
                assert.strictEqual(true, Array.isArray(found.comments));
                found.comments.forEach(function (comment) {
                    assert.equal(comment.body, undefined);
                    assert.equal(comment.comments, undefined);
                    assert.equal(comment._id, undefined);
                    assert.ok(!!comment.title);
                });
                done();
            });
        });
    });

    it("excluding nested subdoc fields (gh-1027)", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection);

        BlogPostB.create({ title: "top", comments: [{ title: "a", body: "body" }, { title: "b", body: "body", comments: [{ title: "c" }] }] }, (err, doc) => {
            assert.ifError(err);

            BlogPostB.findById(doc._id).select("-_id -comments.title -comments.comments.comments -numbers").exec((err, found) => {
                db.close();
                assert.ifError(err);
                assert.ok(found);
                assert.equal(found._id, undefined);
                assert.strictEqual(found.title, 'top');
                assert.equal(found.numbers, undefined);
                assert.strictEqual(true, Array.isArray(found.comments));
                found.comments.forEach(function (comment) {
                    assert.equal(comment.title, undefined);
                    assert.equal(comment.body, 'body');
                    assert.strictEqual(Array.isArray(comment.comments), true);
                    assert.ok(comment._id);
                    comment.comments.forEach(function (comment) {
                        assert.equal(comment.title, 'c');
                        assert.equal(comment.body, undefined);
                        assert.equal(comment.comments, undefined);
                        assert.ok(comment._id);
                    });
                });
                done();
            });
        });
    });

    describe("with $elemMatch projection", () => {
        // mongodb 2.2 support

        it("casts elemMatch args (gh-1091)", (done) => {
            let db = start();

            let postSchema = new Schema({
                ids: [{ type: Schema.ObjectId }]
            });

            let B = db.model("gh-1091", postSchema);
            let _id1 = new mongoose.Types.ObjectId();
            let _id2 = new mongoose.Types.ObjectId();

            B.create({ ids: [_id1, _id2] }, (err, doc) => {
                assert.ifError(err);

                B
                    .findById(doc._id)
                    .select({ ids: { $elemMatch: { $in: [_id2.toString()] } } })
                    .exec(function (err, found) {
                        assert.ifError(err);
                        assert.ok(found);
                        assert.equal(found.id, doc.id);
                        assert.equal(found.ids.length, 1);
                        assert.equal(found.ids[0].toString(), _id2.toString());

                        B
                            .find({ _id: doc._id })
                            .select({ ids: { $elemMatch: { $in: [_id2.toString()] } } })
                            .exec(function (err, found) {
                                assert.ifError(err);
                                assert.ok(found.length);
                                found = found[0];
                                assert.equal(found.id, doc.id);
                                assert.equal(found.ids.length, 1);
                                assert.equal(found.ids[0].toString(), _id2.toString());
                                db.close(done);
                            });
                    });
            });
        });

        it("saves modified elemMatch paths (gh-1334)", (done) => {
            let db = start();

            let postSchema = new Schema({
                ids: [{ type: Schema.ObjectId }],
                ids2: [{ type: Schema.ObjectId }]
            });

            let B = db.model("gh-1334", postSchema);
            let _id1 = new mongoose.Types.ObjectId();
            let _id2 = new mongoose.Types.ObjectId();

            B.create({ ids: [_id1, _id2], ids2: [_id2, _id1] }, (err, doc) => {
                assert.ifError(err);

                B
                    .findById(doc._id)
                    .select({ ids2: { $elemMatch: { $in: [_id1.toString()] } } })
                    .exec(function (err, found) {
                        assert.ifError(err);
                        assert.equal(found.ids2.length, 1);
                        found.ids2.set(0, _id2);

                        found.save(function (err) {
                            assert.ifError(err);

                            B
                                .findById(doc._id)
                                .select({ ids: { $elemMatch: { $in: [_id2.toString()] } } })
                                .select('ids2')
                                .exec(function (err, found) {
                                    assert.equal(2, found.ids2.length);
                                    assert.equal(_id2.toHexString(), found.ids2[0].toHexString());
                                    assert.equal(_id2.toHexString(), found.ids2[1].toHexString());

                                    found.ids.pull(_id2);

                                    found.save(function (err) {
                                        assert.ok(err);

                                        db.close(done);
                                    });
                                });
                        });
                    });
            });
        });

        it("works with $ positional in select (gh-2031)", (done) => {
            let db = start();

            let postSchema = new Schema({
                tags: [{ tag: String, count: 0 }]
            });

            let Post = db.model("gh-2031", postSchema, "gh-2031");
            Post.create({ tags: [{ tag: "bacon", count: 2 }, { tag: "eggs", count: 3 }] }, (error) => {
                assert.ifError(error);
                Post.findOne({ 'tags.tag': 'eggs' }, { 'tags.$': 1 }, function (error, post) {
                    assert.ifError(error);
                    post.tags[0].count = 1;
                    post.save(function (error) {
                        assert.ok(error);
                        db.close(done);
                    });
                });
            });
        });
    });

    it("selecting an array of docs applies defaults properly (gh-1108)", (done) => {
        let db = start(),
            M = db.model(modelName, collection);

        const m = new M({ title: "1108", comments: [{ body: "yay" }] });
        m.comments[0].comments = undefined;
        m.save((err, doc) => {
            assert.ifError(err);
            M.findById(doc._id).select("comments").exec((err, found) => {
                assert.ifError(err);
                assert.ok(Array.isArray(found.comments));
                assert.equal(found.comments.length, 1);
                assert.ok(Array.isArray(found.comments[0].comments));
                db.close(done);
            });
        });
    });

    it("select properties named length (gh-3903)", (done) => {
        const db = start();

        const schema = new mongoose.Schema({
            length: Number,
            name: String
        });

        const MyModel = db.model("gh3903", schema);

        MyModel.create({ name: "val", length: 3 }, (error) => {
            assert.ifError(error);
            MyModel.findOne({}).select({ length: 1 }).exec((error, doc) => {
                assert.ifError(error);
                assert.ok(!doc.name);
                db.close(done);
            });
        });
    });

    it("appropriately filters subdocuments based on properties (gh-1280)", (done) => {
        const db = start();
        const RouteSchema = new Schema({
            stations: {
                start: {
                    name: { type: String },
                    loc: { type: [Number], index: "2d" }
                },
                end: {
                    name: { type: String },
                    loc: { type: [Number], index: "2d" }
                },
                points: [
                    {
                        name: { type: String },
                        loc: { type: [Number], index: "2d" }
                    }
                ]
            }
        });

        const Route = db.model(`Route${random()}`, RouteSchema);

        const item = {
            stations: {
                start: {
                    name: "thing",
                    loc: [1, 2]
                },
                end: {
                    name: "thingend",
                    loc: [2, 3]
                },
                points: [{ name: "rawr" }]
            }
        };

        Route.create(item, (err, i) => {
            assert.ifError(err);

            Route.findById(i.id).select("-stations").exec((err, res) => {
                assert.ifError(err);
                assert.ok(res.stations.toString() === 'undefined');

                Route.findById(i.id).select('-stations.start -stations.end').exec(function (err, res) {
                    assert.ifError(err);
                    assert.equal(res.stations.start.toString(), 'undefined');
                    assert.equal(res.stations.end.toString(), 'undefined');
                    assert.ok(Array.isArray(res.stations.points));
                    db.close(done);
                });
            });
        });
    });
});
