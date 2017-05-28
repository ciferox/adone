describe("collections", "Default map", () => {
    const { collection: { DefaultMap } } = adone;

    describe("a function as the factory", () => {
        it("should be always 5", () => {
            const m = new DefaultMap(() => 5);
            expect(m.get(1)).to.be.equal(5);
            expect(m.get(2)).to.be.equal(5);
        });

        it("has() should return false", () => {
            const m = new DefaultMap(() => 1);
            expect(m.has("g")).to.be.false;
        });

        it("should pass the key as the first argument", () => {
            const m = new DefaultMap((key) => {
                return { a: 1, b: 2, c: 3 }[key];
            });
            expect(m.get("a")).to.be.equal(1);
            expect(m.get("b")).to.be.equal(2);
            expect(m.get("c")).to.be.equal(3);
            expect(m.get("d")).to.be.undefined;
        });
    });

    describe("an object as the factory", () => {
        it("should map the keys", () => {
            const m = new DefaultMap({ a: 1, b: 2, c: 3 });
            expect(m.get("a")).to.be.equal(1);
            expect(m.get("b")).to.be.equal(2);
            expect(m.get("c")).to.be.equal(3);
        });

        it("should not update the cache if the key does not exist", () => {
            const m = new DefaultMap({ a: 1 });
            expect(m.get("b")).to.be.undefined;
            expect(m.has("b")).to.be.false;
        });
    });

    it("should work if the factory is nil", () => {
        const m = new DefaultMap();
        expect(m.get("a")).to.be.undefined;
        expect(m.has("a")).to.be.false;
    });

    it("should initialize", () => {
        const m = new DefaultMap(null, [[1, 1], [2, 2]]);
        expect(m.get(1)).to.be.equal(1);
        expect(m.get(2)).to.be.equal(2);
        expect(m.get(3)).to.be.undefined;
    });
});
