describe("reconnect", function () {
    if (this.topology !== "single") {
        return;
    }

    const { promise, database: { mongo } } = adone;

    it("should correctly stop reconnection attempts after limit reached", async () => {
        const db = await mongo.connect(this.url(), {
            poolSize: 1,
            autoReconnect: true,
            reconnectTries: 2,
            reconnectInterval: 100
        });
        await this.server.stop();
        await assert.throws(async () => {
            await db.collection("waiting_for_reconnect").insert({ a: 1 });
        });
        await db.close();
        await this.server.start();
    });

    it("should correctly recover when bufferMaxEntries: -1 and multiple restarts", async () => {
        const db = await mongo.connect(this.url(), {
            db: { bufferMaxEntries: -1 },
            server: {
                poolSize: 20,
                socketOptions: { autoReconnect: true, keepAlive: 50 },
                reconnectTries: 1000,
                reconnectInterval: 1000
            }
        });
        (async () => {
            for (let i = 0; i < 3; ++i) {
                await promise.delay(1000);
                await this.server.stop();
                await promise.delay(1000);
                await this.server.start();
            }
        })();
        const collection = db.collection("t");
        for (let i = 0; i < 10; ++i) {
            // may fail in the middle
            await collection.insertOne({ a: 1 }).catch(() => {});
            await collection.find().toArray().catch(() => {});
            await promise.delay(300);
        }
        await collection.insertOne({ a: 1 });
        expect(await collection.find().toArray()).not.to.be.empty();
    });
});
