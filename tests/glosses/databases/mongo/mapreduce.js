describe("mapReduce", function () {
    const { data: { bson } } = adone;

    it("should correctly execute group function with finalize function", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_group2", );
        {
            const results = await collection.group([], {}, { count: 0 }, "function (obj, prev) { prev.count++; }", true);
            expect(results).to.be.empty();
        }
        await collection.insert([{ a: 2 }, { b: 5, a: 0 }, { a: 1 }, { c: 2, a: 0 }]);
        {
            const results = await collection.group(
                [],
                {},
                { count: 0, runningAverage: 0 },
                (doc, out) => {
                    out.count++;
                    out.runningAverage += doc.a;
                },
                (out) => {
                    out.average = out.runningAverage / out.count;
                },
                true
            );
            expect(results[0].runningAverage).to.be.equal(3);
            expect(results[0].average).to.be.equal(0.75);
        }
    });

    it("should perform mapReduce withStringFunctions", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_map_reduce0");
        await collection.insert([{ userId: 1 }, { userId: 2 }]);
        const map = "function() { emit(this.userId, 1); }";
        const reduce = "function(k,vals) { return 1; }";
        const tmp = await collection.mapReduce(map, reduce, { out: { replace: "tempCollection" } });
        {
            const result = await tmp.findOne({ _id: 1 });
            expect(result.value).to.be.equal(1);
        }
        {
            const result = await tmp.findOne({ _id: 2 });
            expect(result.value).to.be.equal(1);
        }
    });

    it("should force mapReduce error", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_map_reduce1");
        await collection.insert([{ userId: 1 }, { userId: 2 }]);
        const map = "function() { emiddft(this.userId, 1); }";
        const reduce = "function(k,vals) { return 1; }";
        await assert.throws(async () => {
            await collection.mapReduce(map, reduce, { out: { inline: 1 } });
        }, "emiddft is not defined");
    });

    it("should perform mapReduce with parameters being functions", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_map_reduce_with_functions_as_arguments");
        await collection.insert([{ userId: 1 }, { userId: 2 }]);
        const map = function () {
            emit(this.userId, 1);
        };
        const reduce = function (k, vals) {
            return 1;
        };
        const tmp = await collection.mapReduce(map, reduce, { out: { replace: "tempCollection" } });
        {
            const result = await tmp.findOne({ _id: 1 });
            expect(result.value).to.be.equal(1);
        }
        {
            const result = await tmp.findOne({ _id: 2 });
            expect(result.value).to.be.equal(1);
        }
    });

    it("should perform mapReduce with code objects", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_map_reduce_with_code_objects");
        await collection.insert([{ userId: 1 }, { userId: 2 }]);
        const map = new bson.Code("function() { emit(this.userId, 1); }");
        const reduce = new bson.Code("function(k,vals) { return 1; }");
        const tmp = await collection.mapReduce(map, reduce, { out: { replace: "tempCollection" } });
        {
            const result = await tmp.findOne({ _id: 1 });
            expect(result.value).to.be.equal(1);
        }
        {
            const result = await tmp.findOne({ _id: 2 });
            expect(result.value).to.be.equal(1);
        }
    });

    it("should perform mapReduce with options", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_map_reduce_with_options");
        await collection.insert([{ userId: 1 }, { userId: 2 }, { userId: 3 }]);
        const map = new bson.Code("function() { emit(this.userId, 1); }");
        const reduce = new bson.Code("function(k,vals) { return 1; }");
        const tmp = await collection.mapReduce(map, reduce, { out: { replace: "tempCollection" }, query: { userId: { $gt: 1 } } });
        expect(await tmp.count()).to.be.equal(2);
        {
            const result = await tmp.findOne({ _id: 2 });
            expect(result.value).to.be.equal(1);
        }
        {
            const result = await tmp.findOne({ _id: 3 });
            expect(result.value).to.be.equal(1);
        }
    });

    it("shouldHandleMapReduceErrors", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_map_reduce_error");
        await collection.insert([{ userId: 1 }, { userId: 2 }, { userId: 3 }]);
        const map = new bson.Code("function() { throw 'error'; }");
        const reduce = new bson.Code("function(k,vals) { throw 'error'; }");
        await assert.throws(async () => {
            await collection.mapReduce(map, reduce, { out: { inline: 1 }, query: { userId: { $gt: 1 } } });
        });
    });

    it("should save data to different db from mapReduce", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_map_reduce_functions");
        await collection.insert([{ userId: 1 }, { userId: 2 }]);
        const map = function () {
            emit(this.userId, 1);
        };
        const reduce = function (k, vals) {
            return 1;
        };
        const tmp = await collection.mapReduce(map, reduce, { out: { replace: "tempCollection", db: "outputCollectionDb" } });
        {
            const result = await tmp.findOne({ _id: 1 });
            expect(result.value).to.be.equal(1);
        }
        {
            const result = await tmp.findOne({ _id: 2 });
            expect(result.value).to.be.equal(1);
        }
    });

    it("should correctly return nested keys", async () => {
        const { db } = this;
        const start = new Date().setTime(new Date().getTime() - 10000);
        const end = new Date().setTime(new Date().getTime() + 10000);
        const keys = {
            "data.lastname": true
        };
        let condition = {
            "data.date": {
                $gte: start,
                $lte: end
            }
        };
        condition = {};
        const initial = {
            count: 0
        };
        const reduce = function (doc, output) {
            output.count++;
        };
        const collection = await db.createCollection("shouldCorrectlyReturnNestedKeys");
        await collection.insert({
            data: {
                lastname: "smith",
                date: new Date()
            }
        });
        const r = await collection.group(keys, condition, initial, reduce, true);
        expect(r[0].count).to.be.equal(1);
        expect(r[0]["data.lastname"]).to.be.equal("smith");
    });

    it("should perform mapReduce with scope containing function", async () => {
        const { db } = this;
        const util = {
            timesOneHundred: (x) => x * 100
        };
        const collection = await db.createCollection("test_map_reduce2");
        await collection.insert([{ userId: 1 }, { userId: 2 }]);
        const map = "function() { emit(this.userId, util.timesOneHundred(2)); }";
        const reduce = "function(k,vals) { return vals[0]; }";
        const tmp = await collection.mapReduce(map, reduce, { scope: { util }, out: { replace: "tempCollection" } });
        const result = await tmp.findOne({ _id: 2 });
        expect(result.value).to.be.equal(200);
    });
});
