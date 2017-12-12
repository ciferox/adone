const series = require("async/series");
const parallel = require("async/parallel");

const {
    datastore: { Key, Memory, Tiered }
} = adone;

describe("Tiered", () => {
    describe("all stores", () => {
        const ms = [];
        let store;
        beforeEach(() => {
            ms.push(new Memory());
            ms.push(new Memory());
            store = new Tiered(ms);
        });

        it("put", (done) => {
            const k = new Key("hello");
            const v = Buffer.from("world");
            series([
                (cb) => store.put(k, v, cb),
                (cb) => parallel([
                    (cb) => ms[0].get(k, cb),
                    (cb) => ms[1].get(k, cb)
                ], (err, res) => {
                    assert.notExists(err);
                    res.forEach((val) => {
                        expect(val).to.be.eql(v);
                    });
                    cb();
                })
            ], done);
        });

        it("get and has, where available", (done) => {
            const k = new Key("hello");
            const v = Buffer.from("world");

            series([
                (cb) => ms[1].put(k, v, cb),
                (cb) => store.get(k, (err, val) => {
                    assert.notExists(err);
                    expect(val).to.be.eql(v);
                    cb();
                }),
                (cb) => store.has(k, (err, exists) => {
                    assert.notExists(err);
                    expect(exists).to.be.eql(true);
                    cb();
                })
            ], done);
        });

        it("has and delete", (done) => {
            const k = new Key("hello");
            const v = Buffer.from("world");
            series([
                (cb) => store.put(k, v, cb),
                (cb) => parallel([
                    (cb) => ms[0].has(k, cb),
                    (cb) => ms[1].has(k, cb)
                ], (err, res) => {
                    assert.notExists(err);
                    expect(res).to.be.eql([true, true]);
                    cb();
                }),
                (cb) => store.delete(k, cb),
                (cb) => parallel([
                    (cb) => ms[0].has(k, cb),
                    (cb) => ms[1].has(k, cb)
                ], (err, res) => {
                    assert.notExists(err);
                    expect(res).to.be.eql([false, false]);
                    cb();
                })
            ], done);
        });
    });

    describe("inteface-datastore-single", () => {
        require("./tests")({
            setup(callback) {
                callback(null, new Tiered([
                    new Memory(),
                    new Memory()
                ]));
            },
            teardown(callback) {
                callback();
            }
        });
    });
});
