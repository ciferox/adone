import * as stuff from "omnitron/services/process_manager";
import { fixture, processFiles } from "./util";

describe("Process manager", () => {
    const toExecuteAfter = [];
    const executeAfter = (f) => {
        toExecuteAfter.push(f);
    };

    const ensureDies = (p) => {
        executeAfter(() => {
            if (stuff.RemoteProcess.alive(p.process.pid)) {
                process.kill(p.process.pid, "SIGKILL");
            }
        });
    };

    afterEach(async () => {
        while (toExecuteAfter.length) {
            await toExecuteAfter.shift()();
        }
    });
    for (const mode of ["cluster", "single"]) {
        describe(`${mode} interface`, () => {
            it("IProcess.pid() should be equal to Process.pid", async () => {
                const storage = await FS.createTempDirectory();
                const { stdout, port, stderr } = processFiles(storage);

                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode,
                    interpreter: "node",
                    args: [],
                    instances: 4,
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                const ip = new stuff.IProcess({}, p);
                try {
                    expect(ip.pid()).to.be.equal(p.pid);
                } finally {
                    const _p = p.waitForExit();
                    p.kill("SIGKILL");
                    await _p;
                    await storage.unlink();
                }
            });

            it("IProcess.kill() should invoke process.kill()", async () => {
                const storage = await FS.createTempDirectory();
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode,
                    args: [],
                    interpreter: "node",
                    instances: 4,
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                const ip = new stuff.IProcess({}, p);
                ip.kill("SIGKILL");
                try {
                    await p.waitForExit().timeout(400);
                } catch (err) {
                    const _p = p.waitForExit();
                    p.kill("SIGKILL");
                    await _p;
                } finally {
                    await storage.unlink();
                }
            });

            it("IProcess.waitForExit() should wait until the process exits", async () => {
                const storage = await FS.createTempDirectory();
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode,
                    instances: 4,
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                try {
                    const ip = new stuff.IProcess({}, p);
                    const pr = ip.waitForExit();
                    setTimeout(() => p.kill("SIGKILL"), 200);
                    await pr;
                } finally {
                    await storage.unlink();
                }
            });

            if (mode === "cluster") {
                it("IMainProcess.workers() should return process.workers", async () => {
                    const storage = await FS.createTempDirectory();
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode,
                        instances: 4,
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    });
                    try {
                        await p.start();
                        ensureDies(p);
                        const ip = new stuff.IMainProcess({}, p);
                        expect(ip.workers()).to.be.deep.equal(p.workers);
                        const _p = p.waitForExit();
                        p.kill("SIGKILL");
                        await _p;
                    } finally {
                        storage.unlink();
                    }
                });
            }
        });
    }
});
