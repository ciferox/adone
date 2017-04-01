const { is } = adone;
const testDb = adone.std.path.resolve(__dirname, "workspace/test.db");
const _ = require("underscore");
const async = require("async");
const rimraf = require("rimraf");
const Model = adone.database.db.DB;
const Cursor = adone.database.db.Cursor;

describe("Cursor", () => {
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

    describe("Without sorting", () => {

        beforeEach((done) => {
            d.insert({ age: 5 }, (err) => {
                d.insert({ age: 57 }, (err) => {
                    d.insert({ age: 52 }, (err) => {
                        d.insert({ age: 23 }, (err) => {
                            d.insert({ age: 89 }, (err) => {
                                return done();
                            });
                        });
                    });
                });
            });
        });

        it("Without query, an empty query or a simple query and no skip or limit", (done) => {
            async.waterfall([
                function (cb) {
                    const cursor = new Cursor(d);
                    cursor.exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 5);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 5;
                        })[0].age, 5);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 57;
                        })[0].age, 57);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 52;
                        })[0].age, 52);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 23;
                        })[0].age, 23);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 89;
                        })[0].age, 89);
                        cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 5);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 5;
                        })[0].age, 5);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 57;
                        })[0].age, 57);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 52;
                        })[0].age, 52);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 23;
                        })[0].age, 23);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 89;
                        })[0].age, 89);
                        cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, { age: { $gt: 23 } });
                    cursor.exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 3);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 57;
                        })[0].age, 57);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 52;
                        })[0].age, 52);
                        assert.equal(_.filter(docs, (doc) => {
                            return doc.age === 89;
                        })[0].age, 89);
                        cb();
                    });
                }
            ], done);
        });

        it("With an empty collection", (done) => {
            async.waterfall([
                function (cb) {
                    d.remove({}, { multi: true }, (err) => {
                        return cb(err);
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d);
                    cursor.exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 0);
                        cb();
                    });
                }
            ], done);
        });

        it("With a limit", (done) => {
            const cursor = new Cursor(d);
            cursor.limit(3);
            cursor.exec((err, docs) => {
                assert.isNull(err);
                assert.equal(docs.length, 3);
                // No way to predict which results are returned of course ...
                done();
            });
        });

        it("With a skip", (done) => {
            const cursor = new Cursor(d);
            cursor.skip(2).exec((err, docs) => {
                assert.isNull(err);
                assert.equal(docs.length, 3);
                // No way to predict which results are returned of course ...
                done();
            });
        });

        it("With a skip, testing count", (done) => {
            const cursor = new Cursor(d);
            cursor.skip(2).count((err, c) => {
                assert.isNull(err);
                assert.equal(c, 3);
                done();
            });
        });

        it("With a filter", (done) => {
            const cursor = new Cursor(d);
            cursor.filter((x) => {
                return x.age > 50;
            }).count((err, c) => {
                assert.isNull(err);
                assert.equal(c, 3);
                done();
            });
        });

        it("With a filter, catch the error in the filter", (done) => {
            const cursor = new Cursor(d);
            cursor.filter((x) => {
                return blablabla;
            }).count((err, c) => {
                assert.isDefined(err);
                assert.isUndefined(c);
                assert.include(err.message, "blablabla");
                done();
            });
        });

        it("With a limit and a skip and method chaining", (done) => {
            const cursor = new Cursor(d);
            cursor.limit(4).skip(3);   // Only way to know that the right number of results was skipped is if limit + skip > number of results
            cursor.exec((err, docs) => {
                assert.isNull(err);
                assert.equal(docs.length, 2);
                // No way to predict which results are returned of course ...
                done();
            });
        });

        it("With a limit and a sorter function", (done) => {
            const cursor = new Cursor(d);
            cursor.sort((a, b) => {
                return a.age - b.age
                    ;
            }).limit(3);
            cursor.exec((err, docs) => {
                assert.isNull(err);

                assert.equal(docs.length, 3);
                assert.deepEqual(_.pluck(docs, "age"), [5, 23, 52]);
                // No way to predict which results are returned of course ...
                done();
            });
        });
    });   // ===== End of 'Without sorting' =====


    describe("Sorting of the results", () => {

        beforeEach((done) => {
            // We don't know the order in which docs wil be inserted but we ensure correctness by testing both sort orders
            d.insert({ age: 5 }, (err) => {
                d.insert({ age: 57 }, (err) => {
                    d.insert({ age: 52 }, (err) => {
                        d.insert({ age: 23 }, (err) => {
                            d.insert({ age: 89 }, (err) => {
                                return done();
                            });
                        });
                    });
                });
            });
        });

        it("Using one sort", (done) => {
            let cursor, i;

            cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });
            cursor.exec((err, docs) => {
                assert.isNull(err);
                // Results are in ascending order
                for (i = 0; i < docs.length - 1; i += 1) {
                    assert(docs[i].age < docs[i + 1].age);
                }

                cursor.sort({ age: -1 });
                cursor.exec((err, docs) => {
                    assert.isNull(err);
                    // Results are in descending order
                    for (i = 0; i < docs.length - 1; i += 1) {
                        assert(docs[i].age > docs[i + 1].age);
                    }

                    done();
                });
            });
        });

        it("With an empty collection", (done) => {
            async.waterfall([
                function (cb) {
                    d.remove({}, { multi: true }, (err) => {
                        return cb(err);
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 });
                    cursor.exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 0);
                        cb();
                    });
                }
            ], done);
        });

        it("Ability to chain sorting and exec", (done) => {
            let i;
            async.waterfall([
                function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 }).exec((err, docs) => {
                        assert.isNull(err);
                        // Results are in ascending order
                        for (i = 0; i < docs.length - 1; i += 1) {
                            assert(docs[i].age < docs[i + 1].age);
                        }
                        cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: -1 }).exec((err, docs) => {
                        assert.isNull(err);
                        // Results are in descending order
                        for (i = 0; i < docs.length - 1; i += 1) {
                            assert(docs[i].age > docs[i + 1].age);
                        }
                        cb();
                    });
                }
            ], done);
        });

        it("Using limit and sort", (done) => {
            let i;
            async.waterfall([
                function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 }).limit(3).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 3);
                        assert.equal(docs[0].age, 5);
                        assert.equal(docs[1].age, 23);
                        assert.equal(docs[2].age, 52);
                        cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: -1 }).limit(2).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 2);
                        assert.equal(docs[0].age, 89);
                        assert.equal(docs[1].age, 57);
                        cb();
                    });
                }
            ], done);
        });

        it("Using a limit higher than total number of docs shouldnt cause an error", (done) => {
            let i;
            async.waterfall([
                function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 }).limit(7).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 5);
                        assert.equal(docs[0].age, 5);
                        assert.equal(docs[1].age, 23);
                        assert.equal(docs[2].age, 52);
                        assert.equal(docs[3].age, 57);
                        assert.equal(docs[4].age, 89);
                        cb();
                    });
                }
            ], done);
        });

        it("Using limit and skip with sort", (done) => {
            let i;
            async.waterfall([
                function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 }).limit(1).skip(2).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 1);
                        assert.equal(docs[0].age, 52);
                        cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 }).limit(3).skip(1).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 3);
                        assert.equal(docs[0].age, 23);
                        assert.equal(docs[1].age, 52);
                        assert.equal(docs[2].age, 57);
                        cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: -1 }).limit(2).skip(2).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 2);
                        assert.equal(docs[0].age, 52);
                        assert.equal(docs[1].age, 23);
                        cb();
                    });
                }
            ], done);
        });

        it("Using too big a limit and a skip with sort", (done) => {
            let i;
            async.waterfall([
                function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 }).limit(8).skip(2).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 3);
                        assert.equal(docs[0].age, 52);
                        assert.equal(docs[1].age, 57);
                        assert.equal(docs[2].age, 89);
                        cb();
                    });
                }
            ], done);
        });

        it("Using too big a skip with sort should return no result", (done) => {
            let i;
            async.waterfall([
                function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 }).skip(5).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 0);
                        cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 }).skip(7).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 0);
                        cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 }).limit(3).skip(7).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 0);
                        cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d);
                    cursor.sort({ age: 1 }).limit(6).skip(7).exec((err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 0);
                        cb();
                    });
                }
            ], done);
        });

        it("Sorting strings", (done) => {
            async.waterfall([
                function (cb) {
                    d.remove({}, { multi: true }, (err) => {
                        if (err) {
                            return cb(err);
                        }

                        d.insert({ name: "jako" }, () => {
                            d.insert({ name: "jakeb" }, () => {
                                d.insert({ name: "sue" }, () => {
                                    return cb();
                                });
                            });
                        });
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ name: 1 }).exec((err, docs) => {
                        assert.equal(docs.length, 3);
                        assert.equal(docs[0].name, "jakeb");
                        assert.equal(docs[1].name, "jako");
                        assert.equal(docs[2].name, "sue");
                        return cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ name: -1 }).exec((err, docs) => {
                        assert.equal(docs.length, 3);
                        assert.equal(docs[0].name, "sue");
                        assert.equal(docs[1].name, "jako");
                        assert.equal(docs[2].name, "jakeb");
                        return cb();
                    });
                }
            ], done);
        });

        it("Sorting nested fields with dates", (done) => {
            let doc1, doc2, doc3;

            async.waterfall([
                function (cb) {
                    d.remove({}, { multi: true }, (err) => {
                        if (err) {
                            return cb(err);
                        }

                        d.insert({ event: { recorded: new Date(400) } }, (err, _doc1) => {
                            doc1 = _doc1;
                            d.insert({ event: { recorded: new Date(60000) } }, (err, _doc2) => {
                                doc2 = _doc2;
                                d.insert({ event: { recorded: new Date(32) } }, (err, _doc3) => {
                                    doc3 = _doc3;
                                    return cb();
                                });
                            });
                        });
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ "event.recorded": 1 }).exec((err, docs) => {
                        assert.equal(docs.length, 3);
                        assert.equal(docs[0]._id, doc3._id);
                        assert.equal(docs[1]._id, doc1._id);
                        assert.equal(docs[2]._id, doc2._id);
                        return cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ "event.recorded": -1 }).exec((err, docs) => {
                        assert.equal(docs.length, 3);
                        assert.equal(docs[0]._id, doc2._id);
                        assert.equal(docs[1]._id, doc1._id);
                        assert.equal(docs[2]._id, doc3._id);
                        return cb();
                    });
                }
            ], done);
        });

        it("Sorting when some fields are undefined", (done) => {
            async.waterfall([
                function (cb) {
                    d.remove({}, { multi: true }, (err) => {
                        if (err) {
                            return cb(err);
                        }

                        d.insert({ name: "jako", other: 2 }, () => {
                            d.insert({ name: "jakeb", other: 3 }, () => {
                                d.insert({ name: "sue" }, () => {
                                    d.insert({ name: "henry", other: 4 }, () => {
                                        return cb();
                                    });
                                });
                            });
                        });
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ other: 1 }).exec((err, docs) => {
                        assert.equal(docs.length, 4);
                        assert.equal(docs[0].name, "sue");
                        assert.isUndefined(docs[0].other);
                        assert.equal(docs[1].name, "jako");
                        assert.equal(docs[1].other, 2);
                        assert.equal(docs[2].name, "jakeb");
                        assert.equal(docs[2].other, 3);
                        assert.equal(docs[3].name, "henry");
                        assert.equal(docs[3].other, 4);
                        return cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, { name: { $in: ["suzy", "jakeb", "jako"] } });
                    cursor.sort({ other: -1 }).exec((err, docs) => {
                        assert.equal(docs.length, 2);
                        assert.equal(docs[0].name, "jakeb");
                        assert.equal(docs[0].other, 3);
                        assert.equal(docs[1].name, "jako");
                        assert.equal(docs[1].other, 2);
                        return cb();
                    });
                }
            ], done);
        });

        it("Sorting when all fields are undefined", (done) => {
            async.waterfall([
                function (cb) {
                    d.remove({}, { multi: true }, (err) => {
                        if (err) {
                            return cb(err);
                        }

                        d.insert({ name: "jako" }, () => {
                            d.insert({ name: "jakeb" }, () => {
                                d.insert({ name: "sue" }, () => {
                                    return cb();
                                });
                            });
                        });
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ other: 1 }).exec((err, docs) => {
                        assert.equal(docs.length, 3);
                        return cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, { name: { $in: ["sue", "jakeb", "jakob"] } });
                    cursor.sort({ other: -1 }).exec((err, docs) => {
                        assert.equal(docs.length, 2);
                        return cb();
                    });
                }
            ], done);
        });

        it("Multiple consecutive sorts", (done) => {
            async.waterfall([
                function (cb) {
                    d.remove({}, { multi: true }, (err) => {
                        if (err) {
                            return cb(err);
                        }

                        d.insert({ name: "jako", age: 43, nid: 1 }, () => {
                            d.insert({ name: "jakeb", age: 43, nid: 2 }, () => {
                                d.insert({ name: "sue", age: 12, nid: 3 }, () => {
                                    d.insert({ name: "zoe", age: 23, nid: 4 }, () => {
                                        d.insert({ name: "jako", age: 35, nid: 5 }, () => {
                                            return cb();
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ name: 1, age: -1 }).exec((err, docs) => {
                        assert.equal(docs.length, 5);

                        assert.equal(docs[0].nid, 2);
                        assert.equal(docs[1].nid, 1);
                        assert.equal(docs[2].nid, 5);
                        assert.equal(docs[3].nid, 3);
                        assert.equal(docs[4].nid, 4);
                        return cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ name: 1, age: 1 }).exec((err, docs) => {
                        assert.equal(docs.length, 5);

                        assert.equal(docs[0].nid, 2);
                        assert.equal(docs[1].nid, 5);
                        assert.equal(docs[2].nid, 1);
                        assert.equal(docs[3].nid, 3);
                        assert.equal(docs[4].nid, 4);
                        return cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ age: 1, name: 1 }).exec((err, docs) => {
                        assert.equal(docs.length, 5);

                        assert.equal(docs[0].nid, 3);
                        assert.equal(docs[1].nid, 4);
                        assert.equal(docs[2].nid, 5);
                        assert.equal(docs[3].nid, 2);
                        assert.equal(docs[4].nid, 1);
                        return cb();
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ age: 1, name: -1 }).exec((err, docs) => {
                        assert.equal(docs.length, 5);

                        assert.equal(docs[0].nid, 3);
                        assert.equal(docs[1].nid, 4);
                        assert.equal(docs[2].nid, 5);
                        assert.equal(docs[3].nid, 1);
                        assert.equal(docs[4].nid, 2);
                        return cb();
                    });
                }
            ], done);
        });

        it("Similar data, multiple consecutive sorts", (done) => {
            let i, j, id
                , companies = ["acme", "milkman", "zoinks"]
                , entities = []
                ;

            async.waterfall([
                function (cb) {
                    d.remove({}, { multi: true }, (err) => {
                        if (err) {
                            return cb(err);
                        }

                        id = 1;
                        for (i = 0; i < companies.length; i++) {
                            for (j = 5; j <= 100; j += 5) {
                                entities.push({
                                    company: companies[i],
                                    cost: j,
                                    nid: id
                                });
                                id++;
                            }
                        }

                        async.each(entities, (entity, callback) => {
                            d.insert(entity, () => {
                                callback();
                            });
                        }, (err) => {
                            return cb();
                        });
                    });
                }
                , function (cb) {
                    const cursor = new Cursor(d, {});
                    cursor.sort({ company: 1, cost: 1 }).exec((err, docs) => {
                        assert.equal(docs.length, 60);

                        for (let i = 0; i < docs.length; i++) {
                            assert.equal(docs[i].nid, i + 1);
                        }
                        return cb();
                    });
                }
            ], done);
        });

    });   // ===== End of 'Sorting' =====


    describe("Map / Reduce", () => {
        let doc1, doc2, doc3, doc4, doc0;


        beforeEach((done) => {
            // We don't know the order in which docs wil be inserted but we ensure correctness by testing both sort orders
            d.insert({ age: 5, name: "Jo", planet: "B" }, (err, _doc0) => {
                doc0 = _doc0;
                d.insert({ age: 57, name: "Louis", planet: "R" }, (err, _doc1) => {
                    doc1 = _doc1;
                    d.insert({ age: 52, name: "Grafitti", planet: "C" }, (err, _doc2) => {
                        doc2 = _doc2;
                        d.insert({ age: 23, name: "LM", planet: "S" }, (err, _doc3) => {
                            doc3 = _doc3;
                            d.insert({ age: 89, planet: "Earth" }, (err, _doc4) => {
                                doc4 = _doc4;
                                return done();
                            });
                        });
                    });
                });
            });
        });

        it("basic map test", (done) => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });   // For easier finding

            cursor.map((x) => {
                return _.pick(x, "age", "name");
            });
            cursor.exec((err, docs) => {
                assert.isNull(err);
                assert.equal(docs.length, 5);
                assert.deepEqual(docs[0], { age: 5, name: "Jo" });
                assert.deepEqual(docs[1], { age: 23, name: "LM" });
                assert.deepEqual(docs[2], { age: 52, name: "Grafitti" });
                assert.deepEqual(docs[3], { age: 57, name: "Louis" });
                assert.deepEqual(docs[4], { age: 89 });   // No problems if one field to take doesn't exist

                done();
            });
        });

        it("functions are applied in order - filter, sort, (limit/skip), map, reduce", (done) => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });   // For easier finding

            cursor.filter((x) => {
                return x.age < 30;
            });

            let mapCalled = 0;
            cursor.map((x, i, all) => {
                mapCalled++;
                return x.age;
            });

            cursor.reduce((a, b) => {
                return a + b;
            });

            cursor.exec((err, res) => {
                assert.isNull(err);
                assert.equal(res, 28);
                assert.equal(mapCalled, 2);  // Make sure filter has executed when we ran map

                done();
            });
        });


        it("functions are applied in order - (filter), sort, limit/skip, map, reduce", (done) => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });   // For easier finding
            cursor.limit(2).skip(1);

            let mapCalled = 0;
            cursor.map((x) => {
                mapCalled++;
                return x.age;
            });

            cursor.reduce((a, b) => {
                return a + b;
            }, 5);

            cursor.exec((err, res) => {
                assert.isNull(err);
                assert.equal(res, 80);

                assert.equal(mapCalled, 2);  // Make sure filter has executed when we ran map

                done();
            });
        });

        it("map/reduce only mode", (done) => {
            const cursor = new Cursor(d, {});

            cursor.map((x, i) => {
                if (x.age < 30) {
                    return x.age;
                }
                return 0;
            });

            cursor.reduce((a, b) => {
                return a + b;
            });

            cursor.exec((err, res) => {
                assert.isNull(err);
                assert.equal(res, 28);

                done();
            });
        });


        it("reduce - initial value", (done) => {
            const cursor = new Cursor(d, {});

            cursor.map((x, i) => {
                if (x.age < 30) {
                    return x.age;
                }
                return 0;
            });

            cursor.reduce((a, b) => {
                return a + b;
            }, 2);

            cursor.exec((err, res) => {
                assert.isNull(err);
                assert.equal(res, 30);

                done();
            });
        });



        it("aggregate", (done) => {
            const cursor = new Cursor(d, {});

            cursor.aggregate((res) => {
                return res.length;
            });

            cursor.exec((err, res) => {
                assert.isNull(err);
                assert.equal(res, 5);

                done();
            });
        });
    });   // ==== End of 'Map / Reduce' ====



    describe("Streaming cursor", () => {

        let doc0, doc1, doc2, doc3, doc4;
        beforeEach((done) => {
            // We don't know the order in which docs wil be inserted but we ensure correctness by testing both sort orders
            d.insert({ age: 5, name: "Jo", planet: "B" }, (err, _doc0) => {
                doc0 = _doc0;
                d.insert({ age: 57, name: "Louis", planet: "R" }, (err, _doc1) => {
                    doc1 = _doc1;
                    d.insert({ age: 52, name: "Grafitti", planet: "C" }, (err, _doc2) => {
                        doc2 = _doc2;
                        d.insert({ age: 23, name: "LM", planet: "S" }, (err, _doc3) => {
                            doc3 = _doc3;
                            d.insert({ age: 89, planet: "Earth" }, (err, _doc4) => {
                                doc4 = _doc4;
                                return done();
                            });
                        });
                    });
                });
            });
        });

        it("basic test", (done) => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });   // For easier finding

            const items = [];
            cursor.stream((d) => {
                items.push(d);
            }, () => {
                assert.equal(items.length, 5);
                done();
            });
        });

    });   // ==== End of 'Streaming cursor' ====


    describe("getMatchesStream", () => {
        // Comparison operators: $lt $lte $gt $gte $ne $in $nin $regex $exists $size
        // Logical operators: $or $and $not $where
        // We need to test all operators supported by getMatches

        /* Maybe we can reuse that dataset? */
        beforeEach((done) => {
            d.insert([
                { age: 27, name: "Kelly", department: "support" },
                { age: 31, name: "Jim", department: "sales" },
                { age: 33, name: "Dwight", department: "sales" },
                { age: 45, name: "Michael", department: "management" },
                { age: 46, name: "Toby", department: "hr" },
                { age: 45, name: "Phyllis", department: "sales" },
                { age: 23, name: "Ryan", department: "sales" }

            ], (err) => {
                done();
            });
        });

        it("events ids, data, ready fire and in the proper order", (done) => {
            const stream = Cursor.getMatchesStream(d, {});
            const ev = [];
            stream.on("ids", () => {
                ev.push("ids");
            });
            stream.on("data", (d) => {
                ev.push("data");
            });
            stream.on("ready", () => {
                ev.push("ready");

                assert.deepEqual(ev, ["ids", "data", "data", "data", "data", "data", "data", "data", "ready"]);

                done();
            });

        });


        it("data events stop firing when stream is closed", (done) => {
            const stream = Cursor.getMatchesStream(d, {});
            let ev = [];
            stream.on("ids", () => {
                ev.push("ids");
            });
            stream.on("data", (d) => {
                ev.push("data"); stream.close();
            });
            stream.on("ready", () => {
                ev.push("ready");

                assert.deepEqual(ev, ["ids", "data", "ready"]);

                // Run another test, this time close right after .ids
                const stream = Cursor.getMatchesStream(d, {});
                stream.on("error", (e) => {
                    done(e);
                });

                ev = [];
                stream.on("ids", () => {
                    ev.push("ids"); stream.close();
                });
                stream.on("data", (d) => {
                    ev.push("data");
                });
                stream.on("ready", () => {
                    ev.push("ready");

                    assert.deepEqual(ev, ["ids", "ready"]);

                    done();
                });
            });
        });


        it("intercept the default trigger, call it manually", (done) => {
            const stream = Cursor.getMatchesStream(d, {});
            stream.on("error", (e) => {
                done(e);
            });
            stream.removeListener("ids", stream.trigger);

            const ev = [];
            stream.on("ids", (ids) => {
                ev.push("ids"); stream.trigger(ids.slice(0, 3));
            });
            stream.on("data", (d) => {
                ev.push("data");
            });
            stream.on("ready", () => {
                ev.push("ready");

                assert.deepEqual(ev, ["ids", "data", "data", "data", "ready"]);

                done();
            });
        });


        it("lock/unlock value from the stream", (done) => {

            Cursor.getMatchesStream(d, { name: "Kelly" }).on("data", (d1) => {
                const v1 = d1.lock();
                assert.isDefined(d1.id);
                assert.isDefined(v1);
                assert.equal(v1.name, "Kelly");
                v1.age = 29;

                Cursor.getMatchesStream(d, { name: "Kelly" }).on("data", (d2) => {
                    const v2 = d2.lock();
                    assert.equal(v2, v1);

                    d1.unlock();
                    d2.unlock();

                    Cursor.getMatchesStream(d, { name: "Kelly" }).on("data", (d3) => {
                        assert.notEqual(d3.lock(), v1);
                        d3.unlock();
                        done();
                    });
                });

            });

        });
    });  // ===== End of 'getMatches' =====


    describe("Live query", () => {
        beforeEach((done) => {
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

        it("Updates properly", (done) => {
            /*
             * We do things on the dataset, expecting certain results after updating the live query
             * We test removing, inserting, updating and if modifying an object we don't care about triggers live query update
             */
            const expected = [
                [ // Default results
                    { age: 33, name: "Dwight", department: "sales", address: { city: "Scranton" } },
                    { age: 31, name: "Jim", department: "sales", address: { city: "Scranton" } },
                    { age: 45, name: "Phyllis", department: "sales" },
                    { age: 23, name: "Ryan", department: "sales" }
                ], [ // Remove Jim
                    { age: 33, name: "Dwight", department: "sales", address: { city: "Scranton" } },
                    { age: 45, name: "Phyllis", department: "sales" },
                    { age: 23, name: "Ryan", department: "sales" }
                ], [ // Add Stanley
                    { age: 33, name: "Dwight", department: "sales", address: { city: "Scranton" } },
                    { age: 45, name: "Phyllis", department: "sales" },
                    { age: 23, name: "Ryan", department: "sales" },
                    { name: "Stanley", age: 58, department: "sales" }
                ], [ // Update Phyllis
                    { age: 33, name: "Dwight", department: "sales", address: { city: "Scranton" } },
                    { age: 46, name: "Phyllis", department: "sales" },
                    { age: 23, name: "Ryan", department: "sales" },
                    { name: "Stanley", age: 58, department: "sales" }
                ]
            ];

            const modifiers = [function () {
                d.remove({ name: "Jim" }, {}, _.noop);
            }, function () {
                d.save({ name: "Stanley", age: 58, department: "sales" }, _.noop);
            }, function () {
                d.update({ name: "Phyllis" }, { $inc: { age: 1 } }, {}, _.noop);
            }, function () { }];


            const query = d.find({ department: "sales" }).sort({ name: 1 }).live();
            d.on("liveQueryUpdate", () => {
                let exp = expected.shift(), mod = modifiers.shift();

                //console.log(query.res.map(function(x){return x.name}), exp.map(function(x){return x.name}));
                assert.deepEqual(query.res.map((x) => {
                    return _.omit(x, "_id");
                }), exp);
                mod();

                if (!expected.length) {
                    done();
                }
            });
        });

        it("Doesn't update for no reason", (done) => {
            done = _.once(done);

            const query = d.find({ department: "sales" }).sort({ name: 1 }).live();

            let called = false;
            d.on("liveQueryUpdate", () => {
                if (called) {
                    return done(new Error("liveQueryUpdate called more than once"));
                }
                called = true;

                assert.equal(query.res.length, 4);
            });

            d.once("liveQueryUpdate", () => {
                async.waterfall([function (cb) {
                    d.remove({ name: "Kelly" }, {}, () => {
                        cb();
                    });
                }, function (cb) {
                    d.update({ name: "Michael" }, { $inc: { age: 1 } }, {}, () => {
                        cb()
                            ;
                    });
                }, function (cb) {
                    d.insert({ name: "Plop", department: "service", age: 19 }, () => {
                        cb()
                            ;
                    });
                }], () => {
                    setTimeout(() => {
                        done();
                    }, 300);
                });
            });
        });

        it("Query conditions can be changed dynamically", (done) => {
            done = _.once(done);

            const query = d.find({ department: "sales" }).sort({ name: 1 }).live();

            d.once("liveQueryUpdate", () => {
                assert.equal(query.res.length, 4);

                query.find({ department: "management" }).refresh();
                d.once("liveQueryUpdate", () => {
                    assert.equal(query.res.length, 1);
                    done();
                });

            });

        });

        it("Live query can be stopped", (done) => {
            done = _.once(done);

            const query = d.find({ department: "sales" }).sort({ name: 1 });
            expect(assert).not.to.have.ownProperty("refresh");
            expect(query).not.to.have.ownProperty("stop");
            expect(d.listeners("updated")).to.have.length(0);
            expect(d.listeners("inserted")).to.have.length(0);
            expect(d.listeners("removed")).to.have.length(0);
            expect(d.listeners("reload")).to.have.length(0);
            expect(d.listeners("liveQueryRefresh")).to.have.length(0);

            query.live();
            expect(query).to.have.ownProperty("refresh");
            expect(query).to.have.ownProperty("stop");
            expect(d.listeners("updated")).to.have.length(1);
            expect(d.listeners("inserted")).to.have.length(1);
            expect(d.listeners("removed")).to.have.length(1);
            expect(d.listeners("reload")).to.have.length(1);
            expect(d.listeners("liveQueryRefresh")).to.have.length(1);

            query.stop();
            expect(query).not.to.have.ownProperty("refresh");
            expect(query).not.to.have.ownProperty("stop");
            expect(d.listeners("updated")).to.have.length(0);
            expect(d.listeners("inserted")).to.have.length(0);
            expect(d.listeners("removed")).to.have.length(0);
            expect(d.listeners("reload")).to.have.length(0);
            expect(d.listeners("liveQueryRefresh")).to.have.length(0);
            done();
        });

        it.skip("Can have many live queries in one model", (done) => {
            done = _.once(done);

            // comment one of these two to work
            const liveFind = d.find({}).live();
            const liveCount = d.find({}).count().live();

            d.on("liveQueryUpdate", () => {
                if (liveFind) {
                    assert.equal(liveFind.res.length, 7);
                }

                if (liveCount) {
                    assert.equal(liveCount.res, 7);
                }

                done();
            });
        });

    }); // End of 'Live Query'

});


