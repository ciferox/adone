const {
    assertion
} = adone;
const { expect, extension } = assertion;

// eslint-disable-next-line func-style
function newMethod() {
    // Do nothing
}

// eslint-disable-next-line func-style
function newMethodChain() {
    /* eslint-disable no-invalid-this */
    return this.assert(this._obj.__property === true);
    /* eslint-enable no-invalid-this */
}

// eslint-disable-next-line func-style
function makeFunction() {
    // eslint-disable-next-line func-style
    function fn() {
        // Do nothing
    }
    fn.__property = true;
    return fn;
}

assertion.use((lib) => {
    lib.Assertion.addChainableMethod("newMethod", newMethod, newMethodChain);
});

describe("New method `newMethod` added to chai", () => {
    describe("before executing chai.use(chaiAsPromised)", () => {
        it("should work", () => {
            expect(makeFunction()).to.have.been.newMethod();
        });
    });

    describe("after executing chai.use(chaiAsPromised)", () => {
        before(() => {
            assertion.use(extension.promise);
        });

        it("should still work", () => {
            expect(makeFunction()).to.have.been.newMethod();
        });
    });
});
