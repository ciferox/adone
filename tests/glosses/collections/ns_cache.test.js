describe("collection", "NSCache", () => {
    const { NSCache } = adone.collection;
    it("should create a new cache of the given size for the given namespaces", () => {
        new NSCache(10, ["a", "b"]);
    });

    describe("set", () => {
        it("should add a new value to the given namespace", () => {
            const cache = new NSCache(10, ["a", "b"]);
            cache.set("a", "a", 1);
            expect(cache.has("a", "a")).to.be.true();
            expect(cache.get("a", "a")).to.be.equal(1);
            expect(cache.has("b", "a")).to.be.false();
        });

        it("should throw if the namespace is unknown", () => {
            expect(() => {
                const cache = new NSCache(10, ["a"]);
                cache.set("b", "a", 1);
            }).to.throw('There is no such cache namespace "b"');
        });
    });

    describe("get", () => {
        it("should return a value from the given namespace", () => {
            const cache = new NSCache(10, ["a", "b"]);
            cache.set("a", "a", 1);
            expect(cache.get("a", "a")).to.be.equal(1);
        });

        it("should return udnefined if there is no value", () => {
            const cache = new NSCache(10, ["a"]);
            expect(cache.get("a", "b")).to.be.undefined();
        });

        it("should throw if the namespace is unknown", () => {
            expect(() => {
                const cache = new NSCache(10, ["a"]);
                cache.get("b", "a");
            }).to.throw('There is no such cache namespace "b"');
        });
    });

    describe("has", () => {
        it("should return true if a namespace includes the given key", () => {
            const cache = new NSCache(10, ["a"]);
            cache.set("a", "a", 1);
            expect(cache.has("a", "a")).to.be.true();
        });

        it("should return false if a namespace does not include the given key", () => {
            const cache = new NSCache(10, ["a"]);
            expect(cache.has("a", "a")).to.be.false();
        });

        it("should throw if the namespace is unknown", () => {
            expect(() => {
                const cache = new NSCache(10, ["a"]);
                cache.has("b", "a");
            }).to.throw('There is no such cache namespace "b"');
        });
    });

    describe("delete", () => {
        it("should delete the given key from the given namespace", () => {
            const cache = new NSCache(10, ["a"]);
            cache.set("a", "a", 1);
            cache.delete("a", "a");
            expect(cache.has("a", "a")).to.be.false();
        });

        it("should do nothing if the key does not exist", () => {
            const cache = new NSCache(10, ["a"]);
            cache.delete("a", "a");
        });

        it("should throw if the namespace is unknown", () => {
            expect(() => {
                const cache = new NSCache(10, ["a"]);
                cache.delete("b", "a");
            }).to.throw('There is no such cache namespace "b"');
        });
    });

    describe("clear", () => {
        it("should clear all the namespaces", () => {
            const cache = new NSCache(10, ["a", "b"]);
            cache.set("a", "a", 1);
            cache.set("a", "b", 1);
            cache.clear();
            expect(cache.has("a", "a")).to.be.false();
            expect(cache.has("a", "b")).to.be.false();
        });
    });

    describe("resize", () => {
        it("should resize the caches", () => {
            const cache = new NSCache(1, ["a", "b"]);
            cache.set("a", "a", 1);
            cache.set("a", "b", 1);
            cache.set("b", "a", 1);
            cache.set("b", "b", 1);
            expect(cache.has("a", "a")).to.be.false();
            expect(cache.has("a", "b")).to.be.true();
            expect(cache.has("b", "a")).to.be.false();
            expect(cache.has("b", "b")).to.be.true();
            cache.resize(10);
            cache.set("a", "c", 1);
            cache.set("b", "c", 1);
            expect(cache.has("a", "b")).to.be.true();
            expect(cache.has("b", "b")).to.be.true();
            expect(cache.has("a", "c")).to.be.true();
            expect(cache.has("b", "c")).to.be.true();
        });
    });
});
