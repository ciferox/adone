require("./support/setup.js");
const {
    assertion
} = adone;
const { expect, extension } = assertion;

const originalTransferPromiseness = extension.promise.transferPromiseness;

describe("Configuring the way in which promise-ness is transferred", () => {
    afterEach(() => {
        extension.promise.transferPromiseness = originalTransferPromiseness;
    });

    it("should return a promise with the custom modifications applied", () => {
        extension.promise.transferPromiseness = (assertion, promise) => {
            assertion.then = promise.then.bind(promise);
            assertion.isCustomized = true;
        };

        const promise = Promise.resolve("1234");
        const assertion = expect(promise).to.become("1234");

        expect(assertion).to.have.property("isCustomized", true);
    });
});
