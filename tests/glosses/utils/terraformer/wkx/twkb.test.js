describe("util", "terraformer", "wkx", () => {
    const { WKX } = adone.util.terraformer;
    const { Geometry, Point } = WKX;

    describe("parseTwkb", () => {
        it("includes size", () => {
            assert.deepEqual(Geometry.parseTwkb(Buffer.from("0102020204", "hex")), new Point(1, 2));
        });
        it("includes bounding box", () => {
            assert.deepEqual(Geometry.parseTwkb(Buffer.from("0101020004000204", "hex")), new Point(1, 2));
        });
        it("includes extended precision", () => {
            assert.deepEqual(Geometry.parseTwkb(Buffer.from("01080302040608", "hex")), new Point(1, 2, 3, 4));
        });
        it("includes extended precision and bounding box", () => {
            assert.deepEqual(Geometry.parseTwkb(Buffer.from("010903020004000600080002040608", "hex")), new Point(1, 2, 3, 4));
        });
    });
    describe("toTwkb", () => {
        it("Point small", () => {
            assert.equal(new Point(1, 2).toTwkb().toString("hex"), "a100c09a0c80b518");
        });
        it("Point large", () => {
            assert.equal(new Point(10000, 20000).toTwkb().toString("hex"), "a10080a8d6b90780d0acf30e");
        });
    });
});
