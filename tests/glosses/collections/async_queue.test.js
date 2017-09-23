describe("collection", "AsyncQueue", () => {
    const { collection: { AsyncQueue } } = adone;

    it("should block until an element comes", async () => {
        const q = new AsyncQueue();
        const p = q.pop();
        q.push(1);
        expect(await p).to.be.equal(1);
    });

    it("should work as expected", async () => {
        const q = new AsyncQueue();
        q.push(1);
        q.push(2);
        q.push(3);
        expect(await q.pop()).to.be.equal(1);
        expect(await q.pop()).to.be.equal(2);
        expect(await q.pop()).to.be.equal(3);
    });

    it("the order should be correct", async () => {
        const q = new AsyncQueue();
        const p1 = q.pop();
        const p2 = q.pop();
        q.push(1);
        q.push(2);
        expect(await p2).to.be.equal(2);
        expect(await p1).to.be.equal(1);
    });
});
