const series = require("async/series");
const each = require("async/each");
const map = require("async/map");
const parallel = require("async/parallel");

const {
    stream: { pull },
    datastore: { Key, backend: { Memory }, wrapper: { Namespace } }
} = adone;

describe.todo("datastore", "wrapper", "KeyTransform", () => {
    const prefixes = [
        "abc",
        ""
    ];
    prefixes.forEach((prefix) => it(`basic '${prefix}'`, (done) => {
        const mStore = new Memory();
        const store = new Namespace(mStore, new Key(prefix));

        const keys = [
            "foo",
            "foo/bar",
            "foo/bar/baz",
            "foo/barb",
            "foo/bar/bazb",
            "foo/bar/baz/barb"
        ].map((s) => new Key(s));

        series([
            (cb) => each(keys, (k, cb) => {
                store.put(k, Buffer.from(k.toString()), cb);
            }, cb),
            (cb) => parallel([
                (cb) => map(keys, (k, cb) => {
                    store.get(k, cb);
                }, cb),
                (cb) => map(keys, (k, cb) => {
                    mStore.get(new Key(prefix).child(k), cb);
                }, cb)
            ], (err, res) => {
                assert.notExists(err);
                expect(res[0]).to.eql(res[1]);
                cb();
            }),
            (cb) => parallel([
                (cb) => pull(mStore.query({}), pull.collect(cb)),
                (cb) => pull(store.query({}), pull.collect(cb))
            ], (err, res) => {
                assert.notExists(err);
                expect(res[0]).to.have.length(res[1].length);

                res[0].forEach((a, i) => {
                    const kA = a.key;
                    const kB = res[1][i].key;
                    expect(store.transform.invert(kA)).to.eql(kB);
                    expect(kA).to.eql(store.transform.convert(kB));
                });

                cb();
            }),
            (cb) => store.close(cb)
        ], done);
    }));

    prefixes.forEach((prefix) => {
        describe(`interface: '${prefix}'`, () => {
            require("../interface")({
                setup(callback) {
                    callback(null, new Namespace(new Memory(), new Key(prefix)));
                },
                teardown(callback) {
                    callback();
                }
            });
        });
    });
});
