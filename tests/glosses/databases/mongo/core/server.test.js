import mongodbVersionManager from "mongodb-version-manager";
import configuration from "./configuration";

const {
    data: { bson: { BSON } }
} = adone;
const promisify = adone.promise.promisify;

describe("database", "mongo", "core", function () {
    this.timeout(120000);

    const { database: { mongo } } = adone;
    const { core: { Server, ReadPreference } } = adone.private(mongo);

    before(async function () {
        this.timeout(999999999); // long enough
        // Kill any running MongoDB processes and `install $MONGODB_VERSION` || `use existing installation` || `install stable`
        await promisify(mongodbVersionManager)();
        const version = await promisify(mongodbVersionManager.current)();
        adone.info(`Running tests against MongoDB version ${version}`);
        return configuration.setup();
    });

    after(() => {
        return configuration.teardown();
    });

    describe("server", () => {
        before(function () {
            this.timeout(120000);
            return configuration.start();
        });

        after(function () {
            this.timeout(120000);
            return configuration.stop();
        });

        it("Should correctly connect server to single instance", (done) => {
            // Attempt to connect
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            // Add event listeners
            server.on("connect", (server) => {
                server.destroy();
                done();
            });

            // Start connection
            server.connect();
        });

        it("Should correctly connect server to single instance and execute ismaster", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const r = await promisify(_server.command).call(_server, "admin.$cmd", {
                    ismaster: true
                });

                expect(r.result.ismaster).to.be.true();
                expect(r.connection).to.be.ok();
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute ismaster returning raw", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const r = await promisify(_server.command).call(_server, "admin.$cmd", {
                    ismaster: true
                }, {
                    raw: true
                });

                expect(r.result).to.be.instanceof(Buffer);
                expect(r.connection).to.be.ok();
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute insert", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const insert = promisify(_server.insert).bind(_server);

                let r = await insert(`${configuration.db}.inserts`, {
                    a: 1
                });
                expect(r.result.n).to.be.equal(1);

                r = await insert(`${configuration.db}.inserts`, {
                    a: 1
                }, {
                    ordered: false
                });
                expect(r.result.n).to.be.equal(1);
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute bulk insert", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const insert = promisify(_server.insert).bind(_server);

                let r = await insert(`${configuration.db}.inserts`, [{
                    a: 1
                }, {
                    b: 1
                }]);
                expect(r.result.n).to.be.equal(2);

                r = await insert(`${configuration.db}.inserts`, [{
                    a: 1
                }, {
                    b: 1
                }], {
                    ordered: false
                });
                expect(r.result.n).to.be.equal(2);
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute insert with w:0", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const insert = promisify(_server.insert).bind(_server);

                let r = await insert(`${configuration.db}.inserts`, {
                    a: 1
                }, {
                    writeConcern: { w: 0 }
                });
                expect(r.result.ok).to.be.equal(1);

                r = await insert(`${configuration.db}.inserts`, {
                    a: 1
                }, {
                    ordered: false,
                    writeConcern: { w: 0 }
                });
                expect(r.result.ok).to.be.equal(1);
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute update", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const update = promisify(_server.update).bind(_server);

                const r = await update(`${configuration.db}.inserts_example2`, [{
                    q: {
                        a: 1
                    },
                    u: {
                        $set: {
                            b: 1
                        }
                    },
                    upsert: true
                }], {
                    writeConcern: { w: 1 },
                    ordered: true
                });
                expect(r.result.n).to.be.equal(1);
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute remove", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const insert = promisify(_server.insert).bind(_server);
                const remove = promisify(_server.remove).bind(_server);

                let r = await insert(`${configuration.db}.remove_example`, {
                    a: 1
                });
                expect(r.result.ok).to.be.ok();

                r = await remove(`${configuration.db}.remove_example`, [{
                    q: {
                        a: 1
                    },
                    limit: 1
                }], {
                    writeConcern: { w: 1 },
                    ordered: true
                });
                expect(r.result.n).to.be.equal(1);
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly recover with multiple restarts", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            let done = false;

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
                (async () => {
                    await adone.promise.delay(1000);
                    await configuration.manager.stop();
                    await adone.promise.delay(2000);
                    await configuration.manager.start();
                    await adone.promise.delay(1000);
                    await configuration.manager.stop();
                    await adone.promise.delay(2000);
                    await configuration.manager.start();
                    done = true;
                })();
            });
            try {
                const ns = `${configuration.db}.t`;
                const insert = promisify(server.insert).bind(server);
                for (; !done;) {
                    await insert(ns, {
                        a: 1
                    }).catch(adone.noop);
                    const cursor = _server.cursor(ns, {
                        find: ns,
                        query: {},
                        batchSize: 2
                    });
                    await promisify(cursor.next).call(cursor).catch(adone.noop);
                    await adone.promise.delay(500);
                }
                await insert(ns, {
                    a: 1
                });
                const cursor = _server.cursor(ns, {
                    find: ns,
                    query: {},
                    batchSize: 2
                });
                await promisify(cursor.next).call(cursor);
            } finally {
                server.destroy();
            }
        });

        it("Should correctly reconnect to server with automatic reconnect enabled", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                reconnect: true,
                size: 1,
                reconnectInterval: 50
            });
            let closeEmitted = false;
            server.on("close", () => closeEmitted = true);
            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const command = promisify(_server.command).bind(_server);
                const result = await command("system.$cmd", {
                    ismaster: true
                }, {
                    readPreference: new ReadPreference("primary")
                });
                _server.s.currentReconnectRetry = 10;
                // Write garbage, force socket closure
                const reconnect = new Promise((resolve) => server.once("reconnect", resolve));
                try {
                    const a = new Buffer(100);
                    for (let i = 0; i < 100; i++) {
                        a[i] = i;
                    }
                    result.connection.write(a);
                } catch (err) {
                    //
                }
                await command("system.$cmd", {
                    ismaster: true
                }, {
                    readPreference: new ReadPreference("primary")
                }).then(() => {
                    throw new Error("should die");
                }, (e) => e);
                await reconnect;
                expect(closeEmitted).to.be.true();
                expect(server.isConnected()).to.be.true();
                expect(server.s.pool.retriesLeft).to.be.equal(30);
            } finally {
                server.destroy();
            }
        });

        it("Should correctly reconnect to server with automatic reconnect disabled", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                reconnect: false,
                size: 1
            });
            let closeEmitted = false;
            server.on("close", () => closeEmitted = true);
            let errorEmitted = false;
            server.on("error", () => errorEmitted = true);
            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const command = promisify(_server.command).bind(_server);
                const result = await command("system.$cmd", {
                    ismaster: true
                }, {
                    readPreference: new ReadPreference("primary")
                });
                // Write garbage, force socket closure
                try {
                    result.connection.destroy();
                } catch (err) {
                    //
                }
                await adone.promise.delay(1);
                await command("system.$cmd", {
                    ismaster: true
                }, {
                    readPreference: new ReadPreference("primary")
                }).then(() => {
                    throw new Error("should die");
                }, (e) => e);
                await adone.promise.delay(500);
                expect(closeEmitted).to.be.true();
                expect(errorEmitted).to.be.false();
                expect(server.isConnected()).to.be.false();
            } finally {
                server.destroy();
            }
        });

        it("Should reconnect when initial connection failed", async () => {
            await configuration.manager.stop("SIGINT");
            // Attempt to connect while server is down
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                reconnect: true,
                reconnectTries: 2,
                size: 1,
                emitError: true
            });
            server.on("error", (err) => {
                expect(err).to.be.ok();
                expect(err.message).to.match(/failed to/);
                configuration.manager.start();
            });
            await new Promise((resolve) => {
                server.on("reconnect", resolve);
                server.connect();
            });
            server.destroy();
        });

        it("Should correctly place new connections in available list on reconnect", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                reconnect: true,
                size: 1,
                reconnectInterval: 50
            });

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const result = await promisify(_server.command).call(_server, "system.$cmd", {
                    ismaster: true
                }, {
                    readPreference: new ReadPreference("primary")
                });
                _server.s.currentReconnectRetry = 10;
                try {
                    const a = new Buffer(100);
                    for (let i = 0; i < 100; i++) {
                        a[i] = i;
                    }
                    result.connection.write(a);
                } catch (err) {
                    //
                }
                await new Promise((resolve) => {
                    server.on("reconnect", resolve);
                });
                const command = promisify(server.command).bind(server);
                const promises = [];
                for (let i = 0; i < 100; ++i) {
                    promises.push(command("system.$cmd", {
                        ismaster: true
                    }));
                }
                await Promise.all(promises);
                expect(server.s.pool.availableConnections.length).to.be.above(0);
                expect(server.s.pool.inUseConnections).to.be.empty();
                expect(server.s.pool.connectingConnections).to.be.empty();
            } finally {
                server.destroy();
            }
        });

        it("Should not overflow the poolSize due to concurrent operations", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                reconnect: true,
                reconnectTries: 2,
                size: 50,
                emitError: true
            });
            await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const promises = [];
                const insert = promisify(server.insert).bind(server);
                for (let i = 0; i < 5000; ++i) {
                    promises.push(insert(`${configuration.db}.massInsertsTest`, [{
                        a: 1
                    }], {
                        writeConcern: { w: 1 },
                        ordered: true
                    }));
                }
                await Promise.all(promises);
                expect(server.connections()).to.have.lengthOf(50);
            } finally {
                server.destroy();
            }
        });

        it("Should correctly connect execute 5 evals in parallel", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                size: 10,
                bson: new BSON()
            });

            await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });

            const left = 5;
            const start = new Date().getTime();
            const promises = [...new Array(5)].map((x) => {
                return new Promise((resolve, reject) => {
                    server.command("system.$cmd", { eval: "sleep(100);" }, (err, r) => {
                        err ? reject(err) : resolve();
                    });
                });
            });
            try {
                await Promise.all(promises);
                const total = new Date().getTime() - start;
                expect(total).to.be.within(500, 1000);
            } finally {
                server.destroy();
            }
        });

        it("Should correctly promoteValues when calling getMore on queries", async () => {
            // Attempt to connect
            const _server = new Server({
                host: configuration.host,
                port: configuration.port,
                size: 10,
                bson: new BSON()
            });
            // Namespace
            const ns = "integration_tests.remove_example";

            // Add event listeners
            const server = await new Promise((resolve) => {
                _server.connect();
                _server.once("connect", resolve);
            });

            const docs = new Array(150).fill(0).map((_, i) => {
                return {
                    _id: `needle_${i}`,
                    is_even: i % 2,
                    long: adone.data.bson.Long.fromString("1234567890"),
                    double: 0.23456,
                    int: 1234
                };
            });

            await promisify(server.insert).call(server, ns, docs);

            const r = await promisify(server.insert).call(server, ns, docs);
            expect(r.result.ok).to.be.equal(1);

            // Execute find
            const cursor = server.cursor(ns, {
                find: ns,
                query: {},
                limit: 102
            }, {
                promoteValues: false
            });

            const next = promisify(cursor.next, { context: cursor });

            let i = 0;
            for (; ;) {
                const doc = await next();
                if (!doc) {
                    break;
                }
                ++i;
                expect(typeof doc.int).to.be.equal("object");
                expect(doc.int._bsontype).to.be.equal("Int32");
                expect(typeof doc.long).to.be.equal("object");
                expect(doc.long._bsontype).to.be.equal("Long");
                expect(typeof doc.double).to.be.equal("object");
                expect(doc.double._bsontype).to.be.equal("Double");
            }
            expect(i).to.be.equal(102);
        });
    });
});
