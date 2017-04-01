const testDb = adone.std.path.resolve(__dirname, "workspace/test1.db");
const _ = require("underscore");
const async = require("async");
const rimraf = require("rimraf");
//  , document = require('../lib/document')
const Model = adone.database.db.DB;
const { Cursor } = adone.database.db;


describe("Database", () => {
    let d;

    function remove_ids(docs) {
        docs.forEach((d) => {
            delete d._id;
        });
    }

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
                d = new Model("testDb1", { filename: testDb, store: { createIfMissing: true } });

                assert.equal(d.filename, testDb);


                d.reload((err) => {
                    assert.isNull(err);
                    assert.equal(d.getAllData().length, 0);
                    return cb();
                });
            }
        ], (err) => {
            if (err) {
                console.error(err);
            }
            done();
        });
    });

    /*
    describe('Autoloading', function () {
    
      it('Can autoload a database and query it right away', function (done) {
        var fileStr = document.serialize({ _id: '1', a: 5, planet: 'Earth' }) + '\n' + document.serialize({ _id: '2', a: 5, planet: 'Mars' }) + '\n'
          , autoDb = 'workspace/auto.db'
          , db
          ;
        
        fs.writeFileSync(autoDb, fileStr, 'utf8');
        db = new Model({ filename: autoDb, autoload: true })
        
        db.find({}, function (err, docs) {
          assert.isNull(err);
          docs.length, 2);
          done();
        });
      });
      
      it('Throws if autoload fails', function (done) {
        var fileStr = document.serialize({ _id: '1', a: 5, planet: 'Earth' }) + '\n' + document.serialize({ _id: '2', a: 5, planet: 'Mars' }) + '\n' + '{"$$indexCreated":{"fieldName":"a","unique":true}}'
          , autoDb = 'workspace/auto.db'
          , db
          ;
        
        fs.writeFileSync(autoDb, fileStr, 'utf8');
        
        // Check the reload generated an error
        function onload (err) {
          err.errorType, 'uniqueViolated');
          done();
        }
        
        db = new Model({ filename: autoDb, autoload: true, onload: onload })
        
        db.find({}, function (err, docs) {
          done("Find should not be executed since autoload failed");
        });    
      });
   
    });
    */
    describe("Insert", () => {
        it("Able to insert a document in the database, setting an _id if none provided, and retrieve it even after a reload", (done) => {
            d.find({}, (err, docs) => {
                assert.equal(docs.length, 0);

                d.insert({ somedata: "ok" }, (err) => {
                    // The data was correctly updated
                    d.find({}, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 1);
                        assert.equal(Object.keys(docs[0]).length, 2);
                        assert.equal(docs[0].somedata, "ok");
                        assert.isDefined(docs[0]._id);
                        assert.equal(docs[0]._id.length, 16);

                        // After a reload the data has been correctly persisted
                        d.reload((err) => {
                            d.find({}, (err, docs) => {
                                assert.isNull(err);
                                assert.equal(docs.length, 1);
                                assert.equal(Object.keys(docs[0]).length, 2);
                                assert.equal(docs[0].somedata, "ok");
                                assert.isDefined(docs[0]._id);
                                assert.equal(docs[0]._id.length, 16);

                                done();
                            });
                        });
                    });
                });
            });
        });


        it("Can insert multiple documents in the database", (done) => {
            d.find({}, (err, docs) => {
                assert.equal(docs.length, 0);

                d.insert({ somedata: "ok" }, (err) => {
                    d.insert({ somedata: "another" }, (err) => {
                        d.insert({ somedata: "again" }, (err) => {
                            d.find({}, (err, docs) => {
                                assert.equal(docs.length, 3);
                                assert.include(_.pluck(docs, "somedata"), "ok");
                                assert.include(_.pluck(docs, "somedata"), "another");
                                assert.include(_.pluck(docs, "somedata"), "again");
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Can insert and get back from DB complex objects with all primitive and secondary types", (done) => {
            const da = new Date();
            const obj = { a: ["ee", "ff", 42], date: da, subobj: { a: "b", b: "c" } };

            d.insert(obj, (err) => {
                d.findOne({}, (err, res) => {
                    assert.isNull(err);
                    assert.equal(res.a.length, 3);
                    assert.equal(res.a[0], "ee");
                    assert.equal(res.a[1], "ff");
                    assert.equal(res.a[2], 42);
                    assert.equal(res.date.getTime(), da.getTime());
                    assert.equal(res.subobj.a, "b");
                    assert.equal(res.subobj.b, "c");

                    done();
                });
            });
        });

        it("If an object returned from the DB is modified and refetched, the original value should be found", (done) => {
            d.insert({ a: "something" }, () => {
                d.findOne({}, (err, doc) => {
                    assert.equal(doc.a, "something");
                    doc.a = "another thing";
                    assert.equal(doc.a, "another thing");

                    // Re-fetching with findOne should yield the persisted value
                    d.findOne({}, (err, doc) => {
                        assert.equal(doc.a, "something");
                        doc.a = "another thing";
                        assert.equal(doc.a, "another thing");

                        // Re-fetching with find should yield the persisted value
                        d.find({}, (err, docs) => {
                            assert.equal(docs[0].a, "something");

                            done();
                        });
                    });
                });
            });
        });

        it("Cannot insert a doc that has a field beginning with a $ sign", (done) => {
            d.insert({ $something: "atest" }, (err) => {
                assert.isDefined(err);
                done();
            });
        });

        it("If an _id is already given when we insert a document, use that instead of generating a random one", (done) => {
            d.insert({ _id: "test", stuff: true }, (err, newDoc) => {
                if (err) {
                    return done(err);
                }

                assert.equal(newDoc.stuff, true);
                assert.equal(newDoc._id, "test");

                d.insert({ _id: "test", otherstuff: 42 }, (err) => {
                    assert.equal(err.errorType, "uniqueViolated");

                    done();
                });
            });
        });

        it("Modifying the insertedDoc after an insert doesnt change the copy saved in the database", (done) => {
            d.insert({ a: 2, hello: "world" }, (err, newDoc) => {
                newDoc.hello = "changed";

                d.findOne({ a: 2 }, (err, doc) => {
                    assert.equal(doc.hello, "world");
                    done();
                });
            });
        });

        it("Can insert an array of documents at once", (done) => {
            const docs = [{ a: 5, b: "hello" }, { a: 42, b: "world" }];

            d.insert(docs, (err) => {
                d.find({}, (err, docs) => {
                    assert.equal(docs.length, 2);
                    assert.equal(_.find(docs, (doc) => {
                        return doc.a === 5;
                    }).b, "hello");
                    assert.equal(_.find(docs, (doc) => {
                        return doc.a === 42;
                    }).b, "world");

                    // The data has been persisted correctly
                    /*
                    data = _.filter(fs.readFileSync(testDb, 'utf8').split('\n'), function (line) { return line.length > 0; });
                    data.length, 2);
                    document.deserialize(data[0]).a, 5);
                    document.deserialize(data[0]).b, 'hello');
                    document.deserialize(data[1]).a, 42);
                    document.deserialize(data[1]).b, 'world');
                    */

                    done();
                });
            });
        });

        it("If a bulk insert violates a constraint, all changes are rolled back", (done) => {
            const docs = [{ a: 5, b: "hello" }, { a: 42, b: "world" }, { a: 5, b: "bloup" }, { a: 7 }];

            d.ensureIndex({ fieldName: "a", unique: true });

            d.insert(docs, (err) => {
                assert.equal(err.errorType, "uniqueViolated");

                d.find({}, (err, docs) => {
                    // Datafile only contains index definition
                    //var datafileContents = document.deserialize(fs.readFileSync(testDb, 'utf8'));
                    //assert.deepEqual(datafileContents, { $$indexCreated: { fieldName: 'a', unique: true } });
                    assert.equal(docs.length, 0);

                    done();
                });
            });
        });

        it("Can insert a doc with id 0", (done) => {
            d.insert({ _id: 0, hello: "world" }, (err, doc) => {
                assert.equal(doc._id, 0);
                assert.equal(doc.hello, "world");
                done();
            });
        });

        /**
         * Complicated behavior here. Basically we need to test that when a user function throws an exception, it is not caught
         * in NeDB and the callback called again, transforming a user error into a NeDB error.
         *
         * So we need a way to check that the callback is called only once and the exception thrown is indeed the client exception
         * Mocha's exception handling mechanism interferes with this since it already registers a listener on uncaughtException
         * which we need to use since findOne is not called in the same turn of the event loop (so no try/catch)
         * So we remove all current listeners, put our own which when called will register the former listeners (incl. Mocha's) again.
         *
         * Note: maybe using an in-memory only NeDB would give us an easier solution
         */
        it("If the callback throws an uncaught execption, dont catch it inside findOne, this is userspace concern", (done) => {
            let tryCount = 0;
            const currentUncaughtExceptionHandlers = process.listeners("uncaughtException");
            let i;

            process.removeAllListeners("uncaughtException");

            process.on("uncaughtException", function MINE(ex) {
                for (i = 0; i < currentUncaughtExceptionHandlers.length; i += 1) {
                    process.on("uncaughtException", currentUncaughtExceptionHandlers[i]);
                }

                assert.equal(ex, "SOME EXCEPTION");
                process.removeListener("uncaughtException", MINE);

                done();
            });

            d.insert({ a: 5 }, () => {
                d.findOne({ a: 5 }, (err, doc) => {
                    if (tryCount === 0) {
                        tryCount += 1;
                        throw "SOME EXCEPTION";
                    } else {
                        done("Callback was called twice");
                    }
                });
            });
        });

        it("If the callback throws an uncaught execption, dont catch it inside update, this is userspace concern", (done) => {
            let tryCount = 0;
            const currentUncaughtExceptionHandlers = process.listeners("uncaughtException");
            let i;

            process.removeAllListeners("uncaughtException");

            process.on("uncaughtException", function MINE(ex) {
                for (i = 0; i < currentUncaughtExceptionHandlers.length; i += 1) {
                    process.on("uncaughtException", currentUncaughtExceptionHandlers[i]);
                }

                assert.equal(ex, "SOME EXCEPTION");
                process.removeListener("uncaughtException", MINE);
                done();
            });

            d.insert({ a: 5 }, () => {
                d.update({ a: 5 }, { a: 6 }, (err, count) => {
                    if (tryCount === 0) {
                        tryCount += 1;
                        throw "SOME EXCEPTION";
                    } else {
                        done("Callback was called twice");
                    }
                });
            });
        });


        it("Use .save for inserting a document, then updating", (done) => {
            d.find({}, (err, docs) => {
                assert.equal(docs.length, 0);

                d.save({ a: 5 }, (err, doc) => {
                    assert.isNull(err);
                    assert.isDefined(doc._id);

                    d.findOne({ _id: doc._id }, (err, doc1) => {

                        assert.isNull(err);
                        assert.isDefined(doc1._id);
                        assert.equal(doc1._id, doc._id);

                        d.save({ _id: doc1._id, a: 6 }, (err, doc2) => {
                            assert.isNull(err);
                            assert.isDefined(doc2._id);
                            assert.equal(doc2._id, doc._id);
                            assert.equal(doc2.a, 6);
                            done();
                        });
                    });
                });
            });
        });

        it("Use .save for bulk inserting documents, updating some", (done) => {
            d.find({}, (err, docs) => {
                assert.equal(docs.length, 0);

                d.save([{ a: 5 }, { a: 10 }, { a: 12 }], (err, docs) => {
                    assert.isNull(err);
                    assert.equal(docs.length, 3);

                    d.findOne({ _id: docs[0]._id }, (err, doc1) => {
                        assert.isNull(err);
                        assert.equal(doc1.a, 5);

                        doc1.b = 15;
                        d.save([doc1, { a: 15 }], (err, docs) => {
                            assert.isNull(err);
                            assert.equal(docs.length, 2);

                            d.findOne({ _id: docs[0]._id }, (err, doc2) => {
                                assert.equal(doc2.a, 5);
                                assert.equal(doc2.b, 15);

                                d.find({}, (err, docs) => {
                                    assert.isNull(err);
                                    assert.equal(docs.length, 4);
                                    done();
                                });
                            });
                        });

                    });
                });

            });
        });

        describe("Events", () => {
            describe("construct", () => {
                it("Emits the construct event when a doc is constructed", (done) => {
                    let constructed = false;
                    d.on("construct", (doc) => {
                        assert.equal(doc.a, 1);
                        constructed = true;
                    });
                    d.insert({ a: 1 }, (err, doc) => {
                        if (err) {
                            throw err;
                        }
                        assert.isTrue(constructed, "doc was constructed");
                        done();
                    });
                });
            });

            describe("when a document is inserted", () => {
                it("Emits the inserted event with the inserted doc", (done) => {
                    let inserted = false;
                    d.on("inserted", (docs) => {
                        remove_ids(docs);
                        assert.deepEqual(docs, [{ a: 1 }]);
                        inserted = true;
                    });
                    d.insert({ a: 1 }, (err, doc) => {
                        if (err) {
                            throw err;
                        }
                        assert.isTrue(inserted, "doc was inserted");
                        done();
                    });
                });
            });

            describe("when multiple documents are inserted", () => {
                it("Emits the inserted event with the inserted docs", (done) => {
                    let inserted = false;
                    d.on("inserted", (docs) => {
                        remove_ids(docs);
                        assert.deepEqual(_.sortBy(docs, "a"), [{ a: 1 }, { a: 2 }]);
                        inserted = true;
                    });
                    d.insert([{ a: 1 }, { a: 2 }], (err, doc) => {
                        if (err) {
                            throw err;
                        }
                        assert.isTrue(inserted);
                        done();
                    });
                });
            });

            describe("when the insert fails", () => {
                it("The inserted event is not emitted", (done) => {
                    d.ensureIndex({ fieldName: "a", unique: true }, (err) => {
                        if (err) {
                            throw err;
                        }
                    });
                    d.insert({ a: 1 }, (err, doc) => {
                        if (err) {
                            throw err;
                        }
                        d.on("inserted", (docs) => {
                            throw new Error("Inserted emitted");
                        });
                        d.insert({ a: 1 }, (err, doc) => {
                            setTimeout(done, 100);
                        });
                    });
                });
            });

        });
    });   // ==== End of 'Insert' ==== //


    describe("#getIdsForQuery", () => {
        const getCandidates = function (query, sort, cb) {
            cb = _.once(cb);
            const stream = Cursor.getMatchesStream(d, query, sort);
            stream.on("ids", (ids) => {
                stream.close();
                async.map(ids, d.findById.bind(d), (err, candidates) => {
                    cb(candidates);
                });
            });
        };

        it("Auto-indexing works", (done) => {
            assert.equal(d.options.autoIndexing, true);

            d.insert({ tf: 4, r: 6 }, (err, _doc1) => {
                getCandidates({ r: 6, tf: 4 }, null, (data) => {
                    assert.isDefined(d.indexes.tf);
                    assert.isDefined(d.indexes.r);
                    done();
                });
            });
        });


        it.skip("Auto-indexing is debounced", (done) => {
            assert.equal(d.options.autoIndexing, true);

            d.insert({ tf: 4, r: 6 }, (err, _doc1) => {
                getCandidates({ r: 6 }, null, (data) => { });
                setTimeout(() => {
                    getCandidates({ tf: 4 }, null, (data) => { });
                }, 5);

                d.once("indexesReady", (indexes) => {
                    assert.equal(indexes.length, 2);

                    assert.isNotNull(_.find(indexes, (x) => {
                        return x.fieldName === "r";
                    }));
                    assert.isNotNull(_.find(indexes, (x) => {
                        return x.fieldName === "tf";
                    }));

                    done();
                });
            });
        });


        it("Auto-indexing can be disabled", (done) => {
            assert.equal(d.options.autoIndexing, true);
            d.options.autoIndexing = false;

            d.insert({ tf: 4, r: 6 }, (err, _doc1) => {
                getCandidates({ r: 6, tf: 4 }, null, (data) => {
                    assert.isUndefined(d.indexes.tf);
                    assert.isUndefined(d.indexes.r);
                    done();
                });
            });
        });


        // it("Can use a compound index to get docs with a basic match", (done) => {
        //     return done(new Error("not implemented - TODO"));

        //     d.options.autoIndexing = false;
        //     d.ensureIndex({ fieldName: ["tf", "tg"] }, (err) => {
        //         d.insert({ tf: 4, tg: 0, foo: 1 }, () => {
        //             d.insert({ tf: 6, tg: 0, foo: 2 }, () => {
        //                 d.insert({ tf: 4, tg: 1, foo: 3 }, (err, _doc1) => {
        //                     d.insert({ tf: 6, tg: 1, foo: 4 }, () => {
        //                         getCandidates({ tf: 4, tg: 1 }, null, (data) => {
        //                             const doc1 = _.find(data, (d) => {
        //                                 return d._id === _doc1._id;
        //                             })
        //                                 ;

        //                             assert.equal(data.length, 1);
        //                             assert.deepEqual(doc1, { _id: doc1._id, tf: 4, tg: 1, foo: 3 });

        //                             done();
        //                         });
        //                     });
        //                 });
        //             });
        //         });
        //     });
        // });

        it("Can use an index to get docs with a basic match on two indexes", (done) => {
            assert.equal(d.options.autoIndexing, true);

            d.insert({ tf: 4, r: 6 }, (err, _doc1) => {
                d.insert([{ tf: 6 }, { tf: 4, an: "dont match us" }], () => {
                    d.insert({ tf: 4, an: "other", r: 6 }, (err, _doc2) => {
                        d.insert({ tf: 9 }, () => {
                            getCandidates({ r: 6, tf: 4 }, null, (data) => {
                                let doc1 = _.find(data, (d) => {
                                    return d._id === _doc1._id;
                                })
                                    , doc2 = _.find(data, (d) => {
                                        return d._id === _doc2._id;
                                    })
                                    ;

                                assert.equal(data.length, 2);
                                assert.deepEqual(doc1, { _id: doc1._id, tf: 4, r: 6 });
                                assert.deepEqual(doc2, { _id: doc2._id, tf: 4, an: "other", r: 6 });

                                done();
                            });

                        });
                    });
                });
            });
        });


        it("Can use an index to get docs with $exists", (done) => {
            d.insert([
                { tf: 4, r: 6 },
                { tf: 4, r: 9 },
                { tf: 10, r: 2 },
                { tf: 3 }
            ], (err) => {
                getCandidates({ r: { $exists: true } }, null, (data) => {
                    assert.equal(data.length, 3);
                    getCandidates({ r: { $exists: false } }, null, (data) => {
                        assert.equal(data.length, 1);
                        done();
                    });
                });
            });
        });


        it("Can use an index to get docs with multiple operators ($lt and $exists)", (done) => {
            let doc;
            d.insert([
                { tf: 4, r: 2 },
                { tf: 3 },
                { tf: 5, r: 6 },
                { tf: 10, r: 10 }
            ], (err, docs) => {
                doc = docs;
                getCandidates({ r: { $exists: true, $lt: 5 } }, null, (data) => {
                    assert.equal(data.length, 1);
                    assert.deepEqual(doc, data[0]);
                    done();
                });
            });
        });


        it("Can use an index to get docs with $regex", (done) => {
            let doc1, doc2;
            d.insert([
                doc1 = { name: "Jim" },
                doc2 = { name: "Jan" },
                { name: "Dwight" },
                { name: "Oscar " },
                { somethingElse: "else" }
            ], (err, docs) => {

                getCandidates({ name: { $regex: /^J/ } }, null, (data) => {
                    assert.equal(data.length, 2);
                    data.sort((b, a) => {
                        return a.name > b.name;
                    });

                    assert.equal(doc1.name, data[0].name);
                    assert.equal(doc2.name, data[1].name);

                    done();
                });
            });
        });


        it("Can use an index to get docs with a basic match on two indexes, with $ne", (done) => {
            assert.equal(d.options.autoIndexing, true);

            d.insert({ tf: 4, r: 6 }, (err, _doc1) => {
                d.insert({ tf: 5, r: 6 }, () => {
                    d.insert({ tf: 4, an: "other", r: 6 }, (err, _doc2) => {
                        d.insert({ tf: 9 }, () => {
                            getCandidates({ tf: { $ne: 5 }, r: 6 }, null, (data) => {
                                let doc1 = _.find(data, (d) => {
                                    return d._id === _doc1._id;
                                })
                                    , doc2 = _.find(data, (d) => {
                                        return d._id === _doc2._id;
                                    })
                                    ;

                                assert.equal(data.length, 2);
                                assert.deepEqual(doc1, { _id: doc1._id, tf: 4, r: 6 });
                                assert.deepEqual(doc2, { _id: doc2._id, tf: 4, an: "other", r: 6 });

                                done();
                            });

                        });
                    });
                });
            });
        });

        it("Can use an index to get docs with a basic match on two indexes, with dot value", (done) => {
            assert.equal(d.options.autoIndexing, true);

            d.insert({ tf: 4, r: { a: 6 } }, (err, _doc1) => {
                d.insert({ tf: 6 }, () => {
                    d.insert({ tf: 4, an: "other", r: { a: 4 } }, (err) => {
                        d.insert({ tf: 9 }, () => {
                            getCandidates({ "r.a": 6, tf: 4 }, null, (data) => {
                                const doc1 = _.find(data, (d) => {
                                    return d._id === _doc1._id;
                                })
                                    ;

                                assert.equal(data.length, 1);
                                assert.deepEqual(doc1, { _id: doc1._id, tf: 4, r: { a: 6 } });

                                done();
                            });

                        });
                    });
                });
            });
        });

        it("Can use an index to get docs with a $in match", (done) => {
            d.ensureIndex({ fieldName: "tf" }, (err) => {
                d.insert({ tf: 4 }, (err) => {
                    d.insert({ tf: 6 }, (err, _doc1) => {
                        d.insert({ tf: 4, an: "other" }, (err) => {
                            d.insert({ tf: 9 }, (err, _doc2) => {
                                getCandidates({ tf: { $in: [6, 9, 5] } }, null, (data) => {
                                    let doc1 = _.find(data, (d) => {
                                        return d._id === _doc1._id;
                                    })
                                        , doc2 = _.find(data, (d) => {
                                            return d._id === _doc2._id;
                                        })
                                        ;

                                    assert.equal(data.length, 2);
                                    assert.deepEqual(doc1, { _id: doc1._id, tf: 6 });
                                    assert.deepEqual(doc2, { _id: doc2._id, tf: 9 });

                                    done();
                                });

                            });
                        });
                    });
                });
            });
        });

        it("Can use an index to get docs with a $nin match", (done) => {
            d.ensureIndex({ fieldName: "tf" }, (err) => {
                d.insert({ tf: 4 }, (err) => {
                    d.insert({ tf: 6 }, (err, _doc1) => {
                        d.insert({ tf: 4, an: "other" }, (err) => {
                            d.insert({ tf: 9 }, (err, _doc2) => {
                                getCandidates({ tf: { $nin: [4, 8, 10] } }, null, (data) => {
                                    const doc1 = _.find(data, (d) => {
                                        return d._id === _doc1._id;
                                    });
                                    const doc2 = _.find(data, (d) => {
                                        return d._id === _doc2._id;
                                    })
                                        ;

                                    assert.equal(data.length, 2);
                                    assert.deepEqual(doc1, { _id: doc1._id, tf: 6 });
                                    assert.deepEqual(doc2, { _id: doc2._id, tf: 9 });

                                    done();
                                });

                            });
                        });
                    });
                });
            });
        });

        it("Can use indexes for comparison matches", (done) => {
            d.ensureIndex({ fieldName: "tf" }, (err) => {
                d.insert({ tf: 4 }, (err, _doc1) => {
                    d.insert({ tf: [4, 6, 8] }, (err, _doc2) => { // matched, test with array
                        d.insert({ tf: 4, an: "other" }, (err, _doc3) => {
                            d.insert({ tf: 9 }, (err, _doc4) => { // matched
                                getCandidates({ tf: { $lte: 9, $gte: 6 } }, null, (data) => {
                                    const doc2 = _.find(data, (d) => {
                                        return d._id === _doc2._id;
                                    });
                                    const doc4 = _.find(data, (d) => {
                                        return d._id === _doc4._id;
                                    });

                                    assert.equal(data.length, 2);
                                    assert.deepEqual(doc2, { _id: doc2._id, tf: [4, 6, 8] });
                                    assert.deepEqual(doc4, { _id: doc4._id, tf: 9 });

                                    done();
                                });

                            });
                        });
                    });
                });
            });
        });

        it("Can use an index to get docs with logical operator $or", (done) => {
            d.ensureIndex({ fieldName: "tf" }, (err) => {
                d.insert({ tf: 4 }, (err) => {
                    d.insert({ tf: 6 }, (err, _doc1) => {
                        d.insert({ tf: 4, an: "other" }, (err) => {
                            d.insert({ tf: 9 }, (err, _doc2) => {
                                getCandidates({ $or: [{ tf: 6 }, { tf: 9 }] }, null, (data) => {
                                    let doc1 = _.find(data, (d) => {
                                        return d._id === _doc1._id;
                                    })
                                        , doc2 = _.find(data, (d) => {
                                            return d._id === _doc2._id;
                                        })
                                        ;

                                    assert.equal(data.length, 2);
                                    assert.deepEqual(doc1, { _id: doc1._id, tf: 6 });
                                    assert.deepEqual(doc2, { _id: doc2._id, tf: 9 });

                                    done();
                                });

                            });
                        });
                    });
                });
            });
        });


        it("Can use an index to get docs with logical operator $and", (done) => {
            d.ensureIndex({ fieldName: "tf" }, (err) => {
                d.insert({ tf: 4 }, (err) => {
                    d.insert({ tf: 6 }, (err) => {
                        d.insert({ tf: 4, an: "other" }, (err, _doc1) => {
                            d.insert({ tf: 9 }, (err) => {
                                getCandidates({ $and: [{ tf: 4 }, { an: "other" }] }, null, (data) => {
                                    const doc1 = _.find(data, (d) => {
                                        return d._id === _doc1._id;
                                    })
                                        ;

                                    assert.equal(data.length, 1);
                                    assert.deepEqual(doc1, { _id: doc1._id, tf: 4, an: "other" });

                                    done();
                                });

                            });
                        });
                    });
                });
            });
        });


        it("Can use an index to get docs with logical operator $not, with nesting operators", (done) => {
            d.ensureIndex({ fieldName: "tf" }, (err) => {
                d.insert({ tf: 6 }, (err, _doc1) => {
                    d.insert({ tf: 4, an: "other" }, (err) => {
                        d.insert({ tf: 9 }, (err, _doc2) => {
                            getCandidates({ $not: { $and: [{ tf: 4 }, { an: "other" }] } }, null, (data) => {
                                const doc1 = _.find(data, (d) => {
                                    return d._id === _doc1._id;
                                });
                                const doc2 = _.find(data, (d) => {
                                    return d._id === _doc2._id;
                                })
                                    ;

                                assert.equal(data.length, 2);
                                assert.deepEqual(doc1, { _id: doc1._id, tf: 6 });
                                assert.deepEqual(doc2, { _id: doc2._id, tf: 9 });

                                done();
                            });

                        });
                    });
                });
            });
        });

        it("Can use an index to get sorted docs", (done) => {
            d.insert([
                { a: 12, b: 1 },
                { a: 1, b: 3 },
                { a: 5, b: 3 },
                { a: 3, b: 2 },
                { a: 14, b: 2 },
                { a: 18, b: 2 },
                { a: 9, b: 1 },
                { b: 2 } // to check if we still match on a (a: { $exists: true } )
            ], () => {
                getCandidates({}, { a: 1 }, (data) => {
                    assert.equal(data.length, 8);
                    assert.deepEqual(_.pluck(data, "a"), [undefined, 1, 3, 5, 9, 12, 14, 18]);
                    done();
                });
            });
        });

        it("Can use an index to get sorted docs with query", (done) => {
            d.insert([
                { a: 12, b: 1 },
                { a: 1, b: 3 },
                { a: 5, b: 3 },
                { a: 3, b: 2 },
                { a: 14, b: 2 },
                { a: 18, b: 2 },
                { a: 9, b: 1 },
                { b: 2 } // to check if we still match on a (a: { $exists: true } )
            ], () => {
                getCandidates({ b: { $gt: 1 }, a: { $exists: true } }, { a: 1 }, (data) => {
                    assert.equal(data.length, 5);
                    assert.deepEqual(_.pluck(data, "a"), [1, 3, 5, 14, 18]);
                    done();
                });
            });
        });


        // it("Can use an index to get sorted docs via compound sort", (done) => {
        //     return done(new Error("not implemented - TODO"));

        //     assert.equal(d.options.autoIndexing, true);

        //     d.insert([
        //         { a: 1, b: 3 },
        //         { a: 12, b: 1 },
        //         { a: 5, b: 3 },
        //         { a: 3, b: 2 },
        //         { a: 18, b: 2 },
        //         { a: 14, b: 2 },
        //         { a: 9, b: 1 },
        //         { b: 2 } // to check if we still match on a (a: { $exists: true } )
        //     ], () => {
        //         getCandidates({ a: { $gt: 1 } }, { b: 1, a: 1 }, (data) => {
        //             assert.equal(data.length, 6);
        //             assert.deepEqual(_.pluck(data, "b"), [1, 1, 2, 2, 2, 3]);
        //             assert.deepEqual(_.pluck(data, "a"), [9, 12, 3, 14, 8, 3]);
        //             done();
        //         });
        //     });

        // });

        it.skip("Query sets _sorted/_indexed flag if completely sorted and indexed", (done) => {
            d.insert([
                { a: 12, b: 1 },
                { a: 1, b: 3 },
                { a: 5, b: 3 },
                { a: 3, b: 2 },
                { a: 14, b: 2 },
                { a: 18, b: 2 },
                { a: 9, b: 1 },
                { b: 2 } // to check if we still match on a (a: { $exists: true } )
            ], () => {
                const stream = Cursor.getMatchesStream(d, { b: { $gt: 1 }, a: { $exists: true } }, { a: 1 });
                stream.on("ids", (ids) => {
                    assert.equal(ids._sorted, true);
                    assert.equal(ids._indexed, true);

                    done();
                });
            });
        });

        it.skip("Query sets _sorted/_indexed flag if not completely sorted and indexed", (done) => {
            d.options.autoIndexing = false;

            d.insert([
                { a: 12, b: 1 },
                { a: 1, b: 3 },
                { a: 5, b: 3 },
                { a: 3, b: 2 },
                { a: 14, b: 2 },
                { a: 18, b: 2 },
                { a: 9, b: 1 },
                { b: 2 } // to check if we still match on a (a: { $exists: true } )
            ], () => {
                const stream = Cursor.getMatchesStream(d, { b: { $gt: 1 }, a: { $exists: true } }, { a: 1 });
                stream.on("ids", (ids) => {
                    assert.equal(ids._sorted, false);
                    assert.equal(ids._indexed, false);

                    done();
                });
            });
        });
    });   // ==== End of '#getIdsForQuery' ==== //


    describe("Find", () => {
        it("Can find document by ID", (done) => {
            async.waterfall([
                function (cb) {
                    d.insert({ somedata: "ok" }, (err, doc) => {
                        cb(err, doc);
                    });
                }
                , function (doc, cb) {   // Test with query that will return docs
                    d.findById(doc._id, (err, res) => {
                        assert.isNull(err);
                        assert.deepEqual(res, doc);

                        cb();
                    });
                }
            ], done);
        });

        it("Can find all documents if an empty query is used", (done) => {
            async.waterfall([
                function (cb) {
                    d.insert({ somedata: "ok" }, (err) => {
                        d.insert({ somedata: "another", plus: "additional data" }, (err) => {
                            d.insert({ somedata: "again" }, (err) => {
                                return cb(err);
                            });
                        });
                    });
                }
                , function (cb) {   // Test with empty object
                    d.find({}, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 3);
                        assert.include(_.pluck(docs, "somedata"), "ok");
                        assert.include(_.pluck(docs, "somedata"), "another");
                        assert.equal(_.find(docs, (d) => {
                            return d.somedata === "another";
                        }).plus, "additional data");
                        assert.include(_.pluck(docs, "somedata"), "again");
                        return cb();
                    });
                }
            ], done);
        });

        it("Can find all documents matching a basic query", (done) => {
            async.waterfall([
                function (cb) {
                    d.insert({ somedata: "ok" }, (err) => {
                        d.insert({ somedata: "again", plus: "additional data" }, (err) => {
                            d.insert({ somedata: "again" }, (err) => {
                                return cb(err);
                            });
                        });
                    });
                }
                , function (cb) {   // Test with query that will return docs
                    d.find({ somedata: "again" }, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 2);
                        assert.notInclude(_.pluck(docs, "somedata"), "ok");
                        return cb();
                    });
                }
                , function (cb) {   // Test with query that doesn't match anything
                    d.find({ somedata: "nope" }, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 0);
                        return cb();
                    });
                }
            ], done);
        });


        it("Can find one document matching a basic query and return null if none is found", (done) => {
            async.waterfall([
                function (cb) {
                    d.insert({ somedata: "ok" }, (err) => {
                        d.insert({ somedata: "again", plus: "additional data" }, (err) => {
                            d.insert({ somedata: "again" }, (err) => {
                                return cb(err);
                            });
                        });
                    });
                }
                , function (cb) {   // Test with query that will return docs
                    d.findOne({ somedata: "ok" }, (err, doc) => {
                        assert.isNull(err);
                        assert.equal(Object.keys(doc).length, 2);
                        assert.equal(doc.somedata, "ok");
                        assert.isDefined(doc._id);
                        return cb();
                    });
                }
                , function (cb) {   // Test with query that doesn't match anything
                    d.findOne({ somedata: "nope" }, (err, doc) => {
                        assert.isNull(err);
                        assert.isNull(doc);
                        return cb();
                    });
                }
            ], done);
        });

        it("Can find dates and objects (non JS-native types)", (done) => {
            let date1 = new Date(1234543)
                , date2 = new Date(9999)
                ;

            d.insert({ now: date1, sth: { name: "nedb" } }, () => {
                d.findOne({ now: date1 }, (err, doc) => {
                    assert.isNull(err);
                    assert.isNotNull(doc);

                    assert.equal(doc.sth.name, "nedb");

                    d.findOne({ now: date2 }, (err, doc) => {
                        assert.isNull(err);
                        assert.isNull(doc);

                        d.findOne({ sth: { name: "nedb" } }, (err, doc) => {
                            assert.isNull(err);
                            assert.equal(doc.sth.name, "nedb");

                            d.findOne({ sth: { name: "other" } }, (err, doc) => {
                                assert.isNull(err);
                                assert.isNull(doc);

                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Can use dot-notation to query subfields", (done) => {
            d.insert({ greeting: { english: "hello" } }, () => {
                d.findOne({ "greeting.english": "hello" }, (err, doc) => {
                    assert.isNull(err);
                    assert.equal(doc.greeting.english, "hello");

                    d.findOne({ "greeting.english": "hellooo" }, (err, doc) => {
                        assert.isNull(err);
                        assert.isNull(doc);

                        d.findOne({ "greeting.englis": "hello" }, (err, doc) => {
                            assert.isNull(err);
                            assert.isNull(doc);

                            done();
                        });
                    });
                });
            });
        });

        it("Array fields match if any element matches", (done) => {
            d.insert({ fruits: ["pear", "apple", "banana"] }, (err, doc1) => {
                d.insert({ fruits: ["coconut", "orange", "pear"] }, (err, doc2) => {
                    d.insert({ fruits: ["banana"] }, (err, doc3) => {
                        d.find({ fruits: "pear" }, (err, docs) => {
                            assert.isNull(err);
                            assert.equal(docs.length, 2);
                            assert.include(_.pluck(docs, "_id"), doc1._id);
                            assert.include(_.pluck(docs, "_id"), doc2._id);

                            d.find({ fruits: "banana" }, (err, docs) => {
                                assert.isNull(err);
                                assert.equal(docs.length, 2);
                                assert.include(_.pluck(docs, "_id"), doc1._id);
                                assert.include(_.pluck(docs, "_id"), doc3._id);

                                d.find({ fruits: "doesntexist" }, (err, docs) => {
                                    assert.isNull(err);
                                    assert.equal(docs.length, 0);

                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("Returns an error if the query is not well formed", (done) => {
            d.insert({ hello: "world" }, () => {
                d.find({ $or: { hello: "world" } }, (err, docs) => {
                    assert.isDefined(err);
                    assert.isUndefined(docs);

                    d.findOne({ $or: { hello: "world" } }, (err, doc) => {
                        assert.isDefined(err);
                        assert.isUndefined(doc);

                        done();
                    });
                });
            });
        });

        it("Changing the documents returned by find or findOne do not change the database state", (done) => {
            d.insert({ a: 2, hello: "world" }, () => {
                d.findOne({ a: 2 }, (err, doc) => {
                    doc.hello = "changed";

                    d.findOne({ a: 2 }, (err, doc) => {
                        assert.equal(doc.hello, "world");

                        d.find({ a: 2 }, (err, docs) => {
                            docs[0].hello = "changed";

                            d.findOne({ a: 2 }, (err, doc) => {
                                assert.equal(doc.hello, "world");

                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Can use sort, skip and limit if the callback is not passed to find but to exec", (done) => {
            d.insert({ a: 2, hello: "world" }, () => {
                d.insert({ a: 24, hello: "earth" }, () => {
                    d.insert({ a: 13, hello: "blueplanet" }, () => {
                        d.insert({ a: 15, hello: "home" }, () => {
                            d.find({}).sort({ a: 1 }).limit(2).exec((err, docs) => {
                                assert.isNull(err);
                                assert.equal(docs.length, 2);
                                assert.equal(docs[0].hello, "world");
                                assert.equal(docs[1].hello, "blueplanet");
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Can use sort and skip if the callback is not passed to findOne but to exec", (done) => {
            d.insert({ a: 2, hello: "world" }, () => {
                d.insert({ a: 24, hello: "earth" }, () => {
                    d.insert({ a: 13, hello: "blueplanet" }, () => {
                        d.insert({ a: 15, hello: "home" }, () => {
                            // No skip no query
                            d.findOne({}).sort({ a: 1 }).exec((err, doc) => {
                                assert.isNull(err);
                                assert.equal(doc.hello, "world");

                                // A query
                                d.findOne({ a: { $gt: 14 } }).sort({ a: 1 }).exec((err, doc) => {
                                    assert.isNull(err);
                                    assert.equal(doc.hello, "home");

                                    // And a skip
                                    d.findOne({ a: { $gt: 14 } }).sort({ a: 1 }).skip(1).exec((err, doc) => {
                                        assert.isNull(err);
                                        assert.equal(doc.hello, "earth");

                                        // No result
                                        d.findOne({ a: { $gt: 14 } }).sort({ a: 1 }).skip(2).exec((err, doc) => {
                                            assert.isNull(err);
                                            assert.isNull(doc);

                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });


        describe("Events", () => {
            it("before query, allows to modify query", (done) => {
                d.insert([{ tf: 4, r: 6 }, { tf: 5, r: 8 }], (err) => {
                    d.on("query", (q) => {
                        q.tf = 4;
                    });
                    d.find({ r: { $gt: 5 } }, (err, docs) => {
                        assert.equal(docs.length, 1);
                        done();
                    });
                });
            });
        });

    });   // ==== End of 'Find' ==== //

    describe("Count", () => {
        it("Count all documents if an empty query is used", (done) => {
            async.waterfall([
                function (cb) {
                    d.insert({ somedata: "ok" }, (err) => {
                        d.insert({ somedata: "another", plus: "additional data" }, (err) => {
                            d.insert({ somedata: "again" }, (err) => {
                                return cb(err);
                            });
                        });
                    });
                }
                , function (cb) {   // Test with empty object
                    d.count({}, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs, 3);
                        return cb();
                    });
                }
            ], done);
        });

        it("Count all documents matching a basic query", (done) => {
            async.waterfall([
                function (cb) {
                    d.insert({ somedata: "ok" }, (err) => {
                        d.insert({ somedata: "again", plus: "additional data" }, (err) => {
                            d.insert({ somedata: "again" }, (err) => {
                                return cb(err);
                            });
                        });
                    });
                }
                , function (cb) {   // Test with query that will return docs
                    d.count({ somedata: "again" }, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs, 2);
                        return cb();
                    });
                }
                , function (cb) {   // Test with query that doesn't match anything
                    d.count({ somedata: "nope" }, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs, 0);
                        return cb();
                    });
                }
            ], done);
        });

        it("Array fields match if any element matches", (done) => {
            d.insert({ fruits: ["pear", "apple", "banana"] }, (err, doc1) => {
                d.insert({ fruits: ["coconut", "orange", "pear"] }, (err, doc2) => {
                    d.insert({ fruits: ["banana"] }, (err, doc3) => {
                        d.count({ fruits: "pear" }, (err, docs) => {
                            assert.isNull(err);
                            assert.equal(docs, 2);

                            d.count({ fruits: "banana" }, (err, docs) => {
                                assert.isNull(err);
                                assert.equal(docs, 2);

                                d.count({ fruits: "doesntexist" }, (err, docs) => {
                                    assert.isNull(err);
                                    assert.equal(docs, 0);

                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("Returns an error if the query is not well formed", (done) => {
            d.insert({ hello: "world" }, () => {
                d.count({ $or: { hello: "world" } }, (err, docs) => {
                    assert.isDefined(err);
                    assert.isUndefined(docs);

                    done();
                });
            });
        });

    });

    describe("Update", () => {
        it("If the query doesn't match anything, database is not modified", (done) => {
            async.waterfall([
                function (cb) {
                    d.insert({ somedata: "ok" }, (err) => {
                        d.insert({ somedata: "again", plus: "additional data" }, (err) => {
                            d.insert({ somedata: "another" }, (err) => {
                                return cb(err);
                            });
                        });
                    });
                }
                , function (cb) {   // Test with query that doesn't match anything
                    d.update({ somedata: "nope" }, { newDoc: "yes" }, { multi: true }, (err, n) => {
                        assert.isNull(err);
                        assert.equal(n, 0);

                        d.find({}, (err, docs) => {
                            let doc1 = _.find(docs, (d) => {
                                return d.somedata === "ok";
                            })
                                , doc2 = _.find(docs, (d) => {
                                    return d.somedata === "again";
                                })
                                , doc3 = _.find(docs, (d) => {
                                    return d.somedata === "another";
                                })
                                ;

                            assert.equal(docs.length, 3);
                            assert.isUndefined(_.find(docs, (d) => {
                                return d.newDoc === "yes";
                            }));

                            assert.deepEqual(doc1, { _id: doc1._id, somedata: "ok" });
                            assert.deepEqual(doc2, { _id: doc2._id, somedata: "again", plus: "additional data" });
                            assert.deepEqual(doc3, { _id: doc3._id, somedata: "another" });

                            return cb();
                        });
                    });
                }
            ], done);
        });

        it("Can update multiple documents matching the query", (done) => {
            let id1, id2, id3;

            // Test DB state after update and reload
            function testPostUpdateState(cb) {
                d.find({}, (err, docs) => {
                    let doc1 = _.find(docs, (d) => {
                        return d._id === id1;
                    })
                        , doc2 = _.find(docs, (d) => {
                            return d._id === id2;
                        })
                        , doc3 = _.find(docs, (d) => {
                            return d._id === id3;
                        })
                        ;

                    assert.equal(docs.length, 3);

                    assert.equal(Object.keys(doc1).length, 2);
                    assert.equal(doc1.somedata, "ok");
                    assert.equal(doc1._id, id1);

                    assert.equal(Object.keys(doc2).length, 2);
                    assert.equal(doc2.newDoc, "yes");
                    assert.equal(doc2._id, id2);

                    assert.equal(Object.keys(doc3).length, 2);
                    assert.equal(doc3.newDoc, "yes");
                    assert.equal(doc3._id, id3);

                    return cb();
                });
            }

            // Actually launch the tests
            async.waterfall([
                function (cb) {
                    d.insert({ somedata: "ok" }, (err, doc1) => {
                        id1 = doc1._id;
                        d.insert({ somedata: "again", plus: "additional data" }, (err, doc2) => {
                            id2 = doc2._id;
                            d.insert({ somedata: "again" }, (err, doc3) => {
                                id3 = doc3._id;
                                return cb(err);
                            });
                        });
                    });
                }
                , function (cb) {
                    d.update({ somedata: "again" }, { newDoc: "yes" }, { multi: true }, (err, n) => {
                        assert.isNull(err);
                        assert.equal(n, 2);
                        return cb();
                    });
                }
                , async.apply(testPostUpdateState)
                , function (cb) {
                    d.reload((err) => {
                        cb(err);
                    });
                }
                , async.apply(testPostUpdateState)
            ], done);
        });

        it("Can update only one document matching the query", (done) => {
            let id1, id2, id3;

            // Test DB state after update and reload
            function testPostUpdateState(cb) {
                d.find({}, (err, docs) => {
                    let doc1 = _.find(docs, (d) => {
                        return d._id === id1;
                    })
                        , doc2 = _.find(docs, (d) => {
                            return d._id === id2;
                        })
                        , doc3 = _.find(docs, (d) => {
                            return d._id === id3;
                        })
                        ;

                    assert.equal(docs.length, 3);

                    assert.deepEqual(doc1, { somedata: "ok", _id: doc1._id });

                    // doc2 or doc3 was modified. Since we sort on _id and it is random
                    // it can be either of two situations
                    try {
                        assert.deepEqual(doc2, { newDoc: "yes", _id: doc2._id });
                        assert.deepEqual(doc3, { somedata: "again", _id: doc3._id });
                    } catch (e) {
                        assert.deepEqual(doc2, { somedata: "again", plus: "additional data", _id: doc2._id });
                        assert.deepEqual(doc3, { newDoc: "yes", _id: doc3._id });
                    }

                    return cb();
                });
            }

            // Actually launch the test
            async.waterfall([
                function (cb) {
                    d.insert({ somedata: "ok" }, (err, doc1) => {
                        id1 = doc1._id;
                        d.insert({ somedata: "again", plus: "additional data" }, (err, doc2) => {
                            id2 = doc2._id;
                            d.insert({ somedata: "again" }, (err, doc3) => {
                                id3 = doc3._id;
                                return cb(err);
                            });
                        });
                    });
                }
                , function (cb) {   // Test with query that doesn't match anything
                    d.update({ somedata: "again" }, { newDoc: "yes" }, { multi: false }, (err, n, doc) => {
                        assert.isNull(err);

                        // Test if update returns first updated doc
                        assert.isDefined(doc);
                        assert.equal(doc.newDoc, "yes");

                        assert.equal(n, 1);
                        return cb();
                    });
                }
                , async.apply(testPostUpdateState)
                , function (cb) {
                    d.reload((err) => {
                        return cb(err);
                    });
                }
                , async.apply(testPostUpdateState)   // The persisted state has been updated
            ], done);
        });


        it("Can update via modifier function", (done) => {
            d.insert([{ somedata: "ok" }, { somedata: "again" }, { somedata: "againy" }], (err) => {
                d.update({ somedata: "ok" }, (doc) => {
                    doc.somedata += "o";
                }, {}, (err) => {
                    assert.isNull(err);
                    d.findOne({ somedata: "oko" }, (err, doc) => {
                        assert.isNull(err);
                        assert.isDefined(doc);
                        assert.equal(doc.somedata, "oko");
                        done();
                    });

                });
            });
        });



        it("Can't change _id via modifier function", (done) => {
            d.insert([{ somedata: "ok" }, { somedata: "again" }, { somedata: "againy" }], (err) => {
                d.update({ somedata: "ok" }, (doc) => {
                    doc._id += "o";
                }, {}, (err) => {
                    assert.isDefined(err);
                    done();
                });
            });
        });


        describe("Upserts", () => {

            it("Can perform upserts if needed", (done) => {
                d.update({ impossible: "db is empty anyway" }, { newDoc: true }, {}, (err, nr, upsert) => {
                    assert.isNull(err);
                    assert.equal(nr, 0);
                    assert.isUndefined(upsert);

                    d.find({}, (err, docs) => {
                        assert.equal(docs.length, 0);   // Default option for upsert is false

                        d.update({ impossible: "db is empty anyway" }, { something: "created ok" }, { upsert: true }, (err, nr, newDoc) => {
                            assert.isNull(err);
                            assert.equal(nr, 1);
                            assert.equal(newDoc.something, "created ok");
                            assert.isDefined(newDoc._id);

                            d.find({}, (err, docs) => {
                                assert.equal(docs.length, 1);   // Default option for upsert is false
                                assert.equal(docs[0].something, "created ok");

                                // Modifying the returned upserted document doesn't modify the database
                                newDoc.newField = true;
                                d.find({}, (err, docs) => {
                                    assert.equal(docs[0].something, "created ok");
                                    assert.isUndefined(docs[0].newField);

                                    done();
                                });
                            });
                        });
                    });
                });
            });

            it("Can upsert with a modifier function", (done) => {
                d.update({ $or: [{ a: 4 }, { a: 5 }] }, (doc) => {
                    doc.hello = "world";
                    doc.bloup = "blapp";
                }, { upsert: true }, (err) => {
                    d.find({}, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 1);
                        const doc = docs[0];
                        assert.equal(Object.keys(doc).length, 3);
                        assert.equal(doc.hello, "world");
                        assert.equal(doc.bloup, "blapp");
                        done();
                    });
                });
            });

            it("If the update query is a normal object with no modifiers, it is the doc that will be upserted", (done) => {
                d.update({ $or: [{ a: 4 }, { a: 5 }] }, { hello: "world", bloup: "blap" }, { upsert: true }, (err) => {
                    d.find({}, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 1);
                        const doc = docs[0];
                        assert.equal(Object.keys(doc).length, 3);
                        assert.equal(doc.hello, "world");
                        assert.equal(doc.bloup, "blap");
                        done();
                    });
                });
            });

            it("If the update query contains modifiers, it is applied to the object resulting from removing all operators from the find query 1", (done) => {
                d.update({ $or: [{ a: 4 }, { a: 5 }] }, { $set: { hello: "world" }, $inc: { bloup: 3 } }, { upsert: true }, (err) => {
                    d.find({ hello: "world" }, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 1);
                        const doc = docs[0];
                        assert.equal(Object.keys(doc).length, 3);
                        assert.equal(doc.hello, "world");
                        assert.equal(doc.bloup, 3);
                        done();
                    });
                });
            });

            it("If the update query contains modifiers, it is applied to the object resulting from removing all operators from the find query 2", (done) => {
                d.update({ $or: [{ a: 4 }, { a: 5 }], cac: "rrr" }, { $set: { hello: "world" }, $inc: { bloup: 3 } }, { upsert: true }, (err) => {
                    d.find({ hello: "world" }, (err, docs) => {
                        assert.isNull(err);
                        assert.equal(docs.length, 1);
                        const doc = docs[0];
                        assert.equal(Object.keys(doc).length, 4);
                        assert.equal(doc.cac, "rrr");
                        assert.equal(doc.hello, "world");
                        assert.equal(doc.bloup, 3);
                        done();
                    });
                });
            });


        });   // ==== End of 'Upserts' ==== //

        it("Cannot perform update if the update query is not either registered-modifiers-only or copy-only, or contain badly formatted fields", (done) => {
            d.insert({ something: "yup" }, () => {
                d.update({}, { boom: { $badfield: 5 } }, { multi: false }, (err) => {
                    assert.isDefined(err);

                    d.update({}, { boom: { "bad.field": 5 } }, { multi: false }, (err) => {
                        assert.isDefined(err);

                        d.update({}, { $inc: { test: 5 }, mixed: "rrr" }, { multi: false }, (err) => {
                            assert.isDefined(err);

                            d.update({}, { $inexistent: { test: 5 } }, { multi: false }, (err) => {
                                assert.isDefined(err);

                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Can update documents using multiple modifiers", (done) => {
            let id;

            d.insert({ something: "yup", other: 40 }, (err, newDoc) => {
                id = newDoc._id;

                d.update({}, { $set: { something: "changed" }, $inc: { other: 10 } }, { multi: false }, (err, nr) => {
                    assert.isNull(err);
                    assert.equal(nr, 1);

                    d.findOne({ _id: id }, (err, doc) => {
                        assert.equal(Object.keys(doc).length, 3);
                        assert.equal(doc._id, id);
                        assert.equal(doc.something, "changed");
                        assert.equal(doc.other, 50);

                        done();
                    });
                });
            });
        });

        it("Cannot perform upsert with badly formatted fields", (done) => {
            d.update({ _id: "1234" }, { $set: { $$badfield: 5 } }, { upsert: true }, (err, doc) => {
                assert.isDefined(err);
                done();
            });
        });

        it("Can upsert a document even with modifiers", (done) => {
            d.update({ bloup: "blap" }, { $set: { hello: "world" } }, { upsert: true }, (err, nr, newDoc) => {
                assert.isNull(err);
                assert.equal(nr, 1);
                assert.equal(newDoc.bloup, "blap");
                assert.equal(newDoc.hello, "world");
                assert.isDefined(newDoc._id);

                d.find({}, (err, docs) => {
                    assert.equal(docs.length, 1);
                    assert.equal(Object.keys(docs[0]).length, 3);
                    assert.equal(docs[0].hello, "world");
                    assert.equal(docs[0].bloup, "blap");
                    assert.isDefined(docs[0]._id);

                    done();
                });
            });
        });

        it("When using modifiers, the only way to update subdocs is with the dot-notation", (done) => {
            d.insert({ bloup: { blip: "blap", other: true } }, () => {
                // Correct methos
                d.update({}, { $set: { "bloup.blip": "hello" } }, {}, () => {
                    d.findOne({}, (err, doc) => {
                        assert.equal(doc.bloup.blip, "hello");
                        assert.equal(doc.bloup.other, true);

                        // Wrong
                        d.update({}, { $set: { bloup: { blip: "ola" } } }, {}, () => {
                            d.findOne({}, (err, doc) => {
                                assert.equal(doc.bloup.blip, "ola");
                                assert.isUndefined(doc.bloup.other);   // This information was lost

                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Returns an error if the query is not well formed", (done) => {
            d.insert({ hello: "world" }, () => {
                d.update({ $or: { hello: "world" } }, { a: 1 }, {}, (err, nr, upsert) => {
                    assert.isDefined(err);
                    assert.isUndefined(nr);
                    assert.isUndefined(upsert);

                    done();
                });
            });
        });

        it("If an error is thrown by a modifier, the database state is not changed", (done) => {
            d.insert({ hello: "world" }, (err, newDoc) => {
                d.update({}, { $inc: { hello: 4 } }, {}, (err, nr) => {
                    assert.isDefined(err);
                    assert.isUndefined(nr);

                    d.find({}, (err, docs) => {
                        assert.deepEqual(docs, [{ _id: newDoc._id, hello: "world" }]);

                        done();
                    });
                });
            });
        });

        it("Cant change the _id of a document", (done) => {
            d.insert({ a: 2 }, (err, newDoc) => {
                d.update({ a: 2 }, { a: 2, _id: "nope" }, {}, (err) => {
                    assert.isDefined(err);

                    d.find({}, (err, docs) => {
                        assert.equal(docs.length, 1);
                        assert.equal(Object.keys(docs[0]).length, 2);
                        assert.equal(docs[0].a, 2);
                        assert.equal(docs[0]._id, newDoc._id);

                        d.update({ a: 2 }, { $set: { _id: "nope" } }, {}, (err) => {
                            assert.isDefined(err);

                            d.find({}, (err, docs) => {
                                assert.equal(docs.length, 1);
                                assert.equal(Object.keys(docs[0]).length, 2);
                                assert.equal(docs[0].a, 2);
                                assert.equal(docs[0]._id, newDoc._id);

                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Non-multi updates are persistent", (done) => {
            d.insert({ a: 1, hello: "world" }, (err, doc1) => {
                d.insert({ a: 2, hello: "earth" }, (err, doc2) => {
                    d.update({ a: 2 }, { $set: { hello: "changed" } }, {}, (err) => {
                        assert.isNull(err);

                        d.find({}, (err, docs) => {
                            docs.sort((a, b) => {
                                return a.a - b.a;
                            });
                            assert.equal(docs.length, 2);

                            assert.deepEqual(docs[0], { _id: doc1._id, a: 1, hello: "world" });
                            assert.deepEqual(docs[1], { _id: doc2._id, a: 2, hello: "changed" });

                            // Even after a reload the database state hasn't changed
                            d.reload((err) => {
                                assert.isNull(err);

                                d.find({}, (err, docs) => {
                                    docs.sort((a, b) => {
                                        return a.a - b.a;
                                    });
                                    assert.equal(docs.length, 2);
                                    assert.deepEqual(docs[0], { _id: doc1._id, a: 1, hello: "world" });
                                    assert.deepEqual(docs[1], { _id: doc2._id, a: 2, hello: "changed" });

                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("Multi updates are persistent", (done) => {
            d.insert({ a: 1, hello: "world" }, (err, doc1) => {
                d.insert({ a: 2, hello: "earth" }, (err, doc2) => {
                    d.insert({ a: 5, hello: "pluton" }, (err, doc3) => {
                        d.update({ a: { $in: [1, 2] } }, { $set: { hello: "changed" } }, { multi: true }, (err) => {
                            assert.isNull(err);

                            d.find({}, (err, docs) => {
                                docs.sort((a, b) => {
                                    return a.a - b.a;
                                });
                                assert.equal(docs.length, 3);
                                assert.deepEqual(docs[0], { _id: doc1._id, a: 1, hello: "changed" });
                                assert.deepEqual(docs[1], { _id: doc2._id, a: 2, hello: "changed" });
                                assert.deepEqual(docs[2], { _id: doc3._id, a: 5, hello: "pluton" });

                                // Even after a reload the database state hasn't changed
                                d.reload((err) => {
                                    assert.isNull(err);

                                    d.find({}, (err, docs) => {
                                        docs.sort((a, b) => {
                                            return a.a - b.a;
                                        });
                                        assert.equal(docs.length, 3);
                                        assert.deepEqual(docs[0], { _id: doc1._id, a: 1, hello: "changed" });
                                        assert.deepEqual(docs[1], { _id: doc2._id, a: 2, hello: "changed" });
                                        assert.deepEqual(docs[2], { _id: doc3._id, a: 5, hello: "pluton" });

                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("Can update without the options arg (will use defaults then)", (done) => {
            d.insert({ a: 1, hello: "world" }, (err, doc1) => {
                d.insert({ a: 2, hello: "earth" }, (err, doc2) => {
                    d.insert({ a: 5, hello: "pluton" }, (err, doc3) => {
                        d.update({ a: 2 }, { $inc: { a: 10 } }, (err, nr) => {
                            assert.isNull(err);
                            assert.equal(nr, 1);
                            d.find({}, (err, docs) => {
                                let d1 = _.find(docs, (doc) => {
                                    return doc._id === doc1._id;
                                })
                                    , d2 = _.find(docs, (doc) => {
                                        return doc._id === doc2._id;
                                    })
                                    , d3 = _.find(docs, (doc) => {
                                        return doc._id === doc3._id;
                                    })
                                    ;

                                assert.equal(d1.a, 1);
                                assert.equal(d2.a, 12);
                                assert.equal(d3.a, 5);

                                done();
                            });
                        });
                    });
                });
            });
        });

        it.skip("If a multi update fails on one document, previous updates should be rolled back", (done) => {
            d.ensureIndex({ fieldName: "a" });
            d.insert({ a: 4 }, (err, doc1) => {
                d.insert({ a: 5 }, (err, doc2) => {
                    d.insert({ a: "abc" }, (err, doc3) => {
                        // With this query, candidates are always returned in the order 4, 5, 'abc' so it's always the last one which fails
                        d.update({ a: { $in: [4, 5, "abc"] } }, { $inc: { a: 10 } }, { multi: true }, (err) => {
                            assert.isDefined(err);

                            const totalIndexes = d.indexes.length;
                            let indexCounter = 1;
                            // No index modified
                            async.each(d.indexes, (index, cb) => {
                                const docs = index.getAll();
                                indexCounter++;
                                const totalDocs = docs.length;
                                adone.log(docs.length);
                                let counter = 1;
                                async.map(docs, d.findById.bind(d), (err, docs) => {
                                    const d1 = _.find(docs, (doc) => {
                                        return doc._id === doc1._id;
                                    });
                                    const d2 = _.find(docs, (doc) => {
                                        return doc._id === doc2._id;
                                    });
                                    const d3 = _.find(docs, (doc) => {
                                        return doc._id === doc3._id;
                                    });

                                    // All changes rolled back, including those that didn't trigger an error
                                    assert.equal(d1.a, 4);
                                    assert.equal(d2.a, 5);
                                    assert.equal(d3.a, "abc");
                                    adone.log(counter);
                                    adone.log();
                                    if (++counter === totalDocs) {
                                        cb();
                                    }
                                });
                            }, done);
                        });
                    });
                });
            });
        });

        it.skip("If an index constraint is violated by an update, all changes should be rolled back", (done) => {
            d.ensureIndex({ fieldName: "a", unique: true });
            d.insert({ a: 4 }, (err, doc1) => {
                d.insert({ a: 5 }, (err, doc2) => {
                    // With this query, candidates are always returned in the order 4, 5, 'abc' so it's always the last one which fails
                    d.update({ a: { $in: [4, 5, "abc"] } }, { $set: { a: 10 } }, { multi: true }, (err) => {
                        assert.isDefined(err);

                        // Check that no index was modified
                        async.each(d.indexes, (index, cb) => {
                            const docs = index.getAll();
                            async.map(docs, d.findById.bind(d), (err, docs) => {
                                let d1 = _.find(docs, (doc) => {
                                    return doc._id === doc1._id;
                                })
                                    , d2 = _.find(docs, (doc) => {
                                        return doc._id === doc2._id;
                                    })
                                    ;

                                // All changes rolled back, including those that didn't trigger an error
                                assert.equal(d1.a, 4);
                                assert.equal(d2.a, 5);
                            }, cb);
                        }, done);

                    });
                });
            });
        });


        it.skip("Updates are atomic", (done) => {
            d.insert({ a: 4 }, (err, doc1) => {
                // With this query, candidates are always returned in the order 4, 5, 'abc' so it's always the last one which fails
                async.parallel([
                    function (cb) {
                        d.update({ a: { $in: [4, 5, "abc"] } }, { $inc: { a: 1 } }, { multi: true }, cb);
                    },
                    function (cb) {
                        d.update({ a: { $in: [4, 5, "abc"] } }, { $inc: { a: 1 } }, { multi: true }, cb);
                    }
                ], (err) => {
                    assert.isUndefined(err);

                    d.findOne({}, (err, doc) => {
                        assert.equal(doc.a, 6);
                        done();
                    });
                });
            });
        });


    });   // ==== End of 'Update' ==== //


    describe("Remove", () => {
        it("Can remove multiple documents", (done) => {
            let id1, id2, id3;

            // Test DB status
            function testPostUpdateState(cb) {
                d.find({}, (err, docs) => {
                    assert.equal(docs.length, 1);

                    assert.equal(Object.keys(docs[0]).length, 2);
                    assert.equal(docs[0]._id, id1);
                    assert.equal(docs[0].somedata, "ok");

                    return cb();
                });
            }

            // Actually launch the test
            async.waterfall([
                function (cb) {
                    d.insert({ somedata: "ok" }, (err, doc1) => {
                        id1 = doc1._id;
                        d.insert({ somedata: "again", plus: "additional data" }, (err, doc2) => {
                            id2 = doc2._id;
                            d.insert({ somedata: "again" }, (err, doc3) => {
                                id3 = doc3._id;
                                return cb(err);
                            });
                        });
                    });
                }
                , function (cb) {   // Test with query that doesn't match anything
                    d.remove({ somedata: "again" }, { multi: true }, (err, n) => {
                        assert.isNull(err);
                        assert.equal(n, 2);
                        return cb();
                    });
                }
                , async.apply(testPostUpdateState)
                , function (cb) {
                    d.reload((err) => {
                        return cb(err);
                    });
                }
                , async.apply(testPostUpdateState)
            ], done);
        });

        // This tests concurrency issues
        it("Remove can be called multiple times in parallel and everything that needs to be removed will be", (done) => {
            d.insert({ planet: "Earth" }, () => {
                d.insert({ planet: "Mars" }, () => {
                    d.insert({ planet: "Saturn" }, () => {
                        d.find({}, (err, docs) => {
                            assert.equal(docs.length, 3);

                            // Remove two docs simultaneously
                            const toRemove = ["Mars", "Saturn"];
                            async.each(toRemove, (planet, cb) => {
                                d.remove({ planet }, (err) => {
                                    return cb(err);
                                });
                            }, (err) => {
                                d.find({}, (err, docs) => {
                                    assert.equal(docs.length, 1);

                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("Returns an error if the query is not well formed", (done) => {
            d.insert({ hello: "world" }, () => {
                d.remove({ $or: { hello: "world" } }, {}, (err, nr, upsert) => {
                    assert.isNotNull(err);
                    assert.isDefined(err);

                    assert.isUndefined(nr);
                    assert.isUndefined(upsert);

                    done();
                });
            });
        });

        it("Non-multi removes are persistent", (done) => {
            d.insert({ a: 1, hello: "world" }, (err, doc1) => {
                d.insert({ a: 2, hello: "earth" }, (err, doc2) => {
                    d.insert({ a: 3, hello: "moto" }, (err, doc3) => {
                        d.remove({ a: 2 }, {}, (err) => {
                            assert.isNull(err);

                            d.find({}, (err, docs) => {
                                docs.sort((a, b) => {
                                    return a.a - b.a;
                                });
                                assert.equal(docs.length, 2);
                                assert.deepEqual(docs[0], { _id: doc1._id, a: 1, hello: "world" });
                                assert.deepEqual(docs[1], { _id: doc3._id, a: 3, hello: "moto" });

                                // Even after a reload the database state hasn't changed
                                d.reload((err) => {
                                    assert.isNull(err);

                                    d.find({}, (err, docs) => {
                                        docs.sort((a, b) => {
                                            return a.a - b.a;
                                        });
                                        assert.equal(docs.length, 2);
                                        assert.deepEqual(docs[0], { _id: doc1._id, a: 1, hello: "world" });
                                        assert.deepEqual(docs[1], { _id: doc3._id, a: 3, hello: "moto" });

                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("Multi removes are persistent", (done) => {
            d.insert({ a: 1, hello: "world" }, (err, doc1) => {
                d.insert({ a: 2, hello: "earth" }, (err, doc2) => {
                    d.insert({ a: 3, hello: "moto" }, (err, doc3) => {
                        d.remove({ a: { $in: [1, 3] } }, { multi: true }, (err) => {
                            assert.isNull(err);

                            d.find({}, (err, docs) => {
                                assert.equal(docs.length, 1);
                                assert.deepEqual(docs[0], { _id: doc2._id, a: 2, hello: "earth" });

                                // Even after a reload the database state hasn't changed
                                d.reload((err) => {
                                    assert.isNull(err);

                                    d.find({}, (err, docs) => {
                                        assert.equal(docs.length, 1);
                                        assert.deepEqual(docs[0], { _id: doc2._id, a: 2, hello: "earth" });

                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("Can remove without the options arg (will use defaults then)", (done) => {
            d.insert({ a: 1, hello: "world" }, (err, doc1) => {
                d.insert({ a: 2, hello: "earth" }, (err, doc2) => {
                    d.insert({ a: 5, hello: "pluton" }, (err, doc3) => {
                        d.remove({ a: 2 }, (err, nr) => {
                            assert.isNull(err);
                            assert.equal(nr, 1);
                            d.find({}, (err, docs) => {
                                let d1 = _.find(docs, (doc) => {
                                    return doc._id === doc1._id;
                                })
                                    , d2 = _.find(docs, (doc) => {
                                        return doc._id === doc2._id;
                                    })
                                    , d3 = _.find(docs, (doc) => {
                                        return doc._id === doc3._id;
                                    })
                                    ;

                                assert.equal(d1.a, 1);
                                assert.isUndefined(d2);
                                assert.equal(d3.a, 5);

                                done();
                            });
                        });
                    });
                });
            });
        });


        describe("Events", () => {

            describe("when a document is removed", () => {
                it("emits the removed event with the doc", (done) => {
                    let id;
                    d.on("removed", (docs) => {
                        remove_ids(docs);
                        assert.deepEqual(docs, [id]);
                        done();
                    });
                    d.insert({ a: 1, b: "foo" }, (err, doc) => {
                        if (err) {
                            throw err;
                        }
                        id = doc._id;
                        d.remove({ a: 1 }, {}, (err) => {
                            if (err) {
                                throw err;
                            }
                        });
                    });
                });
            });

            describe("when multiple documents are removed", () => {
                it("emits the removed event with the docs", (done) => {
                    d.on("removed", (docs) => {
                        remove_ids(docs);
                        assert.equal(docs.length, 2);
                        done();
                    });
                    d.insert([{ a: 1, b: "foo" }, { a: 2, b: "foo" }], (err) => {
                        if (err) {
                            throw err;
                        }
                        d.remove({ b: "foo" }, { multi: true }, (err) => {
                            if (err) {
                                throw err;
                            }
                        });
                    });
                });
            });


        });
    });   // ==== End of 'Remove' ==== //


    describe("Using indexes", () => {
        describe("ensureIndex and index initialization in database loading", () => {
            /*
            it('ensureIndex can be called right after a reload and be initialized and filled correctly', function (done) {
              var now = new Date()
                , rawData = document.serialize({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12] }) + '\n' +
                            document.serialize({ _id: "bbb", z: "2", hello: 'world' }) + '\n' +
                            document.serialize({ _id: "ccc", z: "3", nested: { today: now } })
                ;

              d.getAllData().length, 0);

              fs.writeFile(testDb, rawData, 'utf8', function () {
                d.reload(function () {
                  d.getAllData().length, 3);

                  assert.deepEqual(Object.keys(d.indexes), ['_id']);

                  d.ensureIndex({ fieldName: 'z' });
                  d.indexes.z.fieldName, 'z');
                  d.indexes.z.unique, false);
                  d.indexes.z.sparse, false);
                  d.indexes.z.tree.getNumberOfKeys(), 3);
                  d.indexes.z.tree.search('1')[0], d.getAllData()[0]);
                  d.indexes.z.tree.search('2')[0], d.getAllData()[1]);
                  d.indexes.z.tree.search('3')[0], d.getAllData()[2]);

                  done();
                });
              });
            });

            it('ensureIndex can be called twice on the same field, the second call will have no effect', function (done) {
              Object.keys(d.indexes).length, 1);
              Object.keys(d.indexes)[0], "_id");

              d.insert({ planet: "Earth" }, function () {
                d.insert({ planet: "Mars" }, function () {
                  d.find({}, function (err, docs) {
                    docs.length, 2);

                    d.ensureIndex({ fieldName: "planet" }, function (err) {
                      assert.isNull(err);
                      Object.keys(d.indexes).length, 2);
                      Object.keys(d.indexes)[0], "_id");   
                      Object.keys(d.indexes)[1], "planet");   

                      d.indexes.planet.getAll().length, 2);

                      // This second call has no effect, documents don't get inserted twice in the index
                      d.ensureIndex({ fieldName: "planet" }, function (err) {
                        assert.isNull(err);
                        Object.keys(d.indexes).length, 2);
                        Object.keys(d.indexes)[0], "_id");   
                        Object.keys(d.indexes)[1], "planet");   

                        d.indexes.planet.getAll().length, 2);                

                        done();
                      });
                    });
                  });
                });
              });
            });

            it('ensureIndex can be called after the data set was modified and the index still be correct', function (done) {
              var rawData = document.serialize({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12] }) + '\n' +
                            document.serialize({ _id: "bbb", z: "2", hello: 'world' })
                ;

              d.getAllData().length, 0);

              fs.writeFile(testDb, rawData, 'utf8', function () {
                d.reload(function () {
                  d.getAllData().length, 2);

                  assert.deepEqual(Object.keys(d.indexes), ['_id']);

                  d.insert({ z: "12", yes: 'yes' }, function (err, newDoc1) {
                    d.insert({ z: "14", nope: 'nope' }, function (err, newDoc2) {
                      d.remove({ z: "2" }, {}, function () {
                        d.update({ z: "1" }, { $set: { 'yes': 'yep' } }, {}, function () {
                          assert.deepEqual(Object.keys(d.indexes), ['_id']);

                          d.ensureIndex({ fieldName: 'z' });
                          d.indexes.z.fieldName, 'z');
                          d.indexes.z.unique, false);
                          d.indexes.z.sparse, false);
                          d.indexes.z.tree.getNumberOfKeys(), 3);

                          // The pointers in the _id and z indexes are the same
                          d.indexes.z.tree.search('1')[0], d.indexes._id.getMatching('aaa')[0]);
                          d.indexes.z.tree.search('12')[0], d.indexes._id.getMatching(newDoc1._id)[0]);
                          d.indexes.z.tree.search('14')[0], d.indexes._id.getMatching(newDoc2._id)[0]);

                          // The data in the z index is correct
                          d.find({}, function (err, docs) {
                            var doc0 = _.find(docs, function (doc) { return doc._id === 'aaa'; })
                              , doc1 = _.find(docs, function (doc) { return doc._id === newDoc1._id; })
                              , doc2 = _.find(docs, function (doc) { return doc._id === newDoc2._id; })
                              ;

                            docs.length, 3);

                            assert.deepEqual(doc0, { _id: "aaa", z: "1", a: 2, ages: [1, 5, 12], yes: 'yep' });
                            assert.deepEqual(doc1, { _id: newDoc1._id, z: "12", yes: 'yes' });
                            assert.deepEqual(doc2, { _id: newDoc2._id, z: "14", nope: 'nope' });

                            done();
                          });
                        });
                      });
                    });
                  });
                });
              });
            });

            it('ensureIndex can be called before a reload and still be initialized and filled correctly', function (done) {
              var now = new Date()
                , rawData = document.serialize({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12] }) + '\n' +
                            document.serialize({ _id: "bbb", z: "2", hello: 'world' }) + '\n' +
                            document.serialize({ _id: "ccc", z: "3", nested: { today: now } })
                ;

              d.getAllData().length, 0);

              d.ensureIndex({ fieldName: 'z' });
              d.indexes.z.fieldName, 'z');
              d.indexes.z.unique, false);
              d.indexes.z.sparse, false);
              d.indexes.z.tree.getNumberOfKeys(), 0);

              fs.writeFile(testDb, rawData, 'utf8', function () {
                d.reload(function () {
                  var doc1 = _.find(d.getAllData(), function (doc) { return doc.z === "1"; })
                    , doc2 = _.find(d.getAllData(), function (doc) { return doc.z === "2"; })
                    , doc3 = _.find(d.getAllData(), function (doc) { return doc.z === "3"; })
                    ;

                  d.getAllData().length, 3);

                  d.indexes.z.tree.getNumberOfKeys(), 3);
                  d.indexes.z.tree.search('1')[0], doc1);
                  d.indexes.z.tree.search('2')[0], doc2);
                  d.indexes.z.tree.search('3')[0], doc3);

                  done();
                });
              });
            });

            it('Can initialize multiple indexes on a database load', function (done) {
              var now = new Date()
                , rawData = document.serialize({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12] }) + '\n' +
                            document.serialize({ _id: "bbb", z: "2", a: 'world' }) + '\n' +
                            document.serialize({ _id: "ccc", z: "3", a: { today: now } })
                ;

              d.getAllData().length, 0);

              d.ensureIndex({ fieldName: 'z' });
              d.ensureIndex({ fieldName: 'a' });
              d.indexes.a.tree.getNumberOfKeys(), 0);
              d.indexes.z.tree.getNumberOfKeys(), 0);

              fs.writeFile(testDb, rawData, 'utf8', function () {
                d.reload(function () {
                  var doc1 = _.find(d.getAllData(), function (doc) { return doc.z === "1"; })
                    , doc2 = _.find(d.getAllData(), function (doc) { return doc.z === "2"; })
                    , doc3 = _.find(d.getAllData(), function (doc) { return doc.z === "3"; })
                    ;

                  d.getAllData().length, 3);

                  d.indexes.z.tree.getNumberOfKeys(), 3);
                  d.indexes.z.tree.search('1')[0], doc1);
                  d.indexes.z.tree.search('2')[0], doc2);
                  d.indexes.z.tree.search('3')[0], doc3);

                  d.indexes.a.tree.getNumberOfKeys(), 3);
                  d.indexes.a.tree.search(2)[0], doc1);
                  d.indexes.a.tree.search('world')[0], doc2);
                  d.indexes.a.tree.search({ today: now })[0], doc3);

                  done();
                });
              });
            });

            it('If a unique constraint is not respected, database loading will not work and no data will be inserted', function (done) {
              var now = new Date()
                , rawData = document.serialize({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12] }) + '\n' +
                            document.serialize({ _id: "bbb", z: "2", a: 'world' }) + '\n' +
                            document.serialize({ _id: "ccc", z: "1", a: { today: now } })
                ;

              d.getAllData().length, 0);

              d.ensureIndex({ fieldName: 'z', unique: true });
              d.indexes.z.tree.getNumberOfKeys(), 0);

              fs.writeFile(testDb, rawData, 'utf8', function () {
                d.reload(function (err) {
                  err.errorType, 'uniqueViolated');
                  err.key, "1");
                  d.getAllData().length, 0);
                  d.indexes.z.tree.getNumberOfKeys(), 0);

                  done();
                });
              });
            });

            it('If a unique constraint is not respected, ensureIndex will return an error and not create an index', function (done) {
              d.insert({ a: 1, b: 4 }, function () {
                d.insert({ a: 2, b: 45 }, function () {
                  d.insert({ a: 1, b: 3 }, function () {
                    d.ensureIndex({ fieldName: 'b' }, function (err) {
                      assert.isNull(err);

                      d.ensureIndex({ fieldName: 'a', unique: true }, function (err) {
                        err.errorType, 'uniqueViolated');
                        assert.deepEqual(Object.keys(d.indexes), ['_id', 'b']);

                        done();
                      });
                    });
                  });
                });
              });
            });

            it('Can remove an index', function (done) {
              d.ensureIndex({ fieldName: 'e' }, function (err) {
                assert.isNull(err);

                Object.keys(d.indexes).length, 2);
                assert.isNotNull(d.indexes.e);

                d.removeIndex("e", function (err) {
                  assert.isNull(err);
                  Object.keys(d.indexes).length, 1);
                  assert.isUndefined(d.indexes.e); 

                  done();
                });
              });
            });
          */

        });   // ==== End of 'ensureIndex and index initialization in database loading' ==== //


        describe("Indexing newly inserted documents", () => {

            it("Newly inserted documents are indexed", (done) => {
                d.ensureIndex({ fieldName: "z" });
                assert.equal(d.indexes.z.tree.getNumberOfKeys(), 0);

                d.insert({ a: 2, z: "yes" }, (err, newDoc) => {
                    assert.equal(d.indexes.z.tree.getNumberOfKeys(), 1);
                    assert.deepEqual(d.indexes.z.getMatching("yes"), [newDoc._id]);

                    d.insert({ a: 5, z: "nope" }, (err, newDoc) => {
                        assert.equal(d.indexes.z.tree.getNumberOfKeys(), 2);
                        assert.deepEqual(d.indexes.z.getMatching("nope"), [newDoc._id]);

                        done();
                    });
                });
            });

            it("If multiple indexes are defined, the document is inserted in all of them", (done) => {
                d.ensureIndex({ fieldName: "z" });
                d.ensureIndex({ fieldName: "ya" });
                assert.equal(d.indexes.z.tree.getNumberOfKeys(), 0);

                d.insert({ a: 2, z: "yes", ya: "indeed" }, (err, newDoc) => {
                    assert.equal(d.indexes.z.tree.getNumberOfKeys(), 1);
                    assert.equal(d.indexes.ya.tree.getNumberOfKeys(), 1);
                    assert.deepEqual(d.indexes.z.getMatching("yes"), [newDoc._id]);
                    assert.deepEqual(d.indexes.ya.getMatching("indeed"), [newDoc._id]);

                    d.insert({ a: 5, z: "nope", ya: "sure" }, (err, newDoc2) => {
                        assert.equal(d.indexes.z.tree.getNumberOfKeys(), 2);
                        assert.equal(d.indexes.ya.tree.getNumberOfKeys(), 2);
                        assert.deepEqual(d.indexes.z.getMatching("nope"), [newDoc2._id]);
                        assert.deepEqual(d.indexes.ya.getMatching("sure"), [newDoc2._id]);

                        done();
                    });
                });
            });

            it("Can insert two docs at the same key for a non unique index", (done) => {
                d.ensureIndex({ fieldName: "z" });
                assert.equal(d.indexes.z.tree.getNumberOfKeys(), 0);

                d.insert({ a: 2, z: "yes" }, (err, newDoc) => {
                    assert.equal(d.indexes.z.tree.getNumberOfKeys(), 1);
                    assert.deepEqual(d.indexes.z.getMatching("yes"), [newDoc._id]);

                    d.insert({ a: 5, z: "yes" }, (err, newDoc2) => {
                        assert.equal(d.indexes.z.tree.getNumberOfKeys(), 1);
                        assert.deepEqual(d.indexes.z.getMatching("yes"), [newDoc._id, newDoc2._id]);

                        done();
                    });
                });
            });

            it("If the index has a unique constraint, an error is thrown if it is violated and the data is not modified", (done) => {
                d.ensureIndex({ fieldName: "y", unique: true });
                assert.equal(d.indexes.y.tree.getNumberOfKeys(), 0);

                d.insert({ a: 2, y: "yes" }, (err, newDoc) => {
                    assert.equal(d.indexes.y.tree.getNumberOfKeys(), 1);
                    assert.deepEqual(d.indexes.y.getMatching("yes"), [newDoc._id]);

                    d.insert({ a: 5, y: "yes" }, (err) => {
                        assert.isNotNull(err);
                        assert.equal(err.errorType, "uniqueViolated");
                        assert.equal(err.key, "yes");

                        // Index didn't change
                        assert.equal(d.indexes.y.tree.getNumberOfKeys(), 1);
                        assert.deepEqual(d.indexes.y.getMatching("yes"), [newDoc._id]);

                        // Data didn't change
                        assert.deepEqual(d.getAllData(), [newDoc._id]);
                        d.reload(() => {
                            d.find({}, (err, docs) => {
                                assert.equal(docs.length, 1);
                                assert.deepEqual(docs[0], newDoc);

                                done();
                            });
                        });
                    });
                });
            });

            it("If an index has a unique constraint, other indexes cannot be modified when it raises an error", (done) => {
                d.ensureIndex({ fieldName: "nonu1" });
                d.ensureIndex({ fieldName: "uni", unique: true });
                d.ensureIndex({ fieldName: "nonu2" });

                d.insert({ nonu1: "yes", nonu2: "yes2", uni: "willfail" }, (err, newDoc) => {
                    assert.isNull(err);
                    assert.equal(d.indexes.nonu1.tree.getNumberOfKeys(), 1);
                    assert.equal(d.indexes.uni.tree.getNumberOfKeys(), 1);
                    assert.equal(d.indexes.nonu2.tree.getNumberOfKeys(), 1);

                    d.insert({ nonu1: "no", nonu2: "no2", uni: "willfail" }, (err) => {
                        assert.equal(err.errorType, "uniqueViolated");

                        // No index was modified
                        assert.equal(d.indexes.nonu1.tree.getNumberOfKeys(), 1);
                        assert.equal(d.indexes.uni.tree.getNumberOfKeys(), 1);
                        assert.equal(d.indexes.nonu2.tree.getNumberOfKeys(), 1);

                        assert.deepEqual(d.indexes.nonu1.getMatching("yes"), [newDoc._id]);
                        assert.deepEqual(d.indexes.uni.getMatching("willfail"), [newDoc._id]);
                        assert.deepEqual(d.indexes.nonu2.getMatching("yes2"), [newDoc._id]);

                        done();
                    });
                });
            });

            it("Unique indexes prevent you from inserting two docs where the field is undefined except if theyre sparse", (done) => {
                d.ensureIndex({ fieldName: "zzz", unique: true });
                assert.equal(d.indexes.zzz.tree.getNumberOfKeys(), 0);

                d.insert({ a: 2, z: "yes" }, (err, newDoc) => {
                    assert.equal(d.indexes.zzz.tree.getNumberOfKeys(), 1);
                    assert.deepEqual(d.indexes.zzz.getMatching(undefined), [newDoc._id]);

                    d.insert({ a: 5, z: "other" }, (err) => {
                        assert.equal(err.errorType, "uniqueViolated");
                        assert.isUndefined(err.key);

                        d.ensureIndex({ fieldName: "yyy", unique: true, sparse: true });

                        d.insert({ a: 5, z: "other", zzz: "set" }, (err) => {
                            assert.isNull(err);
                            assert.equal(d.indexes.yyy.getAll().length, 0);   // Nothing indexed
                            assert.equal(d.indexes.zzz.getAll().length, 2);

                            done();
                        });
                    });
                });
            });

            it("Insertion still works as before with indexing", (done) => {
                d.ensureIndex({ fieldName: "a" });
                d.ensureIndex({ fieldName: "b" });

                d.insert({ a: 1, b: "hello" }, (err, doc1) => {
                    d.insert({ a: 2, b: "si" }, (err, doc2) => {
                        d.find({}, (err, docs) => {
                            assert.deepEqual(doc1, _.find(docs, (d) => {
                                return d._id === doc1._id;
                            }));
                            assert.deepEqual(doc2, _.find(docs, (d) => {
                                return d._id === doc2._id;
                            }));

                            done();
                        });
                    });
                });
            });

            it("All indexes point to the same data as the main index on _id", (done) => {
                d.ensureIndex({ fieldName: "a" });

                d.insert({ a: 1, b: "hello" }, (err, doc1) => {
                    d.insert({ a: 2, b: "si" }, (err, doc2) => {
                        d.find({}, (err, docs) => {
                            assert.equal(docs.length, 2);
                            assert.equal(d.getAllData().length, 2);

                            assert.equal(d.indexes._id.getMatching(doc1._id).length, 1);
                            assert.equal(d.indexes.a.getMatching(1).length, 1);
                            assert.equal(d.indexes._id.getMatching(doc1._id)[0], d.indexes.a.getMatching(1)[0]);

                            assert.equal(d.indexes._id.getMatching(doc2._id).length, 1);
                            assert.equal(d.indexes.a.getMatching(2).length, 1);
                            assert.equal(d.indexes._id.getMatching(doc2._id)[0], d.indexes.a.getMatching(2)[0]);

                            done();
                        });
                    });
                });
            });

            it("If a unique constraint is violated, no index is changed, including the main one", (done) => {
                d.ensureIndex({ fieldName: "a", unique: true });

                d.insert({ a: 1, b: "hello" }, (err, doc1) => {
                    d.insert({ a: 1, b: "si" }, (err) => {
                        assert.isDefined(err);

                        d.find({}, (err, docs) => {
                            assert.equal(docs.length, 1);
                            assert.equal(d.getAllData().length, 1);

                            assert.equal(d.indexes._id.getMatching(doc1._id).length, 1);
                            assert.equal(d.indexes.a.getMatching(1).length, 1);
                            assert.equal(d.indexes._id.getMatching(doc1._id)[0], d.indexes.a.getMatching(1)[0]);

                            assert.equal(d.indexes.a.getMatching(2).length, 0);

                            done();
                        });
                    });
                });
            });

        });   // ==== End of 'Indexing newly inserted documents' ==== //

        describe("Updating indexes upon document update", () => {

            it("Updating docs still works as before with indexing", (done) => {
                d.ensureIndex({ fieldName: "a" });

                d.insert({ a: 1, b: "hello" }, (err, _doc1) => {
                    d.insert({ a: 2, b: "si" }, (err, _doc2) => {
                        d.update({ a: 1 }, { $set: { a: 456, b: "no" } }, {}, (err, nr) => {
                            const data = d.getAllData();
                            async.map(data, d.findById.bind(d), (err, data) => {
                                let doc1 = _.find(data, (doc) => {
                                    return doc._id === _doc1._id;
                                })
                                    , doc2 = _.find(data, (doc) => {
                                        return doc._id === _doc2._id;
                                    })
                                    ;

                                assert.isNull(err);
                                assert.equal(nr, 1);

                                assert.equal(data.length, 2);
                                assert.deepEqual(doc1, { a: 456, b: "no", _id: _doc1._id });
                                assert.deepEqual(doc2, { a: 2, b: "si", _id: _doc2._id });

                                d.update({}, { $inc: { a: 10 }, $set: { b: "same" } }, { multi: true }, (err, nr) => {
                                    const data = d.getAllData();
                                    async.map(data, d.findById.bind(d), (err, data) => {

                                        let doc1 = _.find(data, (doc) => {
                                            return doc._id === _doc1._id;
                                        })
                                            , doc2 = _.find(data, (doc) => {
                                                return doc._id === _doc2._id;
                                            })
                                            ;

                                        assert.isNull(err);
                                        assert.equal(nr, 2);

                                        assert.equal(data.length, 2);
                                        assert.deepEqual(doc1, { a: 466, b: "same", _id: _doc1._id });
                                        assert.deepEqual(doc2, { a: 12, b: "same", _id: _doc2._id });

                                        done();
                                    });
                                });
                            });

                        });
                    });
                });
            });

            it("Indexes get updated when a document (or multiple documents) is updated", (done) => {
                d.ensureIndex({ fieldName: "a" });
                d.ensureIndex({ fieldName: "b" });

                d.insert({ a: 1, b: "hello" }, (err, doc1) => {
                    d.insert({ a: 2, b: "si" }, (err, doc2) => {
                        // Simple update
                        d.update({ a: 1 }, { $set: { a: 456, b: "no" } }, {}, (err, nr) => {
                            assert.isNull(err);
                            assert.equal(nr, 1);

                            assert.equal(d.indexes.a.tree.getNumberOfKeys(), 2);
                            assert.equal(d.indexes.a.getMatching(456)[0], doc1._id);
                            assert.equal(d.indexes.a.getMatching(2)[0], doc2._id);

                            assert.equal(d.indexes.b.tree.getNumberOfKeys(), 2);
                            assert.equal(d.indexes.b.getMatching("no")[0], doc1._id);
                            assert.equal(d.indexes.b.getMatching("si")[0], doc2._id);

                            // The same pointers are shared between all indexes
                            assert.equal(d.indexes.a.tree.getNumberOfKeys(), 2);
                            assert.equal(d.indexes.b.tree.getNumberOfKeys(), 2);
                            assert.equal(d.indexes._id.tree.getNumberOfKeys(), 2);
                            assert.equal(d.indexes.a.getMatching(456)[0], d.indexes._id.getMatching(doc1._id)[0]);
                            assert.equal(d.indexes.b.getMatching("no")[0], d.indexes._id.getMatching(doc1._id)[0]);
                            assert.equal(d.indexes.a.getMatching(2)[0], d.indexes._id.getMatching(doc2._id)[0]);
                            assert.equal(d.indexes.b.getMatching("si")[0], d.indexes._id.getMatching(doc2._id)[0]);

                            // Multi update
                            d.update({}, { $inc: { a: 10 }, $set: { b: "same" } }, { multi: true }, (err, nr) => {
                                assert.isNull(err);
                                assert.equal(nr, 2);

                                assert.equal(d.indexes.a.tree.getNumberOfKeys(), 2);
                                assert.equal(d.indexes.a.getMatching(466)[0], doc1._id);
                                assert.equal(d.indexes.a.getMatching(12)[0], doc2._id);

                                assert.equal(d.indexes.b.tree.getNumberOfKeys(), 1);
                                assert.equal(d.indexes.b.getMatching("same").length, 2);
                                assert.include(d.indexes.b.getMatching("same"), doc1._id);
                                assert.include(d.indexes.b.getMatching("same"), doc2._id);

                                // The same pointers are shared between all indexes
                                assert.equal(d.indexes.a.tree.getNumberOfKeys(), 2);
                                assert.equal(d.indexes.b.tree.getNumberOfKeys(), 1);
                                assert.equal(d.indexes.b.getAll().length, 2);
                                assert.equal(d.indexes._id.tree.getNumberOfKeys(), 2);
                                assert.equal(d.indexes.a.getMatching(466)[0], d.indexes._id.getMatching(doc1._id)[0]);
                                assert.equal(d.indexes.a.getMatching(12)[0], d.indexes._id.getMatching(doc2._id)[0]);
                                // Can't test the pointers in b as their order is randomized, but it is the same as with a

                                done();
                            });
                        });
                    });
                });
            });

            it("If a simple update violates a contraint, all changes are rolled back and an error is thrown", (done) => {
                d.ensureIndex({ fieldName: "a", unique: true });
                d.ensureIndex({ fieldName: "b", unique: true });
                d.ensureIndex({ fieldName: "c", unique: true });

                d.insert({ a: 1, b: 10, c: 100 }, (err, _doc1) => {
                    d.insert({ a: 2, b: 20, c: 200 }, (err, _doc2) => {
                        d.insert({ a: 3, b: 30, c: 300 }, (err, _doc3) => {
                            // Will conflict with doc3
                            d.update({ a: 2 }, { $inc: { a: 10, c: 1000 }, $set: { b: 30 } }, {}, (err) => {
                                const data = d.getAllData();
                                async.map(data, d.findById.bind(d), (er, data) => {
                                    let doc1 = _.find(data, (doc) => {
                                        return doc._id === _doc1._id;
                                    })
                                        , doc2 = _.find(data, (doc) => {
                                            return doc._id === _doc2._id;
                                        })
                                        , doc3 = _.find(data, (doc) => {
                                            return doc._id === _doc3._id;
                                        })
                                        ;

                                    assert.equal(err.errorType, "uniqueViolated");

                                    // Data left unchanged
                                    assert.equal(data.length, 3);
                                    assert.deepEqual(doc1, { a: 1, b: 10, c: 100, _id: _doc1._id });
                                    assert.deepEqual(doc2, { a: 2, b: 20, c: 200, _id: _doc2._id });
                                    assert.deepEqual(doc3, { a: 3, b: 30, c: 300, _id: _doc3._id });

                                    // All indexes left unchanged and pointing to the same docs
                                    assert.equal(d.indexes.a.tree.getNumberOfKeys(), 3);
                                    assert.equal(d.indexes.a.getMatching(1)[0], doc1._id);
                                    assert.equal(d.indexes.a.getMatching(2)[0], doc2._id);
                                    assert.equal(d.indexes.a.getMatching(3)[0], doc3._id);

                                    assert.equal(d.indexes.b.tree.getNumberOfKeys(), 3);
                                    assert.equal(d.indexes.b.getMatching(10)[0], doc1._id);
                                    assert.equal(d.indexes.b.getMatching(20)[0], doc2._id);
                                    assert.equal(d.indexes.b.getMatching(30)[0], doc3._id);

                                    assert.equal(d.indexes.c.tree.getNumberOfKeys(), 3);
                                    assert.equal(d.indexes.c.getMatching(100)[0], doc1._id);
                                    assert.equal(d.indexes.c.getMatching(200)[0], doc2._id);
                                    assert.equal(d.indexes.c.getMatching(300)[0], doc3._id);

                                    done();
                                });

                            });
                        });
                    });
                });
            });

            it("If a multi update violates a contraint, all changes are rolled back and an error is thrown", (done) => {
                d.ensureIndex({ fieldName: "a", unique: true });
                d.ensureIndex({ fieldName: "b", unique: true });
                d.ensureIndex({ fieldName: "c", unique: true });

                d.insert({ a: 1, b: 10, c: 100 }, (err, _doc1) => {
                    d.insert({ a: 2, b: 20, c: 200 }, (err, _doc2) => {
                        d.insert({ a: 3, b: 30, c: 300 }, (err, _doc3) => {
                            // Will conflict with doc3
                            d.update({ a: { $in: [1, 2] } }, { $inc: { a: 10, c: 1000 }, $set: { b: 30 } }, { multi: true }, (err) => {
                                async.map(d.getAllData(), d.findById.bind(d), (er, data) => {
                                    let doc1 = _.find(data, (doc) => {
                                        return doc._id === _doc1._id;
                                    })
                                        , doc2 = _.find(data, (doc) => {
                                            return doc._id === _doc2._id;
                                        })
                                        , doc3 = _.find(data, (doc) => {
                                            return doc._id === _doc3._id;
                                        })
                                        ;

                                    assert.equal(err.errorType, "uniqueViolated");

                                    // Data left unchanged
                                    assert.equal(data.length, 3);
                                    assert.deepEqual(doc1, { a: 1, b: 10, c: 100, _id: _doc1._id });
                                    assert.deepEqual(doc2, { a: 2, b: 20, c: 200, _id: _doc2._id });
                                    assert.deepEqual(doc3, { a: 3, b: 30, c: 300, _id: _doc3._id });

                                    // All indexes left unchanged and pointing to the same docs
                                    assert.equal(d.indexes.a.tree.getNumberOfKeys(), 3);
                                    assert.equal(d.indexes.a.getMatching(1)[0], doc1._id);
                                    assert.equal(d.indexes.a.getMatching(2)[0], doc2._id);
                                    assert.equal(d.indexes.a.getMatching(3)[0], doc3._id);

                                    assert.equal(d.indexes.b.tree.getNumberOfKeys(), 3);
                                    assert.equal(d.indexes.b.getMatching(10)[0], doc1._id);
                                    assert.equal(d.indexes.b.getMatching(20)[0], doc2._id);
                                    assert.equal(d.indexes.b.getMatching(30)[0], doc3._id);

                                    assert.equal(d.indexes.c.tree.getNumberOfKeys(), 3);
                                    assert.equal(d.indexes.c.getMatching(100)[0], doc1._id);
                                    assert.equal(d.indexes.c.getMatching(200)[0], doc2._id);
                                    assert.equal(d.indexes.c.getMatching(300)[0], doc3._id);

                                    done();
                                });
                            });
                        });
                    });
                });
            });

        });   // ==== End of 'Updating indexes upon document update' ==== //

        describe("Updating indexes upon document remove", () => {

            it("Removing docs still works as before with indexing", (done) => {
                d.ensureIndex({ fieldName: "a" });

                d.insert({ a: 1, b: "hello" }, (err, _doc1) => {
                    d.insert({ a: 2, b: "si" }, (err, _doc2) => {
                        d.insert({ a: 3, b: "coin" }, (err, _doc3) => {
                            d.remove({ a: 1 }, {}, (err, nr) => {
                                async.map(d.getAllData(), d.findById.bind(d), (er, data) => {
                                    let doc2 = _.find(data, (doc) => {
                                        return doc._id === _doc2._id;
                                    })
                                        , doc3 = _.find(data, (doc) => {
                                            return doc._id === _doc3._id;
                                        })
                                        ;

                                    assert.isNull(err);
                                    assert.equal(nr, 1);

                                    assert.equal(data.length, 2);
                                    assert.deepEqual(doc2, { a: 2, b: "si", _id: _doc2._id });
                                    assert.deepEqual(doc3, { a: 3, b: "coin", _id: _doc3._id });

                                    d.remove({ a: { $in: [2, 3] } }, { multi: true }, (err, nr) => {
                                        const data = d.getAllData();

                                        assert.isNull(err);
                                        assert.equal(nr, 2);
                                        assert.equal(data.length, 0);

                                        done();
                                    });
                                });

                            });
                        });
                    });
                });
            });

            it("Indexes get updated when a document (or multiple documents) is removed", (done) => {
                d.ensureIndex({ fieldName: "a" });
                d.ensureIndex({ fieldName: "b" });

                d.insert({ a: 1, b: "hello" }, (err, doc1) => {
                    d.insert({ a: 2, b: "si" }, (err, doc2) => {
                        d.insert({ a: 3, b: "coin" }, (err, doc3) => {
                            // Simple remove
                            d.remove({ a: 1 }, {}, (err, nr) => {
                                assert.isNull(err);
                                assert.equal(nr, 1);

                                assert.equal(d.indexes.a.tree.getNumberOfKeys(), 2);
                                assert.equal(d.indexes.a.getMatching(2)[0], doc2._id);
                                assert.equal(d.indexes.a.getMatching(3)[0], doc3._id);

                                assert.equal(d.indexes.b.tree.getNumberOfKeys(), 2);
                                assert.equal(d.indexes.b.getMatching("si")[0], doc2._id);
                                assert.equal(d.indexes.b.getMatching("coin")[0], doc3._id);

                                // The same pointers are shared between all indexes
                                assert.equal(d.indexes.a.tree.getNumberOfKeys(), 2);
                                assert.equal(d.indexes.b.tree.getNumberOfKeys(), 2);
                                assert.equal(d.indexes._id.tree.getNumberOfKeys(), 2);
                                assert.equal(d.indexes.a.getMatching(2)[0], d.indexes._id.getMatching(doc2._id)[0]);
                                assert.equal(d.indexes.b.getMatching("si")[0], d.indexes._id.getMatching(doc2._id)[0]);
                                assert.equal(d.indexes.a.getMatching(3)[0], d.indexes._id.getMatching(doc3._id)[0]);
                                assert.equal(d.indexes.b.getMatching("coin")[0], d.indexes._id.getMatching(doc3._id)[0]);

                                // Multi remove
                                d.remove({}, { multi: true }, (err, nr) => {
                                    assert.isNull(err);
                                    assert.equal(nr, 2);

                                    assert.equal(d.indexes.a.tree.getNumberOfKeys(), 0);
                                    assert.equal(d.indexes.b.tree.getNumberOfKeys(), 0);
                                    assert.equal(d.indexes._id.tree.getNumberOfKeys(), 0);

                                    done();
                                });
                            });
                        });
                    });
                });
            });

        });   // ==== End of 'Updating indexes upon document remove' ==== //


        /*
        describe('Persisting indexes', function () {

          it('Indexes are persisted to a separate file and recreated upon reload', function (done) {
            var persDb = "workspace/persistIndexes.db"
              , db
              ;

            if (fs.existsSync(persDb)) { fs.writeFileSync(persDb, '', 'utf8'); }
            db = new Model({ filename: persDb, autoload: true });

            Object.keys(db.indexes).length, 1);
            Object.keys(db.indexes)[0], "_id");

            db.insert({ planet: "Earth" }, function (err) {
              assert.isNull(err);
              db.insert({ planet: "Mars" }, function (err) {
                assert.isNull(err);

                db.ensureIndex({ fieldName: "planet" }, function (err) {
                  Object.keys(db.indexes).length, 2);
                  Object.keys(db.indexes)[0], "_id");
                  Object.keys(db.indexes)[1], "planet");              
                  db.indexes._id.getAll().length, 2);
                  db.indexes.planet.getAll().length, 2);
                  db.indexes.planet.fieldName, "planet");

                  // After a reload the indexes are recreated
                  db = new Model({ filename: persDb });
                  db.reload(function (err) {
                    assert.isNull(err);
                    Object.keys(db.indexes).length, 2);
                    Object.keys(db.indexes)[0], "_id");
                    Object.keys(db.indexes)[1], "planet");                
                    db.indexes._id.getAll().length, 2);
                    db.indexes.planet.getAll().length, 2);
                    db.indexes.planet.fieldName, "planet");

                    // After another reload the indexes are still there (i.e. they are preserved during autocompaction)
                    db = new Model({ filename: persDb });
                    db.reload(function (err) {
                      assert.isNull(err);
                      Object.keys(db.indexes).length, 2);
                      Object.keys(db.indexes)[0], "_id");
                      Object.keys(db.indexes)[1], "planet");                
                      db.indexes._id.getAll().length, 2);
                      db.indexes.planet.getAll().length, 2);
                      db.indexes.planet.fieldName, "planet");

                      done();                
                    });
                  });
                });
              });
            });
          });

          it('Indexes are persisted with their options and recreated even if some db operation happen between loads', function (done) {
            var persDb = "workspace/persistIndexes.db"
              , db
              ;

            if (fs.existsSync(persDb)) { fs.writeFileSync(persDb, '', 'utf8'); }
            db = new Model({ filename: persDb, autoload: true });

            Object.keys(db.indexes).length, 1);
            Object.keys(db.indexes)[0], "_id");

            db.insert({ planet: "Earth" }, function (err) {
              assert.isNull(err);
              db.insert({ planet: "Mars" }, function (err) {
                assert.isNull(err);

                db.ensureIndex({ fieldName: "planet", unique: true, sparse: false }, function (err) {
                  Object.keys(db.indexes).length, 2);
                  Object.keys(db.indexes)[0], "_id");
                  Object.keys(db.indexes)[1], "planet");              
                  db.indexes._id.getAll().length, 2);
                  db.indexes.planet.getAll().length, 2);
                  db.indexes.planet.unique, true);
                  db.indexes.planet.sparse, false);

                  db.insert({ planet: "Jupiter" }, function (err) {
                    assert.isNull(err);

                    // After a reload the indexes are recreated
                    db = new Model({ filename: persDb });
                    db.reload(function (err) {
                      assert.isNull(err);
                      Object.keys(db.indexes).length, 2);
                      Object.keys(db.indexes)[0], "_id");
                      Object.keys(db.indexes)[1], "planet");                
                      db.indexes._id.getAll().length, 3);
                      db.indexes.planet.getAll().length, 3);
                      db.indexes.planet.unique, true);
                      db.indexes.planet.sparse, false);

                      db.ensureIndex({ fieldName: 'bloup', unique: false, sparse: true }, function (err) {
                        assert.isNull(err);
                        Object.keys(db.indexes).length, 3);
                        Object.keys(db.indexes)[0], "_id");
                        Object.keys(db.indexes)[1], "planet");
                        Object.keys(db.indexes)[2], "bloup");
                        db.indexes._id.getAll().length, 3);
                        db.indexes.planet.getAll().length, 3);
                        db.indexes.bloup.getAll().length, 0);
                        db.indexes.planet.unique, true);
                        db.indexes.planet.sparse, false);                  
                        db.indexes.bloup.unique, false);
                        db.indexes.bloup.sparse, true);                  

                        // After another reload the indexes are still there (i.e. they are preserved during autocompaction)
                        db = new Model({ filename: persDb });
                        db.reload(function (err) {
                          assert.isNull(err);
                          Object.keys(db.indexes).length, 3);
                          Object.keys(db.indexes)[0], "_id");
                          Object.keys(db.indexes)[1], "planet");
                          Object.keys(db.indexes)[2], "bloup");
                          db.indexes._id.getAll().length, 3);
                          db.indexes.planet.getAll().length, 3);
                          db.indexes.bloup.getAll().length, 0);
                          db.indexes.planet.unique, true);
                          db.indexes.planet.sparse, false);
                          db.indexes.bloup.unique, false);
                          db.indexes.bloup.sparse, true);

                          done();                
                        });
                      });
                    });
                  });
                });
              });
            });
          });

          it('Indexes can also be removed and the remove persisted', function (done) {
            var persDb = "workspace/persistIndexes.db"
              , db
              ;

            if (fs.existsSync(persDb)) { fs.writeFileSync(persDb, '', 'utf8'); }
            db = new Model({ filename: persDb, autoload: true });

            Object.keys(db.indexes).length, 1);
            Object.keys(db.indexes)[0], "_id");

            db.insert({ planet: "Earth" }, function (err) {
              assert.isNull(err);
              db.insert({ planet: "Mars" }, function (err) {
                assert.isNull(err);

                db.ensureIndex({ fieldName: "planet" }, function (err) {
                  assert.isNull(err);
                  db.ensureIndex({ fieldName: "another" }, function (err) {
                    assert.isNull(err);
                    Object.keys(db.indexes).length, 3);
                    Object.keys(db.indexes)[0], "_id");
                    Object.keys(db.indexes)[1], "planet");
                    Object.keys(db.indexes)[2], "another");
                    db.indexes._id.getAll().length, 2);
                    db.indexes.planet.getAll().length, 2);
                    db.indexes.planet.fieldName, "planet");

                    // After a reload the indexes are recreated
                    db = new Model({ filename: persDb });
                    db.reload(function (err) {
                      assert.isNull(err);
                      Object.keys(db.indexes).length, 3);
                      Object.keys(db.indexes)[0], "_id");
                      Object.keys(db.indexes)[1], "planet");  
                      Object.keys(db.indexes)[2], "another");                 
                      db.indexes._id.getAll().length, 2);
                      db.indexes.planet.getAll().length, 2);
                      db.indexes.planet.fieldName, "planet");

                      // Index is removed
                      db.removeIndex("planet", function (err) {
                        assert.isNull(err);
                        Object.keys(db.indexes).length, 2);
                        Object.keys(db.indexes)[0], "_id");
                        Object.keys(db.indexes)[1], "another");
                        db.indexes._id.getAll().length, 2);

                        // After a reload indexes are preserved
                        db = new Model({ filename: persDb });
                        db.reload(function (err) {
                          assert.isNull(err);
                          Object.keys(db.indexes).length, 2);
                          Object.keys(db.indexes)[0], "_id");
                          Object.keys(db.indexes)[1], "another");
                          db.indexes._id.getAll().length, 2);

                          // After another reload the indexes are still there (i.e. they are preserved during autocompaction)
                          db = new Model({ filename: persDb });
                          db.reload(function (err) {
                            assert.isNull(err);
                            Object.keys(db.indexes).length, 2);
                            Object.keys(db.indexes)[0], "_id");
                            Object.keys(db.indexes)[1], "another");
                            db.indexes._id.getAll().length, 2);

                            done();                
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });

        });   // ==== End of 'Persisting indexes' ====    
        */
    });   // ==== End of 'Using indexes' ==== //
});
