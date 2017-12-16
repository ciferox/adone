const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;

describe("query middleware", () => {
    let db;
    let schema;
    let publisherSchema;
    let Author;
    let Publisher;

    const initializeData = function (done) {
        Author = db.model("gh-2138", schema, "gh-2138");
        Publisher = db.model("gh-2138-1", publisherSchema, "gh-2138-1");

        Author.remove({}, (error) => {
            if (error) {
                return done(error);
            }

            Publisher.remove({}, (error) => {
                if (error) {
                    return done(error);
                }
                Publisher.create({ name: "Wiley" }, (error, publisher) => {
                    if (error) {
                        return done(error);
                    }

                    const doc = {
                        title: "Professional AngularJS",
                        author: "Val",
                        publisher: publisher._id,
                        options: "bacon"
                    };

                    Author.create(doc, (error) => {
                        done(error);
                    });
                });
            });
        });
    };

    beforeEach((done) => {
        schema = new Schema({
            title: String,
            author: String,
            publisher: { type: Schema.ObjectId, ref: "gh-2138-1" },
            options: String
        });

        publisherSchema = new Schema({
            name: String
        });

        db = start();

        done();
    });

    afterEach((done) => {
        db.close(done);
    });

    it("has a pre find hook", (done) => {
        let count = 0;
        schema.pre("find", (next) => {
            ++count;
            next();
        });

        start();

        initializeData((error) => {
            assert.ifError(error);
            Author.find({ x: 1 }, (error) => {
                assert.ifError(error);
                assert.equal(count, 1);
                done();
            });
        });
    });

    it("has post find hooks", (done) => {
        let postCount = 0;
        schema.post("find", (results, next) => {
            assert.equal(results.length, 1);
            assert.equal(results[0].author, "Val");
            assert.equal(results[0].options, "bacon");
            ++postCount;
            next();
        });

        initializeData((error) => {
            assert.ifError(error);
            Author.find({ title: "Professional AngularJS" }, (error, docs) => {
                assert.ifError(error);
                assert.equal(postCount, 1);
                assert.equal(docs.length, 1);
                done();
            });
        });
    });

    it("works when using a chained query builder", (done) => {
        let count = 0;
        schema.pre("find", (next) => {
            ++count;
            next();
        });

        let postCount = 0;
        schema.post("find", (results, next) => {
            assert.equal(results.length, 1);
            assert.equal(results[0].author, "Val");
            ++postCount;
            next();
        });

        initializeData(() => {
            Author.find({ title: "Professional AngularJS" }).exec((error, docs) => {
                assert.ifError(error);
                assert.equal(count, 1);
                assert.equal(postCount, 1);
                assert.equal(docs.length, 1);
                done();
            });
        });
    });

    it("has separate pre-findOne() and post-findOne() hooks", (done) => {
        let count = 0;
        schema.pre("findOne", (next) => {
            ++count;
            next();
        });

        let postCount = 0;
        schema.post("findOne", (result, next) => {
            assert.equal(result.author, "Val");
            ++postCount;
            next();
        });

        initializeData(() => {
            Author.findOne({ title: "Professional AngularJS" }).exec((error, doc) => {
                assert.ifError(error);
                assert.equal(count, 1);
                assert.equal(postCount, 1);
                assert.equal(doc.author, "Val");
                done();
            });
        });
    });

    it("can populate in pre hook", (done) => {
        schema.pre("findOne", function (next) {
            this.populate("publisher");
            next();
        });

        initializeData(() => {
            Author.findOne({ title: "Professional AngularJS" }).exec((error, doc) => {
                assert.ifError(error);
                assert.equal(doc.author, "Val");
                assert.equal(doc.publisher.name, "Wiley");
                done();
            });
        });
    });

    it("can populate in post hook", (done) => {
        schema.post("findOne", (doc, next) => {
            doc.populate("publisher", (error) => {
                next(error);
            });
        });

        initializeData(() => {
            Author.findOne({ title: "Professional AngularJS" }).exec((error, doc) => {
                assert.ifError(error);
                assert.equal(doc.author, "Val");
                assert.equal(doc.publisher.name, "Wiley");
                done();
            });
        });
    });

    it("has hooks for count()", (done) => {
        let preCount = 0;
        let postCount = 0;

        schema.pre("count", () => {
            ++preCount;
        });

        schema.post("count", () => {
            ++postCount;
        });

        initializeData((error) => {
            assert.ifError(error);
            Author.
                find({ title: "Professional AngularJS" }).
                count((error, count) => {
                    assert.ifError(error);
                    assert.equal(1, count);
                    assert.equal(1, preCount);
                    assert.equal(1, postCount);
                    done();
                });
        });
    });

    it("updateOne() (gh-3997)", (done) => {
        let preCount = 0;
        let postCount = 0;

        schema.pre("updateOne", () => {
            ++preCount;
        });

        schema.post("updateOne", () => {
            ++postCount;
        });

        initializeData((error) => {
            assert.ifError(error);
            Author.
                updateOne({}, { author: "updatedOne" }).
                exec((error) => {
                    assert.ifError(error);
                    assert.equal(preCount, 1);
                    assert.equal(postCount, 1);
                    Author.find({ author: "updatedOne" }, (error, res) => {
                        assert.ifError(error);
                        assert.equal(res.length, 1);
                        done();
                    });
                });
        });
    });

    it("updateMany() (gh-3997)", (done) => {
        let preCount = 0;
        let postCount = 0;

        schema.pre("updateMany", () => {
            ++preCount;
        });

        schema.post("updateMany", () => {
            ++postCount;
        });

        initializeData((error) => {
            assert.ifError(error);

            Author.create({ author: "test" }, (error) => {
                assert.ifError(error);
                Author.
                    updateMany({}, { author: "updatedMany" }).
                    exec((error) => {
                        assert.ifError(error);
                        assert.equal(preCount, 1);
                        assert.equal(postCount, 1);
                        Author.find({}, (error, res) => {
                            assert.ifError(error);
                            assert.ok(res.length > 1);
                            res.forEach((doc) => {
                                assert.equal(doc.author, "updatedMany");
                            });
                            done();
                        });
                    });
            });
        });
    });

    it("error handlers (gh-2284)", (done) => {
        const testSchema = new Schema({ title: { type: String, unique: true } });

        testSchema.post("update", (error, res, next) => {
            assert.ok(error);
            assert.ok(!res);
            next(new Error("woops"));
        });

        const Book = db.model("gh2284", testSchema);

        Book.on("index", (error) => {
            assert.ifError(error);
            const books = [
                { title: "Professional AngularJS" },
                { title: "The 80/20 Guide to ES2015 Generators" }
            ];
            Book.create(books, (error, books) => {
                assert.ifError(error);
                const query = { _id: books[1]._id };
                const update = { title: "Professional AngularJS" };
                Book.update(query, update, (error) => {
                    assert.equal(error.message, "woops");
                    done();
                });
            });
        });
    });

    it("error handlers for validate (gh-4885)", (done) => {
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

    it("error handlers with findOneAndUpdate and passRawResult (gh-4836)", (done) => {
        const schema = new Schema({ name: { type: String } });

        let called = false;
        const errorHandler = function (err, res, next) {
            called = true;
            next();
        };

        schema.post("findOneAndUpdate", errorHandler);

        const Person = db.model("Person", schema);

        Person.
            findOneAndUpdate({ name: "name" }, {}, { upsert: true, passRawResult: true }).
            exec((error) => {
                assert.ifError(error);
                assert.ok(!called);
                done();
            });
    });

    it("error handlers with findOneAndUpdate error and passRawResult (gh-4836)", (done) => {
        const schema = new Schema({ name: { type: String } });

        let called = false;
        const errorHandler = function (err, res, next) {
            called = true;
            next();
        };

        schema.post("findOneAndUpdate", errorHandler);

        const Person = db.model("Person", schema);

        Person.
            findOneAndUpdate({}, { _id: "test" }, { upsert: true, passRawResult: true }).
            exec((error) => {
                assert.ok(error);
                assert.ok(called);
                done();
            });
    });

    it("error handlers with error from pre hook (gh-4927)", (done) => {
        const schema = new Schema({});
        let called = false;

        schema.pre("find", (next) => {
            next(new Error("test"));
        });

        schema.post("find", (res, next) => {
            called = true;
            next();
        });

        schema.post("find", (error, res, next) => {
            assert.equal(error.message, "test");
            next(new Error("test2"));
        });

        const Test = db.model("gh4927", schema);

        Test.find().exec((error) => {
            assert.equal(error.message, "test2");
            assert.ok(!called);
            done();
        });
    });

    it("with clone() (gh-5153)", (done) => {
        const schema = new Schema({});
        let calledPre = 0;
        let calledPost = 0;

        schema.pre("find", (next) => {
            ++calledPre;
            next();
        });

        schema.post("find", (res, next) => {
            ++calledPost;
            next();
        });

        const Test = db.model("gh5153", schema.clone());

        Test.find().exec((error) => {
            assert.ifError(error);
            assert.equal(calledPre, 1);
            assert.equal(calledPost, 1);
            done();
        });
    });
});
