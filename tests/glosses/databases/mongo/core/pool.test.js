import {
    locateAuthMethod,
    executeCommand
} from "./shared";
import mongodbVersionManager from "mongodb-version-manager";
import configuration from "./configuration";
import mockupdb from "./mock";

const {
    data: { bson: { BSON } },
    promise: { delay }
} = adone;
const promisify = adone.promise.promisify;
const waitFor = (emitter, event) => new Promise((resolve) => emitter.once(event, (...args) => {
    if (args.length === 1) {
        args = args[0];
    }
    resolve(args);
}));


describe("database", "mongo", "core", function () {
    this.timeout(120000);

    const { database: { mongo } } = adone;
    const { core: { Connection, Pool, Query } } = adone.private(mongo);

    before(async function () {
        this.timeout(999999999); // long enough
        // Kill any running MongoDB processes and `install $MONGODB_VERSION` || `use existing installation` || `install stable`
        await promisify(mongodbVersionManager)();
        const version = await promisify(mongodbVersionManager.current)();
        adone.logInfo(`Running tests against MongoDB version ${version}`);
        return configuration.setup();
    });

    after(function () {
        this.timeout(30000);
        return configuration.teardown();
    });

    describe("pool", () => {
        describe("without auth", () => {
            before(function () {
                this.timeout(120000);
                return configuration.start();
            });

            after(function () {
                this.timeout(120000);
                return configuration.stop();
            });

            it("Should correctly connect pool to single server", (done) => {
                Connection.enableConnectionAccounting();

                // Attempt to connect
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON(),
                    messageHandler() { }
                });

                // Add event listeners
                pool.on("connect", (_pool) => {
                    _pool.destroy();
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty();
                    done();
                });

                pool.connect();
            });

            it("Should only listen on connect once", (done) => {
                // Enable connections accounting
                Connection.enableConnectionAccounting();

                // Attempt to connect
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON(),
                    messageHandler() { }
                });

                // Add event listeners
                pool.on("connect", (_pool) => {
                    process.nextTick(() => {
                        // Now that we are in next tick, connection should still exist, but there
                        // should be no connect listeners
                        assert.equal(0, connection.connection.listenerCount("connect"));
                        assert.equal(1, pool.allConnections().length);

                        _pool.destroy();

                        // Connection should be gone after destroy
                        assert.equal(0, pool.allConnections().length);
                        Connection.disableConnectionAccounting();
                        done();
                    });
                });

                assert.equal(0, pool.allConnections().length);

                // Start connection
                pool.connect();

                assert.equal(1, pool.allConnections().length);
                const connection = pool.allConnections()[0];
                assert.equal(1, connection.connection.listenerCount("connect"));
            });

            it("Should properly emit errors on forced destroy", (done) => {
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                pool.on("connect", (_pool) => {
                    const query = new Query(new BSON(), "system.$cmd", { ismaster: true }, { numberToSkip: 0, numberToReturn: 1 });
                    _pool.write(query, (err, result) => {
                        assert(err);
                        assert.ok(err.message.match(/Pool was force destroyed/));
                        assert.undefined(result);

                        assert.equal(0, Object.keys(Connection.connections()).length);
                        Connection.disableConnectionAccounting();
                        done();
                    });

                    _pool.destroy({ force: true });
                });

                pool.connect();
            });

            it("Should correctly write ismaster operation to the server", async () => {
                Connection.enableConnectionAccounting();

                // Attempt to connect
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                const _pool = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect();
                });
                try {
                    const query = new Query(new BSON(), "system.$cmd", {
                        ismaster: true
                    }, {
                        numberToSkip: 0,
                        numberToReturn: 1
                    });
                    const result = await promisify(_pool.write).call(_pool, query);
                    expect(result.result.ismaster).to.be.true();

                } finally {
                    _pool.destroy();
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty();
                }
            });

            it("Should correctly grow server pool on concurrent operations", async () => {
                Connection.enableConnectionAccounting();
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                const _pool = await new Promise((resolve) => {
                    pool.once("connect", resolve);
                    pool.connect();
                });
                try {
                    const promises = [];
                    for (let i = 0; i < 100; i++) {
                        const query = new Query(new BSON(), "system.$cmd", {
                            ismaster: true
                        }, {
                            numberToSkip: 0,
                            numberToReturn: 1
                        });
                        promises.push(new Promise((resolve, reject) => {
                            _pool.write(query, (err, result) => {
                                if (err || result.result.ismaster !== true) {
                                    return reject(err || new Error("something went wrong"));
                                }
                                resolve();
                            });
                        }));
                    }
                    await Promise.all(promises.slice(0, 10));
                    expect(pool.allConnections()).to.have.lengthOf(5);
                    await Promise.all(promises);
                } finally {
                    _pool.destroy();
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty();
                }
            });

            it("Should correctly write ismaster operation to the server and handle timeout", (done) => {
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    socketTimeout: 3000,
                    bson: new BSON(),
                    reconnect: false
                });

                // Add event listeners
                pool.on("connect", (_pool) => {
                    const query = new Query(new BSON(), "system.$cmd", {
                        ismaster: true
                    }, {
                        numberToSkip: 0,
                        numberToReturn: 1
                    });
                    _pool.write(query, adone.noop);
                });

                pool.on("timeout", () => {
                    pool.destroy();
                    done();
                });
                pool.connect();
            });

            it("Should correctly error out operations if pool is closed in the middle of a set", async () => {
                Connection.enableConnectionAccounting();

                // Attempt to connect
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    socketTimeout: 3000,
                    bson: new BSON()
                });
                await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect();
                });
                try {
                    const promises = [];

                    let errors = 0;
                    for (let i = 0; i < 500; ++i) {
                        promises.push(adone.promise.delay(2 * i).then(() => {
                            const query = new Query(new BSON(), "system.$cmd", {
                                ismaster: true
                            }, {
                                numberToSkip: 0,
                                numberToReturn: 1
                            });
                            return new Promise((resolve) => {
                                pool.write(query, (err) => {
                                    if (err) {
                                        ++errors;
                                    }
                                    resolve();
                                });
                            });
                        }));
                    }
                    pool.destroy();
                    await Promise.all(promises);
                    expect(errors).to.be.at.least(250);
                } finally {
                    pool.destroy();
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty();
                }
            });

            it("Should correctly recover from a server outage", async () => {
                // Enable connections accounting
                Connection.enableConnectionAccounting();

                // Attempt to connect
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    socketTimeout: 3000,
                    bson: new BSON(),
                    reconnectTries: 120
                });

                await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect();
                });

                try {
                    const promises = [];
                    for (let i = 0; i < 500; ++i) {
                        promises.push(adone.promise.delay(3 * i).then(() => {
                            const query = new Query(new BSON(), "system.$cmd", {
                                ismaster: true
                            }, {
                                numberToSkip: 0,
                                numberToReturn: 1
                            });
                            return new Promise((resolve) => {
                                pool.write(query, resolve);
                            });
                        }));
                    }
                    await Promise.all(promises.slice(0, 250));
                    await configuration.manager.stop();
                    await adone.promise.delay(5000);
                    const p = waitFor(pool, "reconnect");
                    await configuration.manager.start();
                    await Promise.all(promises);
                    await p;
                } finally {
                    pool.destroy();
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty();
                }
            });

            it("Should correctly reclaim immediateRelease socket", async () => {
                Connection.enableConnectionAccounting();
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    socketTimeout: 1000,
                    bson: new BSON(),
                    reconnect: false
                });

                let index = 0;
                pool.on("connect", (_pool) => {
                    const query = new Query(new BSON(), "system.$cmd", {
                        ismaster: true
                    }, {
                        numberToSkip: 0,
                        numberToReturn: 1
                    });
                    _pool.write(query, {
                        immediateRelease: true
                    }, () => {
                        index = index + 1;
                    });
                });
                pool.connect();

                await new Promise((resolve) => {
                    pool.on("timeout", resolve);
                });
                expect(index).to.be.equal(0);
                pool.destroy();
                expect(Connection.connections()).to.be.empty();
                Connection.disableConnectionAccounting();
            });

            it("Should remove all connections from further use during reauthentication of a pool", async () => {
                let running = true;

                const server = await mockupdb.createServer(17017, "localhost");

                (async () => {
                    while (running) {
                        const request = await server.receive();
                        const doc = request.document;

                        if (doc.getnonce) {
                            request.reply({ ok: 1, result: { nonce: "testing" } });
                        } else if (doc.authenticate) {
                            request.reply({ ok: 1 });
                        } else if (doc.ismaster) {
                            setTimeout(() => {
                                request.reply({ ok: 1 });
                            }, 10000);
                        }
                    }
                })();

                const pool = new Pool({
                    host: "localhost",
                    port: 17017,
                    bson: new BSON(),
                    size: 10
                });

                const query = new Query(new BSON(), "system.$cmd", { ismaster: true }, { numberToSkip: 0, numberToReturn: 1 });

                await new Promise((resolve) => {
                    pool.once("connect", resolve);
                    pool.connect();
                });

                pool.write(query, { monitoring: true }, () => { });

                await delay(500);

                await promisify(pool.auth).call(pool, "mongocr", "test", "admin", "admin");

                try {
                    // ensure that there are no duplicates in the available connection queue
                    const availableIds = pool.availableConnections.map((conn) => {
                        return conn.id;
                    });
                    availableIds.forEach((id, pos, arr) => {
                        assert.equal(arr.indexOf(id), pos);
                    });

                    assert.equal(pool.availableConnections.length, 1);
                    assert.equal(pool.inUseConnections.length, 0);

                    running = false;
                } finally {
                    pool.destroy(true);
                    assert.equal(0, Object.keys(Connection.connections()).length);
                    Connection.disableConnectionAccounting();
                }
            });

            it("Should correctly exit _execute loop when single avialable connection is destroyed", async () => {
                Connection.enableConnectionAccounting();
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON(),
                    size: 1,
                    socketTimeout: 500,
                    messageHandler: adone.noop
                });
                const _pool = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect();
                });

                try {
                    const write = promisify(_pool.write).bind(_pool);

                    let query = new Query(new BSON(), "system.$cmd", {
                        ismaster: true
                    }, {
                        numberToSkip: 0,
                        numberToReturn: 1
                    });
                    await write(query);

                    // Mark available connection as broken
                    const con = pool.availableConnections[0];
                    pool.availableConnections[0].destroyed = true;
                    try {
                        query = new Query(new BSON(), "system.$cmd", {
                            ismaster: true
                        }, {
                            numberToSkip: 0,
                            numberToReturn: 1
                        });
                        await write(query);
                    } finally {
                        con.destroy(true);
                    }
                } finally {
                    _pool.destroy(true);
                    Connection.disableConnectionAccounting();
                }
            });
        });

        describe("using auth", () => {
            beforeEach(function () {
                this.timeout(120000);
                configuration.useAuth = true;
                return configuration.start();
            });

            afterEach(function () {
                this.timeout(120000);
                configuration.useAuth = false;
                return configuration.stop();
            });

            it("Should correctly authenticate using scram-sha-1 using connect auth", async () => {
                Connection.enableConnectionAccounting();

                // Restart instance
                const method = await locateAuthMethod(configuration);
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });
                const _pool = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect(method, "admin", "root", "root");
                });
                try {
                    await executeCommand(configuration, "admin", {
                        dropUser: "root"
                    }, {
                        auth: [method, "admin", "root", "root"]
                    });
                } finally {
                    _pool.destroy(true);
                    expect(Connection.connections()).to.be.empty();
                    Connection.disableConnectionAccounting();
                }

            });

            it("Should correctly authenticate using scram-sha-1 using connect auth and maintain auth on new connections", async () => {
                Connection.enableConnectionAccounting();

                const method = await locateAuthMethod(configuration);
                await executeCommand(configuration, "test", {
                    createUser: "admin",
                    pwd: "admin",
                    roles: ["readWrite", "dbAdmin"],
                    digestPassword: true
                }, {
                    auth: [method, "admin", "root", "root"]
                });

                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                const _pool = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect(method, "test", "admin", "admin");
                });

                try {
                    const promises = [];
                    for (let i = 0; i < 10; ++i) {
                        for (let j = 0; j < 10; ++j) {
                            const query = new Query(new BSON(), "test.$cmd", {
                                insert: "test",
                                documents: [{
                                    a: 1
                                }]
                            }, {
                                numberToSkip: 0,
                                numberToReturn: 1
                            });

                            promises.push(new Promise((resolve, reject) => {
                                _pool.write(query, {
                                    command: true,
                                    requestId: query.requestId
                                }, (err, result) => {
                                    if (err || result.result.n !== 1) {
                                        return reject(err || new Error(result));
                                    }
                                    resolve();
                                });
                            }));
                        }
                        await adone.promise.delay(1);
                    }
                    await Promise.all(promises);
                    // expect(pool.socketCount()).to.be.at.least(1);
                } finally {
                    pool.destroy(true);
                    expect(Connection.connections()).to.be.empty();
                    Connection.disableConnectionAccounting();
                }
            });

            it("Should correctly authenticate using scram-sha-1 using auth method", async () => {
                Connection.enableConnectionAccounting();

                const method = await locateAuthMethod(configuration);
                await executeCommand(configuration, "test", {
                    createUser: "admin",
                    pwd: "admin",
                    roles: ["readWrite", "dbAdmin"],
                    digestPassword: true
                }, {
                    auth: [method, "admin", "root", "root"]
                });

                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                let error = false;

                const _pool = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect();
                });
                try {
                    for (let i = 0; i < 100; i++) {
                        process.nextTick(() => {
                            const query = new Query(new BSON(), "system.$cmd", {
                                ismaster: true
                            }, {
                                numberToSkip: 0,
                                numberToReturn: 1
                            });
                            _pool.write(query, {
                                command: true,
                                requestId: query.requestId
                            }, (e) => {
                                if (e) {
                                    error = e;
                                }
                            });
                        });
                    }
                    await promisify(pool.auth).call(pool, method, "test", "admin", "admin");

                    const promises = [];
                    for (let i = 0; i < 100; ++i) {
                        promises.push(new Promise((resolve, reject) => {
                            const query = new Query(new BSON(), "test.$cmd", {
                                insert: "test",
                                documents: [{
                                    a: 1
                                }]
                            }, {
                                numberToSkip: 0,
                                numberToReturn: 1
                            });
                            _pool.write(query, {
                                command: true,
                                requestId: query.requestId
                            }, (err, result) => {
                                if (err || result.result.n !== 1) {
                                    return reject(err || new Error(result));
                                }
                                resolve();
                            });
                        }));
                    }
                    await Promise.all(promises);
                    // expect(pool.socketCount()).to.be.at.least(1);
                    expect(error).to.be.false();
                } finally {
                    pool.destroy(true);
                    expect(Connection.connections()).to.be.empty();
                    Connection.disableConnectionAccounting();
                }
            });

            it("Should correctly authenticate using scram-sha-1 using connect auth then logout", async () => {
                Connection.enableConnectionAccounting();

                const method = await locateAuthMethod(configuration);
                await executeCommand(configuration, "test", {
                    createUser: "admin",
                    pwd: "admin",
                    roles: ["readWrite", "dbAdmin"],
                    digestPassword: true
                }, {
                    auth: [method, "admin", "root", "root"]
                });

                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                const _pool = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect(method, "test", "admin", "admin");
                });

                const write = promisify(_pool.write).bind(_pool);
                try {
                    const query = new Query(new BSON(), "test.$cmd", {
                        insert: "test",
                        documents: [{
                            a: 1
                        }]
                    }, {
                        numberToSkip: 0,
                        numberToReturn: 1
                    });
                    await write(query, {
                        command: true,
                        requestId: query.requestId
                    });
                    await promisify(_pool.logout).call(_pool, "test");
                    await write(query, {
                        command: true,
                        requestId: query.requestId
                    }).then(() => {
                        throw new Error("should throw");
                    }, (e) => e);
                } finally {
                    _pool.destroy(true);
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty();
                }
            });

            it("Should correctly have auth wait for logout to finish", async () => {
                Connection.enableConnectionAccounting();

                const method = await locateAuthMethod(configuration);
                await executeCommand(configuration, "test", {
                    createUser: "admin",
                    pwd: "admin",
                    roles: ["readWrite", "dbAdmin"],
                    digestPassword: true
                }, {
                    auth: [method, "admin", "root", "root"]
                });

                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                const _pool = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect(method, "test", "admin", "admin");
                });
                try {
                    const write = promisify(_pool.write).bind(_pool);
                    const query = new Query(new BSON(), "test.$cmd", {
                        insert: "test",
                        documents: [{
                            a: 1
                        }]
                    }, {
                        numberToSkip: 0,
                        numberToReturn: 1
                    });
                    await write(query, {
                        requestId: query.requestId
                    });
                    await promisify(_pool.logout).call(_pool, "test");
                    await promisify(_pool.auth).call(_pool, method, "test", "admin", "admin");
                    await write(query, {
                        requestId: query.requestId
                    });
                } finally {
                    _pool.destroy(true);
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty();
                }
            });
        });
    });
});
