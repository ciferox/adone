describe("disconnect handler", function () {
    if (this.topology !== "single" && this.topology !== "replicaset") {
        return;
    }

    const { promise, database: { mongo } } = adone;

    it("should correctly recover when bufferMaxEntries: -1 and restart", async () => {
        const db = await mongo.connect(this.url());
        await this.server.stop(9);
        promise.delay(5000).then(() => this.server.restart(9, { waitMS: 5000 }));
        const r = await db.collection("disconnect_handler_tests").update({ a: 1 }, { $set: { b: 1 } });
        expect(r.result.n).to.be.equal(0);
    });
});
