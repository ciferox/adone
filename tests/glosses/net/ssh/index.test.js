/* global describe it */


const { Client, Server } = adone.net.ssh;
import { SFTPStream, utils } from "../../../../lib/glosses/net/ssh/ssh_streams";
const OPEN_MODE = SFTPStream.OPEN_MODE;
const STATUS_CODE = SFTPStream.STATUS_CODE;

const { net, fs, crypto, path } = adone.std;
const join = path.join;
const inspect = adone.std.util.inspect;

const semver = require("semver");
const fixturesdir = join(__dirname, "fixtures");

const USER = "nodejs";
const PASSWORD = "FLUXCAPACITORISTHEPOWER";
const MD5_HOST_FINGERPRINT = "64254520742d3d0792e918f3ce945a64";
const KEY_RSA_BAD = fs.readFileSync(join(fixturesdir, "bad_rsa_private_key"));
const HOST_KEY_RSA = fs.readFileSync(join(fixturesdir, "ssh_host_rsa_key"));
const HOST_KEY_DSA = fs.readFileSync(join(fixturesdir, "ssh_host_dsa_key"));
const HOST_KEY_ECDSA = fs.readFileSync(join(fixturesdir, "ssh_host_ecdsa_key"));
const CLIENT_KEY_ENC_RSA = fs.readFileSync(join(fixturesdir, "id_rsa_enc"));
let CLIENT_KEY_ENC_RSA_PUB = utils.parseKey(CLIENT_KEY_ENC_RSA);
utils.decryptKey(CLIENT_KEY_ENC_RSA_PUB, "foobarbaz");
CLIENT_KEY_ENC_RSA_PUB = utils.genPublicKey(CLIENT_KEY_ENC_RSA_PUB);
const CLIENT_KEY_PPK_RSA = fs.readFileSync(join(fixturesdir, "id_rsa.ppk"));
const CLIENT_KEY_PPK_RSA_PUB = utils.parseKey(CLIENT_KEY_PPK_RSA);
const CLIENT_KEY_RSA = fs.readFileSync(join(fixturesdir, "id_rsa"));
const CLIENT_KEY_RSA_PUB = utils.genPublicKey(utils.parseKey(CLIENT_KEY_RSA));
const CLIENT_KEY_DSA = fs.readFileSync(join(fixturesdir, "id_dsa"));
const CLIENT_KEY_DSA_PUB = utils.genPublicKey(utils.parseKey(CLIENT_KEY_DSA));
if (semver.gte(process.version, "5.2.0")) {
    var CLIENT_KEY_ECDSA = fs.readFileSync(join(fixturesdir, "id_ecdsa"));
    var CLIENT_KEY_ECDSA_PUB = utils.genPublicKey(
        utils.parseKey(CLIENT_KEY_ECDSA)
    );
}
const DEBUG_MODE = false;

describe("SSH", function(){
    function setup(self, clientcfg, servercfg, done) {
        self.state = {
            clientReady: false,
            serverReady: false,
            clientClose: false,
            serverClose: false
        };

        if (DEBUG_MODE) {
            clientcfg.debug = function(str) {
                console.log("[CLIENT] " + str);
            };
            servercfg.debug = function(str) {
                console.log("[SERVER] " + str);
            };
        }

        let client = new Client();
        let server = new Server(servercfg);

        server.on("error", onError)
        .on("connection", function(conn) {
            conn.on("error", onError)
                    .on("ready", onReady);
            server.close();
        })
        .on("close", onClose);

        client.on("error", onError)
        .on("ready", onReady)
        .on("close", onClose);

        function onError(err) {
            let which = (this === client ? "client" : "server");
            assert.fail("Unexpected " + which + " error: " + err);
        }
        function onReady() {
            if (this === client) {
                assert(!self.state.clientReady, "Received multiple ready events for client");
                self.state.clientReady = true;
            } else {
                assert(!self.state.serverReady, "Received multiple ready events for server");
                self.state.serverReady = true;
            }
            if (self.state.clientReady && self.state.serverReady)
                self.onReady && self.onReady();
        }
        function onClose() {
            if (this === client) {
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
                if (clientcfg.sock)
                    clientcfg.sock.connect(server.address().port, "localhost");
                else {
                    clientcfg.host = "localhost";
                    clientcfg.port = server.address().port;
                }
                client.connect(clientcfg);
            });
        });
        return { client: client, server: server };
    }

    it("Authenticate with an RSA key", function(done) {
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                privateKey: CLIENT_KEY_RSA
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "publickey", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.key.algo === "ssh-rsa", "Unexpected key algo: " + ctx.key.algo);
                assert.deepEqual(CLIENT_KEY_RSA_PUB.public, ctx.key.data, "Public key mismatch" );
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
                conn.end();
            });
        });
    });

    it("Authenticate with an encrypted RSA key", function(done) {
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                privateKey: CLIENT_KEY_ENC_RSA,
                passphrase: "foobarbaz",
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "publickey", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.key.algo === "ssh-rsa", "Unexpected key algo: " + ctx.key.algo);
                assert.deepEqual(CLIENT_KEY_ENC_RSA_PUB.public, ctx.key.data, "Public key mismatch");
                if (ctx.signature) {
                    let verifier = crypto.createVerify("RSA-SHA1");
                    let pem = CLIENT_KEY_ENC_RSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature), "Could not verify PK signature");
                    ctx.accept();
                } else
                    ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Authenticate with an RSA key (PPK)", function(done) {
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                privateKey: CLIENT_KEY_PPK_RSA
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "publickey", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.key.algo === "ssh-rsa", "Unexpected key algo: " + ctx.key.algo);
                if (ctx.signature) {
                    let verifier = crypto.createVerify("RSA-SHA1");
                    let pem = CLIENT_KEY_PPK_RSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature), "Could not verify PK signature");
                    ctx.accept();
                } else
                    ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Authenticate with a DSA key", function(done) {
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                privateKey: CLIENT_KEY_DSA
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "publickey", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.key.algo === "ssh-dss", "Unexpected key algo: " + ctx.key.algo);
                assert.deepEqual(CLIENT_KEY_DSA_PUB.public, ctx.key.data, "Public key mismatch");
                if (ctx.signature) {
                    let verifier = crypto.createVerify("DSA-SHA1");
                    let pem = CLIENT_KEY_DSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature), "Could not verify PK signature");
                    ctx.accept();
                } else
                    ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Authenticate with a ECDSA key", function(done) {
        if (semver.lt(process.version, "5.2.0"))
            return done();
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                privateKey: CLIENT_KEY_ECDSA
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "publickey", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.key.algo === "ecdsa-sha2-nistp256", "Unexpected key algo: " + ctx.key.algo);
                assert.deepEqual(CLIENT_KEY_ECDSA_PUB.public, ctx.key.data, "Public key mismatch");
                if (ctx.signature) {
                    let verifier = crypto.createVerify("sha256");
                    let pem = CLIENT_KEY_ECDSA_PUB.publicOrig;
                    verifier.update(ctx.blob);
                    assert(verifier.verify(pem, ctx.signature), "Could not verify PK signature");
                    ctx.accept();
                } else
                    ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Server with DSA host key", function(done) {
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                password: "asdf",
                algorithms: {
                    serverHostKey: ["ssh-dss"]
                }
            },
            { hostKeys: [HOST_KEY_DSA] },
            done
        );
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "password", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.password === "asdf", "Unexpected password: " + ctx.password);
                ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Server with ECDSA host key", function(done) {
        if (semver.lt(process.version, "5.2.0"))
            return done();
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                password: "asdf"
            },
            { hostKeys: [HOST_KEY_ECDSA] },
            done
        );
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "password", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.password === "asdf", "Unexpected password: " + ctx.password);
                ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Server with multiple host keys (RSA selected)", function(done) {
        let server;
        let r;

        r = setup(
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
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "password", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.password === "asdf", "Unexpected password: " + ctx.password);
                ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Server with multiple host keys (DSA selected)", function(done) {
        let server;
        let r;

        r = setup(
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
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "password", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.password === "asdf", "Unexpected password: " + ctx.password);
                ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Authenticate with hostbased", function(done) {
        let server;
        let r;
        let hostname = "foo";
        let username = "bar";

        r = setup(
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
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method !== "hostbased")
                    return ctx.reject();
                assert(ctx.method === "hostbased", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.key.algo === "ssh-rsa", "Unexpected key algo: " + ctx.key.algo);
                assert.deepEqual(CLIENT_KEY_RSA_PUB.public, ctx.key.data, "Public key mismatch");
                assert(ctx.signature, "Expected signature");
                assert(ctx.localHostname === hostname, "Wrong local hostname");
                assert(ctx.localUsername === username, "Wrong local username");
                let verifier = crypto.createVerify("RSA-SHA1");
                let pem = CLIENT_KEY_RSA_PUB.publicOrig;
                verifier.update(ctx.blob);
                assert(verifier.verify(pem, ctx.signature), "Could not verify hostbased signature");
                ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Authenticate with a password", function(done) {
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "password", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.password === PASSWORD, "Unexpected password: " + ctx.password);
                ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Verify host fingerprint", function(done) {
        let server;
        let r;
        let verified = false;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD,
                hostHash: "md5",
                hostVerifier: function(hash) {
                    assert(hash === MD5_HOST_FINGERPRINT, "Host fingerprint mismatch");
                    return (verified = true);
                }
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        }).on("close", function() {
            assert(verified, "Failed to verify host fingerprint");
        });
    });

    it("Simple exec", function(done) {
        let client;
        let server;
        let r;
        let out = "";
        let outErr = "";
        let exitArgs;
        let closeArgs;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.once("session", function(accept, reject) {
                    let session = accept();
                    session.once("exec", function(accept, reject, info) {
                        assert(info.command === "foo --bar", "Wrong exec command: " + info.command);
                        let stream = accept();
                        stream.stderr.write("stderr data!\n");
                        stream.write("stdout data!\n");
                        stream.exit(100);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", function() {
            client.exec("foo --bar", function(err, stream) {
                assert(!err, "Unexpected exec error: " + err);
                stream.on("data", function(d) {
                    out += d;
                }).on("exit", function(code) {
                    exitArgs = new Array(arguments.length);
                    for (let i = 0; i < exitArgs.length; ++i){
                        exitArgs[i] = arguments[i];
                    }
                }).on("close", function(code) {
                    closeArgs = new Array(arguments.length);
                    for (let i = 0; i < closeArgs.length; ++i){
                        closeArgs[i] = arguments[i];
                    }
                }).stderr.on("data", function(d) {
                    outErr += d;
                });
            });
        }).on("end", function() {
            assert.deepEqual(exitArgs, [100], "Wrong exit args: " + inspect(exitArgs));
            assert.deepEqual(closeArgs, [100], "Wrong close args: " + inspect(closeArgs));
            assert(out === "stdout data!\n", "Wrong stdout data: " + inspect(out));
            assert(outErr === "stderr data!\n", "Wrong stderr data: " + inspect(outErr));
        });
    });

    it("Exec with environment set", function(done) {
        let client;
        let server;
        let r;
        let out = "";

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.once("session", function(accept, reject) {
                    let session = accept();
                    let env = {};
                    session.once("env", function(accept, reject, info) {
                        env[info.key] = info.val;
                        accept && accept();
                    }).once("exec", function(accept, reject, info) {
                        assert(info.command === "foo --bar", "Wrong exec command: " + info.command);
                        let stream = accept();
                        stream.write(""+env.SSH2NODETEST);
                        stream.exit(100);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", function() {
            client.exec("foo --bar",
                { env: { SSH2NODETEST: "foo" } },
                function(err, stream) {
                    assert(!err, "Unexpected exec error: " + err);
                    stream.on("data", function(d) {
                        out += d;
                    });
                }
            );
        }).on("end", function() {
            assert(out === "foo", "Wrong stdout data: " + inspect(out));
        });
    });

    it("Exec with pty set", function(done) {
        let client;
        let server;
        let r;
        let out = "";

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.once("session", function(accept, reject) {
                    let session = accept();
                    let ptyInfo;
                    session.once("pty", function(accept, reject, info) {
                        ptyInfo = info;
                        accept && accept();
                    }).once("exec", function(accept, reject, info) {
                        assert(info.command === "foo --bar", "Wrong exec command: " + info.command);
                        let stream = accept();
                        stream.write(JSON.stringify(ptyInfo));
                        stream.exit(100);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        let pty = {
            rows: 2,
            cols: 4,
            width: 0,
            height: 0,
            term: "vt220",
            modes: {}
        };
        client.on("ready", function() {
            client.exec("foo --bar",
                { pty: pty },
                function(err, stream) {
                    assert(!err, "Unexpected exec error: " + err);
                    stream.on("data", function(d) {
                        out += d;
                    });
                }
            );
        }).on("end", function() {
            assert.deepEqual(JSON.parse(out), pty, "Wrong stdout data: " + inspect(out));
        });
    });

    it("Exec with OpenSSH agent forwarding", function(done) {
        let client;
        let server;
        let r;
        let out = "";

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD,
                agent: "/foo/bar/baz"
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.once("session", function(accept, reject) {
                    let session = accept();
                    let authAgentReq = false;
                    session.once("auth-agent", function(accept, reject) {
                        authAgentReq = true;
                        accept && accept();
                    }).once("exec", function(accept, reject, info) {
                        assert(info.command === "foo --bar", "Wrong exec command: " + info.command);
                        let stream = accept();
                        stream.write(inspect(authAgentReq));
                        stream.exit(100);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", function() {
            client.exec("foo --bar",
                { agentForward: true },
                function(err, stream) {
                    assert(!err, "Unexpected exec error: " + err);
                    stream.on("data", function(d) {
                        out += d;
                    });
                }
            );
        }).on("end", function() {
            assert(out === "true", "Wrong stdout data: " + inspect(out));
        });
    });

    it("Exec with X11 forwarding", function(done) {
        let client;
        let server;
        let r;
        let out = "";

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.once("session", function(accept, reject) {
                    let session = accept();
                    let x11 = false;
                    session.once("x11", function(accept, reject, info) {
                        x11 = true;
                        accept && accept();
                    }).once("exec", function(accept, reject, info) {
                        assert(info.command === "foo --bar", "Wrong exec command: " + info.command);
                        let stream = accept();
                        stream.write(inspect(x11));
                        stream.exit(100);
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", function() {
            client.exec("foo --bar",
                { x11: true },
                function(err, stream) {
                    assert(!err, "Unexpected exec error: " + err);
                    stream.on("data", function(d) {
                        out += d;
                    });
                }
            );
        }).on("end", function() {
            assert(out === "true", "Wrong stdout data: " + inspect(out));
        });
    });

    it("Simple shell", function(done) {
        let client;
        let server;
        let r;
        let out = "";

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.once("session", function(accept, reject) {
                    let session = accept();
                    let sawPty = false;
                    session.once("pty", function(accept, reject, info) {
                        sawPty = true;
                        accept && accept();
                    }).once("shell", function(accept, reject) {
                        let stream = accept();
                        stream.write("Cowabunga dude! " + inspect(sawPty));
                        stream.end();
                        conn.end();
                    });
                });
            });
        });
        client.on("ready", function() {
            client.shell(function(err, stream) {
                assert(!err, "Unexpected exec error: " + err);
                stream.on("data", function(d) {
                    out += d;
                });
            });
        }).on("end", function() {
            assert(out === "Cowabunga dude! true", "Wrong stdout data: " + inspect(out));
        });
    });

    it("Simple SFTP", function(done) {
        let client;
        let server;
        let r;
        let expHandle = new Buffer([1, 2, 3, 4]);
        let sawOpenS = false;
        let sawCloseS = false;
        let sawOpenC = false;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.once("session", function(accept, reject) {
                    let session = accept();
                    session.once("sftp", function(accept, reject) {
                        if (accept) {
                            let sftp = accept();
                            sftp.once("OPEN", function(id, filename, flags, attrs) {
                                assert(id === 0, "Unexpected sftp request ID: " + id);
                                assert(filename === "node.js", "Unexpected filename: " + filename);
                                assert(flags === OPEN_MODE.READ, "Unexpected flags: " + flags);
                                sawOpenS = true;
                                sftp.handle(id, expHandle);
                                sftp.once("CLOSE", function(id, handle) {
                                    assert(id === 1, "Unexpected sftp request ID: " + id);
                                    assert.deepEqual(handle, expHandle, "Wrong sftp file handle: " + inspect(handle));
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
        client.on("ready", function() {
            client.sftp(function(err, sftp) {
                assert(!err, "Unexpected sftp error: " + err);
                sftp.open("node.js", "r", function(err, handle) {
                    assert(!err, "Unexpected sftp error: " + err);
                    assert.deepEqual(handle, expHandle, "Wrong sftp file handle: " + inspect(handle));
                    sawOpenC = true;
                    sftp.close(handle, function(err) {
                        assert(!err, "Unexpected sftp error: " + err);
                    });
                });
            });
        }).on("end", function() {
            assert(sawOpenS, "Expected sftp open()");
            assert(sawOpenC, "Expected sftp open() callback");
            assert(sawCloseS, "Expected sftp open()");
            assert(sawOpenC, "Expected sftp close() callback");
        });
    });

    it("connect() on connected client", function(done) {
        let client;
        let server;
        let state = {
            readies: 0,
            closes: 0
        };
        let clientcfg = {
            username: USER,
            password: PASSWORD
        };
        let servercfg = {
            hostKeys: [HOST_KEY_RSA]
        };
        let reconnect = false;

        client = new Client(),
        server = new Server(servercfg);

        function onReady() {
            assert(++state.readies <= 4, "Wrong ready count: " + state.readies);
        }
        function onClose() {
            assert(++state.closes <= 3, "Wrong close count: " + state.closes);
            if (state.closes === 2)
                server.close();
            else if (state.closes === 3)
                done();
        }

        server.listen(0, "localhost", function() {
            clientcfg.host = "localhost";
            clientcfg.port = server.address().port;
            client.connect(clientcfg);
        });

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", onReady);
        }).on("close", onClose);
        client.on("ready", function() {
            onReady();
            if (reconnect)
                client.end();
            else {
                reconnect = true;
                client.connect(clientcfg);
            }
        }).on("close", onClose);
    });

    it("Throw when not connected", function(done) {
        let client = new Client({
            username: USER,
            password: PASSWORD
        });

        assert.throws(function() {
            client.exec("uptime", function(err, stream) {
                assert(false, "Callback unexpectedly called");
            });
        });
        done();
    });

    it("Outstanding callbacks called on disconnect", function(done) {
        let client;
        let server;
        let r;
        let calledBack = 0;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            });
        });
        client.on("ready", function() {
            function callback(err, stream) {
                assert(err, "Expected error");
                assert(err.message === "No response from server", "Wrong error message: " + err.message);
                ++calledBack;
            }
            client.exec("uptime", callback);
            client.shell(callback);
            client.sftp(callback);
            client.end();
        }).on("close", function() {
            // give the callbacks a chance to execute
            process.nextTick(function() {
                assert(calledBack === 3, "Only "
                    + calledBack + "/3 outstanding callbacks called"
                );
            });
        });
    });

    it("Throw when not connected", function(done) {
        let client = new Client({
            username: USER,
            password: PASSWORD
        });

        assert.throws(function() {
            client.exec("uptime", function(err, stream) {
                assert(false, "Callback unexpectedly called");
            });
        });
        done();
    });

    it("Pipelined requests", function(done) {
        let client;
        let server;
        let r;
        let calledBack = 0;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.on("session", function(accept, reject) {
                    let session = accept();
                    session.once("exec", function(accept, reject, info) {
                        let stream = accept();
                        stream.exit(0);
                        stream.end();
                    });
                });
            });
        });
        client.on("ready", function() {
            function callback(err, stream) {
                assert.ifError(err);
                stream.resume();
                if (++calledBack === 3)
                    client.end();
            }
            client.exec("foo", callback);
            client.exec("bar", callback);
            client.exec("baz", callback);
        }).on("end", function() {
            assert(calledBack === 3, "Only " + calledBack + "/3 callbacks called");
        });
    });

    it("Pipelined requests with intermediate rekeying", function(done) {
        let client;
        let server;
        let r;
        let calledBack = 0;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD,
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                let reqs = [];
                conn.on("session", function(accept, reject) {
                    if (reqs.length === 0) {
                        conn.rekey(function(err) {
                            assert(!err, "Unexpected rekey error: " + err);
                            reqs.forEach(function(accept) {
                                let session = accept();
                                session.once("exec", function(accept, reject, info) {
                                    let stream = accept();
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
        client.on("ready", function() {
            function callback(err, stream) {
                assert.ifError(err);
                stream.resume();
                if (++calledBack === 3)
                    client.end();
            }
            client.exec("foo", callback);
            client.exec("bar", callback);
            client.exec("baz", callback);
        }).on("end", function() {
            assert(calledBack === 3, "Only " + calledBack + "/3 callbacks called");
        });
    });

    it("Ignore outgoing after stream close", function(done) {
        let client;
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.on("session", function(accept, reject) {
                    let session = accept();
                    session.once("exec", function(accept, reject, info) {
                        let stream = accept();
                        stream.exit(0);
                        stream.end();
                    });
                });
            });
        });
        client.on("ready", function() {
            client.exec("foo", function(err, stream) {
                assert.ifError(err);
                stream.on("exit", function(code, signal) {
                    client.end();
                });
            });
        });
    });

    it("SFTP server aborts with exit-status", function(done) {
        let client;
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.on("session", function(accept, reject) {
                    accept().on("sftp", function(accept, reject) {
                        let sftp = accept();
                        // XXX: hack to get channel ...
                        let channel = sftp._readableState.pipes;

                        channel.unpipe(sftp);
                        sftp.unpipe(channel);

                        channel.exit(127);
                        channel.close();
                    });
                });
            });
        });
        client.on("ready", function() {
            let timeout = setTimeout(function() {
                assert(false, "Unexpected SFTP timeout");
            }, 1000);
            client.sftp(function(err, sftp) {
                clearTimeout(timeout);
                assert(err, "Expected error");
                assert(err.code === 127, "Expected exit code 127, saw: " + err.code);
                client.end();
            });
        });
    });

    it("Double pipe on unconnected, passed in net.Socket", function(done) {
        let client;
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD,
                sock: new net.Socket()
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {});
        });
        client.on("ready", function() {
            client.end();
        });
    });

    it("Client auto-rejects unrequested, allows requested forwarded-tcpip", function(done) {
        let client;
        let server;
        let r;

        r = setup(
            this,
            { username: USER },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            });
            conn.on("request", function(accept, reject, name, info) {
                accept();
                conn.forwardOut("good", 0, "remote", 12345, function(err, ch) {
                    if (err) {
                        assert.ifError(err);
                    }
                    conn.forwardOut("bad", 0, "remote", 12345, function(err, ch) {
                        assert(err, "Should receive error");
                        client.end();
                    });
                });
            });
        });

        client.on("ready", function() {
            // request forwarding
            client.forwardIn("good", 0, function(err, port) {
                if (err) {
                    assert.ifError(err);
                }
            });
        });
        client.on("tcp connection", function(details, accept, reject) {
            accept();
        });
    });

    it("Server greeting", function(done) {
        let client;
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA],
                greeting: "Hello world!"
            },
            done
        );
        client = r.client;
        server = r.server;

        let sawGreeting = false;

        client.on("greeting", function(greeting) {
            assert.strictEqual(greeting, "Hello world!\r\n");
            sawGreeting = true;
        });
        client.on("banner", function(message) {
            assert.fail(null, null, "Unexpected banner");
        });

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                assert(sawGreeting, "Client did not see greeting");
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "password", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.password === PASSWORD, "Unexpected password: " + ctx.password);
                ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Server banner", function(done) {
        let client;
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA],
                banner: "Hello world!"
            },
            done
        );
        client = r.client;
        server = r.server;

        let sawBanner = false;

        client.on("greeting", function(greeting) {
            assert.fail(null, null, "Unexpected greeting");
        });
        client.on("banner", function(message) {
            assert.strictEqual(message, "Hello world!\r\n");
            sawBanner = true;
        });

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                assert(sawBanner, "Client did not see banner");
                if (ctx.method === "none")
                    return ctx.reject();
                assert(ctx.method === "password", "Unexpected auth method: " + ctx.method);
                assert(ctx.username === USER, "Unexpected username: " + ctx.username);
                assert(ctx.password === PASSWORD, "Unexpected password: " + ctx.password);
                ctx.accept();
            }).on("ready", function() {
                conn.end();
            });
        });
    });

    it("Server responds to global requests in the right order", function(done) {
        let client;
        let server;
        let r;
        let fastRejectSent = false;

        function sendAcceptLater(accept) {
            if (fastRejectSent)
                accept();
            else
                setImmediate(sendAcceptLater, accept);
        }

        r = setup(
            this,
            { username: USER },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            });

            conn.on("request", function(accept, reject, name, info) {
                if (info.bindAddr === "fastReject") {
                    // Will call reject on "fastReject" soon
                    reject();
                    fastRejectSent = true;
                } else
                    // but accept on "slowAccept" later
                    sendAcceptLater(accept);
            });
        });

        client.on("ready", function() {
            let replyCnt = 0;

            client.forwardIn("slowAccept", 0, function(err) {
                assert.ifError(err);
                if (++replyCnt === 2)
                    client.end();
            });

            client.forwardIn("fastReject", 0, function(err) {
                assert(err, "Should receive error");
                if (++replyCnt === 2)
                    client.end();
            });
        });
    });

    it("Cleanup outstanding channel requests on channel close", function(done) {
        let client;
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        let timer;
        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.on("session", function(accept, reject) {
                    let session = accept();
                    session.once("subsystem", function(accept, reject, info) {
                        assert.equal(info.name, "netconf");

                        // Prevent success reply from being sent
                        conn._sshstream.channelSuccess = function() {};

                        let stream = accept();
                        stream.close();
                        timer = setTimeout(function() {
                            throw new Error("Expected client callback");
                        }, 50);
                    });
                });
            });
        });
        client.on("ready", function() {
            client.subsys("netconf", function(err, stream) {
                clearTimeout(timer);
                assert(err);
                client.end();
            });
        });
    });

    it("Channel emits close prematurely", function(done) {
        let client;
        let server;
        let r;

        r = setup(
            this,
            {
                username: USER,
                password: PASSWORD
            },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            }).on("ready", function() {
                conn.on("session", function(accept, reject) {
                    let session = accept();
                    session.once("exec", function(accept, reject, info) {
                        let stream = accept();
                        // Write enough to bring the Client"s channel window to 0
                        // (currently 1MB)
                        let buf = new Buffer(2048);
                        for (let i = 0; i < 1000; ++i)
                            stream.write(buf);
                        stream.exit(0);
                        stream.close();
                    });
                });
            });
        });
        client.on("ready", function() {
            client.exec("foo", function(err, stream) {
                let sawClose = false;
                assert(!err, "Unexpected error");
                client._sshstream.on("CHANNEL_CLOSE:" + stream.incoming.id, onClose);
                function onClose() {
                    // This handler gets called *after* the internal handler, so we
                    // should have seen `stream`"s `close` event already if the bug
                    // exists
                    assert(!sawClose, "Premature close event");
                    client.end();
                }
                stream.on("close", function() {
                    sawClose = true;
                });
            });
        });
    });

    it("OpenSSH 5.x workaround for binding on port 0", function(done) {
        let client;
        let server;
        let r;

        r = setup(
            this,
            { username: USER },
            { hostKeys: [HOST_KEY_RSA], ident: "OpenSSH_5.3" },
            done
        );
        client = r.client;
        server = r.server;

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                ctx.accept();
            });
            conn.once("request", function(accept, reject, name, info) {
                assert(name === "tcpip-forward", "Unexpected request: " + name);
                accept(1337);
                conn.forwardOut("good", 0, "remote", 12345, function(err, ch) {
                    assert.ifError(err);
                    client.end();
                });
            });
        });

        client.on("ready", function() {
            // request forwarding
            client.forwardIn("good", 0, function(err, port) {
                assert.ifError(err);
                assert(port === 1337, "Bad bound port: " + port);
            });
        });
        client.on("tcp connection", function(details, accept, reject) {
            assert(details.destIP === "good", "Bad incoming destIP: " + details.destIP);
            assert(details.destPort === 1337, "Bad incoming destPort: " + details.destPort);
            assert(details.srcIP === "remote", "Bad incoming srcIP: " + details.srcIP);
            assert(details.srcPort === 12345, "Bad incoming srcPort: " + details.srcPort);
            accept();
        });
    });

    it("Handshake errors are emitted", function(done) {
        let client;
        let server;
        let r;
        let srvError;
        let cliError;

        r = setup(
            this,
            {
                username: USER,
                algorithms: {
                    cipher: ["aes128-cbc"]
                }
            },
            { hostKeys: [HOST_KEY_RSA],
                algorithms: {
                    cipher: ["aes128-ctr"]
                }
            },
            done
        );
        client = r.client;
        server = r.server;

        // Remove default client error handler added by `setup()` since we are
        // expecting an error in this case
        client.removeAllListeners("error");

        function onError(err) {
            if (this === client) {
                assert(!cliError, "Unexpected multiple client errors");
                cliError = err;
            } else {
                assert(!srvError, "Unexpected multiple server errors");
                srvError = err;
            }
            assert(/handshake failed/i.test(err.message), "Wrong error message");
        }

        server.on("connection", function(conn) {
            // Remove default server connection error handler added by `setup()`
            // since we are expecting an error in this case
            conn.removeAllListeners("error");

            function onGoodHandshake() {
                assert(false, "Handshake should have failed");
            }
            conn.on("authentication", onGoodHandshake);
            conn.on("ready", onGoodHandshake);

            conn.on("error", onError);
        });

        client.on("ready", function() {
            assert(false, "Handshake should have failed");
        });
        client.on("error", onError);
        client.on("close", function() {
            assert(cliError, "Expected client error");
            assert(srvError, "Expected client error");
        });
    });

    it("Client signing errors are caught and emitted", function(done) {
        let client;
        let server;
        let r;
        let cliError;

        r = setup(
            this,
            { username: USER, privateKey: KEY_RSA_BAD },
            { hostKeys: [HOST_KEY_RSA] },
            done
        );
        client = r.client;
        server = r.server;

        // Remove default client error handler added by `setup()` since we are
        // expecting an error in this case
        client.removeAllListeners("error");

        server.on("connection", function(conn) {
            conn.on("authentication", function(ctx) {
                assert(ctx.method === "publickey" || ctx.method === "none",
                            "Unexpected auth method: " + ctx.method);
                assert(!ctx.signature, "Unexpected signature");
                if (ctx.method === "none")
                    return ctx.reject();
                ctx.accept();
            });
            conn.on("ready", function() {
                assert(false, "Authentication should have failed");
            });
        });

        client.on("ready", function() {
            assert(false, "Authentication should have failed");
        });
        client.on("error", function(err) {
            if (cliError) {
                assert(/all configured/i.test(err.message),
                            "Wrong error message");
            } else {
                cliError = err;
                assert(/signing/i.test(err.message), "Wrong error message");
            }
        });
        client.on("close", function() {
            assert(cliError, "Expected client error");
        });
    });

    it("Server signing errors are caught and emitted", function(done) {
        let client;
        let server;
        let r;
        let srvError;
        let cliError;

        r = setup(
            this,
            { username: USER, password: "foo" },
            { hostKeys: [KEY_RSA_BAD] },
            done
        );
        client = r.client;
        server = r.server;

        // Remove default client error handler added by `setup()` since we are
        // expecting an error in this case
        client.removeAllListeners("error");

        server.on("connection", function(conn) {
            // Remove default server connection error handler added by `setup()`
            // since we are expecting an error in this case
            conn.removeAllListeners("error");

            conn.once("error", function(err) {
                assert(/signing/i.test(err.message), "Wrong error message");
                srvError = err;
            });
            conn.on("authentication", function(ctx) {
                assert(false, "Handshake should have failed");
            });
            conn.on("ready", function() {
                assert(false, "Authentication should have failed");
            });
        });

        client.on("ready", function() {
            assert(false, "Handshake should have failed");
        });
        client.on("error", function(err) {
            assert(!cliError, "Unexpected multiple client errors");
            assert(/KEY_EXCHANGE_FAILED/.test(err.message),
                        "Wrong error message");
            cliError = err;
        });
        client.on("close", function() {
            assert(srvError, "Expected server error");
            assert(cliError, "Expected client error");
        });
    });
});
