const CastError = adone.odm.Error.CastError;
const start = require("./common");
const mongoose = adone.odm;
const random = adone.odm.utils.random;
const Utils = adone.odm.utils;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;
const _ = require("lodash");
const uuid = require("uuid");

const {
    is
} = adone;

describe("model: findOneAndUpdate:", () => {
    let Comments;
    let BlogPost;
    let modelname;
    let collection;
    let strictSchema;
    let strictThrowSchema;

    before(() => {
        Comments = new Schema();

        Comments.add({
            title: String,
            date: Date,
            body: String,
            comments: [Comments]
        });

        BlogPost = new Schema({
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
            owners: [ObjectId],
            comments: [Comments]
        });

        BlogPost.virtual("titleWithAuthor")
            .get(function () {
                return `${this.get("title")} by ${this.get("author")}`;
            })
            .set(function (val) {
                const split = val.split(" by ");
                this.set("title", split[0]);
                this.set("author", split[1]);
            });

        BlogPost.method("cool", function () {
            return this;
        });

        BlogPost.static("woot", function () {
            return this;
        });

        modelname = "UpdateOneBlogPost";
        mongoose.model(modelname, BlogPost);

        collection = `updateoneblogposts_${random()}`;

        strictSchema = new Schema({ name: String }, { strict: true });
        mongoose.model("UpdateOneStrictSchema", strictSchema);

        strictThrowSchema = new Schema({ name: String }, { strict: "throw" });
        mongoose.model("UpdateOneStrictThrowSchema", strictThrowSchema);
    });

    it("WWW returns the edited document", (done) => {
        let db = start(),
            M = db.model(modelname, collection),
            title = `Tobi ${random()}`,
            author = `Brian ${random()}`,
            newTitle = `Woot ${random()}`,
            id0 = new DocumentObjectId(),
            id1 = new DocumentObjectId();

        const post = new M();
        post.set("title", title);
        post.author = author;
        post.meta.visitors = 0;
        post.date = new Date();
        post.published = true;
        post.mixed = { x: "ex" };
        post.numbers = [4, 5, 6, 7];
        post.owners = [id0, id1];
        post.comments = [{ body: "been there" }, { body: "done that" }];

        post.save((err) => {
            assert.ifError(err);
            M.findById(post._id, (err, cf) => {
                assert.ifError(err);
                assert.equal(cf.title, title);
                assert.equal(cf.author, author);
                assert.equal(cf.meta.visitors.valueOf(), 0);
                assert.equal(cf.date, post.date.toString());
                assert.equal(cf.published, true);
                assert.equal(cf.mixed.x, 'ex');
                assert.deepEqual([4, 5, 6, 7], cf.numbers.toObject());
                assert.equal(cf.owners.length, 2);
                assert.equal(cf.owners[0].toString(), id0.toString());
                assert.equal(cf.owners[1].toString(), id1.toString());
                assert.equal(cf.comments.length, 2);
                assert.equal(cf.comments[0].body, 'been there');
                assert.equal(cf.comments[1].body, 'done that');
                assert.ok(cf.comments[0]._id);
                assert.ok(cf.comments[1]._id);
                assert.ok(cf.comments[0]._id instanceof DocumentObjectId);
                assert.ok(cf.comments[1]._id instanceof DocumentObjectId);

                var update = {
                    title: newTitle, // becomes $set
                    $inc: { 'meta.visitors': 2 },
                    $set: { date: new Date },
                    published: false, // becomes $set
                    mixed: { x: 'ECKS', y: 'why' }, // $set
                    $pullAll: { numbers: [4, 6] },
                    $pull: { owners: id0 },
                    'comments.1.body': 8 // $set
                };

                M.findOneAndUpdate({ title: title }, update, { new: true }, function (err, up) {
                    db.close();
                    assert.equal(err && err.stack, err, null);

                    assert.equal(up.title, newTitle);
                    assert.equal(up.author, author);
                    assert.equal(up.meta.visitors.valueOf(), 2);
                    assert.equal(up.date.toString(), update.$set.date.toString());
                    assert.equal(up.published, false);
                    assert.equal(up.mixed.x, 'ECKS');
                    assert.equal(up.mixed.y, 'why');
                    assert.deepEqual([5, 7], up.numbers.toObject());
                    assert.equal(up.owners.length, 1);
                    assert.equal(up.owners[0].toString(), id1.toString());
                    assert.equal(up.comments[0].body, 'been there');
                    assert.equal(up.comments[1].body, '8');
                    assert.ok(up.comments[0]._id);
                    assert.ok(up.comments[1]._id);
                    assert.ok(up.comments[0]._id instanceof DocumentObjectId);
                    assert.ok(up.comments[1]._id instanceof DocumentObjectId);
                    done();
                });
            });
        });
    });

    describe("will correctly", () => {
        let db, ItemParentModel, ItemChildModel;

        before(() => {
            db = start();
            let itemSpec = new Schema({
                item_id: {
                    type: ObjectId, required: true, default() {
                        return new DocumentObjectId();
                    }
                },
                address: {
                    street: String,
                    zipcode: String
                },
                age: Number
            }, { _id: false });
            let itemSchema = new Schema({
                items: [itemSpec]
            });
            ItemParentModel = db.model("ItemParentModel", itemSchema);
            ItemChildModel = db.model("ItemChildModel", itemSpec);
        });

        after(() => {
            db.close();
        });

        it("update subdocument in array item", (done) => {
            let item1 = new ItemChildModel({
                address: {
                    street: "times square",
                    zipcode: "10036"
                }
            });
            let item2 = new ItemChildModel({
                address: {
                    street: "bryant park",
                    zipcode: "10030"
                }
            });
            let item3 = new ItemChildModel({
                address: {
                    street: "queens",
                    zipcode: "1002?"
                }
            });
            let itemParent = new ItemParentModel({ items: [item1, item2, item3] });
            itemParent.save((err) => {
                assert.ifError(err);
                ItemParentModel.findOneAndUpdate(
                    { _id: itemParent._id, 'items.item_id': item1.item_id },
                    { $set: { 'items.$.address': {} } },
                    { new: true },
                    function (err, updatedDoc) {
                        assert.ifError(err);
                        assert.ok(updatedDoc.items);
                        assert.ok(updatedDoc.items instanceof Array);
                        assert.ok(updatedDoc.items.length, 3);
                        assert.ok(Utils.isObject(updatedDoc.items[0].address));
                        assert.ok(Object.keys(updatedDoc.items[0].address).length, 0);
                        done();
                    }
                );
            });
        });
    });

    it("returns the original document", (done) => {
        let db = start(),
            M = db.model(modelname, collection),
            title = `Tobi ${random()}`,
            author = `Brian ${random()}`,
            newTitle = `Woot ${random()}`,
            id0 = new DocumentObjectId(),
            id1 = new DocumentObjectId();

        const post = new M();
        post.set("title", title);
        post.author = author;
        post.meta.visitors = 0;
        post.date = new Date();
        post.published = true;
        post.mixed = { x: "ex" };
        post.numbers = [4, 5, 6, 7];
        post.owners = [id0, id1];
        post.comments = [{ body: "been there" }, { body: "done that" }];

        post.save((err) => {
            assert.ifError(err);
            M.findById(post._id, (err) => {
                assert.ifError(err);

                var update = {
                    title: newTitle, // becomes $set
                    $inc: { 'meta.visitors': 2 },
                    $set: { date: new Date },
                    published: false, // becomes $set
                    mixed: { x: 'ECKS', y: 'why' }, // $set
                    $pullAll: { numbers: [4, 6] },
                    $pull: { owners: id0 },
                    'comments.1.body': 8 // $set
                };

                M.findOneAndUpdate({ title: title }, update, { new: false }, function (err, up) {
                    db.close();
                    assert.ifError(err);

                    assert.equal(up.title, post.title);
                    assert.equal(up.author, post.author);
                    assert.equal(up.meta.visitors.valueOf(), post.meta.visitors);
                    assert.equal(post.date.toString(), up.date.toString());
                    assert.equal(post.published, up.published);
                    assert.equal(post.mixed.x, up.mixed.x);
                    assert.equal(post.mixed.y, up.mixed.y);
                    assert.deepEqual(up.numbers.toObject(), post.numbers.toObject());
                    assert.equal(post.owners.length, up.owners.length);
                    assert.equal(post.owners[0].toString(), up.owners[0].toString());
                    assert.equal(post.comments[0].body, up.comments[0].body);
                    assert.equal(post.comments[1].body, up.comments[1].body);
                    assert.ok(up.comments[0]._id);
                    assert.ok(up.comments[1]._id);
                    assert.ok(up.comments[0]._id instanceof DocumentObjectId);
                    assert.ok(up.comments[1]._id instanceof DocumentObjectId);
                    done();
                });
            });
        });
    });

    it("allows upserting", (done) => {
        let db = start(),
            M = db.model(modelname, collection),
            title = `Tobi ${random()}`,
            author = `Brian ${random()}`,
            newTitle = `Woot ${random()}`,
            id0 = new DocumentObjectId(),
            id1 = new DocumentObjectId();

        const post = new M();
        post.set("title", title);
        post.author = author;
        post.meta.visitors = 0;
        post.date = new Date();
        post.published = true;
        post.mixed = { x: "ex" };
        post.numbers = [4, 5, 6, 7];
        post.owners = [id0, id1];
        post.comments = [{ body: "been there" }, { body: "done that" }];

        const update = {
            title: newTitle, // becomes $set
            $inc: { "meta.visitors": 2 },
            $set: { date: new Date() },
            published: false, // becomes $set
            mixed: { x: "ECKS", y: "why" }, // $set
            $pullAll: { numbers: [4, 6] },
            $pull: { owners: id0 }
        };

        M.findOneAndUpdate({ title }, update, { upsert: true, new: true }, (err, up) => {
            db.close();
            assert.ifError(err);

            assert.equal(up.title, newTitle);
            assert.equal(up.meta.visitors.valueOf(), 2);
            assert.equal(update.$set.date.toString(), up.date.toString());
            assert.equal(up.published, update.published);
            assert.deepEqual(update.mixed.x, up.mixed.x);
            assert.strictEqual(up.mixed.y, update.mixed.y);
            assert.ok(is.array(up.numbers));
            assert.ok(is.array(up.owners));
            assert.strictEqual(0, up.numbers.length);
            assert.strictEqual(0, up.owners.length);
            done();
        });
    });

    it("options/conditions/doc are merged when no callback is passed", (done) => {
        let db = start(),
            M = db.model(modelname, collection);

        db.close();

        let now = new Date(),
            query;

        // Model.findOneAndUpdate
        query = M.findOneAndUpdate({ author: "aaron" }, { $set: { date: now } }, { new: false, fields: "author" });
        assert.strictEqual(false, query.options.new);
        assert.strictEqual(1, query._fields.author);
        assert.equal(query._update.$set.date.toString(), now.toString());
        assert.strictEqual("aaron", query._conditions.author);

        query = M.findOneAndUpdate({ author: "aaron" }, { $set: { date: now } });
        assert.strictEqual(undefined, query.options.new);
        assert.equal(query._update.$set.date.toString(), now.toString());
        assert.strictEqual("aaron", query._conditions.author);

        query = M.findOneAndUpdate({ $set: { date: now } });
        assert.strictEqual(undefined, query.options.new);
        assert.equal(query._update.$set.date.toString(), now.toString());
        assert.strictEqual(undefined, query._conditions.author);

        query = M.findOneAndUpdate();
        assert.strictEqual(undefined, query.options.new);
        assert.equal(query._update, undefined);
        assert.strictEqual(undefined, query._conditions.author);

        // Query.findOneAndUpdate
        query = M.where("author", "aaron").findOneAndUpdate({ date: now });
        assert.strictEqual(undefined, query.options.new);
        assert.equal(query._update.date.toString(), now.toString());
        assert.strictEqual("aaron", query._conditions.author);

        query = M.find().findOneAndUpdate({ author: "aaron" }, { date: now });
        assert.strictEqual(undefined, query.options.new);
        assert.equal(query._update.date.toString(), now.toString());
        assert.strictEqual("aaron", query._conditions.author);

        query = M.find().findOneAndUpdate({ date: now });
        assert.strictEqual(undefined, query.options.new);
        assert.equal(query._update.date.toString(), now.toString());
        assert.strictEqual(undefined, query._conditions.author);

        query = M.find().findOneAndUpdate();
        assert.strictEqual(undefined, query.options.new);
        assert.equal(query._update, undefined);
        assert.strictEqual(undefined, query._conditions.author);
        done();
    });

    it("executes when a callback is passed", (done) => {
        let db = start(),
            M = db.model(modelname, collection + random()),
            pending = 6;

        M.findOneAndUpdate({ name: "aaron" }, { $set: { name: "Aaron6" } }, { new: false }, cb);
        M.findOneAndUpdate({ name: "aaron" }, { $set: { name: "Aaron4" } }, cb);
        M.where().findOneAndUpdate({ name: "aaron" }, { $set: { name: "Aaron1" } }, { new: false }, cb);
        M.where().findOneAndUpdate({ name: "aaron" }, { $set: { name: "Aaron2" } }, cb);
        M.where().findOneAndUpdate({ $set: { name: "Aaron6" } }, cb);
        M.where("name", "aaron").findOneAndUpdate({ $set: { name: "Aaron" } }).findOneAndUpdate(cb);

        function cb(err, doc) {
            assert.ifError(err);
            assert.strictEqual(null, doc); // not an upsert, no previously existing doc
            if (--pending) {
                return;
            }
            db.close();
            done();
        }
    });

    it("executes when a callback is passed to a succeeding function", (done) => {
        let db = start(),
            M = db.model(modelname, collection + random()),
            pending = 6;

        M.findOneAndUpdate({ name: "aaron" }, { $set: { name: "Aaron" } }, { new: false }).exec(cb);
        M.findOneAndUpdate({ name: "aaron" }, { $set: { name: "Aaron" } }).exec(cb);
        M.where().findOneAndUpdate({ name: "aaron" }, { $set: { name: "Aaron" } }, { new: false }).exec(cb);
        M.where().findOneAndUpdate({ name: "aaron" }, { $set: { name: "Aaron" } }).exec(cb);
        M.where().findOneAndUpdate({ $set: { name: "Aaron" } }).exec(cb);
        M.where("name", "aaron").findOneAndUpdate({ $set: { name: "Aaron" } }).exec(cb);

        function cb(err, doc) {
            assert.ifError(err);
            assert.strictEqual(null, doc); // not an upsert, no previously existing doc
            if (--pending) {
                return;
            }
            db.close();
            done();
        }
    });

    it("executing with only a callback throws", (done) => {
        let db = start(),
            M = db.model(modelname, collection),
            err;

        try {
            M.findOneAndUpdate(() => {
            });
        } catch (e) {
            err = e;
        }

        db.close();
        assert.ok(/First argument must not be a function/.test(err));
        done();
    });

    it("updates numbers atomically", (done) => {
        let db = start(),
            BlogPost = db.model(modelname, collection),
            totalDocs = 4;

        const post = new BlogPost();
        post.set("meta.visitors", 5);

        post.save((err) => {
            assert.ifError(err);

            function callback(err) {
                assert.ifError(err);
                --totalDocs || complete();
            }

            for (let i = 0; i < 4; ++i) {
                BlogPost
                    .findOneAndUpdate({ _id: post._id }, { $inc: { "meta.visitors": 1 } }, callback);
            }

            function complete() {
                BlogPost.findOne({ _id: post.get("_id") }, (err, doc) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(doc.get('meta.visitors'), 9);
                    done();
                });
            }
        });
    });

    it("honors strict schemas", (done) => {
        const db = start();
        const S = db.model("UpdateOneStrictSchema");
        const s = new S({ name: "orange crush" });

        s.save((err) => {
            assert.ifError(err);
            let name = Date.now();
            S.findOneAndUpdate({ name }, { ignore: true }, { upsert: true, new: true }, (err, doc) => {
                assert.ifError(err);
                assert.ok(doc);
                assert.ok(doc._id);
                assert.equal(doc.ignore, undefined);
                assert.equal(doc._doc.ignore, undefined);
                assert.equal(doc.name, name);
                S.findOneAndUpdate({ name: 'orange crush' }, { ignore: true }, { upsert: true }, function (err, doc) {
                    assert.ifError(err);
                    assert.ok(!doc.ignore);
                    assert.ok(!doc._doc.ignore);
                    assert.equal(doc.name, 'orange crush');
                    S.findOneAndUpdate({ name: 'orange crush' }, { ignore: true }, function (err, doc) {
                        db.close();
                        assert.ifError(err);
                        assert.ok(!doc.ignore);
                        assert.ok(!doc._doc.ignore);
                        assert.equal(doc.name, 'orange crush');
                        done();
                    });
                });
            });
        });
    });

    it("returns errors with strict:throw schemas", (done) => {
        const db = start();
        const S = db.model("UpdateOneStrictThrowSchema");
        const s = new S({ name: "orange crush" });

        s.save((err) => {
            assert.ifError(err);

            let name = Date.now();
            S.findOneAndUpdate({ name }, { ignore: true }, { upsert: true }, (err, doc) => {
                assert.ok(err);
                assert.ok(/not in schema/.test(err));
                assert.ok(!doc);

                S.findOneAndUpdate({ _id: s._id }, { ignore: true }, function (err, doc) {
                    db.close();
                    assert.ok(err);
                    assert.ok(/not in schema/.test(err));
                    assert.ok(!doc);
                    done();
                });
            });
        });
    });

    it("executing with just a callback throws", (done) => {
        let db = start(),
            M = db.model(modelname, collection),
            err;

        try {
            M.findByIdAndUpdate(() => {
            });
        } catch (e) {
            err = e;
        }

        db.close();
        assert.ok(/First argument must not be a function/.test(err));
        done();
    });

    it("executes when a callback is passed", (done) => {
        let db = start(),
            M = db.model(modelname, collection + random()),
            _id = new DocumentObjectId(),
            pending = 2;

        M.findByIdAndUpdate(_id, { $set: { name: "Aaron" } }, { new: false }, cb);
        M.findByIdAndUpdate(_id, { $set: { name: "changed" } }, cb);

        function cb(err, doc) {
            assert.ifError(err);
            assert.strictEqual(null, doc); // no previously existing doc
            if (--pending) {
                return;
            }
            db.close(done);
        }
    });

    it("executes when a callback is passed to a succeeding function", (done) => {
        let db = start(),
            M = db.model(modelname, collection + random()),
            _id = new DocumentObjectId(),
            pending = 2;

        M.findByIdAndUpdate(_id, { $set: { name: "Aaron" } }, { new: false }).exec(cb);
        M.findByIdAndUpdate(_id, { $set: { name: "changed" } }).exec(cb);

        function cb(err, doc) {
            assert.ifError(err);
            assert.strictEqual(null, doc); // no previously existing doc
            if (--pending) {
                return;
            }
            db.close(done);
        }
    });

    it("returns the original document", (done) => {
        let db = start(),
            M = db.model(modelname, collection),
            title = `Tobi ${random()}`,
            author = `Brian ${random()}`,
            newTitle = `Woot ${random()}`,
            id0 = new DocumentObjectId(),
            id1 = new DocumentObjectId();

        const post = new M();
        post.set("title", title);
        post.author = author;
        post.meta.visitors = 0;
        post.date = new Date();
        post.published = true;
        post.mixed = { x: "ex" };
        post.numbers = [4, 5, 6, 7];
        post.owners = [id0, id1];
        post.comments = [{ body: "been there" }, { body: "done that" }];

        post.save((err) => {
            assert.ifError(err);
            M.findById(post._id, (err) => {
                assert.ifError(err);

                var update = {
                    title: newTitle, // becomes $set
                    $inc: { 'meta.visitors': 2 },
                    $set: { date: new Date },
                    published: false, // becomes $set
                    mixed: { x: 'ECKS', y: 'why' }, // $set
                    $pullAll: { numbers: [4, 6] },
                    $pull: { owners: id0 },
                    'comments.1.body': 8 // $set
                };

                M.findByIdAndUpdate(post.id, update, { new: false }, function (err, up) {
                    assert.ifError(err);

                    assert.equal(post.title, up.title);
                    assert.equal(post.author, up.author);
                    assert.equal(post.meta.visitors, up.meta.visitors.valueOf());
                    assert.equal(post.date.toString(), up.date.toString());
                    assert.equal(post.published, up.published);
                    assert.equal(post.mixed.x, up.mixed.x);
                    assert.strictEqual(up.mixed.y, post.mixed.y);
                    assert.deepEqual(up.numbers.toObject(), post.numbers.toObject());
                    assert.equal(post.owners.length, up.owners.length);
                    assert.equal(post.owners[0].toString(), up.owners[0].toString());
                    assert.equal(post.comments[0].body, up.comments[0].body);
                    assert.equal(post.comments[1].body, up.comments[1].body);
                    assert.ok(up.comments[0]._id);
                    assert.ok(up.comments[1]._id);
                    assert.ok(up.comments[0]._id instanceof DocumentObjectId);
                    assert.ok(up.comments[1]._id instanceof DocumentObjectId);
                    db.close(done);
                });
            });
        });
    });

    it("options/conditions/doc are merged when no callback is passed", (done) => {
        let db = start(),
            M = db.model(modelname, collection),
            _id = new DocumentObjectId();

        let now = new Date(),
            query;

        // Model.findByIdAndUpdate
        query = M.findByIdAndUpdate(_id, { $set: { date: now } }, { new: false, fields: "author" });
        assert.strictEqual(false, query.options.new);
        assert.strictEqual(1, query._fields.author);
        assert.equal(query._update.$set.date.toString(), now.toString());
        assert.strictEqual(_id.toString(), query._conditions._id.toString());

        query = M.findByIdAndUpdate(_id, { $set: { date: now } });
        assert.strictEqual(undefined, query.options.new);
        assert.equal(query._update.$set.date.toString(), now.toString());
        assert.strictEqual(_id.toString(), query._conditions._id.toString());

        query = M.findByIdAndUpdate(_id);
        assert.strictEqual(undefined, query.options.new);
        assert.strictEqual(_id, query._conditions._id);

        query = M.findByIdAndUpdate();
        assert.strictEqual(undefined, query.options.new);
        assert.equal(query._update, undefined);
        assert.strictEqual(undefined, query._conditions._id);
        db.close(done);
    });

    it("supports v3 select string syntax", (done) => {
        let db = start(),
            M = db.model(modelname, collection),
            _id = new DocumentObjectId();

        let now = new Date(),
            query;

        query = M.findByIdAndUpdate(_id, { $set: { date: now } }, { select: "author -title" });
        assert.strictEqual(1, query._fields.author);
        assert.strictEqual(0, query._fields.title);

        query = M.findOneAndUpdate({}, { $set: { date: now } }, { select: "author -title" });
        assert.strictEqual(1, query._fields.author);
        assert.strictEqual(0, query._fields.title);
        db.close(done);
    });

    it("supports v3 select object syntax", (done) => {
        let db = start(),
            M = db.model(modelname, collection),
            _id = new DocumentObjectId();

        let now = new Date(),
            query;

        query = M.findByIdAndUpdate(_id, { $set: { date: now } }, { select: { author: 1, title: 0 } });
        assert.strictEqual(1, query._fields.author);
        assert.strictEqual(0, query._fields.title);

        query = M.findOneAndUpdate({}, { $set: { date: now } }, { select: { author: 1, title: 0 } });
        assert.strictEqual(1, query._fields.author);
        assert.strictEqual(0, query._fields.title);
        db.close(done);
    });

    it("supports v3 sort string syntax", (done) => {
        let db = start(),
            M = db.model(modelname, collection);

        const now = new Date();
        const _id = new DocumentObjectId();
        let query;

        query = M.findByIdAndUpdate(_id, { $set: { date: now } }, { sort: "author -title" });
        assert.equal(Object.keys(query.options.sort).length, 2);
        assert.equal(query.options.sort.author, 1);
        assert.equal(query.options.sort.title, -1);

        query = M.findOneAndUpdate({}, { $set: { date: now } }, { sort: "author -title" });
        assert.equal(Object.keys(query.options.sort).length, 2);
        assert.equal(query.options.sort.author, 1);
        assert.equal(query.options.sort.title, -1);

        // gh-1887
        M.create(
            { title: 1, meta: { visitors: 0 } }
            , { title: 2, meta: { visitors: 10 } }
            , { title: 3, meta: { visitors: 5 } }
            , (err) => {
                if (err) {
                    return done(err);
                }

                M.findOneAndUpdate({}, { title: "changed" })
                    .sort({ "meta.visitors": -1 })
                    .exec((err, doc) => {
                        if (err) {
                            return done(err);
                        }
                        assert.equal(doc.meta.visitors, 10);
                        db.close(done);
                    });
            });
    });

    it("supports v3 sort object syntax", (done) => {
        let db = start(),
            M = db.model(modelname, collection),
            _id = new DocumentObjectId();

        let now = new Date(),
            query;

        query = M.findByIdAndUpdate(_id, { $set: { date: now } }, { sort: { author: 1, title: -1 } });
        assert.equal(Object.keys(query.options.sort).length, 2);
        assert.equal(query.options.sort.author, 1);
        assert.equal(query.options.sort.title, -1);

        query = M.findOneAndUpdate(_id, { $set: { date: now } }, { sort: { author: 1, title: -1 } });
        assert.equal(Object.keys(query.options.sort).length, 2);
        assert.equal(query.options.sort.author, 1);
        assert.equal(query.options.sort.title, -1);

        db.close(done);
    });

    it("supports $elemMatch with $in (gh-1091 gh-1100)", (done) => {
        const db = start();

        const postSchema = new Schema({
            ids: [{ type: Schema.ObjectId }],
            title: String
        });

        const B = db.model("gh-1091+1100", postSchema);
        const _id1 = new mongoose.Types.ObjectId();
        const _id2 = new mongoose.Types.ObjectId();

        B.create({ ids: [_id1, _id2] }, (err, doc) => {
            assert.ifError(err);

            B
                .findByIdAndUpdate(doc._id, { title: "woot" }, { new: true })
                .select({ title: 1, ids: { $elemMatch: { $in: [_id2.toString()] } } })
                .exec((err, found) => {
                    assert.ifError(err);
                    assert.ok(found);
                    assert.equal(doc.id, found.id);
                    assert.equal(found.title, 'woot');
                    assert.equal(found.ids.length, 1);
                    assert.equal(found.ids[0].toString(), _id2.toString());
                    db.close(done);
                });
        });
    });

    it("supports population (gh-1395)", (done) => {
        const db = start();
        const M = db.model("A", { name: String });
        const N = db.model("B", { a: { type: Schema.ObjectId, ref: "A" }, i: Number });

        M.create({ name: "i am an A" }, (err, a) => {
            if (err) {
                return done(err);
            }
            N.create({ a: a._id, i: 10 }, (err, b) => {
                if (err) {
                    return done(err);
                }

                N.findOneAndUpdate({ _id: b._id }, { $inc: { i: 1 } })
                    .populate('a')
                    .exec(function (err, doc) {
                        if (err) {
                            return done(err);
                        }
                        assert.ok(doc);
                        assert.ok(doc.a);
                        assert.equal('i am an A', doc.a.name);
                        db.close(done);
                    });
            });
        });
    });
    it("returns null when doing an upsert & new=false gh-1533", (done) => {
        const db = start();

        const thingSchema = new Schema({
            _id: String,
            flag: {
                type: Boolean,
                default: false
            }
        });

        const Thing = db.model("Thing", thingSchema);
        const key = "some-id";

        Thing.findOneAndUpdate({ _id: key }, { $set: { flag: false } }, { upsert: true, new: false }).exec((err, thing) => {
            assert.ifError(err);
            assert.equal(thing, null);
            Thing.findOneAndUpdate({ _id: key }, { $set: { flag: false } }, { upsert: true, new: false }).exec((err, thing2) => {
                assert.ifError(err);
                assert.equal(thing2.id, key);
                assert.equal(thing2.flag, false);
                db.close(done);
            });
        });
    });

    it("allows properties to be set to null gh-1643", (done) => {
        const db = start();

        const thingSchema = new Schema({
            name: [String]
        });

        const Thing = db.model("Thing", thingSchema);

        Thing.create({ name: ["Test"] }, (err, thing) => {
            if (err) {
                return done(err);
            }
            Thing.findOneAndUpdate({ _id: thing._id }, { name: null }, { new: true })
                .exec((err, doc) => {
                    if (err) {
                        return done(err);
                    }
                    assert.ok(doc);
                    assert.equal(null, doc.name);
                    db.close(done);
                });
        });
    });

    it("honors the overwrite option (gh-1809)", (done) => {
        const db = start();
        const M = db.model("1809", { name: String, change: Boolean });
        M.create({ name: "first" }, (err, doc) => {
            if (err) {
                return done(err);
            }
            M.findByIdAndUpdate(doc._id, { change: true }, { overwrite: true, new: true }, (err, doc) => {
                if (err) {
                    return done(err);
                }
                assert.ok(doc.change);
                assert.equal(doc.name, undefined);
                db.close(done);
            });
        });
    });

    it("can do deep equals on object id after findOneAndUpdate (gh-2070)", (done) => {
        const db = start();

        const accountSchema = new Schema({
            name: String,
            contacts: [{
                account: { type: Schema.Types.ObjectId, ref: "Account" },
                name: String
            }]
        });

        const Account = db.model("2070", accountSchema);

        const a1 = new Account({ name: "parent" });
        const a2 = new Account({ name: "child" });

        a1.save((error) => {
            assert.ifError(error);
            a2.save((error, a2) => {
                assert.ifError(error);
                Account.findOneAndUpdate(
                    { name: 'parent' },
                    { $push: { contacts: { account: a2._id, name: 'child' } } },
                    { new: true },
                    function (error, doc) {
                        assert.ifError(error);
                        assert.ok(Utils.deepEqual(doc.contacts[0].account, a2._id));
                        assert.ok(_.isEqualWith(doc.contacts[0].account, a2._id, compareBuffers));
                        // Re: commends on https://github.com/mongodb/js-bson/commit/aa0b54597a0af28cce3530d2144af708e4b66bf0
                        // Deep equality checks no longer work as expected with node 0.10.
                        // Please file an issue if this is a problem for you
                        if (!/^v0.10.\d+$/.test(process.version)) {
                            assert.ok(_.isEqual(doc.contacts[0].account, a2._id));
                        }

                        Account.findOne({ name: 'parent' }, function (error, doc) {
                            assert.ifError(error);
                            assert.ok(Utils.deepEqual(doc.contacts[0].account, a2._id));
                            assert.ok(_.isEqualWith(doc.contacts[0].account, a2._id, compareBuffers));
                            if (!/^v0.10.\d+$/.test(process.version)) {
                                assert.ok(_.isEqual(doc.contacts[0].account, a2._id));
                            }
                            db.close(done);
                        });
                    });
            });
        });

        function compareBuffers(a, b) {
            if (is.buffer(a) && is.buffer(b)) {
                return a.toString("hex") === b.toString("hex");
            }
        }
    });

    it("adds __v on upsert (gh-2122) (gh-4505)", (done) => {
        const db = start();

        const accountSchema = new Schema({
            name: String
        });

        const Account = db.model("2122", accountSchema);

        Account.findOneAndUpdate(
            { name: "account" },
            { name: "test" },
            { upsert: true, new: true },
            (error, doc) => {
                assert.ifError(error);
                assert.equal(doc.__v, 0);
                Account.update({ name: "test" }, {}, { upsert: true }, (error) => {
                    assert.ifError(error);
                    Account.findOne({ name: 'test' }, function (error, doc) {
                        assert.ifError(error);
                        assert.equal(doc.__v, 0);
                        db.close(done);
                    });
                });
            });
    });

    it("works with nested schemas and $pull+$or (gh-1932)", (done) => {
        const db = start();

        const TickSchema = new Schema({ name: String });
        const TestSchema = new Schema({ a: Number, b: Number, ticks: [TickSchema] });

        const TestModel = db.model("gh-1932", TestSchema, "gh-1932");

        TestModel.create({ a: 1, b: 0, ticks: [{ name: "eggs" }, { name: "bacon" }, { name: "coffee" }] }, (error) => {
            assert.ifError(error);
            TestModel.findOneAndUpdate({ a: 1 }, { $pull: { ticks: { $or: [{ name: "eggs" }, { name: "bacon" }] } } },
                (error) => {
                    assert.ifError(error);
                    TestModel.findOne({}, function (error, doc) {
                        assert.ifError(error);
                        assert.equal(doc.ticks.length, 1);
                        assert.equal(doc.ticks[0].name, 'coffee');
                        db.close(done);
                    });
                });
        });
    });

    it("accepts undefined", (done) => {
        const db = start();

        const s = new Schema({
            time: Date,
            base: String
        });

        const Breakfast = db.model("gh-2272", s);

        Breakfast.
            findOneAndUpdate({}, { time: undefined, base: undefined }, {}).
            exec((error) => {
                assert.ifError(error);
                db.close(done);
            });
    });

    it("cast errors for empty objects as object ids (gh-2732)", (done) => {
        const db = start();

        const s = new Schema({
            base: ObjectId
        });

        const Breakfast = db.model("gh2732", s);

        Breakfast.
            findOneAndUpdate({}, { base: {} }, {}).
            exec((error) => {
                assert.ok(error);
                db.close(done);
            });
    });

    it("strict mode with objects (gh-2947)", (done) => {
        const db = start();

        const s = new Schema({
            test: String
        }, { strict: true });

        const Breakfast = db.model("gh2947", s);
        const q = Breakfast.findOneAndUpdate({},
            { notInSchema: { a: 1 }, test: "abc" },
            { new: true, strict: true, upsert: true });

        q.lean();
        q.exec((error, doc) => {
            assert.ok(!doc.notInSchema);
            db.close(done);
        });
    });

    describe("middleware", () => {
        let db;

        beforeEach(() => {
            db = start();
        });

        afterEach((done) => {
            db.close(done);
        });

        it("works", (done) => {
            let s = new Schema({
                topping: { type: String, default: "bacon" },
                base: String
            });

            let preCount = 0;
            s.pre("findOneAndUpdate", () => {
                ++preCount;
            });

            let postCount = 0;
            s.post("findOneAndUpdate", () => {
                ++postCount;
            });

            let Breakfast = db.model("gh-964", s);

            Breakfast.findOneAndUpdate(
                {},
                { base: "eggs" },
                {},
                (error) => {
                    assert.ifError(error);
                    assert.equal(preCount, 1);
                    assert.equal(postCount, 1);
                    done();
                });
        });

        it("works with exec()", (done) => {
            let s = new Schema({
                topping: { type: String, default: "bacon" },
                base: String
            });

            let preCount = 0;
            s.pre("findOneAndUpdate", () => {
                ++preCount;
            });

            let postCount = 0;
            s.post("findOneAndUpdate", () => {
                ++postCount;
            });

            let Breakfast = db.model("gh-964-2", s);

            Breakfast.
                findOneAndUpdate({}, { base: "eggs" }, {}).
                exec((error) => {
                    assert.ifError(error);
                    assert.equal(preCount, 1);
                    assert.equal(postCount, 1);
                    done();
                });
        });
    });

    describe("validators (gh-860)", () => {
        it("applies defaults on upsert", (done) => {
            let db = start();

            let s = new Schema({
                topping: { type: String, default: "bacon" },
                base: String
            });
            let Breakfast = db.model("fam-gh-860-0", s);

            let updateOptions = { upsert: true, setDefaultsOnInsert: true, new: true };
            Breakfast.findOneAndUpdate(
                {},
                { base: "eggs" },
                updateOptions,
                (error, breakfast) => {
                    assert.ifError(error);
                    assert.equal(breakfast.base, 'eggs');
                    assert.equal(breakfast.topping, 'bacon');
                    Breakfast.count({ topping: 'bacon' }, function (error, count) {
                        assert.ifError(error);
                        assert.equal(1, count);
                        db.close(done);
                    });
                });
        });

        it("doesnt set default on upsert if query sets it", (done) => {
            let db = start();

            let s = new Schema({
                topping: { type: String, default: "bacon" },
                numEggs: { type: Number, default: 3 },
                base: String
            }, { versionKey: null });
            let Breakfast = db.model("fam-gh-860-1", s);

            let updateOptions = { upsert: true, setDefaultsOnInsert: true, new: true };
            Breakfast.findOneAndUpdate(
                { topping: "sausage", numEggs: 4 },
                { base: "eggs" },
                updateOptions,
                (error, breakfast) => {
                    assert.ifError(error);
                    assert.equal(breakfast.base, 'eggs');
                    assert.equal(breakfast.topping, 'sausage');
                    assert.equal(breakfast.numEggs, 4);
                    db.close();
                    done();
                });
        });

        it("properly sets default on upsert if query wont set it", (done) => {
            let db = start();

            let s = new Schema({
                topping: { type: String, default: "bacon" },
                base: String
            });
            let Breakfast = db.model("fam-gh-860-2", s);

            let updateOptions = { upsert: true, setDefaultsOnInsert: true, new: true };
            Breakfast.findOneAndUpdate(
                { topping: { $ne: "sausage" } },
                { base: "eggs" },
                updateOptions,
                (error, breakfast) => {
                    assert.ifError(error);
                    assert.equal(breakfast.base, 'eggs');
                    assert.equal(breakfast.topping, 'bacon');
                    Breakfast.count({ topping: 'bacon' }, function (error, count) {
                        assert.ifError(error);
                        assert.equal(1, count);
                        db.close(done);
                    });
                });
        });

        it("runs validators if theyre set", (done) => {
            let db = start();

            let s = new Schema({
                topping: {
                    type: String,
                    validate() {
                        return false;
                    }
                },
                base: {
                    type: String,
                    validate() {
                        return true;
                    }
                }
            });
            let Breakfast = db.model("fam-gh-860-3", s);

            let updateOptions = {
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true,
                new: true
            };
            Breakfast.findOneAndUpdate(
                {},
                { topping: "bacon", base: "eggs" },
                updateOptions,
                (error, breakfast) => {
                    assert.ok(!!error);
                    assert.ok(!breakfast);
                    assert.equal(Object.keys(error.errors).length, 1);
                    assert.equal(Object.keys(error.errors)[0], 'topping');
                    assert.equal(error.errors.topping.message, 'Validator failed for path `topping` with value `bacon`');

                    assert.ok(!breakfast);
                    db.close();
                    done();
                });
        });

        it("validators handle $unset and $setOnInsert", (done) => {
            let db = start();

            let s = new Schema({
                steak: { type: String, required: true },
                eggs: {
                    type: String, validate() {
                        return false;
                    }
                }
            });
            let Breakfast = db.model("fam-gh-860-4", s);

            let updateOptions = { runValidators: true, new: true };
            Breakfast.findOneAndUpdate(
                {},
                { $unset: { steak: "" }, $setOnInsert: { eggs: "softboiled" } },
                updateOptions,
                (error, breakfast) => {
                    assert.ok(!!error);
                    assert.ok(!breakfast);
                    assert.equal(Object.keys(error.errors).length, 2);
                    assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
                    assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
                    assert.equal(error.errors.eggs.message, 'Validator failed for path `eggs` with value `softboiled`');
                    assert.equal(error.errors.steak.message, 'Path `steak` is required.');
                    db.close();
                    done();
                });
        });

        it("min/max, enum, and regex built-in validators work", (done) => {
            let db = start();

            let s = new Schema({
                steak: { type: String, enum: ["ribeye", "sirloin"] },
                eggs: { type: Number, min: 4, max: 6 },
                bacon: { type: String, match: /strips/ }
            });
            let Breakfast = db.model("fam-gh-860-5", s);

            let updateOptions = { runValidators: true, new: true };
            Breakfast.findOneAndUpdate(
                {},
                { $set: { steak: "ribeye", eggs: 3, bacon: "3 strips" } },
                updateOptions,
                (error) => {
                    assert.ok(!!error);
                    assert.equal(Object.keys(error.errors).length, 1);
                    assert.equal(Object.keys(error.errors)[0], 'eggs');
                    assert.equal(error.errors.eggs.message, 'Path `eggs` (3) is less than minimum allowed value (4).');

                    Breakfast.findOneAndUpdate(
                        {},
                        { $set: { steak: 'tofu', eggs: 5, bacon: '3 strips' } },
                        updateOptions,
                        function (error) {
                            assert.ok(!!error);
                            assert.equal(Object.keys(error.errors).length, 1);
                            assert.equal(Object.keys(error.errors)[0], 'steak');
                            assert.equal(error.errors.steak, '`tofu` is not a valid enum value for path `steak`.');

                            Breakfast.findOneAndUpdate(
                                {},
                                { $set: { steak: 'sirloin', eggs: 6, bacon: 'none' } },
                                updateOptions,
                                function (error) {
                                    assert.ok(!!error);
                                    assert.equal(Object.keys(error.errors).length, 1);
                                    assert.equal(Object.keys(error.errors)[0], 'bacon');
                                    assert.equal(error.errors.bacon.message, 'Path `bacon` is invalid (none).');

                                    db.close();
                                    done();
                                });
                        });
                });
        });

        it("multiple validation errors", (done) => {
            let db = start();

            let s = new Schema({
                steak: { type: String, enum: ["ribeye", "sirloin"] },
                eggs: { type: Number, min: 4, max: 6 },
                bacon: { type: String, match: /strips/ }
            });
            let Breakfast = db.model("fam-gh-860-6", s);

            let updateOptions = { runValidators: true, new: true };
            Breakfast.findOneAndUpdate(
                {},
                { $set: { steak: "tofu", eggs: 2, bacon: "3 strips" } },
                updateOptions,
                (error, breakfast) => {
                    assert.ok(!!error);
                    assert.equal(Object.keys(error.errors).length, 2);
                    assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
                    assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
                    assert.ok(!breakfast);
                    db.close();
                    done();
                });
        });

        it("validators ignore $inc", (done) => {
            let db = start();

            let s = new Schema({
                steak: { type: String, required: true },
                eggs: { type: Number, min: 4 }
            });
            let Breakfast = db.model("fam-gh-860-7", s);

            let updateOptions = { runValidators: true, upsert: true, new: true };
            Breakfast.findOneAndUpdate(
                {},
                { $inc: { eggs: 1 } },
                updateOptions,
                (error, breakfast) => {
                    assert.ifError(error);
                    assert.ok(!!breakfast);
                    assert.equal(breakfast.eggs, 1);
                    db.close(done);
                });
        });

        it("should work with arrays (gh-3035)", (done) => {
            let db = start();

            let testSchema = new mongoose.Schema({
                id: String,
                name: String,
                a: [String],
                _createdAt: {
                    type: Number,
                    default: Date.now
                }
            });

            let TestModel = db.model("gh3035", testSchema);
            TestModel.create({ id: "1" }, (error) => {
                assert.ifError(error);
                TestModel.findOneAndUpdate({ id: '1' }, { $set: { name: 'Joe' } }, { upsert: true, setDefaultsOnInsert: true },
                    function (error) {
                        assert.ifError(error);
                        db.close(done);
                    });
            });
        });

        it("should allow null values in query (gh-3135)", (done) => {
            let db = start();

            let testSchema = new mongoose.Schema({
                id: String,
                blob: ObjectId,
                status: String
            });

            let TestModel = db.model("gh3135", testSchema);
            TestModel.create({ blob: null, status: "active" }, (error) => {
                assert.ifError(error);
                TestModel.findOneAndUpdate({ id: '1', blob: null }, { $set: { status: 'inactive' } }, { upsert: true, setDefaultsOnInsert: true },
                    function (error) {
                        assert.ifError(error);
                        db.close(done);
                    });
            });
        });

        it("should work with array documents (gh-3034)", (done) => {
            let db = start();

            let testSchema = new mongoose.Schema({
                id: String,
                name: String,
                a: [{
                    foo: String
                }],
                _createdAt: {
                    type: Number,
                    default: Date.now
                }
            });

            let TestModel = db.model("gh3034", testSchema);
            TestModel.create({ id: "1" }, (error) => {
                assert.ifError(error);
                TestModel.findOneAndUpdate({ id: '1' }, { $set: { name: 'Joe' } }, { upsert: true, setDefaultsOnInsert: true },
                    function (error) {
                        assert.ifError(error);
                        db.close(done);
                    });
            });
        });

        it("handles setting array (gh-3107)", (done) => {
            let db = start();

            let testSchema = new mongoose.Schema({
                name: String,
                a: [{
                    foo: String
                }],
                b: [Number]
            });

            let TestModel = db.model("gh3107", testSchema);
            let update = { $setOnInsert: { a: [{ foo: "bar" }], b: [2] } };
            let opts = { upsert: true, new: true, setDefaultsOnInsert: true };
            TestModel
                .findOneAndUpdate({ name: "abc" }, update, opts,
                (error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc.a.length, 1);
                    assert.equal(doc.a[0].foo, 'bar');
                    assert.equal(doc.b.length, 1);
                    assert.equal(doc.b[0], 2);
                    db.close(done);
                });
        });


        it("handles nested cast errors (gh-3468)", (done) => {
            let db = start();
            let recordSchema = new mongoose.Schema({
                kind: String,
                amount: Number
            }, {
                    _id: false
                });

            let shiftSchema = new mongoose.Schema({
                userId: String,
                records: [recordSchema]
            });

            let Shift = db.model("gh3468", shiftSchema);

            Shift.create({
                userId: "tom",
                records: []
            }, (error) => {
                assert.ifError(error);
                Shift.findOneAndUpdate({ userId: 'tom' }, {
                    records: [{ kind: 'kind1', amount: NaN }]
                }, {
                        new: true
                    }, function (error) {
                        assert.ok(error);
                        assert.ok(error instanceof CastError);
                        db.close(done);
                    });
            });
        });

        it("cast errors with nested schemas (gh-3580)", (done) => {
            let db = start();

            let nested = new Schema({ num: Number });
            let s = new Schema({ nested });

            let MyModel = db.model("gh3580", s);

            let update = { nested: { num: "Not a Number" } };
            MyModel.findOneAndUpdate({}, update, (error) => {
                assert.ok(error);
                db.close(done);
            });
        });

        it("pull with nested schemas (gh-3616)", (done) => {
            let db = start();

            let nested = new Schema({ arr: [{ num: Number }] });
            let s = new Schema({ nested });

            let MyModel = db.model("gh3616", s);

            MyModel.create({ nested: { arr: [{ num: 5 }] } }, (error) => {
                assert.ifError(error);
                var update = { $pull: { 'nested.arr': { num: 5 } } };
                var options = { new: true };
                MyModel.findOneAndUpdate({}, update, options, function (error, doc) {
                    assert.ifError(error);
                    assert.equal(doc.nested.arr.length, 0);
                    db.close(done);
                });
            });
        });

        it("setting nested schema (gh-3889)", (done) => {
            let db = start();
            let nested = new Schema({ test: String });
            let s = new Schema({ nested });
            let MyModel = db.model("gh3889", s);
            MyModel.findOneAndUpdate(
                {},
                { $set: { nested: { test: "abc" } } },
                (error) => {
                    assert.ifError(error);
                    db.close(done);
                });
        });
    });

    describe("bug fixes", () => {
        let db;

        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("passes raw result as 3rd param (gh-3173)", (done) => {
            let testSchema = new mongoose.Schema({
                test: String
            });

            let TestModel = db.model("gh3173", testSchema);
            let options = { upsert: true, new: true, passRawResult: true };
            let update = { $set: { test: "abc" } };

            TestModel.findOneAndUpdate({}, update, options).
                exec((error, doc, res) => {
                    assert.ifError(error);
                    assert.ok(res);
                    assert.ok(res.ok);
                    done();
                });
        });

        it("passes raw result if rawResult specified (gh-4925)", (done) => {
            let testSchema = new mongoose.Schema({
                test: String
            });

            let TestModel = db.model("gh4925", testSchema);
            let options = { upsert: true, new: true, rawResult: true };
            let update = { $set: { test: "abc" } };

            TestModel.findOneAndUpdate({}, update, options).
                exec((error, res) => {
                    assert.ifError(error);
                    assert.ok(res);
                    assert.ok(res.ok);
                    assert.equal(res.value.test, 'abc');
                    assert.ok(res.value.id);
                    assert.equal(res.lastErrorObject.n, 1);
                    done();
                });
        });

        it("raw result as 3rd param w/ no result (gh-4023)", (done) => {
            let testSchema = new mongoose.Schema({
                test: String
            });

            let TestModel = db.model("gh4023", testSchema);
            let options = { upsert: true, new: false, passRawResult: true };
            let update = { $set: { test: "abc" } };

            TestModel.findOneAndUpdate({}, update, options).
                exec((error, doc, res) => {
                    assert.ifError(error);
                    assert.ok(res);
                    assert.ok(res.ok);

                    done();
                });
        });

        it("raw result as 3rd param w/ lean (gh-4761)", (done) => {
            let testSchema = new mongoose.Schema({
                test: String
            });

            let TestModel = db.model("gh4761", testSchema);
            let options = { upsert: true, new: true, passRawResult: true };
            let update = { $set: { test: "abc" } };

            TestModel.findOneAndUpdate({}, update, options).lean().
                exec((error, doc, res) => {
                    assert.ifError(error);
                    assert.ok(res);
                    assert.ok(res.ok);

                    done();
                });
        });

        it("handles setting single embedded docs to null (gh-4281)", (done) => {
            let foodSchema = new mongoose.Schema({
                name: { type: String, default: "Bacon" }
            });

            let breakfastSchema = new mongoose.Schema({
                main: foodSchema,
                for: String
            });

            let TestModel = db.model("gh4281", breakfastSchema);
            let options = { upsert: true, new: true };
            let update = { $set: { main: null, for: "Val" } };

            TestModel.findOneAndUpdate({}, update, options).
                exec((error, doc) => {
                    assert.ifError(error);
                    assert.ok(doc);
                    assert.equal(doc.main, null);

                    done();
                });
        });

        it("custom validator on mixed field (gh-4305)", (done) => {
            let called = 0;

            let boardSchema = new Schema({
                name: {
                    type: String,
                    required: true
                },
                structure: {
                    type: Schema.Types.Mixed,
                    required: true,
                    validate: {
                        validator() {
                            ++called;
                            return true;
                        },
                        message: "The structure of the board is invalid"
                    }
                }
            });
            let Board = db.model("gh4305", boardSchema);

            let update = {
                structure: [
                    {
                        capacity: 0,
                        size: 0,
                        category: 0,
                        isColumn: true,
                        title: "Backlog"
                    }
                ]
            };
            let opts = {
                "new": true,
                upsert: false,
                passRawResult: false,
                overwrite: false,
                runValidators: true,
                setDefaultsOnInsert: true
            };
            Board.
                findOneAndUpdate({}, update, opts).
                exec((error) => {
                    assert.ifError(error);
                    assert.equal(called, 1);
                    done();
                });
        });

        it("single nested doc cast errors (gh-3602)", (done) => {
            let AddressSchema = new Schema({
                street: {
                    type: Number
                }
            });

            let PersonSchema = new Schema({
                addresses: [AddressSchema]
            });

            let Person = db.model("gh3602", PersonSchema);

            let update = { $push: { addresses: { street: "not a num" } } };
            Person.findOneAndUpdate({}, update, (error) => {
                assert.ok(error.message.indexOf('street') !== -1);
                assert.equal(error.reason.message,
                    'Cast to Number failed for value "not a num" at path "street"');
                done();
            });
        });

        it("projection option as alias for fields (gh-4315)", (done) => {
            let TestSchema = new Schema({
                test1: String,
                test2: String
            });
            let Test = db.model("gh4315", TestSchema);
            let update = { $set: { test1: "a", test2: "b" } };
            let options = { projection: { test2: 0 }, new: true, upsert: true };
            Test.findOneAndUpdate({}, update, options, (error, doc) => {
                assert.ifError(error);
                assert.ok(!doc.test2);
                assert.equal(doc.test1, 'a');
                done();
            });
        });

        it("handles upserting a non-existing field (gh-4757)", (done) => {
            let modelSchema = new Schema({ field: Number }, { strict: "throw" });

            let Model = db.model("gh4757", modelSchema);
            Model.findOneAndUpdate({ nonexistingField: 1 }, { field: 2 }, {
                upsert: true,
                setDefaultsOnInsert: true,
                new: true
            }).exec((error) => {
                assert.ok(error);
                assert.equal(error.name, 'StrictModeError');
                done();
            });
        });

        it("strictQuery option (gh-4136)", (done) => {
            let modelSchema = new Schema({ field: Number }, { strictQuery: "throw" });

            let Model = db.model("gh4136", modelSchema);
            Model.find({ nonexistingField: 1 }).exec((error) => {
                assert.ok(error);
                assert.ok(error.message.indexOf('strictQuery') !== -1, error.message);
                done();
            });
        });

        it("strict option (gh-5108)", (done) => {
            let modelSchema = new Schema({ field: Number }, { strict: "throw" });

            let Model = db.model("gh5108", modelSchema);
            Model.findOneAndUpdate({}, { field: 2, otherField: 3 }, {
                upsert: true,
                strict: false,
                new: true
            }).exec((error, doc) => {
                assert.ifError(error);
                assert.equal(doc.field, 2);
                assert.equal(doc.get('otherField'), 3);
                done();
            });
        });

        it("should not apply schema transforms (gh-4574)", (done) => {
            let options = {
                toObject: {
                    transform() {
                        assert.ok(false, 'should not call transform');
                    }
                }
            };

            let SubdocSchema = new Schema({ test: String }, options);

            let CollectionSchema = new Schema({
                field1: { type: String },
                field2: {
                    arrayField: [SubdocSchema]
                }
            }, options);

            let Collection = db.model("test", CollectionSchema);

            Collection.create({ field2: { arrayField: [] } }).
                then((doc) => {
                    return Collection.findByIdAndUpdate(doc._id, {
                        $push: { 'field2.arrayField': { test: 'test' } }
                    }, { new: true });
                }).
                then(() => {
                    done();
                });
        });

        it("overwrite doc with update validators (gh-3556)", (done) => {
            let testSchema = new Schema({
                name: {
                    type: String,
                    required: true
                },
                otherName: String
            });
            let Test = db.model("gh3556", testSchema);

            let opts = { overwrite: true, runValidators: true };
            Test.findOneAndUpdate({}, { otherName: "test" }, opts, (error) => {
                assert.ok(error);
                assert.ok(error.errors['name']);
                Test.findOneAndUpdate({}, { $set: { otherName: 'test' } }, opts, function (error) {
                    assert.ifError(error);
                    done();
                });
            });
        });

        it("update using $ (gh-5628)", (done) => {
            let schema = new mongoose.Schema({
                elems: [String]
            });

            let Model = db.model("gh5628", schema);
            Model.create({ elems: ["a", "b"] }, (error, doc) => {
                assert.ifError(error);
                var query = { _id: doc._id, elems: 'a' };
                var update = { $set: { 'elems.$': 'c' } };
                Model.findOneAndUpdate(query, update, { new: true }, function (error) {
                    assert.ifError(error);
                    Model.collection.findOne({ _id: doc._id }, function (error, doc) {
                        assert.ifError(error);
                        assert.deepEqual(doc.elems, ['c', 'b']);
                        done();
                    });
                });
            });
        });

        it("projection with $elemMatch (gh-5661)", (done) => {
            let schema = new mongoose.Schema({
                name: { type: String, default: "test" },
                arr: [{ tag: String }]
            });

            let Model = db.model("gh5661", schema);
            let doc = { arr: [{ tag: "t1" }, { tag: "t2" }] };
            Model.create(doc, (error) => {
                assert.ifError(error);
                var query = {};
                var update = { $set: { name: 'test2' } };
                var opts = {
                    new: true,
                    fields: { arr: { $elemMatch: { tag: 't1' } } }
                };
                Model.findOneAndUpdate(query, update, opts, function (error, doc) {
                    assert.ifError(error);
                    assert.ok(!doc.name);
                    assert.equal(doc.arr.length, 1);
                    assert.equal(doc.arr[0].tag, 't1');
                    done();
                });
            });
        });

        it("multi cast error (gh-5609)", (done) => {
            let schema = new mongoose.Schema({
                num1: Number,
                num2: Number
            });

            let Model = db.model("gh5609", schema);

            let opts = { multipleCastError: true };
            Model.findOneAndUpdate({}, { num1: "fail", num2: "fail" }, opts, (error) => {
                assert.ok(error);
                assert.equal(error.name, 'ValidationError');
                assert.ok(error.errors['num1']);
                assert.equal(error.errors['num1'].name, 'CastError');
                assert.ok(error.errors['num2']);
                assert.equal(error.errors['num2'].name, 'CastError');
                done();
            });
        });

        it("update validators with pushing null (gh-5710)", (done) => {
            let schema = new mongoose.Schema({
                arr: [String]
            });

            let Model = db.model("gh5710", schema);

            let update = { $addToSet: { arr: null } };
            let options = { runValidators: true };
            Model.findOneAndUpdate({}, update, options, (error) => {
                assert.ifError(error);
                done();
            });
        });

        it("avoids edge case with middleware cloning buffers (gh-5702)", function (done) {
            if (parseInt(process.version.substr(1).split(".")[0], 10) < 4) {
                // Don't run on node 0.x because of `const` issues
                this.skip();
            }

            const uuidParse = require("uuid-parse");

            function toUUID(string) {
                if (!string) {
                    return null;
                }
                if (is.buffer(string) || is.buffer(string.buffer)) {
                    return string;
                }
                const buffer = uuidParse.parse(string);
                return new mongoose.Types.Buffer(buffer).toObject(0x04);
            }

            function fromUUID(buffer) {
                if (!buffer || buffer.length !== 16) {
                    return null;
                }
                return uuidParse.unparse(buffer);
            }

            const UserSchema = new mongoose.Schema({
                name: String,
                lastUpdate: { type: Date },
                friends: [{
                    _id: false,
                    status: { type: String, required: true },
                    id: {
                        type: mongoose.Schema.Types.Buffer,
                        get: fromUUID,
                        set: toUUID
                    }
                }]
            }, { collection: "users", runSettersOnQuery: true });

            UserSchema.pre("findOneAndUpdate", function () {
                this.update({}, { $set: { lastUpdate: new Date() } });
            });

            const User = db.model("gh5702", UserSchema);

            const friendId = uuid.v4();
            const user = {
                name: "Sean",
                friends: [{ status: "New", id: friendId }]
            };

            User.create(user, (error, user) => {
                assert.ifError(error);

                let q = { _id: user._id, "friends.id": friendId };
                let upd = { "friends.$.status": "Active" };
                User.findOneAndUpdate(q, upd, { new: true }).lean().exec((error) => {
                    assert.ifError(error);
                    done();
                });
            });
        });

        it("setting subtype when saving (gh-5551)", function (done) {
            if (parseInt(process.version.substr(1).split(".")[0], 10) < 4) {
                // Don't run on node 0.x because of `const` issues
                this.skip();
            }

            const uuidParse = require("uuid-parse");
            function toUUID(string) {
                if (!string) {
                    return null;
                }
                if (is.buffer(string) || is.buffer(string.buffer)) {
                    return string;
                }
                const buffer = uuidParse.parse(string);
                return new mongoose.Types.Buffer(buffer).toObject(0x04);
            }

            const UserSchema = new mongoose.Schema({
                name: String,
                foo: {
                    type: mongoose.Schema.Types.Buffer,
                    set: toUUID
                }
            });

            const User = db.model("gh5551", UserSchema);

            const user = { name: "upsert", foo: uuid.v4() };
            const opts = {
                upsert: true,
                setDefaultsOnInsert: true,
                runSettersOnQuery: true,
                new: true
            };
            User.findOneAndUpdate({}, user, opts).exec((error, doc) => {
                assert.ifError(error);
                User.collection.findOne({ _id: doc._id }, (error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc.foo.sub_type, 4);
                    done();
                });
            });
        });

        it("properly handles casting nested objects in update (gh-4724)", (done) => {
            let locationSchema = new Schema({
                _id: false,
                location: {
                    type: { type: String, default: "Point" },
                    coordinates: [Number]
                }
            });

            let testSchema = new Schema({
                locations: [locationSchema]
            });

            let T = db.model("gh4724", testSchema);

            let t = new T({
                locations: [{
                    location: { type: "Point", coordinates: [-122, 44] }
                }]
            });

            t.save().
                then((t) => {
                    return T.findByIdAndUpdate(t._id, {
                        $set: {
                            'locations.0': {
                                location: { type: 'Point', coordinates: [-123, 45] }
                            }
                        }
                    }, { new: true });
                }).
                then((res) => {
                    assert.equal(res.locations[0].location.coordinates[0], -123);
                    done();
                }).
                catch(done);
        });

        it("doesnt do double validation on document arrays during updates (gh-4440)", (done) => {
            let A = new Schema({ str: String });
            let B = new Schema({ a: [A] });
            let validateCalls = 0;
            B.path("a").validate((val, next) => {
                ++validateCalls;
                assert(Array.isArray(val));
                next();
            });

            B = db.model("b", B);

            B.findOneAndUpdate(
                { foo: "bar" },
                { $set: { a: [{ str: "asdf" }] } },
                { runValidators: true },
                (err) => {
                    assert.ifError(err);
                    assert.equal(validateCalls, 1); // Assertion error: 1 == 2
                    db.close(done);
                }
            );
        });
    });
});
