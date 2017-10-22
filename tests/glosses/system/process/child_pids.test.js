const {
    promise,
    std: { path, child_process: cp },
    system: { process: { getChildPids, kill } },
    util
} = adone;

describe("system", "process", () => {
    const scripts = {
        parent: path.join(__dirname, "fixtures", "child_pids", "parent.js"),
        child: path.join(__dirname, "fixtures", "child_pids", "child.js"),
        spawnChildren: path.join(__dirname, "fixtures", "child_pids", "spawn_children.js")
    };

    it("Spawn a Parent process which has a Two Child Processes", async () => {
        const parent = cp.exec(`node ${scripts.parent}`, (error, stdout, stderr) => { });

        await promise.delay(500);

        let children = await getChildPids(parent.pid);

        assert.isTrue(children.length > 0);
        kill(parent.pid);

        await promise.delay(2000);
        children = await getChildPids(parent.pid);
        assert.equal(children.length, 0);
    });

    it("FORCE ERROR by calling psTree without supplying a Callback", async () => {
        const errmsg = "Error: childrenOfPid(pid, callback) expects callback";
        // Attempt to call psTree without a callback
        try {
            await getChildPids(1234);
        } catch (e) {
            assert.equal(e.toString(), errmsg);
        }
    });

    it("should return pids of children of children", async () => {
        const child = cp.spawn("node", [scripts.spawnChildren]);
        try {
            let stdout = "";
            child.stdout.on("data", (buf) => {
                stdout += buf.toString("utf8");
            });
            await promise.delay(200);
            const children = await getChildPids(child.pid);
            const expectedPids = util.reFindAll(/child pid: (\d+)/g, stdout).map((x) => Number(x[1])).sort();

            await promise.delay(1000);
            expect(children.map((x) => Number(x.PID)).sort()).to.be.deep.equal(expectedPids);
        } finally {
            child.kill();
        }
    });

    it("Spawn a Child Process and psTree with a String as pid", async () => {
        const child = cp.exec(`node ${scripts.child}`, (error, stdout, stderr) => { });
        await promise.delay(200);
        let children = await getChildPids(child.pid.toString());
        await kill(child.pid);

        await promise.delay(1000);
        children = await getChildPids(child.pid.toString());
        assert.equal(children.length, 0);
    });
});
