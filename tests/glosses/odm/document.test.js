const start = require("./common");
const mongoose = adone.odm;
const random = adone.odm.utils.random;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const Document = adone.odm.Document;
const DocumentObjectId = mongoose.Types.ObjectId;
const EventEmitter = require("events").EventEmitter;
const SchemaType = mongoose.SchemaType;
const ValidatorError = SchemaType.ValidatorError;
const ValidationError = mongoose.Document.ValidationError;
const MongooseError = mongoose.Error;
const { Embedded } = adone.odm.types;
const Query = adone.odm.Query;
const validator = require("validator");

const _ = require("lodash");

const {
    is
} = adone;

/**
 * Test Document constructor.
 */

class TestDocument extends Document {
}

for (const i in EventEmitter.prototype) {
    TestDocument[i] = EventEmitter.prototype[i];
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
    em: [em],
    date: Date
});

TestDocument.prototype.$__setSchema(schema);

schema.virtual("nested.agePlus2").get(function () {
    return this.nested.age + 2;
});
schema.virtual("nested.setAge").set(function (v) {
    this.nested.age = v;
});
schema.path("nested.path").get(function (v) {
    return (this.nested.age || "") + (v ? v : "");
});
schema.path("nested.setr").set((v) => {
    return `${v} setter`;
});

let dateSetterCalled = false;
schema.path("date").set((v) => {
    // should not have been cast to a Date yet
    if (!is.undefined(v)) {
        assert.equal(typeof v, "string");
    }
    dateSetterCalled = true;
    return v;
});

/**
 * Method subject to hooks. Simply fires the callback once the hooks are
 * executed.
 */

TestDocument.prototype.hooksTest = function (fn) {
    fn(null, arguments);
};

const childSchema = new Schema({ counter: Number });

const parentSchema = new Schema({
    name: String,
    children: [childSchema]
});

/**
 * Test.
 */

describe("document", () => {
    describe("shortcut getters", () => {
        it("return undefined for properties with a null/undefined parent object (gh-1326)", (done) => {
            const doc = new TestDocument();
            doc.init({ nested: null });
            assert.strictEqual(undefined, doc.nested.age);
            done();
        });

        it("work", (done) => {
            const doc = new TestDocument();
            doc.init({
                test: "test",
                oids: [],
                nested: {
                    age: 5,
                    cool: DocumentObjectId.createFromHexString("4c6c2d6240ced95d0e00003c"),
                    path: "my path"
                }
            });

            assert.equal(doc.test, "test");
            assert.ok(doc.oids instanceof Array);
            assert.equal(doc.nested.age, 5);
            assert.equal(String(doc.nested.cool), "4c6c2d6240ced95d0e00003c");
            assert.equal(doc.nested.agePlus2, 7);
            assert.equal(doc.nested.path, "5my path");
            doc.nested.setAge = 10;
            assert.equal(doc.nested.age, 10);
            doc.nested.setr = "set it";
            assert.equal(doc.getValue("nested.setr"), "set it setter");

            const doc2 = new TestDocument();
            doc2.init({
                test: "toop",
                oids: [],
                nested: {
                    age: 2,
                    cool: DocumentObjectId.createFromHexString("4cf70857337498f95900001c"),
                    deep: { x: "yay" }
                }
            });

            assert.equal(doc2.test, "toop");
            assert.ok(doc2.oids instanceof Array);
            assert.equal(doc2.nested.age, 2);

            // GH-366
            assert.equal(doc2.nested.bonk, undefined);
            assert.equal(doc2.nested.nested, undefined);
            assert.equal(doc2.nested.test, undefined);
            assert.equal(doc2.nested.age.test, undefined);
            assert.equal(doc2.nested.age.nested, undefined);
            assert.equal(doc2.oids.nested, undefined);
            assert.equal(doc2.nested.deep.x, "yay");
            assert.equal(doc2.nested.deep.nested, undefined);
            assert.equal(doc2.nested.deep.cool, undefined);
            assert.equal(doc2.nested2.yup.nested, undefined);
            assert.equal(doc2.nested2.yup.nested2, undefined);
            assert.equal(doc2.nested2.yup.yup, undefined);
            assert.equal(doc2.nested2.yup.age, undefined);
            assert.equal(typeof doc2.nested2.yup, "object");

            doc2.nested2.yup = {
                age: 150,
                yup: "Yesiree",
                nested: true
            };

            assert.equal(doc2.nested2.nested, undefined);
            assert.equal(doc2.nested2.yup.nested, true);
            assert.equal(doc2.nested2.yup.yup, "Yesiree");
            assert.equal(doc2.nested2.yup.age, 150);
            doc2.nested2.nested = "y";
            assert.equal(doc2.nested2.nested, "y");
            assert.equal(doc2.nested2.yup.nested, true);
            assert.equal(doc2.nested2.yup.yup, "Yesiree");
            assert.equal(doc2.nested2.yup.age, 150);

            assert.equal(String(doc2.nested.cool), "4cf70857337498f95900001c");

            assert.ok(doc.oids !== doc2.oids);
            done();
        });
    });

    it("test shortcut setters", (done) => {
        const doc = new TestDocument();

        doc.init({
            test: "Test",
            nested: {
                age: 5
            }
        });

        assert.equal(doc.isModified("test"), false);
        doc.test = "Woot";
        assert.equal(doc.test, "Woot");
        assert.equal(doc.isModified("test"), true);

        assert.equal(doc.isModified("nested.age"), false);
        doc.nested.age = 2;
        assert.equal(doc.nested.age, 2);
        assert.ok(doc.isModified("nested.age"));

        doc.nested = { path: "overwrite the entire nested object" };
        assert.equal(doc.nested.age, undefined);
        assert.equal(Object.keys(doc._doc.nested).length, 1);
        assert.equal(doc.nested.path, "overwrite the entire nested object");
        assert.ok(doc.isModified("nested"));
        done();
    });

    it("test accessor of id", (done) => {
        const doc = new TestDocument();
        assert.ok(doc._id instanceof DocumentObjectId);
        done();
    });

    it("test shortcut of id hexString", (done) => {
        const doc = new TestDocument();
        assert.equal(typeof doc.id, "string");
        done();
    });

    it("test toObject clone", (done) => {
        const doc = new TestDocument();
        doc.init({
            test: "test",
            oids: [],
            nested: {
                age: 5,
                cool: new DocumentObjectId()
            }
        });

        const copy = doc.toObject();

        copy.test._marked = true;
        copy.nested._marked = true;
        copy.nested.age._marked = true;
        copy.nested.cool._marked = true;

        assert.equal(doc._doc.test._marked, undefined);
        assert.equal(doc._doc.nested._marked, undefined);
        assert.equal(doc._doc.nested.age._marked, undefined);
        assert.equal(doc._doc.nested.cool._marked, undefined);
        done();
    });

    it("toObject options", (done) => {
        const doc = new TestDocument();

        doc.init({
            test: "test",
            oids: [],
            em: [{ title: "asdf" }],
            nested: {
                age: 5,
                cool: DocumentObjectId.createFromHexString("4c6c2d6240ced95d0e00003c"),
                path: "my path"
            },
            nested2: {},
            date: new Date()
        });

        let clone = doc.toObject({ getters: true, virtuals: false });

        assert.equal(clone.test, "test");
        assert.ok(clone.oids instanceof Array);
        assert.equal(clone.nested.age, 5);
        assert.equal(clone.nested.cool.toString(), "4c6c2d6240ced95d0e00003c");
        assert.equal(clone.nested.path, "5my path");
        assert.equal(clone.nested.agePlus2, undefined);
        assert.equal(clone.em[0].works, undefined);
        assert.ok(clone.date instanceof Date);

        clone = doc.toObject({ virtuals: true });

        assert.equal(clone.test, "test");
        assert.ok(clone.oids instanceof Array);
        assert.equal(clone.nested.age, 5);
        assert.equal(clone.nested.cool.toString(), "4c6c2d6240ced95d0e00003c");
        assert.equal(clone.nested.path, "my path");
        assert.equal(clone.nested.agePlus2, 7);
        assert.equal(clone.em[0].works, "em virtual works");

        clone = doc.toObject({ getters: true });

        assert.equal(clone.test, "test");
        assert.ok(clone.oids instanceof Array);
        assert.equal(clone.nested.age, 5);
        assert.equal(clone.nested.cool.toString(), "4c6c2d6240ced95d0e00003c");
        assert.equal(clone.nested.path, "5my path");
        assert.equal(clone.nested.agePlus2, 7);
        assert.equal(clone.em[0].works, "em virtual works");

        // test toObject options
        doc.schema.options.toObject = { virtuals: true };
        clone = doc.toObject({ transform: false, virtuals: true });
        assert.equal(clone.test, "test");
        assert.ok(clone.oids instanceof Array);
        assert.equal(clone.nested.age, 5);
        assert.equal(clone.nested.cool.toString(), "4c6c2d6240ced95d0e00003c");

        assert.equal(clone.nested.path, "my path");
        assert.equal(clone.nested.agePlus2, 7);
        assert.equal(clone.em[0].title, "asdf");
        delete doc.schema.options.toObject;

        // minimize
        clone = doc.toObject({ minimize: true });
        assert.equal(clone.nested2, undefined);
        clone = doc.toObject({ minimize: true, getters: true });
        assert.equal(clone.nested2, undefined);
        clone = doc.toObject({ minimize: false });
        assert.equal(clone.nested2.constructor.name, "Object");
        assert.equal(Object.keys(clone.nested2).length, 1);
        clone = doc.toObject("2");
        assert.equal(clone.nested2, undefined);

        doc.schema.options.toObject = { minimize: false };
        clone = doc.toObject({ transform: false, minimize: false });
        assert.equal(clone.nested2.constructor.name, "Object");
        assert.equal(Object.keys(clone.nested2).length, 1);
        delete doc.schema.options.toObject;

        doc.schema.options.minimize = false;
        clone = doc.toObject();
        assert.equal(clone.nested2.constructor.name, "Object");
        assert.equal(Object.keys(clone.nested2).length, 1);
        doc.schema.options.minimize = true;
        clone = doc.toObject();
        assert.equal(clone.nested2, undefined);

        // transform
        doc.schema.options.toObject = {};
        doc.schema.options.toObject.transform = function xform(doc, ret) {
            // ignore embedded docs
            if (is.function(doc.ownerDocument)) {
                return;
            }

            delete ret.em;
            delete ret.numbers;
            delete ret.oids;
            ret._id = ret._id.toString();
        };

        clone = doc.toObject();
        assert.equal(doc.id, clone._id);
        assert.ok(undefined === clone.em);
        assert.ok(undefined === clone.numbers);
        assert.ok(undefined === clone.oids);
        assert.equal(clone.test, "test");
        assert.equal(clone.nested.age, 5);

        // transform with return value
        const out = { myid: doc._id.toString() };
        doc.schema.options.toObject.transform = function (doc, ret) {
            // ignore embedded docs
            if (is.function(doc.ownerDocument)) {
                return;
            }

            return { myid: ret._id.toString() };
        };

        clone = doc.toObject();
        assert.deepEqual(out, clone);

        // ignored transform with inline options
        clone = doc.toObject({ x: 1, transform: false });
        assert.ok(!("myid" in clone));
        assert.equal(clone.test, "test");
        assert.ok(clone.oids instanceof Array);
        assert.equal(clone.nested.age, 5);
        assert.equal(clone.nested.cool.toString(), "4c6c2d6240ced95d0e00003c");
        assert.equal(clone.nested.path, "my path");
        assert.equal(clone.em[0].constructor.name, "Object");

        // applied transform when inline transform is true
        clone = doc.toObject({ x: 1 });
        assert.deepEqual(out, clone);

        // transform passed inline
        function xform(self, doc, opts) {
            opts.fields.split(" ").forEach((field) => {
                delete doc[field];
            });
        }

        clone = doc.toObject({
            transform: xform,
            fields: "_id em numbers oids nested"
        });
        assert.equal(doc.test, "test");
        assert.ok(undefined === clone.em);
        assert.ok(undefined === clone.numbers);
        assert.ok(undefined === clone.oids);
        assert.ok(undefined === clone._id);
        assert.ok(undefined === clone.nested);

        // all done
        delete doc.schema.options.toObject;
        done();
    });

    it("toObject transform", (done) => {
        const schema = new Schema({
            name: String,
            places: [{ type: ObjectId, ref: "toObject-transform-places" }]
        });

        const schemaPlaces = new Schema({
            identity: String
        });

        schemaPlaces.set("toObject", {
            transform(doc, ret) {
                // here should be only toObject-transform-places documents
                assert.equal(doc.constructor.modelName, "toObject-transform-places");
                return ret;
            }
        });

        let db = start(),
            Test = db.model("toObject-transform", schema),
            Places = db.model("toObject-transform-places", schemaPlaces);

        Places.create({ identity: "a" }, { identity: "b" }, { identity: "c" }, (err, a, b, c) => {
            Test.create({ name: "chetverikov", places: [a, b, c] }, (err) => {
                assert.ifError(err);
                Test.findOne({}).populate("places").exec((err, docs) => {
                    assert.ifError(err);

                    docs.toObject({ transform: true });

                    db.close(done);
                });
            });
        });
    });

    it("allows you to skip validation on save (gh-2981)", (done) => {
        const db = start();

        const MyModel = db.model("gh2981",
            { name: { type: String, required: true } });

        const doc = new MyModel();
        doc.save({ validateBeforeSave: false }, (error) => {
            assert.ifError(error);
            db.close(done);
        });
    });

    it("doesnt use custom toObject options on save", (done) => {
        const schema = new Schema({
            name: String,
            iWillNotBeDelete: Boolean,
            nested: {
                iWillNotBeDeleteToo: Boolean
            }
        });

        schema.set("toObject", {
            transform(doc, ret) {
                delete ret.iWillNotBeDelete;
                delete ret.nested.iWillNotBeDeleteToo;

                return ret;
            }
        });
        let db = start(),
            Test = db.model("TestToObject", schema);

        Test.create({ name: "chetverikov", iWillNotBeDelete: true, "nested.iWillNotBeDeleteToo": true }, (err) => {
            assert.ifError(err);
            Test.findOne({}, (err, doc) => {
                assert.ifError(err);

                assert.equal(doc._doc.iWillNotBeDelete, true);
                assert.equal(doc._doc.nested.iWillNotBeDeleteToo, true);

                db.close(done);
            });
        });
    });

    describe("toObject", () => {
        let db;
        before(() => {
            return start({ useMongoClient: true }).then((_db) => {
                db = _db;
            });
        });

        after((done) => {
            db.close(done);
        });

        it("does not apply toObject functions of subdocuments to root document", (done) => {
            const subdocSchema = new Schema({
                test: String,
                wow: String
            });

            subdocSchema.options.toObject = {};
            subdocSchema.options.toObject.transform = function (doc, ret) {
                delete ret.wow;
            };

            const docSchema = new Schema({
                foo: String,
                wow: Boolean,
                sub: [subdocSchema]
            });

            const Doc = db.model("Doc", docSchema);

            Doc.create({
                foo: "someString",
                wow: true,
                sub: [{
                    test: "someOtherString",
                    wow: "thisIsAString"
                }]
            }, (err, doc) => {
                const obj = doc.toObject({
                    transform(doc, ret) {
                        ret.phew = "new";
                    }
                });

                assert.equal(obj.phew, "new");
                assert.ok(!doc.sub.wow);

                done();
            });
        });

        it("handles child schema transforms", (done) => {
            const userSchema = new Schema({
                name: String,
                email: String
            });
            const topicSchema = new Schema({
                title: String,
                email: String,
                followers: [userSchema]
            });

            userSchema.options.toObject = {
                transform(doc, ret) {
                    delete ret.email;
                }
            };

            topicSchema.options.toObject = {
                transform(doc, ret) {
                    ret.title = ret.title.toLowerCase();
                }
            };

            const Topic = db.model("gh2691", topicSchema, "gh2691");

            const topic = new Topic({
                title: "Favorite Foods",
                email: "a@b.co",
                followers: [{ name: "Val", email: "val@test.co" }]
            });

            const output = topic.toObject({ transform: true });
            assert.equal(output.title, "favorite foods");
            assert.equal(output.email, "a@b.co");
            assert.equal(output.followers[0].name, "Val");
            assert.equal(output.followers[0].email, undefined);
            done();
        });

        it("doesnt clobber child schema options when called with no params (gh-2035)", (done) => {
            const userSchema = new Schema({
                firstName: String,
                lastName: String,
                password: String
            });

            userSchema.virtual("fullName").get(function () {
                return `${this.firstName} ${this.lastName}`;
            });

            userSchema.set("toObject", { virtuals: false });

            const postSchema = new Schema({
                owner: { type: Schema.Types.ObjectId, ref: "gh-2035-user" },
                content: String
            });

            postSchema.virtual("capContent").get(function () {
                return this.content.toUpperCase();
            });

            postSchema.set("toObject", { virtuals: true });
            const User = db.model("gh-2035-user", userSchema, "gh-2035-user");
            const Post = db.model("gh-2035-post", postSchema, "gh-2035-post");

            const user = new User({ firstName: "Joe", lastName: "Smith", password: "password" });

            user.save((err, savedUser) => {
                assert.ifError(err);
                const post = new Post({ owner: savedUser._id, content: "lorem ipsum" });
                post.save((err, savedPost) => {
                    assert.ifError(err);
                    Post.findById(savedPost._id).populate("owner").exec((err, newPost) => {
                        assert.ifError(err);
                        const obj = newPost.toObject();
                        assert.equal(obj.owner.fullName, undefined);
                        done();
                    });
                });
            });
        });
    });

    describe("toJSON", () => {
        let db;
        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("toJSON options", (done) => {
            const doc = new TestDocument();

            doc.init({
                test: "test",
                oids: [],
                em: [{ title: "asdf" }],
                nested: {
                    age: 5,
                    cool: DocumentObjectId.createFromHexString("4c6c2d6240ced95d0e00003c"),
                    path: "my path"
                },
                nested2: {}
            });

            // override to check if toJSON gets fired
            const path = TestDocument.prototype.schema.path("em");
            path.casterConstructor.prototype.toJSON = function () {
                return {};
            };

            doc.schema.options.toJSON = { virtuals: true };
            let clone = doc.toJSON();
            assert.equal(clone.test, "test");
            assert.ok(clone.oids instanceof Array);
            assert.equal(clone.nested.age, 5);
            assert.equal(clone.nested.cool.toString(), "4c6c2d6240ced95d0e00003c");
            assert.equal(clone.nested.path, "my path");
            assert.equal(clone.nested.agePlus2, 7);
            assert.equal(clone.em[0].constructor.name, "Object");
            assert.equal(Object.keys(clone.em[0]).length, 0);
            delete doc.schema.options.toJSON;
            delete path.casterConstructor.prototype.toJSON;

            doc.schema.options.toJSON = { minimize: false };
            clone = doc.toJSON();
            assert.equal(clone.nested2.constructor.name, "Object");
            assert.equal(Object.keys(clone.nested2).length, 1);
            clone = doc.toJSON("8");
            assert.equal(clone.nested2.constructor.name, "Object");
            assert.equal(Object.keys(clone.nested2).length, 1);

            // gh-852
            let arr = [doc],
                err = false,
                str;
            try {
                str = JSON.stringify(arr);
            } catch (_) {
                err = true;
            }
            assert.equal(err, false);
            assert.ok(/nested2/.test(str));
            assert.equal(clone.nested2.constructor.name, "Object");
            assert.equal(Object.keys(clone.nested2).length, 1);

            // transform
            doc.schema.options.toJSON = {};
            doc.schema.options.toJSON.transform = function xform(doc, ret) {
                // ignore embedded docs
                if (is.function(doc.ownerDocument)) {
                    return;
                }

                delete ret.em;
                delete ret.numbers;
                delete ret.oids;
                ret._id = ret._id.toString();
            };

            clone = doc.toJSON();
            assert.equal(clone._id, doc.id);
            assert.ok(undefined === clone.em);
            assert.ok(undefined === clone.numbers);
            assert.ok(undefined === clone.oids);
            assert.equal(clone.test, "test");
            assert.equal(clone.nested.age, 5);

            // transform with return value
            const out = { myid: doc._id.toString() };
            doc.schema.options.toJSON.transform = function (doc, ret) {
                // ignore embedded docs
                if (is.function(doc.ownerDocument)) {
                    return;
                }

                return { myid: ret._id.toString() };
            };

            clone = doc.toJSON();
            assert.deepEqual(out, clone);

            // ignored transform with inline options
            clone = doc.toJSON({ x: 1, transform: false });
            assert.ok(!("myid" in clone));
            assert.equal(clone.test, "test");
            assert.ok(clone.oids instanceof Array);
            assert.equal(clone.nested.age, 5);
            assert.equal(clone.nested.cool.toString(), "4c6c2d6240ced95d0e00003c");
            assert.equal(clone.nested.path, "my path");
            assert.equal(clone.em[0].constructor.name, "Object");

            // applied transform when inline transform is true
            clone = doc.toJSON({ x: 1 });
            assert.deepEqual(out, clone);

            // transform passed inline
            function xform(self, doc, opts) {
                opts.fields.split(" ").forEach((field) => {
                    delete doc[field];
                });
            }

            clone = doc.toJSON({
                transform: xform,
                fields: "_id em numbers oids nested"
            });
            assert.equal(doc.test, "test");
            assert.ok(undefined === clone.em);
            assert.ok(undefined === clone.numbers);
            assert.ok(undefined === clone.oids);
            assert.ok(undefined === clone._id);
            assert.ok(undefined === clone.nested);

            // all done
            delete doc.schema.options.toJSON;
            done();
        });

        it("jsonifying an object", (done) => {
            let doc = new TestDocument({ test: "woot" }),
                oidString = doc._id.toString();
            // convert to json string
            const json = JSON.stringify(doc);
            // parse again
            const obj = JSON.parse(json);

            assert.equal(obj.test, "woot");
            assert.equal(obj._id, oidString);
            done();
        });

        it("jsonifying an object's populated items works (gh-1376)", (done) => {
            let userSchema, User, groupSchema, Group;

            userSchema = new Schema({ name: String });
            // includes virtual path when 'toJSON'
            userSchema.set("toJSON", { getters: true });
            userSchema.virtual("hello").get(function () {
                return `Hello, ${this.name}`;
            });
            User = db.model("User", userSchema);

            groupSchema = new Schema({
                name: String,
                _users: [{ type: Schema.ObjectId, ref: "User" }]
            });

            Group = db.model("Group", groupSchema);

            User.create({ name: "Alice" }, { name: "Bob" }, (err, alice, bob) => {
                assert.ifError(err);

                new Group({ name: "mongoose", _users: [alice, bob] }).save((err, group) => {
                    Group.findById(group).populate("_users").exec((err, group) => {
                        assert.ifError(err);
                        assert.ok(group.toJSON()._users[0].hello);
                        done();
                    });
                });
            });
        });
    });

    describe("inspect", () => {
        let db;
        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("inspect inherits schema options (gh-4001)", (done) => {
            const opts = {
                toObject: { virtuals: true },
                toJSON: { virtuals: true }
            };
            const taskSchema = new mongoose.Schema({
                name: {
                    type: String,
                    required: true
                }
            }, opts);

            taskSchema.virtual("title").
                get(function () {
                    return this.name;
                }).
                set(function (title) {
                    this.name = title;
                });

            const Task = db.model("gh4001", taskSchema);

            const doc = { name: "task1", title: "task999" };
            Task.collection.insert(doc, (error) => {
                assert.ifError(error);
                Task.findById(doc._id, (error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc.inspect().title, "task1");
                    done();
                });
            });
        });

        it("does not apply transform to populated docs (gh-4213)", (done) => {
            const UserSchema = new Schema({
                name: String
            });

            const PostSchema = new Schema({
                title: String,
                postedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "gh4213"
                }
            }, {
                    toObject: {
                        transform(doc, ret) {
                            delete ret._id;
                        }
                    },
                    toJSON: {
                        transform(doc, ret) {
                            delete ret._id;
                        }
                    }
                });

            const User = db.model("gh4213", UserSchema);
            const Post = db.model("gh4213_0", PostSchema);

            const val = new User({ name: "Val" });
            const post = new Post({ title: "Test", postedBy: val._id });

            Post.create(post, (error) => {
                assert.ifError(error);
                User.create(val, (error) => {
                    assert.ifError(error);
                    Post.find({}).
                        populate("postedBy").
                        exec((error, posts) => {
                            assert.ifError(error);
                            assert.equal(posts.length, 1);
                            assert.ok(posts[0].postedBy._id);
                            done();
                        });
                });
            });
        });
    });

    describe("#update", () => {
        it("returns a Query", (done) => {
            const mg = new mongoose.Mongoose();
            const M = mg.model("doc#update", { s: String });
            const doc = new M();
            assert.ok(doc.update() instanceof Query);
            done();
        });

        it("calling update on document should relay to its model (gh-794)", (done) => {
            const db = start();
            const Docs = new Schema({ text: String });
            const docs = db.model("docRelayUpdate", Docs);
            const d = new docs({ text: "A doc" });
            let called = false;
            d.save(() => {
                const oldUpdate = docs.update;
                docs.update = function (query, operation) {
                    assert.equal(Object.keys(query).length, 1);
                    assert.equal(d._id, query._id);
                    assert.equal(Object.keys(operation).length, 1);
                    assert.equal(Object.keys(operation.$set).length, 1);
                    assert.equal(operation.$set.text, "A changed doc");
                    called = true;
                    docs.update = oldUpdate;
                    oldUpdate.apply(docs, arguments);
                };
                d.update({ $set: { text: "A changed doc" } }, (err) => {
                    assert.ifError(err);
                    assert.equal(called, true);
                    db.close(done);
                });
            });
        });
    });

    it("toObject should not set undefined values to null", (done) => {
        let doc = new TestDocument(),
            obj = doc.toObject();

        delete obj._id;
        assert.deepEqual(obj, { numbers: [], oids: [], em: [] });
        done();
    });

    describe("Errors", () => {
        it("MongooseErrors should be instances of Error (gh-209)", (done) => {
            const MongooseError = adone.odm.Error;
            const err = new MongooseError("Some message");
            assert.ok(err instanceof Error);
            done();
        });
        it("ValidationErrors should be instances of Error", (done) => {
            let ValidationError = Document.ValidationError,
                err = new ValidationError(new TestDocument());
            assert.ok(err instanceof Error);
            done();
        });
    });

    it("methods on embedded docs should work", (done) => {
        let db = start(),
            ESchema = new Schema({ name: String });

        ESchema.methods.test = function () {
            return `${this.name} butter`;
        };
        ESchema.statics.ten = function () {
            return 10;
        };

        const E = db.model("EmbeddedMethodsAndStaticsE", ESchema);
        const PSchema = new Schema({ embed: [ESchema] });
        const P = db.model("EmbeddedMethodsAndStaticsP", PSchema);
        db.close();

        let p = new P({ embed: [{ name: "peanut" }] });
        assert.equal(typeof p.embed[0].test, "function");
        assert.equal(typeof E.ten, "function");
        assert.equal(p.embed[0].test(), "peanut butter");
        assert.equal(E.ten(), 10);

        // test push casting
        p = new P();
        p.embed.push({ name: "apple" });
        assert.equal(typeof p.embed[0].test, "function");
        assert.equal(typeof E.ten, "function");
        assert.equal(p.embed[0].test(), "apple butter");
        done();
    });

    it("setting a positional path does not cast value to array", (done) => {
        const doc = new TestDocument();
        doc.init({ numbers: [1, 3] });
        assert.equal(doc.numbers[0], 1);
        assert.equal(doc.numbers[1], 3);
        doc.set("numbers.1", 2);
        assert.equal(doc.numbers[0], 1);
        assert.equal(doc.numbers[1], 2);
        done();
    });

    it("no maxListeners warning should occur", (done) => {
        const db = start();

        let traced = false;
        const trace = console.trace;

        console.trace = function () {
            traced = true;
            console.trace = trace;
        };

        const schema = new Schema({
            title: String,
            embed1: [new Schema({ name: String })],
            embed2: [new Schema({ name: String })],
            embed3: [new Schema({ name: String })],
            embed4: [new Schema({ name: String })],
            embed5: [new Schema({ name: String })],
            embed6: [new Schema({ name: String })],
            embed7: [new Schema({ name: String })],
            embed8: [new Schema({ name: String })],
            embed9: [new Schema({ name: String })],
            embed10: [new Schema({ name: String })],
            embed11: [new Schema({ name: String })]
        });

        const S = db.model("noMaxListeners", schema);

        new S({ title: "test" });
        db.close();
        assert.equal(traced, false);
        done();
    });

    it("unselected required fields should pass validation", (done) => {
        let db = start(),
            Tschema = new Schema({ name: String, req: { type: String, required: true } }),
            T = db.model("unselectedRequiredFieldValidation", Tschema);

        const t = new T({ name: "teeee", req: "i am required" });
        t.save((err) => {
            assert.ifError(err);
            T.findById(t).select("name").exec((err, t) => {
                assert.ifError(err);
                assert.equal(t.req, void 0);
                t.name = "wooo";
                t.save((err) => {
                    assert.ifError(err);

                    T.findById(t).select("name").exec((err, t) => {
                        assert.ifError(err);
                        t.req = undefined;
                        t.save((err) => {
                            err = String(err);
                            const invalid = /Path `req` is required./.test(err);
                            assert.ok(invalid);
                            t.req = "it works again";
                            t.save((err) => {
                                assert.ifError(err);

                                T.findById(t).select("_id").exec((err, t) => {
                                    assert.ifError(err);
                                    t.save((err) => {
                                        assert.ifError(err);
                                        db.close(done);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("#validate", () => {
        const collection = `validateschema_${random()}`;

        it("works (gh-891)", (done) => {
            const db = start();
            let schema = null;
            let called = false;

            const validate = [function () {
                called = true;
                return true;
            }, "BAM"];

            schema = new Schema({
                prop: { type: String, required: true, validate },
                nick: { type: String, required: true }
            });

            const M = db.model("validateSchema", schema, collection);
            const m = new M({ prop: "gh891", nick: "validation test" });
            m.save((err) => {
                assert.ifError(err);
                assert.equal(called, true);
                called = false;
                M.findById(m, "nick", (err, m) => {
                    assert.equal(called, false);
                    assert.ifError(err);
                    m.nick = "gh-891";
                    m.save((err) => {
                        assert.equal(called, false);
                        assert.ifError(err);
                        db.close(done);
                    });
                });
            });
        });

        it("can return a promise", (done) => {
            const db = start();
            let schema = null;

            const validate = [function () {
                return true;
            }, "BAM"];

            schema = new Schema({
                prop: { type: String, required: true, validate },
                nick: { type: String, required: true }
            });

            const M = db.model("validateSchemaPromise", schema, collection);
            const m = new M({ prop: "gh891", nick: "validation test" });
            const mBad = new M({ prop: "other" });

            const promise = m.validate();
            promise.then(() => {
                const promise2 = mBad.validate();
                promise2.catch((err) => {
                    assert.ok(Boolean(err));
                    clearTimeout(timeout);
                    db.close(done);
                });
            });

            var timeout = setTimeout(() => {
                db.close();
                throw new Error("Promise not fulfilled!");
            }, 500);
        });

        it("doesnt have stale cast errors (gh-2766)", (done) => {
            const db = start();
            const testSchema = new Schema({ name: String });
            const M = db.model("gh2766", testSchema);

            const m = new M({ _id: "this is not a valid _id" });
            assert.ok(!m.$isValid("_id"));
            assert.ok(m.validateSync().errors._id.name, "CastError");

            m._id = "000000000000000000000001";
            assert.ok(m.$isValid("_id"));
            assert.ifError(m.validateSync());
            m.validate((error) => {
                assert.ifError(error);
                db.close(done);
            });
        });

        it("cast errors persist across validate() calls (gh-2766)", (done) => {
            const db = start();
            const testSchema = new Schema({ name: String });
            const M = db.model("gh2766", testSchema);

            const m = new M({ _id: "this is not a valid _id" });
            assert.ok(!m.$isValid("_id"));
            m.validate((error) => {
                assert.ok(error);
                assert.equal(error.errors._id.name, "CastError");
                m.validate((error) => {
                    assert.ok(error);
                    assert.equal(error.errors._id.name, "CastError");

                    const err1 = m.validateSync();
                    const err2 = m.validateSync();
                    assert.equal(err1.errors._id.name, "CastError");
                    assert.equal(err2.errors._id.name, "CastError");
                    db.close(done);
                });
            });
        });

        it("returns a promise when there are no validators", (done) => {
            const db = start();
            let schema = null;

            schema = new Schema({ _id: String });

            const M = db.model("validateSchemaPromise2", schema, collection);
            const m = new M();

            const promise = m.validate();
            promise.then(() => {
                clearTimeout(timeout);
                db.close();
                done();
            });

            var timeout = setTimeout(() => {
                db.close();
                throw new Error("Promise not fulfilled!");
            }, 500);
        });

        describe("works on arrays", () => {
            let db;

            before((done) => {
                db = start();
                done();
            });

            after((done) => {
                db.close(done);
            });

            it("with required", (done) => {
                const schema = new Schema({
                    name: String,
                    arr: { type: [], required: true }
                });
                const M = db.model("validateSchema-array1", schema, collection);
                const m = new M({ name: "gh1109-1" });
                m.save((err) => {
                    assert.ok(/Path `arr` is required/.test(err));
                    m.arr = [];
                    m.save((err) => {
                        assert.ok(/Path `arr` is required/.test(err));
                        m.arr.push("works");
                        m.save((err) => {
                            assert.ifError(err);
                            done();
                        });
                    });
                });
            });

            it("with custom validator", (done) => {
                let called = false;

                function validator(val) {
                    called = true;
                    return val && val.length > 1;
                }

                const validate = [validator, "BAM"];

                const schema = new Schema({
                    arr: { type: [], validate }
                });

                const M = db.model("validateSchema-array2", schema, collection);
                const m = new M({ name: "gh1109-2", arr: [1] });
                assert.equal(called, false);
                m.save((err) => {
                    assert.equal(String(err), "ValidationError: arr: BAM");
                    assert.equal(called, true);
                    m.arr.push(2);
                    called = false;
                    m.save((err) => {
                        assert.equal(called, true);
                        assert.ifError(err);
                        done();
                    });
                });
            });

            it("with both required + custom validator", (done) => {
                function validator(val) {
                    return val && val.length > 1;
                }

                const validate = [validator, "BAM"];

                const schema = new Schema({
                    arr: { type: [], required: true, validate }
                });

                const M = db.model("validateSchema-array3", schema, collection);
                const m = new M({ name: "gh1109-3" });
                m.save((err) => {
                    assert.equal(err.errors.arr.message, "Path `arr` is required.");
                    m.arr.push({ nice: true });
                    m.save((err) => {
                        assert.equal(String(err), "ValidationError: arr: BAM");
                        m.arr.push(95);
                        m.save((err) => {
                            assert.ifError(err);
                            done();
                        });
                    });
                });
            });
        });

        it("validator should run only once gh-1743", (done) => {
            let count = 0;
            const db = start();

            const Control = new Schema({
                test: {
                    type: String,
                    validate(value, done) {
                        count++;
                        return done(true);
                    }
                }
            });
            const PostSchema = new Schema({
                controls: [Control]
            });

            const Post = db.model("post", PostSchema);

            const post = new Post({
                controls: [{
                    test: "xx"
                }]
            });

            post.save(() => {
                assert.equal(count, 1);
                db.close(done);
            });
        });

        it("validator should run only once per sub-doc gh-1743", (done) => {
            let count = 0;
            const db = start();

            const Control = new Schema({
                test: {
                    type: String,
                    validate(value, done) {
                        count++;
                        return done(true);
                    }
                }
            });
            const PostSchema = new Schema({
                controls: [Control]
            });

            const Post = db.model("post", PostSchema);

            const post = new Post({
                controls: [{
                    test: "xx"
                }, {
                    test: "yy"
                }]
            });

            post.save(() => {
                assert.equal(count, post.controls.length);
                db.close(done);
            });
        });


        it("validator should run in parallel", function (done) {
            // we set the time out to be double that of the validator - 1 (so that running in serial will be greater than that)
            this.timeout(1000);
            const db = start();
            let count = 0;

            const SchemaWithValidator = new Schema({
                preference: {
                    type: String,
                    required: true,
                    validate: function validator(value, done) {
                        count++;
                        setTimeout(done.bind(null, true), 500);
                    }
                }
            });

            const MWSV = db.model("mwv", new Schema({ subs: [SchemaWithValidator] }));
            const m = new MWSV({
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
                assert.ifError(err);
                assert.equal(count, 4);
                db.close(done);
            });
        });
    });

    it("#invalidate", (done) => {
        const db = start();
        let InvalidateSchema = null;
        let Post = null;
        let post = null;

        InvalidateSchema = new Schema({ prop: { type: String } },
            { strict: false });

        mongoose.model("InvalidateSchema", InvalidateSchema);

        Post = db.model("InvalidateSchema");
        post = new Post();
        post.set({ baz: "val" });
        const _err = post.invalidate("baz", "validation failed for path {PATH}",
            "val", "custom error");
        assert.ok(_err instanceof ValidationError);

        post.save((err) => {
            assert.ok(err instanceof MongooseError);
            assert.ok(err instanceof ValidationError);
            assert.ok(err.errors.baz instanceof ValidatorError);
            assert.equal(err.errors.baz.message, "validation failed for path baz");
            assert.equal(err.errors.baz.path, "baz");
            assert.equal(err.errors.baz.value, "val");
            assert.equal(err.errors.baz.kind, "custom error");

            post.save((err) => {
                db.close();
                assert.strictEqual(err, null);
                done();
            });
        });
    });

    describe("#equals", () => {
        describe("should work", () => {
            let db;
            let S;
            let N;
            let O;
            let B;
            let M;

            before(() => {
                db = start();
                S = db.model("equals-S", new Schema({ _id: String }));
                N = db.model("equals-N", new Schema({ _id: Number }));
                O = db.model("equals-O", new Schema({ _id: Schema.ObjectId }));
                B = db.model("equals-B", new Schema({ _id: Buffer }));
                M = db.model("equals-I", new Schema({ name: String }, { _id: false }));
            });

            after((done) => {
                db.close(done);
            });

            it("with string _ids", (done) => {
                const s1 = new S({ _id: "one" });
                const s2 = new S({ _id: "one" });
                assert.ok(s1.equals(s2));
                done();
            });
            it("with number _ids", (done) => {
                const n1 = new N({ _id: 0 });
                const n2 = new N({ _id: 0 });
                assert.ok(n1.equals(n2));
                done();
            });
            it("with ObjectId _ids", (done) => {
                let id = new mongoose.Types.ObjectId();
                let o1 = new O({ _id: id });
                let o2 = new O({ _id: id });
                assert.ok(o1.equals(o2));

                id = String(new mongoose.Types.ObjectId());
                o1 = new O({ _id: id });
                o2 = new O({ _id: id });
                assert.ok(o1.equals(o2));
                done();
            });
            it("with Buffer _ids", (done) => {
                const n1 = new B({ _id: 0 });
                const n2 = new B({ _id: 0 });
                assert.ok(n1.equals(n2));
                done();
            });
            it("with _id disabled (gh-1687)", (done) => {
                const m1 = new M();
                const m2 = new M();
                assert.doesNotThrow(() => {
                    m1.equals(m2);
                });
                done();
            });
        });
    });

    describe("setter", () => {
        describe("order", () => {
            it("is applied correctly", (done) => {
                const date = "Thu Aug 16 2012 09:45:59 GMT-0700";
                const d = new TestDocument();
                dateSetterCalled = false;
                d.date = date;
                assert.ok(dateSetterCalled);
                dateSetterCalled = false;
                assert.ok(d._doc.date instanceof Date);
                assert.ok(d.date instanceof Date);
                assert.equal(Number(d.date), Number(new Date(date)));
                done();
            });
        });

        it("works with undefined (gh-1892)", (done) => {
            const d = new TestDocument();
            d.nested.setr = undefined;
            assert.equal(d.nested.setr, "undefined setter");
            dateSetterCalled = false;
            d.date = undefined;
            d.validate((err) => {
                assert.ifError(err);
                assert.ok(dateSetterCalled);
                done();
            });
        });

        describe("on nested paths", () => {
            describe("using set(path, object)", () => {
                it("overwrites the entire object", (done) => {
                    let doc = new TestDocument();

                    doc.init({
                        test: "Test",
                        nested: {
                            age: 5
                        }
                    });

                    doc.set("nested", { path: "overwrite the entire nested object" });
                    assert.equal(doc.nested.age, undefined);
                    assert.equal(Object.keys(doc._doc.nested).length, 1);
                    assert.equal(doc.nested.path, "overwrite the entire nested object");
                    assert.ok(doc.isModified("nested"));

                    // vs merging using doc.set(object)
                    doc.set({ test: "Test", nested: { age: 4 } });
                    assert.equal(doc.nested.path, "4overwrite the entire nested object");
                    assert.equal(doc.nested.age, 4);
                    assert.equal(Object.keys(doc._doc.nested).length, 2);
                    assert.ok(doc.isModified("nested"));

                    doc = new TestDocument();
                    doc.init({
                        test: "Test",
                        nested: {
                            age: 5
                        }
                    });

                    // vs merging using doc.set(path, object, {merge: true})
                    doc.set("nested", { path: "did not overwrite the nested object" }, { merge: true });
                    assert.equal(doc.nested.path, "5did not overwrite the nested object");
                    assert.equal(doc.nested.age, 5);
                    assert.equal(Object.keys(doc._doc.nested).length, 3);
                    assert.ok(doc.isModified("nested"));

                    doc = new TestDocument();
                    doc.init({
                        test: "Test",
                        nested: {
                            age: 5
                        }
                    });

                    doc.set({ test: "Test", nested: { age: 5 } });
                    assert.ok(!doc.isModified());
                    assert.ok(!doc.isModified("test"));
                    assert.ok(!doc.isModified("nested"));
                    assert.ok(!doc.isModified("nested.age"));

                    doc.nested = { path: "overwrite the entire nested object", age: 5 };
                    assert.equal(doc.nested.age, 5);
                    assert.equal(Object.keys(doc._doc.nested).length, 2);
                    assert.equal(doc.nested.path, "5overwrite the entire nested object");
                    assert.ok(doc.isModified("nested"));

                    doc.nested.deep = { x: "Hank and Marie" };
                    assert.equal(Object.keys(doc._doc.nested).length, 3);
                    assert.equal(doc.nested.path, "5overwrite the entire nested object");
                    assert.ok(doc.isModified("nested"));
                    assert.equal(doc.nested.deep.x, "Hank and Marie");

                    doc = new TestDocument();
                    doc.init({
                        test: "Test",
                        nested: {
                            age: 5
                        }
                    });

                    doc.set("nested.deep", { x: "Hank and Marie" });
                    assert.equal(Object.keys(doc._doc.nested).length, 2);
                    assert.equal(Object.keys(doc._doc.nested.deep).length, 1);
                    assert.ok(doc.isModified("nested"));
                    assert.ok(!doc.isModified("nested.path"));
                    assert.ok(!doc.isModified("nested.age"));
                    assert.ok(doc.isModified("nested.deep"));
                    assert.equal(doc.nested.deep.x, "Hank and Marie");

                    done();
                });

                it("gh-1954", (done) => {
                    const schema = new Schema({
                        schedule: [new Schema({ open: Number, close: Number })]
                    });

                    const M = mongoose.model("Blog", schema);

                    const doc = new M({
                        schedule: [{
                            open: 1000,
                            close: 1900
                        }]
                    });

                    assert.ok(doc.schedule[0] instanceof Embedded);
                    doc.set("schedule.0.open", 1100);
                    assert.ok(doc.schedule);
                    assert.ok(doc.schedule.isMongooseDocumentArray);
                    assert.ok(doc.schedule[0] instanceof Embedded);
                    assert.equal(doc.schedule[0].open, 1100);
                    assert.equal(doc.schedule[0].close, 1900);

                    done();
                });
            });

            describe("when overwriting with a document instance", () => {
                it("does not cause StackOverflows (gh-1234)", (done) => {
                    const doc = new TestDocument({ nested: { age: 35 } });
                    doc.nested = doc.nested;
                    assert.doesNotThrow(() => {
                        doc.nested.age;
                    });
                    done();
                });
            });
        });
    });

    describe("virtual", () => {
        describe("setter", () => {
            let val;
            let M;

            before((done) => {
                const schema = new mongoose.Schema({ v: Number });
                schema.virtual("thang").set((v) => {
                    val = v;
                });

                const db = start();
                M = db.model("gh-1154", schema);
                db.close();
                done();
            });

            it("works with objects", (done) => {
                new M({ thang: {} });
                assert.deepEqual({}, val);
                done();
            });
            it("works with arrays", (done) => {
                new M({ thang: [] });
                assert.deepEqual([], val);
                done();
            });
            it("works with numbers", (done) => {
                new M({ thang: 4 });
                assert.deepEqual(4, val);
                done();
            });
            it("works with strings", (done) => {
                new M({ thang: "3" });
                assert.deepEqual("3", val);
                done();
            });
        });
    });

    describe("gh-2082", () => {
        it("works", (done) => {
            const db = start();
            const Parent = db.model("gh2082", parentSchema, "gh2082");

            const parent = new Parent({ name: "Hello" });
            parent.save((err, parent) => {
                assert.ifError(err);
                parent.children.push({ counter: 0 });
                parent.save((err, parent) => {
                    assert.ifError(err);
                    parent.children[0].counter += 1;
                    parent.save((err, parent) => {
                        assert.ifError(err);
                        parent.children[0].counter += 1;
                        parent.save((err) => {
                            assert.ifError(err);
                            Parent.findOne({}, (error, parent) => {
                                assert.ifError(error);
                                assert.equal(parent.children[0].counter, 2);
                                db.close(done);
                            });
                        });
                    });
                });
            });
        });
    });

    describe("gh-1933", () => {
        it("works", (done) => {
            const db = start();
            const M = db.model("gh1933", new Schema({ id: String, field: Number }), "gh1933");

            M.create({}, (error) => {
                assert.ifError(error);
                M.findOne({}, (error, doc) => {
                    assert.ifError(error);
                    doc.__v = 123;
                    doc.field = 5; // .push({ _id: '123', type: '456' });
                    doc.save((error) => {
                        assert.ifError(error);
                        db.close(done);
                    });
                });
            });
        });
    });

    describe("gh-1638", () => {
        it("works", (done) => {
            const ItemChildSchema = new mongoose.Schema({
                name: { type: String, required: true, default: "hello" }
            });

            const ItemParentSchema = new mongoose.Schema({
                children: [ItemChildSchema]
            });

            const db = start();
            const ItemParent = db.model("gh-1638-1", ItemParentSchema, "gh-1638-1");
            const ItemChild = db.model("gh-1638-2", ItemChildSchema, "gh-1638-2");

            const c1 = new ItemChild({ name: "first child" });
            const c2 = new ItemChild({ name: "second child" });

            const p = new ItemParent({
                children: [c1, c2]
            });

            p.save((error) => {
                assert.ifError(error);

                c2.name = "updated 2";
                p.children = [c2];
                p.save((error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc.children.length, 1);
                    db.close(done);
                });
            });
        });
    });

    describe("gh-2434", () => {
        it("will save the new value", (done) => {
            const ItemSchema = new mongoose.Schema({
                st: Number,
                s: []
            });

            const db = start();
            const Item = db.model("gh-2434", ItemSchema, "gh-2434");

            const item = new Item({ st: 1 });

            item.save((error) => {
                assert.ifError(error);
                item.st = 3;
                item.s = [];
                item.save((error) => {
                    assert.ifError(error);
                    // item.st is 3 but may not be saved to DB
                    Item.findById(item._id, (error, doc) => {
                        assert.ifError(error);
                        assert.equal(doc.st, 3);
                        db.close(done);
                    });
                });
            });
        });
    });

    it("properly calls queue functions (gh-2856)", (done) => {
        const personSchema = new mongoose.Schema({
            name: String
        });

        const db = start();
        let calledName;
        personSchema.methods.fn = function () {
            calledName = this.name;
        };
        personSchema.queue("fn");

        const Person = db.model("gh2856", personSchema, "gh2856");
        new Person({ name: "Val" });
        assert.equal(calledName, "Val");
        db.close(done);
    });

    describe("bug fixes", () => {
        let db;

        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("applies toJSON transform correctly for populated docs (gh-2910) (gh-2990)", (done) => {
            const parentSchema = new mongoose.Schema({
                c: { type: mongoose.Schema.Types.ObjectId, ref: "gh-2910-1" }
            });

            let called = [];
            parentSchema.options.toJSON = {
                transform(doc, ret) {
                    called.push(ret);
                    return ret;
                }
            };

            const childSchema = new mongoose.Schema({
                name: String
            });

            let childCalled = [];
            childSchema.options.toJSON = {
                transform(doc, ret) {
                    childCalled.push(ret);
                    return ret;
                }
            };

            const Child = db.model("gh-2910-1", childSchema);
            const Parent = db.model("gh-2910-0", parentSchema);

            Child.create({ name: "test" }, (error, c) => {
                Parent.create({ c: c._id }, (error, p) => {
                    Parent.findOne({ _id: p._id }).populate("c").exec((error, p) => {
                        let doc = p.toJSON();
                        assert.equal(called.length, 1);
                        assert.equal(called[0]._id.toString(), p._id.toString());
                        assert.equal(doc._id.toString(), p._id.toString());
                        assert.equal(childCalled.length, 1);
                        assert.equal(childCalled[0]._id.toString(), c._id.toString());

                        called = [];
                        childCalled = [];

                        // JSON.stringify() passes field name, so make sure we don't treat
                        // that as a param to toJSON (gh-2990)
                        doc = JSON.parse(JSON.stringify({ parent: p })).parent;
                        assert.equal(called.length, 1);
                        assert.equal(called[0]._id.toString(), p._id.toString());
                        assert.equal(doc._id.toString(), p._id.toString());
                        assert.equal(childCalled.length, 1);
                        assert.equal(childCalled[0]._id.toString(), c._id.toString());

                        done();
                    });
                });
            });
        });

        it("single nested schema transform with save() (gh-5807)", () => {
            const embeddedSchema = new Schema({
                test: String
            });

            let called = false;
            embeddedSchema.options.toObject = {
                transform(doc, ret) {
                    called = true;
                    delete ret.test;
                    return ret;
                }
            };
            const topLevelSchema = new Schema({
                embedded: embeddedSchema
            });

            const MyModel = db.model("gh5807", topLevelSchema);

            return MyModel.create({}).then((doc) => {
                doc.embedded = { test: "123" };
                return doc.save();
            }).then((doc) => {
                return MyModel.findById(doc._id);
            }).then((doc) => {
                assert.equal(doc.embedded.test, "123");
                assert.ok(!called);
            });
        });

        it("setters firing with objects on real paths (gh-2943)", (done) => {
            const M = mongoose.model("gh2943", {
                myStr: {
                    type: String, set(v) {
                        return v.value;
                    }
                },
                otherStr: String
            });

            const t = new M({ myStr: { value: "test" } });
            assert.equal(t.myStr, "test");

            new M({ otherStr: { value: "test" } });
            assert.ok(!t.otherStr);

            done();
        });

        describe("gh-2782", () => {
            it("should set data from a sub doc", (done) => {
                const schema1 = new mongoose.Schema({
                    data: {
                        email: String
                    }
                });
                const schema2 = new mongoose.Schema({
                    email: String
                });
                const Model1 = mongoose.model("gh-2782-1", schema1);
                const Model2 = mongoose.model("gh-2782-2", schema2);

                const doc1 = new Model1({ "data.email": "some@example.com" });
                assert.equal(doc1.data.email, "some@example.com");
                const doc2 = new Model2();
                doc2.set(doc1.data);
                assert.equal(doc2.email, "some@example.com");
                done();
            });
        });

        it("set data from subdoc keys (gh-3346)", (done) => {
            const schema1 = new mongoose.Schema({
                data: {
                    email: String
                }
            });
            const Model1 = mongoose.model("gh3346", schema1);

            const doc1 = new Model1({ "data.email": "some@example.com" });
            assert.equal(doc1.data.email, "some@example.com");
            const doc2 = new Model1({ data: doc1.data });
            assert.equal(doc2.data.email, "some@example.com");
            done();
        });

        it("doesnt attempt to cast generic objects as strings (gh-3030)", (done) => {
            const M = mongoose.model("gh3030", {
                myStr: {
                    type: String
                }
            });

            const t = new M({ myStr: { thisIs: "anObject" } });
            assert.ok(!t.myStr);
            t.validate((error) => {
                assert.ok(error);
                done();
            });
        });

        it("single embedded schemas 1 (gh-2689)", (done) => {
            const userSchema = new mongoose.Schema({
                name: String,
                email: String
            }, { _id: false, id: false });

            let userHookCount = 0;
            userSchema.pre("save", (next) => {
                ++userHookCount;
                next();
            });

            const eventSchema = new mongoose.Schema({
                user: userSchema,
                name: String
            });

            let eventHookCount = 0;
            eventSchema.pre("save", (next) => {
                ++eventHookCount;
                next();
            });

            const Event = db.model("gh2689", eventSchema);

            const e = new Event({ name: "test", user: { name: 123, email: "val" } });
            e.save((error) => {
                assert.ifError(error);
                assert.strictEqual(e.user.name, "123");
                assert.equal(eventHookCount, 1);
                assert.equal(userHookCount, 1);

                Event.findOne(
                    { user: { name: "123", email: "val" } },
                    (error, doc) => {
                        assert.ifError(error);
                        assert.ok(doc);

                        Event.findOne(
                            { user: { $in: [{ name: "123", email: "val" }] } },
                            (error, doc) => {
                                assert.ifError(error);
                                assert.ok(doc);
                                done();
                            });
                    });
            });
        });

        it("single embedded schemas with validation (gh-2689)", (done) => {
            const userSchema = new mongoose.Schema({
                name: String,
                email: { type: String, required: true, match: /.+@.+/ }
            }, { _id: false, id: false });

            const eventSchema = new mongoose.Schema({
                user: userSchema,
                name: String
            });

            const Event = db.model("gh2689_1", eventSchema);

            const e = new Event({ name: "test", user: {} });
            let error = e.validateSync();
            assert.ok(error);
            assert.ok(error.errors["user.email"]);
            assert.equal(error.errors["user.email"].kind, "required");

            e.user.email = "val";
            error = e.validateSync();

            assert.ok(error);
            assert.ok(error.errors["user.email"]);
            assert.equal(error.errors["user.email"].kind, "regexp");

            done();
        });

        it("single embedded parent() (gh-5134)", (done) => {
            const userSchema = new mongoose.Schema({
                name: String,
                email: { type: String, required: true, match: /.+@.+/ }
            }, { _id: false, id: false });

            const eventSchema = new mongoose.Schema({
                user: userSchema,
                name: String
            });

            const Event = db.model("gh5134", eventSchema);

            const e = new Event({ name: "test", user: {} });
            assert.strictEqual(e.user.parent(), e.user.ownerDocument());

            done();
        });

        it("single embedded schemas with markmodified (gh-2689)", (done) => {
            const userSchema = new mongoose.Schema({
                name: String,
                email: { type: String, required: true, match: /.+@.+/ }
            }, { _id: false, id: false });

            const eventSchema = new mongoose.Schema({
                user: userSchema,
                name: String
            });

            const Event = db.model("gh2689_2", eventSchema);

            const e = new Event({ name: "test", user: { email: "a@b" } });
            e.save((error, doc) => {
                assert.ifError(error);
                assert.ok(doc);
                assert.ok(!doc.isModified("user"));
                assert.ok(!doc.isModified("user.email"));
                assert.ok(!doc.isModified("user.name"));
                doc.user.name = "Val";
                assert.ok(doc.isModified("user"));
                assert.ok(!doc.isModified("user.email"));
                assert.ok(doc.isModified("user.name"));

                const delta = doc.$__delta()[1];
                assert.deepEqual(delta, {
                    $set: { "user.name": "Val" }
                });

                doc.save((error) => {
                    assert.ifError(error);
                    Event.findOne({ _id: doc._id }, (error, doc) => {
                        assert.ifError(error);
                        assert.deepEqual(doc.user.toObject(), { email: "a@b", name: "Val" });
                        done();
                    });
                });
            });
        });

        it("single embedded schemas + update validators (gh-2689)", (done) => {
            const userSchema = new mongoose.Schema({
                name: { type: String, default: "Val" },
                email: { type: String, required: true, match: /.+@.+/ }
            }, { _id: false, id: false });

            const eventSchema = new mongoose.Schema({
                user: userSchema,
                name: String
            });

            const Event = db.model("gh2689_3", eventSchema);

            const badUpdate = { $set: { "user.email": "a" } };
            const options = { runValidators: true };
            Event.update({}, badUpdate, options, (error) => {
                assert.ok(error);
                // adone.log(error.errors['user.email']);
                assert.equal(error.errors["user.email"].kind, "regexp");

                const nestedUpdate = { name: "test" };
                const options = { upsert: true, setDefaultsOnInsert: true };
                Event.update({}, nestedUpdate, options, (error) => {
                    assert.ifError(error);
                    Event.findOne({ name: "test" }, (error, ev) => {
                        assert.ifError(error);
                        assert.equal(ev.user.name, "Val");
                        done();
                    });
                });
            });
        });
    });

    describe("error processing (gh-2284)", () => {
        let db;

        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("save errors", (done) => {
            const schema = new Schema({
                name: { type: String, required: true }
            });

            schema.post("save", (error, doc, next) => {
                assert.ok(doc instanceof Model);
                next(new Error("Catch all"));
            });

            schema.post("save", (error, doc, next) => {
                assert.ok(doc instanceof Model);
                next(new Error("Catch all #2"));
            });

            var Model = mongoose.model("gh2284", schema);

            Model.create({}, (error) => {
                assert.ok(error);
                assert.equal(error.message, "Catch all #2");
                done();
            });
        });

        it("validate errors (gh-4885)", (done) => {
            const testSchema = new Schema({ title: { type: String, required: true } });

            let called = 0;
            testSchema.post("validate", (error, doc, next) => {
                ++called;
                next(error);
            });

            const Test = db.model("gh4885", testSchema);

            Test.create({}, (error) => {
                assert.ok(error);
                assert.equal(called, 1);
                done();
            });
        });

        it("handles non-errors", (done) => {
            const schema = new Schema({
                name: { type: String, required: true }
            });

            schema.post("save", (error, doc, next) => {
                next(new Error("Catch all"));
            });

            schema.post("save", (error, doc, next) => {
                next(new Error("Catch all #2"));
            });

            const Model = db.model("gh2284_1", schema);

            Model.create({ name: "test" }, (error) => {
                assert.ifError(error);
                done();
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

        it("single embedded schemas with populate (gh-3501)", (done) => {
            const PopulateMeSchema = new Schema({});

            const Child = db.model("gh3501", PopulateMeSchema);

            const SingleNestedSchema = new Schema({
                populateMeArray: [{
                    type: Schema.Types.ObjectId,
                    ref: "gh3501"
                }]
            });

            const parentSchema = new Schema({
                singleNested: SingleNestedSchema
            });

            const P = db.model("gh3501_1", parentSchema);

            Child.create([{}, {}], (error, docs) => {
                assert.ifError(error);
                const obj = {
                    singleNested: { populateMeArray: [docs[0]._id, docs[1]._id] }
                };
                P.create(obj, (error, doc) => {
                    assert.ifError(error);
                    P.
                        findById(doc._id).
                        populate("singleNested.populateMeArray").
                        exec((error, doc) => {
                            assert.ok(doc.singleNested.populateMeArray[0]._id);
                            done();
                        });
                });
            });
        });

        it("single embedded schemas with methods (gh-3534)", (done) => {
            const personSchema = new Schema({ name: String });
            personSchema.methods.firstName = function () {
                return this.name.substr(0, this.name.indexOf(" "));
            };

            const bandSchema = new Schema({ leadSinger: personSchema });
            const Band = db.model("gh3534", bandSchema);

            const gnr = new Band({ leadSinger: { name: "Axl Rose" } });
            assert.equal(gnr.leadSinger.firstName(), "Axl");
            done();
        });

        it("single embedded schemas with models (gh-3535)", (done) => {
            const db = start();
            const personSchema = new Schema({ name: String });
            const Person = db.model("gh3535_0", personSchema);

            const bandSchema = new Schema({ leadSinger: personSchema });
            const Band = db.model("gh3535", bandSchema);

            const axl = new Person({ name: "Axl Rose" });
            const gnr = new Band({ leadSinger: axl });

            gnr.save((error) => {
                assert.ifError(error);
                assert.equal(gnr.leadSinger.name, "Axl Rose");
                done();
            });
        });

        it("single embedded schemas with indexes (gh-3594)", (done) => {
            const personSchema = new Schema({ name: { type: String, unique: true } });

            const bandSchema = new Schema({ leadSinger: personSchema });

            assert.equal(bandSchema.indexes().length, 1);
            const index = bandSchema.indexes()[0];
            assert.deepEqual(index[0], { "leadSinger.name": 1 });
            assert.ok(index[1].unique);
            done();
        });

        it("removing single embedded docs (gh-3596)", (done) => {
            const personSchema = new Schema({ name: String });

            const bandSchema = new Schema({ guitarist: personSchema, name: String });
            const Band = db.model("gh3596", bandSchema);

            const gnr = new Band({
                name: "Guns N' Roses",
                guitarist: { name: "Slash" }
            });
            gnr.save((error, gnr) => {
                assert.ifError(error);
                gnr.guitarist = undefined;
                gnr.save((error, gnr) => {
                    assert.ifError(error);
                    assert.ok(!gnr.guitarist);
                    done();
                });
            });
        });

        it("setting single embedded docs (gh-3601)", (done) => {
            const personSchema = new Schema({ name: String });

            const bandSchema = new Schema({ guitarist: personSchema, name: String });
            const Band = db.model("gh3601", bandSchema);

            const gnr = new Band({
                name: "Guns N' Roses",
                guitarist: { name: "Slash" }
            });
            const velvetRevolver = new Band({
                name: "Velvet Revolver"
            });
            velvetRevolver.guitarist = gnr.guitarist;
            velvetRevolver.save((error) => {
                assert.ifError(error);
                assert.equal(velvetRevolver.guitarist, gnr.guitarist);
                done();
            });
        });

        it("single embedded docs init obeys strict mode (gh-3642)", (done) => {
            const personSchema = new Schema({ name: String });

            const bandSchema = new Schema({ guitarist: personSchema, name: String });
            const Band = db.model("gh3642", bandSchema);

            const velvetRevolver = new Band({
                name: "Velvet Revolver",
                guitarist: { name: "Slash", realName: "Saul Hudson" }
            });

            velvetRevolver.save((error) => {
                assert.ifError(error);
                const query = { name: "Velvet Revolver" };
                Band.collection.findOne(query, (error, band) => {
                    assert.ifError(error);
                    assert.ok(!band.guitarist.realName);
                    done();
                });
            });
        });

        it("single embedded docs post hooks (gh-3679)", (done) => {
            const postHookCalls = [];
            const personSchema = new Schema({ name: String });
            personSchema.post("save", function () {
                postHookCalls.push(this);
            });

            const bandSchema = new Schema({ guitarist: personSchema, name: String });
            const Band = db.model("gh3679", bandSchema);
            const obj = { name: "Guns N' Roses", guitarist: { name: "Slash" } };

            Band.create(obj, (error) => {
                assert.ifError(error);
                setTimeout(() => {
                    assert.equal(postHookCalls.length, 1);
                    assert.equal(postHookCalls[0].name, "Slash");
                    done();
                });
            });
        });

        it("single embedded docs .set() (gh-3686)", (done) => {
            const personSchema = new Schema({ name: String, realName: String });

            const bandSchema = new Schema({
                guitarist: personSchema,
                name: String
            });
            const Band = db.model("gh3686", bandSchema);
            const obj = {
                name: "Guns N' Roses",
                guitarist: { name: "Slash", realName: "Saul Hudson" }
            };

            Band.create(obj, (error, gnr) => {
                gnr.set("guitarist.name", "Buckethead");
                gnr.save((error) => {
                    assert.ifError(error);
                    assert.equal(gnr.guitarist.name, "Buckethead");
                    assert.equal(gnr.guitarist.realName, "Saul Hudson");
                    done();
                });
            });
        });

        it("single embedded docs with arrays pre hooks (gh-3680)", (done) => {
            const childSchema = new Schema({ count: Number });

            let preCalls = 0;
            childSchema.pre("save", (next) => {
                ++preCalls;
                next();
            });

            const SingleNestedSchema = new Schema({
                children: [childSchema]
            });

            const ParentSchema = new Schema({
                singleNested: SingleNestedSchema
            });

            const Parent = db.model("gh3680", ParentSchema);
            const obj = { singleNested: { children: [{ count: 0 }] } };
            Parent.create(obj, (error) => {
                assert.ifError(error);
                assert.equal(preCalls, 1);
                done();
            });
        });

        it("nested single embedded doc validation (gh-3702)", (done) => {
            const childChildSchema = new Schema({ count: { type: Number, min: 1 } });
            const childSchema = new Schema({ child: childChildSchema });
            const parentSchema = new Schema({ child: childSchema });

            const Parent = db.model("gh3702", parentSchema);
            const obj = { child: { child: { count: 0 } } };
            Parent.create(obj, (error) => {
                assert.ok(error);
                assert.ok(/ValidationError/.test(error.toString()));
                done();
            });
        });

        it("handles virtuals with dots correctly (gh-3618)", (done) => {
            const testSchema = new Schema({ nested: { type: Object, default: {} } });
            testSchema.virtual("nested.test").get(() => {
                return true;
            });

            const Test = db.model("gh3618", testSchema);

            const test = new Test();

            let doc = test.toObject({ getters: true, virtuals: true });
            delete doc._id;
            delete doc.id;
            assert.deepEqual(doc, { nested: { test: true } });

            doc = test.toObject({ getters: false, virtuals: true });
            delete doc._id;
            delete doc.id;
            assert.deepEqual(doc, { nested: { test: true } });
            done();
        });

        it("handles pushing with numeric keys (gh-3623)", (done) => {
            const schema = new Schema({
                array: [{
                    1: {
                        date: Date
                    },
                    2: {
                        date: Date
                    },
                    3: {
                        date: Date
                    }
                }]
            });

            const MyModel = db.model("gh3623", schema);

            const doc = { array: [{ 2: {} }] };
            MyModel.collection.insertOne(doc, (error) => {
                assert.ifError(error);

                MyModel.findOne({ _id: doc._id }, (error, doc) => {
                    assert.ifError(error);
                    doc.array.push({ 2: {} });
                    doc.save((error) => {
                        assert.ifError(error);
                        done();
                    });
                });
            });
        });

        it("execPopulate (gh-3753)", (done) => {
            const childSchema = new Schema({
                name: String
            });

            const parentSchema = new Schema({
                name: String,
                children: [{ type: ObjectId, ref: "gh3753" }]
            });

            const Child = db.model("gh3753", childSchema);
            const Parent = db.model("gh3753_0", parentSchema);

            Child.create({ name: "Luke Skywalker" }, (error, child) => {
                assert.ifError(error);
                const doc = { name: "Darth Vader", children: [child._id] };
                Parent.create(doc, (error, doc) => {
                    Parent.findOne({ _id: doc._id }, (error, doc) => {
                        assert.ifError(error);
                        assert.ok(doc);
                        doc.populate("children").execPopulate().then((doc) => {
                            assert.equal(doc.children.length, 1);
                            assert.equal(doc.children[0].name, "Luke Skywalker");
                            done();
                        });
                    });
                });
            });
        });

        it("handles 0 for numeric subdoc ids (gh-3776)", (done) => {
            const personSchema = new Schema({
                _id: Number,
                name: String,
                age: Number,
                friends: [{ type: Number, ref: "gh3776" }]
            });

            const Person = db.model("gh3776", personSchema);

            const people = [
                { _id: 0, name: "Alice" },
                { _id: 1, name: "Bob" }
            ];

            Person.create(people, (error, people) => {
                assert.ifError(error);
                const alice = people[0];
                alice.friends.push(people[1]);
                alice.save((error) => {
                    assert.ifError(error);
                    done();
                });
            });
        });

        it("handles conflicting names (gh-3867)", (done) => {
            const testSchema = new Schema({
                name: {
                    type: String,
                    required: true
                },
                things: [{
                    name: {
                        type: String,
                        required: true
                    }
                }]
            });

            const M = mongoose.model("gh3867", testSchema);

            const doc = new M({
                things: [{}]
            });

            const fields = Object.keys(doc.validateSync().errors).sort();
            assert.deepEqual(fields, ["name", "things.0.name"]);
            done();
        });

        it("populate with lean (gh-3873)", (done) => {
            const companySchema = new mongoose.Schema({
                name: String,
                description: String,
                userCnt: { type: Number, default: 0, select: false }
            });

            const userSchema = new mongoose.Schema({
                name: String,
                company: { type: mongoose.Schema.Types.ObjectId, ref: "gh3873" }
            });

            const Company = db.model("gh3873", companySchema);
            const User = db.model("gh3873_0", userSchema);

            const company = new Company({ name: "IniTech", userCnt: 1 });
            const user = new User({ name: "Peter", company: company._id });

            company.save((error) => {
                assert.ifError(error);
                user.save((error) => {
                    assert.ifError(error);
                    next();
                });
            });

            function next() {
                const pop = { path: "company", select: "name", options: { lean: true } };
                User.find({}).populate(pop).exec((error, docs) => {
                    assert.ifError(error);
                    assert.equal(docs.length, 1);
                    assert.strictEqual(docs[0].company.userCnt, undefined);
                    done();
                });
            }
        });

        it("init single nested subdoc with select (gh-3880)", (done) => {
            const childSchema = new mongoose.Schema({
                name: { type: String },
                friends: [{ type: String }]
            });

            const parentSchema = new mongoose.Schema({
                name: { type: String },
                child: childSchema
            });

            const Parent = db.model("gh3880", parentSchema);
            const p = new Parent({
                name: "Mufasa",
                child: {
                    name: "Simba",
                    friends: ["Pumbaa", "Timon", "Nala"]
                }
            });

            p.save((error) => {
                assert.ifError(error);
                const fields = "name child.name";
                Parent.findById(p._id).select(fields).exec((error, doc) => {
                    assert.ifError(error);
                    assert.strictEqual(doc.child.friends, void 0);
                    done();
                });
            });
        });

        it("single nested subdoc isModified() (gh-3910)", (done) => {
            let called = 0;

            const ChildSchema = new Schema({
                name: String
            });

            ChildSchema.pre("save", function (next) {
                assert.ok(this.isModified("name"));
                ++called;
                next();
            });

            const ParentSchema = new Schema({
                name: String,
                child: ChildSchema
            });

            const Parent = db.model("gh3910", ParentSchema);

            const p = new Parent({
                name: "Darth Vader",
                child: {
                    name: "Luke Skywalker"
                }
            });

            p.save((error) => {
                assert.ifError(error);
                assert.strictEqual(called, 1);
                done();
            });
        });

        it("pre and post as schema keys (gh-3902)", (done) => {
            const schema = new mongoose.Schema({
                pre: String,
                post: String
            }, { versionKey: false });
            const MyModel = db.model("gh3902", schema);

            MyModel.create({ pre: "test", post: "test" }, (error, doc) => {
                assert.ifError(error);
                assert.deepEqual(_.omit(doc.toObject(), "_id"),
                    { pre: "test", post: "test" });
                done();
            });
        });

        it("manual population and isNew (gh-3982)", (done) => {
            const NestedModelSchema = new mongoose.Schema({
                field: String
            });

            const NestedModel = db.model("gh3982", NestedModelSchema);

            const ModelSchema = new mongoose.Schema({
                field: String,
                array: [{
                    type: mongoose.Schema.ObjectId,
                    ref: "gh3982",
                    required: true
                }]
            });

            const Model = db.model("gh3982_0", ModelSchema);

            const nestedModel = new NestedModel({
                field: "nestedModel"
            });

            nestedModel.save((error, nestedModel) => {
                assert.ifError(error);
                Model.create({ array: [nestedModel._id] }, (error, doc) => {
                    assert.ifError(error);
                    Model.findById(doc._id).populate("array").exec((error, doc) => {
                        assert.ifError(error);
                        doc.array.push(nestedModel);
                        assert.strictEqual(doc.isNew, false);
                        assert.strictEqual(doc.array[0].isNew, false);
                        assert.strictEqual(doc.array[1].isNew, false);
                        assert.strictEqual(nestedModel.isNew, false);
                        done();
                    });
                });
            });
        });

        it("doesnt skipId for single nested subdocs (gh-4008)", (done) => {
            const childSchema = new Schema({
                name: String
            });

            const parentSchema = new Schema({
                child: childSchema
            });

            const Parent = db.model("gh4008", parentSchema);

            Parent.create({ child: { name: "My child" } }, (error, doc) => {
                assert.ifError(error);
                Parent.collection.findOne({ _id: doc._id }, (error, doc) => {
                    assert.ifError(error);
                    assert.ok(doc.child._id);
                    done();
                });
            });
        });

        it("single embedded docs with $near (gh-4014)", (done) => {
            const schema = new mongoose.Schema({
                placeName: String
            });

            const geoSchema = new mongoose.Schema({
                type: {
                    type: String,
                    enum: "Point",
                    default: "Point"
                },
                coordinates: {
                    type: [Number],
                    default: [0, 0]
                }
            });

            schema.add({ geo: geoSchema });
            schema.index({ geo: "2dsphere" });

            const MyModel = db.model("gh4014", schema);

            MyModel.
                where("geo").near({ center: [50, 50] }).
                exec((error) => {
                    assert.ifError(error);
                    done();
                });
        });

        it("skip validation if required returns false (gh-4094)", (done) => {
            const schema = new Schema({
                div: {
                    type: Number,
                    required() {
                        return false;
                    },
                    validate(v) {
                        return Boolean(v);
                    }
                }
            });
            const Model = db.model("gh4094", schema);
            const m = new Model();
            assert.ifError(m.validateSync());
            done();
        });

        it("ability to overwrite array default (gh-4109)", (done) => {
            const schema = new Schema({
                names: {
                    type: [String],
                    default: void 0
                }
            });

            const Model = db.model("gh4109", schema);
            const m = new Model();
            assert.ok(!m.names);
            m.save((error, m) => {
                assert.ifError(error);
                Model.collection.findOne({ _id: m._id }, (error, doc) => {
                    assert.ifError(error);
                    assert.ok(!("names" in doc));
                    done();
                });
            });
        });

        it("validation works when setting array index (gh-3816)", (done) => {
            const mySchema = new mongoose.Schema({
                items: [
                    { month: Number, date: Date }
                ]
            });

            const Test = db.model("test", mySchema);

            const a = [
                { month: 0, date: new Date() },
                { month: 1, date: new Date() }
            ];
            Test.create({ items: a }, (error, doc) => {
                assert.ifError(error);
                Test.findById(doc._id).exec((error, doc) => {
                    assert.ifError(error);
                    assert.ok(doc);
                    doc.items[0] = {
                        month: 5,
                        date: new Date()
                    };
                    doc.markModified("items");
                    doc.save((error) => {
                        assert.ifError(error);
                        done();
                    });
                });
            });
        });

        it("validateSync works when setting array index nested (gh-5389)", (done) => {
            const childSchema = new mongoose.Schema({
                _id: false,
                name: String,
                age: Number
            });

            const schema = new mongoose.Schema({
                name: String,
                children: [childSchema]
            });

            const Model = db.model("gh5389", schema);

            Model.
                create({
                    name: "test",
                    children: [
                        { name: "test-child", age: 24 }
                    ]
                }).
                then((doc) => {
                    return Model.findById(doc._id);
                }).
                then((doc) => {
                    doc.children[0] = { name: "updated-child", age: 53 };
                    const errors = doc.validateSync();
                    assert.ok(!errors);
                    done();
                }).
                catch(done);
        });

        it("single embedded with defaults have $parent (gh-4115)", (done) => {
            const ChildSchema = new Schema({
                name: {
                    type: String,
                    default: "child"
                }
            });

            const ParentSchema = new Schema({
                child: {
                    type: ChildSchema,
                    default: {}
                }
            });

            const Parent = db.model("gh4115", ParentSchema);

            const p = new Parent();
            assert.equal(p.child.$parent, p);
            done();
        });

        it("removing parent doc calls remove hooks on subdocs (gh-2348) (gh-4566)", (done) => {
            const ChildSchema = new Schema({
                name: String
            });

            const called = {};
            ChildSchema.pre("remove", function (next) {
                called[this.name] = true;
                next();
            });

            const ParentSchema = new Schema({
                children: [ChildSchema],
                child: ChildSchema
            });

            const Parent = db.model("gh2348", ParentSchema);

            const doc = {
                children: [{ name: "Jacen" }, { name: "Jaina" }],
                child: { name: "Anakin" }
            };
            Parent.create(doc, (error, doc) => {
                assert.ifError(error);
                doc.remove((error, doc) => {
                    assert.ifError(error);
                    assert.deepEqual(called, {
                        Jacen: true,
                        Jaina: true,
                        Anakin: true
                    });
                    const arr = doc.children.toObject().map((v) => {
                        return v.name;
                    });
                    assert.deepEqual(arr, ["Jacen", "Jaina"]);
                    assert.equal(doc.child.name, "Anakin");
                    done();
                });
            });
        });

        it("strings of length 12 are valid oids (gh-3365)", (done) => {
            const schema = new Schema({ myId: mongoose.Schema.Types.ObjectId });
            const M = db.model("gh3365", schema);
            const doc = new M({ myId: "blablablabla" });
            doc.validate((error) => {
                assert.ifError(error);
                done();
            });
        });

        it("set() empty obj unmodifies subpaths (gh-4182)", (done) => {
            const omeletteSchema = new Schema({
                topping: {
                    meat: {
                        type: String,
                        enum: ["bacon", "sausage"]
                    },
                    cheese: Boolean
                }
            });
            const Omelette = db.model("gh4182", omeletteSchema);
            const doc = new Omelette({
                topping: {
                    meat: "bacon",
                    cheese: true
                }
            });
            doc.topping = {};
            doc.save((error) => {
                assert.ifError(error);
                assert.strictEqual(doc.topping.meat, void 0);
                done();
            });
        });

        it("emits cb errors on model for save (gh-3499)", (done) => {
            const testSchema = new Schema({ name: String });

            const Test = db.model("gh3499", testSchema);

            Test.on("error", (error) => {
                assert.equal(error.message, "fail!");
                done();
            });

            new Test({}).save(() => {
                throw new Error("fail!");
            });
        });

        it("emits cb errors on model for save with hooks (gh-3499)", (done) => {
            const testSchema = new Schema({ name: String });

            testSchema.pre("save", (next) => {
                next();
            });

            testSchema.post("save", (doc, next) => {
                next();
            });

            const Test = db.model("gh3499_0", testSchema);

            Test.on("error", (error) => {
                assert.equal(error.message, "fail!");
                done();
            });

            new Test({}).save(() => {
                throw new Error("fail!");
            });
        });

        it("emits cb errors on model for find() (gh-3499)", (done) => {
            const testSchema = new Schema({ name: String });

            const Test = db.model("gh3499_1", testSchema);

            Test.on("error", (error) => {
                assert.equal(error.message, "fail!");
                done();
            });

            Test.find({}, () => {
                throw new Error("fail!");
            });
        });

        it("emits cb errors on model for find() + hooks (gh-3499)", (done) => {
            const testSchema = new Schema({ name: String });

            testSchema.post("find", (results, next) => {
                assert.equal(results.length, 0);
                next();
            });

            const Test = db.model("gh3499_2", testSchema);

            Test.on("error", (error) => {
                assert.equal(error.message, "fail!");
                done();
            });

            Test.find({}, () => {
                throw new Error("fail!");
            });
        });

        it("clears subpaths when removing single nested (gh-4216)", (done) => {
            const RecurrenceSchema = new Schema({
                frequency: Number,
                interval: {
                    type: String,
                    enum: ["days", "weeks", "months", "years"]
                }
            }, { _id: false });

            const EventSchema = new Schema({
                name: {
                    type: String,
                    trim: true
                },
                recurrence: RecurrenceSchema
            });

            const Event = db.model("gh4216", EventSchema);
            const ev = new Event({
                name: "test",
                recurrence: { frequency: 2, interval: "days" }
            });
            ev.recurrence = null;
            ev.save((error) => {
                assert.ifError(error);
                done();
            });
        });

        it("using validator.isEmail as a validator (gh-4064) (gh-4084)", (done) => {
            const schema = new Schema({
                email: { type: String, validate: validator.isEmail }
            });

            const MyModel = db.model("gh4064", schema);

            MyModel.create({ email: "invalid" }, (error) => {
                assert.ok(error);
                assert.ok(error.errors.email);
                done();
            });
        });

        it("setting path to empty object works (gh-4218)", (done) => {
            const schema = new Schema({
                object: {
                    nested: {
                        field1: { type: Number, default: 1 }
                    }
                }
            });

            const MyModel = db.model("gh4218", schema);

            MyModel.create({}, (error, doc) => {
                doc.object.nested = {};
                doc.save((error, doc) => {
                    assert.ifError(error);
                    MyModel.collection.findOne({ _id: doc._id }, (error, doc) => {
                        assert.ifError(error);
                        assert.deepEqual(doc.object.nested, {});
                        done();
                    });
                });
            });
        });

        it("minimize + empty object (gh-4337)", (done) => {
            let SomeModel;
            let SomeModelSchema;

            SomeModelSchema = new mongoose.Schema({}, {
                minimize: false
            });

            SomeModel = mongoose.model("somemodel", SomeModelSchema);

            try {
                new SomeModel({});
            } catch (error) {
                assert.ifError(error);
            }
            done();
        });

        it("doesnt markModified child paths if parent is modified (gh-4224)", (done) => {
            const childSchema = new Schema({
                name: String
            });
            const parentSchema = new Schema({
                child: childSchema
            });

            const Parent = db.model("gh4224", parentSchema);
            Parent.create({ child: { name: "Jacen" } }, (error, doc) => {
                assert.ifError(error);
                doc.child = { name: "Jaina" };
                doc.child.name = "Anakin";
                assert.deepEqual(doc.modifiedPaths(), ["child"]);
                assert.ok(doc.isModified("child.name"));
                done();
            });
        });

        it("single nested isNew (gh-4369)", (done) => {
            const childSchema = new Schema({
                name: String
            });
            const parentSchema = new Schema({
                child: childSchema
            });

            const Parent = db.model("gh4369", parentSchema);
            let remaining = 2;

            const doc = new Parent({ child: { name: "Jacen" } });
            doc.child.on("isNew", (val) => {
                assert.ok(!val);
                assert.ok(!doc.child.isNew);
                --remaining || done();
            });

            doc.save((error, doc) => {
                assert.ifError(error);
                assert.ok(!doc.child.isNew);
                --remaining || done();
            });
        });

        it("deep default array values (gh-4540)", (done) => {
            const schema = new Schema({
                arr: [{
                    test: {
                        type: Array,
                        default: ["test"]
                    }
                }]
            });
            assert.doesNotThrow(() => {
                db.model("gh4540", schema);
            });
            done();
        });

        it("default values with subdoc array (gh-4390)", (done) => {
            const childSchema = new Schema({
                name: String
            });
            const parentSchema = new Schema({
                child: [childSchema]
            });

            parentSchema.path("child").default([{ name: "test" }]);

            const Parent = db.model("gh4390", parentSchema);

            Parent.create({}, (error, doc) => {
                assert.ifError(error);
                const arr = doc.toObject().child.map((doc) => {
                    assert.ok(doc._id);
                    delete doc._id;
                    return doc;
                });
                assert.deepEqual(arr, [{ name: "test" }]);
                done();
            });
        });

        it("handles invalid dates (gh-4404)", (done) => {
            const testSchema = new Schema({
                date: Date
            });

            const Test = db.model("gh4404", testSchema);

            Test.create({ date: new Date("invalid date") }, (error) => {
                assert.ok(error);
                assert.equal(error.errors.date.name, "CastError");
                done();
            });
        });

        it("setting array subpath (gh-4472)", (done) => {
            const ChildSchema = new mongoose.Schema({
                name: String,
                age: Number
            }, { _id: false });

            const ParentSchema = new mongoose.Schema({
                data: {
                    children: [ChildSchema]
                }
            });

            const Parent = db.model("gh4472", ParentSchema);

            const p = new Parent();
            p.set("data.children.0", {
                name: "Bob",
                age: 900
            });

            assert.deepEqual(p.toObject().data.children, [{ name: "Bob", age: 900 }]);
            done();
        });

        it("ignore paths (gh-4480)", (done) => {
            const TestSchema = new Schema({
                name: { type: String, required: true }
            });

            const Test = db.model("gh4480", TestSchema);

            Test.create({ name: "val" }, (error) => {
                assert.ifError(error);
                Test.findOne((error, doc) => {
                    assert.ifError(error);
                    doc.name = null;
                    doc.$ignore("name");
                    doc.save((error) => {
                        assert.ifError(error);
                        Test.findById(doc._id, (error, doc) => {
                            assert.ifError(error);
                            assert.equal(doc.name, "val");
                            done();
                        });
                    });
                });
            });
        });

        it("composite _ids (gh-4542)", (done) => {
            const schema = new Schema({
                _id: {
                    key1: String,
                    key2: String
                },
                content: String
            }, { retainKeyOrder: true });

            const Model = db.model("gh4542", schema);

            const object = new Model();
            object._id = { key1: "foo", key2: "bar" };
            object.save().
                then((obj) => {
                    obj.content = "Hello";
                    return obj.save();
                }).
                then((obj) => {
                    return Model.findOne({ _id: obj._id });
                }).
                then((obj) => {
                    assert.equal(obj.content, "Hello");
                    done();
                }).
                catch(done);
        });

        it("validateSync with undefined and conditional required (gh-4607)", (done) => {
            const schema = new mongoose.Schema({
                type: mongoose.SchemaTypes.Number,
                conditional: {
                    type: mongoose.SchemaTypes.String,
                    required() {
                        return this.type === 1;
                    },
                    maxlength: 128
                }
            });

            const Model = db.model("gh4607", schema);

            assert.doesNotThrow(() => {
                new Model({
                    type: 2,
                    conditional: void 0
                }).validateSync();
            });

            done();
        });

        it("conditional required on single nested (gh-4663)", (done) => {
            let called = 0;
            const childSchema = new Schema({
                name: String
            });
            const schema = new Schema({
                child: {
                    type: childSchema,
                    required() {
                        assert.equal(this.child.name, "test");
                        ++called;
                    }
                }
            });

            const M = db.model("gh4663", schema);

            new M({ child: { name: "test" } }).validateSync();
            done();
        });

        it("setting full path under single nested schema works (gh-4578) (gh-4528)", (done) => {
            const ChildSchema = new mongoose.Schema({
                age: Number
            });

            const ParentSchema = new mongoose.Schema({
                age: Number,
                family: {
                    child: ChildSchema
                }
            });

            const M = db.model("gh4578", ParentSchema);

            M.create({ age: 45 }, (error, doc) => {
                assert.ifError(error);
                assert.ok(!doc.family.child);
                doc.set("family.child.age", 15);
                assert.ok(doc.family.child.schema);
                assert.ok(doc.isModified("family.child"));
                assert.ok(doc.isModified("family.child.age"));
                assert.equal(doc.family.child.toObject().age, 15);
                done();
            });
        });

        it("setting a nested path retains nested modified paths (gh-5206)", (done) => {
            const testSchema = new mongoose.Schema({
                name: String,
                surnames: {
                    docarray: [{ name: String }]
                }
            });

            const Cat = db.model("gh5206", testSchema);

            const kitty = new Cat({
                name: "Test",
                surnames: {
                    docarray: [{ name: "test1" }, { name: "test2" }]
                }
            });

            kitty.save((error) => {
                assert.ifError(error);

                kitty.surnames = {
                    docarray: [{ name: "test1" }, { name: "test2" }, { name: "test3" }]
                };

                assert.deepEqual(kitty.modifiedPaths(), ["surnames", "surnames.docarray"]);
                done();
            });
        });

        it("toObject() does not depopulate top level (gh-3057)", (done) => {
            const Cat = db.model("gh3057", { name: String });
            const Human = db.model("gh3057_0", {
                name: String,
                petCat: { type: mongoose.Schema.Types.ObjectId, ref: "gh3057" }
            });

            const kitty = new Cat({ name: "Zildjian" });
            const person = new Human({ name: "Val", petCat: kitty });

            assert.equal(kitty.toObject({ depopulate: true }).name, "Zildjian");
            assert.ok(!person.toObject({ depopulate: true }).petCat.name);
            done();
        });

        it("single nested doc conditional required (gh-4654)", (done) => {
            const ProfileSchema = new Schema({
                firstName: String,
                lastName: String
            });

            function validator() {
                assert.equal(this.email, "test");
                return true;
            }

            const UserSchema = new Schema({
                email: String,
                profile: {
                    type: ProfileSchema,
                    required: [validator, "profile required"]
                }
            });

            const User = db.model("gh4654", UserSchema);
            User.create({ email: "test" }, (error) => {
                assert.equal(error.errors.profile.message, "profile required");
                done();
            });
        });

        it("handles setting single nested schema to equal value (gh-4676)", (done) => {
            const companySchema = new mongoose.Schema({
                _id: false,
                name: String,
                description: String
            });

            const userSchema = new mongoose.Schema({
                name: String,
                company: companySchema
            });

            const User = db.model("gh4676", userSchema);

            const user = new User({ company: { name: "Test" } });
            user.save((error) => {
                assert.ifError(error);
                user.company.description = "test";
                assert.ok(user.isModified("company"));
                user.company = user.company;
                assert.ok(user.isModified("company"));
                done();
            });
        });

        it("handles setting single nested doc to null after setting (gh-4766)", (done) => {
            const EntitySchema = new Schema({
                company: {
                    type: String,
                    required: true
                },
                name: {
                    type: String,
                    required: false
                },
                email: {
                    type: String,
                    required: false
                }
            }, { _id: false, id: false });

            const ShipmentSchema = new Schema({
                entity: {
                    shipper: {
                        type: EntitySchema,
                        required: false
                    },
                    manufacturer: {
                        type: EntitySchema,
                        required: false
                    }
                }
            });

            const Shipment = db.model("gh4766", ShipmentSchema);
            const doc = new Shipment({
                entity: {
                    shipper: null,
                    manufacturer: {
                        company: "test",
                        name: "test",
                        email: "test@email"
                    }
                }
            });

            doc.save().
                then(() => {
                    return Shipment.findById(doc._id);
                }).
                then((shipment) => {
                    shipment.entity = shipment.entity;
                    shipment.entity.manufacturer = null;
                    return shipment.save();
                }).
                then(() => {
                    done();
                }).
                catch(done);
        });

        it("buffers with subtypes as ids (gh-4506)", (done) => {
            const uuid = require("uuid");

            const UserSchema = new mongoose.Schema({
                _id: {
                    type: Buffer,
                    default() {
                        return mongoose.Types.Buffer(uuid.parse(uuid.v4())).toObject(4);
                    },
                    unique: true,
                    required: true
                },
                email: {
                    type: String,
                    unique: true,
                    lowercase: true,
                    required: true
                },
                name: String
            });

            const User = db.model("gh4506", UserSchema);

            const user = new User({
                email: "me@email.com",
                name: "My name"
            });

            user.save().
                then(() => {
                    return User.findOne({ email: "me@email.com" });
                }).
                then((user) => {
                    user.name = "other";
                    return user.save();
                }).
                then(() => {
                    return User.findOne({ email: "me@email.com" });
                }).
                then((doc) => {
                    assert.equal(doc.name, "other");
                    done();
                }).
                catch(done);
        });

        it("embedded docs dont mark parent as invalid (gh-4681)", (done) => {
            const NestedSchema = new mongoose.Schema({
                nestedName: { type: String, required: true },
                createdAt: { type: Date, required: true }
            });
            const RootSchema = new mongoose.Schema({
                rootName: String,
                nested: { type: [NestedSchema] }
            });

            const Root = db.model("gh4681", RootSchema);
            const root = new Root({ rootName: "root", nested: [{}] });
            root.save((error) => {
                assert.ok(error);
                assert.deepEqual(Object.keys(error.errors).sort(),
                    ["nested.0.createdAt", "nested.0.nestedName"]);
                done();
            });
        });

        it("should depopulate the shard key when saving (gh-4658)", (done) => {
            const ChildSchema = new mongoose.Schema({
                name: String
            });

            const ChildModel = db.model("gh4658", ChildSchema);

            const ParentSchema = new mongoose.Schema({
                name: String,
                child: { type: Schema.Types.ObjectId, ref: "gh4658" }
            }, { shardKey: { child: 1, _id: 1 } });

            const ParentModel = db.model("gh4658_0", ParentSchema);

            ChildModel.create({ name: "Luke" }).
                then((child) => {
                    const p = new ParentModel({ name: "Vader" });
                    p.child = child;
                    return p.save();
                }).
                then((p) => {
                    p.name = "Anakin";
                    return p.save();
                }).
                then((p) => {
                    return ParentModel.findById(p);
                }).
                then((doc) => {
                    assert.equal(doc.name, "Anakin");
                    done();
                }).
                catch(done);
        });

        it("handles setting virtual subpaths (gh-4716)", (done) => {
            const childSchema = new Schema({
                name: { type: String, default: "John" },
                favorites: {
                    color: {
                        type: String,
                        default: "Blue"
                    }
                }
            });

            const parentSchema = new Schema({
                name: { type: String },
                children: {
                    type: [childSchema],
                    default: [{}]
                }
            });

            parentSchema.virtual("favorites").set(function (v) {
                return this.children[0].set("favorites", v);
            }).get(function () {
                return this.children[0].get("favorites");
            });

            const Parent = db.model("gh4716", parentSchema);
            const p = new Parent({ name: "Anakin" });
            p.set("children.0.name", "Leah");
            p.set("favorites.color", "Red");
            assert.equal(p.children[0].favorites.color, "Red");
            done();
        });

        it("handles selected nested elements with defaults (gh-4739)", (done) => {
            const userSchema = new Schema({
                preferences: {
                    sleep: { type: Boolean, default: false },
                    test: { type: Boolean, default: true }
                },
                name: String
            });

            const User = db.model("User", userSchema);

            const user = { name: "test" };
            User.collection.insertOne(user, (error) => {
                assert.ifError(error);
                User.findById(user, { "preferences.sleep": 1, name: 1 }, (error, user) => {
                    assert.ifError(error);
                    assert.strictEqual(user.preferences.sleep, false);
                    assert.ok(!user.preferences.test);
                    done();
                });
            });
        });

        it("handles mark valid in subdocs correctly (gh-4778)", (done) => {
            const SubSchema = new mongoose.Schema({
                field: {
                    nestedField: {
                        type: mongoose.Schema.ObjectId,
                        required: false
                    }
                }
            }, { _id: false, id: false });

            const Model2Schema = new mongoose.Schema({
                sub: {
                    type: SubSchema,
                    required: false
                }
            });
            const Model2 = db.model("gh4778", Model2Schema);

            const doc = new Model2({
                sub: {}
            });

            doc.sub.field.nestedField = {};
            doc.sub.field.nestedField = "574b69d0d9daf106aaa62974";
            assert.ok(!doc.validateSync());
            done();
        });

        it("timestamps with nested paths (gh-5051)", (done) => {
            const schema = new Schema({ props: Object }, {
                timestamps: {
                    createdAt: "props.createdAt",
                    updatedAt: "props.updatedAt"
                }
            });

            const M = db.model("gh5051", schema);
            const now = Date.now();
            M.create({}, (error, doc) => {
                assert.ok(doc.props.createdAt);
                assert.ok(doc.props.createdAt instanceof Date);
                assert.ok(doc.props.createdAt.valueOf() >= now);
                assert.ok(doc.props.updatedAt);
                assert.ok(doc.props.updatedAt instanceof Date);
                assert.ok(doc.props.updatedAt.valueOf() >= now);
                done();
            });
        });

        it("supports $where in pre save hook (gh-4004)", (done) => {
            const Promise = global.Promise;

            const schema = new Schema({
                name: String
            }, { timestamps: true, versionKey: null, saveErrorIfNotFound: true });

            schema.pre("save", function (next) {
                this.$where = { updatedAt: this.updatedAt };
                next();
            });

            schema.post("save", (error, res, next) => {
                if (error instanceof MongooseError.DocumentNotFoundError) {
                    error = new Error("Somebody else updated the document!");
                }
                next(error);
            });

            const MyModel = db.model("gh4004", schema);

            MyModel.create({ name: "test" }).
                then(() => {
                    return Promise.all([
                        MyModel.findOne(),
                        MyModel.findOne()
                    ]);
                }).
                then((docs) => {
                    docs[0].name = "test2";
                    return Promise.all([
                        docs[0].save(),
                        Promise.resolve(docs[1])
                    ]);
                }).
                then((docs) => {
                    docs[1].name = "test3";
                    return docs[1].save();
                }).
                then(() => {
                    done(new Error("Should not get here"));
                }).
                catch((error) => {
                    assert.equal(error.message, "Somebody else updated the document!");
                    done();
                });
        });

        it("toObject() with buffer and minimize (gh-4800)", (done) => {
            const TestSchema = new mongoose.Schema({ buf: Buffer }, {
                toObject: {
                    virtuals: true,
                    getters: true
                }
            });

            const Test = db.model("gh4800", TestSchema);

            Test.create({ buf: new Buffer("abcd") }).
                then((doc) => {
                    return Test.findById(doc._id);
                }).
                then((doc) => {
                    // Should not throw
                    require("util").inspect(doc);
                    done();
                }).
                catch(done);
        });

        it("buffer subtype prop (gh-5530)", (done) => {
            const TestSchema = new mongoose.Schema({
                uuid: {
                    type: Buffer,
                    subtype: 4
                }
            });

            const Test = db.model("gh5530", TestSchema);

            const doc = new Test({ uuid: "test1" });
            assert.equal(doc.uuid._subtype, 4);
            done();
        });

        it("runs validate hooks on single nested subdocs if not directly modified (gh-3884)", (done) => {
            const childSchema = new Schema({
                name: { type: String },
                friends: [{ type: String }]
            });
            let count = 0;

            childSchema.pre("validate", (next) => {
                ++count;
                next();
            });

            const parentSchema = new Schema({
                name: { type: String },
                child: childSchema
            });

            const Parent = db.model("gh3884", parentSchema);

            const p = new Parent({
                name: "Mufasa",
                child: {
                    name: "Simba",
                    friends: ["Pumbaa", "Timon", "Nala"]
                }
            });

            p.save().
                then((p) => {
                    assert.equal(count, 1);
                    p.child.friends.push("Rafiki");
                    return p.save();
                }).
                then(() => {
                    assert.equal(count, 2);
                    done();
                }).
                catch(done);
        });

        it("runs validate hooks on arrays subdocs if not directly modified (gh-5861)", (done) => {
            const childSchema = new Schema({
                name: { type: String },
                friends: [{ type: String }]
            });
            let count = 0;

            childSchema.pre("validate", (next) => {
                ++count;
                next();
            });

            const parentSchema = new Schema({
                name: { type: String },
                children: [childSchema]
            });

            const Parent = db.model("gh5861", parentSchema);

            const p = new Parent({
                name: "Mufasa",
                children: [{
                    name: "Simba",
                    friends: ["Pumbaa", "Timon", "Nala"]
                }]
            });

            p.save().then((p) => {
                assert.equal(count, 1);
                p.children[0].friends.push("Rafiki");
                return p.save();
            }).then(() => {
                assert.equal(count, 2);
                done();
            }).catch(done);
        });

        it("does not overwrite when setting nested (gh-4793)", (done) => {
            const grandchildSchema = new mongoose.Schema();
            grandchildSchema.method({
                foo() {
                    return "bar";
                }
            });
            const Grandchild = db.model("gh4793_0", grandchildSchema);

            const childSchema = new mongoose.Schema({
                grandchild: grandchildSchema
            });
            const Child = mongoose.model("gh4793_1", childSchema);

            const parentSchema = new mongoose.Schema({
                children: [childSchema]
            });
            const Parent = mongoose.model("gh4793_2", parentSchema);

            const grandchild = new Grandchild();
            const child = new Child({ grandchild });

            assert.equal(child.grandchild.foo(), "bar");

            const p = new Parent({ children: [child] });

            assert.equal(child.grandchild.foo(), "bar");
            assert.equal(p.children[0].grandchild.foo(), "bar");
            done();
        });

        it("setting to discriminator (gh-4935)", (done) => {
            const Buyer = db.model("gh4935_0", new Schema({
                name: String,
                vehicle: { type: Schema.Types.ObjectId, ref: "gh4935" }
            }));
            const Vehicle = db.model("gh4935", new Schema({ name: String }));
            const Car = Vehicle.discriminator("gh4935_1", new Schema({
                model: String
            }));

            const eleanor = new Car({ name: "Eleanor", model: "Shelby Mustang GT" });
            const nick = new Buyer({ name: "Nicolas", vehicle: eleanor });

            assert.ok(Boolean(nick.vehicle));
            assert.ok(nick.vehicle === eleanor);
            assert.ok(nick.vehicle instanceof Car);
            assert.equal(nick.vehicle.name, "Eleanor");

            done();
        });

        it("handles errors in sync validators (gh-2185)", (done) => {
            const schema = new Schema({
                name: {
                    type: String,
                    validate() {
                        throw new Error("woops!");
                    }
                }
            });

            const M = db.model("gh2185", schema);

            const error = (new M({ name: "test" })).validateSync();
            assert.ok(error);
            assert.equal(error.errors.name.reason.message, "woops!");

            new M({ name: "test" }).validate((error) => {
                assert.ok(error);
                assert.equal(error.errors.name.reason.message, "woops!");
                done();
            });
        });

        it("allows hook as a schema key (gh-5047)", (done) => {
            const schema = new mongoose.Schema({
                name: String,
                hook: { type: String }
            });

            const Model = db.model("Model", schema);

            Model.create({ hook: "test " }, (error) => {
                assert.ifError(error);
                done();
            });
        });

        it("save errors with callback and promise work (gh-5216)", (done) => {
            const schema = new mongoose.Schema({});

            const Model = db.model("gh5216", schema);

            const _id = new mongoose.Types.ObjectId();
            const doc1 = new Model({ _id });
            const doc2 = new Model({ _id });

            Model.on("error", (error) => {
                done(error);
            });

            doc1.save().
                then(() => {
                    return doc2.save(() => { });
                }).
                catch((error) => {
                    assert.ok(error);
                    done();
                });
        });

        it("post hooks on child subdocs run after save (gh-5085)", (done) => {
            const ChildModelSchema = new mongoose.Schema({
                text: {
                    type: String
                }
            });
            ChildModelSchema.post("save", (doc) => {
                doc.text = "bar";
            });
            const ParentModelSchema = new mongoose.Schema({
                children: [ChildModelSchema]
            });

            const Model = db.model("gh5085", ParentModelSchema);

            Model.create({ children: [{ text: "test" }] }, (error) => {
                assert.ifError(error);
                Model.findOne({}, (error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc.children.length, 1);
                    assert.equal(doc.children[0].text, "test");
                    done();
                });
            });
        });

        it("nested docs toObject() clones (gh-5008)", (done) => {
            const schema = new mongoose.Schema({
                sub: {
                    height: Number
                }
            });

            const Model = db.model("gh5008", schema);

            const doc = new Model({
                sub: {
                    height: 3
                }
            });

            assert.equal(doc.sub.height, 3);

            const leanDoc = doc.sub.toObject();
            assert.equal(leanDoc.height, 3);

            doc.sub.height = 55;
            assert.equal(doc.sub.height, 55);
            assert.equal(leanDoc.height, 3);

            done();
        });

        it("toObject() with null (gh-5143)", (done) => {
            const schema = new mongoose.Schema({
                customer: {
                    name: { type: String, required: false }
                }
            });

            const Model = db.model("gh5143", schema);

            const model = new Model();
            model.customer = null;
            assert.strictEqual(model.toObject().customer, null);
            assert.strictEqual(model.toObject({ getters: true }).customer, null);

            done();
        });

        it("handles array subdocs with single nested subdoc default (gh-5162)", (done) => {
            const RatingsItemSchema = new mongoose.Schema({
                value: Number
            }, { versionKey: false, _id: false });

            const RatingsSchema = new mongoose.Schema({
                ratings: {
                    type: RatingsItemSchema,
                    default: { id: 1, value: 0 }
                },
                _id: false
            });

            const RestaurantSchema = new mongoose.Schema({
                menu: {
                    type: [RatingsSchema]
                }
            });

            const Restaurant = db.model("gh5162", RestaurantSchema);

            // Should not throw
            const r = new Restaurant();
            assert.deepEqual(r.toObject().menu, []);
            done();
        });

        it("iterating through nested doc keys (gh-5078)", (done) => {
            const schema = new Schema({
                nested: {
                    test1: String,
                    test2: String
                }
            }, { retainKeyOrder: true });

            schema.virtual("tests").get(function () {
                return _.map(this.nested, (v) => {
                    return v;
                });
            });

            const M = db.model("gh5078", schema);

            const doc = new M({ nested: { test1: "a", test2: "b" } });

            assert.deepEqual(doc.toObject({ virtuals: true }).tests, ["a", "b"]);

            // Should not throw
            require("util").inspect(doc);
            JSON.stringify(doc);

            done();
        });

        it("deeply nested virtual paths (gh-5250)", (done) => {
            const TestSchema = new Schema({});
            TestSchema.
                virtual("a.b.c").
                get(function () {
                    return this.v;
                }).
                set(function (value) {
                    this.v = value;
                });

            const TestModel = db.model("gh5250", TestSchema);
            const t = new TestModel({ "a.b.c": 5 });
            assert.equal(t.a.b.c, 5);

            done();
        });

        it("JSON.stringify nested errors (gh-5208)", (done) => {
            const AdditionalContactSchema = new Schema({
                contactName: {
                    type: String,
                    required: true
                },
                contactValue: {
                    type: String,
                    required: true
                }
            });

            const ContactSchema = new Schema({
                name: {
                    type: String,
                    required: true
                },
                email: {
                    type: String,
                    required: true
                },
                additionalContacts: [AdditionalContactSchema]
            });

            const EmergencyContactSchema = new Schema({
                contactName: {
                    type: String,
                    required: true
                },
                contact: ContactSchema
            });

            const EmergencyContact =
                db.model("EmergencyContact", EmergencyContactSchema);

            const contact = new EmergencyContact({
                contactName: "Electrical Service",
                contact: {
                    name: "John Smith",
                    email: "john@gmail.com",
                    additionalContacts: [
                        {
                            contactName: "skype"
                            // Forgotten value
                        }
                    ]
                }
            });
            contact.validate((error) => {
                assert.ok(error);
                assert.ok(error.errors.contact);
                assert.ok(error.errors["contact.additionalContacts.0.contactValue"]);

                // This `JSON.stringify()` should not throw
                assert.ok(JSON.stringify(error).indexOf("contactValue") !== -1);
                done();
            });
        });

        it("handles errors in subdoc pre validate (gh-5215)", (done) => {
            const childSchema = new mongoose.Schema({});

            childSchema.pre("validate", (next) => {
                next(new Error("child pre validate"));
            });

            const parentSchema = new mongoose.Schema({
                child: childSchema
            });

            const Parent = db.model("gh5215", parentSchema);

            Parent.create({ child: {} }, (error) => {
                assert.ok(error);
                assert.ok(error.errors.child);
                assert.equal(error.errors.child.message, "child pre validate");
                done();
            });
        });

        it("custom error types (gh-4009)", (done) => {
            const CustomError = function () { };

            const testSchema = new mongoose.Schema({
                num: {
                    type: Number,
                    required: {
                        ErrorConstructor: CustomError
                    },
                    min: 5
                }
            });

            const Test = db.model("gh4009", testSchema);

            Test.create({}, (error) => {
                assert.ok(error);
                assert.ok(error.errors.num);
                assert.ok(error.errors.num instanceof CustomError);
                Test.create({ num: 1 }, (error) => {
                    assert.ok(error);
                    assert.ok(error.errors.num);
                    assert.ok(error.errors.num.constructor.name, "ValidatorError");
                    assert.ok(!(error.errors.num instanceof CustomError));
                    done();
                });
            });
        });

        it("saving a doc with nested string array (gh-5282)", (done) => {
            const testSchema = new mongoose.Schema({
                strs: [[String]]
            });

            const Test = db.model("gh5282", testSchema);

            const t = new Test({
                strs: [["a", "b"]]
            });

            t.save((error, t) => {
                assert.ifError(error);
                assert.deepEqual(t.toObject().strs, [["a", "b"]]);
                done();
            });
        });

        it("null _id (gh-5236)", (done) => {
            const childSchema = new mongoose.Schema({});

            const M = db.model("gh5236", childSchema);

            const m = new M({ _id: null });
            m.save((error, doc) => {
                assert.equal(doc._id, null);
                done();
            });
        });

        it("setting populated path with typeKey (gh-5313)", (done) => {
            const personSchema = new Schema({
                name: { $type: String },
                favorite: { $type: Schema.Types.ObjectId, ref: "gh5313" },
                books: [{ $type: Schema.Types.ObjectId, ref: "gh5313" }]
            }, { typeKey: "$type" });

            const bookSchema = new Schema({
                title: String
            });

            const Book = mongoose.model("gh5313", bookSchema);
            const Person = mongoose.model("gh5313_0", personSchema);

            const book1 = new Book({ title: "The Jungle Book" });
            const book2 = new Book({ title: "1984" });

            const person = new Person({
                name: "Bob",
                favorite: book1,
                books: [book1, book2]
            });

            assert.equal(person.books[0].title, "The Jungle Book");
            assert.equal(person.books[1].title, "1984");

            done();
        });

        it("save twice with write concern (gh-5294)", (done) => {
            const schema = new mongoose.Schema({
                name: String
            }, {
                    safe: {
                        w: "majority",
                        wtimeout: 1e4
                    }
                });

            const M = db.model("gh5294", schema);

            M.create({ name: "Test" }, (error, doc) => {
                assert.ifError(error);
                doc.name = "test2";
                doc.save((error) => {
                    assert.ifError(error);
                    done();
                });
            });
        });

        it("undefined field with conditional required (gh-5296)", (done) => {
            const schema = new Schema({
                name: {
                    type: String,
                    maxlength: 63,
                    required() {
                        return false;
                    }
                }
            });

            const Model = db.model("gh5296", schema);

            Model.create({ name: undefined }, (error) => {
                assert.ifError(error);
                done();
            });
        });

        it("dotted virtuals in toObject (gh-5473)", (done) => {
            const schema = new mongoose.Schema({}, {
                toObject: { virtuals: true },
                toJSON: { virtuals: true }
            });
            schema.virtual("test.a").get(() => {
                return 1;
            });
            schema.virtual("test.b").get(() => {
                return 2;
            });

            const Model = mongoose.model("gh5473", schema);

            const m = new Model({});
            assert.deepEqual(m.toJSON().test, {
                a: 1,
                b: 2
            });
            assert.deepEqual(m.toObject().test, {
                a: 1,
                b: 2
            });
            assert.equal(m.toObject({ virtuals: false }).test, void 0);
            done();
        });

        it("dotted virtuals in toObject (gh-5506)", (done) => {
            const childSchema = new Schema({
                name: String,
                _id: false
            });
            const parentSchema = new Schema({
                child: {
                    type: childSchema,
                    default: {}
                }
            });

            const Parent = db.model("gh5506", parentSchema);

            const p = new Parent({ child: { name: "myName" } });

            p.save().
                then(() => {
                    return Parent.findOne();
                }).
                then((doc) => {
                    doc.child = {};
                    return doc.save();
                }).
                then(() => {
                    return Parent.findOne();
                }).
                then((doc) => {
                    assert.deepEqual(doc.toObject().child, {});
                    done();
                }).
                catch(done);
        });

        it("parent props not in child (gh-5470)", (done) => {
            const employeeSchema = new mongoose.Schema({
                name: {
                    first: String,
                    last: String
                },
                department: String
            });
            const Employee = mongoose.model("Test", employeeSchema);

            const employee = new Employee({
                name: {
                    first: "Ron",
                    last: "Swanson"
                },
                department: "Parks and Recreation"
            });
            const ownPropertyNames = Object.getOwnPropertyNames(employee.name);

            assert.ok(ownPropertyNames.indexOf("department") === -1, ownPropertyNames.join(","));
            assert.ok(ownPropertyNames.indexOf("first") !== -1, ownPropertyNames.join(","));
            assert.ok(ownPropertyNames.indexOf("last") !== -1, ownPropertyNames.join(","));
            done();
        });

        it("modifying array with existing ids (gh-5523)", (done) => {
            const friendSchema = new mongoose.Schema(
                {
                    _id: String,
                    name: String,
                    age: Number,
                    dob: Date
                },
                { _id: false });

            const socialSchema = new mongoose.Schema(
                {
                    friends: [friendSchema]
                },
                { _id: false });

            const userSchema = new mongoose.Schema({
                social: {
                    type: socialSchema,
                    required: true
                }
            });

            const User = db.model("gh5523", userSchema);

            const user = new User({
                social: {
                    friends: [
                        { _id: "val", age: 28 }
                    ]
                }
            });

            user.social.friends = [{ _id: "val", name: "Val" }];

            assert.deepEqual(user.toObject().social.friends[0], {
                _id: "val",
                name: "Val"
            });

            user.save((error) => {
                assert.ifError(error);
                User.findOne({ _id: user._id }, (error, doc) => {
                    assert.ifError(error);
                    assert.deepEqual(doc.toObject().social.friends[0], {
                        _id: "val",
                        name: "Val"
                    });
                    done();
                });
            });
        });

        it("consistent setter context for single nested (gh-5363)", (done) => {
            const contentSchema = new Schema({
                blocks: [{ type: String }],
                summary: { type: String }
            });

            // Subdocument setter
            const contexts = [];
            contentSchema.path("blocks").set(function (srcBlocks) {
                if (!this.ownerDocument().isNew) {
                    contexts.push(this.toObject());
                }

                return srcBlocks;
            });

            const noteSchema = new Schema({
                title: { type: String, required: true },
                body: { type: contentSchema }
            });

            const Note = db.model("gh5363", noteSchema);

            const note = new Note({
                title: "Lorem Ipsum Dolor",
                body: {
                    summary: "Summary Test",
                    blocks: ["html"]
                }
            });

            note.save().
                then((note) => {
                    assert.equal(contexts.length, 0);
                    note.set("body", {
                        summary: "New Summary",
                        blocks: ["gallery", "html"]
                    });
                    return note.save();
                }).
                then(() => {
                    assert.equal(contexts.length, 1);
                    assert.deepEqual(contexts[0].blocks, ["html"]);
                    done();
                }).
                catch(done);
        });

        it("deeply nested subdocs and markModified (gh-5406)", (done) => {
            const nestedValueSchema = new mongoose.Schema({
                _id: false,
                value: Number
            });
            const nestedPropertySchema = new mongoose.Schema({
                _id: false,
                active: Boolean,
                nestedValue: nestedValueSchema
            });
            const nestedSchema = new mongoose.Schema({
                _id: false,
                nestedProperty: nestedPropertySchema,
                nestedTwoProperty: nestedPropertySchema
            });
            const optionsSchema = new mongoose.Schema({
                _id: false,
                nestedField: nestedSchema
            });
            const TestSchema = new mongoose.Schema({
                fieldOne: String,
                options: optionsSchema
            });

            const Test = db.model("gh5406", TestSchema);

            const doc = new Test({
                fieldOne: "Test One",
                options: {
                    nestedField: {
                        nestedProperty: {
                            active: true,
                            nestedValue: {
                                value: 42
                            }
                        }
                    }
                }
            });

            doc.
                save().
                then((doc) => {
                    doc.options.nestedField.nestedTwoProperty = {
                        active: true,
                        nestedValue: {
                            value: 1337
                        }
                    };

                    assert.ok(doc.isModified("options"));

                    return doc.save();
                }).
                then((doc) => {
                    return Test.findById(doc._id);
                }).
                then((doc) => {
                    assert.equal(doc.options.nestedField.nestedTwoProperty.nestedValue.value,
                        1337);
                    done();
                }).
                catch(done);
        });

        it("single nested subdoc post remove hooks (gh-5388)", (done) => {
            const contentSchema = new Schema({
                blocks: [{ type: String }],
                summary: { type: String }
            });

            let called = 0;

            contentSchema.post("remove", () => {
                ++called;
            });

            const noteSchema = new Schema({
                body: { type: contentSchema }
            });

            const Note = db.model("gh5388", noteSchema);

            const note = new Note({
                title: "Lorem Ipsum Dolor",
                body: {
                    summary: "Summary Test",
                    blocks: ["html"]
                }
            });

            note.save((error) => {
                assert.ifError(error);
                note.remove((error) => {
                    assert.ifError(error);
                    setTimeout(() => {
                        assert.equal(called, 1);
                        done();
                    }, 50);
                });
            });
        });

        it("push populated doc onto empty array triggers manual population (gh-5504)", (done) => {
            const ReferringSchema = new Schema({
                reference: [{
                    type: Schema.Types.ObjectId,
                    ref: "gh5504"
                }]
            });

            const Referrer = db.model("gh5504", ReferringSchema);

            const referenceA = new Referrer();
            const referenceB = new Referrer();

            const referrerA = new Referrer({ reference: [referenceA] });
            const referrerB = new Referrer();
            const referrerC = new Referrer();
            const referrerD = new Referrer();
            const referrerE = new Referrer();

            referrerA.reference.push(referenceB);
            assert.ok(referrerA.reference[0] instanceof Referrer);
            assert.ok(referrerA.reference[1] instanceof Referrer);

            referrerB.reference.push(referenceB);
            assert.ok(referrerB.reference[0] instanceof Referrer);

            referrerC.reference.unshift(referenceB);
            assert.ok(referrerC.reference[0] instanceof Referrer);

            referrerD.reference.splice(0, 0, referenceB);
            assert.ok(referrerD.reference[0] instanceof Referrer);

            referrerE.reference.addToSet(referenceB);
            assert.ok(referrerE.reference[0] instanceof Referrer);

            done();
        });

        it("single nested conditional required scope (gh-5569)", (done) => {
            const scopes = [];

            const ThingSchema = new mongoose.Schema({
                undefinedDisallowed: {
                    type: String,
                    required() {
                        scopes.push(this);
                        return is.undefined(this.undefinedDisallowed);
                    },
                    default: null
                }
            });

            const SuperDocumentSchema = new mongoose.Schema({
                thing: {
                    type: ThingSchema,
                    default() {
                        return {};
                    }
                }
            });

            const SuperDocument = db.model("gh5569", SuperDocumentSchema);

            let doc = new SuperDocument();
            doc.thing.undefinedDisallowed = null;

            doc.save((error) => {
                assert.ifError(error);
                doc = new SuperDocument();
                doc.thing.undefinedDisallowed = undefined;
                doc.save((error) => {
                    assert.ok(error);
                    assert.ok(error.errors["thing.undefinedDisallowed"]);
                    done();
                });
            });
        });

        it("single nested setters only get called once (gh-5601)", (done) => {
            const vals = [];
            const ChildSchema = new mongoose.Schema({
                number: {
                    type: String,
                    set(v) {
                        vals.push(v);
                        return v;
                    }
                },
                _id: false
            });
            ChildSchema.set("toObject", { getters: true, minimize: false });

            const ParentSchema = new mongoose.Schema({
                child: {
                    type: ChildSchema,
                    default: {}
                }
            });

            const Parent = db.model("gh5601", ParentSchema);
            const p = new Parent();
            p.child = { number: "555.555.0123" };
            assert.equal(vals.length, 1);
            assert.equal(vals[0], "555.555.0123");
            done();
        });

        it("setting doc array to array of top-level docs works (gh-5632)", (done) => {
            const MainSchema = new Schema({
                name: { type: String },
                children: [{
                    name: { type: String }
                }]
            });
            const RelatedSchema = new Schema({ name: { type: String } });
            const Model = db.model("gh5632", MainSchema);
            const RelatedModel = db.model("gh5632_0", RelatedSchema);

            RelatedModel.create({ name: "test" }, (error, doc) => {
                assert.ifError(error);
                Model.create({ name: "test1", children: [doc] }, (error, m) => {
                    assert.ifError(error);
                    m.children = [doc];
                    m.save((error) => {
                        assert.ifError(error);
                        assert.equal(m.children.length, 1);
                        assert.equal(m.children[0].name, "test");
                        done();
                    });
                });
            });
        });

        it("Using set as a schema path (gh-1939)", (done) => {
            const testSchema = new Schema({ set: String });

            const Test = db.model("gh1939", testSchema);

            const t = new Test({ set: "test 1" });
            assert.equal(t.set, "test 1");
            t.save((error) => {
                assert.ifError(error);
                t.set = "test 2";
                t.save((error) => {
                    assert.ifError(error);
                    assert.equal(t.set, "test 2");
                    done();
                });
            });
        });

        it("handles array defaults correctly (gh-5780)", (done) => {
            const testSchema = new Schema({
                nestedArr: {
                    type: [[Number]],
                    default: [[0, 1]]
                }
            });

            const Test = db.model("gh5780", testSchema);

            const t = new Test({});
            assert.deepEqual(t.toObject().nestedArr, [[0, 1]]);

            t.nestedArr.push([1, 2]);
            const t2 = new Test({});
            assert.deepEqual(t2.toObject().nestedArr, [[0, 1]]);

            done();
        });

        it("Single nested subdocs using discriminator can be modified (gh-5693)", (done) => {
            const eventSchema = new Schema({ message: String }, {
                discriminatorKey: "kind",
                _id: false
            });

            const trackSchema = new Schema({ event: eventSchema });

            trackSchema.path("event").discriminator("Clicked", new Schema({
                element: String
            }, { _id: false }));

            trackSchema.path("event").discriminator("Purchased", new Schema({
                product: String
            }, { _id: false }));

            const MyModel = db.model("gh5693", trackSchema);

            const doc = new MyModel({
                event: {
                    message: "Test",
                    kind: "Clicked",
                    element: "Amazon Link"
                }
            });

            doc.save((error) => {
                assert.ifError(error);
                assert.equal(doc.event.message, "Test");
                assert.equal(doc.event.kind, "Clicked");
                assert.equal(doc.event.element, "Amazon Link");

                doc.set("event", {
                    kind: "Purchased",
                    product: "Professional AngularJS"
                });

                doc.save((error) => {
                    assert.ifError(error);
                    assert.equal(doc.event.kind, "Purchased");
                    assert.equal(doc.event.product, "Professional AngularJS");
                    assert.ok(!doc.event.element);
                    assert.ok(!doc.event.message);
                    done();
                });
            });
        });

        it("doc array: set then remove (gh-3511)", (done) => {
            const ItemChildSchema = new mongoose.Schema({
                name: {
                    type: String,
                    required: true
                }
            });

            const ItemParentSchema = new mongoose.Schema({
                children: [ItemChildSchema]
            });

            const ItemParent = db.model("gh3511", ItemParentSchema);

            const p = new ItemParent({
                children: [{ name: "test1" }, { name: "test2" }]
            });

            p.save((error) => {
                assert.ifError(error);
                ItemParent.findById(p._id, (error, doc) => {
                    assert.ifError(error);
                    assert.ok(doc);
                    assert.equal(doc.children.length, 2);

                    doc.children[1].name = "test3";
                    doc.children.remove(doc.children[0]);

                    doc.save((error) => {
                        assert.ifError(error);
                        ItemParent.findById(doc._id, (error, doc) => {
                            assert.ifError(error);
                            assert.equal(doc.children.length, 1);
                            assert.equal(doc.children[0].name, "test3");
                            done();
                        });
                    });
                });
            });
        });

        it("modifying unselected nested object (gh-5800)", () => {
            const MainSchema = new mongoose.Schema({
                a: {
                    b: { type: String, default: "some default" },
                    c: { type: Number, default: 0 },
                    d: { type: String }
                },
                e: { type: String }
            });

            MainSchema.pre("save", function (next) {
                if (this.isModified()) {
                    this.set("a.c", 100, Number);
                }
                next();
            });

            const Main = db.model("gh5800", MainSchema);

            const doc = { a: { b: "not the default", d: "some value" }, e: "e" };
            return Main.create(doc).
                then((doc) => {
                    assert.equal(doc.a.b, "not the default");
                    assert.equal(doc.a.d, "some value");
                    return Main.findOne().select("e");
                }).
                then((doc) => {
                    doc.e = "e modified";
                    return doc.save();
                }).
                then(() => {
                    return Main.findOne();
                }).
                then((doc) => {
                    assert.equal(doc.a.b, "not the default");
                    assert.equal(doc.a.d, "some value");
                });
        });

        it("consistent context for nested docs (gh-5347)", (done) => {
            const contexts = [];
            const childSchema = new mongoose.Schema({
                phoneNumber: {
                    type: String,
                    required() {
                        contexts.push(this);
                        return this.notifications.isEnabled;
                    }
                },
                notifications: {
                    isEnabled: { type: Boolean, required: true }
                }
            });

            const parentSchema = new mongoose.Schema({
                name: String,
                children: [childSchema]
            });

            const Parent = db.model("gh5347", parentSchema);

            Parent.create({
                name: "test",
                children: [
                    {
                        phoneNumber: "123",
                        notifications: {
                            isEnabled: true
                        }
                    }
                ]
            }, (error, doc) => {
                assert.ifError(error);
                const child = doc.children.id(doc.children[0]._id);
                child.phoneNumber = "345";
                assert.equal(contexts.length, 1);
                doc.save((error) => {
                    assert.ifError(error);
                    assert.equal(contexts.length, 2);
                    assert.ok(contexts[0].toObject().notifications.isEnabled);
                    assert.ok(contexts[1].toObject().notifications.isEnabled);
                    done();
                });
            });
        });

        it("modify multiple subdoc paths (gh-4405)", (done) => {
            const ChildObjectSchema = new Schema({
                childProperty1: String,
                childProperty2: String,
                childProperty3: String
            });

            const ParentObjectSchema = new Schema({
                parentProperty1: String,
                parentProperty2: String,
                child: ChildObjectSchema
            });

            const Parent = db.model("gh4405", ParentObjectSchema);

            const p = new Parent({
                parentProperty1: "abc",
                parentProperty2: "123",
                child: {
                    childProperty1: "a",
                    childProperty2: "b",
                    childProperty3: "c"
                }
            });
            p.save((error) => {
                assert.ifError(error);
                Parent.findById(p._id, (error, p) => {
                    assert.ifError(error);
                    p.parentProperty1 = "foo";
                    p.parentProperty2 = "bar";
                    p.child.childProperty1 = "ping";
                    p.child.childProperty2 = "pong";
                    p.child.childProperty3 = "weee";
                    p.save((error) => {
                        assert.ifError(error);
                        Parent.findById(p._id, (error, p) => {
                            assert.ifError(error);
                            assert.equal(p.child.childProperty1, "ping");
                            assert.equal(p.child.childProperty2, "pong");
                            assert.equal(p.child.childProperty3, "weee");
                            done();
                        });
                    });
                });
            });
        });
    });
});
