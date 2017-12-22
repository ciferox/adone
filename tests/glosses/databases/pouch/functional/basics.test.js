import * as util from "./utils";

const { is } = adone;

describe("database", "pouch", "basics", () => {
    const dbs = {};
    const dbName = "testdb";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    it("Create a pouch without new keyword", () => {
        /* jshint newcap:false */
        const db = new DB(dbName);
        assert.instanceOf(db, DB);
    });

    it("Name is accessible via instance", () => {
        const db = new DB(dbName);
        assert.equal(db.name, dbName);
    });

    it("4314 Create a pouch with + in name", () => {
        const db = new DB(`${dbName}+suffix`);
        return db.info().then(() => {
            return db.destroy();
        });
    });

    it("Creating Pouch without name will throw", (done) => {
        try {
            new DB();
            done("Should have thrown");
        } catch (err) {
            assert.equal(err instanceof Error, true, "should be an error");
            done();
        }
    });

    it("4314 Create a pouch with urlencoded name", () => {
        const db = new DB(`${dbName}some%2Ftest`);
        return db.info().then(() => {
            return db.destroy();
        });
    });

    it("4219 destroy a pouch", () => {
        return new DB(dbName).destroy({});
    });

    it("4339 throw useful error if method called on stale instance", () => {
        const db = new DB(dbName);

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

    it("Add a doc", async () => {
        const db = new DB(dbName);
        await db.post({ test: "somestuff" });
    });

    it("Get invalid id", () => {
        const db = new DB(dbName);
        return db.get(1234).then(() => {
            throw new Error("should not be here");
        }).catch((err) => {
            assert.exists(err);
        });
    });

    it("Missing doc should contain ID in error object", () => {
        const db = new DB(dbName);
        return db.get("abc-123").then(() => {
            throw new Error("should not be here");
        }).catch((err) => {
            assert.exists(err);
            assert.equal(err.docId, "abc-123");
        });
    });

    it("PUTed Conflicted doc should contain ID in error object", () => {
        const db = new DB(dbName);
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
        const db = new DB(dbName);
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
        const db = new DB(dbName);
        db.post({ test: "somestuff" }).then(() => {
            done();
        }, done);
    });

    it("Add a doc with opts object", async () => {
        const db = new DB(dbName);
        await db.post({ test: "somestuff" }, {});
    });

    it("Modify a doc", async () => {
        const db = new DB(dbName);
        const info = await db.post({ test: "somestuff" });
        const info2 = await db.put({
            _id: info.id,
            _rev: info.rev,
            another: "test"
        });
        assert.notEqual(info.rev, info2.rev);
    });

    it("Modify a doc with a promise", (done) => {
        const db = new DB(dbName);
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

    it("Read db", (done) => {
        const db = new DB(dbName);
        db.id().then((id) => {
            assert.string(id);
            done();
        });
    });

    it("Close db", (done) => {
        const db = new DB(dbName);
        db.info().then(() => {
            db.close(done);
        });
    });

    it("Close db with a promise", () => {
        const db = new DB(dbName);
        return db.close();
    });

    it("Read db id after closing Close", async () => {
        let db = new DB(dbName);
        await db.close();
        db = new DB(dbName);
        const id = await db.id();
        assert.string(id);
    });

    it("Modify a doc with incorrect rev", async () => {
        const db = new DB(dbName);
        const info = await db.post({ test: "somestuff" });
        const nDoc = {
            _id: info.id,
            _rev: `${info.rev}broken`,
            another: "test"
        };
        await assert.throws(async () => {
            await db.put(nDoc);
        });
    });

    it("Remove doc", async () => {
        const db = new DB(dbName);
        const info = await db.post({ test: "somestuff" });
        await db.remove({
            test: "somestuff",
            _id: info.id,
            _rev: info.rev
        });
        const err = await assert.throws(async () => {
            await db.get(info.id);
        });
        assert.exists(err.error);
    });

    it("Remove doc with new syntax and a promise", (done) => {
        const db = new DB(dbName);
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

    it("Doc removal leaves only stub", async () => {
        const db = new DB(dbName);
        await db.put({ _id: "foo", value: "test" });
        let doc = await db.get("foo");
        const res = await db.remove(doc);
        doc = await db.get("foo", { rev: res.rev });
        assert.deepEqual(doc, {
            _id: res.id,
            _rev: res.rev,
            _deleted: true
        });
    });

    it("Remove doc twice with specified id", () => {
        const db = new DB(dbName);
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
        const db = new DB(dbName);
        const changes = db.changes({
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
        db.post({ _id: "somestuff" }).then((res) => {
            db.remove({
                _id: res.id,
                _rev: res.rev
            });
        });
    });

    it("Delete document without id", async () => {
        const db = new DB(dbName);
        await assert.throws(async () => {
            await db.remove({ test: "ing" });
        });
    });

    it("Delete document with many args", () => {
        const db = new DB(dbName);
        const doc = { _id: "foo" };
        return db.put(doc).then((info) => {
            return db.remove(doc._id, info.rev, {});
        });
    });

    it("Delete doc with id + rev + no opts", () => {
        const db = new DB(dbName);
        const doc = { _id: "foo" };
        return db.put(doc).then((info) => {
            return db.remove(doc._id, info.rev);
        });
    });

    it("Delete doc with doc + opts", () => {
        const db = new DB(dbName);
        const doc = { _id: "foo" };
        return db.put(doc).then((info) => {
            doc._rev = info.rev;
            return db.remove(doc, {});
        });
    });

    it("Delete doc with rev in opts", () => {
        const db = new DB(dbName);
        const doc = { _id: "foo" };
        return db.put(doc).then((info) => {
            return db.remove(doc, { rev: info.rev });
        });
    });

    it("Bulk docs with a promise", (done) => {
        const db = new DB(dbName);
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

    it("Basic checks", async () => {
        const db = new DB(dbName);
        let info = await db.info();
        const updateSeq = info.update_seq;
        let doc = { _id: "0", a: 1, b: 1 };
        assert.equal(info.doc_count, 0);
        const res = await db.put(doc);
        assert.equal(res.ok, true);
        assert.property(res, "id");
        assert.property(res, "rev");
        info = await db.info();
        assert.equal(info.doc_count, 1);
        assert.notEqual(info.update_seq, updateSeq);
        doc = await db.get(doc._id);
        assert.equal(doc._id, res.id);
        assert.equal(doc._rev, res.rev);
        doc = await db.get(doc._id, { revs_info: true }, (err, doc) => {
            assert.equal(doc._revs_info[0].status, "available");
        });
    });

    it("update with invalid rev", async () => {
        const db = new DB(dbName);
        const info = await db.post({ test: "somestuff" });
        const err = await assert.throws(async () => {
            await db.put({
                _id: info.id,
                _rev: "undefined",
                another: "test"
            });
        });
        assert.equal(err.name, "bad_request");
    });

    it("Doc validation", async () => {
        const bad_docs = [
            { _zing: 4 },
            { _zoom: "hello" },
            {
                zane: "goldfish",
                _fan: "something smells delicious"
            },
            { _bing: { "wha?": "soda can" } }
        ];
        const db = new DB(dbName);
        const err = await assert.throws(async () => {
            await db.bulkDocs({ docs: bad_docs });
        });
        assert.equal(err.name, "doc_validation");
        assert.equal(err.message, `${util.x.DOC_VALIDATION.message}: _zing`, "correct error message returned");
    });

    it("Replication fields (#2442)", () => {
        const doc = {
            _replication_id: "test",
            _replication_state: "triggered",
            _replication_state_time: 1,
            _replication_stats: {}
        };
        const db = new DB(dbName);
        return db.post(doc).then((resp) => {
            return db.get(resp.id);
        }).then((doc2) => {
            assert.equal(doc2._replication_id, "test");
            assert.equal(doc2._replication_state, "triggered");
            assert.equal(doc2._replication_state_time, 1);
            assert.deepEqual(doc2._replication_stats, {});
        });
    });

    it("Testing issue #48", async () => {
        const docs = [
            { _id: "0" }, { _id: "1" }, { _id: "2" },
            { _id: "3" }, { _id: "4" }, { _id: "5" }
        ];
        const db = new DB(dbName);

        const promises = [];
        for (let i = 0; i < 10; ++i) {
            promises.push(db.bulkDocs({ docs }));
            await adone.promise.delay(10);
        }
        await Promise.all(promises);
    });

    it("Testing valid id", async () => {
        const db = new DB(dbName);
        const err = await assert.throws(async () => {
            await db.post({
                _id: 123,
                test: "somestuff"
            });
        });
        assert.include(["bad_request", "illegal_docid"], err.name);
    });

    it("Put doc without _id should fail", async () => {
        const db = new DB(dbName);
        const err = await assert.throws(async () => {
            await db.put({ test: "somestuff" });
        });
        assert.equal(err.message, util.x.MISSING_ID.message, "correct error message returned");
    });

    it("Put doc with bad reserved id should fail", async () => {
        const db = new DB(dbName);
        const err = await assert.throws(async () => {
            await db.put({
                _id: "_i_test",
                test: "somestuff"
            });
        });
        assert.equal(err.status, util.x.RESERVED_ID.status);
        assert.equal(err.message, util.x.RESERVED_ID.message, "correct error message returned");
    });

    it("update_seq persists", () => {
        let db = new DB(dbName);
        return db.post({ test: "somestuff" }).then(() => {
            return db.close();
        }).then(() => {
            db = new DB(dbName);
            return db.info();
        }).then((info) => {
            assert.notEqual(info.update_seq, 0);
            assert.equal(info.doc_count, 1);
        });
    });

    it("deletions persists", async () => {

        const db = new DB(dbName);
        const doc = { _id: "staticId", contents: "stuff" };

        const writeAndDelete = async () => {
            const info = await db.put(doc);
            await db.remove({
                _id: info.id,
                _rev: info.rev
            });
        };

        await writeAndDelete();
        await writeAndDelete();
        await db.put(doc);
        const details = await db.get(doc._id, { conflicts: true });
        assert.notProperty(details, "_conflicts");
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
        const db = new DB(dbName);
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
        const db = new DB("__proto__");
        return db.info().then(() => {
            return db.destroy();
        });
    });

    it("Error when document is not an object", async () => {
        const db = new DB(dbName);
        const doc1 = [{ _id: "foo" }, { _id: "bar" }];
        const doc2 = "this is not an object";
        await assert.throws(async () => {
            await db.post(doc1);
        });
        await assert.throws(async () => {
            await db.post(doc2);
        });
        await assert.throws(async () => {
            await db.put(doc1);
        });
        await assert.throws(async () => {
            await db.put(doc2);
        });
        await assert.throws(async () => {
            await db.bulkDocs({ docs: [doc1, doc2] });
        });
    });

    it("Test instance update_seq updates correctly", async () => {
        const db1 = new DB(dbName);
        const db2 = new DB(dbName);
        return db1.post({ a: "doc" }).then(() => {
            return db1.info();
        }).then((db1Info) => {
            return db2.info().then((db2Info) => {
                assert.notEqual(db1Info.update_seq, 0);
                assert.notEqual(db2Info.update_seq, 0);
            });
        });
    });

    it("Fail to fetch a doc after db was deleted", async () => {
        const db = new DB(dbName);
        let db2 = new DB(dbName);
        const doc = { _id: "foodoc" };
        const doc2 = { _id: "foodoc2" };
        return db.put(doc).then(() => {
            return db2.put(doc2);
        }).then(() => {
            return db.allDocs();
        }).then((docs) => {
            assert.equal(docs.total_rows, 2);
            return db.destroy();
        }).then(() => {
            db2 = new DB(dbName);
            return db2.get(doc._id);
        }).then(() => {
            throw new Error();
        }, (err) => {
            assert.equal(err.name, "not_found");
            assert.equal(err.status, 404);
        });
    });

    it("Fail to fetch a doc after db was deleted", async () => {
        const db = new DB(dbName);
        let db2 = new DB(dbName);
        const doc = { _id: "foodoc" };
        const doc2 = { _id: "foodoc2" };
        return db.put(doc).then(() => {
            return db2.put(doc2);
        }).then(() => {
            return db.allDocs();
        }).then((docs) => {
            assert.equal(docs.total_rows, 2);
            return db.destroy();
        }).then(() => {
            db2 = new DB(dbName);
            return db2.get(doc._id).then(() => {
                throw new Error();
            }, (err) => {
                assert.equal(err.status, 404);
            });
        });
    });

    it("Cant add docs with empty ids", async () => {
        const docs = [
            {},
            { _id: null },
            { _id: undefined },
            { _id: "" },
            { _id: {} },
            { _id: "_underscored_id" }
        ];
        for (const doc of docs) {
            await assert.throws(async () => {
                await db.put(doc);
            });
        }
    });

    it("Test doc with percent in ID", () => {
        const db = new DB(dbName);
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
        const db = new DB(dbName);
        db.info().then((info) => {
            assert.equal(info.db_name, "testdb");
            done();
        });
    });

    it("db.info should give auto_compaction = false (#2744)", () => {
        const db = new DB(dbName, { auto_compaction: false });
        return db.info().then((info) => {
            assert.equal(info.auto_compaction, false);
        });
    });

    it("db.info should give auto_compaction = true (#2744)", () => {
        const db = new DB(dbName, { auto_compaction: true });
        return db.info().then((info) => {
            // http doesn't support auto compaction
            assert.equal(info.auto_compaction, true);
        });
    });

    it("db.info should give adapter name (#3567)", () => {
        const db = new DB(dbName);
        return db.info().then((info) => {
            assert.equal(info.adapter, db.adapter);
        });
    });

    it("db.info should give correct doc_count", () => {
        const db = new DB(dbName);
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
        const db = new DB(dbName);
        return db.put({ _id: "_local/foo" }).then((info) => {
            assert.true(info.ok, "putting local returns ok=true");
            return db.put({ _id: "quux" });
        }).then((info) => {
            assert.true(info.ok, "putting returns ok=true");
            return db.bulkDocs([{ _id: "_local/bar" }, { _id: "baz" }]);
        }).then((info) => {
            assert.lengthOf(info, 2, "correct num bulk docs");
            assert.true(info[0].ok, "bulk docs says ok=true #1");
            assert.true(info[1].ok, "bulk docs says ok=true #2");
            return db.post({});
        }).then((info) => {
            assert.true(info.ok, "posting returns ok=true");
        });
    });

    it("putting is override-able", () => {
        const db = new DB(dbName);
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
        DB.plugin(plugin);
        db.initPull();
        return db.put({ _id: "anid", foo: "bar" }).then(() => {
            assert.above(called, 0, "put was called");
            return db.get("anid");
        }).then((doc) => {
            assert.equal(doc.foo, "bar", "correct doc");
        });
    });

    it("issue 2779, deleted docs, old revs COUCHDB-292", (done) => {
        const db = new DB(dbName);
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
        const db = new DB(dbName);
        let rev;

        const checkNumRevisions = (num) => {
            return db.get("foo", {
                open_revs: "all",
                revs: true
            }).then((fullDocs) => {
                assert.lengthOf(fullDocs[0].ok._revisions.ids, num);
            });
        };

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
        const db = new DB(dbName);
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

    it("2 invalid puts", async () => {
        const db = new DB(dbName);
        await assert.throws(async () => {
            await db.put({ _id: "foo", _zing: "zing" });
        });
        await assert.throws(async () => {
            await db.put({ _id: "bar", _zing: "zing" });
        });
    });

    it('Docs save "null" value', () => {
        const db = new DB(dbName);
        return db.put({ _id: "doc", foo: null }).then(() => {
            return db.get("doc");
        }).then((doc) => {
            assert.equal((typeof doc.foo), "object");
            assert.null(doc.foo);
            assert.deepEqual(Object.keys(doc).sort(), ["_id", "_rev", "foo"]);
        });
    });

    it("replace DB.destroy() (express-pouchdb#203)", (done) => {
        const old = DB.destroy;
        DB.destroy = function (name, callback) {
            const db = new DB(name);
            return db.destroy(callback);
        };
        // delete a non-existing db, should be fine.
        DB.destroy(dbName, (err, resp) => {
            DB.destroy = old;

            done(err, resp);
        });
    });

    it("3968, keeps all object fields", () => {
        const db = new DB(dbName);
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
            assert.undefined(doc._rev);
            assert.undefined(doc._rev_tree);

            delete savedDoc._rev;
            assert.deepEqual(savedDoc, doc);
        });
    });

    it("4712 invalid rev for new doc generates conflict", () => {
        const db = new DB(dbName);
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
        const db = new DB(dbName);
        return db.close().then(() => {
            return db.info().catch((err) => {
                assert.equal(err.message, "database is closed");
            });
        });
    });

    it("test get() after db close", () => {
        const db = new DB(dbName);
        return db.close().then(() => {
            return db.get("foo").catch((err) => {
                assert.equal(err.message, "database is closed");
            });
        });
    });

    it("test close() after db close", () => {
        const db = new DB(dbName);
        return db.close().then(() => {
            return db.close().catch((err) => {
                assert.equal(err.message, "database is closed");
            });
        });
    });

    // TODO: this test fails in the http adapter in Chrome
    it("should allow unicode doc ids", (done) => {
        const db = new DB(dbName);
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
        const db1 = new DB(dbName);
        return db1.info().then(() => {
            const db2 = new DB(dbName);
            return db2.info().then(() => {
                if (!is.undefined(db1._blobSupport)) {
                    assert.equal(db1._blobSupport, db2._blobSupport, "same blob support");
                } else {
                    assert.true(true);
                }
            });
        });
    });

    it("6053, DB.plugin() resets defaults", () => {
        const DB1 = DB.defaults({ foo: "bar" });
        const DB2 = DB1.plugin({ foo() { } });
        assert.exists(DB2.__defaults);
        assert.deepEqual(DB1.__defaults, DB2.__defaults);
    });
});
