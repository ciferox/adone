const start = require("./common");
const mongoose = adone.odm;
const utils = adone.odm.utils;
const random = utils.random;
const Schema = mongoose.Schema;
const fs = require("fs");

const names = ("Aaden Aaron Adrian Aditya Agustin Jim Bob Jonah Frank Sally Lucy").split(" ");

describe("query stream:", () => {
    let db;
    let Person;
    const collection = `personforstream_${random()}`;
    let P;

    before(() => {
        db = start();

        Person = new Schema({
            name: String
        });

        P = db.model("PersonForStream", Person, collection);
    });

    before((done) => {
        const people = names.map((name) => {
            return { name };
        });

        P.create(people, (err) => {
            assert.ifError(err);
            done();
        });
    });

    after((done) => {
        db.close(done);
    });

    it("works", (done) => {
        let i = 0;
        let closed = 0;
        let paused = 0;
        let resumed = 0;
        const seen = {};
        let err;

        const stream = P.find().batchSize(3).stream();

        function cb() {
            assert.strictEqual(undefined, err);
            assert.equal(names.length, i);
            assert.equal(closed, 1);
            assert.equal(paused, 1);
            assert.equal(resumed, 1);
            assert.equal(stream._cursor.isClosed(), true);
            done();
        }

        stream.on("data", (doc) => {
            assert.strictEqual(true, Boolean(doc.name));
            assert.strictEqual(true, Boolean(doc._id));

            // no dup docs emitted
            assert.ok(!seen[doc.id]);
            seen[doc.id] = 1;

            if (paused > 0 && resumed === 0) {
                err = new Error("data emitted during pause");
                return cb();
            }

            ++i;

            if (i === 3) {
                assert.equal(stream.paused, false);
                stream.pause();
                assert.equal(stream.paused, true);
                paused++;

                setTimeout(() => {
                    assert.equal(stream.paused, true);
                    resumed++;
                    stream.resume();
                    assert.equal(stream.paused, false);
                }, 20);
            } else if (i === 4) {
                stream.pause();
                assert.equal(stream.paused, true);
                stream.resume();
                assert.equal(stream.paused, false);
            }
        });

        stream.on("error", (er) => {
            err = er;
            cb();
        });

        stream.on("close", () => {
            closed++;
            cb();
        });
    });

    it("immediately destroying a stream prevents the query from executing", (done) => {
        let i = 0;

        const stream = P.where("name", "Jonah").select("name").findOne().stream();

        function cb(err) {
            assert.ifError(err);
            assert.equal(i, 0);
            process.nextTick(() => {
                assert.strictEqual(null, stream._fields);
                done();
            });
        }

        stream.on("data", () => {
            i++;
        });
        stream.on("close", cb);
        stream.on("error", cb);

        stream.destroy();
    });

    it("destroying a stream stops it", function (done) {
        // this.slow(300);

        let finished = 0;
        let i = 0;

        const stream = P.where("name").exists().limit(10).select("_id").stream();

        assert.strictEqual(null, stream._destroyed);
        assert.equal(stream.readable, true);

        function cb(err) {
            ++finished;
            setTimeout(() => {
                assert.strictEqual(undefined, err);
                assert.equal(i, 5);
                assert.equal(finished, 1);
                assert.equal(stream._destroyed, true);
                assert.equal(stream.readable, false);
                assert.equal(stream._cursor.isClosed(), true);
                done();
            }, 100);
        }

        stream.on("data", (doc) => {
            assert.strictEqual(undefined, doc.name);
            if (++i === 5) {
                stream.destroy();
                assert.equal(stream.readable, false);
            }
        });

        stream.on("close", cb);
        stream.on("error", cb);
    });

    it("pipe", (done) => {
        const filename = "/tmp/_mongoose_stream_out.txt";
        const out = fs.createWriteStream(filename);

        const opts = { transform: JSON.stringify };
        const stream = P.find().sort("name").limit(20).stream(opts);
        stream.pipe(out);

        function cb(err) {
            assert.ifError(err);
            const contents = fs.readFileSync(filename, "utf8");
            assert.ok(/Aaden/.test(contents));
            assert.ok(/Aaron/.test(contents));
            assert.ok(/Adrian/.test(contents));
            assert.ok(/Aditya/.test(contents));
            assert.ok(/Agustin/.test(contents));
            fs.unlink(filename);
            done();
        }

        stream.on("error", cb);
        out.on("close", cb);
    });

    it("lean", (done) => {
        let i = 0;
        let closed = 0;
        let err;

        const stream = P.find({}).lean().stream();

        function cb() {
            assert.strictEqual(undefined, err);
            assert.equal(names.length, i);
            assert.equal(closed, 1);
            assert.equal(stream._cursor.isClosed(), true);
            done();
        }

        stream.on("data", (doc) => {
            assert.strictEqual(false, doc instanceof mongoose.Document);
            i++;

            if (i === 1) {
                stream.pause();
                assert.equal(stream.paused, true);
                stream.resume();
                assert.equal(stream.paused, false);
            } else if (i === 2) {
                stream.pause();
                assert.equal(stream.paused, true);
                process.nextTick(() => {
                    assert.equal(stream.paused, true);
                    stream.resume();
                    assert.equal(stream.paused, false);
                });
            }
        });

        stream.on("error", (er) => {
            err = er;
            cb();
        });

        stream.on("close", () => {
            closed++;
            cb();
        });
    });

    it("supports $elemMatch with $in (gh-1091)", function (done) {
        this.timeout(3000);

        const postSchema = new Schema({
            ids: [{ type: Schema.ObjectId }],
            title: String
        });

        const B = db.model("gh-1100-stream", postSchema);
        const _id1 = new mongoose.Types.ObjectId();
        const _id2 = new mongoose.Types.ObjectId();

        B.create({ ids: [_id1, _id2] }, (err, doc) => {
            assert.ifError(err);

            let error;

            const stream = B.find({ _id: doc._id })
                .select({ title: 1, ids: { $elemMatch: { $in: [_id2.toString()] } } })
                .stream();

            stream.
                on("data", (found) => {
                    assert.equal(found.id, doc.id);
                    assert.equal(found.ids.length, 1);
                    assert.equal(_id2.toString(), found.ids[0].toString());
                }).
                on("error", (err) => {
                    error = err;
                }).
                on("close", () => {
                    done(error);
                });
        });
    });

    it("supports population (gh-1411)", (done) => {
        const barSchema = new Schema({
            value: Number
        });

        const fooSchema = new Schema({
            bar: { type: "ObjectId", ref: "Bar" }
        });

        const Foo = db.model("Foo", fooSchema);
        const Bar = db.model("Bar", barSchema);
        const found = [];

        function complete(err) {
            if (!err) {
                assert.ok(~found.indexOf(2));
                assert.ok(~found.indexOf(3));
            }
            done();
        }

        Bar.create({ value: 2 }, { value: 3 }, (err, bar1, bar2) => {
            if (err) { return complete(err); }

            Foo.create({ bar: bar1 }, { bar: bar2 }, (err) => {
                if (err) return complete(err);

                Foo.
                    find().
                    populate('bar').
                    stream().
                    on('data', function (foo) {
                        found.push(foo.bar.value);
                    }).
                    on('end', complete).
                    on('error', complete);
            });
        });
    });

    it("respects schema options (gh-1862)", (done) => {
        const schema = new Schema({
            fullname: { type: String },
            password: { type: String, select: false }
        });

        const User = db.model("gh-1862", schema, "gh-1862");
        User.create({ fullname: "val", password: "taco" }, (error) => {
            assert.ifError(error);
            User.find().stream().on("data", (doc) => {
                assert.equal(doc.password, void 0);
                done();
            });
        });
    });

    it("works with populate + lean (gh-2841)", (done) => {
        const Sku = db.model("Sku", {}, "gh2841_0");
        const Item = db.model("Item", {
            sku: { ref: "Sku", type: Schema.Types.ObjectId }
        }, "gh2841_1");

        Sku.create({}, (error, sku) => {
            assert.ifError(error);
            Item.create({ sku: sku._id }, (error) => {
                assert.ifError(error);

                var found = 0;
                var popOpts = { path: 'sku', options: { lean: true } };
                var stream = Item.find().populate(popOpts).stream();
                stream.on('data', function (doc) {
                    ++found;
                    assert.equal(doc.sku._id.toString(), sku._id.toString());
                });
                stream.on('end', function () {
                    assert.equal(found, 1);
                    done();
                });
            });
        });
    });

    it("works with populate + dynref (gh-3108)", (done) => {
        const reviewSchema = new Schema({
            _id: Number,
            text: String,
            item: {
                id: {
                    type: Number,
                    refPath: "item.type"
                },
                type: {
                    type: String
                }
            },
            items: [
                {
                    id: {
                        type: Number,
                        refPath: "items.type"
                    },
                    type: {
                        type: String
                    }
                }
            ]
        });

        const item1Schema = new Schema({
            _id: Number,
            name: String
        });

        const item2Schema = new Schema({
            _id: Number,
            otherName: String
        });

        const Review = db.model("dynrefReview", reviewSchema, "gh3108_0");
        const Item1 = db.model("dynrefItem1", item1Schema, "gh3108_1");
        const Item2 = db.model("dynrefItem2", item2Schema, "gh3108_2");

        let c = 0;

        const create = function (cb) {
            Item1.create({ _id: ++c, name: "Val" }, (error) => {
                assert.ifError(error);
                Item2.create({ _id: ++c, otherName: "Val" }, (error) => {
                    assert.ifError(error);
                    var review = {
                        _id: c,
                        text: 'Test',
                        item: { id: c - 1, type: 'dynrefItem1' },
                        items: [
                            { id: c - 1, type: 'dynrefItem1' },
                            { id: c, type: 'dynrefItem2' }
                        ]
                    };
                    Review.create(review, function (error) {
                        assert.ifError(error);
                        cb();
                    });
                });
            });
        };

        const test = function () {
            const stream = Review.find({}).populate("items.id").stream();
            let count = 0;

            stream.on("data", (doc) => {
                ++count;
                assert.equal(doc.items[0].id.name, "Val");
                assert.equal(doc.items[1].id.otherName, "Val");
            });

            stream.on("close", () => {
                assert.equal(count, 2);
                done();
            });
        };

        create(() => {
            create(() => {
                test();
            });
        });
    });
});
