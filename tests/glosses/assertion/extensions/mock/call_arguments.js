const { assertion } = adone;
const { expect, AssertionError } = assertion;
const sinon = require("sinon");

describe("Call arguments", () => {
    let s = null;
    let arg1 = null;
    let arg2 = null;
    let arg3 = null;
    let arg4 = null;
    let notArg = null;
    let any = null;

    beforeEach(() => {
        s = sinon.spy();
        arg1 = "A";
        arg2 = "B";
        arg3 = { D: "E" };
        arg4 = { D: { E: { E: "P" } } };
        notArg = "C";
        any = sinon.match.any;
    });

    describe("calledWith", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.have.been.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called with the correct arguments", () => {
            s(arg1, arg2);

            expect(() => {
                expect(s).to.have.been.calledWith(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWith(arg1, arg2);
            }).not.to.throw();
        });

        it("should not throw when the spy is called with the correct arguments and more", () => {
            s(arg1, arg2, notArg);

            expect(() => {
                expect(s).to.have.been.calledWith(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWith(arg1, arg2);
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called with incorrect arguments", () => {
            s(notArg, arg1);

            expect(() => {
                expect(s).to.have.been.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called with incorrect arguments but then correct ones", () => {
            s(notArg, arg1);
            s(arg1, arg2);

            expect(() => {
                expect(s).to.have.been.calledWith(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(1)).to.have.been.calledWith(arg1, arg2);
            }).not.to.throw();
        });

        it("should handle objects in arguments", () => {
            s(arg1, arg3);
            const _arg3 = JSON.parse(JSON.stringify(arg3));

            expect(() => {
                expect(s).to.have.been.calledWith(arg1, _arg3);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWith(arg1, _arg3);
            }).not.to.throw();
        });

        it("should handle deep objects in arguments", () => {
            s(arg1, arg4);
            const _arg4 = JSON.parse(JSON.stringify(arg4));

            expect(() => {
                expect(s).to.have.been.calledWith(arg1, _arg4);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWith(arg1, _arg4);
            }).not.to.throw();
        });
    });


    describe("always calledWith", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.always.have.been.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called with the correct arguments", () => {
            s(arg1, arg2);

            expect(() => {
                expect(s).to.always.have.been.calledWith(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.always.been.calledWith(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.been.always.calledWith(arg1, arg2);
            }).not.to.throw();
        });

        it("should not throw when the spy is called with the correct arguments and more", () => {
            s(arg1, arg2, notArg);

            expect(() => {
                expect(s).to.always.have.been.calledWith(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.always.been.calledWith(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.been.always.calledWith(arg1, arg2);
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called with incorrect arguments", () => {
            s(notArg, arg1);

            expect(() => {
                expect(s).to.always.have.been.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called with incorrect arguments but then correct ones", () => {
            s(notArg, arg1);
            s(arg1, arg2);

            expect(() => {
                expect(s).to.always.have.been.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWith(arg1, arg2);
            }).to.throw(AssertionError);
        });
    });

    describe("calledOnceWith", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.have.been.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called once with the correct arguments", () => {
            s(arg1, arg2);

            expect(() => {
                expect(s).to.have.been.calledOnceWith(arg1, arg2);
            }).not.to.throw();
        });

        it("should not throw when the spy is called once with the correct arguments and more", () => {
            s(arg1, arg2, notArg);

            expect(() => {
                expect(s).to.have.been.calledOnceWith(arg1, arg2);
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called more than once", () => {
            s(arg2, arg2);
            s(arg1, arg2);

            expect(() => {
                expect(s).to.have.been.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called once with incorrect arguments", () => {
            s(notArg, arg1);

            expect(() => {
                expect(s).to.have.been.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should handle objects in arguments", () => {
            s(arg1, arg3);
            const _arg3 = JSON.parse(JSON.stringify(arg3));

            expect(() => {
                expect(s).to.have.been.calledOnceWith(arg1, _arg3);
            }).not.to.throw();
        });

        it("should handle deep objects in arguments", () => {
            s(arg1, arg4);
            const _arg4 = JSON.parse(JSON.stringify(arg4));

            expect(() => {
                expect(s).to.have.been.calledOnceWith(arg1, _arg4);
            }).not.to.throw();
        });
    });

    describe("always calledOnceWith", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.always.have.been.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called once with the correct arguments", () => {
            s(arg1, arg2);

            expect(() => {
                expect(s).to.always.have.been.calledOnceWith(arg1, arg2);
            }).to.not.throw;
            expect(() => {
                expect(s).to.have.always.been.calledOnceWith(arg1, arg2);
            }).to.not.throw;
            expect(() => {
                expect(s).to.have.been.always.calledOnceWith(arg1, arg2);
            }).to.not.throw;
        });

        it("should throw an assertion error when the spy is called more than once", () => {
            s(arg1, arg2);
            s(arg1, arg2);

            expect(() => {
                expect(s).to.always.have.been.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called once with the correct arguments and more", () => {
            s(arg1, arg2, notArg);

            expect(() => {
                expect(s).to.always.have.been.calledOnceWith(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.always.been.calledOnceWith(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.been.always.calledOnceWith(arg1, arg2);
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called with incorrect arguments", () => {
            s(notArg, arg1);

            expect(() => {
                expect(s).to.always.have.been.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledOnceWith(arg1, arg2);
            }).to.throw(AssertionError);
        });
    });

    describe("calledWithExactly", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.have.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called with the correct arguments", () => {
            s(arg1, arg2);

            expect(() => {
                expect(s).to.have.been.calledWithExactly(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithExactly(arg1, arg2);
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called with the correct arguments and more", () => {
            s(arg1, arg2, notArg);

            expect(() => {
                expect(s).to.have.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called with incorrect arguments", () => {
            s(notArg, arg1);

            expect(() => {
                expect(s).to.have.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called with incorrect arguments but then correct ones", () => {
            s(notArg, arg1);
            s(arg1, arg2);

            expect(() => {
                expect(s).to.have.been.calledWithExactly(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(1)).to.have.been.calledWithExactly(arg1, arg2);
            }).not.to.throw();
        });
    });


    describe("always calledWithExactly", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.always.have.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called with the correct arguments", () => {
            s(arg1, arg2);

            expect(() => {
                expect(s).to.always.have.been.calledWithExactly(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.always.been.calledWithExactly(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.been.always.calledWithExactly(arg1, arg2);
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called with the correct arguments and more", () => {
            s(arg1, arg2, notArg);

            expect(() => {
                expect(s).to.always.have.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called with incorrect arguments", () => {
            s(notArg, arg1);

            expect(() => {
                expect(s).to.always.have.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called with incorrect arguments but then correct ones", () => {
            s(notArg, arg1);
            s(arg1, arg2);

            expect(() => {
                expect(s).to.always.have.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });
    });

    describe("calledOnceWithExactly", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.have.been.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called once with the correct arguments", () => {
            s(arg1, arg2);

            expect(() => {
                expect(s).to.have.been.calledOnceWithExactly(arg1, arg2);
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called more than once", () => {
            s(arg1, arg2);
            s(arg1, arg2);

            expect(() => {
                expect(s).to.have.been.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called once with the correct arguments and more",
            () => {
                s(arg1, arg2, notArg);

                expect(() => {
                    expect(s).to.have.been.calledOnceWithExactly(arg1, arg2);
                }).to.throw(AssertionError);
            });

        it("should throw an assertion error when the spy is called once with incorrect arguments", () => {
            s(notArg, arg1);

            expect(() => {
                expect(s).to.have.been.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });
    });

    describe("always calledOnceWithExactly", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.always.have.been.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called once with the correct arguments", () => {
            s(arg1, arg2);

            expect(() => {
                expect(s).to.always.have.been.calledOnceWithExactly(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.always.been.calledOnceWithExactly(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.been.always.calledOnceWithExactly(arg1, arg2);
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called more than once", () => {
            s(arg1, arg2);
            s(arg1, arg2);

            expect(() => {
                expect(s).to.always.have.been.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called once with the correct arguments and more",
            () => {
                s(arg1, arg2, notArg);

                expect(() => {
                    expect(s).to.always.have.been.calledOnceWithExactly(arg1, arg2);
                }).to.throw(AssertionError);
                expect(() => {
                    expect(s).to.have.always.been.calledOnceWithExactly(arg1, arg2);
                }).to.throw(AssertionError);
                expect(() => {
                    expect(s).to.have.been.always.calledOnceWithExactly(arg1, arg2);
                }).to.throw(AssertionError);
            });

        it("should throw an assertion error when the spy is called once with incorrect arguments", () => {
            s(notArg, arg1);

            expect(() => {
                expect(s).to.always.have.been.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledOnceWithExactly(arg1, arg2);
            }).to.throw(AssertionError);
        });
    });

    describe("calledWithMatch", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.have.been.calledWithMatch(any, any);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called with the correct arguments", () => {
            s(arg1, arg2);

            expect(() => {
                expect(s).to.have.been.calledWithMatch(any, any);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithMatch(any, any);
            }).not.to.throw();
        });

        it("should not throw when the spy is called with the correct arguments and more", () => {
            s(arg1, arg2, notArg);

            expect(() => {
                expect(s).to.have.been.calledWithMatch(any, any);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithMatch(any, any);
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called with incorrect arguments", () => {
            s(notArg, arg1);

            expect(() => {
                expect(s).to.have.been.calledWithMatch(any, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithMatch(arg1, any);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called with incorrect arguments but then correct ones", () => {
            s(notArg, arg1);
            s(arg1, arg2);

            expect(() => {
                expect(s).to.have.been.calledWithMatch(arg1, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s.getCall(1)).to.have.been.calledWithMatch(arg1, arg2);
            }).not.to.throw();
        });
    });


    describe("always calledWithMatch", () => {
        it("should throw an assertion error when the spy is not called", () => {
            expect(() => {
                expect(s).to.always.have.been.calledWithMatch(any, any);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWithMatch(arg1, any);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWithMatch(any, arg2);
            }).to.throw(AssertionError);
        });

        it("should not throw when the spy is called with the correct arguments", () => {
            s(arg1, arg2);

            expect(() => {
                expect(s).to.always.have.been.calledWithMatch(any, any);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.always.been.calledWithMatch(any, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.been.always.calledWithMatch(arg1, any);
            }).not.to.throw();
        });

        it("should not throw when the spy is called with the correct arguments and more", () => {
            s(arg1, arg2, notArg);

            expect(() => {
                expect(s).to.always.have.been.calledWithMatch(any, any);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.always.been.calledWithMatch(any, arg2);
            }).not.to.throw();
            expect(() => {
                expect(s).to.have.been.always.calledWithMatch(arg1, any);
            }).not.to.throw();
        });

        it("should throw an assertion error when the spy is called with incorrect arguments", () => {
            s(notArg, arg1);

            expect(() => {
                expect(s).to.always.have.been.calledWithMatch(any, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWithMatch(arg1, any);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWithMatch(arg1, arg2);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error when the spy is called with incorrect arguments but then correct ones", () => {
            s(notArg, arg1);
            s(arg1, arg2);

            expect(() => {
                expect(s).to.always.have.been.calledWithMatch(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.always.been.calledWithMatch(arg1, arg2);
            }).to.throw(AssertionError);
            expect(() => {
                expect(s).to.have.been.always.calledWithMatch(arg1, arg2);
            }).to.throw(AssertionError);
        });
    });
});
