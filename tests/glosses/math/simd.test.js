const { math: { simd } } = adone;

const almostEqual = (a, b) => {
    assert.isOk(Math.abs(a - b) < 0.00001);
};

const isPositiveZero = (x) => {
    assert.isOk(x === 0 && 1 / x === Infinity);
};

const isNegativeZero = (x) => {
    assert.isOk(x === 0 && 1 / x === -Infinity);
};

describe("math", "simd", () => {
    it("Float32x4 operators", () => {
        // Not possible to implement properly in polyfill:
        //   ==, ===, !=, !==
        assert.throws(() => Number(simd.Float32x4(0, 1, 2, 3)));
        assert.throws(() => Number(simd.Float32x4(0, 1, 2, 3)));
        assert.throws(() => -simd.Float32x4(0, 1, 2, 3));
        assert.throws(() => ~simd.Float32x4(0, 1, 2, 3));
        assert.throws(() => Math.fround(simd.Float32x4(0, 1, 2, 3)));
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) | 0);
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) & 0);
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) ^ 0);
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) >>> 0);
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) >> 0);
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) << 0);
        assert.throws(() => (simd.Float32x4(0, 1, 2, 3) + simd.Float32x4(4, 5, 6, 7)));
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) - simd.Float32x4(4, 5, 6, 7));
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) * simd.Float32x4(4, 5, 6, 7));
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) / simd.Float32x4(4, 5, 6, 7));
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) % simd.Float32x4(4, 5, 6, 7));
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) < simd.Float32x4(4, 5, 6, 7));
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) > simd.Float32x4(4, 5, 6, 7));
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) <= simd.Float32x4(4, 5, 6, 7));
        assert.throws(() => simd.Float32x4(0, 1, 2, 3) >= simd.Float32x4(4, 5, 6, 7));
        assert.equal(simd.Float32x4(0, 1, 2, 3).toString(), "Float32x4(0, 1, 2, 3)");
        assert.equal(simd.Float32x4(0, 1, 2, 3).toLocaleString(), "Float32x4(0, 1, 2, 3)");
        assert.throws(() => simd.Float32x4(0, 1, 2, 3)());
        assert.equal(simd.Float32x4(0, 1, 2, 3)[0], undefined);
        assert.equal(simd.Float32x4(0, 1, 2, 3).a, undefined);
        assert.equal(!simd.Float32x4(0, 1, 2, 3), false);
        assert.equal(!simd.Float32x4(0, 0, 0, 0), false);
        assert.equal(simd.Float32x4(0, 1, 2, 3) ? 1 : 2, 1);
        assert.equal(simd.Float32x4(0, 0, 0, 0) ? 1 : 2, 1);
    });

    it("Int32x4 operators", () => {
        // Not possible to implement properly in polyfill:
        //   ==, ===, !=, !==
        assert.throws(() => Number(simd.Int32x4(0, 1, 2, 3)));
        assert.throws(() => Number(simd.Int32x4(0, 1, 2, 3)));
        assert.throws(() => -simd.Int32x4(0, 1, 2, 3));
        assert.throws(() => ~simd.Int32x4(0, 1, 2, 3));
        assert.throws(() => Math.fround(simd.Int32x4(0, 1, 2, 3)));
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) | 0);
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) & 0);
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) ^ 0);
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) >>> 0);
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) >> 0);
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) << 0);
        assert.throws(() => (simd.Int32x4(0, 1, 2, 3) + simd.Int32x4(4, 5, 6, 7)));
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) - simd.Int32x4(4, 5, 6, 7));
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) * simd.Int32x4(4, 5, 6, 7));
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) / simd.Int32x4(4, 5, 6, 7));
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) % simd.Int32x4(4, 5, 6, 7));
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) < simd.Int32x4(4, 5, 6, 7));
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) > simd.Int32x4(4, 5, 6, 7));
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) <= simd.Int32x4(4, 5, 6, 7));
        assert.throws(() => simd.Int32x4(0, 1, 2, 3) >= simd.Int32x4(4, 5, 6, 7));
        assert.equal(simd.Int32x4(0, 1, 2, 3).toString(), "Int32x4(0, 1, 2, 3)");
        assert.equal(simd.Int32x4(0, 1, 2, 3).toLocaleString(), "Int32x4(0, 1, 2, 3)");
        assert.throws(() => simd.Int32x4(0, 1, 2, 3)());
        assert.equal(simd.Int32x4(0, 1, 2, 3)[0], undefined);
        assert.equal(simd.Int32x4(0, 1, 2, 3).a, undefined);
        assert.equal(!simd.Int32x4(0, 1, 2, 3), false);
        assert.equal(!simd.Int32x4(0, 0, 0, 0), false);
        assert.equal(simd.Int32x4(0, 1, 2, 3) ? 1 : 2, 1);
        assert.equal(simd.Int32x4(0, 0, 0, 0) ? 1 : 2, 1);
    });

    it("Float64x2 operators", () => {
        // Not possible to implement properly in polyfill:
        //   ==, ===, !=, !==
        assert.throws(() => Number(simd.Float64x2(0, 1)));
        assert.throws(() => Number(simd.Float64x2(0, 1)));
        assert.throws(() => -simd.Float64x2(0, 1));
        assert.throws(() => ~simd.Float64x2(0, 1));
        assert.throws(() => Math.fround(simd.Float64x2(0, 1)));
        assert.throws(() => simd.Float64x2(0, 1) | 0);
        assert.throws(() => simd.Float64x2(0, 1) & 0);
        assert.throws(() => simd.Float64x2(0, 1) ^ 0);
        assert.throws(() => simd.Float64x2(0, 1) >>> 0);
        assert.throws(() => simd.Float64x2(0, 1) >> 0);
        assert.throws(() => simd.Float64x2(0, 1) << 0);
        assert.throws(() => (simd.Float64x2(0, 1) + simd.Float64x2(0, 1)));
        assert.throws(() => simd.Float64x2(0, 1) - simd.Float64x2(0, 1));
        assert.throws(() => simd.Float64x2(0, 1) * simd.Float64x2(0, 1));
        assert.throws(() => simd.Float64x2(0, 1) / simd.Float64x2(0, 1));
        assert.throws(() => simd.Float64x2(0, 1) % simd.Float64x2(0, 1));
        assert.throws(() => simd.Float64x2(0, 1) < simd.Float64x2(0, 1));
        assert.throws(() => simd.Float64x2(0, 1) > simd.Float64x2(0, 1));
        assert.throws(() => simd.Float64x2(0, 1) <= simd.Float64x2(0, 1));
        assert.throws(() => simd.Float64x2(0, 1) >= simd.Float64x2(0, 1));
        assert.equal(simd.Float64x2(0, 1).toString(), "Float64x2(0, 1)");
        assert.equal(simd.Float64x2(0, 1).toLocaleString(), "Float64x2(0, 1)");
        assert.throws(() => simd.Float64x2(0, 1)());
        assert.equal(simd.Float64x2(0, 1)[0], undefined);
        assert.equal(simd.Float64x2(0, 1).a, undefined);
        assert.equal(!simd.Float64x2(0, 1), false);
        assert.equal(!simd.Float64x2(0, 1), false);
        assert.equal(simd.Float64x2(0, 1) ? 1 : 2, 1);
        assert.equal(simd.Float64x2(0, 1) ? 1 : 2, 1);
    });

    it("Int8x16 operators", () => {
        // Not possible to implement properly in polyfill:
        //   ==, ===, !=, !==
        assert.throws(() => Number(simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)));
        assert.throws(() => Number(simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)));
        assert.throws(() => -simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15));
        assert.throws(() => ~simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15));
        assert.throws(() => Math.fround(simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)));
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) | 0);
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) & 0);
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) ^ 0);
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) >>> 0);
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) >> 0);
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) << 0);
        assert.throws(() => (simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) + simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)));
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) - simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15));
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) * simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15));
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) / simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15));
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) % simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15));
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) < simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15));
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) > simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15));
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) <= simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15));
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) >= simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15));
        assert.equal(simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15).toString(), "Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)");
        assert.equal(simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15).toLocaleString(), "Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)");
        assert.throws(() => simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)());
        assert.equal(simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)[0], undefined);
        assert.equal(simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15).a, undefined);
        assert.equal(!simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15), false);
        assert.equal(!simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15), false);
        assert.equal(simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) ? 1 : 2, 1);
        assert.equal(simd.Int8x16(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) ? 1 : 2, 1);
    });

    it("Int16x8 operators", () => {
        // Not possible to implement properly in polyfill:
        //   ==, ===, !=, !==
        assert.throws(() => Number(simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7)));
        assert.throws(() => Number(simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7)));
        assert.throws(() => -simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7));
        assert.throws(() => ~simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7));
        assert.throws(() => Math.fround(simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7)));
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) | 0);
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) & 0);
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) ^ 0);
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) >>> 0);
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) >> 0);
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) << 0);
        assert.throws(() => (simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) + simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7)));
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) - simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7));
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) * simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7));
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) / simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7));
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) % simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7));
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) < simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7));
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) > simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7));
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) <= simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7));
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) >= simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7));
        assert.equal(simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7).toString(), "Int16x8(0, 1, 2, 3, 4, 5, 6, 7)");
        assert.equal(simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7).toLocaleString(), "Int16x8(0, 1, 2, 3, 4, 5, 6, 7)");
        assert.throws(() => simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7)());
        assert.equal(simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7)[0], undefined);
        assert.equal(simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7).a, undefined);
        assert.equal(!simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7), false);
        assert.equal(!simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7), false);
        assert.equal(simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) ? 1 : 2, 1);
        assert.equal(simd.Int16x8(0, 1, 2, 3, 4, 5, 6, 7) ? 1 : 2, 1);

    });

    it("bool64x2 constructor", () => {
        assert.equal("function", typeof simd.Bool64x2);
        const m = simd.Bool64x2(false, true);
        assert.equal(false, simd.Bool64x2.extractLane(m, 0));
        assert.equal(true, simd.Bool64x2.extractLane(m, 1));

        assert.throws(() => simd.Bool32x4.check(m));
        assert.throws(() => simd.Bool16x8.check(m));
        assert.throws(() => simd.Bool8x16.check(m));
    });

    it("bool64x2 splat constructor", () => {
        assert.equal("function", typeof simd.Bool64x2.splat);
        let m = simd.Bool64x2.splat(true);
        assert.equal(true, simd.Bool64x2.extractLane(m, 0));
        assert.equal(true, simd.Bool64x2.extractLane(m, 1));
        m = simd.Bool64x2.splat(false);
        assert.equal(false, simd.Bool64x2.extractLane(m, 0));
        assert.equal(false, simd.Bool64x2.extractLane(m, 1));

    });

    it("bool64x2 scalar getters", () => {
        const m = simd.Bool64x2(true, false);
        assert.equal(true, simd.Bool64x2.extractLane(m, 0));
        assert.equal(false, simd.Bool64x2.extractLane(m, 1));

    });

    it("bool64x2 replaceLane", () => {
        const a = simd.Bool64x2(false, false);
        let c = simd.Bool64x2.replaceLane(a, 0, true);
        assert.equal(true, simd.Bool64x2.extractLane(c, 0));
        assert.equal(false, simd.Bool64x2.extractLane(c, 1));
        c = simd.Bool64x2.replaceLane(c, 1, true);
        assert.equal(true, simd.Bool64x2.extractLane(c, 0));
        assert.equal(true, simd.Bool64x2.extractLane(c, 1));
        c = simd.Bool64x2.replaceLane(c, 0, false);
        assert.equal(false, simd.Bool64x2.extractLane(c, 0));
        assert.equal(true, simd.Bool64x2.extractLane(c, 1));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Bool64x2.replaceLane(a, index, false));
        };

        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(2);

    });

    it("bool64x2 allTrue", () => {
        const v00 = simd.Bool64x2(false, false);
        const v01 = simd.Bool64x2(false, true);
        const v10 = simd.Bool64x2(true, false);
        const v11 = simd.Bool64x2(true, true);
        assert.equal(simd.Bool64x2.allTrue(v00), false);
        assert.equal(simd.Bool64x2.allTrue(v01), false);
        assert.equal(simd.Bool64x2.allTrue(v10), false);
        assert.equal(simd.Bool64x2.allTrue(v11), true);

    });

    it("bool64x2 anyTrue", () => {
        const v00 = simd.Bool64x2(false, false);
        const v01 = simd.Bool64x2(false, true);
        const v10 = simd.Bool64x2(true, false);
        const v11 = simd.Bool64x2(true, true);
        assert.equal(simd.Bool64x2.anyTrue(v00), false);
        assert.equal(simd.Bool64x2.anyTrue(v01), true);
        assert.equal(simd.Bool64x2.anyTrue(v10), true);
        assert.equal(simd.Bool64x2.anyTrue(v11), true);

    });

    it("bool64x2 and", () => {
        let m = simd.Bool64x2(true, true);
        let n = simd.Bool64x2(true, false);
        let o = simd.Bool64x2.and(m, n);
        assert.equal(true, simd.Bool64x2.extractLane(o, 0));
        assert.equal(false, simd.Bool64x2.extractLane(o, 1));
        m = simd.Bool64x2(false, false);
        n = simd.Bool64x2(true, false);
        o = simd.Bool64x2.and(m, n);
        assert.equal(false, simd.Bool64x2.extractLane(o, 0));
        assert.equal(false, simd.Bool64x2.extractLane(o, 1));

    });

    it("bool64x2 or", () => {
        let m = simd.Bool64x2(true, true);
        let n = simd.Bool64x2(true, false);
        let o = simd.Bool64x2.or(m, n);
        assert.equal(true, simd.Bool64x2.extractLane(o, 0));
        assert.equal(true, simd.Bool64x2.extractLane(o, 1));
        m = simd.Bool64x2(false, false);
        n = simd.Bool64x2(true, false);
        o = simd.Bool64x2.or(m, n);
        assert.equal(true, simd.Bool64x2.extractLane(o, 0));
        assert.equal(false, simd.Bool64x2.extractLane(o, 1));

    });

    it("bool64x2 xor", () => {
        let m = simd.Bool64x2(true, true);
        let n = simd.Bool64x2(true, false);
        let o = simd.Bool64x2.xor(m, n);
        assert.equal(false, simd.Bool64x2.extractLane(o, 0));
        assert.equal(true, simd.Bool64x2.extractLane(o, 1));
        m = simd.Bool64x2(false, false);
        n = simd.Bool64x2(true, false);
        o = simd.Bool64x2.xor(m, n);
        assert.equal(true, simd.Bool64x2.extractLane(o, 0));
        assert.equal(false, simd.Bool64x2.extractLane(o, 1));

    });

    it("bool64x2 not", () => {
        const m = simd.Bool64x2(true, false);
        const o = simd.Bool64x2.not(m);
        assert.equal(false, simd.Bool64x2.extractLane(o, 0));
        assert.equal(true, simd.Bool64x2.extractLane(o, 1));

    });

    it("bool64x2 comparisons", () => {
        const m = simd.Bool64x2(true, true);
        const n = simd.Bool64x2(false, true);
        let cmp;

        cmp = simd.Bool64x2.equal(m, n);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Bool64x2.notEqual(m, n);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));

    });

    it("bool64x2 select", () => {
        const m = simd.Bool64x2(true, false);
        const t = simd.Bool64x2(true, true);
        const f = simd.Bool64x2(false, false);
        const s = simd.Bool64x2.select(m, t, f);
        assert.equal(true, simd.Bool64x2.extractLane(s, 0));
        assert.equal(false, simd.Bool64x2.extractLane(s, 1));

    });

    it("Bool32x4 constructor", () => {
        assert.equal("function", typeof simd.Bool32x4);
        const m = simd.Bool32x4(false, true, true, false);
        assert.equal(false, simd.Bool32x4.extractLane(m, 0));
        assert.equal(true, simd.Bool32x4.extractLane(m, 1));
        assert.equal(true, simd.Bool32x4.extractLane(m, 2));
        assert.equal(false, simd.Bool32x4.extractLane(m, 3));

        assert.throws(() => simd.Bool64x2.check(m));
        assert.throws(() => simd.Bool16x8.check(m));
        assert.throws(() => simd.Bool8x16.check(m));

    });

    it("Bool32x4 splat constructor", () => {
        assert.equal("function", typeof simd.Bool32x4.splat);
        let m = simd.Bool32x4.splat(true);
        assert.equal(true, simd.Bool32x4.extractLane(m, 0));
        assert.equal(true, simd.Bool32x4.extractLane(m, 1));
        assert.equal(true, simd.Bool32x4.extractLane(m, 2));
        assert.equal(true, simd.Bool32x4.extractLane(m, 3));
        m = simd.Bool32x4.splat(false);
        assert.equal(false, simd.Bool32x4.extractLane(m, 0));
        assert.equal(false, simd.Bool32x4.extractLane(m, 1));
        assert.equal(false, simd.Bool32x4.extractLane(m, 2));
        assert.equal(false, simd.Bool32x4.extractLane(m, 3));

    });

    it("Bool32x4 scalar getters", () => {
        const m = simd.Bool32x4(true, false, true, false);
        assert.equal(true, simd.Bool32x4.extractLane(m, 0));
        assert.equal(false, simd.Bool32x4.extractLane(m, 1));
        assert.equal(true, simd.Bool32x4.extractLane(m, 2));
        assert.equal(false, simd.Bool32x4.extractLane(m, 3));

    });

    it("Bool32x4 replaceLane", () => {
        const a = simd.Bool32x4(false, false, false, false);
        let c = simd.Bool32x4.replaceLane(a, 0, true);
        assert.equal(true, simd.Bool32x4.extractLane(c, 0));
        assert.equal(false, simd.Bool32x4.extractLane(c, 1));
        assert.equal(false, simd.Bool32x4.extractLane(c, 2));
        assert.equal(false, simd.Bool32x4.extractLane(c, 3));
        c = simd.Bool32x4.replaceLane(c, 3, true);
        assert.equal(true, simd.Bool32x4.extractLane(c, 0));
        assert.equal(false, simd.Bool32x4.extractLane(c, 1));
        assert.equal(false, simd.Bool32x4.extractLane(c, 2));
        assert.equal(true, simd.Bool32x4.extractLane(c, 3));
        c = simd.Bool32x4.replaceLane(c, 0, false);
        assert.equal(false, simd.Bool32x4.extractLane(c, 0));
        assert.equal(false, simd.Bool32x4.extractLane(c, 1));
        assert.equal(false, simd.Bool32x4.extractLane(c, 2));
        assert.equal(true, simd.Bool32x4.extractLane(c, 3));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Bool32x4.replaceLane(a, index, false));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(4);

    });

    it("Bool32x4 allTrue", () => {
        const v00 = simd.Bool32x4(false, false, false, false);
        const v01 = simd.Bool32x4(false, true, false, false);
        const v10 = simd.Bool32x4(false, false, false, true);
        const v11 = simd.Bool32x4(true, true, true, true);
        assert.equal(simd.Bool32x4.allTrue(v00), false);
        assert.equal(simd.Bool32x4.allTrue(v01), false);
        assert.equal(simd.Bool32x4.allTrue(v10), false);
        assert.equal(simd.Bool32x4.allTrue(v11), true);

    });

    it("Bool32x4 anyTrue", () => {
        const v00 = simd.Bool32x4(false, false, false, false);
        const v01 = simd.Bool32x4(false, true, false, false);
        const v10 = simd.Bool32x4(false, false, false, true);
        const v11 = simd.Bool32x4(true, true, true, true);
        assert.equal(simd.Bool32x4.anyTrue(v00), false);
        assert.equal(simd.Bool32x4.anyTrue(v01), true);
        assert.equal(simd.Bool32x4.anyTrue(v10), true);
        assert.equal(simd.Bool32x4.anyTrue(v11), true);

    });

    it("Bool32x4 and", () => {
        let m = simd.Bool32x4(true, true, true, false);
        let n = simd.Bool32x4(true, false, true, false);
        let o = simd.Bool32x4.and(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(o, 0));
        assert.equal(false, simd.Bool32x4.extractLane(o, 1));
        assert.equal(true, simd.Bool32x4.extractLane(o, 2));
        assert.equal(false, simd.Bool32x4.extractLane(o, 3));
        m = simd.Bool32x4(false, false, false, true);
        n = simd.Bool32x4(true, false, true, true);
        o = simd.Bool32x4.and(m, n);
        assert.equal(false, simd.Bool32x4.extractLane(o, 0));
        assert.equal(false, simd.Bool32x4.extractLane(o, 1));
        assert.equal(false, simd.Bool32x4.extractLane(o, 2));
        assert.equal(true, simd.Bool32x4.extractLane(o, 3));

    });

    it("Bool32x4 or", () => {
        let m = simd.Bool32x4(true, true, true, false);
        let n = simd.Bool32x4(true, false, true, false);
        let o = simd.Bool32x4.or(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(o, 0));
        assert.equal(true, simd.Bool32x4.extractLane(o, 1));
        assert.equal(true, simd.Bool32x4.extractLane(o, 2));
        assert.equal(false, simd.Bool32x4.extractLane(o, 3));
        m = simd.Bool32x4(false, false, false, true);
        n = simd.Bool32x4(true, false, true, true);
        o = simd.Bool32x4.or(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(o, 0));
        assert.equal(false, simd.Bool32x4.extractLane(o, 1));
        assert.equal(true, simd.Bool32x4.extractLane(o, 2));
        assert.equal(true, simd.Bool32x4.extractLane(o, 3));

    });

    it("Bool32x4 xor", () => {
        let m = simd.Bool32x4(true, true, true, false);
        let n = simd.Bool32x4(true, false, true, false);
        let o = simd.Bool32x4.xor(m, n);
        assert.equal(false, simd.Bool32x4.extractLane(o, 0));
        assert.equal(true, simd.Bool32x4.extractLane(o, 1));
        assert.equal(false, simd.Bool32x4.extractLane(o, 2));
        assert.equal(false, simd.Bool32x4.extractLane(o, 3));
        m = simd.Bool32x4(false, false, false, true);
        n = simd.Bool32x4(true, false, true, true);
        o = simd.Bool32x4.xor(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(o, 0));
        assert.equal(false, simd.Bool32x4.extractLane(o, 1));
        assert.equal(true, simd.Bool32x4.extractLane(o, 2));
        assert.equal(false, simd.Bool32x4.extractLane(o, 3));

    });

    it("Bool32x4 not", () => {
        const m = simd.Bool32x4(true, false, true, false);
        const o = simd.Bool32x4.not(m);
        assert.equal(false, simd.Bool32x4.extractLane(o, 0));
        assert.equal(true, simd.Bool32x4.extractLane(o, 1));
        assert.equal(false, simd.Bool32x4.extractLane(o, 2));
        assert.equal(true, simd.Bool32x4.extractLane(o, 3));

    });

    it("Bool32x4 comparisons", () => {
        const m = simd.Bool32x4(true, true, false, false);
        const n = simd.Bool32x4(false, true, false, true);
        let cmp;

        cmp = simd.Bool32x4.equal(m, n);
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Bool32x4.notEqual(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 3));

    });

    it("Bool32x4 select", () => {
        const m = simd.Bool32x4(true, false, true, false);
        const t = simd.Bool32x4(true, true, false, false);
        const f = simd.Bool32x4(false, false, false, true);
        const s = simd.Bool32x4.select(m, t, f);
        assert.equal(true, simd.Bool32x4.extractLane(s, 0));
        assert.equal(false, simd.Bool32x4.extractLane(s, 1));
        assert.equal(false, simd.Bool32x4.extractLane(s, 2));
        assert.equal(true, simd.Bool32x4.extractLane(s, 3));

    });

    it("Bool16x8 constructor", () => {
        assert.equal("function", typeof simd.Bool16x8);
        const m = simd.Bool16x8(false, true, true, false, true, false, true, false);
        assert.equal(false, simd.Bool16x8.extractLane(m, 0));
        assert.equal(true, simd.Bool16x8.extractLane(m, 1));
        assert.equal(true, simd.Bool16x8.extractLane(m, 2));
        assert.equal(false, simd.Bool16x8.extractLane(m, 3));
        assert.equal(true, simd.Bool16x8.extractLane(m, 4));
        assert.equal(false, simd.Bool16x8.extractLane(m, 5));
        assert.equal(true, simd.Bool16x8.extractLane(m, 6));
        assert.equal(false, simd.Bool16x8.extractLane(m, 7));

        assert.throws(() => simd.Bool64x2.check(m));
        assert.throws(() => simd.Bool32x4.check(m));
        assert.throws(() => simd.Bool8x16.check(m));

    });

    it("Bool16x8 splat constructor", () => {
        assert.equal("function", typeof simd.Bool16x8.splat);
        let m = simd.Bool16x8.splat(true);
        assert.equal(true, simd.Bool16x8.extractLane(m, 0));
        assert.equal(true, simd.Bool16x8.extractLane(m, 1));
        assert.equal(true, simd.Bool16x8.extractLane(m, 2));
        assert.equal(true, simd.Bool16x8.extractLane(m, 3));
        assert.equal(true, simd.Bool16x8.extractLane(m, 4));
        assert.equal(true, simd.Bool16x8.extractLane(m, 5));
        assert.equal(true, simd.Bool16x8.extractLane(m, 6));
        assert.equal(true, simd.Bool16x8.extractLane(m, 7));
        m = simd.Bool16x8.splat(false);
        assert.equal(false, simd.Bool16x8.extractLane(m, 0));
        assert.equal(false, simd.Bool16x8.extractLane(m, 1));
        assert.equal(false, simd.Bool16x8.extractLane(m, 2));
        assert.equal(false, simd.Bool16x8.extractLane(m, 3));
        assert.equal(false, simd.Bool16x8.extractLane(m, 4));
        assert.equal(false, simd.Bool16x8.extractLane(m, 5));
        assert.equal(false, simd.Bool16x8.extractLane(m, 6));
        assert.equal(false, simd.Bool16x8.extractLane(m, 7));

    });

    it("Bool16x8 scalar getters", () => {
        const m = simd.Bool16x8(true, false, true, false, true, true, false, false);
        assert.equal(true, simd.Bool16x8.extractLane(m, 0));
        assert.equal(false, simd.Bool16x8.extractLane(m, 1));
        assert.equal(true, simd.Bool16x8.extractLane(m, 2));
        assert.equal(false, simd.Bool16x8.extractLane(m, 3));
        assert.equal(true, simd.Bool16x8.extractLane(m, 4));
        assert.equal(true, simd.Bool16x8.extractLane(m, 5));
        assert.equal(false, simd.Bool16x8.extractLane(m, 6));
        assert.equal(false, simd.Bool16x8.extractLane(m, 7));

    });

    it("Bool16x8 replaceLane", () => {
        const a = simd.Bool16x8(false, false, false, false, false, false, false, false);
        let c = simd.Bool16x8.replaceLane(a, 0, true);
        assert.equal(true, simd.Bool16x8.extractLane(c, 0));
        assert.equal(false, simd.Bool16x8.extractLane(c, 1));
        assert.equal(false, simd.Bool16x8.extractLane(c, 2));
        assert.equal(false, simd.Bool16x8.extractLane(c, 3));
        assert.equal(false, simd.Bool16x8.extractLane(c, 4));
        assert.equal(false, simd.Bool16x8.extractLane(c, 5));
        assert.equal(false, simd.Bool16x8.extractLane(c, 6));
        assert.equal(false, simd.Bool16x8.extractLane(c, 7));
        c = simd.Bool16x8.replaceLane(c, 3, true);
        assert.equal(true, simd.Bool16x8.extractLane(c, 0));
        assert.equal(false, simd.Bool16x8.extractLane(c, 1));
        assert.equal(false, simd.Bool16x8.extractLane(c, 2));
        assert.equal(true, simd.Bool16x8.extractLane(c, 3));
        assert.equal(false, simd.Bool16x8.extractLane(c, 4));
        assert.equal(false, simd.Bool16x8.extractLane(c, 5));
        assert.equal(false, simd.Bool16x8.extractLane(c, 6));
        assert.equal(false, simd.Bool16x8.extractLane(c, 7));
        c = simd.Bool16x8.replaceLane(c, 6, true);
        assert.equal(true, simd.Bool16x8.extractLane(c, 0));
        assert.equal(false, simd.Bool16x8.extractLane(c, 1));
        assert.equal(false, simd.Bool16x8.extractLane(c, 2));
        assert.equal(true, simd.Bool16x8.extractLane(c, 3));
        assert.equal(false, simd.Bool16x8.extractLane(c, 4));
        assert.equal(false, simd.Bool16x8.extractLane(c, 5));
        assert.equal(true, simd.Bool16x8.extractLane(c, 6));
        assert.equal(false, simd.Bool16x8.extractLane(c, 7));
        c = simd.Bool16x8.replaceLane(c, 0, false);
        assert.equal(false, simd.Bool16x8.extractLane(c, 0));
        assert.equal(false, simd.Bool16x8.extractLane(c, 1));
        assert.equal(false, simd.Bool16x8.extractLane(c, 2));
        assert.equal(true, simd.Bool16x8.extractLane(c, 3));
        assert.equal(false, simd.Bool16x8.extractLane(c, 4));
        assert.equal(false, simd.Bool16x8.extractLane(c, 5));
        assert.equal(true, simd.Bool16x8.extractLane(c, 6));
        assert.equal(false, simd.Bool16x8.extractLane(c, 7));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Bool16x8.replaceLane(a, index, false));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(8);

    });

    it("Bool16x8 allTrue", () => {
        const v00 = simd.Bool16x8(false, false, false, false, false, false, false, false);
        const v01 = simd.Bool16x8(false, true, false, false, true, true, true, true);
        const v10 = simd.Bool16x8(false, false, false, true, true, true, true, true);
        const v11 = simd.Bool16x8(true, true, true, true, true, true, true, true);
        assert.equal(simd.Bool16x8.allTrue(v00), false);
        assert.equal(simd.Bool16x8.allTrue(v01), false);
        assert.equal(simd.Bool16x8.allTrue(v10), false);
        assert.equal(simd.Bool16x8.allTrue(v11), true);

    });

    it("Bool16x8 anyTrue", () => {
        const v00 = simd.Bool16x8(false, false, false, false, false, false, false, false);
        const v01 = simd.Bool16x8(false, true, false, false, false, false, false, false);
        const v10 = simd.Bool16x8(false, false, false, false, false, false, false, true);
        const v11 = simd.Bool16x8(true, true, true, true, true, true, true, true);
        assert.equal(simd.Bool16x8.anyTrue(v00), false);
        assert.equal(simd.Bool16x8.anyTrue(v01), true);
        assert.equal(simd.Bool16x8.anyTrue(v10), true);
        assert.equal(simd.Bool16x8.anyTrue(v11), true);

    });

    it("Bool16x8 and", () => {
        let m = simd.Bool16x8(true, true, true, true, false, false, false, false);
        let n = simd.Bool16x8(true, false, true, false, true, true, false, false);
        let o = simd.Bool16x8.and(m, n);
        assert.equal(true, simd.Bool16x8.extractLane(o, 0));
        assert.equal(false, simd.Bool16x8.extractLane(o, 1));
        assert.equal(true, simd.Bool16x8.extractLane(o, 2));
        assert.equal(false, simd.Bool16x8.extractLane(o, 3));
        assert.equal(false, simd.Bool16x8.extractLane(o, 4));
        assert.equal(false, simd.Bool16x8.extractLane(o, 5));
        assert.equal(false, simd.Bool16x8.extractLane(o, 6));
        assert.equal(false, simd.Bool16x8.extractLane(o, 7));
        m = simd.Bool16x8(false, false, false, true, true, true, true, false);
        n = simd.Bool16x8(true, false, true, true, false, true, false, false);
        o = simd.Bool16x8.and(m, n);
        assert.equal(false, simd.Bool16x8.extractLane(o, 0));
        assert.equal(false, simd.Bool16x8.extractLane(o, 1));
        assert.equal(false, simd.Bool16x8.extractLane(o, 2));
        assert.equal(true, simd.Bool16x8.extractLane(o, 3));
        assert.equal(false, simd.Bool16x8.extractLane(o, 4));
        assert.equal(true, simd.Bool16x8.extractLane(o, 5));
        assert.equal(false, simd.Bool16x8.extractLane(o, 6));
        assert.equal(false, simd.Bool16x8.extractLane(o, 7));

    });

    it("Bool16x8 or", () => {
        let m = simd.Bool16x8(true, true, true, true, false, false, false, false);
        let n = simd.Bool16x8(true, false, true, false, true, true, false, false);
        let o = simd.Bool16x8.or(m, n);
        assert.equal(true, simd.Bool16x8.extractLane(o, 0));
        assert.equal(true, simd.Bool16x8.extractLane(o, 1));
        assert.equal(true, simd.Bool16x8.extractLane(o, 2));
        assert.equal(true, simd.Bool16x8.extractLane(o, 3));
        assert.equal(true, simd.Bool16x8.extractLane(o, 4));
        assert.equal(true, simd.Bool16x8.extractLane(o, 5));
        assert.equal(false, simd.Bool16x8.extractLane(o, 6));
        assert.equal(false, simd.Bool16x8.extractLane(o, 7));
        m = simd.Bool16x8(false, false, false, true, true, true, true, false);
        n = simd.Bool16x8(true, false, true, true, false, true, false, false);
        o = simd.Bool16x8.or(m, n);
        assert.equal(true, simd.Bool16x8.extractLane(o, 0));
        assert.equal(false, simd.Bool16x8.extractLane(o, 1));
        assert.equal(true, simd.Bool16x8.extractLane(o, 2));
        assert.equal(true, simd.Bool16x8.extractLane(o, 3));
        assert.equal(true, simd.Bool16x8.extractLane(o, 4));
        assert.equal(true, simd.Bool16x8.extractLane(o, 5));
        assert.equal(true, simd.Bool16x8.extractLane(o, 6));
        assert.equal(false, simd.Bool16x8.extractLane(o, 7));

    });

    it("Bool16x8 xor", () => {
        let m = simd.Bool16x8(true, true, true, true, false, false, false, false);
        let n = simd.Bool16x8(true, false, true, false, true, true, false, false);
        let o = simd.Bool16x8.xor(m, n);
        assert.equal(false, simd.Bool16x8.extractLane(o, 0));
        assert.equal(true, simd.Bool16x8.extractLane(o, 1));
        assert.equal(false, simd.Bool16x8.extractLane(o, 2));
        assert.equal(true, simd.Bool16x8.extractLane(o, 3));
        assert.equal(true, simd.Bool16x8.extractLane(o, 4));
        assert.equal(true, simd.Bool16x8.extractLane(o, 5));
        assert.equal(false, simd.Bool16x8.extractLane(o, 6));
        assert.equal(false, simd.Bool16x8.extractLane(o, 7));
        m = simd.Bool16x8(false, false, false, true, true, true, true, false);
        n = simd.Bool16x8(true, false, true, true, false, true, false, false);
        o = simd.Bool16x8.xor(m, n);
        assert.equal(true, simd.Bool16x8.extractLane(o, 0));
        assert.equal(false, simd.Bool16x8.extractLane(o, 1));
        assert.equal(true, simd.Bool16x8.extractLane(o, 2));
        assert.equal(false, simd.Bool16x8.extractLane(o, 3));
        assert.equal(true, simd.Bool16x8.extractLane(o, 4));
        assert.equal(false, simd.Bool16x8.extractLane(o, 5));
        assert.equal(true, simd.Bool16x8.extractLane(o, 6));
        assert.equal(false, simd.Bool16x8.extractLane(o, 7));

    });

    it("Bool16x8 not", () => {
        const m = simd.Bool16x8(true, false, true, false, true, true, false, false);
        const o = simd.Bool16x8.not(m);
        assert.equal(false, simd.Bool16x8.extractLane(o, 0));
        assert.equal(true, simd.Bool16x8.extractLane(o, 1));
        assert.equal(false, simd.Bool16x8.extractLane(o, 2));
        assert.equal(true, simd.Bool16x8.extractLane(o, 3));
        assert.equal(false, simd.Bool16x8.extractLane(o, 4));
        assert.equal(false, simd.Bool16x8.extractLane(o, 5));
        assert.equal(true, simd.Bool16x8.extractLane(o, 6));
        assert.equal(true, simd.Bool16x8.extractLane(o, 7));

    });

    it("Bool16x8 comparisons", () => {
        const m = simd.Bool16x8(true, true, false, false, true, true, true, true);
        const n = simd.Bool16x8(false, true, false, true, false, true, false, true);
        let cmp;

        cmp = simd.Bool16x8.equal(m, n);
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 0));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 1));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 2));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 3));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 4));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 5));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 6));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 7));

        cmp = simd.Bool16x8.notEqual(m, n);
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 0));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 1));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 2));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 3));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 4));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 5));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 6));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 7));

    });

    it("Bool16x8 select", () => {
        const m = simd.Bool16x8(true, false, true, false, true, false, true, false);
        const t = simd.Bool16x8(true, true, false, false, true, true, false, false);
        const f = simd.Bool16x8(false, false, false, true, true, true, true, false);
        const s = simd.Bool16x8.select(m, t, f);
        assert.equal(true, simd.Bool16x8.extractLane(s, 0));
        assert.equal(false, simd.Bool16x8.extractLane(s, 1));
        assert.equal(false, simd.Bool16x8.extractLane(s, 2));
        assert.equal(true, simd.Bool16x8.extractLane(s, 3));
        assert.equal(true, simd.Bool16x8.extractLane(s, 4));
        assert.equal(true, simd.Bool16x8.extractLane(s, 5));
        assert.equal(false, simd.Bool16x8.extractLane(s, 6));
        assert.equal(false, simd.Bool16x8.extractLane(s, 7));

    });

    it("Bool8x16 constructor", () => {
        assert.equal("function", typeof simd.Bool8x16);
        const m = simd.Bool8x16(false, true, true, false, true, false, true, false,
            true, false, false, true, false, true, false, true);
        assert.equal(false, simd.Bool8x16.extractLane(m, 0));
        assert.equal(true, simd.Bool8x16.extractLane(m, 1));
        assert.equal(true, simd.Bool8x16.extractLane(m, 2));
        assert.equal(false, simd.Bool8x16.extractLane(m, 3));
        assert.equal(true, simd.Bool8x16.extractLane(m, 4));
        assert.equal(false, simd.Bool8x16.extractLane(m, 5));
        assert.equal(true, simd.Bool8x16.extractLane(m, 6));
        assert.equal(false, simd.Bool8x16.extractLane(m, 7));
        assert.equal(true, simd.Bool8x16.extractLane(m, 8));
        assert.equal(false, simd.Bool8x16.extractLane(m, 9));
        assert.equal(false, simd.Bool8x16.extractLane(m, 10));
        assert.equal(true, simd.Bool8x16.extractLane(m, 11));
        assert.equal(false, simd.Bool8x16.extractLane(m, 12));
        assert.equal(true, simd.Bool8x16.extractLane(m, 13));
        assert.equal(false, simd.Bool8x16.extractLane(m, 14));
        assert.equal(true, simd.Bool8x16.extractLane(m, 15));

        assert.throws(() => simd.Bool64x2.check(m));
        assert.throws(() => simd.Bool32x4.check(m));
        assert.throws(() => simd.Bool16x8.check(m));

    });

    it("Bool8x16 splat constructor", () => {
        assert.equal("function", typeof simd.Bool8x16.splat);
        let m = simd.Bool8x16.splat(true);
        assert.equal(true, simd.Bool8x16.extractLane(m, 0));
        assert.equal(true, simd.Bool8x16.extractLane(m, 1));
        assert.equal(true, simd.Bool8x16.extractLane(m, 2));
        assert.equal(true, simd.Bool8x16.extractLane(m, 3));
        assert.equal(true, simd.Bool8x16.extractLane(m, 4));
        assert.equal(true, simd.Bool8x16.extractLane(m, 5));
        assert.equal(true, simd.Bool8x16.extractLane(m, 6));
        assert.equal(true, simd.Bool8x16.extractLane(m, 7));
        assert.equal(true, simd.Bool8x16.extractLane(m, 8));
        assert.equal(true, simd.Bool8x16.extractLane(m, 9));
        assert.equal(true, simd.Bool8x16.extractLane(m, 10));
        assert.equal(true, simd.Bool8x16.extractLane(m, 11));
        assert.equal(true, simd.Bool8x16.extractLane(m, 12));
        assert.equal(true, simd.Bool8x16.extractLane(m, 13));
        assert.equal(true, simd.Bool8x16.extractLane(m, 14));
        assert.equal(true, simd.Bool8x16.extractLane(m, 15));
        m = simd.Bool8x16.splat(false);
        assert.equal(false, simd.Bool8x16.extractLane(m, 0));
        assert.equal(false, simd.Bool8x16.extractLane(m, 1));
        assert.equal(false, simd.Bool8x16.extractLane(m, 2));
        assert.equal(false, simd.Bool8x16.extractLane(m, 3));
        assert.equal(false, simd.Bool8x16.extractLane(m, 4));
        assert.equal(false, simd.Bool8x16.extractLane(m, 5));
        assert.equal(false, simd.Bool8x16.extractLane(m, 6));
        assert.equal(false, simd.Bool8x16.extractLane(m, 7));
        assert.equal(false, simd.Bool8x16.extractLane(m, 8));
        assert.equal(false, simd.Bool8x16.extractLane(m, 9));
        assert.equal(false, simd.Bool8x16.extractLane(m, 10));
        assert.equal(false, simd.Bool8x16.extractLane(m, 11));
        assert.equal(false, simd.Bool8x16.extractLane(m, 12));
        assert.equal(false, simd.Bool8x16.extractLane(m, 13));
        assert.equal(false, simd.Bool8x16.extractLane(m, 14));
        assert.equal(false, simd.Bool8x16.extractLane(m, 15));

    });

    it("Bool8x16 scalar getters", () => {
        const m = simd.Bool8x16(true, false, true, false, true, true, false, false,
            false, true, false, true, false, false, true, true);
        assert.equal(true, simd.Bool8x16.extractLane(m, 0));
        assert.equal(false, simd.Bool8x16.extractLane(m, 1));
        assert.equal(true, simd.Bool8x16.extractLane(m, 2));
        assert.equal(false, simd.Bool8x16.extractLane(m, 3));
        assert.equal(true, simd.Bool8x16.extractLane(m, 4));
        assert.equal(true, simd.Bool8x16.extractLane(m, 5));
        assert.equal(false, simd.Bool8x16.extractLane(m, 6));
        assert.equal(false, simd.Bool8x16.extractLane(m, 7));
        assert.equal(false, simd.Bool8x16.extractLane(m, 8));
        assert.equal(true, simd.Bool8x16.extractLane(m, 9));
        assert.equal(false, simd.Bool8x16.extractLane(m, 10));
        assert.equal(true, simd.Bool8x16.extractLane(m, 11));
        assert.equal(false, simd.Bool8x16.extractLane(m, 12));
        assert.equal(false, simd.Bool8x16.extractLane(m, 13));
        assert.equal(true, simd.Bool8x16.extractLane(m, 14));
        assert.equal(true, simd.Bool8x16.extractLane(m, 15));

    });

    it("Bool8x16 replaceLane", () => {
        const a = simd.Bool8x16(false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, false);
        let c = simd.Bool8x16.replaceLane(a, 0, true);
        assert.equal(true, simd.Bool8x16.extractLane(c, 0));
        assert.equal(false, simd.Bool8x16.extractLane(c, 1));
        assert.equal(false, simd.Bool8x16.extractLane(c, 2));
        assert.equal(false, simd.Bool8x16.extractLane(c, 3));
        assert.equal(false, simd.Bool8x16.extractLane(c, 4));
        assert.equal(false, simd.Bool8x16.extractLane(c, 5));
        assert.equal(false, simd.Bool8x16.extractLane(c, 6));
        assert.equal(false, simd.Bool8x16.extractLane(c, 7));
        assert.equal(false, simd.Bool8x16.extractLane(c, 8));
        assert.equal(false, simd.Bool8x16.extractLane(c, 9));
        assert.equal(false, simd.Bool8x16.extractLane(c, 10));
        assert.equal(false, simd.Bool8x16.extractLane(c, 11));
        assert.equal(false, simd.Bool8x16.extractLane(c, 12));
        assert.equal(false, simd.Bool8x16.extractLane(c, 13));
        assert.equal(false, simd.Bool8x16.extractLane(c, 14));
        assert.equal(false, simd.Bool8x16.extractLane(c, 15));
        c = simd.Bool8x16.replaceLane(c, 7, true);
        assert.equal(true, simd.Bool8x16.extractLane(c, 0));
        assert.equal(false, simd.Bool8x16.extractLane(c, 1));
        assert.equal(false, simd.Bool8x16.extractLane(c, 2));
        assert.equal(false, simd.Bool8x16.extractLane(c, 3));
        assert.equal(false, simd.Bool8x16.extractLane(c, 4));
        assert.equal(false, simd.Bool8x16.extractLane(c, 5));
        assert.equal(false, simd.Bool8x16.extractLane(c, 6));
        assert.equal(true, simd.Bool8x16.extractLane(c, 7));
        assert.equal(false, simd.Bool8x16.extractLane(c, 8));
        assert.equal(false, simd.Bool8x16.extractLane(c, 9));
        assert.equal(false, simd.Bool8x16.extractLane(c, 10));
        assert.equal(false, simd.Bool8x16.extractLane(c, 11));
        assert.equal(false, simd.Bool8x16.extractLane(c, 12));
        assert.equal(false, simd.Bool8x16.extractLane(c, 13));
        assert.equal(false, simd.Bool8x16.extractLane(c, 14));
        assert.equal(false, simd.Bool8x16.extractLane(c, 15));
        c = simd.Bool8x16.replaceLane(c, 13, true);
        assert.equal(true, simd.Bool8x16.extractLane(c, 0));
        assert.equal(false, simd.Bool8x16.extractLane(c, 1));
        assert.equal(false, simd.Bool8x16.extractLane(c, 2));
        assert.equal(false, simd.Bool8x16.extractLane(c, 3));
        assert.equal(false, simd.Bool8x16.extractLane(c, 4));
        assert.equal(false, simd.Bool8x16.extractLane(c, 5));
        assert.equal(false, simd.Bool8x16.extractLane(c, 6));
        assert.equal(true, simd.Bool8x16.extractLane(c, 7));
        assert.equal(false, simd.Bool8x16.extractLane(c, 8));
        assert.equal(false, simd.Bool8x16.extractLane(c, 9));
        assert.equal(false, simd.Bool8x16.extractLane(c, 10));
        assert.equal(false, simd.Bool8x16.extractLane(c, 11));
        assert.equal(false, simd.Bool8x16.extractLane(c, 12));
        assert.equal(true, simd.Bool8x16.extractLane(c, 13));
        assert.equal(false, simd.Bool8x16.extractLane(c, 14));
        assert.equal(false, simd.Bool8x16.extractLane(c, 15));
        c = simd.Bool8x16.replaceLane(c, 0, false);
        assert.equal(false, simd.Bool8x16.extractLane(c, 0));
        assert.equal(false, simd.Bool8x16.extractLane(c, 1));
        assert.equal(false, simd.Bool8x16.extractLane(c, 2));
        assert.equal(false, simd.Bool8x16.extractLane(c, 3));
        assert.equal(false, simd.Bool8x16.extractLane(c, 4));
        assert.equal(false, simd.Bool8x16.extractLane(c, 5));
        assert.equal(false, simd.Bool8x16.extractLane(c, 6));
        assert.equal(true, simd.Bool8x16.extractLane(c, 7));
        assert.equal(false, simd.Bool8x16.extractLane(c, 8));
        assert.equal(false, simd.Bool8x16.extractLane(c, 9));
        assert.equal(false, simd.Bool8x16.extractLane(c, 10));
        assert.equal(false, simd.Bool8x16.extractLane(c, 11));
        assert.equal(false, simd.Bool8x16.extractLane(c, 12));
        assert.equal(true, simd.Bool8x16.extractLane(c, 13));
        assert.equal(false, simd.Bool8x16.extractLane(c, 14));
        assert.equal(false, simd.Bool8x16.extractLane(c, 15));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Bool8x16.replaceLane(a, index, false));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(16);

    });

    it("Bool8x16 allTrue", () => {
        const v00 = simd.Bool8x16(false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, false);
        const v01 = simd.Bool8x16(false, true, false, false, true, true, true, true,
            false, true, false, false, true, true, true, true);
        const v10 = simd.Bool8x16(false, false, false, true, true, true, true, true,
            false, false, false, true, true, true, true, true);
        const v11 = simd.Bool8x16(true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true);
        assert.equal(simd.Bool8x16.allTrue(v00), false);
        assert.equal(simd.Bool8x16.allTrue(v01), false);
        assert.equal(simd.Bool8x16.allTrue(v10), false);
        assert.equal(simd.Bool8x16.allTrue(v11), true);

    });

    it("Bool8x16 anyTrue", () => {
        const v00 = simd.Bool8x16(false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, false);
        const v01 = simd.Bool8x16(false, true, false, false, true, true, true, true,
            false, true, false, false, true, true, true, true);
        const v10 = simd.Bool8x16(false, false, false, true, true, true, true, true,
            false, false, false, true, true, true, true, true);
        const v11 = simd.Bool8x16(true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true);
        assert.equal(simd.Bool8x16.anyTrue(v00), false);
        assert.equal(simd.Bool8x16.anyTrue(v01), true);
        assert.equal(simd.Bool8x16.anyTrue(v10), true);
        assert.equal(simd.Bool8x16.anyTrue(v11), true);

    });

    it("Bool8x16 and", () => {
        let m = simd.Bool8x16(true, true, true, true, false, false, false, false,
            true, true, true, true, false, false, false, false);
        let n = simd.Bool8x16(true, false, true, false, true, true, false, false,
            true, false, true, false, true, true, false, false);
        let o = simd.Bool8x16.and(m, n);
        assert.equal(true, simd.Bool8x16.extractLane(o, 0));
        assert.equal(false, simd.Bool8x16.extractLane(o, 1));
        assert.equal(true, simd.Bool8x16.extractLane(o, 2));
        assert.equal(false, simd.Bool8x16.extractLane(o, 3));
        assert.equal(false, simd.Bool8x16.extractLane(o, 4));
        assert.equal(false, simd.Bool8x16.extractLane(o, 5));
        assert.equal(false, simd.Bool8x16.extractLane(o, 6));
        assert.equal(false, simd.Bool8x16.extractLane(o, 7));
        assert.equal(true, simd.Bool8x16.extractLane(o, 8));
        assert.equal(false, simd.Bool8x16.extractLane(o, 9));
        assert.equal(true, simd.Bool8x16.extractLane(o, 10));
        assert.equal(false, simd.Bool8x16.extractLane(o, 11));
        assert.equal(false, simd.Bool8x16.extractLane(o, 12));
        assert.equal(false, simd.Bool8x16.extractLane(o, 13));
        assert.equal(false, simd.Bool8x16.extractLane(o, 14));
        assert.equal(false, simd.Bool8x16.extractLane(o, 15));
        m = simd.Bool8x16(false, false, false, true, true, true, true, false,
            false, false, false, true, true, true, true, false);
        n = simd.Bool8x16(true, false, true, true, false, true, false, false,
            true, false, true, true, false, true, false, false);
        o = simd.Bool8x16.and(m, n);
        assert.equal(false, simd.Bool8x16.extractLane(o, 0));
        assert.equal(false, simd.Bool8x16.extractLane(o, 1));
        assert.equal(false, simd.Bool8x16.extractLane(o, 2));
        assert.equal(true, simd.Bool8x16.extractLane(o, 3));
        assert.equal(false, simd.Bool8x16.extractLane(o, 4));
        assert.equal(true, simd.Bool8x16.extractLane(o, 5));
        assert.equal(false, simd.Bool8x16.extractLane(o, 6));
        assert.equal(false, simd.Bool8x16.extractLane(o, 7));
        assert.equal(false, simd.Bool8x16.extractLane(o, 8));
        assert.equal(false, simd.Bool8x16.extractLane(o, 9));
        assert.equal(false, simd.Bool8x16.extractLane(o, 10));
        assert.equal(true, simd.Bool8x16.extractLane(o, 11));
        assert.equal(false, simd.Bool8x16.extractLane(o, 12));
        assert.equal(true, simd.Bool8x16.extractLane(o, 13));
        assert.equal(false, simd.Bool8x16.extractLane(o, 14));
        assert.equal(false, simd.Bool8x16.extractLane(o, 15));

    });

    it("Bool8x16 or", () => {
        let m = simd.Bool8x16(true, true, true, true, false, false, false, false,
            true, true, true, true, false, false, false, false);
        let n = simd.Bool8x16(true, false, true, false, true, true, false, false,
            true, false, true, false, true, true, false, false);
        let o = simd.Bool8x16.or(m, n);
        assert.equal(true, simd.Bool8x16.extractLane(o, 0));
        assert.equal(true, simd.Bool8x16.extractLane(o, 1));
        assert.equal(true, simd.Bool8x16.extractLane(o, 2));
        assert.equal(true, simd.Bool8x16.extractLane(o, 3));
        assert.equal(true, simd.Bool8x16.extractLane(o, 4));
        assert.equal(true, simd.Bool8x16.extractLane(o, 5));
        assert.equal(false, simd.Bool8x16.extractLane(o, 6));
        assert.equal(false, simd.Bool8x16.extractLane(o, 7));
        assert.equal(true, simd.Bool8x16.extractLane(o, 8));
        assert.equal(true, simd.Bool8x16.extractLane(o, 9));
        assert.equal(true, simd.Bool8x16.extractLane(o, 10));
        assert.equal(true, simd.Bool8x16.extractLane(o, 11));
        assert.equal(true, simd.Bool8x16.extractLane(o, 12));
        assert.equal(true, simd.Bool8x16.extractLane(o, 13));
        assert.equal(false, simd.Bool8x16.extractLane(o, 14));
        assert.equal(false, simd.Bool8x16.extractLane(o, 15));
        m = simd.Bool8x16(false, false, false, true, true, true, true, false,
            false, false, false, true, true, true, true, false);
        n = simd.Bool8x16(true, false, true, true, false, true, false, false,
            true, false, true, true, false, true, false, false);
        o = simd.Bool8x16.or(m, n);
        assert.equal(true, simd.Bool8x16.extractLane(o, 0));
        assert.equal(false, simd.Bool8x16.extractLane(o, 1));
        assert.equal(true, simd.Bool8x16.extractLane(o, 2));
        assert.equal(true, simd.Bool8x16.extractLane(o, 3));
        assert.equal(true, simd.Bool8x16.extractLane(o, 4));
        assert.equal(true, simd.Bool8x16.extractLane(o, 5));
        assert.equal(true, simd.Bool8x16.extractLane(o, 6));
        assert.equal(false, simd.Bool8x16.extractLane(o, 7));
        assert.equal(true, simd.Bool8x16.extractLane(o, 8));
        assert.equal(false, simd.Bool8x16.extractLane(o, 9));
        assert.equal(true, simd.Bool8x16.extractLane(o, 10));
        assert.equal(true, simd.Bool8x16.extractLane(o, 11));
        assert.equal(true, simd.Bool8x16.extractLane(o, 12));
        assert.equal(true, simd.Bool8x16.extractLane(o, 13));
        assert.equal(true, simd.Bool8x16.extractLane(o, 14));
        assert.equal(false, simd.Bool8x16.extractLane(o, 15));

    });

    it("Bool8x16 xor", () => {
        let m = simd.Bool8x16(true, true, true, true, false, false, false, false,
            true, true, true, true, false, false, false, false);
        let n = simd.Bool8x16(true, false, true, false, true, true, false, false,
            true, false, true, false, true, true, false, false);
        let o = simd.Bool8x16.xor(m, n);
        assert.equal(false, simd.Bool8x16.extractLane(o, 0));
        assert.equal(true, simd.Bool8x16.extractLane(o, 1));
        assert.equal(false, simd.Bool8x16.extractLane(o, 2));
        assert.equal(true, simd.Bool8x16.extractLane(o, 3));
        assert.equal(true, simd.Bool8x16.extractLane(o, 4));
        assert.equal(true, simd.Bool8x16.extractLane(o, 5));
        assert.equal(false, simd.Bool8x16.extractLane(o, 6));
        assert.equal(false, simd.Bool8x16.extractLane(o, 7));
        assert.equal(false, simd.Bool8x16.extractLane(o, 8));
        assert.equal(true, simd.Bool8x16.extractLane(o, 9));
        assert.equal(false, simd.Bool8x16.extractLane(o, 10));
        assert.equal(true, simd.Bool8x16.extractLane(o, 11));
        assert.equal(true, simd.Bool8x16.extractLane(o, 12));
        assert.equal(true, simd.Bool8x16.extractLane(o, 13));
        assert.equal(false, simd.Bool8x16.extractLane(o, 14));
        assert.equal(false, simd.Bool8x16.extractLane(o, 15));
        m = simd.Bool8x16(false, false, false, true, true, true, true, false,
            false, false, false, true, true, true, true, false);
        n = simd.Bool8x16(true, false, true, true, false, true, false, false,
            true, false, true, true, false, true, false, false);
        o = simd.Bool8x16.xor(m, n);
        assert.equal(true, simd.Bool8x16.extractLane(o, 0));
        assert.equal(false, simd.Bool8x16.extractLane(o, 1));
        assert.equal(true, simd.Bool8x16.extractLane(o, 2));
        assert.equal(false, simd.Bool8x16.extractLane(o, 3));
        assert.equal(true, simd.Bool8x16.extractLane(o, 4));
        assert.equal(false, simd.Bool8x16.extractLane(o, 5));
        assert.equal(true, simd.Bool8x16.extractLane(o, 6));
        assert.equal(false, simd.Bool8x16.extractLane(o, 7));
        assert.equal(true, simd.Bool8x16.extractLane(o, 8));
        assert.equal(false, simd.Bool8x16.extractLane(o, 9));
        assert.equal(true, simd.Bool8x16.extractLane(o, 10));
        assert.equal(false, simd.Bool8x16.extractLane(o, 11));
        assert.equal(true, simd.Bool8x16.extractLane(o, 12));
        assert.equal(false, simd.Bool8x16.extractLane(o, 13));
        assert.equal(true, simd.Bool8x16.extractLane(o, 14));
        assert.equal(false, simd.Bool8x16.extractLane(o, 15));

    });

    it("Bool8x16 not", () => {
        const m = simd.Bool8x16(true, false, true, false, true, true, false, false,
            true, false, true, false, true, true, false, false);
        const o = simd.Bool8x16.not(m);
        assert.equal(false, simd.Bool8x16.extractLane(o, 0));
        assert.equal(true, simd.Bool8x16.extractLane(o, 1));
        assert.equal(false, simd.Bool8x16.extractLane(o, 2));
        assert.equal(true, simd.Bool8x16.extractLane(o, 3));
        assert.equal(false, simd.Bool8x16.extractLane(o, 4));
        assert.equal(false, simd.Bool8x16.extractLane(o, 5));
        assert.equal(true, simd.Bool8x16.extractLane(o, 6));
        assert.equal(true, simd.Bool8x16.extractLane(o, 7));
        assert.equal(false, simd.Bool8x16.extractLane(o, 8));
        assert.equal(true, simd.Bool8x16.extractLane(o, 9));
        assert.equal(false, simd.Bool8x16.extractLane(o, 10));
        assert.equal(true, simd.Bool8x16.extractLane(o, 11));
        assert.equal(false, simd.Bool8x16.extractLane(o, 12));
        assert.equal(false, simd.Bool8x16.extractLane(o, 13));
        assert.equal(true, simd.Bool8x16.extractLane(o, 14));
        assert.equal(true, simd.Bool8x16.extractLane(o, 15));

    });

    it("Bool8x16 comparisons", () => {
        const m = simd.Bool8x16(true, true, false, false, true, true, true, true,
            false, false, true, true, false, false, false, false);
        const n = simd.Bool8x16(false, true, false, true, false, true, false, true,
            true, false, true, false, true, false, true, false);
        let cmp;

        cmp = simd.Bool8x16.equal(m, n);
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 0));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 1));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 2));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 3));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 4));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 5));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 6));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 7));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 8));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 9));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 10));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 11));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 12));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 13));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 14));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 15));

        cmp = simd.Bool8x16.notEqual(m, n);
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 0));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 1));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 2));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 3));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 4));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 5));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 6));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 7));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 8));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 9));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 10));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 11));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 12));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 13));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 14));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 15));

    });

    it("Bool8x16 select", () => {
        const m = simd.Bool8x16(true, false, true, false, true, false, true, false,
            true, false, true, false, true, false, true, false);
        const t = simd.Bool8x16(true, true, false, false, true, true, false, false,
            true, true, false, false, true, true, false, false);
        const f = simd.Bool8x16(false, false, false, true, true, true, true, false,
            false, false, false, true, true, true, true, false);
        const s = simd.Bool8x16.select(m, t, f);
        assert.equal(true, simd.Bool8x16.extractLane(s, 0));
        assert.equal(false, simd.Bool8x16.extractLane(s, 1));
        assert.equal(false, simd.Bool8x16.extractLane(s, 2));
        assert.equal(true, simd.Bool8x16.extractLane(s, 3));
        assert.equal(true, simd.Bool8x16.extractLane(s, 4));
        assert.equal(true, simd.Bool8x16.extractLane(s, 5));
        assert.equal(false, simd.Bool8x16.extractLane(s, 6));
        assert.equal(false, simd.Bool8x16.extractLane(s, 7));
        assert.equal(true, simd.Bool8x16.extractLane(s, 8));
        assert.equal(false, simd.Bool8x16.extractLane(s, 9));
        assert.equal(false, simd.Bool8x16.extractLane(s, 10));
        assert.equal(true, simd.Bool8x16.extractLane(s, 11));
        assert.equal(true, simd.Bool8x16.extractLane(s, 12));
        assert.equal(true, simd.Bool8x16.extractLane(s, 13));
        assert.equal(false, simd.Bool8x16.extractLane(s, 14));
        assert.equal(false, simd.Bool8x16.extractLane(s, 15));

    });

    it("Float32x4 constructor", () => {
        assert.notEqual(undefined, simd.Float32x4);  // Type.
        assert.notEqual(undefined, simd.Float32x4(1.0, 2.0, 3.0, 4.0));  // New object.
    });

    it("simd128 types check", () => {
        const x = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        const a = simd.Float32x4.check(x);
        assert.equal(simd.Float32x4.extractLane(a, 0), simd.Float32x4.extractLane(x, 0));
        assert.equal(simd.Float32x4.extractLane(a, 1), simd.Float32x4.extractLane(x, 1));
        assert.equal(simd.Float32x4.extractLane(a, 2), simd.Float32x4.extractLane(x, 2));
        assert.equal(simd.Float32x4.extractLane(a, 3), simd.Float32x4.extractLane(x, 3));
        assert.throws(() => simd.Float32x4.check(1));
        assert.throws(() => simd.Float32x4.check("hi"));

        const y = simd.Int32x4(1, 2, 3, 4);
        const b = simd.Int32x4.check(y);
        assert.equal(simd.Int32x4.extractLane(b, 0), simd.Int32x4.extractLane(y, 0));
        assert.equal(simd.Int32x4.extractLane(b, 1), simd.Int32x4.extractLane(y, 1));
        assert.equal(simd.Int32x4.extractLane(b, 2), simd.Int32x4.extractLane(y, 2));
        assert.equal(simd.Int32x4.extractLane(b, 3), simd.Int32x4.extractLane(y, 3));
        assert.throws(() => simd.Int32x4.check(1));
        assert.throws(() => simd.Int32x4.check("hi"));

        const z = simd.Float64x2(1.0, 2.0);
        const c = simd.Float64x2.check(z);
        assert.equal(simd.Float64x2.extractLane(c, 0), simd.Float64x2.extractLane(z, 0));
        assert.equal(simd.Float64x2.extractLane(c, 1), simd.Float64x2.extractLane(z, 1));
        assert.throws(() => simd.Float64x2.check(1));
        assert.throws(() => simd.Float64x2.check("hi"));

        const u = simd.Int16x8(1, 2, 3, 4, 5, 6, 7, 8);
        const d = simd.Int16x8.check(u);
        assert.equal(simd.Int16x8.extractLane(d, 0), simd.Int16x8.extractLane(u, 0));
        assert.equal(simd.Int16x8.extractLane(d, 1), simd.Int16x8.extractLane(u, 1));
        assert.equal(simd.Int16x8.extractLane(d, 2), simd.Int16x8.extractLane(u, 2));
        assert.equal(simd.Int16x8.extractLane(d, 3), simd.Int16x8.extractLane(u, 3));
        assert.equal(simd.Int16x8.extractLane(d, 4), simd.Int16x8.extractLane(u, 4));
        assert.equal(simd.Int16x8.extractLane(d, 5), simd.Int16x8.extractLane(u, 5));
        assert.equal(simd.Int16x8.extractLane(d, 6), simd.Int16x8.extractLane(u, 6));
        assert.equal(simd.Int16x8.extractLane(d, 7), simd.Int16x8.extractLane(u, 7));
        assert.throws(() => simd.Int16x8.check(1));
        assert.throws(() => simd.Int16x8.check("hi"));

        const v = simd.Int8x16(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        const e = simd.Int8x16.check(v);
        assert.equal(simd.Int8x16.extractLane(e, 0), simd.Int8x16.extractLane(v, 0));
        assert.equal(simd.Int8x16.extractLane(e, 1), simd.Int8x16.extractLane(v, 1));
        assert.equal(simd.Int8x16.extractLane(e, 2), simd.Int8x16.extractLane(v, 2));
        assert.equal(simd.Int8x16.extractLane(e, 3), simd.Int8x16.extractLane(v, 3));
        assert.equal(simd.Int8x16.extractLane(e, 4), simd.Int8x16.extractLane(v, 4));
        assert.equal(simd.Int8x16.extractLane(e, 5), simd.Int8x16.extractLane(v, 5));
        assert.equal(simd.Int8x16.extractLane(e, 6), simd.Int8x16.extractLane(v, 6));
        assert.equal(simd.Int8x16.extractLane(e, 7), simd.Int8x16.extractLane(v, 7));
        assert.equal(simd.Int8x16.extractLane(e, 8), simd.Int8x16.extractLane(v, 8));
        assert.equal(simd.Int8x16.extractLane(e, 9), simd.Int8x16.extractLane(v, 9));
        assert.equal(simd.Int8x16.extractLane(e, 10), simd.Int8x16.extractLane(v, 10));
        assert.equal(simd.Int8x16.extractLane(e, 11), simd.Int8x16.extractLane(v, 11));
        assert.equal(simd.Int8x16.extractLane(e, 12), simd.Int8x16.extractLane(v, 12));
        assert.equal(simd.Int8x16.extractLane(e, 13), simd.Int8x16.extractLane(v, 13));
        assert.equal(simd.Int8x16.extractLane(e, 14), simd.Int8x16.extractLane(v, 14));
        assert.equal(simd.Int8x16.extractLane(e, 15), simd.Int8x16.extractLane(v, 15));
        assert.throws(() => simd.Int8x16.check(1));
        assert.throws(() => simd.Int8x16.check("hi"));

    });

    it("Float32x4 fromFloat64x2 constructor", () => {
        let m = simd.Float64x2(1.0, 2.0);
        let n = simd.Float32x4.fromFloat64x2(m);
        assert.equal(1.0, simd.Float32x4.extractLane(n, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(n, 1));
        isPositiveZero(simd.Float32x4.extractLane(n, 2));
        isPositiveZero(simd.Float32x4.extractLane(n, 3));

        m = simd.Float64x2(3.402824e+38, 7.006492e-46);
        n = simd.Float32x4.fromFloat64x2(m);
        assert.equal(Infinity, simd.Float32x4.extractLane(n, 0));
        isPositiveZero(simd.Float32x4.extractLane(n, 1));
        isPositiveZero(simd.Float32x4.extractLane(n, 2));
        isPositiveZero(simd.Float32x4.extractLane(n, 3));

    });

    it("Float32x4 fromInt32x4 constructor", () => {
        let m = simd.Int32x4(1, 2, 3, 4);
        let n = simd.Float32x4.fromInt32x4(m);
        assert.equal(1.0, simd.Float32x4.extractLane(n, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(n, 1));
        assert.equal(3.0, simd.Float32x4.extractLane(n, 2));
        assert.equal(4.0, simd.Float32x4.extractLane(n, 3));

        m = simd.Int32x4(0, 2147483647, -2147483648, -1);
        n = simd.Float32x4.fromInt32x4(m);
        isPositiveZero(simd.Float32x4.extractLane(n, 0));
        assert.equal(2147483648, simd.Float32x4.extractLane(n, 1));
        assert.equal(-2147483648, simd.Float32x4.extractLane(n, 2));
        assert.equal(-1, simd.Float32x4.extractLane(n, 3));

    });

    it("Float32x4 fromFloat64x2Bits constructor", () => {
        const m = simd.Float64x2.fromInt32x4Bits(simd.Int32x4(0x3F800000, 0x40000000, 0x40400000, 0x40800000));
        const n = simd.Float32x4.fromFloat64x2Bits(m);
        assert.equal(1.0, simd.Float32x4.extractLane(n, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(n, 1));
        assert.equal(3.0, simd.Float32x4.extractLane(n, 2));
        assert.equal(4.0, simd.Float32x4.extractLane(n, 3));

    });

    it("Float32x4 fromInt32x4Bits constructor", () => {
        const m = simd.Int32x4(0x3F800000, 0x40000000, 0x40400000, 0x40800000);
        const n = simd.Float32x4.fromInt32x4Bits(m);
        assert.equal(1.0, simd.Float32x4.extractLane(n, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(n, 1));
        assert.equal(3.0, simd.Float32x4.extractLane(n, 2));
        assert.equal(4.0, simd.Float32x4.extractLane(n, 3));

    });

    it("Float32x4 fromInt16x8Bits constructor", () => {
        const m = simd.Int16x8(0x0000, 0x3F80, 0x0000, 0x4000, 0x0000, 0x4040, 0x0000, 0x4080);
        const n = simd.Float32x4.fromInt16x8Bits(m);
        assert.equal(1.0, simd.Float32x4.extractLane(n, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(n, 1));
        assert.equal(3.0, simd.Float32x4.extractLane(n, 2));
        assert.equal(4.0, simd.Float32x4.extractLane(n, 3));

    });

    it("Float32x4 fromInt8x16Bits constructor", () => {
        const m = simd.Int8x16(0x0, 0x0, 0x80, 0x3F, 0x0, 0x0, 0x00, 0x40, 0x00, 0x00, 0x40, 0x40, 0x00, 0x00, 0x80, 0x40);
        const n = simd.Float32x4.fromInt8x16Bits(m);
        assert.equal(1.0, simd.Float32x4.extractLane(n, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(n, 1));
        assert.equal(3.0, simd.Float32x4.extractLane(n, 2));
        assert.equal(4.0, simd.Float32x4.extractLane(n, 3));

    });

    it("Float32x4 extract lane", () => {
        const a = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        assert.equal(1.0, simd.Float32x4.extractLane(a, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(a, 1));
        assert.equal(3.0, simd.Float32x4.extractLane(a, 2));
        assert.equal(4.0, simd.Float32x4.extractLane(a, 3));

    });

    it("Float32x4 vector getters", () => {
        const a = simd.Float32x4(4.0, 3.0, 2.0, 1.0);
        const xxxx = simd.Float32x4.swizzle(a, 0, 0, 0, 0);
        const yyyy = simd.Float32x4.swizzle(a, 1, 1, 1, 1);
        const zzzz = simd.Float32x4.swizzle(a, 2, 2, 2, 2);
        const wwww = simd.Float32x4.swizzle(a, 3, 3, 3, 3);
        const wzyx = simd.Float32x4.swizzle(a, 3, 2, 1, 0);
        assert.equal(4.0, simd.Float32x4.extractLane(xxxx, 0));
        assert.equal(4.0, simd.Float32x4.extractLane(xxxx, 1));
        assert.equal(4.0, simd.Float32x4.extractLane(xxxx, 2));
        assert.equal(4.0, simd.Float32x4.extractLane(xxxx, 3));
        assert.equal(3.0, simd.Float32x4.extractLane(yyyy, 0));
        assert.equal(3.0, simd.Float32x4.extractLane(yyyy, 1));
        assert.equal(3.0, simd.Float32x4.extractLane(yyyy, 2));
        assert.equal(3.0, simd.Float32x4.extractLane(yyyy, 3));
        assert.equal(2.0, simd.Float32x4.extractLane(zzzz, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(zzzz, 1));
        assert.equal(2.0, simd.Float32x4.extractLane(zzzz, 2));
        assert.equal(2.0, simd.Float32x4.extractLane(zzzz, 3));
        assert.equal(1.0, simd.Float32x4.extractLane(wwww, 0));
        assert.equal(1.0, simd.Float32x4.extractLane(wwww, 1));
        assert.equal(1.0, simd.Float32x4.extractLane(wwww, 2));
        assert.equal(1.0, simd.Float32x4.extractLane(wwww, 3));
        assert.equal(1.0, simd.Float32x4.extractLane(wzyx, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(wzyx, 1));
        assert.equal(3.0, simd.Float32x4.extractLane(wzyx, 2));
        assert.equal(4.0, simd.Float32x4.extractLane(wzyx, 3));

    });

    it("Float32x4 abs", () => {
        const a = simd.Float32x4(-4.0, -3.0, -2.0, -1.0);
        let c = simd.Float32x4.abs(a);
        assert.equal(4.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(3.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(2.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 3));
        c = simd.Float32x4.abs(simd.Float32x4(4.0, 3.0, 2.0, 1.0));
        assert.equal(4.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(3.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(2.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 3));

        const d = simd.Float32x4(NaN, Infinity, 0.0, 1.0);
        const e = simd.Float32x4.abs(d);
        const f = simd.Float32x4(-NaN, -Infinity, -0.0, -1.0);
        const g = simd.Float32x4.abs(f);
        isNaN(simd.Float32x4.extractLane(e, 0));
        assert.equal(simd.Float32x4.extractLane(e, 1), Infinity);
        isPositiveZero(simd.Float32x4.extractLane(e, 2));
        assert.equal(simd.Float32x4.extractLane(e, 3), 1.0);
        isNaN(simd.Float32x4.extractLane(g, 0));
        assert.equal(simd.Float32x4.extractLane(g, 1), Infinity);
        isPositiveZero(simd.Float32x4.extractLane(g, 2));
        assert.equal(simd.Float32x4.extractLane(g, 3), 1.0);

    });

    it("Float32x4 neg", () => {
        const a = simd.Float32x4(-4.0, -3.0, -2.0, -1.0);
        let c = simd.Float32x4.neg(a);
        assert.equal(4.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(3.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(2.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 3));
        c = simd.Float32x4.neg(simd.Float32x4(4.0, 3.0, 2.0, 1.0));
        assert.equal(-4.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(-3.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(-2.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(-1.0, simd.Float32x4.extractLane(c, 3));

        const d = simd.Float32x4(Infinity, -Infinity, 0.0, -0.0);
        const f = simd.Float32x4.neg(d);
        assert.equal(-Infinity, simd.Float32x4.extractLane(f, 0));
        assert.equal(Infinity, simd.Float32x4.extractLane(f, 1));
        isNegativeZero(simd.Float32x4.extractLane(f, 2));
        isPositiveZero(simd.Float32x4.extractLane(f, 3));

        const g = simd.Float32x4.neg(simd.Float32x4.splat(NaN));
        isNaN(simd.Float32x4.extractLane(g, 0));

    });

    it("Float32x4 add", () => {
        const a = simd.Float32x4(4.0, 3.0, 2.0, 1.0);
        const b = simd.Float32x4(10.0, 20.0, 30.0, 40.0);
        const c = simd.Float32x4.add(a, b);
        assert.equal(14.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(23.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(32.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(41.0, simd.Float32x4.extractLane(c, 3));

    });

    it("Float32x4 sub", () => {
        const a = simd.Float32x4(4.0, 3.0, 2.0, 1.0);
        const b = simd.Float32x4(10.0, 20.0, 30.0, 40.0);
        const c = simd.Float32x4.sub(a, b);
        assert.equal(-6.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(-17.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(-28.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(-39.0, simd.Float32x4.extractLane(c, 3));

    });

    it("Float32x4 mul", () => {
        const a = simd.Float32x4(4.0, 3.0, 2.0, 1.0);
        const b = simd.Float32x4(10.0, 20.0, 30.0, 40.0);
        const c = simd.Float32x4.mul(a, b);
        assert.equal(40.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(60.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(60.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(40.0, simd.Float32x4.extractLane(c, 3));

    });

    it("Float32x4 div", () => {
        const a = simd.Float32x4(4.0, 9.0, 8.0, 1.0);
        const b = simd.Float32x4(2.0, 3.0, 1.0, 0.5);
        const c = simd.Float32x4.div(a, b);
        assert.equal(2.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(3.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(8.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(2.0, simd.Float32x4.extractLane(c, 3));

        const d = simd.Float32x4(1.0, 0.0, Infinity, NaN);
        const e = simd.Float32x4(Infinity, 0.0, Infinity, 1.0);
        const f = simd.Float32x4.div(d, e);
        isPositiveZero(simd.Float32x4.extractLane(f, 0));
        isNaN(simd.Float32x4.extractLane(f, 1));
        isNaN(simd.Float32x4.extractLane(f, 2));
        isNaN(simd.Float32x4.extractLane(f, 3));

        const g = simd.Float32x4(1.0, 1.0, -1.0, -1.0);
        const h = simd.Float32x4(0.0, -0.0, 0.0, -0.0);
        const i = simd.Float32x4.div(g, h);
        assert.equal(simd.Float32x4.extractLane(i, 0), Infinity);
        assert.equal(simd.Float32x4.extractLane(i, 1), -Infinity);
        assert.equal(simd.Float32x4.extractLane(i, 2), -Infinity);
        assert.equal(simd.Float32x4.extractLane(i, 3), Infinity);

    });

    it("Float32x4 min", () => {
        const a = simd.Float32x4(-20.0, 10.0, 30.0, 0.5);
        const lower = simd.Float32x4(2.0, 1.0, 50.0, 0.0);
        const c = simd.Float32x4.min(a, lower);
        assert.equal(-20.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(30.0, simd.Float32x4.extractLane(c, 2));
        isPositiveZero(simd.Float32x4.extractLane(c, 3));

        const x = simd.Float32x4(-0, 0, NaN, 0);
        const y = simd.Float32x4(0, -0, 0, NaN);
        const z = simd.Float32x4.min(x, y);
        isNegativeZero(simd.Float32x4.extractLane(z, 0));
        isNegativeZero(simd.Float32x4.extractLane(z, 1));
        isNaN(simd.Float32x4.extractLane(z, 2));
        isNaN(simd.Float32x4.extractLane(z, 3));

    });

    it("Float32x4 minNum", () => {
        const a = simd.Float32x4(-20.0, 10.0, 30.0, 0.5);
        const lower = simd.Float32x4(2.0, 1.0, 50.0, 0.0);
        const c = simd.Float32x4.minNum(a, lower);
        assert.equal(-20.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(30.0, simd.Float32x4.extractLane(c, 2));
        isPositiveZero(simd.Float32x4.extractLane(c, 3));

        const x = simd.Float32x4(-0, 0, NaN, 0);
        const y = simd.Float32x4(0, -0, 0, NaN);
        const z = simd.Float32x4.minNum(x, y);
        isNegativeZero(simd.Float32x4.extractLane(z, 0));
        isNegativeZero(simd.Float32x4.extractLane(z, 1));
        isPositiveZero(simd.Float32x4.extractLane(z, 2));
        isPositiveZero(simd.Float32x4.extractLane(z, 3));

    });

    it("Float32x4 min exceptions", () => {
        const ok = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        const notOk = 1;
        assert.throws(() => {
            simd.Float32x4.min(ok, notOk);
        });
        assert.throws(() => {
            simd.Float32x4.min(notOk, ok);
        });

    });

    it("Float32x4 max", () => {
        const a = simd.Float32x4(-20.0, 10.0, 30.0, 0.5);
        const upper = simd.Float32x4(2.5, 5.0, 55.0, 1.0);
        const c = simd.Float32x4.max(a, upper);
        assert.equal(2.5, simd.Float32x4.extractLane(c, 0));
        assert.equal(10.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(55.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 3));

        const x = simd.Float32x4(-0, 0, NaN, 0);
        const y = simd.Float32x4(0, -0, 0, NaN);
        const z = simd.Float32x4.max(x, y);
        isPositiveZero(simd.Float32x4.extractLane(z, 0));
        isPositiveZero(simd.Float32x4.extractLane(z, 1));
        isNaN(simd.Float32x4.extractLane(z, 2));
        isNaN(simd.Float32x4.extractLane(z, 3));

    });

    it("Float32x4 maxNum", () => {
        const a = simd.Float32x4(-20.0, 10.0, 30.0, 0.5);
        const upper = simd.Float32x4(2.5, 5.0, 55.0, 1.0);
        const c = simd.Float32x4.maxNum(a, upper);
        assert.equal(2.5, simd.Float32x4.extractLane(c, 0));
        assert.equal(10.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(55.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 3));

        const x = simd.Float32x4(-0, 0, NaN, 0);
        const y = simd.Float32x4(0, -0, 0, NaN);
        const z = simd.Float32x4.maxNum(x, y);
        isPositiveZero(simd.Float32x4.extractLane(z, 0));
        isPositiveZero(simd.Float32x4.extractLane(z, 1));
        isPositiveZero(simd.Float32x4.extractLane(z, 2));
        isPositiveZero(simd.Float32x4.extractLane(z, 3));

    });

    it("Float32x4 max exceptions", () => {
        const ok = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        const notOk = 1;
        assert.throws(() => {
            simd.Float32x4.max(ok, notOk);
        });
        assert.throws(() => {
            simd.Float32x4.max(notOk, ok);
        });

    });

    it("Float32x4 reciprocal approximation", () => {
        let a = simd.Float32x4(8.0, 4.0, 2.0, -2.0);
        let c = simd.Float32x4.reciprocalApproximation(a);
        almostEqual(0.125, simd.Float32x4.extractLane(c, 0));
        almostEqual(0.250, simd.Float32x4.extractLane(c, 1));
        almostEqual(0.5, simd.Float32x4.extractLane(c, 2));
        almostEqual(-0.5, simd.Float32x4.extractLane(c, 3));
        a = simd.Float32x4(NaN, Infinity, -Infinity, -0);
        c = simd.Float32x4.reciprocalApproximation(a);
        isNaN(simd.Float32x4.extractLane(c, 0));
        isPositiveZero(simd.Float32x4.extractLane(c, 1));
        isNegativeZero(simd.Float32x4.extractLane(c, 2));
        assert.equal(-Infinity, simd.Float32x4.extractLane(c, 3));
        a = simd.Float32x4(0, 2.3, -4.5, 7.8);
        c = simd.Float32x4.reciprocalApproximation(a);
        assert.equal(Infinity, simd.Float32x4.extractLane(c, 0));
        almostEqual(1 / simd.Float32x4.extractLane(a, 1), simd.Float32x4.extractLane(c, 1));
        almostEqual(1 / simd.Float32x4.extractLane(a, 2), simd.Float32x4.extractLane(c, 2));
        almostEqual(1 / simd.Float32x4.extractLane(a, 3), simd.Float32x4.extractLane(c, 3));

    });

    it("Float32x4 reciprocal sqrt approximation", () => {
        let a = simd.Float32x4(1.0, 0.25, 0.111111, 0.0625);
        let c = simd.Float32x4.reciprocalSqrtApproximation(a);
        almostEqual(1.0, simd.Float32x4.extractLane(c, 0));
        almostEqual(2.0, simd.Float32x4.extractLane(c, 1));
        almostEqual(3.0, simd.Float32x4.extractLane(c, 2));
        almostEqual(4.0, simd.Float32x4.extractLane(c, 3));
        a = simd.Float32x4(-Infinity, Infinity, NaN, 0);
        c = simd.Float32x4.reciprocalSqrtApproximation(a);
        isNaN(simd.Float32x4.extractLane(c, 0));
        isPositiveZero(simd.Float32x4.extractLane(c, 1));
        isNaN(simd.Float32x4.extractLane(c, 2));
        assert.equal(Infinity, simd.Float32x4.extractLane(c, 3));
        a = simd.Float32x4(-0, -1, 121, 144);
        c = simd.Float32x4.reciprocalSqrtApproximation(a);
        assert.equal(-Infinity, simd.Float32x4.extractLane(c, 0));
        isNaN(simd.Float32x4.extractLane(c, 1));
        almostEqual(1 / 11, simd.Float32x4.extractLane(c, 2));
        almostEqual(1 / 12, simd.Float32x4.extractLane(c, 3));

    });

    it("Float32x4 sqrt", () => {
        let a = simd.Float32x4(16.0, 9.0, 4.0, 1.0);
        let c = simd.Float32x4.sqrt(a);
        assert.equal(4.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(3.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(2.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 3));
        a = simd.Float32x4(0.0, -0.0, Infinity, -Infinity);
        c = simd.Float32x4.sqrt(a);
        isPositiveZero(simd.Float32x4.extractLane(c, 0));
        isNegativeZero(simd.Float32x4.extractLane(c, 1));
        assert.equal(Infinity, simd.Float32x4.extractLane(c, 2));
        isNaN(simd.Float32x4.extractLane(c, 3));
        a = simd.Float32x4(NaN, 2.0, 0.5, 121.0);
        c = simd.Float32x4.sqrt(a);
        isNaN(simd.Float32x4.extractLane(c, 0));
        assert.equal(Math.fround(Math.SQRT2), simd.Float32x4.extractLane(c, 1));
        assert.equal(Math.fround(Math.SQRT1_2), simd.Float32x4.extractLane(c, 2));
        assert.equal(11.0, simd.Float32x4.extractLane(c, 3));

    });

    it("Float32x4 shuffle", () => {
        const a = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        const b = simd.Float32x4(5.0, 6.0, 7.0, 8.0);
        const xyxy = simd.Float32x4.shuffle(a, b, 0, 1, 4, 5);
        const zwzw = simd.Float32x4.shuffle(a, b, 2, 3, 6, 7);
        const xxxx = simd.Float32x4.shuffle(a, b, 0, 0, 4, 4);
        assert.equal(1.0, simd.Float32x4.extractLane(xyxy, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(xyxy, 1));
        assert.equal(5.0, simd.Float32x4.extractLane(xyxy, 2));
        assert.equal(6.0, simd.Float32x4.extractLane(xyxy, 3));
        assert.equal(3.0, simd.Float32x4.extractLane(zwzw, 0));
        assert.equal(4.0, simd.Float32x4.extractLane(zwzw, 1));
        assert.equal(7.0, simd.Float32x4.extractLane(zwzw, 2));
        assert.equal(8.0, simd.Float32x4.extractLane(zwzw, 3));
        assert.equal(1.0, simd.Float32x4.extractLane(xxxx, 0));
        assert.equal(1.0, simd.Float32x4.extractLane(xxxx, 1));
        assert.equal(5.0, simd.Float32x4.extractLane(xxxx, 2));
        assert.equal(5.0, simd.Float32x4.extractLane(xxxx, 3));

        const c = simd.Float32x4.shuffle(a, b, 0, 4, 5, 1);
        const d = simd.Float32x4.shuffle(a, b, 2, 6, 3, 7);
        const e = simd.Float32x4.shuffle(a, b, 0, 4, 0, 4);
        assert.equal(1.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(5.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(6.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(2.0, simd.Float32x4.extractLane(c, 3));
        assert.equal(3.0, simd.Float32x4.extractLane(d, 0));
        assert.equal(7.0, simd.Float32x4.extractLane(d, 1));
        assert.equal(4.0, simd.Float32x4.extractLane(d, 2));
        assert.equal(8.0, simd.Float32x4.extractLane(d, 3));
        assert.equal(1.0, simd.Float32x4.extractLane(e, 0));
        assert.equal(5.0, simd.Float32x4.extractLane(e, 1));
        assert.equal(1.0, simd.Float32x4.extractLane(e, 2));
        assert.equal(5.0, simd.Float32x4.extractLane(e, 3));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Float32x4.shuffle(a, b, index, 0, 0, 0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(8);

    });

    it("Float32x4 replaceLane", () => {
        const a = simd.Float32x4(16.0, 9.0, 4.0, 1.0);
        let c = simd.Float32x4.replaceLane(a, 0, 20.0);
        assert.equal(20.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(9.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(4.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 3));
        c = simd.Float32x4.replaceLane(a, 1, 20.0);
        assert.equal(16.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(20.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(4.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 3));
        c = simd.Float32x4.replaceLane(a, 2, 20.0);
        assert.equal(16.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(9.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(20.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(1.0, simd.Float32x4.extractLane(c, 3));
        c = simd.Float32x4.replaceLane(a, 3, 20.0);
        assert.equal(16.0, simd.Float32x4.extractLane(c, 0));
        assert.equal(9.0, simd.Float32x4.extractLane(c, 1));
        assert.equal(4.0, simd.Float32x4.extractLane(c, 2));
        assert.equal(20.0, simd.Float32x4.extractLane(c, 3));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Float32x4.replaceLane(a, index, 0.0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(8);

    });

    it("Float32x4 comparisons", () => {
        const m = simd.Float32x4(1.0, 2.0, 0.1, 0.001);
        const n = simd.Float32x4(2.0, 2.0, 0.001, 0.1);
        let cmp;
        cmp = simd.Float32x4.lessThan(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Float32x4.lessThanOrEqual(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Float32x4.equal(m, n);
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Float32x4.notEqual(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Float32x4.greaterThanOrEqual(m, n);
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Float32x4.greaterThan(m, n);
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

        const o = simd.Float32x4(0.0, -0.0, 0.0, NaN);
        const p = simd.Float32x4(-0.0, 0.0, NaN, 0.0);
        cmp = simd.Float32x4.lessThan(o, p);
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Float32x4.lessThanOrEqual(o, p);
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Float32x4.equal(o, p);
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Float32x4.notEqual(o, p);
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Float32x4.greaterThanOrEqual(o, p);
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Float32x4.greaterThan(o, p);
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

    });

    it("Float32x4 select", () => {
        const m = simd.Bool32x4(true, true, false, false);
        const t = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        const f = simd.Float32x4(5.0, 6.0, 7.0, 8.0);
        const s = simd.Float32x4.select(m, t, f);
        assert.equal(1.0, simd.Float32x4.extractLane(s, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(s, 1));
        assert.equal(7.0, simd.Float32x4.extractLane(s, 2));
        assert.equal(8.0, simd.Float32x4.extractLane(s, 3));

    });

    it("Float32x4 Int32x4 bit conversion", () => {
        let m = simd.Int32x4(0x3F800000, 0x40000000, 0x40400000, 0x40800000);
        let n = simd.Float32x4.fromInt32x4Bits(m);
        assert.equal(1.0, simd.Float32x4.extractLane(n, 0));
        assert.equal(2.0, simd.Float32x4.extractLane(n, 1));
        assert.equal(3.0, simd.Float32x4.extractLane(n, 2));
        assert.equal(4.0, simd.Float32x4.extractLane(n, 3));
        n = simd.Float32x4(5.0, 6.0, 7.0, 8.0);
        m = simd.Int32x4.fromFloat32x4Bits(n);
        assert.equal(0x40A00000, simd.Int32x4.extractLane(m, 0));
        assert.equal(0x40C00000, simd.Int32x4.extractLane(m, 1));
        assert.equal(0x40E00000, simd.Int32x4.extractLane(m, 2));
        assert.equal(0x41000000, simd.Int32x4.extractLane(m, 3));
        // Flip sign using bit-wise operators.
        n = simd.Float32x4(9.0, 10.0, 11.0, 12.0);
        m = simd.Int32x4(0x80000000, 0x80000000, 0x80000000, 0x80000000);
        let nMask = simd.Int32x4.fromFloat32x4Bits(n);
        nMask = simd.Int32x4.xor(nMask, m); // flip sign.
        n = simd.Float32x4.fromInt32x4Bits(nMask);
        assert.equal(-9.0, simd.Float32x4.extractLane(n, 0));
        assert.equal(-10.0, simd.Float32x4.extractLane(n, 1));
        assert.equal(-11.0, simd.Float32x4.extractLane(n, 2));
        assert.equal(-12.0, simd.Float32x4.extractLane(n, 3));
        nMask = simd.Int32x4.fromFloat32x4Bits(n);
        nMask = simd.Int32x4.xor(nMask, m); // flip sign.
        n = simd.Float32x4.fromInt32x4Bits(nMask);
        assert.equal(9.0, simd.Float32x4.extractLane(n, 0));
        assert.equal(10.0, simd.Float32x4.extractLane(n, 1));
        assert.equal(11.0, simd.Float32x4.extractLane(n, 2));
        assert.equal(12.0, simd.Float32x4.extractLane(n, 3));
        // Should stay unmodified across bit conversions
        m = simd.Int32x4(0xFFFFFFFF, 0xFFFF0000, 0x80000000, 0x0);
        const m2 = simd.Int32x4.fromFloat32x4Bits(simd.Float32x4.fromInt32x4Bits(m));
        //equal(simd.Float32x4.extractLane(m, 0), m2SIMD.Float32x4.extractLane(m2, 0)); // FIXME: These get NaN-canonicalized
        //equal(simd.Float32x4.extractLane(m, 1), m2SIMD.Float32x4.extractLane(m2, 1)); // FIXME: These get NaN-canonicalized
        assert.equal(simd.Int32x4.extractLane(m, 2), simd.Int32x4.extractLane(m2, 2));
        assert.equal(simd.Int32x4.extractLane(m, 3), simd.Int32x4.extractLane(m2, 3));

    });

    it("Float32x4 Float64x2 conversion", () => {
        const m = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        const n = simd.Float64x2.fromFloat32x4(m);
        assert.equal(1.0, simd.Float64x2.extractLane(n, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(n, 1));

    });

    it("Float32x4 load", () => {
        const a = new Float32Array(8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 3; i++) {
            const v = simd.Float32x4.load(a, i);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Float32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Float32x4.extractLane(v, 2));
            assert.equal(i + 3, simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 overaligned load", () => {
        const b = new ArrayBuffer(40);
        const a = new Float32Array(b, 8);
        const af = new Float64Array(b, 8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 3; i += 2) {
            const v = simd.Float32x4.load(af, i / 2);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Float32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Float32x4.extractLane(v, 2));
            assert.equal(i + 3, simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 unaligned load", () => {
        const a = new Float32Array(8);
        const ai = new Int8Array(a.buffer);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }

        // Copy the bytes, offset by 1.
        const b = new Int8Array(ai.length + 1);
        for (let i = 0; i < ai.length; i++) {
            b[i + 1] = ai[i];
        }

        // Load the values unaligned.
        for (let i = 0; i < a.length - 3; i++) {
            const v = simd.Float32x4.load(b, i * 4 + 1);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Float32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Float32x4.extractLane(v, 2));
            assert.equal(i + 3, simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 load1", () => {
        const a = new Float32Array(8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length; i++) {
            const v = simd.Float32x4.load1(a, i);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            isPositiveZero(simd.Float32x4.extractLane(v, 1));
            isPositiveZero(simd.Float32x4.extractLane(v, 2));
            isPositiveZero(simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 overaligned load1", () => {
        const b = new ArrayBuffer(40);
        const a = new Float32Array(b, 8);
        const af = new Float64Array(b, 8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length; i += 2) {
            const v = simd.Float32x4.load1(af, i / 2);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            isPositiveZero(simd.Float32x4.extractLane(v, 1));
            isPositiveZero(simd.Float32x4.extractLane(v, 2));
            isPositiveZero(simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 unaligned load1", () => {
        const a = new Float32Array(8);
        const ai = new Int8Array(a.buffer);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }

        // Copy the bytes, offset by 1.
        const b = new Int8Array(ai.length + 1);
        for (let i = 0; i < ai.length; i++) {
            b[i + 1] = ai[i];
        }

        // Load the values unaligned.
        for (let i = 0; i < a.length; i++) {
            const v = simd.Float32x4.load1(b, i * 4 + 1);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            isPositiveZero(simd.Float32x4.extractLane(v, 1));
            isPositiveZero(simd.Float32x4.extractLane(v, 2));
            isPositiveZero(simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 load2", () => {
        const a = new Float32Array(8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 1; i++) {
            const v = simd.Float32x4.load2(a, i);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Float32x4.extractLane(v, 1));
            isPositiveZero(simd.Float32x4.extractLane(v, 2));
            isPositiveZero(simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 overaligned load2", () => {
        const b = new ArrayBuffer(40);
        const a = new Float32Array(b, 8);
        const af = new Float64Array(b, 8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 1; i += 2) {
            const v = simd.Float32x4.load2(af, i / 2);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Float32x4.extractLane(v, 1));
            isPositiveZero(simd.Float32x4.extractLane(v, 2));
            isPositiveZero(simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 unaligned load2", () => {
        const a = new Float32Array(8);
        const ai = new Int8Array(a.buffer);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }

        // Copy the bytes, offset by 1.
        const b = new Int8Array(ai.length + 1);
        for (let i = 0; i < ai.length; i++) {
            b[i + 1] = ai[i];
        }

        // Load the values unaligned.
        for (let i = 0; i < a.length - 1; i++) {
            const v = simd.Float32x4.load2(b, i * 4 + 1);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Float32x4.extractLane(v, 1));
            isPositiveZero(simd.Float32x4.extractLane(v, 2));
            isPositiveZero(simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 load3", () => {
        const a = new Float32Array(9);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 2; i++) {
            const v = simd.Float32x4.load3(a, i);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Float32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Float32x4.extractLane(v, 2));
            isPositiveZero(simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 overaligned load3", () => {
        const b = new ArrayBuffer(48);
        const a = new Float32Array(b, 8);
        const af = new Float64Array(b, 8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 2; i += 2) {
            const v = simd.Float32x4.load3(af, i / 2);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Float32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Float32x4.extractLane(v, 2));
            isPositiveZero(simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 unaligned load3", () => {
        const a = new Float32Array(9);
        const ai = new Int8Array(a.buffer);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }

        // Copy the bytes, offset by 1.
        const b = new Int8Array(ai.length + 1);
        for (let i = 0; i < ai.length; i++) {
            b[i + 1] = ai[i];
        }

        // Load the values unaligned.
        for (let i = 0; i < a.length - 2; i++) {
            const v = simd.Float32x4.load3(b, i * 4 + 1);
            assert.equal(i, simd.Float32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Float32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Float32x4.extractLane(v, 2));
            isPositiveZero(simd.Float32x4.extractLane(v, 3));
        }

    });

    it("Float32x4 store", () => {
        const a = new Float32Array(12);
        simd.Float32x4.store(a, 0, simd.Float32x4(0, 1, 2, 3));
        simd.Float32x4.store(a, 4, simd.Float32x4(4, 5, 6, 7));
        simd.Float32x4.store(a, 8, simd.Float32x4(8, 9, 10, 11));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

        const v = simd.Float32x4(0, 1, 2, 3);
        assert.equal(true, simd.Bool32x4.allTrue(simd.Float32x4.equal(simd.Float32x4.store(a, 0, v), v)));

    });

    it("Float32x4 overaligned store", () => {
        const b = new ArrayBuffer(56);
        const a = new Float32Array(b, 8);
        const af = new Float64Array(b, 8);
        simd.Float32x4.store(af, 0, simd.Float32x4(0, 1, 2, 3));
        simd.Float32x4.store(af, 2, simd.Float32x4(4, 5, 6, 7));
        simd.Float32x4.store(af, 4, simd.Float32x4(8, 9, 10, 11));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Float32x4 unaligned store", () => {
        const c = new Int8Array(48 + 1);
        simd.Float32x4.store(c, 0 + 1, simd.Float32x4(0, 1, 2, 3));
        simd.Float32x4.store(c, 16 + 1, simd.Float32x4(4, 5, 6, 7));
        simd.Float32x4.store(c, 32 + 1, simd.Float32x4(8, 9, 10, 11));

        // Copy the bytes, offset by 1.
        const b = new Int8Array(c.length - 1);
        for (let i = 1; i < c.length; i++) {
            b[i - 1] = c[i];
        }

        const a = new Float32Array(b.buffer);
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Float32x4 store1", () => {
        const a = new Float32Array(4);
        simd.Float32x4.store1(a, 0, simd.Float32x4(0, -1, -1, -1));
        simd.Float32x4.store1(a, 1, simd.Float32x4(1, -1, -1, -1));
        simd.Float32x4.store1(a, 2, simd.Float32x4(2, -1, -1, -1));
        simd.Float32x4.store1(a, 3, simd.Float32x4(3, -1, -1, -1));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

        const v = simd.Float32x4(0, 1, 2, 3);
        assert.equal(true, simd.Bool32x4.allTrue(simd.Float32x4.equal(simd.Float32x4.store1(a, 0, v), v)));

    });

    it("Float32x4 overaligned store1", () => {
        const b = new ArrayBuffer(24);
        const a = new Float32Array(b, 8);
        const af = new Float64Array(b, 8);
        a[1] = -2;
        a[3] = -2;
        simd.Float32x4.store1(af, 0, simd.Float32x4(0, -1, -1, -1));
        simd.Float32x4.store1(af, 1, simd.Float32x4(2, -1, -1, -1));
        for (let i = 0; i < a.length; i++) {
            if (i % 2 === 0) {
                assert.equal(i, a[i]);
            } else {
                assert.equal(-2, a[i]);
            }
        }

    });

    it("Float32x4 unaligned store1", () => {
        const c = new Int8Array(16 + 1);
        simd.Float32x4.store1(c, 0 + 1, simd.Float32x4(0, -1, -1, -1));
        simd.Float32x4.store1(c, 4 + 1, simd.Float32x4(1, -1, -1, -1));
        simd.Float32x4.store1(c, 8 + 1, simd.Float32x4(2, -1, -1, -1));
        simd.Float32x4.store1(c, 12 + 1, simd.Float32x4(3, -1, -1, -1));

        // Copy the bytes, offset by 1.
        const b = new Int8Array(c.length - 1);
        for (let i = 1; i < c.length; i++) {
            b[i - 1] = c[i];
        }

        const a = new Float32Array(b.buffer);
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Float32x4 store2", () => {
        const a = new Float32Array(8);
        simd.Float32x4.store2(a, 0, simd.Float32x4(0, 1, -1, -1));
        simd.Float32x4.store2(a, 2, simd.Float32x4(2, 3, -1, -1));
        simd.Float32x4.store2(a, 4, simd.Float32x4(4, 5, -1, -1));
        simd.Float32x4.store2(a, 6, simd.Float32x4(6, 7, -1, -1));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

        const v = simd.Float32x4(0, 1, 2, 3);
        assert.equal(true, simd.Bool32x4.allTrue(simd.Float32x4.equal(simd.Float32x4.store2(a, 0, v), v)));

    });

    it("Float32x4 overaligned store2", () => {
        const b = new ArrayBuffer(40);
        const a = new Float32Array(b, 8);
        const af = new Float64Array(b, 8);
        simd.Float32x4.store2(af, 0, simd.Float32x4(0, 1, -1, -1));
        simd.Float32x4.store2(af, 1, simd.Float32x4(2, 3, -1, -1));
        simd.Float32x4.store2(af, 2, simd.Float32x4(4, 5, -1, -1));
        simd.Float32x4.store2(af, 3, simd.Float32x4(6, 7, -1, -1));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Float32x4 unaligned store2", () => {
        const c = new Int8Array(32 + 1);
        simd.Float32x4.store2(c, 0 + 1, simd.Float32x4(0, 1, -1, -1));
        simd.Float32x4.store2(c, 8 + 1, simd.Float32x4(2, 3, -1, -1));
        simd.Float32x4.store2(c, 16 + 1, simd.Float32x4(4, 5, -1, -1));
        simd.Float32x4.store2(c, 24 + 1, simd.Float32x4(6, 7, -1, -1));

        // Copy the bytes, offset by 1.
        const b = new Int8Array(c.length - 1);
        for (let i = 1; i < c.length; i++) {
            b[i - 1] = c[i];
        }

        const a = new Float32Array(b.buffer);
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Float32x4 store3", () => {
        const a = new Float32Array(9);
        simd.Float32x4.store3(a, 0, simd.Float32x4(0, 1, 2, -1));
        simd.Float32x4.store3(a, 3, simd.Float32x4(3, 4, 5, -1));
        simd.Float32x4.store3(a, 6, simd.Float32x4(6, 7, 8, -1));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

        const v = simd.Float32x4(0, 1, 2, 3);
        assert.equal(true, simd.Bool32x4.allTrue(simd.Float32x4.equal(simd.Float32x4.store3(a, 0, v), v)));

    });

    it("Float32x4 overaligned store3", () => {
        const b = new ArrayBuffer(56);
        const a = new Float32Array(b, 8);
        const af = new Float64Array(b, 8);
        a[3] = -2;
        a[7] = -2;
        a[11] = -2;
        simd.Float32x4.store3(af, 0, simd.Float32x4(0, 1, 2, -1));
        simd.Float32x4.store3(af, 2, simd.Float32x4(4, 5, 6, -1));
        simd.Float32x4.store3(af, 4, simd.Float32x4(8, 9, 10, -1));
        for (let i = 0; i < a.length; i++) {
            if (i % 4 != 3) {
                assert.equal(i, a[i]);
            } else {
                assert.equal(-2, a[i]);
            }
        }

    });

    it("Float32x4 unaligned store3", () => {
        const c = new Int8Array(36 + 1);
        simd.Float32x4.store3(c, 0 + 1, simd.Float32x4(0, 1, 2, -1));
        simd.Float32x4.store3(c, 12 + 1, simd.Float32x4(3, 4, 5, -1));
        simd.Float32x4.store3(c, 24 + 1, simd.Float32x4(6, 7, 8, -1));

        // Copy the bytes, offset by 1.
        const b = new Int8Array(c.length - 1);
        for (let i = 1; i < c.length; i++) {
            b[i - 1] = c[i];
        }

        const a = new Float32Array(b.buffer);
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Float32x4 load exceptions", () => {
        const a = new Float32Array(8);
        assert.throws(() => {
            const f = simd.Float32x4.load(a, -1);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load(a, 5);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load(a.buffer, 1);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load(a, "a");
        });

    });

    it("Float32x4 load1 exceptions", () => {
        const a = new Float32Array(8);
        assert.throws(() => {
            const f = simd.Float32x4.load1(a, -1);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load1(a, 8);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load1(a.buffer, 1);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load1(a, "a");
        });

    });

    it("Float32x4 load2 exceptions", () => {
        const a = new Float32Array(8);
        assert.throws(() => {
            const f = simd.Float32x4.load2(a, -1);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load2(a, 7);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load2(a.buffer, 1);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load2(a, "a");
        });

    });

    it("Float32x4 load3 exceptions", () => {
        const a = new Float32Array(8);
        assert.throws(() => {
            const f = simd.Float32x4.load3(a, -1);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load3(a, 6);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load3(a.buffer, 1);
        });
        assert.throws(() => {
            const f = simd.Float32x4.load3(a, "a");
        });

    });

    it("Float32x4 store exceptions", () => {
        const a = new Float32Array(8);
        const f = simd.Float32x4(1, 2, 3, 4);
        const i = simd.Int32x4(1, 2, 3, 4);
        assert.throws(() => {
            simd.Float32x4.store(a, -1, f);
        });
        assert.throws(() => {
            simd.Float32x4.store(a, 5, f);
        });
        assert.throws(() => {
            simd.Float32x4.store(a.buffer, 1, f);
        });
        assert.throws(() => {
            simd.Float32x4.store(a, "a", f);
        });
        assert.throws(() => {
            simd.Float32x4.store(a, 1, i);
        });

    });

    it("Float32x4 store1 exceptions", () => {
        const a = new Float32Array(8);
        const f = simd.Float32x4(1, 2, 3, 4);
        const i = simd.Int32x4(1, 2, 3, 4);
        assert.throws(() => {
            simd.Float32x4.store1(a, -1, f);
        });
        assert.throws(() => {
            simd.Float32x4.store1(a, 8, f);
        });
        assert.throws(() => {
            simd.Float32x4.store1(a.buffer, 1, f);
        });
        assert.throws(() => {
            simd.Float32x4.store1(a, "a", f);
        });
        assert.throws(() => {
            simd.Float32x4.store1(a, 1, i);
        });

    });

    it("Float32x4 store2 exceptions", () => {
        const a = new Float32Array(8);
        const f = simd.Float32x4(1, 2, 3, 4);
        const i = simd.Int32x4(1, 2, 3, 4);
        assert.throws(() => {
            simd.Float32x4.store2(a, -1, f);
        });
        assert.throws(() => {
            simd.Float32x4.store2(a, 7, f);
        });
        assert.throws(() => {
            simd.Float32x4.store2(a.buffer, 1, f);
        });
        assert.throws(() => {
            simd.Float32x4.store2(a, "a", f);
        });
        assert.throws(() => {
            simd.Float32x4.store2(a, 1, i);
        });

    });

    it("Float32x4 store3 exceptions", () => {
        const a = new Float32Array(8);
        const f = simd.Float32x4(1, 2, 3, 4);
        const i = simd.Int32x4(1, 2, 3, 4);
        assert.throws(() => {
            simd.Float32x4.store3(a, -1, f);
        });
        assert.throws(() => {
            simd.Float32x4.store3(a, 6, f);
        });
        assert.throws(() => {
            simd.Float32x4.store3(a.buffer, 1, f);
        });
        assert.throws(() => {
            simd.Float32x4.store3(a, "a", f);
        });
        assert.throws(() => {
            simd.Float32x4.store3(a, 1, i);
        });

    });

    it("Float64x2 constructor", () => {
        assert.equal("function", typeof simd.Float64x2);
        let m = simd.Float64x2(1.0, 2.0);
        assert.equal(1.0, simd.Float64x2.extractLane(m, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(m, 1));

        m = simd.Float64x2("hello", "world");
        isNaN(simd.Float64x2.extractLane(m, 0));
        isNaN(simd.Float64x2.extractLane(m, 1));

    });

    it("Float64x2 splat constructor", () => {
        assert.equal("function", typeof simd.Float64x2.splat);
        const m = simd.Float64x2.splat(3.0);
        assert.equal(3.0, simd.Float64x2.extractLane(m, 0));
        assert.equal(simd.Float64x2.extractLane(m, 0), simd.Float64x2.extractLane(m, 1));

    });

    it("Float64x2 fromFloat32x4 constructor", () => {
        const m = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        const n = simd.Float64x2.fromFloat32x4(m);
        assert.equal(1.0, simd.Float64x2.extractLane(n, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(n, 1));

    });

    it("Float64x2 fromInt32x4 constructor", () => {
        const m = simd.Int32x4(1, 2, 3, 4);
        const n = simd.Float64x2.fromInt32x4(m);
        assert.equal(1.0, simd.Float64x2.extractLane(n, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(n, 1));

    });

    it("Float64x2 fromFloat32x4Bits constructor", () => {
        const m = simd.Float32x4.fromInt32x4Bits(simd.Int32x4(0x00000000, 0x3ff00000, 0x0000000, 0x40000000));
        const n = simd.Float64x2.fromFloat32x4Bits(m);
        assert.equal(1.0, simd.Float64x2.extractLane(n, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(n, 1));

    });

    it("Float64x2 fromInt32x4Bits constructor", () => {
        const m = simd.Int32x4(0x00000000, 0x3ff00000, 0x00000000, 0x40000000);
        const n = simd.Float64x2.fromInt32x4Bits(m);
        assert.equal(1.0, simd.Float64x2.extractLane(n, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(n, 1));

    });

    it("Float64x2 fromInt16x8Bits constructor", () => {
        const m = simd.Int16x8(0x0000, 0x0000, 0x0000, 0x3ff0, 0x0000, 0x0000, 0x0000, 0x4000);
        const n = simd.Float64x2.fromInt16x8Bits(m);
        assert.equal(1.0, simd.Float64x2.extractLane(n, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(n, 1));

    });

    it("Float64x2 fromInt8x16Bits constructor", () => {
        const m = simd.Int8x16(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40);
        const n = simd.Float64x2.fromInt8x16Bits(m);
        assert.equal(1.0, simd.Float64x2.extractLane(n, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(n, 1));

    });

    it("Float64x2 scalar getters", () => {
        const m = simd.Float64x2(1.0, 2.0);
        assert.equal(1.0, simd.Float64x2.extractLane(m, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(m, 1));

    });

    it("Float64x2 abs", () => {
        const a = simd.Float64x2(-2.0, -1.0);
        let c = simd.Float64x2.abs(a);
        assert.equal(2.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(1.0, simd.Float64x2.extractLane(c, 1));
        c = simd.Float64x2.abs(simd.Float64x2(2.0, 1.0));
        assert.equal(2.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(1.0, simd.Float64x2.extractLane(c, 1));

        const d0 = simd.Float64x2(NaN, Infinity);
        const d1 = simd.Float64x2(0.0, 1.0);
        const e0 = simd.Float64x2.abs(d0);
        const e1 = simd.Float64x2.abs(d1);
        const f0 = simd.Float64x2(-NaN, -Infinity);
        const f1 = simd.Float64x2(-0.0, -1.0);
        const g0 = simd.Float64x2.abs(f0);
        const g1 = simd.Float64x2.abs(f1);
        isNaN(simd.Float64x2.extractLane(e0, 0));
        assert.equal(simd.Float64x2.extractLane(e0, 1), Infinity);
        isPositiveZero(simd.Float64x2.extractLane(e1, 0), 0.0);
        assert.equal(simd.Float64x2.extractLane(e1, 1), 1.0);
        isNaN(simd.Float64x2.extractLane(g0, 0));
        assert.equal(simd.Float64x2.extractLane(g0, 1), Infinity);
        isPositiveZero(simd.Float64x2.extractLane(g1, 0));
        assert.equal(simd.Float64x2.extractLane(g1, 1), 1.0);

    });

    it("Float64x2 neg", () => {
        const a = simd.Float64x2(-2.0, -1.0);
        let c = simd.Float64x2.neg(a);
        assert.equal(2.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(1.0, simd.Float64x2.extractLane(c, 1));
        c = simd.Float64x2.neg(simd.Float64x2(2.0, 1.0));
        assert.equal(-2.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(-1.0, simd.Float64x2.extractLane(c, 1));

        const d0 = simd.Float64x2(Infinity, -Infinity);
        const d1 = simd.Float64x2(0.0, -0.0);
        const f0 = simd.Float64x2.neg(d0);
        const f1 = simd.Float64x2.neg(d1);
        assert.equal(-Infinity, simd.Float64x2.extractLane(f0, 0));
        assert.equal(Infinity, simd.Float64x2.extractLane(f0, 1));
        isNegativeZero(simd.Float64x2.extractLane(f1, 0));
        isPositiveZero(simd.Float64x2.extractLane(f1, 1));

        const g = simd.Float64x2.neg(simd.Float64x2.splat(NaN));
        isNaN(simd.Float64x2.extractLane(g, 0));

    });

    it("Float64x2 add", () => {
        const a = simd.Float64x2(2.0, 1.0);
        const b = simd.Float64x2(10.0, 20.0);
        const c = simd.Float64x2.add(a, b);
        assert.equal(12.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(21.0, simd.Float64x2.extractLane(c, 1));

    });

    it("Float64x2 sub", () => {
        const a = simd.Float64x2(2.0, 1.0);
        const b = simd.Float64x2(10.0, 20.0);
        const c = simd.Float64x2.sub(a, b);
        assert.equal(-8.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(-19.0, simd.Float64x2.extractLane(c, 1));

    });

    it("Float64x2 mul", () => {
        const a = simd.Float64x2(2.0, 1.0);
        const b = simd.Float64x2(10.0, 20.0);
        const c = simd.Float64x2.mul(a, b);
        assert.equal(20.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(20.0, simd.Float64x2.extractLane(c, 1));

    });

    it("Float64x2 div", () => {
        const a = simd.Float64x2(4.0, 9.0);
        const b = simd.Float64x2(2.0, 3.0);
        const c = simd.Float64x2.div(a, b);
        assert.equal(2.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(3.0, simd.Float64x2.extractLane(c, 1));

        const d0 = simd.Float64x2(1.0, 0.0);
        const d1 = simd.Float64x2(Infinity, NaN);
        const e0 = simd.Float64x2(0.0, 0.0);
        const e1 = simd.Float64x2(Infinity, 1.0);
        const f0 = simd.Float64x2.div(d0, e0);
        const f1 = simd.Float64x2.div(d1, e1);
        assert.equal(simd.Float64x2.extractLane(f0, 0), Infinity);
        isNaN(simd.Float64x2.extractLane(f0, 1));
        isNaN(simd.Float64x2.extractLane(f1, 0));
        isNaN(simd.Float64x2.extractLane(f1, 1));

        const g0 = simd.Float64x2(1.0, 1.0);
        const g1 = simd.Float64x2(-1.0, -1.0);
        const h0 = simd.Float64x2(0.0, -0.0);
        const h1 = simd.Float64x2(0.0, -0.0);
        const i0 = simd.Float64x2.div(g0, h0);
        const i1 = simd.Float64x2.div(g1, h1);
        assert.equal(simd.Float64x2.extractLane(i0, 0), Infinity);
        assert.equal(simd.Float64x2.extractLane(i0, 1), -Infinity);
        assert.equal(simd.Float64x2.extractLane(i1, 0), -Infinity);
        assert.equal(simd.Float64x2.extractLane(i1, 1), Infinity);

    });

    it("Float64x2 min", () => {
        const a = simd.Float64x2(-20.0, 10.0);
        const lower = simd.Float64x2(2.0, 1.0);
        const c = simd.Float64x2.min(a, lower);
        assert.equal(-20.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(1.0, simd.Float64x2.extractLane(c, 1));

        let x = simd.Float64x2(-0, 0);
        let y = simd.Float64x2(0, -0);
        let z = simd.Float64x2.min(x, y);
        isNegativeZero(simd.Float64x2.extractLane(z, 0));
        isNegativeZero(simd.Float64x2.extractLane(z, 1));
        x = simd.Float64x2(NaN, 0);
        y = simd.Float64x2(0, NaN);
        z = simd.Float64x2.min(x, y);
        isNaN(simd.Float64x2.extractLane(z, 0));
        isNaN(simd.Float64x2.extractLane(z, 1));

    });

    it("Float64x2 minNum", () => {
        const a = simd.Float64x2(-20.0, 10.0);
        const lower = simd.Float64x2(2.0, 1.0);
        const c = simd.Float64x2.minNum(a, lower);
        assert.equal(-20.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(1.0, simd.Float64x2.extractLane(c, 1));

        let x = simd.Float64x2(-0, 0);
        let y = simd.Float64x2(0, -0);
        let z = simd.Float64x2.minNum(x, y);
        isNegativeZero(simd.Float64x2.extractLane(z, 0));
        isNegativeZero(simd.Float64x2.extractLane(z, 1));
        x = simd.Float64x2(NaN, 0);
        y = simd.Float64x2(0, NaN);
        z = simd.Float64x2.minNum(x, y);
        isPositiveZero(simd.Float64x2.extractLane(z, 0));
        isPositiveZero(simd.Float64x2.extractLane(z, 1));

    });

    it("Float64x2 min exceptions", () => {
        const ok = simd.Float64x2(1.0, 2.0);
        const notOk = 1;
        assert.throws(() => {
            simd.Float64x2.min(ok, notOk);
        });
        assert.throws(() => {
            simd.Float64x2.min(notOk, ok);
        });

    });

    it("Float64x2 max", () => {
        const a = simd.Float64x2(-20.0, 10.0);
        const upper = simd.Float64x2(2.5, 5.0);
        const c = simd.Float64x2.max(a, upper);
        assert.equal(2.5, simd.Float64x2.extractLane(c, 0));
        assert.equal(10.0, simd.Float64x2.extractLane(c, 1));

        let x = simd.Float64x2(-0, 0);
        let y = simd.Float64x2(0, -0);
        let z = simd.Float64x2.max(x, y);
        isPositiveZero(simd.Float64x2.extractLane(z, 0));
        isPositiveZero(simd.Float64x2.extractLane(z, 1));
        x = simd.Float64x2(NaN, 0);
        y = simd.Float64x2(0, NaN);
        z = simd.Float64x2.max(x, y);
        isNaN(simd.Float64x2.extractLane(z, 0));
        isNaN(simd.Float64x2.extractLane(z, 1));

    });

    it("Float64x2 maxNum", () => {
        const a = simd.Float64x2(-20.0, 10.0);
        const upper = simd.Float64x2(2.5, 5.0);
        const c = simd.Float64x2.maxNum(a, upper);
        assert.equal(2.5, simd.Float64x2.extractLane(c, 0));
        assert.equal(10.0, simd.Float64x2.extractLane(c, 1));

        let x = simd.Float64x2(-0, 0);
        let y = simd.Float64x2(0, -0);
        let z = simd.Float64x2.maxNum(x, y);
        isPositiveZero(simd.Float64x2.extractLane(z, 0));
        isPositiveZero(simd.Float64x2.extractLane(z, 1));
        x = simd.Float64x2(NaN, 0);
        y = simd.Float64x2(0, NaN);
        z = simd.Float64x2.maxNum(x, y);
        isPositiveZero(simd.Float64x2.extractLane(z, 0));
        isPositiveZero(simd.Float64x2.extractLane(z, 1));

    });

    it("Float64x2 max exceptions", () => {
        const ok = simd.Float64x2(1.0, 2.0);
        const notOk = 1;
        assert.throws(() => {
            simd.Float64x2.max(ok, notOk);
        });
        assert.throws(() => {
            simd.Float64x2.max(notOk, ok);
        });

    });

    it("Float64x2 reciprocal approximation", () => {
        let a = simd.Float64x2(2.0, -2.0);
        let c = simd.Float64x2.reciprocalApproximation(a);
        almostEqual(0.5, simd.Float64x2.extractLane(c, 0));
        almostEqual(-0.5, simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(NaN, Infinity);
        c = simd.Float64x2.reciprocalApproximation(a);
        isNaN(simd.Float64x2.extractLane(c, 0));
        isPositiveZero(simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(-Infinity, -0);
        c = simd.Float64x2.reciprocalApproximation(a);
        isNegativeZero(simd.Float64x2.extractLane(c, 0));
        assert.equal(-Infinity, simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(0, 2.3);
        c = simd.Float64x2.reciprocalApproximation(a);
        assert.equal(Infinity, simd.Float64x2.extractLane(c, 0));
        almostEqual(1 / simd.Float64x2.extractLane(a, 1), simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(-4.5, 7.8);
        c = simd.Float64x2.reciprocalApproximation(a);
        almostEqual(1 / simd.Float64x2.extractLane(a, 0), simd.Float64x2.extractLane(c, 0));
        almostEqual(1 / simd.Float64x2.extractLane(a, 1), simd.Float64x2.extractLane(c, 1));

    });

    it("Float64x2 reciprocal sqrt approximation", () => {
        let a = simd.Float64x2(1.0, 0.25);
        let c = simd.Float64x2.reciprocalSqrtApproximation(a);
        almostEqual(1.0, simd.Float64x2.extractLane(c, 0));
        almostEqual(2.0, simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(-Infinity, Infinity);
        c = simd.Float64x2.reciprocalSqrtApproximation(a);
        isNaN(simd.Float64x2.extractLane(c, 0));
        isPositiveZero(simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(NaN, 0);
        c = simd.Float64x2.reciprocalSqrtApproximation(a);
        isNaN(simd.Float64x2.extractLane(c, 0));
        assert.equal(Infinity, simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(-0, -1);
        c = simd.Float64x2.reciprocalSqrtApproximation(a);
        assert.equal(-Infinity, simd.Float64x2.extractLane(c, 0));
        isNaN(simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(121, 144);
        c = simd.Float64x2.reciprocalSqrtApproximation(a);
        almostEqual(1 / 11, simd.Float64x2.extractLane(c, 0));
        almostEqual(1 / 12, simd.Float64x2.extractLane(c, 1));

    });

    it("Float64x2 sqrt", () => {
        let a = simd.Float64x2(16.0, 9.0);
        let c = simd.Float64x2.sqrt(a);
        assert.equal(4.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(3.0, simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(0.0, -0.0);
        c = simd.Float64x2.sqrt(a);
        isPositiveZero(simd.Float64x2.extractLane(c, 0));
        isNegativeZero(simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(Infinity, -Infinity);
        c = simd.Float64x2.sqrt(a);
        assert.equal(Infinity, simd.Float64x2.extractLane(c, 0));
        isNaN(simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(NaN, 2.0);
        c = simd.Float64x2.sqrt(a);
        isNaN(simd.Float64x2.extractLane(c, 0));
        assert.equal(Math.SQRT2, simd.Float64x2.extractLane(c, 1));
        a = simd.Float64x2(0.5, 121.0);
        c = simd.Float64x2.sqrt(a);
        assert.equal(Math.SQRT1_2, simd.Float64x2.extractLane(c, 0));
        assert.equal(11.0, simd.Float64x2.extractLane(c, 1));

    });

    it("Float64x2 swizzle", () => {
        const a = simd.Float64x2(1.0, 2.0);
        const xx = simd.Float64x2.swizzle(a, 0, 0);
        const xy = simd.Float64x2.swizzle(a, 0, 1);
        const yx = simd.Float64x2.swizzle(a, 1, 0);
        const yy = simd.Float64x2.swizzle(a, 1, 1);
        assert.equal(1.0, simd.Float64x2.extractLane(xx, 0));
        assert.equal(1.0, simd.Float64x2.extractLane(xx, 1));
        assert.equal(1.0, simd.Float64x2.extractLane(xy, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(xy, 1));
        assert.equal(2.0, simd.Float64x2.extractLane(yx, 0));
        assert.equal(1.0, simd.Float64x2.extractLane(yx, 1));
        assert.equal(2.0, simd.Float64x2.extractLane(yy, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(yy, 1));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Float64x2.swizzle(a, index, 0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(2);

    });

    it("Float64x2 shuffle", () => {
        const a = simd.Float64x2(1.0, 2.0);
        const b = simd.Float64x2(3.0, 4.0);
        const xx = simd.Float64x2.shuffle(a, b, 0, 2);
        const xy = simd.Float64x2.shuffle(a, b, 0, 3);
        const yx = simd.Float64x2.shuffle(a, b, 1, 0);
        const yy = simd.Float64x2.shuffle(a, b, 1, 3);
        assert.equal(1.0, simd.Float64x2.extractLane(xx, 0));
        assert.equal(3.0, simd.Float64x2.extractLane(xx, 1));
        assert.equal(1.0, simd.Float64x2.extractLane(xy, 0));
        assert.equal(4.0, simd.Float64x2.extractLane(xy, 1));
        assert.equal(2.0, simd.Float64x2.extractLane(yx, 0));
        assert.equal(1.0, simd.Float64x2.extractLane(yx, 1));
        assert.equal(2.0, simd.Float64x2.extractLane(yy, 0));
        assert.equal(4.0, simd.Float64x2.extractLane(yy, 1));

        const c = simd.Float64x2.shuffle(a, b, 1, 0);
        const d = simd.Float64x2.shuffle(a, b, 3, 2);
        const e = simd.Float64x2.shuffle(a, b, 0, 1);
        const f = simd.Float64x2.shuffle(a, b, 0, 2);
        assert.equal(2.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(1.0, simd.Float64x2.extractLane(c, 1));
        assert.equal(4.0, simd.Float64x2.extractLane(d, 0));
        assert.equal(3.0, simd.Float64x2.extractLane(d, 1));
        assert.equal(1.0, simd.Float64x2.extractLane(e, 0));
        assert.equal(2.0, simd.Float64x2.extractLane(e, 1));
        assert.equal(1.0, simd.Float64x2.extractLane(f, 0));
        assert.equal(3.0, simd.Float64x2.extractLane(f, 1));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Float64x2.shuffle(a, b, index, 0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(4);

    });

    it("Float64x2 replaceLane", () => {
        const a = simd.Float64x2(16.0, 9.0);
        let c = simd.Float64x2.replaceLane(a, 0, 20.0);
        assert.equal(20.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(9.0, simd.Float64x2.extractLane(c, 1));
        c = simd.Float64x2.replaceLane(a, 1, 20.0);
        assert.equal(16.0, simd.Float64x2.extractLane(c, 0));
        assert.equal(20.0, simd.Float64x2.extractLane(c, 1));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Float64x2.replaceLane(a, index, 0.0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(8);

    });

    it("Float64x2 comparisons", () => {
        const m = simd.Float64x2(1.0, 2.0);
        const n = simd.Float64x2(2.0, 2.0);
        var o = simd.Float64x2(0.1, 0.001);
        var p = simd.Float64x2(0.001, 0.1);

        let cmp;
        cmp = simd.Float64x2.lessThan(m, n);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.lessThan(o, p);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Float64x2.lessThanOrEqual(m, n);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.lessThanOrEqual(o, p);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Float64x2.equal(m, n);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.equal(o, p);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Float64x2.notEqual(m, n);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.notEqual(o, p);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Float64x2.greaterThanOrEqual(m, n);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.greaterThanOrEqual(o, p);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Float64x2.greaterThan(m, n);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.greaterThan(o, p);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));

        var o = simd.Float64x2(0.0, -0.0);
        var p = simd.Float64x2(-0.0, 0.0);
        const q = simd.Float64x2(0.0, NaN);
        const r = simd.Float64x2(NaN, 0.0);
        cmp = simd.Float64x2.lessThan(o, p);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.lessThan(q, r);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Float64x2.lessThanOrEqual(o, p);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.lessThanOrEqual(q, r);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Float64x2.equal(o, p);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.equal(q, r);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Float64x2.notEqual(o, p);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.notEqual(q, r);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Float64x2.greaterThanOrEqual(o, p);
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(true, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.greaterThanOrEqual(q, r);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));

        cmp = simd.Float64x2.greaterThan(o, p);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));
        cmp = simd.Float64x2.greaterThan(q, r);
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 0));
        assert.equal(false, simd.Bool64x2.extractLane(cmp, 1));

    });

    it("Float64x2 select", () => {
        const m = simd.Bool64x2(true, false);
        const t = simd.Float64x2(1.0, 2.0);
        const f = simd.Float64x2(3.0, 4.0);
        const s = simd.Float64x2.select(m, t, f);
        assert.equal(1.0, simd.Float64x2.extractLane(s, 0));
        assert.equal(4.0, simd.Float64x2.extractLane(s, 1));

    });

    it("Float64x2 load", () => {
        const a = new Float64Array(8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 1; i++) {
            const v = simd.Float64x2.load(a, i);
            assert.equal(i, simd.Float64x2.extractLane(v, 0));
            assert.equal(i + 1, simd.Float64x2.extractLane(v, 1));
        }

    });

    it("Float64x2 unaligned load", () => {
        const a = new Float64Array(8);
        const ai = new Int8Array(a.buffer);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }

        // Copy the bytes, offset by 1.
        const b = new Int8Array(ai.length + 1);
        for (let i = 0; i < ai.length; i++) {
            b[i + 1] = ai[i];
        }

        // Load the values unaligned.
        for (let i = 0; i < a.length - 1; i++) {
            const v = simd.Float64x2.load(b, i * 8 + 1);
            assert.equal(i, simd.Float64x2.extractLane(v, 0));
            assert.equal(i + 1, simd.Float64x2.extractLane(v, 1));
        }

    });

    it("Float64x2 load1", () => {
        const a = new Float64Array(8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length; i++) {
            const v = simd.Float64x2.load1(a, i);
            assert.equal(i, simd.Float64x2.extractLane(v, 0));
            isPositiveZero(simd.Float64x2.extractLane(v, 1));
        }

    });

    it("Float64x2 unaligned load1", () => {
        const a = new Float64Array(8);
        const ai = new Int8Array(a.buffer);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }

        // Copy the bytes, offset by 1.
        const b = new Int8Array(ai.length + 1);
        for (let i = 0; i < ai.length; i++) {
            b[i + 1] = ai[i];
        }

        // Copy the values unaligned.
        for (let i = 0; i < a.length; i++) {
            const v = simd.Float64x2.load1(b, i * 8 + 1);
            assert.equal(i, simd.Float64x2.extractLane(v, 0));
            isPositiveZero(simd.Float64x2.extractLane(v, 1));
        }

    });

    it("Float64x2 store", () => {
        const a = new Float64Array(6);
        simd.Float64x2.store(a, 0, simd.Float64x2(0, 1));
        simd.Float64x2.store(a, 2, simd.Float64x2(2, 3));
        simd.Float64x2.store(a, 4, simd.Float64x2(4, 5));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

        const v = simd.Float64x2(0, 1);
        assert.equal(true, simd.Bool64x2.allTrue(simd.Float64x2.equal(simd.Float64x2.store(a, 0, v), v)));

    });

    it("Float64x2 unaligned store", () => {
        const c = new Int8Array(48 + 1);
        simd.Float64x2.store(c, 0 + 1, simd.Float64x2(0, 1));
        simd.Float64x2.store(c, 16 + 1, simd.Float64x2(2, 3));
        simd.Float64x2.store(c, 32 + 1, simd.Float64x2(4, 5));

        // Copy the bytes, offset by 1.
        const b = new Int8Array(c.length - 1);
        for (let i = 1; i < c.length; i++) {
            b[i - 1] = c[i];
        }

        const a = new Float64Array(b.buffer);
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Float64x2 store1", () => {
        const a = new Float64Array(4);
        simd.Float64x2.store1(a, 0, simd.Float64x2(0, -1));
        simd.Float64x2.store1(a, 1, simd.Float64x2(1, -1));
        simd.Float64x2.store1(a, 2, simd.Float64x2(2, -1));
        simd.Float64x2.store1(a, 3, simd.Float64x2(3, -1));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

        const v = simd.Float64x2(0, 1);
        assert.equal(true, simd.Bool64x2.allTrue(simd.Float64x2.equal(simd.Float64x2.store1(a, 0, v), v)));

    });

    it("Float64x2 unaligned store1", () => {
        const c = new Int8Array(32 + 1);
        simd.Float64x2.store1(c, 0 + 1, simd.Float64x2(0, -1));
        simd.Float64x2.store1(c, 8 + 1, simd.Float64x2(1, -1));
        simd.Float64x2.store1(c, 16 + 1, simd.Float64x2(2, -1));
        simd.Float64x2.store1(c, 24 + 1, simd.Float64x2(3, -1));

        // Copy the bytes, offset by 1.
        const b = new Int8Array(c.length - 1);
        for (let i = 1; i < c.length; i++) {
            b[i - 1] = c[i];
        }

        const a = new Float64Array(b.buffer);
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Float64x2 load exceptions", () => {
        const a = new Float64Array(8);
        assert.throws(() => {
            const f = simd.Float64x2.load(a, -1);
        });
        assert.throws(() => {
            const f = simd.Float64x2.load(a, 7);
        });
        assert.throws(() => {
            const f = simd.Float64x2.load(a.buffer, 1);
        });
        assert.throws(() => {
            const f = simd.Float64x2.load(a, "a");
        });

    });

    it("Float64x2 load1 exceptions", () => {
        const a = new Float64Array(8);
        assert.throws(() => {
            const f = simd.Float64x2.load1(a, -1);
        });
        assert.throws(() => {
            const f = simd.Float64x2.load1(a, 8);
        });
        assert.throws(() => {
            const f = simd.Float64x2.load1(a.buffer, 1);
        });
        assert.throws(() => {
            const f = simd.Float64x2.load1(a, "a");
        });

    });

    it("Float64x2 store exceptions", () => {
        const a = new Float64Array(8);
        const f = simd.Float64x2(1, 2);
        const i = simd.Int32x4(1, 2, 3, 4);
        assert.throws(() => {
            simd.Float64x2.store(a, -1, f);
        });
        assert.throws(() => {
            simd.Float64x2.store(a, 7, f);
        });
        assert.throws(() => {
            simd.Float64x2.store(a.buffer, 1, f);
        });
        assert.throws(() => {
            simd.Float64x2.store(a, "a", f);
        });
        assert.throws(() => {
            simd.Float64x2.store(a, 1, i);
        });

    });

    it("Float64x2 store1 exceptions", () => {
        const a = new Float64Array(8);
        const f = simd.Float64x2(1, 2);
        const i = simd.Int32x4(1, 2, 3, 4);
        assert.throws(() => {
            simd.Float64x2.store1(a, -1, f);
        });
        assert.throws(() => {
            simd.Float64x2.store1(a, 8, f);
        });
        assert.throws(() => {
            simd.Float64x2.store1(a.buffer, 1, f);
        });
        assert.throws(() => {
            simd.Float64x2.store1(a, "a", f);
        });
        assert.throws(() => {
            simd.Float64x2.store1(a, 1, i);
        });

    });

    it("Int32x4 fromFloat32x4 constructor", () => {
        let m = simd.Float32x4(1.0, 2.2, 3.6, 4.8);
        let n = simd.Int32x4.fromFloat32x4(m);
        assert.equal(1, simd.Int32x4.extractLane(n, 0));
        assert.equal(2, simd.Int32x4.extractLane(n, 1));
        assert.equal(3, simd.Int32x4.extractLane(n, 2));
        assert.equal(4, simd.Int32x4.extractLane(n, 3));

        m = simd.Float32x4(0.0, -0.0, -1.2, -3.8);
        n = simd.Int32x4.fromFloat32x4(m);
        assert.equal(0, simd.Int32x4.extractLane(n, 0));
        assert.equal(0, simd.Int32x4.extractLane(n, 1));
        assert.equal(-1, simd.Int32x4.extractLane(n, 2));
        assert.equal(-3, simd.Int32x4.extractLane(n, 3));

        assert.throws(() => {
            simd.Int32x4.fromFloat32x4(simd.Float32x4(0x7fffffff, 0, 0, 0));
        });
        assert.throws(() => {
            simd.Int32x4.fromFloat32x4(simd.Float32x4(0, -0x80000081, 0, 0));
        });
        assert.throws(() => {
            simd.Int32x4.fromFloat32x4(simd.Float32x4(0, 0, 2147483648, 0));
        });
        assert.throws(() => {
            simd.Int32x4.fromFloat32x4(simd.Float32x4(0, 0, 0, -2147483904));
        });
        assert.throws(() => {
            simd.Int32x4.fromFloat32x4(simd.Float32x4(Infinity, 0, 0, 0));
        });
        assert.throws(() => {
            simd.Int32x4.fromFloat32x4(simd.Float32x4(0, -Infinity, 0, 0));
        });
        assert.throws(() => {
            simd.Int32x4.fromFloat32x4(simd.Float32x4(0, 0, NaN, 0));
        });

    });

    it("Int32x4 fromFloat64x2 constructor", () => {
        let m = simd.Float64x2(1.0, 2.2);
        let n = simd.Int32x4.fromFloat64x2(m);
        assert.equal(1, simd.Int32x4.extractLane(n, 0));
        assert.equal(2, simd.Int32x4.extractLane(n, 1));
        assert.equal(0, simd.Int32x4.extractLane(n, 2));
        assert.equal(0, simd.Int32x4.extractLane(n, 3));

        m = simd.Float64x2(3.6, 4.8);
        n = simd.Int32x4.fromFloat64x2(m);
        assert.equal(3, simd.Int32x4.extractLane(n, 0));
        assert.equal(4, simd.Int32x4.extractLane(n, 1));
        assert.equal(0, simd.Int32x4.extractLane(n, 2));
        assert.equal(0, simd.Int32x4.extractLane(n, 3));

        m = simd.Float64x2(0.0, -0.0);
        n = simd.Int32x4.fromFloat64x2(m);
        assert.equal(0, simd.Int32x4.extractLane(n, 0));
        assert.equal(0, simd.Int32x4.extractLane(n, 1));
        assert.equal(0, simd.Int32x4.extractLane(n, 2));
        assert.equal(0, simd.Int32x4.extractLane(n, 3));

        m = simd.Float64x2(-1.2, -3.8);
        n = simd.Int32x4.fromFloat64x2(m);
        assert.equal(-1, simd.Int32x4.extractLane(n, 0));
        assert.equal(-3, simd.Int32x4.extractLane(n, 1));
        assert.equal(0, simd.Int32x4.extractLane(n, 2));
        assert.equal(0, simd.Int32x4.extractLane(n, 3));

        m = simd.Float64x2(2147483647.9, -2147483648.9);
        n = simd.Int32x4.fromFloat64x2(m);
        assert.equal(2147483647, simd.Int32x4.extractLane(n, 0));
        assert.equal(-2147483648, simd.Int32x4.extractLane(n, 1));

        assert.throws(() => {
            simd.Int32x4.fromFloat64x2(simd.Float64x2(0x80000000, 0));
        });
        assert.throws(() => {
            simd.Int32x4.fromFloat64x2(simd.Float64x2(0, -0x80000001));
        });
        assert.throws(() => {
            simd.Int32x4.fromFloat64x2(simd.Float64x2(Infinity, 0));
        });
        assert.throws(() => {
            simd.Int32x4.fromFloat64x2(simd.Float64x2(0, -Infinity));
        });
        assert.throws(() => {
            simd.Int32x4.fromFloat64x2(simd.Float64x2(NaN, 0));
        });

    });

    it("Int32x4 fromFloat32x4Bits constructor", () => {
        const m = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        const n = simd.Int32x4.fromFloat32x4Bits(m);
        assert.equal(0x3F800000, simd.Int32x4.extractLane(n, 0));
        assert.equal(0x40000000, simd.Int32x4.extractLane(n, 1));
        assert.equal(0x40400000, simd.Int32x4.extractLane(n, 2));
        assert.equal(0x40800000, simd.Int32x4.extractLane(n, 3));

    });

    it("Int32x4 fromFloat64x2Bits constructor", () => {
        const m = simd.Float64x2(1.0, 2.0);
        const n = simd.Int32x4.fromFloat64x2Bits(m);
        assert.equal(0x00000000, simd.Int32x4.extractLane(n, 0));
        assert.equal(0x3FF00000, simd.Int32x4.extractLane(n, 1));
        assert.equal(0x00000000, simd.Int32x4.extractLane(n, 2));
        assert.equal(0x40000000, simd.Int32x4.extractLane(n, 3));

    });

    it("Int32x4 swizzle", () => {
        const a = simd.Int32x4(1, 2, 3, 2147483647);
        const xyxy = simd.Int32x4.swizzle(a, 0, 1, 0, 1);
        const zwzw = simd.Int32x4.swizzle(a, 2, 3, 2, 3);
        const xxxx = simd.Int32x4.swizzle(a, 0, 0, 0, 0);
        assert.equal(1, simd.Int32x4.extractLane(xyxy, 0));
        assert.equal(2, simd.Int32x4.extractLane(xyxy, 1));
        assert.equal(1, simd.Int32x4.extractLane(xyxy, 2));
        assert.equal(2, simd.Int32x4.extractLane(xyxy, 3));
        assert.equal(3, simd.Int32x4.extractLane(zwzw, 0));
        assert.equal(2147483647, simd.Int32x4.extractLane(zwzw, 1));
        assert.equal(3, simd.Int32x4.extractLane(zwzw, 2));
        assert.equal(2147483647, simd.Int32x4.extractLane(zwzw, 3));
        assert.equal(1, simd.Int32x4.extractLane(xxxx, 0));
        assert.equal(1, simd.Int32x4.extractLane(xxxx, 1));
        assert.equal(1, simd.Int32x4.extractLane(xxxx, 2));
        assert.equal(1, simd.Int32x4.extractLane(xxxx, 3));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Int32x4.swizzle(a, index, 0, 0, 0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(4);

    });

    it("Int32x4 shuffle", () => {
        const a = simd.Int32x4(1, 2, 3, 4);
        const b = simd.Int32x4(5, 6, 7, 2147483647);
        const xyxy = simd.Int32x4.shuffle(a, b, 0, 1, 4, 5);
        const zwzw = simd.Int32x4.shuffle(a, b, 2, 3, 6, 7);
        const xxxx = simd.Int32x4.shuffle(a, b, 0, 0, 4, 4);
        assert.equal(1, simd.Int32x4.extractLane(xyxy, 0));
        assert.equal(2, simd.Int32x4.extractLane(xyxy, 1));
        assert.equal(5, simd.Int32x4.extractLane(xyxy, 2));
        assert.equal(6, simd.Int32x4.extractLane(xyxy, 3));
        assert.equal(3, simd.Int32x4.extractLane(zwzw, 0));
        assert.equal(4, simd.Int32x4.extractLane(zwzw, 1));
        assert.equal(7, simd.Int32x4.extractLane(zwzw, 2));
        assert.equal(2147483647, simd.Int32x4.extractLane(zwzw, 3));
        assert.equal(1, simd.Int32x4.extractLane(xxxx, 0));
        assert.equal(1, simd.Int32x4.extractLane(xxxx, 1));
        assert.equal(5, simd.Int32x4.extractLane(xxxx, 2));
        assert.equal(5, simd.Int32x4.extractLane(xxxx, 3));

        const c = simd.Int32x4.shuffle(a, b, 0, 4, 5, 1);
        const d = simd.Int32x4.shuffle(a, b, 2, 6, 3, 7);
        const e = simd.Int32x4.shuffle(a, b, 0, 4, 0, 4);
        assert.equal(1, simd.Int32x4.extractLane(c, 0));
        assert.equal(5, simd.Int32x4.extractLane(c, 1));
        assert.equal(6, simd.Int32x4.extractLane(c, 2));
        assert.equal(2, simd.Int32x4.extractLane(c, 3));
        assert.equal(3, simd.Int32x4.extractLane(d, 0));
        assert.equal(7, simd.Int32x4.extractLane(d, 1));
        assert.equal(4, simd.Int32x4.extractLane(d, 2));
        assert.equal(2147483647, simd.Int32x4.extractLane(d, 3));
        assert.equal(1, simd.Int32x4.extractLane(e, 0));
        assert.equal(5, simd.Int32x4.extractLane(e, 1));
        assert.equal(1, simd.Int32x4.extractLane(e, 2));
        assert.equal(5, simd.Int32x4.extractLane(e, 3));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Int32x4.shuffle(a, b, index, 0, 0, 0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(8);

    });

    it("Int32x4 replaceLane", () => {
        const a = simd.Int32x4(1, 2, 3, 4);
        let c = simd.Int32x4.replaceLane(a, 0, 20);
        assert.equal(20, simd.Int32x4.extractLane(c, 0));
        assert.equal(2, simd.Int32x4.extractLane(c, 1));
        assert.equal(3, simd.Int32x4.extractLane(c, 2));
        assert.equal(4, simd.Int32x4.extractLane(c, 3));
        c = simd.Int32x4.replaceLane(a, 1, 20);
        assert.equal(1, simd.Int32x4.extractLane(c, 0));
        assert.equal(20, simd.Int32x4.extractLane(c, 1));
        assert.equal(3, simd.Int32x4.extractLane(c, 2));
        assert.equal(4, simd.Int32x4.extractLane(c, 3));
        c = simd.Int32x4.replaceLane(a, 2, 20);
        assert.equal(1, simd.Int32x4.extractLane(c, 0));
        assert.equal(2, simd.Int32x4.extractLane(c, 1));
        assert.equal(20, simd.Int32x4.extractLane(c, 2));
        assert.equal(4, simd.Int32x4.extractLane(c, 3));
        c = simd.Int32x4.replaceLane(a, 3, 20);
        assert.equal(1, simd.Int32x4.extractLane(c, 0));
        assert.equal(2, simd.Int32x4.extractLane(c, 1));
        assert.equal(3, simd.Int32x4.extractLane(c, 2));
        assert.equal(20, simd.Int32x4.extractLane(c, 3));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Int32x4.replaceLane(a, index, 0.0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(8);

    });

    it("Int32x4 and", () => {
        const m = simd.Int32x4(0xAAAAAAAA, 0xAAAAAAAA, -1431655766, 0xAAAAAAAA);
        const n = simd.Int32x4(0x55555555, 0x55555555, 0x55555555, 0x55555555);
        assert.equal(-1431655766, simd.Int32x4.extractLane(m, 0));
        assert.equal(-1431655766, simd.Int32x4.extractLane(m, 1));
        assert.equal(-1431655766, simd.Int32x4.extractLane(m, 2));
        assert.equal(-1431655766, simd.Int32x4.extractLane(m, 3));
        assert.equal(0x55555555, simd.Int32x4.extractLane(n, 0));
        assert.equal(0x55555555, simd.Int32x4.extractLane(n, 1));
        assert.equal(0x55555555, simd.Int32x4.extractLane(n, 2));
        assert.equal(0x55555555, simd.Int32x4.extractLane(n, 3));
        const o = simd.Int32x4.and(m, n);  // and
        assert.equal(0x0, simd.Int32x4.extractLane(o, 0));
        assert.equal(0x0, simd.Int32x4.extractLane(o, 1));
        assert.equal(0x0, simd.Int32x4.extractLane(o, 2));
        assert.equal(0x0, simd.Int32x4.extractLane(o, 3));

    });

    it("Int32x4 or", () => {
        const m = simd.Int32x4(0xAAAAAAAA, 0xAAAAAAAA, 0xAAAAAAAA, 0xAAAAAAAA);
        const n = simd.Int32x4(0x55555555, 0x55555555, 0x55555555, 0x55555555);
        const o = simd.Int32x4.or(m, n);  // or
        assert.equal(-1, simd.Int32x4.extractLane(o, 0));
        assert.equal(-1, simd.Int32x4.extractLane(o, 1));
        assert.equal(-1, simd.Int32x4.extractLane(o, 2));
        assert.equal(-1, simd.Int32x4.extractLane(o, 3));

    });

    it("Int32x4 xor", () => {
        const m = simd.Int32x4(0xAAAAAAAA, 0xAAAAAAAA, 0xAAAAAAAA, 0xAAAAAAAA);
        let n = simd.Int32x4(0x55555555, 0x55555555, 0x55555555, 0x55555555);
        n = simd.Int32x4.replaceLane(n, 0, 0xAAAAAAAA);
        n = simd.Int32x4.replaceLane(n, 1, 0xAAAAAAAA);
        n = simd.Int32x4.replaceLane(n, 2, 0xAAAAAAAA);
        n = simd.Int32x4.replaceLane(n, 3, 0xAAAAAAAA);
        assert.equal(-1431655766, simd.Int32x4.extractLane(n, 0));
        assert.equal(-1431655766, simd.Int32x4.extractLane(n, 1));
        assert.equal(-1431655766, simd.Int32x4.extractLane(n, 2));
        assert.equal(-1431655766, simd.Int32x4.extractLane(n, 3));
        const o = simd.Int32x4.xor(m, n);  // xor
        assert.equal(0x0, simd.Int32x4.extractLane(o, 0));
        assert.equal(0x0, simd.Int32x4.extractLane(o, 1));
        assert.equal(0x0, simd.Int32x4.extractLane(o, 2));
        assert.equal(0x0, simd.Int32x4.extractLane(o, 3));

    });

    it("Int32x4 neg", () => {
        let m = simd.Int32x4(16, -32, 64, -128);
        m = simd.Int32x4.neg(m);
        assert.equal(-16, simd.Int32x4.extractLane(m, 0));
        assert.equal(32, simd.Int32x4.extractLane(m, 1));
        assert.equal(-64, simd.Int32x4.extractLane(m, 2));
        assert.equal(128, simd.Int32x4.extractLane(m, 3));

        let n = simd.Int32x4(0, 0x7fffffff, -1, 0x80000000);
        n = simd.Int32x4.neg(n);
        assert.equal(0, simd.Int32x4.extractLane(n, 0));
        assert.equal(-2147483647, simd.Int32x4.extractLane(n, 1));
        assert.equal(1, simd.Int32x4.extractLane(n, 2));
        assert.equal(-2147483648, simd.Int32x4.extractLane(n, 3));

    });

    it("Int32x4 vector getters", () => {
        const a = simd.Int32x4(4, 3, 2, 1);
        const xxxx = simd.Int32x4.swizzle(a, 0, 0, 0, 0);
        const yyyy = simd.Int32x4.swizzle(a, 1, 1, 1, 1);
        const zzzz = simd.Int32x4.swizzle(a, 2, 2, 2, 2);
        const wwww = simd.Int32x4.swizzle(a, 3, 3, 3, 3);
        const wzyx = simd.Int32x4.swizzle(a, 3, 2, 1, 0);
        assert.equal(4, simd.Int32x4.extractLane(xxxx, 0));
        assert.equal(4, simd.Int32x4.extractLane(xxxx, 1));
        assert.equal(4, simd.Int32x4.extractLane(xxxx, 2));
        assert.equal(4, simd.Int32x4.extractLane(xxxx, 3));
        assert.equal(3, simd.Int32x4.extractLane(yyyy, 0));
        assert.equal(3, simd.Int32x4.extractLane(yyyy, 1));
        assert.equal(3, simd.Int32x4.extractLane(yyyy, 2));
        assert.equal(3, simd.Int32x4.extractLane(yyyy, 3));
        assert.equal(2, simd.Int32x4.extractLane(zzzz, 0));
        assert.equal(2, simd.Int32x4.extractLane(zzzz, 1));
        assert.equal(2, simd.Int32x4.extractLane(zzzz, 2));
        assert.equal(2, simd.Int32x4.extractLane(zzzz, 3));
        assert.equal(1, simd.Int32x4.extractLane(wwww, 0));
        assert.equal(1, simd.Int32x4.extractLane(wwww, 1));
        assert.equal(1, simd.Int32x4.extractLane(wwww, 2));
        assert.equal(1, simd.Int32x4.extractLane(wwww, 3));
        assert.equal(1, simd.Int32x4.extractLane(wzyx, 0));
        assert.equal(2, simd.Int32x4.extractLane(wzyx, 1));
        assert.equal(3, simd.Int32x4.extractLane(wzyx, 2));
        assert.equal(4, simd.Int32x4.extractLane(wzyx, 3));

    });

    it("Int32x4 add", () => {
        const a = simd.Int32x4(0xFFFFFFFF, 0xFFFFFFFF, 0x7fffffff, 0x0);
        const b = simd.Int32x4(0x1, 0xFFFFFFFF, 0x1, 0xFFFFFFFF);
        const c = simd.Int32x4.add(a, b);
        assert.equal(0x0, simd.Int32x4.extractLane(c, 0));
        assert.equal(-2, simd.Int32x4.extractLane(c, 1));
        assert.equal(-0x80000000, simd.Int32x4.extractLane(c, 2));
        assert.equal(-1, simd.Int32x4.extractLane(c, 3));

    });

    it("Int32x4 sub", () => {
        const a = simd.Int32x4(0xFFFFFFFF, 0xFFFFFFFF, 0x80000000, 0x0);
        const b = simd.Int32x4(0x1, 0xFFFFFFFF, 0x1, 0xFFFFFFFF);
        const c = simd.Int32x4.sub(a, b);
        assert.equal(-2, simd.Int32x4.extractLane(c, 0));
        assert.equal(0x0, simd.Int32x4.extractLane(c, 1));
        assert.equal(0x7FFFFFFF, simd.Int32x4.extractLane(c, 2));
        assert.equal(0x1, simd.Int32x4.extractLane(c, 3));

    });

    it("Int32x4 mul", () => {
        const a = simd.Int32x4(0xFFFFFFFF, 0xFFFFFFFF, 0x80000000, 0x0);
        const b = simd.Int32x4(0x1, 0xFFFFFFFF, 0x80000000, 0xFFFFFFFF);
        const c = simd.Int32x4.mul(a, b);
        assert.equal(-1, simd.Int32x4.extractLane(c, 0));
        assert.equal(0x1, simd.Int32x4.extractLane(c, 1));
        assert.equal(0x0, simd.Int32x4.extractLane(c, 2));
        assert.equal(0x0, simd.Int32x4.extractLane(c, 3));

    });

    it("Int32x4 comparisons", () => {
        const m = simd.Int32x4(1000, 2000, 100, 1);
        const n = simd.Int32x4(-2000, 2000, 1, 100);
        let cmp;
        cmp = simd.Int32x4.lessThan(m, n);
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Int32x4.lessThanOrEqual(m, n);
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Int32x4.equal(m, n);
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Int32x4.notEqual(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Int32x4.greaterThan(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

        cmp = simd.Int32x4.greaterThanOrEqual(m, n);
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 0));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 1));
        assert.equal(true, simd.Bool32x4.extractLane(cmp, 2));
        assert.equal(false, simd.Bool32x4.extractLane(cmp, 3));

    });

    it("Int32x4 shiftLeftByScalar", () => {
        const a = simd.Int32x4(0xffffffff, 0x7fffffff, 0x1, 0x0);
        let b;

        b = simd.Int32x4.shiftLeftByScalar(a, 1);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0xfffffffe | 0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0xfffffffe | 0);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000002);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftLeftByScalar(a, 2);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0xfffffffc | 0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0xfffffffc | 0);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000004);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftLeftByScalar(a, 30);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0xc0000000 | 0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0xc0000000 | 0);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x40000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftLeftByScalar(a, 31);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0x80000000 | 0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x80000000 | 0);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x80000000 | 0);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x0);
        b = simd.Int32x4.shiftLeftByScalar(a, 32);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0x0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x0);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x0);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x0);
        b = simd.Int32x4.shiftLeftByScalar(a, -1);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0x0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x0);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x0);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x0);

    });

    it("Int32x4 shiftRightArithmeticByScalar", () => {
        const a = simd.Int32x4(0xffffffff, 0x7fffffff, 0x1, 0x0);
        let b;

        b = simd.Int32x4.shiftRightArithmeticByScalar(a, 1);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0xffffffff | 0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x3fffffff);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftRightArithmeticByScalar(a, 2);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0xffffffff | 0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x1fffffff);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftRightArithmeticByScalar(a, 30);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0xffffffff | 0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x00000001);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftRightArithmeticByScalar(a, 31);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0xffffffff | 0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftRightArithmeticByScalar(a, 32);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0xffffffff | 0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftRightArithmeticByScalar(a, -1);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0xffffffff | 0);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);

    });

    it("Int32x4 shiftRightLogicalByScalar", () => {
        const a = simd.Int32x4(0xffffffff, 0x7fffffff, 0x1, 0x0);
        let b;

        b = simd.Int32x4.shiftRightLogicalByScalar(a, 1);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0x7fffffff);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x3fffffff);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftRightLogicalByScalar(a, 2);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0x3fffffff);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x1fffffff);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftRightLogicalByScalar(a, 30);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0x00000003);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x00000001);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftRightLogicalByScalar(a, 31);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0x00000001);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftRightLogicalByScalar(a, 32);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);
        b = simd.Int32x4.shiftRightLogicalByScalar(a, -1);
        assert.equal(simd.Int32x4.extractLane(b, 0), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 1), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 2), 0x00000000);
        assert.equal(simd.Int32x4.extractLane(b, 3), 0x00000000);

    });

    it("Int32x4 select", () => {
        const m = simd.Bool32x4(true, true, false, false);
        const t = simd.Int32x4(1, 2, 3, 4);
        const f = simd.Int32x4(5, 6, 7, 8);
        const s = simd.Int32x4.select(m, t, f);
        assert.equal(1, simd.Int32x4.extractLane(s, 0));
        assert.equal(2, simd.Int32x4.extractLane(s, 1));
        assert.equal(7, simd.Int32x4.extractLane(s, 2));
        assert.equal(8, simd.Int32x4.extractLane(s, 3));

    });

    it("Int32x4 selectBits", () => {
        const m = simd.Int32x4(0xaaaaaaaa, 0xaaaaaaaa, 0x55555555, 0x55555555);
        const t = simd.Int32x4(1, 2, 3, 4);
        const f = simd.Int32x4(5, 6, 7, 8);
        const s = simd.Int32x4.selectBits(m, t, f);
        assert.equal(5, simd.Int32x4.extractLane(s, 0));
        assert.equal(6, simd.Int32x4.extractLane(s, 1));
        assert.equal(3, simd.Int32x4.extractLane(s, 2));
        assert.equal(12, simd.Int32x4.extractLane(s, 3));

    });

    it("Int32x4 load", () => {
        const a = new Int32Array(8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 3; i++) {
            const v = simd.Int32x4.load(a, i);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Int32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Int32x4.extractLane(v, 2));
            assert.equal(i + 3, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 overaligned load", () => {
        const b = new ArrayBuffer(40);
        const a = new Int32Array(b, 8);
        const af = new Float64Array(b, 8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 3; i += 2) {
            const v = simd.Int32x4.load(af, i / 2);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Int32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Int32x4.extractLane(v, 2));
            assert.equal(i + 3, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 unaligned load", () => {
        const a = new Int32Array(8);
        const ai = new Int8Array(a.buffer);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }

        // Copy the bytes, offset by 1.
        const b = new Int8Array(ai.length + 1);
        for (let i = 0; i < ai.length; i++) {
            b[i + 1] = ai[i];
        }

        // Load the values unaligned.
        for (let i = 0; i < a.length - 3; i++) {
            const v = simd.Int32x4.load(b, i * 4 + 1);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Int32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Int32x4.extractLane(v, 2));
            assert.equal(i + 3, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 load1", () => {
        const a = new Int32Array(8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length; i++) {
            const v = simd.Int32x4.load1(a, i);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(0, simd.Int32x4.extractLane(v, 1));
            assert.equal(0, simd.Int32x4.extractLane(v, 2));
            assert.equal(0, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 overaligned load1", () => {
        const b = new ArrayBuffer(40);
        const a = new Int32Array(b, 8);
        const af = new Int32Array(b, 8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length; i++) {
            const v = simd.Int32x4.load1(af, i);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(0, simd.Int32x4.extractLane(v, 1));
            assert.equal(0, simd.Int32x4.extractLane(v, 2));
            assert.equal(0, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 unaligned load1", () => {
        const a = new Int32Array(8);
        const ai = new Int8Array(a.buffer);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }

        // Copy the bytes, offset by 1.
        const b = new Int8Array(ai.length + 1);
        for (let i = 0; i < ai.length; i++) {
            b[i + 1] = ai[i];
        }

        // Load the values unaligned.
        for (let i = 0; i < a.length; i++) {
            const v = simd.Int32x4.load1(b, i * 4 + 1);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(0, simd.Int32x4.extractLane(v, 1));
            assert.equal(0, simd.Int32x4.extractLane(v, 2));
            assert.equal(0, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 load2", () => {
        const a = new Int32Array(8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 1; i++) {
            const v = simd.Int32x4.load2(a, i);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Int32x4.extractLane(v, 1));
            assert.equal(0, simd.Int32x4.extractLane(v, 2));
            assert.equal(0, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 overaligned load2", () => {
        const b = new ArrayBuffer(40);
        const a = new Int32Array(b, 8);
        const af = new Float64Array(b, 8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 1; i += 2) {
            const v = simd.Int32x4.load2(af, i / 2);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Int32x4.extractLane(v, 1));
            assert.equal(0, simd.Int32x4.extractLane(v, 2));
            assert.equal(0, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 unaligned load2", () => {
        const a = new Int32Array(8);
        const ai = new Int8Array(a.buffer);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }

        // Copy the bytes, offset by 1.
        const b = new Int8Array(ai.length + 1);
        for (let i = 0; i < ai.length; i++) {
            b[i + 1] = ai[i];
        }

        // Load the values unaligned.
        for (let i = 0; i < a.length - 1; i++) {
            const v = simd.Int32x4.load2(b, i * 4 + 1);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Int32x4.extractLane(v, 1));
            assert.equal(0, simd.Int32x4.extractLane(v, 2));
            assert.equal(0, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 load3", () => {
        const a = new Int32Array(9);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 2; i++) {
            const v = simd.Int32x4.load3(a, i);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Int32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Int32x4.extractLane(v, 2));
            assert.equal(0, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 overaligned load3", () => {
        const b = new ArrayBuffer(48);
        const a = new Int32Array(b, 8);
        const af = new Float64Array(b, 8);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }
        for (let i = 0; i < a.length - 2; i += 2) {
            const v = simd.Int32x4.load3(af, i / 2);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Int32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Int32x4.extractLane(v, 2));
            assert.equal(0, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 load3", () => {
        const a = new Int32Array(9);
        const ai = new Int8Array(a.buffer);
        for (let i = 0; i < a.length; i++) {
            a[i] = i;
        }

        // Copy the bytes, offset by 1.
        const b = new Int8Array(ai.length + 1);
        for (let i = 0; i < ai.length; i++) {
            b[i + 1] = ai[i];
        }

        // Load the values unaligned.
        for (let i = 0; i < a.length - 2; i++) {
            const v = simd.Int32x4.load3(b, i * 4 + 1);
            assert.equal(i, simd.Int32x4.extractLane(v, 0));
            assert.equal(i + 1, simd.Int32x4.extractLane(v, 1));
            assert.equal(i + 2, simd.Int32x4.extractLane(v, 2));
            assert.equal(0, simd.Int32x4.extractLane(v, 3));
        }

    });

    it("Int32x4 store", () => {
        const a = new Int32Array(12);
        simd.Int32x4.store(a, 0, simd.Int32x4(0, 1, 2, 3));
        simd.Int32x4.store(a, 4, simd.Int32x4(4, 5, 6, 7));
        simd.Int32x4.store(a, 8, simd.Int32x4(8, 9, 10, 11));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

        const v = simd.Int32x4(0, 1, 2, 3);
        assert.equal(true, simd.Bool32x4.allTrue(simd.Int32x4.equal(simd.Int32x4.store(a, 0, v), v)));

    });

    it("Int32x4 overaligned store", () => {
        const b = new ArrayBuffer(56);
        const a = new Int32Array(b, 8);
        const af = new Float64Array(b, 8);
        simd.Int32x4.store(af, 0, simd.Int32x4(0, 1, 2, 3));
        simd.Int32x4.store(af, 2, simd.Int32x4(4, 5, 6, 7));
        simd.Int32x4.store(af, 4, simd.Int32x4(8, 9, 10, 11));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Int32x4 unaligned store", () => {
        const c = new Int8Array(48 + 1);
        simd.Int32x4.store(c, 0 + 1, simd.Int32x4(0, 1, 2, 3));
        simd.Int32x4.store(c, 16 + 1, simd.Int32x4(4, 5, 6, 7));
        simd.Int32x4.store(c, 32 + 1, simd.Int32x4(8, 9, 10, 11));

        // Copy the bytes, offset by 1.
        const b = new Int8Array(c.length - 1);
        for (let i = 1; i < c.length; i++) {
            b[i - 1] = c[i];
        }

        const a = new Int32Array(b.buffer);
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Int32x4 store1", () => {
        const a = new Int32Array(4);
        simd.Int32x4.store1(a, 0, simd.Int32x4(0, -1, -1, -1));
        simd.Int32x4.store1(a, 1, simd.Int32x4(1, -1, -1, -1));
        simd.Int32x4.store1(a, 2, simd.Int32x4(2, -1, -1, -1));
        simd.Int32x4.store1(a, 3, simd.Int32x4(3, -1, -1, -1));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

        const v = simd.Int32x4(0, 1, 2, 3);
        assert.equal(true, simd.Bool32x4.allTrue(simd.Int32x4.equal(simd.Int32x4.store1(a, 0, v), v)));

    });

    it("Int32x4 overaligned store1", () => {
        const b = new ArrayBuffer(24);
        const a = new Int32Array(b, 8);
        const af = new Float64Array(b, 8);
        a[1] = -2;
        a[3] = -2;
        simd.Int32x4.store1(af, 0, simd.Int32x4(0, -1, -1, -1));
        simd.Int32x4.store1(af, 1, simd.Int32x4(2, -1, -1, -1));
        for (let i = 0; i < a.length; i++) {
            if (i % 2 === 0) {
                assert.equal(i, a[i]);
            } else {
                assert.equal(-2, a[i]);
            }
        }

    });

    it("Int32x4 unaligned store1", () => {
        const c = new Int8Array(16 + 1);
        simd.Int32x4.store1(c, 0 + 1, simd.Int32x4(0, -1, -1, -1));
        simd.Int32x4.store1(c, 4 + 1, simd.Int32x4(1, -1, -1, -1));
        simd.Int32x4.store1(c, 8 + 1, simd.Int32x4(2, -1, -1, -1));
        simd.Int32x4.store1(c, 12 + 1, simd.Int32x4(3, -1, -1, -1));

        // Copy the bytes, offset by 1.
        const b = new Int8Array(c.length - 1);
        for (let i = 1; i < c.length; i++) {
            b[i - 1] = c[i];
        }

        const a = new Int32Array(b.buffer);
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

        const v = simd.Int32x4(0, 1, 2, 3);
        assert.equal(true, simd.Bool32x4.allTrue(simd.Int32x4.equal(simd.Int32x4.store2(a, 0, v), v)));

    });

    it("Int32x4 store2", () => {
        const a = new Int32Array(8);
        simd.Int32x4.store2(a, 0, simd.Int32x4(0, 1, -1, -1));
        simd.Int32x4.store2(a, 2, simd.Int32x4(2, 3, -1, -1));
        simd.Int32x4.store2(a, 4, simd.Int32x4(4, 5, -1, -1));
        simd.Int32x4.store2(a, 6, simd.Int32x4(6, 7, -1, -1));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Int32x4 store2", () => {
        const a = new Int32Array(8);
        const af = new Float64Array(a.buffer);
        simd.Int32x4.store2(af, 0, simd.Int32x4(0, 1, -1, -1));
        simd.Int32x4.store2(af, 1, simd.Int32x4(2, 3, -1, -1));
        simd.Int32x4.store2(af, 2, simd.Int32x4(4, 5, -1, -1));
        simd.Int32x4.store2(af, 3, simd.Int32x4(6, 7, -1, -1));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Int32x4 unaligned store2", () => {
        const c = new Int8Array(32 + 1);
        simd.Int32x4.store2(c, 0 + 1, simd.Int32x4(0, 1, -1, -1));
        simd.Int32x4.store2(c, 8 + 1, simd.Int32x4(2, 3, -1, -1));
        simd.Int32x4.store2(c, 16 + 1, simd.Int32x4(4, 5, -1, -1));
        simd.Int32x4.store2(c, 24 + 1, simd.Int32x4(6, 7, -1, -1));

        // Copy the bytes, offset by 1.
        const b = new Int8Array(c.length - 1);
        for (let i = 1; i < c.length; i++) {
            b[i - 1] = c[i];
        }

        const a = new Int32Array(b.buffer);
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Int32x4 store3", () => {
        const a = new Int32Array(9);
        simd.Int32x4.store3(a, 0, simd.Int32x4(0, 1, 2, -1));
        simd.Int32x4.store3(a, 3, simd.Int32x4(3, 4, 5, -1));
        simd.Int32x4.store3(a, 6, simd.Int32x4(6, 7, 8, -1));
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

        const v = simd.Int32x4(0, 1, 2, 3);
        assert.equal(true, simd.Bool32x4.allTrue(simd.Int32x4.equal(simd.Int32x4.store3(a, 0, v), v)));

    });

    it("Int32x4 overaligned store3", () => {
        const b = new ArrayBuffer(56);
        const a = new Int32Array(b, 8);
        const af = new Float64Array(b, 8);
        a[3] = -2;
        a[7] = -2;
        a[11] = -2;
        simd.Int32x4.store3(af, 0, simd.Int32x4(0, 1, 2, -1));
        simd.Int32x4.store3(af, 2, simd.Int32x4(4, 5, 6, -1));
        simd.Int32x4.store3(af, 4, simd.Int32x4(8, 9, 10, -1));
        for (let i = 0; i < a.length; i++) {
            if (i % 4 != 3) {
                assert.equal(i, a[i]);
            } else {
                assert.equal(-2, a[i]);
            }
        }

    });

    it("Int32x4 unaligned store3", () => {
        const c = new Int8Array(36 + 1);
        simd.Int32x4.store3(c, 0 + 1, simd.Int32x4(0, 1, 2, -1));
        simd.Int32x4.store3(c, 12 + 1, simd.Int32x4(3, 4, 5, -1));
        simd.Int32x4.store3(c, 24 + 1, simd.Int32x4(6, 7, 8, -1));

        // Copy the bytes, offset by 1.
        const b = new Int8Array(c.length - 1);
        for (let i = 1; i < c.length; i++) {
            b[i - 1] = c[i];
        }

        const a = new Int32Array(b.buffer);
        for (let i = 0; i < a.length; i++) {
            assert.equal(i, a[i]);
        }

    });

    it("Int32x4 load exceptions", () => {
        const a = new Int32Array(8);
        assert.throws(() => {
            const f = simd.Int32x4.load(a, -1);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load(a, 5);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load(a.buffer, 1);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load(a, "a");
        });

    });

    it("Int32x4 load1 exceptions", () => {
        const a = new Int32Array(8);
        assert.throws(() => {
            const f = simd.Int32x4.load1(a, -1);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load1(a, 8);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load1(a.buffer, 1);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load1(a, "a");
        });

    });

    it("Int32x4 load2 exceptions", () => {
        const a = new Int32Array(8);
        assert.throws(() => {
            const f = simd.Int32x4.load2(a, -1);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load2(a, 7);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load2(a.buffer, 1);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load2(a, "a");
        });

    });

    it("Int32x4 load3 exceptions", () => {
        const a = new Int32Array(8);
        assert.throws(() => {
            const f = simd.Int32x4.load3(a, -1);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load3(a, 6);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load3(a.buffer, 1);
        });
        assert.throws(() => {
            const f = simd.Int32x4.load3(a, "a");
        });

    });

    it("Int32x4 store exceptions", () => {
        const a = new Int32Array(8);
        const f = simd.Float32x4(1, 2, 3, 4);
        const i = simd.Int32x4(1, 2, 3, 4);
        assert.throws(() => {
            simd.Int32x4.store(a, -1, i);
        });
        assert.throws(() => {
            simd.Int32x4.store(a, 5, i);
        });
        assert.throws(() => {
            simd.Int32x4.store(a.buffer, 1, i);
        });
        assert.throws(() => {
            simd.Int32x4.store(a, "a", i);
        });
        assert.throws(() => {
            simd.Int32x4.store(a, 1, f);
        });

    });

    it("Int32x4 store1 exceptions", () => {
        const a = new Int32Array(8);
        const f = simd.Float32x4(1, 2, 3, 4);
        const i = simd.Int32x4(1, 2, 3, 4);
        assert.throws(() => {
            simd.Int32x4.store1(a, -1, i);
        });
        assert.throws(() => {
            simd.Int32x4.store1(a, 8, i);
        });
        assert.throws(() => {
            simd.Int32x4.store1(a.buffer, 1, i);
        });
        assert.throws(() => {
            simd.Int32x4.store1(a, "a", i);
        });
        assert.throws(() => {
            simd.Int32x4.store1(a, 1, f);
        });

    });

    it("Int32x4 store2 exceptions", () => {
        const a = new Int32Array(8);
        const f = simd.Float32x4(1, 2, 3, 4);
        const i = simd.Int32x4(1, 2, 3, 4);
        assert.throws(() => {
            simd.Int32x4.store2(a, -1, i);
        });
        assert.throws(() => {
            simd.Int32x4.store2(a, 7, i);
        });
        assert.throws(() => {
            simd.Int32x4.store2(a.buffer, 1, i);
        });
        assert.throws(() => {
            simd.Int32x4.store2(a, "a", i);
        });
        assert.throws(() => {
            simd.Int32x4.store2(a, 1, f);
        });

    });

    it("Int32x4 store3 exceptions", () => {
        const a = new Int32Array(8);
        const f = simd.Float32x4(1, 2, 3, 4);
        const i = simd.Int32x4(1, 2, 3, 4);
        assert.throws(() => {
            simd.Int32x4.store3(a, -1, i);
        });
        assert.throws(() => {
            simd.Int32x4.store3(a, 6, i);
        });
        assert.throws(() => {
            simd.Int32x4.store3(a.buffer, 1, i);
        });
        assert.throws(() => {
            simd.Int32x4.store3(a, "a", i);
        });
        assert.throws(() => {
            simd.Int32x4.store3(a, 1, f);
        });

    });

    it("Int16x8 fromFloat32x4Bits constructor", () => {
        const m = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        const n = simd.Int16x8.fromFloat32x4Bits(m);
        assert.equal(0x0000, simd.Int16x8.extractLane(n, 0));
        assert.equal(0x3F80, simd.Int16x8.extractLane(n, 1));
        assert.equal(0x0000, simd.Int16x8.extractLane(n, 2));
        assert.equal(0x4000, simd.Int16x8.extractLane(n, 3));
        assert.equal(0x0000, simd.Int16x8.extractLane(n, 4));
        assert.equal(0x4040, simd.Int16x8.extractLane(n, 5));
        assert.equal(0x0000, simd.Int16x8.extractLane(n, 6));
        assert.equal(0x4080, simd.Int16x8.extractLane(n, 7));

    });

    it("Int16x8 swizzle", () => {
        const a = simd.Int16x8(1, 2, 3, 2147483647, 5, 6, 7, -37);
        const xyxy = simd.Int16x8.swizzle(a, 0, 1, 0, 1, 0, 1, 0, 1);
        const zwzw = simd.Int16x8.swizzle(a, 4, 5, 4, 5, 4, 5, 4, 5);
        const xxxx = simd.Int16x8.swizzle(a, 0, 0, 0, 0, 0, 0, 0, 0);
        assert.equal(1, simd.Int16x8.extractLane(xyxy, 0));
        assert.equal(2, simd.Int16x8.extractLane(xyxy, 1));
        assert.equal(1, simd.Int16x8.extractLane(xyxy, 2));
        assert.equal(2, simd.Int16x8.extractLane(xyxy, 3));
        assert.equal(1, simd.Int16x8.extractLane(xyxy, 4));
        assert.equal(2, simd.Int16x8.extractLane(xyxy, 5));
        assert.equal(1, simd.Int16x8.extractLane(xyxy, 6));
        assert.equal(2, simd.Int16x8.extractLane(xyxy, 7));
        assert.equal(5, simd.Int16x8.extractLane(zwzw, 0));
        assert.equal(6, simd.Int16x8.extractLane(zwzw, 1));
        assert.equal(5, simd.Int16x8.extractLane(zwzw, 2));
        assert.equal(6, simd.Int16x8.extractLane(zwzw, 3));
        assert.equal(5, simd.Int16x8.extractLane(zwzw, 4));
        assert.equal(6, simd.Int16x8.extractLane(zwzw, 5));
        assert.equal(5, simd.Int16x8.extractLane(zwzw, 6));
        assert.equal(6, simd.Int16x8.extractLane(zwzw, 7));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 0));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 1));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 2));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 3));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 4));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 5));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 6));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 7));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Int16x8.swizzle(a, index, 0, 0, 0, 0, 0, 0, 0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(8);

    });

    it("Int16x8 shuffle", () => {
        const a = simd.Int16x8(1, 2, 3, 4, 5, 6, 7, 8);
        const b = simd.Int16x8(9, 10, 11, 12, 13, 14, 15, 32767);
        const xyxy = simd.Int16x8.shuffle(a, b, 0, 1, 2, 3, 8, 9, 10, 11);
        const zwzw = simd.Int16x8.shuffle(a, b, 4, 5, 6, 7, 12, 13, 14, 15);
        const xxxx = simd.Int16x8.shuffle(a, b, 0, 0, 0, 0, 8, 8, 8, 8);
        assert.equal(1, simd.Int16x8.extractLane(xyxy, 0));
        assert.equal(2, simd.Int16x8.extractLane(xyxy, 1));
        assert.equal(3, simd.Int16x8.extractLane(xyxy, 2));
        assert.equal(4, simd.Int16x8.extractLane(xyxy, 3));
        assert.equal(9, simd.Int16x8.extractLane(xyxy, 4));
        assert.equal(10, simd.Int16x8.extractLane(xyxy, 5));
        assert.equal(11, simd.Int16x8.extractLane(xyxy, 6));
        assert.equal(12, simd.Int16x8.extractLane(xyxy, 7));
        assert.equal(5, simd.Int16x8.extractLane(zwzw, 0));
        assert.equal(6, simd.Int16x8.extractLane(zwzw, 1));
        assert.equal(7, simd.Int16x8.extractLane(zwzw, 2));
        assert.equal(8, simd.Int16x8.extractLane(zwzw, 3));
        assert.equal(13, simd.Int16x8.extractLane(zwzw, 4));
        assert.equal(14, simd.Int16x8.extractLane(zwzw, 5));
        assert.equal(15, simd.Int16x8.extractLane(zwzw, 6));
        assert.equal(32767, simd.Int16x8.extractLane(zwzw, 7));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 0));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 1));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 2));
        assert.equal(1, simd.Int16x8.extractLane(xxxx, 3));
        assert.equal(9, simd.Int16x8.extractLane(xxxx, 4));
        assert.equal(9, simd.Int16x8.extractLane(xxxx, 5));
        assert.equal(9, simd.Int16x8.extractLane(xxxx, 6));
        assert.equal(9, simd.Int16x8.extractLane(xxxx, 7));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Int16x8.shuffle(a, b, index, 0, 0, 0, 0, 0, 0, 0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(16);

    });

    it("Int16x8 and", () => {
        const m = simd.Int16x8(0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA, 43690, 43690, 0xAAAA, 0xAAAA);
        const n = simd.Int16x8(0x5555, 0x5555, 0x5555, 0x5555, 0x5555, 0x5555, 0x5555, 0x5555);
        assert.equal(-21846, simd.Int16x8.extractLane(m, 0));
        assert.equal(-21846, simd.Int16x8.extractLane(m, 1));
        assert.equal(-21846, simd.Int16x8.extractLane(m, 2));
        assert.equal(-21846, simd.Int16x8.extractLane(m, 3));
        assert.equal(-21846, simd.Int16x8.extractLane(m, 4));
        assert.equal(-21846, simd.Int16x8.extractLane(m, 5));
        assert.equal(-21846, simd.Int16x8.extractLane(m, 6));
        assert.equal(-21846, simd.Int16x8.extractLane(m, 7));
        assert.equal(0x5555, simd.Int16x8.extractLane(n, 0));
        assert.equal(0x5555, simd.Int16x8.extractLane(n, 1));
        assert.equal(0x5555, simd.Int16x8.extractLane(n, 2));
        assert.equal(0x5555, simd.Int16x8.extractLane(n, 3));
        assert.equal(0x5555, simd.Int16x8.extractLane(n, 4));
        assert.equal(0x5555, simd.Int16x8.extractLane(n, 5));
        assert.equal(0x5555, simd.Int16x8.extractLane(n, 6));
        assert.equal(0x5555, simd.Int16x8.extractLane(n, 7));
        const o = simd.Int16x8.and(m, n);  // and
        assert.equal(0x0, simd.Int16x8.extractLane(o, 0));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 1));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 2));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 3));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 4));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 5));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 6));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 7));

    });

    it("Int16x8 or", () => {
        const m = simd.Int16x8(0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA);
        const n = simd.Int16x8(0x5555, 0x5555, 0x5555, 0x5555, 0x5555, 0x5555, 0x5555, 0x5555);
        const o = simd.Int16x8.or(m, n);  // or
        assert.equal(-1, simd.Int16x8.extractLane(o, 0));
        assert.equal(-1, simd.Int16x8.extractLane(o, 1));
        assert.equal(-1, simd.Int16x8.extractLane(o, 2));
        assert.equal(-1, simd.Int16x8.extractLane(o, 3));
        assert.equal(-1, simd.Int16x8.extractLane(o, 4));
        assert.equal(-1, simd.Int16x8.extractLane(o, 5));
        assert.equal(-1, simd.Int16x8.extractLane(o, 6));
        assert.equal(-1, simd.Int16x8.extractLane(o, 7));

    });

    it("Int16x8 xor", () => {
        const m = simd.Int16x8(0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA, 0xAAAA);
        const n = simd.Int16x8(0x5555, 0x5555, 0x5555, 0x5555, 0x5555, 0x5555, 0x5555, 0x5555);
        let o = simd.Int16x8.xor(m, n);  // xor
        assert.equal(-1, simd.Int16x8.extractLane(o, 0));
        assert.equal(-1, simd.Int16x8.extractLane(o, 1));
        assert.equal(-1, simd.Int16x8.extractLane(o, 2));
        assert.equal(-1, simd.Int16x8.extractLane(o, 3));
        assert.equal(-1, simd.Int16x8.extractLane(o, 4));
        assert.equal(-1, simd.Int16x8.extractLane(o, 5));
        assert.equal(-1, simd.Int16x8.extractLane(o, 6));
        assert.equal(-1, simd.Int16x8.extractLane(o, 7));
        o = simd.Int16x8.xor(m, m);  // xor
        assert.equal(0x0, simd.Int16x8.extractLane(o, 0));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 1));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 2));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 3));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 4));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 5));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 6));
        assert.equal(0x0, simd.Int16x8.extractLane(o, 7));

    });

    it("Int16x8 neg", () => {
        let m = simd.Int16x8(16, -32, 64, -128, 256, -512, 1024, -2048);
        m = simd.Int16x8.neg(m);
        assert.equal(-16, simd.Int16x8.extractLane(m, 0));
        assert.equal(32, simd.Int16x8.extractLane(m, 1));
        assert.equal(-64, simd.Int16x8.extractLane(m, 2));
        assert.equal(128, simd.Int16x8.extractLane(m, 3));
        assert.equal(-256, simd.Int16x8.extractLane(m, 4));
        assert.equal(512, simd.Int16x8.extractLane(m, 5));
        assert.equal(-1024, simd.Int16x8.extractLane(m, 6));
        assert.equal(2048, simd.Int16x8.extractLane(m, 7));

        let n = simd.Int16x8(0, 0, 0x7fff, 0xffff, -1, -1, 0x8000, 0x0000);
        n = simd.Int16x8.neg(n);
        assert.equal(0, simd.Int16x8.extractLane(n, 0));
        assert.equal(0, simd.Int16x8.extractLane(n, 1));
        assert.equal(-32767, simd.Int16x8.extractLane(n, 2));
        assert.equal(1, simd.Int16x8.extractLane(n, 3));
        assert.equal(1, simd.Int16x8.extractLane(n, 4));
        assert.equal(1, simd.Int16x8.extractLane(n, 5));
        assert.equal(-32768, simd.Int16x8.extractLane(n, 6));
        assert.equal(0, simd.Int16x8.extractLane(n, 7));

    });

    it("Int16x8 add", () => {
        const a = simd.Int16x8(0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF, 0x7fff, 0xffff, 0x0, 0x0);
        const b = simd.Int16x8(0x0, 0x1, 0xFFFF, 0xFFFF, 0x0, 0x1, 0xFFFF, 0xFFFF);
        const c = simd.Int16x8.add(a, b);
        assert.equal(-1, simd.Int16x8.extractLane(c, 0));
        assert.equal(0, simd.Int16x8.extractLane(c, 1));
        assert.equal(-2, simd.Int16x8.extractLane(c, 2));
        assert.equal(-2, simd.Int16x8.extractLane(c, 3));
        assert.equal(0x7fff, simd.Int16x8.extractLane(c, 4));
        assert.equal(0, simd.Int16x8.extractLane(c, 5));
        assert.equal(-1, simd.Int16x8.extractLane(c, 6));
        assert.equal(-1, simd.Int16x8.extractLane(c, 7));

    });

    it("Int16x8 sub", () => {
        const a = simd.Int16x8(0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF, 0x8000, 0x0000, 0x0, 0x0);
        const b = simd.Int16x8(0x0, 0x1, 0xFFFF, 0x0FFFF, 0x0, 0x1, 0xFFFF, 0xFFFF);
        const c = simd.Int16x8.sub(a, b);
        assert.equal(-1, simd.Int16x8.extractLane(c, 0));
        assert.equal(-2, simd.Int16x8.extractLane(c, 1));
        assert.equal(0, simd.Int16x8.extractLane(c, 2));
        assert.equal(0, simd.Int16x8.extractLane(c, 3));
        assert.equal(-32768, simd.Int16x8.extractLane(c, 4));
        assert.equal(-1, simd.Int16x8.extractLane(c, 5));
        assert.equal(1, simd.Int16x8.extractLane(c, 6));
        assert.equal(1, simd.Int16x8.extractLane(c, 7));

    });

    it("Int16x8 mul", () => {
        const a = simd.Int16x8(0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF, 0x8000, 0x0000, 0x0, 0x0);
        const b = simd.Int16x8(0x0, 0x1, 0xFFFF, 0xFFFF, 0x8000, 0x0000, 0xFFFF, 0xFFFF);
        const c = simd.Int16x8.mul(a, b);
        assert.equal(0, simd.Int16x8.extractLane(c, 0));
        assert.equal(-1, simd.Int16x8.extractLane(c, 1));
        assert.equal(1, simd.Int16x8.extractLane(c, 2));
        assert.equal(1, simd.Int16x8.extractLane(c, 3));
        assert.equal(0, simd.Int16x8.extractLane(c, 4));
        assert.equal(0, simd.Int16x8.extractLane(c, 5));
        assert.equal(0, simd.Int16x8.extractLane(c, 6));
        assert.equal(0, simd.Int16x8.extractLane(c, 7));

    });

    it("Int16x8 addSaturate", () => {
        const a = simd.Int16x8(0, 1, 0x7fff, 0x8000, -1, 0x7ffe, 0x8001, 10);
        const b = simd.Int16x8.splat(1);
        const c = simd.Int16x8.splat(-1);
        const d = simd.Int16x8.addSaturate(a, b);
        const e = simd.Int16x8.addSaturate(a, c);
        assert.equal(1, simd.Int16x8.extractLane(d, 0));
        assert.equal(2, simd.Int16x8.extractLane(d, 1));
        assert.equal(0x7fff, simd.Int16x8.extractLane(d, 2));
        assert.equal(-0x7fff, simd.Int16x8.extractLane(d, 3));
        assert.equal(0, simd.Int16x8.extractLane(d, 4));
        assert.equal(0x7fff, simd.Int16x8.extractLane(d, 5));
        assert.equal(-0x7ffe, simd.Int16x8.extractLane(d, 6));
        assert.equal(11, simd.Int16x8.extractLane(d, 7));
        assert.equal(-1, simd.Int16x8.extractLane(e, 0));
        assert.equal(0, simd.Int16x8.extractLane(e, 1));
        assert.equal(0x7ffe, simd.Int16x8.extractLane(e, 2));
        assert.equal(-0x8000, simd.Int16x8.extractLane(e, 3));
        assert.equal(-2, simd.Int16x8.extractLane(e, 4));
        assert.equal(0x7ffd, simd.Int16x8.extractLane(e, 5));
        assert.equal(-0x8000, simd.Int16x8.extractLane(e, 6));
        assert.equal(9, simd.Int16x8.extractLane(e, 7));

    });

    it("Int16x8 subSaturate", () => {
        const a = simd.Int16x8(0, 1, 0x7fff, 0x8000, -1, 0x7ffe, 0x8001, 10);
        const b = simd.Int16x8.splat(1);
        const c = simd.Int16x8.splat(-1);
        const d = simd.Int16x8.subSaturate(a, b);
        const e = simd.Int16x8.subSaturate(a, c);
        assert.equal(-1, simd.Int16x8.extractLane(d, 0));
        assert.equal(0, simd.Int16x8.extractLane(d, 1));
        assert.equal(0x7ffe, simd.Int16x8.extractLane(d, 2));
        assert.equal(-0x8000, simd.Int16x8.extractLane(d, 3));
        assert.equal(-2, simd.Int16x8.extractLane(d, 4));
        assert.equal(0x7ffd, simd.Int16x8.extractLane(d, 5));
        assert.equal(-0x8000, simd.Int16x8.extractLane(d, 6));
        assert.equal(9, simd.Int16x8.extractLane(d, 7));
        assert.equal(1, simd.Int16x8.extractLane(e, 0));
        assert.equal(2, simd.Int16x8.extractLane(e, 1));
        assert.equal(0x7fff, simd.Int16x8.extractLane(e, 2));
        assert.equal(-0x7fff, simd.Int16x8.extractLane(e, 3));
        assert.equal(0, simd.Int16x8.extractLane(e, 4));
        assert.equal(0x7fff, simd.Int16x8.extractLane(e, 5));
        assert.equal(-0x7ffe, simd.Int16x8.extractLane(e, 6));
        assert.equal(11, simd.Int16x8.extractLane(e, 7));

    });

    it("Int16x8 comparisons", () => {
        const m = simd.Int16x8(1000, 2000, 100, 1, -1000, -2000, -100, 1);
        const n = simd.Int16x8(-2000, 2000, 1, 100, 2000, -2000, -1, -100);
        let cmp;
        cmp = simd.Int16x8.lessThan(m, n);
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 0));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 1));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 2));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 3));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 4));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 5));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 6));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 7));

        cmp = simd.Int16x8.lessThanOrEqual(m, n);
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 0));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 1));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 2));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 3));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 4));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 5));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 6));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 7));

        cmp = simd.Int16x8.equal(m, n);
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 0));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 1));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 2));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 3));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 4));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 5));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 6));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 7));

        cmp = simd.Int16x8.notEqual(m, n);
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 0));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 1));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 2));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 3));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 4));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 5));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 6));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 7));

        cmp = simd.Int16x8.greaterThan(m, n);
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 0));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 1));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 2));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 3));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 4));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 5));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 6));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 7));

        cmp = simd.Int16x8.greaterThanOrEqual(m, n);
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 0));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 1));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 2));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 3));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 4));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 5));
        assert.equal(false, simd.Bool16x8.extractLane(cmp, 6));
        assert.equal(true, simd.Bool16x8.extractLane(cmp, 7));

    });

    it("Int16x8 shiftLeftByScalar", () => {
        const a = simd.Int16x8(0xffff, 0xffff, 0x7fff, 0xffff, 0x0, 0x1, 0x0, 0x0);
        let b;

        b = simd.Int16x8.shiftLeftByScalar(a, 1);
        assert.equal(simd.Int16x8.extractLane(b, 0), -2);
        assert.equal(simd.Int16x8.extractLane(b, 1), -2);
        assert.equal(simd.Int16x8.extractLane(b, 2), -2);
        assert.equal(simd.Int16x8.extractLane(b, 3), -2);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0002);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftLeftByScalar(a, 2);
        assert.equal(simd.Int16x8.extractLane(b, 0), -4);
        assert.equal(simd.Int16x8.extractLane(b, 1), -4);
        assert.equal(simd.Int16x8.extractLane(b, 2), -4);
        assert.equal(simd.Int16x8.extractLane(b, 3), -4);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0004);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftLeftByScalar(a, 14);
        assert.equal(simd.Int16x8.extractLane(b, 0), -16384);
        assert.equal(simd.Int16x8.extractLane(b, 1), -16384);
        assert.equal(simd.Int16x8.extractLane(b, 2), -16384);
        assert.equal(simd.Int16x8.extractLane(b, 3), -16384);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x4000);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftLeftByScalar(a, 15);
        assert.equal(simd.Int16x8.extractLane(b, 0), -32768);
        assert.equal(simd.Int16x8.extractLane(b, 1), -32768);
        assert.equal(simd.Int16x8.extractLane(b, 2), -32768);
        assert.equal(simd.Int16x8.extractLane(b, 3), -32768);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), -32768);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftLeftByScalar(a, 16);
        assert.equal(simd.Int16x8.extractLane(b, 0), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 1), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 3), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0);
        b = simd.Int16x8.shiftLeftByScalar(a, -1);
        assert.equal(simd.Int16x8.extractLane(b, 0), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 1), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 3), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0);

    });

    it("Int16x8 shiftRightArithmeticByScalar", () => {
        const a = simd.Int16x8(0xffff, 0xffff, 0x7fff, 0xffff, 0x0, 0x1, 0x0, 0x0);
        let b;

        b = simd.Int16x8.shiftRightArithmeticByScalar(a, 1);
        assert.equal(simd.Int16x8.extractLane(b, 0), -1);
        assert.equal(simd.Int16x8.extractLane(b, 1), -1);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x3fff);
        assert.equal(simd.Int16x8.extractLane(b, 3), -1);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftRightArithmeticByScalar(a, 2);
        assert.equal(simd.Int16x8.extractLane(b, 0), -1);
        assert.equal(simd.Int16x8.extractLane(b, 1), -1);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x1fff);
        assert.equal(simd.Int16x8.extractLane(b, 3), -1);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftRightArithmeticByScalar(a, 14);
        assert.equal(simd.Int16x8.extractLane(b, 0), -1);
        assert.equal(simd.Int16x8.extractLane(b, 1), -1);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x0001);
        assert.equal(simd.Int16x8.extractLane(b, 3), -1);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftRightArithmeticByScalar(a, 15);
        assert.equal(simd.Int16x8.extractLane(b, 0), -1);
        assert.equal(simd.Int16x8.extractLane(b, 1), -1);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 3), -1);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftRightArithmeticByScalar(a, 16);
        assert.equal(simd.Int16x8.extractLane(b, 0), -1);
        assert.equal(simd.Int16x8.extractLane(b, 1), -1);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 3), -1);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0);
        b = simd.Int16x8.shiftRightArithmeticByScalar(a, -1);
        assert.equal(simd.Int16x8.extractLane(b, 0), -1);
        assert.equal(simd.Int16x8.extractLane(b, 1), -1);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 3), -1);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0);

    });

    it("Int16x8 shiftRightLogicalByScalar", () => {
        const a = simd.Int16x8(0xffff, 0xffff, 0x7fff, 0xffff, 0x0, 0x1, 0x0, 0x0);
        let b;

        b = simd.Int16x8.shiftRightLogicalByScalar(a, 1);
        assert.equal(simd.Int16x8.extractLane(b, 0), 0x7fff);
        assert.equal(simd.Int16x8.extractLane(b, 1), 0x7fff);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x3fff);
        assert.equal(simd.Int16x8.extractLane(b, 3), 0x7fff);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftRightLogicalByScalar(a, 2);
        assert.equal(simd.Int16x8.extractLane(b, 0), 0x3fff);
        assert.equal(simd.Int16x8.extractLane(b, 1), 0x3fff);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x1fff);
        assert.equal(simd.Int16x8.extractLane(b, 3), 0x3fff);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftRightLogicalByScalar(a, 14);
        assert.equal(simd.Int16x8.extractLane(b, 0), 0x0003);
        assert.equal(simd.Int16x8.extractLane(b, 1), 0x0003);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x0001);
        assert.equal(simd.Int16x8.extractLane(b, 3), 0x0003);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftRightLogicalByScalar(a, 15);
        assert.equal(simd.Int16x8.extractLane(b, 0), 0x0001);
        assert.equal(simd.Int16x8.extractLane(b, 1), 0x0001);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 3), 0x0001);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0000);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0000);
        b = simd.Int16x8.shiftRightLogicalByScalar(a, 16);
        assert.equal(simd.Int16x8.extractLane(b, 0), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 1), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 3), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0);
        b = simd.Int16x8.shiftRightLogicalByScalar(a, -1);
        assert.equal(simd.Int16x8.extractLane(b, 0), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 1), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 2), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 3), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 4), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 5), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 6), 0x0);
        assert.equal(simd.Int16x8.extractLane(b, 7), 0x0);

    });

    it("Int16x8 select", () => {
        const m = simd.Bool16x8(true, true, true, true, false, false, false, false);
        const t = simd.Int16x8(1, 2, 3, 4, 5, 6, 7, 8);
        const f = simd.Int16x8(9, 10, 11, 12, 13, 14, 15, 16);
        const s = simd.Int16x8.select(m, t, f);
        assert.equal(1, simd.Int16x8.extractLane(s, 0));
        assert.equal(2, simd.Int16x8.extractLane(s, 1));
        assert.equal(3, simd.Int16x8.extractLane(s, 2));
        assert.equal(4, simd.Int16x8.extractLane(s, 3));
        assert.equal(13, simd.Int16x8.extractLane(s, 4));
        assert.equal(14, simd.Int16x8.extractLane(s, 5));
        assert.equal(15, simd.Int16x8.extractLane(s, 6));
        assert.equal(16, simd.Int16x8.extractLane(s, 7));

    });

    it("Int16x8 selectBits", () => {
        const m = simd.Int16x8(0xaaaaaaaa, 0xbbbbbbbb, 0xcccccccc, 0xdddddddd, 0xeeeeeeee, 0xffffffff, 0x00000000, 0x55555555);
        const t = simd.Int16x8(1, 2, 3, 4, 5, 6, 7, 8);
        const f = simd.Int16x8(9, 10, 11, 12, 13, 14, 15, 16);
        const s = simd.Int16x8.selectBits(m, t, f);
        assert.equal(1, simd.Int16x8.extractLane(s, 0));
        assert.equal(2, simd.Int16x8.extractLane(s, 1));
        assert.equal(3, simd.Int16x8.extractLane(s, 2));
        assert.equal(4, simd.Int16x8.extractLane(s, 3));
        assert.equal(5, simd.Int16x8.extractLane(s, 4));
        assert.equal(6, simd.Int16x8.extractLane(s, 5));
        assert.equal(15, simd.Int16x8.extractLane(s, 6));
        assert.equal(0, simd.Int16x8.extractLane(s, 7));

    });

    it("Int8x16 swizzle", () => {
        const a = simd.Int8x16(1, 2, 3, 2147483647, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, -37);
        const xyxy = simd.Int8x16.swizzle(a, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1);
        const zwzw = simd.Int8x16.swizzle(a, 8, 9, 8, 9, 8, 9, 8, 9, 8, 9, 8, 9, 8, 9, 8, 9);
        const xxxx = simd.Int8x16.swizzle(a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert.equal(1, simd.Int8x16.extractLane(xyxy, 0));
        assert.equal(2, simd.Int8x16.extractLane(xyxy, 1));
        assert.equal(1, simd.Int8x16.extractLane(xyxy, 2));
        assert.equal(2, simd.Int8x16.extractLane(xyxy, 3));
        assert.equal(1, simd.Int8x16.extractLane(xyxy, 4));
        assert.equal(2, simd.Int8x16.extractLane(xyxy, 5));
        assert.equal(1, simd.Int8x16.extractLane(xyxy, 6));
        assert.equal(2, simd.Int8x16.extractLane(xyxy, 7));
        assert.equal(1, simd.Int8x16.extractLane(xyxy, 8));
        assert.equal(2, simd.Int8x16.extractLane(xyxy, 9));
        assert.equal(1, simd.Int8x16.extractLane(xyxy, 10));
        assert.equal(2, simd.Int8x16.extractLane(xyxy, 11));
        assert.equal(1, simd.Int8x16.extractLane(xyxy, 12));
        assert.equal(2, simd.Int8x16.extractLane(xyxy, 13));
        assert.equal(1, simd.Int8x16.extractLane(xyxy, 14));
        assert.equal(2, simd.Int8x16.extractLane(xyxy, 15));
        assert.equal(9, simd.Int8x16.extractLane(zwzw, 0));
        assert.equal(10, simd.Int8x16.extractLane(zwzw, 1));
        assert.equal(9, simd.Int8x16.extractLane(zwzw, 2));
        assert.equal(10, simd.Int8x16.extractLane(zwzw, 3));
        assert.equal(9, simd.Int8x16.extractLane(zwzw, 4));
        assert.equal(10, simd.Int8x16.extractLane(zwzw, 5));
        assert.equal(9, simd.Int8x16.extractLane(zwzw, 6));
        assert.equal(10, simd.Int8x16.extractLane(zwzw, 7));
        assert.equal(9, simd.Int8x16.extractLane(zwzw, 8));
        assert.equal(10, simd.Int8x16.extractLane(zwzw, 9));
        assert.equal(9, simd.Int8x16.extractLane(zwzw, 10));
        assert.equal(10, simd.Int8x16.extractLane(zwzw, 11));
        assert.equal(9, simd.Int8x16.extractLane(zwzw, 12));
        assert.equal(10, simd.Int8x16.extractLane(zwzw, 13));
        assert.equal(9, simd.Int8x16.extractLane(zwzw, 14));
        assert.equal(10, simd.Int8x16.extractLane(zwzw, 15));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 0));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 1));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 2));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 3));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 4));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 5));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 6));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 7));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 8));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 9));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 10));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 11));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 12));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 13));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 14));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 15));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Int8x16.swizzle(a, index, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(16);

    });

    it("Int8x16 shuffle", () => {
        const a = simd.Int8x16(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        const b = simd.Int8x16(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127);
        const xyxy = simd.Int8x16.shuffle(a, b, 0, 1, 2, 3, 4, 5, 6, 7, 16, 17, 18, 19, 20, 21, 22, 23);
        const zwzw = simd.Int8x16.shuffle(a, b, 8, 9, 10, 11, 12, 13, 14, 15, 24, 25, 26, 27, 28, 29, 30, 31);
        const xxxx = simd.Int8x16.shuffle(a, b, 0, 0, 0, 0, 0, 0, 0, 0, 16, 16, 16, 16, 16, 16, 16, 16);
        assert.equal(1, simd.Int8x16.extractLane(xyxy, 0));
        assert.equal(2, simd.Int8x16.extractLane(xyxy, 1));
        assert.equal(3, simd.Int8x16.extractLane(xyxy, 2));
        assert.equal(4, simd.Int8x16.extractLane(xyxy, 3));
        assert.equal(5, simd.Int8x16.extractLane(xyxy, 4));
        assert.equal(6, simd.Int8x16.extractLane(xyxy, 5));
        assert.equal(7, simd.Int8x16.extractLane(xyxy, 6));
        assert.equal(8, simd.Int8x16.extractLane(xyxy, 7));
        assert.equal(17, simd.Int8x16.extractLane(xyxy, 8));
        assert.equal(18, simd.Int8x16.extractLane(xyxy, 9));
        assert.equal(19, simd.Int8x16.extractLane(xyxy, 10));
        assert.equal(20, simd.Int8x16.extractLane(xyxy, 11));
        assert.equal(21, simd.Int8x16.extractLane(xyxy, 12));
        assert.equal(22, simd.Int8x16.extractLane(xyxy, 13));
        assert.equal(23, simd.Int8x16.extractLane(xyxy, 14));
        assert.equal(24, simd.Int8x16.extractLane(xyxy, 15));
        assert.equal(9, simd.Int8x16.extractLane(zwzw, 0));
        assert.equal(10, simd.Int8x16.extractLane(zwzw, 1));
        assert.equal(11, simd.Int8x16.extractLane(zwzw, 2));
        assert.equal(12, simd.Int8x16.extractLane(zwzw, 3));
        assert.equal(13, simd.Int8x16.extractLane(zwzw, 4));
        assert.equal(14, simd.Int8x16.extractLane(zwzw, 5));
        assert.equal(15, simd.Int8x16.extractLane(zwzw, 6));
        assert.equal(16, simd.Int8x16.extractLane(zwzw, 7));
        assert.equal(25, simd.Int8x16.extractLane(zwzw, 8));
        assert.equal(26, simd.Int8x16.extractLane(zwzw, 9));
        assert.equal(27, simd.Int8x16.extractLane(zwzw, 10));
        assert.equal(28, simd.Int8x16.extractLane(zwzw, 11));
        assert.equal(29, simd.Int8x16.extractLane(zwzw, 12));
        assert.equal(30, simd.Int8x16.extractLane(zwzw, 13));
        assert.equal(31, simd.Int8x16.extractLane(zwzw, 14));
        assert.equal(127, simd.Int8x16.extractLane(zwzw, 15));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 0));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 1));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 2));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 3));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 4));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 5));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 6));
        assert.equal(1, simd.Int8x16.extractLane(xxxx, 7));
        assert.equal(17, simd.Int8x16.extractLane(xxxx, 8));
        assert.equal(17, simd.Int8x16.extractLane(xxxx, 9));
        assert.equal(17, simd.Int8x16.extractLane(xxxx, 10));
        assert.equal(17, simd.Int8x16.extractLane(xxxx, 11));
        assert.equal(17, simd.Int8x16.extractLane(xxxx, 12));
        assert.equal(17, simd.Int8x16.extractLane(xxxx, 13));
        assert.equal(17, simd.Int8x16.extractLane(xxxx, 14));
        assert.equal(17, simd.Int8x16.extractLane(xxxx, 15));

        const testIndexCheck = (index) => {
            assert.throws(() => simd.Int8x16.shuffle(a, b, index, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
        };
        testIndexCheck(13.37);
        testIndexCheck(null);
        testIndexCheck(undefined);
        testIndexCheck({});
        testIndexCheck(true);
        testIndexCheck("yo");
        testIndexCheck(-1);
        testIndexCheck(32);

    });

    it("Int8x16 and", () => {
        const m = simd.Int8x16(0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 170, 170, 170, 170, 0xAA, 0xAA, 0xAA, 0xAA);
        const n = simd.Int8x16(0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55);
        assert.equal(-86, simd.Int8x16.extractLane(m, 0));
        assert.equal(-86, simd.Int8x16.extractLane(m, 1));
        assert.equal(-86, simd.Int8x16.extractLane(m, 2));
        assert.equal(-86, simd.Int8x16.extractLane(m, 3));
        assert.equal(-86, simd.Int8x16.extractLane(m, 4));
        assert.equal(-86, simd.Int8x16.extractLane(m, 5));
        assert.equal(-86, simd.Int8x16.extractLane(m, 6));
        assert.equal(-86, simd.Int8x16.extractLane(m, 7));
        assert.equal(-86, simd.Int8x16.extractLane(m, 8));
        assert.equal(-86, simd.Int8x16.extractLane(m, 9));
        assert.equal(-86, simd.Int8x16.extractLane(m, 10));
        assert.equal(-86, simd.Int8x16.extractLane(m, 11));
        assert.equal(-86, simd.Int8x16.extractLane(m, 12));
        assert.equal(-86, simd.Int8x16.extractLane(m, 13));
        assert.equal(-86, simd.Int8x16.extractLane(m, 14));
        assert.equal(-86, simd.Int8x16.extractLane(m, 15));
        assert.equal(85, simd.Int8x16.extractLane(n, 0));
        assert.equal(85, simd.Int8x16.extractLane(n, 1));
        assert.equal(85, simd.Int8x16.extractLane(n, 2));
        assert.equal(85, simd.Int8x16.extractLane(n, 3));
        assert.equal(85, simd.Int8x16.extractLane(n, 4));
        assert.equal(85, simd.Int8x16.extractLane(n, 5));
        assert.equal(85, simd.Int8x16.extractLane(n, 6));
        assert.equal(85, simd.Int8x16.extractLane(n, 7));
        assert.equal(85, simd.Int8x16.extractLane(n, 8));
        assert.equal(85, simd.Int8x16.extractLane(n, 9));
        assert.equal(85, simd.Int8x16.extractLane(n, 10));
        assert.equal(85, simd.Int8x16.extractLane(n, 11));
        assert.equal(85, simd.Int8x16.extractLane(n, 12));
        assert.equal(85, simd.Int8x16.extractLane(n, 13));
        assert.equal(85, simd.Int8x16.extractLane(n, 14));
        assert.equal(85, simd.Int8x16.extractLane(n, 15));
        const o = simd.Int8x16.and(m, n);  // and
        assert.equal(0x0, simd.Int8x16.extractLane(o, 0));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 1));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 2));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 3));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 4));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 5));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 6));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 7));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 8));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 9));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 10));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 11));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 12));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 13));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 14));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 15));

    });

    it("Int8x16 or", () => {
        const m = simd.Int8x16(0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA);
        const n = simd.Int8x16(0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55);
        const o = simd.Int8x16.or(m, n);  // or
        assert.equal(-1, simd.Int8x16.extractLane(o, 0));
        assert.equal(-1, simd.Int8x16.extractLane(o, 1));
        assert.equal(-1, simd.Int8x16.extractLane(o, 2));
        assert.equal(-1, simd.Int8x16.extractLane(o, 3));
        assert.equal(-1, simd.Int8x16.extractLane(o, 4));
        assert.equal(-1, simd.Int8x16.extractLane(o, 5));
        assert.equal(-1, simd.Int8x16.extractLane(o, 6));
        assert.equal(-1, simd.Int8x16.extractLane(o, 7));
        assert.equal(-1, simd.Int8x16.extractLane(o, 8));
        assert.equal(-1, simd.Int8x16.extractLane(o, 9));
        assert.equal(-1, simd.Int8x16.extractLane(o, 10));
        assert.equal(-1, simd.Int8x16.extractLane(o, 11));
        assert.equal(-1, simd.Int8x16.extractLane(o, 12));
        assert.equal(-1, simd.Int8x16.extractLane(o, 13));
        assert.equal(-1, simd.Int8x16.extractLane(o, 14));
        assert.equal(-1, simd.Int8x16.extractLane(o, 15));

    });

    it("Int8x16 xor", () => {
        const m = simd.Int8x16(0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA);
        const n = simd.Int8x16(0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55);
        let o = simd.Int8x16.xor(m, n);  // xor
        assert.equal(-1, simd.Int8x16.extractLane(o, 0));
        assert.equal(-1, simd.Int8x16.extractLane(o, 1));
        assert.equal(-1, simd.Int8x16.extractLane(o, 2));
        assert.equal(-1, simd.Int8x16.extractLane(o, 3));
        assert.equal(-1, simd.Int8x16.extractLane(o, 4));
        assert.equal(-1, simd.Int8x16.extractLane(o, 5));
        assert.equal(-1, simd.Int8x16.extractLane(o, 6));
        assert.equal(-1, simd.Int8x16.extractLane(o, 7));
        assert.equal(-1, simd.Int8x16.extractLane(o, 8));
        assert.equal(-1, simd.Int8x16.extractLane(o, 9));
        assert.equal(-1, simd.Int8x16.extractLane(o, 10));
        assert.equal(-1, simd.Int8x16.extractLane(o, 11));
        assert.equal(-1, simd.Int8x16.extractLane(o, 12));
        assert.equal(-1, simd.Int8x16.extractLane(o, 13));
        assert.equal(-1, simd.Int8x16.extractLane(o, 14));
        assert.equal(-1, simd.Int8x16.extractLane(o, 15));
        o = simd.Int8x16.xor(m, m);  // xor
        assert.equal(0x0, simd.Int8x16.extractLane(o, 0));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 1));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 2));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 3));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 4));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 5));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 6));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 7));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 8));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 9));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 10));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 11));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 12));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 13));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 14));
        assert.equal(0x0, simd.Int8x16.extractLane(o, 15));

    });

    it("Int8x16 neg", () => {
        let m = simd.Int8x16(16, -32, 64, -128, 256, -512, 1024, -2048, 4096, -8192, 16384, -32768, 65536, -131072, 262144, -524288);
        m = simd.Int8x16.neg(m);
        assert.equal(-16, simd.Int8x16.extractLane(m, 0));
        assert.equal(32, simd.Int8x16.extractLane(m, 1));
        assert.equal(-64, simd.Int8x16.extractLane(m, 2));
        assert.equal(-128, simd.Int8x16.extractLane(m, 3));
        assert.equal(0, simd.Int8x16.extractLane(m, 4));
        assert.equal(0, simd.Int8x16.extractLane(m, 5));
        assert.equal(0, simd.Int8x16.extractLane(m, 6));
        assert.equal(0, simd.Int8x16.extractLane(m, 7));
        assert.equal(0, simd.Int8x16.extractLane(m, 8));
        assert.equal(0, simd.Int8x16.extractLane(m, 9));
        assert.equal(0, simd.Int8x16.extractLane(m, 10));
        assert.equal(0, simd.Int8x16.extractLane(m, 11));
        assert.equal(0, simd.Int8x16.extractLane(m, 12));
        assert.equal(0, simd.Int8x16.extractLane(m, 13));
        assert.equal(0, simd.Int8x16.extractLane(m, 14));
        assert.equal(0, simd.Int8x16.extractLane(m, 15));

        let n = simd.Int8x16(0, 0, 0, 0, 0x7f, 0xff, 0xff, 0xff, -1, -1, -1, -1, 0x80, 0x00, 0x00, 0x00);
        n = simd.Int8x16.neg(n);
        assert.equal(0, simd.Int8x16.extractLane(n, 0));
        assert.equal(0, simd.Int8x16.extractLane(n, 1));
        assert.equal(0, simd.Int8x16.extractLane(n, 2));
        assert.equal(0, simd.Int8x16.extractLane(n, 3));
        assert.equal(-127, simd.Int8x16.extractLane(n, 4));
        assert.equal(1, simd.Int8x16.extractLane(n, 5));
        assert.equal(1, simd.Int8x16.extractLane(n, 6));
        assert.equal(1, simd.Int8x16.extractLane(n, 7));
        assert.equal(1, simd.Int8x16.extractLane(n, 8));
        assert.equal(1, simd.Int8x16.extractLane(n, 9));
        assert.equal(1, simd.Int8x16.extractLane(n, 10));
        assert.equal(1, simd.Int8x16.extractLane(n, 11));
        assert.equal(-128, simd.Int8x16.extractLane(n, 12));
        assert.equal(0, simd.Int8x16.extractLane(n, 13));
        assert.equal(0, simd.Int8x16.extractLane(n, 14));
        assert.equal(0, simd.Int8x16.extractLane(n, 15));

    });

    it("Int8x16 add", () => {
        const a = simd.Int8x16(0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7f, 0xff, 0xff, 0xff, 0x0, 0x0, 0x0, 0x0);
        const b = simd.Int8x16(0x0, 0x0, 0x0, 0x1, 0xFF, 0xFF, 0xFF, 0xFF, 0x0, 0x0, 0x0, 0x1, 0xFF, 0xFF, 0xFF, 0xFF);
        const c = simd.Int8x16.add(a, b);
        assert.equal(-1, simd.Int8x16.extractLane(c, 0));
        assert.equal(-1, simd.Int8x16.extractLane(c, 1));
        assert.equal(-1, simd.Int8x16.extractLane(c, 2));
        assert.equal(0x0, simd.Int8x16.extractLane(c, 3));
        assert.equal(-2, simd.Int8x16.extractLane(c, 4));
        assert.equal(-2, simd.Int8x16.extractLane(c, 5));
        assert.equal(-2, simd.Int8x16.extractLane(c, 6));
        assert.equal(-2, simd.Int8x16.extractLane(c, 7));
        assert.equal(0x7f, simd.Int8x16.extractLane(c, 8));
        assert.equal(-1, simd.Int8x16.extractLane(c, 9));
        assert.equal(-1, simd.Int8x16.extractLane(c, 10));
        assert.equal(0x0, simd.Int8x16.extractLane(c, 11));
        assert.equal(-1, simd.Int8x16.extractLane(c, 12));
        assert.equal(-1, simd.Int8x16.extractLane(c, 13));
        assert.equal(-1, simd.Int8x16.extractLane(c, 14));
        assert.equal(-1, simd.Int8x16.extractLane(c, 15));

    });

    it("Int8x16 sub", () => {
        const a = simd.Int8x16(0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7f, 0xff, 0xff, 0xff, 0x0, 0x0, 0x0, 0x0);
        const b = simd.Int8x16(0x0, 0x0, 0x0, 0x1, 0xFF, 0xFF, 0xFF, 0xFF, 0x0, 0x0, 0x0, 0x1, 0xFF, 0xFF, 0xFF, 0xFF);
        const c = simd.Int8x16.sub(a, b);
        assert.equal(-1, simd.Int8x16.extractLane(c, 0));
        assert.equal(-1, simd.Int8x16.extractLane(c, 1));
        assert.equal(-1, simd.Int8x16.extractLane(c, 2));
        assert.equal(-2, simd.Int8x16.extractLane(c, 3));
        assert.equal(0, simd.Int8x16.extractLane(c, 4));
        assert.equal(0, simd.Int8x16.extractLane(c, 5));
        assert.equal(0, simd.Int8x16.extractLane(c, 6));
        assert.equal(0, simd.Int8x16.extractLane(c, 7));
        assert.equal(0x7f, simd.Int8x16.extractLane(c, 8));
        assert.equal(-1, simd.Int8x16.extractLane(c, 9));
        assert.equal(-1, simd.Int8x16.extractLane(c, 10));
        assert.equal(-2, simd.Int8x16.extractLane(c, 11));
        assert.equal(1, simd.Int8x16.extractLane(c, 12));
        assert.equal(1, simd.Int8x16.extractLane(c, 13));
        assert.equal(1, simd.Int8x16.extractLane(c, 14));
        assert.equal(1, simd.Int8x16.extractLane(c, 15));

    });

    it("Int8x16 mul", () => {
        const a = simd.Int8x16(0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7f, 0xff, 0xff, 0xff, 0x0, 0x0, 0x0, 0x0);
        const b = simd.Int8x16(0x0, 0x0, 0x0, 0x1, 0xFF, 0xFF, 0xFF, 0xFF, 0x0, 0x0, 0x0, 0x1, 0xFF, 0xFF, 0xFF, 0xFF);
        const c = simd.Int8x16.mul(a, b);
        assert.equal(0x0, simd.Int8x16.extractLane(c, 0));
        assert.equal(0x0, simd.Int8x16.extractLane(c, 1));
        assert.equal(0x0, simd.Int8x16.extractLane(c, 2));
        assert.equal(-1, simd.Int8x16.extractLane(c, 3));
        assert.equal(1, simd.Int8x16.extractLane(c, 4));
        assert.equal(1, simd.Int8x16.extractLane(c, 5));
        assert.equal(1, simd.Int8x16.extractLane(c, 6));
        assert.equal(1, simd.Int8x16.extractLane(c, 7));
        assert.equal(0, simd.Int8x16.extractLane(c, 8));
        assert.equal(0, simd.Int8x16.extractLane(c, 9));
        assert.equal(0, simd.Int8x16.extractLane(c, 10));
        assert.equal(-1, simd.Int8x16.extractLane(c, 11));
        assert.equal(0, simd.Int8x16.extractLane(c, 12));
        assert.equal(0, simd.Int8x16.extractLane(c, 13));
        assert.equal(0, simd.Int8x16.extractLane(c, 14));
        assert.equal(0, simd.Int8x16.extractLane(c, 15));

    });

    it("Int8x16 addSaturate", () => {
        const a = simd.Int8x16(0, 1, 0x7f, 0x80, -1, 0x7e, 0x81, 10, 11, 12, 13, 14, 15, 16, 17, 18);
        const b = simd.Int8x16.splat(1);
        const c = simd.Int8x16.splat(-1);
        const d = simd.Int8x16.addSaturate(a, b);
        const e = simd.Int8x16.addSaturate(a, c);
        assert.equal(1, simd.Int8x16.extractLane(d, 0));
        assert.equal(2, simd.Int8x16.extractLane(d, 1));
        assert.equal(0x7f, simd.Int8x16.extractLane(d, 2));
        assert.equal(-0x7f, simd.Int8x16.extractLane(d, 3));
        assert.equal(0, simd.Int8x16.extractLane(d, 4));
        assert.equal(0x7f, simd.Int8x16.extractLane(d, 5));
        assert.equal(-0x7e, simd.Int8x16.extractLane(d, 6));
        assert.equal(11, simd.Int8x16.extractLane(d, 7));
        assert.equal(12, simd.Int8x16.extractLane(d, 8));
        assert.equal(13, simd.Int8x16.extractLane(d, 9));
        assert.equal(14, simd.Int8x16.extractLane(d, 10));
        assert.equal(15, simd.Int8x16.extractLane(d, 11));
        assert.equal(16, simd.Int8x16.extractLane(d, 12));
        assert.equal(17, simd.Int8x16.extractLane(d, 13));
        assert.equal(18, simd.Int8x16.extractLane(d, 14));
        assert.equal(19, simd.Int8x16.extractLane(d, 15));
        assert.equal(-1, simd.Int8x16.extractLane(e, 0));
        assert.equal(0, simd.Int8x16.extractLane(e, 1));
        assert.equal(0x7e, simd.Int8x16.extractLane(e, 2));
        assert.equal(-0x80, simd.Int8x16.extractLane(e, 3));
        assert.equal(-2, simd.Int8x16.extractLane(e, 4));
        assert.equal(0x7d, simd.Int8x16.extractLane(e, 5));
        assert.equal(-0x80, simd.Int8x16.extractLane(e, 6));
        assert.equal(9, simd.Int8x16.extractLane(e, 7));
        assert.equal(10, simd.Int8x16.extractLane(e, 8));
        assert.equal(11, simd.Int8x16.extractLane(e, 9));
        assert.equal(12, simd.Int8x16.extractLane(e, 10));
        assert.equal(13, simd.Int8x16.extractLane(e, 11));
        assert.equal(14, simd.Int8x16.extractLane(e, 12));
        assert.equal(15, simd.Int8x16.extractLane(e, 13));
        assert.equal(16, simd.Int8x16.extractLane(e, 14));
        assert.equal(17, simd.Int8x16.extractLane(e, 15));

    });

    it("Int8x16 subSaturate", () => {
        const a = simd.Int8x16(0, 1, 0x7f, 0x80, -1, 0x7e, 0x81, 10, 11, 12, 13, 14, 15, 16, 17, 18);
        const b = simd.Int8x16.splat(1);
        const c = simd.Int8x16.splat(-1);
        const d = simd.Int8x16.subSaturate(a, b);
        const e = simd.Int8x16.subSaturate(a, c);
        assert.equal(-1, simd.Int8x16.extractLane(d, 0));
        assert.equal(0, simd.Int8x16.extractLane(d, 1));
        assert.equal(0x7e, simd.Int8x16.extractLane(d, 2));
        assert.equal(-0x80, simd.Int8x16.extractLane(d, 3));
        assert.equal(-2, simd.Int8x16.extractLane(d, 4));
        assert.equal(0x7d, simd.Int8x16.extractLane(d, 5));
        assert.equal(-0x80, simd.Int8x16.extractLane(d, 6));
        assert.equal(9, simd.Int8x16.extractLane(d, 7));
        assert.equal(10, simd.Int8x16.extractLane(d, 8));
        assert.equal(11, simd.Int8x16.extractLane(d, 9));
        assert.equal(12, simd.Int8x16.extractLane(d, 10));
        assert.equal(13, simd.Int8x16.extractLane(d, 11));
        assert.equal(14, simd.Int8x16.extractLane(d, 12));
        assert.equal(15, simd.Int8x16.extractLane(d, 13));
        assert.equal(16, simd.Int8x16.extractLane(d, 14));
        assert.equal(17, simd.Int8x16.extractLane(d, 15));
        assert.equal(1, simd.Int8x16.extractLane(e, 0));
        assert.equal(2, simd.Int8x16.extractLane(e, 1));
        assert.equal(0x7f, simd.Int8x16.extractLane(e, 2));
        assert.equal(-0x7f, simd.Int8x16.extractLane(e, 3));
        assert.equal(0, simd.Int8x16.extractLane(e, 4));
        assert.equal(0x7f, simd.Int8x16.extractLane(e, 5));
        assert.equal(-0x7e, simd.Int8x16.extractLane(e, 6));
        assert.equal(11, simd.Int8x16.extractLane(e, 7));
        assert.equal(12, simd.Int8x16.extractLane(e, 8));
        assert.equal(13, simd.Int8x16.extractLane(e, 9));
        assert.equal(14, simd.Int8x16.extractLane(e, 10));
        assert.equal(15, simd.Int8x16.extractLane(e, 11));
        assert.equal(16, simd.Int8x16.extractLane(e, 12));
        assert.equal(17, simd.Int8x16.extractLane(e, 13));
        assert.equal(18, simd.Int8x16.extractLane(e, 14));
        assert.equal(19, simd.Int8x16.extractLane(e, 15));

    });

    it("Int8x16 sumOfAbsoluteDifferences", () => {
        const a = simd.Int8x16(0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7f, 0xff, 0xff, 0xff, 0x0, 0x0, 0x0, 0x0);
        const b = simd.Int8x16(0x0, 0x0, 0x0, 0x1, 0xFF, 0xFF, 0xFF, 0xFF, 0x0, 0x0, 0x0, 0x1, 0xFF, 0xFF, 0xFF, 0xFF);
        const c = simd.Int8x16.sumOfAbsoluteDifferences(a, b);
        assert.equal(c, 140);

    });

    it("Int8x16 comparisons", () => {
        const m = simd.Int8x16(1000, 2000, 100, 1, -1000, -2000, -100, 1, 0, 0, 0, 0, -1, 1, -2, 2);
        const n = simd.Int8x16(-2000, 2000, 1, 100, 2000, -2000, -1, -100, -1, 1, -2, 2, 0, 0, 0, 0);
        let cmp;
        cmp = simd.Int8x16.lessThan(m, n);
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 0));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 1));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 2));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 3));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 4));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 5));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 6));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 7));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 8));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 9));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 10));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 11));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 12));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 13));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 14));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 15));

        cmp = simd.Int8x16.lessThanOrEqual(m, n);
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 0));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 1));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 2));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 3));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 4));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 5));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 6));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 7));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 8));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 9));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 10));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 11));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 12));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 13));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 14));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 15));

        cmp = simd.Int8x16.equal(m, n);
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 0));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 1));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 2));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 3));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 4));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 5));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 6));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 7));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 8));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 9));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 10));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 11));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 12));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 13));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 14));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 15));

        cmp = simd.Int8x16.notEqual(m, n);
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 0));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 1));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 2));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 3));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 4));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 5));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 6));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 7));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 8));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 9));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 10));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 11));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 12));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 13));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 14));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 15));

        cmp = simd.Int8x16.greaterThan(m, n);
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 0));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 1));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 2));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 3));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 4));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 5));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 6));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 7));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 8));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 9));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 10));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 11));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 12));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 13));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 14));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 15));

        cmp = simd.Int8x16.greaterThanOrEqual(m, n);
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 0));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 1));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 2));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 3));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 4));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 5));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 6));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 7));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 8));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 9));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 10));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 11));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 12));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 13));
        assert.equal(false, simd.Bool8x16.extractLane(cmp, 14));
        assert.equal(true, simd.Bool8x16.extractLane(cmp, 15));

    });

    it("Int8x16 shiftLeftByScalar", () => {
        const a = simd.Int8x16(0xff, 0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 0x0, 0x0, 0x0, 0x1, 0x0, 0x0, 0x0, 0x0);
        let b;

        b = simd.Int8x16.shiftLeftByScalar(a, 1);
        assert.equal(simd.Int8x16.extractLane(b, 0), -2);
        assert.equal(simd.Int8x16.extractLane(b, 1), -2);
        assert.equal(simd.Int8x16.extractLane(b, 2), -2);
        assert.equal(simd.Int8x16.extractLane(b, 3), -2);
        assert.equal(simd.Int8x16.extractLane(b, 4), -2);
        assert.equal(simd.Int8x16.extractLane(b, 5), -2);
        assert.equal(simd.Int8x16.extractLane(b, 6), -2);
        assert.equal(simd.Int8x16.extractLane(b, 7), -2);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x02);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftLeftByScalar(a, 2);
        assert.equal(simd.Int8x16.extractLane(b, 0), -4);
        assert.equal(simd.Int8x16.extractLane(b, 1), -4);
        assert.equal(simd.Int8x16.extractLane(b, 2), -4);
        assert.equal(simd.Int8x16.extractLane(b, 3), -4);
        assert.equal(simd.Int8x16.extractLane(b, 4), -4);
        assert.equal(simd.Int8x16.extractLane(b, 5), -4);
        assert.equal(simd.Int8x16.extractLane(b, 6), -4);
        assert.equal(simd.Int8x16.extractLane(b, 7), -4);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x04);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftLeftByScalar(a, 6);
        assert.equal(simd.Int8x16.extractLane(b, 0), -64);
        assert.equal(simd.Int8x16.extractLane(b, 1), -64);
        assert.equal(simd.Int8x16.extractLane(b, 2), -64);
        assert.equal(simd.Int8x16.extractLane(b, 3), -64);
        assert.equal(simd.Int8x16.extractLane(b, 4), -64);
        assert.equal(simd.Int8x16.extractLane(b, 5), -64);
        assert.equal(simd.Int8x16.extractLane(b, 6), -64);
        assert.equal(simd.Int8x16.extractLane(b, 7), -64);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x40);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftLeftByScalar(a, 7);
        assert.equal(simd.Int8x16.extractLane(b, 0), -128);
        assert.equal(simd.Int8x16.extractLane(b, 1), -128);
        assert.equal(simd.Int8x16.extractLane(b, 2), -128);
        assert.equal(simd.Int8x16.extractLane(b, 3), -128);
        assert.equal(simd.Int8x16.extractLane(b, 4), -128);
        assert.equal(simd.Int8x16.extractLane(b, 5), -128);
        assert.equal(simd.Int8x16.extractLane(b, 6), -128);
        assert.equal(simd.Int8x16.extractLane(b, 7), -128);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), -128);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftLeftByScalar(a, 16);
        assert.equal(simd.Int8x16.extractLane(b, 0), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 1), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 2), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 3), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 5), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 6), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 7), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x0);
        b = simd.Int8x16.shiftLeftByScalar(a, -1);
        assert.equal(simd.Int8x16.extractLane(b, 0), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 1), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 2), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 3), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 5), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 6), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 7), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x0);

    });

    it("Int8x16 shiftRightArithmeticByScalar", () => {
        const a = simd.Int8x16(0xff, 0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 0x0, 0x0, 0x0, 0x1, 0x0, 0x0, 0x0, 0x0);
        let b;

        b = simd.Int8x16.shiftRightArithmeticByScalar(a, 1);
        assert.equal(simd.Int8x16.extractLane(b, 0), -1);
        assert.equal(simd.Int8x16.extractLane(b, 1), -1);
        assert.equal(simd.Int8x16.extractLane(b, 2), -1);
        assert.equal(simd.Int8x16.extractLane(b, 3), -1);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x3f);
        assert.equal(simd.Int8x16.extractLane(b, 5), -1);
        assert.equal(simd.Int8x16.extractLane(b, 6), -1);
        assert.equal(simd.Int8x16.extractLane(b, 7), -1);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftRightArithmeticByScalar(a, 2);
        assert.equal(simd.Int8x16.extractLane(b, 0), -1);
        assert.equal(simd.Int8x16.extractLane(b, 1), -1);
        assert.equal(simd.Int8x16.extractLane(b, 2), -1);
        assert.equal(simd.Int8x16.extractLane(b, 3), -1);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x1f);
        assert.equal(simd.Int8x16.extractLane(b, 5), -1);
        assert.equal(simd.Int8x16.extractLane(b, 6), -1);
        assert.equal(simd.Int8x16.extractLane(b, 7), -1);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftRightArithmeticByScalar(a, 6);
        assert.equal(simd.Int8x16.extractLane(b, 0), -1);
        assert.equal(simd.Int8x16.extractLane(b, 1), -1);
        assert.equal(simd.Int8x16.extractLane(b, 2), -1);
        assert.equal(simd.Int8x16.extractLane(b, 3), -1);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x01);
        assert.equal(simd.Int8x16.extractLane(b, 5), -1);
        assert.equal(simd.Int8x16.extractLane(b, 6), -1);
        assert.equal(simd.Int8x16.extractLane(b, 7), -1);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftRightArithmeticByScalar(a, 7);
        assert.equal(simd.Int8x16.extractLane(b, 0), -1);
        assert.equal(simd.Int8x16.extractLane(b, 1), -1);
        assert.equal(simd.Int8x16.extractLane(b, 2), -1);
        assert.equal(simd.Int8x16.extractLane(b, 3), -1);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 5), -1);
        assert.equal(simd.Int8x16.extractLane(b, 6), -1);
        assert.equal(simd.Int8x16.extractLane(b, 7), -1);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftRightArithmeticByScalar(a, 8);
        assert.equal(simd.Int8x16.extractLane(b, 0), -1);
        assert.equal(simd.Int8x16.extractLane(b, 1), -1);
        assert.equal(simd.Int8x16.extractLane(b, 2), -1);
        assert.equal(simd.Int8x16.extractLane(b, 3), -1);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 5), -1);
        assert.equal(simd.Int8x16.extractLane(b, 6), -1);
        assert.equal(simd.Int8x16.extractLane(b, 7), -1);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x0);
        b = simd.Int8x16.shiftRightArithmeticByScalar(a, -1);
        assert.equal(simd.Int8x16.extractLane(b, 0), -1);
        assert.equal(simd.Int8x16.extractLane(b, 1), -1);
        assert.equal(simd.Int8x16.extractLane(b, 2), -1);
        assert.equal(simd.Int8x16.extractLane(b, 3), -1);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 5), -1);
        assert.equal(simd.Int8x16.extractLane(b, 6), -1);
        assert.equal(simd.Int8x16.extractLane(b, 7), -1);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x0);

    });

    it("Int8x16 shiftRightLogicalByScalar", () => {
        const a = simd.Int8x16(0xff, 0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 0x0, 0x0, 0x0, 0x1, 0x0, 0x0, 0x0, 0x0);
        let b;

        b = simd.Int8x16.shiftRightLogicalByScalar(a, 1);
        assert.equal(simd.Int8x16.extractLane(b, 0), 0x7f);
        assert.equal(simd.Int8x16.extractLane(b, 1), 0x7f);
        assert.equal(simd.Int8x16.extractLane(b, 2), 0x7f);
        assert.equal(simd.Int8x16.extractLane(b, 3), 0x7f);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x3f);
        assert.equal(simd.Int8x16.extractLane(b, 5), 0x7f);
        assert.equal(simd.Int8x16.extractLane(b, 6), 0x7f);
        assert.equal(simd.Int8x16.extractLane(b, 7), 0x7f);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftRightLogicalByScalar(a, 2);
        assert.equal(simd.Int8x16.extractLane(b, 0), 0x3f);
        assert.equal(simd.Int8x16.extractLane(b, 1), 0x3f);
        assert.equal(simd.Int8x16.extractLane(b, 2), 0x3f);
        assert.equal(simd.Int8x16.extractLane(b, 3), 0x3f);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x1f);
        assert.equal(simd.Int8x16.extractLane(b, 5), 0x3f);
        assert.equal(simd.Int8x16.extractLane(b, 6), 0x3f);
        assert.equal(simd.Int8x16.extractLane(b, 7), 0x3f);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftRightLogicalByScalar(a, 6);
        assert.equal(simd.Int8x16.extractLane(b, 0), 0x03);
        assert.equal(simd.Int8x16.extractLane(b, 1), 0x03);
        assert.equal(simd.Int8x16.extractLane(b, 2), 0x03);
        assert.equal(simd.Int8x16.extractLane(b, 3), 0x03);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x01);
        assert.equal(simd.Int8x16.extractLane(b, 5), 0x03);
        assert.equal(simd.Int8x16.extractLane(b, 6), 0x03);
        assert.equal(simd.Int8x16.extractLane(b, 7), 0x03);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftRightLogicalByScalar(a, 7);
        assert.equal(simd.Int8x16.extractLane(b, 0), 0x01);
        assert.equal(simd.Int8x16.extractLane(b, 1), 0x01);
        assert.equal(simd.Int8x16.extractLane(b, 2), 0x01);
        assert.equal(simd.Int8x16.extractLane(b, 3), 0x01);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 5), 0x01);
        assert.equal(simd.Int8x16.extractLane(b, 6), 0x01);
        assert.equal(simd.Int8x16.extractLane(b, 7), 0x01);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x00);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x00);
        b = simd.Int8x16.shiftRightLogicalByScalar(a, 8);
        assert.equal(simd.Int8x16.extractLane(b, 0), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 1), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 2), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 3), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 5), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 6), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 7), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x0);
        b = simd.Int8x16.shiftRightLogicalByScalar(a, -1);
        assert.equal(simd.Int8x16.extractLane(b, 0), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 1), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 2), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 3), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 4), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 5), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 6), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 7), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 8), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 9), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 10), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 11), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 12), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 13), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 14), 0x0);
        assert.equal(simd.Int8x16.extractLane(b, 15), 0x0);

    });

    it("Int8x16 select", () => {
        const m = simd.Bool8x16(true, true, true, true, true, true, true, true, false, false, false, false, false, false, false, false);
        const t = simd.Int8x16(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        const f = simd.Int8x16(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        const s = simd.Int8x16.select(m, t, f);
        assert.equal(1, simd.Int8x16.extractLane(s, 0));
        assert.equal(2, simd.Int8x16.extractLane(s, 1));
        assert.equal(3, simd.Int8x16.extractLane(s, 2));
        assert.equal(4, simd.Int8x16.extractLane(s, 3));
        assert.equal(5, simd.Int8x16.extractLane(s, 4));
        assert.equal(6, simd.Int8x16.extractLane(s, 5));
        assert.equal(7, simd.Int8x16.extractLane(s, 6));
        assert.equal(8, simd.Int8x16.extractLane(s, 7));
        assert.equal(25, simd.Int8x16.extractLane(s, 8));
        assert.equal(26, simd.Int8x16.extractLane(s, 9));
        assert.equal(27, simd.Int8x16.extractLane(s, 10));
        assert.equal(28, simd.Int8x16.extractLane(s, 11));
        assert.equal(29, simd.Int8x16.extractLane(s, 12));
        assert.equal(30, simd.Int8x16.extractLane(s, 13));
        assert.equal(31, simd.Int8x16.extractLane(s, 14));
        assert.equal(32, simd.Int8x16.extractLane(s, 15));

    });

    it("Int8x16 selectBits", () => {
        const m = simd.Int8x16(0xaaaaaaaa, 0xbbbbbbbb, 0xcccccccc, 0xdddddddd, 0xeeeeeeee, 0xffffffff, 0x00000000, 0x11111111,
            0x22222222, 0x33333333, 0x44444444, 0x55555555, 0x66666666, 0x77777777, 0x88888888, 0x99999999);
        const t = simd.Int8x16(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        const f = simd.Int8x16(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        const s = simd.Int8x16.selectBits(m, t, f);
        assert.equal(17, simd.Int8x16.extractLane(s, 0));
        assert.equal(2, simd.Int8x16.extractLane(s, 1));
        assert.equal(19, simd.Int8x16.extractLane(s, 2));
        assert.equal(4, simd.Int8x16.extractLane(s, 3));
        assert.equal(21, simd.Int8x16.extractLane(s, 4));
        assert.equal(6, simd.Int8x16.extractLane(s, 5));
        assert.equal(23, simd.Int8x16.extractLane(s, 6));
        assert.equal(8, simd.Int8x16.extractLane(s, 7));
        assert.equal(25, simd.Int8x16.extractLane(s, 8));
        assert.equal(10, simd.Int8x16.extractLane(s, 9));
        assert.equal(27, simd.Int8x16.extractLane(s, 10));
        assert.equal(12, simd.Int8x16.extractLane(s, 11));
        assert.equal(29, simd.Int8x16.extractLane(s, 12));
        assert.equal(14, simd.Int8x16.extractLane(s, 13));
        assert.equal(31, simd.Int8x16.extractLane(s, 14));
        assert.equal(48, simd.Int8x16.extractLane(s, 15));

    });

    it("Int8x16 fromFloat32x4Bits constructor", () => {
        const m = simd.Float32x4(1.0, 2.0, 3.0, 4.0);
        const n = simd.Int8x16.fromFloat32x4Bits(m);
        assert.equal(0x00, simd.Int8x16.extractLane(n, 0));
        assert.equal(0x00, simd.Int8x16.extractLane(n, 1));
        assert.equal(-128, simd.Int8x16.extractLane(n, 2));
        assert.equal(0x3f, simd.Int8x16.extractLane(n, 3));
        assert.equal(0x00, simd.Int8x16.extractLane(n, 4));
        assert.equal(0x00, simd.Int8x16.extractLane(n, 5));
        assert.equal(0x00, simd.Int8x16.extractLane(n, 6));
        assert.equal(0x40, simd.Int8x16.extractLane(n, 7));
        assert.equal(0x00, simd.Int8x16.extractLane(n, 8));
        assert.equal(0x00, simd.Int8x16.extractLane(n, 9));
        assert.equal(0x40, simd.Int8x16.extractLane(n, 10));
        assert.equal(0x40, simd.Int8x16.extractLane(n, 11));
        assert.equal(0x00, simd.Int8x16.extractLane(n, 12));
        assert.equal(0x00, simd.Int8x16.extractLane(n, 13));
        assert.equal(-128, simd.Int8x16.extractLane(n, 14));
        assert.equal(0x40, simd.Int8x16.extractLane(n, 15));

    });
});
