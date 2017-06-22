describe("authentication", function () {
    const { database: { mongo }, util, promise } = adone;
    const { __: { Db, Mongos, Server, ReplSet } } = mongo;
    const { range } = util;

    it.skip("should fail due to illegal authentication mechanism", async () => {

    });

    if (this.topology === "auth") {
        it("should correctly authenticate with kay.kay", async () => {
            await this.restart(true);
            await this.db.admin().addUser("kay:kay", "abc123");
            await this.db.admin().authenticate("kay:kay", "abc123");
            const client = await mongo.connect(this.url({ username: "kay:kay", password: "abc123", database: "admin" }));
            await client.close();
            await this.restart(true);
        });
    }

    if (this.topology === "replicaset") {
        it("should correctly retrieve replset get status with promises", async () => {
            const collection = this.db.collection("test_with_promise");

            // Force the creation of the collection by inserting a document
            // Collections are not created until the first document is inserted
            await collection.insertOne({ a: 1 }, { w: 1 });
            // Use the admin database for the operation
            const adminDb = this.db.admin();

            // Add the new user to the admin database
            expect(await adminDb.addUser("admin14", "admin14")).to.be.ok;
            // Authenticate using the newly added user
            expect(await adminDb.authenticate("admin14", "admin14")).to.be.true;
            // Retrive the server Info, returns error if we are not
            // running a replicaset
            expect(await adminDb.replSetGetStatus()).to.be.ok;

            expect(await adminDb.removeUser("admin14")).to.be.ok;
        });
    }

    if (this.topology === "single") {
        it("should correctly call validate collection using authenticated mode", async () => {
            const collection = this.db.collection("shouldCorrectlyCallValidateCollectionUsingAuthenticatedMode");
            await collection.insert({ a: 1 }, { w: 1 });
            const adminDb = this.db.admin();
            await adminDb.addUser("admin", "admin");

            expect(await adminDb.authenticate("admin", "admin")).to.be.true;
            const doc = await adminDb.validateCollection("shouldCorrectlyCallValidateCollectionUsingAuthenticatedMode");
            expect(doc).to.be.ok;
            await adminDb.removeUser("admin");
        });

        it("should correctly issue authenticated event on successful authentication", async () => {
            const authenticated = new Promise((resolve) => this.db.once("authenticated", resolve));

            const collection = this.db.collection("test");

            // Force the creation of the collection by inserting a document
            // Collections are not created until the first document is inserted
            await collection.insert({ a: 1 }, { w: 1 });

            // Use the admin database for the operation
            const adminDb = this.db.admin();

            // Add the new user to the admin database
            expect(await adminDb.addUser("admin15", "admin15")).to.be.ok;
            // Authenticate using the newly added user
            expect(await adminDb.authenticate("admin15", "admin15")).to.be.true;
            await authenticated;
            await adminDb.removeUser("admin15");
        });
    }

    if (this.topology === "auth") {
        it("should correctly authenticate against admin db", async () => {
            await this.restart(true);
            await this.db.admin().addUser("admin", "admin");
            await assert.throws(async () => {
                await this.db.collection("test").insert({ a: 1 });
            });

            expect(await this.db.admin().authenticate("admin", "admin")).to.be.true;
            await this.db.collection("test").insert({ a: 1 });
            await this.db.admin().logout();
            await assert.throws(async () => {
                await this.db.collection("test").insert({ a: 1 });
            });
            await this.restart(true);
        });

        it("should correctly authenticate against normal db", async () => {
            const { db } = this;
            await this.restart(true);
            // An admin user must be defined for db level authentication to work correctly
            await db.admin().addUser("admin", "admin");
            await db.admin().authenticate("admin", "admin");
            await db.addUser("user", "user");
            await db.admin().logout();
            await assert.throws(async () => {
                await db.collection("test").insert({ a: 1 });
            });
            await db.authenticate("user", "user");
            await db.collection("test").insert({ a: 1 });
            await db.logout();
            await assert.throws(async () => {
                await db.collection("test").insert({ a: 1 });
            });
            await this.restart(true);
        });

        it("should correctly authenticate against normal db with large connection pool", async () => {
            await this.restart(true);
            const DB = new Db(this.database, new Server(this.host, this.port, {
                autoReconnect: false,
                poolSize: 500,
                socketOptions: {
                    connectTimeoutMS: 20000,
                    socketTimeoutMS: 20000
                }
            }), {
                w: 1
            });
            const db = await DB.open();
            await db.admin().addUser("admin", "admin");
            await db.admin().authenticate("admin", "admin");
            await db.addUser("user", "user");
            await db.admin().logout();
            await assert.throws(async () => {
                await db.collection("test").insert({ a: 1 });
            });
            await db.authenticate("user", "user");
            await db.collection("test").insert({ a: 1 });
            await db.logout();
            await assert.throws(async () => {
                await db.collection("test").insert({ a: 1 });
            });
            await this.restart(true);
        });

        it("should correctly reapply the authentications", async () => {
            await this.restart(true);
            const DB = new Db(this.database, new Server(this.host, this.port, {
                autoReconnect: true
            }), {
                w: 1
            });
            const db = await DB.open();
            await db.admin().addUser("admin", "admin");

            await assert.throws(async () => {
                await db.collection("test").insert({ a: 1 });
            });
            await db.admin().authenticate("admin", "admin");
            await db.collection("test").insert({ a: 1 });
            await this.restart(false);
            await db.admin().authenticate("admin", "admin");
            await db.collection("test").insert({ a: 1 });
            await db.collection("test").insert({ a: 1 });
            await db.collection("test").insert({ a: 1 });
            await db.collection("test").insert({ a: 1 });
            await db.close();
            await this.restart(true);
        });

        it("ordered bulk operation should fail correctly when not authenticated", async () => {
            await this.restart(true);
            const { db } = this;
            await db.admin().addUser("admin", "admin");
            // Attempt to save a document
            const collection = db.collection("test");

            // Initialize the Ordered Batch
            const batch = collection.initializeOrderedBulkOp();

            // Add some operations to be executed in order
            batch.insert({ a: 1 });
            batch.find({ a: 1 }).updateOne({ $set: { b: 1 } });
            batch.find({ a: 2 }).upsert().updateOne({ $set: { b: 2 } });
            batch.insert({ a: 3 });
            batch.find({ a: 3 }).remove({ a: 3 });

            const err = await assert.throws(async () => {
                await batch.execute();
            });

            expect(err.code).to.be.ok;
            expect(err.errmsg).to.be.ok;

            await this.restart(true);
        });

        it("unordered bulk operation should fail correctly when not authenticated", async () => {
            await this.restart(true);
            const { db } = this;
            await db.admin().addUser("admin", "admin");
            // Attempt to save a document
            const collection = db.collection("test");

            // Initialize the Ordered Batch
            const batch = collection.initializeUnorderedBulkOp();

            // Add some operations to be executed in order
            batch.insert({ a: 1 });
            batch.find({ a: 1 }).updateOne({ $set: { b: 1 } });
            batch.find({ a: 2 }).upsert().updateOne({ $set: { b: 2 } });
            batch.insert({ a: 3 });
            batch.find({ a: 3 }).remove({ a: 3 });

            const err = await assert.throws(async () => {
                await batch.execute();
            });

            expect(err.code).to.be.ok;
            expect(err.errmsg).to.be.ok;

            await this.restart(true);
        });

        describe("replicaset", function () {
            this.timeout(600000);

            let replset = null;
            let manager = null;

            before("create replicaset auth db server", async function () {
                this.timeout(300000);
                ({ server: manager } = await this.dispatcher.getReplicasetAuthServer({ start: false }));
            });

            beforeEach("start replicaset auth db server", async function () {
                this.timeout(300000);
                await manager.purge();
                await manager.start();
                replset = new ReplSet([
                    new Server("localhost", 38010),
                    new Server("localhost", 38011)
                ], { rs_name: "rs", poolSize: 1 });
            });

            afterEach("stop replicaset auth db server", async function () {
                this.timeout(300000);
                await manager.stop();
                await manager.purge();
            });

            it("should correctly handle replicaset master stepdown and stepup without loosing auth", async () => {
                const db = await new Db("replicaset_test_auth", replset, { w: 1 }).open();
                await db.admin().addUser("root", "root", { w: 3, wtimeout: 25000 });
                expect(await db.admin().authenticate("root", "root")).to.be.ok;
                await manager.stepDownPrimary(false, { stepDownSecs: 1, force: true }, {
                    provider: "default",
                    db: "admin",
                    user: "root",
                    password: "root"
                });
                await db.collection("replicaset_test_auth").insert({ a: 1 }, { w: 1 });
                await db.close();
            });

            it("should correctly perform nearest read from secondaries without auth fail when priamry is first seed", async () => {
                let db = await new Db("replicaset_test_auth", replset, {
                    w: 1,
                    readPreference: mongo.ReadPreference.NEAREST
                }).open();
                await db.admin().addUser("root", "root", { w: 3, wtimeout: 25000 });
                await db.close();
                db = await mongo.connect("mongodb://root:root@localhost:38010,localhost:38011,localhost:38012/admin?replicaSet=rs&readPreference=nearest");
                await db.collection("replicaset_test_auth").insert({ a: 1 }, { w: 1 });
                await db.collection("replicaset_test_auth").findOne({});
                await db.collection("replicaset_test_auth").findOne({});
                await db.collection("replicaset_test_auth").findOne({});
                await db.collection("replicaset_test_auth").findOne({});
                await db.close();
            });

            it("should correctly create indexes without hanging when different seedlists", async () => {
                let db = await new Db("replicaset_test_auth", replset, {
                    w: 1,
                    readPreference: mongo.ReadPreference.NEAREST
                }).open();
                await db.admin().addUser("root", "root", { w: 3, wtimeout: 25000 });
                await db.close();
                db = await mongo.connect("mongodb://root:root@localhost:38010,localhost:38011,localhost:38012/admin?replicaSet=rs&readPreference=secondary");
                // Attempt create index
                await db.db("replicaset_test_auth")
                    .collection("createIndexes1")
                    .ensureIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
                await db.close();

                db = await mongo.connect("mongodb://root:root@localhost:38012/admin?replicaSet=rs&readPreference=secondary");
                await db.db("replicaset_test_auth")
                    .collection("createIndexes2")
                    .ensureIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
                await db.close();
            });

            it("should correctly authenticate using primary", async () => {
                const db = await new Db("node-native-test", replset, { w: 1 }).open();
                await db.admin().addUser("admin", "admin", { w: 3, wtimeout: 25000 });
                await db.admin().authenticate("admin", "admin");
                await db.addUser("me", "secret", { w: 3, wtimeout: 25000 });
                await db.close();
                const client = await mongo.connect("mongodb://me:secret@localhost:38010/node-native-test?replicaSet=rs");
                const names = await client.collections();
                expect(names).to.be.empty;
                await client.close();
            });

            it("should correctly authenticate with two seeds", async () => {
                const db = await new Db("node-native-test", replset, { w: 1 }).open();
                await db.admin().addUser("admin", "admin", { w: 3, wtimeout: 25000 });
                await db.admin().authenticate("admin", "admin");
                await db.addUser("me", "secret", { w: 3, wtimeout: 25000 });
                await db.close();
                const client = await mongo.connect("mongodb://me:secret@localhost:38010,localhost:38011/node-native-test?replicaSet=rs");
                const names = await client.collections();
                expect(names).to.be.empty;
                client.close();
            });

            it("should correctly authenticate with only secondary seed", async () => {
                const db = await new Db("node-native-test", replset, { w: 1 }).open();
                await db.admin().addUser("admin", "admin", { w: 3, wtimeout: 25000 });
                await db.admin().authenticate("admin", "admin");
                await db.admin().addUser("me", "secret", { w: 3, wtimeout: 25000 });
                await db.close();

                const client = await mongo.connect("mongodb://me:secret@localhost:38010/node-native-test?authSource=admin&readPreference=secondary&replicaSet=rs&maxPoolSize=1");
                await client.collection("test").insert({ a: 1 });
                await client.logout();
                await assert.throws(async () => {
                    await client.collection("test").findOne();
                });
                expect(await client.admin().authenticate("me", "secret")).to.be.ok;
                const managers = await manager.secondaries();
                await managers[0].stop();
                await managers[1].stop();
                await managers[0].start();
                await managers[1].start();
                await new Promise((resolve) => client.serverConfig.once("joined", resolve));
                await client.collection("test").findOne();
                await client.close();
            });

            it("should correctly authenticate with multiple logins and logouts", async () => {
                const db = await new Db("foo", replset, { w: 1 }).open();
                await db.admin().addUser("me", "secret", { w: 3, wtimeout: 25000 });
                await assert.throws(async () => {
                    await db.collection("stuff").insert({ a: 2 }, { w: 3 });
                });
                expect(await db.admin().authenticate("me", "secret")).to.be.ok;
                await db.admin().addUser("me2", "secret2", { w: 3, wtimeout: 25000 });
                await db.admin().authenticate("me2", "secret2");
                await assert.doesNotThrow(async () => {
                    await db.collection("stuff").insert({ a: 3 }, { w: 3, wtimeout: 25000 });
                });
                await assert.doesNotThrow(async () => {
                    expect(await db.collection("stuff").findOne()).to.include({ a: 3 });
                });
                await db.admin().logout();
                await assert.throws(async () => {
                    await db.collection("stuff").findOne();
                });
                const managers = await manager.secondaries();
                const slaveDb = await new Db("foo", new Server(managers[0].host, managers[0].port, {
                    auto_reconnect: true,
                    poolSize: 1,
                    rs_name: "rs"
                }), {
                    w: 1,
                    readPreference: mongo.ReadPreference.SECONDARY
                }).open();
                await assert.throws(async () => {
                    await slaveDb.collection("stuff").findOne();
                });
                await slaveDb.admin().authenticate("me2", "secret2");
                expect(await slaveDb.collection("stuff").findOne()).to.include({ a: 3 });
                await db.close();
                await slaveDb.close();
            });

            it("should correctly authenticate and ensure index", async () => {
                const db = await new Db("foo", replset, { w: 1 }).open();
                await db.admin().addUser("me", "secret", { w: 3 });
                await db.admin().authenticate("me", "secret");
                await db.addUser("test", "test", { w: 3, wtimeout: 25000 });
                await db.authenticate("test", "test");
                const userconfirm = await db.collection("userconfirm");
                const ensureIndexOptions = { unique: true, w: 0, background: true };
                await userconfirm.ensureIndex([["confirmcode", 1]], ensureIndexOptions);
                const session = await db.collection("session");
                await session.ensureIndex([["sid", 1]], ensureIndexOptions);
                await db.close();
            });

            it("should correctly authenticate and use ReadPreference", async () => {
                const db = await new Db("foo", replset, { w: 1 }).open();
                await db.admin().addUser("me", "secret", { w: 3, wtimeout: 25000 });
                await db.admin().authenticate("me", "secret");
                await db.addUser("test", "test", { w: 3, wtimeout: 25000 });
                await db.authenticate("test", "test");
                await db.collection("userconfirm2").insert({ a: 1 }, { w: 1 });
                expect(await db.collection("userconfirm2").findOne()).to.include({ a: 1 });
                await db.close();
            });

            it("should correctly bring replicaset stepdown primary and still read from secondary", async () => {
                const db = await new Db("foo", replset, { w: 1 }).open();
                await db.admin().addUser("me", "secret", { w: 3, wtimeout: 25000 });
                await db.admin().authenticate("me", "secret");
                await db.collection("test").insert({ a: 1 }, { w: 1 });
                await db.addUser("test", "test", { w: 3, wtimeout: 25000 });
                const joined = new Promise((resolve) => {
                    db.serverConfig.on("joined", (t) => {
                        if (t === "primary") {
                            resolve();
                        }
                    });
                });

                db.serverConfig.on("left", () => {
                    //
                });

                await manager.stepDownPrimary(false, {
                    stepDownSecs: 1,
                    force: true,
                    returnImmediately: true
                }, {
                    provider: "default",
                    db: "admin",
                    user: "me",
                    password: "secret"
                });
                await joined;
                await Promise.all(range(10).map(() => {
                    return db.collection("test")
                        .find({ a: 1 })
                        .setReadPreference(mongo.ReadPreference.SECONDARY)
                        .toArray();
                }));
                await db.close();
            });

            it("should correctly auth with secondary after kill primary", async () => {
                const db = await new Db("foo", replset, { w: 1 }).open();
                await db.admin().addUser("admin", "admin", { w: 3, wtimeout: 25000 });
                await db.admin().authenticate("admin", "admin");
                await db.collection("test").insert({ a: 1 }, { w: 1 });
                await db.addUser("test", "test", { w: 3, wtimeout: 25000 });
                expect(await await db.authenticate("test", "test")).to.be.true;
                const primary = await manager.primary();
                await primary.stop();
                await new Promise((resolve) => {
                    db.serverConfig.on("joined", (t) => {
                        if (t === "primary") {
                            resolve();
                        }
                    });
                });
                await Promise.all(range(1000).map(() => {
                    return db.collection("test")
                        .find({ a: 1 })
                        .setReadPreference(mongo.ReadPreference.SECONDARY)
                        .toArray();
                }));
                await db.close();
            });

            it("should correctly auth against replicaset admin db using client", async () => {
                let db = await new Db("admin", replset, { w: 3 }).open();
                await db.admin().addUser("me", "secret", { w: 3, wtimeout: 25000 });
                await db.close();
                db = await mongo.connect("mongodb://me:secret@localhost:38010/admin?rs_name=rs&readPreference=secondary&w=3");
                await db.collection("authcollectiontest").insert({ a: 1 }, { w: 3, wtimeout: 25000 });
                const docs = await db.collection("authcollectiontest").find().toArray();
                expect(docs).to.have.lengthOf(1);
                expect(docs[0]).to.include({ a: 1 });
                await db.close();
            });

            it("should correctly auth against normal db using client", async () => {
                let db = await new Db("foo", replset, { w: 3 }).open();
                await db.admin().addUser("admin", "admin", { w: 3, wtimeout: 25000 });
                await db.admin().authenticate("admin", "admin");
                await db.addUser("me", "secret", { w: 3, wtimeout: 25000 });
                await db.close();
                db = await mongo.connect("mongodb://me:secret@localhost:38010/foo?rs_name=rs&readPreference=secondary&w=3");
                await db.collection("authcollectiontest1").insert({ a: 1 }, { w: 3, wtimeout: 25000 });
                const docs = await db.collection("authcollectiontest1").find().toArray();
                expect(docs).to.have.lengthOf(1);
                expect(docs[0]).to.include({ a: 1 });
                await db.close();
            });

            it("should correctly reauthenticating against multiple databases", async () => {
                let db = await new Db("replicaset_test_reauth", replset, { w: 1 }).open();
                await db.admin().addUser("root", "root", { w: 3, wtimeout: 25000 });
                expect(await db.admin().authenticate("root", "root")).to.be.ok;
                await db.db("test").addUser("test", "test", { w: 3, wtimeout: 25000 });
                await db.db("test2").addUser("test2", "test2", { w: 3, wtimeout: 25000 });
                await db.close();
                db = await mongo.connect("mongodb://test:test@localhost:38010,localhost:38011/test?replicaSet=rs");
                expect(await db.db("test2").authenticate("test2", "test2")).to.be.ok;
                await db.collection("test").findOne({});
                await db.db("test2").collection("test").findOne({});
                const joined = new Promise((resolve) => {
                    db.serverConfig.on("joined", (t) => {
                        if (t === "primary") {
                            resolve();
                        }
                    });
                });
                await manager.stepDownPrimary(false, { stepDownSecs: 1, force: true }, {
                    provider: "default",
                    db: "admin",
                    user: "root",
                    password: "root"
                });
                await joined;
                await db.collection("test").findOne({});
                await db.db("test2").collection("test").findOne({});
                await db.close();
            });
        });

        describe("sharded", function () {
            this.timeout(600000);

            let mongos = null;
            let manager = null;

            before("create sharded auth db server", async function () {
                this.timeout(300000);
                ({ server: manager } = await this.dispatcher.getShardedAuthServer({ start: false }));
            });

            beforeEach("start sharded auth db server", async function () {
                this.timeout(300000);
                await manager.purge();
                await manager.start();
                mongos = new Mongos([
                    new Server("localhost", 51010)
                ], { poolSize: 1 });
            });

            afterEach("stop sharded auth db server", async function () {
                this.timeout(300000);
                await manager.stop();
                await manager.purge();
            });

            it("should correctly connect and authenticate against admin database using mongos", async () => {
                const db = await new Db("node-native-test", mongos, { w: 1 }).open();
                await db.admin().addUser("admin", "admin", { w: "majority" });
                await db.admin().authenticate("admin", "admin");
                await db.addUser("me", "secret", { w: "majority" });
                await db.close();
                await promise.delay(5000);
                const client = await mongo.connect("mongodb://me:secret@localhost:51010/node-native-test");
                expect(await client.collections()).to.be.empty;
                await client.close();
            });

            it("should correctly handle proxy stepdown and stepup without loosing auth for sharding", async () => {
                const db = await new Db("node-native-test", mongos, { w: 1 }).open();
                await db.admin().addUser("admin", "admin", { w: "majority" });
                await db.admin().authenticate("admin", "admin");
                await db.addUser("me", "secret", { w: "majority" });
                await db.close();
                const client = await mongo.connect("mongodb://me:secret@localhost:51010/node-native-test");
                expect(await client.collections()).to.be.empty;
                await manager.proxies[0].stop();
                await manager.proxies[1].stop();
                await manager.proxies[0].start();
                await manager.proxies[1].start();
                expect(await client.collections()).to.be.empty;
                await client.close();
            });
        });
    }
});
