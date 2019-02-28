const sinon = require("sinon");
const { assertion } = adone;
const { expect } = assertion;

import { swallow } from "./common";

describe("Messages", () => {
    describe("about call count", () => {
        it("should be correct for the base cases", () => {
            const spy = sinon.spy();

            expect(() => {
                expect(spy).to.have.been.called;
            }).to.throw("expected spy to have been called at least once, but it was never called");
            expect(() => {
                expect(spy).to.have.been.calledOnce;
            }).to.throw("expected spy to have been called exactly once, but it was called 0 times");
            expect(() => {
                expect(spy).to.have.been.calledTwice;
            }).to.throw("expected spy to have been called exactly twice, but it was called 0 times");
            expect(() => {
                expect(spy).to.have.been.calledThrice;
            }).to.throw("expected spy to have been called exactly thrice, but it was called 0 times");

            expect(() => {
                expect(spy).to.have.callCount(1);
            }).to.throw("expected spy to have been called exactly once, but it was called 0 times");
            expect(() => {
                expect(spy).to.have.callCount(4);
            }).to.throw("expected spy to have been called exactly 4 times, but it was called 0 times");

            expect(() => {
                expect(spy).to.have.been.calledOnceWith();
            }).to.throw("expected spy to have been called exactly once with arguments");
            expect(() => {
                expect(spy).to.have.been.calledOnceWithExactly();
            }).to.throw("expected spy to have been called exactly once with exact arguments");
        });

        it("should be correct for the negated cases", () => {
            const calledOnce = sinon.spy();
            const calledTwice = sinon.spy();
            const calledThrice = sinon.spy();
            const calledFourTimes = sinon.spy();

            calledOnce();
            calledTwice();
            calledTwice();
            calledThrice();
            calledThrice();
            calledThrice();
            calledFourTimes();
            calledFourTimes();
            calledFourTimes();
            calledFourTimes();

            expect(() => {
                expect(calledOnce).to.not.have.been.called;
            }).to.throw("expected spy to not have been called");

            expect(() => {
                expect(calledOnce).to.not.have.been.calledOnce;
            }).to.throw("expected spy to not have been called exactly once");

            expect(() => {
                expect(calledTwice).to.not.have.been.calledTwice;
            }).to.throw("expected spy to not have been called exactly twice");

            expect(() => {
                expect(calledThrice).to.not.have.been.calledThrice;
            }).to.throw("expected spy to not have been called exactly thrice");

            expect(() => {
                expect(calledOnce).to.not.have.callCount(1);
            }).to.throw("expected spy to not have been called exactly once");

            expect(() => {
                expect(calledFourTimes).to.not.have.callCount(4);
            }).to.throw("expected spy to not have been called exactly 4 times");
        });
    });

    describe("about call order", () => {
        it("should be correct for the base cases", () => {
            const spyA = sinon.spy();
            const spyB = sinon.spy();

            spyA.displayName = "spyA";
            spyB.displayName = "spyB";

            expect(() => {
                expect(spyA).to.have.been.calledBefore(spyB);
            }).to.throw("expected spyA to have been called before function spyB() {}");

            if (spyA.calledImmediatelyBefore) {
                expect(() => {
                    expect(spyA).to.have.been.calledImmediatelyBefore(spyB);
                }).to.throw("expected spyA to have been called immediately before function spyB() {}");
            }

            expect(() => {
                expect(spyB).to.have.been.calledAfter(spyA);
            }).to.throw("expected spyB to have been called after function spyA() {}");

            if (spyB.calledImmediatelyAfter) {
                expect(() => {
                    expect(spyB).to.have.been.calledImmediatelyAfter(spyA);
                }).to.throw("expected spyB to have been called immediately after function spyA() {}");
            }
        });

        it("should be correct for the negated cases", () => {
            const spyA = sinon.spy();
            const spyB = sinon.spy();

            spyA.displayName = "spyA";
            spyB.displayName = "spyB";

            spyA();
            spyB();

            expect(() => {
                expect(spyA).to.not.have.been.calledBefore(spyB);
            }).to.throw("expected spyA to not have been called before function spyB() {}");

            if (spyA.calledImmediatelyBefore) {
                expect(() => {
                    expect(spyA).to.not.have.been.calledImmediatelyBefore(spyB);
                }).to.throw("expected spyA to not have been called immediately before function spyB() {}");
            }

            expect(() => {
                expect(spyB).to.not.have.been.calledAfter(spyA);
            }).to.throw("expected spyB to not have been called after function spyA() {}");

            if (spyB.calledImmediatelyAfter) {
                expect(() => {
                    expect(spyB).to.not.have.been.calledImmediatelyAfter(spyA);
                }).to.throw("expected spyB to not have been called immediately after function spyA() {}");
            }
        });
    });

    describe("about call context", () => {
        it("should be correct for the basic case", () => {
            const spy = sinon.spy();
            const context = {};
            const badContext = { x: "y" };

            spy.call(badContext);

            const expected = `expected spy to have been called with {  } as this, but it was called with ${
                spy.printf("%t")} instead`;
            expect(() => {
                expect(spy).to.have.been.calledOn(context);
            }).to.throw(expected);
            expect(() => {
                expect(spy.getCall(0)).to.have.been.calledOn(context);
            }).to.throw(expected);
        });

        it("should be correct for the negated case", () => {
            const spy = sinon.spy();
            const context = {};

            spy.call(context);

            const expected = "expected spy to not have been called with {  } as this";
            expect(() => {
                expect(spy).to.not.have.been.calledOn(context);
            }).to.throw(expected);
            expect(() => {
                expect(spy.getCall(0)).to.not.have.been.calledOn(context);
            }).to.throw(expected);
        });

        it("should be correct for the always case", () => {
            const spy = sinon.spy();
            const context = {};
            const badContext = { x: "y" };

            spy.call(badContext);

            const expected = `expected spy to always have been called with {  } as this, but it was called with ${
                spy.printf("%t")} instead`;
            expect(() => {
                expect(spy).to.always.have.been.calledOn(context);
            }).to.throw(expected);
        });
    });

    describe("about calling with new", () => {
        /**
         * eslint-disable new-cap, no-new
         */
        it("should be correct for the basic case", () => {
            const spy = sinon.spy();

            spy();

            const expected = "expected spy to have been called with new";
            expect(() => {
                expect(spy).to.have.been.calledWithNew;
            }).to.throw(expected);
            expect(() => {
                expect(spy.getCall(0)).to.have.been.calledWithNew;
            }).to.throw(expected);
        });

        it("should be correct for the negated case", () => {
            const spy = sinon.spy();

            new spy();

            const expected = "expected spy to not have been called with new";
            expect(() => {
                expect(spy).to.not.have.been.calledWithNew;
            }).to.throw(expected);
            expect(() => {
                expect(spy.getCall(0)).to.not.have.been.calledWithNew;
            }).to.throw(expected);
        });

        it("should be correct for the always case", () => {
            const spy = sinon.spy();

            new spy();
            spy();

            const expected = "expected spy to always have been called with new";
            expect(() => {
                expect(spy).to.always.have.been.calledWithNew;
            }).to.throw(expected);
        });
        /* eslint-enable new-cap, no-new */
    });

    describe("about call arguments", () => {
        it("should be correct for the basic cases", () => {
            const spy = sinon.spy();

            spy(1, 2, 3);

            expect(() => {
                expect(spy).to.have.been.calledWith("a", "b", "c");
            }).to.throw("expected spy to have been called with arguments a, b, c");
            expect(() => {
                expect(spy).to.have.been.calledWithExactly("a", "b", "c");
            }).to.throw("expected spy to have been called with exact arguments a, b, c");
            expect(() => {
                expect(spy).to.have.been.calledWithMatch(sinon.match("foo"));
            }).to.throw("expected spy to have been called with arguments matching match(\"foo\")");
            expect(() => {
                expect(spy).to.have.been.calledOnceWith("a", "b", "c");
            }).to.throw("expected spy to have been called exactly once with arguments a, b, c");
            expect(() => {
                expect(spy).to.have.been.calledOnceWithExactly("a", "b", "c");
            }).to.throw("expected spy to have been called exactly once with exact arguments a, b, c");

            expect(() => {
                expect(spy.getCall(0)).to.have.been.calledWith("a", "b", "c");
            }).to.throw("expected spy to have been called with arguments a, b, c");
            expect(() => {
                expect(spy.getCall(0)).to.have.been.calledWithExactly("a", "b", "c");
            }).to.throw("expected spy to have been called with exact arguments a, b, c");
            expect(() => {
                expect(spy.getCall(0)).to.have.been.calledWithMatch(sinon.match("foo"));
            }).to.throw("expected spy to have been called with arguments matching match(\"foo\")");
        });

        it("should be correct for the negated cases", () => {
            const spy = sinon.spy();

            spy(1, 2, 3);

            expect(() => {
                expect(spy).to.not.have.been.calledWith(1, 2, 3);
            }).to.throw("expected spy to not have been called with arguments 1, 2, 3");
            expect(() => {
                expect(spy).to.not.have.been.calledWithExactly(1, 2, 3);
            }).to.throw("expected spy to not have been called with exact arguments 1, 2, 3");
            expect(() => {
                expect(spy).to.not.have.been.calledWithMatch(sinon.match(1));
            }).to.throw("expected spy to not have been called with arguments matching match(1)");
            expect(() => {
                expect(spy).to.not.have.been.calledOnceWith(1, 2, 3);
            }).to.throw("expected spy to not have been called exactly once with arguments 1, 2, 3");
            expect(() => {
                expect(spy).to.not.have.been.calledOnceWithExactly(1, 2, 3);
            }).to.throw("expected spy to not have been called exactly once with exact arguments 1, 2, 3");

            expect(() => {
                expect(spy.getCall(0)).to.not.have.been.calledWith(1, 2, 3);
            }).to.throw("expected spy to not have been called with arguments 1, 2, 3");
            expect(() => {
                expect(spy.getCall(0)).to.not.have.been.calledWithExactly(1, 2, 3);
            }).to.throw("expected spy to not have been called with exact arguments 1, 2, 3");
            expect(() => {
                expect(spy.getCall(0)).to.not.have.been.calledWithMatch(sinon.match(1));
            }).to.throw("expected spy to not have been called with arguments matching match(1)");
        });

        it("should be correct for the always cases", () => {
            const spy = sinon.spy();

            spy(1, 2, 3);
            spy("a", "b", "c");

            const expected = /expected spy to always have been called with arguments 1, 2, 3/;
            expect(() => {
                expect(spy).to.always.have.been.calledWith(1, 2, 3);
            }).to.throw(expected);

            const expectedExactly = /expected spy to always have been called with exact arguments 1, 2, 3/;
            expect(() => {
                expect(spy).to.always.have.been.calledWithExactly(1, 2, 3);
            }).to.throw(expectedExactly);

            const expectedMatch = /expected spy to always have been called with arguments matching match\(1\)/;
            expect(() => {
                expect(spy).to.always.have.been.calledWithMatch(sinon.match(1));
            }).to.throw(expectedMatch);

            const expectedOnce = /expected spy to have been called exactly once with arguments 1, 2, 3/;
            expect(() => {
                expect(spy).to.always.have.been.calledOnceWith(1, 2, 3);
            }).to.throw(expectedOnce);

            const expectedExactlyOnce = /expected spy to have been called exactly once with exact arguments 1, 2, 3/;
            expect(() => {
                expect(spy).to.always.have.been.calledOnceWithExactly(1, 2, 3);
            }).to.throw(expectedExactlyOnce);

            spy.resetHistory();
            spy(1, 2, 3);
            spy(1, 2, 3);

            expect(() => {
                expect(spy).to.always.have.been.calledOnceWith(1, 2, 3);
            }).to.throw(expectedOnce);

            expect(() => {
                expect(spy).to.always.have.been.calledOnceWithExactly(1, 2, 3);
            }).to.throw(expectedExactlyOnce);
        });
    });

    describe("about returning", () => {
        it("should be correct for the basic case", () => {
            const spy = sinon.spy(() => {
                return 1;
            });

            spy();

            expect(() => {
                expect(spy).to.have.returned(2);
            }).to.throw("expected spy to have returned 2");
            expect(() => {
                expect(spy.getCall(0)).to.have.returned(2);
            }).to.throw("expected spy to have returned 2");
        });

        it("should be correct for the negated case", () => {
            const spy = sinon.spy(() => {
                return 1;
            });

            spy();

            expect(() => {
                expect(spy).to.not.have.returned(1);
            }).to.throw("expected spy to not have returned 1");
            expect(() => {
                expect(spy.getCall(0)).to.not.have.returned(1);
            }).to.throw("expected spy to not have returned 1");
        });

        it("should be correct for the always case", () => {
            const spy = sinon.spy(() => {
                return 1;
            });

            spy();

            expect(() => {
                expect(spy).to.always.have.returned(2);
            }).to.throw("expected spy to always have returned 2");
        });
    });

    describe("about throwing", () => {
        it("should be correct for the basic cases", () => {
            const spy = sinon.spy();
            const throwingSpy = sinon.spy(() => {
                throw new Error();
            });

            spy();
            swallow(throwingSpy);

            expect(() => {
                expect(spy).to.have.thrown();
            }).to.throw("expected spy to have thrown");
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown();
            }).to.throw("expected spy to have thrown");

            expect(() => {
                expect(throwingSpy).to.have.thrown("TypeError");
            }).to.throw("expected spy to have thrown TypeError");
            expect(() => {
                expect(throwingSpy.getCall(0)).to.have.thrown("TypeError");
            }).to.throw("expected spy to have thrown TypeError");

            expect(() => {
                expect(throwingSpy).to.have.thrown({ message: "x" });
            }).to.throw('expected spy to have thrown { message: "x" }');
            expect(() => {
                expect(throwingSpy.getCall(0)).to.have.thrown({ message: "x" });
            }).to.throw('expected spy to have thrown { message: "x" }');
        });

        it("should be correct for the negated cases", () => {
            const error = new Error("boo!");
            const spy = sinon.spy(() => {
                throw error;
            });

            swallow(spy);

            expect(() => {
                expect(spy).to.not.have.thrown();
            }).to.throw("expected spy to not have thrown");
            expect(() => {
                expect(spy.getCall(0)).to.not.have.thrown();
            }).to.throw("expected spy to not have thrown");

            expect(() => {
                expect(spy).to.not.have.thrown("Error");
            }).to.throw("expected spy to not have thrown Error");
            expect(() => {
                expect(spy.getCall(0)).to.not.have.thrown("Error");
            }).to.throw("expected spy to not have thrown Error");

            expect(() => {
                expect(spy).to.not.have.thrown(error);
            }).to.throw("expected spy to not have thrown Error: boo!");
            expect(() => {
                expect(spy.getCall(0)).to.not.have.thrown(error);
            }).to.throw("expected spy to not have thrown Error: boo!");
        });

        it("should be correct for the always cases", () => {
            const spy = sinon.spy();
            const throwingSpy = sinon.spy(() => {
                throw new Error();
            });

            spy();
            swallow(throwingSpy);

            expect(() => {
                expect(spy).to.have.always.thrown();
            }).to.throw("expected spy to always have thrown");

            expect(() => {
                expect(throwingSpy).to.have.always.thrown("TypeError");
            }).to.throw("expected spy to always have thrown TypeError");

            expect(() => {
                expect(throwingSpy).to.have.always.thrown({ message: "x" });
            }).to.throw('expected spy to always have thrown { message: "x" }');
        });
    });

    describe("when used on a non-spy/non-call", () => {
        function notSpy() {
            // Contents don't matter
        }

        it("should be informative for properties", () => {
            expect(() => {
                expect(notSpy).to.have.been.called;
            }).to.throw(TypeError, /not a spy/);
        });

        it("should be informative for methods", () => {
            expect(() => {
                expect(notSpy).to.have.been.calledWith("foo");
            }).to.throw(TypeError, /not a spy/);
        });
    });

    it("should not trigger getters for passing assertions", () => {
        const obj = {};
        let getterCalled = false;
        Object.defineProperty(obj, "getter", {
            get() {
                getterCalled = true;
            },
            enumerable: true
        });

        const spy = sinon.spy();

        spy(obj);

        expect(spy).to.have.been.calledWith(obj);

        expect(getterCalled).to.be.false;
    });
});
