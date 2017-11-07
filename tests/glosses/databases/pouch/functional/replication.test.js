import * as util from "./utils";

const { is } = adone;

describe("database", "pouch", "suite2 replication", () => {
    const dbName = "testdb";
    const dbRemote = "test_repl_remote";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName, dbRemote);
    });

    after(async () => {
        await util.destroy();
    });

    const docs = [
        { _id: "0", integer: 0, string: "0" },
        { _id: "1", integer: 1, string: "1" },
        { _id: "2", integer: 2, string: "2" }
    ];

    // simplify for easier deep equality checks
    const simplifyChanges = (res) => {
        const changes = res.results.map((change) => {
            return {
                id: change.id,
                deleted: change.deleted,
                changes: change.changes.map((x) => {
                    return x.rev;
                }).sort(),
                doc: change.doc
            };
        });
        return changes;
    };

    const verifyInfo = (info, expected) => {
        if (is.undefined(info.doc_count)) {
            // info is from Sync Gateway, which allocates an extra seqnum
            // for user access control purposes.
            assert.isTrue(info.update_seq >= expected.update_seq && info.update_seq <= expected.update_seq + 1, "update_seq");
        } else {
            assert.equal(info.update_seq, expected.update_seq, "update_seq");
        }
        if (info.doc_count) { // info is NOT from Sync Gateway
            assert.equal(info.doc_count, expected.doc_count, "doc_count");
        }
    };

    it("Test basic pull replication", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        remote.bulkDocs({ docs }, {}).then(() => {
            db.replicate.from(dbRemote).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, docs.length);
                db.info().then((info) => {
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
        const remote = new DB(dbRemote);
        remote.bulkDocs({ docs }, {}).then(() => {
            DB.replicate(dbRemote, dbName, {}).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, docs.length);
                new DB(dbName).info().then((info) => {
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
        const remote = new DB(dbRemote);
        remote.bulkDocs({ docs }, {}).then(() => {
            DB.replicate(dbRemote, dbName).on("complete", (result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, docs.length);
                new DB(dbName).info().then((info) => {
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
        const remote = new DB(dbRemote);

        const numDocs = 201;
        const docs = [];
        for (let i = 0; i < numDocs; i++) {
            docs.push({ _id: i.toString() });
        }

        remote.bulkDocs({ docs }, {}).then(() => {
            DB.replicate(
                dbRemote, dbName).on("complete", (result) => {
                    assert.equal(result.ok, true);
                    assert.equal(result.docs_written, docs.length);
                    new DB(dbName).info().then((info) => {
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
        const docs = [
            { _id: "4/5", integer: 0, string: "0" },
            { _id: "3&2", integer: 1, string: "1" },
            { _id: "1>0", integer: 2, string: "2" }
        ];
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        remote.bulkDocs({ docs }).then(() => {
            db.replicate.from(dbRemote).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, docs.length);
                db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        // simulate 5000 normal commits with two conflicts at the very end
        const uuid = () => util.rev();

        const numRevs = 5000;

        const uuids = [];
        for (let i = 0; i < numRevs - 1; i++) {
            uuids.push(uuid());
        }
        const conflict1 = `a${uuid()}`;
        const conflict2 = `b${uuid()}`;

        const doc1 = {
            _id: "doc",
            _rev: `${numRevs}-${conflict1}`,
            _revisions: {
                start: numRevs,
                ids: [conflict1].concat(uuids)
            }
        };
        const doc2 = {
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
            assert.equal(info.doc_count, 1, "doc_count");
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
            assert.equal(info.doc_count, 1, "doc_count");
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        let rev;

        const checkNumRevisions = (num) => {
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
        };

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
            rev = res.rows[0].value.rev;
            return db.put({ _id: "foo", _rev: rev });

        }).then(() => {
            return db.replicate.to(remote);
        }).then(() => {
            return checkNumRevisions(3);
        });
    });

    it("Test pull replication with many conflicts", (done) => {
        const remote = new DB(dbRemote);

        const numRevs = 200; // repro "url too long" error with open_revs
        const docs = [];
        for (let i = 0; i < numRevs; i++) {
            const rev = `1-${util.rev()}`;
            docs.push({ _id: "doc", _rev: rev });
        }

        remote.bulkDocs({ docs }, { new_edits: false }).then(() => {
            DB.replicate(
                dbRemote, dbName).on("complete", (result) => {
                    assert.equal(result.ok, true);
                    assert.equal(result.docs_written, docs.length);
                    const db = new DB(dbName);
                    db.info().then((info) => {
                        assert.equal(info.doc_count, 1, "doc_count");
                        db.get("doc", { open_revs: "all" }).then((docs) => {
                            const okDocs = docs.filter((doc) => {
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
        const remote = new DB(dbRemote);

        const docs = [{ _id: "doc", _rev: "1-a" }, { _id: "doc", _rev: "1-b" }];
        remote.bulkDocs({ docs }, { new_edits: false }).then(() => {
            DB.replicate(dbRemote, dbName).on("complete", (result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, 2);
                assert.equal(result.docs_read, 2);
                const docs = [{ _id: "doc", _rev: "1-c" }, { _id: "doc", _rev: "1-d" }];
                remote.bulkDocs({ docs }, { new_edits: false }).then(() => {
                    DB.replicate(dbRemote, dbName).on("complete", (result) => {
                        assert.equal(result.docs_written, 2);
                        assert.equal(result.docs_read, 2);
                        const db = new DB(dbName);
                        db.info().then((info) => {
                            assert.equal(info.doc_count, 1, "doc_count");
                            db.get("doc", { open_revs: "all" }).then((docs) => {
                                const okDocs = docs.filter((doc) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        remote.bulkDocs({ docs }, {}).then(() => {
            db.bulkDocs({ docs }, {}).then(() => {
                db.replicate.from(dbRemote).then(() => {
                    db.allDocs().then((result) => {
                        assert.equal(result.rows.length, docs.length);
                        db.info().then((info) => {
                            assert.isAbove(info.update_seq, 2, "update_seq local");
                            assert.equal(info.doc_count, 3, "doc_count local");
                            remote.info().then((info) => {
                                assert.isAbove(info.update_seq, 2, "update_seq remote");
                                assert.equal(info.doc_count, 3, "doc_count remote");
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it("Test basic push replication", (done) => {
        const db = new DB(dbName);
        db.bulkDocs({ docs }, {}, () => {
            db.replicate.to(dbRemote).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, docs.length);
                db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        db.bulkDocs({ docs }, {}).then(() => {
            db.replicate.to(dbRemote).then(() => {
                remote.allDocs().then((result) => {
                    assert.equal(result.rows.length, docs.length);
                    db.info().then((info) => {
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
        const db = new DB(dbName);
        const doc1 = { _id: "adoc", foo: "bar" };
        db.put(doc1).then(() => {
            db.replicate.to(dbRemote).then((result) => {
                assert.equal(result.docs_read, 1);
                db.replicate.to(dbRemote).then((result) => {
                    assert.equal(result.docs_read, 0);
                    db.replicate.to(dbRemote).then((result) => {
                        assert.equal(result.docs_read, 0);
                        db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        remote.bulkDocs({ docs }, {}).then(() => {
            db.replicate.from(dbRemote).then((result) => {
                assert.equal(result.ok, true);
                assert.equal(result.docs_written, docs.length);
                db.replicate.from(dbRemote).then((result) => {
                    assert.equal(result.ok, true);
                    assert.equal(result.docs_written, 0);
                    assert.equal(result.docs_read, 0);
                    db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        remote.bulkDocs({ docs }).then(() => {
            let changeCount = docs.length;
            const changes = db.changes({
                live: true
            }).on("change", () => {
                if (--changeCount) {
                    return;
                }
                replication.cancel();
                changes.cancel();
            }).on("complete", () => {
                db.replicate.from(dbRemote).on("complete", (details) => {
                    assert.equal(details.docs_read, 0);
                    db.info().then((info) => {
                        verifyInfo(info, {
                            update_seq: 3,
                            doc_count: 3
                        });
                        done();
                    });
                });
            }).on("error", done);
            const replication = db.replicate.from(remote, { live: true });
        });
    });

    it("Test live push checkpoint", (done) => {

        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const complete = (details) => {

            assert.equal(details.docs_read, 0);
            db.info((err, info) => {
                verifyInfo(info, {
                    update_seq: 3,
                    doc_count: 3
                });
                done();
            });
        };

        let finished = 0;
        const isFinished = () => {
            if (++finished !== 2) {
                return;
            }
            db.replicate.to(dbRemote)
                .on("error", done)
                .on("complete", complete);
        };

        db.bulkDocs({ docs }).then(() => {

            let changeCount = docs.length;
            const onChange = () => {
                if (--changeCount) {
                    return;
                }
                replication.cancel();
                changes.cancel();
            };

            const changes = remote.changes({ live: true })
                .on("error", done)
                .on("change", onChange)
                .on("complete", isFinished);

            const replication = db.replicate.to(remote, { live: true })
                .on("error", done)
                .on("complete", isFinished);

        }).catch(done);
    });

    it("Test checkpoint 2", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const doc = { _id: "3", count: 0 };
        remote.put(doc, {}).then((results) => {
            db.replicate.from(dbRemote).then((result) => {
                assert.equal(result.ok, true);
                doc._rev = results.rev;
                doc.count++;
                remote.put(doc, {}).then((results) => {
                    doc._rev = results.rev;
                    doc.count++;
                    remote.put(doc, {}).then(() => {
                        db.replicate.from(dbRemote).then((result) => {
                            assert.equal(result.ok, true);
                            assert.equal(result.docs_written, 1);
                            db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const doc = { _id: "3", count: 0 };
        db.put(doc, {}).then((results) => {
            DB.replicate(db, remote, {}).then((result) => {
                assert.equal(result.ok, true);
                doc._rev = results.rev;
                doc.count++;
                db.put(doc, {}).then((results) => {
                    doc._rev = results.rev;
                    doc.count++;
                    db.put(doc, {}, () => {
                        DB.replicate(db, remote, {}).then((result) => {
                            assert.equal(result.ok, true);
                            assert.equal(result.docs_written, 1);
                            db.info().then((info) => {
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

    it("Test disable checkpoints on both source and target", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const ensureCheckpointIsMissing = (db, replicationId) => {
            return db.get(replicationId).then(() => {
                throw new Error(`Found a checkpoint that should not exist for db ${db.name}`);
            }).catch((error) => {
                if (error.status === 404) {

                } else {
                    throw error;
                }
            });
        };

        db.bulkDocs({ docs }).then(() => {
            DB.replicate(db, remote, { checkpoint: false })
                .on("error", done)
                .on("complete", () => {
                    util.generateReplicationId(db, remote, {}).then((replicationId) => {
                        ensureCheckpointIsMissing(db, replicationId).then(() => {
                            return ensureCheckpointIsMissing(remote, replicationId);
                        }).then(done).catch(done);
                    }).catch(done);
                });
        }).catch(done);
    });

    it("Test write checkpoints on source only", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        db.bulkDocs({ docs }).then(() => {
            DB.replicate(db, remote, { checkpoint: "source" })
                .on("error", done)
                .on("complete", () => {
                    util.generateReplicationId(db, remote, {}).then((replicationId) => {
                        db.get(replicationId).then(() => {
                            remote.get(replicationId).then(() => {
                                done(new Error("Found a checkpoint on target that should not exist"));
                            }).catch((error) => {
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

    it("Test write checkpoints on target only", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        db.bulkDocs({ docs }).then(() => {
            DB.replicate(db, remote, { checkpoint: "target" })
                .on("error", done)
                .on("complete", () => {
                    util.generateReplicationId(db, remote, {}).then((replicationId) => {
                        remote.get(replicationId).then(() => {
                            db.get(replicationId).then(() => {
                                done(new Error("Found a checkpoint on source that should not exist"));
                            }).catch((error) => {
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

    const interceptChanges = (source, interceptFunction) => {
        const changes = source.changes;
        source.changes = function (opts) {
            interceptFunction(opts);
            return changes.apply(source, arguments);
        };
    };

    const assertSince = (opts, expectedSince) => {
        if (expectedSince !== false) {
            if (is.number(opts.since)) {
                assert.equal(opts.since, expectedSince);
            } else if (is.string(opts.since)) {
                assert.match(opts.since, new RegExp(`^${expectedSince}-`));
            } else {
                throw new Error(`Can't handle type for opts.since: ${typeof opts.since} (value=${opts.since})`);
            }
        }
    };

    it("Test replication resumes when checkpointing is enabled", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        let expectedSince = false;
        interceptChanges(db, (opts) => {
            assertSince(opts, expectedSince);
            expectedSince = false;
        });

        db.bulkDocs({ docs: docs.slice(0, 1) }).then(() => {
            DB.replicate(db, remote)
                .on("error", done)
                .on("complete", (result) => {
                    assert.equal(result.docs_read, 1);
                    assert.equal(result.docs_written, 1);
                    db.bulkDocs({ docs: docs.slice(1, 2) })
                        .then(() => {
                            expectedSince = 1;
                            DB.replicate(db, remote)
                                .on("error", done)
                                .on("complete", (result) => {
                                    assert.equal(result.docs_read, 1);
                                    assert.equal(result.docs_written, 1);
                                    done();
                                });
                        });
                });
        }).catch(done);
    });

    it("Test replication resumes when checkpointing is disabled", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const replicateOpts = { checkpoint: false };

        let expectedSince = false;
        interceptChanges(db, (opts) => {
            assertSince(opts, expectedSince);
            expectedSince = false;
        });

        db.bulkDocs({ docs: docs.slice(0, 1) }).then(() => {
            DB.replicate(db, remote, replicateOpts)
                .on("error", done)
                .on("complete", (result) => {
                    assert.equal(result.docs_read, 1);
                    assert.equal(result.docs_written, 1);

                    db.bulkDocs({ docs: docs.slice(1, 2) })
                        .then(() => {
                            expectedSince = 0;
                            DB.replicate(db, remote, replicateOpts)
                                .on("error", done)
                                .on("complete", (result) => {
                                    assert.equal(result.docs_read, 1);
                                    assert.equal(result.docs_written, 1);
                                    done();
                                });
                        });
                });
        }).catch(done);
    });

    it("Test replication resumes when checkpointing on source only", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const replicateOpts = { checkpoint: "source" };

        let expectedSince = false;
        interceptChanges(db, (opts) => {
            assertSince(opts, expectedSince);
            expectedSince = false;
        });

        db.bulkDocs({ docs: docs.slice(0, 1) }).then(() => {
            DB.replicate(db, remote, replicateOpts)
                .on("error", done)
                .on("complete", (result) => {
                    assert.equal(result.docs_read, 1);
                    assert.equal(result.docs_written, 1);

                    db.bulkDocs({ docs: docs.slice(1, 2) })
                        .then(() => {
                            expectedSince = 1;
                            DB.replicate(db, remote, replicateOpts)
                                .on("error", done)
                                .on("complete", (result) => {
                                    assert.equal(result.docs_read, 1);
                                    assert.equal(result.docs_written, 1);
                                    done();
                                });
                        });
                });
        }).catch(done);
    });

    it("Test replication resumes when checkpointing on target only", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const replicateOpts = { checkpoint: "target" };

        let expectedSince = false;
        interceptChanges(db, (opts) => {
            assertSince(opts, expectedSince);
            expectedSince = false;
        });

        db.bulkDocs({ docs: docs.slice(0, 1) }).then(() => {
            DB.replicate(db, remote, replicateOpts)
                .on("error", done)
                .on("complete", (result) => {
                    assert.equal(result.docs_read, 1);
                    assert.equal(result.docs_written, 1);

                    db.bulkDocs({ docs: docs.slice(1, 2) })
                        .then(() => {
                            expectedSince = 1;
                            DB.replicate(db, remote, replicateOpts)
                                .on("error", done)
                                .on("complete", (result) => {
                                    assert.equal(result.docs_read, 1);
                                    assert.equal(result.docs_written, 1);
                                    done();
                                });
                        });
                });
        }).catch(done);
    });

    it("#3136 open revs returned correctly 1", () => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const doc = { _id: "foo" };
        let chain = Promise.resolve().then(() => {
            return db.put(doc);
        });

        const addConflict = (i) => {
            chain = chain.then(() => {
                return db.bulkDocs({
                    docs: [{
                        _id: "foo",
                        _rev: `2-${i}`
                    }],
                    new_edits: false
                });
            });
        };

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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const doc = { _id: "foo" };
        let chain = Promise.resolve().then(() => {
            return db.put(doc);
        });

        const addConflict = (i) => {
            chain = chain.then(() => {
                return db.bulkDocs({
                    docs: [{
                        _id: "foo",
                        _rev: `2-${i}`,
                        _deleted: (i % 3 === 1)
                    }],
                    new_edits: false
                });
            });
        };

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
        const db1 = new DB(dbName);
        const db2 = new DB(dbRemote);
        const tree = [
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

        let chain = Promise.resolve();
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
        const db1 = new DB(dbName);
        const db2 = new DB(dbRemote);
        const tree = [
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

        let chain = Promise.resolve();
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
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const docs2 = [
            { _id: "2", integer: 11 },
            { _id: "3", integer: 12 }
        ];
        let rev2;
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        return db.bulkDocs({ docs: docs1 }).then((info) => {
            docs2[0]._rev = info[2].rev;
            docs2[1]._rev = info[3].rev;
            return db.put(docs2[0]);
        }).then(() => {
            return db.put(docs2[1]);
        }).then((info) => {
            rev2 = info.rev;
            return DB.replicate(db, remote);
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
            const rev3Doc = {
                _id: "3",
                _rev: resp.rev,
                integer: 30
            };
            return db.put(rev3Doc);
        }).then(() => {
            const rev4Doc = {
                _id: "3",
                _rev: rev2,
                integer: 100
            };
            return remote.put(rev4Doc).then(() => {
                return DB.replicate(remote, db).then(() => {
                    return DB.replicate(db, remote);
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
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const docs2 = [
            { _id: "2", integer: 11 },
            { _id: "3", integer: 12 }
        ];
        let rev2;
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        return db.bulkDocs({ docs: docs1 }).then((info) => {
            docs2[0]._rev = info[2].rev;
            docs2[1]._rev = info[3].rev;
            return db.put(docs2[0]);
        }).then(() => {
            return db.put(docs2[1]);
        }).then((info) => {
            rev2 = info.rev;
            return DB.replicate(db, remote);
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
            const rev3Doc = {
                _id: "3",
                _rev: resp.rev,
                integer: 30
            };
            return db.put(rev3Doc);
        }).then(() => {
            const rev4Doc = {
                _id: "3",
                _rev: rev2,
                integer: 100
            };
            return remote.put(rev4Doc).then(() => {
                return DB.replicate(remote, db).then(() => {
                    return DB.replicate(db, remote);
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const put = function (doc) {
            return db.bulkDocs({ docs: [doc] }).then((resp) => {
                return resp[0];
            });
        };
        const err = {
            message: "_writer access is required for this request",
            name: "unauthorized",
            status: 401
        };
        db.put = function () {
            if (is.function(arguments[arguments.length - 1])) {
                arguments[arguments.length - 1](err);
            } else {
                return Promise.reject(err);
            }
        };
        const doc = { _id: "3", count: 0 };
        put(doc).then((results) => {
            return DB.replicate(db, remote).then((result) => {
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
            return DB.replicate(db, remote);
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

    it("Testing allDocs with some conflicts (issue #468)", async () => {
        const db1 = new DB(dbName);
        const db2 = new DB(dbRemote);
        // we indeed needed replication to create failing test here!
        let doc = { _id: "foo", _rev: "1-a", value: "generic" };
        await db1.put(doc, { new_edits: false });
        await db2.put(doc, { new_edits: false });
        await util.putAfter(db2, {
            _id: "foo",
            _rev: "2-b",
            value: "db2"
        }, "1-a");
        await util.putAfter(db1, {
            _id: "foo",
            _rev: "2-c",
            value: "whatever"
        }, "1-a");
        await util.putAfter(db1, {
            _id: "foo",
            _rev: "3-c",
            value: "db1"
        }, "2-c");
        doc = await db1.get("foo");
        assert.equal(doc.value, "db1");
        doc = await db2.get("foo");
        assert.equal(doc.value, "db2");
        await DB.replicate(db1, db2);
        await DB.replicate(db2, db1);
        doc = await db1.get("foo");
        assert.equal(doc.value, "db1");
        doc = await db2.get("foo");
        assert.equal(doc.value, "db1");
        let res = await db1.allDocs({ include_docs: true });
        assert.isAbove(res.rows.length, 0, "first");
        // redundant but we want to test it
        assert.equal(res.rows[0].doc.value, "db1");
        res = await db2.allDocs({ include_docs: true });
        assert.isAbove(res.rows.length, 0, "second");
        assert.equal(res.rows[0].doc.value, "db1");
        const info = await db1.info();
        // if auto_compaction is enabled, will
        // be 5 because 2-c goes "missing" and
        // the other db tries to re-put it
        assert.isTrue(info.update_seq >= 4 && info.update_seq <= 5);
        assert.equal(info.doc_count, 1);
        const info2 = await db2.info();
        verifyInfo(info2, {
            update_seq: 3,
            doc_count: 1
        });
    });

    // CouchDB will not generate a conflict here, it uses a deteministic
    // method to generate the revision number, however we cannot copy its
    // method as it depends on erlangs internal data representation
    it("Test basic conflict", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const doc1 = { _id: "adoc", foo: "bar" };
        const doc2 = { _id: "adoc", bar: "baz" };
        db.put(doc1).then(() => {
            remote.put(doc2).then(() => {
                db.replicate.to(dbRemote).then(() => {
                    remote.get("adoc", { conflicts: true }).then((result) => {
                        assert.property(result, "_conflicts");
                        db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        // Test invalid if adapter doesnt support mapreduce
        if (!remote.query) {
            return done();
        }

        const doc1 = { _id: "adoc", foo: "bar" };
        const doc2 = { _id: "adoc", bar: "baz" };
        const ddoc = {
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
        remote.put(ddoc).then(() => {
            db.put(doc1).then(() => {
                remote.put(doc2).then(() => {
                    db.replicate.to(dbRemote).then(() => {
                        remote.query("conflicts/conflicts", {
                            reduce: false,
                            conflicts: true
                        }).then((res) => {
                            assert.equal(res.rows.length, 1);
                            db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const doc1 = { _id: "adoc", foo: "bar" };
        remote.bulkDocs({ docs }, {}).then(() => {
            let count = 0;
            let finished = 0;
            const isFinished = function () {
                if (++finished !== 2) {
                    return;
                }
                db.info().then((info) => {
                    verifyInfo(info, {
                        update_seq: 4,
                        doc_count: 4
                    });
                    done();
                });
            };
            const rep = db.replicate.from(dbRemote, {
                live: true
            }).on("complete", isFinished);
            const changes = db.changes({
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const doc1 = { _id: "adoc", foo: "bar" };
        db.bulkDocs({ docs }, {}).then(() => {
            let count = 0;
            let finished = 0;
            const isFinished = function () {
                if (++finished !== 2) {
                    return;
                }
                db.info().then((info) => {
                    verifyInfo(info, {
                        update_seq: 4,
                        doc_count: 4
                    });
                    done();
                });
            };
            const rep = remote.replicate.from(db, {
                live: true
            }).on("complete", isFinished);
            const changes = remote.changes({
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
        const remote = new DB(dbRemote);
        const db = new DB(dbName);
        const docs = [
            { _id: "0", integer: 0, string: "0" },
            { _id: "1", integer: 1, string: "1" },
            { _id: "2", integer: 2, string: "2" }
        ];
        const doc1 = { _id: "adoc", foo: "bar" };
        const doc2 = { _id: "anotherdoc", foo: "baz" };
        remote.bulkDocs({ docs }, {}).then(() => {
            let count = 0;
            const replicate = db.replicate.from(remote, {
                live: true
            }).on("complete", () => {
                remote.put(doc2);
                setTimeout(() => {
                    changes.cancel();
                }, 100);
            });
            const changes = db.changes({
                live: true
            }).on("complete", () => {
                assert.equal(count, 4);
                db.info().then((info) => {
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

    it("Replication filter", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        remote.bulkDocs({ docs: docs1 }).then(() => {
            db.replicate.from(remote, {
                filter(doc) {
                    return doc.integer % 2 === 0;
                }
            }).on("error", done).on("complete", () => {
                db.allDocs().then((docs) => {
                    assert.equal(docs.rows.length, 2);
                    db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const more_docs = [
            { _id: "3", integer: 3, string: "3" },
            { _id: "4", integer: 4, string: "4" }
        ];
        remote.bulkDocs({ docs }).then(() => {
            db.replicate.from(remote, {
                filter(doc) {
                    return doc.integer % 2 === 0;
                }
            }).then(() => {
                remote.bulkDocs({ docs: more_docs }).then(() => {
                    db.replicate.from(remote, {}).then((response) => {
                        assert.equal(response.docs_written, 3);
                        db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const thedocs = [
            { _id: "3", integer: 3, string: "3" },
            { _id: "4", integer: 4, string: "4" },
            { _id: "5", integer: 5, string: "5" }
        ];
        remote.bulkDocs({ docs: thedocs }).then(() => {
            db.replicate.from(remote, {
                doc_ids: ["3", "4"]
            }).then((response) => {
                assert.equal(response.docs_written, 2);
                db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const thedocs = [
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const docs1 = [
            { _id: "1", integer: 1, string: "1" },
            { _id: "2", integer: 2, string: "2" },
            { _id: "3", integer: 3, string: "3" }
        ];
        remote.bulkDocs({ docs: docs1 }).then(() => {
            remote.info().then((info) => {
                const update_seq = info.update_seq;
                const docs2 = [
                    { _id: "4", integer: 4, string: "4" },
                    { _id: "5", integer: 5, string: "5" }
                ];
                remote.bulkDocs({ docs: docs2 }).then(() => {
                    db.replicate.from(remote, {
                        since: update_seq
                    }).on("complete", (result) => {
                        assert.equal(result.docs_written, 2);
                        db.replicate.from(remote, {
                            since: 0
                        }).on("complete", (result) => {
                            assert.equal(result.docs_written, 3);
                            db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const more_docs = [
            { _id: "3", integer: 3, string: "3" },
            { _id: "4", integer: 4, string: "4" }
        ];
        remote.bulkDocs({ docs }).then(() => {
            db.replicate.from(remote, {
                filter(doc) {
                    return doc.integer % 2 === 0;
                }
            }).then(() => {
                remote.bulkDocs({ docs: more_docs }).then(() => {
                    db.replicate.from(remote, {
                        filter(doc) {
                            return doc.integer % 2 === 0;
                        }
                    }).then((response) => {
                        assert.equal(response.docs_written, 1);
                        db.info().then((info) => {
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

    it("Replication with filter that leads to some empty batches (#2689)", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 1 },
            { _id: "3", integer: 1 },
            { _id: "4", integer: 2 },
            { _id: "5", integer: 2 }
        ];
        remote.bulkDocs({ docs: docs1 }).then(() => {
            db.replicate.from(remote, {
                batch_size: 2,
                filter(doc) {
                    return doc.integer % 2 === 0;
                }
            }).on("complete", () => {
                db.allDocs().then((docs) => {
                    assert.equal(docs.rows.length, 3);
                    db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const changes = remote.changes;
        remote.changes = function (params) {
            changesSince.push(params.since);
            return changes.apply(this, arguments);
        };
        const changesSince = [];
        const replicationOpts = {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const bulkDocs = remote.bulkDocs;
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const docs1 = [
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const doc = { _id: "foo", integer: 4, _deleted: true };
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
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
            const row = res.rows[0];
            assert.isUndefined(row.error);
            // set rev to latest so we go at the end (otherwise new
            // rev is 1 and the subsequent remove below won't win)
            const doc = {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const onChange = function (c) {
            changes += c.docs.length;

            if (changes === 3) {
                db.info().then((info) => {
                    verifyInfo(info, {
                        update_seq: 3,
                        doc_count: 3
                    });
                    done();
                });
            }
        };
        remote.bulkDocs({ docs }, {}).then(() => {
            db.replicate.from(dbRemote).on("change", onChange);
        });
    });

    it("Replication with remote conflict", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const doc = { _id: "test", test: "Remote 1" };
        let winningRev;
        remote.post(doc).then((resp) => {
            doc._rev = resp.rev;
            DB.replicate(remote, db).then(() => {
                doc.test = "Local 1";
                db.put(doc).then(() => {
                    doc.test = "Remote 2";
                    remote.put(doc).then((resp) => {
                        doc._rev = resp.rev;
                        doc.test = "Remote 3";
                        remote.put(doc).then((resp) => {
                            winningRev = resp.rev;
                            DB.replicate(db, remote).then(() => {
                                DB.replicate(remote, db).then(() => {
                                    remote.get("test", { revs_info: true }).then((remotedoc) => {
                                        db.get("test", { revs_info: true }).then((localdoc) => {
                                            assert.equal(localdoc._rev, winningRev);
                                            assert.equal(remotedoc._rev, winningRev);
                                            db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const doc = {
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

    const waitForChange = (db, fun) => {
        return new Promise((resolve) => {
            const remoteChanges = db.changes({ live: true, include_docs: true });
            remoteChanges.on("change", (change) => {
                if (fun(change)) {
                    remoteChanges.cancel();
                    resolve();
                }
            });
        });
    };

    it("live replication, starting offline", () => {

        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        // id() is the first thing called
        const origId = remote.id;
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
                const rep = db.replicate.from(remote, {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const replication = db.replicate.to(remote, {
            live: true
        });

        return db.post({}).then((res) => {
            const doc = {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const replication = db.replicate.to(remote, {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const doc = { _id: "foo" };
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const replication = db.replicate.to(remote, {
            live: true
        });

        return db.post({}).then((res) => {
            const doc = {
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

    it("Replication of multiple remote conflicts (#789)", async () => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const doc = { _id: "789", _rev: "1-a", value: "test" };
        const createConflicts = async (db) => {
            await db.put(doc, { new_edits: false });
            await util.putAfter(db, {
                _id: "789",
                _rev: "2-a",
                value: "v1"
            }, "1-a");
            await util.putAfter(db, {
                _id: "789",
                _rev: "2-b",
                value: "v2"
            }, "1-a");
            await util.putAfter(db, {
                _id: "789",
                _rev: "2-c",
                value: "v3"
            }, "1-a");
        };

        await createConflicts(remote);
        const result = await db.replicate.from(remote);
        assert.equal(result.ok, true);
        // in this situation, all the conflicting revisions should be read and
        // written to the target database (this is consistent with CouchDB)
        assert.equal(result.docs_written, 3);
        assert.equal(result.docs_read, 3);
        const info = await db.info();
        assert.isAbove(info.update_seq, 0);
        assert.equal(info.doc_count, 1);
    });

    it("Replicate large number of docs", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const docs = [];
        const num = 30;
        for (let i = 0; i < num; i++) {
            docs.push({
                _id: `doc_${i}`,
                foo: `bar_${i}`
            });
        }
        remote.bulkDocs({ docs }).then(() => {
            db.replicate.from(remote, {}).then(() => {
                db.allDocs().then((res) => {
                    assert.equal(res.total_rows, num);
                    db.info().then((info) => {
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
        const db1name = dbName;
        const adoc = { _id: "adoc" };
        const newdoc = { _id: "newdoc" };
        const db1 = new DB(dbName);
        const db2 = new DB(dbRemote);
        db1.post(adoc).then(() => {
            DB.replicate(db1, db2).on("complete", () => {
                db1.destroy().then(() => {
                    const fresh = new DB(db1name);
                    fresh.post(newdoc).then(() => {
                        DB.replicate(fresh, db2).on("complete", () => {
                            db2.allDocs().then((docs) => {
                                assert.equal(docs.rows.length, 2);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it("issue #909 Filtered replication bails at paging limit", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const docs = [];
        let num = 100;
        for (var i = 0; i < num; i++) {
            docs.push({
                _id: `doc_${i}`,
                foo: `bar_${i}`
            });
        }
        num = 100;
        let docList = [];
        for (i = 0; i < num; i += 5) {
            docList.push(`doc_${i}`);
        }
        // uncomment this line to test only docs higher than paging limit
        docList = [
            "doc_33",
            "doc_60",
            "doc_90"
        ];
        remote.bulkDocs({ docs }, {}).then(() => {
            db.replicate.from(dbRemote, {
                live: false,
                doc_ids: docList
            }).then((result) => {
                assert.equal(result.docs_written, docList.length);
                db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        // 10 test documents
        const num = 10;
        const docs = [];
        for (let i = 0; i < num; i++) {
            docs.push({
                _id: `doc_${i}`,
                foo: `bar_${i}`,
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
        remote.bulkDocs({ docs }, {}).then((results) => {
            const bulkGet = remote.bulkGet;
            const first_replicate = () => {
                remote.bulkGet = function () {
                    const getResults = [];
                    for (let i = 0; i < docs.length; i++) {
                        const doc = docs[i];
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
                    assert.equal(err.result.last_seq, 0);

                    const docs = [
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

                    const check_docs = (id, exists) => {
                        if (!id) {
                            db.info().then((info) => {
                                verifyInfo(info, {
                                    update_seq: 9,
                                    doc_count: 9
                                });

                                second_replicate();
                            });
                            return;
                        }

                        db.get(id).then(() => {
                            if (!exists) {
                                throw new Error();
                            }
                            check_docs.apply(null, docs.shift());
                        }, (err) => {
                            if (exists) {
                                throw new Error();
                            }
                            check_docs.apply(null, docs.shift());
                        });
                    };

                    check_docs.apply(this, docs.shift());
                });
            };
            const second_replicate = () => {
                // Restore remote.bulkGet to original
                remote.bulkGet = bulkGet;
                // Replicate and confirm success, docs_written and target docs
                db.replicate.from(remote).then((result) => {
                    assert.exists(result);
                    assert.equal(result.docs_written, 1);
                    assert.equal(result.last_seq, 10);

                    const docs = ["doc_0", "doc_1", "doc_2", "doc_3", "doc_4", "doc_5", "doc_6", "doc_7", "doc_8", "doc_9"];

                    const check_docs = (id) => {
                        if (!id) {
                            db.info().then((info) => {
                                verifyInfo(info, {
                                    update_seq: 10,
                                    doc_count: 10
                                });
                                done();
                            });
                            return;
                        }
                        db.get(id).then(() => {
                            check_docs(docs.shift());
                        });
                    };

                    check_docs(docs.shift());
                }).catch(done);
            };
            // Done the test
            first_replicate();
        });
    });

    // Should not start replication over if last_seq mismatches in checkpoints
    // and it can be resolved some other way
    it("#3999-1 should not start over if last_seq mismatches", () => {

        const source = new DB(dbRemote);
        let mismatch = false;
        let failWrite = false;
        let checkpoint;
        let checkpointCount = 0;

        // 1. This is where we fake the mismatch:
        const putte = source.put;

        source.put = function (doc) {

            // We need the checkpoint id so we can inspect it later
            if (/local/.test(doc._id)) {
                checkpointCount++;
                checkpoint = doc._id;
            }

            if (failWrite && checkpointCount > 1) {
                return Promise.reject({
                    status: 0,
                    message: "Database encountered an unknown error"
                });
            }

            return putte.apply(this, arguments);
        };

        // 2. We measure that the replication starts in the expected
        // place in the 'changes' function
        interceptChanges(function (opts) {
            if (mismatch) {
                assert.notEqual(opts.since, 0);
            }
            return changes.apply(source, arguments);
        });

        const doc = { _id: "3", count: 0 };
        let put;

        return source.put({ _id: "4", count: 1 }, {}).then(() => {
            return source.put(doc, {});
        }).then((_put) => {
            put = _put;
            // Do one replication, this replication
            // will fail writing one checkpoint
            failWrite = true;
            return source.replicate.to(dbName, { batch_size: 1 });
        }).catch(() => {
            failWrite = false;
        }).then(() => {
            // Verify that checkpoints are indeed mismatching:
            assert.exists(checkpoint);
            const target = new DB(dbName);
            return Promise.all([
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
            return source.replicate.to(dbName);
        });
    });

    it("#3999-2 should start over if no common session is found", () => {

        const source = new DB(dbRemote);
        let mismatch = false;
        let writeStrange = false;
        let checkpoint;
        let checkpointCount = 0;

        // 1. This is where we fake the mismatch:
        const putte = source.put;
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
        interceptChanges(function (opts) {
            if (mismatch) {
                // We expect this replication to start over,
                // so the correct value of since is 0
                // if it's higher, the replication read the checkpoint
                // without caring for session id
                assert.equal(opts.since, 0);
                mismatch = false;
            }

            return changes.apply(source, arguments);
        });

        const doc = { _id: "3", count: 0 };
        let put;

        return source.put(doc, {}).then((_put) => {
            put = _put;
            writeStrange = true;
            // Do one replication, to not start from 0
            return source.replicate.to(dbName);
        }).then(() => {
            writeStrange = false;

            // Verify that checkpoints are indeed mismatching:
            assert.exists(checkpoint);
            const target = new DB(dbName);
            return Promise.all([
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
            return source.replicate.to(dbName);
        });
    });

    it("#3999-3 should not start over if common session is found", () => {

        const source = new DB(dbRemote);
        let mismatch = false;
        let writeStrange = false;
        let checkpoint;
        let checkpointCount = 0;

        // 1. This is where we fake the mismatch:
        const putte = source.put;
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
            const session = doc.session_id;

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
        interceptChanges(function (opts) {
            if (mismatch) {
                // If we resolve to 0, the checkpoint resolver has not
                // been going through the sessions
                assert.notEqual(opts.since, 0);

                mismatch = false;
            }

            return changes.apply(source, arguments);
        });

        const doc = { _id: "3", count: 0 };
        let put;

        return source.put(doc, {}).then((_put) => {
            put = _put;
            // Do one replication, to not start from 0
            writeStrange = true;
            return source.replicate.to(dbName);
        }).then(() => {
            writeStrange = false;
            // Verify that checkpoints are indeed mismatching:
            assert.exists(checkpoint);
            const target = new DB(dbName);
            return Promise.all([
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
            return source.replicate.to(dbName);
        });
    });

    it('#3999-4 should "upgrade" an old checkpoint', () => {
        let secondRound = false;
        let writeStrange = false;
        let checkpoint;
        let checkpointCount = 0;
        const source = new DB(dbRemote);
        const target = new DB(dbName);

        // 1. This is where we fake the mismatch:
        const putter = function (doc) {

            // We need the checkpoint id so we can inspect it later
            if (/local/.test(doc._id)) {
                checkpointCount++;
                checkpoint = doc._id;
            }

            const args = [].slice.call(arguments, 0);

            // Write an old-style checkpoint on the first replication:
            if (writeStrange && checkpointCount >= 1) {
                const newDoc = {
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

        interceptChanges(function (opts) {
            if (secondRound) {
                // Test 1: Check that we read the old style local doc
                // and didn't start from 0
                assert.notEqual(opts.since, 0);
            }
            return changes.apply(source, arguments);
        });

        const doc = { _id: "3", count: 0 };

        return source.put({ _id: "4", count: 1 }, {}).then(() => {
            writeStrange = true;
            return source.replicate.to(target);
        }).then(() => {
            writeStrange = false;
            // Verify that we have old checkpoints:
            assert.exists(checkpoint);
            const target = new DB(dbName);
            return Promise.all([
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        db.replicate.from(remote).then((result) => {
            assert.exists(result);
            assert.equal(result.docs_written, 0);
            db.info().then((info) => {
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
    it.skip("Syncing should stop if one replication fails (issue 838)", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const doc1 = { _id: "adoc", foo: "bar" };
        const doc2 = { _id: "anotherdoc", foo: "baz" };
        let finished = false;
        const replications = db.replicate.sync(remote, {
            live: true
        }).on("complete", () => {
            if (finished) {
                return;
            }
            finished = true;
            remote.put(doc2).then(() => {
                setTimeout(() => {
                    db.allDocs().then((res) => {
                        assert.isBelow(res.total_rows, 2);
                        done();
                    });
                }, 100);
            });
        });
        db.put(doc1).then(() => {
            replications.pull.cancel();
        });
    });

    it("Reporting write failures (#942)", (done) => {
        const docs = [{ _id: "a", _rev: "1-a" }, { _id: "b", _rev: "1-b" }];
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        db.bulkDocs({ docs }, { new_edits: false }).then(() => {
            const bulkDocs = remote.bulkDocs;
            let bulkDocsCallCount = 0;
            remote.bulkDocs = function (content, opts) {
                return new Promise((fulfill, reject) => {
                    // mock a successful write for the first
                    // document and a failed write for the second
                    const doc = content.docs[0];

                    if (/^_local/.test(doc._id)) {
                        return bulkDocs.call(remote, content, opts).then(fulfill, reject);
                    }

                    if (bulkDocsCallCount === 0) {
                        bulkDocsCallCount++;
                        fulfill([{ ok: true, id: doc._id, rev: doc._rev }]);
                    } else if (bulkDocsCallCount === 1) {
                        bulkDocsCallCount++;
                        fulfill([{
                            id: doc._id,
                            error: "internal server error",
                            reason: "test document write error"
                        }]);
                    } else {
                        bulkDocs.call(remote, content, opts).then(fulfill, reject);
                    }
                });
            };

            db.replicate.to(remote, { batch_size: 1, retry: false }).then(() => {
                done(new Error());
            }, (err) => {
                assert.equal(err.result.docs_read, 2, "docs_read");
                assert.equal(err.result.docs_written, 1, "docs_written");
                assert.equal(err.result.doc_write_failures, 1, "doc_write_failures");
                remote.bulkDocs = bulkDocs;
                db.replicate.to(remote, { batch_size: 1, retry: false }).then((result) => {
                    // checkpoint should not be moved past first doc
                    // should continue from this point and retry second doc
                    assert.equal(result.docs_read, 1, "second replication, docs_read");
                    assert.equal(result.docs_written, 1, "second replication, docs_written");
                    assert.equal(result.doc_write_failures, 0, "second replication, doc_write_failures");
                    db.info().then((info) => {
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
        const docs = [{ _id: "a", _rev: "1-a" }, { _id: "b", _rev: "1-b" }];
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        db.bulkDocs({ docs }, { new_edits: false }).then(() => {
            const bulkDocs = remote.bulkDocs;
            remote.bulkDocs = function (docs, opts) {
                return Promise.reject(new Error());
            };

            db.replicate.to(remote, { batch_size: 1, retry: false }).then(() => {
                done(new Error());
            }, (err) => {
                assert.equal(err.result.docs_read, 1, "docs_read");
                assert.equal(err.result.docs_written, 0, "docs_written");
                assert.equal(err.result.doc_write_failures, 1, "doc_write_failures");
                assert.equal(err.result.last_seq, 0, "last_seq");
                remote.bulkDocs = bulkDocs;
                db.replicate.to(remote, { batch_size: 1, retry: false }).then((result) => {
                    assert.equal(result.doc_write_failures, 0, "second replication, doc_write_failures");
                    assert.equal(result.docs_written, 2, "second replication, docs_written");
                    done();
                });
            });
        });
    });

    it("Test consecutive replications with different query_params", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const myDocs = [
            { _id: "0", integer: 0, string: "0" },
            { _id: "1", integer: 1, string: "1" },
            { _id: "2", integer: 2, string: "2" },
            { _id: "3", integer: 3, string: "3" },
            { _id: "4", integer: 5, string: "5" }
        ];
        remote.bulkDocs({ docs: myDocs }, {}).then(() => {
            const filterFun = function (doc, req) {
                if (req.query.even) {
                    return doc.integer % 2 === 0;
                }
                return true;

            };
            db.replicate.from(dbRemote, {
                filter: filterFun,
                query_params: { even: true }
            }).then((result) => {
                assert.equal(result.docs_written, 2);
                db.replicate.from(dbRemote, {
                    filter: filterFun,
                    query_params: { even: false }
                }).then((result) => {
                    assert.equal(result.docs_written, 3);
                    done();
                });
            });
        });
    });

    it("Test consecutive replications with different query_params and promises", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const myDocs = [
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
            return db.replicate.from(dbRemote, {
                filter: filterFun,
                query_params: { even: true }
            });
        }).then((result) => {
            assert.equal(result.docs_written, 2);
            return db.replicate.from(dbRemote, {
                filter: filterFun,
                query_params: { even: false }
            });
        }).then((result) => {
            assert.equal(result.docs_written, 3);
            done();
        }).catch(done);
    });

    it("Test consecutive replications with different doc_ids", (done) => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const myDocs = [
            { _id: "0", integer: 0, string: "0" },
            { _id: "1", integer: 1, string: "1" },
            { _id: "2", integer: 2, string: "2" },
            { _id: "3", integer: 3, string: "3" },
            { _id: "4", integer: 5, string: "5" }
        ];
        remote.bulkDocs({ docs: myDocs }, {}).then(() => {
            db.replicate.from(dbRemote, {
                doc_ids: ["0", "4"]
            }).then((result) => {
                assert.equal(result.docs_written, 2);
                db.replicate.from(dbRemote, {
                    doc_ids: ["1", "2", "3"]
                }).then((result) => {
                    assert.equal(result.docs_written, 3);
                    db.replicate.from(dbRemote, {
                        doc_ids: ["5"]
                    }).then((result) => {
                        assert.equal(result.docs_written, 0);
                        db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const doc = { _id: "foo", _attachments: {} };
        const num = 50;

        Array.apply(null, { length: num }).forEach((_, i) => {
            doc._attachments[`file_${i}`] = {
                content_type: "text\/plain",
                data: Buffer.from(`Some text: ${i}`)
            };
        });

        return remote.put(doc).then(() => {
            return db.replicate.from(dbRemote);
        }).then(() => {
            return db.get("foo");
        }).then((res) => {
            assert.equal(Object.keys(res._attachments).length, num);
        });
    });

    it("doc count after multiple replications", async () => {
        const runs = 2;
        // helper. remove each document in db and bulk load docs into same
        const rebuildDocuments = async (db, docs) => {
            const response = await db.allDocs({ include_docs: true });
            await Promise.all(response.rows.map((doc) => db.remove(doc).catch(adone.noop)));
            return bulkLoad(db, docs);
        };

        // helper.
        const bulkLoad = (db, docs) => {
            return db.bulkDocs({ docs }).catch((err) => {
                console.error(`Unable to bulk load docs.  Err: ${JSON.stringify(err)}`);
            });
        };

        // The number of workflow cycles to perform. 2+ was always failing
        // reason for this test.
        const workflow = async (name, remote, x) => {
            // some documents.  note that the variable Date component,
            //thisVaries, makes a difference.
            // when the document is otherwise static, couch gets the same hash
            // when calculating revision.
            // and the revisions get messed up in pouch
            const docs = [
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
            const dbr = new DB(remote);
            // Test invalid if adapter doesnt support mapreduce
            if (!dbr.query) {
                return;
            }

            await rebuildDocuments(dbr, docs);
            const db = new DB(name);
            await db.replicate.from(remote);
            const result = await db.query("common/common", { reduce: false });
            // -1 for the design doc
            assert.equal(result.rows.length, docs.length - 1);
            if (--x) {
                return workflow(name, remote, x);
            }
            const info = await db.info();
            verifyInfo(info, {
                update_seq: 5,
                doc_count: 5
            });
        };

        await workflow(dbName, dbRemote, runs);
    });

    it("issue #300 rev id unique per doc", (done) => {
        const remote = new DB(dbRemote);
        const db = new DB(dbName);
        const docs = [{ _id: "a" }, { _id: "b" }];
        remote.bulkDocs({ docs }, {}).then(() => {
            db.replicate.from(dbRemote).then(() => {
                db.allDocs().then((result) => {
                    assert.equal(result.rows.length, 2);
                    assert.equal(result.rows[0].id, "a");
                    assert.equal(result.rows[1].id, "b");
                    db.info().then((info) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const docs = [{ _id: "a" }, { _id: "b" }];
        db.bulkDocs({ docs }, {}).then(() => {
            db.replicate.to(dbRemote).then((result) => {
                assert.equal(result.docs_written, docs.length);
                remote.destroy().then(() => {
                    db.replicate.to(dbRemote).then((result) => {
                        assert.equal(result.docs_written, docs.length);
                        db.info().then((info) => {
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
        const src = new DB(dbName);
        const target = new DB(dbRemote);
        const err = {
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
                return Promise.reject(err);
            };
            return src.replicate.to(target);
        }).then(() => {
            target.info().then((info) => {
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
        const docs = [];
        for (let i = 0; i < 10; i++) {
            docs.push({ _id: i.toString() });
        }

        const remote = new DB(dbRemote);
        const db = new DB(dbName);

        remote.bulkDocs({ docs }, {}).then((res) => {
            res.forEach((row, i) => {
                docs[i]._rev = row.rev;
                if (i % 2 === 0) {
                    docs[i]._deleted = true;
                }
            });
            remote.bulkDocs({ docs }, {}).then(() => {
                db.replicate.from(dbRemote).then(() => {
                    db.info().then((info) => {
                        db.changes({
                            descending: true,
                            limit: 1
                        }).on("change", (change) => {
                            assert.lengthOf(change.changes, 1);

                            assert.equal(change.seq, info.update_seq);
                            done();
                        }).on("error", done);
                    });
                });
            });
        });
    });

    it("issue #2393 update_seq after new_edits + replication", (done) => {
        const docs = [{
            _id: "foo",
            _rev: "1-x",
            _revisions: {
                start: 1,
                ids: ["x"]
            }
        }];

        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        remote.bulkDocs({ docs, new_edits: false }).then(() => {
            remote.bulkDocs({ docs, new_edits: false }).then(() => {
                db.replicate.from(dbRemote).then(() => {
                    db.info().then((info) => {
                        const changes = db.changes({
                            descending: true,
                            limit: 1
                        }).on("change", (change) => {
                            assert.lengthOf(change.changes, 1);
                            assert.equal(change.seq, info.update_seq);
                            changes.cancel();
                        }).on("complete", () => {
                            remote.info().then((info) => {
                                const rchanges = remote.changes({
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
        const remote = new DB(dbRemote);
        const db = new DB(dbName);
        const rep = db.replicate.from(remote, { live: true });
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
        const local = new DB(dbName);
        const remote = new DB(dbRemote);
        const docid = "mydoc";

        // create a bunch of rando, good revisions
        const numRevs = 5;
        const uuids = [];
        for (let i = 0; i < numRevs - 1; i++) {
            uuids.push(util.rev());
        }

        // good branch
        // this branch is one revision ahead of the conflicted branch
        const a_conflict = util.rev();
        const a_burner = util.rev();
        const a_latest = util.rev();
        const a_rev_num = numRevs + 2;
        const a_doc = {
            _id: docid,
            _rev: `${a_rev_num}-${a_latest}`,
            _revisions: {
                start: a_rev_num,
                ids: [a_latest, a_burner, a_conflict].concat(uuids)
            }
        };

        // conflicted deleted branch
        const b_conflict = util.rev();
        const b_deleted = util.rev();
        const b_rev_num = numRevs + 1;
        const b_doc = {
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


    it("Test immediate replication canceling", (done) => {
        //See  http://pouchdb.com/guides/replication.html : Cancelling replication
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        const replicationHandler = remote.replicate.to(db, {
            live: true,
            retry: true
        });

        replicationHandler.on("complete", () => {
            done();
        }).on("error", done);

        replicationHandler.cancel();
    });

    it("#3606 - live replication with filtered ddoc", () => {
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

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
        const db = new DB(dbName);
        db.bulkDocs({ docs }, {}).then(() => {
            const replication = db.replicate.to(dbRemote);
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        remote.bulkDocs(docs).then(() => {

            const repl = db.replicate.from(remote, { live: true });
            repl.on("complete", done.bind(null, null));

            remote.info().then(() => {
                repl.cancel();
            }).catch(done);
        }).catch(done);
    });

    it("#4293 Triggers extra replication events", (done) => {

        const db = new DB(dbName);
        const remote = new DB(dbRemote);

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

    it("#2426 doc_ids dont prevent replication", () => {

        const db = new DB(dbName);
        const remote = new DB(dbRemote);

        const writes = [];
        for (let i = 0; i < 20; i++) {
            writes.push(remote.put({ _id: `${i}` }));
        }

        return Promise.all(writes).then(() => {
            return db.sync(remote, { batch_size: 10, doc_ids: ["11", "12", "13"] });
        }).then(() => {
            return db.allDocs();
        }).then((allDocs) => {
            assert.equal(allDocs.total_rows, 3);
        });
    });
});
