describe("process", "kill", () => {
    const {
        is,
        promise,
        process: { kill, exists, getChildPids },
        std: { childProcess }
    } = adone;

    // Ensure the noop process has time to exit
    const noopProcessKilled = async (pid) => {
        // Ensure the noop process has time to exit
        await promise.delay(100);
        assert.isFalse(await exists(pid));
    };

    const cleanupPids = new Set();
    const exitPids = new Set();

    const killAll = (pids) => {
        for (const pid of pids) {
            try {
                process.kill(pid, "SIGKILL");
            } catch (err) {
                //
            }
        }
    };

    const noopProcess = ({ title, persistent } = {}) => {
        if (title && title.length > 15) {
            return Promise.reject(new Error("The title can be maximum 15 characters"));
        }

        const setTitleCode = title ? `process.title = '${title}';` : "";
        const code = `${setTitleCode} setInterval(() => {}, 1000 * 1000);console.log('ok');`;

        return new Promise((resolve, reject) => {
            const cp = childProcess.spawn("node", ["-e", code], {
                detached: true
            });

            cp.on("error", reject);
            cp.stdout.setEncoding("utf8");

            cp.stdout.on("data", (data) => {
                if (data.trim() === "ok") {
                    cp.stdio = ["ignore", "ignore", "ignore"];
                    resolve(cp.pid);
                }
            });

            cp.unref();

            if (!persistent) {
                exitPids.add(cp.pid);
            }

            cleanupPids.add(cp.pid);
        });
    };

    const fixture = (name = "") => adone.path.join(__dirname, "fixtures", name);

    after(() => {
        killAll(exitPids);
    });

    it("pid", async () => {
        const pid = await noopProcess();
        await kill(pid, { force: true });
        await noopProcessKilled(pid);
    });

    if (is.windows) {
        it("title", async () => {
            const title = "notepad.exe";
            const pid = childProcess.spawn(title).pid;

            await kill(title, { force: true });

            assert.isFalse(await exists(pid));
        });

        it("win default ignore case", async () => {
            const title = "notepad.exe";
            const pid = childProcess.spawn(title).pid;

            await kill("NOTEPAD.EXE", { force: true });
            assert.isFalse(await exists(pid));
        });
    } else {
        it("title", async () => {
            const title = "kill-test";
            const pid = await noopProcess({ title });

            await kill(title);

            await noopProcessKilled(pid);
        });

        it("ignore case", async () => {
            const pid = await noopProcess({ title: "Capitalized" });
            await kill("capitalized", { ignoreCase: true });

            await noopProcessKilled(pid);
        });
    }

    it("fail", async () => {
        try {
            await kill(["123456", "654321"]);
            assert.fail();
        } catch (err) {
            assert.match(err.message, /123456/);
            assert.match(err.message, /654321/);
        }
    });

    it("don't kill self", async () => {
        const originalFkillPid = process.pid;
        const pid = await noopProcess();
        Object.defineProperty(process, "pid", { value: pid });

        await kill(process.pid);

        await promise.delay(100);
        assert.isTrue(await exists(pid));
        Object.defineProperty(process, "pid", { value: originalFkillPid });
    });

    it("ignore ignore-case for pid", async () => {
        const pid = await noopProcess();
        await kill(pid, { force: true, ignoreCase: true });

        await noopProcessKilled(pid);
    });

    describe("tree", () => {
        it("should kill the entire process tree", async () => {
            const child = forkProcess("../child_pids/fixtures/spawn_children");
            const exit = spy();
            child.on("exit", exit);
            try {
                await promise.delay(1000);
                const children = await getChildPids(child.pid);
                expect(children).to.have.lengthOf(is.windows ? 11 : 10);
                await Promise.all([
                    kill(child.pid, {
                        tree: true,
                        force: is.windows
                    }),
                    exit.waitForCall()
                ]);
                for (const child of children) {
                    expect(await exists(child)).to.be.false(); // eslint-disable-line
                }
            } finally {
                child.kill();
            }
        });
    });

    it("by port", async () => {
        const port = await adone.net.getPort();
        const pid = childProcess.spawn("node", [fixture("pid_by_port.js"), port]).pid;
        await kill(pid, { force: true });
        await noopProcessKilled(pid);
        assert.equal(await adone.net.getPort({ port }), port);
    });

    it("error when process is not found", async () => {
        await assert.throws(async () => kill(["notFoundProcess"]), /Killing process notFoundProcess failed: Process doesn't exist/);
    });
});
