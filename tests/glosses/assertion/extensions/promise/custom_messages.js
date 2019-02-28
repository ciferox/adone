require("./support/setup.js");
const { shouldPass, shouldFail } = require("./support/common.js");

const {
    assertion
} = adone;
const { expect } = assertion;

describe("Custom messages", () => {
    let promise = null;
    const message = "He told me enough! He told me you killed him!";

    beforeEach(() => {
        promise = Promise.resolve(42);
    });

    describe("should pass through for .become(value, message) for 42", () => {
        shouldPass(() => expect(promise).to.become(42, message));
    });
    describe("should pass through for .become(value, message) for 52", () => {
        shouldFail({
            op: () => expect(promise).to.become(52, message),
            message
        });
    });

    describe("should pass through for .not.become(42, message)", () => {
        shouldFail({
            op: () => expect(promise).to.not.become(42, message),
            message
        });
    });
    describe("should pass through for .not.become(52, message)", () => {
        shouldPass(() => expect(promise).to.not.become(52, message));
    });

    describe("should pass through for .eventually.equal(42)", () => {
        shouldPass(() => expect(promise).to.eventually.equal(42, message));
    });
    describe("should pass through for .not.eventually.equal(42)", () => {
        shouldFail({
            op: () => expect(promise).to.not.eventually.equal(42, message),
            message
        });
    });
});
