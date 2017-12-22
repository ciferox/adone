describe("assertion", "mock interface", "messages", () => {
    const swallow = (t) => {
        try {
            t();
        } catch (err) {
            //
        }
    };

    describe("about call count", () => {
        it("should be correct for the base cases", () => {
            const s = spy();

            expect(() => {
                expect(s).to.have.been.called;
            }).to.throw("expected spy to have been called at least once, but it was never called");
            expect(() => {
                expect(s).to.have.been.calledOnce;
            }).to.throw("expected spy to have been called exactly once, but it was called 0 times");
            expect(() => {
                expect(s).to.have.been.calledTwice;
            }).to.throw("expected spy to have been called exactly twice, but it was called 0 times");
            expect(() => {
                expect(s).to.have.been.calledThrice;
            }).to.throw("expected spy to have been called exactly thrice, but it was called 0 times");

            expect(() => {
                expect(s).to.have.callCount(1);
            }).to.throw("expected spy to have been called exactly once, but it was called 0 times");
            expect(() => {
                expect(s).to.have.callCount(4);
            }).to.throw("expected spy to have been called exactly 4 times, but it was called 0 times");
        });

        it("should be correct for the negated cases", () => {
            const calledOnce = spy();
            const calledTwice = spy();
            const calledThrice = spy();
            const calledFourTimes = spy();

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
                expect(calledOnce).not.to.have.been.called;
            }).to.throw("expected spy to not have been called");

            expect(() => {
                expect(calledOnce).not.to.have.been.calledOnce;
            }).to.throw("expected spy to not have been called exactly once");

            expect(() => {
                expect(calledTwice).not.to.have.been.calledTwice;
            }).to.throw("expected spy to not have been called exactly twice");

            expect(() => {
                expect(calledThrice).not.to.have.been.calledThrice;
            }).to.throw("expected spy to not have been called exactly thrice");

            expect(() => {
                expect(calledOnce).not.to.have.callCount(1);
            }).to.throw("expected spy to not have been called exactly once");

            expect(() => {
                expect(calledFourTimes).not.to.have.callCount(4);
            }).to.throw("expected spy to not have been called exactly 4 times");
        });
    });

    describe("about call order", () => {
        it("should be correct for the base cases", () => {
            const spyA = spy();
            const spyB = spy();

            spyA.displayName = "spyA";
            spyB.displayName = "spyB";

            expect(() => {
                expect(spyA).to.have.been.calledBefore(spyB);
            }).to.throw("expected spyA to have been called before spyB");

            if (spyA.calledImmediatelyBefore) {
                expect(() => {
                    expect(spyA).to.have.been.calledImmediatelyBefore(spyB);
                }).to.throw("expected spyA to have been called immediately before spyB");
            }

            expect(() => {
                expect(spyB).to.have.been.calledAfter(spyA);
            }).to.throw("expected spyB to have been called after spyA");

            if (spyB.calledImmediatelyAfter) {
                expect(() => {
                    expect(spyB).to.have.been.calledImmediatelyAfter(spyA);
                }).to.throw("expected spyB to have been called immediately after spyA");
            }
        });

        it("should be correct for the negated cases", () => {
            const spyA = spy();
            const spyB = spy();

            spyA.displayName = "spyA";
            spyB.displayName = "spyB";

            spyA();
            spyB();

            expect(() => {
                expect(spyA).not.to.have.been.calledBefore(spyB);
            }).to.throw("expected spyA to not have been called before spyB");

            if (spyA.calledImmediatelyBefore) {
                expect(() => {
                    expect(spyA).not.to.have.been.calledImmediatelyBefore(spyB);
                }).to.throw("expected spyA to not have been called immediately before spyB");
            }

            expect(() => {
                expect(spyB).not.to.have.been.calledAfter(spyA);
            }).to.throw("expected spyB to not have been called after spyA");

            if (spyB.calledImmediatelyAfter) {
                expect(() => {
                    expect(spyB).not.to.have.been.calledImmediatelyAfter(spyA);
                }).to.throw("expected spyB to not have been called immediately after spyA");
            }
        });
    });

    describe("about call context", () => {
        it("should be correct for the basic case", () => {
            const s = spy();
            const context = {};
            const badContext = { x: "y" };

            s.call(badContext);

            const expected = `expected spy to have been called with {} as this, but it was called with ${
                s.printf("%t")} instead`;
            expect(() => {
                expect(s).to.have.been.calledOn(context);
            }).to.throw(expected);
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledOn(context);
            }).to.throw(expected);
        });

        it("should be correct for the negated case", () => {
            const s = spy();
            const context = {};

            s.call(context);

            const expected = "expected spy to not have been called with {} as this";
            expect(() => {
                expect(s).not.to.have.been.calledOn(context);
            }).to.throw(expected);
            expect(() => {
                expect(s.getCall(0)).not.to.have.been.calledOn(context);
            }).to.throw(expected);
        });

        it("should be correct for the always case", () => {
            const s = spy();
            const context = {};
            const badContext = { x: "y" };

            s.call(badContext);

            const expected = `expected spy to always have been called with {} as this, but it was called with ${
                s.printf("%t")} instead`;
            expect(() => {
                expect(s).to.always.have.been.calledOn(context);
            }).to.throw(expected);
        });
    });

    describe("about calling with new", () => {
        /* eslint-disable new-cap, no-new */
        it("should be correct for the basic case", () => {
            const s = spy();

            s();

            const expected = "expected spy to have been called with new";
            expect(() => {
                expect(s).to.have.been.calledWithNew;
            }).to.throw(expected);
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithNew;
            }).to.throw(expected);
        });

        it("should be correct for the negated case", () => {
            const s = spy();

            new s();

            const expected = "expected spy to not have been called with new";
            expect(() => {
                expect(s).not.to.have.been.calledWithNew;
            }).to.throw(expected);
            expect(() => {
                expect(s.getCall(0)).not.to.have.been.calledWithNew;
            }).to.throw(expected);
        });

        it("should be correct for the always case", () => {
            const s = spy();

            new s();
            s();

            const expected = "expected spy to always have been called with new";
            expect(() => {
                expect(s).to.always.have.been.calledWithNew;
            }).to.throw(expected);
        });
        /* eslint-enable new-cap, no-new */
    });

    describe("about call arguments", () => {
        it("should be correct for the basic cases", () => {
            const s = spy();

            s(1, 2, 3);

            expect(() => {
                expect(s).to.have.been.calledWith("a", "b", "c");
            }).to.throw("expected spy to have been called with arguments 'a', 'b', 'c'");
            expect(() => {
                expect(s).to.have.been.calledWithExactly("a", "b", "c");
            }).to.throw("expected spy to have been called with exact arguments 'a', 'b', 'c'");
            expect(() => {
                expect(s).to.have.been.calledWithMatch(match("foo"));
            }).to.throw("expected spy to have been called with arguments matching match(\"foo\")");

            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWith("a", "b", "c");
            }).to.throw("expected spy to have been called with arguments 'a', 'b', 'c'");
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithExactly("a", "b", "c");
            }).to.throw("expected spy to have been called with exact arguments 'a', 'b', 'c'");
            expect(() => {
                expect(s.getCall(0)).to.have.been.calledWithMatch(match("foo"));
            }).to.throw("expected spy to have been called with arguments matching match(\"foo\")");
        });

        it("should be correct for the negated cases", () => {
            const s = spy();

            s(1, 2, 3);

            expect(() => {
                expect(s).not.to.have.been.calledWith(1, 2, 3);
            }).to.throw("expected spy to not have been called with arguments 1, 2, 3");
            expect(() => {
                expect(s).not.to.have.been.calledWithExactly(1, 2, 3);
            }).to.throw("expected spy to not have been called with exact arguments 1, 2, 3");
            expect(() => {
                expect(s).not.to.have.been.calledWithMatch(match(1));
            }).to.throw("expected spy to not have been called with arguments matching match(1)");

            expect(() => {
                expect(s.getCall(0)).not.to.have.been.calledWith(1, 2, 3);
            }).to.throw("expected spy to not have been called with arguments 1, 2, 3");
            expect(() => {
                expect(s.getCall(0)).not.to.have.been.calledWithExactly(1, 2, 3);
            }).to.throw("expected spy to not have been called with exact arguments 1, 2, 3");
            expect(() => {
                expect(s.getCall(0)).not.to.have.been.calledWithMatch(match(1));
            }).to.throw("expected spy to not have been called with arguments matching match(1)");
        });

        it("should be correct for the always cases", () => {
            const s = spy();

            s(1, 2, 3);
            s("a", "b", "c");

            const expected = /expected spy to always have been called with arguments 1, 2, 3/;
            expect(() => {
                expect(s).to.always.have.been.calledWith(1, 2, 3);
            }).to.throw(expected);

            const expectedExactly = /expected spy to always have been called with exact arguments 1, 2, 3/;
            expect(() => {
                expect(s).to.always.have.been.calledWithExactly(1, 2, 3);
            }).to.throw(expectedExactly);

            const expectedMatch = /expected spy to always have been called with arguments matching match\(1\)/;
            expect(() => {
                expect(s).to.always.have.been.calledWithMatch(match(1));
            }).to.throw(expectedMatch);
        });
    });

    describe("about returning", () => {
        it("should be correct for the basic case", () => {
            const s = spy.create(() => {
                return 1;
            });

            s();

            expect(() => {
                expect(s).to.have.returned(2);
            }).to.throw("expected spy to have returned 2");
            expect(() => {
                expect(s.getCall(0)).to.have.returned(2);
            }).to.throw("expected spy to have returned 2");
        });

        it("should be correct for the negated case", () => {
            const s = spy.create(() => {
                return 1;
            });

            s();

            expect(() => {
                expect(s).not.to.have.returned(1);
            }).to.throw("expected spy to not have returned 1");
            expect(() => {
                expect(s.getCall(0)).not.to.have.returned(1);
            }).to.throw("expected spy to not have returned 1");
        });

        it("should be correct for the always case", () => {
            const s = spy.create(() => {
                return 1;
            });

            s();

            expect(() => {
                expect(s).to.always.have.returned(2);
            }).to.throw("expected spy to always have returned 2");
        });
    });

    describe("about throwing", () => {
        it("should be correct for the basic cases", () => {
            const s = spy();
            const throwingSpy = spy.create(() => {
                throw new Error();
            });

            s();
            swallow(throwingSpy);

            expect(() => {
                expect(s).to.have.thrown();
            }).to.throw("expected spy to have thrown");
            expect(() => {
                expect(s.getCall(0)).to.have.thrown();
            }).to.throw("expected spy to have thrown");

            expect(() => {
                expect(throwingSpy).to.have.thrown("TypeError");
            }).to.throw("expected spy to have thrown 'TypeError'");
            expect(() => {
                expect(throwingSpy.getCall(0)).to.have.thrown("TypeError");
            }).to.throw("expected spy to have thrown 'TypeError'");

            expect(() => {
                expect(throwingSpy).to.have.thrown({ message: "x" });
            }).to.throw("expected spy to have thrown { message: 'x' }");
            expect(() => {
                expect(throwingSpy.getCall(0)).to.have.thrown({ message: "x" });
            }).to.throw("expected spy to have thrown { message: 'x' }");
        });

        it("should be correct for the negated cases", () => {
            const error = new Error("boo!");
            const s = spy.create(() => {
                throw error;
            });

            swallow(s);

            expect(() => {
                expect(s).not.to.have.thrown();
            }).to.throw("expected spy to not have thrown");
            expect(() => {
                expect(s.getCall(0)).not.to.have.thrown();
            }).to.throw("expected spy to not have thrown");

            expect(() => {
                expect(s).not.to.have.thrown("Error");
            }).to.throw("expected spy to not have thrown 'Error'");
            expect(() => {
                expect(s.getCall(0)).not.to.have.thrown("Error");
            }).to.throw("expected spy to not have thrown 'Error'");

            expect(() => {
                expect(s).not.to.have.thrown(error);
            }).to.throw("expected spy to not have thrown [Error: boo!]");
            expect(() => {
                expect(s.getCall(0)).not.to.have.thrown(error);
            }).to.throw("expected spy to not have thrown [Error: boo!]");
        });

        it("should be correct for the always cases", () => {
            const s = spy();
            const throwingSpy = spy.create(() => {
                throw new Error();
            });

            s();
            swallow(throwingSpy);

            expect(() => {
                expect(s).to.have.always.thrown();
            }).to.throw("expected spy to always have thrown");

            expect(() => {
                expect(throwingSpy).to.have.always.thrown("TypeError");
            }).to.throw("expected spy to always have thrown 'TypeError'");

            expect(() => {
                expect(throwingSpy).to.have.always.thrown({ message: "x" });
            }).to.throw("expected spy to always have thrown { message: 'x' }");
        });
    });

    describe("when used on a non-spy/non-call", () => {
        const notSpy = () => {
            // Contents don't matter
        };

        it("should be informative for properties", () => {
            expect(() => {
                expect(notSpy).to.have.been.called;
            }).to.throw(/not a spy/);
        });

        it("should be informative for methods", () => {
            expect(() => {
                expect(notSpy).to.have.been.calledWith("foo");
            }).to.throw(/not a spy/);
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

        const s = spy();

        s(obj);

        expect(s).to.have.been.calledWith(obj);

        expect(getterCalled).to.be.false();
    });
});
