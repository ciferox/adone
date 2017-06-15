describe("read concern", function () {
    if (this.topology !== "replicaset") {
        return;
    }

    const { database: { mongo } } = adone;

    it("should set local readConcern on db level", async () => {
        const db = await mongo.connect(this.url(), { w: 1, readConcern: { level: "local" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "local" });
        const collection = db.collection("readConcernCollection");
        expect(collection.s.readConcern).to.be.deep.equal({ level: "local" });
        const listener = mongo.instrument();
        const started = [];
        listener.on("started", (event) => {
            if (event.commandName === "find") {
                started.push(event);
            }
        });

        await collection.find().toArray();
        expect(started).to.have.lengthOf(1);
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "local" });
        listener.uninstrument();
        await db.close();
    });

    it("should set local readConcern on db level using url", async () => {
        const db = await mongo.connect(this.url({ search: { readConcernLevel: "local" } }), { w: 1 });
        expect(db.s.readConcern).to.be.deep.equal({ level: "local" });
        const collection = db.collection("readConcernCollection");
        expect(collection.s.readConcern).to.be.deep.equal({ level: "local" });
        const listener = mongo.instrument();
        const started = [];
        listener.on("started", (event) => {
            if (event.commandName === "find") {
                started.push(event);
            }
        });

        await collection.find().toArray();
        expect(started).to.have.lengthOf(1);
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "local" });
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern on db level", async () => {
        const db = await mongo.connect(this.url(), { w: 1, readConcern: { level: "majority" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("readConcernCollection");
        expect(collection.s.readConcern).to.be.deep.equal({ level: "majority" });
        const listener = mongo.instrument();
        const started = [];
        listener.on("started", (event) => {
            if (event.commandName === "find") {
                started.push(event);
            }
        });
        await collection.find().toArray();
        expect(started).to.have.lengthOf(1);
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "majority" });
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern on db level using url", async () => {
        const db = await mongo.connect(this.url({ search: { readConcernLevel: "majority" } }), { w: 1 });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("readConcernCollection");
        expect(collection.s.readConcern).to.be.deep.equal({ level: "majority" });
        const listener = mongo.instrument();
        const started = [];
        listener.on("started", (event) => {
            if (event.commandName === "find") {
                started.push(event);
            }
        });
        await collection.find().toArray();
        expect(started).to.have.lengthOf(1);
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "majority" });
        listener.uninstrument();
        await db.close();
    });

    it("should set local readConcern at collection level", async () => {
        const { db } = this;
        const collection = db.collection("readConcernCollection", { readConcern: { level: "local" } });
        expect(collection.s.readConcern).to.be.deep.equal({ level: "local" });
        const listener = mongo.instrument();
        const started = [];
        listener.on("started", (event) => {
            if (event.commandName === "find") {
                started.push(event);
            }
        });
        await collection.find().toArray();
        expect(started).to.have.lengthOf(1);
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "local" });
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern at collection level", async () => {
        const { db } = this;
        const collection = db.collection("readConcernCollection", { readConcern: { level: "majority" } });
        expect(collection.s.readConcern).to.be.deep.equal({ level: "majority" });
        const listener = mongo.instrument();
        const started = [];
        listener.on("started", (event) => {
            if (event.commandName === "find") {
                started.push(event);
            }
        });
        await collection.find().toArray();
        expect(started).to.have.lengthOf(1);
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "majority" });
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern aggregate command", async () => {
        const listener = mongo.instrument();
        const started = [];
        const succeeded = [];
        const db = await mongo.connect(this.url(), { readConcern: { level: "majority" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("readConcernCollectionAggregate");
        expect(collection.s.readConcern).to.be.deep.equal({ level: "majority" });
        listener.on("started", (event) => {
            if (event.commandName === "aggregate") {
                started.push(event);
            }
        });
        listener.on("succeeded", (event) => {
            if (event.commandName === "aggregate") {
                succeeded.push(event);
            }
        });
        await collection.aggregate([{ $match: {} }]).toArray();
        expect(started).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("aggregate");
        expect(succeeded[0].commandName).to.be.equal("aggregate");
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "majority" });
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern aggregate command but ignore due to out", async () => {
        const listener = mongo.instrument();
        const started = [];
        const succeeded = [];
        const db = await mongo.connect(this.url(), { w: 1, readConcern: { level: "majority" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("readConcernCollectionAggregate1");
        expect(collection.s.readConcern).to.be.deep.equal({ level: "majority" });
        listener.on("started", (event) => {
            if (event.commandName === "aggregate") {
                started.push(event);
            }
        });
        listener.on("succeeded", (event) => {
            if (event.commandName === "aggregate") {
                succeeded.push(event);
            }
        });
        await collection.aggregate([{ $match: {} }, { $out: "readConcernCollectionAggregate1Output" }]).toArray();
        expect(started).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("aggregate");
        expect(succeeded[0].commandName).to.be.equal("aggregate");
        expect(started[0].command.readConcern).to.be.undefined;
        await collection.aggregate([{ $match: {} }], { out: "readConcernCollectionAggregate2Output" }).toArray();
        expect(started).to.have.lengthOf(2);
        expect(started[1].commandName).to.be.equal("aggregate");
        expect(succeeded[1].commandName).to.be.equal("aggregate");
        expect(started[1].command.readConcern).to.be.undefined;
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern mapReduce command but be ignored", async () => {
        const listener = mongo.instrument();
        const started = [];
        const succeeded = [];
        const db = await mongo.connect(this.url(), { w: 1, readConcern: { level: "majority" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("test_map_reduce_read_concern");
        await collection.insert([{ userId: 1 }, { userId: 2 }]);
        const map = "function() { emit(this.userId, 1); }";
        const reduce = "function(k,vals) { return 1; }";
        listener.on("started", (event) => {
            if (event.commandName === "mapreduce") {
                started.push(event);
            }
        });
        listener.on("succeeded", (event) => {
            if (event.commandName === "mapreduce") {
                succeeded.push(event);
            }
        });
        await collection.mapReduce(map, reduce, { out: { replace: "tempCollection" } });
        expect(started).to.have.lengthOf(1);
        expect(succeeded).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("mapreduce");
        expect(succeeded[0].commandName).to.be.equal("mapreduce");
        expect(started[0].command.readConcern).to.be.undefined;
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern distinct command", async () => {
        const listener = mongo.instrument();
        const started = [];
        const succeeded = [];
        const db = await mongo.connect(this.url(), { w: 1, readConcern: { level: "majority" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("test_distinct_read_concern");
        await collection.insertMany([
            { a: 0, b: { c: "a" } },
            { a: 1, b: { c: "b" } },
            { a: 1, b: { c: "c" } },
            { a: 2, b: { c: "a" } },
            { a: 3 }, { a: 3 }
        ]);
        listener.on("started", (event) => {
            if (event.commandName === "distinct") {
                started.push(event);
            }
        });
        listener.on("succeeded", (event) => {
            if (event.commandName === "distinct") {
                succeeded.push(event);
            }
        });
        await collection.distinct("a");
        expect(started).to.have.lengthOf(1);
        expect(succeeded).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("distinct");
        expect(succeeded[0].commandName).to.be.equal("distinct");
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "majority" });
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern count command", async () => {
        const listener = mongo.instrument();
        const started = [];
        const succeeded = [];
        const db = await mongo.connect(this.url(), { w: 1, readConcern: { level: "majority" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("test_count_read_concern");
        await collection.insertMany([
            { a: 0, b: { c: "a" } },
            { a: 1, b: { c: "b" } },
            { a: 1, b: { c: "c" } },
            { a: 2, b: { c: "a" } },
            { a: 3 }, { a: 3 }
        ]);
        listener.on("started", (event) => {
            if (event.commandName === "count") {
                started.push(event);
            }
        });
        listener.on("succeeded", (event) => {
            if (event.commandName === "count") {
                succeeded.push(event);
            }
        });
        await collection.count({ a: 1 });
        expect(started).to.have.lengthOf(1);
        expect(succeeded).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("count");
        expect(succeeded[0].commandName).to.be.equal("count");
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "majority" });
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern group command", async () => {
        const listener = mongo.instrument();
        const started = [];
        const succeeded = [];
        const db = await mongo.connect(this.url(), { w: 1, readConcern: { level: "majority" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("test_group_read_concern");
        await collection.insertMany([
            { a: 0, b: { c: "a" } },
            { a: 1, b: { c: "b" } },
            { a: 1, b: { c: "c" } },
            { a: 2, b: { c: "a" } },
            { a: 3 }, { a: 3 }
        ]);
        listener.on("started", (event) => {
            if (event.commandName === "group") {
                started.push(event);
            }
        });
        listener.on("succeeded", (event) => {
            if (event.commandName === "group") {
                succeeded.push(event);
            }
        });
        await collection.group([], {}, { count: 0 }, "function (obj, prev) { prev.count++; }");
        expect(started).to.have.lengthOf(1);
        expect(succeeded).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("group");
        expect(succeeded[0].commandName).to.be.equal("group");
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "majority" });
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern parallelCollectionScan command", async () => {
        const listener = mongo.instrument();
        const started = [];
        const succeeded = [];
        const db = await mongo.connect(this.url(), { w: 1, readConcern: { level: "majority" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("test_parallel_collection_scan_read_concern");
        await collection.insertMany([
            { a: 0, b: { c: "a" } },
            { a: 1, b: { c: "b" } },
            { a: 1, b: { c: "c" } },
            { a: 2, b: { c: "a" } },
            { a: 3 }, { a: 3 }
        ]);
        listener.on("started", (event) => {
            if (event.commandName === "parallelCollectionScan") {
                started.push(event);
            }
        });
        listener.on("succeeded", (event) => {
            if (event.commandName === "parallelCollectionScan") {
                succeeded.push(event);
            }
        });
        await collection.parallelCollectionScan({ numCursors: 1 });
        expect(started).to.have.lengthOf(1);
        expect(succeeded).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("parallelCollectionScan");
        expect(succeeded[0].commandName).to.be.equal("parallelCollectionScan");
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "majority" });
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern geoNear command", async () => {
        const listener = mongo.instrument();
        const started = [];
        const succeeded = [];
        const db = await mongo.connect(this.url(), { w: 1, readConcern: { level: "majority" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("test_geonear_read_concern");
        await collection.insertMany([
            { a: 0, b: { c: "a" } },
            { a: 1, b: { c: "b" } },
            { a: 1, b: { c: "c" } },
            { a: 2, b: { c: "a" } },
            { a: 3 }, { a: 3 }
        ]);
        listener.on("started", (event) => {
            if (event.commandName === "geoNear") {
                started.push(event);
            }
        });
        listener.on("succeeded", (event) => {
            if (event.commandName === "geoNear") {
                succeeded.push(event);
            }
        });
        await collection.ensureIndex({ loc: "2d" });
        await collection.insertMany([{ a: 1, loc: [50, 30] }, { a: 1, loc: [30, 50] }]);
        await collection.geoNear(50, 50, { query: { a: 1 }, num: 1 });
        expect(started).to.have.lengthOf(1);
        expect(succeeded).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("geoNear");
        expect(succeeded[0].commandName).to.be.equal("geoNear");
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "majority" });
        listener.uninstrument();
        await db.close();
    });

    it("should set majority readConcern geoSearch command", async () => {
        const listener = mongo.instrument();
        const started = [];
        const succeeded = [];
        const db = await mongo.connect(this.url(), { w: 1, readConcern: { level: "majority" } });
        expect(db.s.readConcern).to.be.deep.equal({ level: "majority" });
        const collection = db.collection("test_geosearch_read_concern");
        await collection.insertMany([
            { a: 0, b: { c: "a" } },
            { a: 1, b: { c: "b" } },
            { a: 1, b: { c: "c" } },
            { a: 2, b: { c: "a" } },
            { a: 3 }, { a: 3 }
        ]);
        listener.on("started", (event) => {
            if (event.commandName === "geoSearch") {
                started.push(event);
            }
        });
        listener.on("succeeded", (event) => {
            if (event.commandName === "geoSearch") {
                succeeded.push(event);
            }
        });
        await collection.ensureIndex({ loc: "geoHaystack", type: 1 }, { bucketSize: 1 });
        await collection.insertMany([{ a: 1, loc: [50, 30] }, { a: 1, loc: [30, 50] }]);
        await collection.geoHaystackSearch(50, 50, { search: { a: 1 }, limit: 1, maxDistance: 100 });
        expect(started).to.have.lengthOf(1);
        expect(succeeded).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("geoSearch");
        expect(succeeded[0].commandName).to.be.equal("geoSearch");
        expect(started[0].command.readConcern).to.be.deep.equal({ level: "majority" });
        listener.uninstrument();
        await db.close();
    });
});
