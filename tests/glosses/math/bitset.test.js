
describe("BitSet", function () {
    const { BitSet } = adone.math;

    it("should create a bitset from a dehydrated string", function () {
        const dehydratedBS = "1073741824,2147483647,15,0,99";
        const bs = new BitSet(dehydratedBS);
        assert.equal(bs.dehydrate(), dehydratedBS);
    });

    it("should set an individual bit", function () {
        const bs = new BitSet(100);
        bs.set(31);
        expect(bs.get(31)).to.be.true;
    });

    it("should find first set", function () {
        const bs = new BitSet(100);
        bs.set(31);
        assert.equal(bs.ffs(), 31);
    });

    it("should not be able to find first set in an empty bitset", function () {
        const bs = new BitSet(100);
        assert.equal(bs.ffs(), -1);
    });

    it("should find first zero", function () {
        const bs = new BitSet(100);
        bs.setRange(0, 31);
        assert.equal(bs.ffz(), 32);
    });

    it("should not be able to find first zero in a full bitset", function () {
        const bs = new BitSet("2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,255,0,224");
        assert.equal(bs.ffz(), -1);
    });


    it("should set a range of len 1", function () {
        const bs = new BitSet(100);
        bs.setRange(31, 31);
        assert.equal(bs.dehydrate(), "1,1,99");
    });

    it("should set a range of len 31", function () {
        const bs = new BitSet(100);
        bs.setRange(0, 30);
        assert.equal(bs.dehydrate(), "2147483647,0,99");
    });

    it("should set a range that spans 3 words", function () {
        const bs = new BitSet(100);
        bs.setRange(30, 65);
        assert.equal(bs.dehydrate(), "1073741824,2147483647,15,0,99");
    });

    it("should AND two bitsets", function () {
        const bs1 = new BitSet(100);
        const bs2 = new BitSet(100);
        bs1.setRange(1, 10);
        bs2.setRange(10, 33);
        const bs3 = bs1.and(bs2);
        assert.equal(bs3.dehydrate(), "1024,0,99");
    });

    it("should AND a bitset and an index", function () {
        const bs1 = new BitSet(100);
        bs1.setRange(1, 10);
        const bs3 = bs1.and(1);
        assert.equal(bs3.dehydrate(), "2,0,99");
    });

    it("should OR two bitsets", function () {
        const bs1 = new BitSet(100);
        const bs2 = new BitSet(100);
        bs1.setRange(1, 10);
        bs2.setRange(10, 33);
        const bs3 = bs1.or(bs2);
        assert.equal(bs3.dehydrate(), "2147483646,7,0,99");
    });

    it("should XOR two bitsets", function () {
        const bs1 = new BitSet(100);
        const bs2 = new BitSet(100);
        bs1.setRange(1, 10);
        bs2.setRange(10, 33);
        const bs3 = bs1.xor(bs2);
        assert.equal(bs3.dehydrate(), "2147482622,7,0,99");
    });

    it("should detect empty arrays", function () {
        const bs = new BitSet(100);
        expect(bs.isEmpty()).to.be.true;
        bs.set(31);
        expect(bs.isEmpty()).to.be.false;
    });

    it("should unset a bit", function () {
        const bs = new BitSet(100);
        bs.set(31);
        bs.unset(31);
        expect(bs.get(31)).to.be.false;
    });

    it("should toggle a bit", function () {
        const bs = new BitSet(100);
        bs.toggle(31);
        expect(bs.get(31)).to.be.true;
        bs.toggle(31);
        expect(bs.get(31)).to.be.false;
    });

    it("should toggle a range", function () {
        const bs = new BitSet(100);
        bs.toggleRange(31, 35);
        bs.toggleRange(32, 34);
        bs.toggleRange(33, 33);
        assert.equal(bs.dehydrate(), "21,1,99");
    });

    it("should unset a range", function () {
        const bs = new BitSet(100);
        bs.setRange(29, 59);
        bs.unsetRange(30, 58);
        assert.equal(bs.dehydrate(), "536870912,268435456,0,99");
    });

    it("should clear a bitset", function () {
        const bs = new BitSet(100);
        bs.setRange(29, 59);
        bs.clear();
        expect(bs.isEmpty()).to.be.true;
    });

    it("should check if one bitset is subset of another", function () {
        const bs = new BitSet(100);
        const bs2 = new BitSet(100);

        expect(bs.isSubsetOf(bs2)).to.be.true;

        bs.setRange(30, 60);
        bs2.setRange(30, 60);

        expect(bs2.isSubsetOf(bs)).to.be.true;

        bs2.clear();
        bs2.setRange(31, 59);

        expect(bs2.isSubsetOf(bs)).to.be.true;
        expect(bs.isSubsetOf(bs2)).to.be.false;
    });

    it("should check for equality", function () {
        const bs = new BitSet(100);
        bs.setRange(29, 59);
        const bs2 = new BitSet(100);
        bs2.setRange(29, 59);
        expect(bs.isEqual(bs2)).to.be.true;
    });

    it("should find next set bit in the same word", function () {
        const bs = new BitSet(100);
        bs.setRange(10, 30);
        assert.equal(bs.nextSetBit(1), 10);
    });

    it("should find next set bit the next word", function () {
        const bs = new BitSet(100);
        bs.setRange(66, 99);
        assert.equal(bs.nextSetBit(31), 66);
    });

    it("should find next unset bit in the same word", function () {
        const bs = new BitSet(100);
        bs.setRange(10, 30);
        assert.equal(bs.nextUnsetBit(1), 1);
    });

    it("should find next set bit the next word", function () {
        const bs = new BitSet(100);
        bs.setRange(10, 30);
        assert.equal(bs.nextUnsetBit(11), 31);
    });

    it("should find the last set bit", function () {
        const bs = new BitSet(100);
        bs.setRange(10, 30);
        assert.equal(bs.fls(), 30);
    });

    it("should find the previous set bit", function () {
        const bs = new BitSet(100);
        bs.setRange(10, 30);
        assert.equal(bs.previousSetBit(90), 30);
    });

    it("should find the last unset bit", function () {
        const bs = new BitSet(100);
        bs.setRange(60, 99);
        assert.equal(bs.flz(), 59);
    });

    it("should find the previous unset bit", function () {
        const bs = new BitSet(100);
        bs.setRange(60, 99);
        assert.equal(bs.previousUnsetBit(80), 59);
    });

    it("should clone a bitset with only 1 word", function () {
        const bs = new BitSet(10);
        bs.setRange(6, 9);
        const bs2 = bs.clone();
        assert.equal(bs.dehydrate(), bs2.dehydrate());
    });

    it("should clone a bitset", function () {
        const bs = new BitSet(100);
        bs.setRange(60, 99);
        const bs2 = bs.clone();
        assert.equal(bs.dehydrate(), bs2.dehydrate());
    });

    it("should count number of bits set", function () {
        const bs = new BitSet(100);
        bs.setRange(60, 99);
        assert.equal(bs.getCardinality(), 40);
    });

    it("should return an array of set bits", function () {
        const bs = new BitSet(100);
        bs.set(30);
        bs.setRange(98, 99);
        const range = [30, 98, 99];
        expect(bs.getIndices()).to.eql(range);
    });

    it("should set bit success which read from dehydrate string", function () {

        const bs = new BitSet("2147483646,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,2147483647,0,9999999");
        expect(bs.get(899)).to.be.false;
        expect(bs.set(899, true)).to.be.true;
        expect(bs.get(899)).to.be.true;
    });
});
