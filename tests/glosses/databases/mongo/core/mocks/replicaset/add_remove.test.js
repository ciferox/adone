import mongodbVersionManager from "mongodb-version-manager";
import mockupdb from "../../mock";

import configuration from "../../configuration";
const {
    is,
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
            context("add remove", () => {
                specify("Successfully add a new secondary server to the set", async () => {

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: new adone.data.bson.ObjectID(),
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: [
                            "localhost:32000",
                            "localhost:32001",
                            "localhost:32002"
                        ],
                        arbiters: ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [
                        lodash.defaults({
                            ismaster: true,
                            secondary: false,
                            me: "localhost:32000",
                            primary: "localhost:32000",
                            tags: {
                                loc: "ny"
                            }
                        }, defaultFields),
                        lodash.defaults({
                            ismaster: true,
                            secondary: false,
                            me: "localhost:32000",
                            primary: "localhost:32000",
                            tags: {
                                loc: "ny"
                            },
                            hosts: [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            setVersion: 2
                        }, defaultFields)
                    ];

                    // Primary server states
                    const firstSecondary = [
                        lodash.defaults({
                            ismaster: false,
                            secondary: true,
                            me: "localhost:32001",
                            primary: "localhost:32000",
                            tags: {
                                loc: "sf"
                            }
                        }, defaultFields),
                        lodash.defaults({
                            ismaster: false,
                            secondary: true,
                            me: "localhost:32001",
                            primary: "localhost:32000",
                            tags: {
                                loc: "sf"
                            },
                            hosts: [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            setVersion: 2
                        }, defaultFields)
                    ];

                    // Primary server states
                    const secondSecondary = [
                        lodash.defaults({
                            ismaster: false,
                            secondary: true,
                            me: "localhost:32003",
                            primary: "localhost:32000",
                            tags: {
                                loc: "sf"
                            },
                            hosts: [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            setVersion: 2
                        }, defaultFields)
                    ];

                    // Primary server states
                    const arbiter = [
                        lodash.defaults({
                            ismaster: false,
                            secondary: false,
                            arbiterOnly: true,
                            me: "localhost:32002",
                            primary: "localhost:32000"
                        }, defaultFields),
                        lodash.defaults({
                            ismaster: false,
                            secondary: false,
                            arbiterOnly: true,
                            me: "localhost:32002",
                            primary: "localhost:32000",
                            hosts: [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            setVersion: 2
                        }, defaultFields)
                    ];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32003, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    let running = true;
                    let currentIsMasterIndex = 0;

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
                                request.reply(secondSecondary[0]);
                            }
                        }
                    })().catch(adone.noop);

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
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    },
                    {
                        host: "localhost",
                        port: 32001
                    },
                    {
                        host: "localhost",
                        port: 32002
                    }
                    ], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    const secondaries = {};
                    const arbiters = {};

                    server.on("error", adone.noop);
                    server.on("connect", () => {
                        server.__connected = true;
                    });
                    server.on("fullsetup", adone.noop);

                    adone.promise.delay(500).then(() => server.connect());
                    try {
                        await new Promise((resolve) => {
                            server.on("joined", (_type, _server) => {
                                if (_type === "arbiter") {
                                    arbiters[_server.name] = _server;
                                    // Flip the ismaster message
                                    currentIsMasterIndex = currentIsMasterIndex + 1;
                                } else if (_type === "secondary") {
                                    // test.equal(true, server.__connected);
                                    secondaries[_server.name] = _server;
                                    if (Object.keys(secondaries).length === 2) {
                                        resolve();
                                    }
                                }
                            });
                        });
                        expect(secondaries).to.have.property("localhost:32001");
                        expect(secondaries).to.have.property("localhost:32003");
                        expect(arbiters).to.have.property("localhost:32002");
                    } finally {
                        running = false;
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await secondSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();

                        await adone.promise.delay(3000);
                        expect(Connection.connections()).to.be.empty;
                        Connection.disableConnectionAccounting();
                    }
                });

                specify("Successfully remove a secondary server from the set", async () => {
                    let running = true;
                    let currentIsMasterIndex = 0;

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: new adone.data.bson.ObjectID(),
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: [
                            "localhost:32000",
                            "localhost:32001",
                            "localhost:32002",
                            "localhost:32003"
                        ],
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
                        },
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        setVersion: 2
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
                        },
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        setVersion: 2
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
                        ismaster: true,
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1
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
                        primary: "localhost:32000",
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        setVersion: 2
                    }, defaultFields)];

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
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    },
                    {
                        host: "localhost",
                        port: 32001
                    },
                    {
                        host: "localhost",
                        port: 32002
                    }
                    ], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });


                    adone.promise.delay(500).then(() => server.connect());

                    // Joined
                    let joined = 0;

                    const joinedp = new Promise((resolve) => {
                        server.on("joined", () => {
                            joined = joined + 1;
                            if (joined === 4) {
                                resolve();
                            }
                        });
                    });

                    const leftp = new Promise((resolve) => {
                        server.on("left", (_type, _server) => {
                            if (_type === "secondary" && _server.name === "localhost:32003") {
                                resolve();
                            }
                        });
                    });
                    try {
                        await joinedp;
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(2);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");
                        expect(server.s.replicaSetState.secondaries[1].name).to.be.equal("localhost:32003");
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");
                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                        currentIsMasterIndex = currentIsMasterIndex + 1;

                        await leftp;
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");
                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await secondSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Successfully remove and re-add secondary server to the set", async () => {
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: new adone.data.bson.ObjectID(),
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
                        },
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        setVersion: 2
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
                        },
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        setVersion: 2
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
                        ismaster: true,
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1
                    }, lodash.defaults({
                        ismaster: false,
                        secondary: true,
                        me: "localhost:32003",
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
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000",
                        hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
                        setVersion: 2
                    }, defaultFields), lodash.defaults({
                        ismaster: false,
                        secondary: false,
                        arbiterOnly: true,
                        me: "localhost:32002",
                        primary: "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32003, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    // Primary state machine
                    let running = true;
                    let currentIsMasterIndex = 0;
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

                    adone.promise.delay(500).then(() => server.connect());
                    try {
                        const p = new Promise((resolve) => {
                            server.on("left", (_type, _server) => {
                                if (_type === "secondary" && _server.name === "localhost:32003") {
                                    expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                                    expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                                    expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                                    expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");

                                    expect(server.s.replicaSetState.primary).to.be.ok;
                                    expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                                    currentIsMasterIndex = currentIsMasterIndex + 1;
                                    resolve();
                                }
                            });
                        });
                        await adone.promise.delay(3000);
                        expect(server.s.replicaSetState.set["localhost:32000"].type).to.be.equal("RSPrimary");
                        expect(server.s.replicaSetState.set["localhost:32001"].type).to.be.equal("RSSecondary");
                        expect(server.s.replicaSetState.set["localhost:32002"].type).to.be.equal("RSArbiter");
                        expect(server.s.replicaSetState.set["localhost:32003"].type).to.be.equal("RSSecondary");
                        currentIsMasterIndex = currentIsMasterIndex + 1;
                        await p;
                        await adone.promise.delay(6000);
                        expect(server.s.replicaSetState.set["localhost:32000"].type).to.be.equal("RSPrimary");
                        expect(server.s.replicaSetState.set["localhost:32001"].type).to.be.equal("RSSecondary");
                        expect(server.s.replicaSetState.set["localhost:32002"].type).to.be.equal("RSArbiter");
                        expect(server.s.replicaSetState.set["localhost:32003"].type).to.be.equal("RSSecondary");
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(2);
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.primary).to.be.ok;
                        // Ensure we have 4 interval ids and
                        const intervalIds = server.intervalIds.filter((x) => !is.undefined(x.__host));

                        expect(intervalIds).to.have.lengthOf(4);
                        const hosts = intervalIds.map((x) => x.__host);

                        expect(hosts).to.include("localhost:32000");
                        expect(hosts).to.include("localhost:32001");
                        expect(hosts).to.include("localhost:32002");
                        expect(hosts).to.include("localhost:32003");
                    } finally {
                        await primaryServer.destroy();
                        await firstSecondaryServer.destroy();
                        await secondSecondaryServer.destroy();
                        await arbiterServer.destroy();
                        await server.destroy();
                        running = false;
                        await adone.promise.delay(3000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify.only("Successfully add a new secondary server to the set and ensure ha Monitoring happens", async () => {
                    // Contain mock server
                    let running = true;
                    let currentIsMasterIndex = 0;

                    // Default message fields
                    const defaultFields = {
                        setName: "rs",
                        setVersion: 1,
                        electionId: new adone.data.bson.ObjectID(),
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1,
                        hosts: [
                            "localhost:32000",
                            "localhost:32001",
                            "localhost:32002"
                        ],
                        arbiters: [
                            "localhost:32002"
                        ]
                    };

                    // Primary server states
                    const primary = [
                        Object.assign({}, defaultFields, {
                            ismaster: true,
                            secondary: false,
                            me: "localhost:32000",
                            primary: "localhost:32000",
                            tags: { loc: "ny" }
                        }),
                        Object.assign({}, defaultFields, {
                            ismaster: true,
                            secondary: false,
                            me: "localhost:32000",
                            primary: "localhost:32000",
                            tags: { loc: "ny" },
                            hosts: [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            setVersion: 2
                        })
                    ];

                    // Primary server states
                    const firstSecondary = [
                        Object.assign({}, defaultFields, {
                            ismaster: false,
                            secondary: true,
                            me: "localhost:32001",
                            primary: "localhost:32000",
                            tags: { loc: "sf" }
                        }),
                        Object.assign({}, defaultFields, {
                            ismaster: false,
                            secondary: true,
                            me: "localhost:32001",
                            primary: "localhost:32000",
                            tags: { loc: "sf" },
                            hosts: [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            setVersion: 2
                        })
                    ];

                    // Primary server states
                    const secondSecondary = [
                        Object.assign({}, defaultFields, {
                            ismaster: false,
                            secondary: true,
                            me: "localhost:32003",
                            primary: "localhost:32000",
                            tags: { loc: "sf" },
                            hosts: [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            setVersion: 2
                        })
                    ];

                    // Primary server states
                    const arbiter = [
                        Object.assign({}, defaultFields, {
                            ismaster: false,
                            secondary: false,
                            arbiterOnly: true,
                            me: "localhost:32002",
                            primary: "localhost:32000"
                        }),
                        Object.assign({}, defaultFields, {
                            ismaster: false,
                            secondary: false,
                            arbiterOnly: true,
                            me: "localhost:32002",
                            primary: "localhost:32000",
                            hosts: [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            setVersion: 2
                        })
                    ];

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
                    })().catch((err) => {
                        // console.log(err.stack);
                    });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch((err) => {
                        // console.log(err.stack);
                    });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            }
                        }
                    })().catch((err) => {
                        // console.log(err.stack);
                    });

                    // Arbiter state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[currentIsMasterIndex]);
                            }
                        }
                    })().catch((err) => {
                        // console.log(err.stack);
                    });

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

                    const secondaries = {};
                    const arbiters = {};
                    const allservers = {};

                    adone.promise.delay(100).then(() => server.connect());

                    const heartbeat = new Promise((resolve) => {
                        server.on("serverHeartbeatStarted", (description) => {
                            allservers[description.connectionId] = true;
                            if (allservers["localhost:32003"]) {
                                resolve();
                            }
                        });
                    });


                    server.on("error", () => {
                    });

                    server.on("connect", (e) => {
                        server.__connected = true;
                    });

                    // Add event listeners
                    server.on("fullsetup", (_server) => { });


                    await new Promise((resolve) => {
                        server.on("joined", (_type, _server) => {
                            if (_type == "arbiter") {
                                arbiters[_server.name] = _server;
                                // Flip the ismaster message
                                currentIsMasterIndex = currentIsMasterIndex + 1;
                            } else if (_type == "secondary") {
                                // test.equal(true, server.__connected);
                                secondaries[_server.name] = _server;
                                if (Object.keys(secondaries).length == 2) {
                                    resolve();
                                }
                            }
                        });
                    });

                    expect(secondaries).to.have.property("localhost:32001");
                    expect(secondaries).to.have.property("localhost:32003");
                    expect(arbiters).to.have.property("localhost:32002");

                    await heartbeat;
                    running = false;
                    await primaryServer.destroy();
                    await firstSecondaryServer.destroy();
                    await secondSecondaryServer.destroy();
                    await arbiterServer.destroy();
                    await server.destroy();
                    await adone.promise.delay(3000);
                    expect(Connection.connections()).to.be.empty;
                });
            });
        });
    });
});
