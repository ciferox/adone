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
            await adone.fs.mkdirp(fixture);
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

        if (!is.windows) {
            it("meow async", async () => {
                assert.true(await adone.fs.isExecutable(meow));
            });
        }

        it("fail async", async () => {
            assert.false(await adone.fs.isExecutable(fail));
        });

        it("noent async", async () => {
            const err = await assert.throws(async () => adone.fs.isExecutable(noent));
            assert.instanceOf(err, Error);
        });

        it("noent ignore async", async () => {
            await assert.doesNotThrow(async () => adone.fs.isExecutable(noent, { ignoreErrors: true }));
        });

        const runTest = async (options) => {

            const optionsIgnore = Object.create(options || {});
            optionsIgnore.ignoreErrors = true;

            if (!options || !options.skipFail) {
                assert.notOk(adone.fs.isExecutableSync(fail, options));
            }
            assert.notOk(adone.fs.isExecutableSync(noent, optionsIgnore));
            if (!options) {
                assert.ok(adone.fs.isExecutableSync(meow));
            } else {
                assert.ok(adone.fs.isExecutableSync(meow, options));
            }

            assert.ok(adone.fs.isExecutableSync(mine, options));
            assert.ok(adone.fs.isExecutableSync(ours, options));
            assert.throws(() => adone.fs.isExecutableSync(noent, options));

            if (!options) {
                assert.true(await adone.fs.isExecutable(meow));
            } else {
                assert.true(await adone.fs.isExecutable(meow, options));
            }

            assert.true(await adone.fs.isExecutable(mine, options));

            assert.true(await adone.fs.isExecutable(ours, options));

            if (!options || !options.skipFail) {
                assert.false(await adone.fs.isExecutable(fail, options));
            }

            await assert.throws(async () => adone.fs.isExecutable(noent, options));

            assert.false(await adone.fs.isExecutable(noent, optionsIgnore));

            assert.false(await adone.fs.isExecutable(__dirname, options));
        };

        if (!is.windows) {
            it("access", async () => {
                await runTest();
            });

            it("mode", async () => {
                // delete fs.access;
                // delete fs.accessSync;
                assert.true(adone.fs.isExecutableSync(ours, { uid: 0, gid: 0 }));
                assert.true(adone.fs.isExecutableSync(mine, { uid: 0, gid: 0 }));
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

