const waterfall = require("async/waterfall");
const parallel = require("async/parallel");

const {
    is,
    fs,
    stream: { pull },
    datastore: { Key, shard: sh, wrapper: { Sharding }, backend: { Fs } },
    std: { path }
} = adone;

const tmpdir = () => adone.fs.tmpName({
    prefix: "",
    nameGenerator: adone.util.uuid.v4
});

describe("datastore", "backend", "Fs", () => {
    describe("construction", () => {
        it("defaults - folder missing", async () => {
            const dir = await tmpdir();
            const fsd = new Fs(dir);
            await fsd.open();
        });

        it("defaults - folder exists", async () => {
            const dir = await tmpdir();
            await fs.mkdirp(dir);
            const fsd = new Fs(dir);
            await fsd.open();
        });

        it("createIfMissing: false - folder missing", async () => {
            const dir = await tmpdir();
            const fsd = new Fs(dir, { createIfMissing: false });
            await assert.throws(async () => fsd.open());
        });

        it("errorIfExists: true - folder exists", async () => {
            const dir = await tmpdir();
            await fs.mkdirp(dir);
            const fsd = new Fs(dir, { errorIfExists: true });
            await assert.throws(async () => fsd.open());
        });
    });

    it("_encode and _decode", async () => {
        const dir = await tmpdir();
        const fsd = new Fs(dir);
        await fsd.open();

        expect(fsd._encode(new Key("hello/world"))).to.eql({
            dir: path.join(dir, "hello"),
            file: path.join(dir, "hello", "world.data")
        });

        expect(fsd._decode(fsd._encode(new Key("hello/world/test:other")).file)).to.eql(new Key("hello/world/test:other"));
    });

    it("sharding files", async () => {
        const dir = await tmpdir();
        const fstore = new Fs(dir);
        await fstore.open();
        const shard = new sh.NextToLast(2);

        await Sharding.create(fstore, shard);
        const file = await fs.readFile(path.join(dir, sh.SHARDING_FN));
        expect(file.toString()).to.be.eql("/repo/flatfs/shard/v1/next-to-last/2\n");
        const readme = await fs.readFile(path.join(dir, sh.README_FN));
        expect(readme.toString()).to.be.eql(sh.readme);

        await fs.rm(dir);
    });

    it("query", async (done) => {
        const fsd = new Fs(path.join(__dirname, "test-repo", "blocks"));
        await fsd.open();
        pull(
            await fsd.query({}),
            pull.collect((err, res) => {
                assert.notExists(err);
                expect(res).to.have.length(23);
                done();
            })
        );
    });

    it("interop with go", async (done) => {
        const repodir = path.join(__dirname, "/test-repo/blocks");
        const fstore = new Fs(repodir);
        await fstore.open();
        const key = new Key("CIQGFTQ7FSI2COUXWWLOQ45VUM2GUZCGAXLWCTOKKPGTUWPXHBNIVOY");
        const expected = await fs.readFile(path.join(repodir, "VO", `${key.toString()}.data`));

        const flatfs = await Sharding.open(fstore);
        waterfall([
            (cb) => parallel([
                (cb) => flatfs.query({}).then((src) => {
                    pull(
                        src,
                        pull.collect(cb)
                    );
                }),
                (cb) => flatfs.get(key).then((val) => cb(null, val), cb)
            ], (err, res) => {
                assert.notExists(err);
                expect(res[0]).to.have.length(23);
                expect(res[1]).to.be.eql(expected);

                cb();
            })
        ], done);
    });

    describe("interface", () => {
        let dir;

        require("../../interface")({
            async setup() {
                if (is.undefined(dir)) {
                    dir = await tmpdir();
                }
                return new Fs(dir);
            },
            async teardown() {
                await fs.rm(dir);
            }
        });
    });

    describe("interface (sharding(fs))", () => {
        let dir;

        require("../../interface")({
            async setup() {
                if (is.undefined(dir)) {
                    dir = await tmpdir();
                }
                const shard = new sh.NextToLast(2);
                const fs = new Fs(dir);
                await fs.open();
                return Sharding.createOrOpen(fs, shard);
            },
            async teardown() {
                await fs.rm(dir);
            }
        });
    });
});
