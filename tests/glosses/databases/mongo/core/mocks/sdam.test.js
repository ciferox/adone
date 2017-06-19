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


describe("mongodb", function () {
    this.timeout(120000);

    const { database: { mongo: { core: { Server, ReplSet, Mongos } } } } = adone;

    before(async function () {
        this.timeout(999999999); // long enough
        // Kill any running MongoDB processes and `install $MONGODB_VERSION` || `use existing installation` || `install stable`
        const version = await promisify(mongodbVersionManager.current)();
        adone.info(`Running tests against MongoDB version ${version}`);
        return configuration.setup();
    });

    after(() => {
        return configuration.teardown();
    });

    describe("mocks", () => {
        describe("sdam", () => {
            context.skip("mongos", () => {
                specify("SDAM Monitoring Should correctly connect to two proxies", async () => {
                    let running = true;
                    // Current index for the ismaster
                    let currentStep = 0;

                    // Default message fields
                    const defaultFields = {
                        ismaster: true,
                        msg: "isdbgrid",
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
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    const mongos2 = await mockupdb.createServer(52001, "localhost");

                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert && currentStep === 1) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(adone.noop);

                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos2.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(adone.noop);

                    // Attempt to connect
                    const server = new Mongos([
                        { host: "localhost", port: 52000 },
                        { host: "localhost", port: 52001 }
                    ], {
                        connectionTimeout: 3000,
                        socketTimeout: 1500,
                        haInterval: 1000,
                        size: 1
                    });

                    const responses = {};
                    const add = function (a) {
                        if (!responses[a.type]) {
                            responses[a.type] = [];
                        }
                        responses[a.type].push(a.event);
                    };

                    const o = server.emit;
                    server.emit = function (...args) {
                        console.log(args[0]);
                        return o.apply(this, args);
                    };

                    server.on("serverOpening", (event) => {
                        add({ type: "serverOpening", event });
                    });

                    server.on("serverClosed", (event) => {
                        add({ type: "serverClosed", event });
                    });

                    server.on("serverDescriptionChanged", (event) => {
                        add({ type: "serverDescriptionChanged", event });
                    });

                    server.on("topologyOpening", (event) => {
                        add({ type: "topologyOpening", event });
                    });

                    server.on("topologyClosed", (event) => {
                        add({ type: "topologyClosed", event });
                    });

                    server.on("topologyDescriptionChanged", (event) => {
                        add({ type: "topologyDescriptionChanged", event });
                    });

                    server.on("serverHeartbeatStarted", (event) => {
                        add({ type: "serverHeartbeatStarted", event });
                    });

                    server.on("serverHeartbeatSucceeded", (event) => {
                        add({ type: "serverHeartbeatSucceeded", event });
                    });

                    server.on("serverHeartbeatFailed", (event) => {
                        add({ type: "serverHeartbeatFailed", event });
                    });

                    server.on("error", adone.noop);
                    server.connect();

                    const _server = await waitFor(server, "fullsetup");

                    const insert = promisify(server.insert).bind(server);
                    try {
                        for (; ;) {
                            await adone.promise.delay(500);
                            const r = await insert("test.test", [{ created: new Date() }]).catch(adone.noop);
                            if (r) {
                                expect(r.connection.port).to.be.equal(52001);
                                break;
                            }
                        }
                        const proxies = new Set();

                        for (; ;) {
                            await adone.promise.delay(500);
                            if (currentStep === 0) {
                                ++currentStep;
                            }
                            const r = await insert("test.test", [{ created: new Date() }]).catch(adone.noop);
                            if (r) {
                                proxies.add(r.connection.port);
                            }
                            if (proxies.size === 2) {
                                break;
                            }
                        }
                    } finally {
                        await server.destroy();
                        await mongos1.destroy();
                        await mongos2.destroy();
                    }

                    await adone.promise.delay(1000);

                    const results = [{
                        topologyId: _server.s.id,
                        previousDescription: {
                            topologyType: "Sharded",
                            servers: []
                        },
                        newDescription: {
                            topologyType: "Sharded",
                            servers: [
                                {
                                    type: "Mongos",
                                    address: "localhost:52000"
                                },
                                {
                                    type: "Unknown",
                                    address: "localhost:52001"
                                }
                            ]
                        }
                    }, {
                        topologyId: _server.s.id,
                        previousDescription: {
                            topologyType: "Sharded",
                            servers: [
                                {
                                    type: "Mongos",
                                    address: "localhost:52000"
                                },
                                {
                                    type: "Unknown",
                                    address: "localhost:52001"
                                }
                            ]
                        },
                        newDescription: {
                            topologyType: "Sharded",
                            servers: [
                                {
                                    type: "Mongos",
                                    address: "localhost:52000"
                                },
                                {
                                    type: "Mongos",
                                    address: "localhost:52001"
                                }
                            ]
                        }
                    }];
                    running = false;
                    console.log(responses);
                    for (let i = 0; i < responses.topologyDescriptionChanged.length; i++) {
                        expect(results[i]).to.be.deep.equal(responses.topologyDescriptionChanged[i]);
                    }
                });
            });

            context.only("single", () => {
                it("Should correctly emit sdam monitoring events for single server", async () => {
                    const running = true;

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
                    const sserver = await mockupdb.createServer(37018, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await sserver.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            }
                        }
                    })().catch(adone.noop);

                    // Attempt to connect
                    const server = new Server({
                        host: "localhost",
                        port: "37018",
                        connectionTimeout: 3000,
                        socketTimeout: 1000,
                        size: 1
                    });

                    // Results
                    const flags = [];
                    let id = null;

                    // Add event listeners
                    server.once("connect", (_server) => {
                        // console.log("----------------------------- connect")
                        id = _server.id;
                        _server.destroy({ emitClose: true });
                    });

                    server.on("serverOpening", (event) => {
                        // console.log("----------------------------- serverOpening")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[0] = event;
                    });

                    server.on("serverClosed", (event) => {
                        // console.log("----------------------------- serverClosed")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[1] = event;
                    });

                    server.on("serverDescriptionChanged", (event) => {
                        // console.log("----------------------------- serverDescriptionChanged")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[2] = event;
                    });

                    server.on("topologyOpening", (event) => {
                        // console.log("----------------------------- topologyOpening")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[3] = event;
                    });

                    server.on("topologyClosed", (event) => {
                        // console.log("----------------------------- topologyClosed")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[4] = event;
                    });

                    server.on("topologyDescriptionChanged", (event) => {
                        // console.log("----------------------------- topologyDescriptionChanged")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[5] = event;
                    });

                    server.on("error", adone.noop);
                    server.connect();

                    await waitFor(server, "close");
                    await adone.promise.delay(100);
                    try {

                        expect(flags[0]).to.be.deep.equal({
                            topologyId: id,
                            address: "localhost:37018"
                        });
                        expect(flags[1]).to.be.deep.equal({
                            topologyId: id,
                            address: "localhost:37018"
                        });
                        expect(flags[2]).to.be.deep.equal({
                            topologyId: id,
                            address: "localhost:37018",
                            previousDescription: {
                                address: "localhost:37018",
                                arbiters: [],
                                hosts: [],
                                passives: [],
                                type: "Unknown"
                            },
                            newDescription: {
                                address: "localhost:37018",
                                arbiters: [],
                                hosts: [],
                                passives: [],
                                type: "Standalone"
                            }
                        });
                        expect(flags[3]).to.be.deep.equal({
                            topologyId: id
                        });
                        expect(flags[4]).to.be.deep.equal({
                            topologyId: id
                        });
                        expect(flags[5]).to.be.deep.equal({
                            topologyId: id,
                            address: "localhost:37018",
                            previousDescription: {
                                topologyType: "Unknown",
                                servers: [{
                                    address: "localhost:37018",
                                    arbiters: [],
                                    hosts: [],
                                    passives: [],
                                    type: "Unknown"
                                }]
                            },
                            newDescription: {
                                topologyType: "Single",
                                servers: [{
                                    address: "localhost:37018",
                                    arbiters: [],
                                    hosts: [],
                                    passives: [],
                                    type: "Standalone"
                                }]
                            }
                        });
                    } finally {
                        await sserver.destroy();
                    }
                });

                it("Should correctly emit sdam monitoring events for single server, with correct server type", async () => {
                    let running = true;
                    // Current index for the ismaster

                    // Default message fields
                    const defaultFields = {
                        ismaster: true,
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: ["localhost:37008"]  // <-- this makes it an RSPrimary
                    };

                    // Primary server states
                    const serverIsMaster = [Object.assign({}, defaultFields)];

                    // Boot the mock
                    const mockServer = await mockupdb.createServer(37008, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await mockServer.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            }
                        }
                    })();

                    // Attempt to connect
                    const server = new Server({
                        host: "localhost",
                        port: "37008",
                        connectionTimeout: 3000,
                        socketTimeout: 1000,
                        size: 1
                    });

                    // Results
                    const flags = [];
                    let id = null;

                    // Add event listeners
                    server.once("connect", (_server) => {
                        id = _server.id;
                        _server.destroy({ emitClose: true });
                    });

                    server.on("serverOpening", (event) => {
                        flags[0] = event;
                    });

                    server.on("serverClosed", (event) => {
                        flags[1] = event;
                    });

                    server.on("serverDescriptionChanged", (event) => {
                        flags[2] = event;
                    });

                    server.on("topologyOpening", (event) => {
                        flags[3] = event;
                    });

                    server.on("topologyClosed", (event) => {
                        flags[4] = event;
                    });

                    server.on("topologyDescriptionChanged", (event) => {
                        flags[5] = event;
                    });

                    adone.promise.delay(100).then(() => server.connect());

                    server.on("error", () => { });

                    await new Promise((resolve) => server.on("close", resolve));
                    await adone.promise.delay(100);

                    try {

                        expect(flags[0]).to.be.deep.equal({ topologyId: id, address: "localhost:37008" });
                        expect(flags[1]).to.be.deep.equal({ topologyId: id, address: "localhost:37008" });
                        expect(flags[2]).to.be.deep.equal({
                            topologyId: id, address: "localhost:37008",
                            previousDescription: {
                                address: "localhost:37008",
                                arbiters: [],
                                hosts: [],
                                passives: [],
                                type: "Unknown"
                            },
                            newDescription: {
                                address: "localhost:37008",
                                arbiters: [],
                                hosts: [],
                                passives: [],
                                type: "RSPrimary"
                            }
                        });
                        expect(flags[3]).to.be.deep.equal({ topologyId: id });
                        expect(flags[4]).to.be.deep.equal({ topologyId: id });
                        expect(flags[5]).to.be.deep.equal({
                            topologyId: id, address: "localhost:37008",
                            previousDescription: {
                                topologyType: "Unknown",
                                servers: [
                                    {
                                        address: "localhost:37008",
                                        arbiters: [],
                                        hosts: [],
                                        passives: [],
                                        type: "Unknown"
                                    }
                                ]
                            },
                            newDescription: {
                                topologyType: "Single",
                                servers: [
                                    {
                                        address: "localhost:37008",
                                        arbiters: [],
                                        hosts: [],
                                        passives: [],
                                        type: "RSPrimary"
                                    }
                                ]
                            }
                        });
                    } finally {
                        running = false;
                    }
                });
            });

            context("replica set", () => {
                specify("Successful emit SDAM monitoring events for replicaset", async () => {
                    const running = true;
                    const electionIds = [new adone.data.bson.ObjectId(), new adone.data.bson.ObjectId()];

                    /// Default message fields
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
                        hosts: ["localhost:32000", "localhost:32001"],
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
                    }, defaultFields), lodash.defaults({
                        ismaster: true,
                        secondary: false,
                        me: "localhost:32001",
                        primary: "localhost:32001",
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
                    }, defaultFields), lodash.defaults({
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
                        primary: "localhost:32001"
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
                                request.reply(primary[step]);
                            }
                        }
                    })().catch(adone.noop);

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[step]);
                            }
                        }
                    })().catch(adone.noop);

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[step]);
                            }
                        }
                    })().catch(adone.noop);

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

                    const responses = {};
                    let step = 0;
                    const add = function (a) {
                        if (!responses[a.type]) {
                            responses[a.type] = [];
                        }
                        responses[a.type].push(a.event);
                    };

                    server.on("serverOpening", (event) => {
                        add({ type: "serverOpening", event });
                        // console.log("----------------------------- serverOpening")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[0] = event;
                    });

                    server.on("serverClosed", (event) => {
                        add({ type: "serverClosed", event });
                        // console.log("----------------------------- serverClosed")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[1] = event;
                    });

                    server.on("serverDescriptionChanged", (event) => {
                        add({ type: "serverDescriptionChanged", event });
                        // console.log("----------------------------- serverDescriptionChanged")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[2] = event;
                    });

                    server.on("topologyOpening", (event) => {
                        add({ type: "topologyOpening", event });
                        // console.log("----------------------------- topologyOpening")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[3] = event;
                    });

                    server.on("topologyClosed", (event) => {
                        add({ type: "topologyClosed", event });
                        // console.log("----------------------------- topologyClosed")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[4] = event;
                    });

                    server.on("topologyDescriptionChanged", (event) => {
                        add({ type: "topologyDescriptionChanged", event });
                        // console.log("----------------------------- topologyDescriptionChanged")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[5] = event;
                    });

                    server.on("serverHeartbeatStarted", (event) => {
                        add({ type: "serverHeartbeatStarted", event });
                        // console.log("----------------------------- serverHeartbeatStarted")
                        // console.log(JSON.stringify(event, null, 2))
                    });

                    server.on("serverHeartbeatSucceeded", (event) => {
                        add({ type: "serverHeartbeatSucceeded", event });
                        // console.log("----------------------------- serverHeartbeatSucceeded")
                        // console.log(JSON.stringify(event, null, 2))
                    });

                    server.on("serverHeartbeatFailed", (event) => {
                        add({ type: "serverHeartbeatFailed", event });
                        // console.log("----------------------------- serverHeartbeatFailed")
                        // console.log(JSON.stringify(event, null, 2))
                    });

                    adone.promise.delay(100).then(() => server.connect());

                    const document1 = {
                        topologyId: server.id,
                        previousDescription: {
                            topologyType: "Unknown",
                            servers: []
                        },
                        newDescription: {
                            topologyType: "Unknown",
                            setName: "rs",
                            servers: [
                                {
                                    type: "RSPrimary",
                                    address: "localhost:32000",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                }
                            ]
                        },
                        diff: {
                            servers: [
                                {
                                    address: "localhost:32000",
                                    from: "Unknown",
                                    to: "RSPrimary"
                                }
                            ]
                        }
                    };

                    const document2 = {
                        topologyId: server.id,
                        previousDescription: {
                            topologyType: "Unknown",
                            setName: "rs",
                            servers: [
                                {
                                    type: "RSPrimary",
                                    address: "localhost:32000",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                }
                            ]
                        },
                        newDescription: {
                            topologyType: "ReplicaSetWithPrimary",
                            setName: "rs",
                            servers: [
                                {
                                    type: "RSPrimary",
                                    address: "localhost:32000",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSSecondary",
                                    address: "localhost:32001",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                }
                            ]
                        },
                        diff: {
                            servers: [
                                {
                                    address: "localhost:32001",
                                    from: "Unknown",
                                    to: "RSSecondary"
                                }
                            ]
                        }
                    };

                    const document3 = {
                        topologyId: server.id,
                        previousDescription: {
                            topologyType: "ReplicaSetWithPrimary",
                            setName: "rs",
                            servers: [
                                {
                                    type: "RSPrimary",
                                    address: "localhost:32000",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSSecondary",
                                    address: "localhost:32001",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                }
                            ]
                        },
                        newDescription: {
                            topologyType: "ReplicaSetWithPrimary",
                            setName: "rs",
                            servers: [
                                {
                                    type: "RSPrimary",
                                    address: "localhost:32000",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSSecondary",
                                    address: "localhost:32001",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSArbiter",
                                    address: "localhost:32002",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                }
                            ]
                        },
                        diff: {
                            servers: [
                                {
                                    address: "localhost:32002",
                                    from: "Unknown",
                                    to: "RSArbiter"
                                }
                            ]
                        }
                    };

                    const document4 = {
                        topologyId: server.id,
                        previousDescription: {
                            topologyType: "ReplicaSetWithPrimary",
                            setName: "rs",
                            servers: [
                                {
                                    type: "RSPrimary",
                                    address: "localhost:32000",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSSecondary",
                                    address: "localhost:32001",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSArbiter",
                                    address: "localhost:32002",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                }
                            ]
                        },
                        newDescription: {
                            topologyType: "ReplicaSetNoPrimary",
                            setName: "rs",
                            servers: [
                                {
                                    type: "RSSecondary",
                                    address: "localhost:32001",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSSecondary",
                                    address: "localhost:32000",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSArbiter",
                                    address: "localhost:32002",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                }
                            ]
                        },
                        diff: {
                            servers: [
                                {
                                    address: "localhost:32000",
                                    from: "RSPrimary",
                                    to: "RSSecondary"
                                }
                            ]
                        }
                    };

                    const document5 = {
                        topologyId: server.id,
                        previousDescription: {
                            topologyType: "ReplicaSetNoPrimary",
                            setName: "rs",
                            servers: [
                                {
                                    type: "RSSecondary",
                                    address: "localhost:32001",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSSecondary",
                                    address: "localhost:32000",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSArbiter",
                                    address: "localhost:32002",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                }
                            ]
                        },
                        newDescription: {
                            topologyType: "ReplicaSetWithPrimary",
                            setName: "rs",
                            servers: [
                                {
                                    type: "RSPrimary",
                                    address: "localhost:32001",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSSecondary",
                                    address: "localhost:32000",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                },
                                {
                                    type: "RSArbiter",
                                    address: "localhost:32002",
                                    hosts: [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    arbiters: [
                                        "localhost:32002"
                                    ],
                                    setName: "rs"
                                }
                            ]
                        },
                        diff: {
                            servers: [
                                {
                                    address: "localhost:32001",
                                    from: "RSSecondary",
                                    to: "RSPrimary"
                                }
                            ]
                        }
                    };

                    const expectedResults = [document1, document2, document3, document4, document5];

                    const _server = await waitFor(server, "fullsetup");

                    await adone.promise.delay(1000);
                    ++step;
                    await adone.promise.delay(5);
                    ++step;
                    await adone.promise.delay(2000);
                    try {
                        try {
                            expect(responses.serverOpening.length).to.be.at.least(3);
                        } finally {
                            await _server.destroy();
                        }
                        // Wait to ensure all events fired
                        await adone.promise.delay(1000);
                        expect(responses.serverOpening.length).to.be.at.least(3);
                        expect(responses.serverClosed.length).to.be.at.least(3);
                        expect(responses.topologyOpening.length).to.be.be.equal(1);
                        expect(responses.topologyClosed.length).to.be.equal(1);
                        expect(responses.serverHeartbeatStarted).not.to.be.empty;
                        expect(responses.serverHeartbeatSucceeded).not.to.be.empty;
                        expect(responses.serverDescriptionChanged).not.to.be.empty;

                        for (let i = 0; i < expectedResults.length; i++) {
                            expect(expectedResults[i]).to.be.deep.equal(responses.topologyDescriptionChanged[i]);
                        }
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await arbiterServer.destroy();
                    }
                });
            });
        });
    });
});
