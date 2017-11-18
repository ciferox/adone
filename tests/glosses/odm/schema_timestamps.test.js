const start = require("./common");
const { Schema } = adone.odm;

describe("schema options.timestamps", () => {
    describe("create schema with options.timestamps", () => {
        it("should have createdAt and updatedAt fields", (done) => {
            const TestSchema = new Schema({
                name: String
            }, {
                    timestamps: true
                });

            assert.ok(TestSchema.path("createdAt"));
            assert.ok(TestSchema.path("updatedAt"));
            done();
        });

        it("should have createdAt and updatedAt fields", (done) => {
            const TestSchema = new Schema({
                name: String
            });

            TestSchema.set("timestamps", true);

            assert.ok(TestSchema.path("createdAt"));
            assert.ok(TestSchema.path("updatedAt"));
            done();
        });

        it("should have created and updatedAt fields", (done) => {
            const TestSchema = new Schema({
                name: String
            }, {
                    timestamps: {
                        createdAt: "created"
                    }
                });

            assert.ok(TestSchema.path("created"));
            assert.ok(TestSchema.path("updatedAt"));
            done();
        });

        it("should have created and updatedAt fields", (done) => {
            const TestSchema = new Schema({
                name: String
            });

            TestSchema.set("timestamps", {
                createdAt: "created"
            });

            assert.ok(TestSchema.path("created"));
            assert.ok(TestSchema.path("updatedAt"));
            done();
        });

        it("should have created and updated fields", (done) => {
            const TestSchema = new Schema({
                name: String
            }, {
                    timestamps: {
                        createdAt: "created",
                        updatedAt: "updated"
                    }
                });

            assert.ok(TestSchema.path("created"));
            assert.ok(TestSchema.path("updated"));
            done();
        });

        it("should have created and updated fields", (done) => {
            const TestSchema = new Schema({
                name: String
            });

            TestSchema.set("timestamps", {
                createdAt: "created",
                updatedAt: "updated"
            });

            assert.ok(TestSchema.path("created"));
            assert.ok(TestSchema.path("updated"));
            done();
        });

        it("should not override createdAt when not selected (gh-4340)", (done) => {
            const TestSchema = new Schema({
                name: String
            }, {
                    timestamps: true
                });

            const conn = start();
            const Test = conn.model("Test", TestSchema);

            Test.create({
                name: "hello"
            }, (err, doc) => {
                // Let’s save the dates to compare later.
                let createdAt = doc.createdAt;
                let updatedAt = doc.updatedAt;

                assert.ok(doc.createdAt);

                Test.findById(doc._id, { name: true }, (err, doc) => {
                    // The dates shouldn’t be selected here.
                    assert.ok(!doc.createdAt);
                    assert.ok(!doc.updatedAt);

                    doc.name = 'world';

                    doc.save(function (err, doc) {
                        // Let’s save the new updatedAt date as it should have changed.
                        var newUpdatedAt = doc.updatedAt;

                        assert.ok(!doc.createdAt);
                        assert.ok(doc.updatedAt);

                        Test.findById(doc._id, function (err, doc) {
                            // Let’s make sure that everything is working again by
                            // comparing the dates with the ones we saved.
                            assert.equal(doc.createdAt.valueOf(), createdAt.valueOf());
                            assert.notEqual(doc.updatedAt.valueOf(), updatedAt.valueOf());
                            assert.equal(doc.updatedAt.valueOf(), newUpdatedAt.valueOf());

                            done();
                        });
                    });
                });
            });
        });
    });

    describe("auto update createdAt and updatedAt when create/save/update document", () => {
        let CatSchema;
        let conn;
        let Cat;

        before((done) => {
            CatSchema = new Schema({
                name: String,
                hobby: String
            }, { timestamps: true });
            conn = start();
            Cat = conn.model("Cat", CatSchema);
            Cat.remove({}, done);
        });

        it("should have fields when create", (done) => {
            const cat = new Cat({ name: "newcat" });
            cat.save((err, doc) => {
                assert.ok(doc.createdAt);
                assert.ok(doc.updatedAt);
                assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
                done();
            });
        });

        it("should have fields when create with findOneAndUpdate", (done) => {
            Cat.findOneAndUpdate({ name: "notexistname" }, { $set: {} }, { upsert: true, new: true }, (err, doc) => {
                assert.ok(doc.createdAt);
                assert.ok(doc.updatedAt);
                assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
                done();
            });
        });

        it("should change updatedAt when save", (done) => {
            Cat.findOne({ name: "newcat" }, (err, doc) => {
                let old = doc.updatedAt;

                doc.hobby = "coding";

                doc.save((err, doc) => {
                    assert.ok(doc.updatedAt.getTime() > old.getTime());
                    done();
                });
            });
        });

        it("should not change updatedAt when save with no modifications", (done) => {
            Cat.findOne({ name: "newcat" }, (err, doc) => {
                let old = doc.updatedAt;

                doc.save((err, doc) => {
                    assert.ok(doc.updatedAt.getTime() === old.getTime());
                    done();
                });
            });
        });

        it("should change updatedAt when findOneAndUpdate", (done) => {
            Cat.findOne({ name: "newcat" }, (err, doc) => {
                let old = doc.updatedAt;
                Cat.findOneAndUpdate({ name: "newcat" }, { $set: { hobby: "fish" } }, { new: true }, (err, doc) => {
                    assert.ok(doc.updatedAt.getTime() > old.getTime());
                    done();
                });
            });
        });

        it("should have fields when update", (done) => {
            Cat.findOne({ name: "newcat" }, (err, doc) => {
                let old = doc.updatedAt;
                Cat.update({ name: "newcat" }, { $set: { hobby: "fish" } }, () => {
                    Cat.findOne({ name: 'newcat' }, function (err, doc) {
                        assert.ok(doc.updatedAt.getTime() > old.getTime());
                        done();
                    });
                });
            });
        });

        it("nested docs (gh-4049)", (done) => {
            const GroupSchema = new Schema({
                cats: [CatSchema]
            });

            const Group = conn.model("gh4049", GroupSchema);
            const now = Date.now();
            Group.create({ cats: [{ name: "Garfield" }] }, (error, group) => {
                assert.ifError(error);
                assert.ok(group.cats[0].createdAt);
                assert.ok(group.cats[0].createdAt.getTime() >= now);
                done();
            });
        });

        it("nested docs with push (gh-4049)", (done) => {
            const GroupSchema = new Schema({
                cats: [CatSchema]
            });

            const Group = conn.model("gh4049_0", GroupSchema);
            const now = Date.now();
            Group.create({ cats: [{ name: "Garfield" }] }, (error, group) => {
                assert.ifError(error);
                group.cats.push({ name: "Keanu" });
                group.save((error) => {
                    assert.ifError(error);
                    Group.findById(group._id, function (error, group) {
                        assert.ifError(error);
                        assert.ok(group.cats[1].createdAt);
                        assert.ok(group.cats[1].createdAt.getTime() > now);
                        done();
                    });
                });
            });
        });

        after((done) => {
            Cat.remove({}, () => {
                conn.close(done);
            });
        });
    });
});
