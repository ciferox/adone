describe("assertion", "mock interface", "call order", () => {
    const { assertion: { AssertionError } } = adone;
    let spy1 = spy(); // Used for testing when setting up tests
    let spy2 = null;
    let spy3 = null;

    beforeEach(() => {
        spy1 = spy();
        spy2 = spy();
        spy3 = spy();
    });

    describe("spy1 calledBefore spy2", () => {
        it("should throw an assertion error when neither spy is called", () => {
            expect(() => {
                expect(spy1).to.have.been.calledBefore(spy2);
            }).to.throw(AssertionError);
        });

        it("should not throw when only spy 1 is called", () => {
            spy1();

            expect(() => {
                expect(spy1).to.have.been.calledBefore(spy2);
            }).not.to.throw();
        });

        it("should throw an assertion error when only spy 2 is called", () => {
            spy2();

            expect(() => {
                expect(spy1).to.have.been.calledBefore(spy2);
            }).to.throw(AssertionError);
        });

        it("should not throw when spy 1 is called before spy 2", () => {
            spy1();
            spy2();

            expect(() => {
                expect(spy1).to.have.been.calledBefore(spy2);
            }).not.to.throw();
        });

        it("should throw an assertion error when spy 1 is called after spy 2", () => {
            spy2();
            spy1();

            expect(() => {
                expect(spy1).to.have.been.calledBefore(spy2);
            }).to.throw(AssertionError);
        });
    });

    if (spy1.calledImmediatelyBefore) {
        describe("spy1 calledImmediatelyBefore spy2", () => {
            it("should throw an assertion error when neither spy is called", () => {
                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyBefore(spy2);
                }).to.throw(AssertionError);
            });

            it("should throw an assertion error when only spy 1 is called", () => {
                spy1();

                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyBefore(spy2);
                }).to.throw(AssertionError);
            });

            it("should throw an assertion error when only spy 2 is called", () => {
                spy2();

                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyBefore(spy2);
                }).to.throw(AssertionError);
            });

            it("should not throw when spy 1 is called immediately before spy 2", () => {
                spy1();
                spy2();

                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyBefore(spy2);
                }).not.to.throw();
            });

            it("should throw an assertion error when spy 1 is called before spy 2, but not immediately", () => {
                spy2();
                spy3();
                spy1();

                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyBefore(spy2);
                }).to.throw(AssertionError);
            });

            it("should throw an assertion error when spy 1 is called after spy 2", () => {
                spy2();
                spy1();

                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyBefore(spy2);
                }).to.throw(AssertionError);
            });
        });
    }

    describe("spy1 calledAfter spy2", () => {
        it("should throw an assertion error when neither spy is called", () => {
            expect(() => {
                expect(spy1).to.have.been.calledAfter(spy2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when only spy 1 is called", () => {
            spy1();

            expect(() => {
                expect(spy1).to.have.been.calledAfter(spy2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when only spy 2 is called", () => {
            spy2();

            expect(() => {
                expect(spy1).to.have.been.calledAfter(spy2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when spy 1 is called before spy 2", () => {
            spy1();
            spy2();

            expect(() => {
                expect(spy1).to.have.been.calledAfter(spy2);
            }).to.throw(AssertionError);
        });

        it("should not throw when spy 1 is called after spy 2", () => {
            spy2();
            spy1();

            expect(() => {
                expect(spy1).to.have.been.calledAfter(spy2);
            }).not.to.throw();
        });
    });

    if (spy1.calledImmediatelyAfter) {
        describe("spy1 calledImmediatelyAfter spy2", () => {
            it("should throw an assertion error when neither spy is called", () => {
                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyAfter(spy2);
                }).to.throw(AssertionError);
            });

            it("should throw an assertion error when only spy 1 is called", () => {
                spy1();

                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyAfter(spy2);
                }).to.throw(AssertionError);
            });

            it("should throw an assertion error when only spy 2 is called", () => {
                spy2();

                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyAfter(spy2);
                }).to.throw(AssertionError);
            });

            it("should throw an assertion error when spy 1 is called before spy 2", () => {
                spy1();
                spy2();

                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyAfter(spy2);
                }).to.throw(AssertionError);
            });

            it("should not throw when spy 1 is called immediately after spy 2", () => {
                spy2();
                spy1();

                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyAfter(spy2);
                }).not.to.throw();
            });

            it("should throw an assertion error when spy 1 is called after spy 2, but not immediately", () => {
                spy1();
                spy3();
                spy2();

                expect(() => {
                    expect(spy1).to.have.been.calledImmediatelyAfter(spy2);
                }).to.throw(AssertionError);
            });
        });
    }
});
