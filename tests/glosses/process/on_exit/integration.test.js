const {
    is,
    process: { onExit },
    std: { childProcess: { exec } }
} = adone;

const shell = is.windows ? null : { shell: "/bin/bash" };
const node = is.windows ? `"${process.execPath}"` : process.execPath;

describe("process", "onExit", "all-signals-integration-test", () => {
    // These are signals that are aliases for other signals, so
    // the result will sometimes be one of the others.  For these,
    // we just verify that we GOT a signal, not what it is.
    const weirdSignal = (sig) => sig === "SIGIOT" ||
        sig === "SIGIO" ||
        sig === "SIGSYS" ||
        sig === "SIGIOT" ||
        sig === "SIGABRT" ||
        sig === "SIGPOLL" ||
        sig === "SIGUNUSED";


    // Exhaustively test every signal, and a few numbers.
    // signal-exit does not currently support process.kill()
    // on win32.
    const signals = is.windows ? [] : onExit.signals();
    signals.concat("", 0, 1, 2, 3, 54).forEach((sig) => {
        const js = require.resolve("./fixtures/exiter.js");
        it(`exits properly: ${sig}`, (done) => {
            // issues with SIGUSR1 on Node 0.10.x
            if (process.version.match(/^v0\.10\./) && sig === "SIGUSR1") {
                return done();
            }

            const cmd = `${node} ${js} ${sig}`;
            exec(cmd, shell, (err, stdout, stderr) => {
                if (sig) {
                    if (!is.windows) {
                        assert(err);
                    }
                    if (!isNaN(sig)) {
                        if (!is.windows) {
                            assert.equal(err.code, sig);
                        }
                    } else if (!weirdSignal(sig)) {
                        if (!is.windows) {
                            expect(err.signal).to.be.equal(sig);
                        }
                    } else if (sig) {
                        if (!is.windows) {
                            assert(err.signal);
                        }
                    }
                } else {
                    assert.notExists(err);
                }

                let data;
                try {
                    data = JSON.parse(stdout);
                } catch (er) {
                    console.error("invalid json: %j", stdout, stderr);
                    throw er;
                }

                if (weirdSignal(sig)) {
                    data.wanted[1] = true;
                    data.found[1] = Boolean(data.found[1]);
                }
                assert.deepEqual(data.found, data.wanted);
                done();
            });
        });
    });

    signals.forEach((sig) => {
        const js = require.resolve("./fixtures/parent.js");
        it(`exits properly: (external sig) ${sig}`, (done) => {
            // issues with SIGUSR1 on Node 0.10.x
            if (process.version.match(/^v0\.10\./) && sig === "SIGUSR1") {
                return done();
            }

            const cmd = `${node} ${js} ${sig}`;
            exec(cmd, shell, (err, stdout, stderr) => {
                assert.notExists(err);
                let data;
                try {
                    data = JSON.parse(stdout);
                } catch (er) {
                    console.error("invalid json: %j", stdout, stderr);
                    throw er;
                }

                if (weirdSignal(sig)) {
                    data.wanted[1] = true;
                    data.found[1] = Boolean(data.found[1]);
                    data.external[1] = Boolean(data.external[1]);
                }
                assert.deepEqual(data.found, data.wanted);
                assert.deepEqual(data.external, data.wanted);
                done();
            });
        });
    });
});
