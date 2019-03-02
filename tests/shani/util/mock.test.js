describe("shani", "util", "mock", () => {
    const { is, error } = adone;
    const {
        mock,
        expectation,
        match,
        stub,
        spy
    } = adone.shani.util;

    it("creates anonymous mock functions", () => {
        const expectation = mock();
        assert.equal(expectation.method, "Anonymous mock");
    });

    it("creates named anonymous mock functions", () => {
        const expectation = mock("functionName");
        assert.equal(expectation.method, "functionName");
    });

    describe(".create", () => {
        it("returns function with expects method", () => {
            const m = mock.create({});

            assert.isFunction(m.expects);
        });

        it("throws without object", () => {
            assert.throws(() => {
                mock.create();
            }, error.InvalidArgumentException);
        });
    });

    describe(".expects", () => {
        beforeEach(function () {
            this.mock = mock.create({ someMethod() { } });
        });

        it("throws without method", function () {
            const m = this.mock;

            assert.throws(() => {
                m.expects();
            }, error.InvalidArgumentException);
        });

        it("returns expectation", function () {
            const result = this.mock.expects("someMethod");

            assert.isFunction(result);
            assert.equal(result.method, "someMethod");
        });

        it("throws if expecting a non-existent method", function () {
            const mock = this.mock;

            assert.throws(() => {
                mock.expects("someMethod2");
            });
        });
    });

    describe(".expectation", () => {
        beforeEach(function () {
            this.method = "myMeth";
            this.expectation = expectation.create(this.method);
        });

        it("creates unnamed expectation", () => {
            const anonMock = expectation.create();
            anonMock.never();

            assert(anonMock.verify());
        });

        it("uses 'anonymous mock expectation' for unnamed expectation", () => {
            const anonMock = expectation.create();
            anonMock.once();

            assert.throws(
                () => {
                    anonMock.verify();
                },
                "anonymous mock expectation"
            );
        });

        it("call expectation", function () {
            this.expectation();

            assert.isFunction(this.expectation.invoke);
            assert(this.expectation.called);
        });

        it("is invokable", function () {
            const expectation = this.expectation;

            assert.doesNotThrow(() => {
                expectation();
            });
        });

        describe(".returns", () => {
            it("returns configured return value", function () {
                const object = {};
                this.expectation.returns(object);

                assert.equal(this.expectation(), object);
            });
        });

        describe("call", () => {
            it("is called with correct this value", function () {
                const object = { method: this.expectation };
                object.method();

                assert(this.expectation.calledOn(object));
            });
        });

        describe(".callCount", () => {
            it("onlys be invokable once by default", function () {
                const expectation = this.expectation;
                expectation();

                const err = assert.throws(() => {
                    expectation();
                });
                assert.equal(err.name, "ExpectationError");
            });

            it("throw readable error", function () {
                const expectation = this.expectation;
                expectation();

                assert.throws(expectation, "myMeth already called once");
            });
        });

        describe(".callCountNever", () => {
            it("is not callable", function () {
                const expectation = this.expectation;
                expectation.never();

                assert.throws(() => {
                    expectation();
                });
            });

            it("returns expectation for chaining", function () {
                assert.equal(this.expectation.never(), this.expectation);
            });
        });

        describe(".callCountOnce", () => {
            it("allows one call", function () {
                const expectation = this.expectation;
                expectation.once();
                expectation();

                assert.throws(() => {
                    expectation();
                });
            });

            it("returns expectation for chaining", function () {
                assert.equal(this.expectation.once(), this.expectation);
            });
        });

        describe(".callCountTwice", () => {
            it("allows two calls", function () {
                const expectation = this.expectation;
                expectation.twice();
                expectation();
                expectation();

                assert.throws(() => {
                    expectation();
                });
            });

            it("returns expectation for chaining", function () {
                assert.equal(this.expectation.twice(), this.expectation);
            });
        });

        describe(".callCountThrice", () => {
            it("allows three calls", function () {
                const expectation = this.expectation;
                expectation.thrice();
                expectation();
                expectation();
                expectation();

                assert.throws(() => {
                    expectation();
                });
            });

            it("returns expectation for chaining", function () {
                assert.equal(this.expectation.thrice(), this.expectation);
            });
        });

        describe(".callCountExactly", () => {
            it("allows specified number of calls", function () {
                const expectation = this.expectation;
                expectation.exactly(2);
                expectation();
                expectation();

                assert.throws(() => {
                    expectation();
                });
            });

            it("returns expectation for chaining", function () {
                assert.equal(this.expectation.exactly(2), this.expectation);
            });

            it("throws without argument", function () {
                const expectation = this.expectation;

                assert.throws(() => {
                    expectation.exactly();
                }, error.InvalidArgumentException);
            });

            it("throws without number", function () {
                const expectation = this.expectation;

                assert.throws(() => {
                    expectation.exactly("12");
                }, error.InvalidArgumentException);
            });

            it("throws with Symbol", function () {
                if (is.function(Symbol)) {
                    const expectation = this.expectation;

                    assert.throws(() => {
                        expectation.exactly(Symbol());
                    }, "'Symbol()' is not a number");
                }
            });
        });

        describe(".atLeast", () => {
            it("throws without argument", function () {
                const expectation = this.expectation;

                assert.throws(() => {
                    expectation.atLeast();
                }, error.InvalidArgumentException);
            });

            it("throws without number", function () {
                const expectation = this.expectation;

                assert.throws(() => {
                    expectation.atLeast({});
                }, error.InvalidArgumentException);
            });

            it("throws with Symbol", function () {
                if (is.function(Symbol)) {
                    const expectation = this.expectation;

                    assert.throws(() => {
                        expectation.atLeast(Symbol());
                    }, "'Symbol()' is not number");
                }
            });

            it("returns expectation for chaining", function () {
                assert.equal(this.expectation.atLeast(2), this.expectation);
            });

            it("allows any number of calls", function () {
                const expectation = this.expectation;
                expectation.atLeast(2);
                expectation();
                expectation();

                assert.doesNotThrow(() => {
                    expectation();
                    expectation();
                });
            });

            it("should not be met with too few calls", function () {
                this.expectation.atLeast(2);
                this.expectation();

                assert.isFalse(this.expectation.met());
            });

            it("is met with exact calls", function () {
                this.expectation.atLeast(2);
                this.expectation();
                this.expectation();

                assert(this.expectation.met());
            });

            it("is met with excessive calls", function () {
                this.expectation.atLeast(2);
                this.expectation();
                this.expectation();
                this.expectation();

                assert(this.expectation.met());
            });

            it("should not throw when exceeding at least expectation", () => {
                const obj = { foobar() { } };
                const m = mock(obj);
                m.expects("foobar").atLeast(1);

                obj.foobar();

                assert.doesNotThrow(() => {
                    obj.foobar();
                    m.verify();
                });
            });

            it("should not throw when exceeding at least expectation and withargs", () => {
                const obj = { foobar() { } };
                const m = mock(obj);

                m.expects("foobar").withArgs("arg1");
                m.expects("foobar").atLeast(1).withArgs("arg2");

                obj.foobar("arg1");
                obj.foobar("arg2");
                obj.foobar("arg2");

                assert(m.verify());
            });
        });

        describe(".atMost", () => {
            it("throws without argument", function () {
                const expectation = this.expectation;

                assert.throws(() => {
                    expectation.atMost();
                }, error.InvalidArgumentException);
            });

            it("throws without number", function () {
                const expectation = this.expectation;

                assert.throws(() => {
                    expectation.atMost({});
                }, error.InvalidArgumentException);
            });

            it("throws with Symbol", function () {
                if (is.function(Symbol)) {
                    const expectation = this.expectation;

                    assert.throws(() => {
                        expectation.atMost(Symbol());
                    }, "'Symbol()' is not number");
                }
            });

            it("returns expectation for chaining", function () {
                assert.equal(this.expectation.atMost(2), this.expectation);
            });

            it("allows fewer calls", function () {
                const expectation = this.expectation;
                expectation.atMost(2);

                assert.doesNotThrow(() => {
                    expectation();
                });
            });

            it("is met with fewer calls", function () {
                this.expectation.atMost(2);
                this.expectation();

                assert(this.expectation.met());
            });

            it("is met with exact calls", function () {
                this.expectation.atMost(2);
                this.expectation();
                this.expectation();

                assert(this.expectation.met());
            });

            it("should not be met with excessive calls", function () {
                const expectation = this.expectation;
                this.expectation.atMost(2);
                this.expectation();
                this.expectation();

                assert.throws(() => {
                    expectation();
                });

                assert.isFalse(this.expectation.met());
            });
        });

        describe(".atMostAndAtLeast", () => {
            beforeEach(function () {
                this.expectation.atLeast(2);
                this.expectation.atMost(3);
            });

            it("should not be met with too few calls", function () {
                this.expectation();

                assert.isFalse(this.expectation.met());
            });

            it("is met with minimum calls", function () {
                this.expectation();
                this.expectation();

                assert(this.expectation.met());
            });

            it("is met with maximum calls", function () {
                this.expectation();
                this.expectation();
                this.expectation();

                assert(this.expectation.met());
            });

            it("throws with excessive calls", function () {
                const expectation = this.expectation;
                expectation();
                expectation();
                expectation();

                assert.throws(() => {
                    expectation();
                });
            });
        });

        describe(".met", () => {
            it("should not be met when not called enough times", function () {
                assert.isFalse(this.expectation.met());
            });

            it("is met when called enough times", function () {
                this.expectation();

                assert(this.expectation.met());
            });

            it("should not be met when called too many times", function () {
                this.expectation();

                assert.throws(this.expectation);

                assert.isFalse(this.expectation.met());
            });
        });

        describe(".withArgs", () => {
            const expectedException = function (name) {
                return {
                    test(actual) {
                        return actual.name === name;
                    },
                    toString() {
                        return name;
                    }
                };
            };

            it("returns expectation for chaining", function () {
                assert.equal(this.expectation.withArgs(1), this.expectation);
            });

            it("accepts call with expected args", function () {
                this.expectation.withArgs(1, 2, 3);
                this.expectation(1, 2, 3);

                assert(this.expectation.met());
            });

            it("throws when called without args", function () {
                const expectation = this.expectation;
                expectation.withArgs(1, 2, 3);

                assert.throws(() => {
                    expectation();
                });
            });

            it("throws when called with too few args", function () {
                const expectation = this.expectation;
                expectation.withArgs(1, 2, 3);

                assert.throws(() => {
                    expectation(1, 2);
                });
            });

            it("throws when called with wrong args", function () {
                const expectation = this.expectation;
                expectation.withArgs(1, 2, 3);

                assert.throws(() => {
                    expectation(2, 2, 3);
                }, "myMeth received wrong arguments [ 2, 2, 3 ], expected [ 1, 2, 3 ]");
            });

            it("allows excessive args", function () {
                const expectation = this.expectation;
                expectation.withArgs(1, 2, 3);

                assert.doesNotThrow(() => {
                    expectation(1, 2, 3, 4);
                });
            });

            it("calls accept with no args", function () {
                this.expectation.withArgs();
                this.expectation();

                assert(this.expectation.met());
            });

            it("allows no args called with excessive args", function () {
                const expectation = this.expectation;
                expectation.withArgs();

                assert.doesNotThrow(() => {
                    expectation(1, 2, 3);
                });
            });

            it("works with matchers", function () {
                this.expectation.withArgs(match.number, match.string, match.func);
                this.expectation(1, "test", () => { });

                assert(this.expectation.met());
            });

            it("throws when matchers fail", function () {
                const expectation = this.expectation;

                this.expectation.withArgs(match.number, match.string, match.func);
                assert.throws(() => {
                    expectation(1, 2, 3);
                });
            });
        });

        describe(".withExactArgs", () => {
            it("returns expectation for chaining", function () {
                assert.equal(this.expectation.withExactArgs(1), this.expectation);
            });

            it("accepts call with expected args", function () {
                this.expectation.withExactArgs(1, 2, 3);
                this.expectation(1, 2, 3);

                assert(this.expectation.met());
            });

            it("throws when called without args", function () {
                const expectation = this.expectation;
                expectation.withExactArgs(1, 2, 3);

                assert.throws(() => {
                    expectation();
                });
            });

            it("throws when called with too few args", function () {
                const expectation = this.expectation;
                expectation.withExactArgs(1, 2, 3);

                assert.throws(() => {
                    expectation(1, 2);
                });
            });

            it("throws when called with wrong args", function () {
                const expectation = this.expectation;
                expectation.withExactArgs(1, 2, 3);

                assert.throws(() => {
                    expectation(2, 2, 3);
                });
            });

            it("should not allow excessive args", function () {
                const expectation = this.expectation;
                expectation.withExactArgs(1, 2, 3);

                assert.throws(() => {
                    expectation(1, 2, 3, 4);
                });
            });

            it("accepts call with no expected args", function () {
                this.expectation.withExactArgs();
                this.expectation();

                assert(this.expectation.met());
            });

            it("does not allow excessive args with no expected args", function () {
                const expectation = this.expectation;
                expectation.withExactArgs();

                assert.throws(() => {
                    expectation(1, 2, 3);
                });
            });
        });

        describe(".on", () => {
            it("returns expectation for chaining", function () {
                assert.equal(this.expectation.on({}), this.expectation);
            });

            it("allows calls on object", function () {
                this.expectation.on(this);
                this.expectation();

                assert(this.expectation.met());
            });

            it("throws if called on wrong object", function () {
                const expectation = this.expectation;
                expectation.on({});

                assert.throws(() => {
                    expectation();
                });
            });

            it("throws if calls on wrong Symbol", () => {
                if (is.function(Symbol)) {
                    const e = expectation.create("method");
                    e.on(Symbol());

                    assert.throws(() => {
                        e.call(Symbol());
                    }, "method called with Symbol() as thisValue, expected Symbol()");
                }
            });
        });

        describe(".verify", () => {
            it("pass if met", function () {
                stub(expectation, "pass");
                const e = this.expectation;

                e();
                e.verify();

                assert.equal(expectation.pass.callCount, 1);
                expectation.pass.restore();
            });

            it("throws if not called enough times", function () {
                const expectation = this.expectation;

                assert.throws(() => {
                    expectation.verify();
                });
            });

            it("throws readable error", function () {
                const expectation = this.expectation;

                assert.throws(
                    () => {
                        expectation.verify();
                    },
                    "Expected myMeth([...]) once (never called)"
                );
            });
        });
    });

    describe(".verify", () => {
        beforeEach(function () {
            this.method = function () { };
            this.object = { method: this.method };
            this.mock = mock.create(this.object);
        });

        it("restores mocks", function () {
            this.object.method();
            this.object.method.call(this.thisValue);
            this.mock.verify();

            assert.equal(this.object.method, this.method);
        });

        it("passes verified mocks", function () {
            stub(expectation, "pass");

            this.mock.expects("method").once();
            this.object.method();
            this.mock.verify();

            assert.equal(expectation.pass.callCount, 1);
            expectation.pass.restore();
        });

        it("restores if not met", function () {
            const mock = this.mock;
            mock.expects("method");

            assert.throws(() => {
                mock.verify();
            });

            assert.equal(this.object.method, this.method);
        });

        it("includes all calls in error message", function () {
            const mock = this.mock;
            mock.expects("method").thrice();
            mock.expects("method").once().withArgs(42);

            assert.throws(
                () => {
                    mock.verify();
                },
                "Expected method([...]) thrice (never called)\nExpected method(42[, ...]) once (never called)"
            );
        });

        it("includes exact expected arguments in error message", function () {
            const mock = this.mock;
            mock.expects("method").once().withExactArgs(42);

            assert.throws(
                () => {
                    mock.verify();
                },
                "Expected method(42) once (never called)"
            );
        });

        it("includes received call count in error message", function () {
            const mock = this.mock;
            mock.expects("method").thrice().withExactArgs(42);
            this.object.method(42);

            assert.throws(
                () => {
                    mock.verify();
                },
                "Expected method(42) thrice (called once)"
            );
        });

        it("includes unexpected calls in error message", function () {
            const mock = this.mock;
            const object = this.object;

            mock.expects("method").thrice().withExactArgs(42);

            assert.throws(
                () => {
                    object.method();
                },
                "Unexpected call: method()\n    Expected method(42) thrice (never called)"
            );
        });

        it("includes met expectations in error message", function () {
            const mock = this.mock;
            const object = this.object;

            mock.expects("method").once().withArgs(1);
            mock.expects("method").thrice().withExactArgs(42);
            object.method(1);

            assert.throws(
                () => {
                    object.method();
                },
                "Unexpected call: method()\n    Expectation met: method(1[, ...]) once\n    Expected method(42) thrice (never called)"
            );
        });

        it("includes met expectations in error message from verify", function () {
            const mock = this.mock;

            mock.expects("method").once().withArgs(1);
            mock.expects("method").thrice().withExactArgs(42);
            this.object.method(1);

            assert.throws(
                () => {
                    mock.verify();
                },
                "Expected method(42) thrice (never called)\nExpectation met: method(1[, ...]) once"
            );
        });

        it("reports min calls in error message", function () {
            const mock = this.mock;
            mock.expects("method").atLeast(1);

            assert.throws(
                () => {
                    mock.verify();
                },
                "Expected method([...]) at least once (never called)"
            );
        });

        it("reports max calls in error message", function () {
            const mock = this.mock;
            const object = this.object;

            mock.expects("method").atMost(2);

            assert.throws(
                () => {
                    object.method();
                    object.method();
                    object.method();
                },
                "Unexpected call: method()\n    Expectation met: method([...]) at most twice"
            );
        });

        it("reports min calls in met expectation", function () {
            const mock = this.mock;
            const object = this.object;

            mock.expects("method").atLeast(1);
            mock.expects("method").withArgs(2).once();

            assert.throws(
                () => {
                    object.method();
                    object.method(2);
                    object.method(2);
                },
                "Unexpected call: method(2)\n    Expectation met: method([...]) at least once\n    Expectation met: method(2[, ...]) once"
            );
        });

        it("reports max and min calls in error messages", function () {
            const mock = this.mock;
            mock.expects("method").atLeast(1).atMost(2);

            assert.throws(
                () => {
                    mock.verify();
                },
                "Expected method([...]) at least once and at most twice (never called)"
            );
        });

        it("fails even if the original expectation error was caught", function () {
            const mock = this.mock;
            const object = this.object;

            mock.expects("method").once();

            object.method();

            assert.throws(() => {
                object.method();
            });

            assert.throws(() => {
                mock.verify();
            });
        });

        it("does not call pass if no expectations", function () {
            const pass = stub(expectation, "pass");

            const mock = this.mock;
            mock.expects("method").never();
            delete mock.expectations;

            mock.verify();

            assert(!pass.called, "expectation.pass should not be called");

            pass.restore();
        });
    });

    describe("mock object", () => {
        beforeEach(function () {
            this.method = function () { };
            this.object = { method: this.method };
            this.mock = mock.create(this.object);
        });

        it("mocks object method", function () {
            this.mock.expects("method");

            assert.isFunction(this.object.method);
            assert.notEqual(this.object.method, this.method);
        });

        it("reverts mocked method", function () {
            this.mock.expects("method");
            this.object.method.restore();

            assert.equal(this.object.method, this.method);
        });

        it("reverts expectation", function () {
            this.mock.expects("method");
            this.object.method.restore();

            assert.equal(this.object.method, this.method);
        });

        it("reverts mock", function () {
            this.mock.expects("method");
            this.mock.restore();

            assert.equal(this.object.method, this.method);
        });

        it("verifies mock", function () {
            this.mock.expects("method");
            this.object.method();
            const mock = this.mock;

            assert.doesNotThrow(() => {
                assert(mock.verify());
            });
        });

        it("verifies mock with unmet expectations", function () {
            this.mock.expects("method");
            const mock = this.mock;

            assert.throws(() => {
                assert(mock.verify());
            });
        });
    });

    describe("mock method multiple times", () => {
        beforeEach(function () {
            this.thisValue = {};
            this.method = function () { };
            this.object = { method: this.method };
            this.mock = mock.create(this.object);
            this.mock.expects("method");
            this.mock.expects("method").on(this.thisValue);
        });

        it("queues expectations", function () {
            const object = this.object;

            assert.doesNotThrow(() => {
                object.method();
            });
        });

        it("starts on next expectation when first is met", function () {
            const object = this.object;
            object.method();

            assert.throws(() => {
                object.method();
            });
        });

        it("fails on last expectation", function () {
            const object = this.object;
            object.method();
            object.method.call(this.thisValue);

            assert.throws(() => {
                object.method();
            });
        });

        it("allows mock calls in any order", () => {
            const object = { method() { } };
            const m = mock(object);
            m.expects("method").once().withArgs(42);
            m.expects("method").twice().withArgs("Yeah");

            assert.doesNotThrow(() => {
                object.method("Yeah");
            });

            assert.doesNotThrow(() => {
                object.method(42);
            });

            assert.throws(() => {
                object.method(1);
            });

            assert.doesNotThrow(() => {
                object.method("Yeah");
            });

            assert.throws(() => {
                object.method(42);
            });
        });
    });

    describe("mock function", () => {
        it("returns mock method", () => {
            const m = mock();

            assert.isFunction(m);
            assert.isFunction(m.atLeast);
            assert.isFunction(m.verify);
        });

        it("returns mock object", () => {
            const m = mock({});

            assert.isObject(m);
            assert.isFunction(m.expects);
            assert.isFunction(m.verify);
        });
    });

    describe(".yields", () => {
        it("invokes only argument as callback", () => {
            const m = mock().yields();
            const s = spy();
            m(s);

            assert(s.calledOnce);
            assert.equal(s.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", () => {
            const m = mock().yields();

            assert.throws(m, "stub expected to yield, but no callback was passed.");
        });
    });
});
