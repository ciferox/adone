import mongodbVersionManager from "mongodb-version-manager";
import mockupdb from "../mock";
import configuration from "../configuration";

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
    const { core: { Mongos, ReadPreference } } = adone.private(mongo);

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
        describe("mongos", () => {
            context("single proxy connection", () => {
                it("Should correctly timeout mongos socket operation and then correctly re-execute", async () => {
                    const Mongos = configuration.require.Mongos;
                    let running = true;
                    let currentStep = 0;
                    let stopRespondingPrimary = false;
                    const extend = function (template, fields) {
                        for (const name in template) {
                            fields[name] = template[name];
                        }
                        return fields;
                    };

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
                    const serverIsMaster = [extend(defaultFields, {})];
                    const server = await mockupdb.createServer(52000, "localhost");

                    (async () => {
                        adone.promise.delay(500).then(() => {
                            stopRespondingPrimary = true;
                        });
                        while (running) {
                            const request = await server.receive();

                            // Get the document
                            const doc = request.document;
                            const r = request.connection.emit;

                            request.connection.emit = function (...args) {
                                return r.apply(this, args);
                            };
                            if (doc.ismaster && currentStep === 0) {
                                request.reply(serverIsMaster[0]);
                                currentStep += 1;
                            } else if (doc.insert && currentStep === 1) {
                                // Stop responding to any calls (emulate dropping packets on the floor)
                                if (stopRespondingPrimary) {
                                    currentStep += 1;
                                    stopRespondingPrimary = false;
                                    // Timeout after 1500 ms
                                    await adone.promise.delay(1500);
                                    request.connection.destroy();
                                }
                            } else if (doc.ismaster) {
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

                    const _server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                        connectionTimeout: 3000,
                        socketTimeout: 3000,
                        haInterval: 500,
                        size: 1
                    });

                    // Are we done
                    let done = false;

                    await new Promise((resolve) => {
                        _server.once("connect", resolve);
                        _server.on("error", adone.noop);
                        _server.connect();
                    });
                    try {
                        for (; !done;) {
                            await promisify(_server.insert).call(_server, "test.test", [{
                                created: new Date()
                            }]).then((r) => {
                                if (r && !done) {
                                    done = true;
                                    expect(r.connection.port).to.be.equal(52000);
                                    running = false;
                                }
                            }, adone.noop);
                            await adone.promise.delay(500);
                        }
                    } finally {
                        await server.destroy();
                        await _server.destroy();
                    }
                });

                it("Should not fail due to available connections equal to 0 during ha process", async () => {
                    // Primary server states
                    const serverIsMaster = [{
                        ismaster: true,
                        msg: "isdbgrid",
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 4,
                        minWireVersion: 0,
                        ok: 1
                    }];
                    const server = await mockupdb.createServer(52000, "localhost");
                    let running = true;
                    (async () => {
                        while (running) {
                            const request = await server.receive();

                            // Get the document
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.find) {
                                await adone.promise.delay(600);
                                // Reply with first batch
                                request.reply({
                                    cursor: {
                                        id: adone.data.bson.Long.fromNumber(1),
                                        ns: "test.cursor1",
                                        firstBatch: [{
                                            _id: new adone.data.bson.ObjectId(),
                                            a: 1
                                        }]
                                    },
                                    ok: 1
                                });
                            } else if (doc.getMore) {
                                // Reply with first batch
                                request.reply({
                                    cursor: {
                                        id: adone.data.bson.Long.fromNumber(1),
                                        ns: "test.cursor1",
                                        nextBatch: [{
                                            _id: new adone.data.bson.ObjectId(),
                                            a: 1
                                        }]
                                    },
                                    ok: 1
                                });
                            }
                        }
                    })().catch(adone.noop);

                    // Attempt to connect
                    const _server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                        connectionTimeout: 30000,
                        socketTimeout: 30000,
                        haInterval: 500,
                        size: 1
                    });

                    // Are we done
                    await new Promise((resolve) => {
                        _server.once("connect", resolve);
                        _server.on("error", adone.noop);
                        _server.connect();
                    });



                    const cursor = _server.cursor("test.test", {
                        find: "test",
                        query: {},
                        batchSize: 2
                    });

                    // Execute next
                    try {
                        const next = promisify(cursor.next).bind(cursor);
                        await next();
                        await next();
                    } finally {
                        running = false;
                        await server.destroy();
                        await _server.destroy();
                    }
                });
            });

            context("multiple proxies", () => {
                it("Should correctly load-balance the operations", async () => {
                    let running = true;
                    const Mongos = configuration.require.Mongos;
                    // Primary server states
                    const serverIsMaster = [{
                        ismaster: true,
                        msg: "isdbgrid",
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1
                    }];

                    const mongos1 = await mockupdb.createServer(11000, "localhost");
                    const mongos2 = await mockupdb.createServer(11001, "localhost");
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();
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
                    const server = new Mongos([{
                        host: "localhost",
                        port: 11000
                    },
                    {
                        host: "localhost",
                        port: 11001
                    }
                    ], {
                        connectionTimeout: 3000,
                        socketTimeout: 1000,
                        haInterval: 1000,
                        localThresholdMS: 500,
                        size: 1
                    });
                    const _server = await new Promise((resolve) => {
                        server.on("connect", resolve);
                        server.on("error", adone.noop);
                        server.connect();
                    });
                    try {
                        const insert = promisify(_server.insert).bind(_server);
                        let r = await insert("test.test", [{
                            created: new Date()
                        }]);
                        expect(r.connection.port).to.be.oneOf([11000, 11001]);
                        let pport = r.connection.port === 11000 ? 11001 : 11000;

                        r = await insert("test.test", [{
                            created: new Date()
                        }]);
                        expect(pport).to.be.equal(r.connection.port);
                        pport = r.connection.port === 11000 ? 11001 : 11000;

                        r = await insert("test.test", [{
                            created: new Date()
                        }]);
                        expect(pport).to.be.equal(r.connection.port);
                    } finally {
                        running = false;
                        await server.destroy();
                        await mongos1.destroy();
                        await mongos2.destroy();
                    }
                });

                it("Should ignore one of the mongos instances due to being outside the latency window", async () => {
                    const serverIsMaster = [{
                        ismaster: true,
                        msg: "isdbgrid",
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1
                    }];
                    const mongos1 = await mockupdb.createServer(11002, "localhost");
                    const mongos2 = await mockupdb.createServer(11003, "localhost");
                    let running = true;
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

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

                    (async () => {
                        while (running) {
                            const request = await mongos2.receive();
                            // console.log(" do something 0")
                            // Delay all the operations by 500 ms
                            await adone.promise.delay(500);
                            // console.log(" do something 1 :: " + (new Date().getTime() - s))
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
                    const server = new Mongos([{
                        host: "localhost",
                        port: 11002
                    },
                    {
                        host: "localhost",
                        port: 11003
                    }
                    ], {
                        connectionTimeout: 3000,
                        localThresholdMS: 50,
                        socketTimeout: 1000,
                        haInterval: 1000,
                        size: 1
                    });

                    try {
                        // Add event listeners
                        await new Promise((resolve) => {
                            server.once("fullsetup", resolve);
                            server.on("error", adone.noop);
                            server.connect();
                        });
                        try {
                            const insert = promisify(server.insert).bind(server);
                            let r = await insert("test.test", [{
                                created: new Date()
                            }]);
                            expect(r.connection.port).to.be.equal(11002);

                            r = await insert("test.test", [{
                                created: new Date()
                            }]);
                            expect(r.connection.port).to.be.equal(11002);
                        } finally {
                            await server.destroy();
                        }

                        const server2 = new Mongos([{
                            host: "localhost",
                            port: 11002
                        },
                        {
                            host: "localhost",
                            port: 11003
                        }
                        ], {
                            connectionTimeout: 3000,
                            localThresholdMS: 1000,
                            socketTimeout: 1000,
                            haInterval: 1000,
                            size: 1
                        });
                        await new Promise((resolve) => {
                            server2.once("fullsetup", resolve);
                            server2.connect();
                        });
                        try {
                            const insert2 = promisify(server2.insert).bind(server2);
                            let r = await insert2("test.test", [{
                                created: new Date()
                            }]);
                            expect(r.connection.port).to.be.equal(11002);
                            r = await insert2("test.test", [{
                                created: new Date()
                            }]);
                            expect(r.connection.port).to.be.equal(11003);
                        } finally {
                            await server2.destroy();
                        }

                    } finally {
                        await mongos1.destroy();
                        await mongos2.destroy();
                        running = false;
                    }
                });
            });

            context("proxy read preference", () => {
                it("Should correctly set query and readpreference field on wire protocol for 3.2", async () => {
                    const serverIsMaster = [{
                        ismaster: true,
                        msg: "isdbgrid",
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 5,
                        minWireVersion: 0,
                        ok: 1
                    }];
                    // Received command on server
                    let command = null;
                    // Boot the mock
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    let running = true;
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.$query && doc.$readPreference) {
                                command = doc;
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    cursor: {
                                        id: adone.data.bson.Long.ZERO,
                                        ns: "test.t",
                                        firstBatch: []
                                    },
                                    ok: 1
                                });
                            }
                        }
                    })().catch(adone.noop);

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                        connectionTimeout: 3000,
                        socketTimeout: 5000,
                        haInterval: 1000,
                        size: 1
                    });
                    await new Promise((resolve) => {
                        server.once("fullsetup", resolve);
                        server.connect();
                    });
                    try {
                        const cursor = server.cursor("test.test", {
                            find: "test",
                            query: {},
                            batchSize: 2,
                            readPreference: ReadPreference.secondary
                        });

                        const d = await promisify(cursor.next).call(cursor);
                        expect(d).to.be.null();
                        expect(command.$query).to.be.ok();
                        expect(command.$readPreference).to.be.ok();
                        expect(command.$readPreference.mode).to.be.equal("secondary");
                    } finally {
                        await server.destroy();
                        await mongos1.destroy();
                        running = false;
                    }
                });

                it("Should correctly set query and near readpreference field on wire protocol for 3.2", async () => {
                    const serverIsMaster = [{
                        ismaster: true,
                        msg: "isdbgrid",
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 5,
                        minWireVersion: 0,
                        ok: 1
                    }];
                    // Received command on server
                    let command = null;
                    // Boot the mock
                    let running = true;
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.$query && doc.$readPreference) {
                                command = doc;
                                request.reply({
                                    waitedMS: adone.data.bson.Long.ZERO,
                                    cursor: {
                                        id: adone.data.bson.Long.ZERO,
                                        ns: "test.t",
                                        firstBatch: []
                                    },
                                    ok: 1
                                });
                            }
                        }
                    })().catch(adone.noop);

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                        connectionTimeout: 3000,
                        socketTimeout: 5000,
                        haInterval: 1000,
                        size: 1
                    });

                    await new Promise((resolve) => {
                        server.once("fullsetup", resolve);
                        server.connect();
                    });
                    try {
                        const cursor = server.cursor("test.test", {
                            find: "test",
                            query: {},
                            batchSize: 2,
                            readPreference: new ReadPreference("nearest", [{
                                db: "sf"
                            }])
                        });

                        const d = await promisify(cursor.next).call(cursor);
                        expect(d).to.be.null();
                        expect(command.$query).to.be.ok();
                        expect(command.$readPreference).to.be.ok();
                        expect(command.$readPreference.mode).to.be.equal("nearest");
                        expect(command.$readPreference.tags).to.be.deep.equal([{
                            db: "sf"
                        }]);
                    } finally {
                        await server.destroy();
                        await mongos1.destroy();
                        running = false;
                    }
                });

                it("Should correctly set query and readpreference field on wire protocol for 2.6", async () => {
                    // Primary server states
                    const serverIsMaster = [{
                        ismaster: true,
                        msg: "isdbgrid",
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1
                    }];
                    // Received command on server
                    let command = null;
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    let running = true;
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.$query && doc.$readPreference) {
                                command = doc;
                                request.reply([]);
                            }
                        }
                    })().catch(adone.noop);

                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                        connectionTimeout: 3000,
                        socketTimeout: 5000,
                        haInterval: 1000,
                        size: 1
                    });

                    // console.log("----------------------- -2")
                    // Add event listeners
                    await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });

                    const cursor = server.cursor("test.test", {
                        find: "test",
                        query: {},
                        batchSize: 2,
                        readPreference: ReadPreference.secondary
                    });
                    // console.log("----------------------- -1")
                    try {
                        // Execute next
                        const d = await promisify(cursor.next).call(cursor);
                        expect(d).to.be.null();
                        expect(command.$query).to.be.ok();
                        expect(command.$readPreference).to.be.ok();
                        expect(command.$readPreference.mode).to.be.equal("secondary");
                    } finally {
                        await server.destroy();
                        await mongos1.destroy();
                        running = false;
                    }
                });

                it("Should correctly set query and readpreference field on wire protocol for 2.4", async () => {
                    const serverIsMaster = [{
                        ismaster: true,
                        msg: "isdbgrid",
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        ok: 1
                    }];
                    // Received command on server
                    let command = null;
                    // Boot the mock
                    let running = true;
                    const mongos1 = await mockupdb.createServer(52000, "localhost");

                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.$query && doc.$readPreference) {
                                command = doc;
                                request.reply([]);
                            }
                        }
                    })().catch(adone.noop);

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                        connectionTimeout: 3000,
                        socketTimeout: 5000,
                        haInterval: 1000,
                        size: 1
                    });

                    // Add event listeners
                    server.connect();
                    await waitFor(server, "fullsetup");
                    try {
                        const cursor = server.cursor("test.test", {
                            find: "test",
                            query: {},
                            batchSize: 2,
                            readPreference: ReadPreference.secondary
                        });

                        // Execute next
                        const d = await promisify(cursor.next).call(cursor);
                        expect(d).to.be.null();
                        expect(command.$query).to.be.ok();
                        expect(command.$readPreference).to.be.ok();
                        expect(command.$readPreference.mode).to.be.equal("secondary");

                    } finally {
                        await server.destroy();
                        await mongos1.destroy();
                        running = false;
                    }
                });

            });

            context("proxy failover", () => {
                it("Should correctly failover due to proxy going away causing timeout", async () => {
                    const serverIsMaster = [{
                        ismaster: true,
                        msg: "isdbgrid",
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1
                    }];
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    const mongos2 = await mockupdb.createServer(52001, "localhost");
                    let running = true;
                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert) {
                                return mongos1.destroy();
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
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    },
                    {
                        host: "localhost",
                        port: 52001
                    }
                    ], {
                        connectionTimeout: 3000,
                        socketTimeout: 5000,
                        haInterval: 1000,
                        size: 1
                    });

                    // Add event listeners
                    server.connect();
                    await waitFor(server, "fullsetup");
                    const insert = promisify(server.insert).bind(server);
                    try {
                        for (; ;) {
                            const r = await insert("test.test", [{
                                created: new Date()
                            }]).catch(adone.noop);
                            if (r) {
                                expect(r.connection.port).to.be.equal(52001);
                                break;
                            }
                            await adone.promise.delay(500);
                        }
                    } finally {
                        await server.destroy();
                        await mongos1.destroy();
                        await mongos2.destroy();
                        running = false;
                    }
                });

                it("Should correctly bring back proxy and use it", async () => {
                    const serverIsMaster = [{
                        ismaster: true,
                        msg: "isdbgrid",
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1
                    }];
                    // Boot the mock
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    const mongos2 = await mockupdb.createServer(52001, "localhost");
                    let currentStep = 0;
                    let running = true;
                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert && currentStep === 0) {
                                await adone.promise.delay(1600);
                                request.connection.destroy();
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
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    },
                    {
                        host: "localhost",
                        port: 52001
                    }
                    ], {
                        connectionTimeout: 3000,
                        socketTimeout: 1500,
                        haInterval: 1000,
                        size: 1
                    });

                    // Add event listeners
                    server.connect();
                    await waitFor(server, "fullsetup");
                    try {
                        const insert = promisify(server.insert).bind(server);
                        for (; ;) {
                            await adone.promise.delay(500);
                            const r = await insert("test.test", [{
                                created: new Date()
                            }]).catch(adone.noop);
                            if (r) {
                                expect(r.connection.port).to.be.equal(52001);
                                break;
                            }
                        }
                        const proxies = new Set();
                        for (; proxies.size !== 2;) {
                            await adone.promise.delay(500);
                            if (currentStep === 0) {
                                ++currentStep;
                            }
                            insert("test.test", [{
                                created: new Date()
                            }]).then((r) => {
                                proxies.add(r.connection.port);
                            }, adone.noop);
                        }
                    } finally {
                        await server.destroy();
                        await mongos1.destroy();
                        await mongos2.destroy();
                        running = false;
                    }
                });

                it("Should correctly bring back both proxies and use it", async () => {
                    const serverIsMaster = [{
                        ismaster: true,
                        msg: "isdbgrid",
                        maxBsonObjectSize: 16777216,
                        maxMessageSizeBytes: 48000000,
                        maxWriteBatchSize: 1000,
                        localTime: new Date(),
                        maxWireVersion: 3,
                        minWireVersion: 0,
                        ok: 1
                    }];
                    // Boot the mock
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    const mongos2 = await mockupdb.createServer(52001, "localhost");
                    let currentStep = 0;
                    let running = true;
                    // Mongos
                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert && currentStep === 0) {
                                await adone.promise.delay(1600);
                                request.connection.destroy();
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
                            } else if (doc.insert && currentStep === 0) {
                                await adone.promise.delay(1600);
                                request.connection.destroy();
                            } else if (doc.insert && currentStep === 1) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(adone.noop);

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    },
                    {
                        host: "localhost",
                        port: 52001
                    }
                    ], {
                        connectionTimeout: 3000,
                        socketTimeout: 1500,
                        haInterval: 1000,
                        size: 1
                    });

                    // Add event listeners
                    server.connect();
                    await waitFor(server, "fullsetup");
                    try {
                        const insert = promisify(server.insert).bind(server);
                        await adone.promise.delay(500);
                        await insert("test.test", [{
                            created: new Date()
                        }]).catch(adone.noop);
                        if (currentStep === 0) {
                            ++currentStep;
                        }
                        const proxies = new Set();
                        for (; proxies.size !== 2;) {
                            await adone.promise.delay(100);
                            insert("test.test", [{
                                created: new Date()
                            }]).then((r) => {
                                proxies.add(r.connection.port);
                            }, adone.noop);
                        }
                    } finally {
                        await server.destroy();
                        await mongos1.destroy();
                        await mongos2.destroy();
                        running = false;
                    }
                });
            });
        });
    });
});
