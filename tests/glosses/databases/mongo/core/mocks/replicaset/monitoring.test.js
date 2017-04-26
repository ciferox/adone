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
            context("monitoring", () => {
                it("Should correctly connect to a replicaset where the primary hangs causing monitoring thread to hang", async () => {
                    let running = true;
                    const electionIds = [new adone.data.bson.ObjectID(), new adone.data.bson.ObjectID()];
                    // Current index for the ismaster
                    let currentIsMasterState = 0;
                    // Primary stop responding
                    let stopRespondingPrimary = false;

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: electionIds[currentIsMasterState],
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32000",
                        primary: "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32000",
                        primary: "localhost:32001"
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32001",
                        primary: "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32001",
                        primary: "localhost:32001"
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32001"
                    }, defaultFields)];

                    // Joined servers
                    const joinedPrimaries = {};
                    const joinedSecondaries = {};
                    const leftPrimaries = {};

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();

                            // Stop responding to any calls (emulate dropping packets on the floor)
                            if (stopRespondingPrimary) {
                                await adone.promise.delay(10000);
                                continue;
                            }

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster && currentIsMasterState === 0) {
                                request.reply(primary[currentIsMasterState]);
                            } else if (doc.insert && currentIsMasterState === 0) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date(),
                                    electionId: electionIds[currentIsMasterState]
                                });
                            } else if (doc.insert && currentIsMasterState === 1) {
                                request.reply({
                                    note: "from execCommand",
                                    ok: 0,
                                    errmsg: "not master"
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
                                request.reply(firstSecondary[currentIsMasterState]);
                            } else if (doc.insert && currentIsMasterState === 1) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date(),
                                    electionId: electionIds[currentIsMasterState]
                                });
                            } else if (doc.insert && currentIsMasterState === 0) {
                                request.reply({
                                    note: "from execCommand",
                                    ok: 0,
                                    errmsg: "not master"
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
                                request.reply(secondSecondary[currentIsMasterState]);
                            } else if (doc.insert && currentIsMasterState === 0) {
                                request.reply({
                                    note: "from execCommand",
                                    ok: 0,
                                    errmsg: "not master"
                                });
                            }
                        }
                    })().catch(() => { });

                    // Start dropping the packets
                    adone.promise.delay(5000).then(() => {
                        stopRespondingPrimary = true;
                        currentIsMasterState = 1;
                    });
                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 5000,
                            socketTimeout: 3000,
                            haInterval: 2000,
                            size: 1
                        });
                    adone.promise.delay(100).then(() => {
                        server.connect();
                    });

                    server.on("joined", (type, server) => {
                        if (type === "primary") {
                            joinedPrimaries[server.name] = 1;
                        }
                        if (type === "secondary") {
                            joinedSecondaries[server.name] = 1;
                        }
                    });

                    server.on("left", (type, server) => {
                        if (type === "primary") {
                            leftPrimaries[server.name] = 1;
                        }
                    });

                    const _server = await waitFor(server, "connect");

                    const insert = promisify(_server.insert).bind(_server);
                    for (; ;) {
                        await adone.promise.delay(1);
                        const r = await insert("test.test", [{ created: new Date() }]).catch(() => { });
                        if (r && r.connection.port === 32001) {
                            break;
                        }
                    }
                    try {
                        expect(stopRespondingPrimary).to.be.ok;
                        expect(currentIsMasterState).to.be.equal(1);

                        // Ensure the state is correct
                        expect(joinedPrimaries).to.be.deep.equal({
                            "localhost:32000": 1,
                            "localhost:32001": 1
                        });
                        expect(joinedSecondaries).to.be.deep.equal({
                            "localhost:32001": 1,
                            "localhost:32002": 1
                        });

                    } finally {
                        // Destroy mock
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
            });
        });
    });
});
