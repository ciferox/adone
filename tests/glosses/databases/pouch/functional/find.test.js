require("./node.setup");

describe("db", "pouch", () => {
    describe("and", () => {
        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            return testUtils.cleanup([dbs.name], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it("does and for _id", () => {
            let db = new PouchDB(dbs.name);
            return db.bulkDocs([
                { name: "mario", _id: "mario", rank: 5, series: "mario", debut: 1981 },
                { name: "jigglypuff", _id: "puff", rank: 8, series: "pokemon", debut: 1996 },
                { name: "link", rank: 10, _id: "link", series: "zelda", debut: 1986 },
                { name: "donkey kong", rank: 7, _id: "dk", series: "mario", debut: 1981 },
                { name: "pikachu", series: "pokemon", _id: "pikachu", rank: 1, debut: 1996 },
                { name: "captain falcon", _id: "falcon", rank: 4, series: "f-zero", debut: 1990 },
                { name: "luigi", rank: 11, _id: "luigi", series: "mario", debut: 1983 },
                { name: "fox", _id: "fox", rank: 3, series: "star fox", debut: 1993 },
                { name: "ness", rank: 9, _id: "ness", series: "earthbound", debut: 1994 },
                { name: "samus", rank: 12, _id: "samus", series: "metroid", debut: 1986 },
                { name: "yoshi", _id: "yoshi", rank: 6, series: "mario", debut: 1990 },
                { name: "kirby", _id: "kirby", series: "kirby", rank: 2, debut: 1992 }
            ]).then(() => {
                return db.find({
                    selector: {
                        $and: [
                            { _id: { $in: ['pikachu', 'puff'] } },
                            { _id: { $gt: null } }
                        ]
                    },
                    fields: ["_id"],
                });
            }).then((resp) => {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: 'pikachu' },
                        { _id: 'puff' },
                    ]
                });
            });
        });

        it("does and for index", () => {
            let db = new PouchDB(dbs.name);
            let index = {
                index: {
                    fields: ["debut"]
                }
            };
            return db.createIndex(index).then(() => {
                return db.bulkDocs([
                    { name: 'mario', _id: 'mario', rank: 5, series: 'mario', debut: 1981 },
                    { name: 'jigglypuff', _id: 'puff', rank: 8, series: 'pokemon', debut: 1996 },
                    { name: 'link', rank: 10, _id: 'link', series: 'zelda', debut: 1986 },
                    { name: 'donkey kong', rank: 7, _id: 'dk', series: 'mario', debut: 1981 },
                    { name: 'pikachu', series: 'pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                    { name: 'captain falcon', _id: 'falcon', rank: 4, series: 'f-zero', debut: 1990 },
                    { name: 'luigi', rank: 11, _id: 'luigi', series: 'mario', debut: 1983 },
                    { name: 'fox', _id: 'fox', rank: 3, series: 'star fox', debut: 1993 },
                    { name: 'ness', rank: 9, _id: 'ness', series: 'earthbound', debut: 1994 },
                    { name: 'samus', rank: 12, _id: 'samus', series: 'metroid', debut: 1986 },
                    { name: 'yoshi', _id: 'yoshi', rank: 6, series: 'mario', debut: 1990 },
                    { name: 'kirby', _id: 'kirby', series: 'kirby', rank: 2, debut: 1992 }
                ]);
            }).then(() => {
                return db.find({
                    selector: {
                        $and: [
                            { debut: { $in: [1996] } },
                            { debut: { $gt: null } }
                        ]
                    },
                    fields: ["_id"],
                });
            }).then((resp) => {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: 'pikachu' },
                        { _id: 'puff' },
                    ]
                });
            });
        });
    });

    describe("array", () => {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: "James", _id: "james", favorites: ["Mario", "Pokemon"], age: 20 },
                    { name: "Mary", _id: "mary", favorites: ["Pokemon"], age: 21 },
                    { name: "Link", _id: "link", favorites: ["Zelda", "Pokemon"], age: 22 },
                    { name: "William", _id: "william", favorites: ["Mario"], age: 23 }
                ]).then(() => {
                    var index = {
                        "index": {
                            "fields": ["name"]
                        },
                        "name": "name-index",
                        "type": "json"
                    };
                    return db.createIndex(index);
                }).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        describe("$in", () => {
            it('should return docs match single value in array', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $in: ["Mario"]
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'James', _id: 'james', favorites: ['Mario', 'Pokemon'], age: 20 },
                        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
                    ]);
                });
            });

            it('should use default index due to non-logical operators', function () {
                var index = {
                    "index": {
                        "fields": ["name", "age"]
                    },
                    "type": "json"
                };
                return db.createIndex(index).then(function () {
                    return db.find({
                        selector: {
                            name: {
                                $in: ['James', 'Link']
                            },
                            age: {
                                $gt: 21
                            }
                        },
                    });
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22 },
                    ]);
                });
            });

            it('should return docs match single value in array with defined index', function () {
                var index = {
                    "index": {
                        "fields": ["name", "favorites"]
                    },
                    "type": "json"
                };
                return db.createIndex(index).then(function () {
                    return db.find({
                        selector: {
                            name: {
                                $eq: 'James'
                            },
                            favorites: {
                                $in: ["Mario"]
                            }
                        },
                    });
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'James', _id: 'james', favorites: ['Mario', 'Pokemon'], age: 20 }
                    ]);
                });
            });


            it('should return docs match single field that is not an array', function () {
                return db.find({
                    selector: {
                        _id: {
                            $gt: 'a'
                        },
                        name: {
                            $in: ['James', 'William']
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'James', _id: 'james', favorites: ['Mario', 'Pokemon'], age: 20 },
                        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
                    ]);
                });
            });

            it('should return docs match single field that is not an array and number', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        age: {
                            $in: [20, 23]
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'James', _id: 'james', favorites: ['Mario', 'Pokemon'], age: 20 },
                        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
                    ]);
                });
            });

            it('should return docs match two values in array', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $in: ["Mario", "Zelda"]
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'James', _id: 'james', favorites: ['Mario', 'Pokemon'], age: 20 },
                        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22 },
                        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
                    ]);
                });
            });

            it('should return no docs for no $in match', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $in: ["TMNT"]
                        }
                    },
                }).then(function (resp) {
                    assert.lengthOf(resp.docs, 0);
                });
            });
        });

        describe('$all', function () {
            it('should return docs that match single value in $all array', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $all: ["Mario"]
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'James', _id: 'james', favorites: ['Mario', 'Pokemon'], age: 20 },
                        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
                    ]);
                });
            });

            it('should return docs match two values in $all array', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $all: ['Mario', 'Pokemon']
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'James', _id: 'james', favorites: ['Mario', 'Pokemon'], age: 20 },
                    ]);
                });
            });

            it('should return no docs for no match for $all', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $all: ["Mario", "Zelda"]
                        }
                    },
                }).then(function (resp) {
                    assert.lengthOf(resp.docs, 0);
                });
            });
        });

        describe('$size', function () {
            it('should return docs with array length 1', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $size: 1
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'Mary', _id: 'mary', favorites: ['Pokemon'], age: 21 },
                        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
                    ]);
                });
            });

            it('should return docs array length 2', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $size: 2
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'James', _id: 'james', favorites: ['Mario', 'Pokemon'], age: 20 },
                        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22 },
                    ]);
                });
            });

            it('should return no docs for length 5', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $size: 5
                        }
                    },
                }).then(function (resp) {
                    assert.lengthOf(resp.docs, 0);
                });
            });
        });

        describe('$nin', function () {
            it('should return docs match single value $nin array', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $nin: ["Mario"]
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22 },
                        { name: 'Mary', _id: 'mary', favorites: ['Pokemon'], age: 21 },
                    ]);
                });
            });

            it('should return docs that do not match single field that is not an array', function () {
                return db.find({
                    selector: {
                        _id: {
                            $gt: 'a'
                        },
                        name: {
                            $nin: ['James', 'William']
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22 },
                        { name: 'Mary', _id: 'mary', favorites: ['Pokemon'], age: 21 },
                    ]);
                });
            });

            it('should return docs with single field that is not an array and number', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        age: {
                            $nin: [20, 23]
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'Link', _id: 'link', favorites: ['Zelda', 'Pokemon'], age: 22 },
                        { name: 'Mary', _id: 'mary', favorites: ['Pokemon'], age: 21 },
                    ]);
                });
            });

            it('should return docs that do not match two values $nin array', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $nin: ["Pokemon", "Zelda"]
                        }
                    },
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { name: 'William', _id: 'william', favorites: ['Mario'], age: 23 }
                    ]);
                });
            });

            it('should return all docs for no match for $nin', function () {
                return db.find({
                    selector: {
                        name: {
                            $gt: null
                        },
                        favorites: {
                            $nin: ["TMNT"]
                        }
                    },
                }).then(function (resp) {
                    assert.lengthOf(resp.docs, 4);
                });
            });

            it('should work for _id field', function () {
                return db.find({
                    selector: {
                        _id: {
                            $nin: ['james', 'mary']
                        }
                    },
                    fields: ["_id"]
                }).then(function (resp) {
                    assert.deepEqual(resp.docs, [
                        { _id: 'link' },
                        { _id: 'william' },
                    ]);
                });
            });

            it('$nin work with complex array #6280', function () {
                return db.bulkDocs([
                    {
                        _id: 'smith',
                        lastName: 'Smith',
                        absents: ['10/10/15', '10/10/16'],
                        year: 2016,
                        type: 'person'
                    },
                    {
                        _id: 'roberts',
                        lastName: 'Roberts',
                        absents: ['10/10/10', '10/10/16'],
                        year: 2017,
                        type: 'person'
                    },
                    {
                        _id: 'jones',
                        lastName: 'Jones',
                        absents: ['10/10/12', '10/10/20'],
                        year: 2013,
                        type: 'person'
                    }
                ]).then(function () {
                    return db.createIndex({
                        index: {
                            fields: ['lastName', 'absents', 'year', 'type'],
                            name: 'myIndex',
                            ddoc: 'myIndex'
                        }
                    });
                }).then(function () {
                    return db.find({
                        selector: {
                            lastName: { $gt: null },
                            year: { $gt: null },
                            type: 'person',
                            absents: {
                                $nin: ['10/10/15']
                            }
                        },
                        fields: ["_id"]
                    });
                }).then(function (resp) {
                    assert.deepEqual(resp.docs, [
                        { _id: 'jones' },
                        { _id: 'roberts' },
                    ]);
                });
            });
        });

        describe("$allMatch", function () {
            it("returns zero docs for field that is not an array", function () {
                return db.find({
                    selector: {
                        name: {
                            $allMatch: {
                                _id: "mary"
                            }
                        }
                    }
                }).then(function (resp) {
                    assert.lengthOf(resp.docs, 0);
                });
            });

            //CouchDB is returing a different result
            it("returns false if field isn't in doc", function () {
                var docs = [
                    {
                        "user_id": "a",
                        "bang": []
                    }
                ];
                return db.bulkDocs(docs).then(function () {
                    return db.find({
                        selector: {
                            bang: {
                                "$allMatch": {
                                    "$eq": "Pokemon",
                                }
                            }
                        }
                    });
                }).then(function (resp) {
                    assert.lengthOf(resp.docs, 0);
                });
            });

            it("matches against array", function () {
                return db.find({
                    selector: {
                        favorites: {
                            $allMatch: {
                                $eq: "Pokemon"
                            }
                        }
                    },
                    fields: ["_id"]
                }).then(function (resp) {
                    assert.deepEqual(resp.docs, [
                        { _id: 'mary' },
                    ]);
                });
            });

            it("works with object array", function () {
                var docs = [
                    {
                        "user_id": "a",
                        "bang": [
                            {
                                "foo": 1,
                                "bar": 2
                            },
                            {
                                "foo": 3,
                                "bar": 4
                            }
                        ]
                    },
                    {
                        "user_id": "b",
                        "bang": [
                            {
                                "foo": 1,
                                "bar": 2
                            },
                            {
                                "foo": 4,
                                "bar": 4
                            }
                        ]
                    }
                ];
                return db.bulkDocs(docs).then(function () {
                    return db.find({
                        selector: {
                            bang: {
                                "$allMatch": {
                                    "foo": { "$mod": [2, 1] },
                                    "bar": { "$mod": [2, 0] }
                                }
                            }
                        },
                        fields: ["user_id"]
                    });
                }).then(function (resp) {
                    assert.deepEqual(resp.docs, [
                        { user_id: "a" }
                    ]);
                });
            });
        });
    });

    describe('basic', function () {
        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            return testUtils.cleanup([dbs.name], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should create an index', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'created');
                return db.createIndex(index);
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'exists');
            });
        });

        it('should not update an existing index', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'created');
                return db.createIndex(index);
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'exists');
                return response.id;
            }).then(function (ddocId) {
                return db.get(ddocId);
            }).then(function (doc) {
                assert.equal(doc._rev.slice(0, 1), '1');
            });
        });

        it('throws an error for an invalid index creation', function () {
            var db = new PouchDB(dbs.name);
            return db.createIndex('yo yo yo').then(function () {
                throw new Error('expected an error');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('throws an error for an invalid index deletion', function () {
            var db = new PouchDB(dbs.name);
            return db.deleteIndex('yo yo yo').then(function () {
                throw new Error('expected an error');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('should not recognize duplicate indexes', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            var index2 = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "bar-index",
                "type": "json"
            };

            return db.createIndex(index).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'created');
                return db.createIndex(index2);
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'bar-index');
                assert.equal(response.result, 'created');
                return db.getIndexes();
            }).then(function (res) {
                assert.lengthOf(res.indexes, 3);
                var ddoc1 = res.indexes[1].ddoc;
                var ddoc2 = res.indexes[2].ddoc;
                assert.notEqual(ddoc1, ddoc2, 'essentially duplicate indexes are not md5summed to the same ddoc');
            });
        });

        it('should find existing indexes', function () {
            var db = new PouchDB(dbs.name);
            return db.getIndexes().then(function (response) {
                assert.deepEqual(response, {
                    "total_rows": 1,
                    indexes: [{
                        ddoc: null,
                        name: '_all_docs',
                        type: 'special',
                        def: { fields: [{ _id: 'asc' }] }
                    }]
                });
                var index = {
                    "index": {
                        "fields": ["foo"]
                    },
                    "name": "foo-index",
                    "type": "json"
                };
                return db.createIndex(index);
            }).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                var ddoc = resp.indexes[1].ddoc;
                assert.match(ddoc, /_design\/.+/);
                delete resp.indexes[1].ddoc;
                assert.deepEqual(resp, {
                    "total_rows": 2,
                    "indexes": [
                        {
                            "ddoc": null,
                            "name": "_all_docs",
                            "type": "special",
                            "def": {
                                "fields": [
                                    {
                                        "_id": "asc"
                                    }
                                ]
                            }
                        },
                        {
                            "name": "foo-index",
                            "type": "json",
                            "def": {
                                "fields": [
                                    {
                                        "foo": "asc"
                                    }
                                ]
                            }
                        }
                    ]
                });
            });
        });

        it('should create ddocs automatically', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            var ddocId;
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                ddocId = resp.indexes[1].ddoc;
                return db.get(ddocId);
            }).then(function (ddoc) {
                assert.equal(ddoc._id, ddocId);
                assert.exists(ddoc._rev);
                delete ddoc._id;
                delete ddoc._rev;
                delete ddoc.views['foo-index'].options.w; // wtf is this?
                assert.deepEqual(ddoc, {
                    "language": "query",
                    "views": {
                        "foo-index": {
                            "map": {
                                "fields": {
                                    "foo": "asc"
                                }
                            },
                            "reduce": "_count",
                            "options": {
                                "def": {
                                    "fields": [
                                        "foo"
                                    ]
                                }
                            }
                        }
                    }
                });
            });
        });

        it('should create ddocs automatically 2', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": [{ "foo": "asc" }]
                },
                "name": "foo-index",
                "type": "json"
            };
            var ddocId;
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                ddocId = resp.indexes[1].ddoc;
                return db.get(ddocId);
            }).then(function (ddoc) {
                assert.equal(ddoc._id, ddocId);
                assert.exists(ddoc._rev);
                delete ddoc._id;
                delete ddoc._rev;
                delete ddoc.views['foo-index'].options.w; // wtf is this?
                assert.deepEqual(ddoc, {
                    "language": "query",
                    "views": {
                        "foo-index": {
                            "map": {
                                "fields": {
                                    "foo": "asc"
                                }
                            },
                            "reduce": "_count",
                            "options": {
                                "def": {
                                    "fields": [
                                        { "foo": "asc" }
                                    ]
                                }
                            }
                        }
                    }
                });
            });
        });

        it('should create ddocs automatically 3', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": [
                        { "foo": "asc" },
                        "bar"
                    ]
                },
                "name": "foo-index",
                "type": "json"
            };
            var ddocId;
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                ddocId = resp.indexes[1].ddoc;
                return db.get(ddocId);
            }).then(function (ddoc) {
                assert.equal(ddoc._id, ddocId);
                assert.exists(ddoc._rev);
                delete ddoc._id;
                delete ddoc._rev;
                delete ddoc.views['foo-index'].options.w; // wtf is this?
                assert.deepEqual(ddoc, {
                    "language": "query",
                    "views": {
                        "foo-index": {
                            "map": {
                                "fields": {
                                    "foo": "asc",
                                    "bar": "asc"
                                }
                            },
                            "reduce": "_count",
                            "options": {
                                "def": {
                                    "fields": [
                                        { "foo": "asc" },
                                        "bar"
                                    ]
                                }
                            }
                        }
                    }
                });
            });
        });

        it('deletes indexes, callback style', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return new Promise(function (resolve, reject) {
                db.createIndex(index, function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            }).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                return new Promise(function (resolve, reject) {
                    db.deleteIndex(resp.indexes[1], function (err, resp) {
                        if (err) {
                            return reject(err);
                        }
                        resolve(resp);
                    });
                });
            }).then(function (resp) {
                assert.deepEqual(resp, { ok: true });
                return db.getIndexes();
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "total_rows": 1,
                    "indexes": [{
                        "ddoc": null,
                        "name": "_all_docs",
                        "type": "special",
                        "def": { "fields": [{ "_id": "asc" }] }
                    }]
                });
            });
        });

        it('deletes indexes', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                return db.deleteIndex(resp.indexes[1]);
            }).then(function (resp) {
                assert.deepEqual(resp, { ok: true });
                return db.getIndexes();
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "total_rows": 1,
                    "indexes": [{
                        "ddoc": null,
                        "name": "_all_docs",
                        "type": "special",
                        "def": { "fields": [{ "_id": "asc" }] }
                    }]
                });
            });
        });

        it('deletes indexes, no type', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index"
            };
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                delete resp.indexes[1].type;
                return db.deleteIndex(resp.indexes[1]);
            }).then(function (resp) {
                assert.deepEqual(resp, { ok: true });
                return db.getIndexes();
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "total_rows": 1,
                    "indexes": [{
                        "ddoc": null,
                        "name": "_all_docs",
                        "type": "special",
                        "def": { "fields": [{ "_id": "asc" }] }
                    }]
                });
            });
        });

        it('deletes indexes, no ddoc', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index"
            };
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                delete resp.indexes[1].ddoc;
                return db.deleteIndex(resp.indexes[1]);
            }).then(function () {
                throw new Error('expected an error due to no ddoc');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('deletes indexes, no name', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index"
            };
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                delete resp.indexes[1].name;
                return db.deleteIndex(resp.indexes[1]);
            }).then(function () {
                throw new Error('expected an error due to no name');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('deletes indexes, one name per ddoc', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "myname",
                "ddoc": "myddoc"
            };
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                return db.deleteIndex(resp.indexes[1]);
            }).then(function () {
                return db.get('_design/myddoc');
            }).then(function () {
                throw new Error('expected an error');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('deletes indexes, many names per ddoc', function () {
            var db = new PouchDB(dbs.name);
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "myname",
                "ddoc": "myddoc"
            };
            var index2 = {
                "index": {
                    "fields": ["bar"]
                },
                "name": "myname2",
                "ddoc": "myddoc"
            };
            return db.createIndex(index).then(function () {
                return db.createIndex(index2);
            }).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                return db.deleteIndex(resp.indexes[1]);
            }).then(function () {
                return db.get('_design/myddoc');
            }).then(function (ddoc) {
                assert.deepEqual(Object.keys(ddoc.views), ['myname2']);
            });
        });
    });

    var sortById = testUtils.sortById;

    describe('basic2', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);

                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981 },
                    { name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996 },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986 },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981 },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                    { name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990 },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983 },
                    { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993 },
                    { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994 },
                    { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986 },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990 },
                    { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992 }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should not include ddocs in _id results', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function () {
                return db.find({
                    selector: { _id: { $gt: '\u0000' } },
                    fields: ['_id'],
                    sort: ['_id']
                }).then(function (response) {
                    assert.deepEqual(response.docs, [
                        { "_id": "dk" },
                        { "_id": "falcon" },
                        { "_id": "fox" },
                        { "_id": "kirby" },
                        { "_id": "link" },
                        { "_id": "luigi" },
                        { "_id": "mario" },
                        { "_id": "ness" },
                        { "_id": "pikachu" },
                        { "_id": "puff" },
                        { "_id": "samus" },
                        { "_id": "yoshi" }
                    ]);
                });
            });
        });

        it('should find debut > 1990', function () {
            return db.createIndex({
                "index": {
                    "fields": ["name"]
                }
            }).then(function () {
                return db.createIndex({
                    index: { fields: ['debut'] }
                });
            }).then(function () {
                return db.find({
                    selector: { debut: { $gt: 1990 } },
                    fields: ['_id'],
                    sort: ['debut']
                });
            }).then(function (response) {
                assert.deepEqual(response.docs, [
                    { "_id": "kirby" },
                    { "_id": "fox" },
                    { "_id": "ness" },
                    { "_id": "pikachu" },
                    { "_id": "puff" }
                ]);
            });
        });

        it('should find debut > 1990 2', function () {
            return db.createIndex({
                "index": {
                    "fields": ["name"]
                }
            }).then(function () {
                return db.createIndex({
                    index: { fields: ['debut'] }
                });
            }).then(function () {
                return db.createIndex({
                    index: { fields: ['series', 'debut'] }
                });
            }).then(function () {
                return db.find({
                    selector: { debut: { $gt: 1990 } },
                    fields: ['_id'],
                    sort: ['debut']
                });
            }).then(function (response) {
                assert.deepEqual(response.docs, [
                    { "_id": "kirby" },
                    { "_id": "fox" },
                    { "_id": "ness" },
                    { "_id": "pikachu" },
                    { "_id": "puff" }
                ]);
            });
        });

        it('should find debut > 1990 3', function () {
            return db.createIndex({
                "index": {
                    "fields": ["name"]
                }
            }).then(function () {
                return db.createIndex({
                    index: { fields: ['debut'] }
                });
            }).then(function () {
                return db.createIndex({
                    index: { fields: ['series', 'debut'] }
                });
            }).then(function () {
                return db.find({
                    selector: { debut: { $gt: 1990 } },
                    fields: ['_id']
                });
            }).then(function (response) {
                response.docs.sort(sortById);
                assert.deepEqual(response.docs, [
                    { "_id": "fox" },
                    { "_id": "kirby" },
                    { "_id": "ness" },
                    { "_id": "pikachu" },
                    { "_id": "puff" }
                ]);
            });
        });

        it('should find series == mario', function () {
            return db.createIndex({
                "index": {
                    "fields": ["name"]
                }
            }).then(function () {
                return db.createIndex({
                    index: { fields: ['debut'] }
                });
            }).then(function () {
                return db.createIndex({
                    index: { fields: ['series', 'debut'] }
                });
            }).then(function () {
                return db.find({
                    selector: { series: { $eq: 'Mario' } },
                    fields: ['_id', 'debut'],
                    sort: [{ series: 'desc' }, { debut: 'desc' }]
                });
            }).then(function (response) {
                assert.deepEqual(response.docs, [
                    { "_id": "yoshi", "debut": 1990 },
                    { "_id": "luigi", "debut": 1983 },
                    { "_id": "mario", "debut": 1981 },
                    { "_id": "dk", "debut": 1981 }
                ]);
            });
        });

        it('throws an error for an invalid selector/sort', function () {
            return db.createIndex({
                index: { fields: ['series', 'debut'] }
            }).then(function () {
                return db.find({
                    selector: { series: 'Mario', debut: 1981 },
                    sort: ['name']
                });
            }).then(function () {
                throw new Error('expected an error');
            }, function (err) {
                assert.exists(err);
            });
        });
    });

    describe('basic3', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);

                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981, awesome: true },
                    {
                        name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996,
                        awesome: false
                    },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986, awesome: true },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981, awesome: false },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996, awesome: true },
                    {
                        name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990,
                        awesome: true
                    },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983, awesome: false },
                    { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993, awesome: true },
                    { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994, awesome: true },
                    { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986, awesome: true },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990, awesome: true },
                    { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992, awesome: true },
                    {
                        name: 'Master Hand', _id: 'master_hand', series: 'Smash Bros', rank: 0, debut: 1999,
                        awesome: false
                    }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should be able to search for numbers', function () {
            var index = {
                "index": {
                    "fields": ["rank"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: { rank: 12 },
                    fields: ['_id']
                }).then(function (response) {
                    assert.deepEqual(response.docs, [
                        { "_id": "samus" }
                    ]);
                });
            });
        });

        it('should use $exists for an in-memory filter', function () {
            var index = {
                "index": {
                    "fields": ["rank"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: { rank: 12, name: { $exists: true } },
                    fields: ['_id']
                }).then(function (response) {
                    assert.deepEqual(response.docs, [
                        { "_id": "samus" }
                    ]);
                });
            });
        });

        it('should be able to search for 0', function () {
            var index = {
                "index": {
                    "fields": ["rank"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: { rank: 0 },
                    fields: ['_id']
                }).then(function (response) {
                    assert.deepEqual(response.docs, [
                        { "_id": "master_hand" }
                    ]);
                });
            });
        });

        it('should be able to search for boolean true', function () {
            var index = {
                "index": {
                    "fields": ["awesome"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: { awesome: true },
                    fields: ['_id']
                }).then(function (response) {
                    response.docs.sort(sortById);
                    assert.deepEqual(response.docs, [{ "_id": "falcon" }, { "_id": "fox" }, { "_id": "kirby" },
                    { "_id": "link" }, { "_id": "mario" }, { "_id": "ness" }, { "_id": "pikachu" },
                    { "_id": "samus" }, { "_id": "yoshi" }]);
                });
            });
        });

        it('should be able to search for boolean true', function () {
            var index = {
                "index": {
                    "fields": ["awesome"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: { awesome: false },
                    fields: ['_id']
                }).then(function (response) {
                    response.docs.sort(sortById);
                    assert.deepEqual(response.docs, [{ "_id": "dk" }, { "_id": "luigi" },
                    { "_id": "master_hand" }, { "_id": "puff" }]);
                });
            });
        });

        it('#73 should be able to create a custom index name', function () {
            var index = {
                index: {
                    fields: ["awesome"],
                    name: 'myindex',
                    ddoc: 'mydesigndoc'
                }
            };
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (res) {
                var indexes = res.indexes.map(function (index) {
                    return {
                        name: index.name,
                        ddoc: index.ddoc,
                        type: index.type
                    };
                });
                assert.deepEqual(indexes, [
                    {
                        name: '_all_docs',
                        type: 'special',
                        ddoc: null
                    },
                    {
                        name: 'myindex',
                        ddoc: '_design/mydesigndoc',
                        type: 'json'
                    }
                ]);
                return db.get('_design/mydesigndoc');
            });
        });

        it('#73 should be able to create a custom index, alt style', function () {
            var index = {
                index: {
                    fields: ["awesome"],
                },
                name: 'myindex',
                ddoc: 'mydesigndoc'
            };
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (res) {
                var indexes = res.indexes.map(function (index) {
                    return {
                        name: index.name,
                        ddoc: index.ddoc,
                        type: index.type
                    };
                });
                assert.deepEqual(indexes, [
                    {
                        name: '_all_docs',
                        type: 'special',
                        ddoc: null
                    },
                    {
                        name: 'myindex',
                        ddoc: '_design/mydesigndoc',
                        type: 'json'
                    }
                ]);
                return db.get('_design/mydesigndoc');
            });
        });

        it('#73 should be able to create a custom index, alt style 2', function () {
            var index = {
                name: 'myindex',
                ddoc: 'mydesigndoc',
                fields: ["awesome"]
            };
            return db.createIndex(index).then(function () {
                return db.getIndexes();
            }).then(function (res) {
                var indexes = res.indexes.map(function (index) {
                    return {
                        name: index.name,
                        ddoc: index.ddoc,
                        type: index.type
                    };
                });
                assert.deepEqual(indexes, [
                    {
                        name: '_all_docs',
                        type: 'special',
                        ddoc: null
                    },
                    {
                        name: 'myindex',
                        ddoc: '_design/mydesigndoc',
                        type: 'json'
                    }
                ]);
                return db.get('_design/mydesigndoc');
            });
        });

        it('#6277 selector as an empty object', function () {
            return db.createIndex({
                index: {
                    fields: ['rank', 'awesome']
                },
            }).then(function () {
                return db.find({
                    selector: { rank: 8, awesome: null }
                });
            }).then(function () {
                return db.find({
                    selector: { rank: 8, awesome: {} }
                });
            });
        });
    });

    describe('callbacks', function () {
        const dbs = {};
        let db;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            return testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should create an index', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return new Promise(function (resolve, reject) {
                return db.createIndex(index, function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res);
                });
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'created');
                return new Promise(function (resolve, reject) {
                    db.createIndex(index, function (err, res) {
                        if (err) {
                            return reject(err);
                        }
                        return resolve(res);
                    });
                });
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'exists');
            });
        });

        it('should find existing indexes', function () {
            return new Promise(function (resolve, reject) {
                db.getIndexes(function (err, response) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(response);
                });
            }).then(function (response) {
                assert.deepEqual(response, {
                    "total_rows": 1,
                    indexes: [{
                        ddoc: null,
                        name: '_all_docs',
                        type: 'special',
                        def: { fields: [{ _id: 'asc' }] }
                    }]
                });
                var index = {
                    "index": {
                        "fields": ["foo"]
                    },
                    "name": "foo-index",
                    "type": "json"
                };
                return db.createIndex(index);
            }).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                var ddoc = resp.indexes[1].ddoc;
                assert.match(ddoc, /_design\/.+/);
                delete resp.indexes[1].ddoc;
                assert.deepEqual(resp, {
                    "total_rows": 2,
                    "indexes": [
                        {
                            "ddoc": null,
                            "name": "_all_docs",
                            "type": "special",
                            "def": {
                                "fields": [
                                    {
                                        "_id": "asc"
                                    }
                                ]
                            }
                        },
                        {
                            "name": "foo-index",
                            "type": "json",
                            "def": {
                                "fields": [
                                    {
                                        "foo": "asc"
                                    }
                                ]
                            }
                        }
                    ]
                });
            });
        });
    });

    describe('combinational', function () {
        const dbs = {};
        let db;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            return testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        describe('$or', function () {
            it('does $or queries', function () {
                var index = {
                    "index": {
                        "fields": ["age"]
                    },
                    "name": "age-index",
                    "type": "json"
                };

                return db.createIndex(index).then(function () {
                    return db.bulkDocs([
                        { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                        { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                        { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                        { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                    ]);
                }).then(function () {
                    return db.find({
                        selector: {
                            $and: [
                                { age: { $gte: 75 } },
                                {
                                    $or: [
                                        { "name.first": "Nancy" },
                                        { "name.first": "Mick" }
                                    ]
                                }
                            ]
                        }
                    });
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                        { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } }
                    ]);
                });
            });

            it('does $or queries 2', function () {
                var index = {
                    "index": {
                        "fields": ["_id"]
                    },
                    "name": "age-index",
                    "type": "json"
                };

                return db.createIndex(index).then(function () {
                    return db.bulkDocs([
                        { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                        { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                        { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                        { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                        { _id: '5', age: 40, name: { first: 'Dave', surname: 'Grohl' } }
                    ]);
                }).then(function () {
                    return db.find({
                        selector: {
                            $and: [
                                { _id: { $gte: '0' } },
                                {
                                    $or: [
                                        { "name.first": "Nancy" },
                                        { age: { $lte: 40 } }
                                    ]
                                }
                            ]
                        }
                    });
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                        { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                        { _id: '5', age: 40, name: { first: 'Dave', surname: 'Grohl' } }
                    ]);
                });
            });

        });

        describe('$nor', function () {
            it('does $nor queries', function () {
                var index = {
                    "index": {
                        "fields": ["age"]
                    },
                    "name": "age-index",
                    "type": "json"
                };

                return db.createIndex(index).then(function () {
                    return db.bulkDocs([
                        { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                        { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                        { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                        { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                    ]);
                }).then(function () {
                    return db.find({
                        selector: {
                            $and: [
                                { age: { $gte: 75 } },
                                {
                                    $nor: [
                                        { "name.first": "Nancy" },
                                        { "name.first": "Mick" }
                                    ]
                                }
                            ]
                        }
                    });
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                    ]);
                });
            });

            it('does $nor queries 2', function () {
                var index = {
                    "index": {
                        "fields": ["_id"]
                    },
                    "name": "age-index",
                    "type": "json"
                };

                return db.createIndex(index).then(function () {
                    return db.bulkDocs([
                        { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                        { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                        { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                        { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                        { _id: '5', age: 40, name: { first: 'Dave', surname: 'Grohl' } }
                    ]);
                }).then(function () {
                    return db.find({
                        selector: {
                            $and: [
                                { _id: { $lte: '6' } },
                                {
                                    $nor: [
                                        { "name.first": "Nancy" },
                                        { age: { $lte: 40 } }
                                    ]
                                }
                            ]
                        }
                    });
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                        { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                    ]);
                });
            });

            it('handles $or/$nor typos', function () {
                var index = {
                    "index": {
                        "fields": ["_id"]
                    },
                    "name": "age-index",
                    "type": "json"
                };

                return db.createIndex(index).then(function () {
                    return db.bulkDocs([
                        { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                        { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                        { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                        { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                        { _id: '5', age: 40, name: { first: 'Dave', surname: 'Grohl' } }
                    ]);
                }).then(function () {
                    return db.find({
                        selector: {
                            $and: [
                                { _id: { $lte: '6' } },
                                {
                                    $noor: [
                                        { "name.first": "Nancy" },
                                        { age: { $lte: 40 } }
                                    ]
                                }
                            ]
                        }
                    });
                }).then(function () {
                    throw new Error('expected an error');
                }, function (err) {
                    assert.exists(err);
                });
            });

        });
    });

    describe('ddoc', function () {
        const dbs = {};
        let db;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            return testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should create an index', function () {
            var index = {
                index: {
                    fields: ["foo"]
                },
                name: "foo-index",
                type: "json",
                ddoc: 'foo'
            };
            return db.createIndex(index).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'created');
                return db.createIndex(index);
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'exists');
                return db.getIndexes();
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "total_rows": 2,
                    "indexes": [
                        {
                            "ddoc": null,
                            "name": "_all_docs",
                            "type": "special",
                            "def": {
                                "fields": [
                                    {
                                        "_id": "asc"
                                    }
                                ]
                            }
                        },
                        {
                            "ddoc": "_design/foo",
                            "name": "foo-index",
                            "type": "json",
                            "def": {
                                "fields": [
                                    {
                                        "foo": "asc"
                                    }
                                ]
                            }
                        }
                    ]
                });
            });
        });

        it('should create an index, existing ddoc', function () {
            var index = {
                index: {
                    fields: ["foo"]
                },
                name: "foo-index",
                type: "json",
                ddoc: 'foo'
            };
            return db.put({
                _id: '_design/foo',
                "language": "query"
            }).then(function () {
                return db.createIndex(index);
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'created');
                return db.createIndex(index);
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'exists');
                return db.getIndexes();
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "total_rows": 2,
                    "indexes": [
                        {
                            "ddoc": null,
                            "name": "_all_docs",
                            "type": "special",
                            "def": {
                                "fields": [
                                    {
                                        "_id": "asc"
                                    }
                                ]
                            }
                        },
                        {
                            "ddoc": "_design/foo",
                            "name": "foo-index",
                            "type": "json",
                            "def": {
                                "fields": [
                                    {
                                        "foo": "asc"
                                    }
                                ]
                            }
                        }
                    ]
                });
            });
        });

        it('should create an index, reused ddoc', function () {
            var index = {
                index: {
                    fields: ["foo"]
                },
                name: "foo-index",
                type: "json",
                ddoc: 'myddoc'
            };
            var index2 = {
                index: {
                    fields: ['bar']
                },
                name: "bar-index",
                ddoc: 'myddoc'
            };
            return db.createIndex(index).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'created');
                return db.createIndex(index);
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'foo-index');
                assert.equal(response.result, 'exists');
                return db.createIndex(index2);
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'bar-index');
                assert.equal(response.result, 'created');
                return db.createIndex(index2);
            }).then(function (response) {
                assert.match(response.id, /^_design\//);
                assert.equal(response.name, 'bar-index');
                assert.equal(response.result, 'exists');
            }).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "total_rows": 3,
                    "indexes": [
                        {
                            "ddoc": null,
                            "name": "_all_docs",
                            "type": "special",
                            "def": {
                                "fields": [
                                    {
                                        "_id": "asc"
                                    }
                                ]
                            }
                        },
                        {
                            "ddoc": "_design/myddoc",
                            "name": "bar-index",
                            "type": "json",
                            "def": {
                                "fields": [
                                    {
                                        "bar": "asc"
                                    }
                                ]
                            }
                        },
                        {
                            "ddoc": "_design/myddoc",
                            "name": "foo-index",
                            "type": "json",
                            "def": {
                                "fields": [
                                    {
                                        "foo": "asc"
                                    }
                                ]
                            }
                        }
                    ]
                });
            });
        });

        it('Error: invalid ddoc lang', function () {
            var index = {
                index: {
                    fields: ["foo"]
                },
                name: "foo-index",
                type: "json",
                ddoc: 'foo'
            };
            return db.put({
                _id: '_design/foo'
            }).then(function () {
                return db.createIndex(index);
            }).then(function () {
                throw new Error('shouldnt be here');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('handles ddoc with no views and ignores it', function () {
            return db.put({
                _id: '_design/missing-view',
                language: 'query'
            }).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                assert.lengthOf(resp.indexes, 1);
            });

        });
    });

    describe('deep-fields', function () {
        const dbs = {};
        let db;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            return testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('deep fields', function () {
            var index = {
                "index": {
                    "fields": [
                        "foo.bar"
                    ]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'doc', foo: { bar: 'a' } },
                ]);
            }).then(function () {
                return db.find({
                    selector: { 'foo.bar': 'a' },
                    fields: ['_id']
                });
            }).then(function (res) {
                assert.deepEqual(res, {
                    "docs": [
                        {
                            "_id": "doc"
                        }
                    ]
                });
            });
        });

        it('deeper fields', function () {
            var index = {
                "index": {
                    "fields": [
                        "foo.bar.baz"
                    ]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'doc', foo: { bar: { baz: 'a' } } },
                ]);
            }).then(function () {
                return db.find({
                    selector: { 'foo.bar.baz': 'a' },
                    fields: ['_id']
                });
            }).then(function (res) {
                assert.deepEqual(res, {
                    "docs": [
                        {
                            "_id": "doc"
                        }
                    ]
                });
            });
        });

        it('deep fields escaped', function () {
            var index = {
                "index": {
                    "fields": [
                        "foo\\.bar"
                    ]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'doc1', foo: { bar: 'a' } },
                    { _id: 'doc2', 'foo.bar': 'a' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { 'foo\\.bar': 'a' },
                    fields: ['_id']
                });
            }).then(function (res) {
                assert.deepEqual(res, {
                    "docs": [{ "_id": "doc2" }]
                });
            });
        });

        it('should create a deep multi mapper', function () {
            var index = {
                "index": {
                    "fields": [
                        "foo.bar", "bar.baz"
                    ]
                }
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'a', foo: { bar: 'yo' }, bar: { baz: 'hey' } },
                    { _id: 'b', foo: { bar: 'sup' }, bar: { baz: 'dawg' } }
                ]);
            }).then(function () {
                return db.find({
                    selector: { "foo.bar": 'yo', "bar.baz": 'hey' },
                    fields: ['_id']
                });
            }).then(function (res) {
                assert.deepEqual(res.docs, [{ _id: 'a' }]);
                return db.find({
                    selector: { "foo.bar": 'yo', "bar.baz": 'sup' },
                    fields: ['_id']
                });
            }).then(function (res) {
                assert.lengthOf(res.docs, 0);
                return db.find({
                    selector: { "foo.bar": 'bruh', "bar.baz": 'nah' },
                    fields: ['_id']
                });
            }).then(function (res) {
                assert.lengthOf(res.docs, 0);
            });
        });

        it('should create a deep multi mapper, tricky docs', function () {
            var index = {
                "index": {
                    "fields": [
                        "foo.bar", "bar.baz"
                    ]
                }
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'a', foo: { bar: 'yo' }, bar: { baz: 'hey' } },
                    { _id: 'b', foo: { bar: 'sup' }, bar: { baz: 'dawg' } },
                    { _id: 'c', foo: true, bar: "yo" },
                    { _id: 'd', foo: null, bar: [] }
                ]);
            }).then(function () {
                return db.find({
                    selector: { "foo.bar": 'yo', "bar.baz": 'hey' },
                    fields: ['_id']
                });
            }).then(function (res) {
                assert.deepEqual(res.docs, [{ _id: 'a' }]);
                return db.find({
                    selector: { "foo.bar": 'yo', "bar.baz": 'sup' },
                    fields: ['_id']
                });
            }).then(function (res) {
                assert.lengthOf(res.docs, 0);
                return db.find({
                    selector: { "foo.bar": 'bruh', "bar.baz": 'nah' },
                    fields: ['_id']
                });
            }).then(function (res) {
                assert.lengthOf(res.docs, 0);
            });
        });
    });

    describe('default-index', function () {
        const dbs = {};
        let db;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            return testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('uses all_docs with warning if no index found simple query 1', function () {
            return db.bulkDocs([
                { name: 'mario', _id: 'mario', rank: 5, series: 'mario', debut: 1981 },
                { name: 'jigglypuff', _id: 'puff', rank: 8, series: 'pokemon', debut: 1996 },
                { name: 'link', rank: 10, _id: 'link', series: 'zelda', debut: 1986 },
                { name: 'donkey kong', rank: 7, _id: 'dk', series: 'mario', debut: 1981 },
                { name: 'pikachu', series: 'pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                { name: 'captain falcon', _id: 'falcon', rank: 4, series: 'f-zero', debut: 1990 },
                { name: 'luigi', rank: 11, _id: 'luigi', series: 'mario', debut: 1983 },
                { name: 'fox', _id: 'fox', rank: 3, series: 'star fox', debut: 1993 },
                { name: 'ness', rank: 9, _id: 'ness', series: 'earthbound', debut: 1994 },
                { name: 'samus', rank: 12, _id: 'samus', series: 'metroid', debut: 1986 },
                { name: 'yoshi', _id: 'yoshi', rank: 6, series: 'mario', debut: 1990 },
                { name: 'kirby', _id: 'kirby', series: 'kirby', rank: 2, debut: 1992 }
            ]).then(function () {
                return db.find({
                    selector: {
                        series: 'mario'
                    },
                    fields: ["_id"],
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    warning: 'no matching index found, create an index to optimize query time',
                    docs: [
                        { _id: 'dk' },
                        { _id: 'luigi' },
                        { _id: 'mario' },
                        { _id: 'yoshi' }
                    ]
                });
            });
        });

        it('uses all_docs with warning if no index found simple query 2', function () {
            return db.bulkDocs([
                { name: 'mario', _id: 'mario', rank: 5, series: 'mario', debut: 1981 },
                { name: 'jigglypuff', _id: 'puff', rank: 8, series: 'pokemon', debut: 1996 },
                { name: 'link', rank: 10, _id: 'link', series: 'zelda', debut: 1986 },
                { name: 'donkey kong', rank: 7, _id: 'dk', series: 'mario', debut: 1981 },
                { name: 'pikachu', series: 'pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                { name: 'captain falcon', _id: 'falcon', rank: 4, series: 'f-zero', debut: 1990 },
                { name: 'luigi', rank: 11, _id: 'luigi', series: 'mario', debut: 1983 },
                { name: 'fox', _id: 'fox', rank: 3, series: 'star fox', debut: 1993 },
                { name: 'ness', rank: 9, _id: 'ness', series: 'earthbound', debut: 1994 },
                { name: 'samus', rank: 12, _id: 'samus', series: 'metroid', debut: 1986 },
                { name: 'yoshi', _id: 'yoshi', rank: 6, series: 'mario', debut: 1990 },
                { name: 'kirby', _id: 'kirby', series: 'kirby', rank: 2, debut: 1992 }
            ]).then(function () {
                return db.find({
                    selector: {
                        debut: {
                            $gt: 1992,
                            $lte: 1996
                        },
                        rank: {
                            $gte: 3,
                            $lte: 8
                        }
                    },
                    fields: ["_id"],
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    warning: 'no matching index found, create an index to optimize query time',
                    docs: [
                        { _id: 'fox' },
                        { _id: 'puff' }
                    ]
                });
            });
        });

        it('works with complex query', function () {
            return db.bulkDocs([
                { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
            ]).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { age: { $gte: 40 } },
                            { $not: { age: { $eq: 75 } } },
                        ]
                    },
                    fields: ["_id"],
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    warning: 'no matching index found, create an index to optimize query time',
                    docs: [
                        { _id: '2' },
                        { _id: '3' },
                        { _id: '4' }
                    ]
                });
            });
        });

        it('throws an error if a sort is required', function () {
            return db.bulkDocs([
                { _id: '1', foo: 'eyo' },
                { _id: '2', foo: 'ebb' },
                { _id: '3', foo: 'eba' },
                { _id: '4', foo: 'abo' }
            ]).then(function () {
                return db.find({
                    selector: { foo: { $ne: "eba" } },
                    fields: ["_id", "foo"],
                    sort: [{ "foo": "asc" }]
                });
            }).then(function () {
                throw new Error('should have thrown an error');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('sorts ok if _id used', function () {
            return db.bulkDocs([
                { _id: '1', foo: 'eyo' },
                { _id: '2', foo: 'ebb' },
                { _id: '3', foo: 'eba' },
                { _id: '4', foo: 'abo' }
            ]).then(function () {
                return db.find({
                    selector: { foo: { $ne: "eba" } },
                    fields: ["_id",],
                    sort: ["_id"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    warning: 'no matching index found, create an index to optimize query time',
                    docs: [
                        { _id: '1' },
                        { _id: '2' },
                        { _id: '4' }
                    ]
                });
            });
        });

        it('$in works with default operator', function () {
            return db.bulkDocs([
                { _id: '1', foo: 'eyo' },
                { _id: '2', foo: 'ebb' },
                { _id: '3', foo: 'eba' },
                { _id: '4', foo: 'abo' }
            ]).then(function () {
                return db.find({
                    selector: { foo: { $in: ["eba", "ebb"] } },
                    fields: ["_id"],
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    warning: 'no matching index found, create an index to optimize query time',
                    docs: [
                        { _id: '2' },
                        { _id: '3' }
                    ]
                });
            });
        });

        //bug in mango its not sorting this on Foo but actually sorting on _id
        it.skip('ne query will work and sort', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 4 },
                    { _id: '2', foo: 3 },
                    { _id: '3', foo: 2 },
                    { _id: '4', foo: 1 }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { $ne: "eba" } },
                    fields: ["_id", "foo"],
                    sort: [{ foo: "desc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    warning: 'no matching index found, create an index to optimize query time',
                    docs: [
                        { _id: '4' },
                        { _id: '2' },
                        { _id: '1' }
                    ]
                });
            });
        });

        //need to find out what the correct response for this is
        it.skip('$and empty selector returns empty docs', function () {
            return db.createIndex({
                index: {
                    fields: ['foo']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 1 },
                    { _id: '2', foo: 2 },
                    { _id: '3', foo: 3 },
                    { _id: '4', foo: 4 }
                ]);
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [{}, {}]
                    },
                    fields: ['_id']
                }).then(function (resp) {
                    assert.deepEqual(resp, {
                        warning: 'no matching index found, create an index to optimize query time',
                        docs: []
                    });
                });
            });
        });

        it.skip('empty selector returns empty docs', function () {
            return db.createIndex({
                index: {
                    fields: ['foo']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 1 },
                    { _id: '2', foo: 2 },
                    { _id: '3', foo: 3 },
                    { _id: '4', foo: 4 }
                ]);
            }).then(function () {
                return db.find({
                    selector: {
                    },
                    fields: ['_id']
                }).then(function (resp) {
                    assert.deepEqual(resp, {
                        warning: 'no matching index found, create an index to optimize query time',
                        docs: [
                            { _id: '1' },
                            { _id: '2' },
                            { _id: '3' },
                            { _id: '4' }
                        ]
                    });
                });
            });
        });

        it('$elemMatch works with no other index', function () {
            return db.createIndex({
                index: {
                    fields: ['foo']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: [1] },
                    { _id: '2', foo: [2] },
                    { _id: '3', foo: [3] },
                    { _id: '4', foo: [4] }
                ]);
            }).then(function () {
                return db.find({
                    selector: {
                        foo: { $elemMatch: { $gte: 3 } }
                    },
                    fields: ['_id']
                }).then(function (resp) {
                    assert.deepEqual(resp, {
                        warning: 'no matching index found, create an index to optimize query time',
                        docs: [
                            { _id: "3" },
                            { _id: "4" }
                        ]
                    });
                });
            });
        });

        it.skip('error - no usable index', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    "selector": { "foo": "$exists" },
                    "fields": ["_id", "foo"],
                    "sort": [{ "bar": "asc" }]
                });
            }).then(function () {
                throw new Error('shouldnt be here');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('handles just regex selector', function () {
            return db.bulkDocs([
                { _id: '1', foo: 1 },
                { _id: '2', foo: 2 },
                { _id: '3', foo: 3 },
                { _id: '4', foo: 4 }
            ]).then(function () {
                return db.find({
                    selector: {
                        _id: { $regex: "1" }
                    },
                    fields: ['_id']
                }).then(function (resp) {
                    assert.deepEqual(resp, {
                        warning: 'no matching index found, create an index to optimize query time',
                        docs: [
                            { _id: "1" }
                        ]
                    });
                });
            });
        });
    });

    describe('elem-match', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);

                db.bulkDocs([
                    { '_id': 'peach', eats: ['cake', 'turnips', 'sweets'], results: [82, 85, 88] },
                    { '_id': 'sonic', eats: ['chili dogs'], results: [75, 88, 89] },
                    { '_id': 'fox', eats: [] },
                    { '_id': 'mario', eats: ['cake', 'mushrooms'] },
                    { '_id': 'samus', eats: ['pellets'] },
                    { '_id': 'kirby', eats: 'anything', results: [82, 86, 10] }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('basic test', function () {
            return db.find({
                selector: {
                    _id: { $gt: 'a' },
                    eats: { $elemMatch: { $eq: 'cake' } }
                }
            }).then(function (resp) {
                assert.deepEqual(resp.docs.map(function (doc) {
                    return doc._id;
                }).sort(), ['mario', 'peach']);
            });
        });

        it('basic test with two operators', function () {
            return db.find({
                selector: {
                    _id: { $gt: 'a' },
                    results: { $elemMatch: { $gte: 80, $lt: 85 } }
                }
            }).then(function (resp) {
                assert.deepEqual(resp.docs.map(function (doc) {
                    return doc._id;
                }), ['kirby', 'peach']);
            });
        });

        it('with object in array', function () {
            var docs = [
                { _id: '1', events: [{ eventId: 1, status: 'completed' }, { eventId: 2, status: 'started' }] },
                { _id: '2', events: [{ eventId: 1, status: 'pending' }, { eventId: 2, status: 'finished' }] },
                { _id: '3', events: [{ eventId: 1, status: 'pending' }, { eventId: 2, status: 'started' }] },
            ];

            return db.bulkDocs(docs).then(function () {
                return db.find({
                    selector: {
                        _id: { $gt: null },
                        events: { $elemMatch: { "status": { $eq: 'pending' }, "eventId": { $eq: 1 } } },
                    },
                    fields: ['_id']
                }).then(function (resp) {
                    assert.deepEqual(resp.docs.map(function (doc) {
                        return doc._id;
                    }), ['2', '3']);
                });
            });
        });
    });

    describe('eq', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('does eq queries', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo' },
                    { _id: '2', foo: 'ebb' },
                    { _id: '3', foo: 'eba' },
                    { _id: '4', foo: 'abo' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: "eba" },
                    fields: ["_id", "foo"],
                    sort: [{ foo: "asc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '3', foo: 'eba' }
                    ]
                });
            });
        });

        it('does explicit $eq queries', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo' },
                    { _id: '2', foo: 'ebb' },
                    { _id: '3', foo: 'eba' },
                    { _id: '4', foo: 'abo' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { $eq: "eba" } },
                    fields: ["_id", "foo"],
                    sort: [{ foo: "asc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '3', foo: 'eba' }
                    ]
                });
            });
        });

        it('does eq queries, no fields', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo' },
                    { _id: '2', foo: 'ebb' },
                    { _id: '3', foo: 'eba' },
                    { _id: '4', foo: 'abo' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: "eba" },
                    sort: [{ foo: "asc" }]
                });
            }).then(function (resp) {
                assert.exists(resp.docs[0]._rev);
                delete resp.docs[0]._rev;
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '3', foo: 'eba' }
                    ]
                });
            });
        });

        it('does eq queries, no fields or sort', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo' },
                    { _id: '2', foo: 'ebb' },
                    { _id: '3', foo: 'eba' },
                    { _id: '4', foo: 'abo' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: "eba" }
                });
            }).then(function (resp) {
                assert.exists(resp.docs[0]._rev);
                delete resp.docs[0]._rev;
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '3', foo: 'eba' }
                    ]
                });
            });
        });

        it('does eq queries, no index name', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo' },
                    { _id: '2', foo: 'ebb' },
                    { _id: '3', foo: 'eba' },
                    { _id: '4', foo: 'abo' }
                ]);
            }).then(function () {
                return db.getIndexes();
            }).then(function (resp) {
                // this is some kind of auto-generated hash
                assert.match(resp.indexes[1].ddoc, /_design\/.*/);
                var ddocName = resp.indexes[1].ddoc.split('/')[1];
                assert.equal(resp.indexes[1].name, ddocName);
                delete resp.indexes[1].ddoc;
                delete resp.indexes[1].name;
                assert.deepEqual(resp, {
                    "total_rows": 2,
                    "indexes": [
                        {
                            "ddoc": null,
                            "name": "_all_docs",
                            "type": "special",
                            "def": {
                                "fields": [
                                    {
                                        "_id": "asc"
                                    }
                                ]
                            }
                        },
                        {
                            "type": "json",
                            "def": {
                                "fields": [
                                    {
                                        "foo": "asc"
                                    }
                                ]
                            }
                        }
                    ]
                });
                return db.get('_design/' + ddocName);
            }).then(function (ddoc) {
                var ddocId = ddoc._id.split('/')[1];

                assert.deepEqual(Object.keys(ddoc.views), [ddocId]);
                delete ddoc._id;
                delete ddoc._rev;
                ddoc.views.theView = ddoc.views[ddocId];
                delete ddoc.views[ddocId];
                delete ddoc.views.theView.options.w;

                assert.deepEqual(ddoc, {
                    "language": "query",
                    "views": {
                        theView: {
                            "map": {
                                "fields": {
                                    "foo": "asc"
                                }
                            },
                            "reduce": "_count",
                            "options": {
                                "def": {
                                    "fields": [
                                        "foo"
                                    ]
                                }
                            }
                        }
                    }
                });

                return db.find({
                    selector: { foo: "eba" }
                });
            }).then(function (resp) {
                assert.exists(resp.docs[0]._rev);
                delete resp.docs[0]._rev;
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '3', foo: 'eba' }
                    ]
                });
            });
        });

        it('#7 does eq queries 1', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo', bar: 'zxy' },
                    { _id: '2', foo: 'ebb', bar: 'zxy' },
                    { _id: '3', foo: 'eba', bar: 'zxz' },
                    { _id: '4', foo: 'abo', bar: 'zxz' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { $gt: "a" }, bar: { $eq: 'zxy' } },
                    fields: ["_id"],
                    sort: [{ foo: "asc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '2' },
                        { _id: '1' }
                    ]
                });
            });
        });

        it('#7 does eq queries 2', function () {
            var index = {
                "index": {
                    "fields": ["foo", "bar"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo', bar: 'zxy' },
                    { _id: '2', foo: 'ebb', bar: 'zxy' },
                    { _id: '3', foo: 'eba', bar: 'zxz' },
                    { _id: '4', foo: 'abo', bar: 'zxz' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { $gt: "a" }, bar: { $eq: 'zxy' } },
                    fields: ["_id"],
                    sort: [{ foo: "asc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '2' },
                        { _id: '1' }
                    ]
                });
            });
        });

        it('#170 does queries with a null value', function () {
            var index = {
                "index": {
                    "fields": ["field1"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', field1: null, field2: null },
                    { _id: '2', field1: null, field2: "1" },
                    { _id: '3', field1: "1", field2: null },
                ]);
            }).then(function () {
                return db.find({
                    selector: { field1: null },
                    fields: ["_id"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '1' },
                        { _id: '2' }
                    ]
                });
            });
        });

        it('#170 does queries with a null value (explicit $eq)', function () {
            var index = {
                "index": {
                    "fields": ["field1"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', field1: null, field2: null },
                    { _id: '2', field1: null, field2: "1" },
                    { _id: '3', field1: "1", field2: null },
                ]);
            }).then(function () {
                return db.find({
                    selector: { field1: { $eq: null } },
                    fields: ["_id"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '1' },
                        { _id: '2' }
                    ]
                });
            });
        });

        it('#170 does queries with multiple null values', function () {
            var index = {
                "index": {
                    "fields": ["field1"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', field1: null, field2: null },
                    { _id: '2', field1: null, field2: "1" },
                    { _id: '3', field1: "1", field2: null },
                ]);
            }).then(function () {
                return db.find({
                    selector: { field1: null, field2: null },
                    fields: ["_id"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '1' }
                    ]
                });
            });
        });

        it('#170 does queries with multiple null values - $lte', function () {
            var index = {
                "index": {
                    "fields": ["field1"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', field1: null, field2: null },
                    { _id: '2', field1: null, field2: "1" },
                    { _id: '3', field1: "1", field2: null },
                ]);
            }).then(function () {
                return db.find({
                    selector: { field1: null, field2: { $lte: null } },
                    fields: ["_id"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '1' }
                    ]
                });
            });
        });

        // TODO: investigate later - this fails in both Couch and Pouch, but I
        // believe it shouldn't.
        it.skip('#170 does queries with multiple null values - $gte', function () {
            var index = {
                "index": {
                    "fields": ["field1"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', field1: null, field2: null },
                    { _id: '2', field1: null, field2: "1" },
                    { _id: '3', field1: "1", field2: null },
                ]);
            }).then(function () {
                return db.find({
                    selector: { field1: null, field2: { $gte: null } },
                    fields: ["_id"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '1' }
                    ]
                });
            });
        });

        it('#170 does queries with multiple null values - $ne', function () {
            var index = {
                "index": {
                    "fields": ["field1"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', field1: null, field2: null },
                    { _id: '2', field1: null, field2: "1" },
                    { _id: '3', field1: "1", field2: null },
                ]);
            }).then(function () {
                return db.find({
                    selector: { field1: null, field2: { $ne: null } },
                    fields: ["_id"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '2' }
                    ]
                });
            });
        });

        it('#170 does queries with multiple null values - $mod', function () {
            var index = {
                "index": {
                    "fields": ["field1"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', field1: null, field2: null },
                    { _id: '2', field1: null, field2: 1 },
                    { _id: '3', field1: 1, field2: null },
                ]);
            }).then(function () {
                return db.find({
                    selector: { field1: null, field2: { $mod: [1, 0] } },
                    fields: ["_id"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '2' }
                    ]
                });
            });
        });

        it('#170 does queries with multiple null values - $mod', function () {
            var index = {
                "index": {
                    "fields": ["field1"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', field1: null, field2: null },
                    { _id: '2', field1: null, field2: null },
                    { _id: '3', field1: null, field2: null },
                ]);
            }).then(function () {
                return db.find({
                    selector: { field1: null, field2: { $mod: [1, 0] } },
                    fields: ["_id"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                    ]
                });
            });
        });
    });

    describe('errors', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('error: gimme some args', function () {
            return db.find().then(function () {
                throw Error('should not be here');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('error: missing required key selector', function () {
            return db.find({}).then(function () {
                throw Error('should not be here');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('error: unsupported mixed sort', function () {
            var index = {
                "index": {
                    "fields": [
                        { "foo": "desc" },
                        "bar"
                    ]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                throw new Error('should not be here');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('error: invalid sort json', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo' },
                    { _id: '2', foo: 'ebb' },
                    { _id: '3', foo: 'eba' },
                    { _id: '4', foo: 'abo' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { "$lte": "eba" } },
                    fields: ["_id", "foo"],
                    sort: { foo: "asc" }
                });
            }).then(function () {
                throw new Error('shouldnt be here');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('error: conflicting sort and selector', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    "selector": { "foo": { "$gt": "\u0000\u0000" } },
                    "fields": ["_id", "foo"],
                    "sort": [{ "_id": "asc" }]
                });
            }).then(function (res) {
                assert.match(res.warning, /no matching index found/);
            });
        });

        it('error - no selector', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    "fields": ["_id", "foo"],
                    "sort": [{ "foo": "asc" }]
                });
            }).then(function () {
                throw new Error('shouldnt be here');
            }, function (err) {
                assert.exists(err);
            });
        });

        it('invalid ddoc', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "ddoc": "myddoc",
                "type": "json"
            };

            return db.put({
                _id: '_design/myddoc',
                views: {
                    'foo-index': {
                        map: "function (){emit(1)}"
                    }
                }
            }).then(function () {
                return db.createIndex(index).then(function () {
                    throw new Error('expected an error');
                }, function (err) {
                    assert.exists(err);
                });
            });
        });

        it('non-logical errors with no other selector', function () {
            return db.createIndex({
                index: {
                    fields: ['foo']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 1 },
                    { _id: '2', foo: 2 },
                    { _id: '3', foo: 3 },
                    { _id: '4', foo: 4 }
                ]);
            }).then(function () {
                return db.find({
                    selector: {
                        foo: { $mod: { gte: 3 } }
                    }
                }).then(function () {
                    throw new Error('expected an error');
                }, function (err) {
                    assert.exists(err);
                });
            });
        });
    });

    describe('exists', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('does $exists queries - true', function () {
            return db.bulkDocs([
                { _id: 'a', foo: 'bar' },
                { _id: 'b', foo: { yo: 'dude' } },
                { _id: 'c', foo: null },
                { _id: 'd' }
            ]).then(function () {
                return db.find({
                    selector: {
                        _id: { $gt: null },
                        'foo': { '$exists': true }
                    },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [
                    { "_id": "a" },
                    { "_id": "b" },
                    { "_id": "c" }
                ]);
            });
        });

        it('does $exists queries - false', function () {
            return db.bulkDocs([
                { _id: 'a', foo: 'bar' },
                { _id: 'b', foo: { yo: 'dude' } },
                { _id: 'c', foo: null },
                { _id: 'd' }
            ]).then(function () {
                return db.find({
                    selector: {
                        _id: { $gt: null },
                        'foo': { '$exists': false }
                    },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [
                    { "_id": "d" }
                ]);
            });
        });

        it('does $exists queries - true/undef (multi-field)', function () {
            return db.bulkDocs([
                { _id: 'a', foo: 'bar', bar: 'baz' },
                { _id: 'b', foo: { yo: 'dude' } },
                { _id: 'c', foo: null, bar: 'quux' },
                { _id: 'd' }
            ]).then(function () {
                return db.find({
                    selector: {
                        _id: { $gt: null },
                        'foo': { '$exists': true }
                    },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [
                    { "_id": "a" },
                    { "_id": "b" },
                    { "_id": "c" }
                ]);
            });
        });

        it('does $exists queries - $eq/true (multi-field)', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'a', foo: 'bar', bar: 'baz' },
                    { _id: 'b', foo: 'bar', bar: { yo: 'dude' } },
                    { _id: 'c', foo: null, bar: 'quux' },
                    { _id: 'd' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { 'foo': 'bar', bar: { $exists: true } },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [
                    { "_id": "a" },
                    { "_id": "b" }
                ]);
            });
        });

        it('does $exists queries - $eq/false (multi-field)', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'a', foo: 'bar', bar: 'baz' },
                    { _id: 'b', foo: 'bar', bar: { yo: 'dude' } },
                    { _id: 'c', foo: 'bar', bar: 'yo' },
                    { _id: 'd', foo: 'bar' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { 'foo': 'bar', bar: { $exists: false } },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [
                    { "_id": "d" }
                ]);
            });
        });

        it('does $exists queries - true/true (multi-field)', function () {
            return db.bulkDocs([
                { _id: 'a', foo: 'bar', bar: 'baz' },
                { _id: 'b', foo: { yo: 'dude' } },
                { _id: 'c', foo: null, bar: 'quux' },
                { _id: 'd' }
            ]).then(function () {
                return db.find({
                    selector: {
                        _id: { $gt: null },
                        foo: { '$exists': true },
                        bar: { $exists: true }
                    },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [
                    { "_id": "a" },
                    { "_id": "c" }
                ]);
            });
        });

        it('does $exists queries - true/false (multi-field)', function () {
            return db.bulkDocs([
                { _id: 'a', foo: 'bar', bar: 'baz' },
                { _id: 'b', foo: { yo: 'dude' } },
                { _id: 'c', foo: null, bar: 'quux' },
                { _id: 'd' }
            ]).then(function () {
                return db.find({
                    selector: {
                        _id: { $gt: null },
                        foo: { '$exists': true },
                        bar: { $exists: false }
                    },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [
                    { "_id": "b" }
                ]);
            });
        });
    });

    describe('explain', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'mario', _id: 'mario', rank: 5, series: 'mario', debut: 1981 },
                    { name: 'jigglypuff', _id: 'puff', rank: 8, series: 'pokemon', debut: 1996 },
                    { name: 'link', rank: 10, _id: 'link', series: 'zelda', debut: 1986 },
                    { name: 'donkey kong', rank: 7, _id: 'dk', series: 'mario', debut: 1981 },
                    { name: 'pikachu', series: 'pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                    { name: 'captain falcon', _id: 'falcon', rank: 4, series: 'f-zero', debut: 1990 },
                    { name: 'luigi', rank: 11, _id: 'luigi', series: 'mario', debut: 1983 },
                    { name: 'fox', _id: 'fox', rank: 3, series: 'star fox', debut: 1993 },
                    { name: 'ness', rank: 9, _id: 'ness', series: 'earthbound', debut: 1994 },
                    { name: 'samus', rank: 12, _id: 'samus', series: 'metroid', debut: 1986 },
                    { name: 'yoshi', _id: 'yoshi', rank: 6, series: 'mario', debut: 1990 },
                    { name: 'kirby', _id: 'kirby', series: 'kirby', rank: 2, debut: 1992 }
                ]).then(function () {
                    return db.createIndex({
                        index: {
                            "fields": ["name", "series"]
                        },
                        "type": "json",
                        "name": "index-name",
                        "ddoc": "design-doc-name"
                    });
                }).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('explains which index it uses', function () {
            return db.explain({
                selector: {
                    name: 'mario',
                    series: 'mario'
                },
                fields: ["_id"],
                limit: 10,
                skip: 1,
            }).then(function (resp) {
                var actual = { //This is an explain response from CouchDB
                    "dbname": resp.dbname, //this is random based on the test
                    "index": {
                        "ddoc": "_design/design-doc-name",
                        "name": "index-name",
                        "type": "json",
                        "def": {
                            "fields": [
                                {
                                    "name": "asc"
                                },
                                {
                                    "series": "asc"
                                }
                            ]
                        }
                    },
                    "selector": {
                        "$and": [
                            {
                                "name": {
                                    "$eq": "mario"
                                }
                            },
                            {
                                "series": {
                                    "$eq": "mario"
                                }
                            }
                        ]
                    },
                    "opts": {
                        "use_index": [],
                        "bookmark": "nil",
                        "limit": 25,
                        "skip": 0,
                        "sort": { "name": "asc" },
                        "fields": [
                            "_id"
                        ],
                        "r": [
                            49
                        ],
                        "conflicts": false
                    },
                    "limit": 10,
                    "skip": 1,
                    "fields": [
                        "_id"
                    ],
                    "range": {
                        "start_key": [
                            "mario",
                            "mario"
                        ],
                        "end_key": [
                            "mario",
                            "mario",
                            {}
                        ]
                    }
                };

                //This is a little tricky to test due to the fact that pouchdb-find and Mango do query slightly differently
                assert.deepEqual(resp.dbname, actual.dbname);
                assert.deepEqual(resp.index, actual.index);
                assert.deepEqual(resp.fields, actual.fields);
                assert.deepEqual(resp.skip, actual.skip);
                assert.deepEqual(resp.limit, actual.limit);
            });
        });

        it("should work with a callback", function () {
            return new Promise(function (resolve, reject) {
                return db.explain({
                    selector: {
                        name: 'mario',
                        series: 'mario'
                    }
                }, function (err, res) {
                    if (err) {
                        return reject(err);
                    }

                    resolve(res);
                });
            });
        });

        it("should work with a throw missing selector warning", function () {
            db.explain().catch(function (err) {
                assert.ok(/provide search parameters/.test(err.message));
            });
        });
    });

    describe('fields', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('does 2-field queries', function () {
            var index = {
                "index": {
                    "fields": ["foo", "bar"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'a', bar: 'a' },
                    { _id: '2', foo: 'b', bar: 'b' },
                    { _id: '3', foo: 'a', bar: 'a' },
                    { _id: '4', foo: 'c', bar: 'a' },
                    { _id: '5', foo: 'b', bar: 'a' },
                    { _id: '6', foo: 'a', bar: 'b' }
                ]);
            }).then(function () {
                return db.find({
                    "selector": {
                        "foo": { "$eq": "b" },
                        "bar": { "$eq": "b" }
                    },
                    "fields": ["_id", "foo"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "docs": [
                        { "_id": "2", "foo": "b" }
                    ]
                });
            });
        });

        it('does 2-field queries eq/gte', function () {
            var index = {
                "index": {
                    "fields": ["foo", "bar"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'a', bar: 'a' },
                    { _id: '2', foo: 'a', bar: 'b' },
                    { _id: '3', foo: 'a', bar: 'c' },
                    { _id: '4', foo: 'b', bar: 'a' },
                    { _id: '5', foo: 'b', bar: 'b' },
                    { _id: '6', foo: 'c', bar: 'a' }
                ]);
            }).then(function () {
                return db.find({
                    "selector": {
                        "foo": { "$eq": "a" },
                        "bar": { "$gte": "b" }
                    },
                    "fields": ["_id"]
                });
            }).then(function (resp) {
                resp.docs.sort(sortById);
                assert.deepEqual(resp.docs, [
                    { _id: '2' },
                    { _id: '3' }
                ]);
            });
        });

        it('does 2-field queries gte/gte', function () {
            var index = {
                "index": {
                    "fields": ["foo", "bar"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'a', bar: 'a' },
                    { _id: '2', foo: 'a', bar: 'b' },
                    { _id: '3', foo: 'a', bar: 'c' },
                    { _id: '4', foo: 'b', bar: 'a' },
                    { _id: '5', foo: 'b', bar: 'b' },
                    { _id: '6', foo: 'c', bar: 'a' }
                ]);
            }).then(function () {
                return db.find({
                    "selector": {
                        "foo": { "$gte": "b" },
                        "bar": { "$gte": "a" }
                    },
                    "fields": ["_id"]
                });
            }).then(function (resp) {
                resp.docs.sort(sortById);
                assert.deepEqual(resp.docs, [
                    { _id: '4' },
                    { _id: '5' },
                    { _id: '6' }
                ]);
            });
        });

        it('does 2-field queries gte/lte', function () {
            var index = {
                "index": {
                    "fields": ["foo", "bar"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'a', bar: 'a' },
                    { _id: '2', foo: 'a', bar: 'b' },
                    { _id: '3', foo: 'a', bar: 'c' },
                    { _id: '4', foo: 'b', bar: 'a' },
                    { _id: '5', foo: 'b', bar: 'b' },
                    { _id: '6', foo: 'c', bar: 'a' }
                ]);
            }).then(function () {
                return db.find({
                    "selector": {
                        "foo": { "$gte": "b" },
                        "bar": { "$lte": "b" }
                    },
                    "fields": ["_id"]
                });
            }).then(function (resp) {
                resp.docs.sort(sortById);
                assert.deepEqual(resp.docs, [
                    { _id: '4' },
                    { _id: '5' },
                    { _id: '6' }
                ]);
            });
        });

        it('does 3-field queries eq/eq/eq 3-field index', function () {
            var index = {
                "index": {
                    "fields": ["foo", "bar", "baz"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'a', bar: 'a', baz: 'z' },
                    { _id: '2', foo: 'a', bar: 'b', baz: 'z' },
                    { _id: '3', foo: 'a', bar: 'c', baz: 'z' },
                    { _id: '4', foo: 'b', bar: 'a', baz: 'z' },
                    { _id: '5', foo: 'b', bar: 'b', baz: 'z' },
                    { _id: '6', foo: 'c', bar: 'a', baz: 'z' }
                ]);
            }).then(function () {
                return db.find({
                    "selector": {
                        foo: 'b',
                        bar: 'b',
                        baz: 'z'
                    },
                    "fields": ["_id"]
                });
            }).then(function (resp) {
                resp.docs.sort(sortById);
                assert.deepEqual(resp.docs, [
                    { _id: '5' }
                ]);
            });
        });

        it('does 1-field queries eq/eq 2-field index', function () {
            var index = {
                "index": {
                    "fields": ["foo", "bar"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'a', bar: 'a', baz: 'z' },
                    { _id: '2', foo: 'a', bar: 'b', baz: 'z' },
                    { _id: '3', foo: 'a', bar: 'c', baz: 'z' },
                    { _id: '4', foo: 'b', bar: 'a', baz: 'z' },
                    { _id: '5', foo: 'b', bar: 'b', baz: 'z' },
                    { _id: '6', foo: 'c', bar: 'a', baz: 'z' }
                ]);
            }).then(function () {
                return db.find({
                    "selector": {
                        foo: 'b'
                    },
                    "fields": ["_id"]
                });
            }).then(function (resp) {
                resp.docs.sort(sortById);
                assert.deepEqual(resp.docs, [
                    { _id: '4' },
                    { _id: '5' }
                ]);
            });
        });

        it('does 2-field queries eq/eq 3-field index', function () {
            var index = {
                "index": {
                    "fields": ["foo", "bar", "baz"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'a', bar: 'a', baz: 'z' },
                    { _id: '2', foo: 'a', bar: 'b', baz: 'z' },
                    { _id: '3', foo: 'a', bar: 'c', baz: 'z' },
                    { _id: '4', foo: 'b', bar: 'a', baz: 'z' },
                    { _id: '5', foo: 'b', bar: 'b', baz: 'z' },
                    { _id: '6', foo: 'c', bar: 'a', baz: 'z' }
                ]);
            }).then(function () {
                return db.find({
                    "selector": {
                        foo: 'b',
                        bar: 'b'
                    },
                    "fields": ["_id"]
                });
            }).then(function (resp) {
                resp.docs.sort(sortById);
                assert.deepEqual(resp.docs, [
                    { _id: '5' }
                ]);
            });
        });
    });

    describe('issue66', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    {
                        name: 'Mario',
                        _id: 'mario',
                        rank: 5,
                        series: 'Mario',
                        debut: 1981,
                        awesome: true
                    },
                    {
                        name: 'Jigglypuff',
                        _id: 'puff',
                        rank: 8,
                        series: 'Pokemon',
                        debut: 1996,
                        awesome: false
                    },
                    {
                        name: 'Link',
                        rank: 10,
                        _id: 'link',
                        series: 'Zelda',
                        debut: 1986,
                        awesome: true
                    },
                    {
                        name: 'Donkey Kong',
                        rank: 7,
                        _id: 'dk',
                        series: 'Mario',
                        debut: 1981,
                        awesome: false
                    },
                    {
                        name: 'Pikachu',
                        series: 'Pokemon',
                        _id: 'pikachu',
                        rank: 1,
                        debut: 1996,
                        awesome: true
                    },
                    {
                        name: 'Captain Falcon',
                        _id: 'falcon',
                        rank: 4,
                        series: 'F-Zero',
                        debut: 1990,
                        awesome: true
                    },
                    {
                        name: 'Luigi',
                        rank: 11,
                        _id: 'luigi',
                        series: 'Mario',
                        debut: 1983,
                        awesome: false
                    },
                    {
                        name: 'Fox',
                        _id: 'fox',
                        rank: 3,
                        series: 'Star Fox',
                        debut: 1993,
                        awesome: true
                    },
                    {
                        name: 'Ness',
                        rank: 9,
                        _id: 'ness',
                        series: 'Earthbound',
                        debut: 1994,
                        awesome: true
                    },
                    {
                        name: 'Samus',
                        rank: 12,
                        _id: 'samus',
                        series: 'Metroid',
                        debut: 1986,
                        awesome: true
                    },
                    {
                        name: 'Yoshi',
                        _id: 'yoshi',
                        rank: 6,
                        series: 'Mario',
                        debut: 1990,
                        awesome: true
                    },
                    {
                        name: 'Kirby',
                        _id: 'kirby',
                        series: 'Kirby',
                        rank: 2,
                        debut: 1992,
                        awesome: true
                    },
                    {
                        name: 'Master Hand',
                        _id: 'master_hand',
                        series: 'Smash Bros',
                        rank: 0,
                        debut: 1999,
                        awesome: false
                    }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should query all docs with $gt: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $gt: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi'
                        ]
                    );
                });
            });
        });

        it('should query all docs with $lt: false', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $lt: false }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lt: {}', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $lt: {} }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lte: {}', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $lte: {} }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lte: []', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $lte: [] }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lte: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $lte: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lt: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $lt: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $gt: false', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $gt: false }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gte: 0', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $gte: 0 }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gt: 0', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $gt: 0 }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gte: false', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $gte: false }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gt: {}', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $gt: {} }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gte: {}', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $gte: {} }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $eq: {}', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $eq: {} }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $eq: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $eq: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $eq: 0', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $eq: 0 }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $eq: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $eq: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lte: 0', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $lte: 0 }
                    }
                }).then(function (response) {
                    response.docs = response.docs.map(function (doc) {
                        return doc._id;
                    });
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $gte: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    selector: {
                        _id: { $gte: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gt: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $gt: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $lt: false', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $lt: false }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lt: {}', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $lt: {} }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lte: {}', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $lte: {} }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lte: []', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $lte: [] }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lte: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $lte: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lt: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $lt: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $gt: false', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $gt: false }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gte: 0', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $gte: 0 }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gt: 0', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $gt: 0 }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gte: false', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $gte: false }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gt: {}', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $gt: {} }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $gte: {}', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $gte: {} }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });

        it('should query all docs with $eq: {}', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $eq: {} }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $eq: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $eq: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $eq: 0', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $eq: 0 }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $eq: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $eq: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $lte: 0', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $lte: 0 }
                    }
                }).then(function (response) {
                    response.docs = response.docs.map(function (doc) {
                        return doc._id;
                    });
                    assert.deepEqual(response.docs, []);
                });
            });
        });

        it('should query all docs with $gte: null', function () {
            return db.bulkDocs(
                [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
            ).then(function () {
                return db.find({
                    sort: [{ _id: 'desc' }], selector: {
                        _id: { $gte: null }
                    }
                }).then(function (response) {
                    assert.deepEqual(response.docs.map(function (doc) {
                        return doc._id;
                    }).sort(),
                        ['a', 'b', 'c', 'dk', 'falcon', 'fox', 'kirby', 'link', 'luigi',
                            'mario', 'master_hand', 'ness', 'pikachu', 'puff', 'samus',
                            'yoshi']
                    );
                });
            });
        });
    });

    describe('limit', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981 },
                    { name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996 },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986 },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981 },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                    { name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990 },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983 },
                    { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993 },
                    { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994 },
                    { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986 },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990 },
                    { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992 }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should work with $and 1 limit 0', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 0
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, []);
            });
        });

        it('should work with $and 1 limit 1', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 1
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }]);
            });
        });

        it('should work with $and 1 limit 2', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 2
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }, { _id: 'yoshi' }]);
            });
        });

        it('should work with $and 2, same index limit 0', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series", "debut"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 0
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, []);
            });
        });

        it('should work with $and 2, same index limit 1', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series", "debut"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 1
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }]);
            });
        });

        it('should work with $and 2, same index limit 2', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series", "debut"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 2
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }, { _id: 'yoshi' }]);
            });
        });

        it('should work with $and 3, index/no-index limit 0', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["rank"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 0
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, []);
            });
        });

        it('should work with $and 3, index/no-index limit 1', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["rank"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 1
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }]);
            });
        });

        it('should work with $and 3, index/no-index limit 2', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["rank"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1983 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 2
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }, { _id: 'yoshi' }]);
            });
        });

        it('should work with $and 4, wrong index', function () {
            return db.createIndex({
                "index": {
                    "fields": ["rank"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1990 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 1
                }).then(function (resp) {
                    assert.deepEqual(resp, {
                        warning: 'no matching index found, create an index to optimize query time',
                        docs: [
                            { _id: 'yoshi' }
                        ]
                    });
                });
            });
        });
    });

    describe('limit-skip', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981 },
                    { name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996 },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986 },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981 },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                    { name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990 },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983 },
                    { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993 },
                    { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994 },
                    { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986 },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990 },
                    { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992 }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should work with $and 1-1', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {

                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 1,
                    skip: 1
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'yoshi' }]);
            });
        });

        it('should work with $and 1 1-2', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 1,
                    skip: 2
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, []);
            });
        });

        it('should work with $and 1 2-0', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 2,
                    skip: 0
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }, { _id: 'yoshi' }]);
            });
        });

        it('should work with $and 2, same index 0-1', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series", "debut"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 0,
                    skip: 1
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, []);
            });
        });

        it('should work with $and 2, same index 4-2', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series", "debut"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1970 } }
                        ]
                    },
                    sort: ['series', 'debut'],
                    fields: ['_id'],
                    limit: 4,
                    skip: 2
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [
                    { _id: 'luigi' },
                    { _id: 'yoshi' }
                ]);
            });
        });

        it('should work with $and 2, same index 2-2', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series", "debut"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1980 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 2,
                    skip: 2
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }, { _id: 'yoshi' }]);
            });
        });

        it('should work with $and 3, index/no-index 10-0', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["rank"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $lte: 1990 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 10,
                    skip: 0
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [
                    { _id: 'dk' },
                    { _id: 'luigi' },
                    { _id: 'mario' },
                    { _id: 'yoshi' }
                ]);
            });
        });

        it('should work with $and 3, index/no-index 1-0', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["rank"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Star Fox' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 1,
                    skip: 0
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'fox' }]);
            });
        });

        it('should work with $and 3, index/no-index 2-0', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["rank"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1983 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 2,
                    skip: 0
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }, { _id: 'yoshi' }]);
            });
        });

        it('should work with $and 4, wrong index', function () {
            return db.createIndex({
                "index": {
                    "fields": ["rank"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1990 } }
                        ]
                    },
                    fields: ['_id'],
                    limit: 1,
                    skip: 1
                }).then(function (resp) {
                    assert.deepEqual(resp, {
                        warning: 'no matching index found, create an index to optimize query time',
                        docs: []
                    });
                });
            });
        });
    });

    describe('ltgt', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('does gt queries', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo' },
                    { _id: '2', foo: 'ebb' },
                    { _id: '3', foo: 'eba' },
                    { _id: '4', foo: 'abo' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { "$gt": "eb" } },
                    fields: ["_id", "foo"],
                    sort: [{ foo: "asc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '3', foo: 'eba' },
                        { _id: '2', foo: 'ebb' },
                        { _id: '1', foo: 'eyo' }
                    ]
                });
            });
        });

        it('does lt queries', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo' },
                    { _id: '2', foo: 'ebb' },
                    { _id: '3', foo: 'eba' },
                    { _id: '4', foo: 'abo' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { "$lt": "eb" } },
                    fields: ["_id", "foo"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '4', foo: 'abo' }
                    ]
                });
            });
        });

        it('#20 - lt queries with sort descending return correct number of docs', function () {
            var index = {
                "index": {
                    "fields": ["debut"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', debut: 1983 },
                    { _id: '2', debut: 1981 },
                    { _id: '3', debut: 1989 },
                    { _id: '4', debut: 1990 }
                ]);
            }).then(function () {
                return db.find({
                    selector: { debut: { $lt: 1990 } },
                    sort: [{ debut: 'desc' }]
                });
            }).then(function (resp) {
                var docs = resp.docs.map(function (x) { delete x._rev; return x; });
                assert.deepEqual(docs, [
                    { _id: '3', debut: 1989 },
                    { _id: '1', debut: 1983 },
                    { _id: '2', debut: 1981 }
                ]);
            });
        });
        // ltge - {include_docs: true, reduce: false, descending: true, startkey: 1990}
        // lt no sort {include_docs: true, reduce: false, endkey: 1990, inclusive_end: false}
        // lt sort {include_docs: true, reduce: false, descending: true, 
        // startkey: 1990, inclusive_start: false}

        it('does lte queries', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo' },
                    { _id: '2', foo: 'ebb' },
                    { _id: '3', foo: 'eba' },
                    { _id: '4', foo: 'abo' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { "$lte": "eba" } },
                    fields: ["_id", "foo"],
                    sort: [{ foo: "asc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '4', foo: 'abo' },
                        { _id: '3', foo: 'eba' },
                    ]
                });
            });
        });

        it('#41 another complex multifield query', function () {
            var index = {
                "index": {
                    "fields": ["datetime"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    {
                        _id: '1',
                        datetime: 1434054640000,
                        glucoseType: 'fasting',
                        patientId: 1
                    },
                    {
                        _id: '2',
                        datetime: 1434054650000,
                        glucoseType: 'fasting',
                        patientId: 1
                    },
                    {
                        _id: '3',
                        datetime: 1434054660000,
                        glucoseType: 'fasting',
                        patientId: 1
                    },
                    {
                        _id: '4',
                        datetime: 1434054670000,
                        glucoseType: 'fasting',
                        patientId: 1
                    }
                ]);
            }).then(function () {
                return db.find({
                    selector: {
                        datetime: { "$lt": 1434054660000 },
                        glucoseType: { "$eq": 'fasting' },
                        patientId: { "$eq": 1 }
                    }
                });
            }).then(function (res) {
                var docs = res.docs.map(function (x) { delete x._rev; return x; });
                assert.deepEqual(docs, [
                    {
                        "_id": "1",
                        "datetime": 1434054640000,
                        "glucoseType": "fasting",
                        "patientId": 1
                    },
                    {
                        "_id": "2",
                        "datetime": 1434054650000,
                        "glucoseType": "fasting",
                        "patientId": 1
                    }
                ]);
            });
        });

        it('does gt queries, desc sort', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo' },
                    { _id: '2', foo: 'ebb' },
                    { _id: '3', foo: 'eba' },
                    { _id: '4', foo: 'abo' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { "$gt": "eb" } },
                    fields: ["_id", "foo"],
                    sort: [{ foo: "desc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '1', foo: 'eyo' },
                        { _id: '2', foo: 'ebb' },
                        { _id: '3', foo: 'eba' }
                    ]
                });
            });
        });

        it('#38 $gt with dates', function () {
            var startDate = "2015-05-25T00:00:00.000Z";
            var endDate = "2015-05-26T00:00:00.000Z";

            return db.createIndex({
                index: {
                    fields: ['docType', 'logDate']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', docType: 'log', logDate: "2015-05-24T00:00:00.000Z" },
                    { _id: '2', docType: 'log', logDate: "2015-05-25T00:00:00.000Z" },
                    { _id: '3', docType: 'log', logDate: "2015-05-26T00:00:00.000Z" },
                    { _id: '4', docType: 'log', logDate: "2015-05-27T00:00:00.000Z" }
                ]);
            }).then(function () {
                return db.find({
                    selector: { docType: 'log' }
                }).then(function (result) {
                    assert.deepEqual(result.docs.map(function (x) { delete x._rev; return x; }), [
                        {
                            "_id": "1",
                            "docType": "log",
                            "logDate": "2015-05-24T00:00:00.000Z"
                        },
                        {
                            "_id": "2",
                            "docType": "log",
                            "logDate": "2015-05-25T00:00:00.000Z"
                        },
                        {
                            "_id": "3",
                            "docType": "log",
                            "logDate": "2015-05-26T00:00:00.000Z"
                        },
                        {
                            "_id": "4",
                            "docType": "log",
                            "logDate": "2015-05-27T00:00:00.000Z"
                        }
                    ], 'test 1');
                });
            }).then(function () {
                return db.find({
                    selector: { docType: 'log', logDate: { $gt: startDate } }
                }).then(function (result) {
                    assert.deepEqual(result.docs.map(function (x) { delete x._rev; return x; }), [
                        {
                            "_id": "3",
                            "docType": "log",
                            "logDate": "2015-05-26T00:00:00.000Z"
                        },
                        {
                            "_id": "4",
                            "docType": "log",
                            "logDate": "2015-05-27T00:00:00.000Z"
                        }
                    ], 'test 2');
                });
            }).then(function () {
                return db.find({
                    selector: { docType: 'log', logDate: { $gte: startDate } }
                }).then(function (result) {
                    assert.deepEqual(result.docs.map(function (x) { delete x._rev; return x; }), [
                        {
                            "_id": "2",
                            "docType": "log",
                            "logDate": "2015-05-25T00:00:00.000Z"
                        },
                        {
                            "_id": "3",
                            "docType": "log",
                            "logDate": "2015-05-26T00:00:00.000Z"
                        },
                        {
                            "_id": "4",
                            "docType": "log",
                            "logDate": "2015-05-27T00:00:00.000Z"
                        }
                    ], 'test 3');
                });
            }).then(function () {
                return db.find({
                    selector: {
                        docType: 'log',
                        logDate: { $gte: startDate, $lte: endDate }
                    }
                }).then(function (result) {
                    assert.deepEqual(result.docs.map(function (x) { delete x._rev; return x; }), [
                        {
                            "_id": "2",
                            "docType": "log",
                            "logDate": "2015-05-25T00:00:00.000Z"
                        },
                        {
                            "_id": "3",
                            "docType": "log",
                            "logDate": "2015-05-26T00:00:00.000Z"
                        }
                    ], 'test 4');
                });
            });
        });

        it('bunch of equivalent queries', function () {
            function normalize(res) {
                return res.docs.map(function getId(x) {
                    return x._id;
                }).sort();
            }

            return db.createIndex({
                index: {
                    fields: ['foo']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 1 },
                    { _id: '2', foo: 2 },
                    { _id: '3', foo: 3 },
                    { _id: '4', foo: 4 }
                ]);
            }).then(function () {
                return db.find({
                    selector: { $and: [{ foo: { $gt: 2 } }, { foo: { $gte: 2 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['3', '4']);
                return db.find({
                    selector: { $and: [{ foo: { $eq: 2 } }, { foo: { $gte: 2 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['2']);
                return db.find({
                    selector: { $and: [{ foo: { $eq: 2 } }, { foo: { $lte: 2 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['2']);
                return db.find({
                    selector: { $and: [{ foo: { $lte: 3 } }, { foo: { $lt: 3 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1', '2']);
                return db.find({
                    selector: { $and: [{ foo: { $eq: 4 } }, { foo: { $gte: 2 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['4']);
                return db.find({
                    selector: { $and: [{ foo: { $lte: 3 } }, { foo: { $eq: 1 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1']);
                return db.find({
                    selector: { $and: [{ foo: { $eq: 4 } }, { foo: { $gt: 2 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['4']);
                return db.find({
                    selector: { $and: [{ foo: { $lt: 3 } }, { foo: { $eq: 1 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1']);
            });
        });

        it('bunch of equivalent queries 2', function () {
            function normalize(res) {
                return res.docs.map(function getId(x) {
                    return x._id;
                }).sort();
            }

            return db.createIndex({
                index: {
                    fields: ['foo']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 1 },
                    { _id: '2', foo: 2 },
                    { _id: '3', foo: 3 },
                    { _id: '4', foo: 4 }
                ]);
            }).then(function () {
                return db.find({
                    selector: { $and: [{ foo: { $gt: 2 } }, { foo: { $gte: 1 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['3', '4']);
                return db.find({
                    selector: { $and: [{ foo: { $lt: 3 } }, { foo: { $lte: 4 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1', '2']);
                return db.find({
                    selector: { $and: [{ foo: { $gt: 2 } }, { foo: { $gte: 3 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['3', '4']);
                return db.find({
                    selector: { $and: [{ foo: { $lt: 3 } }, { foo: { $lte: 1 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1']);
                return db.find({
                    selector: { $and: [{ foo: { $gte: 2 } }, { foo: { $gte: 1 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['2', '3', '4']);
                return db.find({
                    selector: { $and: [{ foo: { $lte: 3 } }, { foo: { $lte: 4 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1', '2', '3']);
                return db.find({
                    selector: { $and: [{ foo: { $gt: 2 } }, { foo: { $gt: 3 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['4']);
                return db.find({
                    selector: { $and: [{ foo: { $lt: 3 } }, { foo: { $lt: 2 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1']);
            });
        });

        it('bunch of equivalent queries 3', function () {
            function normalize(res) {
                return res.docs.map(function getId(x) {
                    return x._id;
                }).sort();
            }

            return db.createIndex({
                index: {
                    fields: ['foo']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 1 },
                    { _id: '2', foo: 2 },
                    { _id: '3', foo: 3 },
                    { _id: '4', foo: 4 }
                ]);
            }).then(function () {
                return db.find({
                    selector: { $and: [{ foo: { $gte: 1 } }, { foo: { $gt: 2 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['3', '4']);
                return db.find({
                    selector: { $and: [{ foo: { $lte: 4 } }, { foo: { $lt: 3 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1', '2']);
                return db.find({
                    selector: { $and: [{ foo: { $gte: 3 } }, { foo: { $gt: 2 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['3', '4']);
                return db.find({
                    selector: { $and: [{ foo: { $lte: 1 } }, { foo: { $lt: 3 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1']);
                return db.find({
                    selector: { $and: [{ foo: { $gte: 1 } }, { foo: { $gte: 2 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['2', '3', '4']);
                return db.find({
                    selector: { $and: [{ foo: { $lte: 4 } }, { foo: { $lte: 3 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1', '2', '3']);
                return db.find({
                    selector: { $and: [{ foo: { $gt: 3 } }, { foo: { $gt: 2 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['4']);
                return db.find({
                    selector: { $and: [{ foo: { $lt: 2 } }, { foo: { $lt: 3 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1']);
            });
        });
    });

    describe('matching-indexes', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981 },
                    { name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996 },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986 },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981 },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                    { name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990 },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983 },
                    { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993 },
                    { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994 },
                    { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986 },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990 },
                    { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992 }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should pick a better matching index 1', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["series", "debut"]
                    }
                });
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1983 } }
                        ]
                    },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }, { _id: 'yoshi' }]);
            });
        });
    });

    describe('mod', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981, awesome: true },
                    {
                        name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996,
                        awesome: false
                    },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986, awesome: true },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981, awesome: false },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996, awesome: true },
                    {
                        name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990,
                        awesome: true
                    },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983, awesome: false },
                    { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993, awesome: true },
                    { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994, awesome: true },
                    { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986, awesome: true },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990, awesome: true },
                    { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992, awesome: true },
                    {
                        name: 'Master Hand', _id: 'master_hand', series: 'Smash Bros', rank: 0, debut: 1999,
                        awesome: false
                    }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should get all even values', function () {
            var index = {
                "index": {
                    "fields": ["name"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: {
                        name: { $gte: null },
                        rank: { $mod: [2, 0] }
                    },
                    sort: ['name']
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        {
                            name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990,
                            awesome: true
                        },
                        {
                            name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996,
                            awesome: false
                        },
                        { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992, awesome: true },
                        { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986, awesome: true },
                        {
                            name: 'Master Hand', _id: 'master_hand', series: 'Smash Bros', rank: 0, debut: 1999,
                            awesome: false
                        },
                        {
                            name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986,
                            awesome: true
                        },
                        { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990, awesome: true },
                    ]);
                });
            });
        });

        it('should return error for zero divisor', function () {
            var index = {
                "index": {
                    "fields": ["name"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: {
                        name: { $gte: null },
                        rank: { $mod: [0, 0] }
                    },
                    sort: ['name']
                }).then(function () {
                    throw new Error('expected an error here');
                }, function (err) {

                    assert.match(err.message, /Bad divisor/);
                });
            });
        });

        it('should return error for non-integer divisor', function () {
            var index = {
                "index": {
                    "fields": ["name"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: {
                        name: { $gte: null },
                        rank: { $mod: ['a', 0] }
                    },
                    sort: ['name']
                }).then(function () {
                    throw new Error('expected an error here');
                }, function (err) {
                    assert.match(err.message, /Divisor is not an integer/);
                });
            });
        });

        it('should return error for non-integer modulus', function () {
            var index = {
                "index": {
                    "fields": ["name"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: {
                        name: { $gte: null },
                        rank: { $mod: [1, 'a'] }
                    },
                    sort: ['name']
                }).then(function () {
                    throw new Error('expected an error here');
                }, function (err) {
                    assert.match(err.message, /Modulus is not an integer/);
                });
            });
        });

        it('should return empty docs for non-integer field', function () {
            var index = {
                "index": {
                    "fields": ["name"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: {
                        name: { $gte: null },
                        awesome: { $mod: [2, 0] }
                    },
                    sort: ['name']
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, []);
                });
            });
        });
    });

    describe('ne', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('#7 does ne queries 1', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo', bar: 'zxy' },
                    { _id: '2', foo: 'ebb', bar: 'zxy' },
                    { _id: '3', foo: 'eba', bar: 'zxz' },
                    { _id: '4', foo: 'abo', bar: 'zxz' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { $gt: "a" }, bar: { $ne: 'zxy' } },
                    fields: ["_id"],
                    sort: [{ foo: "asc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '4' },
                        { _id: '3' }
                    ]
                });
            });
        });

        it('#7 does ne queries 2', function () {
            var index = {
                "index": {
                    "fields": ["foo", "bar"]
                }
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'eyo', bar: 'zxy' },
                    { _id: '2', foo: 'ebb', bar: 'zxy' },
                    { _id: '3', foo: 'eba', bar: 'zxz' },
                    { _id: '4', foo: 'abo', bar: 'zxz' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { $gt: "a" }, bar: { $ne: 'zxy' } },
                    fields: ["_id"],
                    sort: [{ foo: "asc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: '4' },
                        { _id: '3' }
                    ]
                });
            });
        });

        it('$ne/$eq inconsistency', function () {
            function normalize(res) {
                return res.docs.map(function getId(x) {
                    return x._id;
                }).sort();
            }

            return db.createIndex({
                index: {
                    fields: ['foo']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 1 },
                    { _id: '2', foo: 2 },
                    { _id: '3', foo: 3 },
                    { _id: '4', foo: 4 }
                ]);
            }).then(function () {
                return db.find({
                    selector: { $and: [{ foo: { $eq: 1 } }, { foo: { $ne: 1 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), []);
            });
        });

        it('$ne/$eq consistency', function () {
            function normalize(res) {
                return res.docs.map(function getId(x) {
                    return x._id;
                }).sort();
            }

            return db.createIndex({
                index: {
                    fields: ['foo']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 1 },
                    { _id: '2', foo: 2 },
                    { _id: '3', foo: 3 },
                    { _id: '4', foo: 4 }
                ]);
            }).then(function () {
                return db.find({
                    selector: { $and: [{ foo: { $eq: 1 } }, { foo: { $ne: 3 } }] }
                });
            }).then(function (res) {
                assert.deepEqual(normalize(res), ['1']);
            });
        });

        it('does ne queries with gt', function () {
            return db.bulkDocs([
                { name: 'mario', _id: 'mario', rank: 5, series: 'mario', debut: 1981 },
                { name: 'jigglypuff', _id: 'puff', rank: 8, series: 'pokemon', debut: 1996 },
                { name: 'link', rank: 10, _id: 'link', series: 'zelda', debut: 1986 },
                { name: 'donkey kong', rank: 7, _id: 'dk', series: 'mario', debut: 1981 },
                { name: 'pikachu', series: 'pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                { name: 'captain falcon', _id: 'falcon', rank: 4, series: 'f-zero', debut: 1990 },
                { name: 'luigi', rank: 11, _id: 'luigi', series: 'mario', debut: 1983 },
                { name: 'fox', _id: 'fox', rank: 3, series: 'star fox', debut: 1993 },
                { name: 'ness', rank: 9, _id: 'ness', series: 'earthbound', debut: 1994 },
                { name: 'samus', rank: 12, _id: 'samus', series: 'metroid', debut: 1986 },
                { name: 'yoshi', _id: 'yoshi', rank: 6, series: 'mario', debut: 1990 },
                { name: 'kirby', _id: 'kirby', series: 'kirby', rank: 2, debut: 1992 }
            ]).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { _id: { $ne: "samus" } },
                            { _id: { $ne: "yoshia" } },
                            { _id: { $gt: "fox" } }
                        ]
                    },
                    fields: ["_id"],
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    docs: [
                        { _id: 'kirby' },
                        { _id: 'link' },
                        { _id: 'luigi' },
                        { _id: 'mario' },
                        { _id: 'ness' },
                        { _id: 'pikachu' },
                        { _id: 'puff' },
                        { _id: 'yoshi' }
                    ]
                });
            });
        });
    });

    describe('nor', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981, awesome: true },
                    {
                        name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996,
                        awesome: false
                    },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986, awesome: true },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981, awesome: false },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996, awesome: true },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983, awesome: false },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990, awesome: true }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('#6366 should do a basic $nor', function () {
            return db.find({
                selector: {
                    "$nor": [
                        { "series": "Mario" },
                        { "series": "Pokemon" }
                    ]
                }
            }).then(function (res) {
                var docs = res.docs.map(function (doc) {
                    return {
                        _id: doc._id
                    };
                });
                assert.deepEqual(docs, [
                    { '_id': 'link' }
                ]);
            });
        });

        it('#6366 should do a basic $nor, with explicit $eq', function () {
            return db.find({
                selector: {
                    "$nor": [
                        { "series": { $eq: "Mario" } },
                        { "series": { $eq: "Pokemon" } }
                    ]
                }
            }).then(function (res) {
                var docs = res.docs.map(function (doc) {
                    return {
                        _id: doc._id
                    };
                });
                assert.deepEqual(docs, [
                    { '_id': 'link' }
                ]);
            });
        });
    });

    describe('not', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('works with simple syntax', function () {
            var index = {
                "index": {
                    "fields": ["age"]
                },
                "name": "age-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                    { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                    { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                    { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                ]);
            }).then(function () {
                return db.find({
                    selector: {
                        age: { $gte: 40 },
                        $not: { age: 75 },
                    }
                });
            }).then(function (resp) {
                var docs = resp.docs.map(function (doc) {
                    delete doc._rev;
                    return doc;
                });

                assert.deepEqual(docs, [
                    { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                    { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                    { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } }
                ]);
            });
        });

        it('works with $and', function () {
            var index = {
                "index": {
                    "fields": ["age"]
                },
                "name": "age-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                    { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                    { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                    { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                ]);
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { age: { $gte: 40 } },
                            { $not: { age: { $eq: 75 } } },
                        ]
                    }
                });
            }).then(function (resp) {
                var docs = resp.docs.map(function (doc) {
                    delete doc._rev;
                    return doc;
                });

                assert.deepEqual(docs, [
                    { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                    { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                    { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } }
                ]);
            });
        });

        it('works with another combinational field', function () {
            var index = {
                "index": {
                    "fields": ["age"]
                },
                "name": "age-index",
                "type": "json"
            };

            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', age: 75, name: { first: 'Nancy', surname: 'Sinatra' } },
                    { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                    { _id: '3', age: 80, name: { first: 'John', surname: 'Fogerty' } },
                    { _id: '4', age: 76, name: { first: 'Mick', surname: 'Jagger' } },
                ]);
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { age: { $gte: 0 } },
                            { $not: { age: { $eq: 75 } } },
                            {
                                $or: [
                                    { "name.first": "Eddie" },
                                ]
                            }
                        ]
                    }
                });
            }).then(function (resp) {
                var docs = resp.docs.map(function (doc) {
                    delete doc._rev;
                    return doc;
                });

                assert.deepEqual(docs, [
                    { _id: '2', age: 40, name: { first: 'Eddie', surname: 'Vedder' } },
                ]);
            });
        });
    });

    describe('or', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981, awesome: true },
                    {
                        name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996,
                        awesome: false
                    },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986, awesome: true },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981, awesome: false },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996, awesome: true },
                    {
                        name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990,
                        awesome: true
                    },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983, awesome: false },
                    { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993, awesome: true },
                    { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994, awesome: true },
                    { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986, awesome: true },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990, awesome: true },
                    { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992, awesome: true },
                    {
                        name: 'Master Hand', _id: 'master_hand', series: 'Smash Bros', rank: 0, debut: 1999,
                        awesome: false
                    }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('#6366 should do a basic $or', function () {
            return db.find({
                selector: {
                    "$or": [
                        { "name": "Link" },
                        { "name": "Mario" }
                    ]
                }
            }).then(function (res) {
                var docs = res.docs.map(function (doc) {
                    return {
                        _id: doc._id
                    };
                });
                assert.deepEqual(docs, [
                    { '_id': 'link' },
                    { '_id': 'mario' },
                ]);
            });
        });

        it('#6366 should do a basic $or, with explicit $eq', function () {
            return db.find({
                selector: {
                    "$or": [
                        { "name": { $eq: "Link" } },
                        { "name": { $eq: "Mario" } }
                    ]
                }
            }).then(function (res) {
                var docs = res.docs.map(function (doc) {
                    return {
                        _id: doc._id
                    };
                });
                assert.deepEqual(docs, [
                    { '_id': 'link' },
                    { '_id': 'mario' },
                ]);
            });
        });
    });

    describe('pick-fields', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should pick shallow fields', function () {
            return db.bulkDocs([
                { name: 'Mario', _id: 'mario', series: 'Mario', debut: { year: 1981, month: 'May' } },
                { name: 'Jigglypuff', _id: 'puff', series: 'Pokemon', debut: { year: 1996, month: 'June' } },
                { name: 'Link', _id: 'link', series: 'Zelda', debut: { year: 1986, month: 'July' } },
                { name: 'Donkey Kong', _id: 'dk', series: 'Mario', debut: { year: 1981, month: 'April' } },
                {
                    name: 'Pikachu', series: 'Pokemon', _id: 'pikachu',
                    debut: { year: 1996, month: 'September' }
                },
                {
                    name: 'Captain Falcon', _id: 'falcon', series: 'F-Zero',
                    debut: { year: 1990, month: 'December' }
                }
            ]).then(function () {
                return db.find({
                    selector: { _id: { $gt: null } },
                    sort: ['_id'],
                    fields: ['name']
                });
            }).then(function (res) {
                assert.deepEqual(res.docs, [
                    { name: 'Donkey Kong' },
                    { name: 'Captain Falcon' },
                    { name: 'Link' },
                    { name: 'Mario' },
                    { name: 'Pikachu' },
                    { name: 'Jigglypuff' }]);
            });
        });

        it('should pick deep fields', function () {
            return db.bulkDocs([
                { _id: 'a', foo: { bar: 'yo' }, bar: { baz: 'hey' } },
                { _id: 'b', foo: { bar: 'sup' }, bar: { baz: 'dawg' } },
                { _id: 'c', foo: true, bar: "yo" },
                { _id: 'd', foo: null, bar: [] }
            ]).then(function () {
                return db.find({
                    selector: { _id: { $gt: null } },
                    sort: ['_id'],
                    fields: ['_id', 'bar.baz']
                });
            }).then(function (res) {
                assert.deepEqual(res.docs, [
                    { _id: 'a', bar: { baz: 'hey' } },
                    { _id: 'b', bar: { baz: 'dawg' } },
                    { _id: 'c' },
                    { _id: 'd' }]);
            });
        });

        it('should pick really deep fields with escape', function () {
            return db.bulkDocs([
                { _id: 'a', really: { deeply: { nested: { 'escaped.field': 'You found me!' } } } }
            ]).then(function () {
                return db.find({
                    selector: { _id: { $gt: null } },
                    fields: ['really.deeply.nested.escaped\\.field']
                });
            }).then(function (res) {
                assert.deepEqual(res.docs, [
                    { really: { deeply: { nested: { 'escaped.field': 'You found me!' } } } }
                ]);
            });
        });
    });

    describe('regex', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981, awesome: true },
                    {
                        name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996,
                        awesome: false
                    },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986, awesome: true },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981, awesome: false },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996, awesome: true },
                    {
                        name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990,
                        awesome: true
                    },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983, awesome: false },
                    { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993, awesome: true },
                    { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994, awesome: true },
                    { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986, awesome: true },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990, awesome: true },
                    { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992, awesome: true },
                    {
                        name: 'Master Hand', _id: 'master_hand', series: 'Smash Bros', rank: 0, debut: 1999,
                        awesome: false
                    }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should do a basic regex search', function () {
            var index = {
                "index": {
                    "fields": ["name"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: {
                        name: { $gte: null },
                        series: { $regex: "^Mario" }
                    },
                    sort: ['name']
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, [
                        {
                            name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario',
                            debut: 1981, awesome: false
                        },
                        { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983, awesome: false },
                        { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981, awesome: true },
                        { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990, awesome: true },
                    ]);
                });
            });
        });

        it('returns 0 docs for no match', function () {
            var index = {
                "index": {
                    "fields": ["name"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: {
                        name: { $gte: null },
                        series: { $regex: "^Wrong" }
                    },
                    sort: ['name']
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, []);
                });
            });
        });

        it('does not return docs for regex on non-string field', function () {
            var index = {
                "index": {
                    "fields": ["name"]
                }
            };
            return db.createIndex(index).then(function () {
                return db.find({
                    selector: {
                        name: { $gte: null },
                        debut: { $regex: "^Mario" }
                    },
                    sort: ['name']
                }).then(function (resp) {
                    var docs = resp.docs.map(function (doc) {
                        delete doc._rev;
                        return doc;
                    });

                    assert.deepEqual(docs, []);
                });
            });
        });
    });

    describe('set-operations', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981 },
                    { name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996 },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986 },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981 },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                    { name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990 },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983 },
                    { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993 },
                    { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994 },
                    { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986 },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990 },
                    { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992 }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should work with $and 1', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1990 } }
                        ]
                    },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'yoshi' }]);
            });
        });

        it('should work with $and 2, same index', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series", "debut"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1990 } }
                        ]
                    },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'yoshi' }]);
            });
        });

        it('should work with $and 3, index/no-index', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["rank"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1990 } }
                        ]
                    },
                    fields: ['_id']
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'yoshi' }]);
            });
        });

        it('should work with $and 4, wrong index', function () {
            return db.createIndex({
                "index": {
                    "fields": ["rank"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1990 } }
                        ]
                    },
                    fields: ['_id']
                }).then(function (resp) {
                    assert.deepEqual(resp, {
                        warning: 'no matching index found, create an index to optimize query time',
                        docs: [
                            { _id: 'yoshi' }
                        ]
                    });
                });
            });
        });
    });

    describe('skip', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981 },
                    { name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996 },
                    { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986 },
                    { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981 },
                    { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                    { name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990 },
                    { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983 },
                    { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993 },
                    { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994 },
                    { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986 },
                    { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990 },
                    { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992 }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('should work with $and 1 skip 0', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    skip: 0
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }, { _id: 'yoshi' }]);
            });
        });

        it('should work with $and 1 skip 1', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    skip: 1
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'yoshi' }]);
            });
        });

        it('should work with $and 1 skip 2', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["debut"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    skip: 2
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, []);
            });
        });

        it('should work with $and 2, same index skip 0', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series", "debut"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    skip: 0
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }, { _id: 'yoshi' }]);
            });
        });

        it('should work with $and 2, same index skip 1', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series", "debut"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    skip: 1
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'yoshi' }]);
            });
        });

        it('should work with $and 2, same index skip 2', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series", "debut"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    skip: 2
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, []);
            });
        });

        it('should work with $and 3, index/no-index skip 0', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["rank"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    skip: 0
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'luigi' }, { _id: 'yoshi' }]);
            });
        });

        it('should work with $and 3, index/no-index skip 1', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["rank"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1982 } }
                        ]
                    },
                    fields: ['_id'],
                    skip: 1
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'yoshi' }]);
            });
        });

        it('should work with $and 3, index/no-index skip 2', function () {
            return db.createIndex({
                "index": {
                    "fields": ["series"]
                }
            }).then(function () {
                return db.createIndex({
                    "index": {
                        "fields": ["rank"]
                    }
                });
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1983 } }
                        ]
                    },
                    fields: ['_id'],
                    skip: 2
                });
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, []);
            });
        });

        it('should work with $and 4, wrong index', function () {
            return db.createIndex({
                "index": {
                    "fields": ["rank"]
                }
            }).then(function () {
                return db.find({
                    selector: {
                        $and: [
                            { series: 'Mario' },
                            { debut: { $gte: 1990 } }
                        ]
                    },
                    fields: ['_id'],
                    skip: 1
                }).then(function (resp) {
                    assert.deepEqual(resp, {
                        warning: 'no matching index found, create an index to optimize query time',
                        docs: []
                    });
                });
            });
        });
    });

    describe('sorting', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                done();
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('sorts correctly - just _id', function () {
            return db.bulkDocs([
                { _id: 'a', foo: 'a' },
                { _id: 'b', foo: 'b' }
            ]).then(function () {
                return db.find({
                    "selector": { "_id": { $gte: "a" } },
                    "fields": ["_id", "foo"],
                    "sort": [{ "_id": "asc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "docs": [
                        { "_id": "a", "foo": "a" },
                        { "_id": "b", "foo": "b" }
                    ]
                });
            });
        });

        it('sorts correctly - just _id desc', function () {
            return db.bulkDocs([
                { _id: 'a', foo: 'a' },
                { _id: 'b', foo: 'b' }
            ]).then(function () {
                return db.find({
                    "selector": { "_id": { $gte: "a" } },
                    "fields": ["_id", "foo"],
                    "sort": [{ "_id": "desc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "docs": [
                        { "_id": "b", "foo": "b" },
                        { "_id": "a", "foo": "a" }
                    ]
                });
            });
        });

        it('sorts correctly - foo desc', function () {
            var index = {
                "index": {
                    "fields": [{ "foo": "desc" }]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'a', foo: 'b' },
                    { _id: 'b', foo: 'a' },
                    { _id: 'c', foo: 'c' },
                    { _id: '0', foo: 'd' }
                ]);
            }).then(function () {
                return db.find({
                    "selector": { "foo": { $lte: "d" } },
                    "fields": ["foo"]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "docs": [
                        { "foo": "a" },
                        { "foo": "b" },
                        { "foo": "c" },
                        { "foo": "d" }
                    ]
                });
            });
        });

        it('sorts correctly - foo desc 2', function () {
            var index = {
                "index": {
                    "fields": [{ "foo": "desc" }]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'a', foo: 'b' },
                    { _id: 'b', foo: 'a' },
                    { _id: 'c', foo: 'c' },
                    { _id: '0', foo: 'd' }
                ]);
            }).then(function () {
                return db.find({
                    "selector": { "foo": { $lte: "d" } },
                    "fields": ["foo"],
                    "sort": [{ foo: "desc" }]
                });
            }).then(function (resp) {
                assert.deepEqual(resp, {
                    "docs": [
                        { "foo": "d" },
                        { "foo": "c" },
                        { "foo": "b" },
                        { "foo": "a" }
                    ]
                });
            });
        });

        it('sorts correctly - complex', function () {
            var index = {
                "index": {
                    "fields": ["foo"]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 'AAA' },
                    { _id: '2', foo: 'aAA' },
                    { _id: '3', foo: 'BAA' },
                    { _id: '4', foo: 'bAA' },
                    { _id: '5', foo: '\u0000aAA' },
                    { _id: '6', foo: '\u0001AAA' }
                ]);
            }).then(function () {
                return db.find({
                    "selector": { "foo": { "$gt": "\u0000\u0000" } },
                    "fields": ["_id", "foo"],
                    "sort": [{ "foo": "asc" }]
                });
            }).then(function (resp) {
                // ASCII vs ICU ordering. either is okay
                try {
                    assert.deepEqual(resp, {
                        "docs": [
                            { "_id": "2", "foo": "aAA" },
                            { "_id": "5", "foo": "\u0000aAA" },
                            { "_id": "1", "foo": "AAA" },
                            { "_id": "6", "foo": "\u0001AAA" },
                            { "_id": "4", "foo": "bAA" },
                            { "_id": "3", "foo": "BAA" }
                        ]
                    });
                } catch (e) {
                    assert.deepEqual(resp, {
                        docs: [
                            { _id: '5', foo: '\u0000aAA' },
                            { _id: '6', foo: '\u0001AAA' },
                            { _id: '1', foo: 'AAA' },
                            { _id: '3', foo: 'BAA' },
                            { _id: '2', foo: 'aAA' },
                            { _id: '4', foo: 'bAA' }
                        ]
                    });
                }
            });
        });

        it('supported mixed sort', function () {
            var index = {
                "index": {
                    "fields": [
                        "foo",
                        "bar"
                    ]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'a1', foo: 'a', bar: '1' },
                    { _id: 'a2', foo: 'a', bar: '2' },
                    { _id: 'b1', foo: 'b', bar: '1' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { $gte: 'a' } }
                });
            }).then(function (res) {
                res.docs.forEach(function (doc) {
                    assert.exists(doc._rev);
                    delete doc._rev;
                });
                assert.deepEqual(res, {
                    "docs": [
                        {
                            "_id": "a1",
                            "foo": "a",
                            "bar": "1"
                        },
                        {
                            "_id": "a2",
                            "foo": "a",
                            "bar": "2"
                        },
                        {
                            "_id": "b1",
                            "foo": "b",
                            "bar": "1"
                        }
                    ]
                });
            });
        });

        it('supported mixed sort 2', function () {
            var index = {
                "index": {
                    "fields": [
                        "foo",
                        "bar"
                    ]
                },
                "name": "foo-index",
                "type": "json"
            };
            return db.createIndex(index).then(function () {
                return db.bulkDocs([
                    { _id: 'a1', foo: 'a', bar: '1' },
                    { _id: 'a2', foo: 'a', bar: '2' },
                    { _id: 'b1', foo: 'b', bar: '1' }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { $gte: 'b' } }
                });
            }).then(function (res) {
                res.docs.forEach(function (doc) {
                    assert.exists(doc._rev);
                    delete doc._rev;
                });
                assert.deepEqual(res, {
                    "docs": [
                        {
                            "_id": "b1",
                            "foo": "b",
                            "bar": "1"
                        }
                    ]
                });
            });
        });

        it('sort error, not an array', function () {
            return db.createIndex({
                index: {
                    fields: ['foo']
                }
            }).then(function () {
                return db.bulkDocs([
                    { _id: '1', foo: 1 },
                    { _id: '2', foo: 2 },
                    { _id: '3', foo: 3 },
                    { _id: '4', foo: 4 }
                ]);
            }).then(function () {
                return db.find({
                    selector: { foo: { $eq: 1 } },
                    sort: {}
                }).then(function () {
                    throw new Error('expected an error');
                }, function (err) {
                    assert.exists(err);
                });
            });
        });
    });

    describe('type', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { _id: 'a', foo: 'bar' },
                    { _id: 'b', foo: 1 },
                    { _id: 'c', foo: null },
                    { _id: 'd', foo: [] },
                    { _id: 'e', foo: {} },
                    { _id: 'f', foo: false }
                ]).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('does null', function () {
            return db.find({
                selector: {
                    _id: { $gt: null },
                    'foo': { $type: 'null' }
                },
                fields: ['_id']
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'c' }]);
            });
        });

        it('does boolean', function () {
            return db.find({
                selector: {
                    _id: { $gt: null },
                    'foo': { $type: 'boolean' }
                },
                fields: ['_id']
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'f' }]);
            });
        });

        it('does number', function () {
            return db.find({
                selector: {
                    _id: { $gt: null },
                    'foo': { $type: 'number' }
                },
                fields: ['_id']
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'b' }]);
            });
        });

        it('does string', function () {
            return db.find({
                selector: {
                    _id: { $gt: null },
                    'foo': { $type: 'string' }
                },
                fields: ['_id']
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'a' }]);
            });
        });

        it('does array', function () {
            return db.find({
                selector: {
                    _id: { $gt: null },
                    'foo': { $type: 'array' }
                },
                fields: ['_id']
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'd' }]);
            });
        });

        it('does object', function () {
            return db.find({
                selector: {
                    _id: { $gt: null },
                    'foo': { $type: 'object' }
                },
                fields: ['_id']
            }).then(function (res) {
                res.docs.sort(sortById);
                assert.deepEqual(res.docs, [{ _id: 'e' }]);
            });
        });

        it('throws error for unmatched type', function () {
            return db.find({
                selector: {
                    _id: { $gt: null },
                    'foo': { $type: 'made-up' }
                },
                fields: ['_id']
            }).catch(function (err) {
                assert.match(err.message, /made-up not supported/);
            });
        });
    });

    describe('use-index', function () {
        const dbs = {};
        let db = null;

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl("local", "testdb");
            testUtils.cleanup([dbs.name], () => {
                db = new PouchDB(dbs.name);
                db.bulkDocs([
                    { name: 'mario', _id: 'mario', rank: 5, series: 'mario', debut: 1981 },
                    { name: 'jigglypuff', _id: 'puff', rank: 8, series: 'pokemon', debut: 1996 },
                    { name: 'link', rank: 10, _id: 'link', series: 'zelda', debut: 1986 },
                    { name: 'donkey kong', rank: 7, _id: 'dk', series: 'mario', debut: 1981 },
                    { name: 'pikachu', series: 'pokemon', _id: 'pikachu', rank: 1, debut: 1996 },
                    { name: 'captain falcon', _id: 'falcon', rank: 4, series: 'f-zero', debut: 1990 },
                    { name: 'luigi', rank: 11, _id: 'luigi', series: 'mario', debut: 1983 },
                    { name: 'fox', _id: 'fox', rank: 3, series: 'star fox', debut: 1993 },
                    { name: 'ness', rank: 9, _id: 'ness', series: 'earthbound', debut: 1994 },
                    { name: 'samus', rank: 12, _id: 'samus', series: 'metroid', debut: 1986 },
                    { name: 'yoshi', _id: 'yoshi', rank: 6, series: 'mario', debut: 1990 },
                    { name: 'kirby', _id: 'kirby', series: 'kirby', rank: 2, debut: 1992 }
                ]).then(function () {
                    return db.createIndex({
                        index: {
                            "fields": ["name", "series"]
                        },
                        "ddoc": "index-1",
                        "type": "json"
                    });
                }).then(function () {
                    return db.createIndex({
                        index: {
                            "fields": ["name", "debut"]
                        },
                        "ddoc": "index-2",
                        "type": "json"
                    });
                }).then(function () {
                    return db.createIndex({
                        index: {
                            "fields": ["name", "another-field"]
                        },
                        "ddoc": "index-3",
                        "name": "third-index",
                        "type": "json"
                    });
                }).then(() => done());
            });
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        it('use index based on ddoc', function () {
            return db.explain({
                selector: {
                    name: 'mario'
                },
                use_index: "index-2",
                fields: ["_id"]
            }).then(function (resp) {
                assert.equal(resp.index.ddoc, "_design/index-2");
            });
        });

        it('use index based on ddoc and name', function () {
            return db.explain({
                selector: {
                    name: 'mario'
                },
                use_index: ["index-3", "third-index"],
                fields: ["_id"]
            }).then(function (resp) {
                assert.equal(resp.index.ddoc, "_design/index-3");
            });
        });

        it('throws error if index does not exist', function () {
            return db.explain({
                selector: {
                    name: 'mario'
                },
                use_index: "index-not-found",
                fields: ["_id"]
            }).then(function () {
                throw "Should not get here";
            }).catch(function (err) {
                assert.equal(err.error, "unknown_error");
            });
        });

        it('throws error if index cannot be used', function () {
            return db.explain({
                selector: {
                    rank: 2
                },
                use_index: "index-2",
                fields: ["_id"]
            }).then(function () {
                throw "Should not get here";
            }).catch(function (err) {
                assert.equal(err.error, "no_usable_index");
            });
        });
    });
});
