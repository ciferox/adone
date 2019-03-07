const {
    fs: { writeFileAtomic: adoneWriteFileAtomic },
    std: { os: { tmpdir }, path: { join } }
} = adone;

const writeFileAtomic = require("write-file-atomic");
const fastWriteAtomic = require("fast-write-atomic");

const dest = join(tmpdir(), "dest");
const file = Buffer.allocUnsafe(1024 * 1024); // 1MB

export default {
    writeFileAtomic: [(defer) => {
        writeFileAtomic(dest, file, () => {
            defer.resolve();
        });
    }, { defer: true }],
    fastWriteAtomic: [(defer) => {
        fastWriteAtomic(dest, file, () => {
            defer.resolve();
        });
    }, { defer: true }],
    adoneWriteFileAtomic: [(defer) => {
        adoneWriteFileAtomic(dest, file, () => {
            defer.resolve();
        });
    }, { defer: true }]
};
