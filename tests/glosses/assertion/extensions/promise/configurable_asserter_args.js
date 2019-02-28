require("./support/setup.js");
const {
    assertion
} = adone;
const { expect, extension } = assertion;

const originalTransformAsserterArgs = extension.promise.transformAsserterArgs;

describe("Configuring the way in which asserter arguments are transformed", () => {
    beforeEach(() => {
        extension.promise.transformAsserterArgs = Promise.all.bind(Promise);
    });

    afterEach(() => {
        extension.promise.transformAsserterArgs = originalTransformAsserterArgs;
    });

    it("should override transformAsserterArgs and allow to compare promises", () => {
        const value = "test it";

        return expect(Promise.resolve(value)).eventually.to.equal(Promise.resolve(value));
    });

    it("should override transformAsserterArgs and wait until all promises are resolved", () => {
        return expect(Promise.resolve(5)).eventually.to.be.within(Promise.resolve(3), Promise.resolve(6));
    });

    it("should not invoke transformAsserterArgs for chai properties", () => {
        extension.promise.transformAsserterArgs = () => {
            throw new Error("transformAsserterArgs should not be called for chai properties");
        };

        return expect(Promise.resolve(true)).eventually.to.be.true;
    });

    it("should transform asserter args", () => {
        extension.promise.transformAsserterArgs = (args) => {
            return Array.from(args).map((x) => x + 1);
        };

        return expect(Promise.resolve(3)).eventually.to.equal(2);
    });
});
