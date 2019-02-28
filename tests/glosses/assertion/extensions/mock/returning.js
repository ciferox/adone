const sinon = require("sinon");
const { assertion } = adone;
const { expect, AssertionError } = assertion;

describe("Returning", () => {
    describe("returned", () => {
        it("should throw an assertion error if the spy does not return the correct value", () => {
            const spy = sinon.spy(() => {
                return 1;
            });

            spy();

            expect(() => {
                expect(spy).to.have.returned(2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy.getCall(0)).to.have.returned(2);
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy returns the correct value", () => {
            const spy = sinon.spy(() => {
                return 1;
            });

            spy();

            expect(() => {
                expect(spy).to.have.returned(1);
            }).to.not.throw();
            expect(() => {
                expect(spy.getCall(0)).to.have.returned(1);
            }).to.not.throw();
        });

        it("should not throw if the spy returns the correct value amongst others", () => {
            const values = [1, 2, 3];
            var spy = sinon.spy(() => {
                return values[spy.callCount - 1];
            });

            spy();
            spy();
            spy();

            expect(() => {
                expect(spy).to.have.returned(1);
            }).to.not.throw();
            expect(() => {
                expect(spy.getCall(0)).to.have.returned(1);
            }).to.not.throw();
        });
    });

    describe("always returned", () => {
        it("should throw an assertion error if the spy does not return the correct value", () => {
            const spy = sinon.spy(() => {
                return 1;
            });

            spy();

            expect(() => {
                expect(spy).to.always.have.returned(2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.always.returned(2);
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy returns the correct value", () => {
            const spy = sinon.spy(() => {
                return 1;
            });

            spy();

            expect(() => {
                expect(spy).to.have.always.returned(1);
            }).to.not.throw();
            expect(() => {
                expect(spy).to.always.have.returned(1);
            }).to.not.throw();
        });

        it("should throw an assertion error if the spy returns the correct value amongst others", () => {
            const values = [1, 2, 3];
            var spy = sinon.spy(() => {
                values[spy.callCount - 1];
            });

            spy();
            spy();
            spy();

            expect(() => {
                expect(spy).to.always.have.returned(1);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.always.returned(1);
            }).to.throw(AssertionError);
        });
    });
});
