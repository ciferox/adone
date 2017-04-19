import ReplSet from "adone/glosses/databases/mongo/core/lib/topologies/replset";
import Connection from "adone/glosses/databases/mongo/core/lib/connection/connection";
import MongoError from "adone/glosses/databases/mongo/core/lib/error";
import ReadPreference from "adone/glosses/databases/mongo/core/lib/topologies/read_preference";
import mongodbVersionManager from "mongodb-version-manager";
import mockupdb from "../../mock";
import configuration from "../../configuration";

const {
    vendor: { lodash }
} = adone;
const promisify = adone.promise.promisify;
const waitFor = (emitter, event) => new Promise((resolve) => emitter.once(event, (...args) => {
    if (args.length === 1) {
        args = args[0];
    }
    resolve(args);
}));


describe("mongodb", function () {
    this.timeout(120000);

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

    describe("mocks", () => {
        describe("replica set", () => {
            context("read preferences", () => {
                it("Should correctly connect to a replicaset and select the correct tagged secondary server", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectID(), new adone.data.bson.ObjectID()];

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: electionIds[0],
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: {
                            loc: "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        tags: {
                            loc: "dc"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 2000,
                        size: 1
                    });

                    adone.promise.delay(100).then(() => server.connect());
                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(2000);
                    try {
                        const r = await promisify(_server.command).call(_server, "test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("secondary", { loc: "dc" })
                        });
                        expect(r.connection.port === 32002).to.be.ok;
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly connect to a replicaset and select the primary server", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectID(), new adone.data.bson.ObjectID()];

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: electionIds[0],
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: {
                            loc: "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        tags: {
                            loc: "dc"
                        }
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 2000,
                        size: 1
                    });

                    adone.promise.delay(100).then(() => server.connect());

                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(500);
                    try {
                        const r = await promisify(_server.command).call(_server, "test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("primaryPreferred")
                        });
                        expect(r.connection.port).to.be.equal(32000);
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly round robin secondary reads", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectID(), new adone.data.bson.ObjectID()];

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: electionIds[0],
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: {
                            loc: "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        tags: {
                            loc: "dc"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 2000,
                        size: 1
                    });

                    adone.promise.delay(100).then(() => server.connect());

                    // Add event listeners
                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(500);
                    // Set up a write
                    // Perform a find
                    const command = promisify(_server.command).bind(_server);
                    try {

                        let r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("secondary")
                        });
                        let port = r.connection.port;
                        r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("secondary")
                        });
                        expect(r.connection.port !== port).to.be.ok;
                        port = r.connection.port;

                        // Perform a find
                        r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("secondary")
                        });
                        expect(r.connection.port !== port).to.be.ok;
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly fall back to a secondary server if the readPreference is primaryPreferred", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectID(), new adone.data.bson.ObjectID()];

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: electionIds[0],
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000", "localhost:32001"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // mock ops store from node-mongodb-native for handling repl set disconnects
                    const mockDisconnectHandler = {
                        add(opType, ns, ops, options, callback) {
                            // Command issued to replSet will fail immediately if !server.isConnected()
                            return callback(MongoError.create({
                                message: "no connection available",
                                driver: true
                            }));
                        },
                        execute() {
                            // method needs to be called, so provide a dummy version
                            return;
                        },
                        flush() {
                            // method needs to be called, so provide a dummy version
                            return;
                        }
                    };

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000,
                        socketTimeout: 3000,
                        connectionTimeout: 3000
                    }, {
                        host: "localhost",
                        port: 32001
                    }], {
                        setName: "rs",
                            // connectionTimeout: 10000,
                            // socketTimeout: 10000,
                        haInterval: 10000,
                        disconnectHandler: mockDisconnectHandler,
                        size: 1
                    });

                    adone.promise.delay(100).then(() => server.connect());
                    const _server = await waitFor(server, "connect");
                    // Add event listeners
                    await adone.promise.delay(500);
                    try {
                        const command = promisify(_server.command).bind(_server);
                        let r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("primaryPreferred")
                        });
                        expect(r.connection.port).to.be.equal(32000);

                        primaryServer.destroy();
                        await waitFor(_server, "left");
                        r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("primaryPreferred")
                        });
                        expect(r.connection.port).to.be.equal(32001); // reads from secondary while primary down
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        _server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly fallback to secondaries when primary not available", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectID(), new adone.data.bson.ObjectID()];

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: electionIds[0],
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: {
                            loc: "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        tags: {
                            loc: "dc"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.connection.destroy();
                                break;
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 2000,
                        size: 1
                    });

                    adone.promise.delay(100).then(() => server.connect());

                    const _server = await waitFor(server, "connect");

                    const command = promisify(_server.command).bind(_server);
                    try {
                        // Perform a find
                        await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("primaryPreferred")
                        }).catch(() => { });
                        // Let all sockets properly close
                        await adone.promise.delay(10);
                        // Test primaryPreferred
                        let r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("primaryPreferred")
                        });
                        expect(r.connection.port !== 32000).to.be.ok;

                        // Test secondaryPreferred
                        r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("secondaryPreferred")
                        });
                        expect(r.connection.port !== 32000).to.be.ok;
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly connect to a replicaset and perform correct nearness read", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectID(), new adone.data.bson.ObjectID()];

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: electionIds[0],
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: {
                            loc: "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        tags: {
                            loc: "dc"
                        }
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 1000,
                        size: 1
                    });


                    adone.promise.delay(100).then(() => server.connect());
                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(2000);
                    try {
                        _server.s.replicaSetState.secondaries = _server.s.replicaSetState.secondaries.map((x, i) => {
                            x.lastIsMasterMS = i * 20;
                            return x;
                        });

                        const r = await promisify(_server.command).call(_server, "test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("nearest")
                        });

                        expect(r.connection.port).to.be.oneOf([3200, 32001]);
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly connect to a replicaset and perform correct nearness read with tag", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectID(), new adone.data.bson.ObjectID()];

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: electionIds[0],
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: {
                            loc: "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: {
                            loc: "dc"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        tags: {
                            loc: "dc"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // console.log("--------------------------------------------- -2")
                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 1000,
                        size: 1
                    });

                    adone.promise.delay(100).then(() => server.connect());
                    // Add event listeners
                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(2000);
                    try {
                        _server.s.replicaSetState.secondaries = _server.s.replicaSetState.secondaries.map((x, i) => {
                            x.lastIsMasterMS = i * 20;
                            return x;
                        });
                        const r = await promisify(_server.command).call(_server, "test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("nearest", { loc: "dc" })
                        });
                        expect(r.connection.port).to.be.oneOf([32001, 32002]);
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly connect connect to single server replicaset and peform a secondaryPreferred", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectID(), new adone.data.bson.ObjectID()];

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: electionIds[0],
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: {
                            loc: "ny"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    n: 1,
                                    ok: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 2000,
                        size: 1
                    });

                    // Add event listeners
                    adone.promise.delay(100).then(() => server.connect());

                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(500);
                    // Perform a find
                    try {
                        const r = await promisify(_server.command).call(_server, "test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                            readPreference: new ReadPreference("secondaryPreferred")
                        });
                        expect(r.connection.port).to.be.equal(32000);

                    } finally {
                        primaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        expect(Connection.connections()).to.be.empty;
                        Connection.disableConnectionAccounting();
                    }
                });
            });
        });
    });
});
