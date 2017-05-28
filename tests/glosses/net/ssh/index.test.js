const { SFTPStream, util, Client, Server } = adone.net.ssh;
const OPEN_MODE = SFTPStream.OPEN_MODE;
const STATUS_CODE = SFTPStream.STATUS_CODE;

const { semver, std: { net, fs, crypto, path } } = adone;
const join = path.join;
const inspect = adone.std.util.inspect;

const fixturesdir = join(__dirname, "fixtures");

const USER = "nodejs";
const PASSWORD = "FLUXCAPACITORISTHEPOWER";
const MD5_HOST_FINGERPRINT = "64254520742d3d0792e918f3ce945a64";
const KEY_RSA_BAD = fs.readFileSync(join(fixturesdir, "bad_rsa_private_key"));
const HOST_KEY_RSA = fs.readFileSync(join(fixturesdir, "ssh_host_rsa_key"));
const HOST_KEY_DSA = fs.readFileSync(join(fixturesdir, "ssh_host_dsa_key"));
const HOST_KEY_ECDSA = fs.readFileSync(join(fixturesdir, "ssh_host_ecdsa_key"));
const CLIENT_KEY_ENC_RSA = fs.readFileSync(join(fixturesdir, "id_rsa_enc"));
let CLIENT_KEY_ENC_RSA_PUB = util.parseKey(CLIENT_KEY_ENC_RSA);
util.decryptKey(CLIENT_KEY_ENC_RSA_PUB, "foobarbaz");
CLIENT_KEY_ENC_RSA_PUB = util.genPublicKey(CLIENT_KEY_ENC_RSA_PUB);
const CLIENT_KEY_PPK_RSA = fs.readFileSync(join(fixturesdir, "id_rsa.ppk"));
const CLIENT_KEY_PPK_RSA_PUB = util.parseKey(CLIENT_KEY_PPK_RSA);
const CLIENT_KEY_RSA = fs.readFileSync(join(fixturesdir, "id_rsa"));
const CLIENT_KEY_RSA_PUB = util.genPublicKey(util.parseKey(CLIENT_KEY_RSA));
const CLIENT_KEY_DSA = fs.readFileSync(join(fixturesdir, "id_dsa"));
const CLIENT_KEY_DSA_PUB = util.genPublicKey(util.parseKey(CLIENT_KEY_DSA));
let CLIENT_KEY_ECDSA;
let CLIENT_KEY_ECDSA_PUB;
if (semver.gte(process.version, "5.2.0")) {
    CLIENT_KEY_ECDSA = fs.readFileSync(join(fixturesdir, "id_ecdsa"));
    CLIENT_KEY_ECDSA_PUB = util.genPublicKey(
        util.parseKey(CLIENT_KEY_ECDSA)
    );
}

describe("net", "ssh", () => {
    const setup = (self, clientcfg, servercfg, done) => {
        self.state = {
            clientReady: false,
            serverReady: false,
            clientClose: false,
            serverClose: false
        };

        const client = new Client();
        const server = new Server(servercfg);

        const onError = function (err) {
            const which = (this === client ? "client" : "server");
            assert.fail(`Unexpected ${which} error: ${err}`);
        };

        const onReady = function () {
            if (this === client) {
                assert(!self.state.clientReady, "Received multiple ready events for client");
                self.state.clientReady = true;
            } else {
                assert(!self.state.serverReady, "Received multiple ready events for server");
                self.state.serverReady = true;
            }
            if (self.state.clientReady && self.state.serverReady) {
                self.onReady && self.onReady();
            }
        };

        const onClose = function () {
            if (this === client) {
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

        client.on("error", onError)
            .on("ready", onReady)
            .on("close", onClose);

        process.nextTick(() => {
            server.listen(0, "localhost", () => {
                if (clientcfg.sock) {
                    clientcfg.sock.connect(server.address().port, "localhost");
                } else {
                    clientcfg.host = "localhost";
                    clientcfg.port = server.address().port;
                }
                client.connect(clientcfg);
            });
        });
        return { client, server };
    };

    it("Authenticate with an RSA key", function (done) {
        const r = setup(this, {
            username: USER,
            privateKey: CLIENT_KEY_RSA
        }, {
            hostKeys: [HOST_KEY_RSA]
        }, done);
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "publickey", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.key.algo === "ssh-rsa", `Unexpected key algo: ${ctx.key.algo}`);
                assert.deepEqual(CLIENT_KEY_RSA_PUB.public, ctx.key.data, "Public key mismatch");
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
                conn.end();
            });
        });
    });

    it("Authenticate with an encrypted RSA key", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                privateKey: CLIENT_KEY_ENC_RSA,
                passphrase: "foobarbaz"
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "publickey", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.key.algo === "ssh-rsa", `Unexpected key algo: ${ctx.key.algo}`);
                assert.deepEqual(CLIENT_KEY_ENC_RSA_PUB.public, ctx.key.data, "Public key mismatch");
                if (ctx.signature) {
                    const verifier = crypto.createVerify("RSA-SHA1");
                    const pem = CLIENT_KEY_ENC_RSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature), "Could not verify PK signature");
                    ctx.accept();
                } else {
                    ctx.accept();
                }
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Authenticate with an RSA key (PPK)", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                privateKey: CLIENT_KEY_PPK_RSA
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "publickey", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.key.algo === "ssh-rsa", `Unexpected key algo: ${ctx.key.algo}`);
                if (ctx.signature) {
                    const verifier = crypto.createVerify("RSA-SHA1");
                    const pem = CLIENT_KEY_PPK_RSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature), "Could not verify PK signature");
                    ctx.accept();
                } else {
                    ctx.accept();
                }
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Authenticate with a DSA key", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                privateKey: CLIENT_KEY_DSA
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "publickey", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.key.algo === "ssh-dss", `Unexpected key algo: ${ctx.key.algo}`);
                assert.deepEqual(CLIENT_KEY_DSA_PUB.public, ctx.key.data, "Public key mismatch");
                if (ctx.signature) {
                    const verifier = crypto.createVerify("DSA-SHA1");
                    const pem = CLIENT_KEY_DSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature), "Could not verify PK signature");
                    ctx.accept();
                } else {
                    ctx.accept();
                }
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Authenticate with a ECDSA key", function (done) {
        if (semver.lt(process.version, "5.2.0")) {
            return done();
        }

        const r = setup(this, {
            username: USER,
            privateKey: CLIENT_KEY_ECDSA
        }, {
                hostKeys: [HOST_KEY_RSA]
            }, done);
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "publickey", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.key.algo === "ecdsa-sha2-nistp256", `Unexpected key algo: ${ctx.key.algo}`);
                assert.deepEqual(CLIENT_KEY_ECDSA_PUB.public, ctx.key.data, "Public key mismatch");
                if (ctx.signature) {
                    const verifier = crypto.createVerify("sha256");
                    const pem = CLIENT_KEY_ECDSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature), "Could not verify PK signature");
                    ctx.accept();
                } else {
                    ctx.accept();
                }
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Server with DSA host key", function (done) {
        const r = setup(this, {
            username: USER,
            password: "asdf",
            algorithms: {
                serverHostKey: ["ssh-dss"]
            }
        }, {
                hostKeys: [HOST_KEY_DSA]
            }, done);
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "password", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.password === "asdf", `Unexpected password: ${ctx.password}`);
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Server with ECDSA host key", function (done) {
        if (semver.lt(process.version, "5.2.0")) {
            return done();
        }

        const r = setup(
            this,
            {
                username: USER,
                password: "asdf"
            },
            { hostKeys: [HOST_KEY_ECDSA] },
            done
        );
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "password", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.password === "asdf", `Unexpected password: ${ctx.password}`);
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Server with multiple host keys (RSA selected)", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                password: "asdf",
                algorithms: {
                    serverHostKey: "ssh-rsa"
                }
            },
            { hostKeys: [HOST_KEY_RSA, HOST_KEY_DSA] },
            done
        );
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "password", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.password === "asdf", `Unexpected password: ${ctx.password}`);
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Server with multiple host keys (DSA selected)", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                password: "asdf",
                algorithms: {
                    serverHostKey: "ssh-dss"
                }
            },
            { hostKeys: [HOST_KEY_RSA, HOST_KEY_DSA] },
            done
        );
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "password", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.password === "asdf", `Unexpected password: ${ctx.password}`);
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Authenticate with hostbased", function (done) {
        const hostname = "foo";
        const username = "bar";

        const r = setup(
            this,
            {
                username: USER,
                privateKey: CLIENT_KEY_RSA,
                localHostname: hostname,
                localUsername: username
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method !== "hostbased") {
                    return ctx.reject();
                }
                assert(ctx.method === "hostbased", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.key.algo === "ssh-rsa", `Unexpected key algo: ${ctx.key.algo}`);
                assert.deepEqual(CLIENT_KEY_RSA_PUB.public, ctx.key.data, "Public key mismatch");
                assert(ctx.signature, "Expected signature");
                assert(ctx.localHostname === hostname, "Wrong local hostname");
                assert(ctx.localUsername === username, "Wrong local username");
                const verifier = crypto.createVerify("RSA-SHA1");
                const pem = CLIENT_KEY_RSA_PUB.publicOrig;
                verifier.update(ctx.blob);
                assert(verifier.verify(pem, ctx.signature), "Could not verify hostbased signature");
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Authenticate with a password", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "password", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.password === PASSWORD, `Unexpected password: ${ctx.password}`);
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Verify host fingerprint", function (done) {
        let verified = false;

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD,
                hostHash: "md5",
                hostVerifier(hash) {
                    assert(hash === MD5_HOST_FINGERPRINT, "Host fingerprint mismatch");
                    return (verified = true);
                }
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        }).on("close", () => {
            assert(verified, "Failed to verify host fingerprint");
        });
    });

    it("Simple exec", function (done) {
        let out = "";
        let outErr = "";
        let exitArgs;
        let closeArgs;

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.once("session", (accept, reject) => {
                    const session = accept();
                    session.once("exec", (accept, reject, info) => {
                        assert(info.command === "foo --bar", `Wrong exec command: ${info.command}`);
                        const stream = accept();
                        stream.stderr.write("stderr data!\n");
                        stream.write("stdout data!\n");
                        stream.exit(100);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", () => {
            client.exec("foo --bar", (err, stream) => {
                assert(!err, `Unexpected exec error: ${err}`);
                stream.on("data", (d) => {
                    out += d;
                }).on("exit", function (code) {
                    exitArgs = new Array(arguments.length);
                    for (let i = 0; i < exitArgs.length; ++i) {
                        exitArgs[i] = arguments[i];
                    }
                }).on("close", function (code) {
                    closeArgs = new Array(arguments.length);
                    for (let i = 0; i < closeArgs.length; ++i) {
                        closeArgs[i] = arguments[i];
                    }
                }).stderr.on("data", (d) => {
                    outErr += d;
                });
            });
        }).on("end", () => {
            assert.deepEqual(exitArgs, [100], `Wrong exit args: ${inspect(exitArgs)}`);
            assert.deepEqual(closeArgs, [100], `Wrong close args: ${inspect(closeArgs)}`);
            assert(out === "stdout data!\n", `Wrong stdout data: ${inspect(out)}`);
            assert(outErr === "stderr data!\n", `Wrong stderr data: ${inspect(outErr)}`);
        });
    });

    it("Exec with environment set", function (done) {
        const serverEnv = {};
        const clientEnv = { SSH2NODETEST: "foo" };

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.once("session", (accept, reject) => {
                    const session = accept();
                    session.once("env", (accept, reject, info) => {
                        serverEnv[info.key] = info.val;
                        accept && accept();
                    }).once("exec", (accept, reject, info) => {
                        assert(info.command === "foo --bar", `Wrong exec command: ${info.command}`);
                        const stream = accept();
                        stream.exit(100);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", () => {
            client.exec("foo --bar",
                { env: clientEnv },
                (err, stream) => {
                    assert(!err, `Unexpected exec error: ${err}`);
                    stream.resume();
                }
            );
        }).on("end", () => {
            assert.deepEqual(serverEnv, clientEnv, "Environment mismatch");
        });
    });

    it("Exec with pty set", function (done) {
        let out = "";

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.once("session", (accept, reject) => {
                    const session = accept();
                    let ptyInfo;
                    session.once("pty", (accept, reject, info) => {
                        ptyInfo = info;
                        accept && accept();
                    }).once("exec", (accept, reject, info) => {
                        assert(info.command === "foo --bar", `Wrong exec command: ${info.command}`);
                        const stream = accept();
                        stream.write(JSON.stringify(ptyInfo));
                        stream.exit(100);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        const pty = {
            rows: 2,
            cols: 4,
            width: 0,
            height: 0,
            term: "vt220",
            modes: {}
        };
        client.on("ready", () => {
            client.exec("foo --bar",
                { pty },
                (err, stream) => {
                    assert(!err, `Unexpected exec error: ${err}`);
                    stream.on("data", (d) => {
                        out += d;
                    });
                }
            );
        }).on("end", () => {
            assert.deepEqual(JSON.parse(out), pty, `Wrong stdout data: ${inspect(out)}`);
        });
    });

    it("Exec with OpenSSH agent forwarding", function (done) {
        let out = "";

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD,
                agent: "/foo/bar/baz"
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.once("session", (accept, reject) => {
                    const session = accept();
                    let authAgentReq = false;
                    session.once("auth-agent", (accept, reject) => {
                        authAgentReq = true;
                        accept && accept();
                    }).once("exec", (accept, reject, info) => {
                        assert(info.command === "foo --bar", `Wrong exec command: ${info.command}`);
                        const stream = accept();
                        stream.write(inspect(authAgentReq));
                        stream.exit(100);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", () => {
            client.exec("foo --bar",
                { agentForward: true },
                (err, stream) => {
                    assert(!err, `Unexpected exec error: ${err}`);
                    stream.on("data", (d) => {
                        out += d;
                    });
                }
            );
        }).on("end", () => {
            assert(out === "true", `Wrong stdout data: ${inspect(out)}`);
        });
    });

    it("Exec with X11 forwarding", function (done) {
        let out = "";

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.once("session", (accept, reject) => {
                    const session = accept();
                    let x11 = false;
                    session.once("x11", (accept, reject, info) => {
                        x11 = true;
                        accept && accept();
                    }).once("exec", (accept, reject, info) => {
                        assert(info.command === "foo --bar", `Wrong exec command: ${info.command}`);
                        const stream = accept();
                        stream.write(inspect(x11));
                        stream.exit(100);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", () => {
            client.exec("foo --bar",
                { x11: true },
                (err, stream) => {
                    assert(!err, `Unexpected exec error: ${err}`);
                    stream.on("data", (d) => {
                        out += d;
                    });
                }
            );
        }).on("end", () => {
            assert(out === "true", `Wrong stdout data: ${inspect(out)}`);
        });
    });

    it("Simple shell", function (done) {
        let out = "";

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.once("session", (accept, reject) => {
                    const session = accept();
                    let sawPty = false;
                    session.once("pty", (accept, reject, info) => {
                        sawPty = true;
                        accept && accept();
                    }).once("shell", (accept, reject) => {
                        const stream = accept();
                        stream.write(`Cowabunga dude! ${inspect(sawPty)}`);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", () => {
            client.shell((err, stream) => {
                assert(!err, `Unexpected shell error: ${err}`);
                stream.on("data", (d) => {
                    out += d;
                });
            });
        }).on("end", () => {
            assert(out === "Cowabunga dude! true", `Wrong stdout data: ${inspect(out)}`);
        });
    });

    it("Shell with environment set", function (done) {
        const serverEnv = {};
        const clientEnv = { SSH2NODETEST: "foo" };
        let sawPty = false;

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.once("session", (accept, reject) => {
                    const session = accept();
                    session.once("env", (accept, reject, info) => {
                        serverEnv[info.key] = info.val;
                        accept && accept();
                    }).once("pty", (accept, reject, info) => {
                        sawPty = true;
                        accept && accept();
                    }).once("shell", (accept, reject) => {
                        const stream = accept();
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", () => {
            client.shell({ env: clientEnv }, (err, stream) => {
                assert(!err, `Unexpected shell error: ${err}`);
                stream.resume();
            });
        }).on("end", () => {
            assert.deepEqual(serverEnv, clientEnv, "Environment mismatch");
            assert.strictEqual(sawPty, true);
        });
    });

    it("Simple SFTP", function (done) {
        const expHandle = Buffer.from([1, 2, 3, 4]);
        let sawOpenS = false;
        let sawCloseS = false;
        let sawOpenC = false;

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.once("session", (accept, reject) => {
                    const session = accept();
                    session.once("sftp", (accept, reject) => {
                        if (accept) {
                            const sftp = accept();
                            sftp.once("OPEN", (id, filename, flags, attrs) => {
                                assert(id === 0, `Unexpected sftp request ID: ${id}`);
                                assert(filename === "node.js", `Unexpected filename: ${filename}`);
                                assert(flags === OPEN_MODE.READ, `Unexpected flags: ${flags}`);
                                sawOpenS = true;
                                sftp.handle(id, expHandle);
                                sftp.once("CLOSE", (id, handle) => {
                                    assert(id === 1, `Unexpected sftp request ID: ${id}`);
                                    assert.deepEqual(handle, expHandle, `Wrong sftp file handle: ${inspect(handle)}`);
                                    sawCloseS = true;
                                    sftp.status(id, STATUS_CODE.OK);
                                    conn.end();
                                });
                            });
                        }
                    });
                });
            });
        });
        client.on("ready", () => {
            client.sftp((err, sftp) => {
                assert(!err, `Unexpected sftp error: ${err}`);
                sftp.open("node.js", "r", (err, handle) => {
                    assert(!err, `Unexpected sftp error: ${err}`);
                    assert.deepEqual(handle, expHandle, `Wrong sftp file handle: ${inspect(handle)}`);
                    sawOpenC = true;
                    sftp.close(handle, (err) => {
                        assert(!err, `Unexpected sftp error: ${err}`);
                    });
                });
            });
        }).on("end", () => {
            assert(sawOpenS, "Expected sftp open()");
            assert(sawOpenC, "Expected sftp open() callback");
            assert(sawCloseS, "Expected sftp open()");
            assert(sawOpenC, "Expected sftp close() callback");
        });
    });

    it.skip("connect() on connected client", (done) => {
        let client;
        let server;
        const state = {
            readies: 0,
            closes: 0
        };
        const clientcfg = {
            username: USER,
            password: PASSWORD
        };
        const servercfg = {
            hostKeys: [HOST_KEY_RSA]
        };
        let reconnect = false;

        client = new Client(),
            server = new Server(servercfg);

        const onReady = () => {
            assert(++state.readies <= 4, `Wrong ready count: ${state.readies}`);
        };

        const onClose = () => {
            assert(++state.closes <= 3, `Wrong close count: ${state.closes}`);
            if (state.closes === 2) {
                server.close();
            } else if (state.closes === 3) {
                done();
            }
        };

        server.listen(0, "localhost", () => {
            clientcfg.host = "localhost";
            clientcfg.port = server.address().port;
            client.connect(clientcfg);
        });

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", onReady);
        }).on("close", onClose);
        client.on("ready", () => {
            onReady();
            if (reconnect) {
                client.end();
            } else {
                reconnect = true;
                client.connect(clientcfg);
            }
        }).on("close", onClose);
    });

    it("Throw when not connected", (done) => {
        const client = new Client({
            username: USER,
            password: PASSWORD
        });

        assert.throws(() => {
            client.exec("uptime", (err, stream) => {
                assert(false, "Callback unexpectedly called");
            });
        });
        done();
    });

    it("Outstanding callbacks called on disconnect", function (done) {
        let calledBack = 0;

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            });
        });
        client.on("ready", () => {
            const callback = (err, stream) => {
                assert(err, "Expected error");
                assert(err.message === "No response from server", `Wrong error message: ${err.message}`);
                ++calledBack;
            };
            client.exec("uptime", callback);
            client.shell(callback);
            client.sftp(callback);
            client.end();
        }).on("close", () => {
            // give the callbacks a chance to execute
            process.nextTick(() => {
                assert(calledBack === 3, `Only ${
                    calledBack}/3 outstanding callbacks called`
                );
            });
        });
    });

    it("Throw when not connected", (done) => {
        const client = new Client({
            username: USER,
            password: PASSWORD
        });

        assert.throws(() => {
            client.exec("uptime", (err, stream) => {
                assert(false, "Callback unexpectedly called");
            });
        });
        done();
    });

    it("Pipelined requests", function (done) {
        let calledBack = 0;

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    const session = accept();
                    session.once("exec", (accept, reject, info) => {
                        const stream = accept();
                        stream.exit(0);
                        stream.end();
                    });
                });
            });
        });
        client.on("ready", () => {
            const callback = (err, stream) => {
                assert.ifError(err);
                stream.resume();
                if (++calledBack === 3) {
                    client.end();
                }
            };
            client.exec("foo", callback);
            client.exec("bar", callback);
            client.exec("baz", callback);
        }).on("end", () => {
            assert(calledBack === 3, `Only ${calledBack}/3 callbacks called`);
        });
    });

    it("Pipelined requests with intermediate rekeying", function (done) {
        let calledBack = 0;

        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                const reqs = [];
                conn.on("session", (accept, reject) => {
                    if (reqs.length === 0) {
                        conn.rekey((err) => {
                            assert(!err, `Unexpected rekey error: ${err}`);
                            reqs.forEach((accept) => {
                                const session = accept();
                                session.once("exec", (accept, reject, info) => {
                                    const stream = accept();
                                    stream.exit(0);
                                    stream.end();
                                });
                            });
                        });
                    }
                    reqs.push(accept);
                });
            });
        });
        client.on("ready", () => {
            const callback = (err, stream) => {
                assert.ifError(err);
                stream.resume();
                if (++calledBack === 3) {
                    client.end();
                }
            };
            client.exec("foo", callback);
            client.exec("bar", callback);
            client.exec("baz", callback);
        }).on("end", () => {
            assert(calledBack === 3, `Only ${calledBack}/3 callbacks called`);
        });
    });

    it("Ignore outgoing after stream close", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    const session = accept();
                    session.once("exec", (accept, reject, info) => {
                        const stream = accept();
                        stream.exit(0);
                        stream.end();
                    });
                });
            });
        });
        client.on("ready", () => {
            client.exec("foo", (err, stream) => {
                assert.ifError(err);
                stream.on("exit", (code, signal) => {
                    client.end();
                });
            });
        });
    });

    it("SFTP server aborts with exit-status", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    accept().on("sftp", (accept, reject) => {
                        const sftp = accept();
                        // XXX: hack to get channel ...
                        const channel = sftp._readableState.pipes;

                        channel.unpipe(sftp);
                        sftp.unpipe(channel);

                        channel.exit(127);
                        channel.close();
                    });
                });
            });
        });
        client.on("ready", () => {
            const timeout = setTimeout(() => {
                assert(false, "Unexpected SFTP timeout");
            }, 1000);
            client.sftp((err, sftp) => {
                clearTimeout(timeout);
                assert(err, "Expected error");
                assert(err.code === 127, `Expected exit code 127, saw: ${err.code}`);
                client.end();
            });
        });
    });

    it("Double pipe on unconnected, passed in net.Socket", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD,
                sock: new net.Socket()
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", adone.noop);
        });
        client.on("ready", () => {
            client.end();
        });
    });

    it("Client auto-rejects unrequested, allows requested forwarded-tcpip", function (done) {
        const r = setup(
            this,
            { username: USER },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            });
            conn.on("request", (accept, reject, name, info) => {
                accept();
                conn.forwardOut("good", 0, "remote", 12345, (err, ch) => {
                    if (err) {
                        assert.ifError(err);
                    }
                    conn.forwardOut("bad", 0, "remote", 12345, (err, ch) => {
                        assert(err, "Should receive error");
                        client.end();
                    });
                });
            });
        });

        client.on("ready", () => {
            // request forwarding
            client.forwardIn("good", 0, (err, port) => {
                if (err) {
                    assert.ifError(err);
                }
            });
        });
        client.on("tcp connection", (details, accept, reject) => {
            accept();
        });
    });

    it("Server greeting", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            {
                hostKeys: [HOST_KEY_RSA],
                greeting: "Hello world!"
            },
            done
        );
        const client = r.client;
        const server = r.server;

        let sawGreeting = false;

        client.on("greeting", (greeting) => {
            assert.strictEqual(greeting, "Hello world!\r\n");
            sawGreeting = true;
        });
        client.on("banner", (message) => {
            assert.fail(null, null, "Unexpected banner");
        });

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                assert(sawGreeting, "Client did not see greeting");
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "password", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.password === PASSWORD, `Unexpected password: ${ctx.password}`);
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Server banner", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            {
                hostKeys: [HOST_KEY_RSA],
                banner: "Hello world!"
            },
            done
        );
        const client = r.client;
        const server = r.server;

        let sawBanner = false;

        client.on("greeting", (greeting) => {
            assert.fail(null, null, "Unexpected greeting");
        });
        client.on("banner", (message) => {
            assert.strictEqual(message, "Hello world!\r\n");
            sawBanner = true;
        });

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                assert(sawBanner, "Client did not see banner");
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                assert(ctx.method === "password", `Unexpected auth method: ${ctx.method}`);
                assert(ctx.username === USER, `Unexpected username: ${ctx.username}`);
                assert(ctx.password === PASSWORD, `Unexpected password: ${ctx.password}`);
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        });
    });

    it("Server responds to global requests in the right order", function (done) {
        let fastRejectSent = false;

        const sendAcceptLater = (accept) => {
            if (fastRejectSent) {
                accept();
            } else {
                setImmediate(sendAcceptLater, accept);
            }
        };

        const r = setup(
            this,
            { username: USER },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            });

            conn.on("request", (accept, reject, name, info) => {
                if (info.bindAddr === "fastReject") {
                    // Will call reject on "fastReject" soon
                    reject();
                    fastRejectSent = true;
                } else
                // but accept on "slowAccept" later
                {
                    sendAcceptLater(accept);
                }
            });
        });

        client.on("ready", () => {
            let replyCnt = 0;

            client.forwardIn("slowAccept", 0, (err) => {
                assert.ifError(err);
                if (++replyCnt === 2) {
                    client.end();
                }
            });

            client.forwardIn("fastReject", 0, (err) => {
                assert(err, "Should receive error");
                if (++replyCnt === 2) {
                    client.end();
                }
            });
        });
    });

    it("Cleanup outstanding channel requests on channel close", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        let timer;
        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    const session = accept();
                    session.once("subsystem", (accept, reject, info) => {
                        assert.equal(info.name, "netconf");

                        // Prevent success reply from being sent
                        conn._sshstream.channelSuccess = function () { };

                        const stream = accept();
                        stream.close();
                        timer = setTimeout(() => {
                            throw new Error("Expected client callback");
                        }, 50);
                    });
                });
            });
        });
        client.on("ready", () => {
            client.subsys("netconf", (err, stream) => {
                clearTimeout(timer);
                assert(err);
                client.end();
            });
        });
    });

    it("Channel emits close prematurely", function (done) {
        const r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            }).on("ready", () => {
                conn.on("session", (accept, reject) => {
                    const session = accept();
                    session.once("exec", (accept, reject, info) => {
                        const stream = accept();
                        // Write enough to bring the Client"s channel window to 0
                        // (currently 1MB)
                        const buf = new Buffer(2048);
                        for (let i = 0; i < 1000; ++i) {
                            stream.write(buf);
                        }
                        stream.exit(0);
                        stream.close();
                    });
                });
            });
        });
        client.on("ready", () => {
            client.exec("foo", (err, stream) => {
                let sawClose = false;
                assert(!err, "Unexpected error");
                const onClose = () => {
                    // This handler gets called *after* the internal handler, so we
                    // should have seen `stream`"s `close` event already if the bug
                    // exists
                    assert(!sawClose, "Premature close event");
                    client.end();
                };
                client._sshstream.on(`CHANNEL_CLOSE:${stream.incoming.id}`, onClose);
                stream.on("close", () => {
                    sawClose = true;
                });
            });
        });
    });

    it("OpenSSH 5.x workaround for binding on port 0", function (done) {
        const r = setup(
            this,
            { username: USER },
            { hostKeys: [HOST_KEY_RSA], ident: "OpenSSH_5.3" },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                ctx.accept();
            });
            conn.once("request", (accept, reject, name, info) => {
                assert(name === "tcpip-forward", `Unexpected request: ${name}`);
                accept(1337);
                conn.forwardOut("good", 0, "remote", 12345, (err, ch) => {
                    assert.ifError(err);
                    client.end();
                });
            });
        });

        client.on("ready", () => {
            // request forwarding
            client.forwardIn("good", 0, (err, port) => {
                assert.ifError(err);
                assert(port === 1337, `Bad bound port: ${port}`);
            });
        });
        client.on("tcp connection", (details, accept, reject) => {
            assert(details.destIP === "good", `Bad incoming destIP: ${details.destIP}`);
            assert(details.destPort === 1337, `Bad incoming destPort: ${details.destPort}`);
            assert(details.srcIP === "remote", `Bad incoming srcIP: ${details.srcIP}`);
            assert(details.srcPort === 12345, `Bad incoming srcPort: ${details.srcPort}`);
            accept();
        });
    });

    it("Handshake errors are emitted", function (done) {
        let srvError;
        let cliError;

        const r = setup(
            this,
            {
                username: USER,
                algorithms: {
                    cipher: ["aes128-cbc"]
                }
            },
            {
                hostKeys: [HOST_KEY_RSA],
                algorithms: {
                    cipher: ["aes128-ctr"]
                }
            },
            done
        );
        const client = r.client;
        const server = r.server;

        // Remove default client error handler added by `setup()` since we are
        // expecting an error in this case
        client.removeAllListeners("error");

        const onError = function (err) {
            if (this === client) {
                assert(!cliError, "Unexpected multiple client errors");
                cliError = err;
            } else {
                assert(!srvError, "Unexpected multiple server errors");
                srvError = err;
            }
            assert(/handshake failed/i.test(err.message), "Wrong error message");
        };

        server.on("connection", (conn) => {
            // Remove default server connection error handler added by `setup()`
            // since we are expecting an error in this case
            conn.removeAllListeners("error");

            const onGoodHandshake = () => {
                assert(false, "Handshake should have failed");
            };
            conn.on("authentication", onGoodHandshake);
            conn.on("ready", onGoodHandshake);

            conn.on("error", onError);
        });

        client.on("ready", () => {
            assert(false, "Handshake should have failed");
        });
        client.on("error", onError);
        client.on("close", () => {
            assert(cliError, "Expected client error");
            assert(srvError, "Expected client error");
        });
    });

    it("Client signing errors are caught and emitted", function (done) {
        let cliError;

        const r = setup(
            this,
            { username: USER, privateKey: KEY_RSA_BAD },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        // Remove default client error handler added by `setup()` since we are
        // expecting an error in this case
        client.removeAllListeners("error");

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                assert(ctx.method === "publickey" || ctx.method === "none",
                    `Unexpected auth method: ${ctx.method}`);
                assert(!ctx.signature, "Unexpected signature");
                if (ctx.method === "none") {
                    return ctx.reject();
                }
                ctx.accept();
            });
            conn.on("ready", () => {
                assert(false, "Authentication should have failed");
            });
        });

        client.on("ready", () => {
            assert(false, "Authentication should have failed");
        });
        client.on("error", (err) => {
            if (cliError) {
                assert(/all configured/i.test(err.message),
                    "Wrong error message");
            } else {
                cliError = err;
                assert(/signing/i.test(err.message), "Wrong error message");
            }
        });
        client.on("close", () => {
            assert(cliError, "Expected client error");
        });
    });

    it("Server signing errors are caught and emitted", function (done) {
        let srvError;
        let cliError;

        const r = setup(
            this,
            { username: USER, password: "foo" },
            { hostKeys: [KEY_RSA_BAD] },
            done
        );
        const client = r.client;
        const server = r.server;

        // Remove default client error handler added by `setup()` since we are
        // expecting an error in this case
        client.removeAllListeners("error");

        server.on("connection", (conn) => {
            // Remove default server connection error handler added by `setup()`
            // since we are expecting an error in this case
            conn.removeAllListeners("error");

            conn.once("error", (err) => {
                assert(/signing/i.test(err.message), "Wrong error message");
                srvError = err;
            });
            conn.on("authentication", (ctx) => {
                assert(false, "Handshake should have failed");
            });
            conn.on("ready", () => {
                assert(false, "Authentication should have failed");
            });
        });

        client.on("ready", () => {
            assert(false, "Handshake should have failed");
        });
        client.on("error", (err) => {
            assert(!cliError, "Unexpected multiple client errors");
            assert(/KEY_EXCHANGE_FAILED/.test(err.message),
                "Wrong error message");
            cliError = err;
        });
        client.on("close", () => {
            assert(srvError, "Expected server error");
            assert(cliError, "Expected client error");
        });
    });


    it("Empty username string works", function (done) {
        let sawReady = false;

        const r = setup(
            this,
            { username: "", password: "foo" },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                assert.strictEqual(ctx.username, "", "Expected empty username");
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        });

        client.on("ready", () => {
            sawReady = true;
        }).on("close", () => {
            assert.strictEqual(sawReady, true, "Expected ready event");
        });
    });

    it("Empty user string works", function (done) {
        let sawReady = false;

        const r = setup(
            this,
            { user: "", password: "foo" },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        const client = r.client;
        const server = r.server;

        server.on("connection", (conn) => {
            conn.on("authentication", (ctx) => {
                assert.strictEqual(ctx.username, "", "Expected empty username");
                ctx.accept();
            }).on("ready", () => {
                conn.end();
            });
        });

        client.on("ready", () => {
            sawReady = true;
        }).on("close", () => {
            assert.strictEqual(sawReady, true, "Expected ready event");
        });
    });
});
