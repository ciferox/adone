const {
    stream: { pull },
    datastore: { Key, backend: { Memory }, wrapper: { Keytransform } }
} = adone;

describe("datastore", "wrapper", "KeyTransform", () => {
    it("basic", async () => {
        const mStore = new Memory();
        const transform = {
            convert(key) {
                return new Key("/abc").child(key);
            },
            invert(key) {
                const l = key.list();
                if (l[0] !== "abc") {
                    throw new Error("missing prefix, convert failed?");
                }
                return Key.withNamespaces(l.slice(1));
            }
        };

        const kStore = new Keytransform(mStore, transform);
        await kStore.open();

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
            promises.push(kStore.put(k, Buffer.from(k.toString())));
        }

        await Promise.all(promises);

        promises.length = 0;
        for (const k of keys) {
            promises.push(kStore.get(k));
            promises.push(mStore.get(new Key("abc").child(k)));
        }

        let res = await Promise.all(promises);
        expect(res[0]).to.eql(res[1]);

        res = await Promise.all([
            new Promise(async (resolve, reject) => {
                pull(await mStore.query({}), pull.collect((err, result) => err ? reject(err) : resolve(result)));
            }),
            new Promise(async (resolve, reject) => {
                pull(await kStore.query({}), pull.collect((err, result) => err ? reject(err) : resolve(result)));
            })
        ]);

        expect(res[0]).to.have.length(res[1].length);

        res[0].forEach((a, i) => {
            const kA = a.key;
            const kB = res[1][i].key;
            expect(transform.invert(kA)).to.eql(kB);
            expect(kA).to.eql(transform.convert(kB));
        });
        await kStore.close();
    });
});
