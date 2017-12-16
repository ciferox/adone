let url = require("url"),
    start = require("./common"),
    mongoose = adone.odm,
    Mongoose = mongoose.Mongoose,
    Schema = mongoose.Schema,
    random = adone.odm.utils.random,
    collection = `blogposts_${random()}`;

describe("mongoose module:", () => {
    describe("default connection works", () => {
        it("without options", (done) => {
            const goose = new Mongoose();
            const db = goose.connection;
            const uri = "mongodb://localhost/mongoose_test";

            goose.connect(process.env.MONGOOSE_TEST_URI || uri);

            db.on("open", () => {
                db.close(() => {
                    done();
                });
            });
        });

        it("with options", (done) => {
            const goose = new Mongoose();
            let db = goose.connection,
                uri = "mongodb://localhost/mongoose_test";

            goose.connect(process.env.MONGOOSE_TEST_URI || uri, { db: { safe: false } });

            db.on("open", () => {
                db.close(() => {
                    done();
                });
            });
        });

        it("with promise (gh-3790)", (done) => {
            const goose = new Mongoose();
            let db = goose.connection,
                uri = "mongodb://localhost/mongoose_test";

            goose.connect(process.env.MONGOOSE_TEST_URI || uri).then(() => {
                db.close(done);
            });
        });
    });

    it("{g,s}etting options", (done) => {
        const mongoose = new Mongoose();

        mongoose.set("a", "b");
        mongoose.set("long option", "c");

        assert.equal(mongoose.get("a"), "b");
        assert.equal(mongoose.set("a"), "b");
        assert.equal(mongoose.get("long option"), "c");
        done();
    });

    it("declaring global plugins (gh-5690)", (done) => {
        const mong = new Mongoose();
        const subSchema = new Schema({ name: String });
        const schema = new Schema({
            test: [subSchema]
        });
        let called = 0;

        const calls = [];
        let preSaveCalls = 0;
        mong.plugin((s) => {
            calls.push(s);

            s.pre("save", (next) => {
                ++preSaveCalls;
                next();
            });

            s.methods.testMethod = function () {
                return 42;
            };
        });

        schema.plugin((s) => {
            assert.equal(s, schema);
            called++;
        });

        const M = mong.model("GlobalPlugins", schema);

        assert.equal(called, 1);
        assert.equal(calls.length, 2);
        assert.equal(calls[0], schema);
        assert.equal(calls[1], subSchema);

        assert.equal(preSaveCalls, 0);
        mong.connect(start.uri, { useMongoClient: true });
        M.create({ test: [{ name: "Val" }] }, (error, doc) => {
            assert.ifError(error);
            assert.equal(preSaveCalls, 2);
            assert.equal(doc.testMethod(), 42);
            assert.equal(doc.test[0].testMethod(), 42);
            mong.disconnect();
            done();
        });
    });

    describe("disconnection of all connections", () => {
        describe("no callback", () => {
            it("works", (done) => {
                let mong = new Mongoose(),
                    uri = "mongodb://localhost/mongoose_test",
                    connections = 0,
                    disconnections = 0,
                    pending = 4;

                mong.connect(process.env.MONGOOSE_TEST_URI || uri);
                const db = mong.connection;

                function cb() {
                    if (--pending) {
 return;
 }
                    assert.equal(connections, 2);
                    assert.equal(disconnections, 2);
                    done();
                }

                db.on("open", () => {
                    connections++;
                    cb();
                });

                db.on("close", () => {
                    disconnections++;
                    cb();
                });

                const db2 = mong.createConnection(process.env.MONGOOSE_TEST_URI || uri);

                db2.on("open", () => {
                    connections++;
                    cb();
                });

                db2.on("close", () => {
                    disconnections++;
                    cb();
                });

                mong.disconnect();
            });

            it.todo("properly handles errors", (done) => {
                let mong = new Mongoose(),
                    uri = "mongodb://localhost/mongoose_test";

                mong.connect(process.env.MONGOOSE_TEST_URI || uri);
                const db = mong.connection;

                // forced failure
                db.close = function (cb) {
                    cb(new Error("bam"));
                };

                mong.disconnect().connection.once("error", (error) => {
                    assert.equal(error.message, "bam");
                    done();
                });
            });
        });

        it("with callback", (done) => {
            let mong = new Mongoose(),
                uri = "mongodb://localhost/mongoose_test";

            mong.connect(process.env.MONGOOSE_TEST_URI || uri);

            mong.connection.on("open", () => {
                mong.disconnect(() => {
                    done();
                });
            });
        });

        it("with promise (gh-3790)", (done) => {
            const mong = new Mongoose();
            const uri = "mongodb://localhost/mongoose_test";

            mong.connect(process.env.MONGOOSE_TEST_URI || uri);

            mong.connection.on("open", () => {
                mong.disconnect().then(() => {
 done();
});
            });
        });
    });

    describe("model()", () => {
        it("accessing a model that hasn't been defined", (done) => {
            let mong = new Mongoose(),
                thrown = false;

            try {
                mong.model("Test");
            } catch (e) {
                assert.ok(/hasn't been registered/.test(e.message));
                thrown = true;
            }

            assert.equal(thrown, true);
            done();
        });

        it("returns the model at creation", (done) => {
            const Named = mongoose.model("Named", new Schema({ name: String }));
            const n1 = new Named();
            assert.equal(n1.name, null);
            const n2 = new Named({ name: "Peter Bjorn" });
            assert.equal(n2.name, "Peter Bjorn");

            const schema = new Schema({ number: Number });
            const Numbered = mongoose.model("Numbered", schema, collection);
            const n3 = new Numbered({ number: 1234 });
            assert.equal(n3.number.valueOf(), 1234);
            done();
        });

        it("prevents overwriting pre-existing models", (done) => {
            const m = new Mongoose();
            m.model("A", new Schema());

            assert.throws(() => {
                m.model("A", new Schema());
            }, /Cannot overwrite `A` model/);

            done();
        });

        it("allows passing identical name + schema args", (done) => {
            const m = new Mongoose();
            const schema = new Schema();
            m.model("A", schema);

            assert.doesNotThrow(() => {
                m.model("A", schema);
            });

            done();
        });

        it("throws on unknown model name", (done) => {
            assert.throws(() => {
                mongoose.model("iDoNotExist!");
            }, /Schema hasn't been registered/);

            done();
        });

        describe("passing collection name", () => {
            describe("when model name already exists", () => {
                it("returns a new uncached model", (done) => {
                    let m = new Mongoose();
                    let s1 = new Schema({ a: [] });
                    let name = "non-cached-collection-name";
                    let A = m.model(name, s1);
                    let B = m.model(name);
                    let C = m.model(name, "alternate");
                    assert.ok(A.collection.name === B.collection.name);
                    assert.ok(A.collection.name !== C.collection.name);
                    assert.ok(m.models[name].collection.name !== C.collection.name);
                    assert.ok(m.models[name].collection.name === A.collection.name);
                    done();
                });
            });
        });

        describe("passing object literal schemas", () => {
            it("works", (done) => {
                const m = new Mongoose();
                const A = m.model("A", { n: [{ age: "number" }] });
                const a = new A({ n: [{ age: "47" }] });
                assert.strictEqual(47, a.n[0].age);
                done();
            });
        });
    });

    it("connecting with a signature of host, database, function", (done) => {
        let mong = new Mongoose(),
            uri = process.env.MONGOOSE_TEST_URI || "mongodb://localhost/mongoose_test";

        uri = url.parse(uri);

        mong.connect(uri.hostname, uri.pathname.substr(1), (err) => {
            assert.ifError(err);
            mong.connection.close();
            done();
        });
    });

    describe("connecting with a signature of uri, options, function", () => {
        it("with single mongod", (done) => {
            let mong = new Mongoose(),
                uri = process.env.MONGOOSE_TEST_URI || "mongodb://localhost/mongoose_test";

            mong.connect(uri, { db: { safe: false } }, (err) => {
                assert.ifError(err);
                mong.connection.close();
                done();
            });
        });

        it("with replica set", (done) => {
            let mong = new Mongoose(),
                uri = process.env.MONGOOSE_SET_TEST_URI;

            if (!uri) {
                return done();
            }

            mong.connect(uri, { db: { safe: false } }, (err) => {
                assert.ifError(err);
                mong.connection.close();
                done();
            });
        });
    });

    it("goose.connect() to a replica set", (done) => {
        const uri = process.env.MONGOOSE_SET_TEST_URI;

        if (!uri) {
            console.log("\x1b[31m", "\n", "You're not testing replica sets!"
                , "\n", "Please set the MONGOOSE_SET_TEST_URI env variable.", "\n"
                , "e.g: `mongodb://localhost:27017/db,localhost…`", "\n"
                , "\x1b[39m");
            return done();
        }

        const mong = new Mongoose();

        mong.connect(uri, (err) => {
            assert.ifError(err);

            mong.model("Test", new mongoose.Schema({
                test: String
            }));

            let Test = mong.model("Test"),
                test = new Test();

            test.test = "aa";
            test.save((err) => {
                assert.ifError(err);

                Test.findById(test._id, (err, doc) => {
                    assert.ifError(err);
                    assert.equal(doc.test, "aa");
                    mong.connection.close();
                    complete();
                });
            });
        });

        mong.connection.on("fullsetup", complete);

        let pending = 2;
        function complete() {
            if (--pending) {
                return;
            }
            done();
        }
    });

    it("goose.createConnection() to a replica set", (done) => {
        const uri = process.env.MONGOOSE_SET_TEST_URI;

        if (!uri) {
            return done();
        }

        const mong = new Mongoose();

        var conn = mong.createConnection(uri, (err) => {
            assert.ifError(err);

            mong.model("ReplSetTwo", new mongoose.Schema({
                test: String
            }));

            let Test = conn.model("ReplSetTwo"),
                test = new Test();

            test.test = "aa";
            test.save((err) => {
                assert.ifError(err);

                Test.findById(test._id, (err, doc) => {
                    assert.ifError(err);
                    assert.equal(doc.test, "aa");
                    conn.close();
                    complete();
                });
            });
        });

        conn.on("fullsetup", complete);

        let pending = 2;
        function complete() {
            if (--pending) {
                return;
            }
            done();
        }
    });

    describe("exports", () => {
        function test(mongoose) {
            assert.equal(typeof mongoose.Mongoose, "function");
            assert.equal(typeof mongoose.Collection, "function");
            assert.equal(typeof mongoose.Connection, "function");
            assert.equal(typeof mongoose.Schema, "function");
            assert.ok(mongoose.Schema.Types);
            assert.equal(typeof mongoose.SchemaType, "function");
            assert.equal(typeof mongoose.Query, "function");
            assert.equal(typeof mongoose.Model, "function");
            assert.equal(typeof mongoose.Document, "function");
            assert.equal(typeof mongoose.Error, "function");
            assert.equal(typeof mongoose.Error.CastError, "function");
            assert.equal(typeof mongoose.Error.ValidationError, "function");
            assert.equal(typeof mongoose.Error.ValidatorError, "function");
            assert.equal(typeof mongoose.Error.VersionError, "function");
        }

        it("of module", (done) => {
            test(mongoose);
            done();
        });

        it("of new Mongoose instances", (done) => {
            test(new mongoose.Mongoose());
            done();
        });

        it("of result from .connect() (gh-3940)", (done) => {
            const m = new mongoose.Mongoose();
            test(m.connect("mongodb://localhost:27017"));
            m.disconnect();
            done();
        });
    });
});
