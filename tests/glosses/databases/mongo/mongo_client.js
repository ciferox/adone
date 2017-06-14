describe("mongo client", function () {
    const { util, database: { mongo } } = adone;
    const { range } = util;

    if (this.topology === "single") {
        it("should correctly work with bufferMaxEntries:0 and ordered execution", async () => {
            const db = await mongo.connect(this.url(), {
                db: { bufferMaxEntries: 0 }, server: { sslValidate: false }
            });
            const close = new Promise((resolve) => db.once("close", resolve));
            db.serverConfig.connections()[0].destroy();
            await close;
            const collection = db.collection("test_object_id_generation.data2");
            await assert.throws(async () => {
                await collection.insert(range(1500).map((i) => ({ a: i })));
            }, "no connection available for operation and number of stored operation > 0");
            await db.close();
        });

        it("should correctly work with bufferMaxEntries:0 and unordered execution", async () => {
            const db = await mongo.connect(this.url(), {
                db: { bufferMaxEntries: 0 }, server: { sslValidate: false }
            });
            const close = new Promise((resolve) => db.once("close", resolve));
            db.serverConfig.connections()[0].destroy();
            await close;
            const collection = db.collection("test_object_id_generation.data3");
            await assert.throws(async () => {
                await collection.insert(range(1500).map((i) => ({ a: i })), { keepGoing: true });
            }, "no connection available for operation and number of stored operation > 0");
            await db.close();
        });

        it("should correctly pass through extra db options", async () => {
            const db = await mongo.connect(this.url(), {
                db: {
                    w: 1,
                    wtimeout: 1000,
                    fsync: true,
                    j: true,
                    readPreference: "nearest",
                    readPreferenceTags: { loc: "ny" },
                    forceServerObjectId: true,
                    pkFactory() {
                        return 1;
                    },
                    serializeFunctions: true,
                    raw: true,
                    retryMiliSeconds: 1000,
                    numberOfRetries: 10,
                    bufferMaxEntries: 0
                }
            });
            expect(db.writeConcern.w).to.be.equal(1);
            expect(db.writeConcern.wtimeout).to.be.equal(1000);
            expect(db.writeConcern.fsync).to.be.true;
            expect(db.writeConcern.j).to.be.true;
            expect(db.s.readPreference.mode).to.be.equal("nearest");
            expect(db.s.readPreference.tags).to.be.deep.equal({ loc: "ny" });
            expect(db.s.options.forceServerObjectId).to.be.true;
            expect(db.s.pkFactory()).to.be.equal(1);
            expect(db.s.options.serializeFunctions).to.be.true;
            expect(db.s.options.raw).to.be.true;
            expect(db.s.options.retryMiliSeconds).to.be.equal(1000);
            expect(db.s.options.numberOfRetries).to.be.equal(10);
            expect(db.s.options.bufferMaxEntries).to.be.equal(0);
            await db.close();
        });

        it("should correctly pass through extra server options", async () => {
            const db = await mongo.connect(this.url(), {
                server: {
                    poolSize: 10,
                    autoReconnect: false,
                    socketOptions: {
                        noDelay: false,
                        keepAlive: 100,
                        connectTimeoutMS: 444444,
                        socketTimeoutMS: 555555
                    }
                }
            });
            expect(db.s.topology.s.poolSize).to.be.equal(10);
            expect(db.s.topology.autoReconnect).to.be.false;
            expect(db.s.topology.s.clonedOptions.connectionTimeout).to.be.equal(444444);
            expect(db.s.topology.s.clonedOptions.socketTimeout).to.be.equal(555555);
            expect(db.s.topology.s.clonedOptions.keepAlive).to.be.true;
            expect(db.s.topology.s.clonedOptions.keepAliveInitialDelay).to.be.equal(100);
            db.close();
        });
    }

    if (this.topology === "replicaset") {
        it("Should correctly pass through extra replicaset options", async () => {
            const db = await mongo.connect(this.url({ search: { rs_name: "rs1" } }), {
                replSet: {
                    ha: false,
                    haInterval: 10000,
                    replicaSet: "rs",
                    secondaryAcceptableLatencyMS: 100,
                    connectWithNoPrimary: true,
                    poolSize: 1,
                    socketOptions: {
                        noDelay: false,
                        keepAlive: 100,
                        connectTimeoutMS: 444444,
                        socketTimeoutMS: 555555
                    }
                }
            });
            expect(db.s.topology.s.clonedOptions.ha).to.be.false;
            expect(db.s.topology.s.clonedOptions.haInterval).to.be.equal(10000);
            expect(db.s.topology.s.clonedOptions.setName).to.be.equal("rs");
            expect(db.s.topology.s.clonedOptions.acceptableLatency).to.be.equal(100);
            expect(db.s.topology.s.clonedOptions.secondaryOnlyConnectionAllowed).to.be.true;
            expect(db.s.topology.s.clonedOptions.size).to.be.equal(1);
            expect(db.s.topology.s.clonedOptions.connectionTimeout).to.be.equal(444444);
            expect(db.s.topology.s.clonedOptions.socketTimeout).to.be.equal(555555);
            expect(db.s.topology.s.clonedOptions.keepAlive).to.be.true;
            expect(db.s.topology.s.clonedOptions.keepAliveInitialDelay).to.be.equal(100);
            db.close();
        });
    }

    if (this.topology === "sharded") {
        it("should correctly pass through extra sharded options", async () => {
            const db = await mongo.connect(this.url(), {
                mongos: {
                    ha: false,
                    haInterval: 10000,
                    acceptableLatencyMS: 100,
                    poolSize: 1,
                    socketOptions: {
                        noDelay: false,
                        keepAlive: 100,
                        connectTimeoutMS: 444444,
                        socketTimeoutMS: 555555
                    }
                }
            });
            expect(db.s.topology.s.clonedOptions.ha).to.be.false;
            expect(db.s.topology.s.clonedOptions.haInterval).to.be.equal(10000);
            expect(db.s.topology.s.clonedOptions.localThresholdMS).to.be.equal(100);
            expect(db.s.topology.s.clonedOptions.poolSize).to.be.equal(1);
            expect(db.s.topology.s.clonedOptions.connectionTimeout).to.be.equal(444444);
            expect(db.s.topology.s.clonedOptions.socketTimeout).to.be.equal(555555);
            expect(db.s.topology.s.clonedOptions.keepAlive).to.be.true;
            expect(db.s.topology.s.clonedOptions.keepAliveInitialDelay).to.be.equal(100);
        });
    }

    if (this.topology === "single") {
        it("should correctly set MaxPoolSize on single server", async () => {
            const db = await mongo.connect(this.url({ search: { maxPoolSize: 100 } }));
            expect(db.serverConfig.connections()).to.be.have.lengthOf(1);
            expect(db.serverConfig.s.server.s.pool.size).to.be.equal(100);
            db.close();
        });
    }

    if (this.topology === "replicaset") {
        it("should correctly set MaxPoolSize on replicaset server", async () => {
            const url = this.url({ search: { maxPoolSize: 100 } });
            {
                const db = await mongo.connect(url, {});
                const connections = db.serverConfig.connections();
                expect(connections).to.have.length.at.least(1);
                for (let i = 0; i < connections.length; i++) {
                    expect(connections[i].connectionTimeout).to.be.equal(30000);
                    expect(connections[i].socketTimeout).to.be.equal(360000);
                }
                db.close();
            }
            {
                const db = await mongo.connect(url, {
                    connectTimeoutMS: 15000,
                    socketTimeoutMS: 30000
                });
                const connections = db.serverConfig.connections();
                expect(connections).to.have.length.at.least(1);
                for (let i = 0; i < connections.length; i++) {
                    expect(connections[i].connectionTimeout).to.be.equal(15000);
                    expect(connections[i].socketTimeout).to.be.equal(30000);
                }
                db.close();
            }
        });
    }
    if (this.topology === "sharded") {
        it("should correctly set MaxPoolSize on sharded server", async () => {
            const db = await mongo.connect(this.url({ search: { maxPoolSize: 1000 } }));
            expect(db.serverConfig.connections()).to.have.length.at.least(1);
            await db.close();
        });
    }

    it("should fail due to wrong uri user:password@localhost", async () => {
        await assert.throws(async () => {
            await mongo.connect("user:password@localhost:27017/test");
        }, "invalid schema");
    });

    it("correctly error out when no socket available", async () => {
        await assert.throws(async () => {
            await mongo.connect("mongodb://localhost:27088/test");
        }, "failed to connect");
    });

    if (this.topology === "single") {
        it("should correctly connect to mongodb using domain socket", async () => {
            const db = await mongo.connect("mongodb:///tmp/mongodb-27017.sock/test");
            await db.close();
        });
    }

    it("correctly error out when no socket available on MongoClient.connect with domain", async () => {
        await assert.throws(async () => {
            await mongo.connect("mongodb://test.com:80/test");
        });
    });

    it("correctly connect setting keepAlive to 100", async () => {
        {
            const db = await mongo.connect(this.url(), {
                keepAlive: 100
            });
            const connection = db.serverConfig.connections()[0];
            expect(connection.keepAlive).to.be.true;
            expect(connection.keepAliveInitialDelay).to.be.equal(100);
            db.close();
        }
        {
            const db = await mongo.connect(this.url(), {
                keepAlive: 0
            });
            const connections = db.serverConfig.connections();
            expect(connections).not.to.be.empty;
            for (const conn of db.serverConfig.connections()) {
                expect(conn.keepAlive).to.be.false;
            }
            db.close();
        }
    });

    it("default keepAlive behavior", async () => {
        const db = await mongo.connect(this.url());
        const connections = db.serverConfig.connections();
        expect(connections).not.to.be.empty;
        for (const conn of connections) {
            expect(conn.keepAlive).to.be.true;
        }
        db.close();
    });

    if (this.topology === "single") {
        it("should fail dure to garbage connection string", async () => {
            await assert.throws(async () => {
                await mongo.connect("mongodb://unknownhost:36363/ddddd");
            });
        });
    }
    if (this.topology === "replicaset") {
        it("should fail to connect due to instances not being mongos proxies", async () => {
            const url = this.url().replace("?rs_name=rs", "").replace("localhost:31000", "localhost:31000,localhost:31001");
            await assert.throws(async () => {
                await mongo.connect(url);
            });
        });
    }

    it("should correctly pass through appname", async () => {
        const db = await mongo.connect(this.url({ search: { appname: "hello world" } }));
        expect(db.serverConfig.clientInfo.application.name).to.be.equal("hello world");
        db.close();
    });

    it("should correctly pass through socketTimeoutMS and connectTimeoutMS", async () => {
        const db = await mongo.connect(this.url(), {
            socketTimeoutMS: 0,
            connectTimeoutMS: 0
        });
        if (db.s.topology.s.clonedOptions) {
            expect(db.s.topology.s.clonedOptions.connectionTimeout).to.be.equal(0);
            expect(db.s.topology.s.clonedOptions.socketTimeout).to.be.equal(0);
        } else {
            expect(db.s.topology.s.options.connectionTimeout).to.be.equal(0);
            expect(db.s.topology.s.options.socketTimeout).to.be.equal(0);
        }
        await db.close();
    });

    if (this.topology === "single") {
        it("should correctly pass through socketTimeoutMS and connectTimeoutMS from uri", async () => {
            const db = await mongo.connect(this.url({
                search: {
                    socketTimeoutMS: 120000,
                    connectTimeoutMS: 15000
                }
            }));
            expect(db.serverConfig.s.server.s.options.socketTimeout).to.be.equal(120000);
            expect(db.serverConfig.s.server.s.options.connectionTimeout).to.be.equal(15000);
            db.close();
        });
    }
});
