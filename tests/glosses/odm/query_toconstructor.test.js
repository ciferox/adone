const start = require("./common");
const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const random = adone.odm.utils.random;
const { Query } = adone.odm;

describe("Query:", () => {
    let Comment;
    let Product;
    let prodName;
    let cName;

    before(() => {
        Comment = new Schema({
            text: String
        });

        Product = new Schema({
            tags: {}, // mixed
            array: Array,
            ids: [Schema.ObjectId],
            strings: [String],
            numbers: [Number],
            comments: [Comment],
            title: String
        });
        prodName = `Product${random()}`;
        mongoose.model(prodName, Product);
        cName = `Comment${random()}`;
        mongoose.model(cName, Comment);
    });

    describe("toConstructor", () => {
        let db;

        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("creates a query", (done) => {
            const Product = db.model(prodName);
            const prodQ = Product.find({ title: /test/ }).toConstructor();

            assert.ok(new prodQ() instanceof Query);
            done();
        });

        it("copies all the right values", (done) => {
            const Product = db.model(prodName);

            const prodQ = Product.update({ title: /test/ }, { title: "blah" });

            const prodC = prodQ.toConstructor();

            assert.deepEqual(prodQ._conditions, new prodC()._conditions);
            assert.deepEqual(prodQ._fields, new prodC()._fields);
            assert.deepEqual(prodQ._update, new prodC()._update);
            assert.equal(prodQ._path, new prodC()._path);
            assert.equal(prodQ._distinct, new prodC()._distinct);
            assert.deepEqual(prodQ._collection, new prodC()._collection);
            assert.deepEqual(prodQ.model, new prodC().model);
            assert.deepEqual(prodQ.mongooseCollection, new prodC().mongooseCollection);
            assert.deepEqual(prodQ._mongooseOptions, new prodC()._mongooseOptions);
            done();
        });

        it("gets expected results", (done) => {
            const Product = db.model(prodName);
            Product.create({ title: "this is a test" }, (err, p) => {
                assert.ifError(err);
                const prodC = Product.find({ title: /test/ }).toConstructor();

                new prodC().exec((err, results) => {
                    assert.ifError(err);
                    assert.equal(results.length, 1);
                    assert.equal(p.title, results[0].title);
                    done();
                });
            });
        });

        it("can be re-used multiple times", (done) => {
            const Product = db.model(prodName);

            Product.create([{ title: "moar thing" }, { title: "second thing" }], (err, prods) => {
                assert.ifError(err);
                assert.equal(prods.length, 2);
                const prod = prods[0];
                const prodC = Product.find({ title: /thing/ }).toConstructor();

                new prodC().exec((err, results) => {
                    assert.ifError(err);

                    assert.equal(results.length, 2);
                    new prodC().find({ _id: prod.id }).exec((err, res) => {
                        assert.ifError(err);
                        assert.equal(res.length, 1);

                        new prodC().exec((err, res) => {
                            assert.ifError(err);
                            assert.equal(res.length, 2);
                            done();
                        });
                    });
                });
            });
        });

        it("options get merged properly", (done) => {
            const Product = db.model(prodName);

            let prodC = Product.find({ title: /blah/ }).setOptions({ sort: "title", lean: true });
            prodC = prodC.toConstructor();

            const nq = new prodC(null, { limit: 3 });
            assert.deepEqual(nq._mongooseOptions, { lean: true, limit: 3 });
            assert.deepEqual(nq.options, { sort: { title: 1 }, limit: 3, retainKeyOrder: false });
            done();
        });

        it("options get cloned (gh-3176)", (done) => {
            const Product = db.model(prodName);

            let prodC = Product.find({ title: /blah/ }).setOptions({ sort: "title", lean: true });
            prodC = prodC.toConstructor();

            const nq = new prodC(null, { limit: 3 });
            assert.deepEqual(nq._mongooseOptions, { lean: true, limit: 3 });
            assert.deepEqual(nq.options, { sort: { title: 1 }, limit: 3, retainKeyOrder: false });
            const nq2 = new prodC(null, { limit: 5 });
            assert.deepEqual(nq._mongooseOptions, { lean: true, limit: 3 });
            assert.deepEqual(nq2._mongooseOptions, { lean: true, limit: 5 });

            done();
        });

        it("creates subclasses of mquery", (done) => {
            const Product = db.model(prodName);

            const opts = { safe: { w: "majority" }, readPreference: "p", retainKeyOrder: true };
            const match = { title: "test", count: { $gt: 101 } };
            const select = { name: 1, count: 0 };
            const update = { $set: { title: "thing" } };
            const path = "title";

            const q = Product.update(match, update);
            q.select(select);
            q.where(path);
            q.setOptions(opts);
            q.find();

            const M = q.toConstructor();
            const m = new M();

            assert.ok(m instanceof Query);
            assert.deepEqual(opts, m.options);
            assert.deepEqual(match, m._conditions);
            assert.deepEqual(select, m._fields);
            assert.deepEqual(update, m._update);
            assert.equal(path, m._path);
            assert.equal("find", m.op);
            done();
        });

        it("with findOneAndUpdate (gh-4318)", (done) => {
            const Product = db.model(prodName);

            const Q = Product.where({ title: "test" }).toConstructor();

            const query = { "tags.test": 1 };
            const update = {
                strings: ["123"],
                numbers: [1, 2, 3]
            };
            new Q().findOneAndUpdate(query, update, (error) => {
                assert.ifError(error);
                done();
            });
        });
    });
});
