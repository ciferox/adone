import { findReports, validate, validateContent, getSection } from "./common.js";

const {
    is,
    fs,
    std
} = adone;

const fixture = (name) => std.path.join(__dirname, "fixtures", name);

describe("report", () => {
    let oldCwd;
    let reports;

    before(() => {
        oldCwd = process.cwd();
        process.chdir(__dirname);
    });

    after(async () => {
        process.chdir(oldCwd);
    });

    afterEach(async () => {
        for (const report of reports) {
            await fs.unlink(std.path.resolve(report)); // eslint-disable-line
        }
    });

    describe("api", () => {
        it("common", async () => {
            const child = forkProcess(fixture("api.js"));
            const result = await child;
            assert.strictEqual(result.code, 0, "Process exited cleanly");
            reports = await findReports(child.pid);
            assert.strictEqual(reports.length, 1, `Found reports ${reports}`);
            const report = reports[0];
            await validate(report, {
                pid: child.pid,
                commandline: child.spawnargs.join(" ")
            });
        });

        it("bad process obj", async () => {
            const child = forkProcess(fixture("badprocessobj.js"));
            const result = await child;
            assert.strictEqual(result.code, 0, "Process exited cleanly");
            reports = await findReports(child.pid);
            assert.strictEqual(reports.length, 1, `Found reports ${reports}`);
            const report = reports[0];
            await validate(report, {
                pid: child.pid,
                expectedVersions: [],
                commandline: child.spawnargs.join(" ")
            });
        });

        it("bad process version", async () => {
            const child = forkProcess(fixture("badprocessversion.js"));
            const result = await child;
            assert.strictEqual(result.code, 0, "Process exited cleanly");
            reports = await findReports(child.pid);
            assert.strictEqual(reports.length, 1, `Found reports ${reports}`);
            const report = reports[0];
            await validate(report, {
                pid: child.pid,
                expectNodeVersion: true,
                commandline: child.spawnargs.join(" ")
            });
        });

        it("bad process versions", async () => {
            const child = forkProcess(fixture("badprocessversions.js"));
            const result = await child;

            assert.strictEqual(result.code, 0, "Process exited cleanly");
            reports = await findReports(child.pid);
            assert.strictEqual(reports.length, 1, `Found reports ${reports}`);
            const report = reports[0];
            await validate(report, {
                pid: child.pid,
                expectedVersions: Object.keys(process.versions).filter((c) => c !== "uv"),
                commandline: child.spawnargs.join(" ")
            });
        });

        it("get report", async () => {
            const child = forkProcess(fixture("getreport.js"));
            const result = await child;

            assert.strictEqual(result.stderr, "", "Checking no messages on stderr");
            reports = await findReports(child.pid);
            assert.sameMembers(reports, [], "Checking no report files were written");
            await validateContent(result.stdout, {
                pid: child.pid,
                commandline: process.execPath
            });
        });

        it("no hooks", async () => {
            const child = forkProcess(fixture("nohooks.js"));
            const result = await child;

            assert.strictEqual(result.code, 0, "Process exited cleanly");
            reports = await findReports(child.pid);
            assert.strictEqual(reports.length, 1, `Found reports ${reports}`);
            const report = reports[0];
            await validate(report, {
                pid: child.pid,
                commandline: child.spawnargs.join(" ")
            });
        });

        it("no version info", async () => {
            const child = forkProcess(fixture("noversioninfo.js"));
            const result = await child;

            assert.strictEqual(result.code, 0, "Process exited cleanly");
            reports = await findReports(child.pid);
            assert.strictEqual(reports.length, 1, `Found reports ${reports}`);
            const report = reports[0];
            await validate(report, {
                pid: child.pid,
                expectNodeVersion: false,
                expectedVersions: [],
                commandline: child.spawnargs.join(" ")
            });
        });

        it("pass error", async () => {
            const child = forkProcess(fixture("passerror.js"));
            const result = await child;

            assert.strictEqual(result.code, 0, "Process exited cleanly");
            reports = await findReports(child.pid);
            assert.strictEqual(reports.length, 1, `Found reports ${reports}`);
            const report = reports[0];
            await validate(report, {
                pid: child.pid,
                commandline: child.spawnargs.join(" "),
                expectedException: "Testing error handling"
            });
        });

        it.todo("uv handlers", async (done) => {
            const options = { encoding: "utf8", silent: true };
            const child = forkProcess(fixture("uvhandlers.js"), [], options);
            // const result = await child;

            let child_data;
            child.on("message", (data) => {
                child_data = data;
            });
            let stderr = "";
            child.stderr.on("data", (chunk) => {
                stderr += chunk;
            });
            let stdout = "";
            child.stdout.on("data", (chunk) => {
                stdout += chunk;
            });
            child.on("exit", async (code, signal) => {
                assert.strictEqual(code, 0, "Process should exit with expected exit code");
                assert.strictEqual(signal, null, "Process should exit cleanly");
                assert.strictEqual(stderr, "", "Checking no messages on stderr");
                reports = await findReports(child.pid);
                assert.sameMembers(reports, [], "Checking no report files were written");

                // uv handle specific tests.
                const address_re_str = "\\b(?:0+x)?[0-9a-fA-F]+\\b";
                // fs_event and fs_poll handles for file watching.
                // libuv returns file paths on Windows starting with '\\?\'.
                const summary = await getSection(stdout, "Node.js libuv Handle Summary");
                const fs_event_re = new RegExp(`\\[RA]\\s+fs_event\\s+${address_re_str}\\s+filename: (\\\\\\\\\\\?\\\\)?${__filename.replace(/\\/g, "\\\\")}`);
                assert.match(summary, fs_event_re, "Checking fs_event uv handle", { skip: child_data.skip_fs_watch });
                const fs_poll_re = new RegExp(`\\[RA]\\s+fs_poll\\s+${address_re_str}\\s+filename: (\\\\\\\\\\\?\\\\)?${__filename.replace(/\\/g, "\\\\")}`);
                assert.match(summary, fs_poll_re, "Checking fs_poll uv handle");

                // pid handle for the process created by child_process.spawn();
                const pid_re = new RegExp(`\\[RA]\\s+process\\s+${address_re_str}.+\\bpid:\\s${child_data.pid}\\b`);
                assert.match(summary, pid_re, "Checking process uv handle");

                // timer handle created by setInterval and unref'd.
                const timeout_re = new RegExp(`\\[-A]\\s+timer\\s+${address_re_str}.+\\brepeat: 0, timeout in: \\d+ ms\\b`);
                assert.match(summary, timeout_re, "Checking timer uv handle");

                // pipe handle for the IPC channel used by child_process_fork().
                const pipe_re = new RegExp(`\\[RA]\\s+pipe\\s+${address_re_str}.+\\breadable, writable\\b`);
                assert.match(summary, pipe_re, "Checking pipe uv handle");

                // tcp handles. The report should contain three sockets:
                // 1. The server's listening socket.
                // 2. The inbound socket making the request.
                // 3. The outbound socket sending the response.
                const port = child_data.tcp_address.port;
                const tcp_re = new RegExp(`\\[RA]\\s+tcp\\s+${address_re_str}\\s+\\S+:${port} \\(not connected\\)`);
                assert.match(summary, tcp_re, "Checking listening socket tcp uv handle");
                const in_tcp_re = new RegExp(`\\[RA]\\s+tcp\\s+${address_re_str}\\s+\\S+:\\d+ connected to \\S+:${port}\\b`);
                assert.match(summary, in_tcp_re, "Checking inbound connection tcp uv handle");
                const out_tcp_re = new RegExp(`\\[RA]\\s+tcp\\s+${address_re_str}\\s+\\S+:${port} connected to \\S+:\\d+\\b`);
                assert.match(summary, out_tcp_re, "Checking outbound connection tcp uv handle");

                // udp handles.
                const udp_re = new RegExp(`\\[RA]\\s+udp\\s+${address_re_str}\\s+\\S+:${child_data.udp_address.port}\\b`);
                assert.match(summary, udp_re, "Checking udp uv handle");

                await validateContent(stdout, {
                    pid: child.pid,
                    commandline: child.spawnargs.join(" ")
                });
                done();
            });
        });
    });

    it("exception", async () => {
        const child = forkProcess(fixture("exception.js"));
        const result = await assert.throws(async () => child);

        // Capture stderr output from the child process
        assert.strictEqual(result.code, 1, "Check for expected process exit code");
        assert.match(result.stderr, /myException/, "Check for expected stack trace frame in stderr");
        reports = await findReports(child.pid);
        assert.strictEqual(reports.length, 1, `Found reports ${reports}`);
        const report = reports[0];
        await validate(report, {
            pid: child.pid,
            commandline: child.spawnargs.join(" ")
        });
    });

    it("fatal error", async () => {
        const child = forkProcess(fixture("fatalerror.js", ["--max-old-space-size=20"]));
        const result = await assert.throws(async () => child);

        assert.notStrictEqual(result.code, 0, "Process should not exit cleanly");
        reports = await findReports(child.pid);
        assert.strictEqual(reports.length, 1, `Found reports ${reports}`);
        const report = reports[0];
        const options = { pid: child.pid };
        // Node.js currently overwrites the command line on AIX
        // https://github.com/nodejs/node/issues/10607
        if (!(is.aix || is.sunos)) {
            options.commandline = child.spawnargs.join(" ");
        }
        await validate(report, options);
    });

    if (!is.windows) {
        it.todo("signal", (done) => {
            const fork = adone.std.child_process.fork;

            const child = fork(fixture("signal.js"), { silent: true });
            // Wait for child to indicate it is ready before sending signal
            child.on("message", () => child.kill("SIGUSR2"));
            let stderr = "";
            child.stderr.on("data", (chunk) => {
                stderr += chunk;
                // Terminate the child after the report has been written
                if (stderr.includes("Node.js report completed")) {
                    child.kill("SIGTERM");
                }
            });
            child.on("exit", async (code, signal) => {
                assert.strictEqual(code, null, "Process should not exit cleanly");
                assert.strictEqual(signal, "SIGTERM", "Process should exit with expected signal");
                const reports = await findReports(child.pid);
                assert.strictEqual(reports.length, 1, `Found reports ${reports}`);
                const report = reports[0];
                await validate(report, {
                    pid: child.pid,
                    commandline: child.spawnargs.join(" ")
                });
                done();
            });
        });
    }
});
