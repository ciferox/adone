/**
 * Module dependencies
 */

const start = require("./common");
const Aggregate = adone.odm.Aggregate; // require('../lib/aggregate');
const mongoose = adone.odm;
const Schema = mongoose.Schema;

/**
 * Test data
 */

const EmployeeSchema = new Schema({
    name: String,
    sal: Number,
    dept: String,
    customers: [String],
    reportsTo: String
});

mongoose.model("Employee", EmployeeSchema);

function setupData(callback) {
    let saved = 0;
    const emps = [
        { name: "Alice", sal: 18000, dept: "sales", customers: ["Eve", "Fred"] },
        { name: "Bob", sal: 15000, dept: "sales", customers: ["Gary", "Herbert", "Isaac"], reportsTo: "Alice" },
        { name: "Carol", sal: 14000, dept: "r&d", reportsTo: "Bob" },
        { name: "Dave", sal: 14500, dept: "r&d", reportsTo: "Carol" }
    ];
    const db = start();
    const Employee = db.model("Employee");

    emps.forEach((data) => {
        const emp = new Employee(data);

        emp.save(() => {
            if (++saved === emps.length) {
                callback(db);
            }
        });
    });
}

/**
 * Test.
 */

describe("aggregate: ", () => {
    describe("append", () => {
        it("(pipeline)", (done) => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.append({ $a: 1 }, { $b: 2 }, { $c: 3 }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);

            aggregate.append({ $d: 4 }, { $c: 5 });
            assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }, { $d: 4 }, { $c: 5 }]);

            done();
        });

        it("supports array as single argument", (done) => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.append([{ $a: 1 }, { $b: 2 }, { $c: 3 }]), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);

            aggregate.append([{ $d: 4 }, { $c: 5 }]);
            assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }, { $d: 4 }, { $c: 5 }]);

            done();
        });

        it("throws if non-operator parameter is passed", (done) => {
            const aggregate = new Aggregate();
            const regexp = /Arguments must be aggregate pipeline operators/;

            assert.throws(() => {
                aggregate.append({ $a: 1 }, "string");
            }, regexp);

            assert.throws(() => {
                aggregate.append({ $a: 1 }, ["array"]);
            }, regexp);

            assert.throws(() => {
                aggregate.append({ $a: 1 }, { a: 1 });
            }, regexp);

            assert.throws(() => {
                aggregate.append([{ $a: 1 }, { a: 1 }]);
            }, regexp);

            done();
        });

        it("does not throw when 0 args passed", (done) => {
            const aggregate = new Aggregate();

            assert.doesNotThrow(() => {
                aggregate.append();
            });

            done();
        });

        it("does not throw when empty array is passed as single argument", (done) => {
            const aggregate = new Aggregate();

            assert.doesNotThrow(() => {
                aggregate.append([]);
            });

            done();
        });

        it("called from constructor", (done) => {
            const aggregate = new Aggregate({ $a: 1 }, { $b: 2 }, { $c: 3 });
            assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);
            done();
        });
    });

    describe("project", () => {
        it("(object)", (done) => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.project({ a: 1, b: 1, c: 0 }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);

            aggregate.project({ b: 1 });
            assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);

            done();
        });

        it("(string)", (done) => {
            const aggregate = new Aggregate();

            aggregate.project(" a b   -c  ");
            assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);

            aggregate.project("b");
            assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);

            done();
        });

        it('("a","b","c")', (done) => {
            assert.throws(() => {
                const aggregate = new Aggregate();
                aggregate.project("a", "b", "c");
            }, /Invalid project/);

            done();
        });

        it('["a","b","c"]', (done) => {
            assert.throws(() => {
                const aggregate = new Aggregate();
                aggregate.project(["a", "b", "c"]);
            }, /Invalid project/);

            done();
        });
    });

    describe("group", () => {
        it("works", (done) => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.group({ a: 1, b: 2 }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $group: { a: 1, b: 2 } }]);

            aggregate.group({ c: 3 });
            assert.deepEqual(aggregate._pipeline, [{ $group: { a: 1, b: 2 } }, { $group: { c: 3 } }]);

            done();
        });
    });

    describe("skip", () => {
        it("works", (done) => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.skip(42), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $skip: 42 }]);

            aggregate.skip(42);
            assert.deepEqual(aggregate._pipeline, [{ $skip: 42 }, { $skip: 42 }]);

            done();
        });
    });

    describe("limit", () => {
        it("works", (done) => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.limit(42), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $limit: 42 }]);

            aggregate.limit(42);
            assert.deepEqual(aggregate._pipeline, [{ $limit: 42 }, { $limit: 42 }]);

            done();
        });
    });

    describe("unwind", () => {
        it('("field")', (done) => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.unwind("field"), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $unwind: "$field" }]);

            aggregate.unwind("a", "b", "c");
            assert.deepEqual(aggregate._pipeline, [
                { $unwind: "$field" },
                { $unwind: "$a" },
                { $unwind: "$b" },
                { $unwind: "$c" }
            ]);

            done();
        });
    });

    describe("match", () => {
        it("works", (done) => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.match({ a: 1 }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $match: { a: 1 } }]);

            aggregate.match({ b: 2 });
            assert.deepEqual(aggregate._pipeline, [{ $match: { a: 1 } }, { $match: { b: 2 } }]);

            done();
        });
    });

    describe("sort", () => {
        it("(object)", (done) => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.sort({ a: 1, b: "asc", c: "descending" }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }]);

            aggregate.sort({ b: "desc" });
            assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }, { $sort: { b: -1 } }]);

            done();
        });

        it("(string)", (done) => {
            const aggregate = new Aggregate();

            aggregate.sort(" a b   -c  ");
            assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }]);

            aggregate.sort("b");
            assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }, { $sort: { b: 1 } }]);

            done();
        });

        it('("a","b","c")', (done) => {
            assert.throws(() => {
                const aggregate = new Aggregate();
                aggregate.sort("a", "b", "c");
            }, /Invalid sort/);

            done();
        });

        it('["a","b","c"]', (done) => {
            assert.throws(() => {
                const aggregate = new Aggregate();
                aggregate.sort(["a", "b", "c"]);
            }, /Invalid sort/);

            done();
        });
    });

    describe("near", () => {
        it("works", (done) => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.near({ a: 1 }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $geoNear: { a: 1 } }]);

            aggregate.near({ b: 2 });
            assert.deepEqual(aggregate._pipeline, [{ $geoNear: { a: 1 } }, { $geoNear: { b: 2 } }]);

            done();
        });

        it("works with discriminators (gh-3304)", (done) => {
            let aggregate = new Aggregate();
            const stub = {
                schema: {
                    discriminatorMapping: {
                        key: "__t",
                        value: "subschema",
                        isRoot: false
                    }
                }
            };

            aggregate._model = stub;

            assert.equal(aggregate.near({ a: 1 }), aggregate);
            // Run exec so we apply discriminator pipeline
            Aggregate._prepareDiscriminatorPipeline(aggregate);
            assert.deepEqual(aggregate._pipeline,
                [{ $geoNear: { a: 1, query: { __t: "subschema" } } }]);

            aggregate = new Aggregate();
            aggregate._model = stub;

            aggregate.near({ b: 2, query: { x: 1 } });
            Aggregate._prepareDiscriminatorPipeline(aggregate);
            assert.deepEqual(aggregate._pipeline,
                [{ $geoNear: { b: 2, query: { x: 1, __t: "subschema" } } }]);

            done();
        });
    });

    describe("lookup", () => {
        it("works", (done) => {
            const aggregate = new Aggregate();
            const obj = {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "users"
            };

            aggregate.lookup(obj);

            assert.equal(aggregate._pipeline.length, 1);
            assert.deepEqual(aggregate._pipeline[0].$lookup, obj);
            done();
        });
    });

    describe("sample", () => {
        it("works", (done) => {
            const aggregate = new Aggregate();

            aggregate.sample(3);

            assert.equal(aggregate._pipeline.length, 1);
            assert.deepEqual(aggregate._pipeline[0].$sample, { size: 3 });
            done();
        });
    });

    describe("bind", () => {
        it("works", (done) => {
            const aggregate = new Aggregate();
            const model = { foo: 42 };

            assert.equal(aggregate.model(model), aggregate);
            assert.equal(aggregate._model, model);

            done();
        });
    });

    describe("Mongo 3.4 operators", {
        async skip() {
            /**
             * Helper function to test operators that only work in MongoDB 3.4 and above (such as some aggregation pipeline operators)
             *
             * @param {Object} ctx, `this`, so that mocha tests can be skipped
             * @param {Function} done
             * @return {Void}
             */
            return new Promise((resolve, reject) => {
                start.mongodVersion((err, version) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
                    if (!mongo34) {
                        resolve(true);
                    }
                    resolve(false);
                });
            });
        }
    }, () => {
        describe("graphLookup", () => {
            it("works", (done) => {
                const aggregate = new Aggregate();
                aggregate.graphLookup({
                    startWith: "$test",
                    from: "sourceCollection",
                    connectFromField: "testFromField",
                    connectToField: "_id"
                });

                assert.equal(aggregate._pipeline.length, 1);
                assert.deepEqual(aggregate._pipeline[0].$graphLookup, {
                    startWith: "$test",
                    from: "sourceCollection",
                    connectFromField: "testFromField",
                    connectToField: "_id"
                });
                done();
            });

            it("automatically prepends $ to the startWith field", (done) => {
                const aggregate = new Aggregate();
                aggregate.graphLookup({
                    startWith: "test"
                });

                assert.deepEqual(aggregate._pipeline[0].$graphLookup, {
                    startWith: "$test"
                });
                done();
            });

            it("Throws if no options are passed to graphLookup", (done) => {
                const aggregate = new Aggregate();
                try {
                    aggregate.graphLookup("invalid options");
                    done(new Error("Should have errored"));
                } catch (error) {
                    assert.ok(error instanceof TypeError);
                    done();
                }
            });
        });

        describe("addFields", () => {
            it("(object)", (done) => {
                const aggregate = new Aggregate();

                assert.equal(aggregate.addFields({ a: 1, b: 1, c: 0 }), aggregate);
                assert.deepEqual(aggregate._pipeline, [{ $addFields: { a: 1, b: 1, c: 0 } }]);

                aggregate.addFields({ d: { $add: ["$a", "$b"] } });
                assert.deepEqual(aggregate._pipeline, [{ $addFields: { a: 1, b: 1, c: 0 } }, { $addFields: { d: { $add: ["$a", "$b"] } } }]);
                done();
            });
        });

        describe("facet", () => {
            it("works", (done) => {
                const aggregate = new Aggregate();

                aggregate.facet({
                    heights: [
                        // This will group documents by their `height` property
                        { $group: { _id: "$height", count: { $sum: 1 } } },
                        // This will sort by descending height
                        { $sort: { count: -1, _id: -1 } }
                    ],
                    players: [
                        // This will group documents by their `firstName` property
                        {
                            $group: { _id: "$firstName", count: { $sum: 1 } }
                        },
                        // This will sort documents by their firstName descending
                        { $sort: { count: -1, _id: -1 } }
                    ]
                });

                assert.equal(aggregate._pipeline.length, 1);
                assert.deepEqual(aggregate._pipeline[0].$facet, {
                    heights: [
                        // This will group documents by their `height` property
                        { $group: { _id: "$height", count: { $sum: 1 } } },
                        // This will sort by descending height
                        { $sort: { count: -1, _id: -1 } }
                    ],
                    players: [
                        // This will group documents by their `firstName` property
                        {
                            $group: {
                                _id: "$firstName", count: { $sum: 1 }
                            }
                        },

                        // This will sort documents by their firstName descending
                        {
                            $sort: { count: -1, _id: -1 }
                        }
                    ]
                });
                done();
            });
        });
    });

    describe("exec", () => {
        let db;

        before((done) => {
            setupData((_db) => {
                db = _db;
                done();
            });
        });

        after((done) => {
            db.close(done);
        });

        it("project", (done) => {
            const aggregate = new Aggregate();

            aggregate.
                model(db.model("Employee")).
                project({ sal: 1, sal_k: { $divide: ["$sal", 1000] } }).
                exec((err, docs) => {
                    assert.ifError(err);
                    docs.forEach((doc) => {
                        assert.equal(doc.sal / 1000, doc.sal_k);
                    });

                    done();
                });
        });

        it("group", (done) => {
            const aggregate = new Aggregate();

            aggregate.
                model(db.model("Employee")).
                group({ _id: "$dept" }).
                exec((err, docs) => {
                    let depts;
                    assert.ifError(err);
                    assert.equal(docs.length, 2);

                    depts = docs.map((doc) => {
                        return doc._id;
                    });
                    assert.notEqual(depts.indexOf("sales"), -1);
                    assert.notEqual(depts.indexOf("r&d"), -1);
                    done();
                });
        });

        it("skip", (done) => {
            const aggregate = new Aggregate();

            aggregate.
                model(db.model("Employee")).
                skip(1).
                exec((err, docs) => {
                    assert.ifError(err);
                    assert.equal(docs.length, 3);

                    done();
                });
        });

        it("limit", (done) => {
            const aggregate = new Aggregate();

            aggregate.
                model(db.model("Employee")).
                limit(3).
                exec((err, docs) => {
                    assert.ifError(err);
                    assert.equal(docs.length, 3);

                    done();
                });
        });

        it("unwind", (done) => {
            const aggregate = new Aggregate();

            aggregate.
                model(db.model("Employee")).
                unwind("customers").
                exec((err, docs) => {
                    assert.ifError(err);
                    assert.equal(docs.length, 5);

                    done();
                });
        });

        it("unwind with obj", (done) => {
            const aggregate = new Aggregate();

            const agg = aggregate.
                model(db.model("Employee")).
                unwind({ path: "$customers", preserveNullAndEmptyArrays: true });

            assert.equal(agg._pipeline.length, 1);
            assert.strictEqual(agg._pipeline[0].$unwind.preserveNullAndEmptyArrays,
                true);
            done();
        });

        it("unwind throws with bad arg", (done) => {
            const aggregate = new Aggregate();

            let threw = false;
            try {
                aggregate.
                    model(db.model("Employee")).
                    unwind(36);
            } catch (err) {
                assert.ok(err.message.indexOf("to unwind()") !== -1);
                threw = true;
            }
            assert.ok(threw);
            done();
        });

        it("match", (done) => {
            const aggregate = new Aggregate();

            aggregate.
                model(db.model("Employee")).
                match({ sal: { $gt: 15000 } }).
                exec((err, docs) => {
                    assert.ifError(err);
                    assert.equal(docs.length, 1);

                    done();
                });
        });

        it("sort", (done) => {
            const aggregate = new Aggregate();

            aggregate.
                model(db.model("Employee")).
                sort("sal").
                exec((err, docs) => {
                    assert.ifError(err);
                    assert.equal(docs[0].sal, 14000);

                    done();
                });
        });

        it("graphLookup", function (done) {
            const _this = this;
            start.mongodVersion((err, version) => {
                if (err) {
                    done(err);
                    return;
                }
                const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
                if (!mongo34) {
                    _this.skip();
                }
                test();
            });

            function test() {
                const aggregate = new Aggregate();

                aggregate.
                    model(db.model("Employee")).
                    graphLookup({
                        from: "employees",
                        startWith: "$reportsTo",
                        connectFromField: "reportsTo",
                        connectToField: "name",
                        as: "employeeHierarchy"
                    }).
                    sort({ name: 1 }).
                    exec((err, docs) => {
                        if (err) {
                            return done(err);
                        }
                        const lowest = docs[3];
                        assert.equal(lowest.name, "Dave");
                        assert.equal(lowest.employeeHierarchy.length, 3);

                        // First result in array is max depth result
                        const names = lowest.employeeHierarchy.map((doc) => {
                            return doc.name;
                        }).sort();
                        assert.equal(names[0], "Alice");
                        assert.equal(names[1], "Bob");
                        assert.equal(names[2], "Carol");
                        done();
                    });
            }
        });

        it("facet", function (done) {
            const _this = this;
            start.mongodVersion((err, version) => {
                if (err) {
                    done(err);
                    return;
                }
                const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
                if (!mongo34) {
                    _this.skip();
                }
                test();
            });

            function test() {
                const aggregate = new Aggregate();

                aggregate.
                    model(db.model("Employee")).
                    facet({
                        departments: [
                            {
                                $group: { _id: "$dept", count: { $sum: 1 } }
                            }
                        ],
                        employeesPerCustomer: [
                            { $unwind: "$customers" },
                            { $sortByCount: "$customers" },
                            { $sort: { _id: 1 } }
                        ]
                    }).
                    exec((error, docs) => {
                        if (error) {
                            return done(error);
                        }
                        assert.deepEqual(docs[0].departments, [
                            { _id: "r&d", count: 2 },
                            { _id: "sales", count: 2 }
                        ]);

                        assert.deepEqual(docs[0].employeesPerCustomer, [
                            { _id: "Eve", count: 1 },
                            { _id: "Fred", count: 1 },
                            { _id: "Gary", count: 1 },
                            { _id: "Herbert", count: 1 },
                            { _id: "Isaac", count: 1 }
                        ]);
                        done();
                    });
            }
        });

        it("complex pipeline", (done) => {
            const aggregate = new Aggregate();

            aggregate.
                model(db.model("Employee")).
                match({ sal: { $lt: 16000 } }).
                unwind("customers").
                project({ emp: "$name", cust: "$customers" }).
                sort("-cust").
                skip(2).
                exec((err, docs) => {
                    assert.ifError(err);
                    assert.equal(docs.length, 1);
                    assert.equal(docs[0].cust, "Gary");
                    assert.equal(docs[0].emp, "Bob");

                    done();
                });
        });

        it("pipeline() (gh-5825)", (done) => {
            const aggregate = new Aggregate();

            const pipeline = aggregate.
                model(db.model("Employee")).
                match({ sal: { $lt: 16000 } }).
                pipeline();

            assert.deepEqual(pipeline, [{ $match: { sal: { $lt: 16000 } } }]);
            done();
        });

        it("explain()", (done) => {
            const aggregate = new Aggregate();
            start.mongodVersion((err, version) => {
                if (err) {
                    done(err);
                    return;
                }
                const mongo26 = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
                if (!mongo26) {
                    done();
                    return;
                }

                aggregate.
                    model(db.model("Employee")).
                    match({ sal: { $lt: 16000 } }).
                    explain((err1, output) => {
                        assert.ifError(err1);
                        assert.ok(output);
                        // make sure we got explain output
                        assert.ok(output.stages);

                        done();
                    });
            });
        });

        describe("error when empty pipeline", () => {
            it("without a callback", (done) => {
                const agg = new Aggregate();

                agg.model(db.model("Employee"));
                const promise = agg.exec();
                assert.ok(promise instanceof mongoose.Promise);
                promise.onResolve((err) => {
                    assert.ok(err);
                    assert.equal(err.message, "Aggregate has empty pipeline");
                    done();
                });
            });

            it("with a callback", (done) => {
                const aggregate = new Aggregate();
                let callback;

                aggregate.model(db.model("Employee"));
                callback = function (err) {
                    assert.ok(err);
                    assert.equal(err.message, "Aggregate has empty pipeline");
                    done();
                };

                aggregate.exec(callback);
            });
        });

        describe("error when not bound to a model", () => {
            it("with callback", (done) => {
                const aggregate = new Aggregate();

                aggregate.skip(0);
                assert.throws(() => {
                    aggregate.exec();
                }, "Aggregate not bound to any Model");

                done();
            });
        });

        it("handles aggregation options", (done) => {
            start.mongodVersion((err, version) => {
                if (err) {
                    throw err;
                }
                const mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);

                const m = db.model("Employee");
                const match = { $match: { sal: { $gt: 15000 } } };
                const pref = "primaryPreferred";
                const aggregate = m.aggregate(match).read(pref);
                if (mongo26_or_greater) {
                    aggregate.allowDiskUse(true);
                }

                assert.equal(aggregate.options.readPreference.mode, pref);
                if (mongo26_or_greater) {
                    assert.equal(aggregate.options.allowDiskUse, true);
                }

                aggregate.
                    exec((err, docs) => {
                        assert.ifError(err);
                        assert.equal(1, docs.length);
                        assert.equal(docs[0].sal, 18000);
                        done();
                    });
            });
        });

        describe("middleware (gh-5251)", () => {
            let db;

            before(() => {
                db = start();
            });

            after((done) => {
                db.close(done);
            });

            it("pre", (done) => {
                const s = new Schema({ name: String });

                let called = 0;
                s.pre("aggregate", (next) => {
                    ++called;
                    next();
                });

                const M = db.model("gh5251", s);

                M.aggregate([{ $match: { name: "test" } }], (error, res) => {
                    assert.ifError(error);
                    assert.deepEqual(res, []);
                    assert.equal(called, 1);
                    done();
                });
            });

            it("post", (done) => {
                const s = new Schema({ name: String });

                const calledWith = [];
                s.post("aggregate", (res, next) => {
                    calledWith.push(res);
                    next();
                });

                const M = db.model("gh5251_post", s);

                M.aggregate([{ $match: { name: "test" } }], (error, res) => {
                    assert.ifError(error);
                    assert.deepEqual(res, []);
                    assert.equal(calledWith.length, 1);
                    assert.deepEqual(calledWith[0], []);
                    done();
                });
            });

            it("error handler with agg error", (done) => {
                const s = new Schema({ name: String });

                const calledWith = [];
                s.post("aggregate", (error, res, next) => {
                    calledWith.push(error);
                    next();
                });

                const M = db.model("gh5251_error_agg", s);

                M.aggregate([{ $fakeStage: { name: "test" } }], (error, res) => {
                    assert.ok(error);
                    assert.ok(error.message.indexOf("Unrecognized pipeline stage") !== -1,
                        error.message);
                    assert.equal(res, null);
                    assert.equal(calledWith.length, 1);
                    assert.equal(calledWith[0], error);
                    done();
                });
            });

            it("error handler with pre error", (done) => {
                const s = new Schema({ name: String });

                const calledWith = [];
                s.pre("aggregate", (next) => {
                    next(new Error("woops"));
                });
                s.post("aggregate", (error, res, next) => {
                    calledWith.push(error);
                    next();
                });

                const M = db.model("gh5251_error", s);

                M.aggregate([{ $match: { name: "test" } }], (error, res) => {
                    assert.ok(error);
                    assert.equal(error.message, "woops");
                    assert.equal(res, null);
                    assert.equal(calledWith.length, 1);
                    assert.equal(calledWith[0], error);
                    done();
                });
            });

            it("with agg cursor", (done) => {
                const s = new Schema({ name: String });

                let calledPre = 0;
                let calledPost = 0;
                s.pre("aggregate", (next) => {
                    ++calledPre;
                    next();
                });
                s.post("aggregate", (res, next) => {
                    ++calledPost;
                    next();
                });

                const M = db.model("gh5251_cursor", s);

                let numDocs = 0;
                M.
                    aggregate([{ $match: { name: "test" } }]).
                    cursor({ useMongooseAggCursor: true }).
                    exec().
                    eachAsync(() => {
                        ++numDocs;
                    }).
                    then(() => {
                        assert.equal(numDocs, 0);
                        assert.equal(calledPre, 1);
                        assert.equal(calledPost, 0);
                        done();
                    });
            });
        });

        it("readPref from schema (gh-5522)", (done) => {
            const schema = new Schema({ name: String }, { read: "secondary" });
            const M = db.model("gh5522", schema);
            const a = M.aggregate();
            assert.equal(a.options.readPreference.mode, "secondary");

            a.read("secondaryPreferred");

            assert.equal(a.options.readPreference.mode, "secondaryPreferred");

            done();
        });
    });

    it("cursor (gh-3160)", (done) => {
        const db = start();

        const MyModel = db.model("gh3160", { name: String });

        MyModel.create({ name: "test" }, (error) => {
            assert.ifError(error);
            MyModel.
                aggregate([{ $match: { name: "test" } }, { $project: { name: "$name" } }]).
                allowDiskUse(true).
                cursor({ batchSize: 2500, async: true }).
                exec((error, cursor) => {
                    assert.ifError(error);
                    assert.ok(cursor);
                    cursor.toArray((error) => {
                        assert.ifError(error);
                        db.close(done);
                    });
                });
        });
    });

    it("cursor() without options (gh-3855)", (done) => {
        const db = start();

        const MyModel = db.model("gh3855", { name: String });

        db.on("open", () => {
            const cursor = MyModel.
                aggregate([{ $match: { name: "test" } }]).
                cursor().
                exec();
            assert.ok(cursor instanceof require("stream").Readable);
            done();
        });
    });

    it("cursor() with useMongooseAggCursor (gh-5145)", (done) => {
        const db = start();

        const MyModel = db.model("gh5145", { name: String });

        const cursor = MyModel.
            aggregate([{ $match: { name: "test" } }]).
            cursor({ useMongooseAggCursor: true }).
            exec();
        assert.ok(cursor instanceof require("stream").Readable);

        done();
    });

    it("cursor() with useMongooseAggCursor works (gh-5145) (gh-5394)", (done) => {
        const db = start();

        const MyModel = db.model("gh5394", { name: String });

        MyModel.create({ name: "test" }, (error) => {
            assert.ifError(error);

            const docs = [];
            MyModel.
                aggregate([{ $match: { name: "test" } }]).
                cursor({ useMongooseAggCursor: true }).
                exec().
                eachAsync((doc) => {
                    docs.push(doc);
                }).
                then(() => {
                    assert.equal(docs.length, 1);
                    assert.equal(docs[0].name, "test");
                    done();
                });
        });
    });

    it("cursor() eachAsync (gh-4300)", (done) => {
        const db = start();

        const MyModel = db.model("gh4300", { name: String });

        let cur = 0;
        const expectedNames = ["Axl", "Slash"];
        MyModel.create([{ name: "Axl" }, { name: "Slash" }]).
            then(() => {
                return MyModel.aggregate([{ $sort: { name: 1 } }]).
                    cursor().
                    exec().
                    eachAsync((doc) => {
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
                    }).
                    then(() => {
                        done();
                    });
            }).
            catch(done);
    });

    it("ability to add noCursorTimeout option (gh-4241)", (done) => {
        const db = start();

        const MyModel = db.model("gh4241", {
            name: String
        });

        MyModel.
            aggregate([{ $match: { name: "test" } }]).
            addCursorFlag("noCursorTimeout", true).
            cursor({ async: true }).
            exec((error, cursor) => {
                assert.ifError(error);
                assert.ok(cursor.s.cmd.noCursorTimeout);
                done();
            });
    });

    it("query by document (gh-4866)", (done) => {
        const db = start();

        const MyModel = db.model("gh4866", {
            name: String
        });

        MyModel.create({ name: "test" }).
            then((doc) => {
                return MyModel.aggregate([{ $match: doc }]);
            }).
            then(() => {
                done();
            }).
            catch(done);
    });

    it("sort by text score (gh-5258)", (done) => {
        const db = start();

        const mySchema = new Schema({ test: String });
        mySchema.index({ test: "text" });
        const M = db.model("gh5258", mySchema);

        M.on("index", (error) => {
            assert.ifError(error);
            M.create([{ test: "test test" }, { test: "a test" }], (error) => {
                assert.ifError(error);
                const aggregate = M.aggregate();
                aggregate.match({ $text: { $search: "test" } });
                aggregate.sort({ score: { $meta: "textScore" } });

                aggregate.exec((error, res) => {
                    assert.ifError(error);
                    assert.equal(res.length, 2);
                    assert.equal(res[0].test, "test test");
                    assert.equal(res[1].test, "a test");
                    done();
                });
            });
        });
    });
});
