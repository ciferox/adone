const {
    datastore: { backend: { FsDatastore }, interface: { Key, util }, ShardingDatastore, shard: sh }
} = adone;

const path = require("path");
const promisify = require("util").promisify;
const noop = () => { };
const mkdirp = require("mkdirp");
const rimraf = promisify(require("rimraf"));
const fs = require("fs");
const fsReadFile = promisify(require("fs").readFile || noop);
const isNode = require("detect-node");

describe("datastore", "backend", "FsDatastore", () => {
    if (!isNode) {
        it("only supports node.js", () => {

        });

        return;
    }

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

    it("deleting files", async () => {
        const dir = util.tmpdir();
        const fs = new FsDatastore(dir);
        const key = new Key("1234");

        await fs.put(key, Buffer.from([0, 1, 2, 3]));
        await fs.delete(key);

        try {
            await fs.get(key);
            throw new Error("Should have errored");
        } catch (err) {
            expect(err.code).to.equal("ERR_NOT_FOUND");
        }
    });

    it("deleting non-existent files", async () => {
        const dir = util.tmpdir();
        const fs = new FsDatastore(dir);
        const key = new Key("5678");

        await fs.delete(key);

        try {
            await fs.get(key);
            throw new Error("Should have errored");
        } catch (err) {
            expect(err.code).to.equal("ERR_NOT_FOUND");
        }
    });

    it("sharding files", async () => {
        const dir = util.tmpdir();
        const fstore = new FsDatastore(dir);
        const shard = new sh.NextToLast(2);
        await ShardingDatastore.create(fstore, shard);

        const file = await fsReadFile(path.join(dir, sh.SHARDING_FN));
        expect(file.toString()).to.be.eql("/repo/flatfs/shard/v1/next-to-last/2\n");

        const readme = await fsReadFile(path.join(dir, sh.README_FN));
        expect(readme.toString()).to.be.eql(sh.readme);
        await rimraf(dir);
    });

    it("query", async () => {
        const fs = new FsDatastore(path.join(__dirname, "test-repo", "blocks"));
        const res = [];
        for await (const q of fs.query({})) {
            res.push(q);
        }
        expect(res).to.have.length(23);
    });

    it("interop with go", async () => {
        const repodir = path.join(__dirname, "/test-repo/blocks");
        const fstore = new FsDatastore(repodir);
        const key = new Key("CIQGFTQ7FSI2COUXWWLOQ45VUM2GUZCGAXLWCTOKKPGTUWPXHBNIVOY");
        const expected = fs.readFileSync(path.join(repodir, "VO", `${key.toString()}.data`));
        const flatfs = await ShardingDatastore.open(fstore);
        const res = await flatfs.get(key);
        const queryResult = flatfs.query({});
        const results = [];
        for await (const result of queryResult) { results.push(result) };
        expect(results).to.have.length(23);
        expect(res).to.be.eql(expected);
    });

    describe("interface-datastore", () => {
        const dir = util.tmpdir();

        require("../interface")({
            setup: () => {
                return new FsDatastore(dir);
            },
            teardown: () => {
                return rimraf(dir);
            }
        });
    });

    describe("interface-datastore (sharding(fs))", () => {
        const dir = util.tmpdir();

        require("../interface")({
            setup: () => {
                const shard = new sh.NextToLast(2);
                return ShardingDatastore.createOrOpen(new FsDatastore(dir), shard);
            },
            teardown: () => {
                return rimraf(dir);
            }
        });
    });

    it("can survive concurrent writes", async () => {
        const dir = util.tmpdir();
        const fstore = new FsDatastore(dir);
        const key = new Key("CIQGFTQ7FSI2COUXWWLOQ45VUM2GUZCGAXLWCTOKKPGTUWPXHBNIVOY");
        const value = Buffer.from("Hello world");

        await Promise.all(
            new Array(100).fill(0).map(() => fstore.put(key, value))
        );

        const res = await fstore.get(key);

        expect(res).to.deep.equal(value);
    });
});
