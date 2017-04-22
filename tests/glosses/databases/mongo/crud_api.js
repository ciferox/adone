describe("CRUD API", function () {
    specify("find", async () => {
        await this.db.collection("t").insert([{ a: 1 }, { a: 1 }, { a: 1 }, { a: 1 }]);
        const cursor = this.db.collection("t").find({});
        cursor.filter({ a: 1 })
            .addCursorFlag("noCursorTimeout", true)
            .addQueryModifier("$comment", "some comment")
            .batchSize(2)
            .comment("some comment 2")
            .limit(2)
            .maxTimeMs(50)
            .project({ a: 1 })
            .skip(0)
            .sort({ a: 1 });

        expect(await cursor.count()).to.be.equal(2);

        await new Promise((resolve, reject) => {
            let cnt = 0;

            cursor.each((err, doc) => {
                if (err) {
                    return reject(err);
                }
                if (doc === null) {
                    if (cnt !== 2) {
                        return reject(new Error("must be 2 docs"));
                    }
                    resolve();
                }
                ++cnt;
            });
        });

        expect(await cursor.toArray()).to.have.lengthOf(2);

        {
            const c = cursor.clone();
            expect(await c.next()).to.include({ a: 1 });
            expect(await c.next()).to.include({ a: 1 });
            expect(await c.next()).to.be.null;
        }

        {
            const c = cursor.clone();
            let cnt = 0;
            c.on("data", (doc) => {
                expect(doc).to.include({ a: 1 });
                ++cnt;
            });
            await new Promise((resolve) => c.once("end", resolve));
            expect(cnt).to.be.equal(2);
        }
    });

    describe("insert", () => {
        specify("legacy", async () => {
            const r = await this.db.collection("t2_1").insert([{ a: 1 }, { a: 2 }]);
            expect(r.result.n).to.be.equal(2);
        });

        specify("bulk", async () => {
            const bulk = this.db.collection("t2_2").initializeOrderedBulkOp();
            bulk.insert({ a: 1 });
            bulk.insert({ a: 1 });
            const r = await bulk.execute();
            expect(r.nInserted).to.be.equal(2);
        });

        specify("insertOne", async () => {
            const r = await this.db.collection("t2_3").insertOne({ a: 1 }, { w: 1 });
            expect(r.result.n).to.be.equal(1);
            expect(r.insertedCount).to.be.equal(1);
            expect(r.insertedId).to.exist;
        });

        specify("insertMany", async () => {
            const r = await this.db.collection("t2_4").insertMany([{ a: 1 }, { b: 2 }], { w: 1 });
            expect(r.result.n).to.be.equal(2);
            expect(r.insertedCount).to.be.equal(2);
            expect(r.insertedIds).to.have.lengthOf(2);
        });

        specify("bulkWriteUnOrdered", async () => {
            let r = await this.db.collection("t2_5").insertMany([{ c: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(1);
            r = await this.db.collection("t2_5").bulkWrite([
                { insertOne: { a: 1 } },
                { insertMany: [{ g: 1 }, { g: 2 }] },
                { updateOne: { q: { a: 2 }, u: { $set: { a: 2 } }, upsert: true } },
                { updateMany: { q: { a: 2 }, u: { $set: { a: 2 } }, upsert: true } },
                { deleteOne: { q: { c: 1 } } },
                { deleteMany: { q: { c: 1 } } }
            ], { ordered: false, w: 1 });
            expect(r.nInserted).to.be.equal(3);
            expect(r.nUpserted).to.be.equal(1);
            expect(r.nRemoved).to.be.equal(1);
            expect(r.insertedCount).to.be.equal(3);
            expect(Object.keys(r.insertedIds)).to.have.lengthOf(3);
            expect(r.matchedCount).to.be.equal(1);
            expect(r.deletedCount).to.be.equal(1);
            expect(r.upsertedCount).to.be.equal(1);
            expect(Object.keys(r.upsertedIds)).to.have.lengthOf(1);
        });

        specify("bulkWriteUnOrderedSpec", async () => {
            let r = await this.db.collection("t2_6").insertMany([{ c: 1 }, { c: 2 }, { c: 3 }], { w: 1 });
            expect(r.result.n).to.be.equal(3);
            r = await this.db.collection("t2_6").bulkWrite([
                { insertOne: { document: { a: 1 } } },
                { updateOne: { filter: { a: 2 }, update: { $set: { a: 2 } }, upsert: true } },
                { updateMany: { filter: { a: 3 }, update: { $set: { a: 3 } }, upsert: true } },
                { deleteOne: { filter: { c: 1 } } },
                { deleteMany: { filter: { c: 2 } } },
                { replaceOne: { filter: { c: 3 }, replacement: { c: 4 }, upsert: true } }
            ], { ordered: false, w: 1 });
            expect(r.nInserted).to.be.equal(1);
            expect(r.nUpserted).to.be.equal(2);
            expect(r.nRemoved).to.be.equal(2);
            expect(r.insertedCount).to.be.equal(1);
            expect(Object.keys(r.insertedIds)).to.have.lengthOf(1);
            expect(r.matchedCount).to.be.equal(1);
            expect(r.deletedCount).to.be.equal(2);
            expect(r.upsertedCount).to.be.equal(2);
            expect(Object.keys(r.upsertedIds)).to.have.lengthOf(2);
        });

        specify("bulkWriteOrdered", async () => {
            let r = await this.db.collection("t2_7").insertMany([{ c: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(1);
            r = await this.db.collection("t2_7").bulkWrite([
                { insertOne: { a: 1 } },
                { insertMany: [{ g: 1 }, { g: 2 }] },
                { updateOne: { q: { a: 2 }, u: { $set: { a: 2 } }, upsert: true } },
                { updateMany: { q: { a: 2 }, u: { $set: { a: 2 } }, upsert: true } },
                { deleteOne: { q: { c: 1 } } },
                { deleteMany: { q: { c: 1 } } }
            ], { ordered: true, w: 1 });
            expect(r.nInserted).to.be.equal(3);
            expect(r.nUpserted).to.be.equal(1);
            expect(r.nRemoved).to.be.equal(1);
            expect(r.insertedCount).to.be.equal(3);
            expect(Object.keys(r.insertedIds)).to.have.lengthOf(3);
            expect(r.matchedCount).to.be.equal(1);
            expect(r.deletedCount).to.be.equal(1);
            expect(r.upsertedCount).to.be.equal(1);
            expect(Object.keys(r.upsertedIds)).to.have.lengthOf(1);
        });

        specify("bulkWriteOrderedCrudSpec", async () => {
            let r = await this.db.collection("t2_8").insertMany([{ c: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(1);
            r = await this.db.collection("t2_8").bulkWrite([
                { insertOne: { document: { a: 1 } } },
                { updateOne: { filter: { a: 2 }, update: { $set: { a: 2 } }, upsert: true } },
                { updateMany: { filter: { a: 2 }, update: { $set: { a: 2 } }, upsert: true } },
                { deleteOne: { filter: { c: 1 } } },
                { deleteMany: { filter: { c: 1 } } },
                { replaceOne: { filter: { c: 3 }, replacement: { c: 4 }, upsert: true } }
            ], { ordered: true, w: 1 });
            expect(r.nInserted).to.be.equal(1);
            expect(r.nUpserted).to.be.equal(2);
            expect(r.nRemoved).to.be.equal(1);
            expect(r.insertedCount).to.be.equal(1);
            expect(Object.keys(r.insertedIds)).to.have.lengthOf(1);
            expect(r.matchedCount).to.be.equal(1);
            expect(r.deletedCount).to.be.equal(1);
            expect(r.upsertedCount).to.be.equal(2);
            expect(Object.keys(r.upsertedIds)).to.have.lengthOf(2);
        });
    });

    describe("update", () => {
        specify("legacy", async () => {
            const r = await this.db.collection("t3_1").update({ a: 1 }, { $set: { a: 2 } }, { upsert: true });
            expect(r.result.n).to.be.equal(1);
        });

        specify("updateOne", async () => {
            let r = await this.db.collection("t3_2").insertMany([{ c: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(1);
            r = await this.db.collection("t3_2").updateOne({
                a: 1
            }, {
                $set: { a: 1 }
            }, {
                upsert: true
            });
            expect(r.result.n).to.be.equal(1);
            expect(r.matchedCount).to.be.equal(0);
            expect(r.upsertedId).to.exist;
        });

        specify("replaceOne", async () => {
            let r = await this.db.collection("t3_3").replaceOne({
                a: 1
            }, {
                a: 2
            }, {
                upsert: true
            });
            expect(r.result.n).to.be.equal(1);
            expect(r.matchedCount).to.be.equal(0);
            expect(r.ops).to.have.lengthOf(1);
            expect(r.upsertedId).to.exist;
            r = await this.db.collection("t3_3").replaceOne({
                a: 2
            }, {
                a: 3
            }, {
                upsert: true
            });
            expect(r.result.n).to.be.equal(1);
            expect(r.result.upserted).not.to.exist;
            expect(r.ops).to.have.lengthOf(1);
            expect(r.matchedCount).to.be.equal(1);
            expect(r.upsertedId).not.to.exist;
        });

        specify("updateMany", async () => {
            let r = await this.db.collection("t3_4").insertMany([{ a: 1 }, { a: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(2);
            r = await this.db.collection("t3_4").updateMany({
                a: 1
            }, {
                $set: { a: 2 }
            }, {
                upsert: true,
                w: 1
            });
            expect(r.result.n).to.be.equal(2);
            expect(r.matchedCount).to.be.equal(2);
            expect(r.upsertedId).not.to.exist;

            r = await this.db.collection("t3_4").updateMany({
                c: 1
            }, {
                $set: { d: 2 }
            }, {
                upsert: true,
                w: 1
            });
            expect(r.matchedCount).to.be.equal(0);
        });
    });

    describe("remove", () => {
        specify("legacy", async () => {
            let r = await this.db.collection("t4_1").insertMany([{ a: 1 }, { a: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(2);
            r = await this.db.collection("t4_1").remove({ a: 1 }, { single: true });
            expect(r.result.n).to.be.equal(1);
        });

        specify("deleteOne", async () => {
            let r = await this.db.collection("t4_2").insertMany([{ a: 1 }, { a: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(2);
            r = await this.db.collection("t4_2").deleteOne({ a: 1 });
            expect(r.result.n).to.be.equal(1);
            expect(r.deletedCount).to.be.equal(1);
        });

        specify("delete many", async () => {
            let r = await this.db.collection("t4_3").insertMany([{ a: 1 }, { a: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(2);
            r = await this.db.collection("t4_3").deleteMany({ a: 1 });
            expect(r.result.n).to.be.equal(2);
            expect(r.deletedCount).to.be.equal(2);
        });
    });

    describe("findAndModify", () => {
        specify("findOneAndRemove", async () => {
            let r = await this.db.collection("t5_1").insertMany([{ a: 1, b: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(1);
            r = await this.db.collection("t5_1").findOneAndDelete({ a: 1 }, { projection: { b: 1 }, sort: { a: 1 } });
            expect(r.lastErrorObject.n).to.be.equal(1);
            expect(r.value.b).to.be.equal(1);
        });

        specify("findOneAndReplace", async () => {
            let r = await this.db.collection("t5_2").insertMany([{ a: 1, b: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(1);
            r = await this.db.collection("t5_2").findOneAndReplace({ a: 1 }, { c: 1, b: 1 }, {
                projection: { b: 1, c: 1 },
                sort: { a: 1 },
                returnOriginal: false,
                upsert: true
            });
            expect(r.lastErrorObject.n).to.be.equal(1);
            expect(r.value.b).to.be.equal(1);
            expect(r.value.c).to.be.equal(1);
        });

        specify("findOneAndUpdate", async () => {
            let r = await this.db.collection("t5_3").insertMany([{ a: 1, b: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(1);
            r = await this.db.collection("t5_3").findOneAndUpdate({ a: 1 }, { $set: { d: 1 } }, {
                projection: { b: 1, d: 1 },
                sort: { a: 1 },
                returnOriginal: false,
                upsert: true
            });
            expect(r.lastErrorObject.n).to.be.equal(1);
            expect(r.value.b).to.be.equal(1);
            expect(r.value.d).to.be.equal(1);
        });
    });

    it("should correctly execute deleteMany with no selector", async () => {
        await this.db.collection("t6_1").deleteMany();
    });

    it("should correctly execute crud operations with w:0", async () => {
        const col = this.db.collection("shouldCorrectlyExecuteInsertOneWithW0");
        let r = await col.insertOne({ a: 1 }, { w: 0 });
        expect(r.result.ok).to.be.ok;
        r = await col.insertMany([{ a: 1 }], { w: 0 });
        expect(r.result.ok).to.be.ok;
        r = await col.updateOne({ a: 1 }, { $set: { b: 1 } }, { w: 0 });
        expect(r.result.ok).to.be.ok;
        r = await col.updateMany({ a: 1 }, { $set: { b: 1 } }, { w: 0 });
        expect(r.result.ok).to.be.ok;
        r = await col.deleteOne({ a: 1 }, { w: 0 });
        expect(r.result.ok).to.be.ok;
        r = await col.deleteMany({ a: 1 }, { w: 0 });
        expect(r.result.ok).to.be.ok;
    });

    it("should correctly execute updateOne operations with w:0 and upsert", async () => {
        const r = await this.db.collection("try").updateOne({ _id: 1 }, { $set: { x: 1 } }, { upsert: true, w: 0 });
        expect(r).to.exist;
    });
});
