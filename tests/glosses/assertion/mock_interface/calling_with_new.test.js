describe("assertion", "mock interface", "call order", () => {
    const { assertion: { AssertionError } } = adone;

    let s = null;

    beforeEach(() => {
        s = spy();
    });

    describe("calledWithNew", () => {
        it("should throw an assertion error if the spy is never called", () => {
            expect(() => {
                expect(s).to.have.been.calledWithNew;
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy is called without `new`", () => {
            s();

            expect(() => {
                expect(s).to.have.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithNew;
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy is called with `new`", () => {
            new s();

            expect(() => {
                expect(s).to.have.been.calledWithNew;
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithNew;
            }).not.to.throw();
        });

        it("should not throw if the spy is called with `new` and also without `new`", () => {
            s();
            new s();

            expect(() => {
                expect(s).to.have.been.calledWithNew;
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(1)).to.have.been.calledWithNew;
            }).not.to.throw();
        });
    });

    describe("always calledWithNew", () => {
        it("should throw an assertion error if the spy is never called", () => {
            expect(() => {
                expect(s).to.always.have.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWithNew;
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy is called without `new`", () => {
            s();

            expect(() => {
                expect(s).to.always.have.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWithNew;
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy is called with `new`", () => {
            new s();

            expect(() => {
                expect(s).to.always.have.been.calledWithNew;
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.always.been.calledWithNew;
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.been.always.calledWithNew;
            }).not.to.throw();
        });

        it("should throw an assertion error if the spy is called with `new` and also without `new`", () => {
            s();
            new s();

            expect(() => {
                expect(s).to.always.have.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWithNew;
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWithNew;
            }).to.throw(AssertionError);
        });
    });
});
