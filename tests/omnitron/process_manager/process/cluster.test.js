"use stirct";

import adone from "adone";
import * as stuff from "omnitron/services/process_manager";
import { processFiles, fixture } from "../util";

const { x, vendor: { lodash: _ } } = adone;

describe.skip("Process manager", () => {
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

        describe("cluster", function () {
            this.timeout(180000);

            describe("createWorker", () => {
                it("should create a new worker", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    try {
                        expect((await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid)).to.be.empty;
                        await p.createNewWorker();
                        expect((await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid)).to.have.lengthOf(1);
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });

                it("should emit a message", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    try {
                        const events = [];
                        p.on("newWorker", (id, pid) => {
                            events.push([id, pid]);
                        });
                        await p.createNewWorker();
                        const children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid);
                        expect(children).to.have.lengthOf(1);
                        expect(events).to.have.lengthOf(1);
                        expect(events[0][0]).to.be.equal(0);
                        expect(events[0][1]).to.be.equal(children[0].getPID());
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });

                it("should increase the id", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    try {
                        const events = [];
                        p.on("newWorker", (id) => {
                            events.push(id);
                        });
                        await p.createNewWorker();
                        await p.createNewWorker();
                        expect(events).to.be.deep.equal([0, 1]);
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });

                it("should create a worker with given id", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    try {
                        const events = [];
                        p.on("newWorker", (id, pid) => {
                            events.push([id, pid]);
                        });
                        await p.createNewWorker(42);
                        expect(events).to.have.lengthOf(1);
                        expect(events[0][0]).to.be.equal(42);
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });

                it("should return [id, pid]", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    try {
                        const [id, pid] = await p.createNewWorker();
                        const children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid);
                        expect(children[0].getPID()).to.be.equal(pid);
                        expect(id).to.be.equal(0);
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });
            });

            describe("killWorker", () => {
                it("should kill the worker", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    const [, pid] = await p.createNewWorker();
                    try {
                        expect(await OS.getProcess(pid)).not.to.be.null;
                        const res = await p.killWorker(0);
                        expect(await OS.getProcess(pid)).to.be.null;
                        expect(res.code).to.be.null;
                        expect(res.signal).to.be.equal("SIGKILL");
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });

                it("should emit a message", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    await p.createNewWorker();
                    try {
                        const events = [];
                        p.on("workerExit", (id, code, signal) => events.push([id, code, signal]));
                        await p.killWorker(0);
                        expect(events).to.be.deep.equal([[0, null, "SIGKILL"]]);
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });

                it("should gracefully end the worker", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("graceful_cluster_shutdown.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    await p.createNewWorker();
                    const res = await p.killWorker(0, { graceful: true });
                    try {
                        expect(await adone.std.fs.readFileAsync(stdout, "utf-8")).to.be.equal("shutting down\n");
                        expect(res.code).to.be.equal(0);
                        expect(res.signal).to.be.equal(null);
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });

                it("should kill the worker if it doesnt want to exit", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("ignore_sigint.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    await p.createNewWorker();
                    const t = new Date().getTime();
                    const res = await p.killWorker(0, { graceful: true, timeout: 1000 });
                    try {
                        expect(res.code).to.be.equal(null);
                        expect(res.signal).to.be.equal("SIGKILL");
                        expect(new Date().getTime() - t).to.be.at.least(1000);
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });
            });

            it("should return info about the workers", async function () {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("run_forever.js"),
                    mode: "cluster",
                    interpreter: "node",
                    args: [],
                    instances: 0,
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);

                let workers = p.workers;
                expect(_.keys(workers)).to.have.lengthOf(0);
                let children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                expect(children).to.be.empty;

                await p.createNewWorker();
                workers = p.workers;
                expect(_.keys(workers)).to.have.lengthOf(1);
                children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                expect(_.values(workers).map((x) => x.pid).sort()).to.be.deep.equal(children.sort());
                expect(_.keys(workers).map(Number).sort()).to.be.deep.equal([0]);
                for (const { alive } of _.values(workers)) {
                    expect(alive).to.be.true;
                }

                await p.createNewWorker();
                await p.createNewWorker();
                await p.createNewWorker();
                children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                workers = p.workers;
                expect(_.keys(workers)).to.have.lengthOf(4);
                expect(_.values(workers).map((x) => x.pid).sort()).to.be.deep.equal(children.sort());
                expect(_.keys(workers).map(Number).sort()).to.be.deep.equal([...new Array(4)].map((x, i) => i));
                for (const { alive } of _.values(workers)) {
                    expect(alive).to.be.true;
                }

                await p.killWorker(0);
                await p.killWorker(1);
                await p.killWorker(2);
                children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                expect(children).to.have.lengthOf(1);
                workers = p.workers;
                expect(_.keys(workers)).to.have.lengthOf(4);
                expect(_.values(workers).filter((x) => x.alive).map((x) => x.pid).sort()).to.be.deep.equal(children.sort());
                expect(_.keys(workers).map(Number).sort()).to.be.deep.equal([...new Array(4)].map((x, i) => i));
                expect(_.values(workers).map((x) => x.alive)).to.be.deep.equal([false, false, false, true]);

                p.kill("SIGKILL");
                await p.waitForExit();
                expect(p.workers).to.be.empty;
            });

            describe("deleteWorker", () => {
                it("should delete a worker", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    await p.createNewWorker();
                    await p.killWorker(0);
                    try {
                        await p.deleteWorker(0);
                        expect(p.workers).to.be.empty;
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });

                it("should kill the worker if it is alive", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    await p.createNewWorker();
                    try {
                        const events = [];
                        p.on("workerExit", (id) => {
                            events.push(id);
                        });
                        await p.deleteWorker(0);
                        expect(events).to.be.deep.equal([0]);
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });

                it("should gracefully end the worker", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("graceful_cluster_shutdown.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    await p.createNewWorker();
                    try {
                        await p.deleteWorker(0, { graceful: true });
                        expect(await adone.std.fs.readFileAsync(stdout, "utf-8")).to.be.equal("shutting down\n");
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });

                it("should emit a message", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const p = new stuff.MainProcess({}, {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        instances: 0,
                        args: [],
                        stdout, stderr, storage, port
                    });
                    await p.start();
                    ensureDies(p);
                    await p.createNewWorker();
                    try {
                        const events = [];
                        p.on("deleteWorker", (id) => {
                            events.push(id);
                        });
                        await p.deleteWorker(0);
                        expect(events).to.be.deep.equal([0]);
                    } finally {
                        process.kill(p.pid, "SIGKILL");
                        await p.waitForExit();
                    }
                });
            });

            it("should start the process using the cluster container", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("run_forever.js"),
                    mode: "cluster",
                    interpreter: "node",
                    instances: 4,
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                expect(p.alive).to.be.true;
                expect(p.process).to.be.ok;
                expect(p.process.spawnargs[1]).to.match(/cluster\.js$/);
                expect(p.process.spawnargs[2]).to.match(/port\.sock$/);
                expect(p.meta.started).to.be.true;
                expect(p.meta.exited).to.be.false;
                expect(p.meta.restored).to.be.false;

                const children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid);
                expect(children).to.have.lengthOf(4);

                p.process.kill("SIGKILL");
                const data = await new Promise((resolve) => p.process.on("exit", (...args) => resolve(args)));

                expect(p.meta.started).to.be.true;
                expect(p.meta.exited).to.be.true;
                expect(p.meta.exited).to.be.true;
                expect(p.meta.exitCode).to.be.equal(data[0]);
                expect(p.meta.exitSignal).to.be.equal(data[1]);

                await adone.promise.delay(100);  // give some time to die

                for (const child of children) {
                    expect(stuff.RemoteProcess.alive(child.getPID())).to.be.false;
                }
            });

            it("should kill the process with the children", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("run_forever.js"),
                    mode: "cluster",
                    interpreter: "node",
                    args: [],
                    instances: 4,
                    stdout, stderr, storage, port
                });
                const children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid);
                await p.start();
                p.kill("SIGKILL");
                await new Promise((resolve) => p.process.on("exit", resolve));
                await adone.promise.delay(100);
                for (const child of children) {
                    expect(stuff.RemoteProcess.alive(child.getPID())).to.be.false;
                }
            });

            it("should scale the workers", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("run_forever.js"),
                    mode: "cluster",
                    interpreter: "node",
                    args: [],
                    instances: 4,
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                let children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                for (const k of [5, 4, 3, 2, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 4, 8]) {
                    await p.scale(k, { graceful: false });
                    const _children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                    expect(_children).to.have.lengthOf(k);
                    const t = children.length - _children.length;
                    const diff = t > 0 ? _.difference(children, _children) : _.difference(_children, children);
                    expect(diff).to.have.lengthOf(Math.abs(t));  // the same processes
                    children = _children;
                    await adone.promise.delay(50);
                    if (t > 0) {  // some processes should have died
                        for (const child of diff) {
                            expect(stuff.RemoteProcess.alive(child)).to.be.false;
                        }
                    }
                }
                p.kill("SIGKILL");
                await p.waitForExit();
            });

            it("should gracefully scale the workers", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("graceful_cluster_shutdown.js"),
                    mode: "cluster",
                    interpreter: "node",
                    args: [],
                    instances: 4,
                    stdout, stderr, storage, port
                });
                let s = 0;
                await p.start();
                ensureDies(p);
                let children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                for (const k of [5, 4, 3, 2, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 4, 8]) {
                    await p.scale(k, { graceful: true, timeout: 200 });
                    const _children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                    expect(_children).to.have.lengthOf(k);
                    const t = children.length - _children.length;
                    const diff = t > 0 ? _.difference(children, _children) : _.difference(_children, children);
                    expect(diff).to.have.lengthOf(Math.abs(t));  // the same processes
                    children = _children;
                    await adone.promise.delay(50);
                    if (t > 0) {  // some processes should have died
                        for (const child of diff) {
                            expect(stuff.RemoteProcess.alive(child)).to.be.false;
                        }
                        s += t;
                        const data = await adone.std.fs.readFileAsync(stdout, "utf-8");
                        expect(data).to.be.equal("shutting down\n".repeat(s));
                    }
                }
                p.kill("SIGKILL");
                await p.waitForExit();
            });

            it("should clear all the netron vars if exits", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("run_forever.js"),
                    mode: "cluster",
                    interpreter: "node",
                    args: [],
                    instances: 4,
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                p.kill("SIGKILL");
                await p.waitForExit();
                expect(p.netron).to.be.null;
                expect(p.container).to.be.null;
                expect(p.peer).to.be.null;
                expect(p.reemitter).to.be.null;
            });

            it("should answer", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("run_forever.js"),
                    mode: "cluster",
                    interpreter: "node",
                    args: [],
                    instances: 4,
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
                const p = new stuff.MainProcess({}, {
                    path: fixture("run_forever.js"),
                    mode: "cluster",
                    interpreter: "node",
                    args: [],
                    instances: 4,
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
                const p = new stuff.MainProcess({}, {
                    path: fixture("print_process_argv.js"),
                    mode: "cluster",
                    interpreter: "node",
                    instances: 4,
                    args: ["1", "2", "hello"],
                    stdout, stderr, storage, port
                });
                await p.start();
                await adone.promise.delay(100);
                p.kill("SIGKILL");
                const data = (await adone.std.fs.readFileAsync(stdout, "utf-8")).split("\n");
                data.pop();  // an empty string at the end
                expect(data).to.have.lengthOf(4);
                for (const a of data) {
                    expect(JSON.parse(a)).to.be.deep.equal([
                        process.execPath,  // resolve?
                        fixture("print_process_argv.js"),
                        "1", "2", "hello"
                    ]);
                }
            });

            it("should not end the main process immediately if all the workers die", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("exit_in_500ms.js"),
                    mode: "cluster",
                    interpreter: "node",
                    instances: 4,
                    args: [],
                    stdout, stderr, storage, port
                });
                let i = 0;
                const wPids = [];
                const forWorkers = new Promise((resolve) => {
                    p.on("newWorker", (index, pid) => {
                        wPids.push(pid);
                        ++i;
                        if (i === 4) {
                            resolve();
                        }
                    });
                });
                await p.start();
                ensureDies(p);
                await forWorkers;
                for (; ;) {
                    await adone.promise.delay(1000);
                    let br = true;
                    for (const pid of wPids) {
                        const proc = await OS.getProcess(pid);
                        if (proc) {
                            br = false;
                            break;
                        }
                    }
                    if (br) {
                        break;
                    }
                }
                // all the workers have died
                await adone.promise.delay(1000);
                expect(p.alive).to.be.true;
                p.kill("SIGKILL");
                await p.waitForExit();
            });

            it("should end the main process if all the workers die", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("exit_in_500ms.js"),
                    mode: "cluster",
                    interpreter: "node",
                    instances: 4,
                    args: [],
                    stdout, stderr, storage, port
                });
                let i = 0;
                const wPids = [];
                const forWorkers = new Promise((resolve) => {
                    p.on("newWorker", (index, pid) => {
                        wPids.push(pid);
                        ++i;
                        if (i === 4) {
                            resolve();
                        }
                    });
                });
                await p.start();
                ensureDies(p);
                const mainpid = p.pid;
                await forWorkers;
                await p.netron.disconnect();
                for (; ;) {
                    await adone.promise.delay(1000);
                    let br = true;
                    for (const pid of wPids) {
                        const proc = await OS.getProcess(pid);
                        if (proc) {
                            br = false;
                            break;
                        }
                    }
                    if (br) {
                        break;
                    }
                }
                // all the workers have died
                await adone.promise.delay(500);
                expect(await OS.getProcess(mainpid)).to.be.null;
            });

            it("should end the main process immediately if all worker die and there is no master", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("exit_in_500ms.js"),
                    mode: "cluster",
                    interpreter: "node",
                    instances: 4,
                    args: [],
                    stdout, stderr, storage, port
                });
                let i = 0;
                const wPids = [];
                const forWorkers = new Promise((resolve) => {
                    p.on("newWorker", (index, pid) => {
                        wPids.push(pid);
                        ++i;
                        if (i === 4) {
                            resolve();
                        }
                    });
                });
                await p.start();
                ensureDies(p);
                await p.netron.disconnect();
                await forWorkers;
                for (; ;) {
                    await adone.promise.delay(1000);
                    let br = true;
                    for (const pid of wPids) {
                        const proc = await OS.getProcess(pid);
                        if (proc) {
                            br = false;
                            break;
                        }
                    }
                    if (br) {
                        break;
                    }
                }
                // all the workers have died
                try {
                    expect(p.alive).to.be.false;
                } catch (e) {
                    p.kill("SIGKILL");
                    await p.waitForExit();
                }
            });

            it("should throw and be killed if cannot start the workers", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("invalid_script.js"),
                    mode: "cluster",
                    interpreter: "node",
                    instances: 4,
                    stdout, stderr, storage, port
                });
                let err;
                try {
                    ensureDies(p);
                    await p.start();
                } catch (_err) {
                    err = _err;
                }
                expect(err).to.be.ok;
                const { code, signal } = await p.waitForExit();
                expect(code).to.be.null;
                expect(signal).to.be.equal("SIGKILL");
            });

            it("should reload the workers", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("reload.js"),
                    mode: "cluster",
                    interpreter: "node",
                    instances: 4,
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                try {
                    await p.reload({ graceful: false });
                    let data = await adone.std.fs.readFileAsync(stdout, "utf-8");
                    data = data.split("\n").slice(4, -1);  // first 4 are "start"
                    const s = data.filter((_, i) => i % 2);
                    const f = data.filter((_, i) => !(i % 2));
                    expect(s.length).to.be.equal(f.length);
                    for (let i = 0; i < s.length; ++i) {
                        const a = s[i].split(" ");
                        const b = f[i].split(" ");
                        expect(a[0]).to.be.equal("start");
                        expect(b[0]).to.be.equal("shutdown");
                        expect(Number(a[1])).to.be.equal(4 + Number(b[1]));  // shutdown i, fork i + 4
                    }

                } finally {
                    p.kill("SIGKILL");
                    await p.waitForExit();
                }
            });

            it("should gracefully reload the workers", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("reload.js"),
                    mode: "cluster",
                    interpreter: "node",
                    instances: 4,
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                try {
                    await p.reload({ graceful: true });
                    let data = await adone.std.fs.readFileAsync(stdout, "utf-8");
                    data = data.split("\n").slice(4, -1);  // first 4 are "start"
                    const s = data.filter((_, i) => i % 2);
                    const f = data.filter((_, i) => !(i % 2));
                    expect(s.length).to.be.equal(f.length);
                    for (let i = 0; i < s.length; ++i) {
                        const a = s[i].split(" ");
                        const b = f[i].split(" ");
                        expect(a[0]).to.be.equal("start");
                        expect(b[0]).to.be.equal("shutdown");
                        expect(Number(a[1])).to.be.equal(4 + Number(b[1]));  // shutdown i, fork i + 4
                    }
                } finally {
                    p.kill("SIGKILL");
                    await p.waitForExit();
                }
            });

            it("should exit", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("run_forever.js"),
                    mode: "cluster",
                    interpreter: "node",
                    instances: 4,
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                const events = [];
                p.on("deleteWorker", () => events.push(true));
                await p.exit({ graceful: false });
                expect(events).to.have.lengthOf(4);
            });

            it("should exit gracefully", async () => {
                const { stdout, port, stderr } = processFiles(storage);
                const p = new stuff.MainProcess({}, {
                    path: fixture("graceful_cluster_shutdown.js"),
                    mode: "cluster",
                    interpreter: "node",
                    instances: 4,
                    args: [],
                    stdout, stderr, storage, port
                });
                await p.start();
                ensureDies(p);
                await p.exit({ graceful: true });
                const data = await adone.std.fs.readFileAsync(stdout, "utf-8");
                expect(data).to.be.equal("shutting down\n".repeat(4));
            });

            describe("attaching", () => {
                describe("createWorker", () => {
                    it("should create a new worker", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        try {
                            expect((await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid)).to.be.empty;
                            await p.createNewWorker();
                            expect((await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid)).to.have.lengthOf(1);
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });

                    it("should emit a message", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        try {
                            const events = [];
                            p.on("newWorker", (id, pid) => {
                                events.push([id, pid]);
                            });
                            await p.createNewWorker();
                            const children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid);
                            expect(children).to.have.lengthOf(1);
                            expect(events).to.have.lengthOf(1);
                            expect(events[0][0]).to.be.equal(0);
                            expect(events[0][1]).to.be.equal(children[0].getPID());
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });

                    it("should increase the id", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        try {
                            const events = [];
                            p.on("newWorker", (id) => {
                                events.push(id);
                            });
                            await p.createNewWorker();
                            await p.createNewWorker();
                            expect(events).to.be.deep.equal([0, 1]);
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });

                    it("should create a worker with given id", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        try {
                            const events = [];
                            p.on("newWorker", (id, pid) => {
                                events.push([id, pid]);
                            });
                            await p.createNewWorker(42);
                            expect(events).to.have.lengthOf(1);
                            expect(events[0][0]).to.be.equal(42);
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });

                    it("should return [id, pid]", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        try {
                            const [id, pid] = await p.createNewWorker();
                            const children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid);
                            expect(children[0].getPID()).to.be.equal(pid);
                            expect(id).to.be.equal(0);
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });
                });

                describe("killWorker", () => {
                    it("should kill the worker", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        const [, pid] = await p.createNewWorker();
                        try {
                            expect(await OS.getProcess(pid)).not.to.be.null;
                            const res = await p.killWorker(0);
                            expect(await OS.getProcess(pid)).to.be.null;
                            expect(res.code).to.be.null;
                            expect(res.signal).to.be.equal("SIGKILL");
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });

                    it("should emit a message", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        await p.createNewWorker();
                        try {
                            const events = [];
                            p.on("workerExit", (id, code, signal) => events.push([id, code, signal]));
                            await p.killWorker(0);
                            expect(events).to.be.deep.equal([[0, null, "SIGKILL"]]);
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });

                    it("should gracefully end the worker", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("graceful_cluster_shutdown.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        await p.createNewWorker();
                        const res = await p.killWorker(0, { graceful: true });
                        try {
                            expect(await adone.std.fs.readFileAsync(stdout, "utf-8")).to.be.equal("shutting down\n");
                            expect(res.code).to.be.equal(0);
                            expect(res.signal).to.be.equal(null);
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });

                    it("should kill the worker if it doesnt want to exit", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("ignore_sigint.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        await p.createNewWorker();
                        const t = new Date().getTime();
                        const res = await p.killWorker(0, { graceful: true, timeout: 1000 });
                        try {
                            expect(res.code).to.be.equal(null);
                            expect(res.signal).to.be.equal("SIGKILL");
                            expect(new Date().getTime() - t).to.be.at.least(1000);
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });
                });

                it("should return info about the workers", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        args: [],
                        instances: 0,
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.MainProcess({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.MainProcess({}, config);
                    await p.attach(_p.pid, "master2");

                    let workers = p.workers;
                    expect(_.keys(workers)).to.have.lengthOf(0);
                    let children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                    expect(children).to.be.empty;

                    await p.createNewWorker();
                    workers = p.workers;
                    expect(_.keys(workers)).to.have.lengthOf(1);
                    children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                    expect(_.values(workers).map((x) => x.pid).sort()).to.be.deep.equal(children.sort());
                    expect(_.keys(workers).map(Number).sort()).to.be.deep.equal([0]);
                    for (const { alive } of _.values(workers)) {
                        expect(alive).to.be.true;
                    }

                    await p.createNewWorker();
                    await p.createNewWorker();
                    await p.createNewWorker();
                    children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                    workers = p.workers;
                    expect(_.keys(workers)).to.have.lengthOf(4);
                    expect(_.values(workers).map((x) => x.pid).sort()).to.be.deep.equal(children.sort());
                    expect(_.keys(workers).map(Number).sort()).to.be.deep.equal([...new Array(4)].map((x, i) => i));
                    for (const { alive } of _.values(workers)) {
                        expect(alive).to.be.true;
                    }

                    await p.killWorker(0);
                    await p.killWorker(1);
                    await p.killWorker(2);
                    children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                    expect(children).to.have.lengthOf(1);
                    workers = p.workers;
                    expect(_.keys(workers)).to.have.lengthOf(4);
                    expect(_.values(workers).filter((x) => x.alive).map((x) => x.pid).sort()).to.be.deep.equal(children.sort());
                    expect(_.keys(workers).map(Number).sort()).to.be.deep.equal([...new Array(4)].map((x, i) => i));
                    expect(_.values(workers).map((x) => x.alive)).to.be.deep.equal([false, false, false, true]);

                    p.kill("SIGKILL");
                    await p.waitForExit();
                    expect(p.workers).to.be.empty;
                });

                describe("deleteWorker", () => {
                    it("should delete a worker", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        await p.createNewWorker();
                        await p.killWorker(0);
                        try {
                            await p.deleteWorker(0);
                            expect(p.workers).to.be.empty;
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });

                    it("should kill the worker if it is alive", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        await p.createNewWorker();
                        try {
                            const events = [];
                            p.on("workerExit", (id) => {
                                events.push(id);
                            });
                            await p.deleteWorker(0);
                            expect(events).to.be.deep.equal([0]);
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });

                    it("should gracefully end the worker", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("graceful_cluster_shutdown.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        await p.createNewWorker();
                        try {
                            await p.deleteWorker(0, { graceful: true });
                            expect(await adone.std.fs.readFileAsync(stdout, "utf-8")).to.be.equal("shutting down\n");
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });

                    it("should emit a message", async () => {
                        const { stdout, port, stderr } = processFiles(storage);
                        const config = {
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 0,
                            stdout, stderr, storage, port
                        };
                        const _p = new stuff.MainProcess({}, config);
                        await _p.start();
                        ensureDies(_p);
                        const p = new stuff.MainProcess({}, config);
                        await p.attach(_p.pid, "master2");
                        await p.createNewWorker();
                        try {
                            const events = [];
                            p.on("deleteWorker", (id) => {
                                events.push(id);
                            });
                            await p.deleteWorker(0);
                            expect(events).to.be.deep.equal([0]);
                        } finally {
                            process.kill(p.pid, "SIGKILL");
                            await p.waitForExit();
                        }
                    });
                });

                it("should attach to a process", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        args: [],
                        instances: 4,
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.MainProcess({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.MainProcess({}, config);
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

                it("should kill the process and all the children", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        args: [],
                        instances: 4,
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.MainProcess({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.MainProcess({}, config);
                    await p.attach(_p.pid, "master2");
                    const children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid);
                    p.kill("SIGKILL");
                    await new Promise((resolve) => p.process.on("exit", resolve));
                    await adone.promise.delay(100);
                    for (const child of children) {
                        expect(stuff.RemoteProcess.alive(child.getPID())).to.be.false;
                    }
                });

                it("should scale the workers", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        args: [],
                        instances: 4,
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.MainProcess({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.MainProcess({}, config);
                    await p.attach(_p.pid, "master2");
                    let children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                    for (const k of [5, 4, 3, 2, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 4, 8]) {
                        await p.scale(k, { graceful: false });
                        const _children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                        expect(_children).to.have.lengthOf(k);
                        const t = children.length - _children.length;
                        const diff = t > 0 ? _.difference(children, _children) : _.difference(_children, children);
                        expect(diff).to.have.lengthOf(Math.abs(t));  // the same processes
                        children = _children;
                        await adone.promise.delay(50);
                        if (t > 0) {  // some processes should have died
                            for (const child of diff) {
                                expect(stuff.RemoteProcess.alive(child)).to.be.false;
                            }
                        }
                    }
                    p.kill("SIGKILL");
                    await p.waitForExit();
                });

                it("should gracefully scale the workers", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("graceful_cluster_shutdown.js"),
                        mode: "cluster",
                        interpreter: "node",
                        args: [],
                        instances: 4,
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.MainProcess({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.MainProcess({}, config);
                    await p.attach(_p.pid, "master2");
                    let s = 0;
                    let children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                    for (const k of [5, 4, 3, 2, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 4, 8]) {
                        await p.scale(k, { graceful: true, timeout: 200 });
                        const _children = (await OS.getProcesses()).filter((x) => x.getParentPID() === p.pid).map((x) => x.getPID());
                        expect(_children).to.have.lengthOf(k);
                        const t = children.length - _children.length;
                        const diff = t > 0 ? _.difference(children, _children) : _.difference(_children, children);
                        expect(diff).to.have.lengthOf(Math.abs(t));  // the same processes
                        children = _children;
                        await adone.promise.delay(50);
                        if (t > 0) {  // some processes should have died
                            for (const child of diff) {
                                expect(stuff.RemoteProcess.alive(child)).to.be.false;
                            }
                            s += t;
                            const data = await adone.std.fs.readFileAsync(stdout, "utf-8");
                            expect(data).to.be.equal("shutting down\n".repeat(s));
                        }
                    }
                    p.kill("SIGKILL");
                    await p.waitForExit();
                });

                it("should clear all the netron vars if exits", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("graceful_cluster_shutdown.js"),
                        mode: "cluster",
                        interpreter: "node",
                        args: [],
                        instances: 4,
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.MainProcess({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.MainProcess({}, config);
                    await p.attach(_p.pid, "master2");
                    p.kill("SIGKILL");
                    await p.waitForExit();
                    expect(p.netron).to.be.null;
                    expect(p.container).to.be.null;
                    expect(p.peer).to.be.null;
                });

                it("should not end the main process immediately if all the workers die", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("exit_in_500ms.js"),
                        mode: "cluster",
                        interpreter: "node",
                        args: [],
                        instances: 4,
                        stdout, stderr, storage, port
                    };
                    let i = 0;
                    const wPids = [];
                    const _p = new stuff.MainProcess({}, config);
                    const forWorkers = new Promise((resolve) => {
                        _p.on("newWorker", (index, pid) => {
                            wPids.push(pid);
                            ++i;
                            if (i === 4) {
                                resolve();
                            }
                        });
                    });

                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.MainProcess({}, config);
                    await p.attach(_p.pid, "master2");
                    await forWorkers;
                    for (; ;) {
                        await adone.promise.delay(1000);
                        let br = true;
                        for (const pid of wPids) {
                            const proc = await OS.getProcess(pid);
                            if (proc) {
                                br = false;
                                break;
                            }
                        }
                        if (br) {
                            break;
                        }
                    }
                    // all the workers have died
                    await adone.promise.delay(1000);
                    expect(p.alive).to.be.true;
                    p.kill("SIGKILL");
                    await p.waitForExit();
                });

                it("should exit", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("run_forever.js"),
                        mode: "cluster",
                        interpreter: "node",
                        args: [],
                        instances: 4,
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.MainProcess({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.MainProcess({}, config);
                    await p.attach(_p.pid, "master2");
                    const events = [];
                    p.on("deleteWorker", () => events.push(true));
                    await p.exit({ graceful: false });
                    expect(events).to.have.lengthOf(4);
                });

                it("should exit gracefully", async () => {
                    const { stdout, port, stderr } = processFiles(storage);
                    const config = {
                        path: fixture("graceful_cluster_shutdown.js"),
                        mode: "cluster",
                        interpreter: "node",
                        args: [],
                        instances: 4,
                        stdout, stderr, storage, port
                    };
                    const _p = new stuff.MainProcess({}, config);
                    await _p.start();
                    ensureDies(_p);
                    const p = new stuff.MainProcess({}, config);
                    await p.attach(_p.pid, "master2");
                    await p.exit({ graceful: true });
                    const data = await adone.std.fs.readFileAsync(stdout, "utf-8");
                    expect(data).to.be.equal("shutting down\n".repeat(4));
                });
            });
        });
    });
});
