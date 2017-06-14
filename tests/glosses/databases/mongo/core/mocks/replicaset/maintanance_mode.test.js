import mongodbVersionManager from "mongodb-version-manager";
import mockupdb from "../../mock";
import configuration from "../../configuration";

const {
    vendor: { lodash }
} = adone;
const promisify = adone.promise.promisify;


describe("mongodb", function () {
    this.timeout(120000);

    const { database: { mongo: { core: { ReplSet, Connection } } } } = adone;

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
            context("maintanance mode", () => {
                specify("Successfully detect server in maintanance mode", async () => {
                    let running = true;
                    let currentIsMasterIndex = 0;

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: new adone.data.bson.ObjectId(),
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002", "localhost:32003"],
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
                    }, defaultFields), lodash.defaults({
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
                        me: "localhost:32003",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }, defaultFields), {
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: false,
                        me: "localhost:32003",
                        primary: "localhost:32000",
                        tags: {
                            loc: "sf"
                        }
                    }];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32003, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(adone.noop);

                    // Arbiter state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[currentIsMasterIndex]);
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

                    // Joined
                    let joined = 0;

                    await new Promise((resolve) => {
                        server.on("joined", () => {
                            joined = joined + 1;
                            // primary, secondary and arbiter have joined
                            if (joined === 4) {
                                resolve();
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(2);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");
                        expect(server.s.replicaSetState.secondaries[1].name).to.be.equal("localhost:32003");
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");
                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        currentIsMasterIndex = currentIsMasterIndex + 1;
                        await new Promise((resolve) => {
                            server.on("left", (_type, _server) => {
                                if (_type === "secondary" && _server.name === "localhost:32003") {
                                    resolve();
                                }
                            });
                        });
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await secondSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        running = false;
                        await adone.promise.delay(2000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });
            });
        });
    });
});
