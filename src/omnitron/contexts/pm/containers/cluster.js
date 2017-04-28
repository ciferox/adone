import adone from "adone";
const {
    netron: { Netron, decorator: { Contextable, Private, Public } },
    std: { cluster }
} = adone;

const port = process.argv[2];
const netron = new Netron();
let master = null;
let started = false;

@Contextable
@Private
class Container {
    constructor() {
        this.registered = new Set();
        this._workers = new Map();
        this._scheduledExit = null;
        this._configuration = {
            noWorkersTimeout: 5000,
            workersStartTimeout: 100
        };
        this.env = {};
    }

    @Public
    ping() {
        return "pong";
    }

    @Public
    register(context) {
        this.registered.add(context);
    }

    async emit(event, ...data) {
        for (const context of this.registered) {
            try {
                await context[event].void(...data);
            } catch (err) {
                this.registered.delete(context);  // cannot send
            }
        }
    }

    @Public
    killWorker(id, { graceful = false, timeout = 2000 } = {}) {
        const { worker } = this._workers.get(id);
        if (worker.isDead()) {
            return;
        }
        worker.send("shutdown");
        if (graceful) {
            worker.send("graceful");
            worker.disconnect();
            const timer = setTimeout(() => {
                worker.kill("SIGKILL");
            }, timeout);
            worker.on("exit", () => {
                clearTimeout(timer);
            });
        } else {
            worker.kill("SIGKILL");
        }

        return new Promise((resolve) => {
            worker.on("exit", (code, signal) => resolve({ code, signal }));
        });
    }

    async _fork() {
        const worker = cluster.fork(this.env);
        let exited = null;
        await new Promise((resolve, reject) => {
            // ...
            const online = () => {
                worker.removeListener("error", error);
                worker.removeListener("exit", exit);
                resolve();
            };
            const error = (err) => {
                worker.removeListener("online", online);
                worker.removeListener("exit", exit);
                reject(err);
            };
            const exit = (code, signal) => {
                worker.removeListener("online", online);
                worker.removeListener("error", error);
                exited = { code, signal };
                resolve();
            };
            worker.once("online", online).once("error", error).once("exit", exit);
        });
        // it can send "online" but and fail due some js error o_O
        await new Promise((resolve, reject) => {
            const exit = (code, signal) => {
                if (timer) {
                    clearTimeout(timer);
                }
                if (signal || code !== 0) {  // what if it exists normally?
                    if (signal) {
                        reject(new adone.x.Exception(`The process was terminated by signal ${signal}`));
                    } else {
                        reject(new adone.x.Exception(`The process exited with code ${code}`));
                    }
                } else {
                    resolve();
                }
            };
            if (exited) {
                return exit(exited.code, exited.signal);
            }
            worker.once("exit", exit);
            const timer = setTimeout(() => {
                worker.removeListener("exit", exit);
                resolve();
            }, this._configuration.workersStartTimeout);  // actually it should be so fast
        });
        return worker;
    }

    @Public
    async setNewWorker(i) {
        const worker = await this._fork();
        worker.on("exit", (code, signal) => {
            this._workers.get(i).disappeared = new Date().getTime();
            this.emit("workerExit", i, code, signal);
            if (master === null && Object.keys(cluster.workers).length === 0) {
                process.exit(1);
            }
        });
        this._workers.set(i, { worker, appeared: new Date().getTime() });
        return worker.process.pid;
    }

    @Public
    async deleteWorker(i) {
        this._workers.delete(i);
    }

    @Public
    workers() {
        return [...this._workers.entries()].map(([id, { worker, appeared, disappeared }]) => {
            return { id, pid: worker.process.pid, alive: !worker.isDead(), appeared, disappeared };
        });
    }

    @Public
    async start(path, args = []) {
        // really ?
        started = true;
        this.env.pm_exec_path = path;
        cluster.setupMaster({
            exec: adone.std.path.join(__dirname, "cluster_fork_container.js"),
            args
        });
    }
}

netron.attachContext(new Container(), "container");

netron.on("peer online", (peer) => {
    if (!master) {
        master = peer;
    }
    if (started) {
        // peer.unref();
    }
});

netron.on("peer offline", (peer) => {
    if (peer === master) {
        master = null;
        // netron.refGates();  // wait for the master
    }
});

async function main() {
    await netron.bind({ port });
}

main().catch((err) => {
    console.error(new Date(), err.stack || err.message || err);
    process.exit(128 + 13);
});
