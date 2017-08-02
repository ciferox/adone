const { is, vendor: { lodash }, net: { ssh: { Client } } } = adone;

export default class Session {
    constructor(client, options) {
        this.options = options;
        this.client = client;
    }

    exec(cmd, { sudo = false } = {}) {
        return new Promise((resolve, reject) => {
            this._sudoExec(cmd, { sudo }, (err, stream) => {
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

    async execMulti(cmd, { sudo = false } = {}) {
        if (is.string(cmd)) {
            cmd = [cmd];
        }
        const stdout = [];
        const stderr = [];
        for (const c of cmd) {
            try {
                stdout.push(await this.exec(c, { sudo }));
                stderr.push(null);
            } catch (err) {
                stdout.push(null);
                stderr.push(err.message);
            }
        }

        return { stdout, stderr };
    }

    async putFile(localFile, remoteFile) {
        remoteFile = remoteFile.replace(/[\\]/g, "/"); // windows needs this
        const remotePath = adone.std.path.dirname(remoteFile);
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

    mkdir(remotePath, { sudo = false } = {}) {
        return this.exec(`mkdir -p ${remotePath}`, { sudo });
    }


    chmod(remotePath, mode, { sudo = false } = {}) {
        return this.exec(`chmod -R ${mode} ${remotePath}`, { sudo });
    }

    chown(remotePath, user, group, { sudo = false } = {}) {
        return this.exec(`chown -R ${user}:${group} ${remotePath}`, { sudo });
    }

    _sudoExec(cmd, { sudo }, done) {
        const opts = {};

        if (sudo && (is.propertyOwned(this.options, "password"))) {
            opts.pty = true;
            cmd = `sudo ${cmd}`;
        }

        this.client.exec(cmd, opts, (err, stream) => {
            if (err) {
                return done(err);
            }

            if (done) {
                done(null, stream);
            }

            if (opts.pty) {
                const pwd = this.options.password;
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
                        }
                    } else if (hasChallenge) {
                        clearTimeout(tChallenge);
                        stream.removeListener("data", checkPwdInput);

                        hasChallenge = false;
                    }
                };

                tChallenge = setTimeout(() => {
                    stream.removeListener("data", checkPwdInput);
                }, 10000);

                stream.on("data", checkPwdInput);

                const checkEmptyOutputCommands = () => {
                    if (!hasReceivedData && !hasChallenge) {
                        clearTimeout(tChallenge);
                        stream.removeListener("data", checkPwdInput);
                        stream.removeListener("data", checkEmptyOutputCommands);
                    }
                };
                stream.on("close", checkEmptyOutputCommands);
            }

            stream.kill = (length = 1) => {
                try {
                    for (let i = 0; i < length; i++) {
                        stream.write("\x03");
                    }
                } catch (ex) {
                    //
                }
                // openssh@centos
                try {
                    for (let i = 0; i < length; i++) {
                        stream.signal("SIGINT");
                    }
                } catch (ex) {
                    //
                }
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
                    } catch (ex) {
                        //
                    }
                });
                client.on("end", () => {
                    try {
                        process.removeListener("SIGINT", sigIntSent);
                    } catch (ex) {
                        //
                    }
                });
            } catch (ex) {
                reject(ex);
            }
        });
    }
}
