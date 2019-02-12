const BUFFERS = false;

const testCommon = require("./common");
const crypto = require("crypto");

const {
    is
} = adone;

let putCount = 0;
let getCount = 0;
let rssBase;
let db;

const run = function () {
    let key = `long key to test memory usage ${String(Math.floor(Math.random() * 10000000))}`;

    if (BUFFERS) {
        key = Buffer.from(key);
    }

    db.get(key, (err, value) => {
        getCount++;

        if (err) {
            let putValue = crypto.randomBytes(1024);
            if (!BUFFERS) {
                putValue = putValue.toString("hex");
            }

            return db.put(key, putValue, () => {
                putCount++;
                process.nextTick(run);
            });
        }

        process.nextTick(run);
    });

    if (getCount % 1000 === 0) {
        if (!is.undefined(global.gc)) {
            global.gc();
        }
        console.log("getCount =", getCount, ", putCount = ", putCount, ", rss =",
            `${Math.round(process.memoryUsage().rss / rssBase * 100)}%`,
            `${Math.round(process.memoryUsage().rss / 1024 / 1024)}M`,
            JSON.stringify([0, 1, 2, 3, 4, 5, 6].map((l) => {
                return db.getProperty(`leveldb.num-files-at-level${l}`);
            })));
    }
}

db = testCommon.factory();
db.open(() => {
    rssBase = process.memoryUsage().rss;
    run();
});
