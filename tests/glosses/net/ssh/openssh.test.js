/* global describe it skip */

import semver from "semver" ;

const { Server } = adone.net.ssh;
import { utils } from "../../../../lib/glosses/net/ssh/ssh_streams";

const fs = adone.std.fs;
const crypto = adone.std.crypto;
const path = adone.std.path;
const join = path.join;
const { spawn, exec } = adone.std.child_process;

const fixturesdir = join(__dirname, "fixtures");

const CLIENT_TIMEOUT = 5000;
const USER = "nodejs";
const HOST_KEY_RSA = fs.readFileSync(join(fixturesdir, "ssh_host_rsa_key"));
const HOST_KEY_DSA = fs.readFileSync(join(fixturesdir, "ssh_host_dsa_key"));
const HOST_KEY_ECDSA = fs.readFileSync(join(fixturesdir, "ssh_host_ecdsa_key"));
const CLIENT_KEY_RSA_PATH = join(fixturesdir, "id_rsa");
const CLIENT_KEY_RSA = fs.readFileSync(CLIENT_KEY_RSA_PATH);
const CLIENT_KEY_RSA_PUB = utils.genPublicKey(utils.parseKey(CLIENT_KEY_RSA));
const CLIENT_KEY_DSA_PATH = join(fixturesdir, "id_dsa");
const CLIENT_KEY_DSA = fs.readFileSync(CLIENT_KEY_DSA_PATH);
const CLIENT_KEY_DSA_PUB = utils.genPublicKey(utils.parseKey(CLIENT_KEY_DSA));
if (semver.gte(process.version, "5.2.0")) {
    var CLIENT_KEY_ECDSA_PATH = join(fixturesdir, "id_ecdsa");
    var CLIENT_KEY_ECDSA = fs.readFileSync(CLIENT_KEY_ECDSA_PATH);
    var CLIENT_KEY_ECDSA_PUB = utils.genPublicKey(
        utils.parseKey(CLIENT_KEY_ECDSA)
    );
}
let opensshVer;
const DEBUG_MODE = false;

skip(() => {
    return new Promise((resolve) => {
        exec("ssh -V", function(err, stdout, stderr) {
            if (err) {
                // console.log("OpenSSH client is required for these tests");
                resolve(true);
                return;
            }
            let re = /^OpenSSH_([\d\.]+)/;
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
});

// Fix file modes to avoid OpenSSH client complaints about keys" permissions
fs.readdirSync(fixturesdir).forEach(function(file) {
    fs.chmodSync(join(fixturesdir, file), "0600");
});

describe("SSH", function () {
    describe("OpenSSH", function () {
        it("Authenticate with an RSA key", function(done) {
            let server;

            server = setup(
                this, {
                    privateKeyPath: CLIENT_KEY_RSA_PATH
                }, {
                    hostKeys: [HOST_KEY_RSA]
                },
                done
            );

            server.on("connection", function(conn) {
                conn.on("authentication", function(ctx) {
                    if (ctx.method === "none")
                        return ctx.reject();
                    assert(ctx.method === "publickey",
                        "Unexpected auth method: " + ctx.method);
                    assert(ctx.username === USER,
                        "Unexpected username: " + ctx.username);
                    assert(ctx.key.algo === "ssh-rsa",
                        "Unexpected key algo: " + ctx.key.algo);
                    assert.deepEqual(CLIENT_KEY_RSA_PUB.public,
                        ctx.key.data,
                        "Public key mismatch");
                    if (ctx.signature) {
                        let verifier = crypto.createVerify("RSA-SHA1");
                        let pem = CLIENT_KEY_RSA_PUB.publicOrig;
                        verifier.update(ctx.blob);
                        assert(verifier.verify(pem, ctx.signature),
                            "Could not verify PK signature");
                        ctx.accept();
                    } else
                        ctx.accept();
                }).on("ready", function() {
                    conn.on("session", function(accept, reject) {
                        let session = accept();
                        if (session) {
                            session.on("exec", function(accept, reject) {
                                let stream = accept();
                                if (stream) {
                                    stream.exit(0);
                                    stream.end();
                                }
                            }).on("pty", function(accept, reject) {
                                accept && accept();
                            });
                        }
                    });
                });
            });
        });

        it("Authenticate with a DSA key", function(done) {
            let server;

            server = setup(
                this, {
                    privateKeyPath: CLIENT_KEY_DSA_PATH
                }, {
                    hostKeys: [HOST_KEY_RSA]
                },
                done
            );

            server.on("connection", function(conn) {
                conn.on("authentication", function(ctx) {
                    if (ctx.method === "none")
                        return ctx.reject();
                    assert(ctx.method === "publickey",
                        "Unexpected auth method: " + ctx.method);
                    assert(ctx.username === USER,
                        "Unexpected username: " + ctx.username);
                    assert(ctx.key.algo === "ssh-dss",
                        "Unexpected key algo: " + ctx.key.algo);
                    assert.deepEqual(CLIENT_KEY_DSA_PUB.public,
                        ctx.key.data,
                        "Public key mismatch");
                    if (ctx.signature) {
                        let verifier = crypto.createVerify("DSA-SHA1");
                        let pem = CLIENT_KEY_DSA_PUB.publicOrig;
                        verifier.update(ctx.blob);
                        assert(verifier.verify(pem, ctx.signature),
                            "Could not verify PK signature");
                        ctx.accept();
                    } else
                        ctx.accept();
                }).on("ready", function() {
                    conn.on("session", function(accept, reject) {
                        let session = accept();
                        if (session) {
                            session.on("exec", function(accept, reject) {
                                let stream = accept();
                                if (stream) {
                                    stream.exit(0);
                                    stream.end();
                                }
                            }).on("pty", function(accept, reject) {
                                accept && accept();
                            });
                        }
                    });
                });
            });
        });

        it("Authenticate with a ECDSA key", function(done) {
            if (semver.lt(process.version, "5.2.0"))
                return done();
            let server;

            server = setup(
                this, {
                    privateKeyPath: CLIENT_KEY_ECDSA_PATH
                }, {
                    hostKeys: [HOST_KEY_RSA]
                },
                done
            );

            server.on("connection", function(conn) {
                conn.on("authentication", function(ctx) {
                    if (ctx.method === "none")
                        return ctx.reject();
                    assert(ctx.method === "publickey",
                        "Unexpected auth method: " + ctx.method);
                    assert(ctx.username === USER,
                        "Unexpected username: " + ctx.username);
                    assert(ctx.key.algo === "ecdsa-sha2-nistp256",
                        "Unexpected key algo: " + ctx.key.algo);
                    assert.deepEqual(CLIENT_KEY_ECDSA_PUB.public,
                        ctx.key.data,
                        "Public key mismatch");
                    if (ctx.signature) {
                        let verifier = crypto.createVerify("sha256");
                        let pem = CLIENT_KEY_ECDSA_PUB.publicOrig;
                        verifier.update(ctx.blob);
                        assert(verifier.verify(pem, ctx.signature),
                            "Could not verify PK signature");
                        ctx.accept();
                    } else
                        ctx.accept();
                }).on("ready", function() {
                    conn.on("session", function(accept, reject) {
                        let session = accept();
                        if (session) {
                            session.on("exec", function(accept, reject) {
                                let stream = accept();
                                if (stream) {
                                    stream.exit(0);
                                    stream.end();
                                }
                            }).on("pty", function(accept, reject) {
                                accept && accept();
                            });
                        }
                    });
                });
            });
        });

        it("Server with DSA host key", function(done) {
            let server;

            server = setup(
                this, {
                    privateKeyPath: CLIENT_KEY_RSA_PATH
                }, {
                    hostKeys: [HOST_KEY_DSA]
                },
                done
            );

            server.on("connection", function(conn) {
                conn.on("authentication", function(ctx) {
                    ctx.accept();
                }).on("ready", function() {
                    conn.on("session", function(accept, reject) {
                        let session = accept();
                        if (session) {
                            session.on("exec", function(accept, reject) {
                                let stream = accept();
                                if (stream) {
                                    stream.exit(0);
                                    stream.end();
                                }
                            }).on("pty", function(accept, reject) {
                                accept && accept();
                            });
                        }
                    });
                });
            });
        });

        it("Server with ECDSA host key", function(done) {
            if (semver.lt(process.version, "5.2.0"))
                return done();
            let server;

            server = setup(
                this, {
                    privateKeyPath: CLIENT_KEY_RSA_PATH
                }, {
                    hostKeys: [HOST_KEY_ECDSA]
                },
                done
            );

            server.on("connection", function(conn) {
                conn.on("authentication", function(ctx) {
                    ctx.accept();
                }).on("ready", function() {
                    conn.on("session", function(accept, reject) {
                        let session = accept();
                        if (session) {
                            session.on("exec", function(accept, reject) {
                                let stream = accept();
                                if (stream) {
                                    stream.exit(0);
                                    stream.end();
                                }
                            }).on("pty", function(accept, reject) {
                                accept && accept();
                            });
                        }
                    });
                });
            });
        });

        it("Server closes stdin too early", function(done) {
            let server;
            let what = this.what;

            server = setup(
                this, {
                    privateKeyPath: CLIENT_KEY_RSA_PATH
                }, {
                    hostKeys: [HOST_KEY_RSA]
                },
                done
            );

            server.on("_child", function(childProc) {
                childProc.stderr.once("data", function(data) {
                    childProc.stdin.end();
                });
                childProc.stdin.write("ping");
            }).on("connection", function(conn) {
                conn.on("authentication", function(ctx) {
                    ctx.accept();
                }).on("ready", function() {
                    conn.on("session", function(accept, reject) {
                        let session = accept();
                        assert(session, "Missing session");
                        session.on("exec", function(accept, reject) {
                            let stream = accept();
                            assert(stream, "Missing exec stream");
                            stream.stdin.on("data", function(data) {
                                stream.stdout.write("pong on stdout");
                                stream.stderr.write("pong on stderr");
                            }).on("end", function() {
                                stream.stdout.write("pong on stdout");
                                stream.stderr.write("pong on stderr");
                                stream.exit(0);
                                stream.close();
                            });
                        }).on("pty", function(accept, reject) {
                            accept && accept();
                        });
                    });
                });
            });
        });
    });
});

function setup(self, clientcfg, servercfg, done) {
    self.state = {
        serverReady: false,
        clientClose: false,
        serverClose: false
    };

    let client;
    let server = new Server(servercfg);

    server.on("error", onError)
        .on("connection", function(conn) {
            conn.on("error", onError)
                .on("ready", onReady);
            server.close();
        })
        .on("close", onClose);

    function onError(err) {
        let which = (arguments.length >= 3 ? "client" : "server");
        assert(false, "Unexpected " + which + " error: " + err);
    }

    function onReady() {
        assert(!self.state.serverReady, "Received multiple ready events for server");
        self.state.serverReady = true;
        self.onReady && self.onReady();
    }

    function onClose() {
        if (arguments.length >= 3) {
            assert(!self.state.clientClose, "Received multiple close events for client");
            self.state.clientClose = true;
        } else {
            assert(!self.state.serverClose, "Received multiple close events for server");
            self.state.serverClose = true;
        }
        if (self.state.clientClose && self.state.serverClose)
            done();
    }

    process.nextTick(function() {
        server.listen(0, "localhost", function() {
            let cmd = "ssh";
            let args = ["-o", "UserKnownHostsFile=/dev/null",
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
            if (clientcfg.privateKeyPath)
                args.push("-o", "IdentityFile=" + clientcfg.privateKeyPath);
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
            client.on("error", function(err) {
                onError(err, null, null);
            }).on("exit", function(code) {
                clearTimeout(client.timer);
                if (code !== 0)
                    return onError(new Error("Non-zero exit code " + code), null, null);
                onClose(null, null, null);
            });

            client.timer = setTimeout(function() {
                assert(false, "Client timeout");
            }, CLIENT_TIMEOUT);
        });
    });
    return server;
}
