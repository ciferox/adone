require("./node.setup");

let adapters = [
    ["local", "http"],
    ["http", "http"],
    ["http", "local"],
    ["local", "local"]
];

if ("saucelabs" in testUtils.params()) {
    adapters = [["local", "http"], ["http", "local"]];
}

let downAdapters = ["local"];

adapters.forEach((adapters) => {
    describe("suite2 test.replication.js-" + adapters[0] + "-" + adapters[1], function () {
        this.timeout(30000);
        let dbs = {};

        beforeEach(function (done) {
            this.timeout(30000);
            dbs.name = testUtils.adapterUrl(adapters[0], "testdb");
            dbs.remote = testUtils.adapterUrl(adapters[1], "test_repl_remote");
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });


        let docs = [
            { _id: "0", integer: 0, string: "0" },
            { _id: "1", integer: 1, string: "1" },
            { _id: "2", integer: 2, string: "2" }
        ];

        // simplify for easier deep equality checks
        function simplifyChanges(res) {
            let changes = res.results.map((change) => {
                if (testUtils.isSyncGateway() &&
                    change.doc && change.doc._conflicts) {
                    // CSG does not render conflict metadata inline
                    // in the document. Remove it for comparisons.
                    delete change.doc._conflicts;
                }
                return {
                    id: change.id,
                    deleted: change.deleted,
                    changes: change.changes.map((x) => {
                        return x.rev;
                    }).sort(),
                    doc: change.doc
                };
            });

            // in CouchDB 2.0, changes is not guaranteed to be
            // ordered
            if (testUtils.isCouchMaster() || testUtils.isSyncGateway()) {
                changes.sort((a, b) => {
                    return a.id > b.id;
                });
            }
            // CSG will send a change event when just the ACL changed
            if (testUtils.isSyncGateway()) {
                changes = changes.filter((change) => {
                    return change.id !== "_user/";
                });
            }
            return changes;
        }

        function verifyInfo(info, expected) {
            if (!testUtils.isCouchMaster()) {
                if (typeof info.doc_count === "undefined") {
                    // info is from Sync Gateway, which allocates an extra seqnum
                    // for user access control purposes.
                    assert.isTrue(info.update_seq >= expected.update_seq && info.update_seq <= expected.update_seq + 1, "update_seq");
                } else {
                    assert.equal(info.update_seq, expected.update_seq, "update_seq");
                }
            }
            if (info.doc_count) { // info is NOT from Sync Gateway
                assert.equal(info.doc_count, expected.doc_count, "doc_count");
            }
        }

        it("Test basic pull replication", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            remote.bulkDocs({ docs }, {}, () => {
                db.replicate.from(dbs.remote, (err, result) => {
                    assert.equal(result.ok, true);
                    assert.equal(result.docs_written, docs.length);
                    db.info((err, info) => {
                        verifyInfo(info, {
                            update_seq: 3,
                            doc_count: 3
                        });
                        done();
                    });
                });
            });
        });

        it("Test basic pull replication plain api", (done) => {
            let remote = new PouchDB(dbs.remote);
            remote.bulkDocs({ docs }, {}, () => {
                PouchDB.replicate(dbs.remote, dbs.name, {}, (err, result) => {
                    assert.equal(result.ok, true);
                    assert.equal(result.docs_written, docs.length);
                    new PouchDB(dbs.name).info((err, info) => {
                        verifyInfo(info, {
                            update_seq: 3,
                            doc_count: 3
                        });
                        done();
                    });
                });
            });
        });

        it("Test basic pull replication plain api 2", (done) => {
            let remote = new PouchDB(dbs.remote);
            remote.bulkDocs({ docs }, {}, () => {
                PouchDB.replicate(
                    dbs.remote, dbs.name).on("complete", (result) => {
                        assert.equal(result.ok, true);
                        assert.equal(result.docs_written, docs.length);
                        new PouchDB(dbs.name).info((err, info) => {
                            verifyInfo(info, {
                                update_seq: 3,
                                doc_count: 3
                            });
                            done();
                        });
                    });
            });
        });

        it("Test pull replication with many changes", (done) => {
            let remote = new PouchDB(dbs.remote);

            let numDocs = 201;
            let docs = [];
            for (let i = 0; i < numDocs; i++) {
                docs.push({ _id: i.toString() });
            }

            remote.bulkDocs({ docs }, {}, (err) => {
                assert.isNull(err);
                PouchDB.replicate(
                    dbs.remote, dbs.name).on("complete", (result) => {
                        assert.equal(result.ok, true);
                        assert.equal(result.docs_written, docs.length);
                        new PouchDB(dbs.name).info((err, info) => {
                            verifyInfo(info, {
                                update_seq: numDocs,
                                doc_count: numDocs
                            });
                            done();
                        });
                    });
            });
        });

        it("Test basic pull replication with funny ids", (done) => {
            let docs = [
                { _id: "4/5", integer: 0, string: "0" },
                { _id: "3&2", integer: 1, string: "1" },
                { _id: "1>0", integer: 2, string: "2" }
            ];
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            remote.bulkDocs({ docs }, () => {
                db.replicate.from(dbs.remote, (err, result) => {
                    assert.equal(result.ok, true);
                    assert.equal(result.docs_written, docs.length);
                    db.info((err, info) => {
                        verifyInfo(info, {
                            update_seq: 3,
                            doc_count: 3
                        });
                        done();
                    });
                });
            });
        });

        it("pull replication with many changes + a conflict (#2543)", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            // simulate 5000 normal commits with two conflicts at the very end
            function uuid() {
                return testUtils.rev();
            }

            let numRevs = 5000;
            let isSafari = (typeof process === "undefined" || process.browser) &&
                /Safari/.test(window.navigator.userAgent) &&
                !/Chrome/.test(window.navigator.userAgent);
            if (isSafari) {
                numRevs = 10; // fuck safari, we've hit the storage limit again
            }

            let uuids = [];
            for (let i = 0; i < numRevs - 1; i++) {
                uuids.push(uuid());
            }
            let conflict1 = "a" + uuid();
            let conflict2 = "b" + uuid();

            let doc1 = {
                _id: "doc",
                _rev: `${numRevs}-${conflict1}`,
                _revisions: {
                    start: numRevs,
                    ids: [conflict1].concat(uuids)
                }
            };
            let doc2 = {
                _id: "doc",
                _rev: `${numRevs}-${conflict2}`,
                _revisions: {
                    start: numRevs,
                    ids: [conflict2].concat(uuids)
                }
            };
            return remote.bulkDocs([doc1], { new_edits: false }).then(() => {
                return remote.replicate.to(db);
            }).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, 1, "correct # docs written (1)");
                return db.info();
            }).then((info) => {
                if (!testUtils.isSyncGateway() || info.doc_count) {
                    assert.equal(info.doc_count, 1, "doc_count");
                }
                return db.get("doc", { open_revs: "all" });
            }).then((doc) => {
                assert.equal(doc[0].ok._id, "doc");
                assert.equal(doc[0].ok._rev, doc1._rev);
                return remote.bulkDocs([doc2], { new_edits: false });
            }).then(() => {
                return remote.replicate.to(db);
            }).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, 1, "correct # docs written (2)");
                return db.info();
            }).then((info) => {
                if (!testUtils.isSyncGateway() || info.doc_count) {
                    assert.equal(info.doc_count, 1, "doc_count");
                }
                return db.get("doc", { open_revs: "all" });
            }).then((docs) => {
                // order with open_revs is unspecified
                docs.sort((a, b) => {
                    return a.ok._rev < b.ok._rev ? -1 : 1;
                });
                assert.equal(docs[0].ok._id, "doc");
                assert.equal(docs[1].ok._id, "doc");
                assert.equal(docs[0].ok._rev, doc1._rev);
                assert.equal(docs[1].ok._rev, doc2._rev);
            });
        });

        it("issue 2779, undeletion when replicating", () => {
            if (testUtils.isCouchMaster()) {
                return true;
            }
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let rev;

            function checkNumRevisions(num) {
                return db.get("foo", {
                    open_revs: "all",
                    revs: true
                }).then((fullDocs) => {
                    assert.lengthOf(fullDocs[0].ok._revisions.ids, num, "local is correct");
                }).then(() => {
                    return remote.get("foo", {
                        open_revs: "all",
                        revs: true
                    });
                }).then((fullDocs) => {
                    assert.lengthOf(fullDocs[0].ok._revisions.ids, num, "remote is correct");
                });
            }

            return db.put({ _id: "foo" }).then((resp) => {
                rev = resp.rev;
                return db.replicate.to(remote);
            }).then(() => {
                return checkNumRevisions(1);
            }).then(() => {
                return db.remove("foo", rev);
            }).then(() => {
                return db.replicate.to(remote);
            }).then(() => {
                return checkNumRevisions(2);
            }).then(() => {
                return db.allDocs({ keys: ["foo"] });
            }).then((res) => {
                if (testUtils.isSyncGateway() && !res.rows[0].value) {
                    return remote.get("foo", { open_revs: "all" }).then((doc) => {
                        return db.put({ _id: "foo", _rev: doc[0].ok._rev });
                    });
                } else {
                    rev = res.rows[0].value.rev;
                    return db.put({ _id: "foo", _rev: rev });
                }
            }).then(() => {
                return db.replicate.to(remote);
            }).then(() => {
                return checkNumRevisions(3);
            });
        });

        it("Test pull replication with many conflicts", (done) => {
            let remote = new PouchDB(dbs.remote);

            let numRevs = 200; // repro "url too long" error with open_revs
            let docs = [];
            for (let i = 0; i < numRevs; i++) {
                let rev = "1-" + testUtils.rev();
                docs.push({ _id: "doc", _rev: rev });
            }

            remote.bulkDocs({ docs }, { new_edits: false }, (err) => {
                assert.isNull(err);
                PouchDB.replicate(
                    dbs.remote, dbs.name).on("complete", (result) => {
                        assert.equal(result.ok, true);
                        assert.equal(result.docs_written, docs.length);
                        let db = new PouchDB(dbs.name);
                        db.info((err, info) => {
                            assert.isNull(err);
                            assert.equal(info.doc_count, 1, "doc_count");
                            db.get("doc", { open_revs: "all" }, (err, docs) => {
                                assert.isNull(err);
                                let okDocs = docs.filter((doc) => {
                                    return doc.ok;
                                });
                                assert.lengthOf(okDocs, numRevs);
                                done();
                            });
                        });
                    });
            });
        });

        it("Test correct # docs replicated with staggered revs", (done) => {
            // ensure we don't just process all the open_revs with
            // every replication; we should only process the current subset
            let remote = new PouchDB(dbs.remote);

            let docs = [{ _id: "doc", _rev: "1-a" }, { _id: "doc", _rev: "1-b" }];
            remote.bulkDocs({ docs }, { new_edits: false }, (err) => {
                assert.isNull(err);
                PouchDB.replicate(
                    dbs.remote, dbs.name).on("complete", (result) => {
                        assert.equal(result.ok, true);
                        assert.equal(result.docs_written, 2);
                        assert.equal(result.docs_read, 2);
                        let docs = [{ _id: "doc", _rev: "1-c" }, { _id: "doc", _rev: "1-d" }];
                        remote.bulkDocs({ docs }, { new_edits: false }, (err) => {
                            assert.isNull(err);
                            PouchDB.replicate(
                                dbs.remote, dbs.name).on("complete", (result) => {
                                    assert.equal(result.docs_written, 2);
                                    assert.equal(result.docs_read, 2);
                                    let db = new PouchDB(dbs.name);
                                    db.info((err, info) => {
                                        assert.isNull(err);
                                        assert.equal(info.doc_count, 1, "doc_count");
                                        db.get("doc", { open_revs: "all" }, (err, docs) => {
                                            assert.isNull(err);
                                            let okDocs = docs.filter((doc) => {
                                                return doc.ok;
                                            });
                                            assert.lengthOf(okDocs, 4);
                                            done();
                                        });
                                    });
                                }).on("error", done);
                        });
                    }).on("error", done);
            });
        });

        it("Local DB contains documents", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            remote.bulkDocs({ docs }, {}, () => {
                db.bulkDocs({ docs }, {}, () => {
                    db.replicate.from(dbs.remote, () => {
                        db.allDocs((err, result) => {
                            assert.equal(result.rows.length, docs.length);
                            db.info((err, info) => {
                                if (!testUtils.isCouchMaster()) {
                                    assert.isAbove(info.update_seq, 2, "update_seq local");
                                }
                                assert.equal(info.doc_count, 3, "doc_count local");
                                remote.info((err, info) => {
                                    if (!testUtils.isCouchMaster()) {
                                        assert.isAbove(info.update_seq, 2, "update_seq remote");
                                    }
                                    if (!testUtils.isSyncGateway() || info.doc_count) {
                                        assert.equal(info.doc_count, 3, "doc_count remote");
                                    }
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("Test basic push replication", (done) => {
            let db = new PouchDB(dbs.name);
            db.bulkDocs({ docs }, {}, () => {
                db.replicate.to(dbs.remote, (err, result) => {
                    assert.equal(result.ok, true);
                    assert.equal(result.docs_written, docs.length);
                    db.info((err, info) => {
                        verifyInfo(info, {
                            update_seq: 3,
                            doc_count: 3
                        });
                        done();
                    });
                });
            });
        });

        it("Test basic push replication take 2", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            db.bulkDocs({ docs }, {}, () => {
                db.replicate.to(dbs.remote, () => {
                    remote.allDocs((err, result) => {
                        assert.equal(result.rows.length, docs.length);
                        db.info((err, info) => {
                            verifyInfo(info, {
                                update_seq: 3,
                                doc_count: 3
                            });
                            done();
                        });
                    });
                });
            });
        });

        it("Test basic push replication sequence tracking", (done) => {
            let db = new PouchDB(dbs.name);
            let doc1 = { _id: "adoc", foo: "bar" };
            db.put(doc1, () => {
                db.replicate.to(dbs.remote, (err, result) => {
                    assert.equal(result.docs_read, 1);
                    db.replicate.to(dbs.remote, (err, result) => {
                        assert.equal(result.docs_read, 0);
                        db.replicate.to(dbs.remote, (err, result) => {
                            assert.equal(result.docs_read, 0);
                            db.info((err, info) => {
                                verifyInfo(info, {
                                    update_seq: 1,
                                    doc_count: 1
                                });
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Test checkpoint", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            remote.bulkDocs({ docs }, {}, () => {
                db.replicate.from(dbs.remote, (err, result) => {
                    assert.equal(result.ok, true);
                    assert.equal(result.docs_written, docs.length);
                    db.replicate.from(dbs.remote, (err, result) => {
                        assert.equal(result.ok, true);
                        assert.equal(result.docs_written, 0);
                        assert.equal(result.docs_read, 0);
                        db.info((err, info) => {
                            verifyInfo(info, {
                                update_seq: 3,
                                doc_count: 3
                            });
                            done();
                        });
                    });
                });
            });
        });

        it("Test live pull checkpoint", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            remote.bulkDocs({ docs }).then(() => {
                let changeCount = docs.length;
                var changes = db.changes({
                    live: true
                }).on("change", () => {
                    if (--changeCount) {
                        return;
                    }
                    replication.cancel();
                    changes.cancel();
                }).on("complete", () => {
                    db.replicate.from(dbs.remote).on("complete", (details) => {
                        assert.equal(details.docs_read, 0);
                        db.info((err, info) => {
                            verifyInfo(info, {
                                update_seq: 3,
                                doc_count: 3
                            });
                            done();
                        });
                    });
                }).on("error", done);
                var replication = db.replicate.from(remote, { live: true });
            });
        });

        it("Test live push checkpoint", (done) => {

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            function complete(details) {

                if (testUtils.isSyncGateway()) {
                    // TODO investigate why Sync Gateway sometimes reads a
                    // document. This seems to come up 1 more in the browser
                    // and 0 more in node, but I've seen 1 in node.
                    assert.isTrue(details.docs_read >= 0 && details.docs_read <= 1);
                } else {
                    assert.equal(details.docs_read, 0);
                }

                db.info((err, info) => {
                    verifyInfo(info, {
                        update_seq: 3,
                        doc_count: 3
                    });
                    done();
                });
            }

            let finished = 0;
            function isFinished() {
                if (++finished !== 2) {
                    return;
                }
                db.replicate.to(dbs.remote)
                    .on("error", done)
                    .on("complete", complete);
            }

            db.bulkDocs({ docs }).then(() => {

                let changeCount = docs.length;
                function onChange() {
                    if (--changeCount) {
                        return;
                    }
                    replication.cancel();
                    changes.cancel();
                }

                var changes = remote.changes({ live: true })
                    .on("error", done)
                    .on("change", onChange)
                    .on("complete", isFinished);

                var replication = db.replicate.to(remote, { live: true })
                    .on("error", done)
                    .on("complete", isFinished);

            }).catch(done);
        });

        it("Test checkpoint 2", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let doc = { _id: "3", count: 0 };
            remote.put(doc, {}, (err, results) => {
                db.replicate.from(dbs.remote, (err, result) => {
                    assert.equal(result.ok, true);
                    doc._rev = results.rev;
                    doc.count++;
                    remote.put(doc, {}, (err, results) => {
                        doc._rev = results.rev;
                        doc.count++;
                        remote.put(doc, {}, () => {
                            db.replicate.from(dbs.remote, (err, result) => {
                                assert.equal(result.ok, true);
                                assert.equal(result.docs_written, 1);
                                db.info((err, info) => {
                                    verifyInfo(info, {
                                        update_seq: 2,
                                        doc_count: 1
                                    });
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("Test checkpoint 3 :)", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let doc = { _id: "3", count: 0 };
            db.put(doc, {}, (err, results) => {
                PouchDB.replicate(db, remote, {}, (err, result) => {
                    assert.equal(result.ok, true);
                    doc._rev = results.rev;
                    doc.count++;
                    db.put(doc, {}, (err, results) => {
                        doc._rev = results.rev;
                        doc.count++;
                        db.put(doc, {}, () => {
                            PouchDB.replicate(db, remote, {}, (err, result) => {
                                assert.equal(result.ok, true);
                                assert.equal(result.docs_written, 1);
                                db.info((err, info) => {
                                    verifyInfo(info, {
                                        update_seq: 3,
                                        doc_count: 1
                                    });
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('Test disable checkpoints on both source and target', function (done) {
            var db = new PouchDB(dbs.name);
            var remote = new PouchDB(dbs.remote);

            db.bulkDocs({ docs: docs }).then(function () {
                PouchDB.replicate(db, remote, { checkpoint: false })
                    .on('error', done)
                    .on('complete', function () {
                        testUtils.generateReplicationId(db, remote, {}).then(function (replicationId) {
                            ensureCheckpointIsMissing(db, replicationId).then(function () {
                                return ensureCheckpointIsMissing(remote, replicationId);
                            }).then(done).catch(done);
                        }).catch(done);
                    });
            }).catch(done);

            function ensureCheckpointIsMissing(db, replicationId) {
                return db.get(replicationId).then(function () {
                    throw new Error('Found a checkpoint that should not exist for db ' + db.name);
                }).catch(function (error) {
                    if (error.status === 404) {
                        return;
                    } else {
                        throw error;
                    }
                });
            }
        });

        it('Test write checkpoints on source only', function (done) {
            var db = new PouchDB(dbs.name);
            var remote = new PouchDB(dbs.remote);

            db.bulkDocs({ docs: docs }).then(function () {
                PouchDB.replicate(db, remote, { checkpoint: 'source' })
                    .on('error', done)
                    .on('complete', function () {
                        testUtils.generateReplicationId(db, remote, {}).then(function (replicationId) {
                            db.get(replicationId).then(function () {
                                remote.get(replicationId).then(function () {
                                    done(new Error('Found a checkpoint on target that should not exist'));
                                }).catch(function (error) {
                                    if (error.status === 404) {
                                        done();
                                    } else {
                                        done(error);
                                    }
                                });
                            }).catch(done);
                        }).catch(done);
                    });
            }).catch(done);
        });

        it('Test write checkpoints on target only', function (done) {
            var db = new PouchDB(dbs.name);
            var remote = new PouchDB(dbs.remote);

            db.bulkDocs({ docs: docs }).then(function () {
                PouchDB.replicate(db, remote, { checkpoint: 'target' })
                    .on('error', done)
                    .on('complete', function () {
                        testUtils.generateReplicationId(db, remote, {}).then(function (replicationId) {
                            remote.get(replicationId).then(function () {
                                db.get(replicationId).then(function () {
                                    done(new Error('Found a checkpoint on source that should not exist'));
                                }).catch(function (error) {
                                    if (error.status === 404) {
                                        done();
                                    } else {
                                        done(error);
                                    }
                                });
                            }).catch(done);
                        }).catch(done);
                    });
            }).catch(done);
        });

        it("#3136 open revs returned correctly 1", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let doc = { _id: "foo" };
            let chain = testUtils.Promise.resolve().then(() => {
                return db.put(doc);
            });

            function addConflict(i) {
                chain = chain.then(() => {
                    return db.bulkDocs({
                        docs: [{
                            _id: "foo",
                            _rev: "2-" + i
                        }],
                        new_edits: false
                    });
                });
            }

            for (let i = 0; i < 50; i++) {
                addConflict(i);
            }
            return chain.then(() => {
                let revs1;
                let revs2;
                return db.get("foo", {
                    conflicts: true,
                    revs: true,
                    open_revs: "all"
                }).then((res) => {
                    revs1 = res.map((x) => {
                        return x.ok._rev;
                    }).sort();
                    return db.replicate.to(remote);
                }).then(() => {
                    return remote.get("foo", {
                        conflicts: true,
                        revs: true,
                        open_revs: "all"
                    });
                }).then((res) => {
                    revs2 = res.map((x) => {
                        return x.ok._rev;
                    }).sort();
                    assert.deepEqual(revs1, revs2);
                });
            });
        });

        it("#3136 open revs returned correctly 2", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let doc = { _id: "foo" };
            let chain = testUtils.Promise.resolve().then(() => {
                return db.put(doc);
            });

            function addConflict(i) {
                chain = chain.then(() => {
                    return db.bulkDocs({
                        docs: [{
                            _id: "foo",
                            _rev: "2-" + i,
                            _deleted: (i % 3 === 1)
                        }],
                        new_edits: false
                    });
                });
            }

            for (let i = 0; i < 50; i++) {
                addConflict(i);
            }
            return chain.then(() => {
                let revs1;
                let revs2;
                return db.get("foo", {
                    conflicts: true,
                    revs: true,
                    open_revs: "all"
                }).then((res) => {
                    revs1 = res.map((x) => {
                        return x.ok._rev;
                    }).sort();
                    return db.replicate.to(remote);
                }).then(() => {
                    return remote.get("foo", {
                        conflicts: true,
                        revs: true,
                        open_revs: "all"
                    });
                }).then((res) => {
                    revs2 = res.map((x) => {
                        return x.ok._rev;
                    }).sort();
                    assert.deepEqual(revs1, revs2);
                });
            });
        });

        it("#3136 winningRev has a lower seq", () => {
            let db1 = new PouchDB(dbs.name);
            let db2 = new PouchDB(dbs.remote);
            let tree = [
                [
                    {
                        _id: "foo", _rev: "1-a",
                        _revisions: { start: 1, ids: ["a"] }
                    },
                    {
                        _id: "foo", _rev: "2-e", _deleted: true,
                        _revisions: { start: 2, ids: ["e", "a"] }
                    },
                    {
                        _id: "foo", _rev: "3-g",
                        _revisions: { start: 3, ids: ["g", "e", "a"] }
                    }
                ],
                [
                    {
                        _id: "foo", _rev: "1-a",
                        _revisions: { start: 1, ids: ["a"] }
                    },
                    {
                        _id: "foo", _rev: "2-b",
                        _revisions: { start: 2, ids: ["b", "a"] }
                    },
                    {
                        _id: "foo", _rev: "3-c",
                        _revisions: { start: 3, ids: ["c", "b", "a"] }
                    }
                ],
                [
                    {
                        _id: "foo", _rev: "1-a",
                        _revisions: { start: 1, ids: ["a"] }
                    },
                    {
                        _id: "foo", _rev: "2-d",
                        _revisions: { start: 2, ids: ["d", "a"] }
                    },
                    {
                        _id: "foo", _rev: "3-h",
                        _revisions: { start: 3, ids: ["h", "d", "a"] }
                    },
                    {
                        _id: "foo", _rev: "4-f",
                        _revisions: { start: 4, ids: ["f", "h", "d", "a"] }
                    }
                ]
            ];

            let chain = testUtils.Promise.resolve();
            tree.forEach((docs) => {
                chain = chain.then(() => {
                    let revs1;
                    let revs2;

                    return db1.bulkDocs({
                        docs,
                        new_edits: false
                    }).then(() => {
                        return db1.replicate.to(db2);
                    }).then(() => {
                        return db1.get("foo", {
                            open_revs: "all",
                            revs: true,
                            conflicts: true
                        });
                    }).then((res1) => {
                        revs1 = res1.map((x) => {
                            return x.ok._rev;
                        }).sort();

                        return db2.get("foo", {
                            open_revs: "all",
                            revs: true,
                            conflicts: true
                        });
                    }).then((res2) => {
                        revs2 = res2.map((x) => {
                            return x.ok._rev;
                        }).sort();
                        assert.deepEqual(revs1, revs2, "same revs");
                    });
                });
            });
            return chain;
        });

        it("#3136 same changes with style=all_docs", () => {
            let db1 = new PouchDB(dbs.name);
            let db2 = new PouchDB(dbs.remote);
            let tree = [
                [
                    {
                        _id: "foo", _rev: "1-a",
                        _revisions: { start: 1, ids: ["a"] }
                    },
                    {
                        _id: "foo", _rev: "2-e", _deleted: true,
                        _revisions: { start: 2, ids: ["e", "a"] }
                    },
                    {
                        _id: "foo", _rev: "3-g",
                        _revisions: { start: 3, ids: ["g", "e", "a"] }
                    }
                ],
                [
                    {
                        _id: "foo", _rev: "1-a",
                        _revisions: { start: 1, ids: ["a"] }
                    },
                    {
                        _id: "foo", _rev: "2-b",
                        _revisions: { start: 2, ids: ["b", "a"] }
                    },
                    {
                        _id: "foo", _rev: "3-c",
                        _revisions: { start: 3, ids: ["c", "b", "a"] }
                    }
                ],
                [
                    {
                        _id: "foo", _rev: "1-a",
                        _revisions: { start: 1, ids: ["a"] }
                    },
                    {
                        _id: "foo", _rev: "2-d",
                        _revisions: { start: 2, ids: ["d", "a"] }
                    },
                    {
                        _id: "foo", _rev: "3-h",
                        _revisions: { start: 3, ids: ["h", "d", "a"] }
                    },
                    {
                        _id: "foo", _rev: "4-f",
                        _revisions: { start: 4, ids: ["f", "h", "d", "a"] }
                    }
                ]
            ];

            let chain = testUtils.Promise.resolve();
            tree.forEach((docs) => {
                chain = chain.then(() => {
                    let changes1;
                    let changes2;

                    return db1.bulkDocs({
                        docs,
                        new_edits: false
                    }).then(() => {
                        return db1.replicate.to(db2);
                    }).then(() => {
                        return db1.changes({ style: "all_docs" });
                    }).then((res1) => {
                        changes1 = simplifyChanges(res1);
                        return db2.changes({ style: "all_docs" });
                    }).then((res2) => {
                        changes2 = simplifyChanges(res2);

                        assert.deepEqual(changes1, changes2, "same changes");
                    });
                });
            });
            return chain;
        });

        it("#3136 style=all_docs with conflicts", () => {
            let docs1 = [
                { _id: "0", integer: 0 },
                { _id: "1", integer: 1 },
                { _id: "2", integer: 2 },
                { _id: "3", integer: 3 }
            ];
            let docs2 = [
                { _id: "2", integer: 11 },
                { _id: "3", integer: 12 }
            ];
            let rev2;
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            return db.bulkDocs({ docs: docs1 }).then((info) => {
                docs2[0]._rev = info[2].rev;
                docs2[1]._rev = info[3].rev;
                return db.put(docs2[0]);
            }).then(() => {
                return db.put(docs2[1]);
            }).then((info) => {
                rev2 = info.rev;
                return PouchDB.replicate(db, remote);
            }).then(() => {
                // update remote once, local twice, then replicate from
                // remote to local so the remote losing conflict is later in
                // the tree
                return db.put({
                    _id: "3",
                    _rev: rev2,
                    integer: 20
                });
            }).then((resp) => {
                let rev3Doc = {
                    _id: "3",
                    _rev: resp.rev,
                    integer: 30
                };
                return db.put(rev3Doc);
            }).then(() => {
                let rev4Doc = {
                    _id: "3",
                    _rev: rev2,
                    integer: 100
                };
                return remote.put(rev4Doc).then(() => {
                    return PouchDB.replicate(remote, db).then(() => {
                        return PouchDB.replicate(db, remote);
                    }).then(() => {
                        return db.changes({
                            include_docs: true,
                            style: "all_docs",
                            conflicts: true
                        });
                    }).then((localChanges) => {
                        return remote.changes({
                            include_docs: true,
                            style: "all_docs",
                            conflicts: true
                        }).then((remoteChanges) => {
                            localChanges = simplifyChanges(localChanges);
                            remoteChanges = simplifyChanges(remoteChanges);

                            assert.deepEqual(localChanges, remoteChanges, "same changes");
                        });
                    });
                });
            });
        });

        it("#3136 style=all_docs with conflicts reversed", () => {
            let docs1 = [
                { _id: "0", integer: 0 },
                { _id: "1", integer: 1 },
                { _id: "2", integer: 2 },
                { _id: "3", integer: 3 }
            ];
            let docs2 = [
                { _id: "2", integer: 11 },
                { _id: "3", integer: 12 }
            ];
            let rev2;
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            return db.bulkDocs({ docs: docs1 }).then((info) => {
                docs2[0]._rev = info[2].rev;
                docs2[1]._rev = info[3].rev;
                return db.put(docs2[0]);
            }).then(() => {
                return db.put(docs2[1]);
            }).then((info) => {
                rev2 = info.rev;
                return PouchDB.replicate(db, remote);
            }).then(() => {
                // update remote once, local twice, then replicate from
                // remote to local so the remote losing conflict is later in
                // the tree
                return db.put({
                    _id: "3",
                    _rev: rev2,
                    integer: 20
                });
            }).then((resp) => {
                let rev3Doc = {
                    _id: "3",
                    _rev: resp.rev,
                    integer: 30
                };
                return db.put(rev3Doc);
            }).then(() => {
                let rev4Doc = {
                    _id: "3",
                    _rev: rev2,
                    integer: 100
                };
                return remote.put(rev4Doc).then(() => {
                    return PouchDB.replicate(remote, db).then(() => {
                        return PouchDB.replicate(db, remote);
                    }).then(() => {
                        return db.changes({
                            include_docs: true,
                            style: "all_docs",
                            conflicts: true,
                            descending: true
                        });
                    }).then((localChanges) => {
                        return remote.changes({
                            include_docs: true,
                            style: "all_docs",
                            conflicts: true,
                            descending: true
                        }).then((remoteChanges) => {
                            localChanges = simplifyChanges(localChanges);
                            remoteChanges = simplifyChanges(remoteChanges);

                            assert.deepEqual(localChanges, remoteChanges, "same changes");
                        });
                    });
                });
            });
        });

        it("Test checkpoint read only 3 :)", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let put = function (doc) {
                return db.bulkDocs({ docs: [doc] }).then((resp) => {
                    return resp[0];
                });
            };
            let err = {
                message: "_writer access is required for this request",
                name: "unauthorized",
                status: 401
            };
            db.put = function () {
                if (typeof arguments[arguments.length - 1] === "function") {
                    arguments[arguments.length - 1](err);
                } else {
                    return testUtils.Promise.reject(err);
                }
            };
            let doc = { _id: "3", count: 0 };
            put(doc).then((results) => {
                return PouchDB.replicate(db, remote).then((result) => {
                    assert.equal(result.ok, true);
                    doc._rev = results.rev;
                    doc.count++;
                    return put(doc);
                });
            }).then((results) => {
                doc._rev = results.rev;
                doc.count++;
                return put(doc);
            }).then(() => {
                return PouchDB.replicate(db, remote);
            }).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, 1);
                db.info((err, info) => {
                    verifyInfo(info, {
                        update_seq: 3,
                        doc_count: 1
                    });
                    done();
                });
            }, (a) => {
                done(JSON.stringify(a, false, 4));
            });
        });

        it("Testing allDocs with some conflicts (issue #468)", (done) => {
            let db1 = new PouchDB(dbs.name);
            let db2 = new PouchDB(dbs.remote);
            // we indeed needed replication to create failing test here!
            let doc = { _id: "foo", _rev: "1-a", value: "generic" };
            db1.put(doc, { new_edits: false }, () => {
                db2.put(doc, { new_edits: false }, () => {
                    testUtils.putAfter(db2, {
                        _id: "foo",
                        _rev: "2-b",
                        value: "db2"
                    }, "1-a", () => {
                        testUtils.putAfter(db1, {
                            _id: "foo",
                            _rev: "2-c",
                            value: "whatever"
                        }, "1-a", () => {
                            testUtils.putAfter(db1, {
                                _id: "foo",
                                _rev: "3-c",
                                value: "db1"
                            }, "2-c", () => {
                                db1.get("foo", (err, doc) => {
                                    assert.equal(doc.value, "db1");
                                    db2.get("foo", (err, doc) => {
                                        assert.equal(doc.value, "db2");
                                        PouchDB.replicate(db1, db2, () => {
                                            PouchDB.replicate(db2, db1, () => {
                                                db1.get("foo", (err, doc) => {
                                                    assert.equal(doc.value, "db1");
                                                    db2.get("foo", (err, doc) => {
                                                        assert.equal(doc.value, "db1");
                                                        db1.allDocs({ include_docs: true },
                                                            (err, res) => {
                                                                assert.isAbove(res.rows.length, 0, "first");
                                                                // redundant but we want to test it
                                                                assert.equal(res.rows[0].doc.value, "db1");
                                                                db2.allDocs({ include_docs: true },
                                                                    (err, res) => {
                                                                        assert.isAbove(res.rows.length, 0, "second");
                                                                        assert.equal(res.rows[0].doc.value, "db1");
                                                                        db1.info((err, info) => {
                                                                            // if auto_compaction is enabled, will
                                                                            // be 5 because 2-c goes "missing" and
                                                                            // the other db tries to re-put it
                                                                            if (!testUtils.isCouchMaster()) {
                                                                                assert.isTrue(info.update_seq >= 4 && info.update_seq <= 5);
                                                                            }
                                                                            assert.equal(info.doc_count, 1);
                                                                            db2.info((err, info2) => {
                                                                                verifyInfo(info2, {
                                                                                    update_seq: 3,
                                                                                    doc_count: 1
                                                                                });
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
                                });
                            });
                        });
                    });
                });
            });
        });

        // CouchDB will not generate a conflict here, it uses a deteministic
        // method to generate the revision number, however we cannot copy its
        // method as it depends on erlangs internal data representation
        it("Test basic conflict", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let doc1 = { _id: "adoc", foo: "bar" };
            let doc2 = { _id: "adoc", bar: "baz" };
            db.put(doc1, () => {
                remote.put(doc2, () => {
                    db.replicate.to(dbs.remote, () => {
                        remote.get("adoc", { conflicts: true }, (err, result) => {
                            assert.property(result, "_conflicts");
                            db.info((err, info) => {
                                verifyInfo(info, {
                                    update_seq: 1,
                                    doc_count: 1
                                });
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Test _conflicts key", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            // Test invalid if adapter doesnt support mapreduce
            if (!remote.query) {
                return done();
            }

            let doc1 = { _id: "adoc", foo: "bar" };
            let doc2 = { _id: "adoc", bar: "baz" };
            let ddoc = {
                _id: "_design/conflicts",
                views: {
                    conflicts: {
                        map: function (doc) {
                            if (doc._conflicts) {
                                emit(doc._id, [doc._rev].concat(doc._conflicts));
                            }
                        }.toString()
                    }
                }
            };
            remote.put(ddoc, () => {
                db.put(doc1, () => {
                    remote.put(doc2, () => {
                        db.replicate.to(dbs.remote, () => {
                            remote.query("conflicts/conflicts", {
                                reduce: false,
                                conflicts: true
                            }, (_, res) => {
                                assert.equal(res.rows.length, 1);
                                db.info((err, info) => {
                                    verifyInfo(info, {
                                        update_seq: 1,
                                        doc_count: 1
                                    });
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("Test basic live pull replication", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let doc1 = { _id: "adoc", foo: "bar" };
            remote.bulkDocs({ docs }, {}, () => {
                let count = 0;
                let finished = 0;
                let isFinished = function () {
                    if (++finished !== 2) {
                        return;
                    }
                    db.info((err, info) => {
                        verifyInfo(info, {
                            update_seq: 4,
                            doc_count: 4
                        });
                        done();
                    });
                };
                let rep = db.replicate.from(dbs.remote, {
                    live: true
                }).on("complete", isFinished);
                var changes = db.changes({
                    live: true
                }).on("change", () => {
                    ++count;
                    if (count === 3) {
                        return remote.put(doc1);
                    }
                    if (count === 4) {
                        rep.cancel();
                        changes.cancel();
                    }
                }).on("complete", isFinished).on("error", done);
            });
        });

        it("Test basic live push replication", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let doc1 = { _id: "adoc", foo: "bar" };
            db.bulkDocs({ docs }, {}, () => {
                let count = 0;
                let finished = 0;
                let isFinished = function () {
                    if (++finished !== 2) {
                        return;
                    }
                    db.info((err, info) => {
                        verifyInfo(info, {
                            update_seq: 4,
                            doc_count: 4
                        });
                        done();
                    });
                };
                let rep = remote.replicate.from(db, {
                    live: true
                }).on("complete", isFinished);
                var changes = remote.changes({
                    live: true
                }).on("change", () => {
                    ++count;
                    if (count === 3) {
                        return db.put(doc1);
                    }
                    if (count === 4) {
                        rep.cancel();
                        changes.cancel();
                    }
                }).on("complete", isFinished).on("error", done);
            });
        });

        it("test-cancel-pull-replication", (done) => {
            let remote = new PouchDB(dbs.remote);
            let db = new PouchDB(dbs.name);
            let docs = [
                { _id: "0", integer: 0, string: "0" },
                { _id: "1", integer: 1, string: "1" },
                { _id: "2", integer: 2, string: "2" }
            ];
            let doc1 = { _id: "adoc", foo: "bar" };
            let doc2 = { _id: "anotherdoc", foo: "baz" };
            remote.bulkDocs({ docs }, {}, () => {
                let count = 0;
                let replicate = db.replicate.from(remote, {
                    live: true
                }).on("complete", () => {
                    remote.put(doc2);
                    setTimeout(() => {
                        changes.cancel();
                    }, 100);
                });
                var changes = db.changes({
                    live: true
                }).on("complete", () => {
                    assert.equal(count, 4);
                    db.info((err, info) => {
                        verifyInfo(info, {
                            update_seq: 4,
                            doc_count: 4
                        });
                        done();
                    });
                }).on("change", () => {
                    ++count;
                    if (count === 3) {
                        remote.put(doc1);
                    }
                    if (count === 4) {
                        replicate.cancel();
                    }
                }).on("error", done);
            });
        });

        it("Test basic events", (done) => {
            let db = new PouchDB(dbs.name);
            db.bulkDocs({ docs }).then(() => {
                db.replicate.to(dbs.remote)
                    .on("complete", (res) => {
                        assert.exists(res);
                        db.replicate.to("http://0.0.0.0:13370")
                            .on("error", (res) => {
                                assert.exists(res);
                                done();
                            });
                    });
            });
        });

        it("Replication filter", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let docs1 = [
                { _id: "0", integer: 0 },
                { _id: "1", integer: 1 },
                { _id: "2", integer: 2 },
                { _id: "3", integer: 3 }
            ];
            remote.bulkDocs({ docs: docs1 }, () => {
                db.replicate.from(remote, {
                    filter(doc) {
                        return doc.integer % 2 === 0;
                    }
                }).on("error", done).on("complete", () => {
                    db.allDocs((err, docs) => {
                        if (err) {
                            done(err);
                        }
                        assert.equal(docs.rows.length, 2);
                        db.info((err, info) => {
                            verifyInfo(info, {
                                update_seq: 2,
                                doc_count: 2
                            });
                            done();
                        });
                    });
                });
            });
        });

        it("Replication with different filters", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let more_docs = [
                { _id: "3", integer: 3, string: "3" },
                { _id: "4", integer: 4, string: "4" }
            ];
            remote.bulkDocs({ docs }, () => {
                db.replicate.from(remote, {
                    filter(doc) {
                        return doc.integer % 2 === 0;
                    }
                }, () => {
                    remote.bulkDocs({ docs: more_docs }, () => {
                        db.replicate.from(remote, {}, (err, response) => {
                            assert.equal(response.docs_written, 3);
                            db.info((err, info) => {
                                verifyInfo(info, {
                                    update_seq: 5,
                                    doc_count: 5
                                });
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Replication doc ids", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let thedocs = [
                { _id: "3", integer: 3, string: "3" },
                { _id: "4", integer: 4, string: "4" },
                { _id: "5", integer: 5, string: "5" }
            ];
            remote.bulkDocs({ docs: thedocs }, () => {
                db.replicate.from(remote, {
                    doc_ids: ["3", "4"]
                }, (err, response) => {
                    assert.equal(response.docs_written, 2);
                    db.info((err, info) => {
                        verifyInfo(info, {
                            update_seq: 2,
                            doc_count: 2
                        });
                        done();
                    });
                });
            });
        });

        it("2204 Invalid doc_ids", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let thedocs = [
                { _id: "3", integer: 3, string: "3" },
                { _id: "4", integer: 4, string: "4" },
                { _id: "5", integer: 5, string: "5" }
            ];
            return remote.bulkDocs({ docs: thedocs }).then(() => {
                return db.replicate.from(remote, { doc_ids: "foo" });
            }).catch((err) => {
                assert.equal(err.name, "bad_request");
                assert.equal(err.reason, "`doc_ids` filter parameter is not a list.");
            });
        });

        it("Replication since", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let docs1 = [
                { _id: "1", integer: 1, string: "1" },
                { _id: "2", integer: 2, string: "2" },
                { _id: "3", integer: 3, string: "3" }
            ];
            remote.bulkDocs({ docs: docs1 }, () => {
                remote.info((err, info) => {
                    let update_seq = info.update_seq;
                    let docs2 = [
                        { _id: "4", integer: 4, string: "4" },
                        { _id: "5", integer: 5, string: "5" }
                    ];
                    remote.bulkDocs({ docs: docs2 }, () => {
                        db.replicate.from(remote, {
                            since: update_seq
                        }).on("complete", (result) => {
                            assert.equal(result.docs_written, 2);
                            db.replicate.from(remote, {
                                since: 0
                            }).on("complete", (result) => {
                                assert.equal(result.docs_written, 3);
                                db.info((err, info) => {
                                    verifyInfo(info, {
                                        update_seq: 5,
                                        doc_count: 5
                                    });
                                    done();
                                });
                            }).on("error", done);
                        }).on("error", done);
                    });
                });
            });
        });

        it("Replication with same filters", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let more_docs = [
                { _id: "3", integer: 3, string: "3" },
                { _id: "4", integer: 4, string: "4" }
            ];
            remote.bulkDocs({ docs }, () => {
                db.replicate.from(remote, {
                    filter(doc) {
                        return doc.integer % 2 === 0;
                    }
                }, () => {
                    remote.bulkDocs({ docs: more_docs }, () => {
                        db.replicate.from(remote, {
                            filter(doc) {
                                return doc.integer % 2 === 0;
                            }
                        }, (err, response) => {
                            assert.equal(response.docs_written, 1);
                            db.info((err, info) => {
                                verifyInfo(info, {
                                    update_seq: 3,
                                    doc_count: 3
                                });
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("Replication with filter that leads to some empty batches (#2689)",
            (done) => {
                let db = new PouchDB(dbs.name);
                let remote = new PouchDB(dbs.remote);
                let docs1 = [
                    { _id: "0", integer: 0 },
                    { _id: "1", integer: 1 },
                    { _id: "2", integer: 1 },
                    { _id: "3", integer: 1 },
                    { _id: "4", integer: 2 },
                    { _id: "5", integer: 2 }
                ];
                remote.bulkDocs({ docs: docs1 }, () => {
                    db.replicate.from(remote, {
                        batch_size: 2,
                        filter(doc) {
                            return doc.integer % 2 === 0;
                        }
                    }).on("complete", () => {
                        db.allDocs((err, docs) => {
                            if (err) {
                                done(err);
                            }
                            assert.equal(docs.rows.length, 3);
                            db.info((err, info) => {
                                verifyInfo(info, {
                                    update_seq: 3,
                                    doc_count: 3
                                });
                                done();
                            });
                        });
                    }).on("error", done);
                });
            });

        it("Empty replication updates checkpoint (#5145)", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let changes = remote.changes;
            remote.changes = function (params) {
                changesSince.push(params.since);
                return changes.apply(this, arguments);
            };
            var changesSince = [];
            let replicationOpts = {
                filter() {
                    return false;
                }
            };
            return remote.bulkDocs({ docs }).then(() => {
                return db.replicate.from(remote, replicationOpts);
            }).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, 0);
                assert.equal(result.docs_read, 0);
                assert.equal(changesSince.length, 2);

                // the 'since' parameter should be different on the
                // next request
                assert.notEqual(changesSince[0], changesSince[1]);

                // kick off a second replication
                return db.replicate.from(remote, replicationOpts);
            }).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, 0);
                assert.equal(result.docs_read, 0);
                assert.equal(changesSince.length, 3);

                // nothing has changed on the remote so 'since'
                // should be the same
                assert.equal(changesSince[1], changesSince[2]);
            }).then(() => {
                // Restore remote.changes to original
                remote.changes = changes;
            }).catch((err) => {
                remote.changes = changes;
                throw err;
            });
        });

        it("Does not update checkpoint unncessarily (#5379)", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let bulkDocs = remote.bulkDocs;
            let bulkDocsCalled = false;
            remote.bulkDocs = function () {
                bulkDocsCalled = true;
                return bulkDocs.apply(this, arguments);
            };
            return remote.bulkDocs({ docs }).then(() => {
                return db.replicate.from(remote);
            }).then((result) => {
                assert.equal(result.ok, true);
                bulkDocsCalled = false;

                // kick off a second replication where there are no changes
                // checkpoints are written using bulkDocs so
                // we don't expect any calls
                return db.replicate.from(remote);
            }).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(bulkDocsCalled, false);
            }).then(() => {
                // Restore remote.bulkDocs to original
                remote.bulkDocs = bulkDocs;
            }).catch((err) => {
                remote.bulkDocs = bulkDocs;
                throw err;
            });
        });

        it("Replication with deleted doc", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let docs1 = [
                { _id: "0", integer: 0 },
                { _id: "1", integer: 1 },
                { _id: "2", integer: 2 },
                { _id: "3", integer: 3 },
                { _id: "4", integer: 4, _deleted: true }
            ];
            return remote.bulkDocs({ docs: docs1 })
                .then(() => {
                    return db.replicate.from(remote);
                }).then(() => {
                    return db.allDocs();
                }).then((res) => {
                    assert.equal(res.total_rows, 4);
                    return db.info();
                }).then((info) => {
                    verifyInfo(info, {
                        update_seq: 5,
                        doc_count: 4
                    });
                });
        });

        it("5904 - replication with deleted doc and value", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let doc = { _id: "foo", integer: 4, _deleted: true };
            let rev;
            return db.put(doc)
                .then((res) => {
                    rev = res.rev;
                    return db.get(doc._id, { rev });
                }).then((local_doc) => {
                    assert.equal(local_doc.integer, 4);
                    return db.replicate.to(remote);
                }).then(() => {
                    return remote.get(doc._id, { rev });
                }).then((remote_doc) => {
                    assert.equal(remote_doc.integer, 4);
                });
        });

        it("Replication with doc deleted twice", (done) => {
            if (testUtils.isCouchMaster()) {
                return done();
            }
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            remote.bulkDocs({ docs }).then(() => {
                return remote.get("0");
            }).then((doc) => {
                return remote.remove(doc);
            }).then(() => {
                return db.replicate.from(remote);
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.equal(res.total_rows, 2);
                return remote.allDocs({ keys: ["0"] });
            }).then((res) => {
                let row = res.rows[0];
                assert.isUndefined(row.error);
                // set rev to latest so we go at the end (otherwise new
                // rev is 1 and the subsequent remove below won't win)
                let doc = {
                    _id: "0",
                    integer: 10,
                    string: "10",
                    _rev: row.value.rev
                };
                return remote.put(doc);
            }).then(() => {
                return remote.get("0");
            }).then((doc) => {
                return remote.remove(doc);
            }).then(() => {
                return db.replicate.from(remote);
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.equal(res.total_rows, 2);
                db.info((err, info) => {
                    verifyInfo(info, {
                        update_seq: 4,
                        doc_count: 2
                    });
                    done();
                });
            }).catch((err) => {
                done(JSON.stringify(err, false, 4));
            });
        });

        it("Replication notifications", (done) => {
            let changes = 0;
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let onChange = function (c) {
                changes += c.docs.length;

                if (changes === 3) {
                    db.info((err, info) => {
                        verifyInfo(info, {
                            update_seq: 3,
                            doc_count: 3
                        });
                        done();
                    });
                }
            };
            remote.bulkDocs({ docs }, {}, () => {
                db.replicate.from(dbs.remote).on("change", onChange);
            });
        });

        it("Replication with remote conflict", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let doc = { _id: "test", test: "Remote 1" }, winningRev;
            remote.post(doc, (err, resp) => {
                doc._rev = resp.rev;
                PouchDB.replicate(remote, db, () => {
                    doc.test = "Local 1";
                    db.put(doc, () => {
                        doc.test = "Remote 2";
                        remote.put(doc, (err, resp) => {
                            doc._rev = resp.rev;
                            doc.test = "Remote 3";
                            remote.put(doc, (err, resp) => {
                                winningRev = resp.rev;
                                PouchDB.replicate(db, remote, () => {
                                    PouchDB.replicate(remote, db, () => {
                                        remote.get("test", { revs_info: true },
                                            (err, remotedoc) => {
                                                db.get("test", { revs_info: true },
                                                    (err, localdoc) => {
                                                        assert.equal(localdoc._rev, winningRev);
                                                        assert.equal(remotedoc._rev, winningRev);
                                                        db.info((err, info) => {
                                                            verifyInfo(info, {
                                                                update_seq: 3,
                                                                doc_count: 1
                                                            });
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
            });
        });

        it("Replicate and modify three times", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let doc = {
                _id: "foo",
                generation: 1
            };

            return db.put(doc).then((res) => {
                doc._rev = res.rev;
                return db.replicate.to(remote);
            }).then(() => {
                return remote.get("foo");
            }).then((doc) => {
                assert.equal(doc.generation, 1);
                doc.generation = 2;
                return remote.put(doc);
            }).then((res) => {
                doc._rev = res.rev;
                return remote.replicate.to(db);
            }).then(() => {
                return db.get("foo");
            }).then((doc) => {
                assert.equal(doc.generation, 2);
                doc.generation = 3;
                return db.put(doc);
            }).then(() => {
                return db.replicate.to(remote);
            }).then(() => {
                return db.get("foo", { conflicts: true });
            }).then((doc) => {
                assert.equal(doc.generation, 3);
                assert.isUndefined(doc._conflicts);
            }).then(() => {
                return remote.get("foo", { conflicts: true });
            }).then((doc) => {
                assert.equal(doc.generation, 3);
                assert.isUndefined(doc._conflicts);
            });
        });

        function waitForChange(db, fun) {
            return new testUtils.Promise((resolve) => {
                let remoteChanges = db.changes({ live: true, include_docs: true });
                remoteChanges.on("change", (change) => {
                    if (fun(change)) {
                        remoteChanges.cancel();
                        resolve();
                    }
                });
            });
        }

        it("live replication, starting offline", () => {

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let Promise = testUtils.Promise;

            // id() is the first thing called
            let origId = remote.id;
            let i = 0;
            remote.id = function () {
                // Reject only the first 3 times
                if (++i <= 3) {
                    return Promise.reject(new Error("flunking you"));
                }
                return origId.apply(remote, arguments);
            };

            return remote.post({}).then(() => {
                return new Promise((resolve, reject) => {
                    let rep = db.replicate.from(remote, {
                        live: true
                    });
                    rep.on("error", reject);
                }).then(() => {
                    throw new Error("should have thrown error");
                }, (err) => {
                    assert.exists(err);
                });
            });
        });

        it("Replicates deleted docs (issue #2636)", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let replication = db.replicate.to(remote, {
                live: true
            });

            return db.post({}).then((res) => {
                let doc = {
                    _id: res.id,
                    _rev: res.rev
                };
                return db.remove(doc);
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 0, "deleted locally");
            }).then(() => {
                return waitForChange(remote, (change) => {
                    return change.deleted === true;
                });
            }).then(() => {
                return remote.allDocs();
            }).then((res) => {
                replication.cancel();
                assert.lengthOf(res.rows, 0, "deleted in remote");
            });
        });

        it("Replicates deleted docs w/ delay (issue #2636)", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let replication = db.replicate.to(remote, {
                live: true
            });

            let doc;
            return db.post({}).then((res) => {
                doc = { _id: res.id, _rev: res.rev };
                return waitForChange(remote, () => {
                    return true;
                });
            }).then(() => {
                return db.remove(doc);
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 0, "deleted locally");
            }).then(() => {
                return waitForChange(remote, (c) => {
                    return c.id === doc._id && c.deleted;
                });
            }).then(() => {
                return remote.allDocs();
            }).then((res) => {
                replication.cancel();
                assert.lengthOf(res.rows, 0, "deleted in remote");
            });
        });

        it("Replicates deleted docs w/ compaction", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let doc = { _id: "foo" };
            return db.put(doc).then((res) => {
                doc._rev = res.rev;
                return db.replicate.to(remote);
            }).then(() => {
                return db.put(doc);
            }).then((res) => {
                doc._rev = res.rev;
                return db.remove(doc);
            }).then(() => {
                return db.compact();
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 0, "deleted locally");
            }).then(() => {
                return db.replicate.to(remote);
            }).then(() => {
                return remote.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 0, "deleted in remote");
            });
        });

        it("Replicates modified docs (issue #2636)", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let replication = db.replicate.to(remote, {
                live: true
            });

            return db.post({}).then((res) => {
                let doc = {
                    _id: res.id,
                    _rev: res.rev,
                    modified: "yep"
                };

                return db.put(doc);
            }).then(() => {
                return db.allDocs({ include_docs: true });
            }).then((res) => {
                assert.lengthOf(res.rows, 1, "one doc synced locally");
                assert.equal(res.rows[0].doc.modified, "yep", "modified locally");
            }).then(() => {
                return waitForChange(remote, (change) => {
                    return change.doc.modified === "yep";
                });
            }).then(() => {
                return remote.allDocs({ include_docs: true });
            }).then((res) => {
                replication.cancel();
                assert.lengthOf(res.rows, 1, "1 doc in remote");
                assert.equal(res.rows[0].doc.modified, "yep", "modified in remote");
            });
        });

        it("Replication of multiple remote conflicts (#789)", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let doc = { _id: "789", _rev: "1-a", value: "test" };
            function createConflicts(db, callback) {
                db.put(doc, { new_edits: false }, () => {
                    testUtils.putAfter(db, {
                        _id: "789",
                        _rev: "2-a",
                        value: "v1"
                    }, "1-a", () => {
                        testUtils.putAfter(db, {
                            _id: "789",
                            _rev: "2-b",
                            value: "v2"
                        }, "1-a", () => {
                            testUtils.putAfter(db, {
                                _id: "789",
                                _rev: "2-c",
                                value: "v3"
                            }, "1-a", () => {
                                callback();
                            });
                        });
                    });
                });
            }
            createConflicts(remote, () => {
                db.replicate.from(remote, (err, result) => {
                    assert.equal(result.ok, true);
                    // in this situation, all the conflicting revisions should be read and
                    // written to the target database (this is consistent with CouchDB)
                    assert.equal(result.docs_written, 3);
                    assert.equal(result.docs_read, 3);
                    db.info((err, info) => {
                        if (!testUtils.isCouchMaster()) {
                            assert.isAbove(info.update_seq, 0);
                        }
                        assert.equal(info.doc_count, 1);
                        done();
                    });
                });
            });
        });

        it("Replicate large number of docs", (done) => {
            if ("saucelabs" in testUtils.params()) {
                return done();
            }
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let docs = [];
            let num = 30;
            for (let i = 0; i < num; i++) {
                docs.push({
                    _id: "doc_" + i,
                    foo: "bar_" + i
                });
            }
            remote.bulkDocs({ docs }, () => {
                db.replicate.from(remote, {}, () => {
                    db.allDocs((err, res) => {
                        assert.equal(res.total_rows, num);
                        db.info((err, info) => {
                            verifyInfo(info, {
                                update_seq: 30,
                                doc_count: 30
                            });
                            done();
                        });
                    });
                });
            });
        });

        it("Ensure checkpoint after deletion", (done) => {
            let db1name = dbs.name;
            let adoc = { _id: "adoc" };
            let newdoc = { "_id": "newdoc" };
            let db1 = new PouchDB(dbs.name);
            let db2 = new PouchDB(dbs.remote);
            db1.post(adoc, () => {
                PouchDB.replicate(db1, db2).on("complete", () => {
                    db1.destroy(() => {
                        let fresh = new PouchDB(db1name);
                        fresh.post(newdoc, () => {
                            PouchDB.replicate(fresh, db2).on("complete", () => {
                                db2.allDocs((err, docs) => {
                                    assert.equal(docs.rows.length, 2);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("issue #1001 cb as 3rd argument", (done) => {
            PouchDB.replicate("http://example.com", dbs.name, (err) => {
                assert.exists(err);
                done();
            });
        });

        it("issue #1001 cb as 4th argument", (done) => {
            let url = "http://example.com";
            PouchDB.replicate(url, dbs.name, {}, (err) => {
                assert.exists(err);
                done();
            });
        });

        it("issue #909 Filtered replication bails at paging limit",
            (done) => {
                let db = new PouchDB(dbs.name);
                let remote = new PouchDB(dbs.remote);
                let docs = [];
                let num = 100;
                for (var i = 0; i < num; i++) {
                    docs.push({
                        _id: "doc_" + i,
                        foo: "bar_" + i
                    });
                }
                num = 100;
                let docList = [];
                for (i = 0; i < num; i += 5) {
                    docList.push("doc_" + i);
                }
                // uncomment this line to test only docs higher than paging limit
                docList = [
                    "doc_33",
                    "doc_60",
                    "doc_90"
                ];
                remote.bulkDocs({ docs }, {}, () => {
                    db.replicate.from(dbs.remote, {
                        live: false,
                        doc_ids: docList
                    }, (err, result) => {
                        assert.equal(result.docs_written, docList.length);
                        db.info((err, info) => {
                            verifyInfo(info, {
                                update_seq: 3,
                                doc_count: 3
                            });
                            done();
                        });
                    });
                });
            });

        it("(#4963) Ensure successful docs are saved but seq not updated if single doc fails to replicate", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let Promise = testUtils.Promise;

            // 10 test documents
            let num = 10;
            let docs = [];
            for (let i = 0; i < num; i++) {
                docs.push({
                    _id: "doc_" + i,
                    foo: "bar_" + i,
                    // needed to cause the code to fetch using get
                    _attachments: {
                        text: {
                            content_type: "text\/plain",
                            data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                        }
                    }
                });
            }
            // Initialize remote with test documents
            remote.bulkDocs({ docs }, {}, (err, results) => {
                let bulkGet = remote.bulkGet;
                function first_replicate() {
                    remote.bulkGet = function () {
                        let getResults = [];
                        for (let i = 0; i < docs.length; i++) {
                            let doc = docs[i];
                            getResults.push({
                                id: doc._id,
                                docs: [{
                                    ok: {
                                        _id: doc._id,
                                        foo: doc.foo,
                                        _attachments: doc._attachments,
                                        _rev: results[i].rev
                                    }
                                }]
                            });
                        }
                        // Mock remote.get to fail writing doc_3 (fourth doc)
                        getResults[3].docs[0] = { error: new Error("timeout") };
                        return Promise.resolve({ results: getResults });
                    };
                    // Replicate and confirm failure, docs_written and target docs
                    db.replicate.from(remote).then(() => {
                        done(new Error("First replication should fail"));
                    }).catch(function (err) {
                        // We expect that first replication should fail
                        assert.exists(err);

                        assert.equal(err.result.ok, false);
                        assert.equal(err.result.docs_written, 9);
                        if (!testUtils.isCouchMaster()) {
                            assert.equal(err.result.last_seq, 0);
                        }

                        let docs = [
                            ["doc_0", true],
                            ["doc_1", true],
                            ["doc_2", true],
                            ["doc_3", false],
                            ["doc_4", true],
                            ["doc_5", true],
                            ["doc_6", true],
                            ["doc_7", true],
                            ["doc_8", true],
                            ["doc_9", true]
                        ];

                        function check_docs(id, exists) {
                            if (!id) {
                                db.info((err, info) => {
                                    verifyInfo(info, {
                                        update_seq: 9,
                                        doc_count: 9
                                    });

                                    second_replicate();
                                });
                                return;
                            }
                            db.get(id, function (err) {
                                if (exists) {
                                    assert.isNull(err);
                                } else {
                                    assert.exists(err);
                                }
                                check_docs.apply(this, docs.shift());
                            });
                        }

                        check_docs.apply(this, docs.shift());
                    });
                }
                function second_replicate() {
                    // Restore remote.bulkGet to original
                    remote.bulkGet = bulkGet;
                    // Replicate and confirm success, docs_written and target docs
                    db.replicate.from(remote).then((result) => {
                        assert.exists(result);
                        assert.equal(result.docs_written, 1);
                        if (!testUtils.isCouchMaster()) {
                            assert.equal(result.last_seq, 10);
                        }

                        let docs = ["doc_0", "doc_1", "doc_2", "doc_3", "doc_4", "doc_5", "doc_6", "doc_7", "doc_8", "doc_9"];

                        function check_docs(id) {
                            if (!id) {
                                db.info((err, info) => {
                                    verifyInfo(info, {
                                        update_seq: 10,
                                        doc_count: 10
                                    });
                                    done();
                                });
                                return;
                            }
                            db.get(id, (err) => {
                                assert.isNull(err);
                                check_docs(docs.shift());
                            });
                        }

                        check_docs(docs.shift());
                    }).catch(done);
                }
                // Done the test
                first_replicate();
            });
        });

        // Should not start replication over if last_seq mismatches in checkpoints
        // and it can be resolved some other way
        it("#3999-1 should not start over if last_seq mismatches", () => {

            let source = new PouchDB(dbs.remote);
            let mismatch = false;
            let failWrite = false;
            let checkpoint;
            let checkpointCount = 0;

            // 1. This is where we fake the mismatch:
            let putte = source.put;

            source.put = function (doc) {

                // We need the checkpoint id so we can inspect it later
                if (/local/.test(doc._id)) {
                    checkpointCount++;
                    checkpoint = doc._id;
                }

                if (failWrite && checkpointCount > 1) {
                    return testUtils.Promise.reject({
                        status: 0,
                        message: "Database encountered an unknown error"
                    });
                }

                return putte.apply(this, arguments);
            };

            // 2. We measure that the replication starts in the expected
            // place in the 'changes' function
            let changes = source.changes;
            source.changes = function (opts) {

                if (mismatch) {
                    assert.notEqual(opts.since, 0);
                }
                return changes.apply(source, arguments);
            };


            let doc = { _id: "3", count: 0 };
            let put;

            return source.put({ _id: "4", count: 1 }, {}).then(() => {
                return source.put(doc, {});
            }).then((_put) => {
                put = _put;
                // Do one replication, this replication
                // will fail writing one checkpoint
                failWrite = true;
                return source.replicate.to(dbs.name, { batch_size: 1 });
            }).catch(() => {
                failWrite = false;
            }).then(() => {
                // Verify that checkpoints are indeed mismatching:
                assert.exists(checkpoint);
                let target = new PouchDB(dbs.name);
                return testUtils.Promise.all([
                    target.get(checkpoint),
                    source.get(checkpoint)
                ]);
            }).then((res) => {
                assert.equal(res[0].session_id, res[1].session_id);
                assert.notEqual(res[0].last_seq, res[1].last_seq);

                doc._rev = put.rev;
                doc.count++;
                return source.put(doc, {});
            }).then(() => {
                // Trigger the mismatch on the 2nd replication
                mismatch = true;
                return source.replicate.to(dbs.name);
            });
        });

        it("#3999-2 should start over if no common session is found", () => {

            let source = new PouchDB(dbs.remote);
            let mismatch = false;
            let writeStrange = false;
            let checkpoint;
            let checkpointCount = 0;

            // 1. This is where we fake the mismatch:
            let putte = source.put;
            source.put = function (doc) {

                // We need the checkpoint id so we can inspect it later
                if (/local/.test(doc._id)) {
                    checkpointCount++;
                    checkpoint = doc._id;
                }

                if (!writeStrange || checkpointCount < 1) {
                    return putte.apply(this, arguments);
                }

                // Change session id of source checkpoint to mismatch
                doc.session_id = "aaabbbbb";
                doc.history[0].session_id = "aaabbbbb";
                return putte.apply(this, arguments);
            };

            // 2. We measure that the replication starts in the expected
            // place in the 'changes' function
            let changes = source.changes;
            source.changes = function (opts) {
                if (mismatch) {
                    // We expect this replication to start over,
                    // so the correct value of since is 0
                    // if it's higher, the replication read the checkpoint
                    // without caring for session id
                    assert.equal(opts.since, 0);
                    mismatch = false;
                }

                return changes.apply(source, arguments);
            };

            let doc = { _id: "3", count: 0 };
            let put;

            return source.put(doc, {}).then((_put) => {
                put = _put;
                writeStrange = true;
                // Do one replication, to not start from 0
                return source.replicate.to(dbs.name);
            }).then(() => {
                writeStrange = false;

                // Verify that checkpoints are indeed mismatching:
                assert.exists(checkpoint);
                let target = new PouchDB(dbs.name);
                return testUtils.Promise.all([
                    target.get(checkpoint),
                    source.get(checkpoint)
                ]);
            }).then((res) => {
                // [0] = target checkpoint, [1] = source checkpoint
                assert.notEqual(res[0].session_id, res[1].session_id);

                doc._rev = put.rev;
                doc.count++;
                return source.put(doc, {});
            }).then(() => {
                // Trigger the mismatch on the 2nd replication
                mismatch = true;
                return source.replicate.to(dbs.name);
            });
        });

        it("#3999-3 should not start over if common session is found", () => {

            let source = new PouchDB(dbs.remote);
            let mismatch = false;
            let writeStrange = false;
            let checkpoint;
            let checkpointCount = 0;

            // 1. This is where we fake the mismatch:
            let putte = source.put;
            source.put = function (doc) {

                // We need the checkpoint id so we can inspect it later
                if (/local/.test(doc._id)) {
                    checkpointCount++;
                    checkpoint = doc._id;
                }

                if (!writeStrange || checkpointCount < 1) {
                    return putte.apply(this, arguments);
                }

                // Change session id of source checkpoint to mismatch
                let session = doc.session_id;

                doc.session_id = "aaabbbbb";
                doc.history[0].session_id = "aaabbbbb";
                // put a working session id in the history:
                doc.history.push({
                    session_id: session,
                    last_seq: doc.last_seq
                });
                return putte.apply(this, arguments);
            };

            // 2. We measure that the replication starts in the expected
            // place in the 'changes' function
            let changes = source.changes;

            source.changes = function (opts) {
                if (mismatch) {
                    // If we resolve to 0, the checkpoint resolver has not
                    // been going through the sessions
                    assert.notEqual(opts.since, 0);

                    mismatch = false;
                }

                return changes.apply(source, arguments);
            };


            let doc = { _id: "3", count: 0 };
            let put;

            return source.put(doc, {}).then((_put) => {
                put = _put;
                // Do one replication, to not start from 0
                writeStrange = true;
                return source.replicate.to(dbs.name);
            }).then(() => {
                writeStrange = false;
                // Verify that checkpoints are indeed mismatching:
                assert.exists(checkpoint);
                let target = new PouchDB(dbs.name);
                return testUtils.Promise.all([
                    target.get(checkpoint),
                    source.get(checkpoint)
                ]);
            }).then((res) => {
                // [0] = target checkpoint, [1] = source checkpoint
                assert.notEqual(res[0].session_id, res[1].session_id);

                doc._rev = put.rev;
                doc.count++;
                return source.put(doc, {});
            }).then(() => {
                // Trigger the mismatch on the 2nd replication
                mismatch = true;
                return source.replicate.to(dbs.name);
            });
        });

        it('#3999-4 should "upgrade" an old checkpoint', () => {
            let secondRound = false;
            let writeStrange = false;
            let checkpoint;
            let checkpointCount = 0;
            let source = new PouchDB(dbs.remote);
            let target = new PouchDB(dbs.name);

            // 1. This is where we fake the mismatch:
            let putter = function (doc) {

                // We need the checkpoint id so we can inspect it later
                if (/local/.test(doc._id)) {
                    checkpointCount++;
                    checkpoint = doc._id;
                }

                let args = [].slice.call(arguments, 0);

                // Write an old-style checkpoint on the first replication:
                if (writeStrange && checkpointCount >= 1) {
                    let newDoc = {
                        _id: doc._id,
                        last_seq: doc.last_seq
                    };

                    args.shift();
                    args.unshift(newDoc);
                }

                if (this === source) {
                    return sourcePut.apply(this, args);
                }

                return targetPut.apply(this, args);
            };

            var sourcePut = source.put;
            source.put = putter;
            var targetPut = target.put;
            target.put = putter;

            let changes = source.changes;
            source.changes = function (opts) {
                if (secondRound) {
                    // Test 1: Check that we read the old style local doc
                    // and didn't start from 0
                    assert.notEqual(opts.since, 0);
                }
                return changes.apply(source, arguments);
            };

            let doc = { _id: "3", count: 0 };

            return source.put({ _id: "4", count: 1 }, {}).then(() => {
                writeStrange = true;
                return source.replicate.to(target);
            }).then(() => {
                writeStrange = false;
                // Verify that we have old checkpoints:
                assert.exists(checkpoint);
                let target = new PouchDB(dbs.name);
                return testUtils.Promise.all([
                    target.get(checkpoint),
                    source.get(checkpoint)
                ]);
            }).then((res) => {
                // [0] = target checkpoint, [1] = source checkpoint
                assert.isUndefined(res[0].session_id);
                assert.isUndefined(res[1].session_id);

                return source.put(doc, {});
            }).then(() => {
                // Do one replication, check that we start from expected last_seq
                secondRound = true;
                return source.replicate.to(target);
            }).then(() => {
                assert.exists(checkpoint);
                return source.get(checkpoint);
            }).then((res) => {
                assert.exists(res.version);
                assert.exists(res.replicator);
                assert.exists(res.session_id);
                assert.equal(res.version, 1);
                assert.isString(res.session_id);
            });
        });

        it("(#1307) - replicate empty database", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            db.replicate.from(remote, (err, result) => {
                assert.isNull(err);
                assert.exists(result);
                assert.equal(result.docs_written, 0);
                db.info((err, info) => {
                    verifyInfo(info, {
                        update_seq: 0,
                        doc_count: 0
                    });
                    done();
                });
            });
        });


        // This fails as it somehow triggers an xhr abort in the http adapter in
        // node which doesnt have xhr....
        it.skip("Syncing should stop if one replication fails (issue 838)",
            (done) => {
                let db = new PouchDB(dbs.name);
                let remote = new PouchDB(dbs.remote);
                let doc1 = { _id: "adoc", foo: "bar" };
                let doc2 = { _id: "anotherdoc", foo: "baz" };
                let finished = false;
                let replications = db.replicate.sync(remote, {
                    live: true
                }).on("complete", () => {
                    if (finished) {
                        return;
                    }
                    finished = true;
                    remote.put(doc2, () => {
                        setTimeout(() => {
                            db.allDocs((err, res) => {
                                assert.isBelow(res.total_rows, 2);
                                done();
                            });
                        }, 100);
                    });
                });
                db.put(doc1, () => {
                    replications.pull.cancel();
                });
            });

        it("Reporting write failures (#942)", (done) => {
            let docs = [{ _id: "a", _rev: "1-a" }, { _id: "b", _rev: "1-b" }];
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            db.bulkDocs({ docs }, { new_edits: false }, () => {
                let bulkDocs = remote.bulkDocs;
                let bulkDocsCallCount = 0;
                remote.bulkDocs = function (content, opts, callback) {
                    return new testUtils.Promise((fulfill, reject) => {
                        if (typeof callback !== "function") {
                            callback = function (err, resp) {
                                if (err) {
                                    reject(err);
                                } else {
                                    fulfill(resp);
                                }
                            };
                        }

                        // mock a successful write for the first
                        // document and a failed write for the second
                        let doc = content.docs[0];

                        if (/^_local/.test(doc._id)) {
                            return bulkDocs.apply(remote, [content, opts, callback]);
                        }

                        if (bulkDocsCallCount === 0) {
                            bulkDocsCallCount++;
                            callback(null, [{ ok: true, id: doc._id, rev: doc._rev }]);
                        } else if (bulkDocsCallCount === 1) {
                            bulkDocsCallCount++;
                            callback(null, [{
                                id: doc._id,
                                error: "internal server error",
                                reason: "test document write error"
                            }]);
                        } else {
                            bulkDocs.apply(remote, [content, opts, callback]);
                        }
                    });
                };

                db.replicate.to(remote, { batch_size: 1, retry: false },
                    (err, result) => {
                        assert.isUndefined(result);
                        assert.exists(err);
                        assert.equal(err.result.docs_read, 2, "docs_read");
                        assert.equal(err.result.docs_written, 1, "docs_written");
                        assert.equal(err.result.doc_write_failures, 1, "doc_write_failures");
                        remote.bulkDocs = bulkDocs;
                        db.replicate.to(remote, { batch_size: 1, retry: false }, (err, result) => {
                            // checkpoint should not be moved past first doc
                            // should continue from this point and retry second doc
                            assert.equal(result.docs_read, 1, "second replication, docs_read");
                            assert.equal(result.docs_written, 1, "second replication, docs_written");
                            assert.equal(result.doc_write_failures, 0, "second replication, doc_write_failures");
                            db.info((err, info) => {
                                verifyInfo(info, {
                                    update_seq: 2,
                                    doc_count: 2
                                });
                                done();
                            });
                        });
                    });
            });
        });

        it("Reporting write failures if whole saving fails (#942)", (done) => {
            let docs = [{ _id: "a", _rev: "1-a" }, { _id: "b", _rev: "1-b" }];
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            db.bulkDocs({ docs }, { new_edits: false }, () => {
                let bulkDocs = remote.bulkDocs;
                remote.bulkDocs = function (docs, opts, callback) {
                    if (typeof callback !== "function") {
                        return testUtils.Promise.reject(new Error());
                    }
                    callback(new Error());
                };

                db.replicate.to(remote, { batch_size: 1, retry: false }, (err, result) => {
                    assert.isUndefined(result);
                    assert.exists(err);
                    assert.equal(err.result.docs_read, 1, "docs_read");
                    assert.equal(err.result.docs_written, 0, "docs_written");
                    assert.equal(err.result.doc_write_failures, 1, "doc_write_failures");
                    assert.equal(err.result.last_seq, 0, "last_seq");
                    remote.bulkDocs = bulkDocs;
                    db.replicate.to(remote, { batch_size: 1, retry: false },
                        (err, result) => {
                            assert.equal(result.doc_write_failures, 0, "second replication, doc_write_failures");
                            assert.equal(result.docs_written, 2, "second replication, docs_written");
                            done();
                        });
                });
            });
        });

        it("Test consecutive replications with different query_params",
            (done) => {
                let db = new PouchDB(dbs.name);
                let remote = new PouchDB(dbs.remote);
                let myDocs = [
                    { _id: "0", integer: 0, string: "0" },
                    { _id: "1", integer: 1, string: "1" },
                    { _id: "2", integer: 2, string: "2" },
                    { _id: "3", integer: 3, string: "3" },
                    { _id: "4", integer: 5, string: "5" }
                ];
                remote.bulkDocs({ docs: myDocs }, {}, () => {
                    let filterFun = function (doc, req) {
                        if (req.query.even) {
                            return doc.integer % 2 === 0;
                        }
                        return true;

                    };
                    db.replicate.from(dbs.remote, {
                        filter: filterFun,
                        query_params: { even: true }
                    }, (err, result) => {
                        assert.equal(result.docs_written, 2);
                        db.replicate.from(dbs.remote, {
                            filter: filterFun,
                            query_params: { even: false }
                        }, (err, result) => {
                            assert.equal(result.docs_written, 3);
                            done();
                        });
                    });
                });
            });

        it("Test consecutive replications with different query_params and promises",
            (done) => {
                let db = new PouchDB(dbs.name);
                let remote = new PouchDB(dbs.remote);
                let myDocs = [
                    { _id: "0", integer: 0, string: "0" },
                    { _id: "1", integer: 1, string: "1" },
                    { _id: "2", integer: 2, string: "2" },
                    { _id: "3", integer: 3, string: "3" },
                    { _id: "4", integer: 5, string: "5" }
                ];
                let filterFun;
                remote.bulkDocs({ docs: myDocs }).then(() => {
                    filterFun = function (doc, req) {
                        if (req.query.even) {
                            return doc.integer % 2 === 0;
                        }
                        return true;

                    };
                    return db.replicate.from(dbs.remote, {
                        filter: filterFun,
                        query_params: { "even": true }
                    });
                }).then((result) => {
                    assert.equal(result.docs_written, 2);
                    return db.replicate.from(dbs.remote, {
                        filter: filterFun,
                        query_params: { "even": false }
                    });
                }).then((result) => {
                    assert.equal(result.docs_written, 3);
                    done();
                }).catch(done);
            });

        it("Test consecutive replications with different doc_ids", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let myDocs = [
                { _id: "0", integer: 0, string: "0" },
                { _id: "1", integer: 1, string: "1" },
                { _id: "2", integer: 2, string: "2" },
                { _id: "3", integer: 3, string: "3" },
                { _id: "4", integer: 5, string: "5" }
            ];
            remote.bulkDocs({ docs: myDocs }, {}, () => {
                db.replicate.from(dbs.remote, {
                    doc_ids: ["0", "4"]
                }, (err, result) => {
                    assert.equal(result.docs_written, 2);
                    db.replicate.from(dbs.remote, {
                        doc_ids: ["1", "2", "3"]
                    }, (err, result) => {
                        assert.equal(result.docs_written, 3);
                        db.replicate.from(dbs.remote, {
                            doc_ids: ["5"]
                        }, (err, result) => {
                            assert.equal(result.docs_written, 0);
                            db.info((err, info) => {
                                verifyInfo(info, {
                                    update_seq: 5,
                                    doc_count: 5
                                });
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("#3962 - Test many attachments", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let doc = { _id: "foo", _attachments: {} };
            let num = 50;

            Array.apply(null, { length: num }).forEach((_, i) => {
                doc._attachments["file_" + i] = {
                    content_type: "text\/plain",
                    data: testUtils.makeBlob("Some text: " + i)
                };
            });

            return remote.put(doc).then(() => {
                return db.replicate.from(dbs.remote);
            }).then(() => {
                return db.get("foo");
            }).then((res) => {
                assert.equal(Object.keys(res._attachments).length, num);
            });
        });

        it("doc count after multiple replications", (done) => {
            let runs = 2;
            // helper. remove each document in db and bulk load docs into same
            function rebuildDocuments(db, docs, callback) {
                db.allDocs({ include_docs: true }, (err, response) => {
                    let count = 0;
                    let limit = response.rows.length;
                    if (limit === 0) {
                        bulkLoad(db, docs, callback);
                    }
                    response.rows.forEach((doc) => {
                        db.remove(doc, () => {
                            ++count;
                            if (count === limit) {
                                bulkLoad(db, docs, callback);
                            }
                        });
                    });
                });
            }

            // helper.
            function bulkLoad(db, docs, callback) {
                db.bulkDocs({ docs }, (err, results) => {
                    if (err) {
                        console.error("Unable to bulk load docs.  Err: " +
                            JSON.stringify(err));
                        return;
                    }
                    callback(results);
                });
            }

            // The number of workflow cycles to perform. 2+ was always failing
            // reason for this test.
            var workflow = function (name, remote, x) {
                // some documents.  note that the variable Date component,
                //thisVaries, makes a difference.
                // when the document is otherwise static, couch gets the same hash
                // when calculating revision.
                // and the revisions get messed up in pouch
                let docs = [
                    {
                        _id: "0",
                        integer: 0,
                        thisVaries: new Date(),
                        common: true
                    },
                    {
                        _id: "1",
                        integer: 1,
                        thisVaries: new Date(),
                        common: true
                    },
                    {
                        _id: "2",
                        integer: 2,
                        thisVaries: new Date(),
                        common: true
                    },
                    {
                        _id: "3",
                        integer: 3,
                        thisVaries: new Date(),
                        common: true
                    },
                    {
                        _id: "_design/common",
                        views: {
                            common: {
                                map: function (doc) {
                                    if (doc.common) {
                                        emit(doc._id, doc._rev);
                                    }
                                }.toString()
                            }
                        }
                    }
                ];
                let dbr = new PouchDB(remote);
                // Test invalid if adapter doesnt support mapreduce
                if (!dbr.query) {
                    return done();
                }

                rebuildDocuments(dbr, docs, () => {
                    let db = new PouchDB(name);
                    db.replicate.from(remote, () => {
                        db.query("common/common", { reduce: false },
                            (err, result) => {
                                // -1 for the design doc
                                assert.equal(result.rows.length, docs.length - 1);
                                if (--x) {
                                    workflow(name, remote, x);
                                } else {
                                    db.info((err, info) => {
                                        verifyInfo(info, {
                                            update_seq: 5,
                                            doc_count: 5
                                        });
                                        done();
                                    });
                                }
                            }
                        );
                    });
                });
            };

            workflow(dbs.name, dbs.remote, runs);
        });

        it("issue #300 rev id unique per doc", (done) => {
            let remote = new PouchDB(dbs.remote);
            let db = new PouchDB(dbs.name);
            let docs = [{ _id: "a" }, { _id: "b" }];
            remote.bulkDocs({ docs }, {}, () => {
                db.replicate.from(dbs.remote, () => {
                    db.allDocs((err, result) => {
                        assert.equal(result.rows.length, 2);
                        assert.equal(result.rows[0].id, "a");
                        assert.equal(result.rows[1].id, "b");
                        db.info((err, info) => {
                            verifyInfo(info, {
                                update_seq: 2,
                                doc_count: 2
                            });
                            done();
                        });
                    });
                });
            });
        });

        it("issue #585 Store checkpoint on target db.", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let docs = [{ _id: "a" }, { _id: "b" }];
            db.bulkDocs({ docs }, {}, () => {
                db.replicate.to(dbs.remote, (err, result) => {
                    assert.equal(result.docs_written, docs.length);
                    remote.destroy(() => {
                        db.replicate.to(dbs.remote, (err, result) => {
                            assert.equal(result.docs_written, docs.length);
                            db.info((err, info) => {
                                verifyInfo(info, {
                                    update_seq: 2,
                                    doc_count: 2
                                });
                                done();
                            });
                        });
                    });
                });
            });
        });
        it("should work with a read only source", (done) => {
            let src = new PouchDB(dbs.name);
            let target = new PouchDB(dbs.remote);
            let err = {
                message: "_writer access is required for this request",
                name: "unauthorized",
                status: 401
            };
            src.bulkDocs({
                docs: [
                    { _id: "0", integer: 0, string: "0" },
                    { _id: "1", integer: 1, string: "1" },
                    { _id: "2", integer: 2, string: "2" }
                ]
            }).then(() => {
                src.put = function () {
                    if (typeof arguments[arguments.length - 1] === "function") {
                        arguments[arguments.length - 1](err);
                    } else {
                        return testUtils.Promise.reject(err);
                    }
                };
                return src.replicate.to(target);
            }).then(() => {
                target.info((err, info) => {
                    verifyInfo(info, {
                        update_seq: 3,
                        doc_count: 3
                    });
                    done();
                });
            }, (a) => {
                done(JSON.stringify(a, false, 4));
            });
        });

        it("issue #2342 update_seq after replication", (done) => {
            let docs = [];
            for (let i = 0; i < 10; i++) {
                docs.push({ _id: i.toString() });
            }

            let remote = new PouchDB(dbs.remote);
            let db = new PouchDB(dbs.name);

            remote.bulkDocs({ docs }, {}, (err, res) => {
                res.forEach((row, i) => {
                    docs[i]._rev = row.rev;
                    if (i % 2 === 0) {
                        docs[i]._deleted = true;
                    }
                });
                remote.bulkDocs({ docs }, {}, () => {
                    db.replicate.from(dbs.remote, () => {
                        db.info((err, info) => {
                            db.changes({
                                descending: true,
                                limit: 1
                            }).on("change", (change) => {
                                assert.lengthOf(change.changes, 1);

                                // not a valid assertion in CouchDB 2.0
                                if (!testUtils.isCouchMaster()) {
                                    assert.equal(change.seq, info.update_seq);
                                }
                                done();
                            }).on("error", done);
                        });
                    });
                });
            });
        });

        it("issue #2393 update_seq after new_edits + replication", (done) => {
            // the assertions below do not hold in a clustered CouchDB
            if (testUtils.isCouchMaster()) {
                return done();
            }

            let docs = [{
                _id: "foo",
                "_rev": "1-x",
                _revisions: {
                    start: 1,
                    ids: ["x"]
                }
            }];

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            remote.bulkDocs({ docs, new_edits: false }, (err) => {
                assert.isNull(err);
                remote.bulkDocs({ docs, new_edits: false }, (err) => {
                    assert.isNull(err);
                    db.replicate.from(dbs.remote, () => {
                        db.info((err, info) => {
                            var changes = db.changes({
                                descending: true,
                                limit: 1
                            }).on("change", (change) => {
                                assert.lengthOf(change.changes, 1);
                                assert.equal(change.seq, info.update_seq);
                                changes.cancel();
                            }).on("complete", () => {
                                remote.info((err, info) => {
                                    var rchanges = remote.changes({
                                        descending: true,
                                        limit: 1
                                    }).on("change", (change) => {
                                        assert.lengthOf(change.changes, 1);
                                        assert.equal(change.seq, info.update_seq);
                                        rchanges.cancel();
                                    }).on("complete", () => {
                                        done();
                                    }).on("error", done);
                                });
                            }).on("error", done);
                        });
                    });
                });
            });
        });

        it("should cancel for live replication", (done) => {
            let remote = new PouchDB(dbs.remote);
            let db = new PouchDB(dbs.name);
            let rep = db.replicate.from(remote, { live: true });
            let called = false;
            rep.on("change", () => {
                if (called) {
                    done(new Error("called too many times!"));
                } else {
                    called = true;
                    rep.cancel();
                    remote.put({ _id: "foo" }).then(() => {
                        return remote.put({ _id: "bar" });
                    }).then(() => {
                        setTimeout(() => {
                            done();
                        }, 500);
                    });
                }
            });
            remote.put({ _id: "hazaa" });
        });

        it("#2970 replicate database w/ deleted conflicted revs", () => {
            let local = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let docid = "mydoc";

            // create a bunch of rando, good revisions
            let numRevs = 5;
            let uuids = [];
            for (let i = 0; i < numRevs - 1; i++) {
                uuids.push(testUtils.rev());
            }

            // good branch
            // this branch is one revision ahead of the conflicted branch
            let a_conflict = testUtils.rev();
            let a_burner = testUtils.rev();
            let a_latest = testUtils.rev();
            let a_rev_num = numRevs + 2;
            let a_doc = {
                _id: docid,
                _rev: `${a_rev_num}-${a_latest}`,
                _revisions: {
                    start: a_rev_num,
                    ids: [a_latest, a_burner, a_conflict].concat(uuids)
                }
            };

            // conflicted deleted branch
            let b_conflict = testUtils.rev();
            let b_deleted = testUtils.rev();
            let b_rev_num = numRevs + 1;
            let b_doc = {
                _id: docid,
                _rev: `${b_rev_num}-${b_deleted}`,
                _deleted: true,
                _revisions: {
                    start: b_rev_num,
                    ids: [b_deleted, b_conflict].concat(uuids)
                }
            };

            // push the conflicted documents
            return remote.bulkDocs([a_doc, b_doc], {
                new_edits: false
            }).then(() => {
                return remote.get(docid, { open_revs: "all" }).then((revs) => {
                    assert.equal(revs.length, 2, "correct number of open revisions");
                    assert.equal(revs[0].ok._id, docid, "rev 1, correct document id");
                    assert.equal(revs[1].ok._id, docid, "rev 2, correct document id");
                    // order of revisions is not specified
                    assert.isTrue(((
                        revs[0].ok._rev === a_doc._rev &&
                        revs[1].ok._rev === b_doc._rev) ||
                        (
                            revs[0].ok._rev === b_doc._rev &&
                            revs[1].ok._rev === a_doc._rev)
                    ));
                });
            })

                // attempt to replicate
                .then(() => {
                    return local.replicate.from(remote).then((result) => {
                        assert.equal(result.ok, true, "replication result was ok");
                        // # of documents is 2 because deleted
                        // conflicted revision counts as one
                        assert.equal(result.docs_written, 2,
                            "replicated the correct number of documents");
                    });
                });
        });


        // test validate_doc_update, which is a reasonable substitute
        // for testing design doc replication of non-admin users, since we
        // always test in admin party
        it("#2268 dont stop replication if single forbidden", (done) => {

            testUtils.isCouchDB((isCouchDB) => {
                if (adapters[1] !== "http" || !isCouchDB) {
                    return done();
                }

                let ddoc = {
                    _id: "_design/validate",
                    validate_doc_update: function (newDoc) {
                        if (newDoc.foo === undefined) {
                            throw { forbidden: "Document must have a foo." };
                        }
                    }.toString()
                };

                let remote = new PouchDB(dbs.remote);
                let db = new PouchDB(dbs.name);

                remote.put(ddoc).then(() => {
                    let docs = [{ foo: "bar" }, { foo: "baz" }, {}, { foo: "quux" }];
                    return db.bulkDocs({ docs });
                }).then(() => {
                    return db.replicate.to(dbs.remote);
                }).then((res) => {
                    assert.equal(res.ok, true);
                    assert.equal(res.docs_read, 4);
                    assert.equal(res.docs_written, 3);
                    assert.equal(res.doc_write_failures, 1);
                    assert.lengthOf(res.errors, 1);

                    return remote.allDocs({ limit: 0 });
                }).then((res) => {
                    assert.equal(res.total_rows, 4); // 3 plus the validate doc
                    return db.allDocs({ limit: 0 });
                }).then((res) => {
                    assert.equal(res.total_rows, 4); // 3 plus the invalid doc
                }).then(done);
            });
        });

        it("#2268 dont stop replication if single unauth", (done) => {

            testUtils.isCouchDB((isCouchDB) => {
                if (adapters[1] !== "http" || !isCouchDB) {
                    return done();
                }

                let ddoc = {
                    _id: "_design/validate",
                    validate_doc_update: function (newDoc) {
                        if (newDoc.foo === undefined) {
                            throw { unauthorized: "Document must have a foo." };
                        }
                    }.toString()
                };

                let remote = new PouchDB(dbs.remote);
                let db = new PouchDB(dbs.name);

                return remote.put(ddoc).then(() => {
                    let docs = [{ foo: "bar" }, { foo: "baz" }, {}, { foo: "quux" }];
                    return db.bulkDocs({ docs });
                }).then(() => {
                    return db.replicate.to(dbs.remote);
                }).then((res) => {
                    assert.equal(res.ok, true);
                    assert.equal(res.docs_read, 4);
                    assert.equal(res.docs_written, 3);
                    assert.equal(res.doc_write_failures, 1);
                    assert.lengthOf(res.errors, 1);

                    return remote.allDocs({ limit: 0 });
                }).then((res) => {
                    assert.equal(res.total_rows, 4); // 3 plus the validate doc
                    return db.allDocs({ limit: 0 });
                }).then((res) => {
                    assert.equal(res.total_rows, 4); // 3 plus the invalid doc
                }).then(done);
            });
        });

        it("#2268 dont stop replication if many unauth", (done) => {
            testUtils.isCouchDB((isCouchDB) => {
                if (adapters[1] !== "http" || !isCouchDB) {
                    return done();
                }

                let ddoc = {
                    _id: "_design/validate",
                    validate_doc_update: function (newDoc) {
                        if (newDoc.foo === undefined) {
                            throw { unauthorized: "Document must have a foo." };
                        }
                    }.toString()
                };

                let remote = new PouchDB(dbs.remote);
                let db = new PouchDB(dbs.name);

                return remote.put(ddoc).then(() => {
                    let docs = [{ foo: "bar" }, { foo: "baz" }, {}, { foo: "quux" }, {}, {},
                    { foo: "toto" }, {}];
                    return db.bulkDocs({ docs });
                }).then(() => {
                    return db.replicate.to(dbs.remote);
                }).then((res) => {
                    assert.equal(res.ok, true);
                    assert.equal(res.docs_read, 8);
                    assert.equal(res.docs_written, 4);
                    assert.equal(res.doc_write_failures, 4);
                    assert.lengthOf(res.errors, 4);

                    return remote.allDocs({ limit: 0 });
                }).then((res) => {
                    assert.equal(res.total_rows, 5); // 4 plus the validate doc
                    return db.allDocs({ limit: 0 });
                }).then((res) => {
                    assert.equal(res.total_rows, 8); // 4 valid and 4 invalid
                }).then(done);
            });
        });

        // Errors from validate_doc_update should have the message
        // defined in PourchDB.Errors instead of the thrown value.
        it("#3171 Forbidden validate_doc_update error message",
            (done) => {
                testUtils.isCouchDB((isCouchDB) => {
                    if (adapters[1] !== "http" || !isCouchDB) {
                        return done();
                    }

                    let ddoc = {
                        _id: "_design/validate",
                        validate_doc_update: function (newDoc) {
                            if (newDoc.foo === "object") {
                                throw { forbidden: { foo: "is object" } };
                            } else if (newDoc.foo === "string") {
                                throw { forbidden: "Document foo is string" };
                            }
                        }.toString()
                    };

                    let remote = new PouchDB(dbs.remote);
                    let db = new PouchDB(dbs.name);

                    return remote.put(ddoc).then(() => {
                        let docs = [{ foo: "string" }, {}, { foo: "object" }];
                        return db.bulkDocs({ docs });
                    }).then(() => {
                        return db.replicate.to(dbs.remote);
                    }).then((res) => {
                        assert.equal(res.ok, true);
                        assert.equal(res.docs_read, 3);
                        assert.equal(res.docs_written, 1);
                        assert.equal(res.doc_write_failures, 2);
                        assert.lengthOf(res.errors, 2);
                        res.errors.forEach((e) => {
                            assert.equal(e.name, testUtils.errors.FORBIDDEN.name, "correct error name returned");
                        });

                        return remote.allDocs({ limit: 0 });
                    }).then((res) => {
                        assert.equal(res.total_rows, 2); // 1 plus the validate doc
                        return db.allDocs({ limit: 0 });
                    }).then((res) => {
                        assert.equal(res.total_rows, 3); // 1 valid and 2 invalid
                    }).then(done);
                });
            });

        it("Test immediate replication canceling", (done) => {
            //See  http://pouchdb.com/guides/replication.html : Cancelling replication
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let replicationHandler = remote.replicate.to(db, {
                live: true,
                retry: true
            });

            replicationHandler.on("complete", () => {
                done();
            }).on("error", done);

            replicationHandler.cancel();
        });

        it("#3171 Unauthorized validate_doc_update error message",
            (done) => {
                testUtils.isCouchDB((isCouchDB) => {
                    if (adapters[1] !== "http" || !isCouchDB) {
                        return done();
                    }

                    let ddoc = {
                        _id: "_design/validate",
                        validate_doc_update: function (newDoc) {
                            if (newDoc.foo === "object") {
                                throw { unauthorized: { foo: "is object" } };
                            } else if (newDoc.foo === "string") {
                                throw { unauthorized: "Document foo is string" };
                            }
                        }.toString()
                    };

                    let remote = new PouchDB(dbs.remote);
                    let db = new PouchDB(dbs.name);

                    return remote.put(ddoc).then(() => {
                        let docs = [{ foo: "string" }, {}, { foo: "object" }];
                        return db.bulkDocs({ docs });
                    }).then(() => {
                        return db.replicate.to(dbs.remote);
                    }).then((res) => {
                        assert.equal(res.ok, true);
                        assert.equal(res.docs_read, 3);
                        assert.equal(res.docs_written, 1);
                        assert.equal(res.doc_write_failures, 2);
                        assert.lengthOf(res.errors, 2);
                        res.errors.forEach((e) => {
                            assert.equal(e.name, testUtils.errors.UNAUTHORIZED.name, "correct error name returned");
                        });

                        return remote.allDocs({ limit: 0 });
                    }).then((res) => {
                        assert.equal(res.total_rows, 2); // 1 plus the validate doc
                        return db.allDocs({ limit: 0 });
                    }).then((res) => {
                        assert.equal(res.total_rows, 3); // 1 valid and 2 invalid
                    }).then(done);
                });
            });

        it("#3070 Doc IDs with validate_doc_update errors",
            (done) => {
                testUtils.isCouchDB((isCouchDB) => {
                    if (adapters[1] !== "http" || !isCouchDB) {
                        return done();
                    }

                    let ddoc = {
                        _id: "_design/validate",
                        validate_doc_update: function (newDoc) {
                            if (newDoc.foo) {
                                throw { unauthorized: "go away, no picture" };
                            }
                        }.toString()
                    };

                    let remote = new PouchDB(dbs.remote);
                    let db = new PouchDB(dbs.name);

                    return remote.put(ddoc).then(() => {
                        let docs = [{ foo: "string" }, {}, { foo: "object" }];
                        return db.bulkDocs({ docs });
                    }).then(() => {
                        return db.replicate.to(dbs.remote);
                    }).then((res) => {
                        let ids = [];
                        assert.equal(res.ok, true);
                        assert.equal(res.docs_read, 3);
                        assert.equal(res.docs_written, 1);
                        assert.equal(res.doc_write_failures, 2);
                        assert.lengthOf(res.errors, 2);
                        res.errors.forEach((e) => {
                            assert.exists(e.id, "get doc id with error message");
                            ids.push(e.id);
                        });
                        ids = ids.filter((id) => {
                            return ids.indexOf(id) === ids.lastIndexOf(id);
                        });
                        assert.equal(ids.length, res.errors.length, "doc ids are unique");
                        return remote.allDocs({ limit: 0 });
                    }).then((res) => {
                        assert.equal(res.total_rows, 2); // 1 plus the validate doc
                        return db.allDocs({ limit: 0 });
                    }).then((res) => {
                        assert.equal(res.total_rows, 3); // 1 valid and 2 invalid
                    }).then(done);
                });
            });

        it('#3270 triggers "denied" events', (done) => {
            testUtils.isCouchDB((isCouchDB) => {
                if (/*adapters[1] !== 'http' || */!isCouchDB) {
                    return done();
                }
                if (adapters[0] !== "local" || adapters[1] !== "http") {
                    return done();
                }

                let deniedErrors = [];
                let ddoc = {
                    _id: "_design/validate",
                    validate_doc_update: function (newDoc) {
                        if (newDoc.foo) {
                            throw { unauthorized: "go away, no picture" };
                        }
                    }.toString()
                };

                let remote = new PouchDB(dbs.remote);
                let db = new PouchDB(dbs.name);

                return remote.put(ddoc).then(() => {
                    let docs = [
                        { _id: "foo1", foo: "string" },
                        { _id: "nofoo" },
                        { _id: "foo2", foo: "object" }
                    ];
                    return db.bulkDocs({ docs });
                }).then(() => {
                    let replication = db.replicate.to(dbs.remote);
                    replication.on("denied", (error) => {
                        deniedErrors.push(error);
                    });
                    return replication;
                }).then(() => {
                    assert.equal(deniedErrors.length, 2);
                    assert.equal(deniedErrors[0].name, "unauthorized");
                    assert.equal(deniedErrors[1].name, "unauthorized");
                    done();
                }).catch(done);
            });
        });

        it("#3606 - live replication with filtered ddoc", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let Promise = testUtils.Promise;

            return remote.bulkDocs([{
                _id: "_design/myddoc",
                filters: {
                    myfilter: function (doc) {
                        return doc.name === "barbara";
                    }.toString()
                }
            },
            { _id: "a", name: "anna" },
            { _id: "b", name: "barbara" },
            { _id: "c", name: "charlie" }
            ]).then(() => {
                return new Promise((resolve, reject) => {
                    var replicate = remote.replicate.to(db, {
                        filter: "myddoc/myfilter",
                        live: true
                    }).on("change", () => {
                        replicate.cancel();
                    }).on("complete", resolve)
                        .on("error", reject);
                });
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 1);
                assert.equal(res.rows[0].id, "b");
            });
        });

        it("#3606 - live repl with filtered ddoc+query_params", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let Promise = testUtils.Promise;

            return remote.bulkDocs([{
                _id: "_design/myddoc",
                filters: {
                    myfilter: function (doc, req) {
                        return doc.name === req.query.name;
                    }.toString()
                }
            },
            { _id: "a", name: "anna" },
            { _id: "b", name: "barbara" },
            { _id: "c", name: "charlie" }
            ]).then(() => {
                return new Promise((resolve, reject) => {
                    var replicate = remote.replicate.to(db, {
                        filter: "myddoc/myfilter",
                        query_params: { name: "barbara" },
                        live: true
                    }).on("change", () => {
                        replicate.cancel();
                    }).on("complete", resolve)
                        .on("error", reject);
                });
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 1);
                assert.equal(res.rows[0].id, "b");
            });
        });

        it("#3606 - live repl with doc_ids", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let Promise = testUtils.Promise;

            return remote.bulkDocs([{
                _id: "_design/myddoc",
                filters: {
                    myfilter: function (doc, req) {
                        return doc.name === req.query.name;
                    }.toString()
                }
            },
            { _id: "a", name: "anna" },
            { _id: "b", name: "barbara" },
            { _id: "c", name: "charlie" }
            ]).then(() => {
                return new Promise((resolve, reject) => {
                    var replicate = remote.replicate.to(db, {
                        doc_ids: ["b"],
                        live: true
                    }).on("change", () => {
                        replicate.cancel();
                    }).on("complete", resolve)
                        .on("error", reject);
                });
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 1);
                assert.equal(res.rows[0].id, "b");
            });
        });

        it("#3606 - live repl with view", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let Promise = testUtils.Promise;

            return remote.bulkDocs([{
                _id: "_design/myddoc",
                views: {
                    mymap: {
                        map: function (doc) {
                            if (doc.name === "barbara") {
                                emit(doc._id, null);
                            }
                        }.toString()
                    }
                }
            },
            { _id: "a", name: "anna" },
            { _id: "b", name: "barbara" },
            { _id: "c", name: "charlie" }
            ]).then(() => {
                return new Promise((resolve, reject) => {
                    var replicate = remote.replicate.to(db, {
                        filter: "_view",
                        view: "myddoc/mymap",
                        live: true
                    }).on("change", () => {
                        replicate.cancel();
                    }).on("complete", resolve)
                        .on("error", reject);
                });
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 1);
                assert.equal(res.rows[0].id, "b");
            });
        });

        it("#3569 - 409 during replication", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let Promise = testUtils.Promise;

            // we know we're easily going to go over that limit
            // because of all the parallel replications we're doing
            db.setMaxListeners(100);

            function timeoutPromise(delay, fun) {
                return new Promise((resolve) => {
                    setTimeout(resolve, delay);
                }).then(fun);
            }

            return Promise.all([
                db.put({ _id: "foo" }).then(() => {
                    return db.get("foo");
                }).then((doc) => {
                    return db.remove(doc);
                }).then(() => {
                    return db.replicate.to(remote);
                }),
                db.replicate.to(remote),
                timeoutPromise(0, () => {
                    return db.replicate.to(remote);
                }),
                timeoutPromise(1, () => {
                    return db.replicate.to(remote);
                }),
                timeoutPromise(2, () => {
                    return db.replicate.to(remote);
                })
            ]).then(() => {
                return db.info();
            }).then((localInfo) => {
                return remote.info().then((remoteInfo) => {
                    assert.equal(localInfo.doc_count, remoteInfo.doc_count);
                });
            });
        });

        it('#3270 triggers "change" events with .docs property', (done) => {
            let replicatedDocs = [];
            let db = new PouchDB(dbs.name);
            db.bulkDocs({ docs }, {}).then(() => {
                let replication = db.replicate.to(dbs.remote);
                replication.on("change", (change) => {
                    replicatedDocs = replicatedDocs.concat(change.docs);
                });
                return replication;
            })
                .then(() => {
                    replicatedDocs.sort((a, b) => {
                        return a._id > b._id ? 1 : -1;
                    });
                    assert.equal(replicatedDocs.length, 3);
                    assert.equal(replicatedDocs[0]._id, "0");
                    assert.equal(replicatedDocs[1]._id, "1");
                    assert.equal(replicatedDocs[2]._id, "2");
                    done();
                })
                .catch(done);
        });

        it("#3543 replication with a ddoc filter", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            return remote.bulkDocs([{
                _id: "_design/myddoc",
                filters: {
                    myfilter: function (doc) {
                        return doc._id === "a";
                    }.toString()
                }
            },
            { _id: "a" },
            { _id: "b" },
            { _id: "c" }
            ]).then(() => {
                return remote.replicate.to(db, { filter: "myddoc/myfilter" });
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 1);
                assert.equal(res.rows[0].id, "a");
            });
        });

        it("#3578 replication with a ddoc filter w/ _deleted=true", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            return remote.bulkDocs([{
                _id: "_design/myddoc",
                filters: {
                    myfilter: function (doc) {
                        return doc._id === "a" || doc._id === "b";
                    }.toString()
                }
            },
            { _id: "a" },
            { _id: "b" },
            { _id: "c" }
            ]).then(() => {
                return remote.replicate.to(db, { filter: "myddoc/myfilter" });
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 2);
            }).then(() => {
                return remote.get("a");
            }).then((doc) => {
                doc._deleted = true;
                return remote.put(doc);
            }).then(() => {
                return remote.replicate.to(db, { filter: "myddoc/myfilter" });
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 1);
            });
        });

        it("#3578 replication with a ddoc filter w/ remove()", () => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            return remote.bulkDocs([{
                _id: "_design/myddoc",
                filters: {
                    myfilter: function (doc) {
                        return doc._id === "a" || doc._id === "b";
                    }.toString()
                }
            },
            { _id: "a" },
            { _id: "b" },
            { _id: "c" }
            ]).then(() => {
                return remote.replicate.to(db, { filter: "myddoc/myfilter" });
            }).then(() => {
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 2);
            }).then(() => {
                return remote.get("a");
            }).then((doc) => {
                return remote.remove(doc);
            }).then(() => {
                return remote.replicate.to(db, { filter: "myddoc/myfilter" });
            }).then(() => {
                return db.allDocs();
            }).then((docs) => {
                assert.lengthOf(docs.rows, 1);
            });
        });

        it("#2454 info() call breaks taskqueue", (done) => {
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            remote.bulkDocs(docs).then(() => {

                let repl = db.replicate.from(remote, { live: true });
                repl.on("complete", done.bind(null, null));

                remote.info().then(() => {
                    repl.cancel();
                }).catch(done);
            }).catch(done);
        });


        it("4094 cant fetch server uuid", (done) => {

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let ajax = remote._ajax;

            remote._ajax = function (opts, cb) {
                let uri = testUtils.parseUri(opts.url);
                if (uri.path === "/") {
                    cb(new Error("flunking you"));
                } else {
                    ajax.apply(this, arguments);
                }
            };

            let _complete = 0;
            function complete() {
                if (++_complete === 2) {
                    remote._ajax = ajax;
                    done();
                }
            }

            let rep = db.replicate.from(remote, { live: true, retry: true })
                .on("complete", complete);

            var changes = db.changes({ live: true }).on("change", () => {
                rep.cancel();
                changes.cancel();
            }).on("complete", complete);

            remote.post({ a: "doc" });
        });

        it("#4293 Triggers extra replication events", (done) => {

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let hasChange = false;
            function change() {
                hasChange = true;
            }

            let _complete = 0;
            function complete() {
                if (++_complete === 2) {
                    assert.equal(hasChange, false);
                    done();
                }
            }

            function paused() {
                // Because every setTimeout should be justified :)
                // We are testing a negative, that there are no extra events
                // triggered from our replication, cancelling the replication will
                // cancel the event anyway so we wait a short period and give it time
                // to fire (since there is nothing to wait deteministically for)
                // Without the setTimeout this will pass, just less likely to catch
                // the failing case
                setTimeout(() => {
                    push.cancel();
                    pull.cancel();
                }, 100);
            }

            var push = remote.replicate.from(db, { live: true })
                .on("paused", paused)
                .on("complete", complete);

            var pull = db.replicate.from(remote, { live: true })
                .on("change", change)
                .on("complete", complete);

            db.post({ a: "doc" });
        });

        it("Heartbeat gets passed", () => {

            if (!(/http/.test(dbs.remote) && !/http/.test(dbs.name))) {
                return true;
            }

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let seenHeartBeat = false;
            let ajax = remote._ajax;
            remote._ajax = function (opts) {
                if (/heartbeat/.test(opts.url)) {
                    seenHeartBeat = true;
                }
                ajax.apply(this, arguments);
            };

            return remote.bulkDocs([{ foo: "bar" }]).then(() => {
                return db.replicate.from(remote, { heartbeat: 10 });
            }).then(() => {
                assert.equal(seenHeartBeat, true);
                remote._ajax = ajax;
            });
        });

        it("Timeout gets passed", () => {

            if (!(/http/.test(dbs.remote) && !/http/.test(dbs.name))) {
                return true;
            }

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let seenTimeout = false;
            let ajax = remote._ajax;
            remote._ajax = function (opts) {
                // the http adapter takes 5s off the provided timeout
                if (/timeout=20000/.test(opts.url)) {
                    seenTimeout = true;
                }
                ajax.apply(this, arguments);
            };

            return remote.bulkDocs([{ foo: "bar" }]).then(() => {
                return db.replicate.from(remote, { timeout: 20000 });
            }).then(() => {
                assert.equal(seenTimeout, true);
                remote._ajax = ajax;
            });
        });

        it("#5452 Cleanly fail with no unhandled promises on a bad connection", (done) => {

            if (!/http/.test(dbs.remote)) {
                return done();
            }

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB("http://localhost:9382/does_not_exist", { skip_setup: true });

            remote.replicate.to(db, {
                live: true,
                since: 0,
                timeout: 20000
            }).catch(() => {
                done();
            });
        });

        it("#2426 doc_ids dont prevent replication", () => {

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            let writes = [];
            for (let i = 0; i < 20; i++) {
                writes.push(remote.put({ _id: `${i}` }));
            }

            return testUtils.Promise.all(writes).then(() => {
                return db.sync(remote, { batch_size: 10, doc_ids: ["11", "12", "13"] });
            }).then(() => {
                return db.allDocs();
            }).then((allDocs) => {
                assert.equal(allDocs.total_rows, 3);
            });
        });

        it("Replication filter using selector", (done) => {
            // only supported in CouchDB 2.x and later
            if (!testUtils.isCouchMaster()) {
                done();
                return;
            }
            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let docs1 = [
                { _id: "0", user: "foo" },
                { _id: "1", user: "bar" },
                { _id: "2", user: "foo" },
                { _id: "3", user: "bar" }
            ];
            remote.bulkDocs({ docs: docs1 }, () => {
                db.replicate.from(remote, {
                    selector: { "user": "foo" }
                }).on("error", done).on("complete", () => {
                    db.allDocs((err, docs) => {
                        if (err) {
                            done(err);
                        }
                        assert.equal(docs.rows.length, 2);
                        db.info((err, info) => {
                            verifyInfo(info, {
                                doc_count: 2
                            });
                            done();
                        });
                    });
                });
            });
        });

        it("Invalid selector", () => {
            // only supported in CouchDB 2.x and later or PouchDB
            if (!testUtils.isCouchMaster()) {
                return;
            }

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);
            let thedocs = [
                { _id: "3", integer: 3, string: "3" },
                { _id: "4", integer: 4, string: "4" },
                { _id: "5", integer: 5, string: "5" }
            ];
            return remote.bulkDocs({ docs: thedocs }).then(() => {
                return db.replicate.from(remote, { selector: "foo" });
            }).catch((err) => {
                assert.equal(err.name, "bad_request");
                assert.contain(err.reason, "expected a JSON object");
            });
        });

    });
});

// This test only needs to run for one configuration, and it slows stuff
// down
downAdapters.map(() => {

    describe("suite2 test.replication.js-down-test", () => {

        let dbs = {};

        beforeEach(function (done) {
            this.timeout(30000);
            dbs.name = testUtils.adapterUrl(adapters[0], "testdb");
            testUtils.cleanup([dbs.name], done);
        });

        afterEach((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it("replicate from down server test", (done) => {
            let source = new PouchDB("http://infiniterequest.com", {
                ajax: { timeout: 10 }
            });
            let target = new PouchDB(dbs.name);
            source.replicate.to(target, (err) => {
                assert.exists(err);
                done();
            });
        });

    });
});
