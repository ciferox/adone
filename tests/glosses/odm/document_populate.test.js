const start = require("./common");
const mongoose = start.mongoose;
const utils = adone.odm.utils;
const random = utils.random;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const Document = adone.odm.Document;

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
    em: [em],
    date: Date
});
TestDocument.prototype.$__setSchema(schema);

/**
 * User schema.
 */

const User = new Schema({
    name: String,
    email: String,
    gender: { type: String, enum: ["male", "female"], default: "male" },
    age: { type: Number, default: 21 },
    blogposts: [{ type: ObjectId, ref: "doc.populate.b" }]
}, { collection: "doc.populate.us" });

/**
 * Comment subdocument schema.
 */

const Comment = new Schema({
    asers: [{ type: ObjectId, ref: "doc.populate.u" }],
    _creator: { type: ObjectId, ref: "doc.populate.u" },
    content: String
});

/**
 * Blog post schema.
 */

const BlogPost = new Schema({
    _creator: { type: ObjectId, ref: "doc.populate.u" },
    title: String,
    comments: [Comment],
    fans: [{ type: ObjectId, ref: "doc.populate.u" }]
});

mongoose.model("doc.populate.b", BlogPost);
mongoose.model("doc.populate.u", User);
mongoose.model("doc.populate.u2", User);

describe("document.populate", () => {
    let db, B, User;
    let user1, user2, post, _id;

    before((done) => {
        db = start();
        B = db.model("doc.populate.b");
        User = db.model("doc.populate.u");

        _id = new mongoose.Types.ObjectId();

        User.create({
            name: "Phoenix",
            email: "phx@az.com",
            blogposts: [_id]
        }, {
                name: "Newark",
                email: "ewr@nj.com",
                blogposts: [_id]
            }, (err, u1, u2) => {
                assert.ifError(err);

                user1 = u1;
                user2 = u2;

                B.create({
                    title: "the how and why",
                    _creator: user1,
                    fans: [user1, user2],
                    comments: [{ _creator: user2, content: "user2" }, { _creator: user1, content: "user1" }]
                }, (err, p) => {
                    assert.ifError(err);
                    post = p;
                    done();
                });
            });
    });

    after((done) => {
        db.close(done);
    });

    describe("argument processing", () => {
        describe("duplicates", () => {
            it("are removed", (done) => {
                B.findById(post, (err, post) => {
                    assert.ifError(err);
                    post.populate("_creator");
                    assert.equal(Object.keys(post.$__.populate).length, 1);
                    assert.ok("_creator" in post.$__.populate);
                    post.populate("_creator");
                    assert.equal(Object.keys(post.$__.populate).length, 1);
                    assert.ok("_creator" in post.$__.populate);
                    post.populate("_creator fans");
                    assert.equal(Object.keys(post.$__.populate).length, 2);
                    assert.ok("_creator" in post.$__.populate);
                    assert.ok("fans" in post.$__.populate);
                    post.populate({ path: "_creator" });
                    assert.equal(Object.keys(post.$__.populate).length, 2);
                    assert.ok("_creator" in post.$__.populate);
                    assert.ok("fans" in post.$__.populate);
                    done();
                });
            });
            it("overwrite previous", (done) => {
                B.findById(post, (err, post) => {
                    assert.ifError(err);
                    post.populate("_creator");
                    assert.equal(Object.keys(post.$__.populate).length, 1);
                    assert.equal(post.$__.populate._creator.select, undefined);
                    post.populate({ path: "_creator", select: "name" });
                    assert.equal(Object.keys(post.$__.populate).length, 1);
                    assert.ok("_creator" in post.$__.populate);
                    assert.equal(post.$__.populate._creator.select, "name");
                    done();
                });
            });
        });
    });

    describe("options", () => {
        it("resets populate options after execution", (done) => {
            B.findById(post, (err, post) => {
                const creator_id = post._creator;
                post.populate("_creator", (err) => {
                    assert.ifError(err);
                    assert.ok(!post.$__.populate);
                    assert.ok(post._creator);
                    assert.equal(String(post._creator._id), String(creator_id));
                    done();
                });
            });
        });

        it("are not modified when no arguments are passed", (done) => {
            const d = new TestDocument();
            const o = utils.clone(d.options);
            assert.deepEqual(o, d.populate().options);
            done();
        });
    });

    describe("populating two paths", () => {
        it("with space delmited string works", (done) => {
            B.findById(post, (err, post) => {
                const creator_id = post._creator;
                const alt_id = post.fans[1];
                post.populate("_creator fans", (err) => {
                    assert.ifError(err);
                    assert.ok(post._creator);
                    assert.equal(String(post._creator._id), String(creator_id));
                    assert.equal(String(post.fans[0]._id), String(creator_id));
                    assert.equal(String(post.fans[1]._id), String(alt_id));
                    done();
                });
            });
        });
    });

    it("works with just a callback", (done) => {
        B.findById(post, (err, post) => {
            const creator_id = post._creator;
            const alt_id = post.fans[1];
            post.populate("_creator").populate((err) => {
                assert.ifError(err);
                assert.ok(post._creator);
                assert.equal(String(post._creator._id), String(creator_id));
                assert.equal(String(post.fans[1]), String(alt_id));
                done();
            });
        });
    });

    it("populating using space delimited paths with options", (done) => {
        B.findById(post, (err, post) => {
            const param = {};
            param.select = "-email";
            param.options = { sort: "name" };
            param.path = "_creator fans"; // 2 paths

            const creator_id = post._creator;
            const alt_id = post.fans[1];
            post.populate(param, (err, post) => {
                assert.ifError(err);
                assert.equal(post.fans.length, 2);
                assert.equal(String(post._creator._id), String(creator_id));
                assert.equal(String(post.fans[1]._id), String(creator_id));
                assert.equal(String(post.fans[0]._id), String(alt_id));
                assert.ok(!post.fans[0].email);
                assert.ok(!post.fans[1].email);
                assert.ok(!post.fans[0].isInit("email"));
                assert.ok(!post.fans[1].isInit("email"));
                done();
            });
        });
    });

    it("using multiple populate calls", (done) => {
        B.findById(post, (err, post) => {
            const creator_id = post._creator;
            const alt_id = post.fans[1];

            const param = {};
            param.select = "-email";
            param.options = { sort: "name" };
            param.path = "_creator";
            post.populate(param);
            param.path = "fans";

            post.populate(param, (err, post) => {
                assert.ifError(err);
                assert.equal(post.fans.length, 2);
                assert.equal(String(post._creator._id), String(creator_id));
                assert.equal(String(post.fans[1]._id), String(creator_id));
                assert.equal(String(post.fans[0]._id), String(alt_id));
                assert.ok(!post.fans[0].email);
                assert.ok(!post.fans[1].email);
                assert.ok(!post.fans[0].isInit("email"));
                assert.ok(!post.fans[1].isInit("email"));
                done();
            });
        });
    });

    it("with custom model selection", (done) => {
        B.findById(post, (err, post) => {
            const param = {};
            param.select = "-email";
            param.options = { sort: "name" };
            param.path = "_creator fans";
            param.model = "doc.populate.u2";

            const creator_id = post._creator;
            const alt_id = post.fans[1];
            post.populate(param, (err, post) => {
                assert.ifError(err);
                assert.equal(post.fans.length, 2);
                assert.equal(String(post._creator._id), String(creator_id));
                assert.equal(String(post.fans[1]._id), String(creator_id));
                assert.equal(String(post.fans[0]._id), String(alt_id));
                assert.ok(!post.fans[0].email);
                assert.ok(!post.fans[1].email);
                assert.ok(!post.fans[0].isInit("email"));
                assert.ok(!post.fans[1].isInit("email"));
                done();
            });
        });
    });

    it("a property not in schema", (done) => {
        B.findById(post, (err, post) => {
            assert.ifError(err);
            post.populate("idontexist", (err) => {
                assert.ifError(err);

                // stuff an ad-hoc value in
                post.setValue("idontexist", user1._id);

                // populate the non-schema value by passing an explicit model
                post.populate({ path: "idontexist", model: "doc.populate.u" }, (err, post) => {
                    assert.ifError(err);
                    assert.ok(post);
                    assert.equal(user1._id.toString(), post.get("idontexist")._id);
                    assert.equal(post.get("idontexist").name, "Phoenix");
                    done();
                });
            });
        });
    });

    it("of empty array", (done) => {
        B.findById(post, (err, post) => {
            post.fans = [];
            post.populate("fans", (err) => {
                assert.ifError(err);
                done();
            });
        });
    });

    it("of array of null/undefined", (done) => {
        B.findById(post, (err, post) => {
            post.fans = [null, undefined];
            post.populate("fans", (err) => {
                assert.ifError(err);
                done();
            });
        });
    });

    it("of null property", (done) => {
        B.findById(post, (err, post) => {
            post._creator = null;
            post.populate("_creator", (err) => {
                assert.ifError(err);
                done();
            });
        });
    });

    it("String _ids", (done) => {
        const db = start();

        const UserSchema = new Schema({
            _id: String,
            name: String
        });

        const NoteSchema = new Schema({
            author: { type: String, ref: "UserWithStringId" },
            body: String
        });

        const User = db.model("UserWithStringId", UserSchema, random());
        const Note = db.model("NoteWithStringId", NoteSchema, random());

        const alice = new User({ _id: "alice", name: "Alice In Wonderland" });

        alice.save((err) => {
            assert.ifError(err);

            const note = new Note({ author: "alice", body: "Buy Milk" });
            note.populate("author", (err) => {
                db.close();
                assert.ifError(err);
                assert.ok(note.author);
                assert.equal(note.author._id, "alice");
                assert.equal(note.author.name, "Alice In Wonderland");
                done();
            });
        });
    });

    it("Buffer _ids", (done) => {
        const db = start();

        const UserSchema = new Schema({
            _id: Buffer,
            name: String
        });

        const NoteSchema = new Schema({
            author: { type: Buffer, ref: "UserWithBufferId" },
            body: String
        });

        const User = db.model("UserWithBufferId", UserSchema, random());
        const Note = db.model("NoteWithBufferId", NoteSchema, random());

        const alice = new User({ _id: new mongoose.Types.Buffer("YWxpY2U=", "base64"), name: "Alice" });

        alice.save((err) => {
            assert.ifError(err);

            const note = new Note({ author: "alice", body: "Buy Milk" });
            note.save((err) => {
                assert.ifError(err);

                Note.findById(note.id, (err, note) => {
                    assert.ifError(err);
                    assert.equal(note.author, "alice");
                    note.populate("author", (err, note) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(note.body, 'Buy Milk');
                        assert.ok(note.author);
                        assert.equal(note.author.name, 'Alice');
                        done();
                    });
                });
            });
        });
    });

    it("Number _ids", (done) => {
        const db = start();

        const UserSchema = new Schema({
            _id: Number,
            name: String
        });

        const NoteSchema = new Schema({
            author: { type: Number, ref: "UserWithNumberId" },
            body: String
        });

        const User = db.model("UserWithNumberId", UserSchema, random());
        const Note = db.model("NoteWithNumberId", NoteSchema, random());

        const alice = new User({ _id: 2359, name: "Alice" });

        alice.save((err) => {
            assert.ifError(err);

            const note = new Note({ author: 2359, body: "Buy Milk" });
            note.populate("author").populate((err, note) => {
                db.close();
                assert.ifError(err);
                assert.ok(note.author);
                assert.equal(note.author._id, 2359);
                assert.equal("Alice", note.author.name);
                done();
            });
        });
    });

    describe("sub-level properties", () => {
        it("with string arg", (done) => {
            B.findById(post, (err, post) => {
                const id0 = post.comments[0]._creator;
                const id1 = post.comments[1]._creator;
                post.populate("comments._creator", (err, post) => {
                    assert.ifError(err);
                    assert.equal(post.comments.length, 2);
                    assert.equal(post.comments[0]._creator.id, id0);
                    assert.equal(post.comments[1]._creator.id, id1);
                    done();
                });
            });
        });
    });

    describe("of new document", () => {
        it("should save just the populated _id (gh-1442)", (done) => {
            const b = new B({ _creator: user1 });
            b.populate("_creator", (err, b) => {
                if (err) {
                    return done(err);
                }
                assert.equal(b._creator.name, "Phoenix");
                b.save((err) => {
                    assert.ifError(err);
                    B.collection.findOne({ _id: b._id }, (err, b) => {
                        assert.ifError(err);
                        assert.equal(b._creator, String(user1._id));
                        done();
                    });
                });
            });
        });
    });

    it("gh-3308", (done) => {
        const db = start();

        const Person = db.model("gh3308", {
            name: String
        });

        const Band = db.model("gh3308_0", {
            guitarist: { type: Schema.Types.ObjectId, ref: "gh3308" }
        });

        const slash = new Person({ name: "Slash" });
        const gnr = new Band({ guitarist: slash._id });

        gnr.guitarist = slash;
        assert.equal(gnr.guitarist.name, "Slash");
        assert.ok(gnr.populated("guitarist"));

        const buckethead = new Person({ name: "Buckethead" });
        gnr.guitarist = buckethead._id;
        assert.ok(!gnr.populated("guitarist"));

        db.close(done);
    });

    describe("gh-2214", () => {
        it("should return a real document array when populating", (done) => {
            const db = start();

            const Car = db.model("gh-2214-1", {
                color: String,
                model: String
            });

            const Person = db.model("gh-2214-2", {
                name: String,
                cars: [
                    {
                        type: Schema.Types.ObjectId,
                        ref: "gh-2214-1"
                    }
                ]
            });

            let car;
            let joe;
            joe = new Person({
                name: "Joe"
            });
            car = new Car({
                model: "BMW",
                color: "red"
            });
            joe.cars.push(car);

            joe.save((error) => {
                assert.ifError(error);
                car.save((error) => {
                    assert.ifError(error);
                    Person.findById(joe.id, (error, joe) => {
                        assert.ifError(error);
                        joe.populate('cars', function (error) {
                            assert.ifError(error);
                            car = new Car({
                                model: 'BMW',
                                color: 'black'
                            });
                            joe.cars.push(car);
                            assert.ok(joe.isModified('cars'));
                            done();
                            db.close();
                        });
                    });
                });
            });
        });
    });

    it("can depopulate (gh-2509)", (done) => {
        const db = start();

        const Person = db.model("gh2509_1", {
            name: String
        });

        const Band = db.model("gh2509_2", {
            name: String,
            members: [{ type: Schema.Types.ObjectId, ref: "gh2509_1" }],
            lead: { type: Schema.Types.ObjectId, ref: "gh2509_1" }
        });

        const people = [{ name: "Axl Rose" }, { name: "Slash" }];
        Person.create(people, (error, docs) => {
            assert.ifError(error);
            const band = {
                name: "Guns N' Roses",
                members: [docs[0]._id, docs[1]],
                lead: docs[0]._id
            };
            Band.create(band, (error, band) => {
                band.populate("members", () => {
                    assert.equal(band.members[0].name, "Axl Rose");
                    band.depopulate("members");
                    assert.ok(!band.members[0].name);
                    assert.equal(band.members[0].toString(), docs[0]._id.toString());
                    assert.equal(band.members[1].toString(), docs[1]._id.toString());
                    assert.ok(!band.populated("members"));
                    assert.ok(!band.populated("lead"));
                    band.populate("lead", () => {
                        assert.equal(band.lead.name, 'Axl Rose');
                        band.depopulate('lead');
                        assert.ok(!band.lead.name);
                        assert.equal(band.lead.toString(), docs[0]._id.toString());
                        db.close(done);
                    });
                });
            });
        });
    });

    it("does not allow you to call populate() on nested docs (gh-4552)", (done) => {
        const EmbeddedSchema = new Schema({
            reference: {
                type: mongoose.Schema.ObjectId,
                ref: "Reference"
            }
        });

        const ModelSchema = new Schema({
            embedded: EmbeddedSchema
        });

        const Model = db.model("gh4552", ModelSchema);

        const m = new Model({});
        m.embedded = {};
        assert.throws(() => {
            m.embedded.populate("reference");
        }, /on nested docs/);
        done();
    });

    it("handles pulling from populated array (gh-3579)", (done) => {
        const db = start();
        const barSchema = new Schema({ name: String });

        const Bar = db.model("gh3579", barSchema);

        const fooSchema = new Schema({
            bars: [{
                type: Schema.Types.ObjectId,
                ref: "gh3579"
            }]
        });

        const Foo = db.model("gh3579_0", fooSchema);

        Bar.create([{ name: "bar1" }, { name: "bar2" }], (error, docs) => {
            assert.ifError(error);
            const foo = new Foo({ bars: [docs[0], docs[1]] });
            foo.bars.pull(docs[0]._id);
            foo.save((error) => {
                assert.ifError(error);
                Foo.findById(foo._id, (error, foo) => {
                    assert.ifError(error);
                    assert.equal(foo.bars.length, 1);
                    assert.equal(foo.bars[0].toString(), docs[1]._id.toString());
                    db.close(done);
                });
            });
        });
    });
});
