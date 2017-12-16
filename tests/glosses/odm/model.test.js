const start = require("./common");
const mongoose = adone.odm;
const random = adone.odm.utils.random;
const Schema = mongoose.Schema;
const ValidatorError = mongoose.Error.ValidatorError;
const ValidationError = mongoose.Error.ValidationError;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;
const EmbeddedDocument = mongoose.Types.Embedded;
const MongooseError = mongoose.Error;

const {
    is
} = adone;

describe("Model", () => {
    let db;
    let Test;
    let Comments;
    let BlogPost;
    let bpSchema;
    let collection;

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
            comments: [Comments],
            nested: { array: [Number] }
        });

        BlogPost
            .virtual("titleWithAuthor")
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

        mongoose.model("BlogPost", BlogPost);
        bpSchema = BlogPost;

        collection = `blogposts_${random()}`;
    });

    before(() => {
        db = start();
        const testSchema = new Schema({
            _id: {
                first_name: { type: String },
                age: { type: Number }
            },
            last_name: { type: String },
            doc_embed: {
                some: { type: String }
            }

        });
        Test = db.model("test-schema", testSchema);
    });

    after(() => {
        db.close();
    });

    it("can be created using _id as embedded document", (done) => {
        const t = new Test({
            _id: {
                first_name: "Daniel",
                age: 21
            },
            last_name: "Alabi",
            doc_embed: {
                some: "a"
            }
        });

        t.save((err) => {
            assert.ifError(err);
            Test.findOne({}, (err, doc) => {
                assert.ifError(err);

                assert.ok("last_name" in doc);
                assert.ok("_id" in doc);
                assert.ok("first_name" in doc._id);
                assert.equal(doc._id.first_name, "Daniel");
                assert.ok("age" in doc._id);
                assert.equal(doc._id.age, 21);

                assert.ok("doc_embed" in doc);
                assert.ok("some" in doc.doc_embed);
                assert.equal(doc.doc_embed.some, "a");
                done();
            });
        });
    });

    describe("constructor", () => {
        it('works without "new" keyword', (done) => {
            let B = mongoose.model("BlogPost");
            let b = new B();
            assert.ok(b instanceof B);
            const db = start();
            B = db.model("BlogPost");
            db.close();
            b = new B();
            assert.ok(b instanceof B);
            done();
        });
        it('works "new" keyword', (done) => {
            let B = mongoose.model("BlogPost");
            let b = new B();
            assert.ok(b instanceof B);
            const db = start();
            B = db.model("BlogPost");
            db.close();
            b = new B();
            assert.ok(b instanceof B);
            done();
        });
    });
    describe("isNew", () => {
        it("is true on instantiation", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            db.close();
            const post = new BlogPost();
            assert.equal(post.isNew, true);
            done();
        });

        it("on parent and subdocs on failed inserts", (done) => {
            const db = start();

            const schema = new Schema({
                name: { type: String, unique: true },
                em: [new Schema({ x: Number })]
            }, { collection: `testisnewonfail_${random()}` });

            const A = db.model("isNewOnFail", schema);

            A.on("index", () => {
                const a = new A({ name: "i am new", em: [{ x: 1 }] });
                a.save((err) => {
                    assert.ifError(err);
                    assert.equal(a.isNew, false);
                    assert.equal(a.em[0].isNew, false);
                    const b = new A({ name: "i am new", em: [{ x: 2 }] });
                    b.save((err) => {
                        db.close();
                        assert.ok(err);
                        assert.equal(b.isNew, true);
                        assert.equal(b.em[0].isNew, true);
                        done();
                    });
                });
            });
        });
    });

    it("gh-2140", (done) => {
        const db = start();
        const S = new Schema({
            field: [{ text: String }]
        });

        const Model = db.model("gh-2140", S, "gh-2140");
        const s = new Model();
        s.field = [null];
        s.field = [{ text: "text" }];

        assert.ok(s.field[0]);
        db.close(done);
    });

    describe("schema", () => {
        it("should exist", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            db.close();
            assert.ok(BlogPost.schema instanceof Schema);
            assert.ok(BlogPost.prototype.schema instanceof Schema);
            done();
        });
        it("emits init event", (done) => {
            let db = start(),
                schema = new Schema({ name: String }),
                model;

            schema.on("init", (model_) => {
                model = model_;
            });

            const Named = db.model("EmitInitOnSchema", schema);
            db.close();
            assert.equal(model, Named);
            done();
        });
    });

    describe("structure", () => {
        it("default when instantiated", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            db.close();
            const post = new BlogPost();
            assert.equal(post.db.model("BlogPost").modelName, "BlogPost");
            assert.equal(post.constructor.modelName, "BlogPost");

            assert.ok(post.get("_id") instanceof DocumentObjectId);

            assert.equal(post.get("title"), undefined);
            assert.equal(post.get("slug"), undefined);
            assert.equal(post.get("date"), undefined);

            assert.equal(typeof post.get("meta"), "object");
            assert.deepEqual(post.get("meta"), {});
            assert.equal(post.get("meta.date"), undefined);
            assert.equal(post.get("meta.visitors"), undefined);
            assert.equal(post.get("published"), undefined);
            assert.equal(Object.keys(post.get("nested")).length, 1);
            assert.ok(is.array(post.get("nested").array));

            assert.ok(post.get("numbers").isMongooseArray);
            assert.ok(post.get("owners").isMongooseArray);
            assert.ok(post.get("comments").isMongooseDocumentArray);
            assert.ok(post.get("nested.array").isMongooseArray);
            done();
        });

        describe("array", () => {
            describe("defaults", () => {
                it("to a non-empty array", (done) => {
                    let db = start(),
                        DefaultArraySchema = new Schema({
                            arr: { type: Array, cast: String, default: ["a", "b", "c"] },
                            single: { type: Array, cast: String, default: ["a"] }
                        });
                    mongoose.model("DefaultArray", DefaultArraySchema);
                    const DefaultArray = db.model("DefaultArray", collection);
                    const arr = new DefaultArray();
                    db.close();
                    assert.equal(arr.get("arr").length, 3);
                    assert.equal(arr.get("arr")[0], "a");
                    assert.equal(arr.get("arr")[1], "b");
                    assert.equal(arr.get("arr")[2], "c");
                    assert.equal(arr.get("single").length, 1);
                    assert.equal(arr.get("single")[0], "a");
                    done();
                });

                it("empty", (done) => {
                    let db = start(),
                        DefaultZeroCardArraySchema = new Schema({
                            arr: { type: Array, cast: String, default: [] },
                            auto: [Number]
                        });
                    mongoose.model("DefaultZeroCardArray", DefaultZeroCardArraySchema);
                    const DefaultZeroCardArray = db.model("DefaultZeroCardArray", collection);
                    db.close();
                    const arr = new DefaultZeroCardArray();
                    assert.equal(arr.get("arr").length, 0);
                    assert.equal(arr.arr.length, 0);
                    assert.equal(arr.auto.length, 0);
                    done();
                });
            });
        });

        it("a hash with one null value", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            const post = new BlogPost({
                title: null
            });
            db.close();
            assert.strictEqual(null, post.title);
            done();
        });

        it("when saved", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection),
                pending = 2;

            function cb() {
                if (--pending) {
                    return;
                }
                db.close();
                done();
            }

            const post = new BlogPost();
            post.on("save", (post) => {
                assert.ok(post.get("_id") instanceof DocumentObjectId);

                assert.equal(post.get("title"), undefined);
                assert.equal(post.get("slug"), undefined);
                assert.equal(post.get("date"), undefined);
                assert.equal(post.get("published"), undefined);

                assert.equal(typeof post.get("meta"), "object");
                assert.deepEqual(post.get("meta"), {});
                assert.equal(post.get("meta.date"), undefined);
                assert.equal(post.get("meta.visitors"), undefined);

                assert.ok(post.get("owners").isMongooseArray);
                assert.ok(post.get("comments").isMongooseDocumentArray);
                cb();
            });

            post.save((err, post) => {
                assert.ifError(err);
                assert.ok(post.get("_id") instanceof DocumentObjectId);

                assert.equal(post.get("title"), undefined);
                assert.equal(post.get("slug"), undefined);
                assert.equal(post.get("date"), undefined);
                assert.equal(post.get("published"), undefined);

                assert.equal(typeof post.get("meta"), "object");
                assert.deepEqual(post.get("meta"), {});
                assert.equal(post.get("meta.date"), undefined);
                assert.equal(post.get("meta.visitors"), undefined);

                assert.ok(post.get("owners").isMongooseArray);
                assert.ok(post.get("comments").isMongooseDocumentArray);
                cb();
            });
        });


        it("when saved using the promise not the callback", async () => {
            const db = start();
            const BlogPost = db.model("BlogPost", collection);

            const post = new BlogPost();
            await post.save();
            assert.ok(post.get("_id") instanceof DocumentObjectId);

            assert.equal(post.get("title"), undefined);
            assert.equal(post.get("slug"), undefined);
            assert.equal(post.get("date"), undefined);
            assert.equal(post.get("published"), undefined);

            assert.equal(typeof post.get("meta"), "object");
            assert.deepEqual(post.get("meta"), {});
            assert.equal(post.get("meta.date"), undefined);
            assert.equal(post.get("meta.visitors"), undefined);

            assert.ok(post.get("owners").isMongooseArray);
            assert.ok(post.get("comments").isMongooseDocumentArray);
            db.close();
        });


        describe("init", () => {
            it("works", (done) => {
                let db = start(),
                    BlogPost = db.model("BlogPost", collection);

                const post = new BlogPost();
                db.close();

                post.init({
                    title: "Test",
                    slug: "test",
                    date: new Date(),
                    meta: {
                        date: new Date(),
                        visitors: 5
                    },
                    published: true,
                    owners: [new DocumentObjectId(), new DocumentObjectId()],
                    comments: [
                        { title: "Test", date: new Date(), body: "Test" },
                        { title: "Super", date: new Date(), body: "Cool" }
                    ]
                });

                assert.equal(post.get("title"), "Test");
                assert.equal(post.get("slug"), "test");
                assert.ok(post.get("date") instanceof Date);
                assert.equal(typeof post.get("meta"), "object");
                assert.ok(post.get("meta").date instanceof Date);
                assert.equal(typeof post.get("meta").visitors, "number");
                assert.equal(post.get("published"), true);

                assert.equal(post.title, "Test");
                assert.equal(post.slug, "test");
                assert.ok(post.date instanceof Date);
                assert.equal(typeof post.meta, "object");
                assert.ok(post.meta.date instanceof Date);
                assert.equal(typeof post.meta.visitors, "number");
                assert.equal(post.published, true);

                assert.ok(post.get("owners").isMongooseArray);
                assert.ok(post.get("owners")[0] instanceof DocumentObjectId);
                assert.ok(post.get("owners")[1] instanceof DocumentObjectId);

                assert.ok(post.owners.isMongooseArray);
                assert.ok(post.owners[0] instanceof DocumentObjectId);
                assert.ok(post.owners[1] instanceof DocumentObjectId);

                assert.ok(post.get("comments").isMongooseDocumentArray);
                assert.ok(post.get("comments")[0] instanceof EmbeddedDocument);
                assert.ok(post.get("comments")[1] instanceof EmbeddedDocument);

                assert.ok(post.comments.isMongooseDocumentArray);
                assert.ok(post.comments[0] instanceof EmbeddedDocument);
                assert.ok(post.comments[1] instanceof EmbeddedDocument);
                done();
            });

            it("partially", (done) => {
                let db = start(),
                    BlogPost = db.model("BlogPost", collection);

                db.close();
                const post = new BlogPost();
                post.init({
                    title: "Test",
                    slug: "test",
                    date: new Date()
                });

                assert.equal(post.get("title"), "Test");
                assert.equal(post.get("slug"), "test");
                assert.ok(post.get("date") instanceof Date);
                assert.equal(typeof post.get("meta"), "object");

                assert.deepEqual(post.get("meta"), {});
                assert.equal(post.get("meta.date"), undefined);
                assert.equal(post.get("meta.visitors"), undefined);
                assert.equal(post.get("published"), undefined);

                assert.ok(post.get("owners").isMongooseArray);
                assert.ok(post.get("comments").isMongooseDocumentArray);
                done();
            });

            it("with partial hash", (done) => {
                let db = start(),
                    BlogPost = db.model("BlogPost", collection);

                db.close();
                const post = new BlogPost({
                    meta: {
                        date: new Date(),
                        visitors: 5
                    }
                });

                assert.equal(post.get("meta.visitors").valueOf(), 5);
                done();
            });

            it("isNew on embedded documents", (done) => {
                let db = start(),
                    BlogPost = db.model("BlogPost", collection);

                db.close();
                const post = new BlogPost();
                post.init({
                    title: "Test",
                    slug: "test",
                    comments: [{ title: "Test", date: new Date(), body: "Test" }]
                });

                assert.equal(post.get("comments")[0].isNew, false);
                done();
            });

            it("isNew on embedded documents after saving", (done) => {
                let db = start(),
                    BlogPost = db.model("BlogPost", collection);

                const post = new BlogPost({ title: "hocus pocus" });
                post.comments.push({ title: "Humpty Dumpty", comments: [{ title: "nested" }] });
                assert.equal(post.get("comments")[0].isNew, true);
                assert.equal(post.get("comments")[0].comments[0].isNew, true);
                post.invalidate("title"); // force error
                post.save(() => {
                    assert.equal(post.isNew, true);
                    assert.equal(post.get("comments")[0].isNew, true);
                    assert.equal(post.get("comments")[0].comments[0].isNew, true);
                    post.save((err) => {
                        db.close();
                        assert.strictEqual(null, err);
                        assert.equal(post.isNew, false);
                        assert.equal(post.get("comments")[0].isNew, false);
                        assert.equal(post.get("comments")[0].comments[0].isNew, false);
                        done();
                    });
                });
            });
        });
    });

    it("collection name can be specified through schema", (done) => {
        const schema = new Schema({ name: String }, { collection: "users1" });
        const Named = mongoose.model("CollectionNamedInSchema1", schema);
        assert.equal(Named.prototype.collection.name, "users1");

        const db = start();
        const users2schema = new Schema({ name: String }, { collection: "users2" });
        const Named2 = db.model("CollectionNamedInSchema2", users2schema);
        db.close();
        assert.equal(Named2.prototype.collection.name, "users2");
        done();
    });

    it("saving a model with a null value should perpetuate that null value to the db", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection);

        const post = new BlogPost({
            title: null
        });
        assert.strictEqual(null, post.title);
        post.save((err) => {
            assert.strictEqual(err, null);
            BlogPost.findById(post.id, (err, found) => {
                db.close();
                assert.strictEqual(err, null);
                assert.strictEqual(found.title, null);
                done();
            });
        });
    });

    it("saves subdocuments middleware correctly", (done) => {
        const db = start();

        let child_hook;
        let parent_hook;
        const childSchema = new Schema({
            name: String
        });

        childSchema.pre("save", function (next) {
            child_hook = this.name;
            next();
        });

        const parentSchema = new Schema({
            name: String,
            children: [childSchema]
        });

        parentSchema.pre("save", function (next) {
            parent_hook = this.name;
            next();
        });

        const Parent = db.model("doc", parentSchema);

        const parent = new Parent({
            name: "Bob",
            children: [{
                name: "Mary"
            }]
        });

        parent.save((err, parent) => {
            assert.equal(parent_hook, "Bob");
            assert.equal(child_hook, "Mary");
            assert.ifError(err);
            parent.children[0].name = "Jane";
            parent.save((err) => {
                assert.equal(child_hook, "Jane");
                assert.ifError(err);
                done();
            });
        });
    });

    it("instantiating a model with a hash that maps to at least 1 undefined value", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection);

        const post = new BlogPost({
            title: undefined
        });
        assert.strictEqual(undefined, post.title);
        post.save((err) => {
            assert.strictEqual(null, err);
            BlogPost.findById(post.id, (err, found) => {
                db.close();
                assert.strictEqual(err, null);
                assert.strictEqual(found.title, undefined);
                done();
            });
        });
    });

    it("modified nested objects which contain MongoseNumbers should not cause a RangeError on save (gh-714)", (done) => {
        const db = start();

        const schema = new Schema({
            nested: {
                num: Number
            }
        });

        const M = db.model("NestedObjectWithMongooseNumber", schema);
        const m = new M();
        m.nested = null;
        m.save((err) => {
            assert.ifError(err);

            M.findById(m, (err, m) => {
                assert.ifError(err);
                m.nested.num = 5;
                m.save((err) => {
                    db.close();
                    assert.ifError(err);
                    done();
                });
            });
        });
    });

    it("no RangeError on remove() of a doc with Number _id (gh-714)", (done) => {
        const db = start();

        const MySchema = new Schema({
            _id: { type: Number },
            name: String
        });

        const MyModel = db.model("MyModel", MySchema, `numberrangeerror${random()}`);

        const instance = new MyModel({
            name: "test",
            _id: 35
        });
        instance.save((err) => {
            assert.ifError(err);

            MyModel.findById(35, (err, doc) => {
                assert.ifError(err);

                doc.remove((err) => {
                    db.close();
                    assert.ifError(err);
                    done();
                });
            });
        });
    });

    it("over-writing a number should persist to the db (gh-342)", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection);

        const post = new BlogPost({
            meta: {
                date: new Date(),
                visitors: 10
            }
        });

        post.save((err) => {
            assert.ifError(err);
            post.set("meta.visitors", 20);
            post.save((err) => {
                assert.ifError(err);
                BlogPost.findById(post.id, (err, found) => {
                    assert.ifError(err);
                    assert.equal(found.get("meta.visitors").valueOf(), 20);
                    db.close();
                    done();
                });
            });
        });
    });

    describe("methods", () => {
        it("can be defined", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            db.close();
            const post = new BlogPost();
            assert.equal(post.cool(), post);
            done();
        });

        it("can be defined on embedded documents", (done) => {
            const db = start();
            const ChildSchema = new Schema({ name: String });
            ChildSchema.method("talk", () => {
                return "gaga";
            });

            const ParentSchema = new Schema({
                children: [ChildSchema]
            });

            const ChildA = db.model("ChildA", ChildSchema, `children_${random()}`);
            const ParentA = db.model("ParentA", ParentSchema, `parents_${random()}`);
            db.close();

            const c = new ChildA();
            assert.equal(typeof c.talk, "function");

            const p = new ParentA();
            p.children.push({});
            assert.equal(typeof p.children[0].talk, "function");
            done();
        });

        it("can be defined with nested key", (done) => {
            const db = start();
            const NestedKeySchema = new Schema({});
            NestedKeySchema.method("foo", {
                bar() {
                    return this;
                }
            });
            const NestedKey = db.model("NestedKey", NestedKeySchema);
            const n = new NestedKey();
            assert.equal(n.foo.bar(), n);
            done();
        });
    });

    describe("statics", () => {
        it("can be defined", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            db.close();
            assert.equal(BlogPost.woot(), BlogPost);
            done();
        });
    });

    describe("casting as validation errors", () => {
        it("error", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection),
                threw = false;

            let post;
            try {
                post = new BlogPost({ date: "Test", meta: { date: "Test" } });
            } catch (e) {
                threw = true;
            }

            assert.equal(threw, false);

            try {
                post.set("title", "Test");
            } catch (e) {
                threw = true;
            }

            assert.equal(threw, false);

            post.save((err) => {
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);
                assert.equal(Object.keys(err.errors).length, 2);
                post.date = new Date();
                post.meta.date = new Date();
                post.save((err) => {
                    db.close();
                    assert.ifError(err);
                    done();
                });
            });
        });
        it("nested error", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection),
                threw = false;

            const post = new BlogPost();

            try {
                post.init({
                    meta: {
                        date: "Test"
                    }
                });
            } catch (e) {
                threw = true;
            }

            assert.equal(threw, false);

            try {
                post.set("meta.date", "Test");
            } catch (e) {
                threw = true;
            }

            assert.equal(threw, false);

            post.save((err) => {
                db.close();
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);
                done();
            });
        });


        it("subdocument cast error", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            const post = new BlogPost({
                title: "Test",
                slug: "test",
                comments: [{ title: "Test", date: new Date(), body: "Test" }]
            });

            post.get("comments")[0].set("date", "invalid");

            post.save((err) => {
                db.close();
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);
                done();
            });
        });


        it("subdocument validation error", (done) => {
            function failingvalidator() {
                return false;
            }

            let db = start(),
                subs = new Schema({
                    str: {
                        type: String, validate: failingvalidator
                    }
                }),
                BlogPost = db.model("BlogPost", { subs: [subs] });

            const post = new BlogPost();
            post.init({
                subs: [{ str: "gaga" }]
            });

            post.save((err) => {
                db.close();
                assert.ok(err instanceof ValidationError);
                done();
            });
        });


        it("subdocument error when adding a subdoc", (done) => {
            const db = start();
            const BlogPost = db.model("BlogPost", collection);
            let threw = false;

            const post = new BlogPost();

            try {
                post.get("comments").push({
                    date: "Bad date"
                });
            } catch (e) {
                threw = true;
            }

            assert.equal(threw, true);

            post.save((err) => {
                db.close();
                // assert.ok(err instanceof MongooseError);
                // assert.ok(err instanceof ValidationError);
                done();
            });
        });


        it("updates", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            const post = new BlogPost();
            post.set("title", "1");

            const id = post.get("_id");

            post.save((err) => {
                assert.ifError(err);

                BlogPost.update({ title: 1, _id: id }, { title: 2 }, (err) => {
                    assert.ifError(err);

                    BlogPost.findOne({ _id: post.get("_id") }, (err, doc) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(doc.get("title"), "2");
                        done();
                    });
                });
            });
        });

        it("$pull", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection),
                post = new BlogPost();

            db.close();
            post.get("numbers").push("3");
            assert.equal(post.get("numbers")[0], 3);
            done();
        });

        it("$push", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection),
                post = new BlogPost();

            post.get("numbers").push(1, 2, 3, 4);
            post.save(() => {
                BlogPost.findById(post.get("_id"), (err, found) => {
                    assert.equal(found.get("numbers").length, 4);
                    found.get("numbers").pull("3");
                    found.save(() => {
                        BlogPost.findById(found.get("_id"), (err, found2) => {
                            db.close();
                            assert.ifError(err);
                            assert.equal(found2.get("numbers").length, 3);
                            done();
                        });
                    });
                });
            });
        });

        it("Number arrays", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            const post = new BlogPost();
            post.numbers.push(1, "2", 3);

            post.save((err) => {
                assert.strictEqual(err, null);

                BlogPost.findById(post._id, (err, doc) => {
                    assert.ifError(err);

                    assert.ok(~doc.numbers.indexOf(1));
                    assert.ok(~doc.numbers.indexOf(2));
                    assert.ok(~doc.numbers.indexOf(3));

                    db.close();
                    done();
                });
            });
        });

        it("date casting compat with datejs (gh-502)", (done) => {
            const db = start();

            Date.prototype.toObject = function () {
                return {
                    millisecond: 86,
                    second: 42,
                    minute: 47,
                    hour: 17,
                    day: 13,
                    week: 50,
                    month: 11,
                    year: 2011
                };
            };

            const S = new Schema({
                name: String,
                description: String,
                sabreId: String,
                data: {
                    lastPrice: Number,
                    comm: String,
                    curr: String,
                    rateName: String
                },
                created: { type: Date, default: Date.now },
                valid: { type: Boolean, default: true }
            });

            const M = db.model("gh502", S);

            const m = new M();
            m.save((err) => {
                assert.ifError(err);
                M.findById(m._id, (err, m) => {
                    assert.ifError(err);
                    m.save((err) => {
                        assert.ifError(err);
                        M.remove((err) => {
                            db.close();
                            delete Date.prototype.toObject;
                            assert.ifError(err);
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("validation", () => {
        it("works", (done) => {
            function dovalidate() {
                assert.equal(this.asyncScope, "correct");
                return true;
            }

            function dovalidateAsync(val, callback) {
                assert.equal(this.scope, "correct");
                process.nextTick(() => {
                    callback(true);
                });
            }

            mongoose.model("TestValidation", new Schema({
                simple: { type: String, required: true },
                scope: { type: String, validate: [dovalidate, "scope failed"], required: true },
                asyncScope: { type: String, validate: [dovalidateAsync, "async scope failed"], required: true }
            }));

            let db = start(),
                TestValidation = db.model("TestValidation");

            const post = new TestValidation();
            post.set("simple", "");
            post.set("scope", "correct");
            post.set("asyncScope", "correct");

            post.save((err) => {
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);

                post.set("simple", "here");
                post.save((err) => {
                    db.close();
                    assert.ifError(err);
                    done();
                });
            });
        });

        it("custom messaging", (done) => {
            function validate(val) {
                return val === "abc";
            }

            mongoose.model("TestValidationMessage", new Schema({
                simple: { type: String, validate: [validate, "must be abc"] }
            }));

            let db = start(),
                TestValidationMessage = db.model("TestValidationMessage");

            const post = new TestValidationMessage();
            post.set("simple", "");

            post.save((err) => {
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);
                assert.ok(err.errors.simple instanceof ValidatorError);
                assert.equal(err.errors.simple.message, "must be abc");
                assert.equal(post.errors.simple.message, "must be abc");

                post.set("simple", "abc");
                post.save((err) => {
                    db.close();
                    assert.ifError(err);
                    done();
                });
            });
        });

        it("with Model.schema.path introspection (gh-272)", (done) => {
            const db = start();
            const IntrospectionValidationSchema = new Schema({
                name: String
            });
            const IntrospectionValidation = db.model("IntrospectionValidation", IntrospectionValidationSchema, `introspections_${random()}`);
            IntrospectionValidation.schema.path("name").validate((value) => {
                return value.length < 2;
            }, 'Name cannot be greater than 1 character for path "{PATH}" with value `{VALUE}`');
            const doc = new IntrospectionValidation({ name: "hi" });
            doc.save((err) => {
                db.close();
                assert.equal(err.errors.name.message, 'Name cannot be greater than 1 character for path "name" with value `hi`');
                assert.equal(err.name, "ValidationError");
                assert.ok(err.message.indexOf("IntrospectionValidation validation failed") !== -1, err.message);
                done();
            });
        });

        it("of required undefined values", (done) => {
            mongoose.model("TestUndefinedValidation", new Schema({
                simple: { type: String, required: true }
            }));

            let db = start(),
                TestUndefinedValidation = db.model("TestUndefinedValidation");

            const post = new TestUndefinedValidation();

            post.save((err) => {
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);

                post.set("simple", "here");
                post.save((err) => {
                    db.close();
                    assert.ifError(err);
                    done();
                });
            });
        });

        it("save callback should only execute once (gh-319)", (done) => {
            const db = start();

            const D = db.model("CallbackFiresOnceValidation", new Schema({
                username: { type: String, validate: /^[a-z]{6}$/i },
                email: { type: String, validate: /^[a-z]{6}$/i },
                password: { type: String, validate: /^[a-z]{6}$/i }
            }));

            const post = new D({
                username: "nope",
                email: "too",
                password: "short"
            });

            let timesCalled = 0;

            post.save((err) => {
                db.close();
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);

                assert.equal(++timesCalled, 1);

                assert.equal(Object.keys(err.errors).length, 3);
                assert.ok(err.errors.password instanceof ValidatorError);
                assert.ok(err.errors.email instanceof ValidatorError);
                assert.ok(err.errors.username instanceof ValidatorError);
                assert.equal(err.errors.password.message, "Validator failed for path `password` with value `short`");
                assert.equal(err.errors.email.message, "Validator failed for path `email` with value `too`");
                assert.equal(err.errors.username.message, "Validator failed for path `username` with value `nope`");

                assert.equal(Object.keys(post.errors).length, 3);
                assert.ok(post.errors.password instanceof ValidatorError);
                assert.ok(post.errors.email instanceof ValidatorError);
                assert.ok(post.errors.username instanceof ValidatorError);
                assert.equal(post.errors.password.message, "Validator failed for path `password` with value `short`");
                assert.equal(post.errors.email.message, "Validator failed for path `email` with value `too`");
                assert.equal(post.errors.username.message, "Validator failed for path `username` with value `nope`");
                done();
            });
        });

        it("query result", (done) => {
            mongoose.model("TestValidationOnResult", new Schema({
                resultv: { type: String, required: true }
            }));

            let db = start(),
                TestV = db.model("TestValidationOnResult");

            const post = new TestV();

            post.validate((err) => {
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);

                post.resultv = "yeah";
                post.save((err) => {
                    assert.ifError(err);
                    TestV.findOne({ _id: post.id }, (err, found) => {
                        assert.ifError(err);
                        assert.equal(found.resultv, "yeah");
                        found.save((err) => {
                            db.close();
                            assert.ifError(err);
                            done();
                        });
                    });
                });
            });
        });

        it("of required previously existing null values", (done) => {
            mongoose.model("TestPreviousNullValidation", new Schema({
                previous: { type: String, required: true },
                a: String
            }));

            let db = start(),
                TestP = db.model("TestPreviousNullValidation");

            TestP.collection.insert({ a: null, previous: null }, {}, (err, f) => {
                assert.ifError(err);
                TestP.findOne({ _id: f.ops[0]._id }, (err, found) => {
                    assert.ifError(err);
                    assert.equal(found.isNew, false);
                    assert.strictEqual(found.get("previous"), null);

                    found.validate((err) => {
                        assert.ok(err instanceof MongooseError);
                        assert.ok(err instanceof ValidationError);

                        found.set("previous", "yoyo");
                        found.save((err) => {
                            assert.strictEqual(err, null);
                            db.close();
                            done();
                        });
                    });
                });
            });
        });

        it("nested", (done) => {
            mongoose.model("TestNestedValidation", new Schema({
                nested: {
                    required: { type: String, required: true }
                }
            }));

            let db = start(),
                TestNestedValidation = db.model("TestNestedValidation");

            const post = new TestNestedValidation();
            post.set("nested.required", null);

            post.save((err) => {
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);

                post.set("nested.required", "here");
                post.save((err) => {
                    db.close();
                    assert.ifError(err);
                    done();
                });
            });
        });

        it("of nested subdocuments", (done) => {
            const Subsubdocs = new Schema({ required: { type: String, required: true } });

            const Subdocs = new Schema({
                required: { type: String, required: true },
                subs: [Subsubdocs]
            });

            mongoose.model("TestSubdocumentsValidation", new Schema({
                items: [Subdocs]
            }));

            let db = start(),
                TestSubdocumentsValidation = db.model("TestSubdocumentsValidation");

            const post = new TestSubdocumentsValidation();

            post.get("items").push({ required: "", subs: [{ required: "" }] });

            post.save((err) => {
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);
                assert.ok(err.errors["items.0.subs.0.required"] instanceof ValidatorError);
                assert.equal(err.errors["items.0.subs.0.required"].message, "Path `required` is required.");
                assert.ok(post.errors["items.0.subs.0.required"] instanceof ValidatorError);
                assert.equal(post.errors["items.0.subs.0.required"].message, "Path `required` is required.");

                assert.ok(err.errors["items.0.required"]);
                assert.ok(post.errors["items.0.required"]);

                post.items[0].subs[0].set("required", true);
                assert.equal(post.$__.validationError, undefined);

                post.save((err) => {
                    assert.ok(err);
                    assert.ok(err.errors);
                    assert.ok(err.errors["items.0.required"] instanceof ValidatorError);
                    assert.equal(err.errors["items.0.required"].message, "Path `required` is required.");

                    assert.ok(!err.errors["items.0.subs.0.required"]);
                    assert.ok(!err.errors["items.0.subs.0.required"]);
                    assert.ok(!post.errors["items.0.subs.0.required"]);
                    assert.ok(!post.errors["items.0.subs.0.required"]);

                    post.get("items")[0].set("required", true);
                    post.save((err) => {
                        db.close();
                        assert.ok(!post.errors);
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });

        describe("async", () => {
            it("works", (done) => {
                let executed = false;

                function validator(v, fn) {
                    setTimeout(() => {
                        executed = true;
                        fn(v !== "test");
                    }, 5);
                }

                mongoose.model("TestAsyncValidation", new Schema({
                    async: { type: String, validate: [validator, "async validator failed for `{PATH}`"] }
                }));

                let db = start(),
                    TestAsyncValidation = db.model("TestAsyncValidation");

                const post = new TestAsyncValidation();
                post.set("async", "test");

                post.save((err) => {
                    assert.ok(err instanceof MongooseError);
                    assert.ok(err instanceof ValidationError);
                    assert.ok(err.errors.async instanceof ValidatorError);
                    assert.equal(err.errors.async.message, "async validator failed for `async`");
                    assert.equal(executed, true);
                    executed = false;

                    post.set("async", "woot");
                    post.save((err) => {
                        db.close();
                        assert.equal(executed, true);
                        assert.strictEqual(err, null);
                        done();
                    });
                });
            });

            it("nested", (done) => {
                let executed = false;

                function validator(v, fn) {
                    setTimeout(() => {
                        executed = true;
                        fn(v !== "test");
                    }, 5);
                }

                mongoose.model("TestNestedAsyncValidation", new Schema({
                    nested: {
                        async: { type: String, validate: [validator, "async validator"] }
                    }
                }));

                let db = start(),
                    TestNestedAsyncValidation = db.model("TestNestedAsyncValidation");

                const post = new TestNestedAsyncValidation();
                post.set("nested.async", "test");

                post.save((err) => {
                    assert.ok(err instanceof MongooseError);
                    assert.ok(err instanceof ValidationError);
                    assert.ok(executed);
                    executed = false;

                    post.validate((err) => {
                        assert.ok(err instanceof MongooseError);
                        assert.ok(err instanceof ValidationError);
                        assert.ok(executed);
                        executed = false;

                        post.set("nested.async", "woot");
                        post.validate((err) => {
                            assert.ok(executed);
                            assert.equal(err, null);
                            executed = false;

                            post.save((err) => {
                                db.close();
                                assert.ok(executed);
                                assert.strictEqual(err, null);
                                done();
                            });
                        });
                    });
                });
            });

            it("subdocuments", (done) => {
                let executed = false;

                function validator(v, fn) {
                    setTimeout(() => {
                        executed = true;
                        fn(v !== "");
                    }, 5);
                }

                const Subdocs = new Schema({
                    required: { type: String, validate: [validator, "async in subdocs"] }
                });

                mongoose.model("TestSubdocumentsAsyncValidation", new Schema({
                    items: [Subdocs]
                }));

                let db = start(),
                    Test = db.model("TestSubdocumentsAsyncValidation");

                const post = new Test();

                post.get("items").push({ required: "" });

                post.save((err) => {
                    assert.ok(err instanceof MongooseError);
                    assert.ok(err instanceof ValidationError);
                    assert.ok(executed);
                    executed = false;

                    post.get("items")[0].set({ required: "here" });
                    post.save((err) => {
                        db.close();
                        assert.ok(executed);
                        assert.strictEqual(err, null);
                        done();
                    });
                });
            });
        });

        it("without saving", (done) => {
            mongoose.model("TestCallingValidation", new Schema({
                item: { type: String, required: true }
            }));

            let db = start(),
                TestCallingValidation = db.model("TestCallingValidation");

            const post = new TestCallingValidation();

            assert.equal(post.schema.path("item").isRequired, true);
            assert.strictEqual(post.isNew, true);

            post.validate((err) => {
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);
                assert.strictEqual(post.isNew, true);

                post.item = "yo";
                post.validate((err) => {
                    db.close();
                    assert.equal(err, null);
                    assert.strictEqual(post.isNew, true);
                    done();
                });
            });
        });

        it("when required is set to false", (done) => {
            function validator() {
                return true;
            }

            mongoose.model("TestRequiredFalse", new Schema({
                result: { type: String, validate: [validator, "chump validator"], required: false }
            }));

            let db = start(),
                TestV = db.model("TestRequiredFalse");

            const post = new TestV();

            db.close();
            assert.equal(post.schema.path("result").isRequired, false);
            done();
        });

        describe("middleware", () => {
            it("works", (done) => {
                let db = start(),
                    ValidationMiddlewareSchema = null,
                    Post = null,
                    post = null;

                ValidationMiddlewareSchema = new Schema({
                    baz: { type: String }
                });

                ValidationMiddlewareSchema.pre("validate", function (next) {
                    if (this.get("baz") === "bad") {
                        this.invalidate("baz", "bad");
                    }
                    next();
                });

                mongoose.model("ValidationMiddleware", ValidationMiddlewareSchema);

                Post = db.model("ValidationMiddleware");
                post = new Post();
                post.set({ baz: "bad" });

                post.save((err) => {
                    assert.ok(err instanceof MongooseError);
                    assert.ok(err instanceof ValidationError);
                    assert.equal(err.errors.baz.kind, "user defined");
                    assert.equal(err.errors.baz.path, "baz");

                    post.set("baz", "good");
                    post.save((err) => {
                        assert.ifError(err);
                        db.close();
                        done();
                    });
                });
            });

            it("async", (done) => {
                let db = start(),
                    AsyncValidationMiddlewareSchema = null,
                    Post = null,
                    post = null;

                AsyncValidationMiddlewareSchema = new Schema({
                    prop: { type: String }
                });

                AsyncValidationMiddlewareSchema.pre("validate", true, function (next, done) {
                    const _this = this;
                    setTimeout(() => {
                        if (_this.get("prop") === "bad") {
                            _this.invalidate("prop", "bad");
                        }
                        done();
                    }, 5);
                    next();
                });

                mongoose.model("AsyncValidationMiddleware", AsyncValidationMiddlewareSchema);

                Post = db.model("AsyncValidationMiddleware");
                post = new Post();
                post.set({ prop: "bad" });

                post.save((err) => {
                    assert.ok(err instanceof MongooseError);
                    assert.ok(err instanceof ValidationError);
                    assert.equal(err.errors.prop.kind, "user defined");
                    assert.equal(err.errors.prop.path, "prop");

                    post.set("prop", "good");
                    post.save((err) => {
                        assert.ifError(err);
                        db.close();
                        done();
                    });
                });
            });

            it("complex", (done) => {
                let db = start(),
                    ComplexValidationMiddlewareSchema = null,
                    Post = null,
                    post = null,
                    abc = function (v) {
                        return v === "abc";
                    };

                ComplexValidationMiddlewareSchema = new Schema({
                    baz: { type: String },
                    abc: { type: String, validate: [abc, "must be abc"] },
                    test: { type: String, validate: [/test/, "must also be abc"] },
                    required: { type: String, required: true }
                });

                ComplexValidationMiddlewareSchema.pre("validate", true, function (next, done) {
                    const _this = this;
                    setTimeout(() => {
                        if (_this.get("baz") === "bad") {
                            _this.invalidate("baz", "bad");
                        }
                        done();
                    }, 5);
                    next();
                });

                mongoose.model("ComplexValidationMiddleware", ComplexValidationMiddlewareSchema);

                Post = db.model("ComplexValidationMiddleware");
                post = new Post();
                post.set({
                    baz: "bad",
                    abc: "not abc",
                    test: "fail"
                });

                post.save((err) => {
                    assert.ok(err instanceof MongooseError);
                    assert.ok(err instanceof ValidationError);
                    assert.equal(Object.keys(err.errors).length, 4);
                    assert.ok(err.errors.baz instanceof ValidatorError);
                    assert.equal(err.errors.baz.kind, "user defined");
                    assert.equal(err.errors.baz.path, "baz");
                    assert.ok(err.errors.abc instanceof ValidatorError);
                    assert.equal(err.errors.abc.kind, "user defined");
                    assert.equal(err.errors.abc.message, "must be abc");
                    assert.equal(err.errors.abc.path, "abc");
                    assert.ok(err.errors.test instanceof ValidatorError);
                    assert.equal(err.errors.test.message, "must also be abc");
                    assert.equal(err.errors.test.kind, "user defined");
                    assert.equal(err.errors.test.path, "test");
                    assert.ok(err.errors.required instanceof ValidatorError);
                    assert.equal(err.errors.required.kind, "required");
                    assert.equal(err.errors.required.path, "required");

                    post.set({
                        baz: "good",
                        abc: "abc",
                        test: "test",
                        required: "here"
                    });

                    post.save((err) => {
                        assert.ifError(err);
                        db.close();
                        done();
                    });
                });
            });
        });
    });

    describe("defaults application", () => {
        it("works", (done) => {
            const now = Date.now();

            mongoose.model("TestDefaults", new Schema({
                date: { type: Date, default: now }
            }));

            let db = start(),
                TestDefaults = db.model("TestDefaults");

            db.close();
            const post = new TestDefaults();
            assert.ok(post.get("date") instanceof Date);
            assert.equal(Number(post.get("date")), now);
            done();
        });

        it("nested", (done) => {
            const now = Date.now();

            mongoose.model("TestNestedDefaults", new Schema({
                nested: {
                    date: { type: Date, default: now }
                }
            }));

            let db = start(),
                TestDefaults = db.model("TestNestedDefaults");

            const post = new TestDefaults();
            db.close();
            assert.ok(post.get("nested.date") instanceof Date);
            assert.equal(Number(post.get("nested.date")), now);
            done();
        });

        it("subdocument", (done) => {
            const now = Date.now();

            const Items = new Schema({
                date: { type: Date, default: now }
            });

            mongoose.model("TestSubdocumentsDefaults", new Schema({
                items: [Items]
            }));

            let db = start(),
                TestSubdocumentsDefaults = db.model("TestSubdocumentsDefaults");

            db.close();
            const post = new TestSubdocumentsDefaults();
            post.get("items").push({});
            assert.ok(post.get("items")[0].get("date") instanceof Date);
            assert.equal(Number(post.get("items")[0].get("date")), now);
            done();
        });

        it("allows nulls", (done) => {
            const db = start();
            const T = db.model("NullDefault", new Schema({ name: { type: String, default: null } }), collection);
            const t = new T();

            assert.strictEqual(null, t.name);

            t.save((err) => {
                assert.ifError(err);

                T.findById(t._id, (err, t) => {
                    db.close();
                    assert.ifError(err);
                    assert.strictEqual(null, t.name);
                    done();
                });
            });
        });

        it("do not cause the document to stay dirty after save", (done) => {
            let db = start(),
                Model = db.model("SavingDefault", new Schema({ name: { type: String, default: "saving" } }), collection),
                doc = new Model();

            doc.save((err, doc, numberAffected) => {
                assert.ifError(err);
                assert.strictEqual(1, numberAffected);

                doc.save((err, doc, numberAffected) => {
                    db.close();
                    assert.ifError(err);
                    // should not have saved a second time
                    assert.strictEqual(0, numberAffected);
                    done();
                });
            });
        });
    });

    describe("virtuals", () => {
        it("getters", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection),
                post = new BlogPost({
                    title: "Letters from Earth",
                    author: "Mark Twain"
                });

            db.close();
            assert.equal(post.get("titleWithAuthor"), "Letters from Earth by Mark Twain");
            assert.equal(post.titleWithAuthor, "Letters from Earth by Mark Twain");
            done();
        });

        it("set()", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection),
                post = new BlogPost();

            db.close();
            post.set("titleWithAuthor", "Huckleberry Finn by Mark Twain");
            assert.equal(post.get("title"), "Huckleberry Finn");
            assert.equal(post.get("author"), "Mark Twain");
            done();
        });

        it("should not be saved to the db", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection),
                post = new BlogPost();

            post.set("titleWithAuthor", "Huckleberry Finn by Mark Twain");

            post.save((err) => {
                assert.ifError(err);

                BlogPost.findById(post.get("_id"), (err, found) => {
                    assert.ifError(err);

                    assert.equal(found.get("title"), "Huckleberry Finn");
                    assert.equal(found.get("author"), "Mark Twain");
                    assert.ok(!("titleWithAuthor" in found.toObject()));
                    db.close();
                    done();
                });
            });
        });

        it("nested", (done) => {
            let db = start(),
                PersonSchema = new Schema({
                    name: {
                        first: String,
                        last: String
                    }
                });

            PersonSchema
                .virtual("name.full")
                .get(function () {
                    return `${this.get("name.first")} ${this.get("name.last")}`;
                })
                .set(function (fullName) {
                    const split = fullName.split(" ");
                    this.set("name.first", split[0]);
                    this.set("name.last", split[1]);
                });

            mongoose.model("Person", PersonSchema);

            let Person = db.model("Person"),
                person = new Person({
                    name: {
                        first: "Michael",
                        last: "Sorrentino"
                    }
                });

            db.close();

            assert.equal(person.get("name.full"), "Michael Sorrentino");
            person.set("name.full", "The Situation");
            assert.equal(person.get("name.first"), "The");
            assert.equal(person.get("name.last"), "Situation");

            assert.equal(person.name.full, "The Situation");
            person.name.full = "Michael Sorrentino";
            assert.equal(person.name.first, "Michael");
            assert.equal(person.name.last, "Sorrentino");
            done();
        });
    });

    describe(".remove()", () => {
        it("works", (done) => {
            let db = start(),
                collection = `blogposts_${random()}`,
                BlogPost = db.model("BlogPost", collection);

            BlogPost.create({ title: 1 }, { title: 2 }, (err) => {
                assert.ifError(err);

                BlogPost.remove({ title: 1 }, (err) => {
                    assert.ifError(err);

                    BlogPost.find({}, (err, found) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(found.length, 1);
                        assert.equal(found[0].title, "2");
                        done();
                    });
                });
            });
        });

        it("errors when id deselected (gh-3118)", (done) => {
            let db = start(),
                collection = `blogposts_${random()}`,
                BlogPost = db.model("BlogPost", collection);

            BlogPost.create({ title: 1 }, { title: 2 }, (err) => {
                assert.ifError(err);
                BlogPost.findOne({ title: 1 }, { _id: 0 }, (error, doc) => {
                    assert.ifError(error);
                    doc.remove((err) => {
                        assert.ok(err);
                        assert.equal(err.message, "No _id found on document!");
                        db.close(done);
                    });
                });
            });
        });

        it("should not remove any records when deleting by id undefined", (done) => {
            const db = start();
            const collection = `blogposts_${random()}`;
            const BlogPost = db.model("BlogPost", collection);
            BlogPost.create({ title: 1 }, { title: 2 }, (err) => {
                assert.ifError(err);

                BlogPost.remove({ _id: undefined }, (err) => {
                    assert.ifError(err);
                    BlogPost.find({}, (err, found) => {
                        assert.equal(found.length, 2, "Should not remove any records");
                        done();
                    });
                });
            });
        });

        it("should not remove all documents in the collection (gh-3326)", (done) => {
            let db = start(),
                collection = `blogposts_${random()}`,
                BlogPost = db.model("BlogPost", collection);

            BlogPost.create({ title: 1 }, { title: 2 }, (err) => {
                assert.ifError(err);
                BlogPost.findOne({ title: 1 }, (error, doc) => {
                    assert.ifError(error);
                    doc.remove((err) => {
                        assert.ifError(err);
                        BlogPost.find((err, found) => {
                            db.close();
                            assert.ifError(err);
                            assert.equal(found.length, 1);
                            assert.equal(found[0].title, "2");
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("#remove()", () => {
        let db, B;

        before(() => {
            db = start();
            B = db.model("BlogPost", `blogposts_${random()}`);
        });

        after((done) => {
            db.close(done);
        });

        it("passes the removed document (gh-1419)", (done) => {
            B.create({}, (err, post) => {
                assert.ifError(err);
                B.findById(post, (err, found) => {
                    assert.ifError(err);

                    found.remove((err, doc) => {
                        assert.ifError(err);
                        assert.ok(doc);
                        assert.ok(doc.equals(found));
                        done();
                    });
                });
            });
        });

        it("works as a promise", async () => {
            const post = await B.create({});
            const found = await B.findById(post);
            const doc = await found.remove();
            assert.ok(doc);
            assert.ok(doc.equals(found));
        });

        it("works as a promise with a hook", async () => {
            let called = 0;
            const RHS = new Schema({
                name: String
            });
            RHS.pre("remove", (next) => {
                called++;
                return next();
            });

            const RH = db.model("RH", RHS, `RH_${random()}`);

            const post = await RH.create({ name: "to be removed" });
            assert.ok(post);
            const found = await RH.findById(post);
            assert.ok(found);

            const doc = await found.remove();
            assert.equal(called, 1);
            assert.ok(doc);
            assert.ok(doc.equals(found));
        });

        it("passes the removed document (gh-1419)", (done) => {
            B.create({}, (err, post) => {
                assert.ifError(err);
                B.findById(post, (err, found) => {
                    assert.ifError(err);

                    found.remove((err, doc) => {
                        assert.ifError(err);
                        assert.ok(doc);
                        assert.ok(doc.equals(found));
                        done();
                    });
                });
            });
        });

        describe("when called multiple times", () => {
            it("always executes the passed callback gh-1210", (done) => {
                let db = start(),
                    collection = `blogposts_${random()}`,
                    BlogPost = db.model("BlogPost", collection),
                    post = new BlogPost();

                post.save((err) => {
                    assert.ifError(err);

                    let pending = 2;

                    post.remove(() => {
                        if (--pending) {
                            return;
                        }
                        done();
                    });
                    post.remove(() => {
                        if (--pending) {
                            return;
                        }
                        done();
                    });
                });
            });
        });
    });

    describe("getters", () => {
        it("with same name on embedded docs do not class", (done) => {
            const Post = new Schema({
                title: String,
                author: { name: String },
                subject: { name: String }
            });

            mongoose.model("PostWithClashGetters", Post);

            let db = start(),
                PostModel = db.model("PostWithClashGetters", `postwithclash${random()}`);

            const post = new PostModel({
                title: "Test",
                author: { name: "A" },
                subject: { name: "B" }
            });

            db.close();
            assert.equal(post.author.name, "A");
            assert.equal(post.subject.name, "B");
            assert.equal(post.author.name, "A");
            done();
        });

        it("should not be triggered at construction (gh-685)", (done) => {
            let db = start(),
                called = false;

            db.close();

            const schema = new mongoose.Schema({
                number: {
                    type: Number,
                    set(x) {
                        return x / 2;
                    },
                    get(x) {
                        called = true;
                        return x * 2;
                    }
                }
            });

            const A = mongoose.model("gettersShouldNotBeTriggeredAtConstruction", schema);

            const a = new A({ number: 100 });
            assert.equal(called, false);
            let num = a.number;
            assert.equal(called, true);
            assert.equal(num.valueOf(), 100);
            assert.equal(a.getValue("number").valueOf(), 50);

            called = false;
            const b = new A();
            b.init({ number: 50 });
            assert.equal(called, false);
            num = b.number;
            assert.equal(called, true);
            assert.equal(num.valueOf(), 100);
            assert.equal(b.getValue("number").valueOf(), 50);
            done();
        });

        it("with type defined with { type: Native } (gh-190)", (done) => {
            const schema = new Schema({
                date: { type: Date }
            });

            mongoose.model("ShortcutGetterObject", schema);

            let db = start(),
                ShortcutGetter = db.model("ShortcutGetterObject", `shortcut${random()}`),
                post = new ShortcutGetter();

            db.close();
            post.set("date", Date.now());
            assert.ok(post.date instanceof Date);
            done();
        });

        describe("nested", () => {
            it("works", (done) => {
                const schema = new Schema({
                    first: {
                        second: [Number]
                    }
                });
                mongoose.model("ShortcutGetterNested", schema);

                let db = start(),
                    ShortcutGetterNested = db.model("ShortcutGetterNested", collection),
                    doc = new ShortcutGetterNested();

                db.close();
                assert.equal(typeof doc.first, "object");
                assert.ok(doc.first.second.isMongooseArray);
                done();
            });

            it("works with object literals", (done) => {
                let db = start(),
                    BlogPost = db.model("BlogPost", collection);

                db.close();
                const date = new Date();

                const meta = {
                    date,
                    visitors: 5
                };

                const post = new BlogPost();
                post.init({
                    meta
                });

                assert.ok(post.get("meta").date instanceof Date);
                assert.ok(post.meta.date instanceof Date);

                let threw = false;
                let getter1;
                let getter2;
                try {
                    JSON.stringify(meta);
                    getter1 = JSON.stringify(post.get("meta"));
                    getter2 = JSON.stringify(post.meta);
                } catch (err) {
                    threw = true;
                }

                assert.equal(threw, false);
                getter1 = JSON.parse(getter1);
                getter2 = JSON.parse(getter2);
                assert.equal(getter1.visitors, 5);
                assert.equal(getter2.visitors, 5);
                assert.equal(getter1.date, getter2.date);

                post.meta.date = new Date() - 1000;
                assert.ok(post.meta.date instanceof Date);
                assert.ok(post.get("meta").date instanceof Date);

                post.meta.visitors = 2;
                assert.equal(typeof post.get("meta").visitors, "number");
                assert.equal(typeof post.meta.visitors, "number");

                const newmeta = {
                    date: date - 2000,
                    visitors: 234
                };

                post.set(newmeta, "meta");

                assert.ok(post.meta.date instanceof Date);
                assert.ok(post.get("meta").date instanceof Date);
                assert.equal(typeof post.meta.visitors, "number");
                assert.equal(typeof post.get("meta").visitors, "number");
                assert.equal((Number(post.meta.date)), date - 2000);
                assert.equal((Number(post.get("meta").date)), date - 2000);
                assert.equal((Number(post.meta.visitors)), 234);
                assert.equal((Number(post.get("meta").visitors)), 234);

                // set object directly
                post.meta = {
                    date: date - 3000,
                    visitors: 4815162342
                };

                assert.ok(post.meta.date instanceof Date);
                assert.ok(post.get("meta").date instanceof Date);
                assert.equal(typeof post.meta.visitors, "number");
                assert.equal(typeof post.get("meta").visitors, "number");
                assert.equal((Number(post.meta.date)), date - 3000);
                assert.equal((Number(post.get("meta").date)), date - 3000);
                assert.equal((Number(post.meta.visitors)), 4815162342);
                assert.equal((Number(post.get("meta").visitors)), 4815162342);
                done();
            });

            it("object property access works when root initd with null", (done) => {
                const db = start();

                const schema = new Schema({
                    nest: {
                        st: String
                    }
                });

                mongoose.model("NestedStringA", schema);
                const T = db.model("NestedStringA", collection);

                const t = new T({ nest: null });

                assert.strictEqual(t.nest.st, undefined);
                t.nest = { st: "jsconf rules" };
                assert.deepEqual(t.nest.toObject(), { st: "jsconf rules" });
                assert.equal(t.nest.st, "jsconf rules");

                t.save((err) => {
                    db.close();
                    assert.ifError(err);
                    done();
                });
            });

            it("object property access works when root initd with undefined", (done) => {
                const db = start();

                const schema = new Schema({
                    nest: {
                        st: String
                    }
                });

                mongoose.model("NestedStringB", schema);
                const T = db.model("NestedStringB", collection);

                const t = new T({ nest: undefined });

                assert.strictEqual(t.nest.st, undefined);
                t.nest = { st: "jsconf rules" };
                assert.deepEqual(t.nest.toObject(), { st: "jsconf rules" });
                assert.equal(t.nest.st, "jsconf rules");

                t.save((err) => {
                    db.close();
                    assert.ifError(err);
                    done();
                });
            });

            it("pre-existing null object re-save", (done) => {
                const db = start();

                const schema = new Schema({
                    nest: {
                        st: String,
                        yep: String
                    }
                });

                mongoose.model("NestedStringC", schema);
                const T = db.model("NestedStringC", collection);

                const t = new T({ nest: null });

                t.save((err) => {
                    assert.ifError(err);

                    t.nest = { st: "jsconf rules", yep: "it does" };

                    // check that entire `nest` object is being $set
                    const u = t.$__delta()[1];
                    assert.ok(u.$set);
                    assert.ok(u.$set.nest);
                    assert.equal(Object.keys(u.$set.nest).length, 2);
                    assert.ok(u.$set.nest.yep);
                    assert.ok(u.$set.nest.st);

                    t.save((err) => {
                        assert.ifError(err);

                        T.findById(t.id, (err, t) => {
                            assert.ifError(err);
                            assert.equal(t.nest.st, "jsconf rules");
                            assert.equal(t.nest.yep, "it does");

                            t.nest = null;
                            t.save((err) => {
                                db.close();
                                assert.ifError(err);
                                assert.strictEqual(t._doc.nest, null);
                                done();
                            });
                        });
                    });
                });
            });

            it("array of Mixed on existing doc can be pushed to", (done) => {
                const db = start();

                mongoose.model("MySchema", new Schema({
                    nested: {
                        arrays: []
                    }
                }));

                let DooDad = db.model("MySchema"),
                    doodad = new DooDad({ nested: { arrays: [] } }),
                    date = 1234567890;

                doodad.nested.arrays.push(["+10", "yup", date]);

                doodad.save((err) => {
                    assert.ifError(err);

                    DooDad.findById(doodad._id, (err, doodad) => {
                        assert.ifError(err);

                        assert.deepEqual(doodad.nested.arrays.toObject(), [["+10", "yup", date]]);

                        doodad.nested.arrays.push(["another", 1]);

                        doodad.save((err) => {
                            assert.ifError(err);

                            DooDad.findById(doodad._id, (err, doodad) => {
                                db.close();
                                assert.ifError(err);
                                assert.deepEqual(doodad.nested.arrays.toObject(), [["+10", "yup", date], ["another", 1]]);
                                done();
                            });
                        });
                    });
                });
            });

            it('props can be set directly when property was named "type"', (done) => {
                const db = start();

                function def() {
                    return [{ x: 1 }, { x: 2 }, { x: 3 }];
                }

                mongoose.model("MySchema2", new Schema({
                    nested: {
                        type: { type: String, default: "yep" },
                        array: {
                            type: Array, default: def
                        }
                    }
                }));

                let DooDad = db.model("MySchema2", collection),
                    doodad = new DooDad();

                doodad.save((err) => {
                    assert.ifError(err);

                    DooDad.findById(doodad._id, (err, doodad) => {
                        assert.ifError(err);

                        assert.equal(doodad.nested.type, "yep");
                        assert.deepEqual(doodad.nested.array.toObject(), [{ x: 1 }, { x: 2 }, { x: 3 }]);

                        doodad.nested.type = "nope";
                        doodad.nested.array = ["some", "new", "stuff"];

                        doodad.save((err) => {
                            assert.ifError(err);

                            DooDad.findById(doodad._id, (err, doodad) => {
                                db.close();
                                assert.ifError(err);
                                assert.equal(doodad.nested.type, "nope");
                                assert.deepEqual(doodad.nested.array.toObject(), ["some", "new", "stuff"]);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe("setters", () => {
        it("are used on embedded docs (gh-365 gh-390 gh-422)", (done) => {
            const db = start();

            function setLat(val) {
                return parseInt(val, 10);
            }

            let tick = 0;

            function uptick() {
                return ++tick;
            }

            let Location = new Schema({
                lat: { type: Number, default: 0, set: setLat },
                long: { type: Number, set: uptick }
            });

            let Deal = new Schema({
                title: String,
                locations: [Location]
            });

            Location = db.model("Location", Location, `locations_${random()}`);
            Deal = db.model("Deal", Deal, `deals_${random()}`);

            const location = new Location({ lat: 1.2, long: 10 });
            assert.equal(location.lat.valueOf(), 1);
            assert.equal(location.long.valueOf(), 1);

            const deal = new Deal({ title: "My deal", locations: [{ lat: 1.2, long: 33 }] });
            assert.equal(deal.locations[0].lat.valueOf(), 1);
            assert.equal(deal.locations[0].long.valueOf(), 2);

            deal.save((err) => {
                assert.ifError(err);
                Deal.findById(deal._id, (err, deal) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(deal.locations[0].lat.valueOf(), 1);
                    // GH-422
                    assert.equal(deal.locations[0].long.valueOf(), 2);
                    done();
                });
            });
        });
    });

    it("changing a number non-atomically (gh-203)", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection);

        const post = new BlogPost();

        post.meta.visitors = 5;

        post.save((err) => {
            assert.ifError(err);

            BlogPost.findById(post._id, (err, doc) => {
                assert.ifError(err);

                doc.meta.visitors -= 2;

                doc.save((err) => {
                    assert.ifError(err);

                    BlogPost.findById(post._id, (err, doc) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(Number(doc.meta.visitors), 3);
                        done();
                    });
                });
            });
        });
    });

    describe("atomic subdocument", () => {
        it("saving", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection),
                totalDocs = 4,
                saveQueue = [];

            const post = new BlogPost();

            function complete() {
                BlogPost.findOne({ _id: post.get("_id") }, (err, doc) => {
                    db.close();

                    assert.ifError(err);
                    assert.equal(doc.get("comments").length, 5);

                    let v = doc.get("comments").some((comment) => {
                        return comment.get("title") === "1";
                    });

                    assert.ok(v);

                    v = doc.get("comments").some((comment) => {
                        return comment.get("title") === "2";
                    });

                    assert.ok(v);

                    v = doc.get("comments").some((comment) => {
                        return comment.get("title") === "3";
                    });

                    assert.ok(v);

                    v = doc.get("comments").some((comment) => {
                        return comment.get("title") === "4";
                    });

                    assert.ok(v);

                    v = doc.get("comments").some((comment) => {
                        return comment.get("title") === "5";
                    });

                    assert.ok(v);
                    done();
                });
            }

            function save(doc) {
                saveQueue.push(doc);
                if (saveQueue.length === 4) {
                    saveQueue.forEach((doc) => {
                        doc.save((err) => {
                            assert.ifError(err);
                            --totalDocs || complete();
                        });
                    });
                }
            }

            post.save((err) => {
                assert.ifError(err);

                BlogPost.findOne({ _id: post.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    doc.get("comments").push({ title: "1" });
                    save(doc);
                });

                BlogPost.findOne({ _id: post.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    doc.get("comments").push({ title: "2" });
                    save(doc);
                });

                BlogPost.findOne({ _id: post.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    doc.get("comments").push({ title: "3" });
                    save(doc);
                });

                BlogPost.findOne({ _id: post.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    doc.get("comments").push({ title: "4" }, { title: "5" });
                    save(doc);
                });
            });
        });

        it("setting (gh-310)", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            BlogPost.create({
                comments: [{ title: "first-title", body: "first-body" }]
            }, (err, blog) => {
                assert.ifError(err);
                BlogPost.findById(blog.id, (err, agent1blog) => {
                    assert.ifError(err);
                    BlogPost.findById(blog.id, (err, agent2blog) => {
                        assert.ifError(err);
                        agent1blog.get("comments")[0].title = "second-title";
                        agent1blog.save((err) => {
                            assert.ifError(err);
                            agent2blog.get("comments")[0].body = "second-body";
                            agent2blog.save((err) => {
                                assert.ifError(err);
                                BlogPost.findById(blog.id, (err, foundBlog) => {
                                    assert.ifError(err);
                                    db.close();
                                    var comment = foundBlog.get('comments')[0];
                                    assert.equal(comment.title, 'second-title');
                                    assert.equal(comment.body, 'second-body');
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it("doubly nested array saving and loading", (done) => {
        const Inner = new Schema({
            arr: [Number]
        });

        let Outer = new Schema({
            inner: [Inner]
        });
        mongoose.model("Outer", Outer);

        const db = start();
        Outer = db.model("Outer", `arr_test_${random()}`);

        const outer = new Outer();
        outer.inner.push({});
        outer.save((err) => {
            assert.ifError(err);
            assert.ok(outer.get("_id") instanceof DocumentObjectId);

            Outer.findById(outer.get("_id"), (err, found) => {
                assert.ifError(err);
                assert.equal(found.inner.length, 1);
                found.inner[0].arr.push(5);
                found.save((err) => {
                    assert.ifError(err);
                    assert.ok(found.get("_id") instanceof DocumentObjectId);
                    Outer.findById(found.get("_id"), (err, found2) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(found2.inner.length, 1);
                        assert.equal(found2.inner[0].arr.length, 1);
                        assert.equal(found2.inner[0].arr[0], 5);
                        done();
                    });
                });
            });
        });
    });

    it("updating multiple Number $pushes as a single $pushAll", (done) => {
        let db = start(),
            schema = new Schema({
                nested: {
                    nums: [Number]
                }
            });

        mongoose.model("NestedPushes", schema);
        const Temp = db.model("NestedPushes", collection);

        Temp.create({}, (err, t) => {
            assert.ifError(err);
            t.nested.nums.push(1);
            t.nested.nums.push(2);

            assert.equal(t.nested.nums.length, 2);

            t.save((err) => {
                assert.ifError(err);
                assert.equal(t.nested.nums.length, 2);
                Temp.findById(t._id, (err) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(t.nested.nums.length, 2);
                    done();
                });
            });
        });
    });

    it("updating at least a single $push and $pushAll as a single $pushAll", (done) => {
        let db = start(),
            schema = new Schema({
                nested: {
                    nums: [Number]
                }
            });

        const Temp = db.model("NestedPushes", schema, collection);

        Temp.create({}, (err, t) => {
            assert.ifError(err);
            t.nested.nums.push(1);
            t.nested.nums.push(2, 3);
            assert.equal(t.nested.nums.length, 3);

            t.save((err) => {
                assert.ifError(err);
                assert.equal(t.nested.nums.length, 3);
                Temp.findById(t._id, (err, found) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(found.nested.nums.length, 3);
                    done();
                });
            });
        });
    });

    it("activePaths should be updated for nested modifieds", (done) => {
        let db = start(),
            schema = new Schema({
                nested: {
                    nums: [Number]
                }
            });

        const Temp = db.model("NestedPushes", schema, collection);

        Temp.create({ nested: { nums: [1, 2, 3, 4, 5] } }, (err, t) => {
            assert.ifError(err);
            t.nested.nums.pull(1);
            t.nested.nums.pull(2);
            assert.equal(t.$__.activePaths.paths["nested.nums"], "modify");
            db.close();
            done();
        });
    });


    it("activePaths should be updated for nested modifieds as promise", async () => {
        let db = start(),
            schema = new Schema({
                nested: {
                    nums: [Number]
                }
            });

        const Temp = db.model("NestedPushes", schema, collection);

        const t = await Temp.create({ nested: { nums: [1, 2, 3, 4, 5] } });
        t.nested.nums.pull(1);
        t.nested.nums.pull(2);
        assert.equal(t.$__.activePaths.paths["nested.nums"], "modify");
        db.close();
    });

    it("$pull should affect what you see in an array before a save", (done) => {
        let db = start(),
            schema = new Schema({
                nested: {
                    nums: [Number]
                }
            });

        const Temp = db.model("NestedPushes", schema, collection);

        Temp.create({ nested: { nums: [1, 2, 3, 4, 5] } }, (err, t) => {
            assert.ifError(err);
            t.nested.nums.pull(1);
            assert.equal(t.nested.nums.length, 4);
            db.close();
            done();
        });
    });

    it("$shift", (done) => {
        let db = start(),
            schema = new Schema({
                nested: {
                    nums: [Number]
                }
            });

        mongoose.model("TestingShift", schema);
        const Temp = db.model("TestingShift", collection);

        Temp.create({ nested: { nums: [1, 2, 3] } }, (err, t) => {
            assert.ifError(err);

            Temp.findById(t._id, (err, found) => {
                assert.ifError(err);
                assert.equal(found.nested.nums.length, 3);
                found.nested.nums.$pop();
                assert.equal(found.nested.nums.length, 2);
                assert.equal(found.nested.nums[0], 1);
                assert.equal(found.nested.nums[1], 2);

                found.save((err) => {
                    assert.ifError(err);
                    Temp.findById(t._id, (err, found) => {
                        assert.ifError(err);
                        assert.equal(found.nested.nums.length, 2);
                        assert.equal(found.nested.nums[0], 1, 1);
                        assert.equal(found.nested.nums[1], 2, 2);
                        found.nested.nums.$shift();
                        assert.equal(found.nested.nums.length, 1);
                        assert.equal(found.nested.nums[0], 2);

                        found.save((err) => {
                            assert.ifError(err);
                            Temp.findById(t._id, (err, found) => {
                                db.close();
                                assert.ifError(err);
                                assert.equal(found.nested.nums.length, 1);
                                assert.equal(found.nested.nums[0], 2);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe("saving embedded arrays", () => {
        it("of Numbers atomically", (done) => {
            let db = start(),
                TempSchema = new Schema({
                    nums: [Number]
                }),
                totalDocs = 2,
                saveQueue = [];

            mongoose.model("Temp", TempSchema);
            const Temp = db.model("Temp", collection);

            const t = new Temp();

            function complete() {
                Temp.findOne({ _id: t.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    assert.equal(doc.get("nums").length, 3);

                    let v = doc.get("nums").some((num) => {
                        return num.valueOf() === 1;
                    });
                    assert.ok(v);

                    v = doc.get("nums").some((num) => {
                        return num.valueOf() === 2;
                    });
                    assert.ok(v);

                    v = doc.get("nums").some((num) => {
                        return num.valueOf() === 3;
                    });
                    assert.ok(v);
                    db.close(done);
                });
            }

            function save(doc) {
                saveQueue.push(doc);
                if (saveQueue.length === totalDocs) {
                    saveQueue.forEach((doc) => {
                        doc.save((err) => {
                            assert.ifError(err);
                            --totalDocs || complete();
                        });
                    });
                }
            }

            t.save((err) => {
                assert.ifError(err);

                Temp.findOne({ _id: t.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    doc.get("nums").push(1);
                    save(doc);
                });

                Temp.findOne({ _id: t.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    doc.get("nums").push(2, 3);
                    save(doc);
                });
            });
        });

        it("of Strings atomically", (done) => {
            let db = start(),
                StrListSchema = new Schema({
                    strings: [String]
                }),
                totalDocs = 2,
                saveQueue = [];

            mongoose.model("StrList", StrListSchema);
            const StrList = db.model("StrList");

            const t = new StrList();

            function complete() {
                StrList.findOne({ _id: t.get("_id") }, (err, doc) => {
                    db.close();
                    assert.ifError(err);

                    assert.equal(doc.get("strings").length, 3);

                    let v = doc.get("strings").some((str) => {
                        return str === "a";
                    });
                    assert.ok(v);

                    v = doc.get("strings").some((str) => {
                        return str === "b";
                    });
                    assert.ok(v);

                    v = doc.get("strings").some((str) => {
                        return str === "c";
                    });
                    assert.ok(v);
                    done();
                });
            }

            function save(doc) {
                saveQueue.push(doc);
                if (saveQueue.length === totalDocs) {
                    saveQueue.forEach((doc) => {
                        doc.save((err) => {
                            assert.ifError(err);
                            --totalDocs || complete();
                        });
                    });
                }
            }

            t.save((err) => {
                assert.ifError(err);

                StrList.findOne({ _id: t.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    doc.get("strings").push("a");
                    save(doc);
                });

                StrList.findOne({ _id: t.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    doc.get("strings").push("b", "c");
                    save(doc);
                });
            });
        });

        it("of Buffers atomically", (done) => {
            let db = start(),
                BufListSchema = new Schema({
                    buffers: [Buffer]
                }),
                totalDocs = 2,
                saveQueue = [];

            mongoose.model("BufList", BufListSchema);
            const BufList = db.model("BufList");

            const t = new BufList();

            function complete() {
                BufList.findOne({ _id: t.get("_id") }, (err, doc) => {
                    db.close();
                    assert.ifError(err);

                    assert.equal(doc.get("buffers").length, 3);

                    let v = doc.get("buffers").some((buf) => {
                        return buf[0] === 140;
                    });
                    assert.ok(v);

                    v = doc.get("buffers").some((buf) => {
                        return buf[0] === 141;
                    });
                    assert.ok(v);

                    v = doc.get("buffers").some((buf) => {
                        return buf[0] === 142;
                    });
                    assert.ok(v);

                    done();
                });
            }

            function save(doc) {
                saveQueue.push(doc);
                if (saveQueue.length === totalDocs) {
                    saveQueue.forEach((doc) => {
                        doc.save((err) => {
                            assert.ifError(err);
                            --totalDocs || complete();
                        });
                    });
                }
            }

            t.save((err) => {
                assert.ifError(err);

                BufList.findOne({ _id: t.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    doc.get("buffers").push(new Buffer([140]));
                    save(doc);
                });

                BufList.findOne({ _id: t.get("_id") }, (err, doc) => {
                    assert.ifError(err);
                    doc.get("buffers").push(new Buffer([141]), new Buffer([142]));
                    save(doc);
                });
            });
        });

        it("works with modified element properties + doc removal (gh-975)", (done) => {
            let db = start(),
                B = db.model("BlogPost", collection),
                b = new B({ comments: [{ title: "gh-975" }] });

            b.save((err) => {
                assert.ifError(err);

                b.comments[0].title = "changed";
                b.save((err) => {
                    assert.ifError(err);

                    b.comments[0].remove();
                    b.save((err) => {
                        assert.ifError(err);

                        B.findByIdAndUpdate({ _id: b._id }, { $set: { comments: [{ title: "a" }] } }, { new: true }, (err, doc) => {
                            assert.ifError(err);
                            doc.comments[0].title = "differ";
                            doc.comments[0].remove();
                            doc.save((err) => {
                                assert.ifError(err);
                                B.findById(doc._id, (err, doc) => {
                                    db.close();
                                    assert.ifError(err);
                                    assert.equal(doc.comments.length, 0);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("updating an embedded document in an embedded array with set call", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            BlogPost.create({
                comments: [{
                    title: "before-change"
                }]
            }, (err, post) => {
                assert.ifError(err);
                BlogPost.findById(post._id, (err, found) => {
                    assert.ifError(err);
                    assert.equal(found.comments[0].title, "before-change");
                    const subDoc = [{
                        _id: found.comments[0]._id,
                        title: "after-change"
                    }];
                    found.set("comments", subDoc);

                    found.save((err) => {
                        assert.ifError(err);
                        BlogPost.findById(found._id, (err, updated) => {
                            db.close();
                            assert.ifError(err);
                            assert.equal(updated.comments[0].title, "after-change");
                            done();
                        });
                    });
                });
            });
        });
    });

    it("updating an embedded document in an embedded array (gh-255)", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection);

        BlogPost.create({ comments: [{ title: "woot" }] }, (err, post) => {
            assert.ifError(err);
            BlogPost.findById(post._id, (err, found) => {
                assert.ifError(err);
                assert.equal(found.comments[0].title, "woot");
                found.comments[0].title = "notwoot";
                found.save((err) => {
                    assert.ifError(err);
                    BlogPost.findById(found._id, (err, updated) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(updated.comments[0].title, "notwoot");
                        done();
                    });
                });
            });
        });
    });

    it("updating an embedded array document to an Object value (gh-334)", (done) => {
        let db = start(),
            SubSchema = new Schema({
                name: String,
                subObj: { subName: String }
            });
        const GH334Schema = new Schema({ name: String, arrData: [SubSchema] });

        mongoose.model("GH334", GH334Schema);
        const AModel = db.model("GH334");
        const instance = new AModel();

        instance.set({ name: "name-value", arrData: [{ name: "arrName1", subObj: { subName: "subName1" } }] });
        instance.save((err) => {
            assert.ifError(err);
            AModel.findById(instance.id, (err, doc) => {
                assert.ifError(err);
                doc.arrData[0].set("subObj", { subName: "modified subName" });
                doc.save((err) => {
                    assert.ifError(err);
                    AModel.findById(instance.id, (err, doc) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(doc.arrData[0].subObj.subName, "modified subName");
                        done();
                    });
                });
            });
        });
    });

    it("saving an embedded document twice should not push that doc onto the parent doc twice (gh-267)", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection),
            post = new BlogPost();

        post.comments.push({ title: "woot" });
        post.save((err) => {
            assert.ifError(err);
            assert.equal(post.comments.length, 1);
            BlogPost.findById(post.id, (err, found) => {
                assert.ifError(err);
                assert.equal(found.comments.length, 1);
                post.save((err) => {
                    assert.ifError(err);
                    assert.equal(post.comments.length, 1);
                    BlogPost.findById(post.id, (err, found) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(found.comments.length, 1);
                        done();
                    });
                });
            });
        });
    });

    describe("embedded array filtering", () => {
        it("by the id shortcut function", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            const post = new BlogPost();

            post.comments.push({ title: "woot" });
            post.comments.push({ title: "aaaa" });

            const subdoc1 = post.comments[0];
            const subdoc2 = post.comments[1];

            post.save((err) => {
                assert.ifError(err);

                BlogPost.findById(post.get("_id"), (err, doc) => {
                    db.close();
                    assert.ifError(err);

                    // test with an objectid
                    assert.equal(doc.comments.id(subdoc1.get("_id")).title, "woot");

                    // test with a string
                    const id = subdoc2._id.toString();
                    assert.equal(doc.comments.id(id).title, "aaaa");
                    done();
                });
            });
        });

        it("by the id with cast error", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            const post = new BlogPost();

            post.save((err) => {
                assert.ifError(err);

                BlogPost.findById(post.get("_id"), (err, doc) => {
                    db.close();
                    assert.ifError(err);
                    assert.strictEqual(doc.comments.id(null), null);
                    done();
                });
            });
        });

        it("by the id shortcut with no match", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            const post = new BlogPost();

            post.save((err) => {
                assert.ifError(err);

                BlogPost.findById(post.get("_id"), (err, doc) => {
                    db.close();
                    assert.ifError(err);
                    assert.strictEqual(doc.comments.id(new DocumentObjectId()), null);
                    done();
                });
            });
        });
    });

    it("removing a subdocument atomically", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection);

        const post = new BlogPost();
        post.title = "hahaha";
        post.comments.push({ title: "woot" });
        post.comments.push({ title: "aaaa" });

        post.save((err) => {
            assert.ifError(err);

            BlogPost.findById(post.get("_id"), (err, doc) => {
                assert.ifError(err);

                doc.comments[0].remove();
                doc.save((err) => {
                    assert.ifError(err);

                    BlogPost.findById(post.get("_id"), (err, doc) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(doc.comments.length, 1);
                        assert.equal(doc.comments[0].title, "aaaa");
                        done();
                    });
                });
            });
        });
    });

    it("single pull embedded doc", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection);

        const post = new BlogPost();
        post.title = "hahaha";
        post.comments.push({ title: "woot" });
        post.comments.push({ title: "aaaa" });

        post.save((err) => {
            assert.ifError(err);

            BlogPost.findById(post.get("_id"), (err, doc) => {
                assert.ifError(err);

                doc.comments.pull(doc.comments[0]);
                doc.comments.pull(doc.comments[0]);
                doc.save((err) => {
                    assert.ifError(err);

                    BlogPost.findById(post.get("_id"), (err, doc) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(doc.comments.length, 0);
                        done();
                    });
                });
            });
        });
    });

    it("saving mixed data", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection),
            count = 3;

        // string
        const post = new BlogPost();
        post.mixed = "woot";
        post.save((err) => {
            assert.ifError(err);

            BlogPost.findById(post._id, (err) => {
                assert.ifError(err);
                if (--count) {
                    return;
                }
                db.close();
                done();
            });
        });

        // array
        const post2 = new BlogPost();
        post2.mixed = { name: "mr bungle", arr: [] };
        post2.save((err) => {
            assert.ifError(err);

            BlogPost.findById(post2._id, (err, doc) => {
                assert.ifError(err);

                assert.equal(is.array(doc.mixed.arr), true);

                doc.mixed = [{ foo: "bar" }];
                doc.save((err) => {
                    assert.ifError(err);

                    BlogPost.findById(doc._id, (err, doc) => {
                        assert.ifError(err);

                        assert.equal(is.array(doc.mixed), true);
                        doc.mixed.push({ hello: "world" });
                        doc.mixed.push(["foo", "bar"]);
                        doc.markModified("mixed");

                        doc.save((err) => {
                            assert.ifError(err);

                            BlogPost.findById(post2._id, (err, doc) => {
                                assert.ifError(err);

                                assert.deepEqual(doc.mixed[0], { foo: "bar" });
                                assert.deepEqual(doc.mixed[1], { hello: "world" });
                                assert.deepEqual(doc.mixed[2], ["foo", "bar"]);
                                if (--count) {
                                    return;
                                }
                                db.close();
                                done();
                            });
                        });
                    });

                    // date
                    const post3 = new BlogPost();
                    post3.mixed = new Date();
                    post3.save((err) => {
                        assert.ifError(err);

                        BlogPost.findById(post3._id, (err, doc) => {
                            assert.ifError(err);
                            assert.ok(doc.mixed instanceof Date);
                            if (--count) {
                                return;
                            }
                            db.close();
                            done();
                        });
                    });
                });
            });
        });
    });

    it("populating mixed data from the constructor (gh-200)", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost");

        const post = new BlogPost({
            mixed: {
                type: "test",
                github: "rules",
                nested: {
                    number: 3
                }
            }
        });

        db.close();
        assert.equal(post.mixed.type, "test");
        assert.equal(post.mixed.github, "rules");
        assert.equal(post.mixed.nested.number, 3);
        done();
    });

    it('"type" is allowed as a key', (done) => {
        mongoose.model("TestTypeDefaults", new Schema({
            type: { type: String, default: "YES!" }
        }));

        let db = start(),
            TestDefaults = db.model("TestTypeDefaults");

        let post = new TestDefaults();
        assert.equal(typeof post.get("type"), "string");
        assert.equal(post.get("type"), "YES!");

        // GH-402
        const TestDefaults2 = db.model("TestTypeDefaults2", new Schema({
            x: { y: { type: { type: String }, owner: String } }
        }));

        post = new TestDefaults2();
        post.x.y.type = "#402";
        post.x.y.owner = "me";
        post.save((err) => {
            db.close();
            assert.ifError(err);
            done();
        });
    });

    it("unaltered model does not clear the doc (gh-195)", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection);

        const post = new BlogPost();
        post.title = "woot";
        post.save((err) => {
            assert.ifError(err);

            BlogPost.findById(post._id, (err, doc) => {
                assert.ifError(err);

                // we deliberately make no alterations
                doc.save((err) => {
                    assert.ifError(err);

                    BlogPost.findById(doc._id, (err, doc) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(doc.title, "woot");
                        done();
                    });
                });
            });
        });
    });

    describe("safe mode", () => {
        it("works", (done) => {
            let Human = new Schema({
                name: String,
                email: { type: String, index: { unique: true, background: false } }
            });

            mongoose.model("SafeHuman", Human, true);

            const db = start();
            Human = db.model("SafeHuman", `safehuman${random()}`);

            Human.on("index", (err) => {
                assert.ifError(err);
                const me = new Human({
                    name: "Guillermo Rauch",
                    email: "rauchg@gmail.com"
                });

                me.save((err) => {
                    assert.ifError(err);

                    Human.findById(me._id, (err, doc) => {
                        assert.ifError(err);
                        assert.equal(doc.email, "rauchg@gmail.com");

                        const copycat = new Human({
                            name: "Lionel Messi",
                            email: "rauchg@gmail.com"
                        });

                        copycat.save((err) => {
                            db.close();
                            assert.ok(/duplicate/.test(err.message));
                            assert.ok(err instanceof Error);
                            done();
                        });
                    });
                });
            });
        });

        it("can be disabled", (done) => {
            let Human = new Schema({
                name: String,
                email: { type: String, index: { unique: true, background: false } }
            });

            // turn it off
            Human.set("safe", false);

            mongoose.model("UnsafeHuman", Human, true);

            const db = start();
            Human = db.model("UnsafeHuman", `unsafehuman${random()}`);

            Human.on("index", (err) => {
                assert.ifError(err);
            });

            const me = new Human({
                name: "Guillermo Rauch",
                email: "rauchg@gmail.com"
            });

            me.save((err) => {
                assert.ifError(err);

                // no confirmation the write occured b/c we disabled safe.
                // wait a little bit to ensure the doc exists in the db
                setTimeout(() => {
                    Human.findById(me._id, (err, doc) => {
                        assert.ifError(err);
                        assert.equal(doc.email, "rauchg@gmail.com");

                        const copycat = new Human({
                            name: "Lionel Messi",
                            email: "rauchg@gmail.com"
                        });

                        copycat.save((err) => {
                            db.close();
                            assert.ifError(err);
                            done();
                        });
                    });
                }, 100);
            });
        });
    });

    describe("hooks", () => {
        describe("pre", () => {
            it("can pass non-error values to the next middleware", (done) => {
                const db = start();
                const schema = new Schema({ name: String });

                schema.pre("save", (next) => {
                    next("hey there");
                }).pre("save", (next, message) => {
                    assert.ok(message);
                    assert.equal(message, "hey there");
                    next();
                }).pre("save", (next) => {
                    // just throw error
                    next(new Error("error string"));
                }).pre("save", (next) => {
                    // don't call since error thrown in previous save
                    assert.ok(false);
                    next("don't call me");
                });
                const S = db.model("S", schema, collection);
                const s = new S({ name: "angelina" });

                s.save((err) => {
                    db.close();
                    assert.ok(err);
                    assert.equal(err.message, "error string");
                    done();
                });
            });

            it("with undefined and null", (done) => {
                const db = start();
                const schema = new Schema({ name: String });
                let called = 0;

                schema.pre("save", (next) => {
                    called++;
                    next(undefined);
                });

                schema.pre("save", (next) => {
                    called++;
                    next(null);
                });

                const S = db.model("S", schema, collection);
                const s = new S({ name: "zupa" });

                s.save((err) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(called, 2);
                    done();
                });
            });


            it("with an async waterfall", async () => {
                const db = start();
                const schema = new Schema({ name: String });
                let called = 0;

                schema.pre("save", true, (next, done) => {
                    called++;
                    process.nextTick(() => {
                        next();
                        done();
                    });
                });

                schema.pre("save", (next) => {
                    called++;
                    return next();
                });

                const S = db.model("S", schema, collection);
                const s = new S({ name: "zupa" });

                await s.save();
                db.close();
                assert.equal(called, 2);
            });


            it("called on all sub levels", (done) => {
                const db = start();

                const grandSchema = new Schema({ name: String });
                grandSchema.pre("save", function (next) {
                    this.name = "grand";
                    next();
                });

                const childSchema = new Schema({ name: String, grand: [grandSchema] });
                childSchema.pre("save", function (next) {
                    this.name = "child";
                    next();
                });

                const schema = new Schema({ name: String, child: [childSchema] });

                schema.pre("save", function (next) {
                    this.name = "parent";
                    next();
                });

                const S = db.model("presave_hook", schema, "presave_hook");
                const s = new S({ name: "a", child: [{ name: "b", grand: [{ name: "c" }] }] });

                s.save((err, doc) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(doc.name, "parent");
                    assert.equal(doc.child[0].name, "child");
                    assert.equal(doc.child[0].grand[0].name, "grand");
                    done();
                });
            });


            it("error on any sub level", (done) => {
                const db = start();

                const grandSchema = new Schema({ name: String });
                grandSchema.pre("save", (next) => {
                    next(new Error("Error 101"));
                });

                const childSchema = new Schema({ name: String, grand: [grandSchema] });
                childSchema.pre("save", function (next) {
                    this.name = "child";
                    next();
                });

                const schema = new Schema({ name: String, child: [childSchema] });
                schema.pre("save", function (next) {
                    this.name = "parent";
                    next();
                });

                const S = db.model("presave_hook_error", schema, "presave_hook_error");
                const s = new S({ name: "a", child: [{ name: "b", grand: [{ name: "c" }] }] });

                s.save((err) => {
                    db.close();
                    assert.ok(err instanceof Error);
                    assert.equal(err.message, "Error 101");
                    done();
                });
            });

            describe("init", () => {
                it("has access to the true ObjectId when used with querying (gh-289)", (done) => {
                    let db = start(),
                        PreInitSchema = new Schema({}),
                        preId = null;

                    PreInitSchema.pre("init", function (next) {
                        preId = this._id;
                        next();
                    });

                    const PreInit = db.model("PreInit", PreInitSchema, `pre_inits${random()}`);

                    const doc = new PreInit();
                    doc.save((err) => {
                        assert.ifError(err);
                        PreInit.findById(doc._id, (err) => {
                            db.close();
                            assert.ifError(err);
                            assert.strictEqual(undefined, preId);
                            done();
                        });
                    });
                });
            });

            it("should not work when calling next() after a thrown error", (done) => {
                const db = start();

                const s = new Schema({});
                s.methods.funky = function () {
                    assert.strictEqual(false, true, "reached unreachable code");
                };

                s.pre("funky", (next) => {
                    db.close();
                    try {
                        next(new Error());
                    } catch (error) {
                        // throws b/c nothing is listening to the db error event
                        assert.ok(error instanceof Error);
                        next();
                    }
                });
                const Kaboom = db.model("wowNext2xAndThrow", s, `next2xAndThrow${random()}`);
                new Kaboom().funky();
                done();
            });
        });

        describe("post", () => {
            it("works", (done) => {
                let schema = new Schema({
                        title: String
                    }),
                    save = false,
                    remove = false,
                    init = false,
                    post = undefined;

                schema.post("save", (arg) => {
                    assert.equal(arg.id, post.id);
                    save = true;
                });

                schema.post("init", () => {
                    init = true;
                });

                schema.post("remove", (arg) => {
                    assert.equal(arg.id, post.id);
                    remove = true;
                });

                mongoose.model("PostHookTest", schema);

                let db = start(),
                    BlogPost = db.model("PostHookTest");

                post = new BlogPost();

                post.save((err) => {
                    process.nextTick(() => {
                        assert.ifError(err);
                        assert.ok(save);
                        BlogPost.findById(post._id, (err, doc) => {
                            process.nextTick(() => {
                                assert.ifError(err);
                                assert.ok(init);

                                doc.remove((err) => {
                                    process.nextTick(function () {
                                        db.close();
                                        assert.ifError(err);
                                        assert.ok(remove);
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });

            it("on embedded docs", (done) => {
                let save = false;

                const EmbeddedSchema = new Schema({
                    title: String
                });

                EmbeddedSchema.post("save", () => {
                    save = true;
                });

                const ParentSchema = new Schema({
                    embeds: [EmbeddedSchema]
                });

                mongoose.model("Parent", ParentSchema);

                const db = start();
                const Parent = db.model("Parent");

                const parent = new Parent();

                parent.embeds.push({ title: "Testing post hooks for embedded docs" });

                parent.save((err) => {
                    db.close();
                    assert.ifError(err);
                    assert.ok(save);
                    done();
                });
            });
        });
    });

    describe("#exec()", () => {
        it("count()", (done) => {
            let db = start(),
                BlogPost = db.model(`BlogPost${random()}`, bpSchema);

            BlogPost.create({ title: "interoperable count as promise" }, (err) => {
                assert.ifError(err);
                const query = BlogPost.count({ title: "interoperable count as promise" });
                query.exec((err, count) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(count, 1);
                    done();
                });
            });
        });

        it("update()", (done) => {
            const col = `BlogPost${random()}`;
            let db = start(),
                BlogPost = db.model(col, bpSchema);

            BlogPost.create({ title: "interoperable update as promise" }, (err) => {
                assert.ifError(err);
                const query = BlogPost.update({ title: "interoperable update as promise" }, { title: "interoperable update as promise delta" });
                query.exec((err) => {
                    assert.ifError(err);
                    BlogPost.count({ title: "interoperable update as promise delta" }, (err, count) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(count, 1);
                        done();
                    });
                });
            });
        });

        it("findOne()", (done) => {
            let db = start(),
                BlogPost = db.model(`BlogPost${random()}`, bpSchema);

            BlogPost.create({ title: "interoperable findOne as promise" }, (err, created) => {
                assert.ifError(err);
                const query = BlogPost.findOne({ title: "interoperable findOne as promise" });
                query.exec((err, found) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(found.id, created.id);
                    done();
                });
            });
        });

        it("find()", (done) => {
            let db = start(),
                BlogPost = db.model(`BlogPost${random()}`, bpSchema);

            BlogPost.create(
                { title: "interoperable find as promise" },
                { title: "interoperable find as promise" },
                (err, createdOne, createdTwo) => {
                    assert.ifError(err);
                    const query = BlogPost.find({ title: "interoperable find as promise" }).sort("_id");
                    query.exec((err, found) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(found.length, 2);
                        const ids = {};
                        ids[String(found[0]._id)] = 1;
                        ids[String(found[1]._id)] = 1;
                        assert.ok(String(createdOne._id) in ids);
                        assert.ok(String(createdTwo._id) in ids);
                        done();
                    });
                });
        });

        it("remove()", (done) => {
            let db = start(),
                BlogPost = db.model(`BlogPost${random()}`, bpSchema);

            BlogPost.create(
                { title: "interoperable remove as promise" },
                (err) => {
                    assert.ifError(err);
                    const query = BlogPost.remove({ title: "interoperable remove as promise" });
                    query.exec((err) => {
                        assert.ifError(err);
                        BlogPost.count({ title: "interoperable remove as promise" }, (err, count) => {
                            db.close();
                            assert.equal(count, 0);
                            done();
                        });
                    });
                });
        });

        it("op can be changed", (done) => {
            let db = start(),
                BlogPost = db.model(`BlogPost${random()}`, bpSchema),
                title = "interop ad-hoc as promise";

            BlogPost.create({ title }, (err, created) => {
                assert.ifError(err);
                const query = BlogPost.count({ title });
                query.exec("findOne", (err, found) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(found.id, created.id);
                    done();
                });
            });
        });

        describe("promises", () => {
            it("count()", async () => {
                let db = start(),
                    BlogPost = db.model(`BlogPost${random()}`, bpSchema);

                await BlogPost.create({ title: "interoperable count as promise 2" });
                const query = BlogPost.count({ title: "interoperable count as promise 2" });
                const count = await query.exec();
                db.close();
                assert.equal(count, 1);
            });

            it("update()", async () => {
                const col = `BlogPost${random()}`;
                let db = start(),
                    BlogPost = db.model(col, bpSchema);

                await BlogPost.create({ title: "interoperable update as promise 2" });
                const query = BlogPost.update({ title: "interoperable update as promise 2" }, { title: "interoperable update as promise delta 2" });
                await query.exec();
                const count = await BlogPost.count({ title: "interoperable update as promise delta 2" });
                db.close();
                assert.equal(count, 1);
            });

            it("findOne()", async () => {
                let db = start(),
                    BlogPost = db.model(`BlogPost${random()}`, bpSchema);

                const created = await BlogPost.create({ title: "interoperable findOne as promise 2" });
                const query = BlogPost.findOne({ title: "interoperable findOne as promise 2" });
                const found = await query.exec();
                db.close();
                assert.equal(found.id, created.id);
            });

            it("find()", async () => {
                let db = start(),
                    BlogPost = db.model(`BlogPost${random()}`, bpSchema);

                const [createdOne, createdTwo] = await BlogPost.create(
                    { title: "interoperable find as promise 2" },
                    { title: "interoperable find as promise 2" });
                const query = BlogPost.find({ title: "interoperable find as promise 2" }).sort("_id");
                const found = await query.exec();
                db.close();
                assert.equal(found.length, 2);
                assert.equal(found[0].id, createdOne.id);
                assert.equal(found[1].id, createdTwo.id);
            });

            it("remove()", async () => {
                let db = start(),
                    BlogPost = db.model(`BlogPost${random()}`, bpSchema);

                await BlogPost.create({ title: "interoperable remove as promise 2" });
                const query = BlogPost.remove({ title: "interoperable remove as promise 2" });
                await query.exec();
                try {
                    const count = await BlogPost.count({ title: "interoperable remove as promise 2" });
                    assert.equal(count, 0);
                } finally {
                    db.close();
                }
            });

            it("are compatible with op modification on the fly", async () => {
                let db = start(),
                    BlogPost = db.model(`BlogPost${random()}`, bpSchema);
                try {
                    const created = await BlogPost.create({ title: "interoperable ad-hoc as promise 2" });
                    const query = BlogPost.count({ title: "interoperable ad-hoc as promise 2" });
                    const found = await query.exec("findOne");
                    assert.equal(found._id.toHexString(), created._id.toHexString());
                } finally {
                    db.close();
                }
            });

            it("are thenable", (done) => {
                let db = start(),
                    B = db.model(`BlogPost${random()}`, bpSchema);

                const peopleSchema = new Schema({ name: String, likes: ["ObjectId"] });
                const P = db.model("promise-BP-people", peopleSchema, random());
                B.create(
                    { title: "then promise 1" },
                    { title: "then promise 2" },
                    { title: "then promise 3" },
                    (err, d1, d2, d3) => {
                        assert.ifError(err);

                        P.create(
                            { name: "brandon", likes: [d1] },
                            { name: "ben", likes: [d2] },
                            { name: "bernie", likes: [d3] },
                            (err) => {
                                assert.ifError(err);

                                const promise = B.find({ title: /^then promise/ }).select("_id").exec();
                                promise.then((blogs) => {
                                    const ids = blogs.map((m) => {
                                        return m._id;
                                    });
                                    return P.where("likes").in(ids).exec();
                                }).then((people) => {
                                    assert.equal(people.length, 3);
                                    return people;
                                }).then(() => {
                                    db.close();
                                    done();
                                }, (err) => {
                                    db.close();
                                    done(new Error(err));
                                });
                            });
                    });
            });
        });
    });

    describe("console.log", () => {
        it("hides private props", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            const date = new Date(1305730951086);
            const id0 = new DocumentObjectId("4dd3e169dbfb13b4570000b9");
            const id1 = new DocumentObjectId("4dd3e169dbfb13b4570000b6");
            const id2 = new DocumentObjectId("4dd3e169dbfb13b4570000b7");
            const id3 = new DocumentObjectId("4dd3e169dbfb13b4570000b8");

            const post = new BlogPost({
                title: "Test",
                _id: id0,
                date,
                numbers: [5, 6, 7],
                owners: [id1],
                meta: { visitors: 45 },
                comments: [
                    { _id: id2, title: "my comment", date, body: "this is a comment" },
                    { _id: id3, title: "the next thang", date, body: "this is a comment too!" }]
            });

            db.close();

            const out = post.inspect();
            assert.equal(out.meta.visitors, post.meta.visitors);
            assert.deepEqual(out.numbers, Array.prototype.slice.call(post.numbers));
            assert.equal(out.date.valueOf(), post.date.valueOf());
            assert.equal(out.activePaths, undefined);
            assert.equal(out._atomics, undefined);
            done();
        });
    });

    describe("pathnames", () => {
        it("named path can be used", (done) => {
            let db = start(),
                P = db.model("pathnametest", new Schema({ path: String }));
            db.close();

            let threw = false;
            try {
                new P({ path: "i should not throw" });
            } catch (err) {
                threw = true;
            }

            assert.ok(!threw);
            done();
        });
    });

    describe("auto_reconnect", () => {
        describe("if disabled", () => {
            describe("with mongo down", () => {
                it("and no command buffering should pass an error", (done) => {
                    const db = start({ db: { bufferMaxEntries: 0 } });
                    const schema = new Schema({ type: String }, { bufferCommands: false });
                    const T = db.model("Thing", schema);
                    db.on("open", () => {
                        const t = new T({ type: "monster" });
                        let worked = false;

                        t.save((err) => {
                            assert.ok(/(operation|destroyed)/.test(err.message));
                            worked = true;
                        });

                        db.db.close();

                        setTimeout(() => {
                            assert.ok(worked);
                            done();
                        }, 100);
                    });
                });
            });
        });
    });

    it("subdocuments with changed values should persist the values", (done) => {
        const db = start();
        const Subdoc = new Schema({ name: String, mixed: Schema.Types.Mixed });
        const T = db.model("SubDocMixed", new Schema({ subs: [Subdoc] }));

        const t = new T({ subs: [{ name: "Hubot", mixed: { w: 1, x: 2 } }] });
        assert.equal(t.subs[0].name, "Hubot");
        assert.equal(t.subs[0].mixed.w, 1);
        assert.equal(t.subs[0].mixed.x, 2);

        t.save((err) => {
            assert.ifError(err);

            T.findById(t._id, (err, t) => {
                assert.ifError(err);
                assert.equal(t.subs[0].name, "Hubot");
                assert.equal(t.subs[0].mixed.w, 1);
                assert.equal(t.subs[0].mixed.x, 2);

                const sub = t.subs[0];
                sub.name = "Hubot1";
                assert.equal(sub.name, "Hubot1");
                assert.ok(sub.isModified("name"));
                assert.ok(t.isModified());

                t.save((err) => {
                    assert.ifError(err);

                    T.findById(t._id, (err, t) => {
                        assert.ifError(err);
                        assert.strictEqual(t.subs[0].name, "Hubot1");

                        const sub = t.subs[0];
                        sub.mixed.w = 5;
                        assert.equal(sub.mixed.w, 5);
                        assert.ok(!sub.isModified("mixed"));
                        sub.markModified("mixed");
                        assert.ok(sub.isModified("mixed"));
                        assert.ok(sub.isModified());
                        assert.ok(t.isModified());

                        t.save((err) => {
                            assert.ifError(err);

                            T.findById(t._id, (err, t) => {
                                db.close();
                                assert.ifError(err);
                                assert.strictEqual(t.subs[0].mixed.w, 5);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe("RegExps", () => {
        it("can be saved", (done) => {
            let db = start(),
                BlogPost = db.model("BlogPost", collection);

            const post = new BlogPost({ mixed: { rgx: /^asdf$/ } });
            assert.ok(post.mixed.rgx instanceof RegExp);
            assert.equal(post.mixed.rgx.source, "^asdf$");
            post.save((err) => {
                assert.ifError(err);
                BlogPost.findById(post._id, (err, post) => {
                    db.close();
                    assert.ifError(err);
                    assert.ok(post.mixed.rgx instanceof RegExp);
                    assert.equal(post.mixed.rgx.source, "^asdf$");
                    done();
                });
            });
        });
    });

    // Demonstration showing why GH-261 is a misunderstanding
    it("a single instantiated document should be able to update its embedded documents more than once", (done) => {
        let db = start(),
            BlogPost = db.model("BlogPost", collection);

        const post = new BlogPost();
        post.comments.push({ title: "one" });
        post.save((err) => {
            assert.ifError(err);
            assert.equal(post.comments[0].title, "one");
            post.comments[0].title = "two";
            assert.equal(post.comments[0].title, "two");
            post.save((err) => {
                assert.ifError(err);
                BlogPost.findById(post._id, (err, found) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(found.comments[0].title, "two");
                    done();
                });
            });
        });
    });

    describe("save()", () => {
        describe("when no callback is passed", () => {
            it("should emit error on its Model when there are listeners", (done) => {
                const db = start();

                const DefaultErrSchema = new Schema({});
                DefaultErrSchema.pre("save", (next) => {
                    next(new Error());
                });

                const DefaultErr = db.model("DefaultErr3", DefaultErrSchema, `default_err_${random()}`);

                DefaultErr.on("error", (err) => {
                    db.close();
                    assert.ok(err instanceof Error);
                    done();
                });

                new DefaultErr().save();
            });
        });

        it("returns number of affected docs", (done) => {
            const db = start();
            const schema = new Schema({ name: String });
            const S = db.model("AffectedDocsAreReturned", schema);
            const s = new S({ name: "aaron" });
            s.save((err, doc, affected) => {
                assert.ifError(err);
                assert.equal(affected, 1);
                s.name = "heckmanananananana";
                s.save((err, doc, affected) => {
                    db.close();
                    assert.ifError(err);
                    assert.equal(affected, 1);
                    done();
                });
            });
        });

        it("returns 0 as the number of affected docs if doc was not modified", (done) => {
            let db = start(),
                schema = new Schema({ name: String }),
                Model = db.model("AffectedDocsAreReturned", schema),
                doc = new Model({ name: "aaron" });

            doc.save((err, doc, affected) => {
                assert.ifError(err);
                assert.equal(affected, 1);

                Model.findById(doc.id).then((doc) => {
                    doc.save((err, doc, affected) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(affected, 0);
                        done();
                    });
                });
            });
        });

        it("saved changes made within callback of a previous no-op save gh-1139", (done) => {
            let db = start(),
                B = db.model("BlogPost", collection);

            const post = new B({ title: "first" });
            post.save((err) => {
                assert.ifError(err);

                // no op
                post.save((err) => {
                    assert.ifError(err);

                    post.title = "changed";
                    post.save((err) => {
                        assert.ifError(err);

                        B.findById(post, (err, doc) => {
                            assert.ifError(err);
                            assert.equal(doc.title, "changed");
                            db.close(done);
                        });
                    });
                });
            });
        });

        it("rejects new documents that have no _id set (1595)", (done) => {
            const db = start();
            const s = new Schema({ _id: { type: String } });
            const B = db.model("1595", s);
            const b = new B();
            b.save((err) => {
                db.close();
                assert.ok(err);
                assert.ok(/must have an _id/.test(err));
                done();
            });
        });
    });


    describe("_delta()", () => {
        it("should overwrite arrays when directly set (gh-1126)", (done) => {
            let db = start(),
                B = db.model("BlogPost", collection);

            B.create({ title: "gh-1126", numbers: [1, 2] }, (err, b) => {
                assert.ifError(err);
                B.findById(b._id, (err, b) => {
                    assert.ifError(err);
                    assert.deepEqual([1, 2].join(), b.numbers.join());

                    b.numbers = [];
                    b.numbers.push(3);

                    const d = b.$__delta()[1];
                    assert.ok("$set" in d, `invalid delta ${JSON.stringify(d)}`);
                    assert.ok(is.array(d.$set.numbers));
                    assert.equal(d.$set.numbers.length, 1);
                    assert.equal(d.$set.numbers[0], 3);

                    b.save((err) => {
                        assert.ifError(err);

                        B.findById(b._id, (err, b) => {
                            assert.ifError(err);
                            assert.ok(is.array(b.numbers));
                            assert.equal(b.numbers.length, 1);
                            assert.equal(b.numbers[0], 3);

                            b.numbers = [3];
                            const d = b.$__delta();
                            assert.ok(!d);

                            b.numbers = [4];
                            b.numbers.push(5);
                            b.save((err) => {
                                assert.ifError(err);
                                B.findById(b._id, (err, b) => {
                                    assert.ifError(err);
                                    assert.ok(Array.isArray(b.numbers));
                                    assert.equal(b.numbers.length, 2);
                                    assert.equal(b.numbers[0], 4);
                                    assert.equal(b.numbers[1], 5);
                                    db.close(done);
                                });
                            });
                        });
                    });
                });
            });
        });

        it("should use $set when subdoc changed before pulling (gh-1303)", (done) => {
            let db = start(),
                B = db.model("BlogPost", `gh-1303-${random()}`);

            B.create(
                { title: "gh-1303", comments: [{ body: "a" }, { body: "b" }, { body: "c" }] },
                (err, b) => {
                    assert.ifError(err);
                    B.findById(b._id, (err, b) => {
                        assert.ifError(err);

                        b.comments[2].body = "changed";
                        b.comments.pull(b.comments[1]);

                        assert.equal(b.comments.length, 2);
                        assert.equal(b.comments[0].body, "a");
                        assert.equal(b.comments[1].body, "changed");

                        const d = b.$__delta()[1];
                        assert.ok("$set" in d, `invalid delta ${JSON.stringify(d)}`);
                        assert.ok(is.array(d.$set.comments));
                        assert.equal(d.$set.comments.length, 2);

                        b.save((err) => {
                            assert.ifError(err);

                            B.findById(b._id, (err, b) => {
                                db.close();
                                assert.ifError(err);
                                assert.ok(is.array(b.comments));
                                assert.equal(b.comments.length, 2);
                                assert.equal(b.comments[0].body, "a");
                                assert.equal(b.comments[1].body, "changed");
                                done();
                            });
                        });
                    });
                });
        });
    });

    describe("backward compatibility", () => {
        it("with conflicted data in db", (done) => {
            const db = start();
            const M = db.model("backwardDataConflict", new Schema({ namey: { first: String, last: String } }));
            const m = new M({ namey: "[object Object]" });
            m.namey = { first: "GI", last: "Joe" };// <-- should overwrite the string
            m.save((err) => {
                db.close();
                assert.strictEqual(err, null);
                assert.strictEqual("GI", m.namey.first);
                assert.strictEqual("Joe", m.namey.last);
                done();
            });
        });

        it("with positional notation on path not existing in schema (gh-1048)", (done) => {
            const db = start();

            const M = db.model("backwardCompat-gh-1048", new Schema({ name: "string" }));
            db.on("open", () => {
                const o = {
                    name: "gh-1048",
                    _id: new mongoose.Types.ObjectId(),
                    databases: {
                        0: { keys: 100, expires: 0 },
                        15: { keys: 1, expires: 0 }
                    }
                };

                M.collection.insert(o, { safe: true }, (err) => {
                    assert.ifError(err);
                    M.findById(o._id, (err, doc) => {
                        db.close();
                        assert.ifError(err);
                        assert.ok(doc);
                        assert.ok(doc._doc.databases);
                        assert.ok(doc._doc.databases["0"]);
                        assert.ok(doc._doc.databases["15"]);
                        assert.equal(doc.databases, undefined);
                        done();
                    });
                });
            });
        });
    });

    describe("non-schema adhoc property assignments", () => {
        it("are not saved", (done) => {
            let db = start(),
                B = db.model("BlogPost", collection);

            const b = new B();
            b.whateveriwant = 10;
            b.save((err) => {
                assert.ifError(err);
                B.collection.findOne({ _id: b._id }, (err, doc) => {
                    db.close();
                    assert.ifError(err);
                    assert.ok(!("whateveriwant" in doc));
                    done();
                });
            });
        });
    });

    it("should not throw range error when using Number _id and saving existing doc (gh-691)", (done) => {
        const db = start();
        const T = new Schema({ _id: Number, a: String });
        const D = db.model("Testing691", T, `asdf${random()}`);
        const d = new D({ _id: 1 });
        d.save((err) => {
            assert.ifError(err);

            D.findById(d._id, (err, d) => {
                assert.ifError(err);

                d.a = "yo";
                d.save((err) => {
                    db.close();
                    assert.ifError(err);
                    done();
                });
            });
        });
    });

    describe("setting an unset value", () => {
        it("is saved (gh-742)", (done) => {
            const db = start();

            const DefaultTestObject = db.model("defaultTestObject",
                new Schema({
                    score: { type: Number, default: 55 }
                })
            );

            const myTest = new DefaultTestObject();

            myTest.save((err, doc) => {
                assert.ifError(err);
                assert.equal(doc.score, 55);

                DefaultTestObject.findById(doc._id, (err, doc) => {
                    assert.ifError(err);

                    doc.score = undefined; // unset
                    doc.save((err) => {
                        assert.ifError(err);

                        DefaultTestObject.findById(doc._id, (err, doc) => {
                            assert.ifError(err);

                            doc.score = 55;
                            doc.save((err, doc, count) => {
                                db.close();
                                assert.ifError(err);
                                assert.equal(doc.score, 55);
                                assert.equal(count, 1);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it("path is cast to correct value when retreived from db", (done) => {
        const db = start();
        const schema = new Schema({ title: { type: "string", index: true } });
        const T = db.model("T", schema);
        T.collection.insert({ title: 234 }, { safe: true }, (err) => {
            assert.ifError(err);
            T.findOne((err, doc) => {
                db.close();
                assert.ifError(err);
                assert.equal(doc.title, "234");
                done();
            });
        });
    });

    it("setting a path to undefined should retain the value as undefined", (done) => {
        let db = start(),
            B = db.model("BlogPost", collection + random());

        const doc = new B();
        doc.title = "css3";
        assert.equal(doc.$__delta()[1].$set.title, "css3");
        doc.title = undefined;
        assert.equal(doc.$__delta()[1].$unset.title, 1);
        assert.strictEqual(undefined, doc.$__delta()[1].$set.title);

        doc.title = "css3";
        doc.author = "aaron";
        doc.numbers = [3, 4, 5];
        doc.meta.date = new Date();
        doc.meta.visitors = 89;
        doc.comments = [{ title: "thanksgiving", body: "yuuuumm" }];
        doc.comments.push({ title: "turkey", body: "cranberries" });

        doc.save((err) => {
            assert.ifError(err);
            B.findById(doc._id, (err, b) => {
                assert.ifError(err);
                assert.equal(b.title, "css3");
                assert.equal(b.author, "aaron");
                assert.equal(b.meta.date.toString(), doc.meta.date.toString());
                assert.equal(b.meta.visitors.valueOf(), doc.meta.visitors.valueOf());
                assert.equal(b.comments.length, 2);
                assert.equal(b.comments[0].title, "thanksgiving");
                assert.equal(b.comments[0].body, "yuuuumm");
                assert.equal(b.comments[1].title, "turkey");
                assert.equal(b.comments[1].body, "cranberries");
                b.title = undefined;
                b.author = null;
                b.meta.date = undefined;
                b.meta.visitors = null;
                b.comments[0].title = null;
                b.comments[0].body = undefined;
                b.save((err) => {
                    assert.ifError(err);
                    B.findById(b._id, (err, b) => {
                        assert.ifError(err);
                        assert.strictEqual(undefined, b.title);
                        assert.strictEqual(null, b.author);

                        assert.strictEqual(undefined, b.meta.date);
                        assert.strictEqual(null, b.meta.visitors);
                        assert.strictEqual(null, b.comments[0].title);
                        assert.strictEqual(undefined, b.comments[0].body);
                        assert.equal(b.comments[1].title, "turkey");
                        assert.equal(b.comments[1].body, "cranberries");

                        b.meta = undefined;
                        b.comments = undefined;
                        b.save((err) => {
                            assert.ifError(err);
                            B.collection.findOne({ _id: b._id }, (err, b) => {
                                db.close();
                                assert.ifError(err);
                                assert.strictEqual(undefined, b.meta);
                                assert.strictEqual(undefined, b.comments);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe("unsetting a default value", () => {
        it("should be ignored (gh-758)", (done) => {
            const db = start();
            const M = db.model("758", new Schema({ s: String, n: Number, a: Array }));
            M.collection.insert({}, { safe: true }, (err) => {
                assert.ifError(err);
                M.findOne((err, m) => {
                    assert.ifError(err);
                    m.s = m.n = m.a = undefined;
                    assert.equal(m.$__delta(), undefined);
                    db.close(done);
                });
            });
        });
    });

    it("allow for object passing to ref paths (gh-1606)", (done) => {
        const db = start();
        const schA = new Schema({ title: String });
        const schma = new Schema({
            thing: { type: Schema.Types.ObjectId, ref: "A" },
            subdoc: {
                some: String,
                thing: [{ type: Schema.Types.ObjectId, ref: "A" }]
            }
        });

        const M1 = db.model("A", schA);
        const M2 = db.model("A2", schma);
        const a = new M1({ title: "hihihih" }).toObject();
        const thing = new M2({
            thing: a,
            subdoc: {
                title: "blah",
                thing: [a]
            }
        });

        assert.equal(thing.thing, a._id);
        assert.equal(thing.subdoc.thing[0], a._id);

        db.close(done);
    });

    it("setters trigger on null values (gh-1445)", (done) => {
        const db = start();
        db.close();

        const OrderSchema = new Schema({
            total: {
                type: Number,
                default: 0,
                set(value) {
                    assert.strictEqual(null, value);
                    return 10;
                }
            }
        });

        const Order = db.model(`order${random()}`, OrderSchema);
        const o = new Order({ total: null });
        assert.equal(o.total, 10);
        done();
    });

    describe("Skip setting default value for Geospatial-indexed fields (gh-1668)", () => {
        let db;

        before(() => {
            db = start({ noErrorListener: true });
        });

        after((done) => {
            db.close(done);
        });

        it("2dsphere indexed field with value is saved", (done) => {
            const PersonSchema = new Schema({
                name: String,
                loc: {
                    type: [Number],
                    index: "2dsphere"
                }
            });

            const Person = db.model("Person_1", PersonSchema);
            const loc = [0.3, 51.4];
            const p = new Person({
                name: "Jimmy Page",
                loc
            });

            p.save((err) => {
                assert.ifError(err);

                Person.findById(p._id, (err, personDoc) => {
                    assert.ifError(err);

                    assert.equal(personDoc.loc[0], loc[0]);
                    assert.equal(personDoc.loc[1], loc[1]);
                    done();
                });
            });
        });

        it("2dsphere indexed field without value is saved (gh-1668)", (done) => {
            const PersonSchema = new Schema({
                name: String,
                loc: {
                    type: [Number],
                    index: "2dsphere"
                }
            });

            const Person = db.model("Person_2", PersonSchema);
            const p = new Person({
                name: "Jimmy Page"
            });

            p.save((err) => {
                assert.ifError(err);

                Person.findById(p._id, (err, personDoc) => {
                    assert.ifError(err);

                    assert.equal(personDoc.name, "Jimmy Page");
                    assert.equal(personDoc.loc, undefined);
                    done();
                });
            });
        });

        it("2dsphere indexed field in subdoc without value is saved", (done) => {
            const PersonSchema = new Schema({
                name: { type: String, required: true },
                nested: {
                    tag: String,
                    loc: {
                        type: [Number]
                    }
                }
            });

            PersonSchema.index({ "nested.loc": "2dsphere" });

            const Person = db.model("Person_3", PersonSchema);
            const p = new Person({
                name: "Jimmy Page"
            });

            p.nested.tag = "guitarist";

            p.save((err) => {
                assert.ifError(err);

                Person.findById(p._id, (err, personDoc) => {
                    assert.ifError(err);

                    assert.equal(personDoc.name, "Jimmy Page");
                    assert.equal(personDoc.nested.tag, "guitarist");
                    assert.equal(personDoc.nested.loc, undefined);
                    done();
                });
            });
        });

        it("Doc with 2dsphere indexed field without initial value can be updated", (done) => {
            const PersonSchema = new Schema({
                name: String,
                loc: {
                    type: [Number],
                    index: "2dsphere"
                }
            });

            const Person = db.model("Person_4", PersonSchema);
            const p = new Person({
                name: "Jimmy Page"
            });

            p.save((err) => {
                assert.ifError(err);

                const updates = {
                    $set: {
                        loc: [0.3, 51.4]
                    }
                };

                Person.findByIdAndUpdate(p._id, updates, { new: true }, (err, personDoc) => {
                    assert.ifError(err);

                    assert.equal(personDoc.loc[0], updates.$set.loc[0]);
                    assert.equal(personDoc.loc[1], updates.$set.loc[1]);
                    done();
                });
            });
        });

        it("2dsphere indexed required field without value is rejected", (done) => {
            const PersonSchema = new Schema({
                name: String,
                loc: {
                    type: [Number],
                    required: true,
                    index: "2dsphere"
                }
            });

            const Person = db.model("Person_5", PersonSchema);
            const p = new Person({
                name: "Jimmy Page"
            });

            p.save((err) => {
                assert.ok(err instanceof MongooseError);
                assert.ok(err instanceof ValidationError);
                done();
            });
        });

        it("2dsphere field without value but with schema default is saved", (done) => {
            const loc = [0, 1];
            const PersonSchema = new Schema({
                name: String,
                loc: {
                    type: [Number],
                    default: loc,
                    index: "2dsphere"
                }
            });

            const Person = db.model("Person_6", PersonSchema);
            const p = new Person({
                name: "Jimmy Page"
            });

            p.save((err) => {
                assert.ifError(err);

                Person.findById(p._id, (err, personDoc) => {
                    assert.ifError(err);

                    assert.equal(loc[0], personDoc.loc[0]);
                    assert.equal(loc[1], personDoc.loc[1]);
                    done();
                });
            });
        });

        it("2d indexed field without value is saved", (done) => {
            const PersonSchema = new Schema({
                name: String,
                loc: {
                    type: [Number],
                    index: "2d"
                }
            });

            const Person = db.model("Person_7", PersonSchema);
            const p = new Person({
                name: "Jimmy Page"
            });

            p.save((err) => {
                assert.ifError(err);

                Person.findById(p._id, (err, personDoc) => {
                    assert.ifError(err);

                    assert.equal(personDoc.loc, undefined);
                    done();
                });
            });
        });

        it("Compound index with 2dsphere field without value is saved", (done) => {
            const PersonSchema = new Schema({
                name: String,
                type: String,
                slug: { type: String, index: { unique: true } },
                loc: { type: [Number] },
                tags: { type: [String], index: true }
            });

            PersonSchema.index({ name: 1, loc: "2dsphere" });

            const Person = db.model("Person_8", PersonSchema);
            const p = new Person({
                name: "Jimmy Page",
                type: "musician",
                slug: "ledzep-1",
                tags: ["guitarist"]
            });

            p.save((err) => {
                assert.ifError(err);

                Person.findById(p._id, (err, personDoc) => {
                    assert.ifError(err);

                    assert.equal(personDoc.name, "Jimmy Page");
                    assert.equal(personDoc.loc, undefined);
                    done();
                });
            });
        });


        it("Compound index on field earlier declared with 2dsphere index is saved", (done) => {
            const PersonSchema = new Schema({
                name: String,
                type: String,
                slug: { type: String, index: { unique: true } },
                loc: { type: [Number] },
                tags: { type: [String], index: true }
            });

            PersonSchema.index({ loc: "2dsphere" });
            PersonSchema.index({ name: 1, loc: -1 });

            const Person = db.model("Person_9", PersonSchema);
            const p = new Person({
                name: "Jimmy Page",
                type: "musician",
                slug: "ledzep-1",
                tags: ["guitarist"]
            });

            p.save((err) => {
                assert.ifError(err);

                Person.findById(p._id, (err, personDoc) => {
                    assert.ifError(err);

                    assert.equal(personDoc.name, "Jimmy Page");
                    assert.equal(personDoc.loc, undefined);
                    done();
                });
            });
        });
    });

    it("save max bson size error with buffering (gh-3906)", function (done) {
        this.timeout(10000);
        const db = start({ noErrorListener: true });
        const Test = db.model("gh3906_0", { name: Object });

        const test = new Test({
            name: {
                data: (new Array(16 * 1024 * 1024)).join("x")
            }
        });

        test.save((error) => {
            assert.ok(error);
            assert.equal(error.toString(),
                "MongoError: document is larger than the maximum size 16777216");
            db.close(done);
        });
    });

    it("reports max bson size error in save (gh-3906)", function (done) {
        this.timeout(10000);
        const db = start({ noErrorListener: true });
        const Test = db.model("gh3906", { name: Object });

        const test = new Test({
            name: {
                data: (new Array(16 * 1024 * 1024)).join("x")
            }
        });

        db.on("connected", () => {
            test.save((error) => {
                assert.ok(error);
                assert.equal(error.toString(),
                    "MongoError: document is larger than the maximum size 16777216");
                db.close(done);
            });
        });
    });

    describe("bug fixes", () => {
        let db;

        before(() => {
            db = start({ noErrorListener: true });
        });

        after((done) => {
            db.close(done);
        });

        it("doesnt crash (gh-1920)", (done) => {
            const parentSchema = new Schema({
                children: [new Schema({
                    name: String
                })]
            });

            const Parent = db.model("gh-1920", parentSchema);

            const parent = new Parent();
            parent.children.push({ name: "child name" });
            parent.save((err, it) => {
                assert.ifError(err);
                parent.children.push({ name: "another child" });
                Parent.findByIdAndUpdate(it._id, { $set: { children: parent.children } }, (err) => {
                    assert.ifError(err);
                    done();
                });
            });
        });

        it('doesnt reset "modified" status for fields', (done) => {
            const UniqueSchema = new Schema({
                changer: String,
                unique: {
                    type: Number,
                    unique: true
                }
            });

            const Unique = db.model("Unique", UniqueSchema);

            const u1 = new Unique({
                changer: "a",
                unique: 5
            });

            const u2 = new Unique({
                changer: "a",
                unique: 6
            });

            Unique.on("index", () => {
                u1.save((err) => {
                    assert.ifError(err);
                    assert.ok(!u1.isModified("changer"));
                    u2.save((err) => {
                        assert.ifError(err);
                        assert.ok(!u2.isModified("changer"));
                        u2.changer = "b";
                        u2.unique = 5;
                        assert.ok(u2.isModified("changer"));
                        u2.save((err) => {
                            assert.ok(err);
                            assert.ok(u2.isModified("changer"));
                            done();
                        });
                    });
                });
            });
        });

        it("insertMany() (gh-723)", (done) => {
            const schema = new Schema({
                name: String
            }, { timestamps: true });
            const Movie = db.model("gh723", schema);

            const arr = [{ name: "Star Wars" }, { name: "The Empire Strikes Back" }];
            Movie.insertMany(arr, (error, docs) => {
                assert.ifError(error);
                assert.equal(docs.length, 2);
                assert.ok(!docs[0].isNew);
                assert.ok(!docs[1].isNew);
                assert.ok(docs[0].createdAt);
                assert.ok(docs[1].createdAt);
                assert.strictEqual(docs[0].__v, 0);
                assert.strictEqual(docs[1].__v, 0);
                Movie.find({}, (error, docs) => {
                    assert.ifError(error);
                    assert.equal(docs.length, 2);
                    assert.ok(docs[0].createdAt);
                    assert.ok(docs[1].createdAt);
                    done();
                });
            });
        });

        it("insertMany() ordered option for constraint errors (gh-3893)", (done) => {
            start.mongodVersion((err, version) => {
                if (err) {
                    done(err);
                    return;
                }
                const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
                if (!mongo34) {
                    done();
                    return;
                }

                test();
            });

            function test() {
                const schema = new Schema({
                    name: { type: String, unique: true }
                });
                const Movie = db.model("gh3893", schema);

                const arr = [
                    { name: "Star Wars" },
                    { name: "Star Wars" },
                    { name: "The Empire Strikes Back" }
                ];
                Movie.on("index", (error) => {
                    assert.ifError(error);
                    Movie.insertMany(arr, { ordered: false }, (error) => {
                        assert.equal(error.message.indexOf("E11000"), 0);
                        Movie.find({}).sort({ name: 1 }).exec((error, docs) => {
                            assert.ifError(error);
                            assert.equal(docs.length, 2);
                            assert.equal(docs[0].name, "Star Wars");
                            assert.equal(docs[1].name, "The Empire Strikes Back");
                            done();
                        });
                    });
                });
            }
        });

        it("insertMany() ordered option for validation errors (gh-5068)", (done) => {
            start.mongodVersion((err, version) => {
                if (err) {
                    done(err);
                    return;
                }
                const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
                if (!mongo34) {
                    done();
                    return;
                }

                test();
            });

            function test() {
                const schema = new Schema({
                    name: { type: String, required: true }
                });
                const Movie = db.model("gh5068", schema);

                const arr = [
                    { name: "Star Wars" },
                    { foo: "Star Wars" },
                    { name: "The Empire Strikes Back" }
                ];
                Movie.insertMany(arr, { ordered: false }, (error) => {
                    assert.ifError(error);
                    Movie.find({}).sort({ name: 1 }).exec((error, docs) => {
                        assert.ifError(error);
                        assert.equal(docs.length, 2);
                        assert.equal(docs[0].name, "Star Wars");
                        assert.equal(docs[1].name, "The Empire Strikes Back");
                        done();
                    });
                });
            }
        });

        it("insertMany() ordered option for single validation error", (done) => {
            start.mongodVersion((err, version) => {
                if (err) {
                    done(err);
                    return;
                }
                const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
                if (!mongo34) {
                    done();
                    return;
                }

                test();
            });

            function test() {
                const schema = new Schema({
                    name: { type: String, required: true }
                });
                const Movie = db.model("gh5068-2", schema);

                const arr = [
                    { foo: "Star Wars" },
                    { foo: "The Fast and the Furious" }
                ];
                Movie.insertMany(arr, { ordered: false }, (error) => {
                    assert.ifError(error);
                    Movie.find({}).sort({ name: 1 }).exec((error, docs) => {
                        assert.equal(docs.length, 0);
                        done();
                    });
                });
            }
        });

        it("insertMany() hooks (gh-3846)", (done) => {
            const schema = new Schema({
                name: String
            });
            let calledPre = 0;
            let calledPost = 0;
            schema.pre("insertMany", (next, docs) => {
                assert.equal(docs.length, 2);
                assert.equal(docs[0].name, "Star Wars");
                ++calledPre;
                next();
            });
            schema.pre("insertMany", (next, docs) => {
                assert.equal(docs.length, 2);
                assert.equal(docs[0].name, "Star Wars");
                docs[0].name = "A New Hope";
                ++calledPre;
                next();
            });
            schema.post("insertMany", () => {
                ++calledPost;
            });
            const Movie = db.model("gh3846", schema);

            const arr = [{ name: "Star Wars" }, { name: "The Empire Strikes Back" }];
            Movie.insertMany(arr, (error, docs) => {
                assert.ifError(error);
                assert.equal(docs.length, 2);
                assert.equal(calledPre, 2);
                assert.equal(calledPost, 1);
                Movie.find({}).sort({ name: 1 }).exec((error, docs) => {
                    assert.ifError(error);
                    assert.equal(docs[0].name, "A New Hope");
                    assert.equal(docs[1].name, "The Empire Strikes Back");
                    done();
                });
            });
        });

        it("insertMany() with timestamps (gh-723)", (done) => {
            const schema = new Schema({
                name: String
            });
            const Movie = db.model("gh723_0", schema);

            const arr = [{ name: "Star Wars" }, { name: "The Empire Strikes Back" }];
            Movie.insertMany(arr, (error, docs) => {
                assert.ifError(error);
                assert.equal(docs.length, 2);
                assert.ok(!docs[0].isNew);
                assert.ok(!docs[1].isNew);
                Movie.find({}, (error, docs) => {
                    assert.ifError(error);
                    assert.equal(docs.length, 2);
                    done();
                });
            });
        });

        it("insertMany() multi validation error with ordered false (gh-5337)", (done) => {
            const schema = new Schema({
                name: { type: String, required: true }
            });
            const Movie = db.model("gh5337", schema);

            const arr = [
                { foo: "The Phantom Menace" },
                { name: "Star Wars" },
                { name: "The Empire Strikes Back" },
                { foobar: "The Force Awakens" }
            ];
            const opts = { ordered: false, rawResult: true };
            Movie.insertMany(arr, opts, (error, res) => {
                assert.ifError(error);
                assert.equal(res.mongoose.validationErrors.length, 2);
                assert.equal(res.mongoose.validationErrors[0].name, "ValidationError");
                assert.equal(res.mongoose.validationErrors[1].name, "ValidationError");
                done();
            });
        });

        it("insertMany() depopulate (gh-4590)", (done) => {
            const personSchema = new Schema({
                name: String
            });
            const movieSchema = new Schema({
                name: String,
                leadActor: {
                    type: Schema.Types.ObjectId,
                    ref: "gh4590"
                }
            });

            const Person = db.model("gh4590", personSchema);
            const Movie = db.model("gh4590_0", movieSchema);

            const arnold = new Person({ name: "Arnold Schwarzenegger" });
            const movies = [{ name: "Predator", leadActor: arnold }];
            Movie.insertMany(movies, (error, docs) => {
                assert.ifError(error);
                assert.equal(docs.length, 1);
                Movie.findOne({ name: "Predator" }, (error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc.leadActor.toHexString(), arnold._id.toHexString());
                    done();
                });
            });
        });

        it("insertMany() with promises (gh-4237)", (done) => {
            const schema = new Schema({
                name: String
            });
            const Movie = db.model("gh4237", schema);

            const arr = [{ name: "Star Wars" }, { name: "The Empire Strikes Back" }];
            Movie.insertMany(arr).then((docs) => {
                assert.equal(docs.length, 2);
                assert.ok(!docs[0].isNew);
                assert.ok(!docs[1].isNew);
                Movie.find({}, (error, docs) => {
                    assert.ifError(error);
                    assert.equal(docs.length, 2);
                    done();
                });
            });
        });

        it("method with same name as prop should throw (gh-4475)", (done) => {
            const testSchema = new mongoose.Schema({
                isPaid: Boolean
            });
            testSchema.methods.isPaid = function () {
                return false;
            };

            let threw = false;
            try {
                db.model("gh4475", testSchema);
            } catch (error) {
                threw = true;
                assert.equal(error.message, "You have a method and a property in " +
                    'your schema both named "isPaid"');
            }
            assert.ok(threw);
            done();
        });

        it("emits errors in create cb (gh-3222) (gh-3478)", (done) => {
            const schema = new Schema({ name: "String" });
            const Movie = db.model("gh3222", schema);

            Movie.on("error", (error) => {
                assert.equal(error.message, "fail!");
                done();
            });

            Movie.create({ name: "Conan the Barbarian" }, (error) => {
                assert.ifError(error);
                throw new Error("fail!");
            });
        });

        it("create() reuses existing doc if one passed in (gh-4449)", (done) => {
            const testSchema = new mongoose.Schema({
                name: String
            });
            const Test = db.model("gh4449_0", testSchema);

            const t = new Test();
            Test.create(t, (error, t2) => {
                assert.ifError(error);
                assert.ok(t === t2);
                done();
            });
        });

        it("emits errors correctly from exec (gh-4500)", (done) => {
            const someModel = db.model("gh4500", new Schema({}));

            someModel.on("error", (error) => {
                assert.equal(error.message, "This error will not disappear");
                assert.ok(cleared);
                done();
            });

            var cleared = false;
            someModel.findOne().exec(() => {
                setImmediate(() => {
                    cleared = true;
                });
                throw new Error("This error will not disappear");
            });
        });

        it("disabling id getter with .set() (gh-5548)", (done) => {
            const ChildSchema = new mongoose.Schema({
                name: String,
                _id: false
            });

            ChildSchema.set("id", false);

            const ParentSchema = new mongoose.Schema({
                child: {
                    type: ChildSchema,
                    default: {}
                }
            }, { id: false });

            const Parent = db.model("gh5548", ParentSchema);

            const doc = new Parent({ child: { name: "test" } });
            assert.ok(!doc.id);
            assert.ok(!doc.child.id);

            const obj = doc.toObject({ virtuals: true });
            assert.ok(!("id" in obj));
            assert.ok(!("id" in obj.child));

            done();
        });

        it("creates new array when initializing from existing doc (gh-4449)", (done) => {
            const TodoSchema = new mongoose.Schema({
                title: String
            }, { _id: false });

            const UserSchema = new mongoose.Schema({
                name: String,
                todos: [TodoSchema]
            });
            const User = db.model("User", UserSchema);

            const val = new User({ name: "Val" });
            User.create(val, (error, val) => {
                assert.ifError(error);
                val.todos.push({ title: "Groceries" });
                val.save((error) => {
                    assert.ifError(error);
                    User.findById(val, (error, val) => {
                        assert.ifError(error);
                        assert.deepEqual(val.toObject().todos, [{ title: "Groceries" }]);
                        const u2 = new User();
                        val.todos = u2.todos;
                        val.todos.push({ title: "Cook" });
                        val.save((error) => {
                            assert.ifError(error);
                            User.findById(val, (error, val) => {
                                assert.ifError(error);
                                assert.equal(val.todos.length, 1);
                                assert.equal(val.todos[0].title, "Cook");
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("bulkWrite casting (gh-3998)", (done) => {
            const schema = new Schema({
                str: String,
                num: Number
            });

            const M = db.model("gh3998", schema);

            const ops = [
                {
                    insertOne: {
                        document: { str: 1, num: "1" }
                    }
                },
                {
                    updateOne: {
                        filter: { str: 1 },
                        update: {
                            $set: { num: "2" }
                        }
                    }
                }
            ];
            M.bulkWrite(ops, (error) => {
                assert.ifError(error);
                M.findOne({}, (error, doc) => {
                    assert.ifError(error);
                    assert.strictEqual(doc.str, "1");
                    assert.strictEqual(doc.num, 2);
                    done();
                });
            });
        });

        it("bulkWrite with setDefaultsOnInsert (gh-5708)", (done) => {
            const schema = new Schema({
                str: { type: String, default: "test" },
                num: Number
            });

            const M = db.model("gh5708", schema);

            const ops = [
                {
                    updateOne: {
                        filter: { num: 0 },
                        update: {
                            $inc: { num: 1 }
                        },
                        upsert: true,
                        setDefaultsOnInsert: true
                    }
                }
            ];
            M.bulkWrite(ops, (error) => {
                assert.ifError(error);
                M.findOne({}).lean().exec((error, doc) => {
                    assert.ifError(error);
                    assert.strictEqual(doc.str, "test");
                    assert.strictEqual(doc.num, 1);
                    done();
                });
            });
        });

        it("insertMany with Decimal (gh-5190)", (done) => {
            start.mongodVersion((err, version) => {
                if (err) {
                    done(err);
                    return;
                }
                const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
                if (!mongo34) {
                    done();
                    return;
                }

                test();
            });

            function test() {
                const schema = new mongoose.Schema({
                    amount: mongoose.Schema.Types.Decimal
                });
                const Money = db.model("gh5190", schema);

                Money.insertMany([{ amount: "123.45" }], (error) => {
                    assert.ifError(error);
                    done();
                });
            }
        });

        it("remove with cast error (gh-5323)", (done) => {
            const schema = new mongoose.Schema({
                name: String
            });

            const Model = db.model("gh5323", schema);
            const arr = [
                { name: "test-1" },
                { name: "test-2" }
            ];

            Model.create(arr, (error) => {
                assert.ifError(error);
                Model.remove([], (error) => {
                    assert.ok(error);
                    assert.ok(error.message.indexOf("Query filter must be an object") !== -1,
                        error.message);
                    Model.find({}, (error, docs) => {
                        assert.ifError(error);
                        assert.equal(docs.length, 2);
                        done();
                    });
                });
            });
        });

        it(".create() with non-object (gh-2037)", (done) => {
            var schema = new mongoose.Schema({ name: String });

            var Model = db.model('gh2037', schema);

            Model.create(1, function (error) {
                assert.ok(error);
                assert.equal(error.name, 'ObjectParameterError');
                done();
            });
        });

        it("bulkWrite casting updateMany, deleteOne, deleteMany (gh-3998)", (done) => {
            const schema = new Schema({
                str: String,
                num: Number
            });

            const M = db.model("gh3998_0", schema);

            const ops = [
                {
                    insertOne: {
                        document: { str: 1, num: "1" }
                    }
                },
                {
                    insertOne: {
                        document: { str: "1", num: "1" }
                    }
                },
                {
                    updateMany: {
                        filter: { str: 1 },
                        update: {
                            $set: { num: "2" }
                        }
                    }
                },
                {
                    deleteMany: {
                        filter: { str: 1 }
                    }
                }
            ];
            M.bulkWrite(ops, (error) => {
                assert.ifError(error);
                M.count({}, (error, count) => {
                    assert.ifError(error);
                    assert.equal(count, 0);
                    done();
                });
            });
        });

        it("bulkWrite casting replaceOne (gh-3998)", (done) => {
            const schema = new Schema({
                str: String,
                num: Number
            });

            const M = db.model("gh3998_1", schema);

            const ops = [
                {
                    insertOne: {
                        document: { str: 1, num: "1" }
                    }
                },
                {
                    replaceOne: {
                        filter: { str: 1 },
                        replacement: { str: 2, num: "2" }
                    }
                }
            ];
            M.bulkWrite(ops, (error) => {
                assert.ifError(error);
                M.findOne({}, (error, doc) => {
                    assert.ifError(error);
                    assert.strictEqual(doc.str, "2");
                    assert.strictEqual(doc.num, 2);
                    done();
                });
            });
        });

        it("marks array as modified when initializing non-array from db (gh-2442)", (done) => {
            const s1 = new Schema({
                array: mongoose.Schema.Types.Mixed
            }, { minimize: false });

            const s2 = new Schema({
                array: {
                    type: [{
                        _id: false,
                        value: {
                            type: Number,
                            default: 0
                        }
                    }],
                    default: [{}]
                }
            });

            const M1 = db.model("gh-2442-1", s1, "gh-2442");
            const M2 = db.model("gh-2442-2", s2, "gh-2442");

            M1.create({ array: {} }, (err, doc) => {
                assert.ifError(err);
                assert.ok(doc.array);
                M2.findOne({ _id: doc._id }, (err, doc) => {
                    assert.ifError(err);
                    assert.equal(doc.array[0].value, 0);
                    doc.array[0].value = 1;
                    doc.save((err) => {
                        assert.ifError(err);
                        M2.findOne({ _id: doc._id }, (err, doc) => {
                            assert.ifError(err);
                            assert.ok(!doc.isModified("array"));
                            assert.deepEqual(doc.array[0].value, 1);
                            assert.equal(JSON.stringify(doc.array), '[{"value":1}]');
                            done();
                        });
                    });
                });
            });
        });
    });
});
