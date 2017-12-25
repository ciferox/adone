const start = require("./common");
const Aggregate = adone.odm.Aggregate; // require('../lib/aggregate');
const mongoose = adone.odm;
const Schema = mongoose.Schema;

const setupData = async () => {
    const emps = [
        { name: "Alice", sal: 18000, dept: "sales", customers: ["Eve", "Fred"] },
        { name: "Bob", sal: 15000, dept: "sales", customers: ["Gary", "Herbert", "Isaac"], reportsTo: "Alice" },
        { name: "Carol", sal: 14000, dept: "r&d", reportsTo: "Bob" },
        { name: "Dave", sal: 14500, dept: "r&d", reportsTo: "Carol" }
    ];
    const db = start();
    const Employee = db.model("Employee");

    await Promise.all(emps.map(async (data) => {
        await new Employee(data).save();
    }));

    return db;
};

/**
 * Test
 */

describe("aggregate: ", () => {
    before(() => {
        const EmployeeSchema = new Schema({
            name: String,
            sal: Number,
            dept: String,
            customers: [String],
            reportsTo: String
        });

        mongoose.model("Employee", EmployeeSchema);
    });

    describe("append", () => {
        it("(pipeline)", () => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.append({ $a: 1 }, { $b: 2 }, { $c: 3 }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);

            aggregate.append({ $d: 4 }, { $c: 5 });
            assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }, { $d: 4 }, { $c: 5 }]);
        });

        it("supports array as single argument", () => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.append([{ $a: 1 }, { $b: 2 }, { $c: 3 }]), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);

            aggregate.append([{ $d: 4 }, { $c: 5 }]);
            assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }, { $d: 4 }, { $c: 5 }]);
        });

        it("throws if non-operator parameter is passed", () => {
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
        });

        it("does not throw when 0 args passed", () => {
            const aggregate = new Aggregate();

            assert.doesNotThrow(() => {
                aggregate.append();
            });
        });

        it("does not throw when empty array is passed as single argument", () => {
            const aggregate = new Aggregate();

            assert.doesNotThrow(() => {
                aggregate.append([]);
            });
        });

        it("called from constructor", () => {
            const aggregate = new Aggregate({ $a: 1 }, { $b: 2 }, { $c: 3 });
            assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);
        });
    });

    describe("project", () => {
        it("(object)", () => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.project({ a: 1, b: 1, c: 0 }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);

            aggregate.project({ b: 1 });
            assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);
        });

        it("(string)", () => {
            const aggregate = new Aggregate();

            aggregate.project(" a b   -c  ");
            assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);

            aggregate.project("b");
            assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);
        });

        it('("a","b","c")', () => {
            assert.throws(() => {
                const aggregate = new Aggregate();
                aggregate.project("a", "b", "c");
            }, /Invalid project/);
        });

        it('["a","b","c"]', () => {
            assert.throws(() => {
                const aggregate = new Aggregate();
                aggregate.project(["a", "b", "c"]);
            }, /Invalid project/);
        });
    });

    describe("group", () => {
        it("works", () => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.group({ a: 1, b: 2 }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $group: { a: 1, b: 2 } }]);

            aggregate.group({ c: 3 });
            assert.deepEqual(aggregate._pipeline, [{ $group: { a: 1, b: 2 } }, { $group: { c: 3 } }]);
        });
    });

    describe("skip", () => {
        it("works", () => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.skip(42), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $skip: 42 }]);

            aggregate.skip(42);
            assert.deepEqual(aggregate._pipeline, [{ $skip: 42 }, { $skip: 42 }]);
        });
    });

    describe("limit", () => {
        it("works", () => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.limit(42), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $limit: 42 }]);

            aggregate.limit(42);
            assert.deepEqual(aggregate._pipeline, [{ $limit: 42 }, { $limit: 42 }]);
        });
    });

    describe("unwind", () => {
        it('("field")', () => {
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
        });
    });

    describe("match", () => {
        it("works", () => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.match({ a: 1 }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $match: { a: 1 } }]);

            aggregate.match({ b: 2 });
            assert.deepEqual(aggregate._pipeline, [{ $match: { a: 1 } }, { $match: { b: 2 } }]);
        });
    });

    describe("sort", () => {
        it("(object)", () => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.sort({ a: 1, b: "asc", c: "descending" }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }]);

            aggregate.sort({ b: "desc" });
            assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }, { $sort: { b: -1 } }]);
        });

        it("(string)", () => {
            const aggregate = new Aggregate();

            aggregate.sort(" a b   -c  ");
            assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }]);

            aggregate.sort("b");
            assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }, { $sort: { b: 1 } }]);
        });

        it('("a","b","c")', () => {
            assert.throws(() => {
                const aggregate = new Aggregate();
                aggregate.sort("a", "b", "c");
            }, /Invalid sort/);
        });

        it('["a","b","c"]', () => {
            assert.throws(() => {
                const aggregate = new Aggregate();
                aggregate.sort(["a", "b", "c"]);
            }, /Invalid sort/);
        });
    });

    describe("near", () => {
        it("works", () => {
            const aggregate = new Aggregate();

            assert.equal(aggregate.near({ a: 1 }), aggregate);
            assert.deepEqual(aggregate._pipeline, [{ $geoNear: { a: 1 } }]);

            aggregate.near({ b: 2 });
            assert.deepEqual(aggregate._pipeline, [{ $geoNear: { a: 1 } }, { $geoNear: { b: 2 } }]);
        });

        it("works with discriminators (gh-3304)", () => {
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
        });
    });

    describe("lookup", () => {
        it("works", () => {
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
        });
    });

    describe("sample", () => {
        it("works", () => {
            const aggregate = new Aggregate();

            aggregate.sample(3);

            assert.equal(aggregate._pipeline.length, 1);
            assert.deepEqual(aggregate._pipeline[0].$sample, { size: 3 });
        });
    });

    describe("bind", () => {
        it("works", () => {
            const aggregate = new Aggregate();
            const model = { foo: 42 };

            assert.equal(aggregate.model(model), aggregate);
            assert.equal(aggregate._model, model);
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
            it("works", () => {
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
            });

            it("automatically prepends $ to the startWith field", () => {
                const aggregate = new Aggregate();
                aggregate.graphLookup({
                    startWith: "test"
                });

                assert.deepEqual(aggregate._pipeline[0].$graphLookup, {
                    startWith: "$test"
                });
            });

            it("Throws if no options are passed to graphLookup", () => {
                const aggregate = new Aggregate();
                assert.throws(() => {
                    aggregate.graphLookup("invalid options");
                });
            });
        });

        describe("addFields", () => {
            it("(object)", () => {
                const aggregate = new Aggregate();

                assert.equal(aggregate.addFields({ a: 1, b: 1, c: 0 }), aggregate);
                assert.deepEqual(aggregate._pipeline, [{ $addFields: { a: 1, b: 1, c: 0 } }]);

                aggregate.addFields({ d: { $add: ["$a", "$b"] } });
                assert.deepEqual(aggregate._pipeline, [{ $addFields: { a: 1, b: 1, c: 0 } }, { $addFields: { d: { $add: ["$a", "$b"] } } }]);
            });
        });

        describe("facet", () => {
            it("works", () => {
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
            });
        });
    });

    describe("exec", () => {
        let db;

        before(async () => {
            db = await setupData();
        });

        after(async () => {
            if (db) {
                await db.close();
            }
        });

        it("project", async () => {
            const aggregate = new Aggregate();

            const docs = await aggregate
                .model(db.model("Employee"))
                .project({ sal: 1, sal_k: { $divide: ["$sal", 1000] } })
                .exec();

            docs.forEach((doc) => {
                assert.equal(doc.sal / 1000, doc.sal_k);
            });
        });

        it("group", async () => {
            const aggregate = new Aggregate();

            const docs = await aggregate
                .model(db.model("Employee"))
                .group({ _id: "$dept" })
                .exec();
            assert.equal(docs.length, 2);

            const depts = docs.map((doc) => {
                return doc._id;
            });
            assert.notEqual(depts.indexOf("sales"), -1);
            assert.notEqual(depts.indexOf("r&d"), -1);
        });

        it("skip", async () => {
            const aggregate = new Aggregate();

            const docs = await aggregate
                .model(db.model("Employee"))
                .skip(1)
                .exec();

            assert.equal(docs.length, 3);
        });

        it("limit", async () => {
            const aggregate = new Aggregate();

            const docs = await aggregate
                .model(db.model("Employee"))
                .limit(3)
                .exec();
            assert.equal(docs.length, 3);
        });

        it("unwind", async () => {
            const aggregate = new Aggregate();

            const docs = await aggregate
                .model(db.model("Employee"))
                .unwind("customers")
                .exec();
            assert.equal(docs.length, 5);
        });

        it("unwind with obj", () => {
            const aggregate = new Aggregate();

            const agg = aggregate
                .model(db.model("Employee"))
                .unwind({ path: "$customers", preserveNullAndEmptyArrays: true });

            assert.equal(agg._pipeline.length, 1);
            assert.strictEqual(agg._pipeline[0].$unwind.preserveNullAndEmptyArrays,
                true);
        });

        it("unwind throws with bad arg", () => {
            const aggregate = new Aggregate();

            assert.throws(() => {
                aggregate
                    .model(db.model("Employee"))
                    .unwind(36);
            }, "to unwind()");
        });

        it("match", async () => {
            const aggregate = new Aggregate();

            const docs = await aggregate
                .model(db.model("Employee"))
                .match({ sal: { $gt: 15000 } })
                .exec();
            assert.equal(docs.length, 1);
        });

        it("sort", async () => {
            const aggregate = new Aggregate();

            const docs = await aggregate
                .model(db.model("Employee"))
                .sort("sal")
                .exec();
            assert.equal(docs[0].sal, 14000);
        });

        it("graphLookup", async function () {
            const version = await new Promise((resolve, reject) => {
                start.mongodVersion((err, version) => {
                    err ? reject(err) : resolve(version);
                });
            });

            const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
            if (!mongo34) {
                return this.skip();
            }
            const aggregate = new Aggregate();

            const docs = await aggregate
                .model(db.model("Employee"))
                .graphLookup({
                    from: "employees",
                    startWith: "$reportsTo",
                    connectFromField: "reportsTo",
                    connectToField: "name",
                    as: "employeeHierarchy"
                })
                .sort({ name: 1 })
                .exec();
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
        });

        it("facet", async function () {
            const version = await new Promise((resolve, reject) => {
                start.mongodVersion((err, version) => {
                    err ? reject(err) : resolve(version);
                });
            });

            const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
            if (!mongo34) {
                return this.skip();
            }

            const aggregate = new Aggregate();

            const docs = await aggregate
                .model(db.model("Employee"))
                .facet({
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
                })
                .exec();
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
        });

        it("complex pipeline", async () => {
            const aggregate = new Aggregate();

            const docs = await aggregate
                .model(db.model("Employee"))
                .match({ sal: { $lt: 16000 } })
                .unwind("customers")
                .project({ emp: "$name", cust: "$customers" })
                .sort("-cust")
                .skip(2)
                .exec();
            assert.equal(docs.length, 1);
            assert.equal(docs[0].cust, "Gary");
            assert.equal(docs[0].emp, "Bob");
        });

        it("pipeline() (gh-5825)", () => {
            const aggregate = new Aggregate();

            const pipeline = aggregate
                .model(db.model("Employee"))
                .match({ sal: { $lt: 16000 } })
                .pipeline();

            assert.deepEqual(pipeline, [{ $match: { sal: { $lt: 16000 } } }]);
        });

        it("explain()", async () => {
            const aggregate = new Aggregate();

            const version = await new Promise((resolve, reject) => {
                start.mongodVersion((err, version) => {
                    err ? reject(err) : resolve(version);
                });
            });


            const mongo26 = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
            if (!mongo26) {
                return;
            }

            const output = await aggregate
                .model(db.model("Employee"))
                .match({ sal: { $lt: 16000 } })
                .explain();
            assert.ok(output);
            // make sure we got explain output
            assert.ok(output.stages);
        });

        describe("error when empty pipeline", () => {
            it("works", async () => {
                const agg = new Aggregate();

                agg.model(db.model("Employee"));

                await assert.throws(async () => {
                    await agg.exec();
                }, "Aggregate has empty pipeline");
            });
        });

        describe("error when not bound to a model", () => {
            it("works", () => {
                const aggregate = new Aggregate();

                aggregate.skip(0);
                assert.throws(() => {
                    aggregate.exec();
                }, "Aggregate not bound to any Model");
            });
        });

        it("handles aggregation options", async () => {
            const version = await new Promise((resolve, reject) => {
                start.mongodVersion((err, version) => {
                    err ? reject(err) : resolve(version);
                });
            });

            const mongo26orGt = version[0] > 2 || (version[0] === 2 && version[1] >= 6);

            const m = db.model("Employee");
            const match = { $match: { sal: { $gt: 15000 } } };
            const pref = "primaryPreferred";
            const aggregate = m.aggregate(match).read(pref);
            if (mongo26orGt) {
                aggregate.allowDiskUse(true);
            }

            assert.equal(aggregate.options.readPreference.mode, pref);
            if (mongo26orGt) {
                assert.equal(aggregate.options.allowDiskUse, true);
            }

            const docs = await aggregate.exec();
            assert.equal(1, docs.length);
            assert.equal(docs[0].sal, 18000);
        });

        describe("middleware (gh-5251)", () => {
            let db;

            before(() => {
                db = start();
            });

            after(async () => {
                await db.close();
            });

            it("pre", async () => {
                const s = new Schema({ name: String });

                let called = 0;

                s.pre("aggregate", (next) => {
                    ++called;
                    next();
                });

                const M = db.model("gh5251", s);

                const res = await M.aggregate([{ $match: { name: "test" } }]);
                assert.deepEqual(res, []);
                assert.equal(called, 1);
            });

            it("post", async () => {
                const s = new Schema({ name: String });

                const calledWith = [];
                s.post("aggregate", (res, next) => {
                    calledWith.push(res);
                    next();
                });

                const M = db.model("gh5251_post", s);
                const res = await M.aggregate([{ $match: { name: "test" } }]);
                assert.deepEqual(res, []);
                assert.equal(calledWith.length, 1);
                assert.deepEqual(calledWith[0], []);
            });

            it("error handler with agg error", async () => {
                const s = new Schema({ name: String });

                const calledWith = [];
                s.post("aggregate", (error, res, next) => {
                    calledWith.push(error);
                    next();
                });

                const M = db.model("gh5251_error_agg", s);

                const error = await assert.throws(async () => {
                    await M.aggregate([{ $fakeStage: { name: "test" } }]);
                }, "Unrecognized pipeline stage");

                assert.equal(calledWith.length, 1);
                assert.equal(calledWith[0], error);
            });

            it("error handler with pre error", async () => {
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

                const error = await assert.throws(async () => {
                    await M.aggregate([{ $match: { name: "test" } }]);
                }, "woops");

                assert.equal(calledWith.length, 1);
                assert.equal(calledWith[0], error);
            });

            it("with agg cursor", async () => {
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
                await M
                    .aggregate([{ $match: { name: "test" } }])
                    .cursor({ useMongooseAggCursor: true })
                    .exec()
                    .eachAsync(() => {
                        ++numDocs;
                    });
                assert.equal(numDocs, 0);
                assert.equal(calledPre, 1);
                assert.equal(calledPost, 0);
            });
        });

        it("readPref from schema (gh-5522)", () => {
            const schema = new Schema({ name: String }, { read: "secondary" });
            const M = db.model("gh5522", schema);
            const a = M.aggregate();
            assert.equal(a.options.readPreference.mode, "secondary");

            a.read("secondaryPreferred");

            assert.equal(a.options.readPreference.mode, "secondaryPreferred");
        });
    });

    it("cursor (gh-3160)", async () => {
        const db = start();

        const MyModel = db.model("gh3160", { name: String });

        await MyModel.create({ name: "test" });
        const cursor = await MyModel
            .aggregate([{ $match: { name: "test" } }, { $project: { name: "$name" } }])
            .allowDiskUse(true)
            .cursor({ batchSize: 2500, async: true })
            .exec();
        assert.ok(cursor);
        await cursor.toArray();
        await db.close();
    });

    it.todo("cursor() without options (gh-3855)", async () => {
        const db = start();

        const MyModel = db.model("gh3855", { name: String });

        await new Promise((resolve) => db.on("open", resolve));

        const cursor = MyModel
            .aggregate([{ $match: { name: "test" } }])
            .cursor()
            .exec();
        assert.ok(cursor instanceof adone.std.stream.Readable);
    });

    it("cursor() with useMongooseAggCursor (gh-5145)", async () => {
        const db = start();

        const MyModel = db.model("gh5145", { name: String });

        const cursor = MyModel
            .aggregate([{ $match: { name: "test" } }])
            .cursor({ useMongooseAggCursor: true })
            .exec();
        assert.ok(cursor instanceof adone.std.stream.Readable);
    });

    it("cursor() with useMongooseAggCursor works (gh-5145) (gh-5394)", async () => {
        const db = start();

        const MyModel = db.model("gh5394", { name: String });

        await MyModel.create({ name: "test" });

        const docs = [];
        await MyModel
            .aggregate([{ $match: { name: "test" } }])
            .cursor({ useMongooseAggCursor: true })
            .exec()
            .eachAsync((doc) => {
                docs.push(doc);
            });
        assert.equal(docs.length, 1);
        assert.equal(docs[0].name, "test");
    });

    it("cursor() eachAsync (gh-4300)", async () => {
        const db = start();

        const MyModel = db.model("gh4300", { name: String });

        let cur = 0;
        const expectedNames = ["Axl", "Slash"];
        await MyModel.create([{ name: "Axl" }, { name: "Slash" }]);
        await MyModel.aggregate([{ $sort: { name: 1 } }])
            .cursor()
            .exec()
            .eachAsync((doc) => {
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
            });
        assert.equal(cur, 2);
    });

    it("ability to add noCursorTimeout option (gh-4241)", async () => {
        const db = start();

        const MyModel = db.model("gh4241", {
            name: String
        });

        const cursor = await MyModel
            .aggregate([{ $match: { name: "test" } }])
            .addCursorFlag("noCursorTimeout", true)
            .cursor({ async: true })
            .exec();
        assert.ok(cursor.s.cmd.noCursorTimeout);
    });

    it("query by document (gh-4866)", async () => {
        const db = start();

        const MyModel = db.model("gh4866", {
            name: String
        });

        const doc = await MyModel.create({ name: "test" });
        await MyModel.aggregate([{ $match: doc }]);
    });

    it("sort by text score (gh-5258)", async () => {
        const db = start();

        const mySchema = new Schema({ test: String });
        mySchema.index({ test: "text" });
        const M = db.model("gh5258", mySchema);

        await new Promise((resolve) => M.on("index", resolve));

        await M.create([{ test: "test test" }, { test: "a test" }]);
        const aggregate = M.aggregate();
        aggregate.match({ $text: { $search: "test" } });
        aggregate.sort({ score: { $meta: "textScore" } });

        const res = await aggregate.exec();
        assert.equal(res.length, 2);
        assert.equal(res[0].test, "test test");
        assert.equal(res[1].test, "a test");
    });
});
