const start = require("./common");
const mongoose = start.mongoose;
const random = adone.odm.utils.random;
const Schema = mongoose.Schema;

describe("model", () => {
    let schema;

    function getModel(db) {
        return db.model("GeoSearch", schema, `geosearch-${random()}`);
    }

    before(() => {
        schema = new Schema({
            pos: [Number],
            complex: {},
            type: String
        });
        schema.index({ pos: "geoHaystack", type: 1 }, { bucketSize: 1 });
    });

    describe("geoSearch", () => {
        it("works", (done) => {
            const db = start();
            const Geo = getModel(db);
            assert.ok(Geo.geoSearch instanceof Function);

            Geo.on("index", (err) => {
                assert.ifError(err);

                const geos = [];
                geos[0] = new Geo({ pos: [10, 10], type: "place" });
                geos[1] = new Geo({ pos: [15, 5], type: "place" });
                geos[2] = new Geo({ pos: [20, 15], type: "house" });
                geos[3] = new Geo({ pos: [1, -1], type: "house" });
                let count = geos.length;

                for (let i = 0; i < geos.length; i++) {
                    geos[i].save((err) => {
                        assert.ifError(err);
                        --count || next();
                    });
                }

                function next() {
                    Geo.geoSearch({ type: "place" }, { near: [9, 9], maxDistance: 5 }, (err, results) => {
                        assert.ifError(err);
                        assert.equal(results.length, 1);

                        assert.equal(results[0].type, "place");
                        assert.equal(results[0].pos.length, 2);
                        assert.equal(results[0].pos[0], 10);
                        assert.equal(results[0].pos[1], 10);
                        assert.equal(results[0].id, geos[0].id);
                        assert.ok(results[0] instanceof Geo);

                        Geo.geoSearch({ type: "place" }, { near: [40, 40], maxDistance: 5 }, (err, results) => {
                            assert.ifError(err);
                            assert.equal(results.length, 0);
                            db.close(done);
                        });
                    });
                }
            });
        });
        it("works with lean", (done) => {
            const db = start();
            const Geo = getModel(db);
            assert.ok(Geo.geoSearch instanceof Function);

            Geo.on("index", (err) => {
                assert.ifError(err);

                const geos = [];
                geos[0] = new Geo({ pos: [10, 10], type: "place" });
                geos[1] = new Geo({ pos: [15, 5], type: "place" });
                geos[2] = new Geo({ pos: [20, 15], type: "house" });
                geos[3] = new Geo({ pos: [1, -1], type: "house" });
                let count = geos.length;

                for (let i = 0; i < geos.length; i++) {
                    geos[i].save((err) => {
                        assert.ifError(err);
                        --count || next();
                    });
                }

                function next() {
                    Geo.geoSearch({ type: "place" }, { near: [9, 9], maxDistance: 5, lean: true }, (err, results) => {
                        assert.ifError(err);
                        assert.equal(results.length, 1);

                        assert.equal(results[0].type, "place");
                        assert.equal(results[0].pos.length, 2);
                        assert.equal(results[0].pos[0], 10);
                        assert.equal(results[0].pos[1], 10);
                        assert.equal(results[0]._id, geos[0].id);
                        assert.strictEqual(results[0].id, undefined);
                        assert.ok(!(results[0] instanceof Geo));
                        db.close(done);
                    });
                }
            });
        });
        it("throws the correct error messages", (done) => {
            const db = start();
            const Geo = getModel(db);
            assert.ok(Geo.geoSearch instanceof Function);

            Geo.on("index", (err) => {
                assert.ifError(err);

                const g = new Geo({ pos: [10, 10], type: "place" });
                g.save(() => {
                    Geo.geoSearch([], {}, (e) => {
                        assert.ok(e);
                        assert.equal(e.message, 'Must pass conditions to geoSearch');

                        Geo.geoSearch({ type: 'test' }, {}, function (e) {
                            assert.ok(e);
                            assert.equal(e.message, 'Must specify the near option in geoSearch');

                            Geo.geoSearch({ type: 'test' }, { near: 'hello' }, function (e) {
                                assert.ok(e);
                                assert.equal(e.message, 'near option must be an array [x, y]');

                                Geo.geoSearch({ type: 'test' }, { near: [1, 2] }, function (err) {
                                    assert.ok(err);
                                    assert.ok(/maxDistance needs a number/.test(err));
                                    db.close(done);
                                });
                            });
                        });
                    });
                });
            });
        });
        it("returns a promise (gh-1614)", (done) => {
            const db = start();
            const Geo = getModel(db);

            const prom = Geo.geoSearch({ type: "place" }, { near: [9, 9], maxDistance: 5 }, () => { });
            assert.ok(prom instanceof mongoose.Promise);
            db.close();
            done();
        });

        it("allows not passing a callback (gh-1614)", (done) => {
            const db = start();
            const Geo = getModel(db);
            Geo.on("index", (err) => {
                assert.ifError(err);
                const g = new Geo({ pos: [10, 10], type: "place" });
                g.save((err) => {
                    assert.ifError(err);

                    let promise;
                    assert.doesNotThrow(() => {
                        promise = Geo.geoSearch({ type: 'place' }, { near: [9, 9], maxDistance: 5 });
                    });
                    function validate(ret, stat) {
                        assert.equal(ret.length, 1);
                        assert.equal(ret[0].pos[0], 10);
                        assert.equal(ret[0].pos[1], 10);
                        assert.ok(stat);
                    }

                    function finish() {
                        db.close(done);
                    }
                    promise.then(validate, assert.ifError).then(finish).end();
                });
            });
        });
    });
});