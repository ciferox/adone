describe("connection", function () {
    const { database: { mongo } } = adone;
    const { __: { Db, Server } } = mongo;

    if (this.topology === "single") {
        const openSocketDb = (opts = {}) => {
            opts = Object.assign({ poolSize: 1 }, opts);
            return new Db(this.database, new Server("/tmp/mongodb-27017.sock", undefined, opts), {
                w: 1
            }).open();
        };

        const getDb = (opts = {}) => {
            opts = Object.assign({ poolSize: 1 }, opts);
            return new Db(this.database, new Server(this.host, this.port, opts), {
                w: 1
            });
        };

        it("should correctly start monitoring for single server connection", async () => {
            const db = await openSocketDb();
            await new Promise((resolve) => {
                db.serverConfig.once("monitoring", resolve);
            });
            await db.close();
        });

        it("should correctly disable monitoring for single server connection", async () => {
            const db = await openSocketDb({ monitoring: false });
            expect(db.serverConfig.s.server.s.monitoring).to.be.false;
            await db.close();
        });

        it("should correctly connect to server using domain socket", async () => {
            const db = await openSocketDb();
            await db.collection("domainSocketCollection0").insert({ a: 1 }, { w: 1 });
            const items = await db.collection("domainSocketCollection0").find({ a: 1 }).toArray();
            expect(items).to.have.lengthOf(1);
            await db.close();
        });

        it("Should correctly connect to server using just events", async () => {
            const db = new Db(this.database, new Server(this.host, this.port, { poolSize: 1 }), {
                w: 1
            });
            const open = new Promise((resolve) => db.on("open", resolve));
            db.open();
            await open;
            await db.close();
        });

        it("should connect to server using domain socket with undefined port", async () => {
            const db = await openSocketDb({ port: undefined });
            await db.collection("domainSocketCollection1").insert({ a: 1 }, { w: 1 });
            const items = await db.collection("domainSocketCollection1").find({ a: 1 }).toArray();
            expect(items).to.have.lengthOf(1);
            await db.close();
        });

        it("should fail to connect using non-domain socket with undefined port", async () => {
            expect(() => {
                new Db("test", new Server("localhost", undefined), { w: 0 });
            }).to.throw();
        });

        const connectionTester = async (db, testName) => {
            const collection = await db.collection(testName);
            const doc = { foo: 123 };
            await collection.insert(doc, { w: 1 });
            await db.dropDatabase();
        };

        it("connect no options", async () => {
            const db = await mongo.connect(this.url());
            await connectionTester(db, "testConnectNoOptions");
            await db.close();
        });

        it("connect server options", async () => {
            const db = await mongo.connect(this.url(), { server: { auto_reconnect: true, poolSize: 4 } });
            await connectionTester(db, "testConnectServerOptions");
            expect(db.serverConfig.poolSize).to.be.equal(1);
            expect(db.serverConfig.s.server.s.pool.size).to.be.equal(4);
            expect(db.serverConfig.autoReconnect).to.be.true;
            await db.close();
        });

        it("connect all options", async () => {
            const db = await mongo.connect(this.url(), {
                server: { auto_reconnect: true, poolSize: 4 },
                db: { native_parser: true }
            });
            await connectionTester(db, "testConnectAllOptions");
            expect(db.serverConfig.poolSize).to.be.at.least(1);
            expect(db.serverConfig.s.server.s.pool.size).to.be.equal(4);
            expect(db.serverConfig.autoReconnect).to.be.true;
            await db.close();
        });

        it("connect good auth", async () => {
            const username = "testConnectGoodAuth";
            const password = "password";
            {
                const db = await mongo.connect(this.url(), {
                    server: { auto_reconnect: true, poolSize: 4 },
                    db: { native_parser: true }
                });
                await db.addUser(username, password);
                await db.close();
            }
            {
                const db = await mongo.connect(this.url({ username, password }), {
                    server: { auto_reconnect: true, poolSize: 4 },
                    db: { native_parser: true }
                });
                await connectionTester(db, "testConnectGoodAuth");
                await db.close();
            }
        });

        it("connect bad auth", async () => {
            await assert.throws(async () => {
                await mongo.connect(this.url({ username: "hello", password: "world" }));
            }, "Authentication failed.");
        });

        it("connect bad url", async () => {
            await assert.throws(async () => {
                await mongo.connect("mangodb://localhost:27017/test?safe=false");
            }, "invalid schema, expected mongodb");
        });

        it("should correctly and return the right db object on open", async () => {
            const db = getDb();
            const db2 = db.db("test2");
            const dbOpen = new Promise((resolve) => db.on("open", (err, db) => resolve(db)));
            const db2Open = new Promise((resolve) => db2.on("open", (err, db) => resolve(db)));
            await db.open();
            const col1 = db.collection("test");
            const col2 = db2.collection("test");
            const testData = { value: "something" };
            await col1.insert(testData);
            await col2.insert(testData);
            const d1 = await dbOpen;
            const d2 = await db2Open;
            expect(db.databaseName).to.be.equal(d1.databaseName);
            expect(db2.databaseName).to.be.equal(d2.databaseName);
            await db.close();
            await db2.close();
        });

        it("should correctly return false on is connect before connection happened", async () => {
            const db = getDb();
            expect(db.serverConfig.isConnected()).to.be.false;
        });

        it("should correctly reconnect and finish query operation", async () => {
            const db = getDb({ auto_reconnect: true });
            await db.open();

            await db.collection("test_reconnect").insert({ a: 1 });
            // Signal db reconnect
            let dbReconnect = 0;
            let dbClose = 0;

            db.on("reconnect", () => {
                ++dbReconnect;
            });

            db.on("close", () => {
                ++dbClose;
            });

            let reconnect = new Promise((resolve) => db.serverConfig.once("reconnect", resolve));
            db.serverConfig.connections()[0].destroy();
            await reconnect;
            // Await reconnect and re-authentication
            let doc = await db.collection("test_reconnect").findOne();

            expect(doc.a).to.be.equal(1);
            expect(dbReconnect).to.be.equal(1);
            expect(dbClose).to.be.equal(1);

            reconnect = new Promise((resolve) => db.serverConfig.once("reconnect", resolve));
            // Attempt disconnect again
            db.serverConfig.connections()[0].destroy();
            await reconnect;
            // Await reconnect and re-authentication
            doc = await db.collection("test_reconnect").findOne();
            expect(doc.a).to.be.equal(1);
            expect(dbReconnect).to.be.equal(2);
            expect(dbClose).to.be.equal(2);
            await db.close();
        });
    }
});
