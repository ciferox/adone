import mockupdb from "./core/mock";

describe("collations", function () {
    if (this.topology !== "single") {
        return;
    }

    const { database: { mongo }, data: { bson } } = adone;

    const defaultFields = {
        ismaster: true,
        maxBsonObjectSize: 16777216,
        maxMessageSizeBytes: 48000000,
        maxWriteBatchSize: 1000,
        localTime: new Date(),
        maxWireVersion: 5,
        minWireVersion: 0,
        ok: 1
    };

    it("successfully pass through collation to findAndModify command", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        // Primary state machine
        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                // console.log("========================== cmd")
                // console.dir(doc)

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.findandmodify) {
                    commandResult = doc;
                    request.reply({ ok: 1, result: {} });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");
        await db.collection("test")
            .findAndModify({ a: 1 }, [["a", 1]], { $set: { b1: 1 } }, { new: true, collation: { caseLevel: true } });
        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });
        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to count command", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.count) {
                    commandResult = doc;
                    request.reply({ ok: 1, result: { n: 1 } });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");
        await db.collection("test").count({}, { collation: { caseLevel: true } });

        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });
        running = false;
        await singleServer.destroy();
    });

    it("Successfully pass through collation to aggregation command", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.aggregate) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");
        await db.collection("test").aggregate([
            { $match: {} },
            { $out: "readConcernCollectionAggregate1Output" }
        ], { collation: { caseLevel: true } });

        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to distinct command", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.distinct) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });


        const db = await mongo.connect("mongodb://localhost:32000/test");
        await db.collection("test").distinct("a", {}, { collation: { caseLevel: true } });
        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to geoNear command", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.geoNear) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");
        await db.collection("test").geoNear(50, 50, { query: { a: 1 }, num: 1, collation: { caseLevel: true } });
        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to group command", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.group) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");
        await db.collection("test")
            .group(
                [],
                { a: { $gt: 1 } },
                { count: 0 },
                "function (obj, prev) { prev.count++; }",
                "function (obj, prev) { prev.count++; }"
                , true,
                { collation: { caseLevel: true } }
            );
        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to mapreduce command", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.mapreduce) {
                    commandResult = doc;
                    request.reply({ ok: 1, result: "tempCollection" });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        const map = new mongo.Code("function() { emit(this.user_id, 1); }");
        const reduce = new mongo.Code("function(k,vals) { return 1; }");
        await db.collection("test").mapReduce(map, reduce, {
            out: { replace: "tempCollection" },
            collation: { caseLevel: true }
        });

        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to remove command", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields, {})];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.delete) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await db.collection("test").deleteMany({}, { collation: { caseLevel: true } });

        expect(commandResult.deletes[0].collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to update command", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.update) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await db.collection("test").updateOne({ a: 1 }, { $set: { b: 1 } }, { collation: { caseLevel: true } });

        expect(commandResult.updates[0].collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to find command via options", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.find) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await db.collection("test").find({ a: 1 }, { collation: { caseLevel: true } }).toArray();

        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to find command via cursor", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.find) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await db.collection("test").find({ a: 1 }).collation({ caseLevel: true }).toArray();

        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to findOne", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.find) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await db.collection("test").findOne({ a: 1 }, { collation: { caseLevel: true } });

        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to createCollection", async () => {
        let running = true;

        const primary = [Object.assign(defaultFields, {})];

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
                        ok: 1,
                        cursor: {
                            id: bson.Long.fromNumber(0),
                            ns: "test.cmd$.listCollections",
                            firstBatch: []
                        }
                    });
                } else if (doc.create) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await db.createCollection("test", { collation: { caseLevel: true } });

        expect(commandResult.collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("fail due to no support for collation", async () => {
        let running = true;

        const defaultFields = {
            ismaster: true, maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000, maxWriteBatchSize: 1000,
            localTime: new Date(), maxWireVersion: 4, minWireVersion: 0, ok: 1
        };

        const primary = [Object.assign({}, defaultFields, { maxWireVersion: 4 })];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.find) {
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await assert.throws(async () => {
            await db.collection("test").findOne({ a: 1 }, { collation: { caseLevel: true } });
        }, "server localhost:32000 does not support collation");

        running = false;
        await singleServer.destroy();
    });

    it("fail command due to no support for collation", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields, { maxWireVersion: 4 })];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.find) {
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await assert.throws(async () => {
            await db.command({ count: "test", query: {}, collation: { caseLevel: true } });
        }, "server localhost:32000 does not support collation");

        running = false;
        await singleServer.destroy();
    });

    it("successfully pass through collation to bulkWrite command", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.update) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                } else if (doc.delete) {
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await db.collection("test").bulkWrite([
            { updateOne: { q: { a: 2 }, u: { $set: { a: 2 } }, upsert: true, collation: { caseLevel: true } } },
            { deleteOne: { q: { c: 1 } } }
        ], { ordered: true });

        expect(commandResult.updates[0].collation).to.be.deep.equal({ caseLevel: true });

        running = false;
        await singleServer.destroy();
    });

    it("successfully fail bulkWrite due to unsupported collation", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields, { maxWireVersion: 4 })];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.update) {
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await assert.throws(async () => {
            await db.collection("test").bulkWrite([
                { updateOne: { q: { a: 2 }, u: { $set: { a: 2 } }, upsert: true, collation: { caseLevel: true } } },
                { deleteOne: { q: { c: 1 } } }
            ], { ordered: true });
        }, "server/primary/mongos does not support collation");

        running = false;
        await singleServer.destroy();
    });

    it("successfully fail bulkWrite due to unsupported collation using replset", async () => {
        let running = true;
        const electionIds = [new bson.ObjectId(), new bson.ObjectId()];

        const defaultFields = {
            setName: "rs",
            setVersion: 1,
            electionId: electionIds[0],
            maxBsonObjectSize: 16777216,
            maxMessageSizeBytes: 48000000,
            maxWriteBatchSize: 1000,
            localTime: new Date(),
            maxWireVersion: 4,
            minWireVersion: 0,
            ok: 1,
            hosts: ["localhost:32000", "localhost:32001", "localhost:32002"],
            arbiters: ["localhost:32002"]
        };

        const primary = [
            Object.assign({}, defaultFields, {
                ismaster: true,
                secondary: false,
                me: "localhost:32000",
                primary: "localhost:32000",
                tags: { loc: "ny" }
            })
        ];

        const firstSecondary = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: true,
                me: "localhost:32001",
                primary: "localhost:32000",
                tags: { loc: "sf" }
            })
        ];

        const arbiter = [
            Object.assign({}, defaultFields, {
                ismaster: false,
                secondary: false,
                arbiterOnly: true,
                me: "localhost:32002",
                primary: "localhost:32000"
            })
        ];

        const primaryServer = await mockupdb.createServer(32000, "localhost");
        const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
        const arbiterServer = await mockupdb.createServer(32002, "localhost");

        (async () => {
            while (running) {
                const request = await primaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(primary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await firstSecondaryServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(firstSecondary[0]);
                }
            }
        })().catch(() => { });

        (async () => {
            while (running) {
                const request = await arbiterServer.receive();
                const doc = request.document;

                if (doc.ismaster) {
                    request.reply(arbiter[0]);
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000,localhost:32001/test?replicaSet=rs");

        await assert.throws(async () => {
            await db.collection("test").bulkWrite([
                { updateOne: { q: { a: 2 }, u: { $set: { a: 2 } }, upsert: true, collation: { caseLevel: true } } },
                { deleteOne: { q: { c: 1 } } }
            ], { ordered: true });
        }, "server/primary/mongos does not support collation");

        running = false;
        await primaryServer.destroy();
        await firstSecondaryServer.destroy();
        await arbiterServer.destroy();
    });

    it("successfully create index with collation", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields)];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        let commandResult = null;

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.createIndexes) {
                    commandResult = doc;
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await db.collection("test").createIndex({ a: 1 }, { collation: { caseLevel: true } });

        expect(commandResult).to.be.deep.equal({
            createIndexes: "test",
            indexes: [
                { name: "a_1", key: { a: 1 }, collation: { caseLevel: true } }
            ]
        });
        running = false;
        await singleServer.destroy();
    });

    it("fail to create index with collation due to no capabilities", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields, { maxWireVersion: 1 })];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.createIndexes) {
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await assert.throws(async () => {
            await db.collection("test").createIndex({ a: 1 }, { collation: { caseLevel: true } });
        }, "server/primary/mongos does not support collation");

        running = false;
        await singleServer.destroy();
    });

    it("fail to create indexs with collation due to no capabilities", async () => {
        let running = true;

        const primary = [Object.assign({}, defaultFields, { maxWireVersion: 1 })];

        const singleServer = await mockupdb.createServer(32000, "localhost");

        (async () => {
            while (running) {
                const request = await singleServer.receive();
                const doc = request.document;
                if (doc.ismaster) {
                    request.reply(primary[0]);
                } else if (doc.createIndexes) {
                    request.reply({ ok: 1 });
                }
            }
        })().catch(() => { });

        const db = await mongo.connect("mongodb://localhost:32000/test");

        await assert.throws(async () => {
            await db.collection("test").createIndexes([{ key: { a: 1 }, collation: { caseLevel: true } }]);
        }, "server/primary/mongos does not support collation");

        running = false;
        await singleServer.destroy();
    });

    it("should correctly create index with collation", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("collation_test");
        await collection.createIndexes([{ key: { a: 1 }, collation: { locale: "nn" }, name: "collation_test" }]);
        const r = await collection.listIndexes().toArray();
        const indexes = r.filter((i) => i.name === "collation_test");
        expect(indexes).to.have.lengthOf(1);
        expect(indexes[0].collation).to.be.ok();
    });

    it("should correctly create collection with collation", async () => {
        const db = await mongo.connect(this.url());
        await db.createCollection("collation_test2", { collation: { locale: "nn" } });
        const collections = await db.listCollections({ name: "collation_test2" }).toArray();
        expect(collections).to.have.lengthOf(1);
        expect(collections[0].name).to.be.equal("collation_test2");
        expect(collections[0].options.collation).to.be.ok();
    });
});
