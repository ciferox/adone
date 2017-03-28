const { levelup } = adone.database;
const refute = require("referee").refute;
const MemDOWN = require("memdown");

require("./common");

describe("LevelDOWN Substitution", () => {
    it("test substitution of LevelDOWN with MemDOWN", (done) => {
        const md = new MemDOWN("foo");
        const db =
            levelup("/somewhere/not/writable/booya!", {
                db() {
                    return md;
                }
            });
        const entries = [];
        const expected = [
            { key: "a", value: "A" }
            , { key: "b", value: "B" }
            , { key: "c", value: "C" }
            , { key: "d", value: "D" }
            , { key: "e", value: "E" }
            , { key: "f", value: "F" }
            , { key: "i", value: "I" }
        ];

        db.put("f", "F");
        db.put("h", "H");
        db.put("i", "I");
        db.put("a", "A");
        db.put("c", "C");
        db.put("e", "E");
        db.del("g");
        db.batch([
            { type: "put", key: "d", value: "D" }
            , { type: "del", key: "h" }
            , { type: "put", key: "b", value: "B" }
        ]);

        db.createReadStream()
            .on("data", (data) => {
                entries.push(data);
            })
            .on("error", (err) => {
                refute(err, "readStream emitted an error");
            })
            .on("close", () => {
                assert.deepEqual(entries, expected, "correct entries");
                assert.deepEqual(
                    md._store.$foo.keys
                    , expected.map((e) => {
                        return e.key;
                    })
                    , "memdown has the entries"
                );
                done();
            });
    });
});
