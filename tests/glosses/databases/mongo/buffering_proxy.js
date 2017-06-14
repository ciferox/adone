import mockupdb from "./core/mock";

describe("buffering proxy", function () {
    if (this.topology !== "single") {
        return;
    }

    const { database: { mongo }, data: { bson }, promise } = adone;

    it("should successfully handle buffering store execution for primary server", async () => {
        let running = true;
        const currentIsMasterIndex = 0;

        // Election Ids
        const electionIds = [new bson.ObjectId(0), new bson.ObjectId(1)];
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
                ismaster: false,
                secondary: true,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            }),
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32000",
                primary: "localhost:32001",
                tags: { loc: "ny" },
                electionId: electionIds[1]
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
                tags: { loc: "sf" }
            }),
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32001",
                primary: "localhost:32001",
                tags: { loc: "ny" },
                electionId: electionIds[1]
            })
        ];

        // Primary server states
        const secondSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32002",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            }),
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32002",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            }),
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32002",
                primary: "localhost:32001",
                tags: { loc: "ny" },
                electionId: electionIds[1]
            })
        ];

        // Die
        let die = false;
        let dieSecondary = false;

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

        // Primary state machine
        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;

                if (die) {
                    request.connection.destroy();
                } else {
                    if (doc.ismaster) {
                        request.reply(primary[currentIsMasterIndex]);
                    } else if (doc.insert) {
                        request.reply({ ok: 1, n: 1 });
                    } else if (doc.aggregate) {
                        request.reply({ ok: 1, n: 1 });
                    }
                }
            }
        })().catch(() => { });

        // First secondary state machine
        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (die || dieSecondary) {
                    request.connection.destroy();
                } else {
                    if (doc.ismaster) {
                        request.reply(firstSecondary[currentIsMasterIndex]);
                    }
                }
            }
        })().catch(() => { });

        // Second secondary state machine
        (async () => {
            while (running) {
                const request = await secondSecondaryServer.receive();
                const doc = request.document;

                if (die || dieSecondary) {
                    request.connection.destroy();
                } else {
                    if (doc.ismaster) {
                        request.reply(secondSecondary[currentIsMasterIndex]);
                    }
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs", {
            socketTimeoutMS: 2000,
            haInterval: 1000
        });

        const results = [];

        await promise.delay(1000);

        die = true;
        dieSecondary = true;

        await promise.delay(3000);


        db.collection("test")
            .insertOne({ a: 1 })
            .then(() => results.push("insertOne"));

        db.command({ count: "test", query: {} }, {
            readPreference: new mongo.ReadPreference(mongo.ReadPreference.SECONDARY)
        }).then(() => results.push("count"));

        db.collection("test")
            .aggregate([{ $match: {} }])
            .toArray()
            .then(() => results.push("aggregate"));

        db.collection("test")
            .find({})
            .setReadPreference(new mongo.ReadPreference(mongo.ReadPreference.SECONDARY))
            .toArray()
            .then(() => results.push("find"));

        await promise.delay(1000);

        die = false;

        await promise.delay(1000);

        expect(results.sort()).to.be.deep.equal(["aggregate", "insertOne"]);
        running = false;
        await db.close();
        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await secondSecondaryServer.destroy();
    });

    it("successfully handle buffering store execution for secondary server", async () => {
        let running = true;
        const currentIsMasterIndex = 0;

        // Election Ids
        const electionIds = [new bson.ObjectId(0), new bson.ObjectId(1)];
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
                ismaster: false,
                secondary: true,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            }),
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32000",
                primary: "localhost:32001",
                tags: { loc: "ny" },
                electionId: electionIds[1]
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
                tags: { loc: "sf" }
            }),
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32001",
                primary: "localhost:32001",
                tags: { loc: "ny" },
                electionId: electionIds[1]
            })
        ];

        // Primary server states
        const secondSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32002",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            }),
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32002",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            }),
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32002",
                primary: "localhost:32001",
                tags: { loc: "ny" },
                electionId: electionIds[1]
            })
        ];

        let die = false;
        let diePrimary = false;

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

        // Primary state machine
        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;

                if (die || diePrimary) {
                    request.connection.destroy();
                } else {
                    if (doc.ismaster) {
                        request.reply(primary[currentIsMasterIndex]);
                    }
                }
            }
        })().catch(() => { });

        // First secondary state machine
        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (die) {
                    request.connection.destroy();
                } else {
                    if (doc.ismaster) {
                        request.reply(firstSecondary[currentIsMasterIndex]);
                    } else if (doc.count) {
                        request.reply({ ok: 1, n: 10 });
                    } else if (doc.find) {
                        request.reply({ ok: 1, n: 10 });
                    }
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await secondSecondaryServer.receive();
                const doc = request.document;

                if (die) {
                    request.connection.destroy();
                } else {
                    if (doc.ismaster) {
                        request.reply(secondSecondary[currentIsMasterIndex]);
                    } else if (doc.count) {
                        request.reply({ ok: 1, n: 10 });
                    } else if (doc.find) {
                        request.reply({ ok: 1, n: 10 });
                    }
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001,localhost:32002/test?replicaSet=rs", {
            socketTimeoutMS: 2000,
            haInterval: 1000
        });

        await promise.delay(1000);

        die = true;
        diePrimary = true;

        await promise.delay(3000);

        const results = [];

        db.collection("test")
            .insertOne({ a: 1 })
            .then(() => results.push("insertOne"));

        db.command({ count: "test", query: {} }, {
            readPreference: new mongo.ReadPreference(mongo.ReadPreference.SECONDARY)
        }).then(() => results.push("count"));

        db.collection("test")
            .aggregate([{ $match: {} }])
            .toArray()
            .then(() => results.push("aggregate"));

        db.collection("test")
            .find({})
            .setReadPreference(new mongo.ReadPreference(mongo.ReadPreference.SECONDARY))
            .toArray()
            .then(() => results.push("find"));

        await promise.delay(1000);

        die = false;

        await promise.delay(1500);

        expect(results.sort()).to.be.deep.equal(["count", "find"]);

        running = false;
        await db.close();
        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await secondSecondaryServer.destroy();
    });
});
