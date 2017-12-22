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
    const { core: { Server, ReplSet, Connection } } = adone.private(mongo);

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
            context("failover", () => {
                specify("Successfully failover to new primary", async () => {
                    let running = true;
                    let currentIsMasterIndex = 0;

                    // Election Ids
                    const electionIds = [new adone.data.bson.ObjectId(0), new adone.data.bson.ObjectId(1)];
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
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: {
                            loc: "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32000",
                        primary: "localhost:32001",
                        tags: {
                            loc: "ny"
                        },
                        electionId: electionIds[1]
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
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32001",
                        primary: "localhost:32001",
                        tags: {
                            loc: "ny"
                        },
                        electionId: electionIds[1]
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32001",
                        tags: {
                            loc: "ny"
                        },
                        electionId: electionIds[1]
                    }, defaultFields)];

                    // Die
                    let die = false;

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(primary[currentIsMasterIndex]);
                                }
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(firstSecondary[currentIsMasterIndex]);
                                }
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(secondSecondary[currentIsMasterIndex]);
                                }
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

                    Server.enableServerAccounting();

                    adone.promise.delay(100).then(() => server.connect());
                    server.on("error", adone.noop);
                    await waitFor(server, "connect");
                    server.__connected = true;
                    await adone.promise.delay(100);

                    die = true;
                    currentIsMasterIndex = currentIsMasterIndex + 1;

                    // Keep the count of joined events
                    let joinedEvents = 0;

                    adone.promise.delay(2500).then(() => {
                        die = false;
                        currentIsMasterIndex = currentIsMasterIndex + 1;
                    });

                    // Add listener
                    await new Promise((resolve) => {
                        server.on("joined", (_type, _server) => {
                            if (_type === "secondary" && _server.name === "localhost:32000") {
                                joinedEvents = joinedEvents + 1;
                            } else if (_type === "primary" && _server.name === "localhost:32001") {
                                joinedEvents = joinedEvents + 1;
                            } else if (_type === "secondary" && _server.name === "localhost:32002") {
                                joinedEvents = joinedEvents + 1;
                            }

                            // Got both events
                            if (joinedEvents === 3) {
                                resolve();
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(2);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.oneOf(["localhost:32002", "localhost:32000"]);
                        expect(server.s.replicaSetState.secondaries[1].name).to.be.oneOf(["localhost:32002", "localhost:32000"]);
                        expect(server.s.replicaSetState.primary).not.to.be.null();
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32001");
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await secondSecondaryServer.destroy();
                        await server.destroy();
                        running = false;
                        Server.disableServerAccounting();
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty();
                    }
                });

                specify("Successfully failover to new primary and emit reconnect event", async () => {
                    let running = true;
                    let currentIsMasterIndex = 0;

                    // Election Ids
                    const electionIds = [new adone.data.bson.ObjectId(0), new adone.data.bson.ObjectId(1)];
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
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32000",
                        primary: "localhost:32000",
                        tags: {
                            loc: "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32000",
                        primary: "localhost:32001",
                        tags: {
                            loc: "ny"
                        },
                        electionId: electionIds[1]
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
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32001",
                        primary: "localhost:32001",
                        tags: {
                            loc: "ny"
                        },
                        electionId: electionIds[1]
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32001",
                        tags: {
                            loc: "ny"
                        },
                        electionId: electionIds[1]
                    }, defaultFields)];

                    // Die
                    let die = false;

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(primary[currentIsMasterIndex]);
                                }
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(firstSecondary[currentIsMasterIndex]);
                                }
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(secondSecondary[currentIsMasterIndex]);
                                }
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

                    Server.enableServerAccounting();
                    adone.promise.delay(100).then(() => server.connect());

                    await waitFor(server, "connect");
                    await adone.promise.delay(100);

                    die = true;
                    currentIsMasterIndex = currentIsMasterIndex + 1;

                    adone.promise.delay(2500).then(() => {
                        die = false;
                        currentIsMasterIndex = currentIsMasterIndex + 1;
                    });

                    // Keep the count of joined events
                    await waitFor(server, "reconnect");
                    await primaryServer.destroy();
                    await firstSecondaryServer.destroy();
                    await secondSecondaryServer.destroy();
                    await server.destroy();
                    running = false;

                    Server.disableServerAccounting();
                    await adone.promise.delay(1000);
                    expect(Connection.connections()).to.be.empty();
                    Connection.disableConnectionAccounting();
                });
            });
        });
    });
});
