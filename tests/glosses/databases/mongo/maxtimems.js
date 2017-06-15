describe("maxtimems", function () {
    it("should correctly respect the maxtimeMs property on count", async () => {
        const { db } = this;
        const collection = db.collection("max_time_ms");
        await collection.insert([{ aggPipe: 1 }], { w: 1 });
        await assert.throws(async () => {
            await collection.find({ $where: "sleep(100) || true" })
                .maxTimeMS(50)
                .count();
        });
    });

    it("should correctly respect the maxtimeMs property on toArray", async () => {
        const { db } = this;
        const collection = db.collection("max_time_ms_2");
        await collection.insert([{ aggPipe: 1 }], { w: 1 });
        await assert.throws(async () => {
            await collection.find({ $where: "sleep(100) || true" })
                .maxTimeMS(50)
                .toArray();
        }, "time limit");
    });

    if (this.topology === "single" || this.topology === "replicaset") {
        it("should correctly fail with maxTimeMS error", async () => {
            const { db } = this;
            const collection = db.collection("max_time_ms_5");
            await collection.insert([{ aggPipe: 1 }], { w: 1 });
            {
                const r = await db.admin().command({ configureFailPoint: "maxTimeAlwaysTimeOut", mode: "alwaysOn" });
                expect(r.ok).to.be.equal(1);
            }
            await assert.throws(async () => {
                await collection.find({}).maxTimeMS(10).toArray();
            });
            {
                const r = await db.admin().command({ configureFailPoint: "maxTimeAlwaysTimeOut", mode: "off" });
                expect(r.ok).to.be.equal(1);
            }
        });
    }
});
