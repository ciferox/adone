describe("replset read preference", function () {
    if (this.topology !== "replicaset") {
        return;
    }

    const { promise, database: { mongo }, fs } = adone;
    const { __: { ReplSet, Server, Db }, ReadPreference } = mongo;

    const replicaSet = "rs";

    it("should correctly pick lowest ping time", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { secondaryAcceptableLatencyMS: 5, replicaSet, debug: true });

        const db = new Db("tests_", replSet, { w: 1 });
        const joined = spy();
        db.serverConfig.on("joined", joined);
        const allJoined = joined.waitForNCalls(3);
        await db.open();
        await allJoined;

        let time = 10;
        const byTime = db.serverConfig.replset.getServers({ ignoreArbiters: true });
        byTime.forEach((s) => {
            s.lastIsMasterMS = time;
            time = time + 10;
        });

        const result = await db.command({ ismaster: true });
        const secondaries = [];
        const hosts = result.hosts.concat(result.passives || []);
        hosts.forEach((s) => {
            if (result.primary !== s && result.arbiters.indexOf(s) === -1) {
                secondaries.push(s);
            }
        });

        const pickedServer = spy();
        db.serverConfig.replset.on("pickedServer", pickedServer);
        await db.collection("somecollection").findOne({}, { readPreference: new ReadPreference(ReadPreference.NEAREST) });
        expect(pickedServer).to.have.been.calledOnce;
        {
            const { args: [, server] } = pickedServer.getCall(0);
            expect(server.name).to.be.equal(byTime[0].name);
        }
        await db.collection("somecollection").findOne({}, { readPreference: new ReadPreference(ReadPreference.SECONDARY) });
        expect(pickedServer).to.have.been.calledTwice;
        {
            const { args: [, server] } = pickedServer.getCall(1);
            expect(secondaries).to.include(server.name);
        }
        await db.collection("somecollection").findOne({}, { readPreference: new ReadPreference(ReadPreference.SECONDARY_PREFERRED) });
        expect(pickedServer).to.have.been.calledThrice;
        {
            const { args: [, server] } = pickedServer.getCall(2);
            expect(secondaries).to.include(server.name);
        }
        await db.collection("somecollection").findOne({}, { readPreference: new ReadPreference(ReadPreference.PRIMARY) });
        expect(pickedServer).to.have.callCount(4);
        {
            const { args: [, server] } = pickedServer.getCall(3);
            expect(server.name).to.be.equal(`${this.host}:${this.port}`);
        }
        await db.close();
    });

    it("should correctly vary read server when using readpreference NEAREST", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { readPreference: ReadPreference.NEAREST, replicaSet, debug: true });
        const db = new Db("tests_", replSet, { w: 1, readPreference: ReadPreference.NEAREST });
        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }
        const viewedServers = new Set();
        db.serverConfig.replset.on("pickedServer", (readPreference, server) => {
            viewedServers.add(server.name);
        });
        await db.collection("nearest_collection_test").findOne({ a: 1 });
        await db.collection("nearest_collection_test").findOne({ a: 1 });
        await db.collection("nearest_collection_test").findOne({ a: 1 });
        expect(viewedServers).to.have.property("size").at.least(2);
        await db.close();
    });

    it("should correctly vary read server when using readpreference NEAREST passed at collection level", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { readPreference: ReadPreference.NEAREST, replicaSet, debug: true });
        const db = new Db("tests_", replSet, { w: 1 });
        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }
        const viewedServers = new Set();
        db.serverConfig.replset.on("pickedServer", (readPreference, server) => {
            viewedServers.add(server.name);
        });
        while (viewedServers.size < 2) {
            await db.collection("nearest_collection_test", { readPreference: "nearest" }).findOne({ a: 1 });
            await db.collection("nearest_collection_test").findOne({ a: 1 });
        }
        await db.close();
    });

    it("should correctly read from grid store with secondary read preference", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { readPreference: ReadPreference.NEAREST, replicaSet, debug: true });
        const db = new Db("tests_", replSet, { w: 1 });

        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const id = new mongo.ObjectId();
        let gridStore = new mongo.GridStore(db, id, "w", { w: 4 });
        gridStore.chunkSize = 5000;

        const result = await db.command({ ismaster: true });
        const secondaries = [];
        result.hosts.forEach((s) => {
            if (result.primary !== s && result.arbiters.indexOf(s) === -1) {
                secondaries.push(s);
            }
        });

        const file = new fs.File(__dirname, "fixtures", "test_gs_weird_bug.png");
        const data = await file.contents("buffer");

        await gridStore.open();
        await gridStore.write(data);
        const doc = await gridStore.close();
        const pickedServer = spy();
        db.serverConfig.replset.on("pickedServer", pickedServer);

        gridStore = new mongo.GridStore(db, doc._id, "r", { readPreference: ReadPreference.SECONDARY });
        await gridStore.open();
        expect(await gridStore.read()).to.be.deep.equal(data);
        await gridStore.close();

        await db.close();

        expect(pickedServer).to.have.been.called;
        for (let i = 0; i < pickedServer.callCount; ++i) {
            const { args: [, server] } = pickedServer.getCall(i);
            expect(server.name).to.be.oneOf(secondaries);
        }
    });

    it("connection to replicaset with primary read preference", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { readPreference: ReadPreference.NEAREST, replicaSet, debug: true });
        const db = new Db("tests_", replSet, { w: 0, readPreference: ReadPreference.PRIMARY });

        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const result = await db.command({ ismaster: true });
        const pickedServer = spy();
        db.serverConfig.replset.on("pickedServer", pickedServer);

        const collection = db.collection("read_preference_replicaset_test_0");
        await collection.find().toArray();

        await db.close();

        expect(pickedServer).to.have.been.called;
        for (let i = 0; i < pickedServer.callCount; ++i) {
            const { args: [, server] } = pickedServer.getCall(i);
            expect(server.name).to.be.equal(result.primary);
        }
    });

    it("should set read preference at collection level using collection method", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet, debug: true });
        const db = new Db("tests_", replSet, { w: 0 });

        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const result = await db.command({ ismaster: true });
        const secondaries = [];
        result.hosts.forEach((s) => {
            if (result.primary !== s && result.arbiters.indexOf(s) === -1) {
                secondaries.push(s);
            }
        });

        const pickedServer = spy();
        db.serverConfig.replset.on("pickedServer", pickedServer);

        const collection = db.collection("read_preferences_all_levels_0", { readPreference: ReadPreference.SECONDARY });
        const cursor = collection.find();
        await cursor.toArray();
        expect(cursor.readPreference.preference).to.be.equal(ReadPreference.SECONDARY);

        await db.close();

        expect(pickedServer).to.have.been.called;
        for (let i = 0; i < pickedServer.callCount; ++i) {
            const { args: [, server] } = pickedServer.getCall(i);
            expect(server.name).to.be.oneOf(secondaries);
        }
    });

    it("should set read preference at collection level using createCollection method", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet, debug: true });

        const db = new Db("tests_", replSet, { w: 0 });
        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const result = await db.command({ ismaster: true });
        const secondaries = [];
        result.hosts.forEach((s) => {
            if (result.primary !== s && result.arbiters.indexOf(s) === -1) {
                secondaries.push(s);
            }
        });

        const collection = await db.createCollection("read_preferences_all_levels_1", { readPreference: ReadPreference.SECONDARY });

        const pickedServer = spy();
        db.serverConfig.replset.on("pickedServer", pickedServer);

        const cursor = collection.find();
        await cursor.toArray();
        expect(cursor.readPreference.preference).to.be.equal(ReadPreference.SECONDARY);

        await db.close();

        expect(pickedServer).to.have.been.called;
        for (let i = 0; i < pickedServer.callCount; ++i) {
            const { args: [, server] } = pickedServer.getCall(i);
            expect(server.name).to.be.oneOf(secondaries);
        }
    });

    it("should Set read preference at cursor level", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet, debug: true });

        const db = new Db("tests_", replSet, { w: 0 });
        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const result = await db.command({ ismaster: true });
        const secondaries = [];
        result.hosts.forEach((s) => {
            if (result.primary !== s && result.arbiters.indexOf(s) === -1) {
                secondaries.push(s);
            }
        });

        const pickedServer = spy();
        db.serverConfig.replset.on("pickedServer", pickedServer);

        const collection = db.collection("read_preferences_all_levels_1");
        const cursor = collection.find().setReadPreference(ReadPreference.SECONDARY);
        await cursor.toArray();
        expect(cursor.readPreference.preference).to.be.equal(ReadPreference.SECONDARY);

        await db.close();

        expect(pickedServer).to.have.been.called;
        for (let i = 0; i < pickedServer.callCount; ++i) {
            const { args: [, server] } = pickedServer.getCall(i);
            expect(server.name).to.be.oneOf(secondaries);
        }
    });

    it("attempt to change read preference at cursor level after object read legacy", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet, debug: true });

        const db = new Db("tests_", replSet, { w: 0 });
        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const collection = db.collection("read_preferences_all_levels_2");
        await collection.insert([{ a: 1 }, { b: 1 }, { c: 1 }], { w: 4 });

        const cursor = collection.find().setReadPreference(ReadPreference.SECONDARY);
        expect(await cursor.nextObject()).to.be.ok;
        expect(() => {
            cursor.setReadPreference(ReadPreference.PRIMARY);
        }).to.throw(/cannot change.+after cursor has been accessed/);
        expect(cursor.readPreference.preference).to.be.equal(ReadPreference.SECONDARY);
        await cursor.close();

        await db.close();
    });

    it("set read preference at db level", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet, debug: true });

        const db = new Db("tests_", replSet, { w: 0, readPreference: new ReadPreference(ReadPreference.SECONDARY) });
        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const result = await db.command({ ismaster: true });
        const secondaries = [];
        result.hosts.forEach((s) => {
            if (result.primary !== s && result.arbiters.indexOf(s) === -1) {
                secondaries.push(s);
            }
        });

        const pickedServer = spy();
        db.serverConfig.replset.on("pickedServer", pickedServer);

        const collection = db.collection("read_preferences_all_levels_2");
        const cursor = collection.find();
        await cursor.toArray();
        expect(cursor.readPreference.preference).to.be.equal(ReadPreference.SECONDARY);

        await db.close();
    });

    it("set read preference at collection level using collection method", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet, debug: true });

        const db = new Db("tests_", replSet, { w: 0 });
        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const collection = db.collection("read_preferences_all_levels_3", { readPreference: new ReadPreference(ReadPreference.SECONDARY) });
        const cursor = collection.find();
        await cursor.toArray();
        expect(cursor.readPreference.preference).to.be.equal(ReadPreference.SECONDARY);

        await db.close();
    });

    it("ensure tag read goes only to the correct server", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet, debug: true });

        const db = new Db("local", replSet, { w: 0, readPreference: new ReadPreference(ReadPreference.SECONDARY, { loc: "sf" }) });

        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const pickedServer = spy();
        db.serverConfig.replset.on("pickedServer", pickedServer);

        await db.db("local").collection("system.replset").find().toArray();

        expect(pickedServer).to.have.been.calledOnce;
        const { args: [readPreference] } = pickedServer.getCall(0);
        expect(readPreference.tags.loc).to.be.equal("sf");
        expect(readPreference.preference).to.be.equal("secondary");

        await db.close();
    });

    it("ensure tag read goes only to the correct servers using nearest", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet, debug: true });

        const db = new Db("local", replSet, { w: 0, readPreference: new ReadPreference(ReadPreference.NEAREST, { loc: "ny" }) });

        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const pickedServer = spy();
        db.serverConfig.replset.on("pickedServer", pickedServer);

        await db.db("local").collection("system.replset").find().toArray();

        expect(pickedServer).to.have.been.calledOnce;
        const { args: [, server] } = pickedServer.getCall(0);
        expect(server.lastIsMaster().tags.loc).to.be.equal("ny");

        await db.close();
    });

    it("always uses primary readPreference for findAndModify", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { replicaSet, debug: true });

        const db = new Db("tests_", replSet, { w: 0, readPreference: new ReadPreference(ReadPreference.SECONDARY_PREFERRED) });

        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        const result = await db.command({ ismaster: true });
        const secondaries = [];
        result.hosts.forEach((s) => {
            if (result.primary !== s && result.arbiters.indexOf(s) === -1) {
                secondaries.push(s);
            }
        });

        const pickedServer = spy();
        db.serverConfig.replset.on("pickedServer", pickedServer);

        await db.collection("test").findAndModify({}, {}, { upsert: false });

        expect(pickedServer).to.have.been.calledOnce;
        const { args: [, server] } = pickedServer.getCall(0);
        expect(server.name).to.be.equal(`${this.host}:${this.port}`);

        await db.close();
    });

    it("should correctly apply read preference for direct secondary connection", async () => {
        const replSet = new ReplSet([
            new Server(this.host, this.port),
            new Server(this.host, this.port + 1),
            new Server(this.host, this.port + 2)
        ], { readPreference: ReadPreference.NEAREST, replicaSet, debug: true });

        let db = new Db("tests_", replSet, { w: "majority", wtimeout: 10000 });

        const fullSetup = spy();
        db.on("fullsetup", fullSetup);
        await db.open();
        if (!fullSetup.called) {
            await fullSetup.waitForCall();
        }

        await db.collection("direct_secondary_read_test").insertMany([{ a: 1 }, { a: 1 }, { a: 1 }, { a: 1 }]);
        await promise.delay(1000);
        await db.close();

        db = await mongo.connect(`mongodb://localhost:${this.port + 1}/tests_?readPreference=nearest`);
        expect(db.serverConfig).to.be.instanceOf(Server);
        expect(await db.collection("direct_secondary_read_test").count()).to.be.equal(4);
        await db.close();
    });
});
