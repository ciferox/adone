const {
    stream: { pull },
    datastore: { Key, backend: { Memory }, wrapper: { Mount } }
} = adone;

describe("datastore", "wrapper", "Mount", () => {
    it("put - no mount", async () => {
        const m = new Mount([]);
        await m.open();

        await assert.throws(async () => m.put(new Key("hello"), Buffer.from("foo")));
    });

    it("put - wrong mount", async () => {
        const m = new Mount([{
            datastore: new Memory(),
            prefix: new Key("cool")
        }]);
        await m.open();
        await assert.throws(async () => m.put(new Key("/fail/hello"), Buffer.from("foo")));
    });

    it("put", async () => {
        const mds = new Memory();
        const m = new Mount([{
            datastore: mds,
            prefix: new Key("cool")
        }]);
        await m.open();

        const val = Buffer.from("hello");
        await m.put(new Key("/cool/hello"), val);
        const res = await mds.get(new Key("/hello"));
        expect(res).to.eql(val);
    });

    it("get", async () => {
        const mds = new Memory();
        const m = new Mount([{
            datastore: mds,
            prefix: new Key("cool")
        }]);
        await m.open();

        const val = Buffer.from("hello");
        await mds.put(new Key("/hello"), val);
        const res = await m.get(new Key("/cool/hello"));
        expect(res).to.eql(val);
    });

    it("has", async () => {
        const mds = new Memory();
        const m = new Mount([{
            datastore: mds,
            prefix: new Key("cool")
        }]);
        await m.open();

        const val = Buffer.from("hello");
        await mds.put(new Key("/hello"), val);
        const exists = await m.has(new Key("/cool/hello"));
        expect(exists).to.eql(true);
    });

    it("delete", async () => {
        const mds = new Memory();
        const m = new Mount([{
            datastore: mds,
            prefix: new Key("cool")
        }]);
        await m.open();

        const val = Buffer.from("hello");
        await m.put(new Key("/cool/hello"), val);
        await m.delete(new Key("/cool/hello"));
        let exists = await m.has(new Key("/cool/hello"));
        expect(exists).to.eql(false);

        exists = await mds.has(new Key("/hello"));
        expect(exists).to.eql(false);
    });

    it("query simple", async (done) => {
        const mds = new Memory();
        const m = new Mount([{
            datastore: mds,
            prefix: new Key("cool")
        }]);
        await m.open();

        const val = Buffer.from("hello");
        await m.put(new Key("/cool/hello"), val);
        pull(
            await m.query({ prefix: "/cool" }),
            pull.collect((err, res) => {
                assert.notExists(err);
                expect(res).to.eql([{
                    key: new Key("/cool/hello"),
                    value: val
                }]);
                done();
            })
        );
    });

    describe("interface", () => {
        require("../interface")({
            async setup() {
                const ds = new Mount([{
                    prefix: new Key("/a"),
                    datastore: new Memory()
                }, {
                    prefix: new Key("/z"),
                    datastore: new Memory()
                }, {
                    prefix: new Key("/q"),
                    datastore: new Memory()
                }]);
                await ds.open();
                return ds;
            },
            teardown() {
            }
        });
    });
});
