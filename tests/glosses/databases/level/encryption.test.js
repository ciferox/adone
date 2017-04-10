const testCommon = require("./testCommon");

const newDB = (opts) => {
    opts = adone.vendor.lodash.defaults(opts, {
        location: testCommon.location(),
        keyEncoding: "binary",
        valueEncoding: "mpak"
    });

    return new adone.database.level.DB(opts);
};

describe("Database", "Level", "Encryption", () => {
    it("encrypt/decrypt", async () => {
        const passwordBased = {
            encryption: {
                iterations: 10000,
                password: "adone"
            }
        };

        const keyBased = {
            encryption: {
                key: adone.std.crypto.randomBytes(32)
            }
        };

        const encryptors = [
            passwordBased,
            keyBased
        ];

        for (const encryptionOpts of encryptors) {
            const db = newDB(encryptionOpts);
            const key = "ho";
            const val = { hey: "ho" };
            await db.open();
            await db.put(key, val);
            const v = await db.get(key);
            assert.deepEqual(v, val);
            await db.close();
        }
    });

    it("open/close", async () => {
        const location = testCommon.location();
        let db = newDB({
            location,
            db: adone.database.level.backend.Memory,
            encryption: {
                password: "enode"
            }
        });
        await db.open();
        const key = "ho";
        const val = { hey: "ho" };
        await db.put(key, val);
        await db.close();
        db = newDB({
            location,
            db: adone.database.level.backend.Memory,
            encryption: {
                password: "enode"
            }
        });
        await db.open();
        const val1 = await db.get(key);
        assert.deepEqual(val, val1);
    });

    // it("stream", (t) => {
    //     const db = newDB();
    //     const encrypted = encryption.toEncrypted(db, {
    //         key: crypto.randomBytes(32)
    //     });

    //     encrypted.put("hey", "ho", (err) => {
    //         if (err) {
    //             throw err
    //             ;
    //         }

    //         let data = [];
    //         encrypted.createValueStream()
    //             .on("data", data.push.bind(data))
    //             .on("end", () => {
    //                 assert.deepEqual(data, ["ho"]);
    //                 assert.end();
    //             });
    //     });
    // });
});
