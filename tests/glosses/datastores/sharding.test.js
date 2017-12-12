const series = require("async/series");
const parallel = require("async/parallel");
const waterfall = require("async/waterfall");

const {
    datastore: { Key, Memory, Sharding, shard }
} = adone;

describe("Sharding", () => {
    it("create", (done) => {
        const ms = new Memory();
        const sh = new shard.NextToLast(2);

        waterfall([
            (cb) => Sharding.create(ms, sh, cb),
            (cb) => parallel([
                (cb) => ms.get(new Key(shard.SHARDING_FN), cb),
                (cb) => ms.get(new Key(shard.README_FN), cb)
            ], cb),
            (res, cb) => {
                expect(
                    res[0].toString()
                ).to.eql(`${sh.toString()}\n`);
                expect(
                    res[1].toString()
                ).to.eql(shard.readme);
                cb();
            }
        ], done);
    });

    it("open - empty", (done) => {
        const ms = new Memory();

        Sharding.open(ms, (err, ss) => {
            assert.exists(err);
            assert.notExists(ss);
            done();
        });
    });

    it("open - existing", (done) => {
        const ms = new Memory();
        const sh = new shard.NextToLast(2);

        waterfall([
            (cb) => Sharding.create(ms, sh, cb),
            (cb) => Sharding.open(ms, cb)
        ], done);
    });

    it("basics", (done) => {
        const ms = new Memory();
        const sh = new shard.NextToLast(2);
        Sharding.createOrOpen(ms, sh, (err, ss) => {
            assert.notExists(err);
            assert.exists(ss);
            const store = ss;

            series([
                (cb) => store.put(new Key("hello"), Buffer.from("test"), cb),
                (cb) => ms.get(new Key("ll").child(new Key("hello")), (err, res) => {
                    assert.notExists(err);
                    expect(res).to.eql(Buffer.from("test"));
                    cb();
                })
            ], done);
        });
    });

    describe("interface-datastore", () => {
        require("./tests")({
            setup(callback) {
                const sh = new shard.NextToLast(2);
                Sharding.createOrOpen(new Memory(), sh, callback);
            },
            teardown(callback) {
                callback();
            }
        });
    });
});
