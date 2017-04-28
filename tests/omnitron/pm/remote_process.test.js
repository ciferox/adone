import * as stuff from "omnitron/contexts/pm";
import { fixture } from "./util";

const { std: { child_process: cp }, netron: { Netron }, is, fs } = adone;

describe("Process manager", () => {
    const toExecuteAfter = [];
    const executeAfter = (f) => {
        toExecuteAfter.push(f);
    };

    const ensureDies = (p) => {
        executeAfter(() => {
            try {
                process.kill(p.pid, "SIGKILL");
            } catch (err) {
                // died
            }
        });
    };

    afterEach(async () => {
        while (toExecuteAfter.length) {
            await toExecuteAfter.shift()();
        }
    });

    describe("RemoteProcess", () => {
        it("should check if some process is alive", async () => {
            const p = cp.spawn(process.execPath, [fixture("run_forever.js")]);
            ensureDies(p);
            expect(stuff.RemoteProcess.alive(p.pid)).to.be.true;
            p.kill("SIGKILL");
            await new Promise((resolve) => p.on("exit", resolve));
            expect(stuff.RemoteProcess.alive(p.pid)).to.be.false;
        });

        it("should check if some process is alive(wrapper)", async () => {
            const p = cp.spawn(process.execPath, [fixture("run_forever.js")]);
            ensureDies(p);
            const rp = new stuff.RemoteProcess(p.pid);
            expect(rp.alive).to.be.true;
            p.kill("SIGKILL");
            await new Promise((resolve) => p.on("exit", resolve));
            expect(rp.alive).to.be.false;
        });

        it("should wait until the process dies", async () => {
            const p = cp.spawn(process.execPath, [fixture("run_forever.js")]);
            setTimeout(() => p.kill("SIGKILL"), 666);
            const rp = new stuff.RemoteProcess(p.pid);
            const t = new Date().getTime();
            await new Promise((resolve) => rp.on("exit", resolve));
            expect(new Date().getTime() - t).to.be.at.least(666);
        });
    });

    describe("PRemoteProcess", () => {
        it("should exit when the peer disconnects", async () => {
            const dir = await fs.Directory.createTmp();
            const port = is.win32 ? "\\\\.\\pipe\\port.sock" : dir.getVirtualFile("port").path();
            try {
                const p = cp.spawn(process.execPath, [fixture("run_forever_bind.js"), port], {
                    stdio: [null, "inherit", "inherit"]
                });
                ensureDies(p);
                const netron = new Netron(null, {
                    reconnects: 10,
                    retryTimeout: 200,
                    retryMaxTimeout: 2000
                });
                const peer = await netron.connect({ port });
                const simple = peer.getInterfaceByName("simple");
                setTimeout(() => simple.exit().catch(() => { }), 666);
                const rp = new stuff.PRemoteProcess(p.pid, peer);
                const t = new Date().getTime();
                await new Promise((resolve) => rp.on("exit", resolve));
                expect(new Date().getTime() - t).to.be.at.least(666);
            } finally {
                await dir.unlink();
            }
        });
    });
});
