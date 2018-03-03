const {
    stream: { pull },
    datastore: { Key, backend: { Memory }, wrapper: { Namespace } }
} = adone;

describe("datastore", "wrapper", "KeyTransform", () => {
    const prefixes = [
        "abc",
        ""
    ];
    prefixes.forEach((prefix) => it(`basic '${prefix}'`, async () => {
        const mStore = new Memory();
        const store = new Namespace(mStore, new Key(prefix));
        await store.open();

        const keys = [
            "foo",
            "foo/bar",
            "foo/bar/baz",
            "foo/barb",
            "foo/bar/bazb",
            "foo/bar/baz/barb"
        ].map((s) => new Key(s));

        const promises = [];
        for (const k of keys) {
            promises.push(store.put(k, Buffer.from(k.toString())));
        }

        await Promise.all(promises);

        promises.length = 0;
        for (const k of keys) {
            promises.push(store.get(k));
            promises.push(mStore.get(new Key(prefix).child(k)));
        }

        let res = await Promise.all(promises);
        expect(res[0]).to.eql(res[1]);

        res = await Promise.all([
            new Promise(async (resolve, reject) => {
                pull(await mStore.query({}), pull.collect((err, result) => err ? reject(err) : resolve(result)));
            }),
            new Promise(async (resolve, reject) => {
                pull(await store.query({}), pull.collect((err, result) => err ? reject(err) : resolve(result)));
            })
        ]);
        expect(res[0]).to.have.length(res[1].length);

        res[0].forEach((a, i) => {
            const kA = a.key;
            const kB = res[1][i].key;
            expect(store.transform.invert(kA)).to.eql(kB);
            expect(kA).to.eql(store.transform.convert(kB));
        });
        await store.close();
    }));

    prefixes.forEach((prefix) => {
        describe(`interface: '${prefix}'`, () => {
            require("../interface")({
                async setup() {
                    const ds = new Namespace(new Memory(), new Key(prefix));
                    await ds.open();
                    return ds;
                },
                teardown() {
                }
            });
        });
    });
});
