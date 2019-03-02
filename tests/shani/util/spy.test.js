describe("shani", "util", "spy", () => {
    const { spy: createSpy, match } = adone.shani.util;

    const spyCalledTests = (method) => () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("returns false if spy was not called", function () {
            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns true if spy was called with args", function () {
            this.spy(1, 2, 3);

            assert(this.spy[method](1, 2, 3));
        });

        it("returns true if called with args at least once", function () {
            this.spy(1, 3, 3);
            this.spy(1, 2, 3);
            this.spy(3, 2, 3);

            assert(this.spy[method](1, 2, 3));
        });

        it("returns false if not called with args", function () {
            this.spy(1, 3, 3);
            this.spy(2);
            this.spy();

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns false if not called with undefined", function () {
            this.spy();

            assert.isFalse(this.spy[method](undefined));
        });

        it("returns true for partial match", function () {
            this.spy(1, 3, 3);
            this.spy(2);
            this.spy();

            assert(this.spy[method](1, 3));
        });

        it("matchs all arguments individually, not as array", function () {
            this.spy([1, 2, 3]);

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("uses matcher", function () {
            this.spy("abc");

            assert(this.spy[method](match.typeOf("string")));
        });

        it("uses matcher in object", function () {
            this.spy({ some: "abc" });

            assert(this.spy[method]({ some: match.typeOf("string") }));
        });

        // Using the `calledWithMatch` should work with objects that don't have
        // a hasOwnProperty function.
        describe("when called with an Object without a prototype", () => {
            it("must not throw", function () {
                const spy = this.spy;
                const objectWithoutPrototype = Object.create(null);

                objectWithoutPrototype.something = 2;

                spy[method]({
                    foo: 1,
                    objectWithoutPrototype
                });

                assert.doesNotThrow(() => {
                    spy.calledWithMatch({
                        objectWithoutPrototype
                    });
                });
            });
        });
    };

    const spyAlwaysCalledTests = (method) => () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("returns false if spy was not called", function () {
            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns true if spy was called with args", function () {
            this.spy(1, 2, 3);

            assert(this.spy[method](1, 2, 3));
        });

        it("returns false if called with args only once", function () {
            this.spy(1, 3, 3);
            this.spy(1, 2, 3);
            this.spy(3, 2, 3);

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns false if not called with args", function () {
            this.spy(1, 3, 3);
            this.spy(2);
            this.spy();

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns true for partial match", function () {
            this.spy(1, 3, 3);

            assert(this.spy[method](1, 3));
        });

        it("returns true for partial match on many calls", function () {
            this.spy(1, 3, 3);
            this.spy(1, 3);
            this.spy(1, 3, 4, 5);
            this.spy(1, 3, 1);

            assert(this.spy[method](1, 3));
        });

        it("matchs all arguments individually, not as array", function () {
            this.spy([1, 2, 3]);

            assert.isFalse(this.spy[method](1, 2, 3));
        });
    };

    const spyNeverCalledTests = (method) => () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("returns true if spy was not called", function () {
            assert(this.spy[method](1, 2, 3));
        });

        it("returns false if spy was called with args", function () {
            this.spy(1, 2, 3);

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns false if called with args at least once", function () {
            this.spy(1, 3, 3);
            this.spy(1, 2, 3);
            this.spy(3, 2, 3);

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns true if not called with args", function () {
            this.spy(1, 3, 3);
            this.spy(2);
            this.spy();

            assert(this.spy[method](1, 2, 3));
        });

        it("returns false for partial match", function () {
            this.spy(1, 3, 3);
            this.spy(2);
            this.spy();

            assert.isFalse(this.spy[method](1, 3));
        });

        it("matchs all arguments individually, not as array", function () {
            this.spy([1, 2, 3]);

            assert(this.spy[method](1, 2, 3));
        });
    };

    it("does not throw if called without function", () => {
        assert.doesNotThrow(() => {
            createSpy.create();
        });
    });

    it("does not throw when calling anonymous spy", () => {
        const spy = createSpy.create();

        assert.doesNotThrow(spy);

        assert(spy.called);
    });

    it("returns spy function", () => {
        const func = function () { };
        const spy = createSpy.create(func);

        assert.isFunction(spy);
        assert.notEqual(func, spy);
    });

    it("mirrors custom properties on function", () => {
        const func = function () { };
        func.myProp = 42;
        const spy = createSpy.create(func);

        assert.equal(spy.myProp, func.myProp);
    });

    it("does not define create method", () => {
        const spy = createSpy.create();

        assert.isUndefined(spy.create);
    });

    it("does not overwrite original create property", () => {
        const func = function () { };
        const object = func.create = {};
        const spy = createSpy.create(func);

        assert.equal(spy.create, object);
    });

    it("sets up logging arrays", () => {
        const spy = createSpy.create();

        assert.array(spy.args);
        assert.array(spy.returnValues);
        assert.array(spy.thisValues);
        assert.array(spy.exceptions);
    });

    it("works with getters", () => {
        const object = {
            get property() {
                return 42;
            }
        };
        const spy = createSpy(object, "property", ["get"]);

        assert.equal(object.property, 42);
        assert(spy.get.calledOnce);
    });

    it("works with setters", () => {
        const object = {
            get test() {
                return this.property;
            },
            set test(value) {
                this.property = value * 2;
            }
        };
        const spy = createSpy(object, "test", ["set"]);

        object.test = 42;
        assert(spy.set.calledOnce);
        assert(spy.set.calledWith(42));

        assert.equal(object.test, 84);
        assert.equal(object.property, 84);
    });

    it("works with setters and getters combined", () => {
        const object = {
            get test() {
                return this.property;
            },
            set test(value) {
                this.property = value * 2;
            }
        };
        const spy = createSpy(object, "test", ["get", "set"]);

        object.test = 42;
        assert(spy.set.calledOnce);

        assert.equal(object.test, 84);
        assert(spy.get.calledOnce);
    });

    describe("global.Error", () => {
        beforeEach(function () {
            this.originalError = global.Error;
        });

        afterEach(function () {
            global.Error = this.originalError;
        });

        it("creates a spy for Error", () => {
            assert.doesNotThrow(() => {
                createSpy(global, "Error");
            });
        });
    });

    it("should work with combination of withArgs arguments and order of calling withArgs", () => {
        const assertSpy = (spy) => {
            // assert callCount
            assert.equal(spy.callCount, 4);
            assert.equal(spy.withArgs(1).callCount, 3);
            assert.equal(spy.withArgs(1, 1).callCount, 1);
            assert.equal(spy.withArgs(1, 2).callCount, 1);

            // assert call
            assert.isUndefined(spy.getCall(0).args[0]);
            assert.equal(spy.getCall(1).args[0], 1);
            assert.isUndefined(spy.getCall(1).args[1]);
            assert.equal(spy.getCall(2).args[0], 1);
            assert.equal(spy.getCall(2).args[1], 1);
            assert.isUndefined(spy.getCall(2).args[2]);
            assert.equal(spy.getCall(3).args[0], 1);
            assert.equal(spy.getCall(3).args[1], 2);
            assert.isUndefined(spy.getCall(3).args[2]);
            ["args", "callCount", "callId"].forEach((propName) => {
                assert.equal(spy.withArgs(1).getCall(0)[propName], spy.getCall(1)[propName]);
                assert.equal(spy.withArgs(1).getCall(1)[propName], spy.getCall(2)[propName]);
                assert.equal(spy.withArgs(1).getCall(2)[propName], spy.getCall(3)[propName]);
                assert.isNull(spy.withArgs(1).getCall(3));
                assert.equal(spy.withArgs(1, 1).getCall(0)[propName], spy.getCall(2)[propName]);
                assert.isNull(spy.withArgs(1, 1).getCall(1));
                assert.equal(spy.withArgs(1, 2).getCall(0)[propName], spy.getCall(3)[propName]);
                assert.isNull(spy.withArgs(1, 2).getCall(1));
            });

            // assert firstCall, secondCall, thirdCall, and lastCall
            assert.equal(spy.firstCall.callId, spy.getCall(0).callId);
            assert.equal(spy.secondCall.callId, spy.getCall(1).callId);
            assert.equal(spy.thirdCall.callId, spy.getCall(2).callId);
            assert.equal(spy.lastCall.callId, spy.getCall(3).callId);
            assert.equal(spy.withArgs(1).firstCall.callId, spy.withArgs(1).getCall(0).callId);
            assert.equal(spy.withArgs(1).secondCall.callId, spy.withArgs(1).getCall(1).callId);
            assert.equal(spy.withArgs(1).thirdCall.callId, spy.withArgs(1).getCall(2).callId);
            assert.equal(spy.withArgs(1).lastCall.callId, spy.withArgs(1).getCall(2).callId);
            assert.equal(spy.withArgs(1, 1).firstCall.callId, spy.withArgs(1, 1).getCall(0).callId);
            assert.isNull(spy.withArgs(1, 1).secondCall);
            assert.isNull(spy.withArgs(1, 1).thirdCall);
            assert.equal(spy.withArgs(1, 1).lastCall.callId, spy.withArgs(1, 1).getCall(0).callId);
            assert.equal(spy.withArgs(1, 2).firstCall.callId, spy.withArgs(1, 2).getCall(0).callId);
            assert.isNull(spy.withArgs(1, 2).secondCall);
            assert.isNull(spy.withArgs(1, 2).thirdCall);
            assert.equal(spy.withArgs(1, 2).lastCall.callId, spy.withArgs(1, 2).getCall(0).callId);
        };

        const object = {
            f1() { },
            f2() { }
        };

        // f1: the order of withArgs(1), withArgs(1, 1)
        const spy1 = createSpy(object, "f1");
        assert.equal(spy1.callCount, 0);
        assert.equal(spy1.withArgs(1).callCount, 0);
        assert.equal(spy1.withArgs(1, 1).callCount, 0);
        assert.isNull(spy1.getCall(0));
        assert.isNull(spy1.getCall(1));
        assert.isNull(spy1.getCall(2));
        assert.isNull(spy1.getCall(3));

        object.f1();
        object.f1(1);
        object.f1(1, 1);
        object.f1(1, 2);
        assertSpy(spy1);

        // f2: the order of withArgs(1, 1), withArgs(1)
        const spy2 = createSpy(object, "f2");
        assert.equal(spy2.callCount, 0);
        assert.equal(spy2.withArgs(1, 1).callCount, 0);
        assert.equal(spy2.withArgs(1).callCount, 0);
        assert.isNull(spy2.getCall(0));
        assert.isNull(spy2.getCall(1));
        assert.isNull(spy2.getCall(2));
        assert.isNull(spy2.getCall(3));

        object.f2();
        object.f2(1);
        object.f2(1, 1);
        object.f2(1, 2);
        assertSpy(spy2);
    });

    describe(".named", () => {
        it("sets displayName", () => {
            const spy = createSpy();
            const retval = spy.named("beep");
            assert.equal(spy.displayName, "beep");
            assert.equal(spy, retval);
        });
    });

    describe("call", () => {
        it("calls underlying function", () => {
            let called = false;

            const spy = createSpy.create(() => {
                called = true;
            });

            spy();

            assert(called);
        });

        it("passes 'new' to underlying function", () => {
            const TestClass = function () {};

            const SpyClass = createSpy.create(TestClass);

            const instance = new SpyClass();

            assert(instance instanceof TestClass);
        });

        it("passs arguments to function", () => {
            let actualArgs;

            const func = function (a, b, c, d) {
                actualArgs = [a, b, c, d];
            };

            const args = [1, {}, [], ""];
            const spy = createSpy.create(func);
            spy(args[0], args[1], args[2], args[3]);

            assert.deepEqual(actualArgs, args);
        });

        it("maintains this binding", () => {
            let actualThis;

            const func = function () {
                actualThis = this;
            };

            const object = {};
            const spy = createSpy.create(func);
            spy.call(object);

            assert.equal(actualThis, object);
        });

        it("returns function's return value", () => {
            const object = {};

            const func = function () {
                return object;
            };

            const spy = createSpy.create(func);
            const actualReturn = spy();

            assert.equal(actualReturn, object);
        });

        it("throws if function throws", () => {
            const err = new Error();
            const spy = createSpy.create(() => {
                throw err;
            });

            assert.throws(spy, err);
        });

        it("retains function length 0", () => {
            const spy = createSpy.create(() => { });

            assert.equal(spy.length, 0);
        });

        it("retains function length 1", () => {
            const spy = createSpy.create((a) => { }); // eslint-disable-line no-unused-vars

            assert.equal(spy.length, 1);
        });

        it("retains function length 2", () => {
            const spy = createSpy.create((a, b) => { }); // eslint-disable-line no-unused-vars

            assert.equal(spy.length, 2);
        });

        it("retains function length 3", () => {
            const spy = createSpy.create((a, b, c) => { }); // eslint-disable-line no-unused-vars

            assert.equal(spy.length, 3);
        });

        it("retains function length 4", () => {
            const spy = createSpy.create((a, b, c, d) => { }); // eslint-disable-line no-unused-vars

            assert.equal(spy.length, 4);
        });

        it("retains function length 12", () => {
            const func12Args = function (a, b, c, d, e, f, g, h, i, j, k, l) { }; // eslint-disable-line no-unused-vars
            const spy = createSpy.create(func12Args);

            assert.equal(spy.length, 12);
        });
    });

    describe(".called", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("is false prior to calling the spy", function () {
            assert.isFalse(this.spy.called);
        });

        it("is true after calling the spy once", function () {
            this.spy();

            assert(this.spy.called);
        });

        it("is true after calling the spy twice", function () {
            this.spy();
            this.spy();

            assert(this.spy.called);
        });
    });

    describe(".notCalled", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("is true prior to calling the spy", function () {
            assert.isTrue(this.spy.notCalled);
        });

        it("is false after calling the spy once", function () {
            this.spy();

            assert.isFalse(this.spy.notCalled);
        });
    });

    describe(".calledOnce", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("is false prior to calling the spy", function () {
            assert.isFalse(this.spy.calledOnce);
        });

        it("is true after calling the spy once", function () {
            this.spy();

            assert(this.spy.calledOnce);
        });

        it("is false after calling the spy twice", function () {
            this.spy();
            this.spy();

            assert.isFalse(this.spy.calledOnce);
        });
    });

    describe(".calledTwice", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("is false prior to calling the spy", function () {
            assert.isFalse(this.spy.calledTwice);
        });

        it("is false after calling the spy once", function () {
            this.spy();

            assert.isFalse(this.spy.calledTwice);
        });

        it("is true after calling the spy twice", function () {
            this.spy();
            this.spy();

            assert(this.spy.calledTwice);
        });

        it("is false after calling the spy thrice", function () {
            this.spy();
            this.spy();
            this.spy();

            assert.isFalse(this.spy.calledTwice);
        });
    });

    describe(".calledThrice", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("is false prior to calling the spy", function () {
            assert.isFalse(this.spy.calledThrice);
        });

        it("is false after calling the spy twice", function () {
            this.spy();
            this.spy();

            assert.isFalse(this.spy.calledThrice);
        });

        it("is true after calling the spy thrice", function () {
            this.spy();
            this.spy();
            this.spy();

            assert(this.spy.calledThrice);
        });

        it("is false after calling the spy four times", function () {
            this.spy();
            this.spy();
            this.spy();
            this.spy();

            assert.isFalse(this.spy.calledThrice);
        });
    });

    describe(".callCount", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("reports 0 calls", function () {
            assert.equal(this.spy.callCount, 0);
        });

        it("records one call", function () {
            this.spy();

            assert.equal(this.spy.callCount, 1);
        });

        it("records two calls", function () {
            this.spy();
            this.spy();

            assert.equal(this.spy.callCount, 2);
        });

        it("increases call count for each call", function () {
            this.spy();
            this.spy();
            assert.equal(this.spy.callCount, 2);

            this.spy();
            assert.equal(this.spy.callCount, 3);
        });
    });

    describe(".calledOn", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("is false if spy wasn't called", function () {
            assert.isFalse(this.spy.calledOn({}));
        });

        it("is true if called with thisValue", function () {
            const object = {};
            this.spy.call(object);

            assert(this.spy.calledOn(object));
        });

        it("returns false if not called on object", function () {
            const object = {};
            this.spy.call(object);
            this.spy();

            assert.isFalse(this.spy.calledOn({}));
        });

        it("is true if called with matcher that returns true", function () {
            const matcher = match(() => {
                return true;
            });
            this.spy();

            assert(this.spy.calledOn(matcher));
        });

        it("is false if called with matcher that returns false", function () {
            const matcher = match(() => {
                return false;
            });
            this.spy();

            assert.isFalse(this.spy.calledOn(matcher));
        });

        it("invokes matcher.test with given object", function () {
            const expected = {};
            let actual;
            this.spy.call(expected);

            this.spy.calledOn(match((value) => {
                actual = value;
            }));

            assert.equal(actual, expected);
        });
    });

    describe(".alwaysCalledOn", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("is false prior to calling the spy", function () {
            assert.isFalse(this.spy.alwaysCalledOn({}));
        });

        it("is true if called with thisValue once", function () {
            const object = {};
            this.spy.call(object);

            assert(this.spy.alwaysCalledOn(object));
        });

        it("is true if called with thisValue many times", function () {
            const object = {};
            this.spy.call(object);
            this.spy.call(object);
            this.spy.call(object);
            this.spy.call(object);

            assert(this.spy.alwaysCalledOn(object));
        });

        it("is false if called with another object atleast once", function () {
            const object = {};
            this.spy.call(object);
            this.spy.call(object);
            this.spy.call(object);
            this.spy();
            this.spy.call(object);

            assert.isFalse(this.spy.alwaysCalledOn(object));
        });

        it("is false if never called with expected object", function () {
            const object = {};
            this.spy();
            this.spy();
            this.spy();

            assert.isFalse(this.spy.alwaysCalledOn(object));
        });
    });

    describe(".calledWithNew", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("is false if spy wasn't called", function () {
            assert.isFalse(this.spy.calledWithNew());
        });

        it("is true if called with new", function () {
            const result = new this.spy(); // eslint-disable-line no-unused-vars, new-cap

            assert(this.spy.calledWithNew());
        });

        it("is true if called with new", () => {
            const spy = createSpy();
            new spy(); // eslint-disable-line no-unused-vars, new-cap

            assert(spy.calledWithNew());
        });

        it("is true if called with new on custom constructor", () => {
            function MyThing() { }
            MyThing.prototype = {};
            const ns = { MyThing };
            createSpy(ns, "MyThing");

            const result = new ns.MyThing(); // eslint-disable-line no-unused-vars
            assert(ns.MyThing.calledWithNew());
        });

        it("is false if called as function", function () {
            this.spy();

            assert.isFalse(this.spy.calledWithNew());
        });

        it("is true newed constructor returns object", () => {
            function MyThing() {
                return {};
            }
            const object = { MyThing };
            createSpy(object, "MyThing");

            const result = new object.MyThing(); // eslint-disable-line no-unused-vars

            assert(object.MyThing.calledWithNew());
        });

        const applyableNatives = (function () {
            try { // eslint-disable-line no-restricted-syntax
                console.log.apply({}, []); // eslint-disable-line no-console
                return true;
            } catch (e) {
                return false;
            }
        }());
        if (applyableNatives) {
            describe("spied native function", () => {
                it("is false when called on spied native function", () => {
                    const log = { info: console.log }; // eslint-disable-line no-console
                    createSpy(log, "info");

                    // by logging an empty string, we're not polluting the test console output
                    log.info("");

                    assert.isFalse(log.info.calledWithNew());
                });
            });
        }
    });

    describe(".alwaysCalledWithNew", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("is false if spy wasn't called", function () {
            assert.isFalse(this.spy.alwaysCalledWithNew());
        });

        it("is true if always called with new", function () {
            /**
             * eslint-disable no-unused-vars, new-cap
             */
            const result = new this.spy();
            const result2 = new this.spy();
            const result3 = new this.spy();
            /**
             * eslint-enable no-unused-vars, new-cap
             */

            assert(this.spy.alwaysCalledWithNew());
        });

        it("is false if called as function once", function () {
            /**
             * eslint-disable no-unused-vars, new-cap
             */
            const result = new this.spy();
            const result2 = new this.spy();
            /**
             * eslint-enable no-unused-vars, new-cap
             */
            this.spy();

            assert.isFalse(this.spy.alwaysCalledWithNew());
        });
    });

    describe(".thisValues", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("contains one object", function () {
            const object = {};
            this.spy.call(object);

            assert.deepEqual(this.spy.thisValues, [object]);
        });

        it("stacks up objects", function () {
            function MyConstructor() { }
            const objects = [{}, [], new MyConstructor(), { id: 243 }];
            this.spy();
            this.spy.call(objects[0]);
            this.spy.call(objects[1]);
            this.spy.call(objects[2]);
            this.spy.call(objects[3]);

            assert.deepEqual(this.spy.thisValues, [this].concat(objects));
        });
    });

    describe(".calledWith", spyCalledTests("calledWith"));
    describe(".calledWithMatch", spyCalledTests("calledWithMatch"));

    describe(".calledWithMatchSpecial", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("checks substring match", function () {
            this.spy("I like it");

            assert(this.spy.calledWithMatch("like"));
            assert.isFalse(this.spy.calledWithMatch("nope"));
        });

        it("checks for regexp match", function () {
            this.spy("I like it");

            assert(this.spy.calledWithMatch(/[a-z ]+/i));
            assert.isFalse(this.spy.calledWithMatch(/[0-9]+/));
        });

        it("checks for partial object match", function () {
            this.spy({ foo: "foo", bar: "bar" });

            assert(this.spy.calledWithMatch({ bar: "bar" }));
            assert.isFalse(this.spy.calledWithMatch({ same: "same" }));
        });
    });

    describe(".alwaysCalledWith", spyAlwaysCalledTests("alwaysCalledWith"));
    describe(".alwaysCalledWithMatch", spyAlwaysCalledTests("alwaysCalledWithMatch"));

    describe(".alwaysCalledWithMatchSpecial", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("checks true", function () {
            this.spy(true);

            assert(this.spy.alwaysCalledWithMatch(true));
            assert.isFalse(this.spy.alwaysCalledWithMatch(false));
        });

        it("checks false", function () {
            this.spy(false);

            assert(this.spy.alwaysCalledWithMatch(false));
            assert.isFalse(this.spy.alwaysCalledWithMatch(true));
        });

        it("checks substring match", function () {
            this.spy("test case");
            this.spy("some test");
            this.spy("all tests");

            assert(this.spy.alwaysCalledWithMatch("test"));
            assert.isFalse(this.spy.alwaysCalledWithMatch("case"));
        });

        it("checks regexp match", function () {
            this.spy("1");
            this.spy("2");
            this.spy("3");

            assert(this.spy.alwaysCalledWithMatch(/[123]/));
            assert.isFalse(this.spy.alwaysCalledWithMatch(/[12]/));
        });

        it("checks partial object match", function () {
            this.spy({ a: "a", b: "b" });
            this.spy({ c: "c", b: "b" });
            this.spy({ b: "b", d: "d" });

            assert(this.spy.alwaysCalledWithMatch({ b: "b" }));
            assert.isFalse(this.spy.alwaysCalledWithMatch({ a: "a" }));
        });
    });

    describe(".neverCalledWith", spyNeverCalledTests("neverCalledWith"));
    describe(".neverCalledWithMatch", spyNeverCalledTests("neverCalledWithMatch"));

    describe(".neverCalledWithMatchSpecial", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("checks substring match", function () {
            this.spy("a test", "b test");

            assert(this.spy.neverCalledWithMatch("a", "a"));
            assert(this.spy.neverCalledWithMatch("b", "b"));
            assert(this.spy.neverCalledWithMatch("b", "a"));
            assert.isFalse(this.spy.neverCalledWithMatch("a", "b"));
        });

        it("checks regexp match", function () {
            this.spy("a test", "b test");

            assert(this.spy.neverCalledWithMatch(/a/, /a/));
            assert(this.spy.neverCalledWithMatch(/b/, /b/));
            assert(this.spy.neverCalledWithMatch(/b/, /a/));
            assert.isFalse(this.spy.neverCalledWithMatch(/a/, /b/));
        });

        it("checks partial object match", function () {
            this.spy({ a: "test", b: "test" });

            assert(this.spy.neverCalledWithMatch({ a: "nope" }));
            assert(this.spy.neverCalledWithMatch({ c: "test" }));
            assert.isFalse(this.spy.neverCalledWithMatch({ b: "test" }));
        });
    });

    describe(".args", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("contains real arrays", function () {
            this.spy();

            assert.array(this.spy.args[0]);
        });

        it("contains empty array when no arguments", function () {
            this.spy();

            assert.deepEqual(this.spy.args, [[]]);
        });

        it("contains array with first call's arguments", function () {
            this.spy(1, 2, 3);

            assert.deepEqual(this.spy.args, [[1, 2, 3]]);
        });

        it("stacks up arguments in nested array", function () {
            const objects = [{}, [], { id: 324 }];
            this.spy(1, objects[0], 3);
            this.spy(1, 2, objects[1]);
            this.spy(objects[2], 2, 3);

            assert.deepEqual(this.spy.args, [
                [1, objects[0], 3],
                [1, 2, objects[1]],
                [objects[2], 2, 3]
            ]);
        });
    });

    describe(".calledWithExactly", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("returns false for partial match", function () {
            this.spy(1, 2, 3);

            assert.isFalse(this.spy.calledWithExactly(1, 2));
        });

        it("returns false for missing arguments", function () {
            this.spy(1, 2, 3);

            assert.isFalse(this.spy.calledWithExactly(1, 2, 3, 4));
        });

        it("returns true for exact match", function () {
            this.spy(1, 2, 3);

            assert(this.spy.calledWithExactly(1, 2, 3));
        });

        it("matchs by strict comparison", function () {
            this.spy({}, []);

            assert.isFalse(this.spy.calledWithExactly({}, [], null));
        });

        it("returns true for one exact match", function () {
            const object = {};
            const array = [];
            this.spy({}, []);
            this.spy(object, []);
            this.spy(object, array);

            assert(this.spy.calledWithExactly(object, array));
        });

        it("returns true when all properties of an object argument match", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert(this.spy.calledWithExactly({ a: 1, b: 2, c: 3 }));
        });

        it("returns false when a property of an object argument is set to undefined", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(this.spy.calledWithExactly({ a: 1, b: 2, c: undefined }));
        });

        it("returns false when a property of an object argument is set to a different value", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(this.spy.calledWithExactly({ a: 1, b: 2, c: "blah" }));
        });

        it("returns false when an object argument has a different property/value pair", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(this.spy.calledWithExactly({ a: 1, b: 2, foo: "blah" }));
        });

        it("returns false when property of Object argument is set to undefined and has a different name", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(this.spy.calledWithExactly({ a: 1, b: 2, foo: undefined }));
        });

        it("returns false when any properties of an object argument aren't present", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(this.spy.calledWithExactly({ a: 1, b: 2 }));
        });

        it("returns false when an object argument has extra properties", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(this.spy.calledWithExactly({ a: 1, b: 2, c: 3, d: 4 }));
        });
    });

    describe(".alwaysCalledWithExactly", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
        });

        it("returns false for partial match", function () {
            this.spy(1, 2, 3);

            assert.isFalse(this.spy.alwaysCalledWithExactly(1, 2));
        });

        it("returns false for missing arguments", function () {
            this.spy(1, 2, 3);

            assert.isFalse(this.spy.alwaysCalledWithExactly(1, 2, 3, 4));
        });

        it("returns true for exact match", function () {
            this.spy(1, 2, 3);

            assert(this.spy.alwaysCalledWithExactly(1, 2, 3));
        });

        it("returns false for excess arguments", function () {
            this.spy({}, []);

            assert.isFalse(this.spy.alwaysCalledWithExactly({}, [], null));
        });

        it("returns false for one exact match", function () {
            const object = {};
            const array = [];
            this.spy({}, []);
            this.spy(object, []);
            this.spy(object, array);

            assert(this.spy.alwaysCalledWithExactly(object, array));
        });

        it("returns true for only exact matches", function () {
            const object = {};
            const array = [];

            this.spy(object, array);
            this.spy(object, array);
            this.spy(object, array);

            assert(this.spy.alwaysCalledWithExactly(object, array));
        });

        it("returns false for no exact matches", function () {
            const object = {};
            const array = [];

            this.spy(object, array, null);
            this.spy(object, array, undefined);
            this.spy(object, array, "");

            assert.isFalse(this.spy.alwaysCalledWithExactly(object, array));
        });
    });

    describe(".threw", () => {
        beforeEach(function () {
            this.spy = createSpy.create();

            this.spyWithTypeError = createSpy.create(() => {
                throw new TypeError();
            });

            this.spyWithStringError = createSpy.create(() => {
                throw "error";
            });
        });

        it("returns error thrown by function", () => {
            const err = new Error();

            const spy = createSpy.create(() => {
                throw err;
            });

            assert.throws(spy);

            assert(spy.threw(err));
        });

        it("returns false if spy did not throw", function () {
            this.spy();

            assert.isFalse(this.spy.threw());
        });

        it("returns true if spy threw", function () {
            assert.throws(this.spyWithTypeError);

            assert(this.spyWithTypeError.threw());
        });

        it("returns true if string type matches", function () {
            assert.throws(this.spyWithTypeError);

            assert(this.spyWithTypeError.threw("TypeError"));
        });

        it("returns false if string did not match", function () {
            assert.throws(this.spyWithTypeError);

            assert.isFalse(this.spyWithTypeError.threw("Error"));
        });

        it("returns false if spy did not throw specified error", function () {
            this.spy();

            assert.isFalse(this.spy.threw("Error"));
        });

        it("returns true if string matches", function () {
            assert.throws(this.spyWithStringError);

            assert(this.spyWithStringError.threw("error"));
        });

        it("returns false if strings do not match", function () {
            assert.throws(this.spyWithStringError);

            assert.isFalse(this.spyWithStringError.threw("not the error"));
        });
    });

    describe(".alwaysThrew", () => {
        beforeEach(function () {
            this.spy = createSpy.create();

            this.spyWithTypeError = createSpy.create(() => {
                throw new TypeError();
            });
        });

        it("returns true when spy threw", () => {
            const err = new Error();

            const spy = createSpy.create(() => {
                throw err;
            });

            assert.throws(spy);

            assert(spy.alwaysThrew(err));
        });

        it("returns false if spy did not throw", function () {
            this.spy();

            assert.isFalse(this.spy.alwaysThrew());
        });

        it("returns true if spy threw", function () {
            assert.throws(this.spyWithTypeError);

            assert(this.spyWithTypeError.alwaysThrew());
        });

        it("returns true if string type matches", function () {
            assert.throws(this.spyWithTypeError);

            assert(this.spyWithTypeError.alwaysThrew("TypeError"));
        });

        it("returns false if string did not match", function () {
            assert.throws(this.spyWithTypeError);

            assert.isFalse(this.spyWithTypeError.alwaysThrew("Error"));
        });

        it("returns false if spy did not throw specified error", function () {
            this.spy();

            assert.isFalse(this.spy.alwaysThrew("Error"));
        });

        it("returns false if some calls did not throw", function () {
            let callCount = 0;

            this.spy = createSpy(() => {
                callCount += 1;
                if (callCount === 1) {
                    throw new Error("throwing on first call");
                }
            });

            assert.throws(this.spy);

            this.spy();

            assert.isFalse(this.spy.alwaysThrew());
        });

        it("returns true if all calls threw", function () {
            assert.throws(this.spyWithTypeError);

            assert.throws(this.spyWithTypeError);

            assert(this.spyWithTypeError.alwaysThrew());
        });

        it("returns true if all calls threw same type", function () {
            assert.throws(this.spyWithTypeError);

            assert.throws(this.spyWithTypeError);

            assert(this.spyWithTypeError.alwaysThrew("TypeError"));
        });
    });

    describe(".exceptions", () => {
        beforeEach(function () {
            this.spy = createSpy.create();
            const error = this.error = {};

            this.spyWithTypeError = createSpy.create(() => {
                throw error;
            });
        });

        it("contains error thrown by function", function () {
            assert.throws(this.spyWithTypeError);

            assert.deepEqual(this.spyWithTypeError.exceptions, [this.error]);
        });

        it("contains undefined entry when function did not throw", function () {
            this.spy();

            assert.equal(this.spy.exceptions.length, 1);
            assert.isUndefined(this.spy.exceptions[0]);
        });

        it("stacks up exceptions and undefined", function () {
            let calls = 0;
            const err = this.error;

            const spy = createSpy.create(() => {
                calls += 1;

                if (calls % 2 === 0) {
                    throw err;
                }
            });

            spy();

            assert.throws(spy);

            spy();

            assert.throws(spy);

            spy();

            assert.equal(spy.exceptions.length, 5);
            assert.isUndefined(spy.exceptions[0]);
            assert.equal(spy.exceptions[1], err);
            assert.isUndefined(spy.exceptions[2]);
            assert.equal(spy.exceptions[3], err);
            assert.isUndefined(spy.exceptions[4]);
        });
    });

    describe(".returned", () => {
        it("returns true when no argument", () => {
            const spy = createSpy.create();
            spy();

            assert(spy.returned());
        });

        it("returns true for undefined when no explicit return", () => {
            const spy = createSpy.create();
            spy();

            assert(spy.returned(undefined));
        });

        it("returns true when returned value once", () => {
            const values = [{}, 2, "hey", function () { }];
            var spy = createSpy.create(() => {
                return values[spy.callCount];
            });

            spy();
            spy();
            spy();
            spy();

            assert(spy.returned(values[3]));
        });

        it("returns false when value is never returned", () => {
            const values = [{}, 2, "hey", function () { }];
            var spy = createSpy.create(() => {
                return values[spy.callCount];
            });

            spy();
            spy();
            spy();
            spy();

            assert.isFalse(spy.returned({ id: 42 }));
        });

        it("returns true when value is returned several times", () => {
            const object = { id: 42 };
            const spy = createSpy.create(() => {
                return object;
            });

            spy();
            spy();
            spy();

            assert(spy.returned(object));
        });

        it("compares values deeply", () => {
            const object = { deep: { id: 42 } };
            const spy = createSpy.create(() => {
                return object;
            });

            spy();

            assert(spy.returned({ deep: { id: 42 } }));
        });

        it("compares values strictly using match.same", () => {
            const object = { id: 42 };
            const spy = createSpy.create(() => {
                return object;
            });

            spy();

            assert.isFalse(spy.returned(match.same({ id: 42 })));
            assert(spy.returned(match.same(object)));
        });
    });

    describe(".returnValues", () => {
        it("contains undefined when function does not return explicitly", () => {
            const spy = createSpy.create();
            spy();

            assert.equal(spy.returnValues.length, 1);
            assert.isUndefined(spy.returnValues[0]);
        });

        it("contains return value", () => {
            const object = { id: 42 };

            const spy = createSpy.create(() => {
                return object;
            });

            spy();

            assert.deepEqual(spy.returnValues, [object]);
        });

        it("contains undefined when function throws", () => {
            const spy = createSpy.create(() => {
                throw new Error();
            });

            assert.throws(spy);

            assert.equal(spy.returnValues.length, 1);
            assert.isUndefined(spy.returnValues[0]);
        });

        it("contains the created object for spied constructors", () => {
            const Spy = createSpy.create(function () {
                this; // to stop auto lint
            });

            const result = new Spy();

            assert.equal(Spy.returnValues[0], result);
        });

        it("contains the return value for spied constructors that explicitly return objects", () => {
            const Spy = createSpy.create(() => {
                return { isExplicitlyCreatedValue: true };
            });

            const result = new Spy();

            assert.isTrue(result.isExplicitlyCreatedValue);
            assert.equal(Spy.returnValues[0], result);
        });

        it("contains the created object for spied constructors that explicitly return primitive values", () => {
            const Spy = createSpy.create(function () {
                this; // to stop auto lint
                return 10;
            });

            const result = new Spy();

            assert.notEqual(result, 10);
            assert.equal(Spy.returnValues[0], result);
        });

        it("stacks up return values", () => {
            let calls = 0;

            /**
             * eslint consistent-return: "off"
             */
            const spy = createSpy.create(() => {
                calls += 1;

                if (calls % 2 === 0) {
                    return calls;
                }
            });

            spy();
            spy();
            spy();
            spy();
            spy();

            assert.equal(spy.returnValues.length, 5);
            assert.isUndefined(spy.returnValues[0]);
            assert.equal(spy.returnValues[1], 2);
            assert.isUndefined(spy.returnValues[2]);
            assert.equal(spy.returnValues[3], 4);
            assert.isUndefined(spy.returnValues[4]);
        });
    });

    describe(".calledBefore", () => {
        beforeEach(function () {
            this.spyA = createSpy();
            this.spyB = createSpy();
        });

        it("is function", function () {
            assert.isFunction(this.spyA.calledBefore);
        });

        it("returns true if first call to A was before first to B", function () {
            this.spyA();
            this.spyB();

            assert(this.spyA.calledBefore(this.spyB));
        });

        it("compares call order of calls directly", function () {
            this.spyA();
            this.spyB();

            assert(this.spyA.getCall(0).calledBefore(this.spyB.getCall(0)));
        });

        it("returns false if not called", function () {
            this.spyB();

            assert.isFalse(this.spyA.calledBefore(this.spyB));
        });

        it("returns true if other not called", function () {
            this.spyA();

            assert(this.spyA.calledBefore(this.spyB));
        });

        it("returns false if other called first", function () {
            this.spyB();
            this.spyA();
            this.spyB();

            assert(this.spyA.calledBefore(this.spyB));
        });
    });

    describe(".calledAfter", () => {
        beforeEach(function () {
            this.spyA = createSpy();
            this.spyB = createSpy();
        });

        it("is function", function () {
            assert.isFunction(this.spyA.calledAfter);
        });

        it("returns true if first call to A was after first to B", function () {
            this.spyB();
            this.spyA();

            assert(this.spyA.calledAfter(this.spyB));
        });

        it("compares calls directly", function () {
            this.spyB();
            this.spyA();

            assert(this.spyA.getCall(0).calledAfter(this.spyB.getCall(0)));
        });

        it("returns false if not called", function () {
            this.spyB();

            assert.isFalse(this.spyA.calledAfter(this.spyB));
        });

        it("returns false if other not called", function () {
            this.spyA();

            assert.isFalse(this.spyA.calledAfter(this.spyB));
        });

        it("returns true if called anytime after other", function () {
            this.spyB();
            this.spyA();
            this.spyB();

            assert.isTrue(this.spyA.calledAfter(this.spyB));
        });
    });

    describe(".calledImmediatelyAfter", () => {
        beforeEach(function () {
            this.spyA = createSpy();
            this.spyB = createSpy();
            this.spyC = createSpy();
        });

        it("is function", function () {
            assert.isFunction(this.spyA.calledImmediatelyAfter);
        });

        it("returns true if first call to A was immediately after first to B", function () {
            this.spyB();
            this.spyA();

            assert(this.spyA.calledImmediatelyAfter(this.spyB));
        });

        it("compares calls directly", function () {
            this.spyB();
            this.spyA();

            assert(this.spyA.getCall(0).calledImmediatelyAfter(this.spyB.getCall(0)));
        });

        it("returns false if not called", function () {
            this.spyB();

            assert.isFalse(this.spyA.calledImmediatelyAfter(this.spyB));
        });

        it("returns false if other not called", function () {
            this.spyA();

            assert.isFalse(this.spyA.calledImmediatelyAfter(this.spyB));
        });

        it("returns false if other called last", function () {
            this.spyB();
            this.spyA();
            this.spyB();

            assert.isFalse(this.spyA.calledImmediatelyAfter(this.spyB));
        });

        it("returns false if another spy called between", function () {
            this.spyA();
            this.spyC();
            this.spyB();

            assert.isFalse(this.spyB.calledImmediatelyAfter(this.spyA));
        });
    });

    describe(".calledImmediatelyBefore", () => {
        beforeEach(function () {
            this.spyA = createSpy();
            this.spyB = createSpy();
            this.spyC = createSpy();
        });

        it("is function", function () {
            assert.isFunction(this.spyA.calledImmediatelyBefore);
        });

        it("returns true if first call to A was immediately after first to B", function () {
            this.spyB();
            this.spyA();

            assert(this.spyB.calledImmediatelyBefore(this.spyA));
        });

        it("compares calls directly", function () {
            this.spyB();
            this.spyA();

            assert(this.spyB.getCall(0).calledImmediatelyBefore(this.spyA.getCall(0)));
        });

        it("returns false if not called", function () {
            this.spyB();

            assert.isFalse(this.spyA.calledImmediatelyBefore(this.spyB));
        });

        it("returns false if other not called", function () {
            this.spyA();

            assert.isFalse(this.spyA.calledImmediatelyBefore(this.spyB));
        });

        it("returns false if other called last", function () {
            this.spyB();
            this.spyA();
            this.spyB();

            assert.isFalse(this.spyB.calledImmediatelyBefore(this.spyA));
        });

        it("returns false if another spy called between", function () {
            this.spyA();
            this.spyC();
            this.spyB();

            assert.isFalse(this.spyA.calledImmediatelyBefore(this.spyB));
        });
    });

    describe(".firstCall", () => {
        it("is undefined by default", () => {
            const spy = createSpy();

            assert.isNull(spy.firstCall);
        });

        it("is equal to getCall(0) result after first call", () => {
            const spy = createSpy();

            spy();

            const call0 = spy.getCall(0);
            assert.equal(spy.firstCall.callId, call0.callId);
            assert.equal(spy.firstCall.spy, call0.spy);
        });

        it("is equal to getCall(0) after first call when control flow has continued after invocation", () => {
            let spy;

            function runAsserts() {
                const call0 = spy.getCall(0);
                assert.equal(spy.firstCall.callId, call0.callId);
                assert.equal(spy.firstCall.spy, call0.spy);
            }

            spy = createSpy(runAsserts);

            spy();
        });

        it("is tracked even if exceptions are thrown", () => {
            const spy = createSpy(() => {
                throw "an error";
            });

            assert.throws(spy);

            assert.isNotNull(spy.firstCall);
        });

        it("has correct returnValue", () => {
            const spy = createSpy(() => {
                return 42;
            });

            spy();

            assert.equal(spy.firstCall.returnValue, 42);
            assert(spy.firstCall.returned(42));
        });

        it("has correct error", () => {
            const err = new Error();
            const spy = createSpy(() => {
                throw err;
            });

            assert.throws(spy);

            assert.equal(spy.firstCall.error, err);
            assert(spy.firstCall.threw(err));
        });

    });

    describe(".secondCall", () => {
        it("is null by default", () => {
            const spy = createSpy();

            assert.isNull(spy.secondCall);
        });

        it("stills be null after first call", () => {
            const spy = createSpy();
            spy();

            assert.isNull(spy.secondCall);
        });

        it("is equal to getCall(1) result after second call", () => {
            const spy = createSpy();

            spy();
            spy();

            const call1 = spy.getCall(1);
            assert.equal(spy.secondCall.callId, call1.callId);
            assert.equal(spy.secondCall.spy, call1.spy);
        });
    });

    describe(".thirdCall", () => {
        it("is undefined by default", () => {
            const spy = createSpy();

            assert.isNull(spy.thirdCall);
        });

        it("stills be undefined after second call", () => {
            const spy = createSpy();
            spy();
            spy();

            assert.isNull(spy.thirdCall);
        });

        it("is equal to getCall(1) result after second call", () => {
            const spy = createSpy();

            spy();
            spy();
            spy();

            const call2 = spy.getCall(2);
            assert.equal(spy.thirdCall.callId, call2.callId);
            assert.equal(spy.thirdCall.spy, call2.spy);
        });
    });

    describe(".lastCall", () => {
        it("is undefined by default", () => {
            const spy = createSpy();

            assert.isNull(spy.lastCall);
        });

        it("is same as firstCall after first call", () => {
            const spy = createSpy();

            spy();

            assert.equal(spy.lastCall.callId, spy.firstCall.callId);
            assert.equal(spy.lastCall.spy, spy.firstCall.spy);
        });

        it("is same as secondCall after second call", () => {
            const spy = createSpy();

            spy();
            spy();

            assert.equal(spy.lastCall.callId, spy.secondCall.callId);
            assert.equal(spy.lastCall.spy, spy.secondCall.spy);
        });

        it("is same as thirdCall after third call", () => {
            const spy = createSpy();

            spy();
            spy();
            spy();

            assert.equal(spy.lastCall.callId, spy.thirdCall.callId);
            assert.equal(spy.lastCall.spy, spy.thirdCall.spy);
        });

        it("is equal to getCall(3) result after fourth call", () => {
            const spy = createSpy();

            spy();
            spy();
            spy();
            spy();

            const call3 = spy.getCall(3);
            assert.equal(spy.lastCall.callId, call3.callId);
            assert.equal(spy.lastCall.spy, call3.spy);
        });

        it("is equal to getCall(4) result after fifth call", () => {
            const spy = createSpy();

            spy();
            spy();
            spy();
            spy();
            spy();

            const call4 = spy.getCall(4);
            assert.equal(spy.lastCall.callId, call4.callId);
            assert.equal(spy.lastCall.spy, call4.spy);
        });
    });

    describe(".getCalls", () => {
        it("returns an empty Array by default", () => {
            const spy = createSpy();

            assert.array(spy.getCalls());
            assert.equal(spy.getCalls().length, 0);
        });

        it("is analogous to using getCall(n)", () => {
            const spy = createSpy();

            spy();
            spy();

            assert.deepEqual(spy.getCalls(), [spy.getCall(0), spy.getCall(1)]);
        });
    });

    describe(".callArg", () => {
        it("is function", () => {
            const spy = createSpy();

            assert.isFunction(spy.callArg);
        });

        it("invokes argument at index for all calls", () => {
            const spy = createSpy();
            const callback = createSpy();
            spy(1, 2, callback);
            spy(3, 4, callback);

            spy.callArg(2);

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
        });

        it("throws if argument at index is not a function", () => {
            const spy = createSpy();
            spy();

            assert.throws(() => {
                spy.callArg(1);
            }, TypeError);
        });

        it("throws if spy was not yet invoked", () => {
            const spy = createSpy();

            assert.throws(
                () => {
                    spy.callArg(0);
                },
                "spy cannot call arg since it was not yet invoked."
            );
        });

        it("includes spy name in error message", () => {
            const api = { someMethod() { } };
            const spy = createSpy(api, "someMethod");

            assert.throws(
                () => {
                    spy.callArg(0);
                },
                "someMethod cannot call arg since it was not yet invoked."
            );
        });

        it("throws if index is not a number", () => {
            const spy = createSpy();
            spy();

            assert.throws(() => {
                spy.callArg("");
            }, TypeError);
        });

        it("passs additional arguments", () => {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            spy(callback);

            spy.callArg(0, "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
        });
    });

    describe(".callArgOn", () => {
        it("is function", () => {
            const spy = createSpy();

            assert.isFunction(spy.callArgOn);
        });

        it("invokes argument at index for all calls", () => {
            const spy = createSpy();
            const callback = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy(1, 2, callback);
            spy(3, 4, callback);

            spy.callArgOn(2, thisObj);

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
            assert(callback.alwaysCalledOn(thisObj));
        });

        it("throws if argument at index is not a function", () => {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy();

            assert.throws(() => {
                spy.callArgOn(1, thisObj);
            }, TypeError);
        });

        it("throws if spy was not yet invoked", () => {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    spy.callArgOn(0, thisObj);
                },
                "spy cannot call arg since it was not yet invoked."
            );
        });

        it("includes spy name in error message", () => {
            const api = { someMethod() { } };
            const spy = createSpy(api, "someMethod");
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    spy.callArgOn(0, thisObj);
                },
                "someMethod cannot call arg since it was not yet invoked."
            );
        });

        it("throws if index is not a number", () => {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy();

            assert.throws(() => {
                spy.callArg("", thisObj);
            }, TypeError);
        });

        it("pass additional arguments", () => {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            const thisObj = { name1: "value1", name2: "value2" };
            spy(callback);

            spy.callArgOn(0, thisObj, "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
            assert(callback.calledOn(thisObj));
        });
    });

    describe(".callArgWith", () => {
        it("is alias for callArg", () => {
            const spy = createSpy();

            assert.equal(spy.callArgWith, spy.callArg);
        });
    });

    describe(".callArgOnWith", () => {
        it("is alias for callArgOn", () => {
            const spy = createSpy();

            assert.equal(spy.callArgOnWith, spy.callArgOn);
        });
    });

    describe(".yield", () => {
        it("is function", () => {
            const spy = createSpy();

            assert.isFunction(spy.yield);
        });

        it("invokes first function arg for all calls", () => {
            const spy = createSpy();
            const callback = createSpy();
            spy(1, 2, callback);
            spy(3, 4, callback);

            spy.yield();

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
        });

        it("throws if spy was not yet invoked", () => {
            const spy = createSpy();

            assert.throws(
                () => {
                    spy.yield();
                },
                "spy cannot yield since it was not yet invoked."
            );
        });

        it("includes spy name in error message", () => {
            const api = { someMethod() { } };
            const spy = createSpy(api, "someMethod");

            assert.throws(
                () => {
                    spy.yield();
                },
                "someMethod cannot yield since it was not yet invoked."
            );
        });

        it("passs additional arguments", () => {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            spy(callback);

            spy.yield("abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
        });
    });

    describe(".invokeCallback", () => {
        it("is alias for yield", () => {
            const spy = createSpy();

            assert.equal(spy.invokeCallback, spy.yield);
        });
    });

    describe(".yieldOn", () => {
        it("is function", () => {
            const spy = createSpy();

            assert.isFunction(spy.yieldOn);
        });

        it("invokes first function arg for all calls", () => {
            const spy = createSpy();
            const callback = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy(1, 2, callback);
            spy(3, 4, callback);

            spy.yieldOn(thisObj);

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
            assert(callback.alwaysCalledOn(thisObj));
        });

        it("throws if spy was not yet invoked", () => {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    spy.yieldOn(thisObj);
                },
                "spy cannot yield since it was not yet invoked."
            );
        });

        it("includes spy name in error message", () => {
            const api = { someMethod() { } };
            const spy = createSpy(api, "someMethod");
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    spy.yieldOn(thisObj);
                },
                "someMethod cannot yield since it was not yet invoked."
            );
        });

        it("pass additional arguments", () => {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            const thisObj = { name1: "value1", name2: "value2" };
            spy(callback);

            spy.yieldOn(thisObj, "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
            assert(callback.calledOn(thisObj));
        });
    });

    describe(".yieldTo", () => {
        it("is function", () => {
            const spy = createSpy();

            assert.isFunction(spy.yieldTo);
        });

        it("invokes first function arg for all calls", () => {
            const spy = createSpy();
            const callback = createSpy();
            spy(1, 2, { success: callback });
            spy(3, 4, { success: callback });

            spy.yieldTo("success");

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
        });

        it("throws if spy was not yet invoked", () => {
            const spy = createSpy();

            assert.throws(
                () => {
                    spy.yieldTo("success");
                },
                "spy cannot yield to 'success' since it was not yet invoked."
            );
        });

        it("includes spy name in error message", () => {
            const api = { someMethod() { } };
            const spy = createSpy(api, "someMethod");

            assert.throws(
                () => {
                    spy.yieldTo("success");
                },
                "someMethod cannot yield to 'success' since it was not yet invoked."
            );
        });

        it("throws readable message for symbol when spy was not yet invoked", () => {
            const spy = createSpy();

            assert.throws(
                () => {
                    spy.yieldTo(Symbol());
                },
                "spy cannot yield to 'Symbol()' since it was not yet invoked."
            );
        });

        it("pass additional arguments", () => {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            spy({ test: callback });

            spy.yieldTo("test", "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
        });
    });

    describe(".yieldToOn", () => {
        it("is function", () => {
            const spy = createSpy();

            assert.isFunction(spy.yieldToOn);
        });

        it("invokes first function arg for all calls", () => {
            const spy = createSpy();
            const callback = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy(1, 2, { success: callback });
            spy(3, 4, { success: callback });

            spy.yieldToOn("success", thisObj);

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
            assert(callback.alwaysCalledOn(thisObj));
        });

        it("throws if spy was not yet invoked", () => {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    spy.yieldToOn("success", thisObj);
                },
                "spy cannot yield to 'success' since it was not yet invoked."
            );
        });

        it("includes spy name in error message", () => {
            const api = { someMethod() { } };
            const spy = createSpy(api, "someMethod");
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    spy.yieldToOn("success", thisObj);
                },
                "someMethod cannot yield to 'success' since it was not yet invoked."
            );
        });

        it("throws readable message for symbol when spy was not yet invoked", () => {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    spy.yieldToOn(Symbol(), thisObj);
                },
                "spy cannot yield to 'Symbol()' since it was not yet invoked."
            );
        });

        it("pass additional arguments", () => {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            const thisObj = { name1: "value1", name2: "value2" };
            spy({ test: callback });

            spy.yieldToOn("test", thisObj, "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
            assert(callback.calledOn(thisObj));
        });
    });

    describe(".throwArg", () => {
        it("should be a function", () => {
            const spy = createSpy();

            assert.isFunction(spy.throwArg);
        });

        it("should throw if spy hasn't been called", () => {
            const spy = createSpy();

            assert.throws(
                () => {
                    spy.throwArg(0);
                },
                "spy cannot throw arg since it was not yet invoked."
            );
        });

        it("should throw if there aren't enough arguments in the previous spy call", () => {
            const spy = createSpy();

            spy("only", "four", "arguments", "here");

            assert.throws(
                () => {
                    spy.throwArg(7);
                },
                "Not enough arguments: 7 required but only 4 present"
            );
        });

        it("should throw specified argument", () => {
            const spy = createSpy();
            const expectedError = new TypeError("catpants");

            spy(true, false, null, expectedError, "meh");
            assert.throws(
                () => {
                    spy.throwArg(3);
                },
                TypeError,
                expectedError.message
            );
        });
    });

    describe(".resetHistory", () => {
        it("return same object", () => {
            const spy = createSpy();
            const reset = spy.resetHistory();

            assert(reset === spy);
        });

        it("throws if called during spy invocation", () => {
            const spy = createSpy(() => {
                spy.resetHistory();
            });

            const err = assert.throws(spy);
            assert.equal(err.name, "InvalidResetException");
        });
    });

    describe(".length", () => {
        it("is zero by default", () => {
            const spy = createSpy();

            assert.equal(spy.length, 0);
        });

        it("matches the function length", () => {
            const api = { someMethod(a, b, c) { } }; // eslint-disable-line no-unused-vars
            const spy = createSpy(api, "someMethod");

            assert.equal(spy.length, 3);
        });
    });

    describe(".matchingFakes", () => {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is function", function () {
            assert.isFunction(this.spy.matchingFakes);
        });

        it("returns an empty array by default", function () {
            assert.deepEqual(this.spy.matchingFakes([]), []);
            assert.deepEqual(this.spy.matchingFakes([1]), []);
            assert.deepEqual(this.spy.matchingFakes([1, 1]), []);
        });

        it("returns one matched fake", function () {
            this.spy.withArgs(1);
            this.spy.withArgs(2);

            assert.deepEqual(this.spy.matchingFakes([1]), [this.spy.withArgs(1)]);
            assert.deepEqual(this.spy.matchingFakes([2]), [this.spy.withArgs(2)]);
        });

        it("return some matched fake", function () {
            this.spy.withArgs(1);
            this.spy.withArgs(1, 1);
            this.spy.withArgs(2);

            assert.deepEqual(this.spy.matchingFakes([]), []);
            assert.deepEqual(this.spy.matchingFakes([1]), [
                this.spy.withArgs(1)
            ]);
            assert.deepEqual(this.spy.matchingFakes([1, 1]), [
                this.spy.withArgs(1),
                this.spy.withArgs(1, 1)
            ]);
        });
    });

    describe("waitForCall", () => {
        it("should resolve promise with the first call", async () => {
            const s = createSpy();
            let p = s.waitForCall();
            s();
            p = await p;
            assert.deepEqual(p, s.getCall(0));
        });
    });

    describe("waitForNCalls", () => {
        it("should resolve with n calls", async () => {
            const s = createSpy();
            let p = s.waitForNCalls(3);
            s();
            s();
            s();
            p = await p;
            assert.array(p);
            assert.equal(p.length, 3);
            assert.deepEqual(p, [s.getCall(0), s.getCall(1), s.getCall(2)]);
        });
    });

    describe("waitForArgs", () => {
        it("should wait for particular args", async () => {
            const s = createSpy();
            let p = s.waitForArgs(match.any, 1, 2);
            s(1, 2, 3);
            s(4, 5, 6);
            s("as", 1, 2);
            p = await p;
            assert.deepEqual(p.args, ["as", 1, 2]);
        });
    });

    describe("waitForArg", () => {
        it("should wait for a particular arg", async () => {
            const s = createSpy();
            let p = s.waitForArg(1, "asd");
            s();
            s(1, 2, 3);
            s(5, 3, 1);
            s(1, "asd", 456);
            p = await p;
            assert.deepEqual(p.args, [1, "asd", 456]);
        });
    });
});

