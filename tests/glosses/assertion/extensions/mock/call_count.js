const sinon = require("sinon");
const { assertion } = adone;
const { expect, AssertionError } = assertion;

describe("Call count", () => {
    let spy = null;

    beforeEach(() => {
        spy = sinon.spy();
    });

    describe("called", () => {
        it("should throw an assertion error when the spy is undefined", () => {
            expect(() => {
                expect(undefined).to.have.been.called;
            }).to.throw(TypeError);
        });

        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(spy).to.have.been.called;
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called once", () => {
            spy();

            expect(() => {
                expect(spy).to.have.been.called;
            }).to.not.throw();
        });

        it("should not throw when the spy is called twice", () => {
            spy();
            spy();

            expect(() => {
                expect(spy).to.have.been.called;
            }).to.not.throw();
        });
    });

    describe("not called", () => {
        it("should not throw when the spy is not called", () => {
            expect(() => {
                expect(spy).to.not.have.been.called;
            }).to.not.throw();
        });

        it("should throw an assertion error when the spy is called once", () => {
            spy();

            expect(() => {
                expect(spy).to.not.have.been.called;
            }).to.throw(AssertionError);
        });
    });

    describe("callCount", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(spy).to.have.callCount();
            }).to.throw(AssertionError);
        });

        it("should not throw an assertion error when the number of calls equals provided call count", () => {
            spy();
            spy();
            spy();
            spy();

            expect(() => {
                expect(spy).to.have.callCount(4);
            }).to.not.throw(AssertionError);
        });

        it("should throw an assertion error whenever the number of calls are not equal to provided call count",
            () => {
                spy();
                spy();
                spy();

                expect(() => {
                    expect(spy).to.have.callCount(4);
                }).to.throw(AssertionError);
            });
    });

    describe("calledOnce", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(spy).to.have.been.calledOnce;
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called once", () => {
            spy();

            expect(() => {
                expect(spy).to.have.been.calledOnce;
            }).to.not.throw();
        });

        it("should throw an assertion error when the spy is called twice", () => {
            spy();
            spy();

            expect(() => {
                expect(spy).to.have.been.calledOnce;
            }).to.throw(AssertionError);
        });
    });

    describe("calledTwice", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(spy).to.have.been.calledTwice;
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called once", () => {
            spy();

            expect(() => {
                expect(spy).to.have.been.calledTwice;
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called twice", () => {
            spy();
            spy();

            expect(() => {
                expect(spy).to.have.been.calledTwice;
            }).to.not.throw();
        });

        it("should throw an assertion error when the spy is called thrice", () => {
            spy();
            spy();
            spy();

            expect(() => {
                expect(spy).to.have.been.calledTwice;
            }).to.throw(AssertionError);
        });
    });

    describe("calledThrice", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(spy).to.have.been.calledThrice;
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called once", () => {
            spy();

            expect(() => {
                expect(spy).to.have.been.calledThrice;
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called twice", () => {
            spy();
            spy();

            expect(() => {
                expect(spy).to.have.been.calledThrice;
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called thrice", () => {
            spy();
            spy();
            spy();

            expect(() => {
                expect(spy).to.have.been.calledThrice;
            }).to.not.throw();
        });

        it("should throw an assertion error when the spy is called four times", () => {
            spy();
            spy();
            spy();
            spy();

            expect(() => {
                expect(spy).to.have.been.calledThrice;
            }).to.throw(AssertionError);
        });
    });
});
