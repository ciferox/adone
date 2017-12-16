const Promise = require("bluebird");
const Q = require("q");
const muri = require("muri");
const random = adone.odm.utils.random;
const server = require("./common").server;
const start = require("./common");

const {
    Mongos
} = adone.private(adone.database.mongo);

const mongoose = adone.odm;
const Schema = mongoose.Schema;

const {
    is
} = adone;


describe("connections:", () => {
    describe("useMongoClient/openUri (gh-5304)", () => {
        it("with mongoose.connect()", (done) => {
            const conn = mongoose.connect("mongodb://localhost:27017/mongoosetest", {
                useMongoClient: true
            });
            assert.equal(conn.constructor.name, "NativeConnection");

            conn.then((conn) => {
                assert.equal(conn.constructor.name, "NativeConnection");
                assert.equal(conn.host, "localhost");
                assert.equal(conn.port, 27017);
                assert.equal(conn.name, "mongoosetest");

                return mongoose.disconnect().then(() => {
                    done();
                });
            }).catch(done);
        });

        it("with mongoose.createConnection()", (done) => {
            const conn = mongoose.createConnection("mongodb://localhost:27017/mongoosetest", {
                useMongoClient: true
            });
            assert.equal(conn.constructor.name, "NativeConnection");

            const Test = conn.model("Test", new Schema({ name: String }));
            assert.equal(Test.modelName, "Test");

            const findPromise = Test.findOne();

            assert.equal(typeof conn.catch, "function");

            conn.
                then((conn) => {
                    assert.equal(conn.constructor.name, "NativeConnection");
                    assert.equal(conn.host, "localhost");
                    assert.equal(conn.port, 27017);
                    assert.equal(conn.name, "mongoosetest");

                    return findPromise;
                }).
                then(() => {
                    return mongoose.disconnect().then(() => {
                        done();
                    });
                }).
                catch(done);
        });

        it("with autoIndex (gh-5423)", (done) => {
            const promise = mongoose.createConnection("mongodb://localhost:27017/mongoosetest", {
                useMongoClient: true,
                autoIndex: false
            });

            promise.then((conn) => {
                assert.strictEqual(conn.config.autoIndex, false);
                assert.deepEqual(conn._connectionOptions, {});
                done();
            }).catch(done);
        });

        it("resolving with q (gh-5714)", (done) => {
            const bootMongo = Q.defer();

            const conn = mongoose.createConnection("mongodb://localhost:27017/mongoosetest", {
                useMongoClient: true
            });

            conn.on("connected", function () {
                bootMongo.resolve(this);
            });

            bootMongo.promise.then((_conn) => {
                assert.equal(_conn, conn);
                done();
            }).catch(done);
        });

        describe.skip("connection events", () => {
            beforeEach(function () {
                this.timeout(20000);
                return server.start().
                    then(() => {
                        return server.purge();
                    });
            });

            afterEach(function () {
                this.timeout(10000);
                return server.stop();
            });

            it("disconnected (gh-5498) (gh-5524)", function (done) {
                this.timeout(25000);

                let numConnected = 0;
                let numDisconnected = 0;
                let numReconnected = 0;
                let numReconnect = 0;
                let numClose = 0;
                const conn = mongoose.createConnection("mongodb://localhost:27000/mongoosetest", {
                    useMongoClient: true
                });

                conn.on("connected", () => {
                    ++numConnected;
                });
                conn.on("disconnected", () => {
                    ++numDisconnected;
                });
                conn.on("reconnect", () => {
                    ++numReconnect;
                });
                // Same as `reconnect`, just for backwards compat
                conn.on("reconnected", () => {
                    ++numReconnected;
                });
                conn.on("close", () => {
                    ++numClose;
                });

                conn.
                    then(() => {
                        assert.equal(conn.readyState, conn.states.connected);
                        assert.equal(numConnected, 1);
                        return server.stop();
                    }).
                    then(() => {
                        return new Promise(((resolve) => {
                            setTimeout(() => {
                                resolve();
                            }, 50);
                        }));
                    }).
                    then(() => {
                        assert.equal(conn.readyState, conn.states.disconnected);
                        assert.equal(numDisconnected, 1);
                        assert.equal(numReconnected, 0);
                        assert.equal(numReconnect, 0);
                    }).
                    then(() => {
                        return server.start();
                    }).
                    then(() => {
                        return new Promise(((resolve) => {
                            setTimeout(() => {
                                resolve();
                            }, 2000);
                        }));
                    }).
                    then(() => {
                        assert.equal(conn.readyState, conn.states.connected);
                        assert.equal(numDisconnected, 1);
                        assert.equal(numReconnected, 1);
                        assert.equal(numReconnect, 1);
                        assert.equal(numClose, 0);

                        conn.close();
                        done();
                    }).
                    catch(done);
            });

            it("reconnectFailed (gh-4027)", function (done) {
                this.timeout(25000);

                let numReconnectFailed = 0;
                let numConnected = 0;
                let numDisconnected = 0;
                let numReconnected = 0;
                const conn = mongoose.createConnection("mongodb://localhost:27000/mongoosetest", {
                    useMongoClient: true,
                    reconnectTries: 3,
                    reconnectInterval: 100
                });

                conn.on("connected", () => {
                    ++numConnected;
                });
                conn.on("disconnected", () => {
                    ++numDisconnected;
                });
                conn.on("reconnected", () => {
                    ++numReconnected;
                });
                conn.on("reconnectFailed", () => {
                    ++numReconnectFailed;
                });

                conn.
                    then(() => {
                        assert.equal(numConnected, 1);
                        return server.stop();
                    }).
                    then(() => {
                        return new Promise(((resolve) => {
                            setTimeout(() => {
                                resolve();
                            }, 100);
                        }));
                    }).
                    then(() => {
                        assert.equal(numDisconnected, 1);
                        assert.equal(numReconnected, 0);
                        assert.equal(numReconnectFailed, 0);
                    }).
                    then(() => {
                        return new Promise(((resolve) => {
                            setTimeout(() => {
                                resolve();
                            }, 400);
                        }));
                    }).
                    then(() => {
                        assert.equal(numDisconnected, 1);
                        assert.equal(numReconnected, 0);
                        assert.equal(numReconnectFailed, 1);
                    }).
                    then(() => {
                        return server.start();
                    }).
                    then(() => {
                        return new Promise(((resolve) => {
                            setTimeout(() => {
                                resolve();
                            }, 2000);
                        }));
                    }).
                    then(() => {
                        assert.equal(numDisconnected, 1);
                        assert.equal(numReconnected, 0);
                        assert.equal(numReconnectFailed, 1);

                        conn.close();
                        done();
                    }).
                    catch(done);
            });

            it("timeout (gh-4513)", function (done) {
                this.timeout(25000);

                let conn;
                let numTimeout = 0;
                let numDisconnected = 0;
                conn = mongoose.createConnection("mongodb://localhost:27000/mongoosetest", {
                    useMongoClient: true,
                    socketTimeoutMS: 100,
                    poolSize: 1
                });

                conn.on("timeout", () => {
                    ++numTimeout;
                });

                conn.on("disconnected", () => {
                    ++numDisconnected;
                });

                const Model = conn.model("gh4513", new Schema());

                conn.
                    then(() => {
                        assert.equal(conn.readyState, conn.states.connected);
                        return Model.create({});
                    }).
                    then(() => {
                        return Model.find({ $where: "sleep(250) || true" });
                    }).
                    then(() => {
                        done(new Error("expected timeout"));
                    }).
                    catch((error) => {
                        assert.ok(error);
                        assert.ok(error.message.indexOf("timed out"), error.message);
                        // TODO: if autoReconnect is false, we might not actually be
                        // connected. See gh-5634
                        assert.equal(conn.readyState, conn.states.connected);
                        assert.equal(numTimeout, 1);
                        assert.equal(numDisconnected, 0);

                        conn.close();
                        done();
                    });
            });
        });
    });

    describe("helpers", () => {
        let conn;

        before(() => {
            conn = mongoose.connect("mongodb://localhost:27017/mongoosetest_2", {
                useMongoClient: true
            });
            return conn;
        });

        it("dropDatabase()", (done) => {
            conn.dropDatabase((error) => {
                assert.ifError(error);
                done();
            });
        });

        it("dropCollection()", () => {
            return conn.db.collection("test").insertOne({ x: 1 }).
                then(() => {
                    return conn.dropCollection("test");
                }).
                then(() => {
                    return conn.db.collection("test").findOne();
                }).
                then((doc) => {
                    assert.ok(!doc);
                });
        });

        it("createCollection()", () => {
            return conn.dropDatabase().
                then(() => {
                    return conn.createCollection("gh5712", {
                        capped: true,
                        size: 1024
                    });
                }).
                then(() => {
                    return conn.db.listCollections().toArray();
                }).
                then((collections) => {
                    const names = collections.map((c) => {
                        return c.name;
                    });
                    assert.ok(names.indexOf("gh5712") !== -1);
                    assert.ok(collections[names.indexOf("gh5712")].options.capped);
                    return conn.createCollection("gh5712_0");
                }).
                then(() => {
                    return conn.db.listCollections().toArray();
                }).
                then((collections) => {
                    const names = collections.map((c) => {
                        return c.name;
                    });
                    assert.ok(names.indexOf("gh5712") !== -1);
                });
        });
    });

    it("should allow closing a closed connection", (done) => {
        const db = mongoose.createConnection();

        assert.equal(db.readyState, 0);
        db.close(done);
    });

    it("should accept mongodb://localhost/fake", (done) => {
        const db = mongoose.createConnection("mongodb://localhost/fake");
        db.on("error", () => {
        });
        assert.ok(db instanceof mongoose.Connection);
        assert.equal(typeof db.options, "object");
        assert.equal(typeof db.options.server, "object");
        assert.equal(db.options.server.auto_reconnect, true);
        assert.equal(typeof db.options.db, "object");
        assert.equal(db.options.db.forceServerObjectId, false);
        assert.equal(db.pass, undefined);
        assert.equal(db.user, undefined);
        assert.equal(db.name, "fake");
        assert.equal(db.host, "localhost");
        assert.equal(db.port, 27017);
        db.close(done);
    });

    it("should accept replicaSet query param", (done) => {
        const db = mongoose.createConnection("mongodb://localhost/fake?replicaSet=rs0");
        db.on("error", () => {
        });
        assert.equal(typeof db.options, "object");
        assert.equal(typeof db.options.server, "object");
        assert.equal(db.options.server.auto_reconnect, true);
        assert.equal(typeof db.options.db, "object");
        assert.equal(db.options.db.forceServerObjectId, false);
        assert.equal(db.pass, void 0);
        assert.equal(db.user, void 0);
        assert.equal("fake", db.name);
        assert.deepEqual(db.hosts, [{ host: "localhost", port: 27017 }]);

        // Should be a replica set
        assert.ok(db.replica);
        db.close();
        done();
    });

    it("should accept mongodb://localhost:27000/fake", (done) => {
        const db = mongoose.createConnection("mongodb://localhost:27000/fake");
        db.on("error", () => {
        });
        assert.equal(typeof db.options, "object");
        assert.equal(typeof db.options.server, "object");
        assert.equal(db.options.server.auto_reconnect, true);
        assert.equal(typeof db.options.db, "object");
        assert.equal(db.port, 27000);
        db.close();
        done();
    });

    it("should accept mongodb://aaron:psw@localhost:27000/fake", (done) => {
        const db = mongoose.createConnection("mongodb://aaron:psw@localhost:27000/fake");
        db.on("error", () => {
        });
        assert.equal(typeof db.options, "object");
        assert.equal(typeof db.options.server, "object");
        assert.equal(db.options.server.auto_reconnect, true);
        assert.equal(typeof db.options.db, "object");
        assert.equal(db.options.db.forceServerObjectId, false);
        assert.equal(db.pass, "psw");
        assert.equal(db.user, "aaron");
        assert.equal(db.name, "fake");
        assert.equal(db.host, "localhost");
        assert.equal(db.port, 27000);
        db.close();
        done();
    });

    it("should accept mongodb://aaron:psw@localhost:27000/fake with db options", (done) => {
        const db = mongoose.createConnection("mongodb://aaron:psw@localhost:27000/fake", { db: { forceServerObjectId: true } });
        db.on("error", () => {
        });
        assert.equal(typeof db.options, "object");
        assert.equal(typeof db.options.server, "object");
        assert.equal(db.options.server.auto_reconnect, true);
        assert.equal(typeof db.options.db, "object");
        assert.equal(db.options.db.forceServerObjectId, false);
        db.close();
        done();
    });

    it("should accept mongodb://aaron:psw@localhost:27000/fake with server options", (done) => {
        const db = mongoose.createConnection("mongodb://aaron:psw@localhost:27000/fake", { server: { auto_reconnect: false } });
        db.on("error", () => {
        });
        assert.equal(typeof db.options, "object");
        assert.equal(typeof db.options.server, "object");
        assert.equal(db.options.server.auto_reconnect, false);
        assert.equal(typeof db.options.db, "object");
        assert.equal(db.options.db.forceServerObjectId, false);
        db.close();
        done();
    });

    it("should accept unix domain sockets", (done) => {
        const db = mongoose.createConnection("mongodb://aaron:psw@/tmp/mongodb-27017.sock/fake", { server: { auto_reconnect: false } });
        db.on("error", () => {
        });
        assert.equal(typeof db.options, "object");
        assert.equal(typeof db.options.server, "object");
        assert.equal(db.options.server.auto_reconnect, false);
        assert.equal(typeof db.options.db, "object");
        assert.equal(db.options.db.forceServerObjectId, false);
        assert.equal(db.name, "fake");
        assert.equal(db.host, "/tmp/mongodb-27017.sock");
        assert.equal(db.pass, "psw");
        assert.equal(db.user, "aaron");
        db.close();
        done();
    });

    describe("re-opening a closed connection", () => {
        const mongos = process.env.MONGOOSE_SHARD_TEST_URI;
        if (!mongos) {
            return;
        }

        const mongod = "mongodb://localhost:27017";

        describe("with different host/port", () => {
            it("non-replica set", (done) => {
                const db = mongoose.createConnection();

                db.open(mongod, (err) => {
                    if (err) {
                        return done(err);
                    }

                    const port1 = db.port;
                    const db1 = db.db;

                    db.close((err) => {
                        if (err) {
                            return done(err);
                        }

                        db.open(mongos, (err) => {
                            if (err) {
                                return done(err);
                            }

                            assert.notEqual(port1, db.port);
                            assert.ok(db1 !== db.db);
                            assert.ok(db1.serverConfig.port !== db.db.serverConfig.port);

                            const port2 = db.port;
                            const db2 = db.db;

                            db.close((err) => {
                                if (err) {
                                    return done(err);
                                }
                                db.open(mongod, (err) => {
                                    if (err) {
                                        return done(err);
                                    }

                                    assert.notEqual(port2, db.port);
                                    assert.ok(db2 !== db.db);
                                    assert.ok(db2.serverConfig.port !== db.db.serverConfig.port);

                                    db.close(done);
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("errors", () => {
        it(".catch() means error does not get thrown (gh-5229)", (done) => {
            const db = mongoose.createConnection();

            db.open("fail connection").catch((error) => {
                assert.ok(error);
                done();
            });
        });
    });

    describe("should accept separated args with options", () => {
        it("works", (done) => {
            let db = mongoose.createConnection("127.0.0.1", "faker", 28000, { server: { auto_reconnect: true } });
            db.on("error", () => {
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "faker");
            assert.equal(db.host, "127.0.0.1");
            assert.equal(db.port, 28000);
            db.close();

            db = mongoose.createConnection("127.0.0.1", "faker", { blah: 1 });
            db.on("error", () => {
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "faker");
            assert.equal(db.host, "127.0.0.1");
            assert.equal(db.port, 27017);
            assert.equal(db.options.blah, 1);
            db.close();
            done();
        });

        it("including user/pass", (done) => {
            const db = mongoose.createConnection("localhost", "fake", 27000, { user: "aaron", pass: "psw" });
            db.on("error", () => {
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "fake");
            assert.equal(db.host, "localhost");
            assert.equal(db.port, 27000);
            assert.equal(db.pass, "psw");
            assert.equal(db.user, "aaron");
            db.close();
            done();
        });

        it("but fails when passing user and no pass with standard authentication", (done) => {
            const db = mongoose.createConnection("localhost", "fake", 27000, { user: "no_pass" });
            db.on("error", () => {
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "fake");
            assert.equal(db.host, "localhost");
            assert.equal(db.port, 27000);
            assert.equal(db.pass, undefined);
            assert.equal(db.user, undefined);
            db.close();
            done();
        });

        it("but passes when passing user and no pass with the MONGODB-X509 authMechanism", (done) => {
            const db = mongoose.createConnection("localhost", "fake", 27000, { user: "no_pass", auth: { authMechanism: "MONGODB-X509" } });
            db.on("error", () => {
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "fake");
            assert.equal(db.host, "localhost");
            assert.equal(db.port, 27000);
            assert.equal(db.pass, undefined);
            assert.equal(db.user, "no_pass");
            db.close();
            done();
        });
    });

    describe("should accept separated args without options", () => {
        it("works", (done) => {
            let db = mongoose.createConnection("127.0.0.1", "faker", 28001);
            db.on("error", () => {
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "faker");
            assert.equal(db.host, "127.0.0.1");
            assert.equal(db.port, 28001);
            db.close();

            db = mongoose.createConnection("127.0.0.1", "faker");
            db.on("error", () => {
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "faker");
            assert.equal(db.host, "127.0.0.1");
            assert.equal(db.port, 27017);
            db.close();
            done();
        });
        it("and accept user/pass in hostname", (done) => {
            const db = mongoose.createConnection("aaron:psw@localhost", "fake", 27000);
            db.on("error", () => {
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "fake");
            assert.equal(db.host, "localhost");
            assert.equal(db.port, 27000);
            assert.equal(db.pass, "psw");
            assert.equal(db.user, "aaron");
            db.close();
            done();
        });
    });

    describe("querystring options", () => {
        describe("for replica sets", () => {
            it("work", (done) => {
                const conn = "mongodb://localhost/fake?autoReconnect=false&poolSize=2"
                    + "&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12"
                    + "&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true"
                    + "&nativeParser=false&w=2&safe=true&fsync=true&journal=true"
                    + "&wtimeoutMS=80&readPreference=nearest&readPreferenceTags="
                    + "dc:ny,rack:1&readPreferenceTags=dc:sf&sslValidate=true";

                const db = mongoose.createConnection(conn);
                db.on("error", () => {
                });
                db.close();
                assert.equal(typeof db.options, "object");
                assert.equal(typeof db.options.server, "object");
                assert.equal(typeof db.options.server.socketOptions, "object");
                assert.equal(typeof db.options.db, "object");
                assert.equal(typeof db.options.replset, "object");
                assert.equal(typeof db.options.replset.socketOptions, "object");
                assert.equal(db.options.mongos, undefined);
                assert.equal(db.options.server.auto_reconnect, false);
                assert.equal(db.options.server.poolSize, 2);
                assert.equal(db.options.server.slave_ok, false);
                assert.equal(db.options.server.ssl, true);
                assert.equal(db.options.replset.ssl, true);
                assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.retries, 10);
                assert.equal(db.options.replset.reconnectWait, 5);
                assert.equal(db.options.replset.rs_name, "replworld");
                assert.equal(db.options.replset.read_secondary, true);
                assert.equal(db.options.db.native_parser, false);
                assert.equal(db.options.db.w, 2);
                assert.equal(db.options.db.safe, true);
                assert.equal(db.options.db.fsync, true);
                assert.equal(db.options.db.journal, true);
                assert.equal(db.options.db.wtimeoutMS, 80);
                assert.equal(db.options.db.readPreference, "nearest");
                assert.deepEqual([{ dc: "ny", rack: 1 }, { dc: "sf" }], db.options.db.read_preference_tags);
                assert.equal(db.options.db.forceServerObjectId, false);
                assert.strictEqual(db.options.server.sslValidate, true);
                done();
            });
            it("mixed with passed options", (done) => {
                const conn = "mongodb://localhost/fake?poolSize=2"
                    + "&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12"
                    + "&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true"
                    + "&nativeParser=false&w=2&safe=true&fsync=true&journal=true"
                    + "&wtimeoutMS=80&readPreference=nearest&readPreferenceTags="
                    + "dc:ny,rack:1&readPreferenceTags=dc:sf";

                const db = mongoose.createConnection(conn, { server: { poolSize: 3, auto_reconnect: false } });
                db.on("error", () => {
                });
                db.close();
                assert.equal(typeof db.options, "object");
                assert.equal(typeof db.options.server, "object");
                assert.equal(typeof db.options.server.socketOptions, "object");
                assert.equal(typeof db.options.db, "object");
                assert.equal(typeof db.options.replset, "object");
                assert.equal(typeof db.options.replset.socketOptions, "object");
                assert.equal(db.options.mongos, undefined);
                assert.equal(db.options.server.auto_reconnect, false);
                assert.equal(db.options.server.poolSize, 3);
                assert.equal(db.options.server.slave_ok, false);
                assert.equal(db.options.server.ssl, true);
                assert.equal(db.options.replset.ssl, true);
                assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.retries, 10);
                assert.equal(db.options.replset.reconnectWait, 5);
                assert.equal(db.options.replset.rs_name, "replworld");
                assert.equal(db.options.replset.read_secondary, true);
                assert.equal(db.options.db.native_parser, false);
                assert.equal(db.options.db.w, 2);
                assert.equal(db.options.db.safe, true);
                assert.equal(db.options.db.fsync, true);
                assert.equal(db.options.db.journal, true);
                assert.equal(db.options.db.wtimeoutMS, 80);
                assert.equal(db.options.db.readPreference, "nearest");
                assert.deepEqual([{ dc: "ny", rack: 1 }, { dc: "sf" }], db.options.db.read_preference_tags);
                assert.equal(db.options.db.forceServerObjectId, false);

                done();
            });
        });
        describe("for non replica sets", () => {
            it("work", (done) => {
                const conn = "mongodb://localhost/fake?autoReconnect=false&poolSize=2"
                    + "&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12"
                    + "&retries=10&reconnectWait=5&readSecondary=true"
                    + "&nativeParser=false&w=2&safe=true&fsync=true&journal=true"
                    + "&wtimeoutMS=80&";

                const db = mongoose.createConnection(conn);
                db.on("error", () => {
                });
                db.close();
                assert.equal(typeof db.options, "object");
                assert.equal(typeof db.options.server, "object");
                assert.equal(typeof db.options.server.socketOptions, "object");
                assert.equal(typeof db.options.db, "object");
                assert.equal(typeof db.options.replset, "object");
                assert.equal(typeof db.options.replset.socketOptions, "object");
                assert.equal(db.options.mongos, undefined);
                assert.equal(db.options.server.auto_reconnect, false);
                assert.equal(db.options.server.poolSize, 2);
                assert.equal(db.options.server.slave_ok, false);
                assert.equal(db.options.server.ssl, true);
                assert.equal(db.options.replset.ssl, true);
                assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.retries, 10);
                assert.equal(db.options.replset.reconnectWait, 5);
                assert.equal(db.options.replset.read_secondary, true);
                assert.equal(db.options.db.native_parser, false);
                assert.equal(db.options.db.w, 2);
                assert.equal(db.options.db.safe, true);
                assert.equal(db.options.db.fsync, true);
                assert.equal(db.options.db.journal, true);
                assert.equal(db.options.db.wtimeoutMS, 80);
                assert.equal(db.options.db.forceServerObjectId, false);
                done();
            });
            it("mixed with passed options", (done) => {
                const conn = "mongodb://localhost/fake?autoReconnect=false&poolSize=2"
                    + "&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12"
                    + "&retries=10&reconnectWait=5&readSecondary=true"
                    + "&nativeParser=false&w=2&safe=true&fsync=true&journal=true";

                const db = mongoose.createConnection(conn, { db: { w: 3, wtimeoutMS: 80 } });
                db.on("error", () => {
                });
                db.close();
                assert.equal(typeof db.options, "object");
                assert.equal(typeof db.options.server, "object");
                assert.equal(typeof db.options.server.socketOptions, "object");
                assert.equal(typeof db.options.db, "object");
                assert.equal(typeof db.options.replset, "object");
                assert.equal(typeof db.options.replset.socketOptions, "object");
                assert.equal(db.options.mongos, undefined);
                assert.equal(db.options.server.auto_reconnect, false);
                assert.equal(db.options.db.wtimeoutMS, 80);
                assert.equal(db.options.server.poolSize, 2);
                assert.equal(db.options.server.slave_ok, false);
                assert.equal(db.options.server.ssl, true);
                assert.equal(db.options.replset.ssl, true);
                assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.retries, 10);
                assert.equal(db.options.replset.reconnectWait, 5);
                assert.equal(db.options.replset.read_secondary, true);
                assert.equal(db.options.db.native_parser, false);
                assert.equal(db.options.db.w, 3);
                assert.equal(db.options.db.safe, true);
                assert.equal(db.options.db.fsync, true);
                assert.equal(db.options.db.journal, true);
                assert.equal(db.options.db.forceServerObjectId, false);
                done();
            });
        });
        describe("for sharded clusters (mongos)", () => {
            it("works when specifying {mongos: true} as an option", (done) => {
                const conn = "mongodb://localhost/fake?autoReconnect=false&poolSize=2"
                    + "&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12"
                    + "&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true"
                    + "&nativeParser=false&w=2&safe=true&fsync=true&journal=true"
                    + "&wtimeoutMS=80&readPreference=nearest&readPreferenceTags="
                    + "dc:ny,rack:1&readPreferenceTags=dc:sf&sslValidate=true";

                const db = new mongoose.Connection();
                db.options = db.parseOptions({ mongos: true }, muri(conn).options);
                assert.equal(typeof db.options, "object");
                assert.equal(typeof db.options.server, "object");
                assert.equal(typeof db.options.server.socketOptions, "object");
                assert.equal(typeof db.options.db, "object");
                assert.equal(typeof db.options.replset, "object");
                assert.equal(typeof db.options.replset.socketOptions, "object");
                assert.equal(typeof db.options.mongos, "object");
                assert.equal(db.options.server.auto_reconnect, false);
                assert.equal(db.options.server.poolSize, 2);
                assert.equal(db.options.server.slave_ok, false);
                assert.equal(db.options.server.ssl, true);
                assert.equal(db.options.replset.ssl, true);
                assert.equal(db.options.mongos.ssl, true);
                assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.retries, 10);
                assert.equal(db.options.replset.reconnectWait, 5);
                assert.equal(db.options.replset.rs_name, "replworld");
                assert.equal(db.options.replset.read_secondary, true);
                assert.equal(db.options.db.native_parser, false);
                assert.equal(db.options.db.w, 2);
                assert.equal(db.options.db.safe, true);
                assert.equal(db.options.db.fsync, true);
                assert.equal(db.options.db.journal, true);
                assert.equal(db.options.db.wtimeoutMS, 80);
                assert.equal(db.options.db.readPreference, "nearest");
                assert.deepEqual([{ dc: "ny", rack: 1 }, { dc: "sf" }], db.options.db.read_preference_tags);
                assert.equal(db.options.db.forceServerObjectId, false);
                assert.strictEqual(db.options.server.sslValidate, true);
                assert.strictEqual(db.options.mongos.sslValidate, true);
                done();
            });
            it("works when specifying mongos as a query param on the connection string", (done) => {
                const newQueryParam = "&mongos=true";
                const conn = `${"mongodb://localhost/fake?autoReconnect=false&poolSize=2"
                    + "&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12"
                    + "&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true"
                    + "&nativeParser=false&w=2&safe=true&fsync=true&journal=true"
                    + "&wtimeoutMS=80&readPreference=nearest&readPreferenceTags="
                    + "dc:ny,rack:1&readPreferenceTags=dc:sf&sslValidate=true"}${
                    newQueryParam}`;

                const db = new mongoose.Connection();
                db.options = db.parseOptions({}, muri(conn).options);
                assert.strictEqual(typeof db.options, "object");
                assert.strictEqual(typeof db.options.server, "object");
                assert.strictEqual(typeof db.options.server.socketOptions, "object");
                assert.strictEqual(typeof db.options.db, "object");
                assert.strictEqual(typeof db.options.replset, "object");
                assert.strictEqual(typeof db.options.replset.socketOptions, "object");
                assert.strictEqual(typeof db.options.mongos, "object");
                assert.strictEqual(db.options.server.auto_reconnect, false);
                assert.strictEqual(db.options.server.poolSize, 2);
                assert.strictEqual(db.options.server.slave_ok, false);
                assert.strictEqual(db.options.server.ssl, true);
                assert.strictEqual(db.options.replset.ssl, true);
                assert.strictEqual(db.options.mongos.ssl, true);
                assert.strictEqual(db.options.server.socketOptions.socketTimeoutMS, 10);
                assert.strictEqual(db.options.replset.socketOptions.socketTimeoutMS, 10);
                assert.strictEqual(db.options.server.socketOptions.connectTimeoutMS, 12);
                assert.strictEqual(db.options.replset.socketOptions.connectTimeoutMS, 12);
                assert.strictEqual(db.options.replset.retries, 10);
                assert.strictEqual(db.options.replset.reconnectWait, 5);
                assert.strictEqual(db.options.replset.rs_name, "replworld");
                assert.strictEqual(db.options.replset.read_secondary, true);
                assert.strictEqual(db.options.db.native_parser, false);
                assert.strictEqual(db.options.db.w, 2);
                assert.strictEqual(db.options.db.safe, true);
                assert.strictEqual(db.options.db.fsync, true);
                assert.strictEqual(db.options.db.journal, true);
                assert.strictEqual(db.options.db.wtimeoutMS, 80);
                assert.strictEqual(db.options.db.readPreference, "nearest");
                assert.deepEqual(db.options.db.read_preference_tags, [{ dc: "ny", rack: 1 }, { dc: "sf" }]);
                assert.strictEqual(db.options.db.forceServerObjectId, false);
                assert.strictEqual(db.options.server.sslValidate, true);
                assert.strictEqual(db.options.mongos.sslValidate, true);
                done();
            });
            it("works when specifying mongos as an object with options", (done) => {
                const conn = "mongodb://localhost/fake?autoReconnect=false&poolSize=2"
                    + "&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12"
                    + "&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true"
                    + "&nativeParser=false&w=2&safe=true&fsync=true&journal=true"
                    + "&wtimeoutMS=80&readPreference=nearest&readPreferenceTags="
                    + "dc:ny,rack:1&readPreferenceTags=dc:sf&sslValidate=true";

                const db = new mongoose.Connection();
                db.options = db.parseOptions({ mongos: { w: 3, wtimeoutMS: 80 } }, muri(conn).options);
                assert.equal(typeof db.options, "object");
                assert.equal(typeof db.options.server, "object");
                assert.equal(typeof db.options.server.socketOptions, "object");
                assert.equal(typeof db.options.db, "object");
                assert.equal(typeof db.options.replset, "object");
                assert.equal(typeof db.options.replset.socketOptions, "object");
                assert.equal(typeof db.options.mongos, "object");
                assert.equal(db.options.server.auto_reconnect, false);
                assert.equal(db.options.server.poolSize, 2);
                assert.equal(db.options.server.slave_ok, false);
                assert.equal(db.options.server.ssl, true);
                assert.equal(db.options.replset.ssl, true);
                assert.equal(db.options.mongos.ssl, true);
                assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
                assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
                assert.equal(db.options.replset.retries, 10);
                assert.equal(db.options.replset.reconnectWait, 5);
                assert.equal(db.options.replset.rs_name, "replworld");
                assert.equal(db.options.replset.read_secondary, true);
                assert.equal(db.options.db.native_parser, false);
                assert.equal(db.options.db.w, 2);
                assert.equal(db.options.db.safe, true);
                assert.equal(db.options.db.fsync, true);
                assert.equal(db.options.db.journal, true);
                assert.equal(db.options.db.readPreference, "nearest");
                assert.deepEqual([{ dc: "ny", rack: 1 }, { dc: "sf" }], db.options.db.read_preference_tags);
                assert.equal(db.options.db.forceServerObjectId, false);
                assert.strictEqual(db.options.server.sslValidate, true);
                assert.strictEqual(db.options.mongos.sslValidate, true);
                assert.equal(3, db.options.mongos.w);
                assert.equal(80, db.options.mongos.wtimeoutMS);
                done();
            });
        });
    });

    describe("connect callbacks", () => {
        it("execute with user:pwd connection strings", (done) => {
            const db = mongoose.createConnection("mongodb://aaron:psw@localhost:27000/fake", { server: { auto_reconnect: true } }, () => {
                done();
            });
            db.on("error", (err) => {
                assert.ok(err);
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            db.close();
        });
        it("execute without user:pwd connection strings", (done) => {
            const db = mongoose.createConnection("mongodb://localhost/fake", () => {
            });
            db.on("error", (err) => {
                assert.ok(err);
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.user, undefined);
            assert.equal(db.name, "fake");
            assert.equal(db.host, "localhost");
            assert.equal(db.port, 27017);
            db.close();
            setTimeout(done, 10);
        });
        it("should return an error if malformed uri passed", (done) => {
            const db = mongoose.createConnection("mongodb:///fake", (err) => {
                assert.ok(/Missing hostname/.test(err.message));
                done();
            });
            db.close();
            assert.ok(!db.options);
        });
        it("should use admin db if not specified and user/pass specified", (done) => {
            const db = mongoose.createConnection("mongodb://u:p@localhost", () => {
                done();
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "admin");
            assert.equal(db.host, "localhost");
            assert.equal(db.port, 27017);
            db.close();
        });
        it("should fire when individual args are passed", (done) => {
            const db = mongoose.createConnection("127.0.0.1", "faker", 28000, { server: { auto_reconnect: false } }, () => {
                done();
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, false);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "faker");
            assert.equal(db.host, "127.0.0.1");
            assert.equal(db.port, 28000);
            db.close();
        });
        it("should fire when no options are passed", (done) => {
            const db = mongoose.createConnection("127.0.0.1", "faker", 28000, () => {
                done();
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "faker");
            assert.equal(db.host, "127.0.0.1");
            assert.equal(db.port, 28000);
            db.close();
        });
        it("should fire when default port utilized", (done) => {
            const db = mongoose.createConnection("127.0.0.1", "faker", done);
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, true);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "faker");
            assert.equal(db.host, "127.0.0.1");
            assert.equal(db.port, 27017);
            db.close();
        });
    });

    describe("errors", () => {
        it.skip("event fires with one listener", function (done) {
            this.timeout(1000);
            const db = start({ uri: "mongodb://whatever23939.localhost/fakeeee?connectTimeoutMS=500", noErrorListener: 1 });
            db.on("error", () => {
                // this callback has no params which triggered the bug #759
                db.close();
                done();
            });
        });

        it("should occur without hanging when password with special chars is used (gh-460)", function (done) {
            this.timeout(1000);
            const db = mongoose.createConnection("mongodb://aaron:ps#w@localhost/fake?connectTimeoutMS=500", (err) => {
                assert.ok(err);
                db.close();
                done();
            });
        });
    });

    describe(".model()", () => {
        it("allows passing a schema", (done) => {
            const db = start();
            const MyModel = db.model("MyModelasdf", new Schema({
                name: String
            }));
            db.close();

            assert.ok(MyModel.schema instanceof Schema);
            assert.ok(MyModel.prototype.schema instanceof Schema);

            const m = new MyModel({ name: "aaron" });
            assert.equal(m.name, "aaron");
            done();
        });

        it("should properly assign the db", (done) => {
            const A = mongoose.model("testing853a", new Schema({ x: String }), "testing853-1");
            const B = mongoose.model("testing853b", new Schema({ x: String }), "testing853-2");
            const C = B.model("testing853a");
            assert.ok(C === A);
            done();
        });

        it("prevents overwriting pre-existing models", (done) => {
            const db = start();
            const name = "gh-1209-a";
            db.model(name, new Schema());

            assert.throws(() => {
                db.model(name, new Schema());
            }, /Cannot overwrite `gh-1209-a` model/);

            db.close();
            done();
        });

        it("allows passing identical name + schema args", (done) => {
            const db = start();
            const name = "gh-1209-b";
            const schema = new Schema();

            db.model(name, schema);
            assert.doesNotThrow(() => {
                db.model(name, schema);
            });

            db.close();
            done();
        });

        it("throws on unknown model name", (done) => {
            const db = start();
            assert.throws(() => {
                db.model("iDoNotExist!");
            }, /Schema hasn't been registered/);

            db.close();
            done();
        });

        it("uses the passed schema when global model exists with same name (gh-1209)", (done) => {
            const s1 = new Schema({ one: String });
            const s2 = new Schema({ two: Number });

            const db = start();

            const A = mongoose.model("gh-1209-a", s1);
            const B = db.model("gh-1209-a", s2);

            assert.ok(A.schema !== B.schema);
            assert.ok(A.schema.paths.one);
            assert.ok(B.schema.paths.two);
            assert.ok(!B.schema.paths.one);
            assert.ok(!A.schema.paths.two);

            // reset
            delete db.models["gh-1209-a"];
            const C = db.model("gh-1209-a");
            assert.ok(C.schema === A.schema);

            db.close();
            done();
        });

        describe("get existing model with not existing collection in db", () => {
            it("must return exiting collection with all collection options", (done) => {
                mongoose.model("some-th-1458", new Schema({ test: String }, { capped: { size: 1000, max: 10 } }));
                const db = start();
                const m = db.model("some-th-1458");
                assert.equal(1000, m.collection.opts.capped.size);
                assert.equal(10, m.collection.opts.capped.max);
                db.close();
                done();
            });
        });

        describe("passing collection name", () => {
            describe("when model name already exists", () => {
                it("returns a new uncached model", (done) => {
                    const db = start();
                    const s1 = new Schema({ a: [] });
                    const name = "non-cached-collection-name";
                    const A = db.model(name, s1);
                    const B = db.model(name);
                    const C = db.model(name, "alternate");
                    assert.ok(A.collection.name === B.collection.name);
                    assert.ok(A.collection.name !== C.collection.name);
                    assert.ok(db.models[name].collection.name !== C.collection.name);
                    assert.ok(db.models[name].collection.name === A.collection.name);
                    db.close();
                    done();
                });
            });
        });

        describe("passing object literal schemas", () => {
            it("works", (done) => {
                const db = start();
                const A = db.model("A", { n: [{ age: "number" }] });
                const a = new A({ n: [{ age: "47" }] });
                assert.strictEqual(47, a.n[0].age);
                a.save((err) => {
                    assert.ifError(err);
                    A.findById(a, (err) => {
                        db.close();
                        assert.ifError(err);
                        assert.strictEqual(47, a.n[0].age);
                        done();
                    });
                });
            });
        });
    });

    describe("openSet", () => {
        it("accepts uris, dbname, options", (done) => {
            const m = new mongoose.Mongoose();
            const uris = process.env.MONGOOSE_SET_TEST_URI;
            if (!uris) {
                return done();
            }

            m.connection.on("error", done);
            m.connection.on("open", () => {
                m.connection.close(done);
            });

            try {
                m.connect(uris, "mongoose_test", { server: { auto_reconnect: true } });
            } catch (err) {
                done(err);
            }
        });
        describe("auth", () => {
            it("from uri", (done) => {
                const uris = process.env.MONGOOSE_SET_TEST_URI;
                if (!uris) {
                    return done();
                }

                const db = mongoose.createConnection();
                db.openSet("mongodb://aaron:psw@localhost:27000,b,c", { server: { auto_reconnect: false } });
                db.on("error", () => {
                });
                assert.equal(db.user, "aaron");
                assert.equal(db.pass, "psw");
                db.close();
                done();
            });
            it("form options", (done) => {
                const uris = process.env.MONGOOSE_SET_TEST_URI;
                if (!uris) {
                    return done();
                }

                const db = mongoose.createConnection();
                db.openSet("mongodb://aaron:psw@localhost:27000,b,c", { user: "tester", pass: "testpsw" });
                db.on("error", () => {
                });
                assert.equal(db.user, "tester");
                assert.equal(db.pass, "testpsw");
                db.close();
                done();
            });
        });

        it("handles unix domain sockets", (done) => {
            const url = "mongodb://aaron:psw@/tmp/mongodb-27018.sock,/tmp/mongodb-27019.sock/fake?replicaSet=bacon";
            const db = mongoose.createConnection(url, { server: { auto_reconnect: false } });
            db.on("error", () => {
            });
            assert.equal(typeof db.options, "object");
            assert.equal(typeof db.options.server, "object");
            assert.equal(db.options.server.auto_reconnect, false);
            assert.equal(typeof db.options.db, "object");
            assert.equal(db.options.db.forceServerObjectId, false);
            assert.equal(db.name, "fake");
            assert.ok(is.array(db.hosts));
            assert.equal(db.hosts[0].ipc, "/tmp/mongodb-27018.sock");
            assert.equal(db.hosts[1].ipc, "/tmp/mongodb-27019.sock");
            assert.equal(db.pass, "psw");
            assert.equal(db.user, "aaron");
            db.close();
            done();
        });

        it("can reopen a disconnected replica set (gh-1263)", (done) => {
            const uris = process.env.MONGOOSE_SET_TEST_URI;
            if (!uris) {
                return done();
            }

            const conn = mongoose.createConnection();

            conn.on("error", done);

            try {
                conn.openSet(uris, "mongoose_test", {}, (err) => {
                    if (err) {
                        return done(err);
                    }

                    conn.close((err) => {
                        if (err) {
                            return done(err);
                        }

                        conn.openSet(uris, "mongoose_test", {}, () => {
                            conn.close(done);
                        });
                    });
                });
            } catch (err) {
                done(err);
            }
        });
    });

    it("connecting to single mongos (gh-3537)", (done) => {
        const db = mongoose.createConnection("localhost:27017", { mongos: true });
        assert.ok(db.db.serverConfig instanceof Mongos);
        db.on("error", () => {
            done();
        });
    });

    it("force close (gh-5664)", async () => {
        const opts = { useMongoClient: true };
        const db = mongoose.createConnection("mongodb://localhost:27017/test", opts);
        const coll = db.collection("Test");

        await db;

        db.close(true);

        await adone.promise.delay(100);

        await assert.throws(async () => {
            await coll.insertOne({ x: 1 });
        }, "pool was destroyed");
    });

    it("force close with connection created after close (gh-5664)", async () => {
        const opts = { useMongoClient: true };
        const db = await mongoose.createConnection("mongodb://localhost:27017/test", opts);

        db.close(true);

        await adone.promise.delay(100);

        await assert.throws(async () => {
            await db.collection("test").insertOne({ x: 1 });
        });
        // TODO: must throw pool was destoyed
    });

    it("bufferCommands (gh-5720)", (done) => {
        let opts = { useMongoClient: true, bufferCommands: false };
        let db = mongoose.createConnection("mongodb://localhost:27017/test", opts);

        let M = db.model("gh5720", new Schema({}));
        assert.ok(!M.collection.buffer);
        db.close();

        opts = { useMongoClient: true, bufferCommands: true };
        db = mongoose.createConnection("mongodb://localhost:27017/test", opts);
        M = db.model("gh5720", new Schema({}, { bufferCommands: false }));
        assert.ok(!M.collection.buffer);
        db.close();

        opts = { useMongoClient: true, bufferCommands: true };
        db = mongoose.createConnection("mongodb://localhost:27017/test", opts);
        M = db.model("gh5720", new Schema({}));
        assert.ok(M.collection.buffer);
        db.close(done);
    });

    describe("connecting to multiple mongos nodes (gh-1037)", () => {
        const mongos = process.env.MONGOOSE_MULTI_MONGOS_TEST_URI;
        if (!mongos) {
            return console.log("Not testing multi-mongos support");
        }

        it("works", function (done) {
            this.timeout(3000);

            const m = new mongoose.Mongoose();
            m.connect(mongos, { mongos: true }, (err) => {
                assert.ifError(err);

                const s = m.connection.db.serverConfig;
                assert.ok(s instanceof mongoose.mongo.Mongos);
                assert.equal(s.servers.length, 2);

                const M = m.model("TestMultipleMongos", { name: String }, `test-multi-mongos-${random()}`);
                M.create({ name: "works" }, (err, d) => {
                    assert.ifError(err);

                    M.findOne({ name: "works" }, (err, doc) => {
                        assert.ifError(err);
                        assert.equal(d.id, doc.id);
                        m.disconnect(done);
                    });
                });
            });
        });
    });

    describe("modelNames()", () => {
        it("returns names of all models registered on it", (done) => {
            const m = new mongoose.Mongoose();
            m.model("root", { x: String });
            const another = m.model("another", { x: String });
            another.discriminator("discriminated", new Schema({ x: String }));

            const db = m.createConnection();
            db.model("something", { x: String });

            let names = db.modelNames();
            assert.ok(is.array(names));
            assert.equal(names.length, 1);
            assert.equal(names[0], "something");

            names = m.modelNames();
            assert.ok(is.array(names));
            assert.equal(names.length, 3);
            assert.equal(names[0], "root");
            assert.equal(names[1], "another");
            assert.equal(names[2], "discriminated");

            db.close(done);
        });
    });

    describe("connection pool sharing: ", () => {
        it("works", (done) => {
            const db = mongoose.createConnection("mongodb://localhost/mongoose1");

            const db2 = db.useDb("mongoose2");

            assert.equal("mongoose2", db2.name);
            assert.equal("mongoose1", db.name);

            assert.equal(db2.port, db.port);
            assert.equal(db2.replica, db.replica);
            assert.equal(db2.hosts, db.hosts);
            assert.equal(db2.host, db.host);
            assert.equal(db2.port, db.port);
            assert.equal(db2.user, db.user);
            assert.equal(db2.pass, db.pass);
            assert.deepEqual(db.options, db2.options);

            db2.close(done);
        });

        it("saves correctly", (done) => {
            const db = start();
            const db2 = db.useDb("mongoose-test-2");

            const schema = new Schema({
                body: String,
                thing: Number
            });

            const m1 = db.model("testMod", schema);
            const m2 = db2.model("testMod", schema);

            m1.create({ body: "this is some text", thing: 1 }, (err, i1) => {
                assert.ifError(err);
                m2.create({ body: "this is another body", thing: 2 }, (err, i2) => {
                    assert.ifError(err);

                    m1.findById(i1.id, (err, item1) => {
                        assert.ifError(err);
                        assert.equal("this is some text", item1.body);
                        assert.equal(1, item1.thing);

                        m2.findById(i2.id, (err, item2) => {
                            assert.ifError(err);
                            assert.equal("this is another body", item2.body);
                            assert.equal(2, item2.thing);

                            // validate the doc doesn't exist in the other db
                            m1.findById(i2.id, (err, nothing) => {
                                assert.ifError(err);
                                assert.strictEqual(null, nothing);

                                m2.findById(i1.id, (err, nothing) => {
                                    assert.ifError(err);
                                    assert.strictEqual(null, nothing);

                                    db2.close(done);
                                });
                            });
                        });
                    });
                });
            });
        });

        it("emits connecting events on both", (done) => {
            const db = mongoose.createConnection();
            const db2 = db.useDb("mongoose-test-2");
            let hit = false;

            db2.on("connecting", () => {
                hit && close();
                hit = true;
            });

            db.on("connecting", () => {
                hit && close();
                hit = true;
            });

            db.open(start.uri);

            function close() {
                db.close(done);
            }
        });

        it("emits connected events on both", (done) => {
            const db = mongoose.createConnection();
            const db2 = db.useDb("mongoose-test-2");
            let hit = false;

            db2.on("connected", () => {
                hit && close();
                hit = true;
            });
            db.on("connected", () => {
                hit && close();
                hit = true;
            });

            db.open(start.uri);

            function close() {
                db.close(done);
            }
        });

        it("emits open events on both", (done) => {
            const db = mongoose.createConnection();
            const db2 = db.useDb("mongoose-test-2");
            let hit = false;
            db2.on("open", () => {
                hit && close();
                hit = true;
            });
            db.on("open", () => {
                hit && close();
                hit = true;
            });

            db.open(start.uri);

            function close() {
                db.close(done);
            }
        });

        it("emits disconnecting events on both, closing initial db", (done) => {
            const db = mongoose.createConnection();
            const db2 = db.useDb("mongoose-test-2");
            let hit = false;
            db2.on("disconnecting", () => {
                hit && done();
                hit = true;
            });
            db.on("disconnecting", () => {
                hit && done();
                hit = true;
            });
            db.on("open", () => {
                db.close();
            });
            db.open(start.uri);
        });

        it("emits disconnecting events on both, closing secondary db", (done) => {
            const db = mongoose.createConnection();
            const db2 = db.useDb("mongoose-test-2");
            let hit = false;
            db2.on("disconnecting", () => {
                hit && done();
                hit = true;
            });
            db.on("disconnecting", () => {
                hit && done();
                hit = true;
            });
            db.on("open", () => {
                db2.close();
            });
            db.open(start.uri);
        });

        it("emits disconnected events on both, closing initial db", (done) => {
            const db = mongoose.createConnection();
            const db2 = db.useDb("mongoose-test-2");
            let hit = false;
            db2.on("disconnected", () => {
                hit && done();
                hit = true;
            });
            db.on("disconnected", () => {
                hit && done();
                hit = true;
            });
            db.on("open", () => {
                db.close();
            });
            db.open(start.uri);
        });

        it("emits disconnected events on both, closing secondary db", (done) => {
            const db = mongoose.createConnection();
            const db2 = db.useDb("mongoose-test-2");
            let hit = false;
            db2.on("disconnected", () => {
                hit && done();
                hit = true;
            });
            db.on("disconnected", () => {
                hit && done();
                hit = true;
            });
            db.on("open", () => {
                db2.close();
            });
            db.open(start.uri);
        });

        it("closes correctly for all dbs, closing initial db", (done) => {
            const db = start();
            const db2 = db.useDb("mongoose-test-2");

            db2.on("close", () => {
                done();
            });
            db.close();
        });

        it("closes correctly for all dbs, closing secondary db", (done) => {
            const db = start();
            const db2 = db.useDb("mongoose-test-2");

            db.on("close", () => {
                done();
            });
            db2.close();
        });
    });

    describe("shouldAuthenticate()", () => {
        describe("when using standard authentication", () => {
            describe("when username and password are undefined", () => {
                it("should return false", (done) => {
                    const db = mongoose.createConnection("localhost", "fake", 27000, {});
                    db.on("error", () => {
                    });
                    assert.equal(typeof db.options, "object");
                    assert.equal(typeof db.options.server, "object");
                    assert.equal(db.options.server.auto_reconnect, true);
                    assert.equal(typeof db.options.db, "object");
                    assert.equal(db.options.db.forceServerObjectId, false);
                    assert.equal(db.name, "fake");
                    assert.equal(db.host, "localhost");
                    assert.equal(db.port, 27000);
                    assert.equal(db.pass, undefined);
                    assert.equal(db.user, undefined);

                    assert.equal(db.shouldAuthenticate(), false);

                    db.close();
                    done();
                });
            });
            describe("when username and password are empty strings", () => {
                it("should return false", (done) => {
                    const db = mongoose.createConnection("localhost", "fake", 27000, { user: "", pass: "" });
                    db.on("error", () => {
                    });
                    assert.equal(typeof db.options, "object");
                    assert.equal(typeof db.options.server, "object");
                    assert.equal(db.options.server.auto_reconnect, true);
                    assert.equal(typeof db.options.db, "object");
                    assert.equal(db.options.db.forceServerObjectId, false);
                    assert.equal(db.name, "fake");
                    assert.equal(db.host, "localhost");
                    assert.equal(db.port, 27000);
                    assert.equal(db.pass, undefined);
                    assert.equal(db.user, undefined);

                    assert.equal(db.shouldAuthenticate(), false);

                    db.close();
                    done();
                });
            });
            describe("when only username is defined", () => {
                it("should return false", (done) => {
                    const db = mongoose.createConnection("localhost", "fake", 27000, { user: "user" });
                    db.on("error", () => {
                    });
                    assert.equal(typeof db.options, "object");
                    assert.equal(typeof db.options.server, "object");
                    assert.equal(db.options.server.auto_reconnect, true);
                    assert.equal(typeof db.options.db, "object");
                    assert.equal(db.options.db.forceServerObjectId, false);
                    assert.equal(db.name, "fake");
                    assert.equal(db.host, "localhost");
                    assert.equal(db.port, 27000);
                    assert.equal(db.pass, undefined);
                    assert.equal(db.user, undefined);

                    assert.equal(db.shouldAuthenticate(), false);

                    db.close();
                    done();
                });
            });
            describe("when both username and password are defined", () => {
                it("should return false", (done) => {
                    const db = mongoose.createConnection("localhost", "fake", 27000, { user: "user", pass: "pass" });
                    db.on("error", () => {
                    });
                    assert.equal(typeof db.options, "object");
                    assert.equal(typeof db.options.server, "object");
                    assert.equal(db.options.server.auto_reconnect, true);
                    assert.equal(typeof db.options.db, "object");
                    assert.equal(db.options.db.forceServerObjectId, false);
                    assert.equal(db.name, "fake");
                    assert.equal(db.host, "localhost");
                    assert.equal(db.port, 27000);
                    assert.equal(db.pass, "pass");
                    assert.equal(db.user, "user");

                    assert.equal(db.shouldAuthenticate(), true);

                    db.close();
                    done();
                });
            });
        });
        describe("when using MONGODB-X509 authentication", () => {
            describe("when username and password are undefined", () => {
                it("should return false", (done) => {
                    const db = mongoose.createConnection("localhost", "fake", 27000, {});
                    db.on("error", () => {
                    });
                    assert.equal(typeof db.options, "object");
                    assert.equal(typeof db.options.server, "object");
                    assert.equal(db.options.server.auto_reconnect, true);
                    assert.equal(typeof db.options.db, "object");
                    assert.equal(db.options.db.forceServerObjectId, false);
                    assert.equal(db.name, "fake");
                    assert.equal(db.host, "localhost");
                    assert.equal(db.port, 27000);
                    assert.equal(db.pass, undefined);
                    assert.equal(db.user, undefined);

                    assert.equal(db.shouldAuthenticate(), false);

                    db.close();
                    done();
                });
            });
            describe("when only username is defined", () => {
                it("should return false", (done) => {
                    const db = mongoose.createConnection("localhost", "fake", 27000, { user: "user", auth: { authMechanism: "MONGODB-X509" } });
                    db.on("error", () => {
                    });
                    assert.equal(typeof db.options, "object");
                    assert.equal(typeof db.options.server, "object");
                    assert.equal(db.options.server.auto_reconnect, true);
                    assert.equal(typeof db.options.db, "object");
                    assert.equal(db.options.db.forceServerObjectId, false);
                    assert.equal(db.name, "fake");
                    assert.equal(db.host, "localhost");
                    assert.equal(db.port, 27000);
                    assert.equal(db.pass, undefined);
                    assert.equal(db.user, "user");

                    assert.equal(db.shouldAuthenticate(), true);

                    db.close();
                    done();
                });
            });
            describe("when both username and password are defined", () => {
                it("should return false", (done) => {
                    const db = mongoose.createConnection("localhost", "fake", 27000, { user: "user", pass: "pass", auth: { authMechanism: "MONGODB-X509" } });
                    db.on("error", () => {
                    });
                    assert.equal(typeof db.options, "object");
                    assert.equal(typeof db.options.server, "object");
                    assert.equal(db.options.server.auto_reconnect, true);
                    assert.equal(typeof db.options.db, "object");
                    assert.equal(db.options.db.forceServerObjectId, false);
                    assert.equal(db.name, "fake");
                    assert.equal(db.host, "localhost");
                    assert.equal(db.port, 27000);
                    assert.equal(db.pass, "pass");
                    assert.equal(db.user, "user");

                    assert.equal(db.shouldAuthenticate(), true);

                    db.close();
                    done();
                });
            });
        });
    });
});
