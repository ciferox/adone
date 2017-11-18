const random = adone.odm.utils.random;
const start = require("./common");

const mongoose = adone.odm;

const CastError = mongoose.SchemaType.CastError;
const DocumentObjectId = mongoose.Types.ObjectId;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Schema = mongoose.Schema;

const {
    is
} = adone;

describe("model query casting", () => {
    let Comments;
    let BlogPostB;
    let collection;
    let geoSchemaArray;
    let geoSchemaObject;
    let modelName;

    before(() => {
        Comments = new Schema();

        Comments.add({
            title: String,
            date: Date,
            body: String,
            comments: [Comments]
        });

        BlogPostB = new Schema({
            title: { $type: String },
            author: String,
            slug: String,
            date: Date,
            meta: {
                date: Date,
                visitors: Number
            },
            published: Boolean,
            mixed: {},
            numbers: [{ $type: Number }],
            tags: [String],
            sigs: [Buffer],
            owners: [ObjectId],
            comments: [Comments],
            def: { $type: String, default: "kandinsky" }
        }, { typeKey: "$type" });

        modelName = "model.query.casting.blogpost";
        mongoose.model(modelName, BlogPostB);
        collection = `blogposts_${random()}`;

        geoSchemaArray = new Schema({ loc: { type: [Number], index: "2d" } });
        geoSchemaObject = new Schema({ loc: { long: Number, lat: Number } });
        geoSchemaObject.index({ loc: "2d" });
    });

    it("works", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection),
            title = `Loki ${ random()}`;

        let post = new BlogPostB(),
            id = post.get("_id").toString();

        post.set("title", title);

        post.save((err) => {
            assert.ifError(err);

            BlogPostB.findOne({ _id: id }, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.get("title"), title);
                db.close(done);
            });
        });
    });

    it("returns cast errors", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection);

        BlogPostB.find({ date: "invalid date" }, (err) => {
            assert.ok(err instanceof Error);
            assert.ok(err instanceof CastError);
            db.close(done);
        });
    });

    it("casts $modifiers", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection),
            post = new BlogPostB({
                meta: {
                    visitors: -75
                }
            });

        post.save((err) => {
            assert.ifError(err);

            BlogPostB.find({ "meta.visitors": { $gt: "-100", $lt: -50 } },
                (err, found) => {
                    assert.ifError(err);

                    assert.ok(found);
                    assert.equal(found.length, 1);
                    assert.equal(found[0].get("_id").toString(), post.get("_id"));
                    assert.equal(found[0].get("meta.visitors").valueOf(), post.get("meta.visitors").valueOf());
                    db.close(done);
                });
        });
    });

    it("casts $in values of arrays (gh-199)", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection);

        let post = new BlogPostB(),
            id = post._id.toString();

        post.save((err) => {
            assert.ifError(err);

            BlogPostB.findOne({ _id: { $in: [id] } }, (err, doc) => {
                assert.ifError(err);

                assert.equal(doc._id.toString(), id);
                db.close(done);
            });
        });
    });

    it("casts $in values of arrays with single item instead of array (jrl-3238)", (done) => {
        let db = start(),
            BlogPostB = db.model(modelName, collection);

        let post = new BlogPostB(),
            id = post._id.toString();

        post.save((err) => {
            assert.ifError(err);

            BlogPostB.findOne({ _id: { $in: id } }, (err, doc) => {
                assert.ifError(err);

                assert.equal(doc._id.toString(), id);
                db.close();
                done();
            });
        });
    });

    it("casts $nin values of arrays (gh-232)", (done) => {
        let db = start(),
            NinSchema = new Schema({
                num: Number
            });

        mongoose.model("Nin", NinSchema);

        const Nin = db.model("Nin", `nins_${random()}`);

        Nin.create({ num: 1 }, (err) => {
            assert.ifError(err);
            Nin.create({ num: 2 }, (err) => {
                assert.ifError(err);
                Nin.create({ num: 3 }, (err) => {
                    assert.ifError(err);
                    Nin.find({ num: { $nin: [2] } }, function (err, found) {
                        assert.ifError(err);
                        assert.equal(found.length, 2);
                        db.close(done);
                    });
                });
            });
        });
    });

    it("works when finding by Date (gh-204)", (done) => {
        let db = start(),
            P = db.model(modelName, collection);

        const post = new P();

        post.meta.date = new Date();

        post.save((err) => {
            assert.ifError(err);

            P.findOne({ _id: post._id, "meta.date": { $lte: Date.now() } }, (err, doc) => {
                assert.ifError(err);

                assert.equal(doc._id.toString(), post._id.toString());
                doc.meta.date = null;
                doc.save((err) => {
                    assert.ifError(err);
                    P.findById(doc._id, function (err, doc) {
                        assert.ifError(err);
                        assert.strictEqual(doc.meta.date, null);
                        db.close(done);
                    });
                });
            });
        });
    });

    it("works with $type matching", (done) => {
        const db = start();
        const B = db.model(modelName, collection);

        B.find({ title: { $type: { x: 1 } } }, (err) => {
            assert.equal(err.message, "$type parameter must be number or string");

            B.find({ title: { $type: 2 } }, (err, posts) => {
                assert.ifError(err);
                assert.strictEqual(is.array(posts), true);
                db.close(done);
            });
        });
    });

    it("works when finding Boolean with $in (gh-998)", (done) => {
        let db = start(),
            B = db.model(modelName, collection);

        const b = new B({ published: true });
        b.save((err) => {
            assert.ifError(err);
            B.find({ _id: b._id, boolean: { $in: [null, true] } }, (err, doc) => {
                assert.ifError(err);
                assert.ok(doc);
                assert.equal(doc[0].id, b.id);
                db.close(done);
            });
        });
    });

    it("works when finding Boolean with $ne (gh-1093)", (done) => {
        let db = start(),
            B = db.model(modelName, collection + random());

        const b = new B({ published: false });
        b.save((err) => {
            assert.ifError(err);
            B.find().ne("published", true).exec((err, doc) => {
                assert.ifError(err);
                assert.ok(doc);
                assert.equal(doc[0].id, b.id);
                db.close(done);
            });
        });
    });

    it("properly casts $and (gh-1180)", (done) => {
        let db = start(),
            B = db.model(modelName, collection + random()),
            result = B.find({}).cast(B, { $and: [{ date: "1987-03-17T20:00:00.000Z" }, { _id: "000000000000000000000000" }] });
        assert.ok(result.$and[0].date instanceof Date);
        assert.ok(result.$and[1]._id instanceof DocumentObjectId);
        db.close(done);
    });

    describe("$near", function () {
        // this.slow(60);

        it("with arrays", (done) => {
            let db = start(),
                Test = db.model("Geo4", geoSchemaArray, `y${random()}`);

            Test.once("index", complete);
            Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

            let pending = 2;

            function complete(err) {
                if (complete.ran) {
                    return;
                }
                if (err) {
                    db.close();
                    return done(complete.ran = err);
                }
                --pending || test();
            }

            function test() {
                Test.find({ loc: { $near: ["30", "40"] } }, (err, docs) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(docs.length, 2);
                    done();
                });
            }
        });

        it("with objects", (done) => {
            let db = start(),
                Test = db.model("Geo5", geoSchemaObject, `y${ random()}`);

            let pending = 2;

            function complete(err) {
                if (complete.ran) {
                    return;
                }
                if (err) {
                    db.close();
                    return done(complete.ran = err);
                }
                --pending || test();
            }

            function test() {
                Test.find({ loc: { $near: ["30", "40"], $maxDistance: 51 } }, (err, docs) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(docs.length, 2);
                    done();
                });
            }

            Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);
            Test.once("index", complete);
        });

        it("with nested objects", (done) => {
            const db = start();
            const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
            geoSchemaObject.index({ "loc.nested": "2d" });

            const Test = db.model("Geo52", geoSchemaObject, `y${ random()}`);

            let pending = 2;

            function complete(err) {
                if (complete.ran) {
                    return;
                }
                if (err) {
                    db.close();
                    return done(complete.ran = err);
                }
                --pending || test();
            }

            function test() {
                Test.find({ "loc.nested": { $near: ["30", "40"], $maxDistance: "50" } }, (err, docs) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(docs.length, 1);
                    done();
                });
            }

            Test.once("index", complete);
            Test.create(
                { loc: { nested: { long: 10, lat: 20 } } },
                { loc: { nested: { long: 40, lat: 90 } } },
                complete);
        });
    });

    describe("$nearSphere", function () {
        // this.slow(70);

        it("with arrays", (done) => {
            let db = start(),
                Test = db.model("Geo4", geoSchemaArray, `y${ random()}`);

            let pending = 2;

            function complete(err) {
                if (complete.ran) {
                    return;
                }
                if (err) {
                    return done(complete.err = err);
                }
                --pending || test();
            }

            Test.on("index", complete);
            Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

            function test() {
                Test.find({ loc: { $nearSphere: ["30", "40"] } }, (err, docs) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(docs.length, 2);
                    done();
                });
            }
        });

        it("with objects", (done) => {
            let db = start(),
                Test = db.model("Geo5", geoSchemaObject, `y${ random()}`);

            let pending = 2;

            function complete(err) {
                if (complete.ran) {
                    return;
                }
                if (err) {
                    return done(complete.err = err);
                }
                --pending || test();
            }

            Test.on("index", complete);
            Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);

            function test() {
                Test.find({ loc: { $nearSphere: ["30", "40"], $maxDistance: 1 } }, (err, docs) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(docs.length, 2);
                    done();
                });
            }
        });

        it("with nested objects", (done) => {
            const db = start();
            const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
            geoSchemaObject.index({ "loc.nested": "2d" });

            const Test = db.model("Geo52", geoSchemaObject, `y${random()}`);

            let pending = 2;

            function complete(err) {
                if (complete.ran) {
                    return;
                }
                if (err) {
                    return done(complete.err = err);
                }
                --pending || test();
            }

            Test.on("index", complete);
            Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } }, complete);

            function test() {
                Test.find({ "loc.nested": { $nearSphere: ["30", "40"], $maxDistance: 1 } }, (err, docs) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(docs.length, 2);
                    done();
                });
            }
        });
    });

    describe("$within", function () {
        // this.slow(60);

        describe("$centerSphere", () => {
            it("with arrays", (done) => {
                let db = start(),
                    Test = db.model("Geo4", geoSchemaArray, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

                function test() {
                    Test.find({ loc: { $within: { $centerSphere: [["11", "20"], "0.4"] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 1);
                        done();
                    });
                }
            });

            it("with objects", (done) => {
                let db = start(),
                    Test = db.model("Geo5", geoSchemaObject, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);

                function test() {
                    Test.find({ loc: { $within: { $centerSphere: [["11", "20"], "0.4"] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 1);
                        done();
                    });
                }
            });

            it("with nested objects", (done) => {
                const db = start();
                const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
                geoSchemaObject.index({ "loc.nested": "2d" });

                const Test = db.model("Geo52", geoSchemaObject, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } }, complete);

                function test() {
                    Test.find({ "loc.nested": { $within: { $centerSphere: [["11", "20"], "0.4"] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 1);
                        done();
                    });
                }
            });
        });

        describe("$center", () => {
            it("with arrays", (done) => {
                let db = start(),
                    Test = db.model("Geo4", geoSchemaArray, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

                function test() {
                    Test.find({ loc: { $within: { $center: [["11", "20"], "1"] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 1);
                        done();
                    });
                }
            });

            it("with objects", (done) => {
                let db = start(),
                    Test = db.model("Geo5", geoSchemaObject, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);

                function test() {
                    Test.find({ loc: { $within: { $center: [["11", "20"], "1"] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 1);
                        done();
                    });
                }
            });

            it("with nested objects", (done) => {
                const db = start();
                const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
                geoSchemaObject.index({ "loc.nested": "2d" });

                const Test = db.model("Geo52", geoSchemaObject, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } }, complete);

                function test() {
                    Test.find({ "loc.nested": { $within: { $center: [["11", "20"], "1"] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 1);
                        done();
                    });
                }
            });
        });

        describe("$polygon", () => {
            it("with arrays", (done) => {
                let db = start(),
                    Test = db.model("Geo4", geoSchemaArray, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

                function test() {
                    Test.find({ loc: { $within: { $polygon: [["8", "1"], ["8", "100"], ["50", "100"], ["50", "1"]] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 2);
                        done();
                    });
                }
            });

            it("with objects", (done) => {
                let db = start(),
                    Test = db.model("Geo5", geoSchemaObject, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);

                function test() {
                    Test.find({ loc: { $within: { $polygon: [["8", "1"], ["8", "100"], ["50", "100"], ["50", "1"]] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 2);
                        done();
                    });
                }
            });

            it("with nested objects", (done) => {
                const db = start();
                const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
                geoSchemaObject.index({ "loc.nested": "2d" });

                const Test = db.model("Geo52", geoSchemaObject, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } }, complete);

                function test() {
                    Test.find({ "loc.nested": { $within: { $polygon: [["8", "1"], ["8", "100"], ["50", "100"], ["50", "1"]] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 2);
                        done();
                    });
                }
            });
        });

        describe("$box", () => {
            it("with arrays", (done) => {
                let db = start(),
                    Test = db.model("Geo4", geoSchemaArray, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

                function test() {
                    Test.find({ loc: { $within: { $box: [["8", "1"], ["50", "100"]] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 2);
                        done();
                    });
                }
            });

            it("with objects", (done) => {
                let db = start(),
                    Test = db.model("Geo5", geoSchemaObject, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);

                function test() {
                    Test.find({ loc: { $within: { $box: [["8", "1"], ["50", "100"]] } } }, (err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 2);
                        done();
                    });
                }
            });

            it("with nested objects", (done) => {
                const db = start();
                const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
                geoSchemaObject.index({ "loc.nested": "2d" });

                const Test = db.model("Geo52", geoSchemaObject, `y${  random()}`);

                let pending = 2;

                function complete(err) {
                    if (complete.ran) {
                        return;
                    }
                    if (err) {
                        return done(complete.err = err);
                    }
                    --pending || test();
                }

                Test.on("index", complete);
                Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } }, complete);

                function test() {
                    Test.find({ "loc.nested": { $within: { $box: [["8", "1"], ["50", "100"]] } } }, (err, docs) => {
                        assert.ifError(err);
                        assert.equal(docs.length, 2);
                        db.close(done);
                    });
                }
            });
        });
    });

    describe("$options", () => {
        it("works on arrays gh-1462", (done) => {
            const opts = {};
            opts.toString = function () {
                return "img";
            };

            let db = start(),
                B = db.model(modelName, collection + random()),
                result = B.find({}).cast(B, { tags: { $regex: /a/, $options: opts } });

            assert.equal(result.tags.$options, "img");
            db.close(done);
        });
    });

    describe("$elemMatch", () => {
        it("should cast String to ObjectId in $elemMatch", (done) => {
            let db = start(),
                BlogPostB = db.model(modelName, collection);

            const commentId = mongoose.Types.ObjectId(111);

            let post = new BlogPostB({ comments: [{ _id: commentId }] }), id = post._id.toString();

            post.save((err) => {
                assert.ifError(err);

                BlogPostB.findOne({ _id: id, comments: { $elemMatch: { _id: commentId.toString() } } }, (err, doc) => {
                    assert.ifError(err);

                    assert.equal(doc._id.toString(), id);
                    db.close(done);
                });
            });
        });

        it("should cast String to ObjectId in $elemMatch inside $not", (done) => {
            let db = start(),
                BlogPostB = db.model(modelName, collection);

            const commentId = mongoose.Types.ObjectId(111);

            let post = new BlogPostB({ comments: [{ _id: commentId }] }), id = post._id.toString();

            post.save((err) => {
                assert.ifError(err);

                BlogPostB.findOne({ _id: id, comments: { $not: { $elemMatch: { _id: commentId.toString() } } } }, (err, doc) => {
                    assert.ifError(err);

                    assert.equal(doc, null);
                    db.close(done);
                });
            });
        });

        it("should cast subdoc _id typed as String to String in $elemMatch gh3719", (done) => {
            const db = start();

            const child = new Schema({
                _id: { type: String }
            }, { _id: false });

            const parent = new Schema({
                children: [child]
            });

            const Parent = db.model("gh3719-1", parent);

            Parent.create({ children: [{ _id: "foobar" }] }, (error) => {
                assert.ifError(error);
                test();
            });

            function test() {
                Parent.find({
                    $and: [{ children: { $elemMatch: { _id: "foobar" } } }]
                }, (error, docs) => {
                    assert.ifError(error);

                    assert.equal(docs.length, 1);
                    db.close(done);
                });
            }
        });

        it("should cast subdoc _id typed as String to String in $elemMatch inside $not gh3719", (done) => {
            const db = start();

            const child = new Schema({
                _id: { type: String }
            }, { _id: false });

            const parent = new Schema({
                children: [child]
            });

            const Parent = db.model("gh3719-2", parent);

            Parent.create({ children: [{ _id: "foobar" }] }, (error) => {
                assert.ifError(error);
                test();
            });

            function test() {
                Parent.find({
                    $and: [{ children: { $not: { $elemMatch: { _id: "foobar" } } } }]
                }, (error, docs) => {
                    assert.ifError(error);

                    assert.equal(docs.length, 0);
                    db.close(done);
                });
            }
        });
    });

    it("works with $all (gh-3394)", (done) => {
        const db = start();

        const MyModel = db.model("gh3394", { tags: [ObjectId] });

        const doc = {
            tags: ["00000000000000000000000a", "00000000000000000000000b"]
        };

        MyModel.create(doc, (error, savedDoc) => {
            assert.ifError(error);
            assert.equal(typeof savedDoc.tags[0], "object");
            MyModel.findOne({ tags: { $all: doc.tags } }, (error, doc) => {
                assert.ifError(error);
                assert.ok(doc);
                db.close(done);
            });
        });
    });

    it("date with $not + $type (gh-4632)", (done) => {
        const db = start();

        const MyModel = db.model("gh4632", { test: Date });

        MyModel.find({ test: { $not: { $type: 9 } } }, (error) => {
            assert.ifError(error);
            done();
        });
    });

    it("setOnInsert with custom type (gh-5126)", (done) => {
        const db = start();

        function Point(key, options) {
            mongoose.SchemaType.call(this, key, options, "Point");
        }

        mongoose.Schema.Types.Point = Point;
        Point.prototype = Object.create(mongoose.SchemaType.prototype);

        let called = 0;
        Point.prototype.cast = function (point) {
            ++called;
            if (point.type !== "Point") {
                throw new Error("Woops");
            }

            return point;
        };

        const testSchema = new mongoose.Schema({ name: String, test: Point });
        const Test = db.model("gh5126", testSchema);

        const u = {
            $setOnInsert: {
                name: "a",
                test: {
                    type: "Point"
                }
            }
        };
        Test.findOneAndUpdate({ name: "a" }, u).
            exec((error) => {
                assert.ifError(error);
                assert.equal(called, 1);
                done();
            }).
            catch(done);
    });

    it("lowercase in query (gh-4569)", (done) => {
        const db = start();

        const contexts = [];

        const testSchema = new Schema({
            name: { type: String, lowercase: true },
            num: {
                type: Number,
                set(v) {
                    contexts.push(this);
                    return Math.floor(v);
                }
            }
        }, { runSettersOnQuery: true });

        const Test = db.model("gh-4569", testSchema);
        Test.create({ name: "val", num: 2.02 }).
            then(() => {
                assert.equal(contexts.length, 1);
                assert.equal(contexts[0].constructor.name, "model");
                return Test.findOne({ name: "VAL" });
            }).
            then((doc) => {
                assert.ok(doc);
                assert.equal(doc.name, "val");
                assert.equal(doc.num, 2);
            }).
            then(() => {
                return Test.findOneAndUpdate({}, { num: 3.14 }, { new: true });
            }).
            then((doc) => {
                assert.ok(doc);
                assert.equal(doc.name, "val");
                assert.equal(doc.num, 3);
                assert.equal(contexts.length, 2);
                assert.equal(contexts[1].constructor.name, "Query");
            }).
            then(() => {
                done(); 
            }).
            catch(done);
    });

    it("runSettersOnQuery only once on find (gh-5434)", (done) => {
        const db = start();

        let vs = [];
        const UserSchema = new mongoose.Schema({
            name: String,
            foo: {
                type: Number,
                get(val) {
                    return val.toString();
                },
                set(val) {
                    vs.push(val);
                    return val;
                }
            }
        }, { runSettersOnQuery: true });

        const Test = db.model("gh5434", UserSchema);

        Test.find({ foo: "123" }).exec((error) => {
            assert.ifError(error);
            assert.equal(vs.length, 1);
            assert.strictEqual(vs[0], "123");

            vs = [];
            Test.find({ foo: "123" }, (error) => {
                assert.ifError(error);
                assert.equal(vs.length, 1);
                assert.strictEqual(vs[0], "123");
                done();
            });
        });
    });

    it("runSettersOnQuery as query option (gh-5350)", (done) => {
        const db = start();

        const contexts = [];

        const testSchema = new Schema({
            name: { type: String, lowercase: true },
            num: {
                type: Number,
                set(v) {
                    contexts.push(this);
                    return Math.floor(v);
                }
            }
        }, { runSettersOnQuery: false });

        const Test = db.model("gh5350", testSchema);
        Test.create({ name: "val", num: 2.02 }).
            then(() => {
                assert.equal(contexts.length, 1);
                assert.equal(contexts[0].constructor.name, "model");
                return Test.findOne({ name: "VAL" }, { _id: 0 }, {
                    runSettersOnQuery: true
                });
            }).
            then((doc) => {
                assert.ok(doc);
                assert.equal(doc.name, "val");
                assert.equal(doc.num, 2);
            }).
            then(() => {
                done(); 
            }).
            catch(done);
    });

    it("_id = 0 (gh-4610)", (done) => {
        const db = start();

        const MyModel = db.model("gh4610", { _id: Number });

        MyModel.create({ _id: 0 }, (error) => {
            assert.ifError(error);
            MyModel.findById({ _id: 0 }, (error, doc) => {
                assert.ifError(error);
                assert.ok(doc);
                assert.equal(doc._id, 0);
                done();
            });
        });
    });

    it("minDistance (gh-4197)", (done) => {
        const db = start();

        const schema = new Schema({
            name: String,
            loc: {
                type: { type: String },
                coordinates: [Number]
            }
        });

        schema.index({ loc: "2dsphere" });

        const MyModel = db.model("gh4197", schema);

        MyModel.on("index", (error) => {
            assert.ifError(error);
            const docs = [
                { name: "San Mateo Caltrain", loc: _geojsonPoint([-122.33, 37.57]) },
                { name: "Squaw Valley", loc: _geojsonPoint([-120.24, 39.21]) },
                { name: "Mammoth Lakes", loc: _geojsonPoint([-118.9, 37.61]) }
            ];
            const RADIUS_OF_EARTH_IN_METERS = 6378100;
            MyModel.create(docs, (error) => {
                assert.ifError(error);
                MyModel.
                    find().
                    near("loc", {
                        center: [-122.33, 37.57],
                        minDistance: (1000 / RADIUS_OF_EARTH_IN_METERS).toString(),
                        maxDistance: (280000 / RADIUS_OF_EARTH_IN_METERS).toString(),
                        spherical: true
                    }).
                    exec((error, results) => {
                        assert.ifError(error);
                        assert.equal(results.length, 1);
                        assert.equal(results[0].name, 'Squaw Valley');
                        done();
                    });
            });
        });
    });
});

function _geojsonPoint(coordinates) {
    return { type: "Point", coordinates };
}
