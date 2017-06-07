require("./node.setup");

describe("test.http.js", () => {

    const dbs = {};

    beforeEach((done) => {
        dbs.name = testUtils.adapterUrl("http", "test_http");
        testUtils.cleanup([dbs.name], done);
    });

    after((done) => {
        testUtils.cleanup([dbs.name], done);
    });

    // TODO: Remove `skipSetup` in favor of `skip_setup` in a future release
    it("Create a pouch without DB setup (skipSetup)", (done) => {
        let instantDB;
        testUtils.isCouchDB((isCouchDB) => {
            if (!isCouchDB) {
                return done();
            }
            const db = new PouchDB(dbs.name);
            db.destroy(() => {
                instantDB = new PouchDB(dbs.name, { skipSetup: true });
                instantDB.post({ test: "abc" }, (err) => {
                    assert.exists(err);
                    assert.equal(err.name, "not_found", "Skipped setup of database");
                    done();
                });
            });
        });
    });

    it("Create a pouch without DB setup (skip_setup)", (done) => {
        let instantDB;
        testUtils.isCouchDB((isCouchDB) => {
            if (!isCouchDB) {
                return done();
            }
            const db = new PouchDB(dbs.name);
            db.destroy(() => {
                instantDB = new PouchDB(dbs.name, { skip_setup: true });
                instantDB.post({ test: "abc" }, (err) => {
                    assert.exists(err);
                    assert.equal(err.name, "not_found", "Skipped setup of database");
                    done();
                });
            });
        });
    });

    it("Issue 1269 redundant _changes requests", (done) => {
        const docs = [];
        const num = 100;
        for (let i = 0; i < num; i++) {
            docs.push({
                _id: `doc_${i}`,
                foo: `bar_${i}`
            });
        }
        const db = new PouchDB(dbs.name);
        db.bulkDocs({ docs }, () => {
            db.info((err, info) => {
                const update_seq = info.update_seq;

                let callCount = 0;
                const ajax = db._ajax;
                db._ajax = function (opts) {
                    if (/_changes/.test(opts.url)) {
                        callCount++;
                    }
                    ajax.apply(this, arguments);
                };
                db.changes({
                    since: update_seq
                }).on("change", () => {
                }).on("complete", () => {
                    assert.equal(callCount, 1, "One _changes call to complete changes");
                    db._ajax = ajax;
                    done();
                }).on("error", done);
            });
        });
    });

    it("handle ddocs with slashes", (done) => {
        const ddoc = {
            _id: "_design/foo/bar"
        };
        const db = new PouchDB(dbs.name);
        db.bulkDocs({ docs: [ddoc] }, () => {
            db.get(ddoc._id, (err, doc) => {
                assert.isNull(err);
                assert.equal(doc._id, ddoc._id, "Correct doc returned");
                done();
            });
        });
    });

    it("Properly escape url params #4008", () => {
        const db = new PouchDB(dbs.name);
        const ajax = db._ajax;
        db._ajax = function (opts) {
            assert.notInclude(opts.url, "[");
            ajax.apply(this, arguments);
        };
        return db.changes({ doc_ids: ["1"] }).then(() => {
            db._ajax = ajax;
        });
    });

    it('Allows the "ajax timeout" to extend "changes timeout"', (done) => {
        const timeout = 120000;
        const db = new PouchDB(dbs.name, {
            skipSetup: true,
            ajax: {
                timeout
            }
        });

        const ajax = db._ajax;
        let ajaxOpts;
        db._ajax = function (opts) {
            if (/changes/.test(opts.url)) {
                ajaxOpts = opts;
                changes.cancel();
            }
            ajax.apply(this, arguments);
        };

        var changes = db.changes();

        changes.on("complete", () => {
            assert.exists(ajaxOpts);
            assert.equal(ajaxOpts.timeout, timeout);
            db._ajax = ajax;
            done();
        });

    });

    it("Test custom header", () => {
        const db = new PouchDB(dbs.name, {
            headers: {
                "X-Custom": "some-custom-header"
            }
        });
        return db.info();
    });

    it("test url too long error for allDocs()", () => {
        const docs = [];
        const numDocs = 75;
        for (let i = 0; i < numDocs; i++) {
            docs.push({
                _id: `fairly_long_doc_name_${i}`
            });
        }
        const db = new PouchDB(dbs.name);
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({
                keys: docs.map((x) => {
                    return x._id;
                })
            });
        }).then((res) => {
            assert.lengthOf(res.rows, numDocs);
        });
    });

    it("4358 db.info rejects when server is down", () => {
        const db = new PouchDB("http://example.com/foo");
        return db.info().then(() => {
            throw new Error("expected an error");
        }).catch((err) => {
            assert.exists(err);
        });
    });

    it("4358 db.destroy rejects when server is down", () => {
        const db = new PouchDB("http://example.com/foo");
        return db.destroy().then(() => {
            throw new Error("expected an error");
        }).catch((err) => {
            assert.exists(err);
        });
    });


    it("5574 Create a pouch with / in name and prefix url", () => {
        // CouchDB Master disallows these characters
        if (testUtils.isCouchMaster()) {
            return true;
        }
        const db = new PouchDB("test/suffix", {
            prefix: testUtils.adapterUrl("http", "")
        });
        return db.info().then(() => {
            return db.destroy();
        });
    });

    it("Issue 6132 - default headers not merged", () => {
        const db = new PouchDB(dbs.name, {
            ajax: {
                // need to use a header that CouchDB allows through CORS
                headers: { "x-csrf-token": "bar" }
            }
        });

        const ajax = db._ajax;
        let tested = false;
        db._ajax = function (opts) {
            if (opts.headers && opts.headers["Content-Type"]) {
                if (opts.headers["x-csrf-token"] !== "bar") {
                    throw new Error("default header x-csrf-token expected");
                }
                tested = true;
            }

            ajax.apply(this, arguments);
        };

        return db.putAttachment("mydoc", "att.txt", testUtils.btoa("abc"), "text/plain")
            .then(() => {
                if (!tested) {
                    throw new Error("header assertion skipped in test");
                }
            });
    });

});
