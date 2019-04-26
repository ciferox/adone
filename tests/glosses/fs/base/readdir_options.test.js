const realFs = adone.std.fs;

describe("readdir-options", () => {
    const strings = ["b", "z", "a"];
    const buffs = strings.map((s) => {
        return Buffer.from(s);
    });
    const hexes = buffs.map((b) => {
        return b.toString("hex");
    });

    const getRet = (encoding) => {
        switch (encoding) {
            case "hex":
                return hexes;
            case "buffer":
                return buffs;
            default:
                return strings;
        }
    };

    const encodings = ["buffer", "hex", "utf8", null];
    encodings.forEach((enc) => {
        it(`encoding=${enc}`, (done) => {
            let failed = false;
            const readdir = realFs.readdir;
            realFs.readdir = function (path, options, cb) {
                if (!failed) {
                    // simulate an EMFILE and then open and close a thing to retry
                    failed = true;
                    process.nextTick(() => {
                        const er = new Error("synthetic emfile");
                        er.code = "EMFILE";
                        cb(er);
                        process.nextTick(() => {
                            adone.fs2.base.closeSync(realFs.openSync(__filename, "r"));
                        });
                    });
                    return;
                }

                failed = false;
                assert.isTrue(typeof cb === "function");
                assert.isTrue(typeof options === "object");
                assert.ok(options);
                process.nextTick(() => {
                    const ret = getRet(options.encoding);
                    cb(null, ret);
                });
            };
            adone.fs2.base.readdir("whatevers", { encoding: enc }, (er, files) => {
                assert.notExists(er);
                assert.deepEqual(files, getRet(enc).sort());
                realFs.readdir = readdir;
                done();
            });
        });
    });
});
