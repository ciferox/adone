describe("process", "exec", () => {
    const {
        is,
        std: { stream, path, fs },
        process: { exists, exec, execSync, execStdout, execStderr, shell, shellSync, stdio, errname, errnameFallback }
    } = adone;

    const STDERR_STDOUT_REGEXP = /stderr[^]*stdout/; 
    const TIMEOUT_REGEXP = /timed out after/;

    const getExitRegExp = (exitMessage) => new RegExp(`failed with exit code ${exitMessage}`);

    const macro = (input, expected) => {
        if (expected instanceof Error) {
            assert.throws(() => stdio(input), expected.message);
            return;
        }

        const result = stdio(input);

        if (is.object(expected) && !is.null(expected)) {
            assert.deepEqual(result, expected);
        } else {
            assert.equal(result, expected);
        }
    };

    macro.title = (providedTitle, input) => providedTitle || adone.std.util.inspect(input, { colors: true });

    const fixture = (name = "") => adone.std.path.join(__dirname, "fixtures", name);

    process.env.PATH = fixture() + path.delimiter + process.env.PATH;
    process.env.FOO = "foo";

    it("exec()", async () => {
        const { stdout } = await exec("noop", ["foo"]);
        assert.equal(stdout, "foo");
    });

    if (is.windows) {
        it("execa() - cmd file", async () => {
            const { stdout } = await exec("hello.cmd");
            assert.equal(stdout, "Hello World");
        });
    }

    it("buffer", async () => {
        const { stdout } = await exec("noop", ["foo"], { encoding: null });
        assert.isTrue(is.buffer(stdout));
        assert.equal(stdout.toString(), "foo");
    });

    it("execStdout()", async () => {
        const stdout = await execStdout("noop", ["foo"]);
        assert.equal(stdout, "foo");
    });

    it("execStderr()", async () => {
        const stderr = await execStderr("noop-err", ["foo"]);
        assert.equal(stderr, "foo");
    });

    it.only("stdout/stderr available on errors", async () => {
        const err = await assert.throws(async () => exec("exit", ["2"]));
        assert.equal(typeof err.stdout, "string");
        assert.equal(typeof err.stderr, "string");
        expect(err.message).to.match(getExitRegExp("2"));
    });

    it("include stdout and stderr in errors for improved debugging", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js")));
        assert.match(err.message, /stdout/);
        assert.match(err.message, /stderr/);
        assert.equal(err.code, 1);
    });

    it("do not include in errors when `stdio` is set to `inherit`", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js"), { stdio: "inherit" }));
        assert.notMatch(err.message, /\n/);
    });

    it("do not include `stderr` and `stdout` in errors when set to `inherit`", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js"), { stdout: "inherit", stderr: "inherit" }));
        assert.notMatch(err.message, /\n/);
    });

    it("do not include `stderr` and `stdout` in errors when `stdio` is set to `inherit`", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js"), { stdio: [null, "inherit", "inherit"] }));
        assert.notMatch(err.message, /\n/);
    });

    it("do not include `stdout` in errors when set to `inherit`", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js"), { stdout: "inherit" }));
        assert.notMatch(err.message, /stdout/);
        assert.match(err.message, /stderr/);
    });

    it("do not include `stderr` in errors when set to `inherit`", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js"), { stderr: "inherit" }));
        assert.match(err.message, /stdout/);
        assert.notMatch(err.message, /stderr/);
    });

    it("pass `stdout` to a file descriptor", async () => {
        const file = await adone.fs.tmpName({ ext: ".txt" });
        await exec(fixture("noop"), ["foo bar"], { stdout: fs.openSync(file, "w") });
        assert.equal(fs.readFileSync(file, "utf8"), "foo bar\n");
        await adone.fs.rm(file);
    });

    it("pass `stderr` to a file descriptor", async () => {
        const file = await adone.fs.tmpName({ ext: ".txt" });
        await exec(fixture("noop-err"), ["foo bar"], { stderr: fs.openSync(file, "w") });
        assert.equal(fs.readFileSync(file, "utf8"), "foo bar\n");
        await adone.fs.rm(file);
    });

    it("exec.shell()", async () => {
        const { stdout } = await shell(`node ${fixture("noop")} foo`);
        assert.equal(stdout, "foo");
    });

    it("exec() (as spawn)", async () => {
        assert.typeOf(exec("noop").pid, "number");
        assert.equal((await adone.stream.as.string(exec("noop", ["foo"]).stdout)).trim(), "foo");
    });

    it("exec.sync()", () => {
        const { stdout } = execSync("noop", ["foo"]);
        assert.equal(stdout, "foo");
    });

    it("execSync() throws error if written to stderr", async () => {
        assert.throws(() => {
            execSync("foo");
        }, is.windows
            ? /^('|")foo('|")/ // ?
            : /spawnSync foo ENOENT/
        );
    });

    // it.only("execa.sync() includes stdout and stderr in errors for improved debugging", () => {
    //     const err = assert.throws(() => execSync("node", [fixture("error-message.js")]));
    //     expect(err.message).to.match(STDERR_STDOUT_REGEXP);
    // });

    it.only("skip throwing when using reject option in execa.sync()", () => {
        const err = execSync("node", [fixture("error-message.js")], { reject: false });
        assert.equal(typeof err.stdout, "string");
        assert.equal(typeof err.stderr, "string");
    });

    it("shellSync()", () => {
        const { stdout } = shellSync(`node ${fixture("noop")} foo`);
        assert.equal(stdout, "foo");
    });

    it("stripFinalNewline option", async () => {
        const { stdout } = await exec("noop", ["foo"], { stripLastNewline: false });
        assert.equal(stdout, "foo\n");
    });

    it.skip("preferLocal option", async () => {
        assert.isTrue((await exec("cat-names")).stdout.length > 2);

        if (is.windows) {
            // TODO: figure out how to make the below not hang on Windows
            return;
        }

        // Account for npm adding local binaries to the PATH
        const _path = process.env.PATH;
        process.env.PATH = "";
        const err = await assert.throws(async () => exec("cat-names", { preferLocal: false }));
        assert.match(err.message, /spawn .* ENOENT/);
        process.env.PATH = _path;
    });

    it("localDir option", async () => {
        const cwd = fixture("local-dir");
        const bin = path.resolve(cwd, "node_modules/.bin/self-path");

        await exec("npm", ["install", "--no-package-lock"], { cwd });

        const { stdout } = await exec(bin, { localDir: cwd });
        assert.equal(path.relative(cwd, stdout), path.normalize("node_modules/self-path"));
        await adone.fs.rm(path.join(cwd, "node_modules"));
    });

    it("input option can be a String", async () => {
        const { stdout } = await exec("stdin", { input: "foobar" });
        assert.equal(stdout, "foobar");
    });

    it("input option can be a Buffer", async () => {
        const { stdout } = await exec("stdin", { input: "testing12" });
        assert.equal(stdout, "testing12");
    });

    it("input can be a Stream", async () => {
        const s = new stream.PassThrough();
        s.write("howdy");
        s.end();
        const { stdout } = await exec("stdin", { input: s });
        assert.equal(stdout, "howdy");
    });

    it("you can write to child.stdin", async () => {
        const child = exec("stdin");
        child.stdin.end("unicorns");
        assert.equal((await child).stdout, "unicorns");
    });

    it("input option can be a String - sync", () => {
        const { stdout } = execSync("stdin", { input: "foobar" });
        assert.equal(stdout, "foobar");
    });

    it("input option can be a Buffer - sync", () => {
        const { stdout } = execSync("stdin", { input: Buffer.from("testing12", "utf8") });
        assert.equal(stdout, "testing12");
    });

    it("opts.stdout:ignore - stdout will not collect data", async () => {
        const { stdout } = await exec("stdin", {
            input: "hello",
            stdio: [null, "ignore", null]
        });
        assert.equal(stdout, null);
    });

    it("helpful error trying to provide an input stream in sync mode", () => {
        assert.throws(() => execSync("stdin", { input: new stream.PassThrough() }), /The `input` option cannot be a stream in sync mode/);
    });

    it("exec() returns a promise with kill() and pid", () => {
        const promise = exec("noop", ["foo"]);
        assert.equal(typeof promise.kill, "function");
        assert.equal(typeof promise.pid, "number");
    });

    it("maxBuffer affects stdout", async () => {
        await assert.throws(async () => exec("max-buffer", ["stdout", "11"], { maxBuffer: 10 }), /stdout maxBuffer exceeded/);
        await assert.doesNotThrow(async () => exec("max-buffer", ["stdout", "10"], { maxBuffer: 10 }));
    });

    it("maxBuffer affects stderr", async () => {
        await assert.throws(async () => exec("max-buffer", ["stderr", "13"], { maxBuffer: 12 }), /stderr maxBuffer exceeded/);
        await assert.doesNotThrow(async () => exec("max-buffer", ["stderr", "12"], { maxBuffer: 12 }));
    });

    it("do not buffer stdout when `buffer` set to `false`", async () => {
        const promise = exec("max-buffer", ["stdout", "10"], { buffer: false });
        const [result, stdout] = await Promise.all([
            promise,
            adone.stream.as.string(promise.stdout)
        ]);

        assert.equal(result.stdout, undefined);
        assert.equal(stdout, ".........\n");
    });

    it("do not buffer stderr when `buffer` set to `false`", async () => {
        const promise = exec("max-buffer", ["stderr", "10"], { buffer: false });
        const [result, stderr] = await Promise.all([
            promise,
            adone.stream.as.string(promise.stderr)
        ]);

        assert.equal(result.stderr, undefined);
        assert.equal(stderr, ".........\n");
    });

    it("skip throwing when using reject option", async () => {
        const err = await exec("exit", ["2"], { reject: false });
        assert.equal(typeof err.stdout, "string");
        assert.equal(typeof err.stderr, "string");
    });

    it("exec() returns code and failed properties", async () => {
        const { code, failed } = await exec("noop", ["foo"]);
        const err = await assert.throws(async () => exec("exit", ["2"]));
        assert.equal(code, 0);
        assert.isFalse(failed);
        assert.equal(err.code, 2);
        assert.isTrue(err.failed);
    });

    it.skip("use relative path with '..' chars", async () => {
        const pathViaParentDir = path.join("..", path.basename(__dirname), "fixtures", "noop");
        const { stdout } = await exec(pathViaParentDir, ["foo"]);
        assert.equal(stdout, "foo");
    });

    if (!is.windows) {
        it("exec() rejects if running non-executable", async () => {
            const cp = exec("non-executable");
            await assert.throws(async () => cp);
        });
    }

    it("err.killed is true if process was killed directly", async () => {
        const cp = exec("forever");

        setTimeout(() => {
            cp.kill();
        }, 100);

        const err = await assert.throws(async () => cp);

        assert.isTrue(err.killed);
    });

    // TODO: Should this really be the case, or should we improve on child_process?
    it("err.killed is false if process was killed indirectly", async () => {
        const cp = exec("forever");

        setTimeout(() => {
            process.kill(cp.pid, "SIGINT");
        }, 100);

        const err = await assert.throws(async () => cp);

        assert.isFalse(err.killed);
    });

    if (is.darwin) {
        it("sanity check: child_process.exec also has killed.false if killed indirectly", (done) => {
            const cp = adone.std.childProcess.exec("forever", (err) => {
                assert.isTrue(err);
                assert.isFalse(err.killed);
                done();
            });

            setTimeout(() => {
                process.kill(cp.pid, "SIGINT");
            }, 100);
        });
    }

    if (!is.windows) {
        it("err.signal is SIGINT", async () => {
            const cp = exec("forever");

            setTimeout(() => {
                process.kill(cp.pid, "SIGINT");
            }, 100);

            const err = await assert.throws(async () => cp);

            assert.equal(err.signal, "SIGINT");
        });

        it("err.signal is SIGTERM", async () => {
            const cp = exec("forever");

            setTimeout(() => {
                process.kill(cp.pid, "SIGTERM");
            }, 100);

            const err = await assert.throws(async () => cp);

            assert.equal(err.signal, "SIGTERM");
        });

        it("custom err.signal", async () => {
            const err = await assert.throws(async () => exec("delay", ["3000", "0"], { killSignal: "SIGHUP", timeout: 1500 }));

            assert.equal(err.signal, "SIGHUP");
        });
    }

    it("result.signal is null for successful execution", async () => {
        assert.equal((await exec("noop")).signal, null);
    });

    it("result.signal is null if process failed, but was not killed", async () => {
        const err = await assert.throws(async () => exec("exit", [2]));
        assert.equal(err.signal, null);
    });

    const code = (num) => {
        it(`err.code is ${num}`, async () => {
            const err = await assert.throws(async () => exec("exit", [`${num}`]));

            assert.equal(err.code, num);
        });
    };

    code(2);
    code(3);
    code(4);

    it("timeout will kill the process early", async () => {
        const err = await assert.throws(async () => exec("delay", ["60000", "0"], { timeout: 1500 }));

        assert.isTrue(err.timedOut);
        assert.notEqual(err.code, 22);
    });

    it("timeout will not kill the process early", async () => {
        const err = await assert.throws(async () => exec("delay", ["3000", "22"], { timeout: 9000 }));

        assert.isFalse(err.timedOut);
        assert.equal(err.code, 22);
    });

    it("timedOut will be false if no timeout was set and zero exit code", async () => {
        const result = await exec("delay", ["1000", "0"]);
        assert.isFalse(result.timedOut);
    });

    it("timedOut will be false if no timeout was set and non-zero exit code", async () => {
        const err = await assert.throws(async () => exec("delay", ["1000", "3"]));
        assert.isFalse(err.timedOut);
    });

    const errorMessage = (expected, ...args) => {
        it(`err.message matches: ${expected}`, async () => {
            const err = await assert.throws(async () => exec("exit", args));
            assert.match(err.message, expected);
        });
    };

    errorMessage(/Command failed: exit 2 foo bar/, 2, "foo", "bar");
    errorMessage(/Command failed: exit 3 baz quz/, 3, "baz", "quz");

    const cmd = (expected, ...args) => {
        it(`cmd is: ${JSON.stringify(expected)}`, async () => {
            const err = await assert.throws(async () => exec("fail", args));

            assert.equal(err.cmd, `fail${expected}`);
            const result = await exec("noop", args);
            assert.equal(result.cmd, `noop${expected}`);
        });
    };

    cmd(" foo bar", "foo", "bar");
    cmd(" baz quz", "baz", "quz");
    cmd("");

    const spawnAndKill = (signal, cleanup) => {
        it(`cleanup ${cleanup} - ${signal}`, async () => {
            const name = cleanup ? "sub-process" : "sub-process-false";
            const cp = exec(name);
            let pid;

            cp.stdout.setEncoding("utf8");
            cp.stdout.on("data", (chunk) => {
                pid = parseInt(chunk, 10);
                assert.equal(typeof pid, "number");

                setTimeout(() => {
                    process.kill(cp.pid, signal);
                }, 100);
            });

            await assert.throws(async () => cp);

            // Give everybody some time to breath and kill things
            await adone.promise.delay(200);

            assert.isFalse(await exists(cp.pid));
            assert.equal(await exists(pid), !cleanup);
        });
    };

    spawnAndKill("SIGINT", true);
    spawnAndKill("SIGTERM", true);

    // if (!is.windows) {
    //     // On Windows the subprocesses are actually always killed
    //     spawnAndKill("SIGTERM", false);
    //     spawnAndKill("SIGKILL", false);
    // }

    if (!is.windows) {
        it("exec.shell() supports the `shell` option", async () => {
            // process.env.PATH = path.join(__dirname, "fixtures") + path.delimiter + process.env.PATH;
            const { stdout } = await shell(`node ${fixture("noop")} foo`, {
                shell: is.windows ? "cmd.exe" : "/bin/bash"
            });
            assert.equal(stdout, "foo");
        });

        it("write to fast-exit process", async () => {
            // Try-catch here is necessary, because this test is not 100% accurate
            // Sometimes process can manage to accept input before exiting
            try {
                await exec(`fast-exit-${process.platform}`, [], { input: "data" });
                // assert.pass();
            } catch (err) {
                assert.equal(err.code, "EPIPE");
            }
        });
    }

    it("use environment variables by default", async () => {
        const result = await execStdout("environment");

        assert.deepEqual(result.split("\n"), [
            "foo",
            "undefined"
        ]);
    });


    it("extend environment variables by default", async () => {
        const result = await execStdout("environment", [], { env: { BAR: "bar" } });

        assert.deepEqual(result.split("\n"), [
            "foo",
            "bar"
        ]);
    });

    it("do not extend environment with `envExtend` option", async () => {
        const result = await execStdout("environment", [], { env: { BAR: "bar", PATH: process.env.PATH }, extendEnv: false });

        assert.deepEqual(result.split("\n"), [
            "undefined",
            "bar"
        ]);
    });

    it("do not buffer when streaming", async () => {
        const result = await adone.stream.as.string(exec("max-buffer", ["stdout", "21"], { maxBuffer: 10 }).stdout);

        assert.equal(result, "....................\n");
    });

    it("detach child process", async () => {
        const file = await adone.fs.tmpName({ ext: ".txt" });

        await exec("detach", [file]);

        await adone.promise.delay(3000);

        assert.equal(await adone.fs.readFile(file, "utf8"), "foo\n");
    });

    it.todo("removes exit handler on exit", async () => {
        // FIXME: This relies on `signal-exit` internals
        const ee = process.process.__signal_exit_emitter__;

        const child = exec("noop");
        const listener = ee.listeners("exit").pop();

        await new Promise((resolve, reject) => {
            child.on("error", reject);
            child.on("exit", resolve);
        });

        assert.isFalse(ee.listeners("exit").includes(listener));
    });

    it("stdio", () => {
        macro(undefined, null);
        macro(null, null);

        macro({ stdio: "inherit" }, "inherit");
        macro({ stdio: "pipe" }, "pipe");
        macro({ stdio: "ignore" }, "ignore");
        macro({ stdio: [0, 1, 2] }, [0, 1, 2]);

        macro({}, [null, null, null]);
        macro({ stdio: [] }, [null, null, null]);
        macro({ stdin: "pipe" }, ["pipe", null, null]);
        macro({ stdout: "ignore" }, [null, "ignore", null]);
        macro({ stderr: "inherit" }, [null, null, "inherit"]);
        macro({ stdin: "pipe", stdout: "ignore", stderr: "inherit" }, ["pipe", "ignore", "inherit"]);
        macro({ stdin: "pipe", stdout: "ignore" }, ["pipe", "ignore", null]);
        macro({ stdin: "pipe", stderr: "inherit" }, ["pipe", null, "inherit"]);
        macro({ stdout: "ignore", stderr: "inherit" }, [null, "ignore", "inherit"]);
        macro({ stdin: 0, stdout: 1, stderr: 2 }, [0, 1, 2]);
        macro({ stdin: 0, stdout: 1 }, [0, 1, null]);
        macro({ stdin: 0, stderr: 2 }, [0, null, 2]);
        macro({ stdout: 1, stderr: 2 }, [null, 1, 2]);

        macro({ stdio: { foo: "bar" } }, new TypeError("Expected `stdio` to be of type `string` or `Array`, got `object`"));

        macro({ stdin: "inherit", stdio: "pipe" }, new Error("It's not possible to provide `stdio` in combination with one of `stdin`, `stdout`, `stderr`"));
        macro({ stdin: "inherit", stdio: ["pipe"] }, new Error("It's not possible to provide `stdio` in combination with one of `stdin`, `stdout`, `stderr`"));
        macro({ stdin: "inherit", stdio: [undefined, "pipe"] }, new Error("It's not possible to provide `stdio` in combination with one of `stdin`, `stdout`, `stderr`"));
    });

    describe("errname", () => {
        // Simulates failure to capture `process.binding('uv');`
        // const fallback = (code) => errnameFallback(null, code);

        const makeTests = (name, m, expected) => {
            // In node 9.x this test leads to SIGABRT
            it.skip(`${name}: >=0 exit codes`, async () => {
                // Throws >= 0
                // await assert.throws(async () => m(0), /err >= 0/);
                // await assert.throws(async () => m(1), /err >= 0/);
                // await assert.throws(async () => m("2"), /err >= 0/);
                // await assert.throws(async () => m("foo"), /err >= 0/);
                await assert.throws(() => m(0), /err >= 0|It must be a negative integer|must be of type negative number/);
                await assert.throws(() => m(1), /err >= 0|It must be a negative integer|must be of type negative number/);
                await assert.throws(() => m("2"), /err >= 0|must be of type number|must be of type negative number/);
                await assert.throws(() => m("foo"), /err >= 0|must be of type number|must be of type negative number/);
            });

            it(`${name}: negative exit codes`, async () => {
                assert.equal(await m(-2), expected);
            });
        };

        const unknown = "Unknown system error -2";

        makeTests("native", errname, is.windows ? unknown : "ENOENT");
        // makeTests("fallback", fallback, unknown);
    });

    // finnaly
    it("finally function is executed on success", async () => {
        let called = false;
        const { stdout } = await exec("noop", ["foo"]).finally(() => {
            called = true;
        });
        assert.equal(called, true);
        assert.equal(stdout, "foo");
    });

    it("finally function is executed on failure", async () => {
        let called = false;
        const err = await assert.throws(async () => exec("exit", ["2"]).finally(() => {
            called = true;
        }));
        assert.equal(called, true);
        assert.equal(typeof err.stdout, "string");
        assert.equal(typeof err.stderr, "string");
    });

    it("throw in finally function bubbles up on success", async () => {
        const result = await assert.throws(async () => exec("noop", ["foo"]).finally(() => {
            throw new Error("called");
        }));
        assert.equal(result.message, "called");
    });

    it("throw in finally bubbles up on error", async () => {
        const result = await assert.throws(async () => exec("exit", ["2"]).finally(() => {
            throw new Error("called");
        }));
        assert.equal(result.message, "called");
    });
});
