/* global it describe assert beforeEach */

import createSpy, { InvalidResetException } from "adone/glosses/shani/mock/spy";
import $match from "adone/glosses/shani/mock/match";

function spyCalledTests(method) {
    return function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("returns false if spy was not called", function () {
            assert.isNotOk(spy[method](1, 2, 3));
        });

        it("returns true if spy was called with args", function () {
            spy(1, 2, 3);

            assert(spy[method](1, 2, 3));
        });

        it("returns true if called with args at least once", function () {
            spy(1, 3, 3);
            spy(1, 2, 3);
            spy(3, 2, 3);

            assert(spy[method](1, 2, 3));
        });

        it("returns false if not called with args", function () {
            spy(1, 3, 3);
            spy(2);
            spy();

            assert.isNotOk(spy[method](1, 2, 3));
        });

        it("returns false if not called with undefined", function () {
            spy();

            assert.isNotOk(spy[method](undefined));
        });

        it("returns true for partial match", function () {
            spy(1, 3, 3);
            spy(2);
            spy();

            assert(spy[method](1, 3));
        });

        it("matchs all arguments individually, not as array", function () {
            spy([1, 2, 3]);

            assert.isNotOk(spy[method](1, 2, 3));
        });

        it("uses matcher", function () {
            spy("abc");

            assert(spy[method]($match.typeOf("string")));
        });

        it("uses matcher in object", function () {
            spy({ some: "abc" });

            assert(spy[method]({ some: $match.typeOf("string") }));
        });
    };
}

function spyAlwaysCalledTests(method) {
    return function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("returns false if spy was not called", function () {
            assert.isNotOk(spy[method](1, 2, 3));
        });

        it("returns true if spy was called with args", function () {
            spy(1, 2, 3);

            assert(spy[method](1, 2, 3));
        });

        it("returns false if called with args only once", function () {
            spy(1, 3, 3);
            spy(1, 2, 3);
            spy(3, 2, 3);

            assert.isNotOk(spy[method](1, 2, 3));
        });

        it("returns false if not called with args", function () {
            spy(1, 3, 3);
            spy(2);
            spy();

            assert.isNotOk(spy[method](1, 2, 3));
        });

        it("returns true for partial match", function () {
            spy(1, 3, 3);

            assert(spy[method](1, 3));
        });

        it("returns true for partial match on many calls", function () {
            spy(1, 3, 3);
            spy(1, 3);
            spy(1, 3, 4, 5);
            spy(1, 3, 1);

            assert(spy[method](1, 3));
        });

        it("matchs all arguments individually, not as array", function () {
            spy([1, 2, 3]);

            assert.isNotOk(spy[method](1, 2, 3));
        });
    };
}

function spyNeverCalledTests(method) {
    return function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("returns true if spy was not called", function () {
            assert(spy[method](1, 2, 3));
        });

        it("returns false if spy was called with args", function () {
            spy(1, 2, 3);

            assert.isNotOk(spy[method](1, 2, 3));
        });

        it("returns false if called with args at least once", function () {
            spy(1, 3, 3);
            spy(1, 2, 3);
            spy(3, 2, 3);

            assert.isNotOk(spy[method](1, 2, 3));
        });

        it("returns true if not called with args", function () {
            spy(1, 3, 3);
            spy(2);
            spy();

            assert(spy[method](1, 2, 3));
        });

        it("returns false for partial match", function () {
            spy(1, 3, 3);
            spy(2);
            spy();

            assert.isNotOk(spy[method](1, 3));
        });

        it("matchs all arguments individually, not as array", function () {
            spy([1, 2, 3]);

            assert(spy[method](1, 2, 3));
        });
    };
}

describe("spy", function () {
    it("does not throw if called without function", function () {
        createSpy.create();
    });

    it("does not throw when calling anonymous spy", function () {
        const spy = createSpy.create();
        spy();
        assert(spy.called);
    });

    it("returns spy function", function () {
        const func = function () {};
        const spy = createSpy.create(func);

        assert.isFunction(spy);
        assert.notDeepEqual(func, spy);
    });

    it("mirrors custom properties on function", function () {
        const func = function () {};
        func.myProp = 42;
        const spy = createSpy.create(func);

        assert.equal(spy.myProp, func.myProp);
    });

    it("does not define create method", function () {
        const spy = createSpy.create();
        assert.notProperty(spy, "create");
    });

    it("does not overwrite original create property", function () {
        const func = function () {};
        const object = func.create = {};
        const spy = createSpy.create(func);

        assert.deepEqual(spy.create, object);
    });

    it("sets up logging arrays", function () {
        const spy = createSpy.create();

        assert.isArray(spy.args);
        assert.isArray(spy.returnValues);
        assert.isArray(spy.thisValues);
        assert.isArray(spy.exceptions);
    });

    it("works with getters", function () {
        const object = {
            get property() {
                return 42;
            }
        };
        const spy = createSpy(object, "property", ["get"]);

        assert.equal(object.property, 42);
        assert(spy.get.calledOnce);
    });

    it("works with setters", function () {
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

    it("works with setters and getters combined", function () {
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

    it("creates a spy for Error", function () {
        const originalError = global.Error;
        try {
            assert(createSpy(global, "Error"));
            global.Error = originalError;
        } catch (e) {
            // so test failure doesn't trickle down
            global.Error = originalError;
            throw new Error("Expected spy to be created");
        }
    });

    describe(".named", function () {
        it("sets displayName", function () {
            const spy = createSpy();
            const retval = spy.named("beep");
            assert.equal(spy.displayName, "beep");
            assert.deepEqual(spy, retval);
        });
    });

    describe("call", function () {
        it("calls underlying function", function () {
            let called = false;

            const spy = createSpy.create(function () {
                called = true;
            });

            spy();

            assert(called);
        });

        it("passs arguments to function", function () {
            let actualArgs;

            const func = function (a, b, c, d) {
                actualArgs = [a, b, c, d];
            };

            const args = [1, {}, [], ""];
            const spy = createSpy.create(func);
            spy(args[0], args[1], args[2], args[3]);

            assert.deepEqual(actualArgs, args);
        });

        it("maintains this binding", function () {
            let actualThis;

            const func = function () {
                actualThis = this;
            };

            const object = {};
            const spy = createSpy.create(func);
            spy.call(object);

            assert.deepEqual(actualThis, object);
        });

        it("returns function's return value", function () {
            const object = {};

            const func = function () {
                return object;
            };

            const spy = createSpy.create(func);
            const actualReturn = spy();

            assert.deepEqual(actualReturn, object);
        });

        it("throws if function throws", function () {
            const err = new Error();
            const spy = createSpy.create(function () {
                throw err;
            });

            try {
                spy();
                throw new Error("Expected spy to throw exception");
            } catch (e) {
                assert.deepEqual(e, err);
            }
        });

        it("retains function length 0", function () {
            const spy = createSpy.create(function () {});

            assert.equal(spy.length, 0);
        });

        it("retains function length 1", function () {
            const spy = createSpy.create(function (a) {}); // eslint-disable-line no-unused-vars

            assert.equal(spy.length, 1);
        });

        it("retains function length 2", function () {
            const spy = createSpy.create(function (a, b) {}); // eslint-disable-line no-unused-vars

            assert.equal(spy.length, 2);
        });

        it("retains function length 3", function () {
            const spy = createSpy.create(function (a, b, c) {}); // eslint-disable-line no-unused-vars

            assert.equal(spy.length, 3);
        });

        it("retains function length 4", function () {
            const spy = createSpy.create(function (a, b, c, d) {}); // eslint-disable-line no-unused-vars

            assert.equal(spy.length, 4);
        });

        it("retains function length 12", function () {
            const func12Args = function (a, b, c, d, e, f, g, h, i, j, k, l) {}; // eslint-disable-line no-unused-vars
            const spy = createSpy.create(func12Args);

            assert.equal(spy.length, 12);
        });
    });

    describe(".called", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("is false prior to calling the spy", function () {
            assert.isNotOk(spy.called);
        });

        it("is true after calling the spy once", function () {
            spy();

            assert(spy.called);
        });

        it("is true after calling the spy twice", function () {
            spy();
            spy();

            assert(spy.called);
        });
    });

    describe(".notCalled", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("is true prior to calling the spy", function () {
            assert.isTrue(spy.notCalled);
        });

        it("is false after calling the spy once", function () {
            spy();

            assert.isNotOk(spy.notCalled);
        });
    });

    describe(".calledOnce", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("is false prior to calling the spy", function () {
            assert.isNotOk(spy.calledOnce);
        });

        it("is true after calling the spy once", function () {
            spy();

            assert(spy.calledOnce);
        });

        it("is false after calling the spy twice", function () {
            spy();
            spy();

            assert.isNotOk(spy.calledOnce);
        });
    });

    describe(".calledTwice", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("is false prior to calling the spy", function () {
            assert.isNotOk(spy.calledTwice);
        });

        it("is false after calling the spy once", function () {
            spy();

            assert.isNotOk(spy.calledTwice);
        });

        it("is true after calling the spy twice", function () {
            spy();
            spy();

            assert(spy.calledTwice);
        });

        it("is false after calling the spy thrice", function () {
            spy();
            spy();
            spy();

            assert.isNotOk(spy.calledTwice);
        });
    });

    describe(".calledThrice", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("is false prior to calling the spy", function () {
            assert.isNotOk(spy.calledThrice);
        });

        it("is false after calling the spy twice", function () {
            spy();
            spy();

            assert.isNotOk(spy.calledThrice);
        });

        it("is true after calling the spy thrice", function () {
            spy();
            spy();
            spy();

            assert(spy.calledThrice);
        });

        it("is false after calling the spy four times", function () {
            spy();
            spy();
            spy();
            spy();

            assert.isNotOk(spy.calledThrice);
        });
    });

    describe(".callCount", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("reports 0 calls", function () {
            assert.equal(spy.callCount, 0);
        });

        it("records one call", function () {
            spy();

            assert.equal(spy.callCount, 1);
        });

        it("records two calls", function () {
            spy();
            spy();

            assert.equal(spy.callCount, 2);
        });

        it("increases call count for each call", function () {
            spy();
            spy();
            assert.equal(spy.callCount, 2);

            spy();
            assert.equal(spy.callCount, 3);
        });
    });

    describe(".calledOn", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("is false if spy wasn't called", function () {
            assert.isNotOk(spy.calledOn({}));
        });

        it("is true if called with thisValue", function () {
            const object = {};
            spy.call(object);

            assert(spy.calledOn(object));
        });

        it("returns false if not called on object", function () {
            const object = {};
            spy.call(object);
            spy();

            assert.isNotOk(spy.calledOn({}));
        });

        it("is true if called with matcher that returns true", function () {
            const matcher = $match(function () {
                return true;
            });
            spy();

            assert(spy.calledOn(matcher));
        });

        it("is false if called with matcher that returns false", function () {
            const matcher = $match(function () {
                return false;
            });
            spy();

            assert.isNotOk(spy.calledOn(matcher));
        });

        it("invokes matcher.test with given object", function () {
            const expected = {};
            let actual;
            spy.call(expected);

            spy.calledOn($match(function (value) {
                actual = value;
            }));

            assert.deepEqual(actual, expected);
        });
    });

    describe(".alwaysCalledOn", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("is false prior to calling the spy", function () {
            assert.isNotOk(spy.alwaysCalledOn({}));
        });

        it("is true if called with thisValue once", function () {
            const object = {};
            spy.call(object);

            assert(spy.alwaysCalledOn(object));
        });

        it("is true if called with thisValue many times", function () {
            const object = {};
            spy.call(object);
            spy.call(object);
            spy.call(object);
            spy.call(object);

            assert(spy.alwaysCalledOn(object));
        });

        it("is false if called with another object atleast once", function () {
            const object = {};
            spy.call(object);
            spy.call(object);
            spy.call(object);
            spy();
            spy.call(object);

            assert.isNotOk(spy.alwaysCalledOn(object));
        });

        it("is false if never called with expected object", function () {
            const object = {};
            spy();
            spy();
            spy();

            assert.isNotOk(spy.alwaysCalledOn(object));
        });
    });

    describe(".calledWithNew", function () {
        let Spy;
        beforeEach(function () {
            Spy = createSpy.create();
        });

        it("is false if spy wasn't called", function () {
            assert.isNotOk(Spy.calledWithNew());
        });

        it("is true if called with new", function () {
            new Spy();
            assert(Spy.calledWithNew());
        });

        it("is true if called with new on custom constructor", function () {
            function MyThing() {}
            MyThing.prototype = {};
            const ns = { MyThing };
            createSpy(ns, "MyThing");

            const result = new ns.MyThing(); // eslint-disable-line no-unused-vars
            assert(ns.MyThing.calledWithNew());
        });

        it("is false if called as function", function () {
            Spy();

            assert.isNotOk(Spy.calledWithNew());
        });

        it("is true newed constructor returns object", function () {
            function MyThing() {
                return {};
            }
            const object = { MyThing };
            createSpy(object, "MyThing");

            new object.MyThing();

            assert(object.MyThing.calledWithNew());
        });

        const applyableNatives = (function () {
            try {
                console.log.apply({}, []); // eslint-disable-line no-console
                return true;
            } catch (e) {
                return false;
            }
        }());
        if (applyableNatives) {
            describe("spied native function", function () {
                it("is false when called on spied native function", function () {
                    const log = { info: console.log }; // eslint-disable-line no-console
                    createSpy(log, "info");

                    log.info("test");

                    assert.isNotOk(log.info.calledWithNew());
                });
            });
        }
    });

    describe(".alwaysCalledWithNew", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("is false if spy wasn't called", function () {
            assert.isNotOk(spy.alwaysCalledWithNew());
        });

        it("is true if always called with new", function () {
            /*eslint-disable no-unused-vars, new-cap*/
            const result = new spy();
            const result2 = new spy();
            const result3 = new spy();
            /*eslint-enable no-unused-vars, new-cap*/

            assert(spy.alwaysCalledWithNew());
        });

        it("is false if called as function once", function () {
            /*eslint-disable no-unused-vars, new-cap*/
            const result = new spy();
            const result2 = new spy();
            /*eslint-enable no-unused-vars, new-cap*/
            spy();

            assert.isNotOk(spy.alwaysCalledWithNew());
        });
    });

    describe(".thisValues", function () {
        const testObj = {};
        beforeEach(function () {
            testObj.spy = createSpy.create();
        });

        it("contains one object", function () {
            const object = {};
            testObj.spy.call(object);

            assert.deepEqual(testObj.spy.thisValues, [object]);
        });

        it("stacks up objects", function () {
            function MyConstructor() {}
            const objects = [{}, [], new MyConstructor(), { id: 243 }];
            testObj.spy();
            testObj.spy.call(objects[0]);
            testObj.spy.call(objects[1]);
            testObj.spy.call(objects[2]);
            testObj.spy.call(objects[3]);

            assert.deepEqual(testObj.spy.thisValues, [testObj].concat(objects));
        });
    });

    describe(".calledWith", spyCalledTests("calledWith"));
    describe(".calledWithMatch", spyCalledTests("calledWithMatch"));

    describe(".calledWithMatchSpecial", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("checks substring match", function () {
            spy("I like it");

            assert(spy.calledWithMatch("like"));
            assert.isNotOk(spy.calledWithMatch("nope"));
        });

        it("checks for regexp match", function () {
            spy("I like it");

            assert(spy.calledWithMatch(/[a-z ]+/i));
            assert.isNotOk(spy.calledWithMatch(/[0-9]+/));
        });

        it("checks for partial object match", function () {
            spy({ foo: "foo", bar: "bar" });

            assert(spy.calledWithMatch({ bar: "bar" }));
            assert.isNotOk(spy.calledWithMatch({ same: "same" }));
        });
    });

    describe(".alwaysCalledWith", spyAlwaysCalledTests("alwaysCalledWith"));
    describe(".alwaysCalledWithMatch", spyAlwaysCalledTests("alwaysCalledWithMatch"));

    describe(".alwaysCalledWithMatchSpecial", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("checks true", function () {
            spy(true);

            assert(spy.alwaysCalledWithMatch(true));
            assert.isNotOk(spy.alwaysCalledWithMatch(false));
        });

        it("checks false", function () {
            spy(false);

            assert(spy.alwaysCalledWithMatch(false));
            assert.isNotOk(spy.alwaysCalledWithMatch(true));
        });

        it("checks substring match", function () {
            spy("test case");
            spy("some test");
            spy("all tests");

            assert(spy.alwaysCalledWithMatch("test"));
            assert.isNotOk(spy.alwaysCalledWithMatch("case"));
        });

        it("checks regexp match", function () {
            spy("1");
            spy("2");
            spy("3");

            assert(spy.alwaysCalledWithMatch(/[123]/));
            assert.isNotOk(spy.alwaysCalledWithMatch(/[12]/));
        });

        it("checks partial object match", function () {
            spy({ a: "a", b: "b" });
            spy({ c: "c", b: "b" });
            spy({ b: "b", d: "d" });

            assert(spy.alwaysCalledWithMatch({ b: "b" }));
            assert.isNotOk(spy.alwaysCalledWithMatch({ a: "a" }));
        });
    });

    describe(".neverCalledWith", spyNeverCalledTests("neverCalledWith"));
    describe(".neverCalledWithMatch", spyNeverCalledTests("neverCalledWithMatch"));

    describe(".neverCalledWithMatchSpecial", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("checks substring match", function () {
            spy("a test", "b test");

            assert(spy.neverCalledWithMatch("a", "a"));
            assert(spy.neverCalledWithMatch("b", "b"));
            assert(spy.neverCalledWithMatch("b", "a"));
            assert.isNotOk(spy.neverCalledWithMatch("a", "b"));
        });

        it("checks regexp match", function () {
            spy("a test", "b test");

            assert(spy.neverCalledWithMatch(/a/, /a/));
            assert(spy.neverCalledWithMatch(/b/, /b/));
            assert(spy.neverCalledWithMatch(/b/, /a/));
            assert.isNotOk(spy.neverCalledWithMatch(/a/, /b/));
        });

        it("checks partial object match", function () {
            spy({ a: "test", b: "test" });

            assert(spy.neverCalledWithMatch({ a: "nope" }));
            assert(spy.neverCalledWithMatch({ c: "test" }));
            assert.isNotOk(spy.neverCalledWithMatch({ b: "test" }));
        });
    });

    describe(".args", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("contains real arrays", function () {
            spy();

            assert.isArray(spy.args[0]);
        });

        it("contains empty array when no arguments", function () {
            spy();

            assert.deepEqual(spy.args, [[]]);
        });

        it("contains array with first call's arguments", function () {
            spy(1, 2, 3);

            assert.deepEqual(spy.args, [[1, 2, 3]]);
        });

        it("stacks up arguments in nested array", function () {
            const objects = [{}, [], { id: 324 }];
            spy(1, objects[0], 3);
            spy(1, 2, objects[1]);
            spy(objects[2], 2, 3);

            assert.deepEqual(spy.args, [
                [1, objects[0], 3],
                [1, 2, objects[1]],
                [objects[2], 2, 3]
            ]);
        });
    });

    describe(".calledWithExactly", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("returns false for partial match", function () {
            spy(1, 2, 3);

            assert.isNotOk(spy.calledWithExactly(1, 2));
        });

        it("returns false for missing arguments", function () {
            spy(1, 2, 3);

            assert.isNotOk(spy.calledWithExactly(1, 2, 3, 4));
        });

        it("returns true for exact match", function () {
            spy(1, 2, 3);

            assert(spy.calledWithExactly(1, 2, 3));
        });

        it("matchs by strict comparison", function () {
            spy({}, []);

            assert.isNotOk(spy.calledWithExactly({}, [], null));
        });

        it("returns true for one exact match", function () {
            const object = {};
            const array = [];
            spy({}, []);
            spy(object, []);
            spy(object, array);

            assert(spy.calledWithExactly(object, array));
        });

        it("returns true when all properties of an object argument match", function () {
            spy({a: 1, b: 2, c: 3});

            assert(spy.calledWithExactly({a: 1, b: 2, c: 3}));
        });

        it("returns false when a property of an object argument is set to undefined", function () {
            spy({a: 1, b: 2, c: 3});

            assert.isNotOk(spy.calledWithExactly({a: 1, b: 2, c: undefined}));
        });

        it("returns false when a property of an object argument is set to a different value", function () {
            spy({a: 1, b: 2, c: 3});

            assert.isNotOk(spy.calledWithExactly({a: 1, b: 2, c: "blah"}));
        });

        it("returns false when an object argument has a different property/value pair", function () {
            spy({a: 1, b: 2, c: 3});

            assert.isNotOk(spy.calledWithExactly({a: 1, b: 2, foo: "blah"}));
        });

        it("returns false when property of Object argument is set to undefined and has a different name", function () {
            spy({a: 1, b: 2, c: 3});

            assert.isNotOk(spy.calledWithExactly({a: 1, b: 2, foo: undefined}));
        });

        it("returns false when any properties of an object argument aren't present", function () {
            spy({a: 1, b: 2, c: 3});

            assert.isNotOk(spy.calledWithExactly({a: 1, b: 2}));
        });

        it("returns false when an object argument has extra properties", function () {
            spy({a: 1, b: 2, c: 3});

            assert.isNotOk(spy.calledWithExactly({a: 1, b: 2, c: 3, d: 4}));
        });
    });

    describe(".alwaysCalledWithExactly", function () {
        let spy;
        beforeEach(function () {
            spy = createSpy.create();
        });

        it("returns false for partial match", function () {
            spy(1, 2, 3);

            assert.isNotOk(spy.alwaysCalledWithExactly(1, 2));
        });

        it("returns false for missing arguments", function () {
            spy(1, 2, 3);

            assert.isNotOk(spy.alwaysCalledWithExactly(1, 2, 3, 4));
        });

        it("returns true for exact match", function () {
            spy(1, 2, 3);

            assert(spy.alwaysCalledWithExactly(1, 2, 3));
        });

        it("returns false for excess arguments", function () {
            spy({}, []);

            assert.isNotOk(spy.alwaysCalledWithExactly({}, [], null));
        });

        it("returns false for one exact match", function () {
            const object = {};
            const array = [];
            spy({}, []);
            spy(object, []);
            spy(object, array);

            assert(spy.alwaysCalledWithExactly(object, array));
        });

        it("returns true for only exact matches", function () {
            const object = {};
            const array = [];

            spy(object, array);
            spy(object, array);
            spy(object, array);

            assert(spy.alwaysCalledWithExactly(object, array));
        });

        it("returns false for no exact matches", function () {
            const object = {};
            const array = [];

            spy(object, array, null);
            spy(object, array, undefined);
            spy(object, array, "");

            assert.isNotOk(spy.alwaysCalledWithExactly(object, array));
        });
    });

    describe(".threw", function () {
        let spy;
        let spyWithTypeError;
        let spyWithStringError;
        beforeEach(function () {
            spy = createSpy.create();

            spyWithTypeError = createSpy.create(function () {
                throw new TypeError();
            });

            spyWithStringError = createSpy.create(function () {
                throw "error";
            });
        });

        it("returns exception thrown by function", function () {
            const err = new Error();

            const spy = createSpy.create(function () {
                throw err;
            });

            try {
                spy();
            }            catch (e) {} // eslint-disable-line no-empty

            assert(spy.threw(err));
        });

        it("returns false if spy did not throw", function () {
            spy();

            assert.isNotOk(spy.threw());
        });

        it("returns true if spy threw", function () {
            try {
                spyWithTypeError();
            }            catch (e) {} // eslint-disable-line no-empty

            assert(spyWithTypeError.threw());
        });

        it("returns true if string type matches", function () {
            try {
                spyWithTypeError();
            }            catch (e) {} // eslint-disable-line no-empty

            assert(spyWithTypeError.threw("TypeError"));
        });

        it("returns false if string did not match", function () {
            try {
                spyWithTypeError();
            }            catch (e) {} // eslint-disable-line no-empty

            assert.isNotOk(spyWithTypeError.threw("Error"));
        });

        it("returns false if spy did not throw specified error", function () {
            spy();

            assert.isNotOk(spy.threw("Error"));
        });

        it("returns true if string matches", function () {
            try {
                spyWithStringError();
            }            catch (e) {} // eslint-disable-line no-empty

            assert(spyWithStringError.threw("error"));
        });

        it("returns false if strings do not match", function () {
            try {
                spyWithStringError();
            }            catch (e) {} // eslint-disable-line no-empty

            assert.isNotOk(spyWithStringError.threw("not the error"));
        });
    });

    describe(".alwaysThrew", function () {
        let spy;
        let spyWithTypeError;
        beforeEach(function () {
            spy = createSpy.create();

            spyWithTypeError = createSpy.create(function () {
                throw new TypeError();
            });
        });

        it("returns true when spy threw", function () {
            const err = new Error();

            const spy = createSpy.create(function () {
                throw err;
            });

            try {
                spy();
            }            catch (e) {} // eslint-disable-line no-empty

            assert(spy.alwaysThrew(err));
        });

        it("returns false if spy did not throw", function () {
            spy();

            assert.isNotOk(spy.alwaysThrew());
        });

        it("returns true if spy threw", function () {
            try {
                spyWithTypeError();
            }            catch (e) {} // eslint-disable-line no-empty

            assert(spyWithTypeError.alwaysThrew());
        });

        it("returns true if string type matches", function () {
            try {
                spyWithTypeError();
            }            catch (e) {} // eslint-disable-line no-empty

            assert(spyWithTypeError.alwaysThrew("TypeError"));
        });

        it("returns false if string did not match", function () {
            try {
                spyWithTypeError();
            }            catch (e) {} // eslint-disable-line no-empty

            assert.isNotOk(spyWithTypeError.alwaysThrew("Error"));
        });

        it("returns false if spy did not throw specified error", function () {
            spy();

            assert.isNotOk(spy.alwaysThrew("Error"));
        });

        it("returns false if some calls did not throw", function () {
            let callCount = 0;

            spy = createSpy(function () {
                callCount += 1;
                if (callCount === 1) {
                    throw new Error("throwing on first call");
                }
            });

            try {
                spy();
            } catch (e) {} // eslint-disable-line no-empty

            spy();

            assert.isNotOk(spy.alwaysThrew());
        });

        it("returns true if all calls threw", function () {
            try {
                spyWithTypeError();
            } catch (e1) {} // eslint-disable-line no-empty

            try {
                spyWithTypeError();
            } catch (e2) {} // eslint-disable-line no-empty

            assert(spyWithTypeError.alwaysThrew());
        });

        it("returns true if all calls threw same type", function () {
            try {
                spyWithTypeError();
            } catch (e1) {} // eslint-disable-line no-empty

            try {
                spyWithTypeError();
            } catch (e2) {} // eslint-disable-line no-empty

            assert(spyWithTypeError.alwaysThrew("TypeError"));
        });
    });

    describe(".exceptions", function () {
        let spy;
        let spyWithTypeError;
        let error;
        beforeEach(function () {
            spy = createSpy.create();
            error = {};

            spyWithTypeError = createSpy.create(function () {
                throw error;
            });
        });

        it("contains exception thrown by function", function () {
            try {
                spyWithTypeError();
            } catch (e) {} // eslint-disable-line no-empty

            assert.deepEqual(spyWithTypeError.exceptions, [error]);
        });

        it("contains undefined entry when function did not throw", function () {
            spy();

            assert.equal(spy.exceptions.length, 1);
            assert.isUndefined(spy.exceptions[0]);
        });

        it("stacks up exceptions and undefined", function () {
            let calls = 0;

            const spy = createSpy.create(function () {
                calls += 1;

                if (calls % 2 === 0) {
                    throw error;
                }
            });

            spy();

            try {
                spy();
            } catch (e1) {} // eslint-disable-line no-empty

            spy();

            try {
                spy();
            } catch (e2) {} // eslint-disable-line no-empty

            spy();

            assert.equal(spy.exceptions.length, 5);
            assert.isUndefined(spy.exceptions[0]);
            assert.equal(spy.exceptions[1], error);
            assert.isUndefined(spy.exceptions[2]);
            assert.equal(spy.exceptions[3], error);
            assert.isUndefined(spy.exceptions[4]);
        });
    });

    describe(".returned", function () {
        it("returns true when no argument", function () {
            const spy = createSpy.create();
            spy();

            assert(spy.returned());
        });

        it("returns true for undefined when no explicit return", function () {
            const spy = createSpy.create();
            spy();

            assert(spy.returned(undefined));
        });

        it("returns true when returned value once", function () {
            const values = [{}, 2, "hey", function () {}];
            const spy = createSpy.create(function () {
                return values[spy.callCount];
            });

            spy();
            spy();
            spy();
            spy();

            assert(spy.returned(values[3]));
        });

        it("returns false when value is never returned", function () {
            const values = [{}, 2, "hey", function () {}];
            const spy = createSpy.create(function () {
                return values[spy.callCount];
            });

            spy();
            spy();
            spy();
            spy();

            assert.isNotOk(spy.returned({ id: 42 }));
        });

        it("returns true when value is returned several times", function () {
            const object = { id: 42 };
            const spy = createSpy.create(function () {
                return object;
            });

            spy();
            spy();
            spy();

            assert(spy.returned(object));
        });

        it("compares values deeply", function () {
            const object = { deep: { id: 42 } };
            const spy = createSpy.create(function () {
                return object;
            });

            spy();

            assert(spy.returned({ deep: { id: 42 } }));
        });

        it("compares values strictly using match.same", function () {
            const object = { id: 42 };
            const spy = createSpy.create(function () {
                return object;
            });

            spy();

            assert.isNotOk(spy.returned($match.same({ id: 42 })));
            assert(spy.returned($match.same(object)));
        });
    });

    describe(".returnValues", function () {
        it("contains undefined when function does not return explicitly", function () {
            const spy = createSpy.create();
            spy();

            assert.equal(spy.returnValues.length, 1);
            assert.isUndefined(spy.returnValues[0]);
        });

        it("contains return value", function () {
            const object = { id: 42 };

            const spy = createSpy.create(function () {
                return object;
            });

            spy();

            assert.deepEqual(spy.returnValues, [object]);
        });

        it("contains undefined when function throws", function () {
            const spy = createSpy.create(function () {
                throw new Error();
            });

            try {
                spy();
            } catch (e) {} // eslint-disable-line no-empty

            assert.equal(spy.returnValues.length, 1);
            assert.isUndefined(spy.returnValues[0]);
        });

        it("contains the created object for spied constructors", function () {
            const Spy = createSpy.create(function () { });

            const result = new Spy();

            assert.equal(Spy.returnValues[0], result);
        });

        it("contains the return value for spied constructors that explicitly return objects", function () {
            const Spy = createSpy.create(function () {
                return { isExplicitlyCreatedValue: true };
            });

            const result = new Spy();

            assert.isTrue(result.isExplicitlyCreatedValue);
            assert.equal(Spy.returnValues[0], result);
        });

        it("contains the created object for spied constructors that explicitly return primitive values", function () {
            const Spy = createSpy.create(function () {
                return 10;
            });

            const result = new Spy();

            assert.notEqual(result, 10);
            assert.equal(Spy.returnValues[0], result);
        });

        it("stacks up return values", function () {
            let calls = 0;

            /*eslint consistent-return: "off"*/
            const spy = createSpy.create(function () {
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

    describe(".calledBefore", function () {
        let spy1;
        let spy2;
        beforeEach(function () {
            spy1 = createSpy();
            spy2 = createSpy();
        });

        it("is function", function () {
            assert.isFunction(spy1.calledBefore);
        });

        it("returns true if first call to A was before first to B", function () {
            spy1();
            spy2();

            assert(spy1.calledBefore(spy2));
        });

        it("compares call order of calls directly", function () {
            spy1();
            spy2();

            assert(spy1.getCall(0).calledBefore(spy2.getCall(0)));
        });

        it("returns false if not called", function () {
            spy2();

            assert.isNotOk(spy1.calledBefore(spy2));
        });

        it("returns true if other not called", function () {
            spy1();

            assert(spy1.calledBefore(spy2));
        });

        it("returns false if other called first", function () {
            spy2();
            spy1();
            spy2();

            assert(spy1.calledBefore(spy2));
        });
    });

    describe(".calledAfter", function () {
        let spy1;
        let spy2;
        beforeEach(function () {
            spy1 = createSpy();
            spy2 = createSpy();
        });

        it("is function", function () {
            assert.isFunction(spy1.calledAfter);
        });

        it("returns true if first call to A was after first to B", function () {
            spy2();
            spy1();

            assert(spy1.calledAfter(spy2));
        });

        it("compares calls directly", function () {
            spy2();
            spy1();

            assert(spy1.getCall(0).calledAfter(spy2.getCall(0)));
        });

        it("returns false if not called", function () {
            spy2();

            assert.isNotOk(spy1.calledAfter(spy2));
        });

        it("returns false if other not called", function () {
            spy1();

            assert.isNotOk(spy1.calledAfter(spy2));
        });

        it("returns false if other called last", function () {
            spy2();
            spy1();
            spy2();

            assert.isNotOk(spy1.calledAfter(spy2));
        });
    });

    describe(".firstCall", function () {
        it("is undefined by default", function () {
            const spy = createSpy();

            assert.isNull(spy.firstCall);
        });

        it("is equal to getCall(0) result after first call", function () {
            const spy = createSpy();

            spy();

            const call0 = spy.getCall(0);
            assert.equal(spy.firstCall.callId, call0.callId);
            assert.deepEqual(spy.firstCall.spy, call0.spy);
        });

        it("is equal to getCall(0) after first call when control flow has continued after invocation", function () {

            function runAsserts() {
                const call0 = spy.getCall(0);
                assert.equal(spy.firstCall.callId, call0.callId);
                assert.deepEqual(spy.firstCall.spy, call0.spy);
            }

            const spy = createSpy(runAsserts);

            spy();
        });

        it("is tracked even if exceptions are thrown", function () {
            const spy = createSpy(function () {
                throw "an exception";
            });

            try {
                spy();
            }            catch (e) {} // eslint-disable-line no-empty

            assert.isNotNull(spy.firstCall);
        });

        it("has correct returnValue", function () {
            const spy = createSpy(function () {
                return 42;
            });

            spy();

            assert.equal(spy.firstCall.returnValue, 42);
            assert(spy.firstCall.returned(42));
        });

        it("has correct exception", function () {
            const err = new Error();
            const spy = createSpy(function () {
                throw err;
            });

            try {
                spy();
            }            catch (e) {} // eslint-disable-line no-empty

            assert.deepEqual(spy.firstCall.exception, err);
            assert(spy.firstCall.threw(err));
        });

    });

    describe(".secondCall", function () {
        it("is null by default", function () {
            const spy = createSpy();

            assert.isNull(spy.secondCall);
        });

        it("stills be null after first call", function () {
            const spy = createSpy();
            spy();

            assert.isNull(spy.secondCall);
        });

        it("is equal to getCall(1) result after second call", function () {
            const spy = createSpy();

            spy();
            spy();

            const call1 = spy.getCall(1);
            assert.equal(spy.secondCall.callId, call1.callId);
            assert.deepEqual(spy.secondCall.spy, call1.spy);
        });
    });

    describe(".thirdCall", function () {
        it("is undefined by default", function () {
            const spy = createSpy();

            assert.isNull(spy.thirdCall);
        });

        it("stills be undefined after second call", function () {
            const spy = createSpy();
            spy();
            spy();

            assert.isNull(spy.thirdCall);
        });

        it("is equal to getCall(1) result after second call", function () {
            const spy = createSpy();

            spy();
            spy();
            spy();

            const call2 = spy.getCall(2);
            assert.equal(spy.thirdCall.callId, call2.callId);
            assert.deepEqual(spy.thirdCall.spy, call2.spy);
        });
    });

    describe(".lastCall", function () {
        it("is undefined by default", function () {
            const spy = createSpy();

            assert.isNull(spy.lastCall);
        });

        it("is same as firstCall after first call", function () {
            const spy = createSpy();

            spy();

            assert.deepEqual(spy.lastCall.callId, spy.firstCall.callId);
            assert.deepEqual(spy.lastCall.spy, spy.firstCall.spy);
        });

        it("is same as secondCall after second call", function () {
            const spy = createSpy();

            spy();
            spy();

            assert.deepEqual(spy.lastCall.callId, spy.secondCall.callId);
            assert.deepEqual(spy.lastCall.spy, spy.secondCall.spy);
        });

        it("is same as thirdCall after third call", function () {
            const spy = createSpy();

            spy();
            spy();
            spy();

            assert.deepEqual(spy.lastCall.callId, spy.thirdCall.callId);
            assert.deepEqual(spy.lastCall.spy, spy.thirdCall.spy);
        });

        it("is equal to getCall(3) result after fourth call", function () {
            const spy = createSpy();

            spy();
            spy();
            spy();
            spy();

            const call3 = spy.getCall(3);
            assert.equal(spy.lastCall.callId, call3.callId);
            assert.deepEqual(spy.lastCall.spy, call3.spy);
        });

        it("is equal to getCall(4) result after fifth call", function () {
            const spy = createSpy();

            spy();
            spy();
            spy();
            spy();
            spy();

            const call4 = spy.getCall(4);
            assert.equal(spy.lastCall.callId, call4.callId);
            assert.deepEqual(spy.lastCall.spy, call4.spy);
        });
    });

    describe(".getCalls", function () {
        it("returns an empty Array by default", function () {
            const spy = createSpy();

            assert.isArray(spy.getCalls());
            assert.equal(spy.getCalls().length, 0);
        });

        it("is analogous to using getCall(n)", function () {
            const spy = createSpy();

            spy();
            spy();

            assert.deepEqual(spy.getCalls(), [spy.getCall(0), spy.getCall(1)]);
        });
    });

    describe(".callArg", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.callArg);
        });

        it("invokes argument at index for all calls", function () {
            const spy = createSpy();
            const callback = createSpy();
            spy(1, 2, callback);
            spy(3, 4, callback);

            spy.callArg(2);

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
        });

        it("throws if argument at index is not a function", function () {
            const spy = createSpy();
            spy();

            assert.throw(function () {
                spy.callArg(1);
            }, TypeError);
        });

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();

            try {
                spy.callArg(0);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "spy cannot call arg since it was not yet invoked.");
            }
        });

        it("includes spy name in error message", function () {
            const api = { someMethod() {} };
            const spy = createSpy(api, "someMethod");

            try {
                spy.callArg(0);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "someMethod cannot call arg since it was not yet invoked.");
            }
        });

        it("throws if index is not a number", function () {
            const spy = createSpy();
            spy();

            assert.throw(function () {
                spy.callArg("");
            }, TypeError);
        });

        it("passs additional arguments", function () {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            spy(callback);

            spy.callArg(0, "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
        });
    });

    describe(".callArgOn", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.callArgOn);
        });

        it("invokes argument at index for all calls", function () {
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

        it("throws if argument at index is not a function", function () {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy();

            assert.throw(function () {
                spy.callArgOn(1, thisObj);
            }, TypeError);
        });

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            try {
                spy.callArgOn(0, thisObj);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "spy cannot call arg since it was not yet invoked.");
            }
        });

        it("includes spy name in error message", function () {
            const api = { someMethod() {} };
            const spy = createSpy(api, "someMethod");
            const thisObj = { name1: "value1", name2: "value2" };

            try {
                spy.callArgOn(0, thisObj);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "someMethod cannot call arg since it was not yet invoked.");
            }
        });

        it("throws if index is not a number", function () {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy();

            assert.throw(function () {
                spy.callArg("", thisObj);
            }, TypeError);
        });

        it("pass additional arguments", function () {
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

    describe(".callArgWith", function () {
        it("is alias for callArg", function () {
            const spy = createSpy();

            assert.deepEqual(spy.callArgWith, spy.callArg);
        });
    });

    describe(".callArgOnWith", function () {
        it("is alias for callArgOn", function () {
            const spy = createSpy();

            assert.deepEqual(spy.callArgOnWith, spy.callArgOn);
        });
    });

    describe(".yield", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.yield);
        });

        it("invokes first function arg for all calls", function () {
            const spy = createSpy();
            const callback = createSpy();
            spy(1, 2, callback);
            spy(3, 4, callback);

            spy.yield();

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
        });

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();

            try {
                spy.yield();
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "spy cannot yield since it was not yet invoked.");
            }
        });

        it("includes spy name in error message", function () {
            const api = { someMethod() {} };
            const spy = createSpy(api, "someMethod");

            try {
                spy.yield();
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "someMethod cannot yield since it was not yet invoked.");
            }
        });

        it("passs additional arguments", function () {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            spy(callback);

            spy.yield("abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
        });
    });

    describe(".invokeCallback", function () {
        it("is alias for yield", function () {
            const spy = createSpy();

            assert.deepEqual(spy.invokeCallback, spy.yield);
        });
    });

    describe(".yieldOn", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.yieldOn);
        });

        it("invokes first function arg for all calls", function () {
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

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            try {
                spy.yieldOn(thisObj);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "spy cannot yield since it was not yet invoked.");
            }
        });

        it("includes spy name in error message", function () {
            const api = { someMethod() {} };
            const spy = createSpy(api, "someMethod");
            const thisObj = { name1: "value1", name2: "value2" };

            try {
                spy.yieldOn(thisObj);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "someMethod cannot yield since it was not yet invoked.");
            }
        });

        it("pass additional arguments", function () {
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

    describe(".yieldTo", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.yieldTo);
        });

        it("invokes first function arg for all calls", function () {
            const spy = createSpy();
            const callback = createSpy();
            spy(1, 2, { success: callback });
            spy(3, 4, { success: callback });

            spy.yieldTo("success");

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
        });

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();

            try {
                spy.yieldTo("success");
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "spy cannot yield to 'success' since it was not yet invoked.");
            }
        });

        it("includes spy name in error message", function () {
            const api = { someMethod() {} };
            const spy = createSpy(api, "someMethod");

            try {
                spy.yieldTo("success");
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "someMethod cannot yield to 'success' since it was not yet invoked.");
            }
        });

        it("throws readable message for symbol when spy was not yet invoked", function () {
            if (typeof Symbol === "function") {
                const spy = createSpy();

                try {
                    spy.yieldTo(Symbol());
                } catch (e) {
                    assert.equal(e.message, "spy cannot yield to 'Symbol()' since it was not yet invoked.");
                }
            }
        });

        it("pass additional arguments", function () {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            spy({ test: callback });

            spy.yieldTo("test", "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
        });
    });

    describe(".yieldToOn", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.yieldToOn);
        });

        it("invokes first function arg for all calls", function () {
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

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            try {
                spy.yieldToOn("success", thisObj);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "spy cannot yield to 'success' since it was not yet invoked.");
            }
        });

        it("includes spy name in error message", function () {
            const api = { someMethod() {} };
            const spy = createSpy(api, "someMethod");
            const thisObj = { name1: "value1", name2: "value2" };

            try {
                spy.yieldToOn("success", thisObj);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "someMethod cannot yield to 'success' since it was not yet invoked.");
            }
        });

        it("throws readable message for symbol when spy was not yet invoked", function () {
            if (typeof Symbol === "function") {
                const spy = createSpy();
                const thisObj = { name1: "value1", name2: "value2" };

                try {
                    spy.yieldToOn(Symbol(), thisObj);
                } catch (e) {
                    assert.equal(e.message, "spy cannot yield to 'Symbol()' since it was not yet invoked.");
                }
            }
        });

        it("pass additional arguments", function () {
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

    describe(".reset", function () {
        it("return same object", function () {
            const spy = createSpy();
            const reset = spy.reset();

            assert(reset === spy);
        });

        it("throws if called during spy invocation", function () {
            const spy = createSpy(function () {
                spy.reset();
            });

            assert.throw(function () {
                spy();
            }, InvalidResetException);
        });
    });

    describe(".length", function () {
        it("is zero by default", function () {
            const spy = createSpy();

            assert.equal(spy.length, 0);
        });

        it("matches the function length", function () {
            const api = { someMethod(a, b, c) {} }; // eslint-disable-line no-unused-vars
            const spy = createSpy(api, "someMethod");

            assert.equal(spy.length, 3);
        });
    });
});
