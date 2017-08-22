import * as util from "./utils";

const { is } = adone;

/* jshint maxlen:false */
const icons = [
    "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"
];

const iconDigests = [
    "md5-Mf8m9ehZnCXC717bPkqkCA==",
    "md5-fdEZBYtnvr+nozYVDzzxpA==",
    "md5-ImDARszfC+GA3Cv9TVW4HA==",
    "md5-hBsgoz3ujHM4ioa72btwow==",
    "md5-jDUyV6ySnTVANn2qq3332g=="
];

const iconLengths = [1047, 789, 967, 527, 1108];

describe("database", "pouch", "suite2 attachments", () => {
    const dbName = "testdb";

    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    const binAttDoc = {
        _id: "bin_doc",
        _attachments: {
            "foo.txt": {
                content_type: "text/plain",
                data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
            }
        }
    };
    // empty attachment
    const binAttDoc2 = {
        _id: "bin_doc2",
        _attachments: {
            "foo.txt": {
                content_type: "text/plain",
                data: ""
            }
        }
    };
    // json string doc
    const jsonDoc = {
        _id: "json_doc",
        _attachments: {
            "foo.json": {
                content_type: "application/json",
                data: "eyJIZWxsbyI6IndvcmxkIn0="
            }
        }
    };
    const pngAttDoc = {
        _id: "png_doc",
        _attachments: {
            "foo.png": {
                content_type: "image/png",
                data: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAMFBMVEX+9+" +
                "j+9OD+7tL95rr93qT80YD7x2L6vkn6syz5qRT4ogT4nwD4ngD4nQD4nQD4" +
                "nQDT2nT/AAAAcElEQVQY002OUQLEQARDw1D14f7X3TCdbfPnhQTqI5UqvG" +
                "OWIz8gAIXFH9zmC63XRyTsOsCWk2A9Ga7wCXlA9m2S6G4JlVwQkpw/Ymxr" +
                "UgNoMoyxBwSMH/WnAzy5cnfLFu+dK2l5gMvuPGLGJd1/9AOiBQiEgkzOpg" +
                "AAAABJRU5ErkJggg=="
            }
        }
    };

    it("3357 Attachment names cant start with _", () => {
        const db = new DB(dbName);
        const doc = {
            _id: "baz", _attachments: {
                "_text1.txt": {
                    content_type: "text/plain",
                    data: util.btoa("text1")
                }
            }
        };
        return db.put(doc).then(() => {
            throw new Error("Should not succeed");
        }).catch((err) => {
            assert.equal(err.name, "bad_request");
        });
    });

    it("5736 warning for putAttachment without content_type", () => {
        const db = new DB(dbName);
        return db.putAttachment("bar", "baz.txt", util.btoa("text"), "");
    });

    it("5736 warning for bulkDocs attachments without content_type", () => {
        const db = new DB(dbName);
        const doc = {
            _attachments: {
                "att.txt": {
                    data: util.btoa("well")
                }
            }
        };
        return db.bulkDocs([doc]);
    });

    it("fetch atts with open_revs and missing", () => {
        const db = new DB(dbName);
        const doc = {
            _id: "frog",
            _rev: "1-x",
            _revisions: {
                start: 1,
                ids: ["x"]
            },
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: ""
                }
            }
        };
        return db.bulkDocs({
            docs: [doc],
            new_edits: false
        }).then(() => {
            return db.get("frog", {
                revs: true,
                open_revs: ["1-x", "2-fake"],
                attachments: true
            });
        }).then((res) => {
            // there should be exactly one "ok" result
            // and one result with attachments
            assert.lengthOf(res.filter((x) => {
                return x.ok;
            }), 1);
            assert.lengthOf(res.filter((x) => {
                return x.ok && x.ok._attachments;
            }), 1);
        });
    });

    it("issue 2803 should throw 412", () => {
        const db = new DB(dbName);
        return db.put(binAttDoc).then(() => {
            return db.get(binAttDoc._id);
        }).then((doc) => {
            doc._attachments["bar.txt"] = {
                stub: true,
                digest: "md5-sorryIDoNotReallyExist=="
            };
            return db.put(doc);
        }).then((res) => {
            assert.isUndefined(res, "should throw");
        }).catch((err) => {
            assert.exists(err.status, `got improper error: ${err}`);
            assert.equal(err.status, 412);
        });
    });

    it("issue 2803 should throw 412 part 2", () => {
        const stubDoc = {
            _id: "stubby",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    digest: "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
                    stub: true
                }
            }
        };
        const db = new DB(dbName);
        return db.put(stubDoc).then((res) => {
            assert.isUndefined(res, "should throw");
        }).catch((err) => {
            assert.exists(err.status, `got improper error: ${err}`);
            assert.equal(err.status, 412, `got improper error: ${err}`);
        });
    });

    it("issue 2803 should throw 412 part 3", () => {
        const db = new DB(dbName);
        return db.put(binAttDoc).then(() => {
            return db.get(binAttDoc._id);
        }).then((doc) => {
            doc._attachments["foo.json"] = jsonDoc._attachments["foo.json"];
        }).then(() => {
            return db.get(binAttDoc._id);
        }).then((doc) => {
            doc._attachments["bar.txt"] = {
                stub: true,
                digest: "md5-sorryIDoNotReallyExist=="
            };
            return db.put(doc);
        }).then((res) => {
            assert.isUndefined(res, "should throw");
        }).catch((err) => {
            assert.exists(err.status, `got improper error: ${err}`);
            assert.equal(err.status, 412);
        });
    });

    it("issue 2803 should throw 412 part 4", () => {
        const db = new DB(dbName);
        return db.put(binAttDoc).then(() => {
            return db.get(binAttDoc._id);
        }).then((doc) => {
            doc._attachments["foo.json"] = jsonDoc._attachments["foo.json"];
        }).then(() => {
            return db.get(binAttDoc._id);
        }).then((doc) => {
            doc._attachments["bar.txt"] = {
                stub: true,
                digest: "md5-sorryIDoNotReallyExist=="
            };
            doc._attachments["baz.txt"] = {
                stub: true,
                digest: "md5-yahNoIDoNotExistEither=="
            };
            return db.put(doc);
        }).then((res) => {
            assert.isUndefined(res, "should throw");
        }).catch((err) => {
            assert.exists(err.status, `got improper error: ${err}`);
            assert.equal(err.status, 412);
        });
    });

    it("#2858 {binary: true} in get()", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc];
        return db.bulkDocs(docs).then(() => {
            return Promise.all(docs.map((doc) => {
                const attName = Object.keys(doc._attachments)[0];
                const expected = doc._attachments[attName];
                return db.get(doc._id, {
                    attachments: true,
                    binary: true
                }).then((savedDoc) => {
                    const att = savedDoc._attachments[attName];
                    assert.isUndefined(att.stub);
                    assert.exists(att.digest);
                    assert.equal(att.content_type, expected.content_type);
                    assert.isNotString(att.data);
                    assert.equal(att.data.type, expected.content_type);
                    return att.data.toString("binary");
                }).then((bin) => {
                    assert.equal(util.btoa(bin), expected.data);
                });
            }));
        });
    });

    it("#2858 {binary: true} in allDocs() 1", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc, { _id: "foo" }];
        return db.bulkDocs(docs).then(() => {
            return Promise.all(docs.map((doc) => {
                const atts = doc._attachments;
                const attName = atts && Object.keys(atts)[0];
                const expected = atts && atts[attName];
                return db.allDocs({
                    key: doc._id,
                    attachments: true,
                    binary: true,
                    include_docs: true
                }).then((res) => {
                    assert.lengthOf(res.rows, 1);
                    const savedDoc = res.rows[0].doc;
                    if (!atts) {
                        assert.isUndefined(savedDoc._attachments);
                        return;
                    }
                    const att = savedDoc._attachments[attName];
                    assert.isUndefined(att.stub);
                    assert.exists(att.digest);
                    assert.equal(att.content_type, expected.content_type);
                    assert.isNotString(att.data);
                    assert.equal(att.data.type, expected.content_type);
                    assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                });
            }));
        });
    });

    it("#2858 {binary: true} in allDocs() 2", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc, { _id: "foo" }];
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({
                include_docs: true,
                attachments: true,
                binary: true
            }).then((res) => {
                const savedDocs = res.rows.map((x) => {
                    return x.doc;
                });
                return Promise.all(docs.map((doc) => {
                    const atts = doc._attachments;
                    const attName = atts && Object.keys(atts)[0];
                    const expected = atts && atts[attName];
                    const savedDoc = savedDocs.filter((x) => {
                        return x._id === doc._id;
                    })[0];
                    if (!atts) {
                        assert.isUndefined(savedDoc._attachments);
                        return;
                    }
                    const att = savedDoc._attachments[attName];
                    assert.isUndefined(att.stub);
                    assert.exists(att.digest);
                    assert.equal(att.content_type, expected.content_type);
                    assert.isNotString(att.data);
                    assert.equal(att.data.type, expected.content_type);
                    assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                }));
            });
        });
    });

    it("#2858 {binary: true} in allDocs() 3", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc,
            { _id: "bar" },
            { _id: "foo", _deleted: true }];
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({
                include_docs: true,
                attachments: true,
                binary: true
            }).then((res) => {
                assert.lengthOf(res.rows, 4);
                const savedDocs = res.rows.map((x) => {
                    return x.doc;
                });
                return Promise.all(docs.filter((doc) => {
                    return !doc._deleted;
                }).map((doc) => {
                    const atts = doc._attachments;
                    const attName = atts && Object.keys(atts)[0];
                    const expected = atts && atts[attName];
                    const savedDoc = savedDocs.filter((x) => {
                        return x._id === doc._id;
                    })[0];
                    if (!atts) {
                        assert.isUndefined(savedDoc._attachments);
                        return;
                    }
                    const att = savedDoc._attachments[attName];
                    assert.isUndefined(att.stub);
                    assert.exists(att.digest);
                    assert.equal(att.content_type, expected.content_type);
                    assert.isNotString(att.data);
                    assert.equal(att.data.type, expected.content_type);
                    assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                }));
            });
        });
    });

    it("#2858 {binary: true} in allDocs() 4", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc,
            { _id: "bar" },
            { _id: "foo", _deleted: true }];
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({
                attachments: true,
                binary: true
            }).then((res) => {
                assert.lengthOf(res.rows, 4);
                res.rows.forEach((row) => {
                    assert.isUndefined(row.doc);
                });
                return db.allDocs({
                    binary: true
                });
            }).then((res) => {
                assert.lengthOf(res.rows, 4);
                res.rows.forEach((row) => {
                    assert.isUndefined(row.doc);
                });
            });
        });
    });

    it("#2858 {binary: true} in allDocs() 5", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc,
            { _id: "bar" },
            { _id: "foo", deleted: true }];
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({
                keys: [
                    binAttDoc._id, binAttDoc2._id, pngAttDoc._id, "foo", "bar"
                ],
                attachments: true,
                binary: true,
                include_docs: true
            }).then((res) => {
                assert.lengthOf(res.rows, 5);

                return Promise.all(res.rows.map((row, i) => {
                    if (docs[i]._deleted) {
                        assert.isUndefined(row.doc);
                        return;
                    }
                    const atts = docs[i]._attachments;
                    const attName = atts && Object.keys(atts)[0];
                    const expected = atts && atts[attName];
                    const savedDoc = row.doc;
                    if (!atts) {
                        assert.isUndefined(savedDoc._attachments);
                        return;
                    }
                    const att = savedDoc._attachments[attName];
                    assert.isUndefined(att.stub);
                    assert.exists(att.digest);
                    assert.equal(att.content_type, expected.content_type);
                    assert.isNotString(att.data);
                    assert.equal(att.data.type, expected.content_type);
                    assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                }));
            });
        });
    });

    it("#2858 {binary: true} in allDocs(), many atts", () => {
        const db = new DB(dbName);
        const docs = [
            {
                _id: "baz", _attachments: {
                    "text1.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text1")
                    },
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    }
                }
            },
            {
                _id: "foo", _attachments: {
                    "text5.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text5")
                    }
                }
            },
            {
                _id: "quux", _attachments: {
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    },
                    "text4.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text4")
                    }
                }
            },
            {
                _id: "zob", _attachments: {
                    "text6.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            },
            {
                _id: "zorb", _attachments: {
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    },
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            }
        ];
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({
                attachments: true,
                binary: true,
                include_docs: true
            }).then((res) => {
                assert.lengthOf(res.rows, 5);

                return Promise.all(res.rows.map((row) => {
                    const doc = docs.filter((x) => {
                        return x._id === row.id;
                    })[0];
                    const atts = doc._attachments;
                    const attNames = Object.keys(atts);
                    return Promise.all(attNames.map((attName) => {
                        const expected = atts && atts[attName];
                        const savedDoc = row.doc;
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                    }));
                }));
            });
        });
    });

    it("#2858 {binary: true} in allDocs(), mixed atts", () => {
        const db = new DB(dbName);
        const docs = [
            {
                _id: "baz", _attachments: {
                    "text1.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text1")
                    },
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    }
                }
            },
            {
                _id: "foo", _attachments: {
                    "text5.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text5")
                    }
                }
            },
            { _id: "imdeleted", _deleted: true },
            {
                _id: "quux", _attachments: {
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    },
                    "text4.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text4")
                    }
                }
            },
            { _id: "imempty" },
            {
                _id: "zob", _attachments: {
                    "text6.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            },

            { _id: "imempty2" },
            {
                _id: "zorb", _attachments: {
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    },
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            },
            {
                _id: "imkindaempty", _attachments: {
                    "text0.txt": {
                        content_type: "text/plain",
                        data: ""
                    }
                }
            }
        ];
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({
                attachments: true,
                binary: true,
                include_docs: true
            }).then((res) => {
                assert.lengthOf(res.rows, 8);

                return Promise.all(res.rows.map((row) => {
                    const doc = docs.filter((x) => {
                        return x._id === row.id;
                    })[0];
                    if (doc._deleted) {
                        assert.isUndefined(row.doc);
                        return;
                    }
                    const atts = doc._attachments;
                    if (!atts) {
                        assert.isUndefined(row.doc._attachments);
                        return;
                    }
                    const attNames = Object.keys(atts);
                    return Promise.all(attNames.map((attName) => {
                        const expected = atts && atts[attName];
                        const savedDoc = row.doc;
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                    }));
                }));
            });
        });
    });

    it("#2858 {binary: true} in changes() non-live", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc,
            { _id: "bar" },
            { _id: "foo", deleted: true }];
        return db.bulkDocs(docs).then(() => {
            return db.changes({
                attachments: true,
                binary: true,
                include_docs: true
            }).then((res) => {
                assert.lengthOf(res.results, 5);

                return Promise.all(res.results.map((row) => {
                    const doc = docs.filter((x) => {
                        return x._id === row.id;
                    })[0];
                    if (doc._deleted) {
                        assert.isUndefined(row.doc);
                        return;
                    }
                    const atts = doc._attachments;
                    const attName = atts && Object.keys(atts)[0];
                    const expected = atts && atts[attName];
                    const savedDoc = row.doc;
                    if (!atts) {
                        assert.isUndefined(savedDoc._attachments);
                        return;
                    }
                    const att = savedDoc._attachments[attName];
                    assert.isUndefined(att.stub);
                    assert.exists(att.digest);
                    assert.equal(att.content_type, expected.content_type);
                    assert.isNotString(att.data);
                    assert.equal(att.data.type, expected.content_type);
                    assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                }));
            });
        });
    });

    it("#2858 {binary: true} in changes() non-live, many atts", () => {
        const db = new DB(dbName);
        const docs = [
            {
                _id: "baz", _attachments: {
                    "text1.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text1")
                    },
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    }
                }
            },
            {
                _id: "foo", _attachments: {
                    "text5.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text5")
                    }
                }
            },
            {
                _id: "quux", _attachments: {
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    },
                    "text4.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text4")
                    }
                }
            },
            {
                _id: "zob", _attachments: {
                    "text6.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            },
            {
                _id: "zorb", _attachments: {
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    },
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            }
        ];
        return db.bulkDocs(docs).then(() => {
            return db.changes({
                attachments: true,
                binary: true,
                include_docs: true
            }).then((res) => {
                assert.lengthOf(res.results, 5);

                return Promise.all(res.results.map((row) => {
                    const doc = docs.filter((x) => {
                        return x._id === row.id;
                    })[0];
                    const atts = doc._attachments;
                    const attNames = Object.keys(atts);
                    return Promise.all(attNames.map((attName) => {
                        const expected = atts && atts[attName];
                        const savedDoc = row.doc;
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                    }));
                }));
            });
        });
    });

    it("#2858 {binary: true} in changes() non-live, mixed atts", () => {
        const db = new DB(dbName);
        const docs = [
            {
                _id: "baz", _attachments: {
                    "text1.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text1")
                    },
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    }
                }
            },
            {
                _id: "foo", _attachments: {
                    "text5.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text5")
                    }
                }
            },
            { _id: "imdeleted", _deleted: true },
            {
                _id: "quux", _attachments: {
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    },
                    "text4.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text4")
                    }
                }
            },
            { _id: "imempty" },
            {
                _id: "zob", _attachments: {
                    "text6.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            },

            { _id: "imempty2" },
            {
                _id: "zorb", _attachments: {
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    },
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            },
            {
                _id: "imkindaempty", _attachments: {
                    "text0.txt": {
                        content_type: "text/plain",
                        data: ""
                    }
                }
            }
        ];
        return db.bulkDocs(docs).then(() => {
            return db.changes({
                attachments: true,
                binary: true,
                include_docs: true
            }).then((res) => {
                assert.lengthOf(res.results, 9);

                return Promise.all(res.results.map((row) => {
                    const doc = docs.filter((x) => {
                        return x._id === row.id;
                    })[0];
                    const atts = doc._attachments;
                    if (!atts) {
                        assert.isUndefined(row.doc._attachments);
                        return;
                    }
                    const attNames = Object.keys(atts);
                    return Promise.all(attNames.map((attName) => {
                        const expected = atts && atts[attName];
                        const savedDoc = row.doc;
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                    }));
                }));
            });
        });
    });

    it("#2858 {binary: true} non-live changes, complete event", () => {
        const db = new DB(dbName);
        const docs = [
            {
                _id: "baz", _attachments: {
                    "text1.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text1")
                    },
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    }
                }
            },
            {
                _id: "foo", _attachments: {
                    "text5.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text5")
                    }
                }
            },
            { _id: "imdeleted", _deleted: true },
            {
                _id: "quux", _attachments: {
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    },
                    "text4.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text4")
                    }
                }
            },
            { _id: "imempty" },
            {
                _id: "zob", _attachments: {
                    "text6.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            },

            { _id: "imempty2" },
            {
                _id: "zorb", _attachments: {
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    },
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            },
            {
                _id: "imkindaempty", _attachments: {
                    "text0.txt": {
                        content_type: "text/plain",
                        data: ""
                    }
                }
            }
        ];
        return db.bulkDocs(docs).then(() => {
            return new Promise((resolve, reject) => {
                db.changes({
                    attachments: true,
                    binary: true,
                    include_docs: true
                }).on("error", reject).on("complete", resolve);
            }).then((results) => {
                return Promise.all(results.results.map((row) => {
                    const doc = docs.filter((x) => {
                        return x._id === row.id;
                    })[0];
                    if (row.deleted) {
                        assert.isUndefined(row.doc._attachments);
                        return;
                    }
                    const atts = doc._attachments;
                    const savedDoc = row.doc;
                    if (!atts) {
                        assert.isUndefined(savedDoc._attachments);
                        return;
                    }
                    const attNames = Object.keys(atts);
                    return Promise.all(attNames.map((attName) => {
                        const expected = atts && atts[attName];
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                    }));
                }));
            });
        });
    });

    it("#2858 {binary: true} in live changes", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc,
            { _id: "bar" },
            { _id: "foo", deleted: true }];
        return db.bulkDocs(docs).then(() => {
            return new Promise((resolve, reject) => {
                let changes = 0;
                const handleChange = (change) => {
                    changes++;
                    promise = promise.then(() => {
                        const doc = docs.filter((x) => {
                            return x._id === change.id;
                        })[0];
                        if (change.deleted) {
                            assert.isUndefined(change.doc);
                            return doneWithDoc();
                        }
                        const atts = doc._attachments;
                        const attName = atts && Object.keys(atts)[0];
                        const expected = atts && atts[attName];
                        const savedDoc = change.doc;
                        if (!atts) {
                            assert.isUndefined(savedDoc._attachments);
                            return doneWithDoc();
                        }
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                        doneWithDoc();
                    }).catch(reject);
                };
                const ret = db.changes({
                    attachments: true,
                    binary: true,
                    include_docs: true,
                    live: true
                }).on("error", reject)
                    .on("change", handleChange)
                    .on("complete", resolve);

                let promise = Promise.resolve();
                let done = 0;

                const doneWithDoc = () => {
                    if (++done === 5 && changes === 5) {
                        ret.cancel();
                    }
                };
            });
        });
    });

    it("#2858 {binary: true} in live changes, mixed atts", () => {
        const db = new DB(dbName);
        const docs = [
            {
                _id: "baz", _attachments: {
                    "text1.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text1")
                    },
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    }
                }
            },
            {
                _id: "foo", _attachments: {
                    "text5.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text5")
                    }
                }
            },
            { _id: "imdeleted", _deleted: true },
            {
                _id: "quux", _attachments: {
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    },
                    "text4.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text4")
                    }
                }
            },
            { _id: "imempty" },
            {
                _id: "zob", _attachments: {
                    "text6.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            },

            { _id: "imempty2" },
            {
                _id: "zorb", _attachments: {
                    "text2.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text2")
                    },
                    "text3.txt": {
                        content_type: "text/plain",
                        data: util.btoa("text3")
                    }
                }
            },
            {
                _id: "imkindaempty", _attachments: {
                    "text0.txt": {
                        content_type: "text/plain",
                        data: ""
                    }
                }
            }
        ];
        return db.bulkDocs(docs).then(() => {
            return new Promise((resolve, reject) => {
                let changes = 0;
                const handleChange = (change) => {
                    changes++;
                    promise = promise.then(() => {
                        const doc = docs.filter((x) => {
                            return x._id === change.id;
                        })[0];
                        if (change.deleted) {
                            assert.isUndefined(change.doc._attachments);
                            return doneWithDoc();
                        }
                        const atts = doc._attachments;
                        const savedDoc = change.doc;
                        if (!atts) {
                            assert.isUndefined(savedDoc._attachments);
                            return doneWithDoc();
                        }
                        const attNames = Object.keys(atts);
                        return Promise.all(attNames.map((attName) => {
                            const expected = atts && atts[attName];
                            const att = savedDoc._attachments[attName];
                            assert.isUndefined(att.stub);
                            assert.exists(att.digest);
                            assert.equal(att.content_type, expected.content_type);
                            assert.isNotString(att.data);
                            assert.equal(att.data.type, expected.content_type);
                            assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                        })).then(doneWithDoc);
                    }).catch(reject);
                };
                const ret = db.changes({
                    attachments: true,
                    binary: true,
                    include_docs: true,
                    live: true
                }).on("error", reject)
                    .on("change", handleChange)
                    .on("complete", resolve);

                let promise = Promise.resolve();
                let done = 0;

                const doneWithDoc = () => {
                    if (++done === 9 && changes === 9) {
                        ret.cancel();
                    }
                };
            });
        });
    });

    it("#2858 {binary: true} in live+retry changes", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc,
            { _id: "bar" },
            { _id: "foo", deleted: true }];
        return db.bulkDocs(docs).then(() => {
            return new Promise((resolve, reject) => {
                let changes = 0;
                const handleChange = (change) => {
                    changes++;
                    promise = promise.then(() => {
                        const doc = docs.filter((x) => {
                            return x._id === change.id;
                        })[0];
                        if (change.deleted) {
                            assert.isUndefined(change.doc);
                            return doneWithDoc();
                        }
                        const atts = doc._attachments;
                        const attName = atts && Object.keys(atts)[0];
                        const expected = atts && atts[attName];
                        const savedDoc = change.doc;
                        if (!atts) {
                            assert.isUndefined(savedDoc._attachments);
                            return doneWithDoc();
                        }
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        assert.equal(util.btoa(att.data.toString("binary")), expected.data);
                        doneWithDoc();
                    }).catch(reject);
                };

                const ret = db.changes({
                    attachments: true,
                    binary: true,
                    include_docs: true,
                    live: true
                }).on("error", reject)
                    .on("change", handleChange)
                    .on("complete", resolve);

                let promise = Promise.resolve();
                let done = 0;

                const doneWithDoc = () => {
                    if (++done === 5 && changes === 5) {
                        ret.cancel();
                    }
                };
            });
        });
    });

    it("#2858 {binary: true} in live changes, attachments:false", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc,
            { _id: "bar" },
            { _id: "foo", deleted: true }];
        return db.bulkDocs(docs).then(() => {
            return new Promise((resolve, reject) => {
                const ret = db.changes({
                    include_docs: true,
                    binary: true,
                    live: true
                }).on("error", reject)
                    .on("change", handleChange)
                    .on("complete", resolve);

                let promise = Promise.resolve();
                let done = 0;

                function doneWithDoc() {
                    if (++done === 5 && changes === 5) {
                        ret.cancel();
                    }
                }

                var changes = 0;
                function handleChange(change) {
                    changes++;
                    promise = promise.then(() => {
                        const doc = docs.filter((x) => {
                            return x._id === change.id;
                        })[0];
                        if (change.deleted) {
                            assert.isUndefined(change.doc);
                            return doneWithDoc();
                        }
                        const atts = doc._attachments;
                        const attName = atts && Object.keys(atts)[0];
                        const expected = atts && atts[attName];
                        const savedDoc = change.doc;
                        if (!atts) {
                            assert.isUndefined(savedDoc._attachments);
                            return doneWithDoc();
                        }
                        const att = savedDoc._attachments[attName];
                        assert.equal(att.stub, true);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isUndefined(att.data);
                        doneWithDoc();
                    }).catch(reject);
                }
            });
        });
    });

    it("#2858 {binary: true} in live changes, include_docs:false", () => {
        const db = new DB(dbName);
        const docs = [binAttDoc, binAttDoc2, pngAttDoc,
            { _id: "bar" },
            { _id: "foo", deleted: true }];
        return db.bulkDocs(docs).then(() => {
            return new Promise((resolve, reject) => {
                const ret = db.changes({
                    attachments: true,
                    binary: true,
                    live: true
                }).on("error", reject)
                    .on("change", handleChange)
                    .on("complete", resolve);

                let promise = Promise.resolve();
                let done = 0;

                function doneWithDoc() {
                    if (++done === 5 && changes === 5) {
                        ret.cancel();
                    }
                }

                var changes = 0;
                function handleChange(change) {
                    changes++;
                    promise = promise.then(() => {
                        assert.isUndefined(change.doc);
                        return doneWithDoc();
                    }).catch(reject);
                }
            });
        });
    });

    it("Measures length correctly after put()", () => {
        const db = new DB(dbName);
        return db.put(binAttDoc).then(() => {
            return db.get(binAttDoc._id);
        }).then((doc) => {
            delete doc._attachments["foo.txt"].revpos;

            // because of libicu vs. ascii
            const digest = doc._attachments["foo.txt"].digest;
            const validDigests = [
                "md5-qUUYqS41RhwF0TrCsTAxFg==",
                "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
                "md5-jeLnIuUvK7d+6gya044lVA=="
            ];
            assert.notEqual(validDigests.indexOf(digest), -1, `expected ${digest} to be in: ${JSON.stringify(validDigests)}`);
            delete doc._attachments["foo.txt"].digest;
            assert.deepEqual(doc._attachments, {
                "foo.txt": {
                    content_type: "text/plain",
                    stub: true,
                    length: 29
                }
            });
        });
    });

    it("#3074 non-live changes()", () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 5; i++) {
            docs.push({
                _id: i.toString(),
                _attachments: {
                    "foo.png": {
                        data: icons[i],
                        content_type: "image/png"
                    }
                }
            });
        }
        return db.bulkDocs(docs).then(() => {
            return db.changes({ include_docs: true, attachments: true });
        }).then((res) => {
            const attachments = res.results.sort((left, right) => {
                return left.id < right.id ? -1 : 1;
            }).map((change) => {
                const doc = change.doc;
                delete doc._attachments["foo.png"].revpos;
                return doc._attachments;
            });
            assert.deepEqual(attachments, icons.map((icon, i) => {
                return {
                    "foo.png": {
                        content_type: "image/png",
                        data: icon,
                        digest: iconDigests[i]
                    }
                };
            }), "when attachments=true");
            return db.changes({ include_docs: true });
        }).then((res) => {
            const attachments = res.results.sort((left, right) => {
                return left.id < right.id ? -1 : 1;
            }).map((change) => {
                const doc = change.doc;
                delete doc._attachments["foo.png"].revpos;
                return doc._attachments["foo.png"];
            });
            assert.deepEqual(attachments, icons.map((icon, i) => {
                return {
                    content_type: "image/png",
                    stub: true,
                    digest: iconDigests[i],
                    length: iconLengths[i]
                };
            }), "when attachments=false");
            return db.changes({ attachments: true });
        }).then((res) => {
            assert.lengthOf(res.results, 5);
            res.results.forEach((row) => {
                assert.isUndefined(row.doc,
                    "no doc when attachments=true but include_docs=false");
            });
            return db.changes();
        }).then((res) => {
            assert.lengthOf(res.results, 5);
            res.results.forEach((row) => {
                assert.isUndefined(row.doc,
                    "no doc when attachments=false and include_docs=false");
            });
        });
    });

    it("#3074 live changes()", () => {
        const db = new DB(dbName);

        function liveChangesPromise(opts) {
            opts.live = true;
            return new Promise((resolve, reject) => {
                const retChanges = { results: [] };
                var changes = db.changes(opts)
                    .on("change", (change) => {
                        retChanges.results.push(change);
                        if (retChanges.results.length === 5) {
                            changes.cancel();
                            resolve(retChanges);
                        }
                    }).on("error", reject);
            });
        }

        const docs = [];
        for (let i = 0; i < 5; i++) {
            docs.push({
                _id: i.toString(),
                _attachments: {
                    "foo.png": {
                        data: icons[i],
                        content_type: "image/png"
                    }
                }
            });
        }
        return db.bulkDocs(docs).then(() => {
            return liveChangesPromise({
                include_docs: true,
                attachments: true
            });
        }).then((res) => {
            const attachments = res.results.sort((left, right) => {
                return left.id < right.id ? -1 : 1;
            }).map((change) => {
                const doc = change.doc;
                delete doc._attachments["foo.png"].revpos;
                return doc._attachments;
            });
            assert.deepEqual(attachments, icons.map((icon, i) => {
                return {
                    "foo.png": {
                        content_type: "image/png",
                        data: icon,
                        digest: iconDigests[i]
                    }
                };
            }), "when attachments=true");
            return liveChangesPromise({ include_docs: true });
        }).then((res) => {
            const attachments = res.results.sort((left, right) => {
                return left.id < right.id ? -1 : 1;
            }).map((change) => {
                const doc = change.doc;
                delete doc._attachments["foo.png"].revpos;
                return doc._attachments["foo.png"];
            });
            assert.deepEqual(attachments, icons.map((icon, i) => {
                return {
                    content_type: "image/png",
                    stub: true,
                    digest: iconDigests[i],
                    length: iconLengths[i]
                };
            }), "when attachments=false");
            return liveChangesPromise({ attachments: true });
        }).then((res) => {
            assert.lengthOf(res.results, 5);
            res.results.forEach((row) => {
                assert.isUndefined(row.doc,
                    "no doc when attachments=true but include_docs=false");
            });
            return liveChangesPromise({});
        }).then((res) => {
            assert.lengthOf(res.results, 5);
            res.results.forEach((row) => {
                assert.isUndefined(row.doc,
                    "no doc when attachments=false and include_docs=false");
            });
        });
    });

    it("#3074 non-live changes(), no attachments", () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 5; i++) {
            docs.push({
                _id: i.toString()
            });
        }
        return db.bulkDocs(docs).then(() => {
            return db.changes({ include_docs: true, attachments: true });
        }).then((res) => {
            const attachments = res.results.sort((left, right) => {
                return left.id < right.id ? -1 : 1;
            }).map((change) => {
                const doc = change.doc;
                return Boolean(doc._attachments);
            });
            assert.deepEqual(attachments, icons.map(() => {
                return false;
            }), "when attachments=true");
            return db.changes({ include_docs: true });
        }).then((res) => {
            const attachments = res.results.sort((left, right) => {
                return left.id < right.id ? -1 : 1;
            }).map((change) => {
                const doc = change.doc;
                return Boolean(doc._attachments);
            });
            assert.deepEqual(attachments, icons.map(() => {
                return false;
            }), "when attachments=false");
            return db.changes({ attachments: true });
        }).then((res) => {
            assert.lengthOf(res.results, 5);
            res.results.forEach((row) => {
                assert.isUndefined(row.doc,
                    "no doc when attachments=true but include_docs=false");
            });
            return db.changes();
        }).then((res) => {
            assert.lengthOf(res.results, 5);
            res.results.forEach((row) => {
                assert.isUndefined(row.doc,
                    "no doc when attachments=false and include_docs=false");
            });
        });
    });

    it("#3074 live changes(), no attachments", () => {

        const db = new DB(dbName);

        function liveChangesPromise(opts) {
            opts.live = true;
            return new Promise((resolve, reject) => {
                const retChanges = { results: [] };
                var changes = db.changes(opts)
                    .on("change", (change) => {
                        retChanges.results.push(change);
                        if (retChanges.results.length === 5) {
                            changes.cancel();
                            resolve(retChanges);
                        }
                    }).on("error", reject);
            });
        }

        const docs = [];
        for (let i = 0; i < 5; i++) {
            docs.push({
                _id: i.toString()
            });
        }
        return db.bulkDocs(docs).then(() => {
            return liveChangesPromise({
                include_docs: true,
                attachments: true
            });
        }).then((res) => {
            const attachments = res.results.sort((left, right) => {
                return left.id < right.id ? -1 : 1;
            }).map((change) => {
                const doc = change.doc;
                return Boolean(doc._attachments);
            });
            assert.deepEqual(attachments, icons.map(() => {
                return false;
            }), "when attachments=true");
            return liveChangesPromise({ include_docs: true });
        }).then((res) => {
            const attachments = res.results.sort((left, right) => {
                return left.id < right.id ? -1 : 1;
            }).map((change) => {
                const doc = change.doc;
                return Boolean(doc._attachments);
            });
            assert.deepEqual(attachments, icons.map(() => {
                return false;
            }), "when attachments=false");
            return liveChangesPromise({ attachments: true });
        }).then((res) => {
            assert.lengthOf(res.results, 5);
            res.results.forEach((row) => {
                assert.isUndefined(row.doc,
                    "no doc when attachments=true but include_docs=false");
            });
            return liveChangesPromise({});
        }).then((res) => {
            assert.lengthOf(res.results, 5);
            res.results.forEach((row) => {
                assert.isUndefined(row.doc,
                    "no doc when attachments=false and include_docs=false");
            });
        });
    });

    it("#3881 filter extraneous keys from _attachments", () => {
        const db = new DB(dbName);
        return db.put({
            _id: "foo",
            _attachments: {
                "foo.txt": {
                    data: "",
                    content_type: "text/plain",
                    follows: false,
                    foo: "bar",
                    baz: true,
                    quux: 1
                }
            }
        }).then(() => {
            return db.get("foo", { attachments: true });
        }).then((doc) => {
            const keys = Object.keys(doc._attachments["foo.txt"]).filter((x) => {
                return x !== "revpos"; // not supported by PouchDB right now
            }).sort();
            assert.deepEqual(keys, ["content_type", "data", "digest"]);
        });
    });

    it("#2771 allDocs() 1, single attachment", () => {
        const db = new DB(dbName);
        return db.put(binAttDoc).then(() => {
            return db.allDocs({ key: binAttDoc._id, include_docs: true });
        }).then((res) => {
            const doc = res.rows[0].doc;
            delete doc._attachments["foo.txt"].revpos;

            // because of libicu vs. ascii
            const digest = doc._attachments["foo.txt"].digest;
            const validDigests = [
                "md5-qUUYqS41RhwF0TrCsTAxFg==",
                "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
                "md5-jeLnIuUvK7d+6gya044lVA=="
            ];
            assert.notEqual(validDigests.indexOf(digest), -1,
                `expected ${digest} to be in: ${
                JSON.stringify(validDigests)}`);
            delete doc._attachments["foo.txt"].digest;
            assert.deepEqual(doc._attachments, {
                "foo.txt": {
                    content_type: "text/plain",
                    stub: true,
                    length: 29
                }
            });
            return db.allDocs({
                key: binAttDoc._id,
                include_docs: true,
                attachments: true
            });
        }).then((res) => {
            const doc = res.rows[0].doc;
            assert.equal(doc._attachments["foo.txt"].content_type, binAttDoc._attachments["foo.txt"].content_type);
            assert.equal(doc._attachments["foo.txt"].data, binAttDoc._attachments["foo.txt"].data);
        });
    });

    it("#2771 allDocs() 2, many docs same att", () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 5; i++) {
            docs.push({
                _id: i.toString(),
                _attachments: {
                    "foo.txt": {
                        data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=",
                        content_type: "text/plain"
                    }
                }
            });
        }
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({ include_docs: true, attachments: true });
        }).then((res) => {
            const attachments = res.rows.map((row) => {
                const doc = row.doc;
                delete doc._attachments["foo.txt"].revpos;
                assert.exists(doc._attachments["foo.txt"].digest);
                delete doc._attachments["foo.txt"].digest;
                return doc._attachments;
            });
            assert.deepEqual(attachments, [1, 2, 3, 4, 5].map(() => {
                return {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                    }
                };
            }));
        });
    });

    it("#2771 allDocs() 3, many docs diff atts", () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 5; i++) {
            docs.push({
                _id: i.toString(),
                _attachments: {
                    "foo.png": {
                        data: icons[i],
                        content_type: "image/png"
                    }
                }
            });
        }
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({ include_docs: true, attachments: true });
        }).then((res) => {
            const attachments = res.rows.map((row) => {
                const doc = row.doc;
                delete doc._attachments["foo.png"].revpos;
                return doc._attachments;
            });
            assert.deepEqual(attachments, icons.map((icon, i) => {
                return {
                    "foo.png": {
                        content_type: "image/png",
                        data: icon,
                        digest: iconDigests[i]
                    }
                };
            }));
            return db.allDocs({ include_docs: true });
        }).then((res) => {
            const attachments = res.rows.map((row) => {
                const doc = row.doc;
                delete doc._attachments["foo.png"].revpos;
                return doc._attachments["foo.png"];
            });
            assert.deepEqual(attachments, icons.map((icon, i) => {
                return {
                    content_type: "image/png",
                    stub: true,
                    digest: iconDigests[i],
                    length: iconLengths[i]
                };
            }));
        });
    });

    it("#2771 allDocs() 4, mix of atts and no atts", () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 5; i++) {
            const doc = {
                _id: i.toString()
            };
            if (i % 2 === 1) {
                doc._attachments = {
                    "foo.png": {
                        data: icons[i],
                        content_type: "image/png"
                    }
                };
            }
            docs.push(doc);
        }
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({ include_docs: true, attachments: true });
        }).then((res) => {
            const attachments = res.rows.map((row, i) => {
                const doc = row.doc;
                if (i % 2 === 1) {
                    delete doc._attachments["foo.png"].revpos;
                    return doc._attachments;
                }
                return null;
            });
            assert.deepEqual(attachments, icons.map((icon, i) => {
                if (i % 2 === 0) {
                    return null;
                }
                return {
                    "foo.png": {
                        content_type: "image/png",
                        data: icon,
                        digest: iconDigests[i]
                    }
                };
            }));
            return db.allDocs({ include_docs: true });
        }).then((res) => {
            const attachments = res.rows.map((row, i) => {
                const doc = row.doc;
                if (i % 2 === 1) {
                    delete doc._attachments["foo.png"].revpos;
                    return doc._attachments["foo.png"];
                }
                return null;
            });
            assert.deepEqual(attachments, icons.map((icon, i) => {
                if (i % 2 === 0) {
                    return null;
                }
                return {
                    content_type: "image/png",
                    stub: true,
                    digest: iconDigests[i],
                    length: iconLengths[i]
                };
            }));
        });
    });

    it("#2771 allDocs() 5, no atts", () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 5; i++) {
            const doc = {
                _id: i.toString()
            };
            docs.push(doc);
        }
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({ include_docs: true, attachments: true });
        }).then((res) => {
            assert.lengthOf(res.rows, 5);
            res.rows.forEach((row) => {
                assert.exists(row.doc);
                assert.isUndefined(row.doc._attachments);
            });
            return db.allDocs({ include_docs: true });
        }).then((res) => {
            assert.lengthOf(res.rows, 5);
            res.rows.forEach((row) => {
                assert.exists(row.doc);
                assert.isUndefined(row.doc._attachments);
            });
        });
    });

    it("#2771 allDocs() 6, no docs", () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 5; i++) {
            const doc = {
                _id: i.toString()
            };
            docs.push(doc);
        }
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({
                include_docs: true,
                attachments: true,
                keys: []
            });
        }).then((res) => {
            assert.lengthOf(res.rows, 0);
            return db.allDocs({ include_docs: true, keys: [] });
        }).then((res) => {
            assert.lengthOf(res.rows, 0);
        });
    });

    it("#2771 allDocs() 7, revisions and deletions", () => {
        const db = new DB(dbName, { auto_compaction: false });
        const doc = {
            _id: "doc",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "Zm9vYmFy" // 'foobar'
                }
            }
        };
        let rev;
        return db.put(doc).then(() => {
            return db.allDocs({ keys: ["doc"], attachments: true, include_docs: true });
        }).then((res) => {
            const doc = res.rows[0].doc;
            assert.equal(doc._attachments["foo.txt"].data, "Zm9vYmFy");
            rev = doc._rev;
            doc._attachments["foo.txt"] = {
                content_type: "text/plain",
                data: "dG90bw=="
            }; // 'toto'
            return db.put(doc);
        }).then(() => {
            return db.allDocs({ keys: ["doc"], attachments: true, include_docs: true });
        }).then((res) => {
            const doc = res.rows[0].doc;
            assert.equal(doc._attachments["foo.txt"].data, "dG90bw==");
            return db.remove(doc);
        }).then((res) => {
            rev = res.rev;
            return db.allDocs({ keys: ["doc"], attachments: true, include_docs: true });
        }).then((res) => {
            // technically CouchDB sets this to null, but we won't adhere strictly to that
            assert.isNull(res.rows[0].doc);
            delete res.rows[0].doc;
            assert.deepEqual(res.rows, [
                {
                    id: "doc",
                    key: "doc",
                    value: {
                        rev,
                        deleted: true
                    }
                }
            ]);
        });
    });

    it("#2771 allDocs() 8, empty attachment", () => {
        const db = new DB(dbName);
        return db.put(binAttDoc2).then(() => {
            return db.allDocs({ key: binAttDoc2._id, include_docs: true });
        }).then((res) => {
            const doc = res.rows[0].doc;
            delete doc._attachments["foo.txt"].revpos;

            // because of libicu vs. ascii
            const digest = doc._attachments["foo.txt"].digest;
            const validDigests = [
                "md5-1B2M2Y8AsgTpgAmY7PhCfg==",
                "md5-cCkGbCesb17xjWYNV0GXmg==",
                "md5-3gIs+o2eJiHrXZqziQZqBA=="
            ];
            assert.notEqual(validDigests.indexOf(digest), -1,
                `expected ${digest} to be in: ${
                JSON.stringify(validDigests)}`);
            delete doc._attachments["foo.txt"].digest;
            delete doc._attachments["foo.txt"].digest;
            assert.deepEqual(doc._attachments, {
                "foo.txt": {
                    content_type: "text/plain",
                    stub: true,
                    length: 0
                }
            });
            return db.allDocs({
                key: binAttDoc2._id,
                include_docs: true,
                attachments: true
            });
        }).then((res) => {
            const doc = res.rows[0].doc;
            assert.equal(doc._attachments["foo.txt"].content_type,
                binAttDoc2._attachments["foo.txt"].content_type);
            assert.equal(doc._attachments["foo.txt"].data,
                binAttDoc2._attachments["foo.txt"].data);
        });
    });

    it("No length for non-stubs", () => {
        const db = new DB(dbName);
        return db.put(binAttDoc).then(() => {
            return db.get(binAttDoc._id, { attachments: true });
        }).then((doc) => {
            assert.isUndefined(doc._attachments["foo.txt"].stub);
            assert.isUndefined(doc._attachments["foo.txt"].length);
        });
    });

    it("Test some attachments", async () => {
        const db = new DB(dbName);
        await db.put(binAttDoc);
        const doc = await db.get("bin_doc");
        assert.exists(doc._attachments, "doc has attachments field");
        assert.exists(doc._attachments["foo.txt"], "doc has attachment");
        assert.equal(doc._attachments["foo.txt"].content_type, "text/plain");
        let res = await db.getAttachment("bin_doc", "foo.txt");
        assert.equal(res.type, "text/plain");
        let resData = res.toString("binary");
        assert.equal(resData, "This is a base64 encoded text");
        let rev = await db.put(binAttDoc2);
        res = await db.getAttachment("bin_doc2", "foo.txt");
        assert.equal(res.type, "text/plain");
        resData = res.toString("binary");
        assert.equal(resData, "", "Correct data returned");
        rev = rev.rev;

        const blob = Buffer.from("This is no base64 encoded text", "binary");
        const info = await db.putAttachment("bin_doc2", "foo2.txt", rev, blob, "text/plain");
        assert.equal(info.ok, true);
        res = await db.getAttachment("bin_doc2", "foo2.txt");
        assert.equal(res.type, "text/plain");
        resData = res.toString("binary");
        assert.exists(resData);
        res = await db.get("bin_doc2", { attachments: true });
        assert.exists(res._attachments, "Result has attachments field");
        assert.notExists(res._attachments["foo2.txt"].stub, "stub is false");
        assert.equal(res._attachments["foo2.txt"].data, "VGhpcyBpcyBubyBiYXNlNjQgZW5jb2RlZCB0ZXh0");
        assert.equal(res._attachments["foo2.txt"].content_type, "text/plain");
        assert.equal(res._attachments["foo.txt"].data, "");
    });

    it("Test getAttachment", async () => {
        const db = new DB(dbName);
        await db.put(binAttDoc);
        const res = await db.getAttachment("bin_doc", "foo.txt");
        assert.equal(res.type, "text/plain");
        const resData = res.toString("binary");
        assert.equal(resData, "This is a base64 encoded text", "correct data");
    });

    it("Test getAttachment with stubs", () => {
        const db = new DB(dbName);
        return db.put({
            _id: "doc",
            _attachments: {
                1: {
                    content_type: "application/octet-stream",
                    data: util.btoa("1\u00002\u00013\u0002")
                }
            }
        }).then(() => {
            return db.get("doc");
        }).then((doc) => {
            doc._attachments["2"] = {
                content_type: "application/octet-stream",
                data: util.btoa("3\u00002\u00011\u0002")
            };
            return db.put(doc);
        }).then(() => {
            return db.getAttachment("doc", "1");
        }).then((att) => {
            assert.equal(att.type, "application/octet-stream");
            return att.toString("binary");
        }).then((bin) => {
            assert.equal(bin, "1\u00002\u00013\u0002");
            return db.getAttachment("doc", "2");
        }).then((att) => {
            assert.equal(att.type, "application/octet-stream");
            return att.toString("binary");
        }).then((bin) => {
            assert.equal(bin, "3\u00002\u00011\u0002");
        });
    });

    it("Test get() with binary:true and stubs", () => {
        const db = new DB(dbName);
        return db.put({
            _id: "doc",
            _attachments: {
                1: {
                    content_type: "application/octet-stream",
                    data: util.btoa("1\u00002\u00013\u0002")
                }
            }
        }).then(() => {
            return db.get("doc");
        }).then((doc) => {
            doc._attachments["2"] = {
                content_type: "application/octet-stream",
                data: util.btoa("3\u00002\u00011\u0002")
            };
            return db.put(doc);
        }).then(() => {
            return db.get("doc", { attachments: true, binary: true });
        }).then((doc) => {
            const att1 = doc._attachments["1"].data;
            const att2 = doc._attachments["2"].data;
            assert.equal(att1.type, "application/octet-stream");
            assert.equal(att2.type, "application/octet-stream");
            assert.equal(att1.toString("binary"), "1\u00002\u00013\u0002");
            assert.equal(att2.toString("binary"), "3\u00002\u00011\u0002");
        });
    });

    it("Test attachments in allDocs/changes", async () => {
        const db = new DB(dbName);
        const docs = [
            { _id: "doc0" },
            {
                _id: "doc1",
                _attachments: {
                    att0: {
                        data: "YXR0YWNobWVudDA=",
                        content_type: "text/plain"
                    }
                }
            },
            {
                _id: "doc2",
                _attachments: {
                    att0: {
                        data: "YXR0YWNobWVudDA=",
                        content_type: "text/plain"
                    },
                    att1: {
                        data: "YXR0YWNobWVudDE=",
                        content_type: "text/plain"
                    }
                }
            },
            {
                _id: "doc3",
                _attachments: {
                    att0: {
                        data: "YXR0YWNobWVudDA=",
                        content_type: "text/plain"
                    }
                }
            }
        ];
        const sort = (a, b) => a.id.localeCompare(b.id);
        await db.bulkDocs({ docs });
        const res = await db.allDocs({ include_docs: true });
        for (let i = 0; i < docs.length; i++) {
            const attachmentsNb = !is.undefined(docs[i]._attachments) ?
                Object.keys(docs[i]._attachments).length : 0;
            for (let j = 0; j < attachmentsNb; j++) {
                assert.equal(res.rows[i].doc._attachments[`att${j}`].stub, true, `(allDocs) doc${i} contains att${j} stub`);
            }
        }
        assert.isUndefined(res.rows[0].doc._attachments, "(allDocs) doc0 contains no attachments");
        await new Promise((resolve) => {
            db.changes({
                include_docs: true
            }).on("change", (change) => {
                const i = Number(change.id.substr(3));
                if (i === 0) {
                    assert.isUndefined(res.rows[0].doc._attachments, "(onChange) doc0 contains no attachments");
                } else {
                    const attachmentsNb =
                        !is.undefined(docs[i]._attachments) ?
                            Object.keys(docs[i]._attachments).length : 0;
                    for (let j = 0; j < attachmentsNb; j++) {
                        assert.equal(res.rows[i].doc._attachments[`att${j}`].stub, true, `(onChange) doc${i} contains att${j} stub`);
                    }
                }
            }).on("complete", (res) => {
                let attachmentsNb = 0;
                res.results.sort(sort);
                for (let i = 0; i < 3; i++) {
                    attachmentsNb = !is.undefined(docs[i]._attachments) ?
                        Object.keys(docs[i]._attachments).length : 0;
                    for (let j = 0; j < attachmentsNb; j++) {
                        assert.equal(res.results[i].doc._attachments[`att${j}`].stub, true, `(complete) doc${i} contains att${j} stub`);
                    }
                }
                assert.isUndefined(res.results[0].doc._attachments, "(complete) doc0 contains no attachments");
                resolve();
            });
        });
    });

    it("Test putAttachment with base64 plaintext", () => {
        const db = new DB(dbName);
        return db.putAttachment("doc", "att", null, "Zm9v", "text/plain").then(() => {
            return db.getAttachment("doc", "att");
        }).then((blob) => {
            assert.equal(util.btoa(blob.toString("binary")), "Zm9v", "should get the correct base64 back");
        });
    });

    it("Test putAttachment with invalid base64", async () => {
        const db = new DB(dbName);
        const err = await assert.throws(async () => db.putAttachment("doc", "att", null, "\u65e5\u672c\u8a9e", "text/plain"));
        expect(err.message).to.equal("Some query argument is invalid");
    });

    it("Test getAttachment with empty text", async () => {
        const db = new DB(dbName);
        await db.put(binAttDoc2);
        const res = await db.getAttachment("bin_doc2", "foo.txt");
        assert.equal((typeof res), "object", "res is object, not a string");
        assert.equal(util.btoa(res), "", "correct data");
        const doc = await db.get(binAttDoc2._id);
        const att = doc._attachments["foo.txt"];
        assert.equal(att.stub, true);
        // both ascii and libicu
        const validDigests = [
            "md5-1B2M2Y8AsgTpgAmY7PhCfg==",
            "md5-cCkGbCesb17xjWYNV0GXmg==",
            "md5-3gIs+o2eJiHrXZqziQZqBA=="
        ];
        assert.isAbove(validDigests.indexOf(att.digest), -1);
        assert.equal(att.content_type, "text/plain");
        assert.equal(att.length, 0);
    });

    it("Test getAttachment with normal text", async () => {
        const db = new DB(dbName);
        await db.put(binAttDoc);
        const res = await db.getAttachment("bin_doc", "foo.txt");
        assert.equal((typeof res), "object", "res is object, not a string");
        assert.equal(util.btoa(res), binAttDoc._attachments["foo.txt"].data, "correct data");
    });

    it("Test getAttachment with PNG", async () => {
        const db = new DB(dbName);
        await db.put(pngAttDoc);
        const res = await db.getAttachment("png_doc", "foo.png");
        assert.equal((typeof res), "object", "res is object, not a string");
        assert.equal(util.btoa(res), pngAttDoc._attachments["foo.png"].data, "correct data");
    });

    it("Test getAttachment with PNG using bulkDocs", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([pngAttDoc]);
        const res = await db.getAttachment("png_doc", "foo.png");
        assert.equal(util.btoa(res), pngAttDoc._attachments["foo.png"].data, "correct data");
    });

    it("Test getAttachment with PNG using post", async () => {
        const db = new DB(dbName);
        await db.post(pngAttDoc);
        const res = await db.getAttachment("png_doc", "foo.png");
        assert.equal(util.btoa(res), pngAttDoc._attachments["foo.png"].data, "correct data");
    });

    it("Test postAttachment with PNG then bulkDocs", async () => {
        const db = new DB(dbName);
        await db.put({ _id: "foo" });
        const doc = await db.get("foo");
        const data = pngAttDoc._attachments["foo.png"].data;
        const blob = util.binaryStringToBuffer(util.atob(data), "image/png");
        await db.putAttachment("foo", "foo.png", doc._rev, blob, "image/png");
        await db.bulkDocs([{}]);
    });

    it("proper stub behavior", () => {
        const db = new DB(dbName);
        return db.put(binAttDoc).then(() => {
            return db.get(binAttDoc._id);
        }).then((doc) => {
            return db.putAttachment(doc._id, "foo.json", doc._rev,
                jsonDoc._attachments["foo.json"].data,
                jsonDoc._attachments["foo.json"].content_type);
        }).then(() => {
            return db.get(binAttDoc._id);
        }).then((doc) => {
            Object.keys(doc._attachments).forEach((filename) => {
                const att = doc._attachments[filename];
                assert.isUndefined(att.data);
                assert.equal(att.stub, true);
                assert.exists(att.digest);
                assert.exists(att.content_type);
            });
            return db.get(binAttDoc._id, { attachments: true });
        }).then((doc) => {
            Object.keys(doc._attachments).forEach((filename) => {
                const att = doc._attachments[filename];
                assert.exists(att.data);
                assert.isUndefined(att.stub);
                assert.exists(att.digest);
                assert.exists(att.content_type);
            });
        });
    });

    it("Testing with invalid docs", async () => {
        const db = new DB(dbName);
        const invalidDoc = {
            _id: "_invalid",
            foo: "bar"
        };
        await assert.throws(async () => {
            await db.bulkDocs({
                docs: [
                    invalidDoc,
                    binAttDoc
                ]
            });
        });
    });

    it("Test create attachment and doc in one go", async () => {
        const db = new DB(dbName);
        const blob = Buffer.from("Mytext");
        const res = await db.putAttachment("anotherdoc", "mytext", blob, "text/plain");
        assert.exists(res.ok);
    });

    it("Test create attachment and doc in one go without callback", (done) => {
        const db = new DB(dbName);
        const changes = db.changes({
            live: true
        }).on("complete", (result) => {
            assert.equal(result.status, "cancelled");
            done();
        }).on("change", (change) => {
            if (change.id === "anotherdoc2") {
                assert.equal(change.id, "anotherdoc2", "Doc has been created");
                db.get(change.id, { attachments: true }, (err, doc) => {
                    assert.isObject(doc._attachments, "doc has attachments object");
                    assert.exists(doc._attachments.mytext, "doc has attachments attachment");
                    assert.equal(doc._attachments.mytext.data, "TXl0ZXh0", "doc has attachments attachment");
                    changes.cancel();
                });
            }
        });
        const blob = Buffer.from("Mytext");
        db.putAttachment("anotherdoc2", "mytext", blob, "text/plain");
    });

    it("Test create attachment without callback", (done) => {
        const db = new DB(dbName);
        db.put({ _id: "anotherdoc3" }).then((resp) => {
            db.info().then((info) => {
                const changes = db.changes({
                    since: info.update_seq,
                    live: true,
                    include_docs: true
                }).on("complete", (result) => {
                    assert.equal(result.status, "cancelled");
                    done();
                }).on("change", (change) => {
                    if (change.id === "anotherdoc3") {
                        db.get(change.id, { attachments: true }).then((doc) => {
                            assert.isObject(doc._attachments, "object", "doc has attachments object");
                            assert.exists(doc._attachments.mytext);
                            assert.equal(doc._attachments.mytext.data, "TXl0ZXh0");
                            changes.cancel();
                        });
                    }
                });
                const blob = Buffer.from("Mytext");
                db.putAttachment("anotherdoc3", "mytext", resp.rev, blob, "text/plain");
            });
        });
    });

    it("Test put attachment on a doc without attachments", async () => {
        const db = new DB(dbName);
        const resp = await db.put({ _id: "mydoc" });
        const blob = Buffer.from("Mytext");
        const res = await db.putAttachment("mydoc", "mytext", resp.rev, blob, "text/plain");
        assert.exists(res.ok);
    });

    it("Test put attachment with unencoded name", async () => {
        const db = new DB(dbName);
        const resp = await db.put({ _id: "mydoc" });
        const blob = Buffer.from("Mytext");
        let res = await db.putAttachment("mydoc", "my/text?@", resp.rev, blob, "text/plain");
        assert.exists(res.ok);
        res = await db.get("mydoc", { attachments: true });
        assert.exists(res._attachments["my/text?@"]);
        const attachment = await db.getAttachment("mydoc", "my/text?@");
        assert.equal(attachment.type, "text/plain");
        const data = attachment.toString("binary");
        assert.equal(data, "Mytext");
    });

    it("3963 length property on stubs", () => {
        const db = new DB(dbName);

        const checkAttachments = () => {
            return db.get("bin_doc").then((doc) => {
                assert.equal(doc._attachments["foo.txt"].stub, true);
                assert.equal(doc._attachments["foo.txt"].length, 29);
                return db.changes({ include_docs: true });
            }).then((res) => {
                const doc = res.results[0].doc;
                assert.equal(doc._attachments["foo.txt"].stub, true);
                assert.equal(doc._attachments["foo.txt"].length, 29);
                return db.allDocs({ include_docs: true });
            }).then((res) => {
                const doc = res.rows[0].doc;
                assert.equal(doc._attachments["foo.txt"].stub, true);
                assert.equal(doc._attachments["foo.txt"].length, 29);
                return new Promise((resolve, reject) => {
                    let change;
                    const changes = db.changes({ include_docs: true, live: true })
                        .on("change", (x) => {
                            change = x;
                            changes.cancel();
                        })
                        .on("error", reject)
                        .on("complete", () => {
                            resolve(change);
                        });
                });
            }).then((change) => {
                const doc = change.doc;
                assert.equal(doc._attachments["foo.txt"].stub, true);
                assert.equal(doc._attachments["foo.txt"].length, 29);
            });
        };

        return db.put(binAttDoc).then(checkAttachments).then(() => {
            return db.get("bin_doc");
        }).then((doc) => {
            return db.put(doc);
        }).then(checkAttachments);
    });

    it("Testing with invalid rev", async () => {
        const db = new DB(dbName);
        const doc = { _id: "adoc" };
        const resp = await db.put(doc);
        doc._rev = resp.rev;
        doc.foo = "bar";
        await db.put(doc);
        const blob = Buffer.from("bar");
        const err = await assert.throws(async () => {
            await db.putAttachment("adoc", "foo.txt", doc._rev, blob, "text/plain");
        });
        assert.equal(err.name, "conflict", "error is a conflict");
    });

    it("Test put another attachment on a doc with attachments", async () => {
        const db = new DB(dbName);
        const res1 = await db.put({ _id: "mydoc" });
        const blob = Buffer.from("Mytext");
        const res2 = await db.putAttachment("mydoc", "mytext", res1.rev, blob, "text/plain");
        const res3 = await db.putAttachment("mydoc", "mytext2", res2.rev, blob, "text/plain");
        assert.exists(res3.ok);
    });

    it("Test get with attachments: true if empty attachments", async () => {
        const db = new DB(dbName);
        await db.put({
            _id: "foo",
            _attachments: {}
        });
        const res = await db.get("foo", { attachments: true });
        assert.equal(res._id, "foo");
    });

    it("Test delete attachment from a doc", async () => {
        const db = new DB(dbName);
        let res = await db.put({
            _id: "mydoc",
            _attachments: {
                mytext1: {
                    content_type: "text/plain",
                    data: "TXl0ZXh0MQ=="
                },
                mytext2: {
                    content_type: "text/plain",
                    data: "TXl0ZXh0Mg=="
                }
            }
        });
        const rev = res.rev;
        res = await db.get("mydoc", { attachments: true });
        assert.include(Object.keys(res._attachments), "mytext1", "mytext2");
        await assert.throws(async () => {
            await db.removeAttachment("mydoc", "mytext1", 0);
        });
        await db.removeAttachment("mydoc", "mytext1", rev);
        res = await db.get("mydoc", { attachments: true });
        assert.notInclude(Object.keys(res._attachments), "mytext1");
        assert.include(Object.keys(res._attachments), "mytext2");
        res = await db.removeAttachment("mydoc", "mytext2", res._rev);
        assert.isUndefined(res._attachments);
    });

    it("Test a document with a json string attachment", async () => {
        const db = new DB(dbName);
        const results = await db.put(jsonDoc);
        const doc = await db.get(results.id);
        assert.exists(doc._attachments, "doc has attachments field");
        assert.include(Object.keys(doc._attachments), "foo.json");
        assert.equal(doc._attachments["foo.json"].content_type, "application/json", "doc has correct content type");
        const attachment = await db.getAttachment(results.id, "foo.json");
        assert.equal(attachment.type, "application/json");
        assert.equal(jsonDoc._attachments["foo.json"].data, "eyJIZWxsbyI6IndvcmxkIn0=", "correct data");
    });

    it("Test remove doc with attachment", () => {
        const db = new DB(dbName);
        return db.put({ _id: "mydoc" }).then((resp) => {
            const blob = Buffer.from("Mytext");
            return db.putAttachment("mydoc", "mytext", resp.rev, blob, "text/plain");
        }).then((res) => {
            assert.exists(res.ok);
            return db.get("mydoc", { attachments: false });
        }).then((doc) => {
            return db.remove(doc);
        }).then((res) => {
            assert.exists(res.ok);
        });
    });

    it("Try to insert a doc with unencoded attachment", async () => {
        const db = new DB(dbName);
        const doc = {
            _id: "foo",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "this should have been encoded!"
                }
            }
        };
        await assert.throws(async () => {
            await db.put(doc);
        });
    });

    it("Try to get attachment of unexistent doc", async () => {
        const db = new DB(dbName);
        await assert.throws(async () => {
            await db.getAttachment("unexistent", "attachment");
        });
    });

    it("Test synchronous getAttachment", async () => {
        const db = new DB(dbName);
        await assert.throws(async () => {
            await db.getAttachment("unexistent", "attachment");
        });
    });

    it("Test synchronous putAttachment with text data", async () => {
        const db = new DB(dbName);
        const blob = Buffer.from("foobaz");
        await db.putAttachment("a", "foo2.txt", "", blob, "text/plain");
        const doc = await db.get("a", { attachments: true });
        assert.equal(doc._attachments["foo2.txt"].data, "Zm9vYmF6");
        assert.equal(doc._attachments["foo2.txt"].content_type, "text/plain");
    });

    it("Test synchronous putAttachment with no text data", async () => {
        const db = new DB(dbName);
        await db.putAttachment("a", "foo2.txt", "", "", "text/plain");
        const doc = await db.get("a", { attachments: true });
        assert.equal(doc._attachments["foo2.txt"].data, "");
        assert.equal(doc._attachments["foo2.txt"].content_type.indexOf("text/plain"), 0, "expected content-type to start with text/plain");
    });

    it("Test put with partial stubs", () => {
        const db = new DB(dbName);
        const doc = {
            _id: "doc",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "Zm9v"
                },
                "bar.txt": {
                    content_type: "text/plain",
                    data: "Zm9v"
                }
            }
        };
        return db.put(doc).then(() => {
            return db.get(doc._id);
        }).then((doc) => {
            doc._attachments["baz.txt"] = {
                content_type: "text/plain",
                data: "Zm9v"
            };
            // at this point, foo and bar are stubs, but baz is not
            return db.put(doc);
        }).then(() => {
            return db.get(doc._id, { attachments: true });
        }).then((doc) => {
            assert.notEqual(doc._rev, "2-x");
            assert.lengthOf(Object.keys(doc._attachments), 3);
            Object.keys(doc._attachments).forEach((key) => {
                const att = doc._attachments[key];
                assert.equal(att.data, "Zm9v");
                assert.equal(att.content_type, "text/plain");
            });
        });
    });

    it("Test put with attachments and new_edits=false", () => {
        const db = new DB(dbName);
        const doc = {
            _id: "doc",
            _rev: "2-x",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "Zm9v"
                },
                "bar.txt": {
                    content_type: "text/plain",
                    data: "Zm9v"
                },
                "baz.txt": {
                    content_type: "text/plain",
                    data: "Zm9v"
                }
            },
            _revisions: {
                start: 2,
                ids: ["x", "a"]
            }
        };
        return db.bulkDocs([doc], { new_edits: false }).then(() => {
            return db.get(doc._id);
        }).then(() => {
            // at this point, foo and bar are stubs, but baz is not
            return db.bulkDocs([doc], { new_edits: false });
        }).then(() => {
            return db.get(doc._id, { attachments: true });
        }).then((doc) => {
            assert.equal(doc._rev, "2-x");
            assert.lengthOf(Object.keys(doc._attachments), 3);
            Object.keys(doc._attachments).forEach((key) => {
                const att = doc._attachments[key];
                assert.equal(att.data, "Zm9v");
                assert.equal(att.content_type, "text/plain");
            });
        });
    });

    it("Test getAttachment with specific rev", () => {
        const db = new DB(dbName, { auto_compaction: false });

        const doc = {
            _id: "a"
        };
        let rev1;
        let rev2;
        let rev3;
        return db.put(doc).then((res) => {
            doc._rev = rev1 = res.rev;
            doc._attachments = {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "Zm9v"
                }
            };
            return db.put(doc);
        }).then((res) => {
            doc._rev = rev2 = res.rev;

            delete doc._attachments;
            return db.put(doc);
        }).then((res) => {
            doc._rev = rev3 = res.rev;

            return db.getAttachment("a", "foo.txt", { rev: rev2 });
        }).then((blob) => {
            assert.exists(blob);

            return Promise.all([
                db.getAttachment("a", "foo.txt", { rev: rev1 }),
                db.getAttachment("a", "foo.txt", { rev: "3-fake" }),
                db.getAttachment("a", "foo.txt"),
                db.getAttachment("a", "foo.txt", {}),
                db.getAttachment("a", "foo.txt", { rev: rev3 })
            ].map((promise) => {
                return promise.then(() => {
                    throw new Error("expected an error");
                }, (err) => {
                    assert.exists(err);
                    assert.equal(err.status, 404);
                });
            }));
        });
    });

    it("Test getAttachment with diff revs and content", () => {
        const db = new DB(dbName, { auto_compaction: false });

        const doc = {
            _id: "a",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "Zm9v"
                }
            }
        };
        let rev1;
        let rev2;
        let rev3;
        return db.put(doc).then((res) => {
            doc._rev = rev1 = res.rev;
            doc._attachments = {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "YmFy"
                }
            };
            return db.put(doc);
        }).then((res) => {
            doc._rev = rev2 = res.rev;
            doc._attachments = {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "YmF6"
                }
            };
            return db.put(doc);
        }).then((res) => {
            doc._rev = rev3 = res.rev;

            const testCases = [
                [db.getAttachment("a", "foo.txt"), "baz"],
                [db.getAttachment("a", "foo.txt", { rev: rev3 }), "baz"],
                [db.getAttachment("a", "foo.txt", { rev: rev2 }), "bar"],
                [db.getAttachment("a", "foo.txt", { rev: rev1 }), "foo"]
            ];

            return Promise.all(testCases.map((testCase) => {
                const promise = testCase[0];
                const expected = testCase[1];
                return promise.then((blob) => {
                    assert.equal(blob.type, "text/plain");
                    return blob.toString("binary");
                }).then((bin) => {
                    assert.equal(bin, expected, "didn't get blob we expected for rev");
                });
            }));
        });
    });

    it("Test stubs", async () => {
        const db = new DB(dbName);
        await db.putAttachment("a", "foo2.txt", "", "", "text/plain");
        const docs = await db.allDocs({ include_docs: true });
        assert.isUndefined(docs.rows[0].stub, "no stub");
    });

    it("Try to get unexistent attachment of some doc", async () => {
        const db = new DB(dbName);
        await db.put({ _id: "foo" });
        await assert.throws(async () => {
            await db.getAttachment("foo", "unexistentAttachment");
        });
    });

    it("putAttachment and getAttachment with plaintext", async () => {
        const db = new DB(dbName);
        await db.put({ _id: "foo" });
        let doc = await db.get("foo");
        const data = binAttDoc._attachments["foo.txt"].data;
        let blob = util.binaryStringToBuffer(util.atob(data), "text/plain");
        await db.putAttachment("foo", "foo.txt", doc._rev, blob, "text/plain");
        blob = await db.getAttachment("foo", "foo.txt");
        assert.equal(blob.type, "text/plain");
        const blobData = blob.toString("binary");
        assert.equal(util.btoa(blobData), data);
        doc = await db.get("foo");
        delete doc._attachments["foo.txt"].revpos;

        // couchdb encodes plaintext strings differently from us
        // because of libicu vs. ascii. that's okay
        const digest = doc._attachments["foo.txt"].digest;
        const validDigests = [
            "md5-qUUYqS41RhwF0TrCsTAxFg==",
            "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
            "md5-jeLnIuUvK7d+6gya044lVA=="
        ];
        assert.notEqual(validDigests.indexOf(digest), -1, `expected ${digest} to be in: ${JSON.stringify(validDigests)}`);
        delete doc._attachments["foo.txt"].digest;
        assert.deepEqual(doc._attachments, {
            "foo.txt": {
                content_type: "text/plain",
                stub: true,
                length: 29
            }
        });
    });

    it("putAttachment and getAttachment with png data", async () => {
        const db = new DB(dbName);
        await db.put({ _id: "foo" });
        let doc = await db.get("foo");
        const data = pngAttDoc._attachments["foo.png"].data;
        let blob = util.binaryStringToBuffer(util.atob(data), "image/png");
        await db.putAttachment("foo", "foo.png", doc._rev, blob, "image/png");
        blob = await db.getAttachment("foo", "foo.png");
        assert.equal(blob.type, "image/png");
        const blobData = blob.toString("binary");
        assert.equal(util.btoa(blobData), data);
        doc = await db.get("foo");
        delete doc._attachments["foo.png"].revpos;
        assert.deepEqual(doc._attachments, {
            "foo.png": {
                content_type: "image/png",
                digest: "md5-c6eA+rofKUsstTNQBKUc8A==",
                stub: true,
                length: 229
            }
        });
    });

    it("putAttachment in new doc with base64", () => {
        const db = new DB(dbName, { auto_compaction: false });

        return db.putAttachment("foo", "att", "Zm9v", "text/plain").then(() => {
            return db.get("foo", { attachments: true });
        }).then((doc) => {
            assert.match(doc._attachments.att.content_type, /^text\/plain/);
            assert.equal(doc._attachments.att.data, "Zm9v");
        });
    });

    it("#2818 - save same attachment in different revs", () => {
        const db = new DB(dbName, { auto_compaction: false });

        return db.put({ _id: "foo" }).then((res) => {
            return db.putAttachment("foo", "att", res.rev, "Zm9v", "text/plain");
        }).then(() => {
            return db.get("foo", { attachments: true });
        }).then((doc) => {
            assert.match(doc._attachments.att.content_type, /^text\/plain/);
            assert.exists(doc._attachments.att.data);
            return db.get("foo");
        }).then((doc) => {
            return db.put(doc);
        }).then(() => {
            return db.compact();
        }).then(() => {
            return db.get("foo", { attachments: true });
        }).then((doc) => {
            assert.match(doc._attachments.att.content_type, /^text\/plain/);
            assert.isAbove(doc._attachments.att.data.length, 0, "attachment exists");
        });
    });

    it("#2818 - save same attachment many times in parallel", () => {
        const db = new DB(dbName);
        const docs = [];

        for (let i = 0; i < 50; i++) {
            docs.push({
                _id: `doc${i}`,
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "Zm9vYmFy" // 'foobar'
                    }
                }
            });
        }
        return db.bulkDocs(docs);
    });

    it("#2818 - revisions keep attachments (no compaction)", () => {
        const db = new DB(dbName, { auto_compaction: false });
        const doc = {
            _id: "doc",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "Zm9vYmFy" // 'foobar'
                }
            }
        };
        let rev;
        return db.put(doc).then(() => {
            return db.get("doc");
        }).then((doc) => {
            rev = doc._rev;
            //delete doc._attachments['foo.txt'];
            doc._attachments["foo.txt"] = {
                content_type: "text/plain",
                data: "dG90bw=="
            }; // 'toto'
            return db.put(doc);
        }).then(() => {
            return db.get("doc", { attachments: true });
        }).then((doc) => {
            assert.equal(doc._attachments["foo.txt"].data, "dG90bw==");
            return db.get("doc", { rev, attachments: true });
        }).then((doc) => {
            assert.equal(doc._attachments["foo.txt"].data, "Zm9vYmFy");
        });
    });

    it("#2818 - doesn't throw 409 if same filename", () => {
        const db = new DB(dbName, { auto_compaction: false });
        const doc = {
            _id: "doc",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "Zm9vYmFy" // 'foobar'
                }
            }
        };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            doc._attachments["foo.txt"].data = "dG90bw=="; // 'toto'
            return db.put(doc);
        });
    });

    it("#3008 test correct encoding/decoding of \\u0000 etc.", () => {

        const base64 =
            "iVBORw0KGgoAAAANSUhEUgAAAhgAAAJLCAYAAAClnu9J" +
            "AAAgAElEQVR4Xuy9B7ylZXUu/p62T5nOMAPM0BVJICQi" +
            "ogjEJN5ohEgQ";

        const db = new DB(dbName);
        return db.putAttachment("foo", "foo.bin", base64, "image/png").then(() => {
            return db.getAttachment("foo", "foo.bin");
        }).then((blob) => {
            assert.equal(blob.type, "image/png");
            return blob.toString("binary");
        }).then((bin) => {
            assert.equal(util.btoa(bin), base64);
        });
    });

    it("putAttachment and getAttachment with big png data", async () => {

        const db = new DB(dbName);
        await db.put({ _id: "foo" });
        let doc = await db.get("foo");

        const data = require("./deps/bigimage.js");

        let blob = util.binaryStringToBuffer(util.atob(data), "image/png");
        await db.putAttachment("foo", "foo.png", doc._rev, blob, "image/png");
        blob = await db.getAttachment("foo", "foo.png");
        assert.equal(blob.type, "image/png");
        const blobData = blob.toString("binary");
        assert.equal(util.btoa(blobData), data);
        doc = await db.get("foo");
        delete doc._attachments["foo.png"].revpos;
        assert.deepEqual(doc._attachments, {
            "foo.png": {
                content_type: "image/png",
                digest: "md5-kqr2YcdElgDs3RkMn1Ygbw==",
                stub: true,
                length: 678010
            }
        });
    });

    it("#2709 `revpos` with putAttachment", async () => {
        const db = new DB(dbName);
        await db.putAttachment("a", "one", "", util.btoa("one"), "text/plain");
        let doc = await db.get("a");
        assert.exists(doc._attachments.one.revpos);
        assert.equal(doc._attachments.one.revpos, 1);
        await db.putAttachment("a", "two", doc._rev, util.btoa("two"), "text/plain");
        doc = await db.get("a");
        assert.exists(doc._attachments.two.revpos);
        assert.equal(doc._attachments.two.revpos, 2);
        assert.equal(doc._attachments.one.revpos, 1);
        await db.putAttachment("a", "one", doc._rev, util.btoa("one-changed"), "text/plain");
        doc = await db.get("a");
        assert.equal(doc._attachments.one.revpos, 3);
        assert.equal(doc._attachments.two.revpos, 2);
    });

    it("#2709 `revpos` with inline attachment", async () => {
        const db = new DB(dbName);
        let doc = {
            _id: "a",
            _attachments: {
                one: {
                    content_type: "text/plain",
                    data: util.btoa("one")
                }
            }
        };
        await db.put(doc);
        doc = await db.get("a");
        assert.exists(doc._attachments.one.revpos);
        assert.equal(doc._attachments.one.revpos, 1);
        doc._attachments.two = {
            content_type: "text/plain",
            data: util.btoa("two")
        };
        await db.put(doc);
        doc = await db.get("a");
        assert.exists(doc._attachments.two.revpos);
        assert.equal(doc._attachments.two.revpos, 2);
        assert.equal(doc._attachments.one.revpos, 1);
        delete doc._attachments.one.stub;
        doc._attachments.one.data = util.btoa("one-changed");
        await db.put(doc);
        doc = await db.get("a");
        assert.equal(doc._attachments.one.revpos, 3);
        assert.equal(doc._attachments.two.revpos, 2);
    });

    it("#2709 `revpos` with allDocs", async () => {
        const db = new DB(dbName);
        await db.putAttachment("a", "one", "", util.btoa("one"), "text/plain");
        const docs = await db.allDocs({ keys: ["a"], include_docs: true });
        const doc = docs.rows[0].doc;
        assert.exists(doc._attachments.one.revpos);
        assert.equal(doc._attachments.one.revpos, 1);
    });
});
