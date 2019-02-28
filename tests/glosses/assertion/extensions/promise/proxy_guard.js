require("./support/setup.js");

const {
    is,
    assertion
} = adone;
const { expect } = assertion;


// eslint-disable-next-line func-style
function shouldGuard(fn, msg) {
    expect(fn).to.throw(`Invalid Chai property: ${msg}`);
}

describe("Proxy guard", () => {
    const number = 42;
    const promise = Promise.resolve(42);

    before(function () {
        if (is.undefined(Proxy) || is.undefined(Reflect) || is.undefined(assertion.util.proxify)) {
            /**
             * eslint-disable no-invalid-this
             */
            this.skip();
            /* eslint-enable no-invalid-this */
        }
    });

    it("should guard against invalid property following `.should`", () => {
        shouldGuard(() => expect(number).to.pizza, "pizza");
    });

    it("should guard against invalid property following overwritten language chain", () => {
        shouldGuard(() => expect(number).to.to.pizza, "pizza");
    });

    it("should guard against invalid property following overwritten property assertion", () => {
        shouldGuard(() => expect(number).to.ok.pizza, "pizza");
    });

    it("should guard against invalid property following uncalled overwritten method assertion", () => {
        shouldGuard(() => expect(number).to.equal.pizza, "equal.pizza. See docs");
    });

    it("should guard against invalid property following called overwritten method assertion", () => {
        shouldGuard(() => expect(number).to.equal(number).pizza, "pizza");
    });

    it("should guard against invalid property following uncalled overwritten chainable method assertion", () => {
        shouldGuard(() => expect(number).to.a.pizza, "pizza");
    });

    it("should guard against invalid property following called overwritten chainable method assertion", () => {
        shouldGuard(() => expect(number).to.a("number").pizza, "pizza");
    });

    it("should guard against invalid property following `.eventually`", () => {
        shouldGuard(() => expect(promise).to.eventually.pizza, "pizza");
    });

    it("should guard against invalid property following `.fulfilled`", () => {
        shouldGuard(() => expect(promise).to.fulfilled.pizza, "pizza");
    });

    it("should guard against invalid property following `.rejected`", () => {
        shouldGuard(() => expect(promise).to.rejected.pizza, "pizza");
    });

    it("should guard against invalid property following called `.rejectedWith`", () => {
        shouldGuard(() => expect(promise).to.rejectedWith(42).pizza, "pizza");
    });

    it("should guard against invalid property following uncalled `.rejectedWith`", () => {
        shouldGuard(() => expect(promise).to.rejectedWith.pizza, "rejectedWith.pizza. See docs");
    });

    it("should guard against invalid property following called `.become`", () => {
        shouldGuard(() => expect(promise).to.become(42).pizza, "pizza");
    });

    it("should guard against invalid property following uncalled `.become`", () => {
        shouldGuard(() => expect(promise).to.become.pizza, "become.pizza. See docs");
    });
});
