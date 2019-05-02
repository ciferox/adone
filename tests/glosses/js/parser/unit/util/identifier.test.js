const srcPath = (...args) => adone.path.join(adone.ROOT_PATH, "lib", "glosses", "js", "parser", ...args);
const {
    isKeyword,
    keywordRelationalOperator,
} = require(srcPath("util/identifier"));

describe("identifier", () => {
    describe("isKeyword", () => {
        it("break is a keyword", () => {
            expect(isKeyword("break")).to.be.equal(true);
        });
        it("const is a keyword", () => {
            expect(isKeyword("const")).to.be.equal(true);
        });
        it("super is a keyword", () => {
            expect(isKeyword("super")).to.be.equal(true);
        });
        it("let is not a keyword", () => {
            expect(isKeyword("let")).to.be.equal(false);
        });
        it("abc is not a keyword", () => {
            expect(isKeyword("abc")).to.be.equal(false);
        });
    });

    describe("keywordRelationalOperator", () => {
        it("in is true", () => {
            expect(keywordRelationalOperator.test("in")).to.be.equal(true);
        });
        it("instanceof is true", () => {
            expect(keywordRelationalOperator.test("instanceof")).to.be.equal(true);
        });
        it("stanceof is false", () => {
            expect(keywordRelationalOperator.test("stanceof")).to.be.equal(false);
        });
        it("instance is false", () => {
            expect(keywordRelationalOperator.test("instance")).to.be.equal(false);
        });
        it("abc is false", () => {
            expect(keywordRelationalOperator.test("abc")).to.be.equal(false);
        });
    });
});
