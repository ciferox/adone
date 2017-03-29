import Manager from "./common";
const { backend: { Memory } } = adone.database.level;

describe("Backend substitution", () => {
    it("test substitution of default backend with memory", async (done) => {
        const md = new Memory("foo");
        const db = await Manager.open("/somewhere/not/writable/booya!", {
            db() {
                return md;
            }
        });
        const entries = [];
        const expected = [
            { key: "a", value: "A" },
            { key: "b", value: "B" },
            { key: "c", value: "C" },
            { key: "d", value: "D" },
            { key: "e", value: "E" },
            { key: "f", value: "F" },
            { key: "i", value: "I" }
        ];

        await db.put("f", "F");
        await db.put("h", "H");
        await db.put("i", "I");
        await db.put("a", "A");
        await db.put("c", "C");
        await db.put("e", "E");
        await db.del("g");
        await db.batch([
            { type: "put", key: "d", value: "D" },
            { type: "del", key: "h" },
            { type: "put", key: "b", value: "B" }
        ]);
        db.createReadStream().on("data", (data) => {
            entries.push(data);
        }).on("error", (err) => {
            assert(!err);
        }).on("close", () => {
            assert.deepEqual(entries, expected, "correct entries");
            assert.deepEqual(md._store.$foo.keys, expected.map((e) => {
                return e.key;
            }), "memdown has the entries");
            done();
        });
    });
});
