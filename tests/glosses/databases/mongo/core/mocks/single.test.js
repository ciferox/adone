import mongodbVersionManager from "mongodb-version-manager";
import mockupdb from "../mock";
import configuration from "../configuration";

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
    const { core: { Server } } = adone.private(mongo);

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
        describe("single", () => {
            context("timeout", () => {
                it("Should correctly timeout socket operation and then correctly re-execute", async () => {
                    let running = true;
                    // Current index for the ismaster
                    let currentStep = 0;
                    // Primary stop responding
                    let stopRespondingPrimary = false;

                    // Default message fields
                    const defaultFields = {
                        ismaster: true,
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1
                    };

                    // Primary server states
                    const serverIsMaster = [lodash.defaults({}, defaultFields)];

                    const sserver = await mockupdb.createServer(37019, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await sserver.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster && currentStep === 0) {
                                request.reply(serverIsMaster[0]);
                                currentStep += 1;
                            } else if (doc.insert && currentStep === 1) {
                                // Stop responding to any calls (emulate dropping packets on the floor)
                                if (stopRespondingPrimary) {
                                    await adone.promise.delay(3000);
                                    continue;
                                }

                                currentStep += 1;
                            } else if (doc.ismaster && currentStep === 2) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert && currentStep === 2) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(adone.noop);

                    // Start dropping the packets
                    adone.promise.delay(5000).then(() => {
                        stopRespondingPrimary = true;
                    });

                    // Attempt to connect
                    const replset = new Server({
                        host: "localhost",
                        port: 37019,
                        connectionTimeout: 5000,
                        socketTimeout: 1000,
                        size: 1
                    });

                    // Add event listeners
                    replset.on("error", adone.noop);
                    replset.connect();
                    const _server = await waitFor(replset, "connect");
                    const insert = promisify(_server.insert).bind(_server);
                    const e = await insert("test.test", [{ created: new Date() }]).then(() => null, (e) => e);
                    expect(e).to.be.ok();
                    try {
                        for (; ;) {
                            await adone.promise.delay(500);
                            const r = await insert("test.test", [{ created: new Date() }]).catch(adone.noop);
                            if (r) {
                                expect(r.connection.port).to.be.equal(37019);
                                break;
                            }
                        }
                    } finally {
                        await replset.destroy({ force: true });
                        await sserver.destroy();
                        running = false;
                    }
                });

                it.skip("Should correctly recover from an immediate shutdown mid insert", async () => {
                    // Contain mock server
                    let running = true;
                    // Current index for the ismaster
                    let currentStep = 0;
                    // Should fail due to broken pipe
                    let brokenPipe = false;

                    // Default message fields
                    const defaultFields = {
                        ismaster: true,
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1
                    };

                    // Primary server states
                    const serverIsMaster = [lodash.defaults({}, defaultFields)];

                    // Boot the mock
                    (async () => {
                        const server = await mockupdb.createServer(37017, "localhost", {
                            onRead(server, connection, buffer) {
                                // Force EPIPE error
                                if (currentStep == 1) {
                                    // Destroy connection mid write
                                    connection.destroy();
                                    // Reset the mock to accept ismasters
                                    setTimeout(() => {
                                        currentStep += 1;
                                    }, 10);
                                    // Return connection was destroyed
                                    return true;
                                }
                            }
                        });

                        // Primary state machine
                        (async () => {
                            while (running) {
                                const request = await server.receive();
                                // Get the document
                                const doc = request.document;
                                if (doc.ismaster && currentStep == 0) {
                                    currentStep += 1;
                                    request.reply(serverIsMaster[0]);
                                } else if (doc.insert && currentStep == 2) {
                                    currentStep += 1;
                                    request.reply({ ok: 1, n: doc.documents, lastOp: new Date() });
                                } else if (doc.ismaster) {
                                    request.reply(serverIsMaster[0]);
                                }
                            }
                        })();
                    })();

                    // Attempt to connect
                    const server = new Server({
                        host: "localhost",
                        port: "37017",
                        connectionTimeout: 3000,
                        socketTimeout: 2000,
                        size: 1
                    });

                    // console.log("!!!! server connect")
                    const docs = [];
                    // Create big insert message
                    for (let i = 0; i < 1000; i++) {
                        docs.push({
                            a: i,
                            string: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string1: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string2: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string3: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string4: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string5: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string6: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string7: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string8: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string9: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string10: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string11: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string12: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string13: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string14: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string15: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string16: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string17: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string18: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string19: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string20: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string21: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string22: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string23: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string24: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string25: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string26: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string27: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world",
                            string28: "hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world"
                        });
                    }

                    // Add event listeners
                    server.once("connect", (_server) => {
                        _server.insert("test.test", docs, (err) => {
                            // console.log("!!!! insert")
                            expect(err).to.exist();
                            brokenPipe = true;
                        });
                    });

                    server.on("error", adone.noop);
                    server.connect();

                    const _server = await new Promise((resolve) => {
                        server.once("reconnect", resolve);
                    });

                    await promisify(_server.insert).call(_server, "test.test", [{ created: new Date() }]);
                    expect(brokenPipe).to.be.true();
                    await _server.destroy();
                    running = false;
                });
            });
        });
    });
});
