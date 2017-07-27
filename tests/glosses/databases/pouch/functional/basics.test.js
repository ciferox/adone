const { is } = adone;
require("./node.setup");

const adapters = ["http", "local"];

adapters.forEach((adapter) => {

    describe(`test.basics.js-${adapter}`, () => {

        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl(adapter, "testdb");
            testUtils.cleanup([dbs.name], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });


        it("Create a pouch without new keyword", () => {
            /* jshint newcap:false */
            const db = PouchDB(dbs.name);
            assert.instanceOf(db, PouchDB);
        });

        it("Name is accessible via instance", () => {
            const db = new PouchDB(dbs.name);
            assert.equal(db.name, dbs.name);
        });

        it("4314 Create a pouch with + in name", () => {
            const db = new PouchDB(`${dbs.name}+suffix`);
            return db.info().then(() => {
                return db.destroy();
            });
        });

        it("Creating Pouch without name will throw", (done) => {
            try {
                new PouchDB();
                done("Should have thrown");
            } catch (err) {
                assert.equal(err instanceof Error, true, "should be an error");
                done();
            }
        });

        it("4314 Create a pouch with urlencoded name", () => {
            const db = new PouchDB(`${dbs.name}some%2Ftest`);
            return db.info().then(() => {
                return db.destroy();
            });
        });

        it("4219 destroy a pouch", () => {
            return new PouchDB(dbs.name).destroy({});
        });

        it("4339 throw useful error if method called on stale instance", () => {
            const db = new PouchDB(dbs.name);

            return db.put({
                _id: "cleanTest"
            }).then(() => {
                return db.destroy();
            }).then(() => {
                return db.get("cleanTest");
            }).then(() => {
                throw new Error(".get should return an error");
            }, (err) => {
                assert.equal(err instanceof Error, true, "should be an error");
            });
        });

        it("[4595] should reject xhr errors", (done) => {
            const invalidUrl = "http:///";
            new PouchDB(dbs.name).replicate.to(invalidUrl, {}).catch(() => {
                done();
            });

        });

        it("[4595] should emit error event on xhr error", (done) => {
            const invalidUrl = "http:///";
            new PouchDB(dbs.name).replicate.to(invalidUrl, {})
                .on("error", () => {
                    done();
                });
        });

        it("Add a doc", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "somestuff" }, (err) => {
                assert.isNull(err);
                done();
            });
        });

        it("Get invalid id", () => {
            const db = new PouchDB(dbs.name);
            return db.get(1234).then(() => {
                throw new Error("should not be here");
            }).catch((err) => {
                assert.exists(err);
            });
        });

        it("Missing doc should contain ID in error object", () => {
            const db = new PouchDB(dbs.name);
            return db.get("abc-123").then(() => {
                throw new Error("should not be here");
            }).catch((err) => {
                assert.exists(err);
                assert.equal(err.docId, "abc-123");
            });
        });

        it("PUTed Conflicted doc should contain ID in error object", () => {
            const db = new PouchDB(dbs.name);
            let savedDocId;
            return db.post({}).then((info) => {
                savedDocId = info.id;
                return db.put({
                    _id: savedDocId
                });
            }).then(() => {
                throw new Error("should not be here");
            }).catch((err) => {
                assert.propertyVal(err, "status", 409);
                assert.equal(err.docId, savedDocId);
            });
        });

        it("POSTed Conflicted doc should contain ID in error object", () => {
            const db = new PouchDB(dbs.name);
            let savedDocId;
            return db.post({}).then((info) => {
                savedDocId = info.id;
                return db.post({
                    _id: savedDocId
                });
            }).then(() => {
                throw new Error("should not be here");
            }).catch((err) => {
                assert.propertyVal(err, "status", 409);
                assert.equal(err.docId, savedDocId);
            });
        });

        it("Add a doc with a promise", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "somestuff" }).then(() => {
                done();
            }, done);
        });

        it("Add a doc with opts object", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "somestuff" }, {}, (err) => {
                assert.isNull(err);
                done();
            });
        });

        it("Modify a doc", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "somestuff" }, (err, info) => {
                db.put({
                    _id: info.id,
                    _rev: info.rev,
                    another: "test"
                }, (err, info2) => {
                    assert.isNull(err);
                    assert.notEqual(info.rev, info2.rev);
                    done();
                });
            });
        });

        it("Modify a doc with a promise", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "promisestuff" }).then((info) => {
                return db.put({
                    _id: info.id,
                    _rev: info.rev,
                    another: "test"
                }).then((info2) => {
                    assert.notEqual(info.rev, info2.rev);
                });
            }).catch(done).then(() => {
                done();
            });
        });

        it("Read db id", (done) => {
            const db = new PouchDB(dbs.name);
            db.id((err, id) => {
                assert.isString(id);
                done(err);
            });
        });

        it("Read db id with promise", (done) => {
            const db = new PouchDB(dbs.name);
            db.id().then((id) => {
                assert.isString(id);
                done();
            });
        });

        it("Close db", (done) => {
            const db = new PouchDB(dbs.name);
            db.info().then(() => {
                db.close(done);
            });
        });

        it("Close db with a promise", () => {
            const db = new PouchDB(dbs.name);
            return db.close();
        });

        it("Read db id after closing Close", (done) => {
            let db = new PouchDB(dbs.name);
            db.close(() => {
                db = new PouchDB(dbs.name);
                db.id((err, id) => {
                    assert.isString(id);
                    done();
                });
            });
        });

        it("Modify a doc with incorrect rev", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "somestuff" }, (err, info) => {
                const nDoc = {
                    _id: info.id,
                    _rev: `${info.rev}broken`,
                    another: "test"
                };
                db.put(nDoc, (err) => {
                    assert.exists(err);
                    done();
                });
            });
        });

        it("Remove doc", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "somestuff" }, (err, info) => {
                db.remove({
                    test: "somestuff",
                    _id: info.id,
                    _rev: info.rev
                }, () => {
                    db.get(info.id, (err) => {
                        assert.exists(err.error);
                        done();
                    });
                });
            });
        });

        it("Remove doc with a promise", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "someotherstuff" }).then((info) => {
                return db.remove({
                    test: "someotherstuff",
                    _id: info.id,
                    _rev: info.rev
                }).then(() => {
                    return db.get(info.id).then(() => {
                        done(true);
                    }, (err) => {
                        assert.exists(err.error);
                        done();
                    });
                });
            });
        });

        it("Remove doc with new syntax", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "somestuff" }, (err, info) => {
                db.remove(info.id, info.rev, (err) => {
                    assert.isNull(err);
                    db.get(info.id, (err) => {
                        assert.exists(err);
                        done();
                    });
                });
            });
        });

        it("Remove doc with new syntax and a promise", (done) => {
            const db = new PouchDB(dbs.name);
            let id;
            db.post({ test: "someotherstuff" }).then((info) => {
                id = info.id;
                return db.remove(info.id, info.rev);
            }).then(() => {
                return db.get(id);
            }).then(() => {
                done(true);
            }, (err) => {
                assert.exists(err.error);
                done();
            });
        });

        it("Doc removal leaves only stub", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({ _id: "foo", value: "test" }, () => {
                db.get("foo", (err, doc) => {
                    db.remove(doc, (err, res) => {
                        db.get("foo", { rev: res.rev }, (err, doc) => {
                            assert.deepEqual(doc, {
                                _id: res.id,
                                _rev: res.rev,
                                _deleted: true
                            });
                            done();
                        });
                    });
                });
            });
        });

        it("Remove doc twice with specified id", () => {
            const db = new PouchDB(dbs.name);
            return db.put({ _id: "specifiedId", test: "somestuff" }).then(() => {
                return db.get("specifiedId");
            }).then((doc) => {
                return db.remove(doc);
            }).then(() => {
                return db.put({
                    _id: "specifiedId",
                    test: "somestuff2"
                });
            }).then(() => {
                return db.get("specifiedId");
            }).then((doc) => {
                return db.remove(doc);
            });
        });

        it("Remove doc, no callback", (done) => {
            const db = new PouchDB(dbs.name);
            var changes = db.changes({
                live: true,
                include_docs: true
            }).on("change", (change) => {
                if (change.doc._deleted) {
                    changes.cancel();
                }
            }).on("complete", (result) => {
                assert.equal(result.status, "cancelled");
                done();
            }).on("error", done);
            db.post({ _id: "somestuff" }, (err, res) => {
                db.remove({
                    _id: res.id,
                    _rev: res.rev
                });
            });
        });

        it("Delete document without id", (done) => {
            const db = new PouchDB(dbs.name);
            db.remove({ test: "ing" }, (err) => {
                assert.exists(err);
                done();
            });
        });

        it("Delete document with many args", () => {
            const db = new PouchDB(dbs.name);
            const doc = { _id: "foo" };
            return db.put(doc).then((info) => {
                return db.remove(doc._id, info.rev, {});
            });
        });

        it("Delete document with many args, callback style", (done) => {
            const db = new PouchDB(dbs.name);
            const doc = { _id: "foo" };
            db.put(doc, (err, info) => {
                assert.isNull(err);
                db.remove(doc._id, info.rev, {}, (err) => {
                    assert.isNull(err);
                    done();
                });
            });
        });

        it("Delete doc with id + rev + no opts", () => {
            const db = new PouchDB(dbs.name);
            const doc = { _id: "foo" };
            return db.put(doc).then((info) => {
                return db.remove(doc._id, info.rev);
            });
        });

        it("Delete doc with id + rev + no opts, callback style", (done) => {
            const db = new PouchDB(dbs.name);
            const doc = { _id: "foo" };
            db.put(doc, (err, info) => {
                assert.isNull(err);
                db.remove(doc._id, info.rev, (err) => {
                    assert.isNull(err);
                    done();
                });
            });
        });

        it("Delete doc with doc + opts", () => {
            const db = new PouchDB(dbs.name);
            const doc = { _id: "foo" };
            return db.put(doc).then((info) => {
                doc._rev = info.rev;
                return db.remove(doc, {});
            });
        });

        it("Delete doc with doc + opts, callback style", (done) => {
            const db = new PouchDB(dbs.name);
            const doc = { _id: "foo" };
            db.put(doc, (err, info) => {
                assert.isNull(err);
                doc._rev = info.rev;
                db.remove(doc, {}, (err) => {
                    assert.isNull(err);
                    done();
                });
            });
        });

        it("Delete doc with rev in opts", () => {
            const db = new PouchDB(dbs.name);
            const doc = { _id: "foo" };
            return db.put(doc).then((info) => {
                return db.remove(doc, { rev: info.rev });
            });
        });

        it("Bulk docs", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs({
                docs: [
                    { test: "somestuff" },
                    { test: "another" }
                ]
            }, (err, infos) => {
                assert.equal(infos.length, 2);
                assert.equal(infos[0].ok, true);
                assert.equal(infos[1].ok, true);
                done();
            });
        });

        it("Bulk docs with a promise", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs({
                docs: [
                    { test: "somestuff" },
                    { test: "another" }
                ]
            }).then((infos) => {
                assert.equal(infos.length, 2);
                assert.equal(infos[0].ok, true);
                assert.equal(infos[1].ok, true);
                done();
            }).catch(done);
        });

        it("Basic checks", (done) => {
            const db = new PouchDB(dbs.name);
            db.info((err, info) => {
                const updateSeq = info.update_seq;
                const doc = { _id: "0", a: 1, b: 1 };
                assert.equal(info.doc_count, 0);
                db.put(doc, (err, res) => {
                    assert.equal(res.ok, true);
                    assert.property(res, "id");
                    assert.property(res, "rev");
                    db.info((err, info) => {
                        assert.equal(info.doc_count, 1);
                        assert.notEqual(info.update_seq, updateSeq);
                        db.get(doc._id, (err, doc) => {
                            assert.equal(doc._id, res.id);
                            assert.equal(doc._rev, res.rev);
                            db.get(doc._id, { revs_info: true }, (err, doc) => {
                                assert.equal(doc._revs_info[0].status, "available");
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("update with invalid rev", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "somestuff" }, (err, info) => {
                assert.isNull(err);
                db.put({
                    _id: info.id,
                    _rev: "undefined",
                    another: "test"
                }, (err) => {
                    assert.exists(err);
                    assert.equal(err.name, "bad_request");
                    done();
                });
            });
        });

        it("Doc validation", (done) => {
            const bad_docs = [
                { _zing: 4 },
                { _zoom: "hello" },
                {
                    zane: "goldfish",
                    _fan: "something smells delicious"
                },
                { _bing: { "wha?": "soda can" } }
            ];
            const db = new PouchDB(dbs.name);
            db.bulkDocs({ docs: bad_docs }, (err) => {
                assert.equal(err.name, "doc_validation");
                assert.equal(err.message, `${testUtils.errors.DOC_VALIDATION.message}: _zing`, "correct error message returned");
                done();
            });
        });

        it("Replication fields (#2442)", (done) => {
            const doc = {
                _replication_id: "test",
                _replication_state: "triggered",
                _replication_state_time: 1,
                _replication_stats: {}
            };
            const db = new PouchDB(dbs.name);
            db.post(doc, (err, resp) => {
                assert.isNull(err);

                db.get(resp.id, (err, doc2) => {
                    assert.isNull(err);

                    assert.equal(doc2._replication_id, "test");
                    assert.equal(doc2._replication_state, "triggered");
                    assert.equal(doc2._replication_state_time, 1);
                    assert.deepEqual(doc2._replication_stats, {});

                    done();
                });
            });
        });

        it("Testing issue #48", (done) => {
            const docs = [
                { _id: "0" }, { _id: "1" }, { _id: "2" },
                { _id: "3" }, { _id: "4" }, { _id: "5" }
            ];
            const TO_SEND = 5;
            let sent = 0;
            let complete = 0;
            let timer;

            const db = new PouchDB(dbs.name);

            const bulkCallback = function (err) {
                assert.isNull(err);
                if (++complete === TO_SEND) {
                    done();
                }
            };

            const save = function () {
                if (++sent === TO_SEND) {
                    clearInterval(timer);
                }
                db.bulkDocs({ docs }, bulkCallback);
            };

            timer = setInterval(save, 10);
        });

        it("Testing valid id", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({
                _id: 123,
                test: "somestuff"
            }, (err) => {
                assert.exists(err);
                assert.include(["bad_request", "illegal_docid"], err.name);
                done();
            });
        });

        it("Put doc without _id should fail", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({ test: "somestuff" }, (err) => {
                assert.exists(err);
                assert.equal(err.message, testUtils.errors.MISSING_ID.message,
                    "correct error message returned");
                done();
            });
        });

        it("Put doc with bad reserved id should fail", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({
                _id: "_i_test",
                test: "somestuff"
            }, (err) => {
                assert.exists(err);
                assert.equal(err.status, testUtils.errors.RESERVED_ID.status);
                assert.equal(err.message, testUtils.errors.RESERVED_ID.message,
                    "correct error message returned");
                done();
            });
        });

        it("update_seq persists", () => {
            let db = new PouchDB(dbs.name);
            return db.post({ test: "somestuff" }).then(() => {
                return db.close();
            }).then(() => {
                db = new PouchDB(dbs.name);
                return db.info();
            }).then((info) => {
                assert.notEqual(info.update_seq, 0);
                assert.equal(info.doc_count, 1);
            });
        });

        it("deletions persists", (done) => {

            const db = new PouchDB(dbs.name);
            const doc = { _id: "staticId", contents: "stuff" };

            function writeAndDelete(cb) {
                db.put(doc, (err, info) => {
                    db.remove({
                        _id: info.id,
                        _rev: info.rev
                    }, () => {
                        cb();
                    });
                });
            }

            writeAndDelete(() => {
                writeAndDelete(() => {
                    db.put(doc, () => {
                        db.get(doc._id, { conflicts: true }, (err, details) => {
                            assert.notProperty(details, "_conflicts");
                            done();
                        });
                    });
                });
            });
        });

        it("#4126 should not store raw Dates", () => {
            const date = new Date();
            const date2 = new Date();
            const date3 = new Date();
            const origDocs = [
                { _id: "1", mydate: date },
                { _id: "2", array: [date2] },
                {
                    _id: "3", deep: { deeper: { deeperstill: date3 } }
                }
            ];
            const db = new PouchDB(dbs.name);
            return db.bulkDocs(origDocs).then(() => {
                return db.allDocs({ include_docs: true });
            }).then((res) => {
                const docs = res.rows.map((row) => {
                    delete row.doc._rev;
                    return row.doc;
                });
                assert.deepEqual(docs, [
                    { _id: "1", mydate: date.toJSON() },
                    { _id: "2", array: [date2.toJSON()] },
                    {
                        _id: "3", deep: { deeper: { deeperstill: date3.toJSON() } }
                    }
                ]);
                assert.instanceOf(origDocs[0].mydate, Date, "date not modified");
                assert.instanceOf(origDocs[1].array[0], Date, "date not modified");
                assert.instanceOf(origDocs[2].deep.deeper.deeperstill, Date, "date not modified");
            });
        });

        it("Create a db with a reserved name", () => {
            const db = new PouchDB("__proto__");
            return db.info().then(() => {
                return db.destroy();
            });
        });

        it("Error when document is not an object", (done) => {
            const db = new PouchDB(dbs.name);
            const doc1 = [{ _id: "foo" }, { _id: "bar" }];
            const doc2 = "this is not an object";
            let count = 5;
            const callback = function (err) {
                assert.exists(err);
                count--;
                if (count === 0) {
                    done();
                }
            };
            db.post(doc1, callback);
            db.post(doc2, callback);
            db.put(doc1, callback);
            db.put(doc2, callback);
            db.bulkDocs({ docs: [doc1, doc2] }, callback);
        });

        it("Test instance update_seq updates correctly", (done) => {
            const db1 = new PouchDB(dbs.name);
            const db2 = new PouchDB(dbs.name);
            db1.post({ a: "doc" }, () => {
                db1.info((err, db1Info) => {
                    db2.info((err, db2Info) => {
                        assert.notEqual(db1Info.update_seq, 0);
                        assert.notEqual(db2Info.update_seq, 0);
                        done();
                    });
                });
            });
        });

        it("Fail to fetch a doc after db was deleted", (done) => {
            const db = new PouchDB(dbs.name);
            let db2 = new PouchDB(dbs.name);
            const doc = { _id: "foodoc" };
            const doc2 = { _id: "foodoc2" };
            db.put(doc, () => {
                db2.put(doc2, () => {
                    db.allDocs((err, docs) => {
                        assert.equal(docs.total_rows, 2);
                        db.destroy((err) => {
                            assert.isNull(err);
                            db2 = new PouchDB(dbs.name);
                            db2.get(doc._id, (err) => {
                                assert.equal(err.name, "not_found");
                                assert.equal(err.status, 404);
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Fail to fetch a doc after db was deleted", (done) => {
            const db = new PouchDB(dbs.name);
            let db2 = new PouchDB(dbs.name);
            const doc = { _id: "foodoc" };
            const doc2 = { _id: "foodoc2" };
            db.put(doc, () => {
                db2.put(doc2, () => {
                    db.allDocs((err, docs) => {
                        assert.equal(docs.total_rows, 2);
                        db.destroy().then(() => {
                            db2 = new PouchDB(dbs.name);
                            db2.get(doc._id, (err, doc) => {
                                assert.isUndefined(doc);
                                assert.equal(err.status, 404);
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Cant add docs with empty ids", (done) => {
            const docs = [
                {},
                { _id: null },
                { _id: undefined },
                { _id: "" },
                { _id: {} },
                { _id: "_underscored_id" }
            ];
            let num = docs.length;
            const db = new PouchDB(dbs.name);
            docs.forEach((doc) => {
                db.put(doc, (err) => {
                    assert.exists(err);
                    if (!--num) {
                        done();
                    }
                });
            });
        });

        it("Test doc with percent in ID", () => {
            const db = new PouchDB(dbs.name);
            const doc = {
                foo: "bar",
                _id: "foo%bar"
            };
            return db.put(doc).then((res) => {
                assert.equal(res.id, "foo%bar");
                assert.equal(doc.foo, "bar");
                return db.get("foo%bar");
            }).then((doc) => {
                assert.equal(doc._id, "foo%bar");
                return db.allDocs({ include_docs: true });
            }).then((res) => {
                const x = res.rows[0];
                assert.equal(x.id, "foo%bar");
                assert.equal(x.doc._id, "foo%bar");
                assert.equal(x.key, "foo%bar");
                assert.exists(x.doc._rev);
            });
        });

        it("db.info should give correct name", (done) => {
            // CouchDB Master uses random names
            if (testUtils.isCouchMaster()) {
                return done();
            }
            const db = new PouchDB(dbs.name);
            db.info().then((info) => {
                assert.equal(info.db_name, "testdb");
                done();
            });
        });

        it("db.info should give auto_compaction = false (#2744)", () => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });
            return db.info().then((info) => {
                assert.equal(info.auto_compaction, false);
            });
        });

        it("db.info should give auto_compaction = true (#2744)", () => {
            const db = new PouchDB(dbs.name, { auto_compaction: true });
            return db.info().then((info) => {
                // http doesn't support auto compaction
                assert.equal(info.auto_compaction, adapter !== "http");
            });
        });

        it("db.info should give adapter name (#3567)", () => {
            const db = new PouchDB(dbs.name);
            return db.info().then((info) => {
                assert.equal(info.adapter, db.adapter);
            });
        });

        it("db.info should give correct doc_count", () => {
            const db = new PouchDB(dbs.name);
            return db.info().then((info) => {
                assert.equal(info.doc_count, 0);
                return db.bulkDocs({ docs: [{ _id: "1" }, { _id: "2" }, { _id: "3" }] });
            }).then(() => {
                return db.info();
            }).then((info) => {
                assert.equal(info.doc_count, 3);
                return db.get("1");
            }).then((doc) => {
                return db.remove(doc);
            }).then(() => {
                return db.info();
            }).then((info) => {
                assert.equal(info.doc_count, 2);
            });
        });

        it("putting returns {ok: true}", () => {
            // in couch, it's {ok: true} and in cloudant it's {},
            // but the http adapter smooths this out
            const db = new PouchDB(dbs.name);
            return db.put({ _id: "_local/foo" }).then((info) => {
                assert.isTrue(info.ok, "putting local returns ok=true");
                return db.put({ _id: "quux" });
            }).then((info) => {
                assert.isTrue(info.ok, "putting returns ok=true");
                return db.bulkDocs([{ _id: "_local/bar" }, { _id: "baz" }]);
            }).then((info) => {
                assert.lengthOf(info, 2, "correct num bulk docs");
                assert.isTrue(info[0].ok, "bulk docs says ok=true #1");
                assert.isTrue(info[1].ok, "bulk docs says ok=true #2");
                return db.post({});
            }).then((info) => {
                assert.isTrue(info.ok, "posting returns ok=true");
            });
        });

        it("putting is override-able", () => {
            const db = new PouchDB(dbs.name);
            let called = 0;
            const plugin = {
                initPull() {
                    this.oldPut = this.put;
                    this.put = function () {
                        if (is.function(arguments[arguments.length - 1])) {
                            called++;
                        }
                        return this.oldPut.apply(this, arguments);
                    };
                },
                cleanupPut() {
                    this.put = this.oldPut;
                }
            };
            PouchDB.plugin(plugin);
            db.initPull();
            return db.put({ _id: "anid", foo: "bar" }).then(() => {
                assert.isAbove(called, 0, "put was called");
                return db.get("anid");
            }).then((doc) => {
                assert.equal(doc.foo, "bar", "correct doc");
            });
        });

        it("issue 2779, deleted docs, old revs COUCHDB-292", (done) => {
            const db = new PouchDB(dbs.name);
            let rev;

            db.put({ _id: "foo" }).then((resp) => {
                rev = resp.rev;
                return db.remove("foo", rev);
            }).then(() => {
                return db.get("foo");
            }).catch(() => {
                return db.put({ _id: "foo", _rev: rev });
            }).then(() => {
                done(new Error("should never have got here"));
            }, (err) => {
                assert.exists(err);
                done();
            });
        });

        it("issue 2779, correct behavior for undeleting", () => {

            if (testUtils.isCouchMaster()) {
                return true;
            }

            const db = new PouchDB(dbs.name);
            let rev;

            function checkNumRevisions(num) {
                return db.get("foo", {
                    open_revs: "all",
                    revs: true
                }).then((fullDocs) => {
                    assert.lengthOf(fullDocs[0].ok._revisions.ids, num);
                });
            }

            return db.put({ _id: "foo" }).then((resp) => {
                rev = resp.rev;
                return checkNumRevisions(1);
            }).then(() => {
                return db.remove("foo", rev);
            }).then(() => {
                return checkNumRevisions(2);
            }).then(() => {
                return db.allDocs({ keys: ["foo"] });
            }).then((res) => {
                rev = res.rows[0].value.rev;
                return db.put({ _id: "foo", _rev: rev });
            }).then(() => {
                return checkNumRevisions(3);
            });
        });

        it("issue 2888, successive deletes and writes", () => {
            const db = new PouchDB(dbs.name);
            let rev;

            function checkNumRevisions(num) {
                return db.get("foo", {
                    open_revs: "all",
                    revs: true
                }).then((fullDocs) => {
                    assert.lengthOf(fullDocs[0].ok._revisions.ids, num);
                });
            }
            return db.put({ _id: "foo" }).then((resp) => {
                rev = resp.rev;
                return checkNumRevisions(1);
            }).then(() => {
                return db.remove("foo", rev);
            }).then(() => {
                return checkNumRevisions(2);
            }).then(() => {
                return db.put({ _id: "foo" });
            }).then((res) => {
                rev = res.rev;
                return checkNumRevisions(3);
            }).then(() => {
                return db.remove("foo", rev);
            }).then(() => {
                return checkNumRevisions(4);
            });
        });

        it("2 invalid puts", (done) => {
            const db = new PouchDB(dbs.name);
            let called = 0;
            const cb = function () {
                if (++called === 2) {
                    done();
                }
            };
            db.put({ _id: "foo", _zing: "zing" }, cb);
            db.put({ _id: "bar", _zing: "zing" }, cb);
        });

        it('Docs save "null" value', () => {
            const db = new PouchDB(dbs.name);
            return db.put({ _id: "doc", foo: null }).then(() => {
                return db.get("doc");
            }).then((doc) => {
                assert.equal((typeof doc.foo), "object");
                assert.isNull(doc.foo);
                assert.deepEqual(Object.keys(doc).sort(), ["_id", "_rev", "foo"]);
            });
        });

        it("replace PouchDB.destroy() (express-pouchdb#203)", (done) => {
            const old = PouchDB.destroy;
            PouchDB.destroy = function (name, callback) {
                const db = new PouchDB(name);
                return db.destroy(callback);
            };
            // delete a non-existing db, should be fine.
            PouchDB.destroy(dbs.name, (err, resp) => {
                PouchDB.destroy = old;

                done(err, resp);
            });
        });

        it("3968, keeps all object fields", () => {
            const db = new PouchDB(dbs.name);
            /* jshint -W001 */
            const doc = {
                _id: "x",
                type: "testdoc",
                watch: 1,
                unwatch: 1,
                constructor: 1,
                toString: 1,
                toSource: 1,
                toLocaleString: 1,
                propertyIsEnumerable: 1,
                isPrototypeOf: 1,
                hasOwnProperty: 1
            };
            return db.put(doc).then(() => {
                return db.get(doc._id);
            }).then((savedDoc) => {
                // We shouldnt need to delete from doc here (#4273)
                assert.isUndefined(doc._rev);
                assert.isUndefined(doc._rev_tree);

                delete savedDoc._rev;
                assert.deepEqual(savedDoc, doc);
            });
        });

        it("4712 invalid rev for new doc generates conflict", () => {
            // CouchDB 1.X has a bug which allows this insertion via bulk_docs
            // (which PouchDB uses for all document insertions)
            if (adapter === "http" && !testUtils.isCouchMaster()) {
                return;
            }

            const db = new PouchDB(dbs.name);
            const newdoc = {
                _id: "foobar",
                _rev: "1-123"
            };

            return db.put(newdoc).then(() => {
                throw new Error("expected an error");
            }, (err) => {
                assert.property(err, "name", "conflict");
                assert.property(err, "status", 409);
            });
        });

        it("test info() after db close", () => {
            const db = new PouchDB(dbs.name);
            return db.close().then(() => {
                return db.info().catch((err) => {
                    assert.equal(err.message, "database is closed");
                });
            });
        });

        it("test get() after db close", () => {
            const db = new PouchDB(dbs.name);
            return db.close().then(() => {
                return db.get("foo").catch((err) => {
                    assert.equal(err.message, "database is closed");
                });
            });
        });

        it("test close() after db close", () => {
            const db = new PouchDB(dbs.name);
            return db.close().then(() => {
                return db.close().catch((err) => {
                    assert.equal(err.message, "database is closed");
                });
            });
        });

        if (adapter === "local") {
            // TODO: this test fails in the http adapter in Chrome
            it("should allow unicode doc ids", (done) => {
                const db = new PouchDB(dbs.name);
                const ids = [
                    // "PouchDB is awesome" in Japanese, contains 1-3 byte chars
                    "\u30d1\u30a6\u30c1\u30e5DB\u306f\u6700\u9ad8\u3060",
                    "\u03B2", // 2-byte utf-8 char: 3b2
                    "\uD843\uDF2D", // exotic 4-byte utf-8 char: 20f2d
                    "\u0000foo\u0000bar\u0001baz\u0002quux", // like mapreduce
                    "\u0000",
                    "\u30d1"
                ];
                let numDone = 0;
                ids.forEach((id) => {
                    const doc = { _id: id, foo: "bar" };
                    db.put(doc).then((info) => {
                        doc._rev = info.rev;
                        return db.put(doc);
                    }).then(() => {
                        return db.get(id);
                    }).then((resp) => {
                        assert.equal(resp._id, id);
                        if (++numDone === ids.length) {
                            done();
                        }
                    }, done);
                });
            });

            // this test only really makes sense for IDB
            it("should have same blob support for 2 dbs", () => {
                const db1 = new PouchDB(dbs.name);
                return db1.info().then(() => {
                    const db2 = new PouchDB(dbs.name);
                    return db2.info().then(() => {
                        if (!is.undefined(db1._blobSupport)) {
                            assert.equal(db1._blobSupport, db2._blobSupport, "same blob support");
                        } else {
                            assert.isTrue(true);
                        }
                    });
                });
            });

            it("6053, PouchDB.plugin() resets defaults", () => {
                const PouchDB1 = PouchDB.defaults({ foo: "bar" });
                const PouchDB2 = PouchDB1.plugin({ foo() { } });
                assert.exists(PouchDB2.__defaults);
                assert.deepEqual(PouchDB1.__defaults, PouchDB2.__defaults);
            });
        }

        if (!is.undefined(process) && !process.browser) {
            it("#5471 PouchDB.plugin() should throw error if passed wrong type or empty object", () => {
                assert.throws(() => {
                    PouchDB.plugin("pouchdb-adapter-memory");
                }, 'Invalid plugin: got "pouchdb-adapter-memory", expected an object or a function');
            });
        }
    });
});
