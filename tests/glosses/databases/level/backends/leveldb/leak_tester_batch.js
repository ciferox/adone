const BUFFERS = false;
const CHAINED = false;

const testCommon = require("./common");
const crypto = require("crypto");
const assert = require("assert");

const {
    is
} = adone;

let writeCount = 0;
let rssBase;
let db;

const print = function () {
    if (writeCount % 100 === 0) {
        if (!is.undefined(global.gc)) {
            global.gc();
        }

        console.log(
            "writeCount =", writeCount, ", rss =",
            `${Math.round(process.memoryUsage().rss / rssBase * 100)}%`,
            `${Math.round(process.memoryUsage().rss / 1024 / 1024)}M`,
            JSON.stringify([0, 1, 2, 3, 4, 5, 6].map((l) => {
                return db.getProperty(`leveldb.num-files-at-level${l}`);
            }))
        );
    }
}

var run = CHAINED
    ? function () {
        const batch = db.batch();
        let i = 0;
        let key;
        let value;

        for (i = 0; i < 100; i++) {
            key = `long key to test memory usage ${String(Math.floor(Math.random() * 10000000))}`;
            if (BUFFERS) {
                key = Buffer.from(key);
            }
            value = crypto.randomBytes(1024);
            if (!BUFFERS) {
                value = value.toString("hex");
            }
            batch.put(key, value);
        }

        batch.write((err) => {
            assert(!err);
            process.nextTick(run);
        });

        writeCount++;

        print();
    }
    : function () {
        const batch = [];
        let i;
        let key;
        let value;

        for (i = 0; i < 100; i++) {
            key = `long key to test memory usage ${String(Math.floor(Math.random() * 10000000))}`;
            if (BUFFERS) {
                key = Buffer.from(key);
            }
            value = crypto.randomBytes(1024);
            if (!BUFFERS) {
                value = value.toString("hex");
            }
            batch.push({ type: "put", key, value });
        }

        db.batch(batch, (err) => {
            assert(!err);
            process.nextTick(run);
        });

        writeCount++;

        print();
    };

db = testCommon.factory();
db.open(() => {
    rssBase = process.memoryUsage().rss;
    run();
});
