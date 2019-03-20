const mkdirp = require("mkdirp");
const rimraf = require("rimraf");
const waterfall = require("async/waterfall");
const parallel = require("async/parallel");

const {
    datastore2: { ShardingDatastore, shard: sh, interface: { Key, util }, backend: { FsDatastore } },
    std: { fs, path },
    stream: { pull }
} = adone;

describe("datastore", "backend", "FsDatastore", () => {
    describe("construction", () => {
        it("defaults - folder missing", () => {
            const dir = util.tmpdir();
            expect(
                () => new FsDatastore(dir)
            ).to.not.throw();
        });

        it("defaults - folder exists", () => {
            const dir = util.tmpdir();
            mkdirp.sync(dir);
            expect(
                () => new FsDatastore(dir)
            ).to.not.throw();
        });

        it("createIfMissing: false - folder missing", () => {
            const dir = util.tmpdir();
            expect(
                () => new FsDatastore(dir, { createIfMissing: false })
            ).to.throw();
        });

        it("errorIfExists: true - folder exists", () => {
            const dir = util.tmpdir();
            mkdirp.sync(dir);
            expect(
                () => new FsDatastore(dir, { errorIfExists: true })
            ).to.throw();
        });
    });

    it("_encode and _decode", () => {
        const dir = util.tmpdir();
        const fs = new FsDatastore(dir);

        expect(
            fs._encode(new Key("hello/world"))
        ).to.eql({
            dir: path.join(dir, "hello"),
            file: path.join(dir, "hello", "world.data")
        });

        expect(
            fs._decode(fs._encode(new Key("hello/world/test:other")).file)
        ).to.eql(
            new Key("hello/world/test:other")
        );
    });

    it("sharding files", (done) => {
        const dir = util.tmpdir();
        const fstore = new FsDatastore(dir);
        const shard = new sh.NextToLast(2);
        waterfall([
            (cb) => ShardingDatastore.create(fstore, shard, cb),
            (cb) => fs.readFile(path.join(dir, sh.SHARDING_FN), cb),
            (file, cb) => {
                expect(file.toString()).to.be.eql("/repo/flatfs/shard/v1/next-to-last/2\n");
                fs.readFile(path.join(dir, sh.README_FN), cb);
            },
            (readme, cb) => {
                expect(readme.toString()).to.be.eql(sh.readme);
                cb();
            },
            (cb) => rimraf(dir, cb)
        ], done);
    });

    it("query", (done) => {
        const fs = new FsDatastore(path.join(__dirname, "test-repo", "blocks"));

        pull(
            fs.query({}),
            pull.collect((err, res) => {
                expect(err).to.not.exist();
                expect(res).to.have.length(23);
                done();
            })
        );
    });

    it("interop with go", (done) => {
        const repodir = path.join(__dirname, "/test-repo/blocks");
        const fstore = new FsDatastore(repodir);
        const key = new Key("CIQGFTQ7FSI2COUXWWLOQ45VUM2GUZCGAXLWCTOKKPGTUWPXHBNIVOY");
        const expected = fs.readFileSync(path.join(repodir, "VO", `${key.toString()}.data`));

        waterfall([
            (cb) => ShardingDatastore.open(fstore, cb),
            (flatfs, cb) => parallel([
                (cb) => pull(
                    flatfs.query({}),
                    pull.collect(cb)
                ),
                (cb) => flatfs.get(key, cb)
            ], (err, res) => {
                expect(err).to.not.exist();
                expect(res[0]).to.have.length(23);
                expect(res[1]).to.be.eql(expected);

                cb();
            })
        ], done);
    });

    describe("interface-datastore", () => {
        const dir = util.tmpdir();

        require("../interface")({
            setup(callback) {
                callback(null, new FsDatastore(dir));
            },
            teardown(callback) {
                rimraf(dir, callback);
            }
        });
    });

    describe("interface-datastore (sharding(fs))", () => {
        const dir = util.tmpdir();

        require("../interface")({
            setup(callback) {
                const shard = new sh.NextToLast(2);
                ShardingDatastore.createOrOpen(new FsDatastore(dir), shard, callback);
            },
            teardown(callback) {
                rimraf(dir, callback);
            }
        });
    });
});
