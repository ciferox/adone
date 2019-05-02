require("./common");
const steed = require("steed");
const tmp = require("tmp");
const fs = require("fs");
const mqtt = require("mqtt");
const os = require("os");

const SECURE_KEY = `${__dirname}/secure/tls-key.pem`;
const SECURE_CERT = `${__dirname}/secure/tls-cert.pem`;

describe("mosca.cli", () => {

    let servers = null;
    const oldDebug = null;
    let args = null;

    beforeEach((done) => {
        args = ["node", "mosca"];
        servers = [new adone.net.mqtt.server.Server({
            port: 3833
        }, done)];
    });

    afterEach((done) => {
        let count = 0;
        steed.each(servers, (s, cb) => {
            count++;
            s.close(cb);
        }, () => {
            done();
        });
    });

    const startServer = function (done, callback) {
        return adone.net.mqtt.server.cli(args, (err, server) => {
            if (server) {
                servers.unshift(server);
                callback(server);
            }
            setImmediate(done.bind(null, err));
        });
    };

    it("must be a function", () => {
        expect(adone.net.mqtt.server.cli).to.be.a("function");
    });

    it("should start a mosca.Server", (done) => {
        startServer(done, (server) => {
            expect(server).to.be.instanceOf(adone.net.mqtt.server.Server);
        });
    });

    it("should support a port flag", (done) => {
        args.push("-p");
        args.push("2883");
        startServer(done, (server) => {
            expect(server.opts.port).to.eql(2883);
        });
    });

    it("should support a port flag (bis)", (done) => {
        args.push("--port");
        args.push("2883");
        startServer(done, (server) => {
            expect(server.opts.port).to.eql(2883);
        });
    });

    it("should support a parent port", (done) => {
        args.push("--parent-port");
        args.push("3833");
        startServer(done, (server) => {
            expect(server.opts.backend.type).to.eql("mqtt");
            expect(server.opts.backend.port).to.eql(3833);
        });
    });

    it("should support a parent host", (done) => {
        args.push("--parent-host");
        args.push("localhost");
        args.push("--parent-port");
        args.push("3833");
        startServer(done, (server) => {
            expect(server.opts.backend.type).to.eql("mqtt");
            expect(server.opts.backend.host).to.eql("localhost");
        });
    });

    it("should support a parent prefix", (done) => {
        args.push("--parent-port");
        args.push("3833");
        args.push("--parent-prefix");
        args.push("/ahaha");
        startServer(done, (server) => {
            expect(server.opts.backend.prefix).to.eql("/ahaha");
        });
    });

    it("should support a config option", (done) => {
        args.push("--config");
        args.push(adone.path.join(__dirname, "sample_config.js"));
        startServer(done, (server) => {
            expect(server.opts).to.have.property("port", 2883);
            assert.nestedPropertyVal(server.opts, "backend.port", 3833);
        });
    });

    it("should support a config option with an absolute path", (done) => {
        args.push("-c");
        args.push(adone.path.join(__dirname, "sample_config.js"));
        startServer(done, (server) => {
            expect(server.opts).to.have.property("port", 2883);
            assert.nestedPropertyVal(server.opts, "backend.port", 3833);
        });
    });

    it("should add an user to an authorization file", (done) => {
        args.push("adduser");
        args.push("myuser");
        args.push("mypass");
        args.push("--credentials");

        tmp.file((err, path, fd) => {
            if (err) {
                done(err);
                return;
            }

            args.push(path);
            adone.net.mqtt.server.cli(args, () => {
                const content = JSON.parse(fs.readFileSync(path));
                expect(content).to.have.property("myuser");
                done();
            });
        });
    });

    it("should add an user specifying the authorizePublish pattern", (done) => {
        args.push("adduser");
        args.push("myuser");
        args.push("mypass");
        args.push("--authorize-publish");
        args.push("hello/**/*");
        args.push("--credentials");

        tmp.file((err, path, fd) => {
            if (err) {
                done(err);
                return;
            }

            args.push(path);
            adone.net.mqtt.server.cli(args, () => {
                const content = JSON.parse(fs.readFileSync(path));
                expect(content.myuser).to.have.property("authorizePublish", "hello/**/*");
                done();
            });
        });
    });

    it("should add an user specifying the authorizeSubscribe pattern", (done) => {
        args.push("adduser");
        args.push("myuser");
        args.push("mypass");
        args.push("--authorize-subscribe");
        args.push("hello/**/*");
        args.push("--credentials");

        tmp.file((err, path, fd) => {
            if (err) {
                done(err);
                return;
            }

            args.push(path);
            adone.net.mqtt.server.cli(args, () => {
                const content = JSON.parse(fs.readFileSync(path));
                expect(content.myuser).to.have.property("authorizeSubscribe", "hello/**/*");
                done();
            });
        });
    });

    it("should remove an user from an authorization file", (done) => {
        args.push("adduser");
        args.push("myuser");
        args.push("mypass");
        args.push("--credentials");

        tmp.file((err, path, fd) => {
            if (err) {
                done(err);
                return;
            }

            args.push(path);
            const cloned = [].concat(args);
            cloned[2] = "rmuser";

            adone.net.mqtt.server.cli(args, () => {
                adone.net.mqtt.server.cli(cloned, () => {
                    const content = JSON.parse(fs.readFileSync(path));
                    expect(content).not.to.have.property("myuser");
                    done();
                });
            });
        });
    });

    it("should support authorizing an authorized client", (done) => {
        args.push("--credentials");
        args.push(adone.path.join(__dirname, "credentials.json"));
        steed.waterfall([
            function (cb) {
                adone.net.mqtt.server.cli(args, cb);
            },
            function (server, cb) {
                servers.unshift(server);

                const options = { username: "test", password: "test", port: 1883 };
                const client = mqtt.connect(options);
                client.on("error", cb);
                client.on("connect", () => {
                    cb(null, client);
                });
            },
            function (client, cb) {
                client.once("close", cb);
                client.end();
            }
        ], (err) => {
            if (err instanceof Error) {
                done(err);
                return;
            }
            done();
        });
    });

    it("should support negating an unauthorized client", (done) => {
        args.push("--credentials");
        args.push(adone.path.join(__dirname, "credentials.json"));
        steed.waterfall([
            function (cb) {
                adone.net.mqtt.server.cli(args, cb);
            },
            function (server, cb) {
                servers.unshift(server);
                const options = { port: 1883, username: "bad", password: "bad" };
                const client = mqtt.connect(options);
                client.on("error", cb);
                client.on("connect", () => {
                    cb(null, client);
                });
            },
            function (client, cb) {
                client.once("close", cb);
                client.end();
            }
        ], (err) => {
            if (err) {
                done();
                return;
            }
            done(new Error("No error thrown"));
        });
    });

    it("should reload the current config if killed with SIGHUP on a Linux-based OS", (done) => {

        if (os.platform() === "win32") {
            return done();
        }

        args.push("adduser");
        args.push("myuser");
        args.push("mypass");
        args.push("--credentials");

        let cloned = null;

        steed.waterfall([
            function (cb) {
                tmp.file(cb);
            },
            function (path, fd, ignore, cb) {
                args.push(path);
                cloned = [].concat(args);
                cloned[2] = "rmuser";

                adone.net.mqtt.server.cli(args, cb);
            },
            function (cb) {
                adone.net.mqtt.server.cli(["node", "mosca", "--credentials", cloned[cloned.length - 1]], cb);
            },
            function (server, cb) {
                servers.unshift(server);

                setTimeout(() => {
                    adone.net.mqtt.server.cli(cloned, cb);
                }, 300);
            },
            function (cb) {
                process.kill(process.pid, "SIGHUP");
                setTimeout(cb, 50);
            },
            function (cb) {
                const options = { port: 1883, username: "myuser", password: "mypass" };
                const client = mqtt.connect(options);
                client.once("error", cb);
                client.once("connect", () => {
                    client.once("close", cb);
                    client.end();
                });
            }
        ], (err) => {
            if (err) {
                done();
                return;
            }
            done(new Error("should have errored"));
        });
    });

    it("should save the credentials.json as a formatted JSON when adding", (done) => {
        args.push("adduser");
        args.push("myuser");
        args.push("mypass");
        args.push("--credentials");

        tmp.file((err, path, fd) => {
            if (err) {
                done(err);
                return;
            }

            args.push(path);
            adone.net.mqtt.server.cli(args, () => {
                const content = fs.readFileSync(path);
                expect(JSON.stringify(JSON.parse(content), null, 2)).to.equal(content.toString("utf8"));
                done();
            });
        });
    });

    it("should save the credentials.json as a formatted JSON when removing", (done) => {
        args.push("adduser");
        args.push("myuser");
        args.push("mypass");
        args.push("--credentials");

        tmp.file((err, path, fd) => {
            if (err) {
                done(err);
                return;
            }

            args.push(path);
            const cloned = [].concat(args);
            cloned[2] = "rmuser";
            cloned[3] = "anotheruser";

            adone.net.mqtt.server.cli(args, () => {
                adone.net.mqtt.server.cli(cloned, () => {
                    const content = fs.readFileSync(path);
                    expect(JSON.stringify(JSON.parse(content), null, 2)).to.equal(content.toString("utf8"));
                    done();
                });
            });
        });
    });

    it("should create a memory persistence object", (done) => {
        const s = startServer(done, (server) => {
            expect(server.persistence).to.be.instanceOf(adone.net.mqtt.server.persistence.Memory);
        });
    });

    it("should create a leveldb with the --db flag", (done) => {

        tmp.dir((err, path, fd) => {
            if (err) {
                done(err);
                return;
            }

            args.push("--db");
            args.push(path);

            startServer(done, (server) => {
                expect(server.persistence).to.be.instanceOf(adone.net.mqtt.server.persistence.LevelUp);
                expect(server.persistence.options.path).to.eql(path);
            });
        });
    });

    describe("with --key and --cert", () => {

        beforeEach(() => {
            args.push("--key");
            args.push(SECURE_KEY);
            args.push("--cert");
            args.push(SECURE_CERT);
        });

        it("should pass key and cert to the server", (done) => {
            startServer(done, (server) => {
                expect(server.opts.secure.keyPath).to.eql(SECURE_KEY);
                expect(server.opts.secure.certPath).to.eql(SECURE_CERT);
            });
        });

        it("should support the --secure-port flag", (done) => {
            const port = nextPort();
            args.push("--secure-port");
            args.push(port);
            startServer(done, (server) => {
                expect(server.opts.secure.port).to.eql(port);
            });
        });

        it("should set the secure port by default at 8883", (done) => {
            startServer(done, (server) => {
                expect(server.opts.secure.port).to.eql(8883);
            });
        });

        it("should pass the --non-secure flag to the server", (done) => {
            args.push("--non-secure");
            startServer(done, (server) => {
                expect(server.opts.allowNonSecure).to.eql(true);
            });
        });

        it("should allow to set the https port", (done) => {

            args.push("--https-port");
            args.push("3000");
            startServer(done, (server) => {
                expect(server.opts.https.port).to.eql(3000);
            });
        });

        it("should serve a HTTPS static directory", (done) => {
            args.push("--https-port");
            args.push("3000");
            args.push("--https-static");
            args.push("/path/to/nowhere");
            startServer(done, (server) => {
                expect(server.opts.https.static).to.eql("/path/to/nowhere");
            });
        });

        it("should serve a HTTPS browserify bundle", (done) => {
            args.push("--https-port");
            args.push("3000");
            args.push("--https-bundle");
            startServer(done, (server) => {
                expect(server.opts.https.bundle).to.eql(true);
            });
        });

    });

    it("should allow to set the http port", (done) => {
        args.push("--http-port");
        args.push("3000");
        startServer(done, (server) => {
            expect(server.opts.http.port).to.eql(3000);
        });
    });

    it("should allow to limit the server only to http", (done) => {
        args.push("--http-port");
        args.push("3000");
        args.push("--only-http");
        startServer(done, (server) => {
            expect(server.opts.http.port).to.eql(3000);
        });
    });

    it("should serve a HTTP static directory", (done) => {
        args.push("--http-port");
        args.push("3000");
        args.push("--http-static");
        args.push("/path/to/nowhere");
        startServer(done, (server) => {
            expect(server.opts.http.static).to.eql("/path/to/nowhere");
        });
    });

    it("should serve a HTTP browserify bundle", (done) => {
        args.push("--http-port");
        args.push("3000");
        args.push("--http-bundle");
        startServer(done, (server) => {
            expect(server.opts.http.bundle).to.eql(true);
        });
    });

    it("should have stats enabled by default", (done) => {
        const s = startServer(done, (server) => {
            expect(server.opts.stats).to.equal(true);
        });
    });

    it("should allow to disable stats", (done) => {
        args.push("--disable-stats");
        const s = startServer(done, (server) => {
            expect(server.opts.stats).to.equal(false);
        });
    });

    it("should allow to specify a broker id", (done) => {
        args.push("--broker-id");
        args.push("44cats");
        const s = startServer(done, (server) => {
            expect(server.id).to.equal("44cats");
        });
    });

    it("should specify an interface to bind to", (done) => {
        args.push("--host");
        args.push("127.0.0.1");
        startServer(done, (server) => {
            expect(server.opts.host).to.eql("127.0.0.1");
        });
    });
});
