describe("assertion", "mock interface", "returning", () => {
    const { assertion: { AssertionError } } = adone;

    const swallow = (t) => {
        try {
            t();
        } catch (err) {
            //
        }
    };

    describe("thrown()", () => {
        it("should throw an assertion error if the spy does not throw at all", () => {
            const s = spy.create(() => { /* Contents don't matter */ });

            s();

            expect(() => {
                expect(s).to.have.thrown();
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.thrown();
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy throws", () => {
            const s = spy.create(() => {
                throw new Error();
            });

            swallow(s);

            expect(() => {
                expect(s).to.have.thrown();
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.thrown();
            }).not.to.throw();
        });

        it("should not throw if the spy throws once but not the next time", () => {
            const s = spy.create(() => {
                if (!(s.callCount > 1)) {
                    throw new Error();
                }
            });

            swallow(s);
            swallow(s);

            expect(() => {
                expect(s).to.have.thrown();
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.thrown();
            }).not.to.throw();
        });
    });

    describe("thrown(errorObject)", () => {
        let error = null;

        beforeEach(() => {
            error = new Error("boo!");
        });

        it("should throw an assertion error if the spy does not throw at all", () => {
            const s = spy.create(() => { /* Contents don't matter */ });

            s();

            expect(() => {
                expect(s).to.have.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.thrown(error);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy throws the wrong error", () => {
            const s = spy.create(() => {
                return new Error("eek!");
            });

            swallow(s);

            expect(() => {
                expect(s).to.have.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.thrown(error);
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy throws", () => {
            const s = spy.create(() => {
                throw error;
            });

            swallow(s);

            expect(() => {
                expect(s).to.have.thrown(error);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.thrown(error);
            }).not.to.throw();
        });

        it("should not throw if the spy throws once but not the next time", () => {
            const s = spy.create(() => {
                if (!(s.callCount > 1)) {
                    throw error;
                }
            });

            swallow(s);
            swallow(s);

            expect(() => {
                expect(s).to.have.thrown(error);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.thrown(error);
            }).not.to.throw();
        });
    });

    describe("thrown(errorTypeString)", () => {
        let error = null;

        beforeEach(() => {
            error = new TypeError("boo!");
        });

        it("should throw an assertion error if the spy does not throw at all", () => {
            const s = spy.create(() => { /* Contents don't matter */ });

            s();

            expect(() => {
                expect(s).to.have.thrown("TypeError");
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.thrown("TypeError");
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy throws the wrong type of error", () => {
            const s = spy.create(() => {
                throw new Error("boo!");
            });

            swallow(s);

            expect(() => {
                expect(s).to.have.thrown("TypeError");
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.thrown("TypeError");
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy throws the correct type of error", () => {
            const s = spy.create(() => {
                throw new TypeError("eek!");
            });

            swallow(s);

            expect(() => {
                expect(s).to.have.thrown("TypeError");
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.thrown("TypeError");
            }).not.to.throw();
        });

        it("should not throw if the spy throws once but not the next time", () => {
            const s = spy.create(() => {
                if (!(s.callCount > 1)) {
                    throw error;
                }
            });

            swallow(s);
            swallow(s);

            expect(() => {
                expect(s).to.have.thrown("TypeError");
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.thrown("TypeError");
            }).not.to.throw();
        });
    });

    describe("always thrown", () => {
        let error = null;

        beforeEach(() => {
            error = new TypeError("boo!");
        });

        it("should throw an assertion error if the spy throws once but not the next time", () => {
            const s = spy.create(() => {
                if (!(s.callCount > 1)) {
                    throw error;
                }
            });

            swallow(s);
            swallow(s);

            expect(() => {
                expect(s).to.have.always.thrown();
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.always.have.thrown();
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.always.have.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.thrown("TypeError");
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.always.have.thrown("TypeError");
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy throws the wrong error the second time", () => {
            const s = spy.create(() => {
                if (s.callCount === 1) {
                    throw error;
                } else {
                    throw new Error();
                }
            });

            swallow(s);
            swallow(s);

            expect(() => {
                expect(s).to.have.always.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.always.have.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.thrown("TypeError");
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.always.have.thrown("TypeError");
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy always throws the right error", () => {
            const s = spy.create(() => {
                throw error;
            });

            swallow(s);
            swallow(s);

            expect(() => {
                expect(s).to.have.always.thrown(error);
            }).not.to.throw();
            expect(() => {
                expect(s).to.always.have.thrown(error);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.always.thrown("TypeError");
            }).not.to.throw();
            expect(() => {
                expect(s).to.always.have.thrown("TypeError");
            }).not.to.throw();
        });
    });
});
