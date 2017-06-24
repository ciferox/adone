import mockupdb from "./core/mock";

describe("command write concern", function () {
    if (this.topology !== "single") {
        return;
    }

    const { data: { bson }, database: { mongo } } = adone;

    it("successfully pass through writeConcern to aggregate command", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
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

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.aggregate) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs");

        await db.collection("test").aggregate([
            { $match: {} },
            { $out: "readConcernCollectionAggregate1Output" }
        ], { w: 2, wtimeout: 1000 });

        expect(commandResult.writeConcern).to.be.deep.equal({ w: 2, wtimeout: 1000 });

        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
        running = false;
    });

    it("successfully pass through writeConcern to create command", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
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

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.listCollections) {
                    request.reply({
                        ok: 1,
                        cursor: {
                            id: bson.Long.fromNumber(0),
                            ns: "test.cmd$.listCollections",
                            firstBatch: []
                        }
                    });
                } else if (doc.create) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs");

        await db.createCollection("test_collection_methods", { w: 2, wtimeout: 1000 });

        expect(commandResult.writeConcern).to.be.deep.equal({ w: 2, wtimeout: 1000 });

        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
        running = false;
    });

    it("successfully pass through writeConcern to createIndexes command", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
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

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.createIndexes) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs");

        await db.collection("indexOptionDefault").createIndex({ a: 1 }, {
            indexOptionDefaults: true,
            w: 2,
            wtimeout: 1000
        });

        expect(commandResult.writeConcern).to.be.deep.equal({ w: 2, wtimeout: 1000 });

        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
        running = false;
    });

    it("successfully pass through writeConcern to drop command", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
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

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.drop) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs");

        await db.collection("dropCommand").drop({
            w: 2,
            wtimeout: 1000
        });

        expect(commandResult.writeConcern).to.be.deep.equal({ w: 2, wtimeout: 1000 });

        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
        running = false;
    });

    it("successfully pass through writeConcern to dropDatabase command", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
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

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.dropDatabase) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs");

        await db.dropDatabase({
            w: 2,
            wtimeout: 1000
        });

        expect(commandResult.writeConcern).to.be.deep.equal({ w: 2, wtimeout: 1000 });

        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
        running = false;
    });

    it("successfully pass through writeConcern to dropIndexes command", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
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

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.dropIndexes) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs");

        await db.collection("test").dropIndexes({
            w: 2,
            wtimeout: 1000
        });

        expect(commandResult.writeConcern).to.be.deep.equal({ w: 2, wtimeout: 1000 });

        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
        running = false;
    });

    it("successfully pass through writeConcern to dropIndexes command", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
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

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;
                // console.log("========================== cmd")
                // console.dir(doc)

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.mapreduce) {
                    commandResult = doc;
                    request.reply({ ok: 1, result: "tempCollection" });
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs");

        const map = new mongo.Code("function() { emit(this.user_id, 1); }");
        const reduce = new mongo.Code("function(k,vals) { return 1; }");

        await db.collection("test").mapReduce(map, reduce, {
            out: { replace: "tempCollection" },
            w: 2,
            wtimeout: 1000
        });

        expect(commandResult.writeConcern).to.be.deep.equal({ w: 2, wtimeout: 1000 });

        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
        running = false;
    });

    it("successfully pass through writeConcern to createUser command", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
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

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.createUser) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs");

        await db.admin().addUser("kay:kay", "abc123", { w: 2, wtimeout: 1000 });

        expect(commandResult.writeConcern).to.be.deep.equal({ w: 2, wtimeout: 1000 });

        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
        running = false;
    });

    it("successfully pass through writeConcern to dropUser command", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
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

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.dropUser) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs");

        await db.admin().removeUser("kay:kay", { w: 2, wtimeout: 1000 });

        expect(commandResult.writeConcern).to.be.deep.equal({ w: 2, wtimeout: 1000 });

        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
        running = false;
    });

    it("successfully pass through writeConcern to findAndModify command", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
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

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.findandmodify) {
                    commandResult = doc;
                    request.reply({ ok: 1, result: {} });
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs");

        await db.collection("test").findAndModify({ a: 1 }, [["a", 1]], { $set: { b1: 1 } }, { new: true, w: 2, wtimeout: 1000 });

        expect(commandResult.writeConcern).to.be.deep.equal({ w: 2, wtimeout: 1000 });

        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
        running = false;
    });
});
