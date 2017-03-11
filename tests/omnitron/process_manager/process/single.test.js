import * as stuff from "omnitron/services/process_manager";
import { processFiles, fixture } from "../util";

const { x } = adone;

describe("Process manager", () => {
    describe("Process", () => {
        let storage;
        let OS;

        before(async () => {
            stuff.netronOptions.responseTimeout = 100000;
            OS = adone.metrics.system;
        });

        beforeEach(async () => {
            storage = await FS.createTempDirectory();
        });

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
            try {
                while (toExecuteAfter.length) {
                    await toExecuteAfter.shift()();
                }
            } finally {
                await storage.unlink();
            }
        });

        describe("single", function () {
            this.timeout(180000);

            it("should return the process pid", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                try {
                    expect(p.pid).to.be.equal(p.process.pid);
                } finally {
                    p.process.kill("SIGKILL");
                }
            });

            it("should kill the process", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                p.kill("SIGKILL");
                await new Promise((resolve) => p.process.on("exit", resolve));
                expect(stuff.RemoteProcess.alive(p.process.pid)).to.be.false;
            });

            it("should start the process using the single container", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                executeAfter(() => {
                    if (stuff.RemoteProcess.alive(p.process.pid)) {
                        process.kill(p.process.pid, "SIGKILL");
                    }
                });
                expect(p.alive).to.be.true;
                expect(p.process).to.be.ok;
                expect(p.process.spawnargs[1]).to.match(/single\.js$/);
                expect(p.process.spawnargs[2]).to.match(/port\.sock$/);
                expect(p.meta.started).to.be.true;
                expect(p.meta.exited).to.be.false;
                expect(p.meta.restored).to.be.false;
                p.process.kill("SIGKILL");
                const data = await new Promise((resolve) => p.process.on("exit", (...args) => resolve(args)));
                expect(p.meta.started).to.be.true;
                expect(p.meta.exited).to.be.true;
                expect(p.meta.exited).to.be.true;
                expect(p.meta.exitCode).to.be.equal(data[0]);
                expect(p.meta.exitSignal).to.be.equal(data[1]);
            });

            it("should emit exit event if exits", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                p.kill("SIGKILL");
                let emitted = null;
                p.on("exit", (...args) => {
                    emitted = args;
                });
                await new Promise((resolve) => p.process.on("exit", resolve));
                await adone.promise.delay(33);
                expect(emitted).to.be.deep.equal([null, "SIGKILL"]);  // code, signal
            });

            it("should wait for the process exit", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                setTimeout(() => {
                    p.kill("SIGKILL");
                }, 300);
                const res = await p.waitForExit();
                expect(res).to.be.deep.equal({ code: null, signal: "SIGKILL" });
            });

            it("should throw if you try to wait for exit of the exited process", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    stdout, stderr, storage, port
                });
                await p.start();
                setTimeout(() => {
                    p.kill("SIGKILL");
                }, 300);
                await p.waitForExit();
                const err = await p.waitForExit().catch((err) => err);
                expect(err).to.be.instanceOf(x.IllegalState);
                expect(err.message).to.be.equal("Has already exited");
            });

            it("should exit by itself", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("synchronous.js"),
                    mode: "single",
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                expect(p.alive).to.be.true;
                expect(p.meta.exited).to.be.false;
                const { code, signal } = await p.waitForExit();
                expect(code).to.be.equal(0);
                expect(signal).to.be.null;
            });

            it("should exit with non zero code", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("exit_with_code_2.js"),
                    mode: "single",
                    interpreter: "node",
                    stdout, stderr, storage, port
                });
                await p.start();
                await adone.promise.delay(500);
                expect(p.alive).to.be.false;
                expect(p.meta.exited).to.be.true;
                expect(p.meta.exitCode).to.be.equal(2);
                expect(p.meta.exitSignal).to.be.null;
            });

            it("should be terminated by SIGINT", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                setTimeout(() => p.kill("SIGINT"), 200);
                const { code, signal } = await p.waitForExit();
                expect(code).to.be.null;
                expect(signal).to.be.equal("SIGINT");
            });

            it("should redirect the stdout to a file", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("stdout.js"),
                    mode: "single",
                    interpreter: "node",
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                if (p.alive) {
                    await p.waitForExit();
                }
                const data = await adone.std.fs.readFileAsync(stdout, "utf-8");
                expect(data).to.be.equal("Some important message\n");
            });

            it("should redirect the stderr to a file", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("stderr.js"),
                    mode: "single",
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                if (p.alive) {
                    await p.waitForExit();
                }
                const data = await adone.std.fs.readFileAsync(stderr, "utf-8");
                expect(data).to.be.equal("Important debug messages\n");
            });

            it("should kill the process if the netron/peer disconnects", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                setTimeout(() => {
                    p.netron.disconnect();
                }, 200);
                const { signal } = await p.waitForExit();
                expect(signal).to.be.equal("SIGKILL");
            });

            it("should clear all the netron vars if exits", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                p.kill("SIGKILL");
                await p.waitForExit();
                expect(p.netron).to.be.null;
                expect(p.container).to.be.null;
                expect(p.peer).to.be.null;
            });

            it("should answer", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                try {
                    expect(await p.ping()).to.be.equal("pong");
                } finally {
                    p.kill("SIGKILL");
                    await p.waitForExit();
                }
            });

            it("should throw if there is no connection", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    args: [],
                    stdout, stderr, storage, port
                });
                let err;
                try {
                    expect(await p.ping()).to.be.equal("pong");
                } catch (_err) {
                    err = _err;
                }
                expect(err).to.be.instanceOf(x.IllegalState);
                expect(err.message).to.be.equal("No connection with the peer");
            });

            it("should patch the argv", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("print_process_argv.js"),
                    mode: "single",
                    interpreter: "node",
                    args: ["1", "2", "hello"],
                    stdout, stderr, storage, port
                });
                await p.start();
                p.kill("SIGKILL");
                const data = JSON.parse(await adone.std.fs.readFileAsync(stdout, "utf-8"));
                expect(data).to.be.deep.equal([
                    process.execPath,  // resolve?
                    fixture("print_process_argv.js"),
                    "1", "2", "hello"
                ]);
            });

            it("should exit", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("run_forever.js"),
                    mode: "single",
                    interpreter: "node",
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                let proc = await OS.getProcess(p.pid);
                expect(proc).to.be.not.null;
                await p.exit({ graceful: false });
                proc = await OS.getProcess(p.pid);
                expect(proc).to.be.null;
            });

            it("should exit gracefully", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("graceful_shutdown.js"),
                    mode: "single",
                    interpreter: "node",
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                let proc = await OS.getProcess(p.pid);
                expect(proc).to.be.not.null;
                await p.exit({ graceful: true });
                proc = await OS.getProcess(p.pid);
                expect(proc).to.be.null;
                expect(p.meta.exitCode).to.be.equal(0);
                expect(p.meta.exitSignal).to.be.null;
            });

            it("should kill the process if it doesnt want to exit", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.Process({}, {
                    path: fixture("ignore_sigint.js"),
                    mode: "single",
                    interpreter: "node",
                    stdout, stderr, storage, port
                });
                await p.start();
                executeAfter(() => {
                    if (stuff.RemoteProcess.alive(p.process.pid)) {
                        process.kill(p.process.pid, "SIGKILL");
                    }
                });
                let proc = await OS.getProcess(p.pid);
                expect(proc).to.be.not.null;
                const t = new Date().getTime();
                await p.exit({ graceful: true, timeout: 1000 });
                proc = await OS.getProcess(p.pid);
                expect(proc).to.be.null;
                expect(p.meta.exitCode).to.be.null;
                expect(p.meta.exitSignal).to.be.equal("SIGKILL");
                expect(new Date().getTime() - t).to.be.at.least(1000);
            });

            describe("attaching", () => {
                it("should attach to a process", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "single",
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.Process({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.Process({}, config);
                    await p.attach(_p.pid, "master2");
                    expect(p.netron).to.be.ok;
                    expect(p.peer).to.be.ok;
                    expect(p.container).to.be.ok;
                    expect(p.alive).to.be.true;
                    expect(p.process).to.be.instanceOf(stuff.PRemoteProcess);
                    expect(p.meta.started).to.be.true;
                    expect(p.meta.exited).to.be.false;
                    expect(p.meta.restored).to.be.true;
                    p.process.kill("SIGKILL");
                    const data = await new Promise((resolve) => p.process.on("exit", (...args) => resolve(args)));
                    expect(p.meta.started).to.be.true;
                    expect(p.meta.exited).to.be.true;
                    expect(p.meta.exited).to.be.true;
                    expect(p.meta.exitCode).to.be.equal(data[0]);
                    expect(p.meta.exitSignal).to.be.equal(data[1]);
                });

                it("should return the process pid", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "single",
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.Process({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.Process({}, config);
                    await p.attach(_p.pid, "master2");
                    try {
                        expect(p.pid).to.be.equal(p.process.pid);
                    } finally {
                        p.process.kill("SIGKILL");
                        await new Promise((resolve) => p.process.on("exit", resolve));
                    }
                });

                it("should kill the process", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "single",
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.Process({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.Process({}, config);
                    await p.attach(_p.pid, "master2");
                    p.kill("SIGKILL");
                    await new Promise((resolve) => p.process.on("exit", resolve));
                });

                it("should emit exit event if exits", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "single",
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.Process({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.Process({}, config);
                    await p.attach(_p.pid, "master2");
                    p.kill("SIGKILL");
                    let emitted = null;
                    p.on("exit", (...args) => {
                        emitted = args;
                    });
                    await new Promise((resolve) => p.process.on("exit", resolve));
                    await adone.promise.delay(33);
                    expect(emitted).to.be.deep.equal([-1, "UNKNOWN"]);  // cannot get the code and signal...
                });

                it("should wait for the process exit", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "single",
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.Process({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.Process({}, config);
                    await p.attach(_p.pid, "master2");
                    setTimeout(() => {
                        p.kill("SIGKILL");
                    }, 300);
                    const res = await p.waitForExit();
                    expect(res).to.be.deep.equal({ code: -1, signal: "UNKNOWN" });
                });

                it("should throw if you try to wait for exit of the exited process", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "single",
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.Process({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.Process({}, config);
                    await p.attach(_p.pid, "master2");
                    setTimeout(() => {
                        p.kill("SIGKILL");
                    }, 300);
                    await p.waitForExit();
                    const err = await p.waitForExit().catch((err) => err);
                    expect(err).to.be.instanceOf(x.IllegalState);
                    expect(err.message).to.be.equal("Has already exited");
                });

                it("should clear all the netron vars if exits", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "single",
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.Process({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.Process({}, config);
                    await p.attach(_p.pid, "master2");
                    p.kill("SIGKILL");
                    await p.waitForExit();
                    expect(p.netron).to.be.null;
                    expect(p.container).to.be.null;
                    expect(p.peer).to.be.null;
                });

                it("should exit", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "single",
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.Process({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.Process({}, config);
                    await p.attach(_p.pid, "master2");
                    let proc = await OS.getProcess(p.pid);
                    expect(proc).to.be.not.null;
                    await p.exit({ graceful: false });
                    proc = await OS.getProcess(p.pid);
                    expect(proc).to.be.null;
                });

                it("should exit gracefully", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("graceful_shutdown.js"),
                        mode: "single",
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.Process({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.Process({}, config);
                    await p.attach(_p.pid, "master2");
                    let proc = await OS.getProcess(p.pid);
                    expect(proc).to.be.not.null;
                    await p.exit({ graceful: true });
                    proc = await OS.getProcess(p.pid);
                    expect(proc).to.be.null;
                    expect(await adone.std.fs.readFileAsync(stdout, "utf-8")).to.be.equal("graceful\n");
                });

                it("should kill the process if it doesnt want to exit", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("ignore_sigint.js"),
                        mode: "single",
                        interpreter: "node",
                        args: [],
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.Process({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.Process({}, config);
                    await p.attach(_p.pid, "master2");
                    let proc = await OS.getProcess(p.pid);
                    expect(proc).to.be.not.null;
                    const t = new Date().getTime();
                    await p.exit({ graceful: true, timeout: 1000 });
                    proc = await OS.getProcess(p.pid);
                    expect(proc).to.be.null;
                    // cannot check the exit code/signal
                    expect(new Date().getTime() - t).to.be.at.least(1000);
                });
            });
        });
    });
});
