describe("math", "BitSet", () => {
    const { math: { BitSet } } = adone;

    it("should create a bitset from a dehydrated string", () => {
        const dehydratedBS = "1073741824,2147483647,15,0,99";
        const bs = new BitSet(dehydratedBS);
        assert.equal(bs.dehydrate(), dehydratedBS);
    });

    it("should set an individual bit", () => {
        const bs = new BitSet(100);
        bs.set(31);
        expect(bs.get(31)).to.be.true();
    });

    it("should find first set", () => {
        const bs = new BitSet(100);
        bs.set(31);
        assert.equal(bs.ffs(), 31);
    });

    it("should not be able to find first set in an empty bitset", () => {
        const bs = new BitSet(100);
        assert.equal(bs.ffs(), -1);
    });

    it("should find first zero", () => {
        const bs = new BitSet(100);
        bs.setRange(0, 31);
        assert.equal(bs.ffz(), 32);
    });

    it("should not be able to find first zero in a full bitset", () => {
        const bs = new BitSet("2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,255,0,224");
        assert.equal(bs.ffz(), -1);
    });


    it("should set a range of len 1", () => {
        const bs = new BitSet(100);
        bs.setRange(31, 31);
        assert.equal(bs.dehydrate(), "1,1,99");
    });

    it("should set a range of len 31", () => {
        const bs = new BitSet(100);
        bs.setRange(0, 30);
        assert.equal(bs.dehydrate(), "2147483647,0,99");
    });

    it("should set a range that spans 3 words", () => {
        const bs = new BitSet(100);
        bs.setRange(30, 65);
        assert.equal(bs.dehydrate(), "1073741824,2147483647,15,0,99");
    });

    it("should AND two bitsets", () => {
        const bs1 = new BitSet(100);
        const bs2 = new BitSet(100);
        bs1.setRange(1, 10);
        bs2.setRange(10, 33);
        const bs3 = bs1.and(bs2);
        assert.equal(bs3.dehydrate(), "1024,0,99");
    });

    it("should AND a bitset and an index", () => {
        const bs1 = new BitSet(100);
        bs1.setRange(1, 10);
        const bs3 = bs1.and(1);
        assert.equal(bs3.dehydrate(), "2,0,99");
    });

    it("should OR two bitsets", () => {
        const bs1 = new BitSet(100);
        const bs2 = new BitSet(100);
        bs1.setRange(1, 10);
        bs2.setRange(10, 33);
        const bs3 = bs1.or(bs2);
        assert.equal(bs3.dehydrate(), "2147483646,7,0,99");
    });

    it("should XOR two bitsets", () => {
        const bs1 = new BitSet(100);
        const bs2 = new BitSet(100);
        bs1.setRange(1, 10);
        bs2.setRange(10, 33);
        const bs3 = bs1.xor(bs2);
        assert.equal(bs3.dehydrate(), "2147482622,7,0,99");
    });

    it("should detect empty arrays", () => {
        const bs = new BitSet(100);
        expect(bs.isEmpty()).to.be.true();
        bs.set(31);
        expect(bs.isEmpty()).to.be.false();
    });

    it("should unset a bit", () => {
        const bs = new BitSet(100);
        bs.set(31);
        bs.unset(31);
        expect(bs.get(31)).to.be.false();
    });

    it("should toggle a bit", () => {
        const bs = new BitSet(100);
        bs.toggle(31);
        expect(bs.get(31)).to.be.true();
        bs.toggle(31);
        expect(bs.get(31)).to.be.false();
    });

    it("should toggle a range", () => {
        const bs = new BitSet(100);
        bs.toggleRange(31, 35);
        bs.toggleRange(32, 34);
        bs.toggleRange(33, 33);
        assert.equal(bs.dehydrate(), "21,1,99");
    });

    it("should unset a range", () => {
        const bs = new BitSet(100);
        bs.setRange(29, 59);
        bs.unsetRange(30, 58);
        assert.equal(bs.dehydrate(), "536870912,268435456,0,99");
    });

    it("should clear a bitset", () => {
        const bs = new BitSet(100);
        bs.setRange(29, 59);
        bs.clear();
        expect(bs.isEmpty()).to.be.true();
    });

    it("should check if one bitset is subset of another", () => {
        const bs = new BitSet(100);
        const bs2 = new BitSet(100);

        expect(bs.isSubsetOf(bs2)).to.be.true();

        bs.setRange(30, 60);
        bs2.setRange(30, 60);

        expect(bs2.isSubsetOf(bs)).to.be.true();

        bs2.clear();
        bs2.setRange(31, 59);

        expect(bs2.isSubsetOf(bs)).to.be.true();
        expect(bs.isSubsetOf(bs2)).to.be.false();
    });

    it("should check for equality", () => {
        const bs = new BitSet(100);
        bs.setRange(29, 59);
        const bs2 = new BitSet(100);
        bs2.setRange(29, 59);
        expect(bs.isEqual(bs2)).to.be.true();
    });

    it("should find next set bit in the same word", () => {
        const bs = new BitSet(100);
        bs.setRange(10, 30);
        assert.equal(bs.nextSetBit(1), 10);
    });

    it("should find next set bit the next word", () => {
        const bs = new BitSet(100);
        bs.setRange(66, 99);
        assert.equal(bs.nextSetBit(31), 66);
    });

    it("should find next unset bit in the same word", () => {
        const bs = new BitSet(100);
        bs.setRange(10, 30);
        assert.equal(bs.nextUnsetBit(1), 1);
    });

    it("should find next set bit the next word", () => {
        const bs = new BitSet(100);
        bs.setRange(10, 30);
        assert.equal(bs.nextUnsetBit(11), 31);
    });

    it("should find the last set bit", () => {
        const bs = new BitSet(100);
        bs.setRange(10, 30);
        assert.equal(bs.fls(), 30);
    });

    it("should find the previous set bit", () => {
        const bs = new BitSet(100);
        bs.setRange(10, 30);
        assert.equal(bs.previousSetBit(90), 30);
    });

    it("should find the last unset bit", () => {
        const bs = new BitSet(100);
        bs.setRange(60, 99);
        assert.equal(bs.flz(), 59);
    });

    it("should find the previous unset bit", () => {
        const bs = new BitSet(100);
        bs.setRange(60, 99);
        assert.equal(bs.previousUnsetBit(80), 59);
    });

    it("should clone a bitset with only 1 word", () => {
        const bs = new BitSet(10);
        bs.setRange(6, 9);
        const bs2 = bs.clone();
        assert.equal(bs.dehydrate(), bs2.dehydrate());
    });

    it("should clone a bitset", () => {
        const bs = new BitSet(100);
        bs.setRange(60, 99);
        const bs2 = bs.clone();
        assert.equal(bs.dehydrate(), bs2.dehydrate());
    });

    it("should count number of bits set", () => {
        const bs = new BitSet(100);
        bs.setRange(60, 99);
        assert.equal(bs.getCardinality(), 40);
    });

    it("should return an array of set bits", () => {
        const bs = new BitSet(100);
        bs.set(30);
        bs.setRange(98, 99);
        const range = [30, 98, 99];
        expect(bs.getIndices()).to.eql(range);
    });

    it("should set bit success which read from dehydrate string", () => {
        const bs = new BitSet("2147483646,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,0,9999999");
        expect(bs.get(899)).to.be.false();
        expect(bs.set(899, true)).to.be.true();
        expect(bs.get(899)).to.be.true();
    });

    it("should rotate a bitset", () => {

        const sizes = [10, 34, 70, 500];
        for (let i = 0; i < sizes.length; i++) {
            const size = sizes[i];
            const evens = []; for (i = 0; i < size / 2; i++) {
                evens.push(2 * i);
            }
            const evenBitset = new BitSet(size);
            for (i = 0; i < size; i++) {
                evenBitset.set(2 * i);
            }

            const odds = []; for (i = 0; i < size / 2; i++) {
                odds.push(2 * i + 1);
            }
            const oddBitset = new BitSet(size);
            for (i = 0; i < size; i++) {
                oddBitset.set(2 * i + 1);
            }

            expect(evenBitset.getCardinality()).to.be.equal(evenBitset.circularShift(5).getCardinality());
            expect(evenBitset.circularShift(0).isEqual(evenBitset)).to.be.true();
            expect(evenBitset.circularShift(size).isEqual(evenBitset)).to.be.true();
            expect(evenBitset.circularShift(1).isEqual(oddBitset)).to.be.true();
            expect(evenBitset.circularShift(size + 1).isEqual(oddBitset)).to.be.true();
            expect(evenBitset.circularShift(2).isEqual(evenBitset)).to.be.true();
            expect(evenBitset.circularShift(size + 2).isEqual(evenBitset)).to.be.true();
            expect(evenBitset.circularShift(-size - 3).isEqual(oddBitset)).to.be.true();
            expect(evenBitset.circularShift(200).isEqual(evenBitset)).to.be.true();
            expect(evenBitset.circularShift(-301).isEqual(oddBitset)).to.be.true();
        }
    });

    it("should iterate over set bits", () => {
        const a = new BitSet(15);
        a.set(1);
        a.set(2);
        a.set(3);
        a.set(5);
        a.set(8);
        a.set(13);
        const vals = [];
        a.forEach((x) => vals.push(x));
        expect(vals).to.be.deep.equal([1, 2, 3, 5, 8, 13]);
    });

    it("should stop iterating if the callback returns false", () => {
        const a = new BitSet(15);

        a.set(1);
        a.set(2);
        a.set(3);
        a.set(5);
        a.set(8);
        a.set(13);
        const vals = [];
        a.forEach((x) => {
            vals.push(x);
            if (x >= 5) {
                return false;
            }
        });
        expect(vals).to.be.deep.equal([1, 2, 3, 5]);
    });
});
