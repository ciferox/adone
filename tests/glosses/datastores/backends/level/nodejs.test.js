const rimraf = require("rimraf");
const each = require("async/each");

const {
    database: { level },
    datastore: { MountDatastore, interface: { Key, util }, backend: { LevelDatastore } },
    std: { path },
    stream: { pull },
    multiformat: { CID }
} = adone;
const tesInterface = require("../interface");

describe("datastore", "backend", "LevelDatastore", () => {
    describe("interface-datastore (LevelDB)", () => {
        const dir = util.tmpdir();
        tesInterface({
            setup(callback) {
                callback(null, new LevelDatastore(dir, {
                    db: level.backend.LevelDB
                }));
            },
            teardown(callback) {
                rimraf(dir, callback);
            }
        });
    });

    describe("interface-datastore (mount(LevelDB, LevelDB, LevelDB))", () => {
        const dirs = [
            util.tmpdir(),
            util.tmpdir(),
            util.tmpdir()
        ];

        tesInterface({
            setup(callback) {
                callback(null, new MountDatastore([{
                    prefix: new Key("/a"),
                    datastore: new LevelDatastore(dirs[0], {
                        db: level.backend.LevelDB
                    })
                }, {
                    prefix: new Key("/q"),
                    datastore: new LevelDatastore(dirs[1], {
                        db: level.backend.LevelDB
                    })
                }, {
                    prefix: new Key("/z"),
                    datastore: new LevelDatastore(dirs[2], {
                        db: level.backend.LevelDB
                    })
                }]));
            },
            teardown(callback) {
                each(dirs, rimraf, callback);
            }
        });
    });

    it.skip("interop with go", (done) => {
        const store = new LevelDatastore(path.join(__dirname, "test-repo", "datastore"), {
            db: level.backend.LevelDB
        });

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
