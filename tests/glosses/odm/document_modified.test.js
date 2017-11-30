const start = require("./common");
const mongoose = adone.odm;
const random = adone.odm.utils.random;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;

const {
    is
} = adone;

const Comments = new Schema();

Comments.add({
    title: String,
    date: Date,
    body: String,
    comments: [Comments]
});

const BlogPost = new Schema({
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
    .path("title")
    .get((v) => {
        if (v) {
            return v.toUpperCase();
        }
        return v;
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

const modelName = "docuemnt.modified.blogpost";
mongoose.model(modelName, BlogPost);

const collection = `blogposts_${random()}`;

describe("document modified", () => {
    describe("modified states", () => {
        it("reset after save", (done) => {
            let db = start(),
                B = db.model(modelName, collection);

            const b = new B();

            b.numbers.push(3);
            b.save((err) => {
                assert.strictEqual(null, err);

                b.numbers.push(3);
                b.save((err1) => {
                    assert.strictEqual(null, err1);

                    B.findById(b, (err2, b) => {
                        assert.strictEqual(null, err2);
                        assert.equal(b.numbers.length, 2);

                        db.close();
                        done();
                    });
                });
            });
        });

        it("of embedded docs reset after save", (done) => {
            let db = start(),
                BlogPost = db.model(modelName, collection);

            const post = new BlogPost({ title: "hocus pocus" });
            post.comments.push({ title: "Humpty Dumpty", comments: [{ title: "nested" }] });
            post.save((err) => {
                db.close();
                assert.strictEqual(null, err);
                const mFlag = post.comments[0].isModified("title");
                assert.equal(mFlag, false);
                assert.equal(post.isModified("title"), false);
                done();
            });
        });
    });

    describe("isDefault", () => {
        it("works", (done) => {
            const db = start();

            const MyModel = db.model("test",
                { name: { type: String, default: "Val " } });
            const m = new MyModel();
            assert.ok(m.$isDefault("name"));
            db.close(done);
        });
    });

    describe("isModified", () => {
        it("should not throw with no argument", (done) => {
            const db = start();
            const BlogPost = db.model(modelName, collection);
            const post = new BlogPost();
            db.close();

            let threw = false;
            try {
                post.isModified();
            } catch (err) {
                threw = true;
            }

            assert.equal(threw, false);
            done();
        });

        it("when modifying keys", (done) => {
            let db = start(),
                BlogPost = db.model(modelName, collection);

            db.close();
            const post = new BlogPost();
            post.init({
                title: "Test",
                slug: "test",
                date: new Date()
            });

            assert.equal(post.isModified("title"), false);
            post.set("title", "test");
            assert.equal(post.isModified("title"), true);

            assert.equal(post.isModified("date"), false);
            post.set("date", new Date(post.date.getTime() + 10));
            assert.equal(post.isModified("date"), true);

            assert.equal(post.isModified("meta.date"), false);
            done();
        });

        it("setting a key identically to its current value should not dirty the key", (done) => {
            let db = start(),
                BlogPost = db.model(modelName, collection);

            db.close();
            const post = new BlogPost();
            post.init({
                title: "Test",
                slug: "test",
                date: new Date()
            });

            assert.equal(post.isModified("title"), false);
            post.set("title", "Test");
            assert.equal(post.isModified("title"), false);
            done();
        });

        describe("on DocumentArray", () => {
            it("work", (done) => {
                let db = start(),
                    BlogPost = db.model(modelName, collection);

                const post = new BlogPost();
                post.init({
                    title: "Test",
                    slug: "test",
                    comments: [{ title: "Test", date: new Date(), body: "Test" }]
                });

                assert.equal(post.isModified("comments.0.title"), false);
                post.get("comments")[0].set("title", "Woot");
                assert.equal(post.isModified("comments"), true);
                assert.equal(post.isDirectModified("comments"), false);
                assert.equal(post.isModified("comments.0.title"), true);
                assert.equal(post.isDirectModified("comments.0.title"), true);

                db.close(done);
            });
            it("with accessors", (done) => {
                let db = start(),
                    BlogPost = db.model(modelName, collection);

                const post = new BlogPost();
                post.init({
                    title: "Test",
                    slug: "test",
                    comments: [{ title: "Test", date: new Date(), body: "Test" }]
                });

                assert.equal(post.isModified("comments.0.body"), false);
                post.get("comments")[0].body = "Woot";
                assert.equal(post.isModified("comments"), true);
                assert.equal(post.isDirectModified("comments"), false);
                assert.equal(post.isModified("comments.0.body"), true);
                assert.equal(post.isDirectModified("comments.0.body"), true);

                db.close();
                done();
            });
        });

        describe("on MongooseArray", () => {
            it("atomic methods", (done) => {
                // COMPLETEME
                let db = start(),
                    BlogPost = db.model(modelName, collection);

                db.close();
                const post = new BlogPost();
                assert.equal(post.isModified("owners"), false);
                post.get("owners").push(new DocumentObjectId());
                assert.equal(post.isModified("owners"), true);
                done();
            });
            it("native methods", (done) => {
                // COMPLETEME
                let db = start(),
                    BlogPost = db.model(modelName, collection);

                db.close();
                const post = new BlogPost();
                assert.equal(post.isModified("owners"), false);
                done();
            });
        });

        it("on entire document", (done) => {
            let db = start(),
                BlogPost = db.model(modelName, collection);

            const doc = {
                title: "Test",
                slug: "test",
                date: new Date(),
                meta: {
                    date: new Date(),
                    visitors: 5
                },
                published: true,
                mixed: { x: [{ y: [1, "yes", 2] }] },
                numbers: [],
                owners: [new DocumentObjectId(), new DocumentObjectId()],
                comments: [
                    { title: "Test", date: new Date(), body: "Test" },
                    { title: "Super", date: new Date(), body: "Cool" }
                ]
            };

            BlogPost.create(doc, (err, post) => {
                assert.ifError(err);
                BlogPost.findById(post.id, (err, postRead) => {
                    db.close();
                    assert.ifError(err);
                    // set the same data again back to the document.
                    // expected result, nothing should be set to modified
                    assert.equal(postRead.isModified("comments"), false);
                    assert.equal(postRead.isNew, false);
                    postRead.set(postRead.toObject());

                    assert.equal(postRead.isModified("title"), false);
                    assert.equal(postRead.isModified("slug"), false);
                    assert.equal(postRead.isModified("date"), false);
                    assert.equal(postRead.isModified("meta.date"), false);
                    assert.equal(postRead.isModified("meta.visitors"), false);
                    assert.equal(postRead.isModified("published"), false);
                    assert.equal(postRead.isModified("mixed"), false);
                    assert.equal(postRead.isModified("numbers"), false);
                    assert.equal(postRead.isModified("owners"), false);
                    assert.equal(postRead.isModified("comments"), false);
                    let arr = postRead.comments.slice();
                    arr[2] = postRead.comments.create({ title: "index" });
                    postRead.comments = arr;
                    assert.equal(postRead.isModified("comments"), true);
                    done();
                });
            });
        });

        it("should let you set ref paths (gh-1530)", (done) => {
            const db = start();

            const parentSchema = new Schema({
                child: { type: Schema.Types.ObjectId, ref: "gh-1530-2" }
            });
            const Parent = db.model("gh-1530-1", parentSchema);
            const childSchema = new Schema({
                name: String
            });

            let preCalls = 0;
            childSchema.pre("save", (next) => {
                ++preCalls;
                next();
            });

            let postCalls = 0;
            childSchema.post("save", (doc, next) => {
                ++postCalls;
                next();
            });
            const Child = db.model("gh-1530-2", childSchema);

            const p = new Parent();
            const c = new Child({ name: "Luke" });
            p.child = c;
            assert.equal(p.child.name, "Luke");

            p.save((error) => {
                assert.ifError(error);
                assert.equal(p.child.name, "Luke");
                const originalParent = p;
                Parent.findOne({}, (error, p) => {
                    assert.ifError(error);
                    assert.ok(p.child);
                    assert.ok(is.undefined(p.child.name));
                    assert.equal(preCalls, 0);
                    assert.equal(postCalls, 0);
                    Child.findOne({ name: "Luke" }, (error, child) => {
                        assert.ifError(error);
                        assert.ok(!child);
                        originalParent.child.save(function (error) {
                            assert.ifError(error);
                            Child.findOne({ name: 'Luke' }, function (error, child) {
                                assert.ifError(error);
                                assert.ok(child);
                                assert.equal(p.child.toString(), child._id.toString());
                                db.close(done);
                            });
                        });
                    });
                });
            });
        });

        it("properly sets populated for gh-1530 (gh-2678)", (done) => {
            const db = start();

            const parentSchema = new Schema({
                name: String,
                child: { type: Schema.Types.ObjectId, ref: "Child" }
            });

            const Parent = db.model("Parent", parentSchema, "parents");
            const Child = db.model("Child", parentSchema, "children");

            const child = new Child({ name: "Mary" });
            const p = new Parent({ name: "Alex", child });

            assert.equal(child._id.toString(), p.populated("child").toString());
            db.close(done);
        });

        describe("manually populating arrays", () => {
            let db;

            before(() => {
                db = start();
            });

            after((done) => {
                db.close(done);
            });

            it("gh-1530 for arrays (gh-3575)", (done) => {
                const parentSchema = new Schema({
                    name: String,
                    children: [{ type: Schema.Types.ObjectId, ref: "Child" }]
                });

                const Parent = db.model("Parent", parentSchema, "parents");
                const Child = db.model("Child", parentSchema, "children");

                const child = new Child({ name: "Luke" });
                const p = new Parent({ name: "Anakin", children: [child] });

                assert.equal("Luke", p.children[0].name);
                assert.ok(p.populated("children"));
                done();
            });

            it("setting nested arrays (gh-3721)", (done) => {
                const userSchema = new Schema({
                    name: { type: Schema.Types.String }
                });
                const User = db.model("User", userSchema);

                const accountSchema = new Schema({
                    roles: [{
                        name: { type: Schema.Types.String },
                        users: [{ type: Schema.Types.ObjectId, ref: "User" }]
                    }]
                });

                const Account = db.model("Account", accountSchema);

                const user = new User({ name: "Test" });
                const account = new Account({
                    roles: [
                        { name: "test group", users: [user] }
                    ]
                });

                assert.ok(account.roles[0].users[0].isModified);
                done();
            });

            it("with discriminators (gh-3575)", (done) => {
                const shapeSchema = new mongoose.Schema({}, { discriminatorKey: "kind" });

                const Shape = mongoose.model("gh3575", shapeSchema);

                const Circle = Shape.discriminator("gh3575_0", new mongoose.Schema({
                    radius: { type: Number }
                }, { discriminatorKey: "kind" }));

                const fooSchema = new mongoose.Schema({
                    bars: [{
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "gh3575"
                    }]
                });

                const Foo = mongoose.model("Foo", fooSchema);

                const test = new Foo({});
                test.bars = [new Circle({}), new Circle({})];

                assert.ok(test.populated("bars"));
                assert.ok(test.bars[0]._id);
                assert.ok(test.bars[1]._id);

                done();
            });

            it("updates embedded doc parents upon direct assignment (gh-5189)", (done) => {
                const db = start();
                const familySchema = new Schema({
                    children: [{ name: { type: String, required: true } }]
                });
                const Family = db.model("Family", familySchema);
                Family.create({
                    children: [
                        { name: "John" },
                        { name: "Mary" }
                    ]
                }, (err, family) => {
                    family.set({ children: family.children.slice(1) });
                    family.children.forEach((child) => {
                        child.set({ name: 'Maryanne' });
                    });

                    assert.equal(family.validateSync(), undefined);
                    done();
                });
            });
        });

        it("should support setting mixed paths by string (gh-1418)", (done) => {
            const db = start();
            const BlogPost = db.model("1418", new Schema({ mixed: {} }));
            let b = new BlogPost();
            b.init({ mixed: {} });

            let path = "mixed.path";
            assert.ok(!b.isModified(path));

            b.set(path, 3);
            assert.ok(b.isModified(path));
            assert.equal(b.get(path), 3);

            b = new BlogPost();
            b.init({ mixed: {} });
            path = "mixed.9a";
            b.set(path, 4);
            assert.ok(b.isModified(path));
            assert.equal(b.get(path), 4);

            b = new BlogPost({ mixed: {} });
            b.save((err) => {
                assert.ifError(err);

                path = "mixed.9a.x";
                b.set(path, 8);
                assert.ok(b.isModified(path));
                assert.equal(b.get(path), 8);

                b.save((err) => {
                    assert.ifError(err);
                    BlogPost.findById(b, (err, doc) => {
                        assert.ifError(err);
                        assert.equal(doc.get(path), 8);
                        db.close(done);
                    });
                });
            });
        });

        it("should mark multi-level nested schemas as modified (gh-1754)", (done) => {
            const db = start();

            const grandChildSchema = new Schema({
                name: String
            });

            const childSchema = new Schema({
                name: String,
                grandChild: [grandChildSchema]
            });

            const parentSchema = new Schema({
                name: String,
                child: [childSchema]
            });

            const Parent = db.model("gh-1754", parentSchema);
            Parent.create(
                { child: [{ name: "Brian", grandChild: [{ name: "Jake" }] }] },
                (error, p) => {
                    assert.ifError(error);
                    assert.ok(p);
                    assert.equal(p.child.length, 1);
                    assert.equal(p.child[0].grandChild.length, 1);
                    p.child[0].grandChild[0].name = "Jason";
                    assert.ok(p.isModified("child.0.grandChild.0.name"));
                    p.save((error1, inDb) => {
                        assert.ifError(error1);
                        assert.equal(inDb.child[0].grandChild[0].name, "Jason");
                        db.close(done);
                    });
                });
        });

        it("should reset the modified state after calling unmarkModified", (done) => {
            const db = start();
            const BlogPost = db.model(modelName, collection);

            const b = new BlogPost();
            assert.equal(b.isModified("author"), false);
            b.author = "foo";
            assert.equal(b.isModified("author"), true);
            assert.equal(b.isModified(), true);
            b.unmarkModified("author");
            assert.equal(b.isModified("author"), false);
            assert.equal(b.isModified(), false);

            b.save((err) => {
                assert.strictEqual(null, err);

                BlogPost.findById(b._id, (err2, b2) => {
                    assert.strictEqual(null, err2);

                    assert.equal(b2.isModified("author"), false);
                    assert.equal(b2.isModified(), false);
                    b2.author = "bar";
                    assert.equal(b2.isModified("author"), true);
                    assert.equal(b2.isModified(), true);
                    b2.unmarkModified("author");
                    assert.equal(b2.isModified("author"), false);
                    assert.equal(b2.isModified(), false);

                    b2.save((err3) => {
                        assert.strictEqual(err3, null);
                        BlogPost.findById(b._id, function (err4, b3) {
                            assert.strictEqual(err4, null);
                            // was not saved because modified state was unset
                            assert.equal(b3.author, 'foo');
                            db.close();
                            done();
                        });
                    });
                });
            });
        });
    });
});
