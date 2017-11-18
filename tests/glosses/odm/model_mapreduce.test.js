const start = require("./common");
const mongoose = start.mongoose;
const random = adone.odm.utils.random;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

describe.skip("model: mapreduce:", () => {
    let Comments;
    let BlogPost;
    let collection;

    before(() => {
        Comments = new Schema();

        Comments.add({
            title: String,
            date: Date,
            body: String,
            comments: [Comments]
        });

        BlogPost = new Schema({
            title: String,
            author: String,
            slug: String,
            date: Date,
            meta: {
                date: Date,
                visitors: Number
            },
            published: Boolean,
            mixed: {},
            numbers: [Number],
            owners: [ObjectId],
            comments: [Comments]
        });

        collection = `mapreduce_${random()}`;
        mongoose.model("MapReduce", BlogPost);
    });

    it("works", (done) => {
        let db = start(),
            MR = db.model("MapReduce", collection);

        let magicID;
        const id = new mongoose.Types.ObjectId();
        const authors = "aaron guillermo brian nathan".split(" ");
        const num = 10;
        const docs = [];
        for (let i = 0; i < num; ++i) {
            docs.push({ author: authors[i % authors.length], owners: [id], published: true });
        }

        MR.create(docs, (err, insertedDocs) => {
            assert.ifError(err);

            magicID = insertedDocs[1]._id;

            let o = {
                map() {
                    emit(this.author, 1);
                },
                reduce(k, vals) {
                    return vals.length;
                }
            };

            MR.mapReduce(o, (err, ret, stats) => {
                assert.ifError(err);
                assert.ok(Array.isArray(ret));
                assert.ok(stats);
                ret.forEach(function (res) {
                    if (res._id === 'aaron') {
                        assert.equal(res.value, 3);
                    }
                    if (res._id === 'guillermo') {
                        assert.equal(res.value, 3);
                    }
                    if (res._id === 'brian') {
                        assert.equal(res.value, 2);
                    }
                    if (res._id === 'nathan') {
                        assert.equal(res.value, 2);
                    }
                });

                var o = {
                    map: function () {
                        emit(this.author, 1);
                    },
                    reduce: function (k, vals) {
                        return vals.length;
                    },
                    query: { author: 'aaron', published: 1, owners: id }
                };

                MR.mapReduce(o, function (err, ret, stats) {
                    assert.ifError(err);

                    assert.ok(Array.isArray(ret));
                    assert.equal(ret.length, 1);
                    assert.equal(ret[0]._id, 'aaron');
                    assert.equal(ret[0].value, 3);
                    assert.ok(stats);

                    modeling();
                });
            });

            function modeling() {
                let o = {
                    map() {
                        emit(this.author, { own: magicID });
                    },
                    scope: { magicID },
                    reduce(k, vals) {
                        return { own: vals[0].own, count: vals.length };
                    },
                    out: { replace: "_mapreduce_test_" + random() }
                };

                MR.mapReduce(o, (err, ret) => {
                    assert.ifError(err);

                    // ret is a model
                    assert.ok(!Array.isArray(ret));
                    assert.equal(typeof ret.findOne, 'function');
                    assert.equal(typeof ret.mapReduce, 'function');

                    // queries work
                    ret.where('value.count').gt(1).sort({ _id: 1 }).exec(function (err, docs) {
                        assert.ifError(err);
                        assert.equal(docs[0]._id, 'aaron');
                        assert.equal(docs[1]._id, 'brian');
                        assert.equal(docs[2]._id, 'guillermo');
                        assert.equal(docs[3]._id, 'nathan');

                        // update casting works
                        ret.findOneAndUpdate({ _id: 'aaron' }, { published: true }, { new: true }, function (err, doc) {
                            assert.ifError(err);
                            assert.ok(doc);
                            assert.equal(doc._id, 'aaron');
                            assert.equal(doc.published, true);

                            // ad-hoc population works
                            ret
                                .findOne({ _id: 'aaron' })
                                .populate({ path: 'value.own', model: 'MapReduce' })
                                .exec(function (err, doc) {
                                    db.close();
                                    assert.ifError(err);
                                    assert.equal(doc.value.own.author, 'guillermo');
                                    done();
                                });
                        });
                    });
                });
            }
        });
    });

    it("withholds stats with false verbosity", (done) => {
        let db = start(),
            MR = db.model("MapReduce", collection);

        const o = {
            map() {
            },
            reduce() {
                return "test";
            },
            verbose: false
        };

        MR.mapReduce(o, (err, results, stats) => {
            assert.equal(typeof stats, "undefined");
            db.close(done);
        });
    });

    describe("promises (gh-1628)", () => {
        it("are returned", (done) => {
            let db = start(),
                MR = db.model("MapReduce", collection);

            let o = {
                map() {
                },
                reduce() {
                    return 'test';
                }
            };

            let promise = MR.mapReduce(o, () => {
            });
            assert.ok(promise instanceof mongoose.Promise);

            db.close(done);
        });

        it("allow not passing a callback", (done) => {
            let db = start(),
                MR = db.model("MapReduce", collection);

            let o = {
                map() {
                    emit(this.author, 1);
                },
                reduce(k, vals) {
                    return vals.length;
                },
                query: { author: "aaron", published: 1 }
            };

            function validate(ret, stats) {
                assert.ok(is.array(ret));
                assert.equal(ret.length, 1);
                assert.equal(ret[0]._id, "aaron");
                assert.equal(ret[0].value, 6);
                assert.ok(stats);
            }

            function finish() {
                db.close(done);
            }

            let promise;

            assert.doesNotThrow(() => {
                promise = MR.mapReduce(o);
            });

            promise.then(validate, assert.ifError).then(finish).end();
        });
    });

    it("works using then", (done) => {
        let db = start(),
            MR = db.model("MapReduce", collection);

        let magicID;
        const id = new mongoose.Types.ObjectId();
        const authors = "aaron guillermo brian nathan".split(" ");
        const num = 10;
        const docs = [];
        for (let i = 0; i < num; ++i) {
            docs.push({ author: authors[i % authors.length], owners: [id], published: true });
        }

        MR.create(docs, (err, insertedDocs) => {
            assert.ifError(err);

            let b = insertedDocs[1];
            magicID = b._id;

            let o = {
                map() {
                    emit(this.author, 1);
                },
                reduce(k, vals) {
                    return vals.length;
                }
            };

            MR.mapReduce(o).then((ret, stats) => {
                assert.ok(Array.isArray(ret));
                assert.ok(stats);
                ret.forEach(function (res) {
                    if (res._id === 'aaron') {
                        assert.equal(res.value, 6);
                    }
                    if (res._id === 'guillermo') {
                        assert.equal(res.value, 6);
                    }
                    if (res._id === 'brian') {
                        assert.equal(res.value, 4);
                    }
                    if (res._id === 'nathan') {
                        assert.equal(res.value, 4);
                    }
                });

                var o = {
                    map: function () {
                        emit(this.author, 1);
                    },
                    reduce: function (k, vals) {
                        return vals.length;
                    },
                    query: { author: 'aaron', published: 1, owners: id }
                };

                MR.mapReduce(o).then(function (ret, stats) {
                    assert.ok(Array.isArray(ret));
                    assert.equal(ret.length, 1);
                    assert.equal(ret[0]._id, 'aaron');
                    assert.equal(ret[0].value, 3);
                    assert.ok(stats);
                    modeling();
                });
            });

            function modeling() {
                let o = {
                    map() {
                        emit(this.author, { own: magicID });
                    },
                    scope: { magicID },
                    reduce(k, vals) {
                        return { own: vals[0].own, count: vals.length };
                    },
                    out: { replace: "_mapreduce_test_" + random() }
                };

                MR.mapReduce(o).then((ret) => {
                    // ret is a model
                    assert.ok(!Array.isArray(ret));
                    assert.equal(typeof ret.findOne, 'function');
                    assert.equal(typeof ret.mapReduce, 'function');

                    // queries work
                    ret.where('value.count').gt(1).sort({ _id: 1 }).exec(function (err, docs) {
                        assert.ifError(err);
                        assert.equal(docs[0]._id, 'aaron');
                        assert.equal(docs[1]._id, 'brian');
                        assert.equal(docs[2]._id, 'guillermo');
                        assert.equal(docs[3]._id, 'nathan');

                        // update casting works
                        ret.findOneAndUpdate({ _id: 'aaron' }, { published: true }, { new: true }, function (err, doc) {
                            assert.ifError(err);
                            assert.ok(doc);
                            assert.equal(doc._id, 'aaron');
                            assert.equal(doc.published, true);

                            // ad-hoc population works
                            ret
                                .findOne({ _id: 'aaron' })
                                .populate({ path: 'value.own', model: 'MapReduce' })
                                .exec(function (err, doc) {
                                    db.close();
                                    assert.ifError(err);
                                    assert.equal(doc.value.own.author, 'guillermo');
                                    done();
                                });
                        });
                    });
                });
            }
        });
    });

    it("withholds stats with false verbosity using then", (done) => {
        let db = start(),
            MR = db.model("MapReduce", collection);

        const o = {
            map() {
            },
            reduce() {
                return "test";
            },
            verbose: false
        };

        MR.mapReduce(o).then((results, stats) => {
            assert.equal(typeof stats, "undefined");
            db.close(done);
        });
    });

    it("resolveToObject (gh-4945)", (done) => {
        const db = start();
        const MR = db.model("MapReduce", collection);

        const o = {
            map() {
            },
            reduce() {
                return "test";
            },
            verbose: false,
            resolveToObject: true
        };

        MR.create({ title: "test" }, (error) => {
            assert.ifError(error);
            MR.mapReduce(o).then((obj) => {
                assert.ok(obj.model);
                db.close(done);
            }).catch(done);
        });
    });
});
