const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;
const random = adone.odm.utils.random;
const mongodb = adone.database.mongo;
const MongooseArray = mongoose.Types.Array;
const collection = `avengers_${random()}`;

const {
    is
} = adone;

describe("types array", () => {
    let User;
    let Pet;

    before(() => {
        User = new Schema({
            name: String,
            pets: [Schema.ObjectId]
        });

        mongoose.model("User", User);

        Pet = new Schema({
            name: String
        });

        mongoose.model("Pet", Pet);
    });

    it("behaves and quacks like an Array", (done) => {
        const a = new MongooseArray();

        assert.ok(a instanceof Array);
        assert.ok(a.isMongooseArray);
        assert.equal(is.array(a), true);

        assert.deepEqual(a._atomics.constructor, Object);
        done();
    });

    describe("hasAtomics", () => {
        it("does not throw", (done) => {
            let b = new MongooseArray([12, 3, 4, 5]).filter(Boolean);
            let threw = false;

            try {
                b.hasAtomics;
            } catch (_) {
                threw = true;
            }

            assert.ok(!threw);

            let a = new MongooseArray([67, 8]).filter(Boolean);
            try {
                a.push(3, 4);
            } catch (_) {
                console.error(_);
                threw = true;
            }

            assert.ok(!threw);
            done();
        });
    });

    describe("indexOf()", () => {
        it("works", (done) => {
            let db = start(),
                User = db.model("User", "users_" + random()),
                Pet = db.model("Pet", "pets" + random());

            let tj = new User({ name: "tj" }),
                tobi = new Pet({ name: "tobi" }),
                loki = new Pet({ name: "loki" }),
                jane = new Pet({ name: "jane" });

            tj.pets.push(tobi);
            tj.pets.push(loki);
            tj.pets.push(jane);

            let pending = 3;

            function cb() {
                Pet.find({}, (err) => {
                    assert.ifError(err);
                    tj.save(function (err) {
                        assert.ifError(err);
                        User.findOne({ name: 'tj' }, function (err, user) {
                            assert.ifError(err);
                            assert.equal(user.pets.length, 3);
                            assert.equal(user.pets.indexOf(tobi.id), 0);
                            assert.equal(user.pets.indexOf(loki.id), 1);
                            assert.equal(user.pets.indexOf(jane.id), 2);
                            assert.equal(user.pets.indexOf(tobi._id), 0);
                            assert.equal(user.pets.indexOf(loki._id), 1);
                            assert.equal(user.pets.indexOf(jane._id), 2);
                            db.close(done);
                        });
                    });
                });
            }

            [tobi, loki, jane].forEach((pet) => {
                pet.save(function () {
                    --pending || cb();
                });
            });
        });
    });

    describe("push()", () => {
        let db, N, S, B, M, D, ST;

        function save(doc, cb) {
            doc.save((err) => {
                if (err) {
                    cb(err);
                    return;
                }
                doc.constructor.findById(doc._id, cb);
            });
        }

        before((done) => {
            db = start();
            N = db.model("arraySet", new Schema({ arr: [Number] }));
            S = db.model("arraySetString", new Schema({ arr: [String] }));
            B = db.model("arraySetBuffer", new Schema({ arr: [Buffer] }));
            M = db.model("arraySetMixed", new Schema({ arr: [] }));
            D = db.model("arraySetSubDocs", new Schema({ arr: [{ name: String }] }));
            ST = db.model("arrayWithSetters", new Schema({
                arr: [{
                    type: String,
                    lowercase: true
                }]
            }));
            done();
        });

        after((done) => {
            db.close(done);
        });

        it("works with numbers", (done) => {
            let m = new N({ arr: [3, 4, 5, 6] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 4);
                doc.arr.push(8);
                assert.strictEqual(8, doc.arr[doc.arr.length - 1]);
                assert.strictEqual(8, doc.arr[4]);

                save(doc, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 5);
                    assert.strictEqual(3, doc.arr[0]);
                    assert.strictEqual(4, doc.arr[1]);
                    assert.strictEqual(5, doc.arr[2]);
                    assert.strictEqual(6, doc.arr[3]);
                    assert.strictEqual(8, doc.arr[4]);

                    done();
                });
            });
        });

        it("works with strings", (done) => {
            let m = new S({ arr: [3, 4, 5, 6] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 4);
                doc.arr.push(8);
                assert.strictEqual('8', doc.arr[doc.arr.length - 1]);
                assert.strictEqual('8', doc.arr[4]);

                save(doc, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 5);
                    assert.strictEqual('3', doc.arr[0]);
                    assert.strictEqual('4', doc.arr[1]);
                    assert.strictEqual('5', doc.arr[2]);
                    assert.strictEqual('6', doc.arr[3]);
                    assert.strictEqual('8', doc.arr[4]);

                    done();
                });
            });
        });

        it("works with buffers", (done) => {
            let m = new B({ arr: [[0], new Buffer(1)] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 2);
                assert.ok(doc.arr[0].isMongooseBuffer);
                assert.ok(doc.arr[1].isMongooseBuffer);
                doc.arr.push('nice');
                assert.equal(doc.arr.length, 3);
                assert.ok(doc.arr[2].isMongooseBuffer);
                assert.strictEqual('nice', doc.arr[2].toString('utf8'));

                save(doc, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 3);
                    assert.ok(doc.arr[0].isMongooseBuffer);
                    assert.ok(doc.arr[1].isMongooseBuffer);
                    assert.ok(doc.arr[2].isMongooseBuffer);
                    assert.strictEqual('\u0000', doc.arr[0].toString());
                    assert.strictEqual('nice', doc.arr[2].toString());
                    done();
                });
            });
        });

        it("works with mixed", (done) => {
            let m = new M({ arr: [3, { x: 1 }, "yes", [5]] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 4);
                doc.arr.push(null);
                assert.equal(doc.arr.length, 5);
                assert.strictEqual(null, doc.arr[4]);

                save(doc, function (err, doc) {
                    assert.ifError(err);

                    assert.equal(doc.arr.length, 5);
                    assert.strictEqual(3, doc.arr[0]);
                    assert.strictEqual(1, doc.arr[1].x);
                    assert.strictEqual('yes', doc.arr[2]);
                    assert.ok(Array.isArray(doc.arr[3]));
                    assert.strictEqual(5, doc.arr[3][0]);
                    assert.strictEqual(null, doc.arr[4]);

                    doc.arr.push(Infinity);
                    assert.equal(doc.arr.length, 6);
                    assert.strictEqual(Infinity, doc.arr[5]);

                    doc.arr.push(new Buffer(0));
                    assert.equal(doc.arr.length, 7);
                    assert.strictEqual('', doc.arr[6].toString());

                    save(doc, function (err, doc) {
                        assert.ifError(err);

                        assert.equal(doc.arr.length, 7);
                        assert.strictEqual(3, doc.arr[0]);
                        assert.strictEqual(1, doc.arr[1].x);
                        assert.strictEqual('yes', doc.arr[2]);
                        assert.ok(Array.isArray(doc.arr[3]));
                        assert.strictEqual(5, doc.arr[3][0]);
                        assert.strictEqual(null, doc.arr[4]);
                        assert.strictEqual(Infinity, doc.arr[5]);
                        assert.strictEqual('', doc.arr[6].toString());

                        done();
                    });
                });
            });
        });

        it("works with sub-docs", (done) => {
            let m = new D({ arr: [{ name: "aaron" }, { name: "moombahton " }] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 2);
                doc.arr.push({ name: 'Restrepo' });
                assert.equal(doc.arr.length, 3);
                assert.equal(doc.arr[2].name, 'Restrepo');

                save(doc, function (err, doc) {
                    assert.ifError(err);

                    // validate
                    assert.equal(doc.arr.length, 3);
                    assert.equal(doc.arr[0].name, 'aaron');
                    assert.equal(doc.arr[1].name, 'moombahton ');
                    assert.equal(doc.arr[2].name, 'Restrepo');

                    done();
                });
            });
        });

        it("applies setters (gh-3032)", (done) => {
            let m = new ST({ arr: ["ONE", "TWO"] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 2);
                doc.arr.push('THREE');
                assert.strictEqual('one', doc.arr[0]);
                assert.strictEqual('two', doc.arr[1]);
                assert.strictEqual('three', doc.arr[2]);

                save(doc, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 3);
                    assert.strictEqual('one', doc.arr[0]);
                    assert.strictEqual('two', doc.arr[1]);
                    assert.strictEqual('three', doc.arr[2]);

                    done();
                });
            });
        });
    });

    describe("splice()", () => {
        let db;

        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("works", (done) => {
            let collection = "splicetest-number" + random();
            let schema = new Schema({ numbers: [Number] }),
                A = db.model("splicetestNumber", schema, collection);

            let a = new A({ numbers: [4, 5, 6, 7] });
            a.save((err) => {
                assert.ifError(err);
                A.findById(a._id, function (err, doc) {
                    assert.ifError(err);
                    var removed = doc.numbers.splice(1, 1, '10');
                    assert.deepEqual(removed, [5]);
                    assert.equal(typeof doc.numbers[1], 'number');
                    assert.deepEqual(doc.numbers.toObject(), [4, 10, 6, 7]);
                    doc.save(function (err) {
                        assert.ifError(err);
                        A.findById(a._id, function (err, doc) {
                            assert.ifError(err);
                            assert.deepEqual(doc.numbers.toObject(), [4, 10, 6, 7]);

                            A.collection.drop(function (err) {
                                assert.ifError(err);
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("on embedded docs", (done) => {
            let collection = "splicetest-embeddeddocs" + random();
            let schema = new Schema({ types: [new Schema({ type: String })] }),
                A = db.model("splicetestEmbeddedDoc", schema, collection);

            let a = new A({ types: [{ type: "bird" }, { type: "boy" }, { type: "frog" }, { type: "cloud" }] });
            a.save((err) => {
                assert.ifError(err);
                A.findById(a._id, function (err, doc) {
                    assert.ifError(err);

                    doc.types.$pop();

                    var removed = doc.types.splice(1, 1);
                    assert.equal(removed.length, 1);
                    assert.equal(removed[0].type, 'boy');

                    var obj = doc.types.toObject();
                    assert.equal(obj[0].type, 'bird');
                    assert.equal(obj[1].type, 'frog');

                    doc.save(function (err) {
                        assert.ifError(err);
                        A.findById(a._id, function (err, doc) {
                            assert.ifError(err);

                            var obj = doc.types.toObject();
                            assert.equal(obj[0].type, 'bird');
                            assert.equal(obj[1].type, 'frog');
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("unshift()", () => {
        let db;

        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("works", (done) => {
            let schema = new Schema({
                    types: [new Schema({ type: String })],
                    nums: [Number],
                    strs: [String]
                }),
                A = db.model("unshift", schema, "unshift" + random());

            let a = new A({
                types: [{ type: "bird" }, { type: "boy" }, { type: "frog" }, { type: "cloud" }],
                nums: [1, 2, 3],
                strs: "one two three".split(" ")
            });

            a.save((err) => {
                assert.ifError(err);
                A.findById(a._id, function (err, doc) {
                    assert.ifError(err);

                    var tlen = doc.types.unshift({ type: 'tree' });
                    var nlen = doc.nums.unshift(0);
                    var slen = doc.strs.unshift('zero');

                    assert.equal(tlen, 5);
                    assert.equal(nlen, 4);
                    assert.equal(slen, 4);

                    doc.types.push({ type: 'worm' });
                    var obj = doc.types.toObject();
                    assert.equal(obj[0].type, 'tree');
                    assert.equal(obj[1].type, 'bird');
                    assert.equal(obj[2].type, 'boy');
                    assert.equal(obj[3].type, 'frog');
                    assert.equal(obj[4].type, 'cloud');
                    assert.equal(obj[5].type, 'worm');

                    obj = doc.nums.toObject();
                    assert.equal(obj[0].valueOf(), 0);
                    assert.equal(obj[1].valueOf(), 1);
                    assert.equal(obj[2].valueOf(), 2);
                    assert.equal(obj[3].valueOf(), 3);

                    obj = doc.strs.toObject();
                    assert.equal(obj[0], 'zero');
                    assert.equal(obj[1], 'one');
                    assert.equal(obj[2], 'two');
                    assert.equal(obj[3], 'three');

                    doc.save(function (err) {
                        assert.ifError(err);
                        A.findById(a._id, function (err, doc) {
                            assert.ifError(err);

                            var obj = doc.types.toObject();
                            assert.equal(obj[0].type, 'tree');
                            assert.equal(obj[1].type, 'bird');
                            assert.equal(obj[2].type, 'boy');
                            assert.equal(obj[3].type, 'frog');
                            assert.equal(obj[4].type, 'cloud');
                            assert.equal(obj[5].type, 'worm');

                            obj = doc.nums.toObject();
                            assert.equal(obj[0].valueOf(), 0);
                            assert.equal(obj[1].valueOf(), 1);
                            assert.equal(obj[2].valueOf(), 2);
                            assert.equal(obj[3].valueOf(), 3);

                            obj = doc.strs.toObject();
                            assert.equal(obj[0], 'zero');
                            assert.equal(obj[1], 'one');
                            assert.equal(obj[2], 'two');
                            assert.equal(obj[3], 'three');
                            done();
                        });
                    });
                });
            });
        });

        it("applies setters (gh-3032)", (done) => {
            let ST = db.model("setterArray", new Schema({
                arr: [{
                    type: String,
                    lowercase: true
                }]
            }));
            let m = new ST({ arr: ["ONE", "TWO"] });
            m.save((err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 2);
                doc.arr.unshift('THREE');
                assert.strictEqual('three', doc.arr[0]);
                assert.strictEqual('one', doc.arr[1]);
                assert.strictEqual('two', doc.arr[2]);

                doc.save(function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 3);
                    assert.strictEqual('three', doc.arr[0]);
                    assert.strictEqual('one', doc.arr[1]);
                    assert.strictEqual('two', doc.arr[2]);

                    done();
                });
            });
        });
    });

    describe("shift()", () => {
        let db;
        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("works", (done) => {
            let schema = new Schema({
                types: [new Schema({ type: String })],
                nums: [Number],
                strs: [String]
            });

            let A = db.model("shift", schema, "unshift" + random());

            let a = new A({
                types: [{ type: "bird" }, { type: "boy" }, { type: "frog" }, { type: "cloud" }],
                nums: [1, 2, 3],
                strs: "one two three".split(" ")
            });

            a.save((err) => {
                assert.ifError(err);
                A.findById(a._id, function (err, doc) {
                    assert.ifError(err);

                    var t = doc.types.shift();
                    var n = doc.nums.shift();
                    var s = doc.strs.shift();

                    assert.equal(t.type, 'bird');
                    assert.equal(n, 1);
                    assert.equal(s, 'one');

                    var obj = doc.types.toObject();
                    assert.equal(obj[0].type, 'boy');
                    assert.equal(obj[1].type, 'frog');
                    assert.equal(obj[2].type, 'cloud');

                    doc.nums.push(4);
                    obj = doc.nums.toObject();
                    assert.equal(obj[0].valueOf(), 2);
                    assert.equal(obj[1].valueOf(), 3);
                    assert.equal(obj[2].valueOf(), 4);

                    obj = doc.strs.toObject();
                    assert.equal(obj[0], 'two');
                    assert.equal(obj[1], 'three');

                    doc.save(function (err) {
                        assert.ifError(err);
                        A.findById(a._id, function (err, doc) {
                            db.close();
                            assert.ifError(err);

                            var obj = doc.types.toObject();
                            assert.equal(obj[0].type, 'boy');
                            assert.equal(obj[1].type, 'frog');
                            assert.equal(obj[2].type, 'cloud');

                            obj = doc.nums.toObject();
                            assert.equal(obj[0].valueOf(), 2);
                            assert.equal(obj[1].valueOf(), 3);
                            assert.equal(obj[2].valueOf(), 4);

                            obj = doc.strs.toObject();
                            assert.equal(obj[0], 'two');
                            assert.equal(obj[1], 'three');
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("$shift", () => {
        it("works", (done) => {
            // atomic shift uses $pop -1
            let db = start();
            let painting = new Schema({ colors: [] });
            let Painting = db.model("Painting", painting);
            let p = new Painting({ colors: ["blue", "green", "yellow"] });
            p.save((err) => {
                assert.ifError(err);

                Painting.findById(p, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.colors.length, 3);
                    var color = doc.colors.$shift();
                    assert.equal(doc.colors.length, 2);
                    assert.equal(color, 'blue');
                    // MongoDB pop command can only be called once per save, each
                    // time only removing one element.
                    color = doc.colors.$shift();
                    assert.equal(color, undefined);
                    assert.equal(doc.colors.length, 2);
                    doc.save(function (err) {
                        assert.equal(err, null);
                        var color = doc.colors.$shift();
                        assert.equal(doc.colors.length, 1);
                        assert.equal(color, 'green');
                        doc.save(function (err) {
                            assert.equal(err, null);
                            Painting.findById(doc, function (err, doc) {
                                db.close();
                                assert.ifError(err);
                                assert.equal(doc.colors.length, 1);
                                assert.equal(doc.colors[0], 'yellow');
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe("pop()", () => {
        it("works", (done) => {
            let db = start(),
                schema = new Schema({
                    types: [new Schema({ type: String })],
                    nums: [Number],
                    strs: [String]
                });

            let A = db.model("pop", schema, "pop" + random());

            let a = new A({
                types: [{ type: "bird" }, { type: "boy" }, { type: "frog" }, { type: "cloud" }],
                nums: [1, 2, 3],
                strs: "one two three".split(" ")
            });

            a.save((err) => {
                assert.ifError(err);
                A.findById(a._id, function (err, doc) {
                    assert.ifError(err);

                    var t = doc.types.pop();
                    var n = doc.nums.pop();
                    var s = doc.strs.pop();

                    assert.equal(t.type, 'cloud');
                    assert.equal(n, 3);
                    assert.equal(s, 'three');

                    var obj = doc.types.toObject();
                    assert.equal(obj[0].type, 'bird');
                    assert.equal(obj[1].type, 'boy');
                    assert.equal(obj[2].type, 'frog');

                    doc.nums.push(4);
                    obj = doc.nums.toObject();
                    assert.equal(obj[0].valueOf(), 1);
                    assert.equal(obj[1].valueOf(), 2);
                    assert.equal(obj[2].valueOf(), 4);

                    obj = doc.strs.toObject();
                    assert.equal(obj[0], 'one');
                    assert.equal(obj[1], 'two');

                    doc.save(function (err) {
                        assert.ifError(err);
                        A.findById(a._id, function (err, doc) {
                            db.close();
                            assert.ifError(err);

                            var obj = doc.types.toObject();
                            assert.equal(obj[0].type, 'bird');
                            assert.equal(obj[1].type, 'boy');
                            assert.equal(obj[2].type, 'frog');

                            obj = doc.nums.toObject();
                            assert.equal(obj[0].valueOf(), 1);
                            assert.equal(obj[1].valueOf(), 2);
                            assert.equal(obj[2].valueOf(), 4);

                            obj = doc.strs.toObject();
                            assert.equal(obj[0], 'one');
                            assert.equal(obj[1], 'two');
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("pull()", () => {
        it("works", (done) => {
            let db = start();
            let catschema = new Schema({ name: String });
            let Cat = db.model("Cat", catschema);
            let schema = new Schema({
                a: [{ type: Schema.ObjectId, ref: "Cat" }]
            });
            let A = db.model("TestPull", schema);
            let cat = new Cat({ name: "peanut" });
            cat.save((err) => {
                assert.ifError(err);

                var a = new A({ a: [cat._id] });
                a.save(function (err) {
                    assert.ifError(err);

                    A.findById(a, function (err, doc) {
                        db.close();
                        assert.ifError(err);
                        assert.equal(doc.a.length, 1);
                        doc.a.pull(cat.id);
                        assert.equal(doc.a.length, 0);
                        done();
                    });
                });
            });
        });

        it("handles pulling with no _id (gh-3341)", (done) => {
            let db = start();
            let personSchema = new Schema({
                name: String,
                role: String
            }, { _id: false });
            let bandSchema = new Schema({
                name: String,
                members: [personSchema]
            });

            let Band = db.model("gh3341", bandSchema, "gh3341");

            let gnr = new Band({
                name: "Guns N' Roses",
                members: [
                    { name: "Axl", role: "Lead Singer" },
                    { name: "Slash", role: "Guitar" },
                    { name: "Izzy", role: "Guitar" },
                    { name: "Duff", role: "Bass" },
                    { name: "Adler", role: "Drums" }
                ]
            });

            gnr.save((error) => {
                assert.ifError(error);
                gnr.members.pull({ name: 'Slash', role: 'Guitar' });
                gnr.save(function (error) {
                    assert.ifError(error);
                    assert.equal(gnr.members.length, 4);
                    assert.equal(gnr.members[0].name, 'Axl');
                    assert.equal(gnr.members[1].name, 'Izzy');
                    assert.equal(gnr.members[2].name, 'Duff');
                    assert.equal(gnr.members[3].name, 'Adler');
                    Band.findById(gnr._id, function (error, gnr) {
                        assert.ifError(error);
                        assert.equal(gnr.members.length, 4);
                        assert.equal(gnr.members[0].name, 'Axl');
                        assert.equal(gnr.members[1].name, 'Izzy');
                        assert.equal(gnr.members[2].name, 'Duff');
                        assert.equal(gnr.members[3].name, 'Adler');
                        db.close(done);
                    });
                });
            });
        });

        it("properly works with undefined", (done) => {
            let db = start();
            let catschema = new Schema({ name: String, colors: [{ hex: String }] });
            let Cat = db.model("Cat", catschema);

            let cat = new Cat({
                name: "peanut", colors: [
                    { hex: "#FFF" }, { hex: "#000" }, null
                ]
            });

            cat.save((err) => {
                assert.ifError(err);

                cat.colors.pull(undefined); // converted to null (as mongodb does)
                assert.equal(cat.colors.length, 2);
                assert.equal(cat.colors[0].hex, '#FFF');
                assert.equal(cat.colors[1].hex, '#000');

                cat.save(function (err) {
                    assert.ifError(err);

                    Cat.findById(cat._id, function (err, doc) {
                        assert.ifError(err);
                        assert.equal(doc.colors.length, 2);
                        assert.equal(doc.colors[0].hex, '#FFF');
                        assert.equal(doc.colors[1].hex, '#000');
                        db.close(done);
                    });
                });
            });
        });
    });

    describe("$pop()", () => {
        it("works", (done) => {
            let db = start();
            let painting = new Schema({ colors: [] });
            let Painting = db.model("Painting", painting);
            let p = new Painting({ colors: ["blue", "green", "yellow"] });
            p.save((err) => {
                assert.ifError(err);

                Painting.findById(p, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.colors.length, 3);
                    var color = doc.colors.$pop();
                    assert.equal(doc.colors.length, 2);
                    assert.equal(color, 'yellow');
                    // MongoDB pop command can only be called once per save, each
                    // time only removing one element.
                    color = doc.colors.$pop();
                    assert.equal(color, undefined);
                    assert.equal(doc.colors.length, 2);
                    assert.ok(!('$set' in doc.colors._atomics), 'invalid $atomic op used');
                    doc.save(function (err) {
                        assert.equal(err, null);
                        var color = doc.colors.$pop();
                        assert.equal(doc.colors.length, 1);
                        assert.equal(color, 'green');
                        doc.save(function (err) {
                            assert.equal(err, null);
                            Painting.findById(doc, function (err, doc) {
                                db.close();
                                assert.strictEqual(null, err);
                                assert.equal(doc.colors.length, 1);
                                assert.equal(doc.colors[0], 'blue');
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe("addToSet()", () => {
        it("works", (done) => {
            let db = start(),
                e = new Schema({ name: String, arr: [] }),
                schema = new Schema({
                    num: [Number],
                    str: [String],
                    doc: [e],
                    date: [Date],
                    id: [Schema.ObjectId]
                });

            let M = db.model("testAddToSet", schema);
            let m = new M();

            m.num.push(1, 2, 3);
            m.str.push("one", "two", "tres");
            m.doc.push({ name: "Dubstep", arr: [1] }, { name: "Polka", arr: [{ x: 3 }] });

            let d1 = new Date();
            let d2 = new Date(Number(d1) + 60000);
            let d3 = new Date(Number(d1) + 30000);
            let d4 = new Date(Number(d1) + 20000);
            let d5 = new Date(Number(d1) + 90000);
            let d6 = new Date(Number(d1) + 10000);
            m.date.push(d1, d2);

            let id1 = new mongoose.Types.ObjectId();
            let id2 = new mongoose.Types.ObjectId();
            let id3 = new mongoose.Types.ObjectId();
            let id4 = new mongoose.Types.ObjectId();
            let id5 = new mongoose.Types.ObjectId();
            let id6 = new mongoose.Types.ObjectId();

            m.id.push(id1, id2);

            m.num.addToSet(3, 4, 5);
            assert.equal(m.num.length, 5);
            m.str.addToSet("four", "five", "two");
            assert.equal(m.str.length, 5);
            m.id.addToSet(id2, id3);
            assert.equal(m.id.length, 3);
            m.doc.addToSet(m.doc[0]);
            assert.equal(m.doc.length, 2);
            m.doc.addToSet({ name: "Waltz", arr: [1] }, m.doc[0]);
            assert.equal(m.doc.length, 3);
            assert.equal(m.date.length, 2);
            m.date.addToSet(d1);
            assert.equal(m.date.length, 2);
            m.date.addToSet(d3);
            assert.equal(m.date.length, 3);

            m.save((err) => {
                assert.ifError(err);
                M.findById(m, function (err, m) {
                    assert.ifError(err);

                    assert.equal(m.num.length, 5);
                    assert.ok(~m.num.indexOf(1));
                    assert.ok(~m.num.indexOf(2));
                    assert.ok(~m.num.indexOf(3));
                    assert.ok(~m.num.indexOf(4));
                    assert.ok(~m.num.indexOf(5));

                    assert.equal(m.str.length, 5);
                    assert.ok(~m.str.indexOf('one'));
                    assert.ok(~m.str.indexOf('two'));
                    assert.ok(~m.str.indexOf('tres'));
                    assert.ok(~m.str.indexOf('four'));
                    assert.ok(~m.str.indexOf('five'));

                    assert.equal(m.id.length, 3);
                    assert.ok(~m.id.indexOf(id1));
                    assert.ok(~m.id.indexOf(id2));
                    assert.ok(~m.id.indexOf(id3));

                    assert.equal(m.date.length, 3);
                    assert.ok(~m.date.indexOf(d1.toString()));
                    assert.ok(~m.date.indexOf(d2.toString()));
                    assert.ok(~m.date.indexOf(d3.toString()));

                    assert.equal(m.doc.length, 3);
                    assert.ok(m.doc.some(function (v) {
                        return v.name === 'Waltz';
                    }));
                    assert.ok(m.doc.some(function (v) {
                        return v.name === 'Dubstep';
                    }));
                    assert.ok(m.doc.some(function (v) {
                        return v.name === 'Polka';
                    }));

                    // test single $addToSet
                    m.num.addToSet(3, 4, 5, 6);
                    assert.equal(m.num.length, 6);
                    m.str.addToSet('four', 'five', 'two', 'six');
                    assert.equal(m.str.length, 6);
                    m.id.addToSet(id2, id3, id4);
                    assert.equal(m.id.length, 4);

                    m.date.addToSet(d1, d3, d4);
                    assert.equal(m.date.length, 4);

                    m.doc.addToSet(m.doc[0], { name: '8bit' });
                    assert.equal(m.doc.length, 4);

                    m.save(function (err) {
                        assert.ifError(err);

                        M.findById(m, function (err, m) {
                            assert.ifError(err);

                            assert.equal(m.num.length, 6);
                            assert.ok(~m.num.indexOf(1));
                            assert.ok(~m.num.indexOf(2));
                            assert.ok(~m.num.indexOf(3));
                            assert.ok(~m.num.indexOf(4));
                            assert.ok(~m.num.indexOf(5));
                            assert.ok(~m.num.indexOf(6));

                            assert.equal(m.str.length, 6);
                            assert.ok(~m.str.indexOf('one'));
                            assert.ok(~m.str.indexOf('two'));
                            assert.ok(~m.str.indexOf('tres'));
                            assert.ok(~m.str.indexOf('four'));
                            assert.ok(~m.str.indexOf('five'));
                            assert.ok(~m.str.indexOf('six'));

                            assert.equal(m.id.length, 4);
                            assert.ok(~m.id.indexOf(id1));
                            assert.ok(~m.id.indexOf(id2));
                            assert.ok(~m.id.indexOf(id3));
                            assert.ok(~m.id.indexOf(id4));

                            assert.equal(m.date.length, 4);
                            assert.ok(~m.date.indexOf(d1.toString()));
                            assert.ok(~m.date.indexOf(d2.toString()));
                            assert.ok(~m.date.indexOf(d3.toString()));
                            assert.ok(~m.date.indexOf(d4.toString()));

                            assert.equal(m.doc.length, 4);
                            assert.ok(m.doc.some(function (v) {
                                return v.name === 'Waltz';
                            }));
                            assert.ok(m.doc.some(function (v) {
                                return v.name === 'Dubstep';
                            }));
                            assert.ok(m.doc.some(function (v) {
                                return v.name === 'Polka';
                            }));
                            assert.ok(m.doc.some(function (v) {
                                return v.name === '8bit';
                            }));

                            // test multiple $addToSet
                            m.num.addToSet(7, 8);
                            assert.equal(m.num.length, 8);
                            m.str.addToSet('seven', 'eight');
                            assert.equal(m.str.length, 8);
                            m.id.addToSet(id5, id6);
                            assert.equal(m.id.length, 6);

                            m.date.addToSet(d5, d6);
                            assert.equal(m.date.length, 6);

                            m.doc.addToSet(m.doc[1], { name: 'BigBeat' }, { name: 'Funk' });
                            assert.equal(m.doc.length, 6);

                            m.save(function (err) {
                                assert.ifError(err);

                                M.findById(m, function (err, m) {
                                    db.close();
                                    assert.ifError(err);

                                    assert.equal(m.num.length, 8);
                                    assert.ok(~m.num.indexOf(1));
                                    assert.ok(~m.num.indexOf(2));
                                    assert.ok(~m.num.indexOf(3));
                                    assert.ok(~m.num.indexOf(4));
                                    assert.ok(~m.num.indexOf(5));
                                    assert.ok(~m.num.indexOf(6));
                                    assert.ok(~m.num.indexOf(7));
                                    assert.ok(~m.num.indexOf(8));

                                    assert.equal(m.str.length, 8);
                                    assert.ok(~m.str.indexOf('one'));
                                    assert.ok(~m.str.indexOf('two'));
                                    assert.ok(~m.str.indexOf('tres'));
                                    assert.ok(~m.str.indexOf('four'));
                                    assert.ok(~m.str.indexOf('five'));
                                    assert.ok(~m.str.indexOf('six'));
                                    assert.ok(~m.str.indexOf('seven'));
                                    assert.ok(~m.str.indexOf('eight'));

                                    assert.equal(m.id.length, 6);
                                    assert.ok(~m.id.indexOf(id1));
                                    assert.ok(~m.id.indexOf(id2));
                                    assert.ok(~m.id.indexOf(id3));
                                    assert.ok(~m.id.indexOf(id4));
                                    assert.ok(~m.id.indexOf(id5));
                                    assert.ok(~m.id.indexOf(id6));

                                    assert.equal(m.date.length, 6);
                                    assert.ok(~m.date.indexOf(d1.toString()));
                                    assert.ok(~m.date.indexOf(d2.toString()));
                                    assert.ok(~m.date.indexOf(d3.toString()));
                                    assert.ok(~m.date.indexOf(d4.toString()));
                                    assert.ok(~m.date.indexOf(d5.toString()));
                                    assert.ok(~m.date.indexOf(d6.toString()));

                                    assert.equal(m.doc.length, 6);
                                    assert.ok(m.doc.some(function (v) {
                                        return v.name === 'Waltz';
                                    }));
                                    assert.ok(m.doc.some(function (v) {
                                        return v.name === 'Dubstep';
                                    }));
                                    assert.ok(m.doc.some(function (v) {
                                        return v.name === 'Polka';
                                    }));
                                    assert.ok(m.doc.some(function (v) {
                                        return v.name === '8bit';
                                    }));
                                    assert.ok(m.doc.some(function (v) {
                                        return v.name === 'BigBeat';
                                    }));
                                    assert.ok(m.doc.some(function (v) {
                                        return v.name === 'Funk';
                                    }));
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("handles sub-documents that do not have an _id gh-1973", (done) => {
            let db = start(),
                e = new Schema({ name: String, arr: [] }, { _id: false }),
                schema = new Schema({
                    doc: [e]
                });

            let M = db.model("gh1973", schema);
            let m = new M();

            m.doc.addToSet({ name: "Rap" });
            m.save((error, m) => {
                assert.ifError(error);
                assert.equal(m.doc.length, 1);
                assert.equal(m.doc[0].name, 'Rap');
                m.doc.addToSet({ name: 'House' });
                assert.equal(m.doc.length, 2);
                m.save(function (error, m) {
                    assert.ifError(error);
                    assert.equal(m.doc.length, 2);
                    assert.ok(m.doc.some(function (v) {
                        return v.name === 'Rap';
                    }));
                    assert.ok(m.doc.some(function (v) {
                        return v.name === 'House';
                    }));
                    db.close(done);
                });
            });
        });

        it("applies setters (gh-3032)", (done) => {
            let db = start();
            let ST = db.model("setterArray", new Schema({
                arr: [{
                    type: String,
                    lowercase: true
                }]
            }));
            let m = new ST({ arr: ["ONE", "TWO"] });
            m.save((err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 2);
                doc.arr.addToSet('THREE');
                assert.strictEqual('one', doc.arr[0]);
                assert.strictEqual('two', doc.arr[1]);
                assert.strictEqual('three', doc.arr[2]);

                doc.save(function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 3);
                    assert.strictEqual('one', doc.arr[0]);
                    assert.strictEqual('two', doc.arr[1]);
                    assert.strictEqual('three', doc.arr[2]);

                    db.close(done);
                });
            });
        });
    });

    describe("nonAtomicPush()", () => {
        it("works", (done) => {
            let db = start();
            let U = db.model("User");
            let ID = mongoose.Types.ObjectId;

            let u = new U({ name: "banana", pets: [new ID()] });
            assert.equal(u.pets.length, 1);
            u.pets.nonAtomicPush(new ID());
            assert.equal(u.pets.length, 2);
            u.save((err) => {
                assert.ifError(err);
                U.findById(u._id, function (err) {
                    assert.ifError(err);
                    assert.equal(u.pets.length, 2);
                    var id0 = u.pets[0];
                    var id1 = u.pets[1];
                    var id2 = new ID;
                    u.pets.pull(id0);
                    u.pets.nonAtomicPush(id2);
                    assert.equal(u.pets.length, 2);
                    assert.equal(u.pets[0].toString(), id1.toString());
                    assert.equal(u.pets[1].toString(), id2.toString());
                    u.save(function (err) {
                        assert.ifError(err);
                        U.findById(u._id, function (err) {
                            db.close();
                            assert.ifError(err);
                            assert.equal(u.pets.length, 2);
                            assert.equal(u.pets[0].toString(), id1.toString());
                            assert.equal(u.pets[1].toString(), id2.toString());
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("sort()", () => {
        it("order should be saved", (done) => {
            let db = start();
            let M = db.model("ArraySortOrder", new Schema({ x: [Number] }));
            let m = new M({ x: [1, 4, 3, 2] });
            m.save((err) => {
                assert.ifError(err);
                M.findById(m, function (err, m) {
                    assert.ifError(err);

                    assert.equal(m.x[0], 1);
                    assert.equal(m.x[1], 4);
                    assert.equal(m.x[2], 3);
                    assert.equal(m.x[3], 2);

                    m.x.sort();

                    m.save(function (err) {
                        assert.ifError(err);
                        M.findById(m, function (err, m) {
                            assert.ifError(err);

                            assert.equal(m.x[0], 1);
                            assert.equal(m.x[1], 2);
                            assert.equal(m.x[2], 3);
                            assert.equal(m.x[3], 4);

                            m.x.sort(function (a, b) {
                                return b - a;
                            });

                            m.save(function (err) {
                                assert.ifError(err);
                                M.findById(m, function (err, m) {
                                    assert.ifError(err);

                                    assert.equal(m.x[0], 4);
                                    assert.equal(m.x[1], 3);
                                    assert.equal(m.x[2], 2);
                                    assert.equal(m.x[3], 1);
                                    db.close(done);
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("set()", () => {
        let db, N, S, B, M, D, ST;

        function save(doc, cb) {
            doc.save((err) => {
                if (err) {
                    cb(err);
                    return;
                }
                doc.constructor.findById(doc._id, cb);
            });
        }

        before((done) => {
            db = start();
            N = db.model("arraySet", new Schema({ arr: [Number] }));
            S = db.model("arraySetString", new Schema({ arr: [String] }));
            B = db.model("arraySetBuffer", new Schema({ arr: [Buffer] }));
            M = db.model("arraySetMixed", new Schema({ arr: [] }));
            D = db.model("arraySetSubDocs", new Schema({ arr: [{ name: String }] }));
            ST = db.model("arrayWithSetters", new Schema({
                arr: [{
                    type: String,
                    lowercase: true
                }]
            }));
            done();
        });

        after((done) => {
            db.close(done);
        });

        it("works combined with other ops", (done) => {
            let m = new N({ arr: [3, 4, 5, 6] });
            save(m, (err, doc) => {
                assert.ifError(err);

                assert.equal(doc.arr.length, 4);
                doc.arr.push(20);
                doc.arr.set(2, 10);
                assert.equal(doc.arr.length, 5);
                assert.equal(doc.arr[2], 10);
                assert.equal(doc.arr[4], 20);

                save(doc, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 5);
                    assert.equal(doc.arr[0], 3);
                    assert.equal(doc.arr[1], 4);
                    assert.equal(doc.arr[2], 10);
                    assert.equal(doc.arr[3], 6);
                    assert.equal(doc.arr[4], 20);

                    doc.arr.$pop();
                    assert.equal(doc.arr.length, 4);
                    doc.arr.set(4, 99);
                    assert.equal(doc.arr.length, 5);
                    assert.equal(doc.arr[4], 99);
                    doc.arr.remove(10);
                    assert.equal(doc.arr.length, 4);
                    assert.equal(doc.arr[0], 3);
                    assert.equal(doc.arr[1], 4);
                    assert.equal(doc.arr[2], 6);
                    assert.equal(doc.arr[3], 99);

                    save(doc, function (err, doc) {
                        assert.ifError(err);
                        assert.equal(doc.arr.length, 4);
                        assert.equal(doc.arr[0], 3);
                        assert.equal(doc.arr[1], 4);
                        assert.equal(doc.arr[2], 6);
                        assert.equal(doc.arr[3], 99);
                        done();
                    });
                });
            });

            // after this works go back to finishing doc.populate() branch
        });

        it("works with numbers", (done) => {
            let m = new N({ arr: [3, 4, 5, 6] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 4);
                doc.arr.set(2, 10);
                assert.equal(doc.arr.length, 4);
                assert.equal(doc.arr[2], 10);
                doc.arr.set(doc.arr.length, 11);
                assert.equal(doc.arr.length, 5);
                assert.equal(doc.arr[4], 11);

                save(doc, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 5);
                    assert.equal(doc.arr[0], 3);
                    assert.equal(doc.arr[1], 4);
                    assert.equal(doc.arr[2], 10);
                    assert.equal(doc.arr[3], 6);
                    assert.equal(doc.arr[4], 11);

                    // casting + setting beyond current array length
                    doc.arr.set(8, '1');
                    assert.equal(doc.arr.length, 9);
                    assert.strictEqual(1, doc.arr[8]);
                    assert.equal(doc.arr[7], undefined);

                    save(doc, function (err, doc) {
                        assert.ifError(err);

                        assert.equal(doc.arr.length, 9);
                        assert.equal(doc.arr[0], 3);
                        assert.equal(doc.arr[1], 4);
                        assert.equal(doc.arr[2], 10);
                        assert.equal(doc.arr[3], 6);
                        assert.equal(doc.arr[4], 11);
                        assert.equal(doc.arr[5], null);
                        assert.equal(doc.arr[6], null);
                        assert.equal(doc.arr[7], null);
                        assert.strictEqual(1, doc.arr[8]);
                        done();
                    });
                });
            });
        });

        it("works with strings", (done) => {
            let m = new S({ arr: [3, 4, 5, 6] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, '4');
                doc.arr.set(2, 10);
                assert.equal(doc.arr.length, 4);
                assert.equal(doc.arr[2], '10');
                doc.arr.set(doc.arr.length, '11');
                assert.equal(doc.arr.length, 5);
                assert.equal(doc.arr[4], '11');

                save(doc, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 5);
                    assert.equal(doc.arr[0], '3');
                    assert.equal(doc.arr[1], '4');
                    assert.equal(doc.arr[2], '10');
                    assert.equal(doc.arr[3], '6');
                    assert.equal(doc.arr[4], '11');

                    // casting + setting beyond current array length
                    doc.arr.set(8, 'yo');
                    assert.equal(doc.arr.length, 9);
                    assert.strictEqual('yo', doc.arr[8]);
                    assert.equal(doc.arr[7], undefined);

                    save(doc, function (err, doc) {
                        assert.ifError(err);

                        assert.equal(doc.arr.length, '9');
                        assert.equal(doc.arr[0], '3');
                        assert.equal(doc.arr[1], '4');
                        assert.equal(doc.arr[2], '10');
                        assert.equal(doc.arr[3], '6');
                        assert.equal(doc.arr[4], '11');
                        assert.equal(doc.arr[5], null);
                        assert.equal(doc.arr[6], null);
                        assert.equal(doc.arr[7], null);
                        assert.strictEqual('yo', doc.arr[8]);
                        done();
                    });
                });
            });
        });

        it("works with buffers", (done) => {
            let m = new B({ arr: [[0], new Buffer(1)] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 2);
                assert.ok(doc.arr[0].isMongooseBuffer);
                assert.ok(doc.arr[1].isMongooseBuffer);
                doc.arr.set(1, 'nice');
                assert.equal(doc.arr.length, 2);
                assert.ok(doc.arr[1].isMongooseBuffer);
                assert.equal(doc.arr[1].toString('utf8'), 'nice');
                doc.arr.set(doc.arr.length, [11]);
                assert.equal(doc.arr.length, 3);
                assert.equal(doc.arr[2][0], 11);

                save(doc, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 3);
                    assert.ok(doc.arr[0].isMongooseBuffer);
                    assert.ok(doc.arr[1].isMongooseBuffer);
                    assert.ok(doc.arr[2].isMongooseBuffer);
                    assert.equal(doc.arr[0].toString(), '\u0000');
                    assert.equal(doc.arr[1].toString(), 'nice');
                    assert.equal(doc.arr[2][0], 11);
                    done();
                });
            });
        });

        it("works with mixed", (done) => {
            let m = new M({ arr: [3, { x: 1 }, "yes", [5]] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 4);
                doc.arr.set(2, null);
                assert.equal(doc.arr.length, 4);
                assert.equal(doc.arr[2], null);
                doc.arr.set(doc.arr.length, 'last');
                assert.equal(doc.arr.length, 5);
                assert.equal(doc.arr[4], 'last');

                save(doc, function (err, doc) {
                    assert.ifError(err);

                    assert.equal(doc.arr.length, 5);
                    assert.equal(doc.arr[0], 3);
                    assert.strictEqual(1, doc.arr[1].x);
                    assert.equal(doc.arr[2], null);
                    assert.ok(Array.isArray(doc.arr[3]));
                    assert.equal(doc.arr[3][0], 5);
                    assert.equal(doc.arr[4], 'last');

                    doc.arr.set(8, Infinity);
                    assert.equal(doc.arr.length, 9);
                    assert.strictEqual(Infinity, doc.arr[8]);
                    assert.equal(doc.arr[7], undefined);

                    doc.arr.push(new Buffer(0));
                    assert.equal(doc.arr[9].toString(), '');
                    assert.equal(doc.arr.length, 10);

                    save(doc, function (err, doc) {
                        assert.ifError(err);

                        assert.equal(doc.arr.length, 10);
                        assert.equal(doc.arr[0], 3);
                        assert.strictEqual(1, doc.arr[1].x);
                        assert.equal(doc.arr[2], null);
                        assert.ok(Array.isArray(doc.arr[3]));
                        assert.equal(doc.arr[3][0], 5);
                        assert.equal(doc.arr[4], 'last');
                        assert.strictEqual(null, doc.arr[5]);
                        assert.strictEqual(null, doc.arr[6]);
                        assert.strictEqual(null, doc.arr[7]);
                        assert.strictEqual(Infinity, doc.arr[8]);
                        // arr[9] is actually a mongodb Binary since mixed won't cast to buffer
                        assert.equal(doc.arr[9].toString(), '');

                        done();
                    });
                });
            });
        });

        it("works with sub-docs", (done) => {
            let m = new D({ arr: [{ name: "aaron" }, { name: "moombahton " }] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 2);
                doc.arr.set(0, { name: 'vdrums' });
                assert.equal(doc.arr.length, 2);
                assert.equal(doc.arr[0].name, 'vdrums');
                doc.arr.set(doc.arr.length, { name: 'Restrepo' });
                assert.equal(doc.arr.length, 3);
                assert.equal(doc.arr[2].name, 'Restrepo');

                save(doc, function (err, doc) {
                    assert.ifError(err);

                    // validate
                    assert.equal(doc.arr.length, 3);
                    assert.equal(doc.arr[0].name, 'vdrums');
                    assert.equal(doc.arr[1].name, 'moombahton ');
                    assert.equal(doc.arr[2].name, 'Restrepo');

                    doc.arr.set(10, { name: 'temple of doom' });
                    assert.equal(doc.arr.length, 11);
                    assert.equal(doc.arr[10].name, 'temple of doom');
                    assert.equal(doc.arr[9], null);

                    save(doc, function (err, doc) {
                        assert.ifError(err);

                        // validate
                        assert.equal(doc.arr.length, 11);
                        assert.equal(doc.arr[0].name, 'vdrums');
                        assert.equal(doc.arr[1].name, 'moombahton ');
                        assert.equal(doc.arr[2].name, 'Restrepo');
                        assert.equal(doc.arr[3], null);
                        assert.equal(doc.arr[9], null);
                        assert.equal(doc.arr[10].name, 'temple of doom');

                        doc.arr.remove(doc.arr[0]);
                        doc.arr.set(7, { name: 7 });
                        assert.strictEqual('7', doc.arr[7].name);
                        assert.equal(doc.arr.length, 10);

                        save(doc, function (err, doc) {
                            assert.ifError(err);

                            assert.equal(doc.arr.length, 10);
                            assert.equal(doc.arr[0].name, 'moombahton ');
                            assert.equal(doc.arr[1].name, 'Restrepo');
                            assert.equal(doc.arr[2], null);
                            assert.ok(doc.arr[7]);
                            assert.strictEqual('7', doc.arr[7].name);
                            assert.equal(doc.arr[8], null);
                            assert.equal(doc.arr[9].name, 'temple of doom');

                            done();
                        });
                    });
                });
            });
        });

        it("applies setters (gh-3032)", (done) => {
            let m = new ST({ arr: ["ONE", "TWO"] });
            save(m, (err, doc) => {
                assert.ifError(err);
                assert.equal(doc.arr.length, 2);
                doc.arr.set(0, 'THREE');
                assert.strictEqual('three', doc.arr[0]);
                assert.strictEqual('two', doc.arr[1]);
                doc.arr.set(doc.arr.length, 'FOUR');
                assert.strictEqual('three', doc.arr[0]);
                assert.strictEqual('two', doc.arr[1]);
                assert.strictEqual('four', doc.arr[2]);

                save(doc, function (err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.arr.length, 3);
                    assert.strictEqual('three', doc.arr[0]);
                    assert.strictEqual('two', doc.arr[1]);
                    assert.strictEqual('four', doc.arr[2]);

                    done();
                });
            });
        });
    });

    describe("setting a doc array", () => {
        it("should adjust path positions", (done) => {
            let db = start();

            let D = db.model("subDocPositions", new Schema({
                em1: [new Schema({ name: String })]
            }));

            let d = new D({
                em1: [
                    { name: "pos0" },
                    { name: "pos1" },
                    { name: "pos2" }
                ]
            });

            d.save((err) => {
                assert.ifError(err);
                D.findById(d, function (err, d) {
                    assert.ifError(err);

                    var n = d.em1.slice();
                    n[2].name = 'position two';
                    var x = [];
                    x[1] = n[2];
                    x[2] = n[1];
                    x = x.filter(Boolean);
                    d.em1 = x;

                    d.save(function (err) {
                        assert.ifError(err);
                        D.findById(d, function (err, d) {
                            db.close();
                            assert.ifError(err);
                            assert.equal(d.em1[0].name, 'position two');
                            assert.equal(d.em1[1].name, 'pos1');
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("paths with similar names", () => {
        it("should be saved", (done) => {
            let db = start();

            let D = db.model("similarPathNames", new Schema({
                account: {
                    role: String,
                    roles: [String]
                },
                em: [new Schema({ name: String })]
            }));

            let d = new D({
                account: { role: "teacher", roles: ["teacher", "admin"] },
                em: [{ name: "bob" }]
            });

            d.save((err) => {
                assert.ifError(err);
                D.findById(d, function (err, d) {
                    assert.ifError(err);

                    d.account.role = 'president';
                    d.account.roles = ['president', 'janitor'];
                    d.em[0].name = 'memorable';
                    d.em = [{ name: 'frida' }];

                    d.save(function (err) {
                        assert.ifError(err);
                        D.findById(d, function (err, d) {
                            db.close();
                            assert.ifError(err);
                            assert.equal(d.account.role, 'president');
                            assert.equal(d.account.roles.length, 2);
                            assert.equal(d.account.roles[0], 'president');
                            assert.equal(d.account.roles[1], 'janitor');
                            assert.equal(d.em.length, 1);
                            assert.equal(d.em[0].name, 'frida');
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("of number", () => {
        it("allows nulls", (done) => {
            let db = start();
            let schema = new Schema({ x: [Number] }, { collection: "nullsareallowed" + random() });
            let M = db.model("nullsareallowed", schema);
            let m;

            m = new M({ x: [1, null, 3] });
            m.save((err) => {
                assert.ifError(err);

                // undefined is not allowed
                m = new M({ x: [1, undefined, 3] });
                m.save(function (err) {
                    db.close();
                    assert.ok(err);
                    done();
                });
            });
        });
    });

    describe("bug fixes", () => {
        let db;

        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("modifying subdoc props and manipulating the array works (gh-842)", (done) => {
            let schema = new Schema({ em: [new Schema({ username: String })] });
            let M = db.model("modifyingSubDocAndPushing", schema);
            let m = new M({ em: [{ username: "Arrietty" }] });

            m.save((err) => {
                assert.ifError(err);
                M.findById(m, function (err, m) {
                    assert.ifError(err);
                    assert.equal(m.em[0].username, 'Arrietty');

                    m.em[0].username = 'Shawn';
                    m.em.push({ username: 'Homily' });
                    m.save(function (err) {
                        assert.ifError(err);

                        M.findById(m, function (err, m) {
                            assert.ifError(err);
                            assert.equal(m.em.length, 2);
                            assert.equal(m.em[0].username, 'Shawn');
                            assert.equal(m.em[1].username, 'Homily');

                            m.em[0].username = 'Arrietty';
                            m.em[1].remove();
                            m.save(function (err) {
                                assert.ifError(err);

                                M.findById(m, function (err, m) {
                                    assert.ifError(err);
                                    assert.equal(m.em.length, 1);
                                    assert.equal(m.em[0].username, 'Arrietty');
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("pushing top level arrays and subarrays works (gh-1073)", (done) => {
            let schema = new Schema({ em: [new Schema({ sub: [String] })] });
            let M = db.model("gh1073", schema);
            let m = new M({ em: [{ sub: [] }] });
            m.save(() => {
                M.findById(m, function (err, m) {
                    assert.ifError(err);

                    m.em[m.em.length - 1].sub.push('a');
                    m.em.push({ sub: [] });

                    assert.equal(m.em.length, 2);
                    assert.equal(m.em[0].sub.length, 1);

                    m.save(function (err) {
                        assert.ifError(err);

                        M.findById(m, function (err, m) {
                            assert.ifError(err);
                            assert.equal(m.em.length, 2);
                            assert.equal(m.em[0].sub.length, 1);
                            assert.equal(m.em[0].sub[0], 'a');
                            done();
                        });
                    });
                });
            });
        });

        it("finding ids by string (gh-4011)", (done) => {
            let sub = new Schema({
                _id: String,
                other: String
            });

            let main = new Schema({
                subs: [sub]
            });

            let Model = db.model("gh4011", main);

            let doc = new Model({ subs: [{ _id: "57067021ee0870440c76f489" }] });

            assert.ok(doc.subs.id("57067021ee0870440c76f489"));
            assert.ok(doc.subs.id(new mongodb.ObjectId("57067021ee0870440c76f489")));
            done();
        });
    });

    describe("default type", () => {
        it("casts to Mixed", (done) => {
            let db = start(),
                DefaultArraySchema = new Schema({
                    num1: Array,
                    num2: []
                });

            mongoose.model("DefaultArraySchema", DefaultArraySchema);
            let DefaultArray = db.model("DefaultArraySchema", collection);
            let arr = new DefaultArray();
            db.close();

            assert.equal(arr.get("num1").length, 0);
            assert.equal(arr.get("num2").length, 0);

            let threw1 = false,
                threw2 = false;

            try {
                arr.num1.push({ x: 1 });
                arr.num1.push(9);
                arr.num1.push("woah");
            } catch (err) {
                threw1 = true;
            }

            assert.equal(threw1, false);

            try {
                arr.num2.push({ x: 1 });
                arr.num2.push(9);
                arr.num2.push("woah");
            } catch (err) {
                threw2 = true;
            }

            assert.equal(threw2, false);
            done();
        });
    });

    describe("removing from an array atomically using MongooseArray#remove", () => {
        let db;
        let B;

        before((done) => {
            let schema = new Schema({
                numbers: ["number"],
                numberIds: [{ _id: "number", name: "string" }],
                stringIds: [{ _id: "string", name: "string" }],
                bufferIds: [{ _id: "buffer", name: "string" }],
                oidIds: [{ name: "string" }]
            });

            db = start();
            B = db.model("BlogPost", schema);
            done();
        });

        after((done) => {
            db.close(done);
        });

        it("works", (done) => {
            let post = new B();
            post.numbers.push(1, 2, 3);

            post.save((err) => {
                assert.ifError(err);

                B.findById(post._id, function (err, doc) {
                    assert.ifError(err);

                    doc.numbers.remove('1');
                    doc.save(function (err) {
                        assert.ifError(err);

                        B.findById(post.get('_id'), function (err, doc) {
                            assert.ifError(err);

                            assert.equal(doc.numbers.length, 2);
                            doc.numbers.remove('2', '3');

                            doc.save(function (err) {
                                assert.ifError(err);

                                B.findById(post._id, function (err, doc) {
                                    assert.ifError(err);
                                    assert.equal(doc.numbers.length, 0);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        describe("with subdocs", () => {
            function docs(arr) {
                return arr.map((val) => {
                    return { _id: val };
                });
            }

            it("supports passing strings", (done) => {
                var post = new B({ stringIds: docs('a b c d'.split(' ')) });
                post.save(function (err) {
                    assert.ifError(err);
                    B.findById(post, function (err, post) {
                        assert.ifError(err);
                        post.stringIds.remove('b');
                        post.save(function (err) {
                            assert.ifError(err);
                            B.findById(post, function (err, post) {
                                assert.ifError(err);
                                assert.equal(post.stringIds.length, 3);
                                assert.ok(!post.stringIds.id('b'));
                                done();
                            });
                        });
                    });
                });
            });
            it("supports passing numbers", (done) => {
                var post = new B({ numberIds: docs([1, 2, 3, 4]) });
                post.save(function (err) {
                    assert.ifError(err);
                    B.findById(post, function (err, post) {
                        assert.ifError(err);
                        post.numberIds.remove(2, 4);
                        post.save(function (err) {
                            assert.ifError(err);
                            B.findById(post, function (err, post) {
                                assert.ifError(err);
                                assert.equal(post.numberIds.length, 2);
                                assert.ok(!post.numberIds.id(2));
                                assert.ok(!post.numberIds.id(4));
                                done();
                            });
                        });
                    });
                });
            });
            it("supports passing objectids", (done) => {
                var OID = mongoose.Types.ObjectId;
                var a = new OID;
                var b = new OID;
                var c = new OID;
                var post = new B({ oidIds: docs([a, b, c]) });
                post.save(function (err) {
                    assert.ifError(err);
                    B.findById(post, function (err, post) {
                        assert.ifError(err);
                        post.oidIds.remove(a, c);
                        post.save(function (err) {
                            assert.ifError(err);
                            B.findById(post, function (err, post) {
                                assert.ifError(err);
                                assert.equal(post.oidIds.length, 1);
                                assert.ok(!post.oidIds.id(a));
                                assert.ok(!post.oidIds.id(c));
                                done();
                            });
                        });
                    });
                });
            });
            it("supports passing buffers", (done) => {
                var post = new B({ bufferIds: docs(['a', 'b', 'c', 'd']) });
                post.save(function (err) {
                    assert.ifError(err);
                    B.findById(post, function (err, post) {
                        assert.ifError(err);
                        post.bufferIds.remove(new Buffer('a'));
                        post.save(function (err) {
                            assert.ifError(err);
                            B.findById(post, function (err, post) {
                                assert.ifError(err);
                                assert.equal(post.bufferIds.length, 3);
                                assert.ok(!post.bufferIds.id(new Buffer('a')));
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});
