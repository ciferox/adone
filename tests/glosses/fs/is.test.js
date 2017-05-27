const { is, std: { fs, path } } = adone;
const fixture = path.resolve(__dirname, "is_fixtures");
const meow = `${fixture}/meow.cat`;
const mine = `${fixture}/mine.cat`;
const ours = `${fixture}/ours.cat`;
const fail = `${fixture}/fail.false`;
const noent = `${fixture}/enoent.exe`;

describe("fs", "is", () => {
    describe("executable", () => {
        before(async () => {
            await adone.fs.rm(fixture);
            await adone.fs.mkdir(fixture);
            fs.writeFileSync(meow, "#!/usr/bin/env cat\nmeow\n");
            fs.chmodSync(meow, parseInt("0755", 8));
            fs.writeFileSync(fail, "#!/usr/bin/env false\n");
            fs.chmodSync(fail, parseInt("0644", 8));
            fs.writeFileSync(mine, "#!/usr/bin/env cat\nmine\n");
            fs.chmodSync(mine, parseInt("0744", 8));
            fs.writeFileSync(ours, "#!/usr/bin/env cat\nours\n");
            fs.chmodSync(ours, parseInt("0754", 8));
        });

        after(async () => {
            await adone.fs.rm(fixture);
        });

        it("meow async", async () => {
            assert.isTrue(await adone.fs.is.executable(meow));
        });

        it("fail async", async () => {
            assert.isFalse(await adone.fs.is.executable(fail));
        });

        it("noent async", async () => {
            const err = await assert.throws(async () => adone.fs.is.executable(noent));
            assert.instanceOf(err, Error);
        });

        it("noent ignore async", async () => {
            await assert.doesNotThrow(async () => adone.fs.is.executable(noent, { ignoreErrors: true }));
        });

        const runTest = async (options) => {

            const optionsIgnore = Object.create(options || {});
            optionsIgnore.ignoreErrors = true;

            if (!options || !options.skipFail) {
                assert.isNotOk(adone.fs.is.executableSync(fail, options));
            }
            assert.isNotOk(adone.fs.is.executableSync(noent, optionsIgnore));
            if (!options) {
                assert.isOk(adone.fs.is.executableSync(meow));
            } else {
                assert.isOk(adone.fs.is.executableSync(meow, options));
            }

            assert.isOk(adone.fs.is.executableSync(mine, options));
            assert.isOk(adone.fs.is.executableSync(ours, options));
            assert.throws(() => adone.fs.is.executableSync(noent, options));

            if (!options) {
                assert.isTrue(await adone.fs.is.executable(meow));
            } else {
                assert.isTrue(await adone.fs.is.executable(meow, options));
            }

            assert.isTrue(await adone.fs.is.executable(mine, options));

            assert.isTrue(await adone.fs.is.executable(ours, options));

            if (!options || !options.skipFail) {
                assert.isFalse(await adone.fs.is.executable(fail, options));
            }

            await assert.throws(async () => adone.fs.is.executable(noent, options));

            assert.isFalse(await adone.fs.is.executable(noent, optionsIgnore));

            assert.isFalse(await adone.fs.is.executable(__dirname, options));
        };

        if (!is.windows) {
            it("access", async () => {
                await runTest();
            });

            it("mode", async () => {
                // delete fs.access;
                // delete fs.accessSync;
                assert.isTrue(adone.fs.is.executableSync(ours, { uid: 0, gid: 0 }));
                assert.isTrue(adone.fs.is.executableSync(mine, { uid: 0, gid: 0 }));
                await runTest();
            });
        } else {
            describe("windows", () => {
                const pathExt = ".EXE;.CAT;.CMD;.COM";
                it("pathExt option", async () => {
                    await runTest({ pathExt: ".EXE;.CAT;.CMD;.COM" });
                });
                
                it("pathExt env", async () => {
                    process.env.PATHEXT = pathExt;
                    await runTest();
                });
                
                it("no pathExt", async () => {
                    // with a pathExt of '', any filename is fine.
                    // so the "fail" one would still pass.
                    await runTest({ pathExt: "", skipFail: true });
                });

                it("pathext with empty entry", async () => {
                    // with a pathExt of '', any filename is fine.
                    // so the "fail" one would still pass.
                    await runTest({ pathExt: `;${pathExt}`, skipFail: true });
                });
            });
        }
    });
});

