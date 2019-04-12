const {
    is,
    promise
} = adone;

describe("process", "child pids", () => {
    const {
        std: { path, childProcess },
        process: { getChildPids, kill },
        util
    } = adone;

    const scripts = {
        parent: path.join(__dirname, "fixtures", "parent.js"),
        child: path.join(__dirname, "fixtures", "child.js"),
        spawnChildren: path.join(__dirname, "fixtures", "spawn_children.js")
    };

    it("spawn a parent process which has a two child processes", async () => {
        const parent = childProcess.exec(`node ${scripts.parent}`, (error, stdout, stderr) => { });

        await promise.delay(500);

        let children = await getChildPids(parent.pid);

        assert.isTrue(children.length > 0);
        kill(parent.pid, {
            force: is.windows
        });

        await promise.delay(2000);
        children = await getChildPids(parent.pid);
        assert.equal(children.length, 0);
    });

    it("force error by calling psTree without supplying a callback", async () => {
        const errmsg = "Error: childrenOfPid(pid, callback) expects callback";
        // Attempt to call psTree without a callback
        try {
            await getChildPids(1234);
        } catch (e) {
            assert.equal(e.toString(), errmsg);
        }
    });

    it("should return pids of children of children", async () => {
        const child = childProcess.spawn("node", [scripts.spawnChildren]);
        try {
            let stdout = "";
            child.stdout.on("data", (buf) => {
                stdout += buf.toString("utf8");
            });
            await promise.delay(200);
            const children = await getChildPids(child.pid);
            const expectedPids = util.reFindAll(/child pid: (\d+)/g, stdout).map((x) => Number(x[1])).sort();

            await promise.delay(1000);
            expect(children.map((x) => Number(x.pid)).sort()).to.be.deep.equal(expectedPids);
        } finally {
            kill(child.pid, {
                force: is.windows
            });
        }
    });

    it("spawn a child process and psTree with a string as pid", async () => {
        const child = childProcess.exec(`node ${scripts.child}`, (error, stdout, stderr) => { });
        await promise.delay(200);
        let children = await getChildPids(child.pid.toString());
        await kill(child.pid, {
            force: is.windows
        });

        await promise.delay(1000);
        children = await getChildPids(child.pid.toString());
        assert.equal(children.length, 0);
    });

    it("without args should use current process id", async () => {
        const children = await getChildPids();
        assert.lengthOf(children, 0);
    });
});
