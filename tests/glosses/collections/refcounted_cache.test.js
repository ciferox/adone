describe("collection", "RefcountedCache", () => {
    const {
        error,
        collection: {
            RefcountedCache
        }
    } = adone;

    describe("ref", () => {
        it("should throw if the key is unknown", () => {
            assert.throws(() => {
                new RefcountedCache().ref("a");
            }, "Unknown key: a");
        });
    });

    describe("unref", () => {
        it("should delete item when there are no more references", () => {
            const cache = new RefcountedCache();
            cache.set("a", "b");
            cache.ref("a");
            cache.unref("a");
            expect(cache.has("a")).to.be.true();
            cache.unref("a");
            expect(cache.has("a")).to.be.false();
        });

        it("should throw if the key is unknown", () => {
            assert.throws(() => {
                new RefcountedCache().unref("a");
            }, "Unknown key: a");
        });
    });

    describe("references", () => {
        it("should return the number of references", () => {
            const cache = new RefcountedCache();
            cache.set("a", "b");
            expect(cache.references("a")).to.be.equal(1);
            cache.ref("a");
            expect(cache.references("a")).to.be.equal(2);
            cache.unref("a");
            expect(cache.references("a")).to.be.equal(1);
        });

        it("should throw if the key if unknown", () => {
            assert.throws(() => {
                new RefcountedCache().unref("a");
            }, "Unknown key: a");
        });
    });

    describe("get", () => {
        it("should return correct value", () => {
            const cache = new RefcountedCache();
            cache.set("a", "b");
            expect(cache.get("a")).to.be.equal("b");
        });
    });
});
