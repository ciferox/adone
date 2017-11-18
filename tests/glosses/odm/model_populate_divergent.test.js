const start = require("./common");
const mongoose = start.mongoose;
const DivergentArrayError = mongoose.Error.DivergentArrayError;
const utils = adone.odm.utils;
const random = utils.random;

/**
 * Tests.
 */

describe("model: populate: divergent arrays", () => {
    // match
    // skip
    // limit
    // -_id
    //
    // $set
    // $pop -1
    // $pop 1

    let db, C, M;

    before((done) => {
        db = start();
        C = db.model("Child", { _id: Number, name: String }, `child-${random()}`);
        M = db.model("Parent", { array: { type: [{ type: Number, ref: "Child" }] } }, `parent-${random()}`);

        C.create(
            { _id: 0, name: "zero" }
            , { _id: 1, name: "one" }
            , { _id: 2, name: "two" }, (err) => {
                assert.ifError(err);
                M.create({ array: [0, 1, 2] }, (err) => {
                    assert.ifError(err);
                    done();
                });
            });
    });

    after((done) => {
        db.close(done);
    });

    function test(check, fn) {
        it("using $set", (done) => {
            fn((err, doc) => {
                assert.ifError(err);
                doc.array.unshift({ _id: 10, name: "ten" });
                doc.save((err) => {
                    check(err);
                    done();
                });
            });
        });
        it("using $pop 1", (done) => {
            fn((err, doc) => {
                assert.ifError(err);
                doc.array.$pop();
                doc.save((err) => {
                    check(err);
                    done();
                });
            });
        });
        it("using $pop -1", (done) => {
            fn((err, doc) => {
                assert.ifError(err);
                doc.array.$shift();
                doc.save((err) => {
                    check(err);
                    done();
                });
            });
        });
    }

    function testOk(fn) {
        test(assert.ifError.bind(assert), fn);
    }

    function testFails(fn) {
        test((err) => {
            assert.ok(err instanceof DivergentArrayError, `non-divergent error: ${err}`);
            assert.ok(/\sarray/.test(err.message));
        }, fn);
    }

    describe("from match", () => {
        testFails((cb) => {
            M.findOne().populate({ path: "array", match: { name: "one" } }).exec(cb);
        });
    });
    describe("from skip", () => {
        describe("2", () => {
            testFails((cb) => {
                M.findOne().populate({ path: 'array', options: { skip: 2 } }).exec(cb);
            });
        });
        describe("0", () => {
            testOk((cb) => {
                M.findOne().populate({ path: 'array', options: { skip: 0 } }).exec(cb);
            });
        });
    });
    describe("from limit", () => {
        describe("0", () => {
            testFails((cb) => {
                M.findOne().populate({ path: 'array', options: { limit: 0 } }).exec(cb);
            });
        });
        describe("1", () => {
            testFails((cb) => {
                M.findOne().populate({ path: 'array', options: { limit: 1 } }).exec(cb);
            });
        });
    });
    describe("from deselected _id", () => {
        describe("using string and only -_id", () => {
            testFails((cb) => {
                M.findOne().populate({ path: 'array', select: '-_id' }).exec(cb);
            });
        });
        describe("using string", () => {
            testFails((cb) => {
                M.findOne().populate({ path: 'array', select: 'name -_id' }).exec(cb);
            });
        });
        describe("using object and only _id: 0", () => {
            testFails((cb) => {
                M.findOne().populate({ path: 'array', select: { _id: 0 } }).exec(cb);
            });
        });
        describe("using object", () => {
            testFails((cb) => {
                M.findOne().populate({ path: 'array', select: { _id: 0, name: 1 } }).exec(cb);
            });
        });
    });
});
