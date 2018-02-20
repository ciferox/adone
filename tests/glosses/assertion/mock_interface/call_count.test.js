describe("assertion", "mock interface", "call count", () => {
    const {
        assertion: { AssertionError },
        error
    } = adone;
    
    let s = null;

    beforeEach(() => {
        s = spy();
    });

    describe("called", () => {
        it("should throw an error when the spy is undefined", () => {
            expect(() => {
                expect(undefined).to.have.been.called();
            }).to.throw(error.InvalidArgument);
        });

        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.have.been.called();
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called once", () => {
            s();

            expect(() => {
                expect(s).to.have.been.called();
            }).not.to.throw();
        });

        it("should not throw when the spy is called twice", () => {
            s();
            s();

            expect(() => {
                expect(s).to.have.been.called();
            }).not.to.throw();
        });
    });

    describe("not called", () => {
        it("should not throw when the spy is not called", () => {
            expect(() => {
                expect(s).not.to.have.been.called();
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called once", () => {
            s();

            expect(() => {
                expect(s).not.to.have.been.called();
            }).to.throw(AssertionError);
        });
    });

    describe("callCount", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.have.callCount();
            }).to.throw(AssertionError);
        });

        it("should not throw an assertion error when the number of calls equals provided call count", () => {
            s();
            s();
            s();
            s();

            expect(() => {
                expect(s).to.have.callCount(4);
            }).not.to.throw(AssertionError);
        });

        it("should throw an assertion error whenever the number of calls are not equal to provided call count",
            () => {
                s();
                s();
                s();

                expect(() => {
                    expect(s).to.have.callCount(4);
                }).to.throw(AssertionError);
            });
    });

    describe("calledOnce", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.have.been.calledOnce();
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called once", () => {
            s();

            expect(() => {
                expect(s).to.have.been.calledOnce();
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called twice", () => {
            s();
            s();

            expect(() => {
                expect(s).to.have.been.calledOnce();
            }).to.throw(AssertionError);
        });
    });

    describe("calledTwice", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.have.been.calledTwice();
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called once", () => {
            s();

            expect(() => {
                expect(s).to.have.been.calledTwice();
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called twice", () => {
            s();
            s();

            expect(() => {
                expect(s).to.have.been.calledTwice();
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called thrice", () => {
            s();
            s();
            s();

            expect(() => {
                expect(s).to.have.been.calledTwice();
            }).to.throw(AssertionError);
        });
    });

    describe("calledThrice", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.have.been.calledThrice();
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called once", () => {
            s();

            expect(() => {
                expect(s).to.have.been.calledThrice();
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called twice", () => {
            s();
            s();

            expect(() => {
                expect(s).to.have.been.calledThrice();
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called thrice", () => {
            s();
            s();
            s();

            expect(() => {
                expect(s).to.have.been.calledThrice();
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called four times", () => {
            s();
            s();
            s();
            s();

            expect(() => {
                expect(s).to.have.been.calledThrice();
            }).to.throw(AssertionError);
        });
    });
});
