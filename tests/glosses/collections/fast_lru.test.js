describe("collections", "FastLRU", () => {
    const { collection: { FastLRU } } = adone;

    const checkQueue = (cache, expected) => {
        for (const i of cache.queue) {
            expect(i[0]).to.be.equal(expected.shift());
        }
    };

    it("should work", () => {
        const cache = new FastLRU(50);
        cache.set(1, "one");
        cache.set(2, "two");
        cache.set(3, "three");
        for (const [k, v] of [[1, "one"], [2, "two"], [3, "three"]]) {
            expect(cache.has(k)).to.be.true;
            expect(cache.get(k)).to.be.equal(v);
        }
        checkQueue(cache, [3, 2, 1]);
    });

    it("should move the key to the head", () => {
        const cache = new FastLRU(50);
        cache.set(1, "one");
        cache.set(2, "two");
        cache.set(3, "three");
        cache.get(2);
        checkQueue(cache, [2, 3, 1]);
        cache.get(1);
        checkQueue(cache, [1, 2, 3]);
    });

    it("should update the value and move to the head", () => {
        const cache = new FastLRU(50);
        cache.set(1, "one");
        cache.set(2, "two");
        cache.set(3, "three");
        cache.set(1, "1");
        checkQueue(cache, [1, 3, 2]);
        expect(cache.get(1)).to.be.equal("1");
    });

    it("should pop the lru element", () => {
        const cache = new FastLRU(5);

        cache.set(1, "1");
        cache.set(2, "2");
        cache.set(3, "3");
        cache.set(4, "4");
        cache.set(5, "5");
        cache.set(6, "6");
        expect(cache.has(1)).to.be.false;
        checkQueue(cache, [6, 5, 4, 3, 2]);
        cache.get(3);
        cache.set(7, "7");
        checkQueue(cache, [7, 3, 6, 5, 4]);
    });

    it("should call the dispose callback", () => {
        const dropped = [];
        const cache = new FastLRU(5, {
            dispose: (key, value) => {
                dropped.push([key, value]);
            }
        });

        cache.set(1, "1");
        cache.set(2, "2");
        cache.set(3, "3");
        cache.set(4, "4");
        cache.set(5, "5");
        cache.set(6, "6");
        cache.get(2);
        cache.set(7, "7");
        expect(dropped).to.be.deep.equal([
            [1, "1"], [3, "3"]
        ]);
    });

    context("delete", () => {
        it("should delete keys", () => {
            const cache = new FastLRU(5);
            cache.set(1, "1");
            cache.delete(1);
            expect(cache.has(1)).to.be.false;
            expect(cache.cache.has(1)).to.be.false;
            expect(cache.queue.length).to.be.equal(0);
            cache.set(1, "1");
            cache.set(2, "2");
            expect(cache.queue.front[0]).to.be.equal(2);
            cache.delete(2);
            expect(cache.queue.front[0]).to.be.equal(1);
        });

        it("should return true if it was really deleted", () => {
            const cache = new FastLRU(5);
            cache.set(1, "1");
            expect(cache.delete(1)).to.be.true;
        });

        it("should return false if there was no such key", () => {
            const cache = new FastLRU(5);
            expect(cache.delete(2)).to.be.false;
        });

        it("should call the dispose callback", () => {
            const dispose = spy();
            const cache = new FastLRU(5, { dispose });
            cache.set(1, 2);
            cache.delete(1);
            expect(dispose).to.have.been.calledWith(1, 2);
        });
    });

    describe("size", () => {
        it("should return the cache size", () => {
            const cache = new FastLRU(5);
            expect(cache.size).to.be.equal(0);
            cache.set(1, "1");
            expect(cache.size).to.be.equal(1);
            cache.set(1, "1");
            expect(cache.size).to.be.equal(1);
            cache.set(2, "1");
            cache.set(3, "1");
            cache.set(4, "1");
            expect(cache.size).to.be.equal(4);
            cache.set(5, "1");
            cache.set(6, "1");
            cache.set(7, "1");
            expect(cache.size).to.be.equal(5);
            cache.delete(7);
            expect(cache.size).to.be.equal(4);
            cache.delete(6);
            expect(cache.size).to.be.equal(3);
        });
    });

    describe("clear", () => {
        it("should clear the cache", () => {
            const cache = new FastLRU(5);
            cache.set(1, "1");
            cache.set(2, "2");
            cache.set(3, "3");
            expect(cache.size).to.be.equal(3);
            cache.clear();
            expect(cache.size).to.be.equal(0);

            // internal things
            expect(cache.queue.length).to.be.equal(0);
            expect(cache.cache.size).to.be.equal(0);
        });
    });
});
