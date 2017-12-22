describe("collection", "MapCache", () => {
    const { MapCache } = adone.collection;

    it("should create a new map cache", () => {
        new MapCache();
    });

    describe("get", () => {
        it("should return a value by the given key", () => {
            const cache = new MapCache();
            cache.set("1", 2);
            expect(cache.get("1")).to.be.equal(2);
        });

        it("should return undefined if there is no such key", () => {
            const cache = new MapCache();
            expect(cache.get("3")).to.be.undefined();
        });
    });

    describe("set", () => {
        it("should set a new value for the given key", () => {
            const cache = new MapCache();
            cache.set("1", 2);
            expect(cache.get("1")).to.be.equal(2);
            cache.set("1", 3);
            expect(cache.get("1")).to.be.equal(3);
        });
    });

    describe("has", () => {
        it("should return false if the cache does not include the given key", () => {
            const cache = new MapCache();
            expect(cache.has("a")).to.be.false();
        });

        it("should return true if the cache includes the given key", () => {
            const cache = new MapCache();
            cache.set("a", 1);
            expect(cache.has("a")).to.be.true();
        });
    });

    describe("delete", () => {
        it("should delete the given key", () => {
            const cache = new MapCache();
            cache.set("a", 1);
            cache.delete("a");
            expect(cache.has("a")).to.be.false();
        });

        it("should do nothing if there is no such key", () => {
            const cache = new MapCache();
            cache.delete("a");
        });
    });

    describe("clear", () => {
        it("should clear the cache", () => {
            const cache = new MapCache();
            cache.set("a", 1);
            cache.set("b", 2);
            cache.clear();
            expect(cache.has("a")).to.be.false();
            expect(cache.has("b")).to.be.false();
        });
    });
});
