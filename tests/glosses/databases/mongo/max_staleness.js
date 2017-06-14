import mockupdb from "./core/mock";

describe("max staleness", () => {
    const { data: { bson }, database: { mongo } } = adone;

    it("should correctly set maxStalenessSeconds on Mongos query using MongoClient.connect", async () => {
        let running = true;

        const defaultFields = {
            ismaster: true,
            msg: "isdbgrid",
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
            minWireVersion: 0,
            ok: 1
        };

        const serverIsMaster = [
            Object.assign({}, defaultFields)
        ];

        let command = null;
        const mongos1 = await mockupdb.createServer(62001, "localhost");

        (async () => {
            while (running) {
                const request = await mongos1.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(serverIsMaster[0]);
                } else if (doc.$query && doc.$readPreference) {
                    command = doc;
                    request.reply({
                        waitedMS: bson.Long.ZERO,
                        cursor: {
                            id: bson.Long.ZERO,
                            ns: "test.t",
                            firstBatch: []
                        },
                        ok: 1
                    });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:62001/test?readPreference=secondary&maxStalenessSeconds=250");
        await db.collection("test").find({}).toArray();
        expect(command).to.be.deep.equal({
            $query: { find: "test", filter: {} },
            $readPreference: { mode: "secondary", maxStalenessSeconds: 250 }
        });

        db.close();
        mongos1.destroy();
        running = false;
    });

    it("should correctly set maxStalenessSeconds on Mongos query using db level readPreference", async () => {
        let running = true;

        const defaultFields = {
            ismaster: true,
            msg: "isdbgrid",
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
            minWireVersion: 0,
            ok: 1
        };

        const serverIsMaster = [
            Object.assign({}, defaultFields)
        ];

        let command = null;
        const mongos1 = await mockupdb.createServer(62002, "localhost");

        (async () => {
            while (running) {
                const request = await mongos1.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(serverIsMaster[0]);
                } else if (doc.$query && doc.$readPreference) {
                    command = doc;
                    request.reply({
                        waitedMS: bson.Long.ZERO,
                        cursor: {
                            id: bson.Long.ZERO,
                            ns: "test.t",
                            firstBatch: []
                        },
                        ok: 1
                    });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:62002/test");
        const db1 = db.db("test", { readPreference: new mongo.ReadPreference("secondary", { maxStalenessSeconds: 250 }) });
        await db1.collection("test").find({}).toArray();
        expect(command).to.be.deep.equal({
            $query: { find: "test", filter: {} },
            $readPreference: { mode: "secondary", maxStalenessSeconds: 250 }
        }, command);
        db.close();
        mongos1.destroy();
        running = false;
    });

    it("Should correctly set maxStalenessSeconds on Mongos query using collection level readPreference", async () => {
        let running = true;

        const defaultFields = {
            ismaster: true,
            msg: "isdbgrid",
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
            minWireVersion: 0,
            ok: 1
        };

        const serverIsMaster = [
            Object.assign({}, defaultFields)
        ];
        let command = null;
        const mongos1 = await mockupdb.createServer(62003, "localhost");

        (async () => {
            while (running) {
                const request = await mongos1.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(serverIsMaster[0]);
                } else if (doc.$query && doc.$readPreference) {
                    command = doc;
                    request.reply({
                        waitedMS: bson.Long.ZERO,
                        cursor: {
                            id: bson.Long.ZERO,
                            ns: "test.t",
                            firstBatch: []
                        },
                        ok: 1
                    });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:62003/test");
        await db.collection("test", { readPreference: new mongo.ReadPreference("secondary", { maxStalenessSeconds: 250 }) }).find({}).toArray();
        expect(command).to.be.deep.equal({
            $query: { find: "test", filter: {} },
            $readPreference: { mode: "secondary", maxStalenessSeconds: 250 }
        }, command);
        db.close();
        mongos1.destroy();
        running = false;
    });

    it("should correctly set maxStalenessSeconds on Mongos query using cursor level readPreference", async () => {
        let running = true;
        const defaultFields = {
            ismaster: true,
            msg: "isdbgrid",
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
            minWireVersion: 0,
            ok: 1
        };

        const serverIsMaster = [
            Object.assign({}, defaultFields)
        ];
        let command = null;
        const mongos1 = await mockupdb.createServer(62004, "localhost");
        (async () => {
            while (running) {
                const request = await mongos1.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(serverIsMaster[0]);
                } else if (doc.$query && doc.$readPreference) {
                    command = doc;
                    request.reply({
                        waitedMS: bson.Long.ZERO,
                        cursor: {
                            id: bson.Long.ZERO,
                            ns: "test.t",
                            firstBatch: []
                        },
                        ok: 1
                    });
                }
            }
        })().catch(() => {});

        const db = await mongo.connect("mongodb://localhost:62004/test");
        await db.collection("test").find({}).setReadPreference(new mongo.ReadPreference("secondary", { maxStalenessSeconds: 250 })).toArray();
        expect(command).to.be.deep.equal({
            $query: { find: "test", filter: {} },
            $readPreference: { mode: "secondary", maxStalenessSeconds: 250 }
        }, command);

        db.close();
        mongos1.destroy();
        running = false;
    });
});
