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


describe("database", "mongo", "core", function () {
    this.timeout(120000);

    const { database: { mongo } } = adone;
    const { core: { ReplSet, Connection } } = adone.private(mongo);

    before(async function () {
        this.timeout(999999999); // long enough
        // Kill any running MongoDB processes and `install $MONGODB_VERSION` || `use existing installation` || `install stable`
        await promisify(mongodbVersionManager)();
        const version = await promisify(mongodbVersionManager.current)();
        adone.logInfo(`Running tests against MongoDB version ${version}`);
        return configuration.setup();
    });

    after(() => {
        return configuration.teardown();
    });

    describe("mocks", () => {
        describe("replica set", () => {
            context("connection", () => {
                specify("Successful connection to replicaset of 1 primary, 1 secondary and 1 arbiter", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: { loc: "ny" }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: { loc: "sf" }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    try {
                        await new Promise((resolve) => {
                            server.on("joined", (_type) => {
                                if (_type === "arbiter" || _type === "secondary" || _type === "primary") {
                                    // console.log("!!!!!!!!!!!!!!!!! joined :: " + _type)
                                    // console.log("server.s.replicaSetState.secondaries = " + server.s.replicaSetState.secondaries.length)
                                    // console.log("server.s.replicaSetState.arbiters = " + server.s.replicaSetState.arbiters.length)

                                    if (server.s.replicaSetState.secondaries.length === 1 && server.s.replicaSetState.arbiters.length === 1 && server.s.replicaSetState.primary) {
                                        resolve();
                                    }
                                }
                            });
                        });
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");
                        expect(server.s.replicaSetState.primary).not.to.be.null();
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty();
                    }
                });

                specify("Successful connection to replicaset of 1 primary, 1 secondary and 1 arbiter using arbiter as seed", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: { loc: "ny" }
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
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    // Boot the mock
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await new Promise((resolve) => {
                        server.on("joined", (_type) => {
                            if (_type === "arbiter" || _type === "secondary" || _type === "primary") {
                                // console.log("!!!!!!!!!!!!!!!!! joined :: " + _type)
                                // console.log("server.s.replicaSetState.secondaries = " + server.s.replicaSetState.secondaries.length)
                                // console.log("server.s.replicaSetState.arbiters = " + server.s.replicaSetState.arbiters.length)
                                if (server.s.replicaSetState.secondaries.length === 1
                                    && server.s.replicaSetState.arbiters.length === 1
                                    && server.s.replicaSetState.primary) {
                                    resolve();
                                }
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");

                        expect(server.s.replicaSetState.primary).not.to.be.null();
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty();
                    }
                });

                specify("Successful connection to replicaset of 1 primary, 1 secondary but missing arbiter", async () => {
                    const running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
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

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    await new Promise((resolve) => {
                        let numberOfEvents = 0;
                        server.on("joined", () => {
                            numberOfEvents = numberOfEvents + 1;
                            if (numberOfEvents === 3) {
                                resolve();
                            }
                        });

                        server.on("failed", () => {
                            // console.log("== failed :: " + server.name)
                            numberOfEvents = numberOfEvents + 1;
                            if (numberOfEvents === 3) {
                                resolve();
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(0);

                        expect(server.s.replicaSetState.primary).not.to.be.null();
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await server.destroy();
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty();
                    }
                });

                specify("Fail to connect due to missing primary", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
                    };

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

                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await waitFor(server, "error");

                    await server.destroy();
                    await firstSecondaryServer.destroy();
                    running = false;
                    await adone.promise.delay(1000);
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty();
                });

                specify("Successful connection to replicaset of 0 primary, 1 secondary and 1 arbiter with secondaryOnlyConnectionAllowed", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
                    };

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
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(adone.noop);
                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1,
                            secondaryOnlyConnectionAllowed: true
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await new Promise((resolve) => {
                        server.on("joined", () => {
                            if (server.s.replicaSetState.secondaries.length === 1
                                && server.s.replicaSetState.arbiters.length === 1) {
                                resolve();
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");
                        expect(server.s.replicaSetState.primary).to.be.null();
                    } finally {
                        await firstSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty();
                    }
                });

                it("Should print socketTimeout warning due to socketTimeout < haInterval", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
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
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(adone.noop);
                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 2000,
                            haInterval: 5000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await waitFor(server, "error");

                    await primaryServer.destroy();
                    await firstSecondaryServer.destroy();
                    await arbiterServer.destroy();
                    await server.destroy();
                    running = false;
                    await adone.promise.delay(1000);
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty();
                });

                it("Should connect with a replicaset with a single primary and secondary", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
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

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 }], {
                            setName: "rs",
                            connectionTimeout: 5000,
                            socketTimeout: 10000,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await new Promise((resolve) => {
                        server.on("joined", (_type) => {
                            if (_type === "secondary" || _type === "primary") {
                                if (server.s.replicaSetState.secondaries.length === 1
                                    && server.s.replicaSetState.primary) {
                                    resolve();
                                }
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.primary).to.be.ok();
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");

                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await server.destroy();
                        running = false;

                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty();
                    }
                });

                specify("Successful connection to replicaset of 1 primary, 1 secondary and 1 arbiter with different seedlist names", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
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
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "127.0.0.1", port: 32002 },
                        { host: "127.0.0.1", port: 32001 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await new Promise((resolve) => {
                        server.on("joined", (_type) => {
                            if (_type === "arbiter" || _type === "secondary" || _type === "primary") {
                                // console.log("!!!!!!!!!!!!!!!!! joined :: " + _type)
                                // console.log("server.s.replicaSetState.secondaries = " + server.s.replicaSetState.secondaries.length)
                                // console.log("server.s.replicaSetState.arbiters = " + server.s.replicaSetState.arbiters.length)

                                if (server.s.replicaSetState.secondaries.length === 1
                                    && server.s.replicaSetState.arbiters.length === 1
                                    && server.s.replicaSetState.primary) {
                                    resolve();
                                }
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");

                        expect(server.s.replicaSetState.primary).not.to.be.null();
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty();
                    }
                });

                specify("Successful connection to replicaset of 1 primary, 0 secondary and 1 arbiter", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
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
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    // firstSecondaryServer = yield mockupdb.createServer(32001, 'localhost');
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await new Promise((resolve) => {
                        server.on("joined", (_type) => {
                            if (_type === "arbiter" || _type === "secondary" || _type === "primary") {
                                // console.log("!!!!!!!!!!!!!!!!! joined :: " + _type)
                                // console.log("server.s.replicaSetState.secondaries = " + server.s.replicaSetState.secondaries.length)
                                // console.log("server.s.replicaSetState.arbiters = " + server.s.replicaSetState.arbiters.length)

                                if (server.s.replicaSetState.arbiters.length === 1
                                    && server.s.replicaSetState.primary) {
                                    resolve();
                                }
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");

                        expect(server.s.replicaSetState.primary).not.to.be.null();
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        await primaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty();
                    }
                });

                specify("Successful connection to replicaset of 1 primary, 1 secondary and 1 arbiter with single seed should emit fullsetup and all", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
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
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    server.on("fullsetup", () => {
                        // console.log("============= fullsetup")
                        server.__fullsetup = true;
                    });
                    server.on("connect", () => {
                        // console.log("============= connect")
                        server.__connected = true;
                    });

                    adone.promise.delay(100).then(() => server.connect());

                    await waitFor(server, "all");

                    expect(server.__connected).to.be.ok();
                    expect(server.__fullsetup).to.be.ok();

                    await primaryServer.destroy();
                    await firstSecondaryServer.destroy();
                    await arbiterServer.destroy();
                    await server.destroy();
                    running = false;
                });

                specify("Successful connection to replicaset of 1 primary, 1 secondary and 1 arbiter with secondaryOnlyConnectionAllowed", async () => {
                    // Contain mock server
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: { loc: "ny" }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: { loc: "sf" }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch((err) => {
                        // console.log(err.stack);
                    });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch((err) => {
                        // console.log(err.stack);
                    });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch((err) => {
                        // console.log(err.stack);
                    });

                    Connection.enableConnectionAccounting();
                    try {

                        // Attempt to connect
                        const server = new ReplSet([
                            { host: "localhost", port: 32000 },
                            { host: "localhost", port: 32001 },
                            { host: "localhost", port: 32002 }], {
                                setName: "rs",
                                connectionTimeout: 3000,
                                socketTimeout: 0,
                                haInterval: 2000,
                                size: 1,
                                secondaryOnlyConnectionAllowed: true
                            });

                        await adone.promise.delay(100);

                        await new Promise((resolve) => {
                            server.connect();
                            server.once("connect", resolve);
                        });

                        await new Promise((resolve) => {
                            server.on("joined", (_type) => {
                                if (_type === "arbiter" || _type === "secondary" || _type === "primary") {
                                    if (server.s.replicaSetState.secondaries.length == 1 &&
                                        server.s.replicaSetState.arbiters.length == 1 &&
                                        server.s.replicaSetState.primary) {
                                        resolve();
                                    }
                                }
                            });
                        });

                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");

                        expect(server.s.replicaSetState.primary).to.exist();
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");

                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        running = false;

                        await adone.promise.delay(1000);

                        expect(Connection.connections()).to.be.empty();
                    } finally {
                        Connection.disableConnectionAccounting();
                    }
                });

                specify("Correctly return lastIsMaster when connected to a secondary only for a replicaset connection", async () => {
                    // Contain mock server
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

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
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32002"]
                    };

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: { loc: "sf" }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch((err) => {
                        // console.log(err.stack);
                    });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch((err) => {
                        // console.log(err.stack);
                    });

                    Connection.enableConnectionAccounting();
                    try {
                        // Attempt to connect
                        const server = new ReplSet([
                            { host: "localhost", port: 32000 },
                            { host: "localhost", port: 32001 },
                            { host: "localhost", port: 32002 }], {
                                setName: "rs",
                                connectionTimeout: 3000,
                                socketTimeout: 0,
                                haInterval: 2000,
                                size: 1,
                                secondaryOnlyConnectionAllowed: true
                            });

                        await new Promise((resolve) => {
                            server.connect();
                            server.once("connect", resolve);
                        });

                        expect(server.lastIsMaster()).to.exist();
                        await server.destroy();
                    } finally {
                        await firstSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        Connection.disableConnectionAccounting();
                        running = false;
                    }
                });
            });
        });
    });
});
