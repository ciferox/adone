const bluebird = require("bluebird");
const q = require("q");
const start = require("./common");

const { PromiseProvider, Schema } = adone.odm;

let db;

describe("ES6 promises: ", () => {
    let testSchema;
    let MyModel;

    before(() => {
        testSchema = new Schema({ test: { type: String, required: true } });
        testSchema.pre("save", function (next) {
            if (this.$__saveSucceeds === false) {
                return next(new Error("fail"));
            }
            next();
        });
        testSchema.pre("validate", function (next) {
            if (this.$__validateSucceeds === false) {
                return next(new Error("validation failed"));
            }
            next();
        });
        testSchema.pre("findOne", function (next) {
            if (this.$__findOneSucceeds === false) {
                return next(new Error("findOne failed"));
            }
            next();
        });
    });

    describe("native: ", () => {
        if (!global.Promise) {
            return;
        }

        before(() => {
            PromiseProvider.set(global.Promise);
        });

        before(() => {
            db = start();
            MyModel = db.model('es6promise', testSchema);
        });

        after((done) => {
            PromiseProvider.reset();
            db.close(done);
        });

        afterEach((done) => {
            MyModel.remove({}, done);
        });

        it("save()", (done) => {
            var m = new MyModel({ test: '123' });
            var promise = m.save();
            assert.equal(promise.constructor, global.Promise);
            promise.then(function (doc) {
                assert.equal(m, doc);
                done();
            });
        });

        it("save() with validation error", (done) => {
            var m = new MyModel({});
            var promise = m.save();
            assert.equal(promise.constructor, global.Promise);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.ok(err.errors.test);
                    done();
                });
        });

        it("save() with middleware error", (done) => {
            var m = new MyModel({ test: '123' });
            m.$__saveSucceeds = false;
            var promise = m.save();
            assert.equal(promise.constructor, global.Promise);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.equal(err.toString(), 'Error: fail');
                    done();
                });
        });

        it("save() with validation middleware error", (done) => {
            var m = new MyModel({ test: '123' });
            m.$__validateSucceeds = false;
            var promise = m.save();
            assert.equal(promise.constructor, global.Promise);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.equal(err.toString(), 'Error: validation failed');
                    done();
                });
        });

        it("validate()", (done) => {
            var m = new MyModel({});
            var promise = m.validate();
            assert.equal(promise.constructor, global.Promise);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.ok(err.errors.test);
                    done();
                });
        });

        it("queries", (done) => {
            MyModel.create({ test: '123' }, function (error) {
                assert.ifError(error);

                var promise = MyModel.findOne({ test: '123' }).exec();
                assert.equal(promise.constructor, global.Promise);

                promise.then(function (doc) {
                    assert.equal(doc.test, '123');
                    done();
                });
            });
        });

        it("queries with errors", (done) => {
            MyModel.create({ test: '123' }, function (error) {
                assert.ifError(error);

                var query = MyModel.findOne({ test: '123' });
                query.$__findOneSucceeds = false;
                var promise = query.exec();
                assert.equal(promise.constructor, global.Promise);

                promise.
                    then(function () {
                        assert.ok(false);
                    }).
                    catch(function (err) {
                        assert.ok(err);
                        assert.equal(err.toString(), 'Error: findOne failed');
                        done();
                    });
            });
        });

        it("create", (done) => {
            var promise = MyModel.create({ test: '123' });
            assert.equal(promise.constructor, global.Promise);
            promise.then(function () {
                done();
            });
        });
    });

    describe("bluebird: ", () => {
        before(() => {
            PromiseProvider.set(bluebird);
        });

        before(() => {
            db = start();
            MyModel = db.model('es6promise_bluebird', testSchema);
        });

        after((done) => {
            PromiseProvider.reset();
            db.close(done);
        });

        afterEach((done) => {
            MyModel.remove({}, done);
        });

        it("save()", (done) => {
            var m = new MyModel({ test: '123' });
            var promise = m.save();
            assert.equal(promise.constructor, bluebird);
            promise.then(function (doc) {
                assert.equal(m, doc);
                m.test = '456';
                m.save(function (error, doc, numAffected) {
                    assert.ifError(error);
                    assert.ok(doc);
                    assert.equal(numAffected, 1);
                    done();
                });
            });
        });

        it("save() with validation error", (done) => {
            var m = new MyModel({});
            var promise = m.save();
            assert.equal(promise.constructor, bluebird);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.ok(err.errors.test);
                    done();
                });
        });

        it("save() with middleware error", (done) => {
            var m = new MyModel({ test: '123' });
            m.$__saveSucceeds = false;
            var promise = m.save();
            assert.equal(promise.constructor, bluebird);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.equal(err.toString(), 'Error: fail');

                    // Shouldn't log an unhandled rejection error
                    m.save(function (err) {
                        assert.ok(err);
                        assert.equal(err.toString(), 'Error: fail');
                        done();
                    });
                });
        });

        it("save() with validation middleware error", (done) => {
            var m = new MyModel({ test: '123' });
            m.$__validateSucceeds = false;
            var promise = m.save();
            assert.equal(promise.constructor, bluebird);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.equal(err.toString(), 'Error: validation failed');
                    done();
                });
        });

        it("validate()", (done) => {
            var m = new MyModel({});
            var promise = m.validate();
            assert.equal(promise.constructor, bluebird);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.ok(err.errors.test);
                    done();
                });
        });

        it("queries", (done) => {
            MyModel.create({ test: '123' }, function (error) {
                assert.ifError(error);

                var promise = MyModel.findOne({ test: '123' }).exec();
                assert.equal(promise.constructor, bluebird);

                promise.then(function (doc) {
                    assert.equal(doc.test, '123');
                    done();
                });
            });
        });

        it("queries with errors", (done) => {
            MyModel.create({ test: '123' }, function (error) {
                assert.ifError(error);

                var query = MyModel.findOne({ test: '123' });
                query.$__findOneSucceeds = false;
                var promise = query.exec();
                assert.equal(promise.constructor, bluebird);

                promise.
                    then(function () {
                        assert.ok(false);
                    }).
                    catch(function (err) {
                        assert.ok(err);
                        assert.equal(err.toString(), 'Error: findOne failed');
                        done();
                    });
            });
        });

        it("no unhandled rejection on query w/ cb (gh-4379)", (done) => {
            var query = MyModel.findOne({ test: '123' });
            query.$__findOneSucceeds = false;
            query.exec(function (error) {
                assert.ok(error);
                done();
            });
        });

        it("create", (done) => {
            var promise = MyModel.create({ test: '123' });
            assert.equal(promise.constructor, bluebird);
            promise.then(function () {
                var p = MyModel.create({});
                p.catch(function (error) {
                    assert.ok(error);
                    done();
                });
            });
        });

        it("subdocument validation (gh-3681)", (done) => {
            var subSchema = new Schema({ name: { type: String, required: true } });
            var parentSchema = new Schema({ sub: [subSchema] });
            var Parent = db.model('gh3681', parentSchema);

            Parent.create({ sub: [{}] }).catch(function () {
                done();
            });
        });

        it("Model.populate (gh-3734)", (done) => {
            var doc = new MyModel({});
            var promise = MyModel.populate(doc, 'test');
            assert.equal(promise.constructor, bluebird);
            done();
        });

        it("gh-4177", (done) => {
            var subSchema = new Schema({
                name: { type: String, required: true }
            });

            var mainSchema = new Schema({
                name: String,
                type: String,
                children: [subSchema]
            });

            mainSchema.index({ name: 1, account: 1 }, { unique: true });

            var Main = db.model('gh4177', mainSchema);

            Main.on('index', function (error) {
                assert.ifError(error);

                var data = {
                    name: 'foo',
                    type: 'bar',
                    children: [{ name: 'child' }]
                };

                var firstSucceeded = false;
                new Main(data).
                    save().
                    then(function () {
                        firstSucceeded = true;
                        return new Main(data).save();
                    }).
                    catch(function (error) {
                        assert.ok(firstSucceeded);
                        assert.ok(error.toString().indexOf('E11000') !== -1);
                        done();
                    });
            });
        });

        it("subdoc pre doesnt cause unhandled rejection (gh-3669)", (done) => {
            var nestedSchema = new Schema({
                name: { type: String, required: true }
            });

            nestedSchema.pre('validate', function (next) {
                next();
            });

            var schema = new Schema({
                items: [nestedSchema]
            });

            var MyModel = db.model('gh3669', schema);

            MyModel.create({ items: [{ name: null }] }).catch(function (error) {
                assert.ok(error);
                done();
            });
        });
    });

    describe("q: ", () => {
        before(() => {
            PromiseProvider.set(q.Promise);
        });

        before(() => {
            db = start();
            MyModel = db.model('es6promise_q', testSchema);
        });

        after((done) => {
            PromiseProvider.reset();
            db.close(done);
        });

        afterEach((done) => {
            MyModel.remove({}, done);
        });

        it("save()", (done) => {
            var m = new MyModel({ test: '123' });
            var promise = m.save();
            assert.ok(promise instanceof q.makePromise);
            promise.then(function (doc) {
                assert.equal(m, doc);
                done();
            });
        });

        it("save() with validation error", (done) => {
            var m = new MyModel({});
            var promise = m.save();
            assert.ok(promise instanceof q.makePromise);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.ok(err.errors.test);
                    done();
                });
        });

        it("save() with middleware error", (done) => {
            var m = new MyModel({ test: '123' });
            m.$__saveSucceeds = false;
            var promise = m.save();
            assert.ok(promise instanceof q.makePromise);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.equal(err.toString(), 'Error: fail');
                    done();
                });
        });

        it("save() with validation middleware error", (done) => {
            var m = new MyModel({ test: '123' });
            m.$__validateSucceeds = false;
            var promise = m.save();
            assert.ok(promise instanceof q.makePromise);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.equal(err.toString(), 'Error: validation failed');
                    done();
                });
        });

        it("validate()", (done) => {
            var m = new MyModel({});
            var promise = m.validate();
            assert.ok(promise instanceof q.makePromise);
            promise.
                then(function () {
                    assert.ok(false);
                }).
                catch(function (err) {
                    assert.ok(err);
                    assert.ok(err.errors.test);
                    done();
                });
        });

        it("queries", (done) => {
            MyModel.create({ test: '123' }, function (error) {
                assert.ifError(error);

                var promise = MyModel.findOne({ test: '123' }).exec();
                assert.ok(promise instanceof q.makePromise);

                promise.then(function (doc) {
                    assert.equal(doc.test, '123');
                    done();
                });
            });
        });

        it("queries with errors", (done) => {
            MyModel.create({ test: '123' }, function (error) {
                assert.ifError(error);

                var query = MyModel.findOne({ test: '123' });
                query.$__findOneSucceeds = false;
                var promise = query.exec();
                assert.ok(promise instanceof q.makePromise);

                promise.
                    then(function () {
                        assert.ok(false);
                    }).
                    catch(function (err) {
                        assert.ok(err);
                        assert.equal(err.toString(), 'Error: findOne failed');
                        done();
                    });
            });
        });

        it("create", (done) => {
            var promise = MyModel.create({ test: '123' });
            assert.ok(promise instanceof q.makePromise);
            promise.then(function () {
                done();
            });
        });
    });
});
