describe("collections", "Blocking queue", () => {
    const { collection: { BQueue } } = adone;

    it("should block until an element comes", async () => {
        const q = new BQueue();
        const p = q.shift();
        q.push(1);
        expect(await p).to.be.equal(1);
    });

    it("should work as expected", async () => {
        const q = new BQueue();
        q.push(1);
        q.push(2);
        q.push(3);
        expect(await q.shift()).to.be.equal(1);
        expect(await q.shift()).to.be.equal(2);
        expect(await q.shift()).to.be.equal(3);
    });

    it("the order should be correct", async () => {
        const q = new BQueue();
        const p1 = q.shift();
        const p2 = q.shift();
        q.push(1);
        q.push(2);
        expect(await p2).to.be.equal(2);
        expect(await p1).to.be.equal(1);
    });
});
