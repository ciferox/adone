/* global it describe beforeEach afterEach assert */

import $spyCall from "adone/glosses/shani/mock/call";
import $spy from "adone/glosses/shani/mock/spy";
import $stub from "adone/glosses/shani/mock/stub";


let testObj;

function spyCallSetUp() {
    testObj = {};
    testObj.thisValue = {};
    testObj.args = [{}, [], new Error(), 3];
    testObj.returnValue = function () {};
    testObj.call = $spyCall(function () {}, testObj.thisValue,
        testObj.args, testObj.returnValue, null, 0);
}

function spyCallCallSetup() {
    testObj.args = [];
    testObj.proxy = $spy();
    testObj.call = $spyCall(testObj.proxy, {}, testObj.args, null, null, 0);
}

function spyCallCalledTests(method) {
    return function () {
        beforeEach(spyCallSetUp);

        it("returns true if all args match", function () {
            const args = testObj.args;

            assert(testObj.call[method](args[0], args[1], args[2]));
        });

        it("returns true if first args match", function () {
            const args = testObj.args;

            assert(testObj.call[method](args[0], args[1]));
        });

        it("returns true if first arg match", function () {
            const args = testObj.args;

            assert(testObj.call[method](args[0]));
        });

        it("returns true for no args", function () {
            assert(testObj.call[method]());
        });

        it("returns false for too many args", function () {
            const args = testObj.args;

            assert.isFalse(testObj.call[method](args[0], args[1], args[2], args[3], {}));
        });

        it("returns false for wrong arg", function () {
            const args = testObj.args;

            assert.isFalse(testObj.call[method](args[0], args[2]));
        });
    };
}

function spyCallNotCalledTests(method) {
    return function () {
        beforeEach(spyCallSetUp);

        it("returns false if all args match", function () {
            const args = testObj.args;

            assert.isFalse(testObj.call[method](args[0], args[1], args[2]));
        });

        it("returns false if first args match", function () {
            const args = testObj.args;

            assert.isFalse(testObj.call[method](args[0], args[1]));
        });

        it("returns false if first arg match", function () {
            const args = testObj.args;

            assert.isFalse(testObj.call[method](args[0]));
        });

        it("returns false for no args", function () {
            assert.isFalse(testObj.call[method]());
        });

        it("returns true for too many args", function () {
            const args = testObj.args;

            assert(testObj.call[method](args[0], args[1], args[2], args[3], {}));
        });

        it("returns true for wrong arg", function () {
            const args = testObj.args;

            assert(testObj.call[method](args[0], args[2]));
        });
    };
}


describe("$spy.call", function () {

    describe("call object", function () {
        beforeEach(spyCallSetUp);

        it("gets call object", function () {
            const spy = $spy.create();
            spy();
            const firstCall = spy.getCall(0);

            assert.isFunction(firstCall.calledOn);
            assert.isFunction(firstCall.calledWith);
            assert.isFunction(firstCall.returned);
        });

        it("stores given call id", function () {
            const call = $spyCall(function () {}, {}, [], null, null, 42);

            assert.strictEqual(call.callId, 42);
        });

        it("throws if callId is undefined", function () {
            assert.throw(function () {
                $spyCall.create(function () {}, {}, []);
            });
        });

        // This is actually a spy test:
        it("records ascending call id's", function () {
            const spy = $spy();
            spy();

            assert(testObj.call.callId < spy.getCall(0).callId);
        });

        it("exposes thisValue property", function () {
            const spy = $spy();
            const obj = {};
            spy.call(obj);

            assert.strictEqual(spy.getCall(0).thisValue, obj);
        });
    });

    describe("call calledOn", function () {
        beforeEach(spyCallSetUp);

        it("calledOn should return true", function () {
            assert(testObj.call.calledOn(testObj.thisValue));
        });

        it("calledOn should return false", function () {
            assert.isFalse(testObj.call.calledOn({}));
        });
    });

    describe("call.calledWith", spyCallCalledTests("calledWith"));
    describe("call.calledWithMatch", spyCallCalledTests("calledWithMatch"));
    describe("call.notCalledWith", spyCallNotCalledTests("notCalledWith"));
    describe("call.notCalledWithMatch", spyCallNotCalledTests("notCalledWithMatch"));

    describe("call.calledWithExactly", function () {
        beforeEach(spyCallSetUp);

        it("returns true when all args match", function () {
            const args = testObj.args;

            assert(testObj.call.calledWithExactly(args[0], args[1], args[2], args[3]));
        });

        it("returns false for too many args", function () {
            const args = testObj.args;

            assert.isFalse(testObj.call.calledWithExactly(args[0], args[1], args[2], args[3], {}));
        });

        it("returns false for too few args", function () {
            const args = testObj.args;

            assert.isFalse(testObj.call.calledWithExactly(args[0], args[1]));
        });

        it("returns false for unmatching args", function () {
            const args = testObj.args;

            assert.isFalse(testObj.call.calledWithExactly(args[0], args[1], args[1]));
        });

        it("returns true for no arguments", function () {
            const call = $spyCall(function () {}, {}, [], null, null, 0);

            assert(call.calledWithExactly());
        });

        it("returns false when called with no args but matching one", function () {
            const call = $spyCall(function () {}, {}, [], null, null, 0);

            assert.isFalse(call.calledWithExactly({}));
        });
    });

    describe("call.callArg", function () {
        beforeEach(spyCallCallSetup);

        it("calls argument at specified index", function () {
            const callback = $spy();
            testObj.args.push(1, 2, callback);

            testObj.call.callArg(2);

            assert(callback.called);
        });

        it("throws if argument at specified index is not callable", function () {
            testObj.args.push(1);
            const call = testObj.call;

            assert.throw(function () {
                call.callArg(0);
            }, TypeError);
        });

        it("throws if no index is specified", function () {
            const call = testObj.call;

            assert.throw(function () {
                call.callArg();
            }, TypeError);
        });

        it("throws if index is not number", function () {
            const call = testObj.call;

            assert.throw(function () {
                call.callArg({});
            }, TypeError);
        });
    });

    describe("call.callArgOn", function () {
        beforeEach(spyCallCallSetup);

        it("calls argument at specified index", function () {
            const callback = $spy();
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push(1, 2, callback);

            testObj.call.callArgOn(2, thisObj);

            assert(callback.called);
            assert(callback.calledOn(thisObj));
        });

        it("throws if argument at specified index is not callable", function () {
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push(1);
            const call = testObj.call;

            assert.throw(function () {
                call.callArgOn(0, thisObj);
            }, TypeError);
        });

        it("throws if index is not number", function () {
            const thisObj = { name1: "value1", name2: "value2" };
            const call = testObj.call;

            assert.throw(function () {
                call.callArgOn({}, thisObj);
            }, TypeError);
        });
    });

    describe("call.callArgWith", function () {
        beforeEach(spyCallCallSetup);

        it("calls argument at specified index with provided args", function () {
            const object = {};
            const callback = $spy();
            testObj.args.push(1, callback);

            testObj.call.callArgWith(1, object);

            assert(callback.calledWith(object));
        });

        it("calls callback without args", function () {
            const callback = $spy();
            testObj.args.push(1, callback);

            testObj.call.callArgWith(1);

            assert(callback.calledWith());
        });

        it("calls callback wit multiple args", function () {
            const object = {};
            const array = [];
            const callback = $spy();
            testObj.args.push(1, 2, callback);

            testObj.call.callArgWith(2, object, array);

            assert(callback.calledWith(object, array));
        });

        it("throws if no index is specified", function () {
            const call = testObj.call;

            assert.throw(function () {
                call.callArgWith();
            }, TypeError);
        });

        it("throws if index is not number", function () {
            const call = testObj.call;

            assert.throw(function () {
                call.callArgWith({});
            }, TypeError);
        });
    });

    describe("call.callArgOnWith", function () {
        beforeEach(spyCallCallSetup);

        it("calls argument at specified index with provided args", function () {
            const object = {};
            const thisObj = { name1: "value1", name2: "value2" };
            const callback = $spy();
            testObj.args.push(1, callback);

            testObj.call.callArgOnWith(1, thisObj, object);

            assert(callback.calledWith(object));
            assert(callback.calledOn(thisObj));
        });

        it("calls callback without args", function () {
            const callback = $spy();
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push(1, callback);

            testObj.call.callArgOnWith(1, thisObj);

            assert(callback.calledWith());
            assert(callback.calledOn(thisObj));
        });

        it("calls callback with multiple args", function () {
            const object = {};
            const array = [];
            const thisObj = { name1: "value1", name2: "value2" };
            const callback = $spy();
            testObj.args.push(1, 2, callback);

            testObj.call.callArgOnWith(2, thisObj, object, array);

            assert(callback.calledWith(object, array));
            assert(callback.calledOn(thisObj));
        });

        it("throws if index is not number", function () {
            const thisObj = { name1: "value1", name2: "value2" };
            const call = testObj.call;

            assert.throw(function () {
                call.callArgOnWith({}, thisObj);
            }, TypeError);
        });
    });

    describe("call.yieldTest", function () {
        beforeEach(spyCallCallSetup);

        it("invokes only argument as callback", function () {
            const callback = $spy();
            testObj.args.push(callback);

            testObj.call.yield();

            assert(callback.calledOnce);
            assert.equal(callback.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const call = testObj.call;

            try {
                call.yield();
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "spy cannot yield since no callback was passed.");
            }
        });

        it("includes stub name and actual arguments in error", function () {
            testObj.proxy.displayName = "somethingAwesome";
            testObj.args.push(23, 42);
            const call = testObj.call;

            try {
                call.yield();
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "somethingAwesome cannot yield since no callback was passed. " +
                              "Received [23, 42]");
            }
        });

        it("invokes last argument as callback", function () {
            const spy = $spy();
            testObj.args.push(24, {}, spy);

            testObj.call.yield();

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes first of two callbacks", function () {
            const spy = $spy();
            const spy2 = $spy();
            testObj.args.push(24, {}, spy, spy2);

            testObj.call.yield();

            assert(spy.calledOnce);
            assert.isFalse(spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = $spy();
            testObj.args.push(spy);

            testObj.call.yield(obj, "Crazy");

            assert(spy.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            testObj.args.push(function () {
                throw new Error("d'oh!");
            });
            const call = testObj.call;

            assert.throw(function () {
                call.yield();
            });
        });
    });

    describe("call.invokeCallback", function () {

        it("is alias for yield", function () {
            const call = $spyCall(function () {}, {}, [], null, null, 0);

            assert.strictEqual(call.yield, call.invokeCallback);
        });

    });

    describe("call.yieldOnTest", function () {
        beforeEach(spyCallCallSetup);

        it("invokes only argument as callback", function () {
            const callback = $spy();
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push(callback);

            testObj.call.yieldOn(thisObj);

            assert(callback.calledOnce);
            assert(callback.calledOn(thisObj));
            assert.equal(callback.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const call = testObj.call;
            const thisObj = { name1: "value1", name2: "value2" };

            try {
                call.yieldOn(thisObj);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "spy cannot yield since no callback was passed.");
            }
        });

        it("includes stub name and actual arguments in error", function () {
            testObj.proxy.displayName = "somethingAwesome";
            testObj.args.push(23, 42);
            const call = testObj.call;
            const thisObj = { name1: "value1", name2: "value2" };

            try {
                call.yieldOn(thisObj);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "somethingAwesome cannot yield since no callback was passed. " +
                              "Received [23, 42]");
            }
        });

        it("invokes last argument as callback", function () {
            const spy = $spy();
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push(24, {}, spy);

            testObj.call.yieldOn(thisObj);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
            assert(spy.calledOn(thisObj));
        });

        it("invokes first of two callbacks", function () {
            const spy = $spy();
            const spy2 = $spy();
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push(24, {}, spy, spy2);

            testObj.call.yieldOn(thisObj);

            assert(spy.calledOnce);
            assert(spy.calledOn(thisObj));
            assert.isFalse(spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = $spy();
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push(spy);

            testObj.call.yieldOn(thisObj, obj, "Crazy");

            assert(spy.calledWith(obj, "Crazy"));
            assert(spy.calledOn(thisObj));
        });

        it("throws if callback throws", function () {
            testObj.args.push(function () {
                throw new Error("d'oh!");
            });
            const call = testObj.call;
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throw(function () {
                call.yieldOn(thisObj);
            });
        });
    });

    describe("call.yieldTo", function () {
        beforeEach(spyCallCallSetup);

        it("invokes only argument as callback", function () {
            const callback = $spy();
            testObj.args.push({
                success: callback
            });

            testObj.call.yieldTo("success");

            assert(callback.calledOnce);
            assert.equal(callback.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const call = testObj.call;

            try {
                call.yieldTo("success");
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "spy cannot yield to 'success' since no callback was passed.");
            }
        });

        it("includes stub name and actual arguments in error", function () {
            testObj.proxy.displayName = "somethingAwesome";
            testObj.args.push(23, 42);
            const call = testObj.call;

            try {
                call.yieldTo("success");
                throw new Error();
            } catch (e) {
                assert.equal(
                    e.message,
                    "somethingAwesome cannot yield to 'success' since no callback was passed. Received [23, 42]"
                );
            }
        });

        it("invokes property on last argument as callback", function () {
            const spy = $spy();
            testObj.args.push(24, {}, { success: spy });

            testObj.call.yieldTo("success");

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes first of two possible callbacks", function () {
            const spy = $spy();
            const spy2 = $spy();
            testObj.args.push(24, {}, { error: spy }, { error: spy2 });

            testObj.call.yieldTo("error");

            assert(spy.calledOnce);
            assert.isFalse(spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = $spy();
            testObj.args.push({ success: spy });

            testObj.call.yieldTo("success", obj, "Crazy");

            assert(spy.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            testObj.args.push({
                success() {
                    throw new Error("d'oh!");
                }
            });
            const call = testObj.call;

            assert.throw(function () {
                call.yieldTo("success");
            });
        });
    });

    describe("call.yieldToOn", function () {
        beforeEach(spyCallCallSetup);

        it("invokes only argument as callback", function () {
            const callback = $spy();
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push({
                success: callback
            });

            testObj.call.yieldToOn("success", thisObj);

            assert(callback.calledOnce);
            assert.equal(callback.args[0].length, 0);
            assert(callback.calledOn(thisObj));
        });

        it("throws understandable error if no callback is passed", function () {
            const call = testObj.call;
            const thisObj = { name1: "value1", name2: "value2" };

            try {
                call.yieldToOn("success", thisObj);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "spy cannot yield to 'success' since no callback was passed.");
            }
        });

        it("throws understandable error if symbol prop is not found", function () {
            if (typeof Symbol === "function") {
                const call = testObj.call;
                const symbol = Symbol();

                assert.throw(function () {
                    call.yieldToOn(symbol, {});
                }, "spy cannot yield to 'Symbol()' since no callback was passed.");
            }
        });

        it("includes stub name and actual arguments in error", function () {
            testObj.proxy.displayName = "somethingAwesome";
            testObj.args.push(23, 42);
            const call = testObj.call;
            const thisObj = { name1: "value1", name2: "value2" };

            try {
                call.yieldToOn("success", thisObj);
                throw new Error();
            } catch (e) {
                assert.equal(
                    e.message,
                    "somethingAwesome cannot yield to 'success' since no callback was passed. Received [23, 42]"
                );
            }
        });

        it("invokes property on last argument as callback", function () {
            const spy = $spy();
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push(24, {}, { success: spy });

            testObj.call.yieldToOn("success", thisObj);

            assert(spy.calledOnce);
            assert(spy.calledOn(thisObj));
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes first of two possible callbacks", function () {
            const spy = $spy();
            const spy2 = $spy();
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push(24, {}, { error: spy }, { error: spy2 });

            testObj.call.yieldToOn("error", thisObj);

            assert(spy.calledOnce);
            assert(spy.calledOn(thisObj));
            assert.isFalse(spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = $spy();
            const thisObj = { name1: "value1", name2: "value2" };
            testObj.args.push({ success: spy });

            testObj.call.yieldToOn("success", thisObj, obj, "Crazy");

            assert(spy.calledWith(obj, "Crazy"));
            assert(spy.calledOn(thisObj));
        });

        it("throws if callback throws", function () {
            testObj.args.push({
                success() {
                    throw new Error("d'oh!");
                }
            });
            const call = testObj.call;
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throw(function () {
                call.yieldToOn("success", thisObj);
            });
        });
    });

    describe("call.toString", function () {
        afterEach(function () {
            if (testObj && testObj.format) {
                testObj.format.restore();
            }
        });

        it("includes spy name", function () {
            const object = { doIt: $spy() };
            object.doIt();

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt()");
        });

        it("includes single argument", function () {
            const object = { doIt: $spy() };
            object.doIt(42);

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt(42)");
        });

        it("includes all arguments", function () {
            const object = { doIt: $spy() };
            object.doIt(42, "Hey");

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt(42, Hey)");
        });

        it("includes explicit return value", function () {
            const object = { doIt: $stub().returns(42) };
            object.doIt(42, "Hey");

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt(42, Hey) => 42");
        });

        it("includes empty string return value", function () {
            const object = { doIt: $stub().returns("") };
            object.doIt(42, "Hey");

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt(42, Hey) => ");
        });

        it("includes exception", function () {
            const object = { doIt: $stub().throws("TypeError") };

            try {
                object.doIt();
            }            catch (e) {} // eslint-disable-line no-empty

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt() !TypeError");
        });

        it("includes exception message if any", function () {
            const object = { doIt: $stub().throws("TypeError", "Oh noes!") };

            try {
                object.doIt();
            }            catch (e) {} // eslint-disable-line no-empty

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt() !TypeError(Oh noes!)");
        });

        // these tests are ensuring that call.toString is handled by format
        it("formats arguments with format", function () {
            const object = { doIt: $spy() };

            object.doIt(42);

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt(42)");
        });

        it("formats return value with format", function () {
            const object = { doIt: $stub().returns(42) };

            object.doIt();

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt() => 42");
        });
    });

    describe("constructor", function () {
        beforeEach(function () {
            testObj.CustomConstructor = function () {};
            testObj.customPrototype = testObj.CustomConstructor.prototype;
            $spy(testObj, "CustomConstructor");
        });

        it("creates original object", function () {
            const myInstance = new testObj.CustomConstructor();

            assert(testObj.customPrototype.isPrototypeOf(myInstance));
        });

        it("does not interfere with instanceof", function () {
            const myInstance = new testObj.CustomConstructor();

            assert(myInstance instanceof testObj.CustomConstructor);
        });

        it("records usage", function () {
            const myInstance = new testObj.CustomConstructor(); // eslint-disable-line no-unused-vars

            assert(testObj.CustomConstructor.called);
        });
    });

    describe("functions", function () {
        it("throws if spying on non-existent property", function () {
            const myObj = {};

            assert.throw(function () {
                $spy(myObj, "ouch");
            });

            assert.notProperty(myObj, "ouch");
        });

        it("throws if spying on non-existent object", function () {
            assert.throw(function () {
                $spy(undefined, "ouch");
            });
        });

        it("haves toString method", function () {
            const obj = { meth() {} };
            $spy(obj, "meth");

            assert.equal(obj.meth.toString(), "meth");
        });

        it("toString should say 'spy' when unable to infer name", function () {
            const spy = $spy();

            assert.equal(spy.toString(), "spy");
        });

        it("toString should report name of spied function", function () {
            function myTestFunc() {}
            const spy = $spy(myTestFunc);

            assert.equal(spy.toString(), "myTestFunc");
        });

        it("toString should prefer displayName property if available", function () {
            function myTestFunc() {}
            myTestFunc.displayName = "My custom method";
            const spy = $spy(myTestFunc);

            assert.equal(spy.toString(), "My custom method");
        });

        it("toString should prefer property name if possible", function () {
            const obj = {};
            obj.meth = $spy();
            obj.meth();

            assert.equal(obj.meth.toString(), "meth");
        });
    });

    describe(".reset", function () {
        function assertReset(spy) {
            assert(!spy.called);
            assert(!spy.calledOnce);
            assert.equal(spy.args.length, 0);
            assert.equal(spy.returnValues.length, 0);
            assert.equal(spy.exceptions.length, 0);
            assert.equal(spy.thisValues.length, 0);
            assert.isNull(spy.firstCall);
            assert.isNull(spy.secondCall);
            assert.isNull(spy.thirdCall);
            assert.isNull(spy.lastCall);
        }

        it("resets spy state", function () {
            const spy = $spy();
            spy();

            spy.reset();

            assertReset(spy);
        });

        it("resets call order state", function () {
            const spies = [$spy(), $spy()];
            spies[0]();
            spies[1]();

            spies[0].reset();

            assert(!spies[0].calledBefore(spies[1]));
        });

        it("resets fakes returned by withArgs", function () {
            const spy = $spy();
            const fakeA = spy.withArgs("a");
            const fakeB = spy.withArgs("b");
            spy("a");
            spy("b");
            spy("c");
            const fakeC = spy.withArgs("c");

            spy.reset();

            assertReset(fakeA);
            assertReset(fakeB);
            assertReset(fakeC);
        });
    });

    describe(".withArgs", function () {
        it("defines withArgs method", function () {
            const spy = $spy();

            assert.isFunction(spy.withArgs);
        });

        it("records single call", function () {
            const spy = $spy().withArgs(1);
            spy(1);

            assert.equal(spy.callCount, 1);
        });

        it("records non-matching call on original spy", function () {
            const spy = $spy();
            const argSpy = spy.withArgs(1);
            spy(1);
            spy(2);

            assert.equal(spy.callCount, 2);
            assert.equal(argSpy.callCount, 1);
        });

        it("records non-matching call with several arguments separately", function () {
            const spy = $spy();
            const argSpy = spy.withArgs(1, "str", {});
            spy(1);
            spy(1, "str", {});

            assert.equal(spy.callCount, 2);
            assert.equal(argSpy.callCount, 1);
        });

        it("records for partial argument match", function () {
            const spy = $spy();
            const argSpy = spy.withArgs(1, "str", {});
            spy(1);
            spy(1, "str", {});
            spy(1, "str", {}, []);

            assert.equal(spy.callCount, 3);
            assert.equal(argSpy.callCount, 2);
        });

        it("records filtered spy when original throws", function () {
            const spy = $spy(function () {
                throw new Error("Oops");
            });

            const argSpy = spy.withArgs({}, []);

            assert.throw(function () {
                spy(1);
            });

            assert.throw(function () {
                spy({}, []);
            });

            assert.equal(spy.callCount, 2);
            assert.equal(argSpy.callCount, 1);
        });

        it("returns existing override for arguments", function () {
            const spy = $spy();
            const argSpy = spy.withArgs({}, []);
            const another = spy.withArgs({}, []);
            spy();
            spy({}, []);
            spy({}, [], 2);

            assert.strictEqual(another, argSpy);
            assert.notDeepEqual(another, spy);
            assert.equal(spy.callCount, 3);
            assert.equal(spy.withArgs({}, []).callCount, 2);
        });

        it("chains withArgs calls on original spy", function () {
            const spy = $spy();
            const numArgSpy = spy.withArgs({}, []).withArgs(3);
            spy();
            spy({}, []);
            spy(3);

            assert.equal(spy.callCount, 3);
            assert.equal(numArgSpy.callCount, 1);
            assert.equal(spy.withArgs({}, []).callCount, 1);
        });

        it("initializes filtered spy with callCount", function () {
            const spy = $spy();
            spy("a");
            spy("b");
            spy("b");
            spy("c");
            spy("c");
            spy("c");

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");
            const argSpy3 = spy.withArgs("c");

            assert.equal(argSpy1.callCount, 1);
            assert.equal(argSpy2.callCount, 2);
            assert.equal(argSpy3.callCount, 3);
            assert(argSpy1.called);
            assert(argSpy2.called);
            assert(argSpy3.called);
            assert(argSpy1.calledOnce);
            assert(argSpy2.calledTwice);
            assert(argSpy3.calledThrice);
        });

        it("initializes filtered spy with first, second, third and last call", function () {
            const spy = $spy();
            spy("a", 1);
            spy("b", 2);
            spy("b", 3);
            spy("b", 4);

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy1.firstCall.calledWithExactly("a", 1));
            assert(argSpy1.lastCall.calledWithExactly("a", 1));
            assert(argSpy2.firstCall.calledWithExactly("b", 2));
            assert(argSpy2.secondCall.calledWithExactly("b", 3));
            assert(argSpy2.thirdCall.calledWithExactly("b", 4));
            assert(argSpy2.lastCall.calledWithExactly("b", 4));
        });

        it("initializes filtered spy with arguments", function () {
            const spy = $spy();
            spy("a");
            spy("b");
            spy("b", "c", "d");

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy1.getCall(0).calledWithExactly("a"));
            assert(argSpy2.getCall(0).calledWithExactly("b"));
            assert(argSpy2.getCall(1).calledWithExactly("b", "c", "d"));
        });

        it("initializes filtered spy with thisValues", function () {
            const spy = $spy();
            const thisValue1 = {};
            const thisValue2 = {};
            const thisValue3 = {};
            spy.call(thisValue1, "a");
            spy.call(thisValue2, "b");
            spy.call(thisValue3, "b");

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy1.getCall(0).calledOn(thisValue1));
            assert(argSpy2.getCall(0).calledOn(thisValue2));
            assert(argSpy2.getCall(1).calledOn(thisValue3));
        });

        it("initializes filtered spy with return values", function () {
            const spy = $spy(function (value) {
                return value;
            });
            spy("a");
            spy("b");
            spy("b");

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy1.getCall(0).returned("a"));
            assert(argSpy2.getCall(0).returned("b"));
            assert(argSpy2.getCall(1).returned("b"));
        });

        it("initializes filtered spy with call order", function () {
            const spy = $spy();
            spy("a");
            spy("b");
            spy("b");

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy2.getCall(0).calledAfter(argSpy1.getCall(0)));
            assert(argSpy2.getCall(1).calledAfter(argSpy1.getCall(0)));
        });

        it("initializes filtered spy with exceptions", function () {
            const spy = $spy(function (x, y) {
                const error = new Error();
                error.name = y;
                throw error;
            });
            /*eslint-disable no-empty*/
            try {
                spy("a", "1");
            } catch (ignored) {}
            try {
                spy("b", "2");
            } catch (ignored) {}
            try {
                spy("b", "3");
            } catch (ignored) {}
            /*eslint-enable no-empty*/

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy1.getCall(0).threw("1"));
            assert(argSpy2.getCall(0).threw("2"));
            assert(argSpy2.getCall(1).threw("3"));
        });
    });

    describe(".printf", function () {
        describe("name", function () {
            it("named", function () {
                const named = $spy(function cool() { });
                assert.equal(named.printf("%n"), "cool");
            });
            it("anon", function () {
                const anon = $spy(function () {});
                assert.equal(anon.printf("%n"), "spy");

                const noFn = $spy();
                assert.equal(noFn.printf("%n"), "spy");
            });
        });

        it("count", function () {
            // Throwing just to make sure it has no effect.
            const spy = $spy($stub().throws());
            function call() {
                try {
                    spy();
                }                catch (e) {} // eslint-disable-line no-empty
            }

            call();
            assert.equal(spy.printf("%c"), "once");
            call();
            assert.equal(spy.printf("%c"), "twice");
            call();
            assert.equal(spy.printf("%c"), "thrice");
            call();
            assert.equal(spy.printf("%c"), "4 times");
        });

        describe("calls", function () {
            it("oneLine", function () {
                function test(arg, expected) {
                    const spy = $spy();
                    spy(arg);
                    assert.equal(spy.printf("%C").replace(/ at.*/g, ""), "\n    " + expected);
                }

                test(true, "spy(true)");
                test(false, "spy(false)");
                test(undefined, "spy(undefined)");
                test(1, "spy(1)");
                test(0, "spy(0)");
                test(-1, "spy(-1)");
                test(-1.1, "spy(-1.1)");
                test(Infinity, "spy(Infinity)");
                test(["a"], "spy([\n    [0] \"a\" \n])");
                test({ a: "a" }, "spy({\n    a: \"a\" \n})");
            });

            it("multiline", function () {
                const str = "spy\ntest";
                const spy = $spy();

                spy(str);
                spy(str);
                spy(str);

                assert.equal(spy.printf("%C").replace(/ at.*/g, ""),
                    "\n    spy(" + str + ")" +
                    "\n\n    spy(" + str + ")" +
                    "\n\n    spy(" + str + ")");

                spy.reset();

                spy("test");
                spy("spy\ntest");
                spy("spy\ntest");

                assert.equal(spy.printf("%C").replace(/ at.*/g, ""),
                    "\n    spy(test)" +
                    "\n    spy(" + str + ")" +
                    "\n\n    spy(" + str + ")");
            });
        });

        it("thisValues", function () {
            const spy = $spy();
            spy();
            assert.equal(spy.printf("%t"), "undefined");

            spy.reset();
            spy.call(true);
            assert.equal(spy.printf("%t"), "true");
        });

        it("unmatched", function () {
            const spy = $spy();

            assert.equal(spy.printf("%λ"), "%λ");
        });
    });

    it("captures a stack trace", function () {
        const spy = $spy();
        spy();
        assert.isString(spy.getCall(0).stack);
    });
});
