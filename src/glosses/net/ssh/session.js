const { is, vendor: { lodash }, net: { ssh: { Client } } } = adone;

const sudoChallenge = (stream, pwd, then) => {
    let hasReceivedData = false;
    let hasChallenge = false;
    let tChallenge = null;

    const checkPwdInput = (data) => {
        data = String(data);
        hasReceivedData = true;

        // there can t be anything to resolve if the challenge has not been sent
        if (!hasChallenge) {
            // first data is always the challenge
            if (data.match(/\[sudo\] password/) || data.match(/Password:/)) {
                hasChallenge = true;
                // if so send the password on stdin
                stream.write(`${pwd}\n`);
            } else {
                // otherwise, the command has probably ran successfully
                clearTimeout(tChallenge);
                stream.removeListener("data", checkPwdInput);
                if (then) {
                    then(false);
                }
            }

            // once the challenge is set,
            // it must be concluded
            // right after it s beginning
        } else if (hasChallenge) {
            clearTimeout(tChallenge);
            stream.removeListener("data", checkPwdInput);

            hasChallenge = false;
            // this case handle only en.
            if (data.match(/Sorry, try again/) || data.match(/Password:/)) {
                if (then) {
                    then(true);
                }
            } else {
                if (then) {
                    then(false);
                }
            }
        }
    };

    tChallenge = setTimeout(() => {
        stream.removeListener("data", checkPwdInput);
        if (then) {
            then(true);
        }
    }, 10000);

    stream.on("data", checkPwdInput);

    const checkEmptyOutputCommands = () => {
        if (!hasReceivedData && !hasChallenge) {
            clearTimeout(tChallenge);
            stream.removeListener("data", checkPwdInput);
            stream.removeListener("data", checkEmptyOutputCommands);
            if (then) {
                then(false);
            }
        }
    };
    stream.on("close", checkEmptyOutputCommands);
};

export default class Session {
    constructor(client, options) {
        this.options = options;
        this.client = client;
    }

    execOne(cmd) {
        return new Promise((resolve, reject) => {
            this._sudoExec(cmd, (err, stream) => {
                if (err) {
                    return reject(err);
                }

                let stderr = "";
                let stdout = "";
                stream.stderr.on("data", (data) => {
                    stderr += data.toString();
                });
                stream.on("data", (data) => {
                    stdout += data.toString();
                });

                stream.on("close", () => {
                    if (stderr) {
                        return reject(new Error(lodash.trim(stderr)));
                    }
                    resolve(stdout);
                });
            });
        });
    }

    async exec(cmd) {
        if (is.string(cmd)) {
            cmd = [cmd];
        }
        let stdout = "";
        let stderr = "";
        for (const c of cmd) {
            try {
                stdout += await this.execOne(c);
            } catch (err) {
                stderr += err.message;
            }
        }

        return { stdout, stderr };
    }

    async putFile(localFile, remoteFile) {
        remoteFile = remoteFile.replace(/[\\]/g, "/"); // windows needs this
        const remotePath = path.dirname(remoteFile);
        await this.mkdir(remotePath);

        return new Promise((resolve, reject) => {
            this.client.sftp((err, sftp) => {
                if (err) {
                    return reject(err);
                }

                sftp.fastPut(localFile, remoteFile, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        });
    }

    mkdir(remotePath) {
        return this.exec(`mkdir -p ${remotePath}`);
    }


    chmod(remotePath, mode) {
        return this.exec(`sudo chmod -R ${mode} ${remotePath}`);
    }

    chown(remotePath) {
        return this.exec(`sudo chown -R ${this.options.username}:${this.options.username} ${remotePath}`);
    }

    _sudoExec(cmd, done) {
        const opts = {};

        opts.pty = Boolean(cmd.match(/^su(do\s|\s)/)) && ("password" in this.options);

        this.client.exec(cmd, opts, (err, stream) => {
            if (err) {
                return done(err);
            }

            if (done) {
                done(null, stream);
            }

            if (opts.pty) {
                sudoChallenge(stream, this.options.password, adone.noop);
            }

            stream.kill = (length = 1) => {
                try {
                    for (let i = 0; i < length; i++) {
                        stream.write("\x03");
                    }
                } catch (ex) { }
                // openssh@centos
                try {
                    for (let i = 0; i < length; i++) {
                        stream.signal("SIGINT");
                    }
                } catch (ex) { }
            };
            // manage process termination with open handle
            stream.on("close", () => {
                const k = this.client.pendingStreams.indexOf(stream);
                if (k > -1) {
                    this.client.pendingStreams.splice(k, 1);
                }
            });
            this.client.pendingStreams.push(stream);
        });
    }

    static connect(options) {
        return new Promise((resolve, reject) => {
            const client = new Client();
            client.on("ready", () => {
                resolve(new Session(client, options));
            });

            try {
                client.connect(options);

                client.on("error", (stderr) => {
                    reject(stderr);
                });

                // manage process termination
                client.pendingStreams = [];
                const superEnd = client.end;
                client.end = function () {
                    client.pendingStreams.forEach((stream, i) => {
                        stream.kill(client.pendingStreams.length);
                    });
                    client.pendingStreams = [];
                    superEnd.call(client);
                };
                // manage user pressing ctrl+C
                const sigIntSent = function () {
                    client.end();
                };
                process.on("SIGINT", sigIntSent);
                client.on("close", () => {
                    try {
                        process.removeListener("SIGINT", sigIntSent);
                    } catch (ex) { }
                });
                client.on("end", () => {
                    try {
                        process.removeListener("SIGINT", sigIntSent);
                    } catch (ex) { }
                });
            } catch (ex) {
                reject(ex);
            }
        });
    }
}
