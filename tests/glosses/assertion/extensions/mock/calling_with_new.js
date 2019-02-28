const sinon = require("sinon");
const { assertion } = adone;
const { expect, AssertionError } = assertion;

describe("Calling with new", () => {
    let spy = null;

    beforeEach(() => {
        spy = sinon.spy();
    });

    describe("calledWithNew", () => {
        it("should throw an assertion error if the spy is never called", () => {
            expect(() => {
                expect(spy).to.have.been.calledWithNew;
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy is called without `new`", () => {
            spy();

            expect(() => {
                expect(spy).to.have.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy.getCall(0)).to.have.been.calledWithNew;
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy is called with `new`", () => {
            new spy();

            expect(() => {
                expect(spy).to.have.been.calledWithNew;
            }).to.not.throw();
            expect(() => {
                expect(spy.getCall(0)).to.have.been.calledWithNew;
            }).to.not.throw();
        });

        it("should not throw if the spy is called with `new` and also without `new`", () => {
            spy();
            new spy();

            expect(() => {
                expect(spy).to.have.been.calledWithNew;
            }).to.not.throw();
            expect(() => {
                expect(spy.getCall(1)).to.have.been.calledWithNew;
            }).to.not.throw();
        });
    });

    describe("always calledWithNew", () => {
        it("should throw an assertion error if the spy is never called", () => {
            expect(() => {
                expect(spy).to.always.have.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.always.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.been.always.calledWithNew;
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy is called without `new`", () => {
            spy();

            expect(() => {
                expect(spy).to.always.have.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.always.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.been.always.calledWithNew;
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy is called with `new`", () => {
            new spy();

            expect(() => {
                expect(spy).to.always.have.been.calledWithNew;
            }).to.not.throw();
            expect(() => {
                expect(spy).to.have.always.been.calledWithNew;
            }).to.not.throw();
            expect(() => {
                expect(spy).to.have.been.always.calledWithNew;
            }).to.not.throw();
        });

        it("should throw an assertion error if the spy is called with `new` and also without `new`", () => {
            spy();
            new spy();

            expect(() => {
                expect(spy).to.always.have.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.always.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.been.always.calledWithNew;
            }).to.throw(AssertionError);
        });
    });
});
