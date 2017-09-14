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
    const { core: { ReplSet, Connection, ReadPreference } } = adone.private(mongo);

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
            context("operation", () => {
                specify("Correctly execute count command against replicaset with a single member", async () => {
                    let running = true;
                    const currentIsMasterIndex = 0;

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

                    const primaryServer = await mockupdb.createServer(32000, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[currentIsMasterIndex]);
                            } else if (doc.count) {
                                request.reply({
                                    ok: 1,
                                    n: 1
                                });
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    let server = new ReplSet([{ host: "localhost", port: 32000 }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 2000,
                        size: 1,
                        disconnectHandler: {
                            add() { }, execute() { }
                        }
                    });
                    adone.promise.delay(100).then(() => server.connect());
                    server = await waitFor(server, "connect");

                    try {
                        await promisify(server.command).call(server, "test.test", { count: "test" });
                    } finally {
                        await primaryServer.destroy();
                        await server.destroy();
                        running = false;

                    }
                });

                specify("Correctly execute count command against replicaset with a single member and secondaryPreferred", async () => {
                    let running = true;
                    const currentIsMasterIndex = 0;

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
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[currentIsMasterIndex]);
                            } else if (doc.count) {
                                request.reply({
                                    ok: 1,
                                    n: 1
                                });
                            }
                        }
                    })().catch(adone.noop);

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    let server = new ReplSet([{ host: "localhost", port: 32000 }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 2000,
                        size: 1,
                        disconnectHandler: {
                            add() { }, execute() { }
                        }
                    });
                    adone.promise.delay(100).then(() => server.connect());

                    server = await waitFor(server, "connect");
                    try {
                        await promisify(server.command).call(server, "test.test", { count: "test" }, { readPreference: ReadPreference.secondaryPreferred });
                    } finally {
                        primaryServer.destroy();
                        server.destroy();
                        running = false;
                    }
                });
            });
        });
    });
});
