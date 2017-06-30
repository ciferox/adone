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
            context("all servers close", () => {
                specify("Successful reconnect when driver looses touch with entire replicaset", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];
                    let die = false;

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
                            if (die) {
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(primary[0]);
                                } else if (doc.insert) {
                                    request.reply({ ok: 1, n: 1 });
                                }
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            if (die) {
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(firstSecondary[0]);
                                }
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            if (die) {
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(arbiter[0]);
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
                            connectionTimeout: 2000,
                            socketTimeout: 2000,
                            haInterval: 500,
                            size: 500
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(2500);
                    die = true;
                    await adone.promise.delay(2500);
                    die = false;
                    await adone.promise.delay(12000);
                    try {
                        await promisify(_server.command).call(_server, "admin.$cmd", { ismaster: true });
                        expect(_server.s.replicaSetState.primary).not.to.be.null;
                        expect(_server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(_server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Successfully come back from a dead replicaset that has been unavailable for a long time", async () => {
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];
                    let die = false;
                    let running = true;

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
                        hosts: ["localhost:34000", "localhost:34001", "localhost:34002"],
                        arbiters: ["localhost:34002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:34000",
                        primary: "localhost:34000",
                        tags: { loc: "ny" }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:34001",
                        primary: "localhost:34000",
                        tags: { loc: "sf" }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:34002",
                        primary: "localhost:34000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(34000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(34001, "localhost");
                    const arbiterServer = await mockupdb.createServer(34002, "localhost");
                    // Boot the mock
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            if (die) {
                                // console.log("------------------ die 1")
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(primary[0]);
                                }
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            if (die) {
                                // console.log("------------------ die 2")
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(firstSecondary[0]);
                                }
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            if (die) {
                                // console.log("------------------ die 3")
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(arbiter[0]);
                                }
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 34000 },
                        { host: "localhost", port: 34001 },
                        { host: "localhost", port: 34002 }], {
                            setName: "rs",
                            connectionTimeout: 5000,
                            socketTimeout: 5000,
                            haInterval: 1000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    await waitFor(server, "connect");
                    await adone.promise.delay(2500);
                    die = true;
                    adone.promise.delay(25000).then(() => die = false);
                    try {
                        for (let i = 0; i < 15; ++i) {
                            server.command("admin.$cmd", { ismaster: true }, adone.noop);
                            await adone.promise.delay(2000);
                        }
                        await promisify(server.command).call(server, "admin.$cmd", { ismaster: true });
                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        running = false;
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });
            });
        });
    });
});
