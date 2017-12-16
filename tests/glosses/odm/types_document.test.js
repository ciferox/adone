const start = require("./common");
const mongoose = adone.odm;
const { DocumentArray, Embedded } = adone.odm.types;
const EventEmitter = require("events").EventEmitter;
const Schema = mongoose.Schema;
const ValidationError = mongoose.Document.ValidationError;


describe("types.document", () => {
    let Dummy;
    let Subdocument;
    let RatingSchema;
    let MovieSchema;

    before(() => {
        class _Dummy extends mongoose.Document {
            constructor() {
                super({});
            }
        }
        Dummy = _Dummy;
        Dummy.prototype.$__setSchema(new Schema());

        class _Subdocument extends Embedded {
            constructor() {
                const arr = new DocumentArray();
                arr._path = "jsconf.ar";
                arr._parent = new Dummy();
                super({}, arr);
                arr[0] = this;
            }
        }

        Subdocument = _Subdocument;

        for (const i in EventEmitter.prototype) {
            Subdocument[i] = EventEmitter.prototype[i];
        }

        Subdocument.prototype.$__setSchema(new Schema({
            test: { type: String, required: true },
            work: { type: String, validate: /^good/ }
        }));

        RatingSchema = new Schema({
            stars: Number,
            description: { source: { url: String, time: Date } }
        });

        MovieSchema = new Schema({
            title: String,
            ratings: [RatingSchema]
        });

        mongoose.model("Movie", MovieSchema);
    });

    it("test that validate sets errors", (done) => {
        const a = new Subdocument();
        a.set("test", "");
        a.set("work", "nope");
        a.__index = 0;

        a.validate(() => {
            assert.ok(a.__parent.$__.validationError instanceof ValidationError);
            assert.equal(a.__parent.errors["jsconf.ar.0.work"].name, "ValidatorError");
            done();
        });
    });

    it("objects can be passed to #set", (done) => {
        const a = new Subdocument();
        a.set({ test: "paradiddle", work: "good flam" });
        assert.equal(a.test, "paradiddle");
        assert.equal(a.work, "good flam");
        done();
    });

    it("Subdocuments can be passed to #set", (done) => {
        const a = new Subdocument();
        a.set({ test: "paradiddle", work: "good flam" });
        assert.equal(a.test, "paradiddle");
        assert.equal(a.work, "good flam");
        const b = new Subdocument();
        b.set(a);
        assert.equal(b.test, "paradiddle");
        assert.equal(b.work, "good flam");
        done();
    });

    it("cached _ids", (done) => {
        const db = start();
        const Movie = db.model("Movie");
        const m = new Movie();

        assert.equal(m.id, m.$__._id);
        const old = m.id;
        m._id = new mongoose.Types.ObjectId();
        assert.equal(m.id, m.$__._id);
        assert.strictEqual(true, old !== m.$__._id);

        const m2 = new Movie();
        delete m2._doc._id;
        m2.init({ _id: new mongoose.Types.ObjectId() });
        assert.equal(m2.id, m2.$__._id);
        assert.strictEqual(true, m.$__._id !== m2.$__._id);
        assert.strictEqual(true, m.id !== m2.id);
        assert.strictEqual(true, m.$__._id !== m2.$__._id);
        db.close(done);
    });

    it("Subdocument#remove (gh-531)", (done) => {
        const db = start();
        const Movie = db.model("Movie");

        const super8 = new Movie({ title: "Super 8" });

        const id1 = "4e3d5fc7da5d7eb635063c96";
        const id2 = "4e3d5fc7da5d7eb635063c97";
        const id3 = "4e3d5fc7da5d7eb635063c98";
        const id4 = "4e3d5fc7da5d7eb635063c99";

        super8.ratings.push({ stars: 9, _id: id1 });
        super8.ratings.push({ stars: 8, _id: id2 });
        super8.ratings.push({ stars: 7, _id: id3 });
        super8.ratings.push({ stars: 6, _id: id4 });

        super8.save((err) => {
            assert.ifError(err);

            assert.equal(super8.title, "Super 8");
            assert.equal(super8.ratings.id(id1).stars.valueOf(), 9);
            assert.equal(super8.ratings.id(id2).stars.valueOf(), 8);
            assert.equal(super8.ratings.id(id3).stars.valueOf(), 7);
            assert.equal(super8.ratings.id(id4).stars.valueOf(), 6);

            super8.ratings.id(id1).stars = 5;
            super8.ratings.id(id2).remove();
            super8.ratings.id(id3).stars = 4;
            super8.ratings.id(id4).stars = 3;

            super8.save((err) => {
                assert.ifError(err);

                Movie.findById(super8._id, (err, movie) => {
                    assert.ifError(err);

                    assert.equal(movie.title, "Super 8");
                    assert.equal(movie.ratings.length, 3);
                    assert.equal(movie.ratings.id(id1).stars.valueOf(), 5);
                    assert.equal(movie.ratings.id(id3).stars.valueOf(), 4);
                    assert.equal(movie.ratings.id(id4).stars.valueOf(), 3);

                    movie.ratings.id(id1).stars = 2;
                    movie.ratings.id(id3).remove();
                    movie.ratings.id(id4).stars = 1;

                    movie.save((err) => {
                        assert.ifError(err);

                        Movie.findById(super8._id, (err, movie) => {
                            assert.ifError(err);
                            assert.equal(movie.ratings.length, 2);
                            assert.equal(movie.ratings.id(id1).stars.valueOf(), 2);
                            assert.equal(movie.ratings.id(id4).stars.valueOf(), 1);

                            // gh-531
                            movie.ratings[0].remove();
                            movie.ratings[0].remove();
                            movie.save(() => {
                                Movie.findById(super8._id, (err, movie) => {
                                    assert.ifError(err);
                                    assert.equal(movie.ratings.length, 0);
                                    db.close(done);
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("setting nested objects", () => {
        it("works (gh-1394)", (done) => {
            const db = start();
            const Movie = db.model("Movie");

            Movie.create({
                title: "Life of Pi",
                ratings: [{
                    description: {
                        source: {
                            url: "http://www.imdb.com/title/tt0454876/",
                            time: new Date()
                        }
                    }
                }]
            }, (err, movie) => {
                assert.ifError(err);

                Movie.findById(movie, (err, movie) => {
                    assert.ifError(err);

                    assert.ok(movie.ratings[0].description.source.time instanceof Date);
                    movie.ratings[0].description.source = { url: "http://www.lifeofpimovie.com/" };

                    movie.save((err) => {
                        assert.ifError(err);

                        Movie.findById(movie, (err, movie) => {
                            assert.ifError(err);

                            assert.equal("http://www.lifeofpimovie.com/", movie.ratings[0].description.source.url);

                            // overwritten date
                            assert.equal(undefined, movie.ratings[0].description.source.time);

                            const newDate = new Date();
                            movie.ratings[0].set("description.source.time", newDate, { merge: true });
                            movie.save((err) => {
                                assert.ifError(err);

                                Movie.findById(movie, (err, movie) => {
                                    assert.ifError(err);
                                    assert.equal(String(newDate), movie.ratings[0].description.source.time);
                                    // url not overwritten using merge
                                    assert.equal('http://www.lifeofpimovie.com/', movie.ratings[0].description.source.url);
                                    db.close(done);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
