const start = require("./common");

const mongoose = adone.odm;
const Schema = mongoose.Schema;

describe("QueryCursor", () => {
    let db;
    let Model;

    before((done) => {
        db = start();

        const schema = new Schema({ name: String });
        schema.virtual("test").get(() => {
            return "test";
        });

        Model = db.model("gh1907_0", schema);

        Model.create({ name: "Axl" }, { name: "Slash" }, (error) => {
            assert.ifError(error);
            done();
        });
    });

    after((done) => {
        db.close(done);
    });

    describe("#next()", () => {
        it("with callbacks", (done) => {
            const cursor = Model.find().sort({ name: 1 }).cursor();
            cursor.next((error, doc) => {
                assert.ifError(error);
                assert.equal(doc.name, "Axl");
                assert.equal(doc.test, "test");
                cursor.next((error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc.name, "Slash");
                    assert.equal(doc.test, "test");
                    done();
                });
            });
        });

        it("with promises", (done) => {
            const cursor = Model.find().sort({ name: 1 }).cursor();
            cursor.next().then((doc) => {
                assert.equal(doc.name, "Axl");
                assert.equal(doc.test, "test");
                cursor.next().then((doc) => {
                    assert.equal(doc.name, "Slash");
                    assert.equal(doc.test, "test");
                    done();
                });
            });
        });

        it("with limit (gh-4266)", (done) => {
            const cursor = Model.find().limit(1).sort({ name: 1 }).cursor();
            cursor.next((error, doc) => {
                assert.ifError(error);
                assert.equal(doc.name, "Axl");
                cursor.next((error, doc) => {
                    assert.ifError(error);
                    assert.ok(!doc);
                    done();
                });
            });
        });

        it("with projection", (done) => {
            const personSchema = new Schema({
                name: String,
                born: String
            });
            const Person = db.model("Person4342", personSchema);
            const people = [
                { name: "Axl Rose", born: "William Bruce Rose" },
                { name: "Slash", born: "Saul Hudson" }
            ];
            Person.create(people, (error) => {
                assert.ifError(error);
                const cursor = Person.find({}, { _id: 0, name: 1 }).sort({ name: 1 }).cursor();
                cursor.next((error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc._id, undefined);
                    assert.equal(doc.name, "Axl Rose");
                    assert.equal(doc.born, undefined);
                    cursor.next((error, doc) => {
                        assert.ifError(error);
                        assert.equal(doc._id, undefined);
                        assert.equal(doc.name, 'Slash');
                        assert.equal(doc.born, undefined);
                        done();
                    });
                });
            });
        });

        it("with populate", (done) => {
            const bandSchema = new Schema({
                name: String,
                members: [{ type: mongoose.Schema.ObjectId, ref: "Person1907" }]
            });
            const personSchema = new Schema({
                name: String
            });

            const Person = db.model("Person1907", personSchema);
            const Band = db.model("Band1907", bandSchema);

            const people = [
                { name: "Axl Rose" },
                { name: "Slash" },
                { name: "Nikki Sixx" },
                { name: "Vince Neil" }
            ];
            Person.create(people, (error, docs) => {
                assert.ifError(error);
                const bands = [
                    { name: "Guns N' Roses", members: [docs[0], docs[1]] },
                    { name: "Motley Crue", members: [docs[2], docs[3]] }
                ];
                Band.create(bands, (error) => {
                    assert.ifError(error);
                    let cursor =
                        Band.find().sort({ name: 1 }).populate("members").cursor();
                    cursor.next((error, doc) => {
                        assert.ifError(error);
                        assert.equal(doc.name, 'Guns N\' Roses');
                        assert.equal(doc.members.length, 2);
                        assert.equal(doc.members[0].name, 'Axl Rose');
                        assert.equal(doc.members[1].name, 'Slash');
                        cursor.next(function (error, doc) {
                            assert.equal(doc.name, 'Motley Crue');
                            assert.equal(doc.members.length, 2);
                            assert.equal(doc.members[0].name, 'Nikki Sixx');
                            assert.equal(doc.members[1].name, 'Vince Neil');
                            done();
                        });
                    });
                });
            });
        });

        it("casting ObjectIds with where() (gh-4355)", (done) => {
            Model.findOne((error, doc) => {
                assert.ifError(error);
                assert.ok(doc);
                const query = { _id: doc._id.toHexString() };
                Model.find().where(query).cursor().next((error, doc) => {
                    assert.ifError(error);
                    assert.ok(doc);
                    done();
                });
            });
        });

        it("cast errors (gh-4355)", (done) => {
            Model.find().where({ _id: "BadId" }).cursor().next((error) => {
                assert.ok(error);
                assert.equal(error.name, "CastError");
                assert.equal(error.path, "_id");
                done();
            });
        });

        it("with pre-find hooks (gh-5096)", (done) => {
            const schema = new Schema({ name: String });
            let called = 0;
            schema.pre("find", (next) => {
                ++called;
                next();
            });

            const Model = db.model("gh5096", schema);
            Model.create({ name: "Test" }, (error) => {
                assert.ifError(error);
                Model.find().cursor().next((error, doc) => {
                    assert.ifError(error);
                    assert.equal(called, 1);
                    assert.equal(doc.name, "Test");
                    done();
                });
            });
        });
    });

    it("as readable stream", (done) => {
        const cursor = Model.find().sort({ name: 1 }).cursor();

        const expectedNames = ["Axl", "Slash"];
        let cur = 0;
        cursor.on("data", (doc) => {
            assert.equal(doc.name, expectedNames[cur++]);
            assert.equal(doc.test, "test");
        });

        cursor.on("error", (error) => {
            done(error);
        });

        cursor.on("end", () => {
            assert.equal(cur, 2);
            done();
        });
    });

    describe("`transform` option", () => {
        it("transforms document", (done) => {
            const cursor = Model.find().sort({ name: 1 }).cursor({
                transform(doc) {
                    doc.name += "_transform";
                    return doc;
                }
            });

            const expectedNames = ["Axl_transform", "Slash_transform"];
            let cur = 0;
            cursor.on("data", (doc) => {
                assert.equal(doc.name, expectedNames[cur++]);
                assert.equal(doc.test, "test");
            });

            cursor.on("error", (error) => {
                done(error);
            });

            cursor.on("end", () => {
                assert.equal(cur, 2);
                done();
            });
        });
    });

    describe("#map", () => {
        it("maps documents", (done) => {
            const cursor = Model.find().sort({ name: 1 }).cursor()
                .map((obj) => {
                    obj.name += "_mapped";
                    return obj;
                })
                .map((obj) => {
                    obj.name += "_mappedagain";
                    return obj;
                });

            const expectedNames = ["Axl_mapped_mappedagain", "Slash_mapped_mappedagain"];
            let cur = 0;
            cursor.on("data", (doc) => {
                assert.equal(doc.name, expectedNames[cur++]);
                assert.equal(doc.test, "test");
            });

            cursor.on("error", (error) => {
                done(error);
            });

            cursor.on("end", () => {
                assert.equal(cur, 2);
                done();
            });
        });

        it("with #next", (done) => {
            const cursor = Model.find().sort({ name: 1 }).cursor()
                .map((obj) => {
                    obj.name += "_next";
                    return obj;
                });

            cursor.next((error, doc) => {
                assert.ifError(error);
                assert.equal(doc.name, "Axl_next");
                assert.equal(doc.test, "test");
                cursor.next((error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc.name, "Slash_next");
                    assert.equal(doc.test, "test");
                    done();
                });
            });
        });
    });

    describe("#eachAsync()", () => {
        it("iterates one-by-one, stopping for promises", (done) => {
            const cursor = Model.find().sort({ name: 1 }).cursor();

            const expectedNames = ["Axl", "Slash"];
            let cur = 0;

            const checkDoc = function (doc) {
                const _cur = cur;
                assert.equal(doc.name, expectedNames[cur]);
                return {
                    then(onResolve) {
                        setTimeout(() => {
                            assert.equal(_cur, cur++);
                            onResolve();
                        }, 50);
                    }
                };
            };
            cursor.eachAsync(checkDoc).then(() => {
                assert.equal(cur, 2);
                done();
            }).catch(done);
        });

        it("parallelization", (done) => {
            const cursor = Model.find().sort({ name: 1 }).cursor();

            const names = [];
            const startedAt = [];
            const checkDoc = function (doc) {
                names.push(doc.name);
                startedAt.push(Date.now());
                return {
                    then(onResolve) {
                        setTimeout(() => {
                            onResolve();
                        }, 100);
                    }
                };
            };
            cursor.eachAsync(checkDoc, { parallel: 2 }).then(() => {
                assert.ok(Date.now() - startedAt[1] > 100);
                assert.equal(startedAt.length, 2);
                assert.ok(startedAt[1] - startedAt[0] < 50);
                assert.deepEqual(names.sort(), ["Axl", "Slash"]);
                done();
            }).catch(done);
        });
    });

    describe("#lean()", () => {
        it("lean", (done) => {
            const cursor = Model.find().sort({ name: 1 }).lean().cursor();

            const expectedNames = ["Axl", "Slash"];
            let cur = 0;
            cursor.on("data", (doc) => {
                assert.equal(doc.name, expectedNames[cur++]);
                assert.strictEqual(false, doc instanceof mongoose.Document);
            });

            cursor.on("error", (error) => {
                done(error);
            });

            cursor.on("end", () => {
                assert.equal(cur, 2);
                done();
            });

        });
    });

    describe("#close()", () => {
        it("works (gh-4258)", (done) => {
            const cursor = Model.find().sort({ name: 1 }).cursor();
            cursor.next((error, doc) => {
                assert.ifError(error);
                assert.equal(doc.name, "Axl");
                assert.equal(doc.test, "test");

                let closed = false;
                cursor.on("close", () => {
                    closed = true;
                });

                cursor.close((error) => {
                    assert.ifError(error);
                    assert.ok(closed);
                    cursor.next((error) => {
                        assert.ok(error);
                        assert.equal(error.message, 'Cursor is closed');
                        done();
                    });
                });
            });
        });
    });

    it("addCursorFlag (gh-4814)", (done) => {
        const userSchema = new mongoose.Schema({
            name: String
        });

        const User = db.model("gh4814", userSchema);

        const cursor = User.find().cursor().addCursorFlag("noCursorTimeout", true);

        cursor.on("cursor", () => {
            assert.equal(cursor.cursor.s.cmd.noCursorTimeout, true);
            done();
        });
    });

    it("data before close (gh-4998)", (done) => {
        const userSchema = new mongoose.Schema({
            name: String
        });

        const User = db.model("gh4998", userSchema);
        const users = [];
        for (let i = 0; i < 100; i++) {
            users.push({
                _id: new mongoose.Types.ObjectId(),
                name: `Bob${i < 10 ? "0" : ""}${i}`
            });
        }

        User.insertMany(users, (error) => {
            assert.ifError(error);

            const stream = User.find({}).cursor();
            const docs = [];

            stream.on("data", (doc) => {
                docs.push(doc);
            });

            stream.on("close", () => {
                assert.equal(docs.length, 100);
                done();
            });
        });
    });
});
