const series = require("async/series");
const parallel = require("async/parallel");

const {
    datastore: { Key, backend: { Memory }, wrapper: { Tiered } }
} = adone;

describe("datastore", "wrapper", "Tiered", () => {
    describe("all stores", () => {
        const ms = [];
        let store;
        beforeEach(async () => {
            ms.push(new Memory());
            ms.push(new Memory());
            store = new Tiered(ms);
            await store.open();
        });

        it("put", async () => {
            const k = new Key("hello");
            const v = Buffer.from("world");
            await store.put(k, v);
            const res = await Promise.all([
                ms[0].get(k),
                ms[1].get(k)
            ]);
            res.forEach((val) => {
                expect(val).to.be.eql(v);
            });
        });

        it("get and has, where available", async () => {
            const k = new Key("hello");
            const v = Buffer.from("world");

            await ms[1].put(k, v);

            const val = await store.get(k);
            expect(val).to.be.eql(v);

            const exists = await store.has(k);
            expect(exists).to.be.eql(true);
        });

        it("has and delete", async () => {
            const k = new Key("hello");
            const v = Buffer.from("world");

            await store.put(k, v);

            let res = await Promise.all([
                ms[0].has(k),
                ms[1].has(k)
            ]);
            expect(res).to.be.eql([true, true]);
            await store.delete(k);

            res = await Promise.all([
                ms[0].has(k),
                ms[1].has(k)
            ]);
            expect(res).to.be.eql([false, false]);
        });
    });

    describe("inteface", () => {
        require("../interface")({
            async setup() {
                const ds = new Tiered([
                    new Memory(),
                    new Memory()
                ]);
                await ds.open();
                return ds;
            },
            teardown() {
            }
        });
    });
});
