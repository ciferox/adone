const {
    datastore: { Key, backend: { Memory }, wrapper: { Sharding }, shard }
} = adone;

describe("datastore", "wrapper", "Sharding", () => {
    it("create", async () => {
        const ms = new Memory();
        const sh = new shard.NextToLast(2);

        await Sharding.create(ms, sh);

        const res = await Promise.all([
            ms.get(new Key(shard.SHARDING_FN)),
            ms.get(new Key(shard.README_FN))
        ]);

        expect(
            res[0].toString()
        ).to.eql(`${sh.toString()}\n`);
        expect(
            res[1].toString()
        ).to.eql(shard.readme);
    });

    it("open - empty", async () => {
        const ms = new Memory();

        await assert.throws(async () => Sharding.open(ms));
    });

    it("open - existing", async () => {
        const ms = new Memory();
        const sh = new shard.NextToLast(2);

        await Sharding.create(ms, sh);
        await Sharding.open(ms);
    });

    it("basics", async () => {
        const ms = new Memory();
        const sh = new shard.NextToLast(2);
        const store = await Sharding.createOrOpen(ms, sh);

        await store.put(new Key("hello"), Buffer.from("test"));
        const res = await ms.get(new Key("ll").child(new Key("hello")));
        expect(res).to.eql(Buffer.from("test"));
    });

    describe("interface", () => {
        require("../interface")({
            async setup() {
                const sh = new shard.NextToLast(2);
                return Sharding.createOrOpen(new Memory(), sh);
            },
            teardown() {
            }
        });
    });
});
