const {
    is,
    promise
} = adone;

describe("system", "process", () => {
    describe("list processes", () => {
        const {
            system: { process: { list } }
        } = adone;

        it("list()", async () => {
            const binName = is.windows ? "node.exe" : "node";
            const result = await list();

            assert.true(result.some((x) => x.name.includes(binName)));
            assert.true(result.every((x) => is.number(x.pid) && is.string(x.name) && is.string(x.cmd)));

            (!is.windows) && assert.true(result.every((x) => is.string(x.cpu)));
        });
    });

    describe("child pids", () => {
        const {
            std: { path, child_process: cp },
            system: { process: { getChildPids, kill } },
            util
        } = adone;

        const scripts = {
            parent: path.join(__dirname, "fixtures", "child_pids", "parent.js"),
            child: path.join(__dirname, "fixtures", "child_pids", "child.js"),
            spawnChildren: path.join(__dirname, "fixtures", "child_pids", "spawn_children.js")
        };

        it("spawn a parent process which has a two child processes", async () => {
            const parent = cp.exec(`node ${scripts.parent}`, (error, stdout, stderr) => { });

            await promise.delay(500);

            let children = await getChildPids(parent.pid);

            assert.true(children.length > 0);
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
                expect(children.map((x) => Number(x.pid)).sort()).to.be.deep.equal(expectedPids);
            } finally {
                kill(child.pid, {
                    force: is.windows
                });
            }
        });

        it("spawn a child process and psTree with a string as pid", async () => {
            const child = cp.exec(`node ${scripts.child}`, (error, stdout, stderr) => { });
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

    describe("pids by ports", () => {
        const {
            net: { util: { getPort } },
            system: { process: { getPidByPort, getPidsByPorts, getAllPidsByPorts } },
            std: { http }
        } = adone;

        const srv = () => http.createServer((req, res) => {
            res.end();
        });

        it("success", async () => {
            const port = await getPort();
            const server = srv().listen(port);
            assert.ok(await getPidByPort(port));
            server.close();
        });

        it("fail", async () => {
            await assert.throws(async () => getPidByPort(0));
            await assert.throws(async () => getPidsByPorts([0]));
        });

        it("accepts a number", async () => {
            await assert.throws(async () => getPidByPort("foo"), "Expected a number, got string");
        });

        it("all", async () => {
            const [p1, p2] = await Promise.all([getPort(), getPort()]);
            const [s1, s2] = [srv().listen(p1), srv().listen(p2)];
            const ports = await getPidsByPorts([p1, p2]);

            assert.true(ports instanceof Map);

            for (const x of ports.values()) {
                assert.equal(typeof x, "number");
            }

            s1.close();
            s2.close();
        });

        it("list", async () => {
            const list = await getAllPidsByPorts();
            assert.true(list instanceof Map);
            await getPidsByPorts(Array.from(list.keys()));
        });
    });
});
