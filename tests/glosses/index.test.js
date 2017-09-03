describe("Adone common", () => {
    describe("tags", () => {

        const TAG1 = 1000;
        const TAG2 = 1001;
        const TAG3 = 1002;
        const UNKNOWN_TAG = 1003;

        class TestA {
        }
        adone.tag.set(TestA, TAG1);

        class TestB extends TestA {
        }
        adone.tag.set(TestB, TAG2);

        class TestC extends TestB {
        }
        adone.tag.define("_TESTС", "_testc");
        adone.tag.set(TestC, adone.tag._TESTС);
        adone.tag.set(TestC, TAG3);

        it("should be correct for single class", () => {
            assert.isTrue(adone.tag.has(new TestA(), TAG1));
        });

        it("should be correct for single-inheritance class", () => {
            const b = new TestB();
            assert.isTrue(adone.tag.has(b, TAG1));
            assert.isTrue(adone.tag.has(b, TAG2));
        });

        it("should be correct for double-inheritance class", () => {
            const c = new TestC();
            assert.isTrue(adone.tag.has(c, TAG1));
            assert.isTrue(adone.tag.has(c, TAG2));
            assert.isTrue(adone.tag.has(c, TAG3));
        });

        it("unknown tag should be incorrect for all classes", () => {
            assert.isFalse(adone.tag.has(new TestA(), UNKNOWN_TAG));
            assert.isFalse(adone.tag.has(new TestB(), UNKNOWN_TAG));
            assert.isFalse(adone.tag.has(new TestC(), UNKNOWN_TAG));
        });

        it("should be registered in predicates", () => {
            const c = new TestC();
            assert.isTrue(adone.is._testc(c));
        });
    });

    describe("identity", () => {
        it("should return the first argument", () => {
            expect(adone.identity(1, 2, 3)).to.be.equal(1);
        });
    });

    describe("noop", () => {
        it("should return nothing", () => {
            expect(adone.noop(1, 2, 3)).to.be.undefined;
        });
    });
});

