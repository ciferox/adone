const {
    assertion
} = adone;

const { expect, AssertionError } = assertion;

assertion.use(assertion.extension.spy);

describe("assertion", "extension", "spy", () => {

    describe("name", () => {
        it("defaults to undefined", () => {
            expect(assertion.spy().__spy.name).to.equal(undefined);
        });

        it("exposes the name", () => {
            expect(assertion.spy("007").__spy.name).to.equal("007");
        });

        it("executes the function sent to the spy", () => {
            const spy = assertion.spy();
            assertion.spy("007", spy)();
            expect(spy).to.have.been.called.once;
        });
    });

    describe("textual representation", () => {

        it("should print out nice", () => {
            expect(assertion.spy().toString()).to.equal("{ Spy }");
        });

        it("should show the name", () => {
            expect(assertion.spy("Nikita").toString()).to.equal("{ Spy 'Nikita' }");
        });

        it("should expose number of invokations", () => {
            const spy = assertion.spy();
            spy(); // 1
            spy(); // 2
            expect(spy.toString()).to.equal("{ Spy, 2 calls }");
        });

        it("should expose name and number of invokations", () => {
            const spy = assertion.spy("Nikita");
            spy(); // 1
            expect(spy.toString()).to.equal("{ Spy 'Nikita', 1 call }");
        });

        it("should expose original function `toString` representation", () => {
            function test(a, b, c) {
                return a + b + c;
            }

            const spy = assertion.spy(test);
            expect(spy.toString()).to.equal(`{ Spy }\n${test.toString()}`);
        });
    });

    it("should return the value of the mock function", () => {
        const spy = assertion.spy(() => {
            return "Jack Bauer";
        });
        const jack = spy();
        expect(jack).to.equal("Jack Bauer");
    });

    it("should invoke the function sent to the spy", () => {
        const spy = assertion.spy();
        assertion.spy(spy)();
        expect(spy).to.have.been.called.once;
    });

    it("should know when obj is a spy", () => {
        const spy = assertion.spy();
        expect(spy).to.be.spy;

        expect(() => {
            expect("hello").to.be.a.spy;
        }).to.throw(AssertionError);
    });

    it("should know when a spy has been called", () => {
        const spy = assertion.spy();
        expect(spy).to.be.spy;
        expect(spy.__spy.called).to.be.false;
        spy();
        expect(spy).to.have.been.called();
        expect(() => {
            expect(spy).to.have.not.been.called();
        }).to.throw(AssertionError);
    });

    it("should know when a spy has not been called", () => {
        const spy = assertion.spy();
        expect(spy).to.be.spy;
        expect(spy).to.have.not.been.called();
        expect(() => {
            expect(spy).to.have.been.called();
        }).to.throw(AssertionError);
    });

    it("should know when a spy has been called once", () => {
        const spy1 = assertion.spy();
        const spy2 = assertion.spy();
        spy1();
        spy2();
        spy2();
        expect(spy1).to.have.been.called.once;

        expect(() => {
            expect(spy2).to.have.been.called.once;
        }).to.throw(AssertionError);

        expect(() => {
            expect(spy1).to.have.not.been.called.once;
        }).to.throw(AssertionError);
    });

    it("should know when a spy has been called twice", () => {
        const spy1 = assertion.spy();
        const spy2 = assertion.spy();
        spy1();
        spy1();
        spy2();
        spy2();
        spy2();
        expect(spy1).to.have.been.called.twice;
        expect(() => {
            expect(spy2).to.have.been.called.twice;
        }).to.throw(AssertionError);
        expect(() => {
            expect(spy1).to.have.not.been.called.twice;
        }).to.throw(AssertionError);
    });

    it("should know when a spy has been called exactly n times", () => {
        const spy1 = assertion.spy();
        spy1();
        expect(spy1).to.have.been.called.exactly(1);
        expect(() => {
            expect(spy1).to.have.been.called.exactly(2);
        }).to.throw(AssertionError);
        expect(() => {
            expect(spy1).to.not.have.been.called.exactly(1);
        }).to.throw(AssertionError);
    });

    it("should know when a spy has been called above n times", () => {
        const spy = assertion.spy();
        spy();
        spy();
        expect(spy).to.have.been.called.above(1);
        expect(spy).to.have.been.called.gt(0);
        expect(2).to.be.above(1);
        expect(2).to.be.gt(1);
        expect(() => {
            expect(spy).to.have.been.called.above(2);
        }).to.throw(AssertionError);
        expect(() => {
            expect(spy).to.not.have.been.called.above(1);
        }).to.throw(AssertionError);
    });

    it("should know when a spy has been called below n times", () => {
        const spy = assertion.spy();
        spy();
        spy();
        spy();
        expect(spy).to.have.been.called.below(4);
        expect(spy).to.have.not.been.called.lt(3);
        expect(1).to.be.below(2);
        expect(1).to.be.lt(2);
        expect(() => {
            expect(spy).to.have.been.called.below(2);
        }).to.throw(AssertionError);
        expect(() => {
            expect(spy).to.not.have.been.called.below(4);
        }).to.throw(AssertionError);
    });

    it("should know when a spy has been called at least n times", () => {
        const spy = assertion.spy();
        spy();
        spy();
        expect(spy).to.have.been.called.min(2);
        expect(spy).to.have.been.called.at.least(1);
        expect(2).to.be.at.least(2);
        expect(2).to.be.at.least(1);
        expect(() => {
            expect(spy).to.have.been.called.min(3);
        }).to.throw(AssertionError);
        expect(() => {
            expect(spy).to.not.have.been.called.above(1);
        }).to.throw(AssertionError);
    });

    it("should know when a spy has been called at most n times", () => {
        const spy = assertion.spy();
        spy();
        spy();
        spy();
        expect(spy).to.have.been.called.max(3);
        expect(spy).to.have.been.called.at.most(4);
        expect(1).to.be.at.most(3);
        expect(1).to.be.at.most(4);
        expect(() => {
            expect(spy).to.have.been.called.max(2);
        }).to.throw(AssertionError);
        expect(() => {
            expect(spy).to.not.have.been.called.at.most(3);
        }).to.throw(AssertionError);
    });

    it("should understand length", () => {
        const orig = function (a, b) { };
        const spy = assertion.spy(orig);
        const spyClean = assertion.spy();
        expect(orig).to.have.length(2);
        expect(spy).to.have.length(2);
        expect(spyClean).to.have.length(0);
    });

    it("should create spy which returns static value", () => {
        const value = {};
        const spy = assertion.spy.returns(value);

        expect(spy).to.be.a.spy;
        expect(spy()).to.equal(value);
    });

    describe(".with", () => {
        it("should not interfere chai with", () => {
            expect(1).to.be.with.a("number");
        });
    });

    describe(".with(arg, ...)", () => {
        it("should pass when called with an argument", () => {
            const spy = assertion.spy();
            spy(1);
            spy(2);
            spy(3);
            expect(spy).to.have.been.called.with(1);
            expect(spy).to.have.been.called.with(2);
            expect(spy).to.have.been.called.with(3);
            expect(spy).to.not.have.been.called.with(4);
            expect(() => {
                expect(spy).to.have.been.called.with(4);
            }).to.throw(AssertionError, /have been called with/);
            expect(() => {
                expect(spy).to.have.not.been.called.with(1);
            }).to.throw(AssertionError, /have not been called with/);
        });

        it("should pass with called with multiple arguments", () => {
            const spy = assertion.spy();
            spy(1, 2, 3);
            spy(2, 4, 6);
            spy(3, 6, 9);
            expect(spy).to.have.been.called.with(1, 2);
            expect(spy).to.have.been.called.with(2, 4);
            expect(spy).to.have.been.called.with(3, 6);
            expect(spy).to.have.been.called.with(3, 1, 2);
            expect(spy).to.have.been.called.with(6, 2, 4);
            expect(spy).to.have.been.called.with(9, 3, 6);
            expect(spy).to.not.have.been.called.with(5);
            expect(spy).to.not.have.been.called.with(1, 9);
            expect(spy).to.not.have.been.called.with(9, 1, 4);
            expect(() => {
                expect(spy).to.have.been.called.with(1, 2, 5);
            }).to.throw(AssertionError, /have been called with/);
            expect(() => {
                expect(spy).to.have.not.been.called.with(3, 6, 9);
            }).to.throw(AssertionError, /have not been called with/);
        });

        it("should pass when called with multiple identical arguments", () => {
            const spy = assertion.spy();
            spy(1, 1);
            expect(spy).to.have.been.called.with(1);
            expect(spy).to.have.been.called.with(1, 1);
            expect(spy).to.not.have.been.called.with(1, 2);
            expect(spy).to.not.have.been.called.with(1, 1, 1);
        });
    });

    describe(".first.called.with(arg, ...)", () => {
        it("should pass only when called with the arguments the first time", () => {
            const spy = assertion.spy();
            spy(1, 2, 3);
            spy(3, 4, 5);
            expect(spy).to.have.been.first.called.with(3, 2, 1);
            expect(spy).to.have.been.first.called.with(1, 2, 3);
            expect(spy).to.have.been.first.called.with(1, 2);
            expect(spy).to.not.have.been.first.called.with(4);
            expect(() => {
                expect(spy).to.have.been.first.called.with(1, 2, 4);
            }).to.throw(AssertionError, /have been called at the first time with/);
            expect(() => {
                expect(spy).to.have.not.been.first.called.with(1, 2);
            }).to.throw(AssertionError, /have not been called at the first time with/);
        });
    });

    describe(".second.called.with(arg, ...)", () => {
        it("should pass only when called with the arguments the second time", () => {
            const spy = assertion.spy();
            spy(1, 2, 3);
            spy(3, 4, 5);
            expect(spy).to.have.been.second.called.with(3, 4, 5);
            expect(spy).to.have.been.second.called.with(4, 5);
            expect(spy).to.not.have.been.second.called.with(1);
            expect(() => {
                expect(spy).to.have.been.second.called.with(3, 4, 1);
            }).to.throw(AssertionError, /have been called at the second time with/);
            expect(() => {
                expect(spy).to.have.not.been.second.called.with(4, 5);
            }).to.throw(AssertionError, /have not been called at the second time with/);
        });
    });

    describe(".third.called.with(arg, ...)", () => {
        it("should pass only when called with the arguments the third time", () => {
            const spy = assertion.spy();
            spy(1, 2, 3);
            spy(3, 4, 5);
            spy(5, 6, 7);
            expect(spy).to.have.been.third.called.with(5, 6, 7);
            expect(spy).to.have.been.third.called.with(6, 5);
            expect(spy).to.not.have.been.third.called.with(1);
            expect(() => {
                expect(spy).to.have.been.third.called.with(5, 6, 1);
            }).to.throw(AssertionError, /have been called at the third time with/);
            expect(() => {
                expect(spy).to.have.not.been.third.called.with(6, 5);
            }).to.throw(AssertionError, /have not been called at the third time with/);
        });
    });

    describe(".nth(n).called.with(arg, ...)", () => {
        it("should pass only when called with the arguments the nth time its called", () => {
            const spy = assertion.spy();
            spy(0);
            spy(1);
            spy(2);
            spy(3);
            spy(4, 6, 7);
            spy(5, 8, 9);
            expect(spy).to.on.nth(5).be.called.with(4);
            expect(spy).to.on.nth(6).be.called.with(8, 5);
            expect(spy).to.not.on.nth(5).be.called.with(3, 4);
            expect(() => {
                expect(spy).to.on.nth(5).be.called.with(3);
            }).to.throw(AssertionError, /have been called at the 5th time with/);
            expect(() => {
                expect(spy).to.not.on.nth(6).be.called.with(5);
            }).to.throw(AssertionError, /have not been called at the 6th time with/);
            expect(() => {
                expect(spy).to.on.nth(7).be.called.with(10);
            }).to.throw(AssertionError, /to have been called at least 7 times but got 6/);
        });
    });

    describe(".always.with(arg, ...)", () => {
        it("should pass when called with an argument", () => {
            const spy = assertion.spy();
            spy(1);
            spy(1, 2);
            spy(3, 1);
            spy(4, 5, 1);
            expect(spy).to.have.been.always.called.with(1);
            expect(spy).to.not.always.have.been.called.with(2);
            expect(spy).to.not.always.have.been.called.with(8);
            expect(() => {
                expect(spy).to.have.been.always.called.with(2);
            }).to.throw(AssertionError, /to have been always called with/);
            expect(() => {
                expect(spy).to.not.have.been.always.called.with(1);
            }).to.throw(AssertionError, /to have not always been called with/);
        });

        it("should pass when called with multiple arguments", () => {
            const spy = assertion.spy();
            spy(1, 2);
            spy(2, 1);
            spy(1, 3, 2);
            spy(2, 5, 1);
            expect(spy).to.have.been.always.called.with(1, 2);
            expect(spy).to.not.always.have.been.called.with(2, 3);
            expect(spy).to.not.always.have.been.called.with(4, 6);
            expect(() => {
                expect(spy).to.have.been.always.called.with(2, 3);
            }).to.throw(AssertionError, /to have been always called with/);
            expect(() => {
                expect(spy).to.not.have.been.always.called.with(1, 2);
            }).to.throw(AssertionError, /to have not always been called with/);
        });

        it("should pass when called with multiple identical arguments", () => {
            const spy = assertion.spy();
            spy(1, 3, 1);
            spy(1, 2, 1);
            expect(spy).to.have.always.been.called.with(1);
            expect(spy).to.have.always.been.called.with(1, 1);
            expect(spy).to.not.have.always.been.called.with(1, 2);
            expect(spy).to.not.have.always.been.called.with(1, 1, 1);
        });
    });

    describe(".with.exactly(arg, ...)", () => {
        it("should pass when called with an argument", () => {
            const spy = assertion.spy();
            spy(1);
            spy(1, 2);
            expect(spy).to.have.been.called.with.exactly(1);
            expect(spy).to.have.not.been.called.with.exactly(2);
            expect(() => {
                expect(spy).to.have.been.called.with.exactly(2);
            }).to.throw(AssertionError, /to have been called with exactly/);
            expect(() => {
                expect(spy).to.have.not.been.called.with.exactly(1);
            }).to.throw(AssertionError, /to not have been called with exactly/);
        });

        it("shoud pass when called with multiple arguments", () => {
            const spy = assertion.spy();
            spy(1);
            spy(3, 2);
            expect(spy).to.have.been.called.with.exactly(3, 2);
            expect(spy).to.have.not.been.called.with.exactly(2, 3);
            expect(() => {
                expect(spy).to.have.been.called.with.exactly(2, 3);
            }).to.throw(AssertionError, /to have been called with exactly/);
            expect(() => {
                expect(spy).to.have.not.been.called.with.exactly(3, 2);
            }).to.throw(AssertionError, /to not have been called with exactly/);
        });

        it("should pass when called with multiple identical arguments", () => {
            const spy = assertion.spy();
            spy(1, 1);
            expect(spy).to.have.been.called.with.exactly(1, 1);
            expect(spy).to.not.have.been.called.with.exactly(1);
            expect(spy).to.not.have.been.called.with.exactly(1, 2);
            expect(spy).to.not.have.been.called.with.exactly(1, 1, 1);
        });
    });

    describe(".nth(...).with.exactly(arg, ...)", () => {
        it("Should work with the shorthand first for nth(1)", () => {
            const spy = assertion.spy();
            spy(1, 2, 3);
            spy(3, 4, 5);
            expect(spy).to.have.been.first.called.with.exactly(1, 2, 3);
            expect(spy).to.have.been.not.first.called.with.exactly(3, 4, 5);
            expect(spy).to.have.been.not.first.called.with.exactly(3);
            expect(() => {
                expect(spy).to.have.been.first.called.with.exactly(3);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.not.been.first.called.with.exactly(1, 2, 3);
            }).to.throw(AssertionError);
        });
        it("Should work with the shorthand second for nth(2)", () => {
            const spy = assertion.spy();
            spy(1, 2, 3);
            spy(3, 4, 5);
            expect(spy).to.have.been.second.called.with.exactly(3, 4, 5);
            expect(spy).to.have.been.not.second.called.with.exactly(1, 2, 3);
            expect(spy).to.have.been.not.second.called.with.exactly(4);
            expect(() => {
                expect(spy).to.have.been.second.called.with.exactly(4, 5);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.not.been.second.called.with.exactly(3, 4, 5);
            }).to.throw(AssertionError);
        });
        it("Should work with the shorthand third for nth(3)", () => {
            const spy = assertion.spy();
            spy(1, 2, 3);
            spy(3, 4, 5);
            spy(5, 6, 7);
            expect(spy).to.have.been.third.called.with.exactly(5, 6, 7);
            expect(spy).to.have.been.not.third.called.with.exactly(5);
            expect(spy).to.have.been.not.third.called.with.exactly(6, 5, 7);
            expect(() => {
                expect(spy).to.have.been.third.called.with.exactly(7, 6, 5);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.not.been.third.called.with.exactly(5, 6, 7);
            }).to.throw(AssertionError);
        });
        it("Should work with general nth(...) flag", () => {
            const spy = assertion.spy();
            spy(1, 2, 3);
            spy(3, 4, 5);
            spy(5, 6, 7);
            spy(7, 8, 9);
            expect(spy).to.on.nth(4).be.called.with.exactly(7, 8, 9);
            expect(spy).to.not.on.nth(4).be.called.with.exactly(9, 8, 7);
            expect(spy).to.not.on.nth(4).be.called.with.exactly(7, 8);
            expect(() => {
                expect(spy).to.on.nth(4).be.called.with.exactly(7, 6, 5);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.not.on.nth(4).be.called.with.exactly(7, 8, 9);
            }).to.throw(AssertionError);
        });
    });

    describe(".always.with.exactly(arg, ...)", () => {
        it("should pass when called with an argument", () => {
            const spy = assertion.spy();
            spy(3);
            spy(3);
            expect(spy).to.have.always.been.called.with.exactly(3);

            const spy2 = assertion.spy();
            spy2(3);
            spy2(4);
            expect(spy2).to.have.not.always.been.called.with.exactly(3);

            expect(() => {
                expect(spy2).to.have.been.always.called.with.exactly(3);
            }).to.throw(AssertionError, /to have been always called with exactly/);
        });

        it("should pass when called with multiple arguments", () => {
            const spy = assertion.spy();
            spy(3, 4);
            spy(3, 4);
            expect(spy).to.have.always.been.called.with.exactly(3, 4);

            const spy2 = assertion.spy();
            spy2(3);
            spy2(4, 4);
            expect(spy2).to.have.not.always.been.called.with.exactly(4, 4);

            expect(() => {
                expect(spy2).to.have.been.always.called.with.exactly(4, 4);
            }).to.throw(AssertionError, /to have been always called with exactly/);
        });

        it("should pass when called with multiple identical arguments", () => {
            const spy = assertion.spy();
            spy(1, 1);
            spy(1, 1);
            expect(spy).to.have.always.been.called.with.exactly(1, 1);
            expect(spy).to.not.have.always.been.called.with.exactly(1);
            expect(spy).to.not.have.always.been.called.with.exactly(1, 2);
            expect(spy).to.not.have.always.been.called.with.exactly(1, 1, 1);
        });
    });

    describe("spy on", () => {
        let object;

        beforeEach(() => {
            object = [];
        });

        it("should spy specified object method", () => {
            assertion.spy.on(object, "push");
            object.push(1, 2);

            expect(object.push).to.be.a.spy;
            expect(object).to.have.length(2);
        });

        it("should spy multiple object methods", () => {
            assertion.spy.on(object, ["push", "pop"]);

            expect(object.push).to.be.a.spy;
            expect(object.pop).to.be.a.spy;
        });

        it("should allow to create spy for non-existing property", () => {
            assertion.spy.on(object, "nonExistingProperty");

            expect(object.nonExistingProperty).to.be.a.spy;
        });

        it("should throw if non function property is passed", () => {
            expect(() => {
                assertion.spy.on(object, "length");
            }).to.throw(Error);
        });

        it("should throw if method is already a spy", () => {
            object.push = assertion.spy();

            expect(() => {
                assertion.spy.on(object, "push");
            }).to.throw(Error);
        });

        it("should allow to overwrite method implementation", () => {
            assertion.spy.on(object, "push", () => {
                return 5;
            });

            expect(object.push()).to.equal(5);
        });

        it("should overwrite all methods with the same implementation", () => {
            assertion.spy.on(object, ["push", "pop"], () => {
                return 5;
            });

            expect(object.push()).to.equal(5);
            expect(object.pop()).to.equal(5);
        });
    });

    describe("spy interface", () => {

        it("should create a spy object with specified method names", () => {
            const array = assertion.spy.interface("array", ["push", "pop"]);

            expect(array.push).to.be.a.spy;
            expect(array.pop).to.be.a.spy;
        });

        it("should wrap each method in spy", () => {
            const array = [];
            const object = assertion.spy.interface({
                push() {
                    return array.push.apply(array, arguments);
                }
            });

            object.push(1, 2, 3);

            expect(object.push).to.be.a.spy;
            expect(array).to.have.length(3);
        });

        it("should return value from spied method", () => {
            const object = assertion.spy.interface({
                push() {
                    return "push";
                }
            });

            expect(object.push()).to.equal("push");
        });

        it("should create a plain object", () => {
            const object = assertion.spy.interface("Object", ["method"]);

            expect(object).to.be.an("object");
        });
    });

    describe("spy restore", () => {
        let array;

        beforeEach(() => {
            array = [];
            assertion.spy.on(array, "push");
        });

        it("should restore all methods of tracked objects", () => {
            assertion.spy.restore();

            expect(array.push).to.not.be.spy;
        });

        it("should restore all methods on an object", () => {
            assertion.spy.on(array, "pop");
            assertion.spy.restore(array);

            expect(array.push).to.not.be.spy;
            expect(array.pop).to.not.be.spy;
        });

        it("should restore a particular method on an particular object", () => {
            assertion.spy.restore(array, "push");

            expect(array.push).to.not.be.spy;
        });

        it("should not throw if there are not tracked objects", () => {
            assertion.spy.restore();

            expect(assertion.spy.restore).to.not.throw(Error);
        });
    });
});
