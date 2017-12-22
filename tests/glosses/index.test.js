describe("Adone common", () => {
    describe("tags", () => {

        adone.tag.define("TAG1");
        adone.tag.define("TAG2");
        adone.tag.define("TAG3");
        adone.tag.define("TAG4");

        class TestA {
        }
        adone.tag.add(TestA, "TAG1");

        class TestB extends TestA {
        }
        adone.tag.add(TestB, "TAG2");

        class TestC extends TestB {
        }
        adone.definePredicate("_testc", "_TESTС");
        adone.tag.add(TestC, "_TESTС");
        adone.tag.add(TestC, "TAG3");

        it("correct handle 'null' and 'undefined'", () => {
            assert.false(adone.tag.has(null, "TAG1"));
            assert.false(adone.tag.has(undefined, "TAG1"));
        });

        it("should be correct for single class", () => {
            assert.true(adone.tag.has(new TestA(), "TAG1"));
        });

        it("should be correct for single-inheritance class", () => {
            const b = new TestB();
            assert.true(adone.tag.has(b, "TAG1"));
            assert.true(adone.tag.has(b, "TAG2"));
        });

        it("should be correct for double-inheritance class", () => {
            const c = new TestC();
            assert.true(adone.tag.has(c, "TAG1"));
            assert.true(adone.tag.has(c, "TAG2"));
            assert.true(adone.tag.has(c, "TAG3"));
        });

        it("should be incorrect for unknown tag", () => {
            assert.false(adone.tag.has(new TestA(), "TAG4"));
            assert.false(adone.tag.has(new TestB(), "TAG4"));
            assert.false(adone.tag.has(new TestC(), "TAG4"));
        });

        it("undefined tag should be incorrect for all classes", () => {
            assert.false(adone.tag.has(new TestA(), "UNKNOWN_TAG"));
            assert.false(adone.tag.has(new TestB(), "UNKNOWN_TAG"));
            assert.false(adone.tag.has(new TestC(), "UNKNOWN_TAG"));
        });

        it("should be registered in predicates", () => {
            const c = new TestC();
            assert.true(adone.is._testc(c));
        });
    });

    describe("identity", () => {
        it("should return the first argument", () => {
            expect(adone.identity(1, 2, 3)).to.be.equal(1);
        });
    });

    describe("noop", () => {
        it("should return nothing", () => {
            expect(adone.noop(1, 2, 3)).to.be.undefined();
        });
    });
});

