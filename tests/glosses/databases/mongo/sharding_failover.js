describe("sharding failover", function () {
    if (this.topology !== "sharded") {
        return;
    }

    const { std, database: { mongo } } = adone;

    it("should correctly connect and then handle a mongos failure", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`
            ].join(","),
            pathname: "/sharded_test_db",
            search: "w=1"
        });
        const db = await mongo.connect(url);
        const collection = db.collection("replicaset_mongo_client_collection1");
        const r = await collection.update({ a: 1 }, { b: 1 }, { upsert: true });
        expect(r.result.n).to.be.equal(1);
        await this.server.proxies[0].stop();
        for (let i = 0; i < 10; ++i) {
            expect(await collection.findOne()).to.be.ok;
        }
        await this.server.proxies[0].start();
        for (let i = 0; i < 10; ++i) {
            expect(await collection.findOne()).to.be.ok;
        }
        await db.close();
    });

    it("should correctly connect to mongos sharded setup and kill the mongos proxy", async () => {
        const mongos = new mongo.__.Mongos([
            new mongo.__.Server(this.host, this.port, { autoReconnect: true }),
            new mongo.__.Server(this.host, this.port + 1, { autoReconnect: true })
        ], { ha: true, haInterval: 500, poolSize: 1 });
        const left = spy();
        const joined = spy();
        mongos.on("left", left);
        mongos.on("joined", joined);
        const db = new mongo.__.Db("integration_test_", mongos, { w: 0 });
        await db.open();
        const collection = db.collection("shard_test2");
        await collection.insert({ test: 1 }, { w: 1 });
        await this.server.proxies[0].stop();
        await collection.insert({ test: 2 }, { w: 1 });
        expect(mongos.connections()).to.have.lengthOf(1);
        await this.server.proxies[0].start();
        await joined.waitForCall();
        expect(mongos.connections()).to.have.lengthOf(2);
        await this.server.proxies[1].stop();
        await collection.insert({ test: 3 }, { w: 1 });
        expect(mongos.connections()).to.have.lengthOf(1);
        await this.server.proxies[1].start();
        await joined.waitForCall();
        await this.server.proxies[1].stop();
        await collection.insert({ test: 4 }, { w: 1 });
        expect(mongos.connections()).to.have.lengthOf(1);
        await this.server.proxies[1].start();
        await joined.waitForCall();
        expect(mongos.connections()).to.have.lengthOf(2);
        expect(joined).to.have.callCount(5);
        expect(left).to.have.callCount(3);
        await db.close();
    });

    it("should correctly connect and emit a reconnect event after mongos failover", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`
            ].join(","),
            pathname: "/sharded_test_db",
            search: "w=1"
        });
        const db = await mongo.connect(url);
        const reconnect = spy();
        db.serverConfig.on("reconnect", reconnect);
        await this.server.proxies[0].stop();
        await this.server.proxies[1].stop();
        const collection = db.collection("replicaset_mongo_client_collection2");
        // buffer it
        const p = collection.insert({ c: 1 });
        await this.server.proxies[0].start();
        await this.server.proxies[1].start();
        await reconnect.waitForCall();
        await collection.insert({ c: 1 });
        await p;
        expect(reconnect).to.have.been.calledOnce;
        expect(await collection.count()).to.be.equal(2);
        await db.close();
    });
});
