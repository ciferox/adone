import * as stuff from "omnitron/services/process_manager";

describe.skip("Process manager", () => {
    describe("Process", () => {
        it("should be not alive", () => {
            const p = new stuff.Process({}, {});
            expect(p.alive).to.be.false;
        });

        it("should return a process mode", () => {
            let p = new stuff.Process({}, { mode: "cluster" });
            expect(p.mode).to.be.equal("cluster");
            p = new stuff.Process({}, { mode: "single" });
            expect(p.mode).to.be.equal("single");
        });

        it("should be null", () => {
            const p = new stuff.Process({}, {});
            expect(p.pid).to.be.null;
        });

        it("should open std streams", async () => {
            const stdout = await FS.createTempFile();
            const stderr = await FS.createTempFile();
            await stdout.unlink();
            await stderr.unlink();
            const p = new stuff.Process({}, { stdout: stdout.path(), stderr: stderr.path() });
            await p.openStdStreams();
            try {
                expect(p.fd).to.be.not.empty;
                expect(await adone.fs.exists(stdout.path())).to.be.true;
                expect(await adone.fs.exists(stderr.path())).to.be.true;
            } finally {
                await stdout.unlink();
                await stderr.unlink();
            }
        });

        it("should close std streams", async () => {
            const stdout = await FS.createTempFile();
            const stderr = await FS.createTempFile();
            const p = new stuff.Process({}, { stdout: stdout.path(), stderr: stderr.path() });
            await p.openStdStreams();
            await p.closeStdStreams();
            try {
                expect(p.fd).to.be.empty;
            } finally {
                await stdout.unlink();
                await stderr.unlink();
            }
        });
    });
});
