/**
 * Module dependencies.
 */

const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;
const random = adone.odm.utils.random;

/**
 * setup
 */
const capped = new Schema({ key: "string", val: "number" });
capped.set("capped", { size: 1000 });
const coll = `capped_${random()}`;

/**
 * Test.
 */

describe("collections: capped:", () => {
    let db;

    before(() => {
        db = start();
    });

    after((done) => {
        db.close(done);
    });

    it("schemas should have option size", (done) => {
        assert.ok(capped.options.capped);
        assert.equal(capped.options.capped.size, 1000);
        done();
    });
    it("creation", (done) => {
        const Capped = db.model("Capped", capped, coll);
        Capped.collection.isCapped((err, isCapped) => {
            assert.ifError(err);
            assert.ok(isCapped, "should create a capped collection");

            // use the existing capped collection in the db (no coll creation)
            const Capped2 = db.model("Capped2", capped, coll);
            Capped2.collection.isCapped((err1, isCapped1) => {
                assert.ifError(err1);
                assert.ok(isCapped1, "should reuse the capped collection in the db");
                assert.equal(Capped.collection.name, Capped2.collection.name);
                done();
            });
        });
    });
    it("creation using a number", (done) => {
        const schema = new Schema({ key: "string" }, { capped: 8192 });
        const Capped = db.model("Capped3", schema);
        Capped.collection.options((err, options) => {
            assert.ifError(err);
            assert.ok(options.capped, "should create a capped collection");
            assert.equal(options.size, 8192);
            done();
        });
    });
    it("attempting to use existing non-capped collection as capped emits error", (done) => {
        db = start();
        const opts = {};
        const conn = `capped_existing_${random()}`;

        db.on("open", () => {
            db.db.createCollection(conn, opts, (err) => {
                if (err) {
                    db.close();
                }
                assert.ifError(err);

                let timer;

                db.on("error", (err1) => {
                    clearTimeout(timer);
                    db.close();
                    assert.ok(/non-capped collection exists/.test(err1));
                    done();
                });

                db.model("CappedExisting", capped, conn);
                timer = setTimeout(() => {
                    db.close();
                    throw new Error("capped test timeout");
                }, 900);
            });
        });
    });
});