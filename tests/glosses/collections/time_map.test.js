describe("collection", "TimeCache", () => {
    const { collection: { TimeMap } } = adone;

    it("default timeout", async () => {
        const m = new TimeMap();
        expect(m.getTimeout()).to.be.equal(1000);
    });

    it("set/get timeout", async () => {
        const m = new TimeMap();
        m.setTimeout(3000);
        expect(m.getTimeout()).to.be.equal(3000);
    });

    it("get nonexistent item", async () => {
        const m = new TimeMap(1000);
        expect(m.get("a")).to.be.undefined();
    });

    it("get nonexpired item", async () => {
        const m = new TimeMap(1000);
        m.set("a", 1);
        await adone.promise.delay(100);
        expect(m.get("a")).to.be.equal(1);
    });

    it("get expired item", async () => {
        const m = new TimeMap(10);
        m.set("a", 1);
        await adone.promise.delay(200);
        expect(m.get("a")).to.be.undefined();
    });

    it("set nonexpired item", async () => {
        const m = new TimeMap(1000);
        m.set("a", 1);
        await adone.promise.delay(100);
        m.set("a", 2);
        expect(m.get("a")).to.be.equal(2);
    });

    it("set expired item", async () => {
        const m = new TimeMap(150);
        m.set("a", 1);
        await adone.promise.delay(200);
        m.set("a", 2);
        await adone.promise.delay(100);
        expect(m.get("a")).to.be.equal(2);
    });

    it("delete expired item", async () => {
        const m = new TimeMap(100);
        m.set("a", 1);
        await adone.promise.delay(200);
        const ret = m.delete("a");
        expect(ret).to.be.false();
    });

    it("delete nonexpired item", async () => {
        const m = new TimeMap(100);
        m.set("a", 1);
        const ret = m.delete("a");
        await adone.promise.delay(200);
        expect(ret).to.be.true();
    });

    it("clear", async () => {
        let isOK = true;
        const m = new TimeMap(100, () => {
            isOK = false;
        });
        m.set("a", 1);
        m.set("b", 2);
        m.clear();
        await adone.promise.delay(200);
        expect(isOK).to.be.true();
    });

    it("forEach() before expire", async () => {
        const m = new TimeMap(1000);
        m.set("a", 1);
        m.set("b", 2);
        m.set("c", 3);
        await adone.promise.delay(100);
        let counter = 0;
        m.forEach((value) => {
            expect(value).to.be.equal(++counter);
        });
        expect(counter).to.be.equal(3);
    });

    it("forEach() after expire", async () => {
        const m = new TimeMap(10);
        m.set("a", 1);
        m.set("b", 2);
        m.set("c", 3);
        await adone.promise.delay(200);
        let counter = 0;
        m.forEach(() => {
            ++counter;
        });
        expect(counter).to.be.equal(0);
    });

    it("keys() before expire", async () => {
        const m = new TimeMap(1000);
        m.set("a", 1);
        m.set("b", 2);
        m.set("c", 3);
        await adone.promise.delay(100);
        let counter = 0;
        const arr = ["a", "b", "c"];
        for (const key of m.keys()) {
            expect(key).to.be.equal(arr[counter++]);
        }
        expect(counter).to.be.equal(3);
    });

    it("keys() after expire", async () => {
        const m = new TimeMap(10);
        m.set("a", 1);
        m.set("b", 2);
        m.set("c", 3);
        await adone.promise.delay(200);
        let counter = 0;
        for (const key of m.keys()) {
            ++counter;
        }
        expect(counter).to.be.equal(0);
    });

    it("values() before expire", async () => {
        const m = new TimeMap(1000);
        m.set("a", 1);
        m.set("b", 2);
        m.set("c", 3);
        await adone.promise.delay(100);
        let counter = 0;
        for (const value of m.values()) {
            expect(value).to.be.equal(++counter);
        }
        expect(counter).to.be.equal(3);
    });

    it("values() after expire", async () => {
        const m = new TimeMap(10);
        m.set("a", 1);
        m.set("b", 2);
        m.set("c", 3);
        await adone.promise.delay(200);
        let counter = 0;
        for (const key of m.values()) {
            ++counter;
        }
        expect(counter).to.be.equal(0);
    });

    it("entries() before expire", async () => {
        const m = new TimeMap(1000);
        m.set("a", 1);
        m.set("b", 2);
        m.set("c", 3);
        await adone.promise.delay(100);
        let counter = 0;
        for (const [key, value] of m.entries()) {
            expect(value).to.be.equal(++counter);
        }
        expect(counter).to.be.equal(3);
    });

    it("@@iterator", async () => {
        const m = new TimeMap(1000);
        m.set("a", 1);
        m.set("b", 2);
        m.set("c", 3);
        const iter = m[Symbol.iterator]();
        expect(iter.next().value[1]).to.be.equal(1);
        expect(iter.next().value[1]).to.be.equal(2);
        expect(iter.next().value[1]).to.be.equal(3);
    });



    it("entries() before expire", async () => {
        const m = new TimeMap(1000);
        m.set("a", 1);
        m.set("b", 2);
        m.set("c", 3);
        await adone.promise.delay(100);
        let counter = 0;
        for (const [key, value] of m.entries()) {
            expect(value).to.be.equal(++counter);
        }
        expect(counter).to.be.equal(3);
    });

    it("entries() after expire", async () => {
        const m = new TimeMap(10);
        m.set("a", 1);
        m.set("b", 2);
        m.set("c", 3);
        await adone.promise.delay(200);
        let counter = 0;
        for (const [key, value] of m.entries()) {
            ++counter;
        }
        expect(counter).to.be.equal(0);
    });

    it("custom callback", async () => {
        let isOK = false;
        const m = new TimeMap(10, () => {
            isOK = true;
        });
        m.set("a", 1);
        await adone.promise.delay(200);
        expect(isOK).to.be.true();
    });
});
