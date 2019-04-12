const {
    std: { path, fs }
} = adone;

const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const pathKey = require("path-key")();
const { isMethodSync, isForceShell, run, methods } = require("./run");

const isWin = process.platform === "win32";

describe("process", "spawn", () => {

    methods.forEach((method) => {
        describe(method, function () {
            this.timeout(10000);

            const originalPathEnv = process.env[pathKey];

            before(() => mkdirp.sync(`${__dirname}/tmp`));

            after(() => rimraf.sync(`${__dirname}/tmp`));

            afterEach(() => {
                // jest.restoreAllMocks();

                process.env[pathKey] = originalPathEnv;
            });

            it("should expand using PATHEXT properly", async () => {
                const { stdout } = await run(method, `${__dirname}/fixtures/say-foo`);

                expect(stdout.trim()).to.be.equal("foo");
            });

            it("should support shebang in executables with `/usr/bin/env`", async () => {
                const { stdout: stdout1 } = await run(method, `${__dirname}/fixtures/shebang`);

                expect(stdout1).to.be.equal("shebang works!");

                // Test if the actual shebang file is resolved against the options.env.PATH
                const { stdout: stdout2 } = await run(method, "shebang", {
                    env: {
                        ...process.env,
                        [pathKey]: path.normalize(`${__dirname}/fixtures`) + path.delimiter + process.env[pathKey]
                    }
                });

                expect(stdout2).to.be.equal("shebang works!");

                // Test if the actual shebang file is resolved against the process.env.PATH
                process.env[pathKey] = path.normalize(`${__dirname}/fixtures`) + path.delimiter + process.env[pathKey];

                const { stdout: stdout3 } = await run(method, "shebang");

                expect(stdout3).to.be.equal("shebang works!");
            });

            it("should handle commands with special shell chars", async () => {
                fs.writeFileSync(
                    `${__dirname}/fixtures/()%!^&;, `,
                    fs.readFileSync(`${__dirname}/fixtures/pre_()%!^&;, .sh`),
                    { mode: 0o0777 }
                );
                fs.writeFileSync(
                    `${__dirname}/fixtures/()%!^&;, .bat`,
                    fs.readFileSync(`${__dirname}/fixtures/pre_()%!^&;, .bat`)
                );

                const { stdout } = await run(method, `${__dirname}/fixtures/()%!^&;, `);

                expect(stdout.trim()).to.be.equal("special");
            });

            it("should handle empty arguments and arguments with spaces", async () => {
                const { stdout } = await run(method, "node", [
                    `${__dirname}/fixtures/echo`,
                    "foo",
                    "",
                    "bar",
                    "André Cruz"
                ]);

                expect(stdout).to.be.equal("foo\n\nbar\nAndré Cruz");
            });

            it("should handle non-string arguments", async () => {
                const { stdout } = await run(method, "node", [
                    `${__dirname}/fixtures/echo`,
                    1234
                ]);

                expect(stdout).to.be.equal("1234");
            });

            it("should handle arguments with shell special chars", async () => {
                const args = [
                    "foo",
                    "()",
                    "foo",
                    "[]",
                    "foo",
                    "%!",
                    "foo",
                    "^<",
                    "foo",
                    ">&",
                    "foo",
                    "|;",
                    "foo",
                    ", ",
                    "foo",
                    "!=",
                    "foo",
                    "\\*",
                    "foo",
                    '"f"',
                    "foo",
                    "?.",
                    "foo",
                    "=`",
                    "foo",
                    "'",
                    "foo",
                    '\\"',
                    "bar\\",
                    // See https://github.com/IndigoUnited/node-cross-spawn/issues/82
                    '"foo|bar>baz"',
                    '"(foo|bar>baz|foz)"'
                ];

                const { stdout } = await run(method, "node", [`${__dirname}/fixtures/echo`].concat(args));

                expect(stdout).to.be.equal(args.join("\n"));
            });

            it("should double escape when executing `node_modules/.bin/<file>.cmd`", {
                skip: !isWin
            }, async () => {
                mkdirp.sync(`${__dirname}/fixtures/node_modules/.bin`);
                fs.writeFileSync(`${__dirname}/fixtures/node_modules/.bin/echo-cmd-shim.cmd`,
                    fs.readFileSync(`${__dirname}/fixtures/echo-cmd-shim.cmd`));

                const arg = '"(foo|bar>baz|foz)"';

                const { stdout } = await run(method, `${__dirname}/fixtures/node_modules/.bin/echo-cmd-shim`, [arg]);

                expect(stdout).to.be.equal(arg);
            });

            it("should handle commands with names of environment variables", async () => {
                const { stdout } = await run(method, `${__dirname}/fixtures/%CD%`);

                expect(stdout.trim()).to.be.equal("special");
            });

            it("should handle optional spawn optional arguments correctly", async () => {
                const { stdout: stdout1 } = await run(method, `${__dirname}/fixtures/say-foo`);

                expect(stdout1.trim()).to.be.equal("foo");

                const { stdout: stdout2 } = await run(method, `${__dirname}/fixtures/say-foo`, { stdio: "ignore" });

                expect(stdout2).to.be.equal(null);

                const { stdout: stdout3 } = await run(method, `${__dirname}/fixtures/say-foo`, null, { stdio: "ignore" });

                expect(stdout3).to.be.equal(null);
            });

            it("should not mutate args nor options", async () => {
                const args = [];
                const options = {};

                await run(method, `${__dirname}/fixtures/say-foo`, args, options);

                expect(args).to.eql([]);
                expect(options).to.eql({});
            });

            it("should give correct exit code", async () => {
                try {
                    await run(method, "node", [`${__dirname}/fixtures/exit-25`]);
                } catch (err) {
                    expect(err.exitCode).to.be.equal(25);
                    return;
                }
                assert.fail("should be thrown");
            });

            it("should work with a relative posix path to a command", async () => {
                const relativeFixturesPath = path.relative(process.cwd(), `${__dirname}/fixtures`).replace(/\\/, "/");

                const { stdout: stdout1 } = await run(method, `${relativeFixturesPath}/say-foo`);

                expect(stdout1.trim()).to.be.equal("foo");

                const { stdout: stdout2 } = await run(method, `./${relativeFixturesPath}/say-foo`);

                expect(stdout2.trim()).to.be.equal("foo");

                if (!isWin) {
                    return;
                }

                const { stdout: stdout3 } = await run(method, `./${relativeFixturesPath}/say-foo.bat`);

                expect(stdout3.trim()).to.be.equal("foo");
            });

            it("should work with a relative posix path to a command with a custom `cwd`", async () => {
                const relativeTestPath = path.relative(process.cwd(), __dirname).replace(/\\/, "/");

                const { stdout: stdout1 } = await run(method, "fixtures/say-foo", { cwd: relativeTestPath });

                expect(stdout1.trim()).to.be.equal("foo");

                const { stdout: stdout2 } = await run(method, "./fixtures/say-foo", { cwd: `./${relativeTestPath}` });

                expect(stdout2.trim()).to.be.equal("foo");

                if (!isWin) {
                    return;
                }

                const { stdout: stdout3 } = await run(method, "./fixtures/say-foo.bat", { cwd: `./${relativeTestPath}` });

                expect(stdout3.trim()).to.be.equal("foo");
            });

            {
                const assertError = (err) => {
                    const syscall = isMethodSync(method) ? "spawnSync" : "spawn";

                    expect(err.message).to.include(syscall);
                    expect(err.message).to.include("ENOENT");
                    expect(err.message).not.to.include("undefined");
                    expect(err.code).to.be.equal("ENOENT");
                    expect(err.errno).to.be.equal("ENOENT");
                    expect(err.syscall).to.include(syscall);
                    expect(err.syscall).not.to.include("undefined");
                    expect(err.path).to.include("somecommandthatwillneverexist");
                    expect(err.spawnargs).to.eql(["foo"]);
                };

                if (isMethodSync(method)) {
                    it("should fail with ENOENT if the command does not exist", () => {
                        try {
                            run(method, "somecommandthatwillneverexist", ["foo"]);
                        } catch (err) {
                            assertError(err);
                            return;
                        }
                        assert.fail("should be thrown");
                    });
                } else {
                    it("should emit `error` and `close` if command does not exist", async (done) => {
                        await new Promise((resolve, reject) => {
                            const promise = run(method, "somecommandthatwillneverexist", ["foo"]);
                            const { cp } = promise;

                            promise.catch(() => { });

                            let timeout;

                            cp
                                .on("error", assertError)
                                .on("exit", () => {
                                    cp.removeAllListeners();
                                    clearTimeout(timeout);
                                    reject(new Error("Should not emit exit"));
                                })
                                .on("close", (code, signal) => {
                                    expect(code).not.to.be.equal(0);
                                    expect(signal).to.be.equal(null);
                                    done();

                                    timeout = setTimeout(resolve, 1000);
                                });
                        });
                    });
                }
            }

            if (isMethodSync(method)) {
                it("should NOT fail with ENOENT if the command actual exists but exited with 1", () => {
                    try {
                        run(method, `${__dirname}/fixtures/exit-1`);
                    } catch (err) {
                        expect(err.code).not.to.be.equal("ENOENT");
                        return;
                    }
                    assert.fail("should be thrown");
                });
            } else {
                it.todo("should NOT emit `error` if the command actual exists but exited with 1", async (done) => {
                    await new Promise((resolve, reject) => {
                        const promise = run(method, `${__dirname}/fixtures/exit-1`);
                        const { cp } = promise;

                        promise.catch(() => { });

                        const onExit = jest.fn(() => { });
                        let timeout;

                        cp
                            .on("error", () => {
                                cp.removeAllListeners();
                                clearTimeout(timeout);
                                reject(new Error("Should not emit error"));
                            })
                            .on("exit", onExit)
                            .on("close", (code, signal) => {
                                expect(code).to.be.equal(1);
                                expect(signal).to.be.equal(null);
                                expect(onExit).toHaveBeenCalledTimes(1);
                                expect(onExit).toHaveBeenCalledWith(1, null);

                                done();

                                timeout = setTimeout(resolve, 1000);
                            });
                    });
                });
            }

            if (isMethodSync(method)) {
                it("should NOT fail with ENOENT if shebang command does not exist", () => {
                    try {
                        run(method, `${__dirname}/fixtures/shebang-enoent`);
                    } catch (err) {
                        expect(err.code).not.to.be.equal("ENOENT");
                        return;
                    }
                    assert.fail("should be thrown");
                });
            } else {
                it.todo("should NOT emit `error` if shebang command does not exist", async (done) => {
                    await new Promise((resolve, reject) => {
                        const promise = run(method, `${__dirname}/fixtures/shebang-enoent`);
                        const { cp } = promise;

                        promise.catch(() => { });

                        const onExit = jest.fn(() => { });
                        let timeout;

                        cp
                            .on("error", () => {
                                cp.removeAllListeners();
                                clearTimeout(timeout);
                                reject(new Error("Should not emit error"));
                            })
                            .on("exit", onExit)
                            .on("close", (code, signal) => {
                                expect(code).not.to.be.equal(0);
                                expect(signal).to.be.equal(null);
                                expect(onExit).toHaveBeenCalledTimes(1);
                                expect(onExit).not.toHaveBeenCalledWith(0, null);
                                done();

                                timeout = setTimeout(resolve, 1000);
                            });
                    });
                });
            }

            if (isMethodSync(method)) {
                it("should fail with ENOENT a non-existing `cwd` was specified", () => {
                    try {
                        run(method, "fixtures/say-foo", { cwd: "somedirthatwillneverexist" });
                    } catch (err) {
                        expect(err.code).to.be.equal("ENOENT");
                        return;
                    }
                    assert.fail("should be thrown");
                });
            } else {
                it("should emit `error` and `close` if a non-existing `cwd` was specified", async (done) => {
                    await new Promise((resolve, reject) => {
                        const promise = run(method, "somecommandthatwillneverexist", ["foo"]);
                        const { cp } = promise;

                        promise.catch(() => { });

                        let timeout;

                        cp
                            .on("error", (err) => expect(err.code).to.be.equal("ENOENT"))
                            .on("exit", () => {
                                cp.removeAllListeners();
                                clearTimeout(timeout);
                                reject(new Error("Should not emit exit"));
                            })
                            .on("close", (code, signal) => {
                                expect(code).not.to.be.equal(0);
                                expect(signal).to.be.equal(null);
                                done();

                                timeout = setTimeout(resolve, 1000);
                            });
                    });
                });
            }

            if (isWin) {
                it("should use nodejs' spawn when options.shell is specified (windows)", async () => {
                    const { stdout } = await run(method, "echo", ["%RANDOM%"], { shell: true });

                    expect(stdout.trim()).toMatch(/\d+/);
                });
            } else {
                it("should use nodejs' spawn when options.shell is specified (linux)", async () => {
                    const { stdout } = await run(method, "echo", ["hello &&", "echo there"], { shell: true });

                    expect(stdout.trim()).to.eql("hello\nthere");
                });
            }

            if (isWin && !isForceShell(method)) {
                it("should NOT spawn a shell for a .exe", async () => {
                    const { stdout } = await run(method, `${__dirname}/fixtures/win-ppid.js`);

                    expect(Number(stdout.trim())).to.be.equal(process.pid);
                });
            }
        });
    });
});
