import mockupdb from "./core/mock";

describe("view", function () {
    if (this.topology !== "single") {
        return;
    }

    const { database: { mongo } } = adone;

    it("successfully pass through collation to findAndModify command", async () => {
        let running = true;

        const primary = [{
            ismaster: true,
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 5,
            minWireVersion: 0,
            ok: 1
        }];
        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.listCollections) {
                    request.reply({
                        ok: 1, cursor: {
                            id: mongo.Long.fromNumber(0), ns: "test.cmd$.listCollections", firstBatch: []
                        }
                    });
                } else if (doc.create) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => {});

        const db = await mongo.connect("mongodb://localhost:32000/test");
        await db.createCollection("test", { viewOn: "users", pipeline: [{ $match: {} }] });
        expect(commandResult).to.be.deep.equal({ create: "test", viewOn: "users", pipeline: [{ $match: {} }] });
        await db.close();
        await singleServer.destroy();
        running = false;
    });
});
