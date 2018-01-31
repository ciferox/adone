import { Server as ServerManager } from "mongodb-topology-manager";

describe("replset connection", function () {
    if (this.topology !== "replicaset") {
        return;
    }

    const { database: { mongo }, promise, std } = adone;
    const { ReplSet, Server, Mongos, Db } = adone.private(mongo);

    const replicaSet = "rs";

    it("should throw error due to mongos connection usage", async () => {
        expect(() => {
            new ReplSet([
                new Server("localhost", 28390),
                new Server("localhost", 28391),
                new Mongos([new Server("localhost", 28392)])
            ], { replicaSet });
        }).to.throw();
    });

    it("should correctly handle error when no server up in replicaset", async () => {
        const replSet = new ReplSet([
            new Server("localhost", 28390),
            new Server("localhost", 28391),
            new Server("localhost", 28392)
        ], { replicaSet });

        const db = new Db("tests_", replSet, { w: 0 });
        await assert.throws(async () => {
            await db.open();
        });
        await promise.delay(1000);
    });

    it("should correctly connect with default replicaset", async () => {
        const managers = await this.server.secondaries();
        await managers[0].stop();
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet });
        const db = new Db("tests_", replSet, { w: 0 });
        await db.open();
        await db.close();
        await promise.delay(1000);
        await this.server.restart();
    });

    it("should correctly connect with default replicaset and no setName specified", async () => {
        const managers = await this.server.secondaries();
        await managers[0].stop();
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ]);
        const db = new Db("tests_", replSet, { w: 0 });
        await db.open();
        await db.close();
        await promise.delay(1000);
        await this.server.restart();
    });

    it("should correctly connect with default replicaset and socket options set", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { socketOptions: { keepAlive: 100 }, replicaSet });
        const db = new Db("tests_", replSet, { w: 0 });
        await db.open();
        const connection = db.serverConfig.connections()[0];
        expect(connection.keepAliveInitialDelay).to.be.equal(100);
        await db.close();
        await promise.delay(1000);
    });

    it("should emit close", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet });
        const db = new Db("tests_", replSet, { w: 0 });
        await db.open();
        const s = spy();
        db.on("close", s);
        await db.close();
        expect(s).to.have.been.calledOnce();
        await promise.delay(1000);
    });

    it("should correctly pass error when wrong replicaSet", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet: `${replicaSet}-wrong` });

        const db = new Db("tests_", replSet, { w: 0 });
        await assert.throws(async () => {
            await db.open();
        });
    });

    const ensureConnection = async (retries = 100) => {
        for (let i = 0; i < retries; ++i) {
            const replSet = new ReplSet([
                new Server(this.host, this.port),
                new Server(this.host, this.port + 1),
                new Server(this.host, this.port + 2)
            ], { replicaSet, socketOptions: { connectTimeoutMS: 1000 } });
            const db = new Db("tests_", replSet, { w: 0 });
            try {
                // eslint-disable-next-line
                await db.open();
                return true;
            } catch (err) {
                //
            } finally {
                // eslint-disable-next-line
                await db.close();
            }
            // eslint-disable-next-line
            await promise.delay(3000);
        }
        throw new Error("Could not connect");
    };

    it("should connect with primary stepped down", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet });
        await this.server.stepDownPrimary(false, { stepDownSecs: 1, force: true });
        await ensureConnection();
        const db = new Db("tests_", replSet, { w: 0 });
        await db.open();
        const connection = db.serverConfig.connections()[0];
        expect(connection.isConnected()).to.be.true();
        await db.close();
        // await promise.delay(1000);
        await this.server.restart();
    });

    it("should connect with third node killed", async () => {
        const managers = await this.server.secondaries();
        await managers[0].stop();
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet });
        await ensureConnection();
        const db = new Db("integration_test_", replSet, { w: 0 });
        await db.open();
        const connection = db.serverConfig.connections()[0];
        expect(connection.isConnected()).to.be.true();
        await db.close();
        await this.server.restart();
    });

    it("should connect with primary node killed", async () => {
        const primary = await this.server.primary();
        await primary.stop();
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet });
        await ensureConnection();
        const db = new Db("integration_test_", replSet, { w: 0 });
        await db.open();
        const connection = db.serverConfig.connections()[0];
        expect(connection.isConnected()).to.be.true();
        await db.close();
        await this.server.restart();
    });

    it("should correctly emit open signal and full set signal", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet });
        const db = new Db("integration_test_", replSet, { w: 0 });
        const open = spy();
        const fullSet = spy();
        db.on("open", open);
        db.on("fullsetup", fullSet);
        await db.open();
        if (!fullSet.called) {
            await fullSet.waitForCall();
        }
        expect(open).to.have.been.calledOnce();
        await db.close();
        await promise.delay(1000);
    });

    it("ReplSet honors socketOptions options", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], {
            socketOptions: {
                connectTimeoutMS: 1000,
                socketTimeoutMS: 3000,
                noDelay: false
            },
            replicaSet
        });
        const db = new Db("tests_", replSet, { w: 0 });
        await db.open();
        const connection = db.serverConfig.connections()[0];
        expect(connection.connectionTimeout).to.be.equal(1000);
        expect(connection.socketTimeout).to.be.equal(3000);
        expect(connection.noDelay).to.be.false();
        await db.close();
        await promise.delay(1000);
    });

    it("should correctly emit all signals even if not yet connected", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet });
        const db = new Db("tests_", replSet, { w: 1 });
        const db2 = db.db("tests_2");
        const close = spy();
        const open1 = spy();
        const open2 = spy();
        const fullSet1 = spy();
        const fullset2 = spy();
        db.on("close", close);
        db2.on("close", close);
        db.on("open", open1);
        db2.on("open", open2);
        db.on("fullsetup", fullSet1);
        db2.on("fullsetup", fullset2);
        await db.open();
        await Promise.all([
            fullSet1.waitForCall(),
            fullset2.waitForCall()
        ]);
        const collection1 = db.collection("replset_connection_2");
        const collection2 = db2.collection("replset_connection_2");
        await collection1.insert({ value: "something" });
        await collection2.insert({ value: "something" });
        await db2.close();
        await promise.delay(1000);
        expect(open1).to.have.been.calledOnce();
        expect(open2).to.have.been.calledOnce();
        expect(close).to.have.been.calledTwice();
    });

    it("should receive all events for primary and secondary leaving", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet });
        const left = spy();
        const joined = spy();
        replSet.on("left", left);
        replSet.on("joined", joined);
        const db = new Db("tests_", replSet, { w: 0 });
        await db.open();
        const seconaryLeft = left.waitForCall();
        const managers = await this.server.secondaries();
        await managers[0].stop();
        await seconaryLeft;
        await joined.waitForCall();
        await db.collection("replset_connection_3").insert({ a: 1 });
        expect(await db.collection("replset_connection_3").count()).to.be.equal(1);
        await db.close();
        await this.server.restart();
    });

    it("should fail due to bufferMaxEntries = 0 not causing any buffering", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet });
        const db = new Db("tests_", replSet, { w: 1, bufferMaxEntries: 0 });
        await db.open();
        const left = spy();
        db.serverConfig.on("left", left);
        const primaryLeft = left.waitForArgs("primary");
        const primary = await this.server.primary();
        await primary.stop();
        await primaryLeft;
        await assert.throws(async () => {
            await db.collection("_should_fail_due_to_bufferMaxEntries_0").insert({ a: 1 });
        });
        await db.close();
        await this.server.restart();
    });

    it("should correctly connect to a replicaset with additional options", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`,
                `${this.host}:${this.port + 2}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet
            }).toString()
        });
        const db = await mongo.connect(url, {
            replSet: {
                haInterval: 500,
                socketOptions: {
                    connectTimeoutMS: 500
                }
            }
        });
        expect(db.serverConfig.connections()[0].connectionTimeout).to.be.equal(500);
        expect(db.serverConfig.connections()[0].socketTimeout).to.be.equal(360000);
        const r = await db.collection("replicaset_mongo_client_collection").update({ a: 1 }, { b: 1 }, { upsert: true });
        expect(r.result.n).to.be.equal(1);
        await db.close();
        await promise.delay(1000);
    });

    it("should correctly connect to a replicaset with readPreference set", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`,
                `${this.host}:${this.port + 2}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet,
                readPreference: "primary"
            }).toString()
        });
        const db = await mongo.connect(url);
        await db.collection("replset_correctly_connect_test_collection").insert({ a: 1 });
        await db.close();
        await promise.delay(1000);
    });

    it("should give an error for non-existing servers", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `nolocalhost:${this.port}`,
                `nolocalhost:${this.port + 1}`,
                `nolocalhost:${this.port + 2}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet,
                readPreference: "primary"
            }).toString()
        });
        await assert.throws(async () => {
            await mongo.connect(url);
        }, "failed to connect");
    });

    it("should correctly connect to a replicaset with writeConcern specified and GridStore should inherit correctly", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`,
                `${this.host}:${this.port + 2}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet,
                w: "majority",
                wtimeoutMS: 5000
            }).toString()
        });
        const db = await mongo.connect(url);
        const gridStore = new mongo.GridStore(db, new mongo.ObjectId());
        expect(gridStore.writeConcern.w).to.be.equal("majority");
        expect(gridStore.writeConcern.wtimeout).to.be.equal(5000);
        await db.close();
        await promise.delay(1000);
    });

    it("should correctly remove server going into recovery mode", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet, socketTimeoutMS: 5000 });
        const db = new Db("tests_", replSet, { w: 1 });
        const fullSet = spy();
        db.on("fullsetup", fullSet);
        await db.open();
        if (!fullSet.called) {
            await fullSet.waitForCall();
        }
        const result = await db.command({ ismaster: true });
        const secondaries = [];
        result.hosts.forEach((s) => {
            if (result.primary !== s && result.arbiters.indexOf(s) === -1) {
                secondaries.push(s);
            }
        });
        // Get the arbiters
        const host = secondaries[0].split(":")[0];
        const port = parseInt(secondaries[0].split(":")[1], 10);
        const db1 = new Db("integration_test_", new Server(host, port), { w: 1 });
        const left = spy();
        db.serverConfig.on("left", left);
        const primaryLeft = left.waitForArgs("primary");
        await db1.open();
        await db1.admin().command({ replSetMaintenance: 1 });
        await primaryLeft;
        await db1.admin().command({ replSetMaintenance: 0 });
        await db.close();
        await db1.close();
        await promise.delay(1000);
    });

    it("should return single server direct connection when replicaSet not provided", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            hostname: this.host,
            port: this.port,
            pathname: "/tests_"
        });
        const db = await mongo.connect(url);
        expect(db.serverConfig).to.be.instanceOf(Server);
        await db.close();
        await promise.delay(1000);
    });

    it("should correctly connect to arbiter with single connection", async () => {
        const managers = await this.server.arbiters();
        const host = managers[0].host;
        const port = managers[0].port;
        const db = new Db("integration_test_", new Server(host, port), { w: 1 });
        await db.open();
        await db.command({ ismaster: true });
        await assert.throws(async () => {
            await db.collection("replset_connection_0").insert({ a: 1 });
        });
        await db.close();
        await this.server.restart();
    });

    it("should correctly connect to secondary with single connection", async () => {
        const managers = await this.server.secondaries();
        const host = managers[0].host;
        const port = managers[0].port;
        const db = new Db("integration_test_", new Server(host, port), { w: 1 });
        await db.open();
        await db.command({ ismaster: true });
        await assert.throws(async () => {
            await db.collection("replset_connection_1").insert({ a: 1 });
        });
        await db.close();
        await this.server.restart();
    });

    it("replicaset connection where a server is standalone", async () => {
        const primary = await this.server.primary();
        const nonReplSetMember = new ServerManager("mongod", {
            bind_ip: primary.host,
            port: primary.port,
            dbpath: primary.options.dbpath
        });
        await primary.stop();
        await nonReplSetMember.purge();
        await nonReplSetMember.start();
        await this.server.waitForPrimary();
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`,
                `${this.host}:${this.port + 2}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet
            }).toString()
        });
        const db = await mongo.connect(url);
        expect(db.serverConfig).to.be.instanceOf(ReplSet);
        await db.close();
        await nonReplSetMember.stop();
        await this.server.restart();
    });

    it("should correctly modify the server reconnectTries for all replset instances", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`,
                `${this.host}:${this.port + 2}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet
            }).toString()
        });
        const db = await mongo.connect(url, { reconnectTries: 10 });
        const servers = db.serverConfig.s.replset.s.replicaSetState.allServers();
        for (const server of servers) {
            expect(server.s.pool.options.reconnectTries).to.be.equal(10);
        }
        await db.close();
        await promise.delay(1000);
    });

    it("should correctly connect to a replicaset with auth options, bufferMaxEntries and connectWithNoPrimary", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            auth: "me:secret",
            host: [
                `${this.host}:${this.port + 1}`,
                `${this.host}:${this.port + 2}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet
            }).toString()
        });
        await assert.throws(async () => {
            await mongo.connect(url, {
                connectWithNoPrimary: true,
                bufferMaxEntries: 0
            });
        }, "no connection available for operation and number of stored operation");
    });
});
