describe("assertion", "mock interface", "returning", () => {
    const { assertion: { AssertionError } } = adone;
    describe("returned", () => {
        it("should throw an assertion error if the spy does not return the correct value", () => {
            const s = spy.create(() => {
                return 1;
            });

            s();

            expect(() => {
                expect(s).to.have.returned(2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.returned(2);
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy returns the correct value", () => {
            const s = spy.create(() => {
                return 1;
            });

            s();

            expect(() => {
                expect(s).to.have.returned(1);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.returned(1);
            }).not.to.throw();
        });

        it("should not throw if the spy returns the correct value amongst others", () => {
            const values = [1, 2, 3];
            const s = spy.create(() => {
                return values[s.callCount - 1];
            });

            s();
            s();
            s();

            expect(() => {
                expect(s).to.have.returned(1);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.returned(1);
            }).not.to.throw();
        });
    });

    describe("always returned", () => {
        it("should throw an assertion error if the spy does not return the correct value", () => {
            const s = spy.create(() => {
                return 1;
            });

            s();

            expect(() => {
                expect(s).to.always.have.returned(2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.returned(2);
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy returns the correct value", () => {
            const s = spy.create(() => {
                return 1;
            });

            s();

            expect(() => {
                expect(s).to.have.always.returned(1);
            }).not.to.throw();
            expect(() => {
                expect(s).to.always.have.returned(1);
            }).not.to.throw();
        });

        it("should throw an assertion error if the spy returns the correct value amongst others", () => {
            const values = [1, 2, 3];
            const s = spy.create(() => {
                values[s.callCount - 1];
            });

            s();
            s();
            s();

            expect(() => {
                expect(s).to.always.have.returned(1);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.returned(1);
            }).to.throw(AssertionError);
        });
    });
});
