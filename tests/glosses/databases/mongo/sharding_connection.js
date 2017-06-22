describe("sharding connection", function () {
    if (this.topology !== "sharded") {
        return;
    }

    const { database: { mongo }, std } = adone;

    it("should connect to mongos proxies using connection string and options", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`
            ].join(","),
            pathname: "/sharded_test",
            search: new std.url.URLSearchParams({
                w: 1,
                readPreference: "secondaryPreferred"
            }).toString()
        });
        const db = await mongo.connect(url, {
            mongos: {
                haInterval: 500
            }
        });
        expect(db.serverConfig.haInterval).to.be.equal(500);
        const r = await db.collection("replicaset_mongo_client_collection").update({ a: 1 }, { b: 1 }, { upsert: true, w: 2 });
        expect(r.result.n).to.be.equal(1);
        expect(await db.collection("replicaset_mongo_client_collection").findOne()).to.be.ok;
        await db.close();
    });

    it("should correctly connect with a missing mongos", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`,
                `${this.host}:${this.port + 2}`  // there is no such a proxy
            ].join(","),
            pathname: "/sharded_test",
            search: new std.url.URLSearchParams({
                w: 1
            }).toString()
        });
        const db = await mongo.connect(url);
        await db.close();
    });

    it("should correctly emit open and fullsetup to all db instances", async () => {
        const db1 = new mongo.__.Db("tests_1", new mongo.__.Mongos([
            new mongo.__.Server(this.host, this.port),
            new mongo.__.Server(this.host, this.port + 1)
        ]), { w: 1 });
        const db2 = db1.db("tests_2");

        const close = spy();
        db2.on("close", close);
        db1.on("close", close);
        const open1 = spy();
        db1.on("open", open1);
        const open2 = spy();
        db2.on("open", open2);
        const fullSetup1 = spy();
        const fullSetup2 = spy();
        db1.on("fullsetup", fullSetup1);
        db2.on("fullsetup", fullSetup2);

        await db1.open();

        const col1 = db1.collection("test");
        const col2 = db2.collection("test");

        await col1.insert({ value: "something" });
        await col2.insert({ value: "something" });

        await db2.close();

        expect(close).to.have.been.calledTwice;
        expect(open1).to.have.been.calledOnce;
        expect(open1.getCall(0).args[1]).to.have.property("databaseName", "tests_1");
        expect(open2).to.have.been.calledOnce;
        expect(open2.getCall(0).args[1]).to.have.property("databaseName", "tests_2");
        expect(fullSetup1).to.have.been.calledOnce;
        expect(fullSetup1.getCall(0).args[1]).to.have.property("databaseName", "tests_1");
        expect(fullSetup2).to.have.been.calledOnce;
        expect(fullSetup2.getCall(0).args[1]).to.have.property("databaseName", "tests_2");
    });

    it("should exercise all options on mongos topology", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`
            ].join(","),
            pathname: "/sharded_test",
            search: new std.url.URLSearchParams({
                w: 1,
                readPreference: "secondaryPreferred"
            }).toString()
        });
        const db = await mongo.connect(url, {
            mongos: {
                haInterval: 500
            }
        });
        expect(db).to.be.ok;
        expect(db.serverConfig.haInterval).to.be.equal(500);
        expect(db.serverConfig.capabilities()).to.be.ok;
        expect(db.serverConfig.isConnected()).to.be.true;
        expect(db.serverConfig.lastIsMaster()).to.be.ok;
        expect(db.serverConfig.connections()).to.be.ok;
        expect(db.serverConfig.isMasterDoc).to.be.ok;
        expect(db.serverConfig.bson).to.be.ok;

        await db.close();
    });
});
