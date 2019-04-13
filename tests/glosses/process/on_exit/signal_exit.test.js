const {
    is,
    std: { childProcess: { exec } }
} = adone;

const shell = is.windows ? null : { shell: "/bin/bash" };
const node = is.windows ? `"${process.execPath}"` : process.execPath;

const fixture = (...args) => adone.std.path.join(__dirname, "fixtures", ...args);

describe("process", "onExit", "signal-exit", () => {
    it("receives an exit event when a process exits normally", (done) => {
        exec(`${node} ${fixture("end-of-execution.js")}`, shell, (err, stdout, stderr) => {
            expect(err).to.equal(null);
            expect(stdout).to.match(/reached end of execution, 0, null/);
            done();
        });
    });

    it("receives an exit event when process.exit() is called", (done) => {
        exec(`${node} ${fixture("exit.js")}`, shell, (err, stdout, stderr) => {
            if (!is.windows) {
                expect(err.code).to.be.equal(32);
            }
            expect(stdout).to.match(/exited with process\.exit\(\), 32, null/);
            done();
        });
    });

    it("ensures that if alwaysLast=true, the handler is run last (signal)", (done) => {
        exec(`${node} ${fixture("signal-last.js")}`, shell, (err, stdout, stderr) => {
            assert(err);
            expect(stdout).to.match(/first counter=1/);
            expect(stdout).to.match(/last counter=2/);
            done();
        });
    });

    it("ensures that if alwaysLast=true, the handler is run last (normal exit)", (done) => {
        exec(`${node} ${fixture("exit-last.js")}`, shell, (err, stdout, stderr) => {
            assert.ifError(err);
            expect(stdout).to.match(/first counter=1/);
            expect(stdout).to.match(/last counter=2/);
            done();
        });
    });

    it("works when loaded multiple times", (done) => {
        exec(`${node} ${fixture("multiple-load.js")}`, shell, (err, stdout, stderr) => {
            assert(err);
            expect(stdout).to.match(/first counter=1/);
            expect(stdout).to.match(/first counter=2/);
            expect(stdout).to.match(/last counter=3/);
            expect(stdout).to.match(/last counter=4/);
            done();
        });
    });

    it("removes handlers when fully unwrapped", (done) => {
        exec(`${node} ${fixture("unwrap.js")}`, shell, (err, stdout, stderr) => {
            assert(err);
            if (!is.windows) {
                expect(err.signal).to.be.equal("SIGHUP");
            }
            if (!is.windows) {
                expect(err.code).to.equal(null);
            }
            done();
        });
    });

    it("does not load() or unload() more than once", (done) => {
        exec(`${node} ${fixture("load-unload.js")}`, shell, (err, stdout, stderr) => {
            assert.notExists(err);
            done();
        });
    });

    it("receives an exit event when a process is terminated with sigint", {
        skip: is.windows
    }, (done) => {
        exec(`${node} ${fixture("sigint.js")}`, shell, (err, stdout, stderr) => {
            assert(err);
            expect(stdout).to.match(/exited with sigint, null, SIGINT/);
            done();
        });
    });

    it("receives an exit event when a process is terminated with sigterm", {
        skip: is.windows
    }, (done) => {
        exec(`${node} ${fixture("sigterm.js")}`, shell, (err, stdout, stderr) => {
            assert(err);
            expect(stdout).to.match(/exited with sigterm, null, SIGTERM/);
            done();
        });
    });

    it("does not exit on sigpipe", {
        skip: is.windows
    }, (done) => {
        exec(`${node} ${fixture("sigpipe.js")}`, shell, (err, stdout, stderr) => {
            assert.ifError(err);
            expect(stdout).to.match(/hello/);
            expect(stderr).to.match(/onSignalExit\(0,null\)/);
            done();
        });
    });

    it("handles uncatchable signals with grace and poise", {
        skip: is.windows
    }, (done) => {
        exec(`${node} ${fixture("sigkill.js")}`, shell, (err, stdout, stderr) => {
            assert.notExists(err);
            done();
        });
    });

    it("does not exit if user handles signal", {
        skip: is.windows
    }, (done) => {
        exec(`${node} ${fixture("signal-listener.js")}`, shell, (err, stdout, stderr) => {
            assert(err);
            assert.equal(stdout, 'exited calledListener=4, code=null, signal="SIGHUP"\n');
            done();
        });
    });
});
