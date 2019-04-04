const { semver, std: { fs, crypto, path } } = adone;
const { Server } = adone.net.ssh;
const { util } = adone.net.ssh;

const join = path.join;
const { spawn, exec } = adone.std.childProcess;

const fixturesdir = join(__dirname, "fixtures");

const CLIENT_TIMEOUT = 5000;
const USER = "nodejs";
const HOST_KEY_RSA = fs.readFileSync(join(fixturesdir, "ssh_host_rsa_key"));
const HOST_KEY_DSA = fs.readFileSync(join(fixturesdir, "ssh_host_dsa_key"));
const HOST_KEY_ECDSA = fs.readFileSync(join(fixturesdir, "ssh_host_ecdsa_key"));
const CLIENT_KEY_RSA_PATH = join(fixturesdir, "id_rsa");
const CLIENT_KEY_RSA = fs.readFileSync(CLIENT_KEY_RSA_PATH);
const CLIENT_KEY_RSA_PUB = util.genPublicKey(util.parseKey(CLIENT_KEY_RSA));
const CLIENT_KEY_DSA_PATH = join(fixturesdir, "id_dsa");
const CLIENT_KEY_DSA = fs.readFileSync(CLIENT_KEY_DSA_PATH);
const CLIENT_KEY_DSA_PUB = util.genPublicKey(util.parseKey(CLIENT_KEY_DSA));
let CLIENT_KEY_ECDSA_PATH;
let CLIENT_KEY_ECDSA_PUB;
if (semver.gte(process.version, "5.2.0")) {
    CLIENT_KEY_ECDSA_PATH = join(fixturesdir, "id_ecdsa");
    const CLIENT_KEY_ECDSA = fs.readFileSync(CLIENT_KEY_ECDSA_PATH);
    CLIENT_KEY_ECDSA_PUB = util.genPublicKey(
        util.parseKey(CLIENT_KEY_ECDSA)
    );
}
let opensshVer;
const DEBUG_MODE = false;

// Fix file modes to avoid OpenSSH client complaints about keys" permissions
fs.readdirSync(fixturesdir).forEach((file) => {
    fs.chmodSync(join(fixturesdir, file), "0600");
});

const setup = (self, clientcfg, servercfg, done) => {
    self.state = {
        serverReady: false,
        clientClose: false,
        serverClose: false
    };

    let client;
    const server = new Server(servercfg);

    const onError = function (err) {
        const which = (arguments.length >= 3 ? "client" : "server");
        assert(false, `Unexpected ${which} error: ${err}`);
    };

    const onReady = () => {
        assert(!self.state.serverReady, "Received multiple ready events for server");
        self.state.serverReady = true;
        self.onReady && self.onReady();
    };

    const onClose = function () {
        if (arguments.length >= 3) {
            assert(!self.state.clientClose, "Received multiple close events for client");
            self.state.clientClose = true;
        } else {
            assert(!self.state.serverClose, "Received multiple close events for server");
            self.state.serverClose = true;
        }
        if (self.state.clientClose && self.state.serverClose) {
            done();
        }
    };

    server.on("error", onError)
        .on("connection", (conn) => {
            conn.on("error", onError)
                .on("ready", onReady);
            server.close();
        })
        .on("close", onClose);

    process.nextTick(() => {
        server.listen(0, "localhost", () => {
            const cmd = "ssh";
            const args = ["-o", "UserKnownHostsFile=/dev/null",
                "-o", "StrictHostKeyChecking=no",
                "-o", "CheckHostIP=no",
                "-o", "ConnectTimeout=3",
                "-o", "GlobalKnownHostsFile=/dev/null",
                "-o", "GSSAPIAuthentication=no",
                "-o", "IdentitiesOnly=yes",
                "-o", "BatchMode=yes",
                "-o", "VerifyHostKeyDNS=no",

                "-vvvvvv",
                "-T",
                "-o", "KbdInteractiveAuthentication=no",
                "-o", "HostbasedAuthentication=no",
                "-o", "PasswordAuthentication=no",
                "-o", "PubkeyAuthentication=yes",
                "-o", "PreferredAuthentications=publickey"];
            if (clientcfg.privateKeyPath) {
                args.push("-o", `IdentityFile=${clientcfg.privateKeyPath}`);
            }
            if (!/^[0-6]\./.test(opensshVer)) {
                // OpenSSH 7.0+ disables DSS/DSA host (and user) key support by
                // default, so we explicitly enable it here
                args.push("-o", "HostKeyAlgorithms=+ssh-dss");
            }
            args.push("-p", server.address().port.toString(),
                "-l", USER,
                "localhost",
                "uptime");

            client = spawn(cmd, args);
            server.emit("_child", client);
            if (DEBUG_MODE) {
                client.stdout.pipe(process.stdout);
                client.stderr.pipe(process.stderr);
            } else {
                client.stdout.resume();
                client.stderr.resume();
            }
            client.on("error", (err) => {
                onError(err, null, null);
            }).on("exit", (code) => {
                clearTimeout(client.timer);
                if (code !== 0) {
                    return onError(new Error(`Non-zero exit code ${code}`), null, null);
                }
                onClose(null, null, null);
            });

            client.timer = setTimeout(() => {
                assert(false, "Client timeout");
            }, CLIENT_TIMEOUT);
        });
    });
    return server;
};

describe("net", "ssh", "OpenSSH", {
    skip: () => {
        return new Promise((resolve) => {
            exec("ssh -V", (err, stdout, stderr) => {
                if (err) {
                    // console.log("OpenSSH client is required for these tests");
                    resolve(true);
                    return;
                }
                const re = /^OpenSSH_([\d\.]+)/;
                let m = re.exec(stdout.toString());
                if (!m || !m[1]) {
                    m = re.exec(stderr.toString());
                    if (!m || !m[1]) {
                        // console.log("OpenSSH client is required for these tests");
                        resolve(true);
                        return;
                    }
                }
                opensshVer = m[1];
                resolve(false);
            });
        });
    }
}, () => {
    it("Authenticate with an RSA key", function (done) {
        const server = setup(
            this, {
                privateKeyPath: CLIENT_KEY_RSA_PATH
            }, {
                hostKeys: [HOST_KEY_RSA]
            },
            done
        );

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "publickey",
                    `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER,
                    `Unexpected username: ${ctx.username}`);
                assert(ctx.key.algo === "ssh-rsa",
                    `Unexpected key algo: ${ctx.key.algo}`);
                assert.deepEqual(CLIENT_KEY_RSA_PUB.public,
                    ctx.key.data,
                    "Public key mismatch");
                if (ctx.signature) {
                    const verifier = crypto.createVerify("RSA-SHA1");
                    const pem = CLIENT_KEY_RSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature),
                        "Could not verify PK signature");
                    ctx.accept();
                } else {
                    ctx.accept();
                }
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    const session = accept();
                    if (session) {
                        session.on("exec", (accept, reject) => {
                            const stream = accept();
                            if (stream) {
                                stream.exit(0);
                                stream.end();
                            }
                        }).on("pty", (accept, reject) => {
                            accept && accept();
                        });
                    }
                });
            });
        });
    });

    it("Authenticate with a DSA key", function (done) {
        const server = setup(
            this, {
                privateKeyPath: CLIENT_KEY_DSA_PATH
            }, {
                hostKeys: [HOST_KEY_RSA]
            },
            done
        );

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "publickey",
                    `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER,
                    `Unexpected username: ${ctx.username}`);
                assert(ctx.key.algo === "ssh-dss",
                    `Unexpected key algo: ${ctx.key.algo}`);
                assert.deepEqual(CLIENT_KEY_DSA_PUB.public,
                    ctx.key.data,
                    "Public key mismatch");
                if (ctx.signature) {
                    const verifier = crypto.createVerify("DSA-SHA1");
                    const pem = CLIENT_KEY_DSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature),
                        "Could not verify PK signature");
                    ctx.accept();
                } else {
                    ctx.accept();
                }
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    const session = accept();
                    if (session) {
                        session.on("exec", (accept, reject) => {
                            const stream = accept();
                            if (stream) {
                                stream.exit(0);
                                stream.end();
                            }
                        }).on("pty", (accept, reject) => {
                            accept && accept();
                        });
                    }
                });
            });
        });
    });

    it("Authenticate with a ECDSA key", function (done) {
        if (semver.lt(process.version, "5.2.0")) {
            return done();
        }
        const server = setup(
            this, {
                privateKeyPath: CLIENT_KEY_ECDSA_PATH
            }, {
                hostKeys: [HOST_KEY_RSA]
            },
            done
        );

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "publickey",
                    `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER,
                    `Unexpected username: ${ctx.username}`);
                assert(ctx.key.algo === "ecdsa-sha2-nistp256",
                    `Unexpected key algo: ${ctx.key.algo}`);
                assert.deepEqual(CLIENT_KEY_ECDSA_PUB.public,
                    ctx.key.data,
                    "Public key mismatch");
                if (ctx.signature) {
                    const verifier = crypto.createVerify("sha256");
                    const pem = CLIENT_KEY_ECDSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature),
                        "Could not verify PK signature");
                    ctx.accept();
                } else {
                    ctx.accept();
                }
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    const session = accept();
                    if (session) {
                        session.on("exec", (accept, reject) => {
                            const stream = accept();
                            if (stream) {
                                stream.exit(0);
                                stream.end();
                            }
                        }).on("pty", (accept, reject) => {
                            accept && accept();
                        });
                    }
                });
            });
        });
    });

    it("Server with DSA host key", function (done) {
        const server = setup(
            this, {
                privateKeyPath: CLIENT_KEY_RSA_PATH
            }, {
                hostKeys: [HOST_KEY_DSA]
            },
            done
        );

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    const session = accept();
                    if (session) {
                        session.on("exec", (accept, reject) => {
                            const stream = accept();
                            if (stream) {
                                stream.exit(0);
                                stream.end();
                            }
                        }).on("pty", (accept, reject) => {
                            accept && accept();
                        });
                    }
                });
            });
        });
    });

    it("Server with ECDSA host key", function (done) {
        if (semver.lt(process.version, "5.2.0")) {
            return done();
        }
        const server = setup(
            this, {
                privateKeyPath: CLIENT_KEY_RSA_PATH
            }, {
                hostKeys: [HOST_KEY_ECDSA]
            },
            done
        );

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    const session = accept();
                    if (session) {
                        session.on("exec", (accept, reject) => {
                            const stream = accept();
                            if (stream) {
                                stream.exit(0);
                                stream.end();
                            }
                        }).on("pty", (accept, reject) => {
                            accept && accept();
                        });
                    }
                });
            });
        });
    });

    it("Server closes stdin too early", function (done) {
        const server = setup(
            this, {
                privateKeyPath: CLIENT_KEY_RSA_PATH
            }, {
                hostKeys: [HOST_KEY_RSA]
            },
            done
        );

        server.on("_child", (childProc) => {
            childProc.stderr.once("data", (data) => {
                childProc.stdin.end();
            });
            childProc.stdin.write("ping");
        }).on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    const session = accept();
                    assert(session, "Missing session");
                    session.on("exec", (accept, reject) => {
                        const stream = accept();
                        assert(stream, "Missing exec stream");
                        stream.stdin.on("data", (data) => {
                            stream.stdout.write("pong on stdout");
                            stream.stderr.write("pong on stderr");
                        }).on("end", () => {
                            stream.stdout.write("pong on stdout");
                            stream.stderr.write("pong on stderr");
                            stream.exit(0);
                            stream.close();
                        });
                    }).on("pty", (accept, reject) => {
                        accept && accept();
                    });
                });
            });
        });
    });
});
