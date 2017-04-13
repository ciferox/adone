const testDb = adone.std.path.resolve(__dirname, "workspace/test3.db");
const util = require("util");
const async = require("async");
const rimraf = require("rimraf");
const Model = adone.database.local2.DB;
const Schemas = adone.database.local2.schemas;

describe.skip("Schema", () => {
    let d;

    beforeEach((done) => {
        async.waterfall([
            function (cb) {
                if (!d) {
                    return cb();
                }
                d.store.close(cb);
            },
            function (cb) {
                rimraf(testDb, cb);
            },
            function (cb) {
                d = new Model("testDb", { filename: testDb });
                assert.equal(d.filename, testDb);

                d.reload((err) => {
                    assert.isNull(err);
                    assert.equal(d.getAllData().length, 0);
                    return cb();
                });
            }
        ], done);
    });

    describe.skip("Indexing", () => {
        // TODO: also check dot notation for indexes on this test
        beforeEach((done) => {
            d = new Model("testDb", {
                name: { index: true, unique: true, sparse: true },
                age: { index: true },
                department: { index: false },
                address: { city: { index: true } }
            }, { filename: testDb });

            d.insert([
                { age: 27, name: "Kelly", department: "support", address: { city: "Scranton" } },
                { age: 31, name: "Jim", department: "sales", address: { city: "Scranton" } },
                { age: 33, name: "Dwight", department: "sales", address: { city: "Scranton" } },
                { age: 45, name: "Michael", department: "management" },
                { age: 46, name: "Toby", department: "hr" },
                { age: 45, name: "Phyllis", department: "sales" },
                { age: 23, name: "Ryan", department: "sales" }

            ], (err) => {
                done();
            });
        });

        it("Create indexes specified in schema, auto-indexing does not override them", (done) => {
            assert.isDefined(d.indexes.name);
            assert.isDefined(d.indexes.age);
            assert.isUndefined(d.indexes.department);

            assert.isDefined(d.indexes["address.city"]);

            assert.equal(d.indexes.name.sparse, true);
            assert.equal(d.indexes.name.unique, true);

            d.find({ name: "Dwight" }, (err, docs) => {
                adone.log(err);
                adone.log();
                assert.isNull(err);

                assert.equal(docs.length, 1);
                assert.equal(docs[0].name, "Dwight");

                assert.equal(d.indexes.name.sparse, true);
                assert.equal(d.indexes.name.unique, true);

                done();
            });

            done();
        });


    });  // End of Indexing


    describe("Validation", () => {
        it("basic type validation", (done) => {
            d = new Model("testDb", {
                name: { index: true, unique: true, sparse: true, type: "string" },
                age: { index: true, type: "number" },
                department: { index: false },
                address: { city: { index: true } },
                other: true,
                active: Boolean, // test the new syntax
                started: Date
            }, { filename: testDb });

            const doc = new d({ name: "Kelly", age: 27, department: "support", address: { city: "Scranon" } });
            assert.equal(doc.age, 27);

            doc.age = 28;
            assert.equal(doc.age, 28);
            doc.age = "bullshit";
            assert.equal(doc.age, 28);

            // Typecasting
            doc.name = 26;
            assert.equal(doc.name, "26");

            // Any type allowed
            doc.other = "test";
            assert.equal(doc.other, "test");
            doc.other = 5;
            assert.equal(doc.other, 5);

            // Booleans, also tests the constructor-based syntax (Boolean vs "boolean")
            assert.equal(doc.active, false);
            doc.active = 0;
            assert.equal(doc.active, false);
            doc.active = 5;
            assert.equal(doc.active, true);

            // Dates
            doc.started = new Date("2014-10-28");
            assert.equal(doc.started.getTime(), new Date("2014-10-28").getTime());

            doc.started = "2014-10-29";
            assert.equal(doc.started.getTime(), new Date("2014-10-29").getTime());

            doc.started = new Date("2014-11-29").getTime();
            assert.equal(doc.started.getTime(), new Date("2014-11-29").getTime());

            done();
        });

        it("getter/setter", (done) => {
            d = new Model("testDb", {
                name: { index: true, unique: true, sparse: true, type: "string" },
                age: { index: true, type: "number" },
                department: { index: false },
                address: { city: { index: true } },
                doubleAge: {
                    get() {
                        return 2 * this.age;
                    }
                },
                tripleAge: {
                    get() {
                        return 3 * this.age;
                    }, set(v) {
                        this.age = v / 3;
                    }
                }
            }, { filename: testDb });

            const doc = new d({ name: "Kelly", age: 27, department: "support", address: { city: "Scranon" } });

            assert.equal(doc.doubleAge, 54);
            doc.tripleAge = 75;
            assert.equal(doc.age, 25);

            done();
        });

        it.skip("_id as a getter", (done) => {
            d = new Model("testDb", {
                name: { index: true, unique: true, sparse: true, type: "string" },
                age: { index: true, type: "number" },
                department: { index: false },
                address: { city: { index: true } },
                _id: {
                    get() {
                        return this.name;
                    }
                }
            }, { filename: testDb });

            d.insert([
                { name: "Kelly", age: 27, department: "support", address: { city: "Scranon" } },
                { name: "Jim", age: 29, department: "sales", address: { city: "Scranon" } }

            ], () => {
                d.findOne({ _id: "Kelly" }, (err, doc) => {
                    assert.equal(doc.name, "Kelly");

                    d.insert({ name: "Kelly" }, (err, doc) => {
                        assert.isUndefined(doc);
                        assert.isDefined(err);
                        assert.equal(err.errorType, "uniqueViolated");
                        done();
                    });
                });
            });

        });

        it("type validation via regexp", (done) => {
            d = new Model("testDb", {
                name: { index: true, unique: true, sparse: true, type: /^j(.*)y$/i }
            }, { filename: testDb });

            const doc = new d({ name: "Jay" });
            assert.equal(doc.name, "Jay");

            doc.name = "Jason";
            assert.equal(doc.name, "Jay");

            doc.name = ["Jaimy"];
            assert.equal(doc.name, ["Jaimy"]);

            done();
        });

        it("type validation- any type", (done) => {
            d = new Model("testDb", {
                name: true
            }, { filename: testDb });

            const doc = new d({ name: "Jay" });
            assert.equal(doc.name, "Jay");

            doc.name = 45;
            assert.equal(doc.name, 45);

            doc.name = "Tom";
            assert.equal(doc.name, "Tom");

            done();
        });

        it("type validation on underlying objects", (done) => {
            d = new Model("testDb", {
                name: { index: true, unique: true, sparse: true, type: "string" },
                age: { index: true, type: "number" },
                department: { index: false },
                address: { city: { index: true, type: "string" }, number: "number" }
            }, { filename: testDb });

            const doc = new d({ name: "Kelly", department: "support", address: { city: "Scranon", number: "24" }, age: "28" });
            doc.address.city = 5;
            assert.equal(doc.address.city, "5");

            doc.address = { city: 10, number: "50" };
            assert.deepEqual(doc.address, { city: "10", number: 50 }); // check if we're typecasting

            done();
        });


        it("type validation on underlying arrays", (done) => {
            d = new Model("testDb", {
                name: { index: true, unique: true, sparse: true, type: "string" },
                age: { index: true, type: "number" },
                department: { index: false },
                address: { city: { index: true } },
                tags: ["string"],
                hits: [Number],
                addons: []
            }, { filename: testDb });

            const doc = new d({
                name: "Kelly", department: "support", address: { city: "Scranon", number: "24" }, age: "28",
                tags: ["one", "two", "three"],
                hits: ["one", 1, 2]
                // don't iniailize hits
            });

            // Defaults, also on-construct screening
            assert.deepEqual(doc.tags, ["one", "two", "three"]);
            assert.deepEqual(doc.hits, [1, 2]);
            assert.deepEqual(doc.addons, []);

            // All values are castable, always cast
            doc.tags = ["two", 55, 99];
            assert.deepEqual(doc.tags, ["two", "55", "99"]);
            doc.tags.push("five");
            doc.tags.push(5);
            assert.deepEqual(doc.tags, ["two", "55", "99", "five", "5"]);

            // We're inserting the value if castable, but not if it isn't
            doc.hits.push("595");
            doc.hits.push("bananas");
            assert.deepEqual(doc.hits, [1, 2, 595]);

            // Schema-less
            doc.addons = [1];
            doc.addons.push("5");
            doc.addons.push(10);
            assert.deepEqual(doc.addons, [1, "5", 10]);

            done();
        });


        it("type validation on constructing", (done) => {
            d = new Model("testDb", {
                name: { index: true, unique: true, sparse: true, type: "string" },
                age: { index: true, type: "number" },
                department: { index: false },
                address: { city: { index: true, type: "string" }, number: { type: "number" } }
            }, { filename: testDb });

            const doc = new d({ name: "Kelly", department: "support", address: { city: "Scranon", number: "24" }, age: "28" });
            assert.equal(doc.age, 28);
            assert.equal(doc.address.number, 24);

            done();
        });

        it("default value", (done) => {
            d = new Model("testDb", {
                name: { index: true, unique: true, sparse: true, type: "string", default: "Billy" },
                age: { index: true, type: "number" },
                department: { index: false },
                address: { city: { index: true } }
            }, { filename: testDb });

            const doc = new d({ department: "support", address: { city: "Scranon" } });
            assert.equal(doc.age, 0); // Default value, without having it specified
            assert.equal(doc.name, "Billy"); // Default value, specified in the spec
            done();
        });
    }); // End of Validation


    describe("Normalize", () => {
        it("type shorthands", (done) => {
            assert.deepEqual(Schemas.normalize({
                name: "string",
                age: { type: "number", default: 5 },
                tags: ["string"]
            }), {
                    name: { type: "string" },
                    age: { type: "number", default: 5 },
                    tags: { type: "array", schema: "string" }
                });
            done();
        });

        it("nested objects", (done) => {
            assert.deepEqual(Schemas.normalize({
                name: "string",
                age: { type: "number", default: 5 },
                address: { city: "string" }
            }), {
                    name: { type: "string" },
                    age: { type: "number", default: 5 },
                    address: { type: "object", schema: { city: { type: "string" } } }
                });
            done();
        });
    });


    describe("Model instance", () => {
        // TODO: also check dot notation for indexes on this test
        beforeEach((done) => {
            d = new Model("testDb", {
                name: { index: true, unique: true, sparse: true },
                age: { index: true },
                department: { index: false }
            }, { filename: testDb });

            d.insert([
                { age: 27, name: "Kelly", department: "support" },
                { age: 31, name: "Jim", department: "sales" },
                { age: 33, name: "Dwight", department: "sales" },
                { age: 45, name: "Michael", department: "management" },
                { age: 23, name: "Ryan", department: "sales" }

            ], (err) => {
                done();
            });
        });

        it("model instance construct", (done) => {
            const doc = new d({ name: "andy", age: 11 });
            assert.equal((doc instanceof d), true);

            const doc1 = new d(doc);
            assert.equal((doc1 instanceof d), true);

            done();
        });

        it("model instance .save - update object", (done) => {
            d.findOne({ name: "Dwight" }, (err, doc) => {
                assert.equal(doc.constructor.name, "Document");

                assert.isDefined(doc);
                assert.equal(doc.name, "Dwight");

                doc.name = "Dwaine";
                doc.save((err, doc1) => {
                    assert.isNull(err);
                    assert.equal(doc1.name, "Dwaine");

                    d.findOne({ _id: doc1._id }, (err, doc2) => {
                        assert.isNull(err);
                        assert.equal(doc2.name, doc1.name);
                        done();
                    });

                });
            });
        });

        it("model instance .save - new object", (done) => {
            const doc = new d({ name: "Big Tuna", age: 10, department: "sales" });
            doc.save((err, doc1) => {
                assert.isNull(err);
                assert.isDefined(doc1);

                d.findOne({ _id: doc1._id }, (err, doc2) => {
                    assert.isNull(err);
                    assert.equal(doc2.name, doc1.name);
                    done();
                });
            });

        });

        it("model instance has a working .remove", (done) => {
            d.findOne({ name: "Dwight" }, (err, doc) => {
                assert.isNull(err);
                assert.isDefined(doc);

                doc.remove((err) => {
                    assert.isNull(err);
                    d.findOne({ _id: doc._id }, (err, doc1) => {
                        assert.isNull(err);
                        assert.isNull(doc1);

                        done();
                    });
                });
            });
        });

        it("model instance has a working .update", (done) => {
            d.findOne({ name: "Dwight" }, (err, doc) => {
                assert.isNull(err);
                assert.isDefined(doc);

                doc.update({ $inc: { age: 1 } }, (err, c, doc1) => {
                    assert.isNull(err);
                    assert.equal((doc1.age == doc.age + 1), true);
                    done();
                });
            });
        });



        it("Model.find returns model instance", (done) => {
            d.findOne({}, (err, doc) => {
                assert.equal(doc.constructor.name, "Document");
                done();
            });
        });

        it("Model.update returns model instance", (done) => {
            d.update({}, { $inc: { age: 1 } }, (err, n, doc) => {
                assert.equal(doc.constructor.name, "Document");
                done();
            });
        });

        it("Model.insert returns model instance", (done) => {
            d.insert({ name: "New guy" }, (err, doc) => {
                assert.equal(doc.constructor.name, "Document");
                done();
            });
        });


        it("define instance method", (done) => {
            d.method("findSameDepartment", function (cb) {
                return d.find({ department: this.department }, cb);
            });

            d.findOne({ name: "Jim" }, (err, jim) => {
                jim.findSameDepartment((err, res) => {
                    assert.isNull(err);
                    assert.equal(res.length, 3);
                    done();
                });
            });
        });

        it("define static method", (done) => {
            d.static("findSales", function (cb) {
                return this.find({ department: "sales" }, cb);
            });
            d.findSales((err, sales) => {
                assert.isNull(err);
                assert.equal(sales.length, 3);
                done();
            });
        });
    }); // End of Model Instance


    // TODO: move this to db.test.js
    describe("Events", () => {
        it("use pre-action events to set _ctime and _mtime & test remove", (done) => {

            d.on("insert", (doc) => {
                doc._ctime = new Date();
            });
            d.on("save", (doc) => {
                doc._mtime = new Date();
            });

            new d({ name: "Jan", age: 32 }).save((err, doc) => {
                assert.isNull(err);

                assert.equal(util.isDate(doc._ctime), true);
                assert.equal(util.isDate(doc._mtime), true);

                setTimeout(() => {
                    const original = doc.copy();
                    doc.save((err, doc1) => {
                        d.findOne({ _id: doc1._id }, (err, doc2) => {
                            assert.isNull(err);

                            assert.equal(util.isDate(doc2._ctime), true);
                            assert.equal(util.isDate(doc2._mtime), true);

                            assert.isTrue(doc2._ctime.getTime() == original._ctime.getTime());
                            assert.isTrue(doc2._mtime.getTime() != original._mtime.getTime());

                            d.on("remove", (doc) => {
                                if (doc._id == doc1._id) {
                                    done();
                                }
                            });
                            doc2.remove();
                        });
                    });
                }, 50);

            });
        });


        it("test inserted/updated/removed events", (done) => {
            let doc;
            d.on("inserted", (docs) => {
                assert.equal(docs[0].name, "Jan");
            });
            d.on("removed", (ids) => {
                assert.equal(ids[0], doc._id);
            });
            d.on("updated", (docs) => {
                assert.equal(docs[0]._id, doc._id);
            });

            new d(doc = { name: "Jan", age: 32 }).save((err, d) => {
                assert.isNull(err);
                doc = d;

                doc.age = 33;
                d.save(() => {
                    done();
                });
            });
        });

    }); // End of Events


});


