/* global adone it describe assert beforeEach */

import $mock from "adone/glosses/shani/mock/mock";
import $expectation, { ExpectationError } from "adone/glosses/shani/mock/mock-expectation";
import $match from "adone/glosses/shani/mock/match";
import $spy from "adone/glosses/shani/mock/spy";
import $stub from "adone/glosses/shani/mock/stub";

describe("mock", function () {
    describe(".create", function () {
        it("returns function with expects method", function () {
            const mock = $mock.create({});

            assert.isFunction(mock.expects);
        });

        it("throws without object", function () {
            assert.throw(function () {
                $mock.create();
            }, TypeError);
        });
    });

    describe(".expects", function () {
        let mock;
        beforeEach(function () {
            mock = $mock.create({ someMethod() {} });
        });

        it("throws without method", function () {
            assert.throw(function () {
                mock.expects();
            }, TypeError);
        });

        it("returns expectation", function () {
            const result = mock.expects("someMethod");

            assert.isFunction(result);
            assert.equal(result.method, "someMethod");
        });

        it("throws if expecting a non-existent method", function () {
            assert.throw(function () {
                mock.expects("someMethod2");
            });
        });
    });

    describe(".expectation", function () {
        let expectation;
        let method;
        beforeEach(function () {
            method = "myMeth";
            expectation = $expectation.create(method);
        });

        it("creates unnamed expectation", function () {
            const anonMock = $expectation.create();
            anonMock.never();

            assert(anonMock.verify());
        });

        it("uses 'anonymous mock expectation' for unnamed expectation", function () {
            const anonMock = $expectation.create();
            anonMock.once();

            try {
                anonMock.verify();
            } catch (e) {
                assert.match(e.message, /anonymous mock expectation/);
            }
        });

        it("call expectation", function () {
            expectation();

            assert.isFunction(expectation.invoke);
            assert(expectation.called);
        });

        it("is invokable", function () {
            expectation();
        });

        describe(".returns", function () {
            it("returns configured return value", function () {
                const object = {};
                expectation.returns(object);

                assert.deepEqual(expectation(), object);
            });
        });

        describe("call", function () {
            it("is called with correct this value", function () {
                const object = { method: expectation };
                object.method();

                assert(expectation.calledOn(object));
            });
        });

        describe(".callCount", function () {
            it("onlys be invokable once by default", function () {
                expectation();

                assert.throw(function () {
                    expectation();
                }, ExpectationError);
            });

            it("throw readable error", function () {
                expectation();

                try {
                    expectation();
                    assert.fail("Expected to throw");
                } catch (e) {
                    assert.equal(e.message, "myMeth already called once");
                }
            });
        });

        describe(".callCountNever", function () {
            it("is not callable", function () {
                expectation.never();

                assert.throw(function () {
                    expectation();
                }, ExpectationError);
            });

            it("returns expectation for chaining", function () {
                assert.deepEqual(expectation.never(), expectation);
            });
        });

        describe(".callCountOnce", function () {
            it("allows one call", function () {
                expectation.once();
                expectation();

                assert.throw(function () {
                    expectation();
                }, ExpectationError);
            });

            it("returns expectation for chaining", function () {
                assert.deepEqual(expectation.once(), expectation);
            });
        });

        describe(".callCountTwice", function () {
            it("allows two calls", function () {
                expectation.twice();
                expectation();
                expectation();

                assert.throw(function () {
                    expectation();
                }, ExpectationError);
            });

            it("returns expectation for chaining", function () {
                assert.deepEqual(expectation.twice(), expectation);
            });
        });

        describe(".callCountThrice", function () {
            it("allows three calls", function () {
                expectation.thrice();
                expectation();
                expectation();
                expectation();

                assert.throw(function () {
                    expectation();
                }, ExpectationError);
            });

            it("returns expectation for chaining", function () {
                assert.deepEqual(expectation.thrice(), expectation);
            });
        });

        describe(".callCountExactly", function () {
            it("allows specified number of calls", function () {
                expectation.exactly(2);
                expectation();
                expectation();

                assert.throw(function () {
                    expectation();
                }, ExpectationError);
            });

            it("returns expectation for chaining", function () {
                assert.deepEqual(expectation.exactly(2), expectation);
            });

            it("throws without argument", function () {
                assert.throw(function () {
                    expectation.exactly();
                }, TypeError);
            });

            it("throws without number", function () {
                assert.throw(function () {
                    expectation.exactly("12");
                }, TypeError);
            });

            it("throws with Symbol", function () {
                if (typeof Symbol === "function") {
                    assert.throw(function () {
                        expectation.exactly(Symbol());
                    }, "'Symbol()' is not a number");
                }
            });
        });

        describe(".atLeast", function () {
            it("throws without argument", function () {
                assert.throw(function () {
                    expectation.atLeast();
                }, TypeError);
            });

            it("throws without number", function () {
                assert.throw(function () {
                    expectation.atLeast({});
                }, TypeError);
            });

            it("throws with Symbol", function () {
                if (typeof Symbol === "function") {
                    assert.throw(function () {
                        expectation.atLeast(Symbol());
                    }, "'Symbol()' is not number");
                }
            });

            it("returns expectation for chaining", function () {
                assert.deepEqual(expectation.atLeast(2), expectation);
            });

            it("allows any number of calls", function () {
                expectation.atLeast(2);
                expectation();
                expectation();

                // Should not to throw:
                expectation();
                expectation();
            });

            it("should not be met with too few calls", function () {
                expectation.atLeast(2);
                expectation();

                assert.isFalse(expectation.met());
            });

            it("is met with exact calls", function () {
                expectation.atLeast(2);
                expectation();
                expectation();

                assert(expectation.met());
            });

            it("is met with excessive calls", function () {
                expectation.atLeast(2);
                expectation();
                expectation();
                expectation();

                assert(expectation.met());
            });

            it("should not throw when exceeding at least expectation", function () {
                const obj = { foobar() {} };
                const mock = $mock(obj);
                mock.expects("foobar").atLeast(1);

                obj.foobar();

                // should not to throw
                obj.foobar();
                mock.verify();
            });

            it("should not throw when exceeding at least expectation and withargs", function () {
                const obj = { foobar() {} };
                const mock = $mock(obj);

                mock.expects("foobar").withArgs("arg1");
                mock.expects("foobar").atLeast(1).withArgs("arg2");

                obj.foobar("arg1");
                obj.foobar("arg2");
                obj.foobar("arg2");

                assert(mock.verify());
            });
        });

        describe(".atMost", function () {
            it("throws without argument", function () {
                assert.throw(function () {
                    expectation.atMost();
                }, TypeError);
            });

            it("throws without number", function () {
                assert.throw(function () {
                    expectation.atMost({});
                }, TypeError);
            });

            it("throws with Symbol", function () {
                if (typeof Symbol === "function") {
                    assert.throw(function () {
                        expectation.atMost(Symbol());
                    }, "'Symbol()' is not number");
                }
            });

            it("returns expectation for chaining", function () {
                assert.deepEqual(expectation.atMost(2), expectation);
            });

            it("allows fewer calls", function () {
                expectation.atMost(2);

                // should not to throw
                expectation();
            });

            it("is met with fewer calls", function () {
                expectation.atMost(2);
                expectation();

                assert(expectation.met());
            });

            it("is met with exact calls", function () {
                expectation.atMost(2);
                expectation();
                expectation();

                assert(expectation.met());
            });

            it("should not be met with excessive calls", function () {
                expectation.atMost(2);
                expectation();
                expectation();

                assert.throw(function () {
                    expectation();
                }, ExpectationError);

                assert.isFalse(expectation.met());
            });
        });

        describe(".atMostAndAtLeast", function () {
            beforeEach(function () {
                expectation.atLeast(2);
                expectation.atMost(3);
            });

            it("should not be met with too few calls", function () {
                expectation();

                assert.isFalse(expectation.met());
            });

            it("is met with minimum calls", function () {
                expectation();
                expectation();

                assert(expectation.met());
            });

            it("is met with maximum calls", function () {
                expectation();
                expectation();
                expectation();

                assert(expectation.met());
            });

            it("throws with excessive calls", function () {
                expectation();
                expectation();
                expectation();

                assert.throw(function () {
                    expectation();
                }, ExpectationError);
            });
        });

        describe(".met", function () {
            it("should not be met when not called enough times", function () {
                assert.isFalse(expectation.met());
            });

            it("is met when called enough times", function () {
                expectation();

                assert(expectation.met());
            });

            it("should not be met when called too many times", function () {
                expectation();

                try {
                    expectation();
                } catch (e) {} // eslint-disable-line no-empty

                assert.isFalse(expectation.met());
            });
        });

        describe(".withArgs", function () {
            it("returns expectation for chaining", function () {
                assert.deepEqual(expectation.withArgs(1), expectation);
            });

            it("accepts call with expected args", function () {
                expectation.withArgs(1, 2, 3);
                expectation(1, 2, 3);

                assert(expectation.met());
            });

            it("throws when called without args", function () {
                expectation.withArgs(1, 2, 3);

                assert.throw(function () {
                    expectation();
                }, ExpectationError);
            });

            it("throws when called with too few args", function () {
                expectation.withArgs(1, 2, 3);

                assert.throw(function () {
                    expectation(1, 2);
                }, ExpectationError);
            });

            it("throws when called with wrong args", function () {
                expectation.withArgs(1, 2, 3);

                assert.throw(function () {
                    expectation(2, 2, 3);
                }, ExpectationError);
            });

            it("allows excessive args", function () {
                expectation.withArgs(1, 2, 3);
                expectation(1, 2, 3, 4);
            });

            it("calls accept with no args", function () {
                expectation.withArgs();
                expectation();

                assert(expectation.met());
            });

            it("allows no args called with excessive args", function () {
                expectation.withArgs();
                expectation(1, 2, 3);
            });

            it("works with matchers", function () {
                expectation.withArgs($match.number, $match.string, $match.func);
                expectation(1, "test", function () {});

                assert(expectation.met());
            });

            it("throws when matchers fail", function () {
                expectation.withArgs($match.number, $match.string, $match.func);
                assert.throw(function () {
                    expectation(1, 2, 3);
                }, ExpectationError);
            });
        });

        describe(".withExactArgs", function () {
            it("returns expectation for chaining", function () {
                assert.deepEqual(expectation.withExactArgs(1), expectation);
            });

            it("accepts call with expected args", function () {
                expectation.withExactArgs(1, 2, 3);
                expectation(1, 2, 3);

                assert(expectation.met());
            });

            it("throws when called without args", function () {
                expectation.withExactArgs(1, 2, 3);

                assert.throw(function () {
                    expectation();
                }, ExpectationError);
            });

            it("throws when called with too few args", function () {
                expectation.withExactArgs(1, 2, 3);

                assert.throw(function () {
                    expectation(1, 2);
                }, ExpectationError);
            });

            it("throws when called with wrong args", function () {
                expectation.withExactArgs(1, 2, 3);

                assert.throw(function () {
                    expectation(2, 2, 3);
                }, ExpectationError);
            });

            it("should not allow excessive args", function () {
                expectation.withExactArgs(1, 2, 3);

                assert.throw(function () {
                    expectation(1, 2, 3, 4);
                }, ExpectationError);
            });

            it("accepts call with no expected args", function () {
                expectation.withExactArgs();
                expectation();

                assert(expectation.met());
            });

            it("does not allow excessive args with no expected args", function () {
                expectation.withExactArgs();

                assert.throw(function () {
                    expectation(1, 2, 3);
                }, ExpectationError);
            });
        });

        describe(".on", function () {
            it("returns expectation for chaining", function () {
                assert.deepEqual(expectation.on({}), expectation);
            });

            it("allows calls on object", function () {
                const testObj = {
                    method,
                    expectation
                };

                testObj.expectation.on(testObj);
                testObj.expectation();

                assert(testObj.expectation.met());
            });

            it("throws if called on wrong object", function () {
                expectation.on({});

                assert.throw(function () {
                    expectation();
                }, ExpectationError);
            });

            it("throws if calls on wrong Symbol", function () {
                if (adone.is.function(Symbol)) {
                    const expectation = $expectation.create("method");
                    expectation.on(Symbol());

                    assert.throw(function () {
                        expectation.call(Symbol());
                    }, "method called with Symbol() as thisValue, expected Symbol()");
                }
            });
        });

        describe(".verify", function () {
            it("pass if met", function () {
                $stub($expectation, "pass");

                expectation();
                expectation.verify();

                assert.equal($expectation.pass.callCount, 1);
                $expectation.pass.restore();
            });

            it("throws if not called enough times", function () {
                assert.throw(function () {
                    expectation.verify();
                }, ExpectationError);
            });

            it("throws readable error", function () {
                try {
                    expectation.verify();
                    assert.fail("Expected to throw");
                } catch (e) {
                    assert.equal(e.message,
                                  "Expected myMeth([...]) once (never called)");
                }
            });
        });
    });

    describe(".verify", function () {
        let method;
        let object;
        let mock;
        beforeEach(function () {
            method = function () {};
            object = { method };
            mock = $mock.create(object);
        });

        it("restores mocks", function () {
            object.method();
            object.method.call({});
            mock.verify();

            assert.deepEqual(object.method, method);
        });

        it("passes verified mocks", function () {
            $stub($expectation, "pass");

            mock.expects("method").once();
            object.method();
            mock.verify();

            assert.equal($expectation.pass.callCount, 1);
            $expectation.pass.restore();
        });

        it("restores if not met", function () {
            mock.expects("method");

            assert.throw(function () {
                mock.verify();
            }, ExpectationError);

            assert.deepEqual(object.method, method);
        });

        it("includes all calls in error message", function () {
            mock.expects("method").thrice();
            mock.expects("method").once().withArgs(42);
            let message;

            try {
                mock.verify();
            } catch (e) {
                message = e.message;
            }

            assert.equal(
                message,
                "Expected method([...]) thrice (never called)\nExpected method(42[, ...]) once (never called)"
            );
        });

        it("includes exact expected arguments in error message", function () {
            mock.expects("method").once().withExactArgs(42);
            let message;

            try {
                mock.verify();
            } catch (e) {
                message = e.message;
            }

            assert.equal(message, "Expected method(42) once (never called)");
        });

        it("includes received call count in error message", function () {
            mock.expects("method").thrice().withExactArgs(42);
            object.method(42);
            let message;

            try {
                mock.verify();
            } catch (e) {
                message = e.message;
            }

            assert.equal(message, "Expected method(42) thrice (called once)");
        });

        it("includes unexpected calls in error message", function () {
            mock.expects("method").thrice().withExactArgs(42);
            let message;

            try {
                object.method();
            } catch (e) {
                message = e.message;
            }

            assert.equal(message,
                          "Unexpected call: method()\n" +
                          "    Expected method(42) thrice (never called)");
        });

        it("includes met expectations in error message", function () {
            mock.expects("method").once().withArgs(1);
            mock.expects("method").thrice().withExactArgs(42);
            object.method(1);
            let message;

            try {
                object.method();
            } catch (e) {
                message = e.message;
            }

            assert.equal(message, "Unexpected call: method()\n" +
                          "    Expectation met: method(1[, ...]) once\n" +
                          "    Expected method(42) thrice (never called)");
        });

        it("includes met expectations in error message from verify", function () {
            mock.expects("method").once().withArgs(1);
            mock.expects("method").thrice().withExactArgs(42);
            object.method(1);
            let message;

            try {
                mock.verify();
            } catch (e) {
                message = e.message;
            }

            assert.equal(message, "Expected method(42) thrice (never called)\n" +
                          "Expectation met: method(1[, ...]) once");
        });

        it("reports min calls in error message", function () {
            mock.expects("method").atLeast(1);
            let message;

            try {
                mock.verify();
            } catch (e) {
                message = e.message;
            }

            assert.equal(message, "Expected method([...]) at least once (never called)");
        });

        it("reports max calls in error message", function () {
            mock.expects("method").atMost(2);
            let message;

            try {
                object.method();
                object.method();
                object.method();
            } catch (e) {
                message = e.message;
            }

            assert.equal(message, "Unexpected call: method()\n" +
                          "    Expectation met: method([...]) at most twice");
        });

        it("reports min calls in met expectation", function () {
            mock.expects("method").atLeast(1);
            mock.expects("method").withArgs(2).once();
            let message;

            try {
                object.method();
                object.method(2);
                object.method(2);
            } catch (e) {
                message = e.message;
            }

            assert.equal(message, "Unexpected call: method(2)\n" +
                          "    Expectation met: method([...]) at least once\n" +
                          "    Expectation met: method(2[, ...]) once");
        });

        it("reports max and min calls in error messages", function () {
            mock.expects("method").atLeast(1).atMost(2);
            let message;

            try {
                mock.verify();
            } catch (e) {
                message = e.message;
            }

            assert.equal(message, "Expected method([...]) at least once and at most twice " +
                          "(never called)");
        });

        it("fails even if the original expectation exception was caught", function () {
            mock.expects("method").once();

            object.method();
            try {
                object.method();
            } catch (e) {
                // Silenced error
            }

            assert.throw(function () {
                mock.verify();
            }, ExpectationError);
        });

        it("does not call pass if no expectations", function () {
            const pass = $stub($expectation, "pass");

            mock.expects("method").never();
            delete mock.expectations;

            mock.verify();

            assert.isNotOk(pass.called, "expectation.pass should not be called");

            pass.restore();
        });
    });

    describe("mock object", function () {
        let method;
        let object;
        let mock;
        beforeEach(function () {
            method = function () {};
            object = { method };
            mock = $mock.create(object);
        });

        it("mocks object method", function () {
            mock.expects("method");

            assert.isFunction(object.method);
            assert.notDeepEqual(object.method, method);
        });

        it("reverts mocked method", function () {
            mock.expects("method");
            object.method.restore();

            assert.deepEqual(object.method, method);
        });

        it("reverts expectation", function () {
            mock.expects("method");
            object.method.restore();

            assert.deepEqual(object.method, method);
        });

        it("reverts mock", function () {
            mock.expects("method");
            mock.restore();

            assert.deepEqual(object.method, method);
        });

        it("verifies mock", function () {
            mock.expects("method");
            object.method();
            assert(mock.verify());
        });

        it("verifies mock with unmet expectations", function () {
            mock.expects("method");

            assert.throw(function () {
                assert(mock.verify());
            }, ExpectationError);
        });
    });

    describe("mock method multiple times", function () {
        let thisValue;
        let object;
        let mock;
        let method;
        beforeEach(function () {
            thisValue = {};
            method = function () {};
            object = { method };
            mock = $mock.create(object);
            mock.expects("method");
            mock.expects("method").on(thisValue);
        });

        it("queues expectations", function () {
            object.method();
        });

        it("starts on next expectation when first is met", function () {
            object.method();

            assert.throw(function () {
                object.method();
            }, ExpectationError);
        });

        it("fails on last expectation", function () {
            object.method();
            object.method.call(thisValue);

            assert.throw(function () {
                object.method();
            }, ExpectationError);
        });

        it("allows mock calls in any order", function () {
            const object = { method() {} };
            const mock = $mock(object);
            mock.expects("method").once().withArgs(42);
            mock.expects("method").twice().withArgs("Yeah");

            object.method("Yeah");
            object.method(42);

            assert.throw(function () {
                object.method(1);
            });

            object.method("Yeah");

            assert.throw(function () {
                object.method(42);
            });
        });
    });

    describe("mock function", function () {
        it("returns mock method", function () {
            const mock = $mock();

            assert.isFunction(mock);
            assert.isFunction(mock.atLeast);
            assert.isFunction(mock.verify);
        });

        it("returns mock object", function () {
            const mock = $mock({});

            assert.isObject(mock);
            assert.isFunction(mock.expects);
            assert.isFunction(mock.verify);
        });
    });

    describe(".yields", function () {
        it("invokes only argument as callback", function () {
            const mock = $mock().yields();
            const spy = $spy();
            mock(spy);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const mock = $mock().yields();

            try {
                mock();
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "stub expected to yield, but no callback was passed.");
            }
        });
    });
});
