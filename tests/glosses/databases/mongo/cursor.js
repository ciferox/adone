describe("cursor", function () {
    const { is, util, core, promise, data: { bson: { Long } }, database: { mongo } } = adone;
    const { range } = util;

    it("should be able to reset on to array running query again", async () => {
        const collection = await this.db.createCollection("test_to_a");
        await collection.insert({ a: 1 });
        const cursor = collection.find({});
        await cursor.toArray();
        await new Promise((resolve, reject) => {
            cursor.each((err, item) => {
                if (err) {
                    return reject(err);
                }
                if (!item) {
                    resolve();
                }
            });
        });
    });

    it("should close after first next operation", async () => {
        const collection = await this.db.createCollection("close_on_next");
        await collection.insert([{ a: 1 }, { a: 2 }, { a: 3 }]);
        const cursor = collection.find({});
        cursor.batchSize(2);
        expect(await cursor.next()).to.be.ok;
        // ?
    });

    it("should trigger getMore", async () => {
        const collection = await this.db.createCollection("trigger_get_more");
        await collection.insert([{ a: 1 }, { a: 1 }, { a: 1 }]);
        const cursor = collection.find({});
        cursor.batchSize(2);
        expect(await cursor.toArray()).to.have.lengthOf(3);
    });

    it("should correctly execute cursor explain", async () => {
        const collection = await this.db.createCollection("test_explain");
        await collection.insert({ a: 1 });
        const explaination = await collection.find({ a: 1 }).explain();
        expect(explaination).to.be.ok;
    });

    it("should correctly execute cursor count", async () => {
        const collection = await this.db.createCollection("test_count");
        expect(await collection.find().count()).to.be.equal(0);

        await Promise.all(range(10).map((i) => collection.insert({ x: i })));

        expect(await collection.find().count()).to.be.equal(10);
        expect(await collection.find({}, { limit: 5 }).count()).to.be.equal(5);
        expect(await collection.find({}, { skip: 5 }).count()).to.be.equal(5);

        const collection2 = this.db.collection("acollectionthatdoesnexist");
        expect(await collection2.count()).to.be.equal(0);

        const cursor = collection.find();
        expect(await cursor.count()).to.be.equal(10);

        await new Promise((resolve) => {
            cursor.each((err, item) => {
                if (is.null(item)) {
                    resolve();
                }
            });
        });
        expect(await cursor.count()).to.be.equal(10);
    });

    it("should correctly execute cursor count with dotted collection name", async () => {
        const collection = await this.db.createCollection("test_count.ext");
        expect(await collection.find().count()).to.be.equal(0);

        await Promise.all(range(10).map((i) => collection.insert({ x: i })));

        expect(await collection.find().count()).to.be.equal(10);
        expect(await collection.find({}, { limit: 5 }).count()).to.be.equal(5);
        expect(await collection.find({}, { skip: 5 }).count()).to.be.equal(5);

        const collection2 = this.db.collection("acollectionthatdoesn.exist");
        expect(await collection2.count()).to.be.equal(0);

        const cursor = collection.find();
        expect(await cursor.count()).to.be.equal(10);

        await new Promise((resolve) => {
            cursor.each((err, item) => {
                if (is.null(item)) {
                    resolve();
                }
            });
        });
        expect(await cursor.count()).to.be.equal(10);
    });

    it("should correctly execute sort on cursor", async () => {
        const collection = await this.db.createCollection("test_sort");
        await Promise.all(range(10).map((i) => collection.insert({ x: i })));

        {
            const cursor = collection.find().sort(["a", 1]);
            expect(cursor.sortValue).to.be.deep.equal(["a", 1]);
        }
        {
            const cursor = collection.find().sort("a", 1);
            expect(cursor.sortValue).to.be.deep.equal([["a", 1]]);
        }
        {
            const cursor = collection.find().sort("a", -1);
            expect(cursor.sortValue).to.be.deep.equal([["a", -1]]);
        }
        {
            const cursor = collection.find().sort("a", "asc");
            expect(cursor.sortValue).to.be.deep.equal([["a", "asc"]]);
        }
        {
            const cursor = collection.find().sort([["a", -1], ["b", 1]]);
            const entries = cursor.sortValue.entries();
            expect(entries.next().value).to.be.deep.equal(["a", -1]);
            expect(entries.next().value).to.be.deep.equal(["b", 1]);
        }
        {
            const cursor = collection.find().sort("a", 1).sort("a", -1);
            expect(cursor.sortValue).to.be.deep.equal([["a", -1]]);
        }
        {
            const cursor = collection.find();
            await cursor.nextObject();
            expect(() => {
                cursor.sort(["a"]);
            }).to.throw("Cursor is closed");
        }
        {
            const cursor = collection.find().sort("a", 25);
            await assert.throws(async () => {
                await cursor.nextObject();
            }, "Illegal sort clause, must be of the form [['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
        }
        {
            const cursor = collection.find().sort(25);
            await assert.throws(async () => {
                await cursor.nextObject();
            }, "Illegal sort clause, must be of the form [['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
        }
    });

    it("should throw error on each when missing callback", async () => {
        const collection = await this.db.createCollection("test_each");

        await Promise.all(range(10).map((i) => collection.insert({ x: i })));

        const cursor = await collection.find();
        expect(() => {
            cursor.each();
        }).to.throw("callback is mandatory");
    });

    it("should correctly handle limit on cursor", async () => {
        const collection = await this.db.createCollection("test_cursor_limit");

        await Promise.all(range(10).map((i) => collection.insert({ x: i })));

        const items = await collection.find().limit(5).toArray();

        expect(items).to.have.lengthOf(5);
    });

    it("should correctly handle negative one limit on cursor", async () => {
        const collection = await this.db.createCollection("test_cursor_negative_one_limit");

        await Promise.all(range(10).map((i) => collection.insert({ x: i })));

        const items = await collection.find().limit(-1).toArray();

        expect(items).to.have.lengthOf(1);
    });

    it("should correctly handle any negative limit on cursor", async () => {
        const collection = await this.db.createCollection("test_cursor_any_negative_limit");

        await Promise.all(range(10).map((i) => collection.insert({ x: i })));

        const items = await collection.find().limit(-5).toArray();

        expect(items).to.have.lengthOf(5);
    });

    it("should correctly return errors on illegal limit values", async () => {
        const collection = await this.db.createCollection("test_limit_exceptions");
        await collection.insert({ a: 1 });

        {
            const cursor = collection.find();
            expect(() => {
                cursor.limit("not-an-integer");
            }).to.throw("limit requires an integer");

            await cursor.close();

            expect(() => {
                cursor.limit(1);
            }).to.throw("Cursor is closed");
        }
        {
            const cursor = collection.find();
            await cursor.nextObject();
            expect(() => {
                cursor.limit(1);
            }).to.throw("Cursor is closed");
        }
    });

    it("should correctly skip records on cursor", async () => {
        const collection = await this.db.createCollection("test_skip");

        for (const i of range(10)) {
            await collection.insert({ x: i });
        }

        expect(await collection.find().count()).to.be.equal(10);

        const items = await collection.find().skip(2).toArray();

        expect(items).to.have.lengthOf(8);
        if (this.topology === "sharded") {
            items.sort((a, b) => a.x - b.x);
        }
        for (const i of range(2, 10)) {
            expect(items.shift()).to.include({ x: i });
        }
    });

    it("should correctly return errors on illegal skip values", async () => {
        const collection = await this.db.createCollection("test_skip_exceptions");
        await collection.insert({ a: 1 });

        expect(() => {
            collection.find().skip("not-an-integer");
        }).to.throw("skip requires an integer");

        {
            const cursor = collection.find();
            await cursor.nextObject();

            expect(() => {
                cursor.skip(1);
            }).to.throw("Cursor is closed");
        }
        {
            const cursor = collection.find();
            await cursor.close();
            expect(() => {
                cursor.skip(1);
            }).to.throw("Cursor is closed");
        }
    });

    it("should return errors on illegal batch sizes", async () => {
        const collection = await this.db.createCollection("test_batchSize_exceptions");
        await collection.insert({ a: 1 });
        {
            const cursor = collection.find();
            expect(() => {
                cursor.batchSize("not-an-integer");
            }).to.throw("batchSize requires an integer");
        }
        {
            const cursor = collection.find();
            await cursor.nextObject();
            await cursor.nextObject();
            expect(() => {
                cursor.batchSize(1);
            }).to.throw("Cursor is closed");
        }
        {
            const cursor = collection.find();
            await cursor.close();
            expect(() => {
                cursor.batchSize(1);
            }).to.throw("Cursor is closed");
        }
    });

    it("should correctly handle changes in batch sizes", async () => {
        const collection = await this.db.createCollection("test_not_multiple_batch_size");
        const docs = range(6).map((i) => ({ a: i }));  // 6 total

        await collection.insert(docs);

        const cursor = collection.find({}, { batchSize: 2 });

        expect(await cursor.nextObject()).to.be.ok;   // 1
        expect(cursor.bufferedCount()).to.be.equal(1);

        expect(await cursor.nextObject()).to.be.ok;  // 2
        expect(cursor.bufferedCount()).to.be.equal(0);

        cursor.batchSize(3);

        expect(await cursor.nextObject()).to.be.ok;  // 3
        expect(cursor.bufferedCount()).to.be.equal(2);

        expect(await cursor.nextObject()).to.be.ok;  // 4
        expect(cursor.bufferedCount()).to.be.equal(1);

        expect(await cursor.nextObject()).to.be.ok;  // 5
        expect(cursor.bufferedCount()).to.be.equal(0);

        expect(await cursor.nextObject()).to.be.ok;  // 6
        expect(cursor.bufferedCount()).to.be.equal(0);

        expect(await cursor.nextObject()).to.be.null;  // no more
        expect(cursor.isClosed()).to.be.true;
    });

    it("should correctly handle batch size", async () => {
        const collection = await this.db.createCollection("test_multiple_batch_size");
        const docs = range(4).map((i) => ({ a: i }));  // 4 total

        await collection.insert(docs);

        const cursor = await collection.find({}, { batchSize: 2 });

        expect(await cursor.nextObject()).to.be.ok;  // 1
        expect(cursor.bufferedCount()).to.be.equal(1);

        expect(await cursor.nextObject()).to.be.ok;  // 2
        expect(cursor.bufferedCount()).to.be.equal(0);

        expect(await cursor.nextObject()).to.be.ok;  // 3
        expect(cursor.bufferedCount()).to.be.equal(1);

        expect(await cursor.nextObject()).to.be.ok;  // 4
        expect(cursor.bufferedCount()).to.be.equal(0);

        expect(await cursor.nextObject()).to.be.null;  // no more
        expect(cursor.isClosed()).to.be.true;
    });

    it("should handle when limit bigger than batch size", async () => {
        const collection = await this.db.createCollection("test_limit_greater_than_batch_size");
        const docs = range(10).map((i) => ({ a: i }));  // 10 total

        await collection.insert(docs);

        const cursor = collection.find({}, { batchSize: 3, limit: 4 });

        expect(await cursor.nextObject()).to.be.ok;  // 1
        expect(cursor.bufferedCount()).to.be.equal(2);

        expect(await cursor.nextObject()).to.be.ok;  // 2
        expect(cursor.bufferedCount()).to.be.equal(1);

        expect(await cursor.nextObject()).to.be.ok;  // 3
        expect(cursor.bufferedCount()).to.be.equal(0);

        expect(await cursor.nextObject()).to.be.ok;  // 4
        expect(cursor.bufferedCount()).to.be.equal(0);

        expect(await cursor.nextObject()).to.be.null;  // no more
        expect(cursor.bufferedCount()).to.be.equal(0);
    });

    it("should handle limit less than batch size", async () => {
        const collection = await this.db.createCollection("test_limit_less_than_batch_size");
        const docs = range(10).map((i) => ({ a: i }));
        await collection.insert(docs);

        const cursor = collection.find({}, { batchSize: 4, limit: 2 });

        expect(await cursor.nextObject()).to.be.ok;
        expect(cursor.bufferedCount()).to.be.equal(1);

        expect(await cursor.nextObject()).to.be.ok;
        expect(cursor.bufferedCount()).to.be.equal(0);

        expect(await cursor.nextObject()).to.be.null;  // no more
        expect(cursor.isClosed()).to.be.true;
    });

    it("should handle skip limit chaining", async () => {
        const collection = await this.db.createCollection("test_limit_skip_chaining");

        for (const i of range(10)) {
            await collection.insert({ x: i });
        }

        expect(await collection.find().toArray()).to.have.lengthOf(10);

        const items = await collection.find().limit(5).skip(3).toArray();

        expect(items).to.have.lengthOf(5);
        if (this.topology === "sharded") {
            items.sort((a, b) => a.x - b.x);
        }
        for (const i of range(3, 8)) {
            expect(items.shift()).to.include({ x: i });
        }
    });

    it("should close cursor no query sent", async () => {
        const collection = await this.db.createCollection("test_close_no_query_sent");
        const cursor = collection.find();
        await cursor.close();
        expect(cursor.isClosed()).to.be.true;
    });

    it("should correctly refill via getMore command", async () => {
        const collection = await this.db.createCollection("test_refill_via_get_more");
        const COUNT = 1000;
        const docs = range(COUNT).map((i) => ({ a: i }));
        await collection.insertMany(docs);

        expect(await collection.count()).to.be.equal(COUNT);
        expect(await new Promise((resolve) => {
            let total = 0;
            collection.find({}, {}).each((err, item) => {
                if (is.null(item)) {
                    resolve(total);
                } else {
                    total += item.a;
                }
            });
        })).to.be.equal(499500);

        expect(await collection.count()).to.be.equal(COUNT);

        expect(await new Promise((resolve) => {
            let total = 0;
            collection.find({}, {}).each((err, item) => {
                if (is.null(item)) {
                    resolve(total);
                } else {
                    total += item.a;
                }
            });
        })).to.be.equal(499500);

        expect(await collection.count()).to.be.equal(COUNT);
    });

    it("should close cursor after query has been sent", async () => {
        const collection = await this.db.createCollection("test_close_after_query_sent");
        await collection.insert({ a: 1 });

        const cursor = collection.find({ a: 1 });
        await cursor.nextObject();
        await cursor.close();
        expect(cursor.isClosed()).to.be.true;
    });

    it("should correctly execute cursor count with fields", async () => {
        const collection = await this.db.createCollection("test_count_with_fields");
        await collection.save({ x: 1, a: 2 });
        const items = await collection.find({}, { fields: ["a"] }).toArray();
        expect(items).to.have.lengthOf(1);
        expect(items[0]).to.include({ a: 2 }).and.not.to.have.key("x");
        const item = await collection.findOne({}, { fields: ["a"] });
        expect(item).to.be.ok;
        expect(item).to.include({ a: 2 }).and.not.to.have.key("x");
    });

    it("should correctly count with fields using exclude", async () => {
        const collection = await this.db.createCollection("test_count_with_fields_using_exclude");
        await collection.save({ x: 1, a: 2 });
        const items = await collection.find({}, { fields: { x: 0 } }).toArray();
        expect(items).to.have.lengthOf(1);
        expect(items[0]).to.include({ a: 2 }).and.not.to.have.key("x");
    });

    it("should correctly execute ensure index with no callback", async () => {
        const collection = await this.db.createCollection("shouldCorrectlyExecuteEnsureIndexWithNoCallback");
        await collection.ensureIndex({ createdAt: 1 });
        await collection.insert({ createdAt: new Date() });
        const items = await collection.find().sort(["createdAt", "asc"]).toArray();
        expect(items).to.have.lengthOf(1);
    });

    it("should correctly execute count on cursor", async () => {
        const collection = await this.db.createCollection("Should_correctly_execute_count_on_cursor_1");
        await collection.insert(range(1000).map((i) => ({ a: i, createdAt: new Date() })));
        const cursor = collection.find({});
        expect(await cursor.count()).to.be.equal(1000);
        expect(await new Promise((resolve) => {
            let total = 0;
            cursor.each((err, item) => {
                if (is.null(item)) {
                    resolve(total);
                } else {
                    ++total;
                }
            });
        })).to.be.equal(1000);
    });

    it("should be able to stream documents", async () => {
        const collection = await this.db.createCollection("Should_be_able_to_stream_documents");
        await collection.insert(range(1000).map((i) => ({ a: i })));

        const cursor = collection.find();

        const stream = cursor.stream();

        const docs = await stream.pipe(core());

        expect(docs).to.have.lengthOf(1000);
        if (this.topology === "sharded") {
            docs.sort((a, b) => a.a - b.a);
        }
        for (const i of range(1000)) {
            expect(docs.shift()).to.include({ a: i });
        }

        expect(cursor.isClosed()).to.be.true;
    });

    it.skip("immediately destroying a stream prevents the query from executing", async () => {
        // stream is a cursor wrapper, should it destoy the cursor?
    });

    it.skip("should close dead tailable cursors", async () => {
        //
    });

    it("should await data", async () => {
        const collection = await this.db.createCollection("should_await_data", { capped: true, size: 8 });
        await collection.insert({ a: 1 });

        const cursor = collection.find({}, { tailable: true, awaitdata: true });

        await new Promise((resolve) => {
            cursor.each((err, res) => {
                if (res) {
                    cursor.kill();
                }
                if (err) {
                    resolve();
                }
            });

        });
    });

    it("should await data with documents available", async () => {
        const collection = await this.db.createCollection("should_await_data_no_docs", { capped: true, size: 8 });
        const cursor = collection.find({}, { tailable: true, awaitdata: true });
        const rewind = cursor.rewind;
        let called = false;
        cursor.rewind = function () {
            called = true;
        };

        await new Promise((resolve) => {
            cursor.each((err) => {
                if (err) {
                    resolve();
                }
            });
        });
        cursor.rewind = rewind;
        expect(called).to.be.true;
    });

    it("should await data using cursor flag", async () => {
        const collection = await this.db.createCollection("should_await_data_cursor_flag", { capped: true, size: 8 });
        await collection.insert({ a: 1 });
        const cursor = collection.find({}, {});
        cursor.addCursorFlag("tailable", true);
        cursor.addCursorFlag("awaitData", true);
        await new Promise((resolve) => {
            cursor.each((err) => {
                if (err) {
                    resolve();
                } else {
                    cursor.kill();
                }
            });
        });
    });

    it("should correctly retry tailable cursor connection", async () => {
        const collection = await this.db.createCollection("should_await_data", { capped: true, size: 8 });
        await collection.insert({ a: 1 });
        const cursor = collection.find({}, { tailable: true, awaitdata: true });
        await new Promise((resolve) => {
            cursor.each((err) => {
                if (err) {
                    resolve();
                } else {
                    cursor.kill();
                }
            });
        });
    });

    it("should correct execute explain honoring limit", async () => {
        const docs = [
            { _keywords: ["compact", "ii2gd", "led", "24-48v", "presse-etoupe", "bexbgl1d24483", "flash", "48v", "eexd", "feu", "presse", "compris", "rouge", "etoupe", "iic", "ii2gdeexdiict5", "red", "aet"] },
            { _keywords: ["reducteur", "06212", "d20/16", "manch", "d20", "manchon", "ard", "sable", "irl", "red"] },
            { _keywords: ["reducteur", "06214", "manch", "d25/20", "d25", "manchon", "ard", "sable", "irl", "red"] },
            { _keywords: ["bar", "rac", "boite", "6790178", "50-240/4-35", "240", "branch", "coulee", "ddc", "red", "ip2x"] },
            { _keywords: ["bar", "ip2x", "boite", "6790158", "ddi", "240", "branch", "injectee", "50-240/4-35?", "red"] },
            { _keywords: ["bar", "ip2x", "boite", "6790179", "coulee", "240", "branch", "sdc", "50-240/4-35?", "red", "rac"] },
            { _keywords: ["bar", "ip2x", "boite", "6790159", "240", "branch", "injectee", "50-240/4-35?", "sdi", "red"] },
            { _keywords: ["6000", "r-6000", "resin", "high", "739680", "red", "performance", "brd", "with", "ribbon", "flanges"] },
            { _keywords: ["804320", "for", "paint", "roads", "brd", "red"] },
            { _keywords: ["38mm", "padlock", "safety", "813594", "brd", "red"] },
            { _keywords: ["114551", "r6900", "for", "red", "bmp71", "brd", "ribbon"] },
            { _keywords: ["catena", "diameter", "621482", "rings", "brd", "legend", "red", "2mm"] },
            { _keywords: ["catena", "diameter", "621491", "rings", "5mm", "brd", "legend", "red"] },
            { _keywords: ["catena", "diameter", "621499", "rings", "3mm", "brd", "legend", "red"] },
            { _keywords: ["catena", "diameter", "621508", "rings", "5mm", "brd", "legend", "red"] },
            { _keywords: ["insert", "for", "cable", "3mm", "carrier", "621540", "blank", "brd", "ademark", "red"] },
            { _keywords: ["insert", "for", "cable", "621544", "3mm", "carrier", "brd", "ademark", "legend", "red"] },
            { _keywords: ["catena", "diameter", "6mm", "621518", "rings", "brd", "legend", "red"] },
            { _keywords: ["catena", "diameter", "621455", "8mm", "rings", "brd", "legend", "red"] },
            { _keywords: ["catena", "diameter", "621464", "rings", "5mm", "brd", "legend", "red"] }
        ];
        const collection = this.db.collection("shouldCorrectExecuteExplainHonoringLimit");
        await collection.insert(docs);
        await collection.ensureIndex({ _keywords: 1 });
        expect(await collection.find({ _keywords: "red" }, {}, { explain: true }).limit(10).toArray()).to.be.ok;
        expect(await collection.find({ _keywords: "red" }, {}).limit(10).explain()).to.be.ok;
    });

    it("should not explain when false", async () => {
        const doc = { name: "camera", _keywords: ["compact", "ii2gd", "led", "red", "aet"] };
        const collection = this.db.collection("shouldNotExplainWhenFalse");
        await collection.insert(doc);
        const result = await collection.find({ _keywords: "red" }, {}, { explain: false }).limit(10).toArray();
        expect(result).to.have.lengthOf(1);
        expect(result[0]).to.include({ name: "camera" });
    });

    it.skip("should fail to set read preference on cursor", () => {
        expect(() => {
            this.db.collection("shouldFailToSetReadPreferenceOnCursor").find().setReadPreference("notsecondary");
            // wtf
        }).to.throw();
        expect(() => {
            this.db.collection("shouldFailToSetReadPreferenceOnCursor").find().setReadPreference("secondary");
        }).not.to.throw();
    });

    it("should not fail due to stackoverflow each", async () => {
        const collection = await this.db.createCollection("shouldNotFailDueToStackOverflowEach");
        const docs = range(30).map((i) => range(1000 * i, 1000 * (i + 1)).map((j) => ({ a: j })));
        await Promise.all(docs.map((batch) => collection.insert(batch)));
        expect(await new Promise((resolve) => {
            let total = 0;
            collection.find({}).each((err, item) => {
                if (item) {
                    ++total;
                } else {
                    resolve(total);
                }
            });
        })).to.be.equal(30000);
    });

    it("should not fail due to stack overflow to array", async () => {
        const collection = await this.db.createCollection("shouldNotFailDueToStackOverflowToArray");
        const docs = range(30).map((i) => range(1000 * i, 1000 * (i + 1)).map((j) => ({ a: j })));
        await Promise.all(docs.map((batch) => collection.insert(batch)));
        expect(await collection.find().toArray()).to.have.lengthOf(30000);
    });

    it("should correctly skip and limit", async () => {
        const collection = await this.db.collection("shouldCorrectlySkipAndLimit");
        await collection.insert(range(100).map((i) => ({ a: i, OrderNumber: i })));
        const items = await collection.find({}, { OrderNumber: 1 }).skip(10).limit(10).toArray();
        expect(items).to.have.lengthOf(10);
        for (const i of range(10, 20)) {
            expect(items.shift()).to.include({ OrderNumber: i }).and.not.to.include({ a: i });
        }
        expect(await collection.find({}, { OrderNumber: 1 }).skip(10).limit(10).count(true)).to.be.equal(10);
    });

    it("should fail to tail a normal collection", async () => {
        const collection = this.db.collection("shouldFailToTailANormalCollection");
        await collection.insert(range(100).map((i) => ({ a: i, OrderNumber: i })));
        const err = await new Promise((resolve) => {
            collection.find({}, { tailable: true }).each((err) => {
                resolve(err);
            });
        });
        expect(err).to.be.ok;
        expect(err.code).to.be.a("number");
    });

    it("should correctly use find and cursor count", async () => {
        const collection = await this.db.createCollection("test_close_function_on_cursor_2");
        await collection.insert(range(100).map((i) => ({ a: i })));
        const cursor = collection.find();
        expect(await cursor.count()).to.be.equal(100);
    });

    it("should correctly apply hint to count command for cursor", async () => {
        const collection = this.db.collection("count_hint");
        await collection.insert([{ i: 1 }, { i: 2 }], { w: 1 });
        await collection.ensureIndex({ i: 1 });
        expect(await collection.find({ i: 1 }, { hint: "_id_" }).count()).to.be.equal(1);
        expect(await collection.find({}, { hint: "_id_" }).count()).to.be.equal(2);
        await assert.throws(async () => {
            await collection.find({ i: 1 }, { hint: "BAD HINT" }).count();
        });
        await collection.ensureIndex({ x: 1 }, { sparse: true });
        expect(await collection.find({ i: 1 }, { hint: "x_1" }).count()).to.be.equal(0);
        expect(await collection.find({}, { hint: "i_1" }).count()).to.be.equal(2);
    });

    it("should terminate each after first document by returning false", async () => {
        const collection = await this.db.createCollection("terminate_each_returning_false");
        await collection.insert(range(100).map((i) => ({ a: i })));

        const cursor = collection.find();

        const doc = await new Promise((resolve) => {
            cursor.each((err, doc) => {
                if (doc) {
                    resolve(doc);
                    return false;
                }
            });
        });
        expect(doc).to.include({ a: 0 });
        await promise.delay(100);
        expect(await cursor.nextObject()).to.include({ a: 1 });
    });

    it("should correctly handle maxTimeMS as part of findOne options", async () => {
        const donkey = {
            color: "brown"
        };
        const collection = this.db.collection("donkies");
        const result = await collection.insertOne(donkey);
        const query = { _id: result.insertedId };
        const options = { maxTimeMS: 1000 };
        const doc = await collection.findOne(query, options);
        expect(doc).to.include({ color: "brown" });
    });

    it("should correctly handle batchSize of 2", async () => {
        const collection = this.db.collection("should_correctly_handle_batchSize_2");
        await collection.insert([{ x: 1 }, { x: 2 }, { x: 3 }]);
        const cursor = await collection.find({}, { batchSize: 2 });
        await cursor.nextObject();
        this.closeDB();
        await cursor.nextObject();

        await assert.throws(async () => {
            await cursor.nextObject();
        }, "connection destroyed, not possible to instantiate cursor");
    });

    it("should report database name and collection name", async () => {
        const cursor = this.db.collection("myCollection").find({});
        expect(cursor.namespace).to.include({
            collection: "myCollection",
            database: "tests"
        });
    });

    it("should correctly execute count on cursor with maxTimeMS", async () => {
        const collection = await this.db.createCollection("Should_correctly_execute_count_on_cursor_2");
        await collection.insert(range(1000).map((i) => {
            return { a: i, createdAt: new Date(new Date().getTime() + i * 1000) };
        }));
        {
            const cursor = collection.find({});
            cursor.limit(100);
            cursor.skip(10);
            expect(await cursor.count(true, { maxTimeMS: 1000 })).to.be.equal(100);
        }
        {
            const cursor = collection.find({});
            cursor.limit(100);
            cursor.skip(10);
            cursor.maxTimeMS(100);
            expect(await cursor.count()).to.be.equal(100);
        }
    });

    it("should correctly execute count on cursor with maxTimeMS set using legacy method", async () => {
        const collection = await this.db.createCollection("Should_correctly_execute_count_on_cursor_3");
        await collection.insert(range(1000).map((i) => {
            return { a: i, createdAt: new Date(new Date().getTime() + i * 1000) };
        }));
        expect(await collection.find({}, { maxTimeMS: 100 }).toArray()).to.have.lengthOf(1000);
    });

    it("should correctly apply map to toArray", async () => {
        const collection = this.db.collection("map_toArray");
        await collection.insert(range(1000).map((i) => {
            return { a: i, createdAt: new Date(new Date().getTime() + i * 1000) };
        }));
        const cursor = collection.find({})
            .map(() => ({ a: 1 }))
            .batchSize(5)
            .limit(10);
        expect(await cursor.toArray()).to.be.deep.equal(range(10).map(() => ({ a: 1 })));
    });

    it("should correctly apply map to next", async () => {
        const collection = this.db.collection("map_next");
        await collection.insert(range(1000).map((i) => {
            return { a: i, createdAt: new Date(new Date().getTime() + i * 1000) };
        }));
        const cursor = collection.find({})
            .map(() => ({ a: 1 }))
            .batchSize(5)
            .limit(10);

        expect(await cursor.next()).to.be.deep.equal({ a: 1 });
    });

    it("should correctly apply map to nextObject", async () => {
        const collection = this.db.collection("map_nextObject");
        await collection.insert(range(1000).map((i) => {
            return { a: i, createdAt: new Date(new Date().getTime() + i * 1000) };
        }));
        const cursor = collection.find({})
            .map(() => ({ a: 1 }))
            .batchSize(5)
            .limit(10);
        expect(await cursor.nextObject()).to.be.deep.equal({ a: 1 });
    });

    it("should correctly apply map to each", async () => {
        const collection = this.db.collection("map_each");
        await collection.insert(range(1000).map((i) => {
            return { a: i, createdAt: new Date(new Date().getTime() + i * 1000) };
        }));
        const cursor = collection.find({})
            .map(() => ({ a: 1 }))
            .batchSize(5)
            .limit(10);

        const docs = await new Promise((resolve) => {
            const docs = [];
            cursor.each((err, doc) => {
                if (!doc) {
                    resolve(docs);
                } else {
                    docs.push(doc);
                }
            });
        });
        expect(docs).to.be.deep.equal(range(10).map(() => ({ a: 1 })));
    });

    it("should correctly apply map to forEach", async () => {
        const collection = this.db.collection("map_forEach");
        await collection.insert(range(1000).map((i) => {
            return { a: i, createdAt: new Date(new Date().getTime() + i * 1000) };
        }));
        // Create a cursor for the content
        const cursor = collection.find({})
            .map(() => ({ a: 1 }))
            .batchSize(5)
            .limit(10);
        await new Promise((resolve, reject) => {
            cursor.forEach((doc) => {
                expect(doc).to.be.deep.equal({ a: 1 });
            }, (err) => {
                err ? reject(err) : resolve();
            });
        });
    });

    it("should correctly apply multiple uses of map and apply forEach", async () => {
        const collection = this.db.collection("mapmap_forEach");
        await collection.insert(range(1000).map((i) => {
            return { a: i, createdAt: new Date(new Date().getTime() + i * 1000) };
        }));
        // Create a cursor for the content
        const cursor = collection.find({})
            .map(() => ({ a: 2 }))
            .map((x) => ({ a: x.a * x.a }))
            .batchSize(5)
            .limit(10);
        await new Promise((resolve, reject) => {
            cursor.forEach((doc) => {
                expect(doc).to.be.deep.equal({ a: 4 });
            }, (err) => {
                err ? reject(err) : resolve();
            });
        });
    });

    it("should correctly apply skip and limit to large set of documents", async () => {
        const collection = this.db.collection("cursor_limit_skip_correctly");
        const ordered = collection.initializeUnorderedBulkOp();
        for (const i of range(6000)) {
            ordered.insert({ a: i });
        }
        await ordered.execute({ w: 1 });
        const docs = await collection.find().limit(2016).skip(2016).toArray();
        expect(docs).to.have.lengthOf(2016);
    });

    it("should tail cursor using maxAwaitTimeMS for 3.2 or higher", async () => {
        const collection = await this.db.createCollection("should_await_data_max_awaittime_ms", { capped: true, size: 8 });
        await collection.insert({ a: 1 });
        const cursor = collection.find({})
            .addCursorFlag("tailable", true)
            .addCursorFlag("awaitData", true)
            .maxAwaitTimeMS(500);

        const s = new Date();
        expect(await new Promise((resolve) => {
            cursor.each((err, result) => {
                if (result) {
                    setTimeout(() => {
                        cursor.kill();
                    }, 300);
                } else {
                    resolve(new Date().getTime() - s.getTime());
                }
            });
        })).to.be.above(500);
    });

    it("should correctly execute count on cursor with limit and skip", async () => {
        const collection = await this.db.createCollection("Should_correctly_execute_count_on_cursor_1_");
        await collection.insert(range(50).map((i) => ({ a: i, createdAt: new Date() })));
        {
            const cursor = collection.find({});
            expect(await cursor.limit(100).skip(0).count()).to.be.equal(50);
        }
        {
            const cursor = collection.find({});
            expect(await cursor.limit(100).skip(0).toArray()).to.have.lengthOf(50);
        }
    });

    it("should correctly handle negative batchSize and set the limit", async () => {
        const collection = await this.db.createCollection("Should_correctly_execute_count_on_cursor_2_");
        await collection.insert(range(50).map((i) => ({ a: i, createdAt: new Date() })));
        const cursor = collection.find({});
        await cursor.batchSize(-10).next();
        expect(cursor.cursorState.cursorId).to.be.deep.equal(Long.ZERO);
    });

    it("correcly decorate the cursor count command with skip, limit, hint, readConcern", async () => {
        const listener = mongo.instrument(() => { });
        const started = [];
        listener.on("started", (event) => {
            if (event.commandName === "count") {
                started.push(event);
            }
        });
        const cursor = this.db.collection("cursor_count_test", { readConcern: { level: "local" } })
            .find({ project: "123" })
            .limit(5)
            .skip(5)
            .hint({ project: 1 });
        expect(await cursor.count(true)).to.be.equal(0);
        expect(started).to.have.lengthOf(1);
        if (started[0].command.readConcern) {
            expect(started[0].command.readConcern).to.be.deep.equal({ level: "local" });
        }
        expect(started[0].command.hint).to.be.deep.equal({ project: 1 });
        expect(started[0].command).to.include({ skip: 5, limit: 5 });
        listener.uninstrument();
    });

    it("correcly decorate the collection cursor count command with skip, limit, hint, readConcern", async () => {
        const listener = mongo.instrument(() => { });
        const started = [];
        listener.on("started", (event) => {
            if (event.commandName === "count") {
                started.push(event);
            }
        });
        const cursor = this.db.collection("cursor_count_test1", { readConcern: { level: "local" } });
        expect(await cursor.count({ project: "123" }, {
            readConcern: { level: "local" },
            limit: 5,
            skip: 5,
            hint: { project: 1 }
        })).to.be.equal(0);
        expect(started).to.have.lengthOf(1);
        if (started[0].command.readConcern) {
            expect(started[0].command.readConcern).to.be.deep.equal({ level: "local" });
        }
        expect(started[0].command.hint).to.be.deep.equal({ project: 1 });
        expect(started[0].command).to.include({ skip: 5, limit: 5 });
        listener.uninstrument();
    });
});
