const sinon = require("sinon");
const { assertion } = adone;
const { expect, AssertionError } = assertion;

describe("Call context", () => {
    let s = null;
    let target = null;
    let notTheTarget = null;

    beforeEach(() => {
        s = sinon.spy();
        target = {};
        notTheTarget = {};
    });

    describe("calledOn", () => {
        it("should throw an assertion error if the spy is never called", () => {
            expect(() => {
                expect(s).to.have.been.calledOn(target);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy is called without a context", () => {
            s();

            expect(() => {
                expect(s).to.have.been.calledOn(target);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledOn(target);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy is called on the wrong context", () => {
            s.call(notTheTarget);

            expect(() => {
                expect(s).to.have.been.calledOn(target);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledOn(target);
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy is called on the specified context", () => {
            s.call(target);

            expect(() => {
                expect(s).to.have.been.calledOn(target);
            }).to.not.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledOn(target);
            }).to.not.throw();
        });

        it("should not throw if the spy is called on another context and also the specified context", () => {
            s.call(notTheTarget);
            s.call(target);

            expect(() => {
                expect(s).to.have.been.calledOn(target);
            }).to.not.throw();
            expect(() => {
                expect(s.getCall(1)).to.have.been.calledOn(target);
            }).to.not.throw();
        });
    });

    describe("always calledOn", () => {
        it("should throw an assertion error if the spy is never called", () => {
            expect(() => {
                expect(s).to.always.have.been.calledOn(target);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledOn(target);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledOn(target);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy is called without a context", () => {
            s();

            expect(() => {
                expect(s).to.always.have.been.calledOn(target);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledOn(target);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledOn(target);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy is called on the wrong context", () => {
            s.call(notTheTarget);

            expect(() => {
                expect(s).to.always.have.been.calledOn(target);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledOn(target);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledOn(target);
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy is called on the specified context", () => {
            s.call(target);

            expect(() => {
                expect(s).to.always.have.been.calledOn(target);
            }).to.not.throw();
            expect(() => {
                expect(s).to.have.always.been.calledOn(target);
            }).to.not.throw();
            expect(() => {
                expect(s).to.have.been.always.calledOn(target);
            }).to.not.throw();
        });

        it("should throw an assertion error if the spy is called on another context and also the specified context",
            () => {
                s.call(notTheTarget);
                s.call(target);

                expect(() => {
                    expect(s).to.always.have.been.calledOn(target);
                }).to.throw(AssertionError);
                expect(() => {
                    expect(s).to.have.always.been.calledOn(target);
                }).to.throw(AssertionError);
                expect(() => {
                    expect(s).to.have.been.always.calledOn(target);
                }).to.throw(AssertionError);
            });
    });
});
