const {
    datastore: { ShardingDatastore, backend: { MemoryDatastore }, interface: { Key }, shard: sh }
} = adone;

describe("datastore", "core", "ShardingDatastore", () => {
    it("create", async () => {
        const ms = new MemoryDatastore();
        const shard = new sh.NextToLast(2);
        await ShardingDatastore.create(ms, shard);
        const res = await Promise.all([ms.get(new Key(sh.SHARDING_FN)), ms.get(new Key(sh.README_FN))]);
        expect(res[0].toString()).to.eql(`${shard.toString()}\n`);
        expect(res[1].toString()).to.eql(sh.readme);
    });

    it("open - empty", async () => {
        const ms = new MemoryDatastore();
        try {
            await ShardingDatastore.open(ms);
            assert(false, "Failed to throw error on ShardStore.open");
        } catch (err) {
            expect(err.code).to.equal("ERR_NOT_FOUND");
        }
    });

    it("open - existing", async () => {
        const ms = new MemoryDatastore();
        const shard = new sh.NextToLast(2);

        await ShardingDatastore.create(ms, shard);
        await ShardingDatastore.open(ms);
    });

    it("basics", async () => {
        const ms = new MemoryDatastore();
        const shard = new sh.NextToLast(2);
        const store = await ShardingDatastore.createOrOpen(ms, shard);
        expect(store).to.exist();
        await ShardingDatastore.createOrOpen(ms, shard);
        await store.put(new Key("hello"), Buffer.from("test"));
        const res = await ms.get(new Key("ll").child(new Key("hello")));
        expect(res).to.eql(Buffer.from("test"));
    });

    describe("interface", () => {
        require("../backends/interface")({
            setup() {
                const shard = new sh.NextToLast(2);
                return ShardingDatastore.createOrOpen(new MemoryDatastore(), shard);
            },
            teardown() { }
        });
    });
});
