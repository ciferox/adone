const start = require("./common");
const mongoose = adone.odm;
const random = adone.odm.utils.random;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

describe("model", () => {
    let db;

    before(() => {
        db = start();
    });

    after((done) => {
        db.close(done);
    });

    describe("indexes", () => {
        it("are created when model is compiled", (done) => {
            const Indexed = new Schema({
                name: { type: String, index: true },
                last: String,
                email: String,
                date: Date
            });

            Indexed.index({ last: 1, email: 1 }, { unique: true });
            Indexed.index({ date: 1 }, { expires: 10 });

            const IndexedModel = db.model("IndexedModel1", Indexed, `indexedmodel${random()}`);
            let assertions = 0;

            IndexedModel.on("index", () => {
                IndexedModel.collection.getIndexes({ full: true }, (err, indexes) => {
                    assert.ifError(err);

                    indexes.forEach((index) => {
                        switch (index.name) {
                            case "_id_":
                            case "name_1":
                            case "last_1_email_1":
                                assertions++;
                                break;
                            case "date_1":
                                assertions++;
                                assert.equal(index.expireAfterSeconds, 10);
                                break;
                        }
                    });

                    assert.equal(assertions, 4);
                    done();
                });
            });
        });

        it("of embedded documents", (done) => {
            const BlogPosts = new Schema({
                _id: { type: ObjectId, index: true },
                title: { type: String, index: true },
                desc: String
            });

            const User = new Schema({
                name: { type: String, index: true },
                blogposts: [BlogPosts]
            });

            const UserModel = db.model("DeepIndexedModel2", User, `deepindexedmodel${random()}`);
            let assertions = 0;

            UserModel.on("index", () => {
                UserModel.collection.getIndexes((err, indexes) => {
                    assert.ifError(err);

                    function iter(index) {
                        if (index[0] === "name") {
                            assertions++;
                        }
                        if (index[0] === "blogposts._id") {
                            assertions++;
                        }
                        if (index[0] === "blogposts.title") {
                            assertions++;
                        }
                    }

                    for (const i in indexes) {
                        indexes[i].forEach(iter);
                    }

                    assert.equal(assertions, 3);
                    done();
                });
            });
        });

        it("of embedded documents unless excludeIndexes (gh-5575)", (done) => {
            const BlogPost = new Schema({
                _id: { type: ObjectId },
                title: { type: String, index: true },
                desc: String
            });

            const User = new Schema({
                name: { type: String, index: true },
                blogposts: {
                    type: [BlogPost],
                    excludeIndexes: true
                },
                otherblogposts: [{ type: BlogPost, excludeIndexes: true }],
                blogpost: {
                    type: BlogPost,
                    excludeIndexes: true
                }
            });

            const UserModel = db.model("gh5575", User);

            UserModel.on("index", () => {
                UserModel.collection.getIndexes((err, indexes) => {
                    assert.ifError(err);

                    // Should only have _id and name indexes
                    const indexNames = Object.keys(indexes);
                    assert.deepEqual(indexNames.sort(), ["_id_", "name_1"]);
                    done();
                });
            });
        });

        it("of multiple embedded documents with same schema", (done) => {
            const BlogPosts = new Schema({
                _id: { type: ObjectId, index: true },
                title: { type: String, index: true },
                desc: String
            });

            const User = new Schema({
                name: { type: String, index: true },
                blogposts: [BlogPosts],
                featured: [BlogPosts]
            });

            const UserModel = db.model("DeepIndexedModelMulti3", User, "gh2322");
            let assertions = 0;

            UserModel.on("index", () => {
                UserModel.collection.getIndexes((err, indexes) => {
                    assert.ifError(err);

                    function iter(index) {
                        if (index[0] === "name") {
                            ++assertions;
                        }
                        if (index[0] === "blogposts._id") {
                            ++assertions;
                        }
                        if (index[0] === "blogposts.title") {
                            ++assertions;
                        }
                        if (index[0] === "featured._id") {
                            ++assertions;
                        }
                        if (index[0] === "featured.title") {
                            ++assertions;
                        }
                    }

                    for (const i in indexes) {
                        indexes[i].forEach(iter);
                    }

                    assert.equal(assertions, 5);
                    done();
                });
            });
        });

        it("compound: on embedded docs", (done) => {
            const BlogPosts = new Schema({
                title: String,
                desc: String
            });

            BlogPosts.index({ title: 1, desc: 1 });

            const User = new Schema({
                name: { type: String, index: true },
                blogposts: [BlogPosts]
            });

            const UserModel = db.model("DeepCompoundIndexModel4", User, `deepcompoundindexmodel${random()}`);
            let found = 0;

            UserModel.on("index", () => {
                UserModel.collection.getIndexes((err, indexes) => {
                    assert.ifError(err);

                    for (const index in indexes) {
                        switch (index) {
                            case "name_1":
                            case "blogposts.title_1_blogposts.desc_1":
                                ++found;
                                break;
                        }
                    }

                    assert.equal(found, 2);
                    done();
                });
            });
        });

        it("nested embedded docs (gh-5199)", (done) => {
            const SubSubSchema = new mongoose.Schema({
                nested2: String
            });

            SubSubSchema.index({ nested2: 1 });

            const SubSchema = new mongoose.Schema({
                nested1: String,
                subSub: SubSubSchema
            });

            SubSchema.index({ nested1: 1 });

            const ContainerSchema = new mongoose.Schema({
                nested0: String,
                sub: SubSchema
            });

            ContainerSchema.index({ nested0: 1 });

            assert.deepEqual(ContainerSchema.indexes().map((v) => {
                return v[0];
            }), [
                    { "sub.subSub.nested2": 1 },
                    { "sub.nested1": 1 },
                    { nested0: 1 }
                ]);

            done();
        });

        it("primitive arrays (gh-3347)", (done) => {
            const schema = new Schema({
                arr: [{ type: String, unique: true }]
            });

            const indexes = schema.indexes();
            assert.equal(indexes.length, 1);
            assert.deepEqual(indexes[0][0], { arr: 1 });
            assert.ok(indexes[0][1].unique);

            done();
        });

        it("error should emit on the model", (done) => {
            const schema = new Schema({ name: { type: String } });
            const Test = db.model("IndexError5", schema, `x${random()}`);

            Test.create({ name: "hi" }, { name: "hi" }, (err) => {
                assert.strictEqual(err, null);
                Test.schema.index({ name: 1 }, { unique: true });
                Test.schema.index({ other: 1 });

                Test.on("index", (err) => {
                    assert.ok(/E11000 duplicate key error/.test(err.message), err);
                    done();
                });

                delete Test.$init;
                Test.init();
            });
        });

        describe("auto creation", () => {
            it("can be disabled", (done) => {
                const schema = new Schema({ name: { type: String, index: true } });
                schema.set("autoIndex", false);

                const Test = db.model("AutoIndexing6", schema, "autoindexing-disable");
                Test.on("index", () => {
                    assert.ok(false, "Model.ensureIndexes() was called");
                });

                // Create a doc because mongodb 3.0 getIndexes errors if db doesn't
                // exist
                Test.create({ name: "Bacon" }, (err) => {
                    assert.ifError(err);
                    setTimeout(() => {
                        Test.collection.getIndexes((err, indexes) => {
                            assert.ifError(err);
                            // Only default _id index should exist
                            assert.deepEqual(['_id_'], Object.keys(indexes));
                            done();
                        });
                    }, 100);
                });
            });

            describe("global autoIndexes (gh-1875)", () => {
                it("will create indexes as a default", (done) => {
                    const schema = new Schema({ name: { type: String, index: true } });
                    const Test = db.model("GlobalAutoIndex7", schema, "gh-1875-1");
                    Test.on("index", (error) => {
                        assert.ifError(error);
                        assert.ok(true, "Model.ensureIndexes() was called");
                        Test.collection.getIndexes((err, indexes) => {
                            assert.ifError(err);
                            assert.equal(Object.keys(indexes).length, 2);
                            done();
                        });
                    });
                });

                it("will not create indexes if the global auto index is false and schema option isnt set (gh-1875)", (done) => {
                    const db = start({ config: { autoIndex: false } });
                    const schema = new Schema({ name: { type: String, index: true } });
                    const Test = db.model("GlobalAutoIndex8", schema, `x${random()}`);
                    Test.on("index", () => {
                        assert.ok(false, "Model.ensureIndexes() was called");
                    });

                    Test.create({ name: "Bacon" }, (err) => {
                        assert.ifError(err);
                        setTimeout(() => {
                            Test.collection.getIndexes(function (err, indexes) {
                                assert.ifError(err);
                                assert.deepEqual(['_id_'], Object.keys(indexes));
                                db.close(done);
                            });
                        }, 100);
                    });
                });
            });
        });

        describe("model.ensureIndexes()", () => {
            it("is a function", (done) => {
                const schema = new mongoose.Schema({ x: "string" });
                const Test = mongoose.createConnection().model(`ensureIndexes-${random}`, schema);
                assert.equal(typeof Test.ensureIndexes, "function");
                done();
            });

            it("returns a Promise", (done) => {
                const schema = new mongoose.Schema({ x: "string" });
                const Test = mongoose.createConnection().model(`ensureIndexes-${random}`, schema);
                const p = Test.ensureIndexes();
                assert.ok(p instanceof mongoose.Promise);
                done();
            });

            it("creates indexes", (done) => {
                const schema = new Schema({ name: { type: String } });
                const Test = db.model(`ManualIndexing${random()}`, schema, `x${random()}`);

                Test.schema.index({ name: 1 }, { sparse: true });

                let called = false;
                Test.on("index", () => {
                    called = true;
                });

                Test.ensureIndexes((err) => {
                    assert.ifError(err);
                    assert.ok(called);
                    done();
                });
            });
        });
    });
});
