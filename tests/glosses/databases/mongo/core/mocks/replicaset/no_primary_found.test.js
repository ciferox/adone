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
        adone.info(`Running tests against MongoDB version ${version}`);
        return configuration.setup();
    });

    after(() => {
        return configuration.teardown();
    });

    describe("mocks", () => {
        describe("replica set", () => {
            context("no primary found", () => {
                it("Should correctly connect to a replicaset where the arbiter hangs no primary found error", async () => {
                    let running = true;

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: new adone.data.bson.ObjectId(),
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        arbiters: ["localhost:32003"]
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

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32003",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");
                    const arbiterServer = await mockupdb.createServer(32003, "localhost");

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
                            await adone.promise.delay(5000);
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
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // Arbiter state machine
                    (async () => {
                        while (running) {
                            await adone.promise.delay(5000);
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    adone.promise.delay(100).then(() => server.connect());
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 }
                    ], {
                        setName: "rs",
                        connectionTimeout: 2000,
                        socketTimeout: 4000,
                        haInterval: 2000,
                        size: 1
                    });
                    server.on("error", () => {
                        throw new Error("should not error out");
                    });

                    // Add event listeners
                    await waitFor(server, "connect");
                    // Destroy mock
                    await primaryServer.destroy();
                    await firstSecondaryServer.destroy();
                    await secondSecondaryServer.destroy();
                    await arbiterServer.destroy();
                    await server.destroy();
                    running = false;
                    Connection.disableConnectionAccounting();
                });
            });
        });
    });
});
