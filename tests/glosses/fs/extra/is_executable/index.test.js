const {
    is,
    fs,
    path
} = adone;
const fixture = path.resolve(__dirname, "is_fixtures");
const meow = `${fixture}/meow.cat`;
const mine = `${fixture}/mine.cat`;
const ours = `${fixture}/ours.cat`;
const fail = `${fixture}/fail.false`;
const noent = `${fixture}/enoent.exe`;

describe("fs", "isExecutable", () => {
    before(async () => {
        await fs.remove(fixture);
        await fs.mkdirp(fixture);
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
        await fs.remove(fixture);
    });

    if (!is.windows) {
        it("meow async", async () => {
            assert.isTrue(await fs.isExecutable(meow));
        });
    }

    it("fail async", async () => {
        assert.isFalse(await fs.isExecutable(fail));
    });

    it("noent async", async () => {
        const err = await assert.throws(async () => fs.isExecutable(noent));
        assert.instanceOf(err, Error);
    });

    it("noent ignore async", async () => {
        await assert.doesNotThrow(async () => fs.isExecutable(noent, { ignoreErrors: true }));
    });

    const runTest = async (options) => {

        const optionsIgnore = Object.create(options || {});
        optionsIgnore.ignoreErrors = true;

        if (!options || !options.skipFail) {
            assert.notOk(fs.isExecutableSync(fail, options));
        }
        assert.notOk(fs.isExecutableSync(noent, optionsIgnore));
        if (!options) {
            assert.ok(fs.isExecutableSync(meow));
        } else {
            assert.ok(fs.isExecutableSync(meow, options));
        }

        assert.ok(fs.isExecutableSync(mine, options));
        assert.ok(fs.isExecutableSync(ours, options));
        assert.throws(() => fs.isExecutableSync(noent, options));

        if (!options) {
            assert.isTrue(await fs.isExecutable(meow));
        } else {
            assert.isTrue(await fs.isExecutable(meow, options));
        }

        assert.isTrue(await fs.isExecutable(mine, options));

        assert.isTrue(await fs.isExecutable(ours, options));

        if (!options || !options.skipFail) {
            assert.isFalse(await fs.isExecutable(fail, options));
        }

        await assert.throws(async () => fs.isExecutable(noent, options));

        assert.isFalse(await fs.isExecutable(noent, optionsIgnore));

        assert.isFalse(await fs.isExecutable(__dirname, options));
    };

    if (!is.windows) {
        it("access", async () => {
            await runTest();
        });

        it("mode", async () => {
            // delete fs.access;
            // delete fs.accessSync;
            assert.isTrue(fs.isExecutableSync(ours, { uid: 0, gid: 0 }));
            assert.isTrue(fs.isExecutableSync(mine, { uid: 0, gid: 0 }));
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

