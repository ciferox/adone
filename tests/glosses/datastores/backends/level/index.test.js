const rimraf = require("rimraf");
const each = require("async/each");
const memdown = require("memdown");

const {
    net: { p2p: { CID } },
    datastore: { Key, backend: { Level }, utils, wrapper: { Mount } },
    std: { path },
    stream: { pull }
} = adone;

describe.todo("datastore", "backend", "LevelDatastore", () => {
    describe("interface (memory)", () => {
        require("../../interface")({
            setup(callback) {
                callback(null, new Level("hello", { db: memdown }));
            },
            teardown(callback) {
                memdown.clearGlobalStore();
                callback();
            }
        });
    });

    describe("interface (leveldb)", () => {
        const dir = utils.tmpdir();
        require("../../interface")({
            setup(callback) {
                callback(null, new Level(dir));
            },
            teardown(callback) {
                rimraf(dir, callback);
            }
        });
    });

    describe("interface (mount(leveldown, leveldown, leveldown))", () => {
        const dirs = [
            utils.tmpdir(),
            utils.tmpdir(),
            utils.tmpdir()
        ];

        require("../../interface")({
            setup(callback) {
                callback(null, new Mount([{
                    prefix: new Key("/a"),
                    datastore: new Level(dirs[0])
                }, {
                    prefix: new Key("/q"),
                    datastore: new Level(dirs[1])
                }, {
                    prefix: new Key("/z"),
                    datastore: new Level(dirs[2])
                }]));
            },
            teardown(callback) {
                each(dirs, rimraf, callback);
            }
        });
    });

    it.skip("interop with go", (done) => {
        const store = new Level(path.join(__dirname, "test-repo", "datastore"));

        pull(
            store.query({}),
            pull.map((e) => {
                // console.log('=======')
                // console.log(e)
                // console.log(e.key.toBuffer().toString())
                return new CID(1, "dag-cbor", e.key.toBuffer());
            }),
            pull.collect((err, cids) => {
                expect(err).to.not.exist();
                expect(cids[0].version).to.be.eql(0);
                expect(cids).to.have.length(4);
                done();
            })
        );
    });
});
