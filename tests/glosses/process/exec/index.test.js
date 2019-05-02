const {
    is,
    process: { exec, execSync, execStdout, execStderr, shell, shellSync },
    std: { path, fs, stream, childProcess }
} = adone;

import getStream from "get-stream";
import isRunning from "is-running";
import delay from "delay";
import { AssertionError } from "assert";
// import tempfile from "tempfile";

process.env.PATH = path.join(__dirname, "fixtures") + path.delimiter + process.env.PATH;
process.env.FOO = "foo";

const NO_NEWLINES_REGEXP = /^[^\n]*$/;
const STDERR_STDOUT_REGEXP = /stderr[^]*stdout/;
const TIMEOUT_REGEXP = /timed out after/;

const getExitRegExp = (exitMessage) => new RegExp(`failed with exit code ${exitMessage}`);

const fixture = (name = "") => adone.path.join(__dirname, "fixtures", name);


describe("process", "exec", () => {
    it("exec()", async () => {
        const { stdout } = await exec(fixture("noop"), ["foo"]);
        assert.equal(stdout, "foo");
    });

    it("exec() - cmd file", {
        skip: !is.windows
    }, async () => {
        const { stdout } = await exec(fixture("hello.cmd"));
        assert.equal(stdout, "Hello World");
    });

    it("exec() - run cmd command", {
        skip: !is.windows
    }, async () => {
        const { stdout } = await exec("cmd", ["/c", "hello.cmd"]);
        assert.equal(stdout, "Hello World");
    });

    it("buffer", async () => {
        const { stdout } = await exec(fixture("noop"), ["foo"], { encoding: null });
        assert.isTrue(is.buffer(stdout));
        assert.equal(stdout.toString(), "foo");
    });

    it("execa.stdout()", async () => {
        const stdout = await execStdout(fixture("noop"), ["foo"]);
        assert.equal(stdout, "foo");
    });

    it("execa.stderr()", async () => {
        const stderr = await execStderr(fixture("noop-err"), ["foo"]);
        assert.equal(stderr, "foo");
    });

    it("result.all shows both `stdout` and `stderr` intermixed", async () => {
        const result = await exec(fixture("noop-132"));
        assert.equal(result.all, "132");
    });

    it("stdout/stderr/all available on errors", async () => {
        const err = await assert.throws(async () => exec(fixture("exit"), ["2"]));
        assert.equal(typeof err.stdout, "string");
        assert.equal(typeof err.stderr, "string");
        assert.equal(typeof err.all, "string");
        expect(err.message).to.match(getExitRegExp("2"));
    });

    it("include stdout and stderr in errors for improved debugging", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js")));
        expect(err.code).to.be.equal(1);
        expect(err.message).to.match(STDERR_STDOUT_REGEXP);
    });

    it("do not include in errors when `stdio` is set to `inherit`", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js"), { stdio: "inherit" }));
        expect(err.message).to.match(NO_NEWLINES_REGEXP);
    });

    it("do not include `stderr` and `stdout` in errors when set to `inherit`", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js"), { stdout: "inherit", stderr: "inherit" }));
        expect(err.message).to.match(NO_NEWLINES_REGEXP);
    });

    it("do not include `stderr` and `stdout` in errors when `stdio` is set to `inherit`", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js"), { stdio: [undefined, "inherit", "inherit"] }));
        expect(err.message).to.match(NO_NEWLINES_REGEXP);
    });

    it("do not include `stdout` in errors when set to `inherit`", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js"), { stdout: "inherit" }));
        assert.match(err.message, /stderr/);
    });

    it("do not include `stderr` in errors when set to `inherit`", async () => {
        const err = await assert.throws(async () => exec(fixture("error-message.js"), { stderr: "inherit" }));
        assert.match(err.message, /stdout/);
    });

    it("pass `stdout` to a file descriptor", async () => {
        const file = await adone.fs.tmpName({ ext: ".txt" });
        await exec(fixture("noop"), ["foo bar"], { stdout: fs.openSync(file, "w") });
        assert.equal(fs.readFileSync(file, "utf8"), "foo bar\n");
        await adone.fs.unlink(file);
    });

    it("pass `stderr` to a file descriptor", async () => {
        const file = await adone.fs.tmpName({ ext: ".txt" });
        await exec(fixture("noop-err"), ["foo bar"], { stderr: fs.openSync(file, "w") });
        assert.equal(fs.readFileSync(file, "utf8"), "foo bar\n");
        await adone.fs.unlink(file);
    });

    it("shell()", async () => {
        const { stdout } = await shell(`node ${fixture("noop")} foo`);
        assert.equal(stdout, "foo");
    });

    it("execSync()", () => {
        const { stdout } = execSync(fixture("noop"), ["foo"]);
        assert.equal(stdout, "foo");
    });

    it("execSync() throws error if written to stderr", () => {
        assert.throws(() => execSync("foo"), process.platform === "win32" ? /'foo' is not recognized as an internal or external command/ : /spawnSync foo ENOENT/);
    });

    it("execSync() includes stdout and stderr in errors for improved debugging", () => {
        const err = assert.throws(() => execSync("node", [fixture("error-message.js")]));
        assert.equal(err.code, 1);
        assert.match(err.message, STDERR_STDOUT_REGEXP);
    });

    it("skip throwing when using reject option in execSync()", () => {
        const err = execSync("node", [fixture("error-message.js")], { reject: false });
        assert.equal(typeof err.stdout, "string");
        assert.equal(typeof err.stderr, "string");
    });

    it("shellSync()", () => {
        const { stdout } = shellSync(`node ${fixture("noop")} foo`);
        assert.equal(stdout, "foo");
    });

    it("shellSync() includes stdout and stderr in errors for improved debugging", () => {
        const err = assert.throws(() => shellSync(`node ${fixture("error-message.js")}`));
        assert.equal(err.code, 1);
        assert.match(err.message, STDERR_STDOUT_REGEXP);
    });

    it("skip throwing when using reject option in shellSync()", () => {
        const err = shellSync(`node ${fixture("error-message.js")}`, { reject: false });
        assert.equal(typeof err.stdout, "string");
        assert.equal(typeof err.stderr, "string");
    });

    it("stripEof option (legacy)", async () => {
        const { stdout } = await exec(fixture("noop"), ["foo"], { stripEof: false });
        assert.equal(stdout, "foo\n");
    });

    it("stripFinalNewline option", async () => {
        const { stdout } = await exec(fixture("noop"), ["foo"], { stripFinalNewline: false });
        assert.equal(stdout, "foo\n");
    });

    it("preferLocal option", async () => {
        // assert.isTrue((await exec("cat-names")).stdout.length > 2);

        if (process.platform === "win32") {
            // TODO: figure out how to make the below not hang on Windows
            return;
        }

        // Account for npm adding local binaries to the PATH
        const _path = process.env.PATH;
        process.env.PATH = "";
        await assert.throws(async () => exec("cat-names", { preferLocal: false }), /spawn .* ENOENT/);
        process.env.PATH = _path;
    });

    it("localDir option", async () => {
        const cwd = fixture("local-dir");
        const bin = path.resolve(cwd, "node_modules/.bin/self-path");

        await exec("npm", ["install", "--no-package-lock"], { cwd });

        const { stdout } = await exec(bin, { localDir: cwd });

        assert.equal(path.relative(cwd, stdout), path.normalize("node_modules/self-path"));
    });

    it("input option can be a String", async () => {
        const { stdout } = await exec(fixture("stdin"), { input: "foobar" });
        assert.equal(stdout, "foobar");
    });

    it("input option can be a Buffer", async () => {
        const { stdout } = await exec(fixture("stdin"), { input: "testing12" });
        assert.equal(stdout, "testing12");
    });

    it("input can be a Stream", async () => {
        const s = new stream.PassThrough();
        s.write("howdy");
        s.end();
        const { stdout } = await exec(fixture("stdin"), { input: s });
        assert.equal(stdout, "howdy");
    });

    it("you can write to child.stdin", async () => {
        const child = exec(fixture("stdin"));
        child.stdin.end("unicorns");
        assert.equal((await child).stdout, "unicorns");
    });

    it("input option can be a String - sync", () => {
        const { stdout } = execSync(fixture("stdin"), { input: "foobar" });
        assert.equal(stdout, "foobar");
    });

    it("input option can be a Buffer - sync", () => {
        const { stdout } = execSync(fixture("stdin"), { input: Buffer.from("testing12", "utf8") });
        assert.equal(stdout, "testing12");
    });

    it("opts.stdout:ignore - stdout will not collect data", async () => {
        const { stdout } = await exec(fixture("stdin"), {
            input: "hello",
            stdio: [undefined, "ignore", undefined]
        });
        assert.equal(stdout, undefined);
    });

    it("helpful error trying to provide an input stream in sync mode", () => {
        assert.throws(
            () => execSync(fixture("stdin"), { input: new stream.PassThrough() }),
            /The `input` option cannot be a stream in sync mode/
        );
    });

    it("exec() returns a promise with kill() and pid", () => {
        const promise = exec(fixture("noop"), ["foo"]);
        assert.equal(typeof promise.kill, "function");
        assert.equal(typeof promise.pid, "number");
    });

    it("maxBuffer affects stdout", async () => {
        await assert.throws(async () => exec(fixture("max-buffer"), ["stdout", "11"], { maxBuffer: 10 }), /stdout maxBuffer exceeded/);
        await exec("max-buffer", ["stdout", "10"], { maxBuffer: 10 });
    });

    it("maxBuffer affects stderr", async () => {
        await assert.throws(async () => exec(fixture("max-buffer"), ["stderr", "13"], { maxBuffer: 12 }), /stderr maxBuffer exceeded/);
        await exec("max-buffer", ["stderr", "12"], { maxBuffer: 12 });
    });

    it("do not buffer stdout when `buffer` set to `false`", async () => {
        const promise = exec(fixture("max-buffer"), ["stdout", "10"], { buffer: false });
        const [result, stdout] = await Promise.all([
            promise,
            getStream(promise.stdout),
            getStream(promise.all)
        ]);

        assert.equal(result.stdout, undefined);
        assert.equal(stdout, ".........\n");
    });

    it("do not buffer stderr when `buffer` set to `false`", async () => {
        const promise = exec(fixture("max-buffer"), ["stderr", "10"], { buffer: false });
        const [result, stderr] = await Promise.all([
            promise,
            getStream(promise.stderr),
            getStream(promise.all)
        ]);

        assert.equal(result.stderr, undefined);
        assert.equal(stderr, ".........\n");
    });

    it("skip throwing when using reject option", async () => {
        const error = await exec(fixture("exit"), ["2"], { reject: false });
        assert.equal(typeof error.stdout, "string");
        assert.equal(typeof error.stderr, "string");
    });

    it("allow unknown exit code", async () => {
        const { message, exitCode, exitCodeName } = await assert.throws(async () => exec(fixture("exit"), ["255"]));
        assert.match(message, /exit code 255 \(Unknown system error -255\)/);
        assert.equal(exitCode, 255);
        assert.equal(exitCodeName, "Unknown system error -255");
    });

    it("exec() returns code and failed properties", async () => {
        const { code, exitCode, exitCodeName, failed } = await exec(fixture("noop"), ["foo"]);
        assert.equal(code, 0);
        assert.equal(exitCode, 0);
        assert.equal(exitCodeName, "SUCCESS");
        assert.isFalse(failed);

        const error = await assert.throws(async () => exec(fixture("exit"), ["2"]));
        assert.equal(error.code, 2);
        assert.match(error.message, getExitRegExp("2"));
        assert.equal(error.exitCode, 2);
        const expectedName = process.platform === "win32" ? "Unknown system error -2" : "ENOENT";
        assert.equal(error.exitCodeName, expectedName);
        assert.isTrue(error.failed);
    });

    it("use relative path with '..' chars", async () => {
        const pathViaParentDir = path.join("..", "adone", "tests", "glosses", "process", "exec", "fixtures", "noop");
        const { stdout } = await exec(pathViaParentDir, ["foo"]);
        assert.equal(stdout, "foo");
    });

    it("exec() rejects if running non-executable", {
        skip: is.windows
    }, async () => {
        const cp = exec(fixture("non-executable"));
        await assert.throws(async () => cp);
    });

    it("error.killed is true if process was killed directly", async () => {
        const cp = exec(fixture("forever"));

        setTimeout(() => {
            cp.kill();
        }, 100);

        const error = await assert.throws(async () => cp);
        assert.match(error.message, /was killed with SIGTERM/);
        assert.isTrue(error.killed);
    });

    // TODO: Should this really be the case, or should we improve on child_process?
    it("error.killed is false if process was killed indirectly", async () => {
        const cp = exec(fixture("forever"));

        setTimeout(() => {
            process.kill(cp.pid, "SIGINT");
        }, 100);

        // `process.kill()` is emulated by Node.js on Windows
        const message = process.platform === "win32" ? /failed with exit code 1/ : /was killed with SIGINT/;
        const error = await assert.throws(async () => cp);
        assert.match(error.message, message);
        assert.isFalse(error.killed);
    });

    it("sanity check: child_process.exec also has killed.false if killed indirectly", {
        skip: !is.darwin
    }, (done) => {
        const cp = childProcess.exec(fixture("forever"), (error) => {
            assert.exists(error);
            assert.isFalse(error.killed);
            done();
        });

        setTimeout(() => {
            process.kill(cp.pid, "SIGINT");
        }, 100);
    });

    it("error.signal is SIGINT", {
        skip: is.windows
    }, async () => {
        const cp = exec(fixture("forever"));

        setTimeout(() => {
            process.kill(cp.pid, "SIGINT");
        }, 100);

        const error = await assert.throws(async () => cp);
        assert.match(error.message, /was killed with SIGINT/);
        assert.equal(error.signal, "SIGINT");
    });

    it("error.signal is SIGTERM", {
        skip: is.windows
    }, async () => {
        const cp = exec(fixture("forever"));

        setTimeout(() => {
            process.kill(cp.pid, "SIGTERM");
        }, 100);

        const error = await assert.throws(async () => cp);
        assert.match(error.message, /was killed with SIGTERM/);
        assert.equal(error.signal, "SIGTERM");
    });

    it("custom error.signal", {
        skip: is.windows
    }, async () => {
        const error = await assert.throws(async () => exec(fixture("delay"), ["3000", "0"], { killSignal: "SIGHUP", timeout: 1500, message: TIMEOUT_REGEXP }));
        assert.equal(error.signal, "SIGHUP");
    });

    it("result.signal is undefined for successful execution", async () => {
        assert.equal((await exec(fixture("noop"))).signal, undefined);
    });

    it("result.signal is undefined if process failed, but was not killed", async () => {
        const error = await assert.throws(async () => exec(fixture("exit"), [2]));
        assert.match(error.message, getExitRegExp("2"));
        assert.equal(error.signal, undefined);
    });

    const code = async function (num) {
        const error = await assert.throws(async () => exec(fixture("exit"), [`${num}`]));
        assert.equal(error.code, num);
        assert.match(error.message, getExitRegExp(num));
        assert.equal(error.exitCode, num);
    };

    it("error.code is 2", () => code(2));
    it("error.code is 3", () => code(3));
    it("error.code is 4", () => code(4));

    it("timeout will kill the process early", async () => {
        const time = Date.now();
        const error = await assert.throws(async () => exec("delay", ["60000", "0"], { timeout: 500, message: TIMEOUT_REGEXP }));
        const diff = Date.now() - time;
        assert.isTrue(error.timedOut);
        assert.notEqual(error.exitCode, 22);
        assert.isTrue(diff < 4000);
    });

    it("timeout will kill the process early (sleep)", async () => {
        const time = Date.now();
        const error = await assert.throws(async () => exec("sleeper", [], { timeout: 500, message: TIMEOUT_REGEXP }));
        const diff = Date.now() - time;
        assert.isTrue(error.timedOut);
        assert.notEqual(error.stdout, "ok");
        assert.isTrue(diff < 4000);
    });

    it("timeout will not kill the process early", async () => {
        const error = await assert.throws(async () => exec(fixture("delay"), ["2000", "22"], { timeout: 30000 }));
        assert.match(error.message, getExitRegExp("22"));
        assert.equal(error.code, 22);
        assert.isFalse(error.timedOut);
    });

    it("timedOut will be false if no timeout was set and zero exit code", async () => {
        const result = await exec(fixture("delay"), ["1000", "0"]);
        assert.isFalse(result.timedOut);
    });

    it("timedOut will be false if no timeout was set and non-zero exit code", async () => {
        const error = await assert.throws(async () => exec(fixture("delay"), ["1000", "3"]));
        assert.match(error.message, getExitRegExp("3"));
        assert.isFalse(error.timedOut);
    });

    const errorMessage = async function (expected, ...args) {
        const err = await assert.throws(async () => exec(fixture("exit"), args));
        assert.match(err.message, expected);
    };

    it("error.message matches: /Command failed with exit code 2.*: exit 2 foo bar/", async () => {
        await errorMessage(/Command failed with exit code 2.*: .+exit 2 foo bar/, 2, "foo", "bar");
    });
    it("error.message matches: /Command failed with exit code 3.*: .+exit 3 baz quz/", async () => {
        errorMessage(/Command failed with exit code 3.*: .+exit 3 baz quz/, 3, "baz", "quz");
    });

    const command = async function (expected, ...args) {
        const error = await assert.throws(async () => exec(fixture("fail"), args));
        assert.isTrue(error.command.endsWith(`fail${expected}`));

        const result = await exec(fixture("noop"), args);
        assert.isTrue(result.command.endsWith(`noop${expected}`));
    };

    it(`command is: ${JSON.stringify(" foo bar")}`, async () => {
        await command(" foo bar", "foo", "bar");
    });
    it(`command is: ${JSON.stringify(" baz quz")}`, async () => {
        await command(" baz quz", "baz", "quz");
    });
    it(`command is: ${JSON.stringify("")}`, async () => {
        await command("");
    });

    const spawnAndKill = async function (signal, cleanup) {
        const name = cleanup ? fixture("sub-process") : fixture("sub-process-false");
        console.log(name);
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
        await delay(200);

        assert.isFalse(isRunning(cp.pid));
        assert.equal(isRunning(pid), !cleanup);
    };

    it("cleanup - SIGINT", async () => {
        await spawnAndKill("SIGINT", true);
    });
    it("cleanup - SIGKILL", async () => {
        await spawnAndKill("SIGTERM", true);
    });

    // On Windows the subprocesses are actually always killed
    it("cleanup false - SIGINT", {
        skip: is.windows
    }, async () => {
        await spawnAndKill("SIGTERM", false);
    });

    it("cleanup false - SIGKILL", {
        skip: is.windows
    }, async () => {
        await spawnAndKill("SIGKILL", false);
    });

    it("shell() supports the `shell` option", async () => {
        const { stdout } = await shell(`node ${fixture("noop")} foo`, {
            shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash"
        });
        assert.equal(stdout, "foo");
    });

    it("write to fast-exit process", {
        skip: is.windows
    }, async (done) => {
        // Try-catch here is necessary, because this test is not 100% accurate
        // Sometimes process can manage to accept input before exiting
        try {
            await exec(fixture(`fast-exit-${process.platform}`), [], { input: "data" });
        } catch (error) {
            assert.equal(error.exitCode, 32);
            done();
        }
    });

    it("use environment variables by default", async () => {
        const result = await execStdout(fixture("environment"));

        assert.deepEqual(result.split("\n"), [
            "foo",
            "undefined"
        ]);
    });

    it("extend environment variables by default", async () => {
        const result = await execStdout(fixture("environment"), [], { env: { BAR: "bar" } });

        assert.deepEqual(result.split("\n"), [
            "foo",
            "bar"
        ]);
    });

    it("do not extend environment with `extendEnv: false`", async () => {
        const result = await execStdout(fixture("environment"), [], { env: { BAR: "bar", PATH: process.env.PATH }, extendEnv: false });

        assert.deepEqual(result.split("\n"), [
            "undefined",
            "bar"
        ]);
    });

    it("use extend environment with `extendEnv: true` and `shell: true`", async () => {
        process.env.TEST = "test";
        const command = process.platform === "win32" ? "echo %TEST%" : "echo $TEST";
        const stdout = await execStdout(command, { shell: true, env: {}, extendEnv: true });
        assert.equal(stdout, "test");
        delete process.env.TEST;
    });

    it("do not buffer when streaming", async () => {
        const result = await getStream(exec(fixture("max-buffer"), ["stdout", "21"], { maxBuffer: 10 }).stdout);

        assert.equal(result, "....................\n");
    });

    it("detach child process", async () => {
        const file = await adone.fs.tmpName({ ext: ".txt" });

        await exec(fixture("detach"), [file]);

        await delay(5000);

        assert.equal(fs.readFileSync(file, "utf8"), "foo\n");

        await adone.fs.unlink(file);
    });

    // See #128
    it("removes exit handler on exit", async () => {
        // FIXME: This relies on `signal-exit` internals
        const ee = process.__signal_exit_emitter__;

        const child = exec(fixture("noop"));
        const listener = ee.listeners("exit").pop();

        await new Promise((resolve, reject) => {
            child.on("error", reject);
            child.on("exit", resolve);
        });

        const included = ee.listeners("exit").includes(listener);
        assert.isFalse(included);
    });

    // TOOD: Remove the `if`-guard when targeting Node.js 10
    it("finally function is executed on success", async () => {
        let called = false;
        const { stdout } = await exec(fixture("noop"), ["foo"]).finally(() => {
            called = true;
        });
        assert.equal(called, true);
        assert.equal(stdout, "foo");
    });

    it("finally function is executed on failure", async () => {
        let called = false;
        const err = await assert.throws(async () => exec(fixture("exit"), ["2"]).finally(() => {
            called = true;
        }));
        assert.equal(called, true);
        assert.equal(typeof err.stdout, "string");
        assert.equal(typeof err.stderr, "string");
    });

    it("throw in finally function bubbles up on success", async () => {
        const result = await assert.throws(async () => exec(fixture("noop"), ["foo"]).finally(() => {
            throw new Error("called");
        }));
        assert.equal(result.message, "called");
    });

    it("throw in finally bubbles up on error", async () => {
        const result = await assert.throws(async () => exec(fixture("exit"), ["2"]).finally(() => {
            throw new Error("called");
        }));
        assert.equal(result.message, "called");
    });

    it("cancel method kills the subprocess", () => {
        const subprocess = exec(fixture("node"));
        subprocess.cancel();
        assert.isTrue(subprocess.killed);
    });

    it("result.isCanceled is false when spawned.cancel isn't called", async () => {
        const result = await exec(fixture("noop"));
        assert.isFalse(result.isCanceled);
    });

    it('calling cancel method throws an error with message "Command was canceled"', async () => {
        const subprocess = exec(fixture("noop"));
        subprocess.cancel();
        const err = await assert.throws(async () => subprocess);
        assert.match(err.message, /Command was canceled/);
    });

    it("error.isCanceled is true when cancel method is used", async () => {
        const subprocess = exec(fixture("noop"));
        subprocess.cancel();
        const error = await assert.throws(async () => subprocess);
        assert.isTrue(error.isCanceled);
    });

    it("error.isCanceled is false when kill method is used", async () => {
        const subprocess = exec(fixture("noop"));
        subprocess.kill();
        const error = await assert.throws(async () => subprocess);
        assert.isFalse(error.isCanceled);
    });

    it("calling cancel method twice should show the same behaviour as calling it once", async () => {
        const subprocess = exec(fixture("noop"));
        subprocess.cancel();
        subprocess.cancel();
        const error = await assert.throws(async () => subprocess);
        assert.isTrue(error.isCanceled);
        assert.isTrue(subprocess.killed);
    });

    it("calling cancel method on a successfuly completed process does not make result.isCanceled true", async () => {
        const subprocess = exec(fixture("noop"));
        const result = await subprocess;
        subprocess.cancel();
        assert.isFalse(result.isCanceled);
    });

    it("calling cancel method on a process which has been killed does not make error.isCanceled true", async () => {
        const subprocess = exec(fixture("noop"));
        subprocess.kill();
        const error = await assert.throws(async () => subprocess);
        assert.isFalse(error.isCanceled);
    });

    describe("errname", () => {
        const isWindows = process.platform === "win32";
        const makeTests = function (name, m, expected) {
            it(`${name}: >=0 exit codes`, () => {
                // Throws >= 0
                assert.throws(() => m(0), /err >= 0|It must be a negative integer|must be of type negative number/);
                assert.throws(() => m(1), /err >= 0|It must be a negative integer|must be of type negative number/);
                assert.throws(() => m("2"), /err >= 0|must be of type number|must be of type negative number/);
                assert.throws(() => m("foo"), /err >= 0|must be of type number|must be of type negative number/);
            });

            it(`${name}: negative exit codes`, () => {
                assert.equal(m(-2), expected);
            });
        };

        const unknown = "Unknown system error -2";

        makeTests("native", exec.errname, isWindows ? unknown : "ENOENT");
    });

    describe("stdio", () => {
        const {
            std: { util }
        } = adone;

        const { stdio } = exec;

        util.inspect.styles.name = "magenta";

        const macro = function (input, expected) {
            if (expected instanceof Error) {
                assert.throws(() => stdio(input), expected.message);
                return;
            }

            const result = stdio(input);

            if (typeof expected === "object" && !is.null(expected)) {
                assert.deepEqual(result, expected);
            } else {
                assert.equal(result, expected);
            }
        };

        const cases = [
            [undefined, undefined],

            [{ stdio: "inherit" }, "inherit"],
            [{ stdio: "pipe" }, "pipe"],
            [{ stdio: "ignore" }, "ignore"],
            [{ stdio: [0, 1, 2] }, [0, 1, 2]],

            [{}, [undefined, undefined, undefined]],
            [{ stdio: [] }, [undefined, undefined, undefined]],
            [{ stdin: "pipe" }, ["pipe", undefined, undefined]],
            [{ stdout: "ignore" }, [undefined, "ignore", undefined]],
            [{ stderr: "inherit" }, [undefined, undefined, "inherit"]],
            [{ stdin: "pipe", stdout: "ignore", stderr: "inherit" }, ["pipe", "ignore", "inherit"]],
            [{ stdin: "pipe", stdout: "ignore" }, ["pipe", "ignore", undefined]],
            [{ stdin: "pipe", stderr: "inherit" }, ["pipe", undefined, "inherit"]],
            [{ stdout: "ignore", stderr: "inherit" }, [undefined, "ignore", "inherit"]],
            [{ stdin: 0, stdout: 1, stderr: 2 }, [0, 1, 2]],
            [{ stdin: 0, stdout: 1 }, [0, 1, undefined]],
            [{ stdin: 0, stderr: 2 }, [0, undefined, 2]],
            [{ stdout: 1, stderr: 2 }, [undefined, 1, 2]],

            [{ stdio: { foo: "bar" } }, new TypeError("Expected `stdio` to be of type `string` or `Array`, got `object`")],

            [{ stdin: "inherit", stdio: "pipe" }, new Error("It's not possible to provide `stdio` in combination with one of `stdin`, `stdout`, `stderr`")],
            [{ stdin: "inherit", stdio: ["pipe"] }, new Error("It's not possible to provide `stdio` in combination with one of `stdin`, `stdout`, `stderr`")],
            [{ stdin: "inherit", stdio: [undefined, "pipe"] }, new Error("It's not possible to provide `stdio` in combination with one of `stdin`, `stdout`, `stderr`")]
        ];

        for (const args of cases) {
            it(args[0] || util.inspect(args[1], { colors: true }), () => {
                macro.apply(null, args);
            });
        }
    });
});
