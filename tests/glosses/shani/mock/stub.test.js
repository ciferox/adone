/* global it describe assert beforeEach afterEach */

import createStub, { createStubInstance } from "adone/glosses/shani/mock/stub";
import createSpy from "adone/glosses/shani/mock/spy";
import $match from "adone/glosses/shani/mock/match";
import createInstance from "adone/glosses/shani/mock/util/create";

describe("stub", function () {
    it("is spy", function () {
        const stub = createStub.create();

        assert.isFalse(stub.called);
        assert.isFunction(stub.calledWith);
        assert.isFunction(stub.calledOn);
    });

    it("fails if stubbing property on null", function () {
        let error;

        try {
            createStub(null, "prop");
        } catch (e) {
            error = e;
        }

        assert.equal(error.message, "Trying to stub property 'prop' of null");
    });

    it("fails if called with an empty property descriptor", function () {
        let error;
        const propertyKey = "ea762c6d-16ab-4ded-8bc2-3bc6f2de2925";
        const object = {};

        object[propertyKey] = "257b38d8-3c02-4353-82ab-b1b588be6990";

        try {
            createStub(object, propertyKey, {});
        } catch (e) {
            error = e;
        }

        assert.equal(error.message, "Expected property descriptor to have at least one key");
    });

    it("throws a readable error if stubbing Symbol on null", function () {
        if (typeof Symbol === "function") {
            try {
                createStub(null, Symbol());
            } catch (err) {
                assert.equal(err.message, "Trying to stub property 'Symbol()' of null");
            }
        }
    });

    it("should contain asynchronous versions of callsArg*, and yields* methods", function () {
        const stub = createStub.create();

        let syncVersions = 0;
        let asyncVersions = 0;

        for (const method in stub) {
            if (stub.hasOwnProperty(method) && method.match(/^(callsArg|yields)/)) {
                if (!method.match(/Async/)) {
                    syncVersions++;
                } else if (method.match(/Async/)) {
                    asyncVersions++;
                }
            }
        }

        assert.deepEqual(syncVersions, asyncVersions,
            "Stub prototype should contain same amount of synchronous and asynchronous methods");
    });

    it("should allow overriding async behavior with sync behavior", function () {
        const stub = createStub();
        const callback = createSpy();

        stub.callsArgAsync(1);
        stub.callsArg(1);
        stub(1, callback);

        assert(callback.called);
    });

    describe(".returns", function () {
        it("returns specified value", function () {
            const stub = createStub.create();
            const object = {};
            stub.returns(object);

            assert.deepEqual(stub(), object);
        });

        it("returns should return stub", function () {
            const stub = createStub.create();

            assert.deepEqual(stub.returns(""), stub);
        });

        it("returns undefined", function () {
            const stub = createStub.create();

            assert.isUndefined(stub());
        });

        it("supersedes previous throws", function () {
            const stub = createStub.create();
            stub.throws().returns(1);

            stub();
        });
    });

    describe(".resolves", function () {
        afterEach(function () {
            if (Promise.resolve.restore) {
                Promise.resolve.restore();
            }
        });

        it("returns a promise to the specified value", function () {
            const stub = createStub.create();
            const object = {};
            stub.resolves(object);

            return stub().then(function (actual) {
                assert.deepEqual(actual, object);
            });
        });

        it("should return the same stub", function () {
            const stub = createStub.create();

            assert.deepEqual(stub.resolves(""), stub);
        });

        it("supersedes previous throws", function () {
            const stub = createStub.create();
            stub.throws().resolves(1);
            stub();
        });

        it("supersedes previous rejects", function () {
            const stub = createStub.create();
            stub.rejects(Error("should be superseeded")).resolves(1);

            return stub().then();
        });

        it("can be superseded by returns", function () {
            const stub = createStub.create();
            stub.resolves(2).returns(1);

            assert.equal(stub(), 1);
        });

        it("does not invoke Promise.resolve when the behavior is added to the stub", function () {
            const resolveSpy = createSpy(Promise, "resolve");
            const stub = createStub.create();
            stub.resolves(2);

            assert.equal(resolveSpy.callCount, 0);
        });
    });

    describe(".rejects", function () {
        afterEach(function () {
            if (Promise.reject.restore) {
                Promise.reject.restore();
            }
        });

        it("returns a promise which rejects for the specified reason", function () {
            const stub = createStub.create();
            const reason = new Error();
            stub.rejects(reason);

            return stub().then(function () {
                throw new Error("this should not resolve");
            }).catch(function (actual) {
                assert.deepEqual(actual, reason);
            });
        });

        it("should return the same stub", function () {
            const stub = createStub.create();

            assert.deepEqual(stub.rejects({}), stub);
        });

        it("specifies exception message", function () {
            const stub = createStub.create();
            const message = "Oh no!";
            stub.rejects("Error", message);

            return stub().then(function () {
                throw new Error("Expected stub to reject");
            }).catch(function (reason) {
                assert.equal(reason.message, message);
            });
        });

        it("does not specify exception message if not provided", function () {
            const stub = createStub.create();
            stub.rejects("Error");

            return stub().then(function () {
                throw new Error("Expected stub to reject");
            }).catch(function (reason) {
                assert.equal(reason.message, "");
            });
        });

        it("rejects for a generic reason", function () {
            const stub = createStub.create();
            stub.rejects();

            return stub().then(function () {
                throw new Error("Expected stub to reject");
            }).catch(function (reason) {
                assert.equal(reason.name, "Error");
            });
        });

        it("can be superseded by returns", function () {
            const stub = createStub.create();
            stub.rejects(2).returns(1);

            assert.equal(stub(), 1);
        });

        it("does not invoke Promise.reject when the behavior is added to the stub", function () {
            const rejectSpy = createSpy(Promise, "reject");
            const stub = createStub.create();
            stub.rejects(2);

            assert.equal(rejectSpy.callCount, 0);
        });
    });

    describe(".returnsArg", function () {
        it("returns argument at specified index", function () {
            const stub = createStub.create();
            stub.returnsArg(0);
            const object = {};

            assert.deepEqual(stub(object), object);
        });

        it("returns stub", function () {
            const stub = createStub.create();

            assert.deepEqual(stub.returnsArg(0), stub);
        });

        it("throws if no index is specified", function () {
            const stub = createStub.create();

            assert.throw(function () {
                stub.returnsArg();
            }, TypeError);
        });
    });

    describe(".returnsThis", function () {
        it("stub returns this", function () {
            const instance = {};
            instance.stub = createStub.create();
            instance.stub.returnsThis();

            assert.deepEqual(instance.stub(), instance);
        });

        const strictMode = (function () {
            return this;
        }()) === undefined;
        if (strictMode) {
            it("stub returns undefined when detached", function () {
                const stub = createStub.create();
                stub.returnsThis();

                // Due to strict mode, would be `global` otherwise
                assert.deepEqual(stub(), undefined);
            });
        }

        it("stub respects call/apply", function () {
            const stub = createStub.create();
            stub.returnsThis();
            const object = {};

            assert.deepEqual(stub.call(object), object);
            assert.deepEqual(stub.apply(object), object);
        });

        it("returns stub", function () {
            const stub = createStub.create();

            assert.deepEqual(stub.returnsThis(), stub);
        });
    });

    describe(".throws", function () {
        it("throws specified exception", function () {
            const stub = createStub.create();
            const error = new Error();
            stub.throws(error);

            try {
                stub();
                throw new Error("Expected stub to throw");
            } catch (e) {
                assert.deepEqual(e, error);
            }
        });

        it("returns stub", function () {
            const stub = createStub.create();

            assert.deepEqual(stub.throws({}), stub);
        });

        it("sets type of exception to throw", function () {
            const stub = createStub.create();
            stub.throws(new TypeError);

            assert.throw(function () {
                stub();
            }, TypeError);
        });

        it("specifies exception message", function () {
            const stub = createStub.create();
            const message = "Oh no!";
            stub.throws("Error", message);

            try {
                stub();
                throw new Error("Expected stub to throw");
            } catch (e) {
                assert.equal(e.message, message);
            }
        });

        it("does not specify exception message if not provided", function () {
            const stub = createStub.create();
            stub.throws("Error");

            try {
                stub();
                throw new Error("Expected stub to throw");
            } catch (e) {
                assert.equal(e.message, "");
            }
        });

        it("throws generic error", function () {
            const stub = createStub.create();
            stub.throws();

            assert.throw(function () {
                stub();
            }, "Error");
        });

        it("resets 'invoking' flag", function () {
            const stub = createStub.create();
            stub.throws();

            try {
                stub();
            } catch (e) {
                assert.isUndefined(stub.invoking);
            }
        });
    });

    describe(".callsArg", function () {
        let stub;
        beforeEach(function () {
            stub = createStub.create();
        });

        it("calls argument at specified index", function () {
            stub.callsArg(2);
            const callback = createStub.create();

            stub(1, 2, callback);

            assert(callback.called);
        });

        it("returns stub", function () {
            assert.isFunction(stub.callsArg(2));
        });

        it("throws if argument at specified index is not callable", function () {
            stub.callsArg(0);

            assert.throw(function () {
                stub(1);
            }, TypeError);
        });

        it("throws if no index is specified", function () {
            assert.throw(function () {
                stub.callsArg();
            }, TypeError);
        });

        it("throws if index is not number", function () {
            assert.throw(function () {
                stub.callsArg({});
            }, TypeError);
        });
    });

    describe(".callsArgWith", function () {
        let stub;
        beforeEach(function () {
            stub = createStub.create();
        });

        it("calls argument at specified index with provided args", function () {
            const object = {};
            stub.callsArgWith(1, object);
            const callback = createStub.create();

            stub(1, callback);

            assert(callback.calledWith(object));
        });

        it("returns function", function () {
            const _stub = stub.callsArgWith(2, 3);

            assert.isFunction(_stub);
        });

        it("calls callback without args", function () {
            stub.callsArgWith(1);
            const callback = createStub.create();

            stub(1, callback);

            assert(callback.calledWith());
        });

        it("calls callback with multiple args", function () {
            const object = {};
            const array = [];
            stub.callsArgWith(1, object, array);
            const callback = createStub.create();

            stub(1, callback);

            assert(callback.calledWith(object, array));
        });

        it("throws if no index is specified", function () {
            assert.throw(function () {
                stub.callsArgWith();
            }, TypeError);
        });

        it("throws if index is not number", function () {
            assert.throw(function () {
                stub.callsArgWith({});
            }, TypeError);
        });
    });

    describe(".callsArgOn", function () {
        let stub;
        let fakeContext;
        beforeEach(function () {
            stub = createStub.create();
            fakeContext = {
                foo: "bar"
            };
        });

        it("calls argument at specified index", function () {
            stub.callsArgOn(2, fakeContext);
            const callback = createStub.create();

            stub(1, 2, callback);

            assert(callback.called);
            assert(callback.calledOn(fakeContext));
        });

        it("calls argument at specified index with undefined context", function () {
            stub.callsArgOn(2, undefined);
            const callback = createStub.create();

            stub(1, 2, callback);

            assert(callback.called);
            assert(callback.calledOn(undefined));
        });

        it("calls argument at specified index with number context", function () {
            stub.callsArgOn(2, 5);
            const callback = createStub.create();

            stub(1, 2, callback);

            assert(callback.called);
            assert(callback.calledOn(5));
        });

        it("returns stub", function () {
            const _stub = stub.callsArgOn(2, fakeContext);
            assert.isFunction(_stub);
        });

        it("throws if argument at specified index is not callable", function () {
            stub.callsArgOn(0, fakeContext);

            assert.throw(function () {
                stub(1);
            }, TypeError);
        });

        it("throws if no index is specified", function () {
            assert.throw(function () {
                stub.callsArgOn();
            }, TypeError);
        });

        it("throws if index is not number", function () {
            assert.throw(function () {
                stub.callsArgOn(fakeContext, 2);
            }, TypeError);
        });
    });

    describe(".callsArgOnWith", function () {
        let stub;
        let fakeContext;
        beforeEach(function () {
            stub = createStub.create();
            fakeContext = { foo: "bar" };
        });

        it("calls argument at specified index with provided args", function () {
            const object = {};
            stub.callsArgOnWith(1, fakeContext, object);
            const callback = createStub.create();

            stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(fakeContext));
        });

        it("calls argument at specified index with provided args and undefined context", function () {
            const object = {};
            stub.callsArgOnWith(1, undefined, object);
            const callback = createStub.create();

            stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(undefined));
        });

        it("calls argument at specified index with provided args and number context", function () {
            const object = {};
            stub.callsArgOnWith(1, 5, object);
            const callback = createStub.create();

            stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(5));
        });

        it("calls argument at specified index with provided args with undefined context", function () {
            const object = {};
            stub.callsArgOnWith(1, undefined, object);
            const callback = createStub.create();

            stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(undefined));
        });

        it("calls argument at specified index with provided args with number context", function () {
            const object = {};
            stub.callsArgOnWith(1, 5, object);
            const callback = createStub.create();

            stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(5));
        });

        it("returns function", function () {
            const _stub = stub.callsArgOnWith(2, fakeContext, 3);

            assert.isFunction(_stub);
        });

        it("calls callback without args", function () {
            stub.callsArgOnWith(1, fakeContext);
            const callback = createStub.create();

            stub(1, callback);

            assert(callback.calledWith());
            assert(callback.calledOn(fakeContext));
        });

        it("calls callback with multiple args", function () {
            const object = {};
            const array = [];
            stub.callsArgOnWith(1, fakeContext, object, array);
            const callback = createStub.create();

            stub(1, callback);

            assert(callback.calledWith(object, array));
            assert(callback.calledOn(fakeContext));
        });

        it("throws if no index is specified", function () {
            assert.throw(function () {
                stub.callsArgOnWith();
            }, TypeError);
        });

        it("throws if index is not number", function () {
            assert.throw(function () {
                stub.callsArgOnWith({});
            }, TypeError);
        });
    });

    describe(".callsFake", function () {
        let stub;
        let method;
        let object;
        beforeEach(function () {
            method = function () {
                throw new Error("Should be stubbed");
            };
            object = { method };
        });

        it("uses provided function as stub", function () {
            const fakeFn = createStub.create();
            stub = createStub(object, "method");

            stub.callsFake(fakeFn);
            object.method(1, 2);

            assert(fakeFn.calledWith(1, 2));
            assert(fakeFn.calledOn(object));
        });

        it("is overwritten by subsequent stub behavior", function () {
            const fakeFn = createStub.create();
            stub = createStub(object, "method");

            stub.callsFake(fakeFn).returns(3);
            const returned = object.method(1, 2);

            assert.isFalse(fakeFn.called);
            assert(returned === 3);
        });
    });

    describe(".objectMethod", function () {
        let method;
        let object;
        beforeEach(function () {
            method = function () {};
            object = { method };
        });

        afterEach(function () {
            if (global.console.info.restore) {
                global.console.info.restore();
            }
        });

        it("throws if third argument is provided but not a proprety descriptor", function () {
            assert.throw(function () {
                createStub(object, "method", 1);
            }, TypeError);
        });

        it("stubbed method should be proper stub", function () {
            const stub = createStub(object, "method");

            assert.isFunction(stub.returns);
            assert.isFunction(stub.throws);
        });

        it("stub should be spy", function () {
            const stub = createStub(object, "method");
            object.method();

            assert(stub.called);
            assert(stub.calledOn(object));
        });

        it("stub should affect spy", function () {
            const stub = createStub(object, "method");
            stub.throws(TypeError);

            try {
                object.method();
            }            catch (e) {} // eslint-disable-line no-empty

            assert(stub.threw(TypeError));
        });

        it("returns standalone stub without arguments", function () {
            const stub = createStub();

            assert.isFunction(stub);
            assert.isFalse(stub.called);
        });

        it("throws if property is not a function", function () {
            const obj = { someProp: 42 };

            assert.throw(function () {
                createStub(obj, "someProp");
            });

            assert.equal(obj.someProp, 42);
        });

        it("successfully stubs falsey properties", function () {
            const obj = { 0: function () { } };

            createStub(obj, 0).callsFake(function () {
                return "stubbed value";
            });

            assert.equal(obj[0](), "stubbed value");
        });

        it("does not stub function object", function () {
            assert.throw(function () {
                createStub(function () {});
            });
        });
    });

    describe("everything", function () {
        it("stubs all methods of object without property", function () {
            const obj = {
                func1() {},
                func2() {},
                func3() {}
            };

            createStub(obj);

            assert.isFunction(obj.func1.restore);
            assert.isFunction(obj.func2.restore);
            assert.isFunction(obj.func3.restore);
        });

        it("stubs prototype methods", function () {
            function Obj() {}
            Obj.prototype.func1 = function () {};
            const obj = new Obj();

            createStub(obj);

            assert.isFunction(obj.func1.restore);
        });

        it("returns object", function () {
            const object = {};

            assert.deepEqual(createStub(object), object);
        });

        it("only stubs functions", function () {
            const object = { foo: "bar" };
            createStub(object);

            assert.equal(object.foo, "bar");
        });

        it("handles non-enumerable properties", function () {
            const obj = {
                func1() {},
                func2() {}
            };

            Object.defineProperty(obj, "func3", {
                value: function () {},
                writable: true,
                configurable: true
            });

            createStub(obj);

            assert.isFunction(obj.func1.restore);
            assert.isFunction(obj.func2.restore);
            assert.isFunction(obj.func3.restore);
        });

        it("handles non-enumerable properties on prototypes", function () {
            function Obj() {}
            Object.defineProperty(Obj.prototype, "func1", {
                value: function () {},
                writable: true,
                configurable: true
            });

            const obj = new Obj();

            createStub(obj);

            assert.isFunction(obj.func1.restore);
        });

        it("does not stub non-enumerable properties from Object.prototype", function () {
            const obj = {};

            createStub(obj);

            assert.isNotFunction(obj.toString.restore);
            assert.isNotFunction(obj.toLocaleString.restore);
            assert.isNotFunction(obj.propertyIsEnumerable.restore);
        });

        it("does not fail on overrides", function () {
            const parent = {
                func: function () {}
            };
            const child = createInstance(parent);
            child.func = function () {};
            createStub(child);
        });

        it("does not call getter during restore", function () {
            const obj = {
                get prop() {
                    throw new Error("should not call getter");
                }
            };
            const stub = createStub(obj, "prop", {get: function () {
                return 43;
            }});

            assert.equal(obj.prop, 43);

            stub.restore();
        });
    });

    describe("stubbed function", function () {
        it("throws if stubbing non-existent property", function () {
            const myObj = {};

            assert.throw(function () {
                createStub(myObj, "ouch");
            });

            assert.isUndefined(myObj.ouch);
        });

        it("has toString method", function () {
            const obj = { meth: function () {} };
            createStub(obj, "meth");

            assert.equal(obj.meth.toString(), "meth");
        });

        it("toString should say 'stub' when unable to infer name", function () {
            const stub = createStub();

            assert.equal(stub.toString(), "stub");
        });

        it("toString should prefer property name if possible", function () {
            const obj = {};
            obj.meth = createStub();
            obj.meth();

            assert.equal(obj.meth.toString(), "meth");
        });
    });

    describe(".yields", function () {
        it("invokes only argument as callback", function () {
            const stub = createStub().yields();
            const spy = createSpy();
            stub(spy);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const stub = createStub().yields();

            try {
                stub();
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "stub expected to yield, but no callback was passed.");
            }
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = { somethingAwesome: function () {} };
            const stub = createStub(myObj, "somethingAwesome").yields();

            try {
                stub(23, 42);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "somethingAwesome expected to yield, but no callback " +
                              "was passed. Received [23, 42]");
            }
        });

        it("invokes last argument as callback", function () {
            const stub = createStub().yields();
            const spy = createSpy();
            stub(24, {}, spy);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes first of two callbacks", function () {
            const stub = createStub().yields();
            const spy = createSpy();
            const spy2 = createSpy();
            stub(24, {}, spy, spy2);

            assert(spy.calledOnce);
            assert(!spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const stub = createStub().yields(obj, "Crazy");
            const spy = createSpy();
            stub(spy);

            assert(spy.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const stub = createStub().yields(obj, "Crazy");
            const callback = createStub().throws();

            assert.throw(function () {
                stub(callback);
            });
        });

        it("plays nice with throws", function () {
            const stub = createStub().throws().yields();
            const spy = createSpy();
            assert.throw(function () {
                stub(spy);
            });
            assert(spy.calledOnce);
        });

        it("plays nice with returns", function () {
            const obj = {};
            const stub = createStub().returns(obj).yields();
            const spy = createSpy();
            assert.deepEqual(stub(spy), obj);
            assert(spy.calledOnce);
        });

        it("plays nice with returnsArg", function () {
            const stub = createStub().returnsArg(0).yields();
            const spy = createSpy();
            assert.deepEqual(stub(spy), spy);
            assert(spy.calledOnce);
        });

        it("plays nice with returnsThis", function () {
            const obj = {};
            const stub = createStub().returnsThis().yields();
            const spy = createSpy();
            assert.deepEqual(stub.call(obj, spy), obj);
            assert(spy.calledOnce);
        });
    });

    describe(".yieldsRight", function () {
        it("invokes only argument as callback", function () {
            const stub = createStub().yieldsRight();
            const spy = createSpy();
            stub(spy);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const stub = createStub().yieldsRight();

            try {
                stub();
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "stub expected to yield, but no callback was passed.");
            }
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = { somethingAwesome: function () {} };
            const stub = createStub(myObj, "somethingAwesome").yieldsRight();

            try {
                stub(23, 42);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "somethingAwesome expected to yield, but no callback " +
                "was passed. Received [23, 42]");
            }
        });

        it("invokes last argument as callback", function () {
            const stub = createStub().yieldsRight();
            const spy = createSpy();
            stub(24, {}, spy);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes the last of two callbacks", function () {
            const stub = createStub().yieldsRight();
            const spy = createSpy();
            const spy2 = createSpy();
            stub(24, {}, spy, spy2);

            assert(!spy.called);
            assert(spy2.calledOnce);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const stub = createStub().yieldsRight(obj, "Crazy");
            const spy = createSpy();
            stub(spy);

            assert(spy.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const stub = createStub().yieldsRight(obj, "Crazy");
            const callback = createStub().throws();

            assert.throw(function () {
                stub(callback);
            });
        });

        it("plays nice with throws", function () {
            const stub = createStub().throws().yieldsRight();
            const spy = createSpy();
            assert.throw(function () {
                stub(spy);
            });
            assert(spy.calledOnce);
        });

        it("plays nice with returns", function () {
            const obj = {};
            const stub = createStub().returns(obj).yieldsRight();
            const spy = createSpy();
            assert.deepEqual(stub(spy), obj);
            assert(spy.calledOnce);
        });

        it("plays nice with returnsArg", function () {
            const stub = createStub().returnsArg(0).yieldsRight();
            const spy = createSpy();
            assert.deepEqual(stub(spy), spy);
            assert(spy.calledOnce);
        });

        it("plays nice with returnsThis", function () {
            const obj = {};
            const stub = createStub().returnsThis().yieldsRight();
            const spy = createSpy();
            assert.deepEqual(stub.call(obj, spy), obj);
            assert(spy.calledOnce);
        });
    });

    describe(".yieldsOn", function () {
        let stub;
        let fakeContext;
        beforeEach(function () {
            stub = createStub.create();
            fakeContext = { foo: "bar" };
        });

        it("invokes only argument as callback", function () {
            const spy = createSpy();

            stub.yieldsOn(fakeContext);
            stub(spy);

            assert(spy.calledOnce);
            assert(spy.calledOn(fakeContext));
            assert.equal(spy.args[0].length, 0);
        });

        it("throws if no context is specified", function () {
            assert.throw(function () {
                stub.yieldsOn();
            }, TypeError);
        });

        it("throws understandable error if no callback is passed", function () {
            stub.yieldsOn(fakeContext);

            try {
                stub();
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "stub expected to yield, but no callback was passed.");
            }
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = { somethingAwesome: function () {} };
            const stub = createStub(myObj, "somethingAwesome").yieldsOn(fakeContext);

            try {
                stub(23, 42);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "somethingAwesome expected to yield, but no callback " +
                              "was passed. Received [23, 42]");
            }
        });

        it("invokes last argument as callback", function () {
            const spy = createSpy();
            stub.yieldsOn(fakeContext);

            stub(24, {}, spy);

            assert(spy.calledOnce);
            assert(spy.calledOn(fakeContext));
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes first of two callbacks", function () {
            const spy = createSpy();
            const spy2 = createSpy();

            stub.yieldsOn(fakeContext);
            stub(24, {}, spy, spy2);

            assert(spy.calledOnce);
            assert(spy.calledOn(fakeContext));
            assert(!spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = createSpy();

            stub.yieldsOn(fakeContext, obj, "Crazy");
            stub(spy);

            assert(spy.calledWith(obj, "Crazy"));
            assert(spy.calledOn(fakeContext));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const callback = createStub().throws();

            stub.yieldsOn(fakeContext, obj, "Crazy");

            assert.throw(function () {
                stub(callback);
            });
        });
    });

    describe(".yieldsTo", function () {
        it("yields to property of object argument", function () {
            const stub = createStub().yieldsTo("success");
            const callback = createSpy();

            stub({ success: callback });

            assert(callback.calledOnce);
            assert.equal(callback.args[0].length, 0);
        });

        it("throws understandable error if no object with callback is passed", function () {
            const stub = createStub().yieldsTo("success");

            try {
                stub();
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "stub expected to yield to 'success', but no object " +
                              "with such a property was passed.");
            }
        });

        it("throws understandable error if failing to yield callback by symbol", function () {
            if (typeof Symbol === "function") {
                const symbol = Symbol();

                const stub = createStub().yieldsTo(symbol);

                assert.throw(function () {
                    stub();
                }, "stub expected to yield to 'Symbol()', but no object with such a property was passed.");
            }
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = { somethingAwesome: function () {} };
            const stub = createStub(myObj, "somethingAwesome").yieldsTo("success");

            try {
                stub(23, 42);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "somethingAwesome expected to yield to 'success', but " +
                              "no object with such a property was passed. " +
                              "Received [23, 42]");
            }
        });

        it("invokes property on last argument as callback", function () {
            const stub = createStub().yieldsTo("success");
            const callback = createSpy();
            stub(24, {}, { success: callback });

            assert(callback.calledOnce);
            assert.equal(callback.args[0].length, 0);
        });

        it("invokes first of two possible callbacks", function () {
            const stub = createStub().yieldsTo("error");
            const callback = createSpy();
            const callback2 = createSpy();
            stub(24, {}, { error: callback }, { error: callback2 });

            assert(callback.calledOnce);
            assert(!callback2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const stub = createStub().yieldsTo("success", obj, "Crazy");
            const callback = createSpy();
            stub({ success: callback });

            assert(callback.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const stub = createStub().yieldsTo("error", obj, "Crazy");
            const callback = createStub().throws();

            assert.throw(function () {
                stub({ error: callback });
            });
        });
    });

    describe(".yieldsToOn", function () {
        let stub;
        let fakeContext;
        beforeEach(function () {
            stub = createStub.create();
            fakeContext = { foo: "bar" };
        });

        it("yields to property of object argument", function () {
            stub.yieldsToOn("success", fakeContext);
            const callback = createSpy();

            stub({ success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(fakeContext));
            assert.equal(callback.args[0].length, 0);
        });

        it("yields to property of object argument with undefined context", function () {
            stub.yieldsToOn("success", undefined);
            const callback = createSpy();

            stub({ success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(undefined));
            assert.equal(callback.args[0].length, 0);
        });

        it("yields to property of object argument with number context", function () {
            stub.yieldsToOn("success", 5);
            const callback = createSpy();

            stub({ success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(5));
            assert.equal(callback.args[0].length, 0);
        });

        it("throws understandable error if no object with callback is passed", function () {
            stub.yieldsToOn("success", fakeContext);

            try {
                stub();
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "stub expected to yield to 'success', but no object " +
                              "with such a property was passed.");
            }
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = { somethingAwesome: function () {} };
            const stub = createStub(myObj, "somethingAwesome").yieldsToOn("success", fakeContext);

            try {
                stub(23, 42);
                throw new Error();
            } catch (e) {
                assert.equal(e.message, "somethingAwesome expected to yield to 'success', but " +
                              "no object with such a property was passed. " +
                              "Received [23, 42]");
            }
        });

        it("invokes property on last argument as callback", function () {
            const callback = createSpy();

            stub.yieldsToOn("success", fakeContext);
            stub(24, {}, { success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(fakeContext));
            assert.equal(callback.args[0].length, 0);
        });

        it("invokes first of two possible callbacks", function () {
            const callback = createSpy();
            const callback2 = createSpy();

            stub.yieldsToOn("error", fakeContext);
            stub(24, {}, { error: callback }, { error: callback2 });

            assert(callback.calledOnce);
            assert(callback.calledOn(fakeContext));
            assert(!callback2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const callback = createSpy();

            stub.yieldsToOn("success", fakeContext, obj, "Crazy");
            stub({ success: callback });

            assert(callback.calledOn(fakeContext));
            assert(callback.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const callback = createStub().throws();

            stub.yieldsToOn("error", fakeContext, obj, "Crazy");

            assert.throw(function () {
                stub({ error: callback });
            });
        });
    });

    describe(".withArgs", function () {
        it("defines withArgs method", function () {
            const stub = createStub();

            assert.isFunction(stub.withArgs);
        });

        it("creates filtered stub", function () {
            const stub = createStub();
            const other = stub.withArgs(23);

            assert.notDeepEqual(other, stub);
            assert.isFunction(stub.returns);
            assert.isFunction(other.returns);
        });

        it("filters return values based on arguments", function () {
            const stub = createStub().returns(23);
            stub.withArgs(42).returns(99);

            assert.equal(stub(), 23);
            assert.equal(stub(42), 99);
        });

        it("filters exceptions based on arguments", function () {
            const stub = createStub().returns(23);
            stub.withArgs(42).throws();

            stub();
            assert.throw(function () {
                stub(42);
            });
        });

        it("ensure stub recognizes match fuzzy arguments", function () {
            const stub = createStub().returns(23);
            stub.withArgs($match({ foo: "bar" })).returns(99);

            assert.equal(stub(), 23);
            assert.equal(stub({ foo: "bar", bar: "foo" }), 99);
        });

        it("ensure stub uses last matching arguments", function () {
            const unmatchedValue = "d3ada6a0-8dac-4136-956d-033b5f23eadf";
            const firstMatchedValue = "68128619-a639-4b32-a4a0-6519165bf301";
            const secondMatchedValue = "4ac2dc8f-3f3f-4648-9838-a2825fd94c9a";
            const expectedArgument = "3e1ed1ec-c377-4432-a33e-3c937f1406d1";

            const stub = createStub().returns(unmatchedValue);

            stub.withArgs(expectedArgument).returns(firstMatchedValue);
            stub.withArgs(expectedArgument).returns(secondMatchedValue);

            assert.equal(stub(), unmatchedValue);
            assert.equal(stub(expectedArgument), secondMatchedValue);
        });

        it("ensure stub uses last matching match arguments", function () {
            const unmatchedValue = "0aa66a7d-3c50-49ef-8365-bdcab637b2dd";
            const firstMatchedValue = "1ab2c601-7602-4658-9377-3346f6814caa";
            const secondMatchedValue = "e2e31518-c4c4-4012-a61f-31942f603ffa";
            const expectedArgument = "90dc4a22-ef53-4c62-8e05-4cf4b4bf42fa";

            const stub = createStub().returns(unmatchedValue);
            stub.withArgs(expectedArgument).returns(firstMatchedValue);
            stub.withArgs($match(expectedArgument)).returns(secondMatchedValue);

            assert.equal(stub(), unmatchedValue);
            assert.equal(stub(expectedArgument), secondMatchedValue);
        });
    });

    describe(".callsArgAsync", function () {
        let stub;
        beforeEach(function () {
            stub = createStub.create();
        });

        it("asynchronously calls argument at specified index", function (done) {
            stub.callsArgAsync(2);
            const callback = createSpy(done);

            stub(1, 2, callback);

            assert(!callback.called);
        });
    });

    describe(".callsArgWithAsync", function () {
        let stub;
        beforeEach(function () {
            stub = createStub.create();
        });

        it("asynchronously calls callback at specified index with multiple args", function (done) {
            const object = {};
            const array = [];
            stub.callsArgWithAsync(1, object, array);

            const callback = createSpy(function () {
                assert(callback.calledWith(object, array));
                done();
            });

            stub(1, callback);

            assert(!callback.called);
        });
    });

    describe(".callsArgOnAsync", function () {
        let stub;
        let fakeContext;
        beforeEach(function () {
            stub = createStub.create();
            fakeContext = {
                foo: "bar"
            };
        });

        it("asynchronously calls argument at specified index with specified context", function (done) {
            const context = fakeContext;
            stub.callsArgOnAsync(2, context);

            const callback = createSpy(function () {
                assert(callback.calledOn(context));
                done();
            });

            stub(1, 2, callback);

            assert(!callback.called);
        });
    });

    describe(".callsArgOnWithAsync", function () {
        let stub;
        let fakeContext;
        beforeEach(function () {
            stub = createStub.create();
            fakeContext = { foo: "bar" };
        });

        it("asynchronously calls argument at specified index with provided context and args", function (done) {
            const object = {};
            const context = fakeContext;
            stub.callsArgOnWithAsync(1, context, object);

            const callback = createSpy(function () {
                assert(callback.calledOn(context));
                assert(callback.calledWith(object));
                done();
            });

            stub(1, callback);

            assert(!callback.called);
        });
    });

    describe(".yieldsAsync", function () {
        it("asynchronously invokes only argument as callback", function (done) {
            const stub = createStub().yieldsAsync();

            const spy = createSpy(done);

            stub(spy);

            assert(!spy.called);
        });
    });

    describe(".yieldsOnAsync", function () {
        let stub;
        let fakeContext;
        beforeEach(function () {
            stub = createStub.create();
            fakeContext = { foo: "bar" };
        });

        it("asynchronously invokes only argument as callback with given context", function (done) {
            const context = fakeContext;
            stub.yieldsOnAsync(context);

            const spy = createSpy(function () {
                assert(spy.calledOnce);
                assert(spy.calledOn(context));
                assert.equal(spy.args[0].length, 0);
                done();
            });

            stub(spy);

            assert(!spy.called);
        });
    });

    describe(".yieldsToAsync", function () {
        it("asynchronously yields to property of object argument", function (done) {
            const stub = createStub().yieldsToAsync("success");

            const callback = createSpy(function () {
                assert(callback.calledOnce);
                assert.equal(callback.args[0].length, 0);
                done();
            });

            stub({ success: callback });

            assert(!callback.called);
        });
    });

    describe(".yieldsToOnAsync", function () {
        let stub;
        let fakeContext;
        beforeEach(function () {
            stub = createStub.create();
            fakeContext = { foo: "bar" };
        });

        it("asynchronously yields to property of object argument with given context", function (done) {
            stub.yieldsToOnAsync("success", fakeContext);

            const callback = createSpy(function () {
                assert(callback.calledOnce);
                assert(callback.calledOn(fakeContext));
                assert.equal(callback.args[0].length, 0);
                done();
            });

            stub({ success: callback });
            assert(!callback.called);
        });
    });

    describe(".onCall", function () {
        it("can be used with returns to produce sequence", function () {
            const stub = createStub().returns(3);
            stub.onFirstCall().returns(1)
                .onCall(2).returns(2);

            assert.deepEqual(stub(), 1);
            assert.deepEqual(stub(), 3);
            assert.deepEqual(stub(), 2);
            assert.deepEqual(stub(), 3);
        });

        it("can be used with returnsArg to produce sequence", function () {
            const stub = createStub().returns("default");
            stub.onSecondCall().returnsArg(0);

            assert.deepEqual(stub(1), "default");
            assert.deepEqual(stub(2), 2);
            assert.deepEqual(stub(3), "default");
        });

        it("can be used with returnsThis to produce sequence", function () {
            const instance = {};
            instance.stub = createStub().returns("default");
            instance.stub.onSecondCall().returnsThis();

            assert.deepEqual(instance.stub(), "default");
            assert.deepEqual(instance.stub(), instance);
            assert.deepEqual(instance.stub(), "default");
        });

        it("can be used with throwsException to produce sequence", function () {
            const stub = createStub();
            const error = new Error();
            stub.onSecondCall().throwsException(error);

            stub();
            try {
                stub();
                throw new Error("Expected stub to throw");
            } catch (e) {
                assert.deepEqual(e, error);
            }
        });

        describe("in combination with withArgs", function () {
            it("can produce a sequence for a fake", function () {
                const stub = createStub().returns(0);
                stub.withArgs(5).returns(-1)
                    .onFirstCall().returns(1)
                    .onSecondCall().returns(2);

                assert.deepEqual(stub(0), 0);
                assert.deepEqual(stub(5), 1);
                assert.deepEqual(stub(0), 0);
                assert.deepEqual(stub(5), 2);
                assert.deepEqual(stub(5), -1);
            });

            it("falls back to stub default behaviour if fake does not have its own default behaviour", function () {
                const stub = createStub().returns(0);
                stub.withArgs(5)
                    .onFirstCall().returns(1);

                assert.deepEqual(stub(5), 1);
                assert.deepEqual(stub(5), 0);
            });

            it("falls back to stub behaviour for call if fake does not have its own behaviour for call", function () {
                const stub = createStub().returns(0);
                stub.withArgs(5).onFirstCall().returns(1);
                stub.onSecondCall().returns(2);

                assert.deepEqual(stub(5), 1);
                assert.deepEqual(stub(5), 2);
                assert.deepEqual(stub(4), 0);
            });

            it("defaults to undefined behaviour once no more calls have been defined", function () {
                const stub = createStub();
                stub.withArgs(5).onFirstCall().returns(1)
                    .onSecondCall().returns(2);

                assert.deepEqual(stub(5), 1);
                assert.deepEqual(stub(5), 2);
                assert.isUndefined(stub(5));
            });

            it("does not create undefined behaviour just by calling onCall", function () {
                const stub = createStub().returns(2);
                stub.onFirstCall();

                assert.deepEqual(stub(6), 2);
            });

            it("works with fakes and reset", function () {
                const stub = createStub();
                stub.withArgs(5).onFirstCall().returns(1);
                stub.withArgs(5).onSecondCall().returns(2);

                assert.deepEqual(stub(5), 1);
                assert.deepEqual(stub(5), 2);
                assert.isUndefined(stub(5));

                stub.reset();

                assert.deepEqual(stub(5), undefined);
                assert.deepEqual(stub(5), undefined);
                assert.isUndefined(stub(5));
            });

            it("throws an understandable error when trying to use withArgs on behavior", function () {
                try {
                    createStub().onFirstCall().withArgs(1);
                } catch (e) {
                    assert.match(e.message, /not supported/);
                }
            });
        });

        it("can be used with yields* to produce a sequence", function () {
            const context = { foo: "bar" };
            const obj = { method1: createSpy(), method2: createSpy() };
            const obj2 = { method2: createSpy() };
            const stub = createStub().yieldsToOn("method2", context, 7, 8);
            stub.onFirstCall().yields(1, 2)
                .onSecondCall().yieldsOn(context, 3, 4)
                .onThirdCall().yieldsTo("method1", 5, 6)
                .onCall(3).yieldsToOn("method2", context, 7, 8);

            const spy1 = createSpy();
            const spy2 = createSpy();

            stub(spy1);
            stub(spy2);
            stub(obj);
            stub(obj);
            stub(obj2); // should continue with default behavior

            assert(spy1.calledOnce);
            assert(spy1.calledWithExactly(1, 2));

            assert(spy2.calledOnce);
            assert(spy2.calledAfter(spy1));
            assert(spy2.calledOn(context));
            assert(spy2.calledWithExactly(3, 4));

            assert(obj.method1.calledOnce);
            assert(obj.method1.calledAfter(spy2));
            assert(obj.method1.calledWithExactly(5, 6));

            assert(obj.method2.calledOnce);
            assert(obj.method2.calledAfter(obj.method1));
            assert(obj.method2.calledOn(context));
            assert(obj.method2.calledWithExactly(7, 8));

            assert(obj2.method2.calledOnce);
            assert(obj2.method2.calledAfter(obj.method2));
            assert(obj2.method2.calledOn(context));
            assert(obj2.method2.calledWithExactly(7, 8));
        });

        it("can be used with callsArg* to produce a sequence", function () {
            const spy1 = createSpy();
            const spy2 = createSpy();
            const spy3 = createSpy();
            const spy4 = createSpy();
            const spy5 = createSpy();
            const decoy = createSpy();
            const context = { foo: "bar" };

            const stub = createStub().callsArgOnWith(3, context, "c", "d");
            stub.onFirstCall().callsArg(0)
                .onSecondCall().callsArgWith(1, "a", "b")
                .onThirdCall().callsArgOn(2, context)
                .onCall(3).callsArgOnWith(3, context, "c", "d");

            stub(spy1);
            stub(decoy, spy2);
            stub(decoy, decoy, spy3);
            stub(decoy, decoy, decoy, spy4);
            stub(decoy, decoy, decoy, spy5); // should continue with default behavior

            assert(spy1.calledOnce);

            assert(spy2.calledOnce);
            assert(spy2.calledAfter(spy1));
            assert(spy2.calledWithExactly("a", "b"));

            assert(spy3.calledOnce);
            assert(spy3.calledAfter(spy2));
            assert(spy3.calledOn(context));

            assert(spy4.calledOnce);
            assert(spy4.calledAfter(spy3));
            assert(spy4.calledOn(context));
            assert(spy4.calledWithExactly("c", "d"));

            assert(spy5.calledOnce);
            assert(spy5.calledAfter(spy4));
            assert(spy5.calledOn(context));
            assert(spy5.calledWithExactly("c", "d"));

            assert(decoy.notCalled);
        });

        it("can be used with yields* and callsArg* in combination to produce a sequence", function () {
            const stub = createStub().yields(1, 2);
            stub.onSecondCall().callsArg(1)
                .onThirdCall().yieldsTo("method")
                .onCall(3).callsArgWith(2, "a", "b");

            const obj = { method: createSpy() };
            const spy1 = createSpy();
            const spy2 = createSpy();
            const spy3 = createSpy();
            const decoy = createSpy();

            stub(spy1);
            stub(decoy, spy2);
            stub(obj);
            stub(decoy, decoy, spy3);

            assert(spy1.calledOnce);

            assert(spy2.calledOnce);
            assert(spy2.calledAfter(spy1));

            assert(obj.method.calledOnce);
            assert(obj.method.calledAfter(spy2));

            assert(spy3.calledOnce);
            assert(spy3.calledAfter(obj.method));
            assert(spy3.calledWithExactly("a", "b"));

            assert(decoy.notCalled);
        });

        it("should interact correctly with assertions (GH-231)", function () {
            const stub = createStub();
            const spy = createSpy();

            stub.callsArgWith(0, "a");

            stub(spy);
            assert(spy.calledWith("a"));

            stub(spy);
            assert(spy.calledWith("a"));

            stub.onThirdCall().callsArgWith(0, "b");

            stub(spy);
            assert(spy.calledWith("b"));
        });
    });

    describe(".reset", function () {
        it("resets behavior", function () {
            const obj = { a: function () {} };
            const spy = createSpy();
            createStub(obj, "a").callsArg(1);

            obj.a(null, spy);
            obj.a.reset();
            obj.a(null, spy);

            assert(spy.calledOnce);
        });

        it("resets call history", function () {
            const stub = createStub();

            stub(1);
            stub.reset();
            stub(2);

            assert(stub.calledOnce);
            assert.equal(stub.getCall(0).args[0], 2);
        });
    });

    describe(".resetHistory", function () {
        it("resets history", function () {
            const stub = createStub();

            stub(1);
            stub.reset();
            stub(2);

            assert(stub.calledOnce);
            assert.equal(stub.getCall(0).args[0], 2);
        });
    });

    describe(".resetBehavior", function () {
        it("clears yields* and callsArg* sequence", function () {
            const stub = createStub().yields(1);
            stub.onFirstCall().callsArg(1);
            stub.resetBehavior();
            stub.yields(3);
            const spyWanted = createSpy();
            const spyNotWanted = createSpy();

            stub(spyWanted, spyNotWanted);

            assert(spyNotWanted.notCalled);
            assert(spyWanted.calledOnce);
            assert(spyWanted.calledWithExactly(3));
        });

        it("cleans 'returns' behavior", function () {
            const stub = createStub().returns(1);

            stub.resetBehavior();

            assert.isUndefined(stub());
        });

        it("cleans behavior of fakes returned by withArgs", function () {
            const stub = createStub();
            stub.withArgs("lolz").returns(2);

            stub.resetBehavior();

            assert.isUndefined(stub("lolz"));
        });

        it("does not clean parents' behavior when called on a fake returned by withArgs", function () {
            const parentStub = createStub().returns(false);
            const childStub = parentStub.withArgs("lolz").returns(true);

            childStub.resetBehavior();

            assert.deepEqual(parentStub("lolz"), false);
            assert.deepEqual(parentStub(), false);
        });

        it("cleans 'returnsArg' behavior", function () {
            const stub = createStub().returnsArg(0);

            stub.resetBehavior();

            assert.isUndefined(stub("defined"));
        });

        it("cleans 'returnsThis' behavior", function () {
            const instance = {};
            instance.stub = createStub.create();
            instance.stub.returnsThis();

            instance.stub.resetBehavior();

            assert.isUndefined(instance.stub());
        });

        describe("does not touch properties that are reset by 'reset'", function () {
            it(".calledOnce", function () {
                const stub = createStub();
                stub(1);

                stub.resetBehavior();

                assert(stub.calledOnce);
            });

            it("called multiple times", function () {
                const stub = createStub();
                stub(1);
                stub(2);
                stub(3);

                stub.resetBehavior();

                assert(stub.called);
                assert.equal(stub.args.length, 3);
                assert.equal(stub.returnValues.length, 3);
                assert.equal(stub.exceptions.length, 3);
                assert.equal(stub.thisValues.length, 3);
                assert.isDefined(stub.firstCall);
                assert.isDefined(stub.secondCall);
                assert.isDefined(stub.thirdCall);
                assert.isDefined(stub.lastCall);
            });

            it("call order state", function () {
                const stubs = [createStub(), createStub()];
                stubs[0]();
                stubs[1]();

                stubs[0].resetBehavior();

                assert(stubs[0].calledBefore(stubs[1]));
            });

            it("fakes returned by withArgs", function () {
                const stub = createStub();
                const fakeA = stub.withArgs("a");
                const fakeB = stub.withArgs("b");
                stub("a");
                stub("b");
                stub("c");
                const fakeC = stub.withArgs("c");

                stub.resetBehavior();

                assert(fakeA.calledOnce);
                assert(fakeB.calledOnce);
                assert(fakeC.calledOnce);
            });
        });
    });

    describe(".length", function () {
        it("is zero by default", function () {
            const stub = createStub();

            assert.equal(stub.length, 0);
        });

        it("matches the function length", function () {
            const api = { someMethod: function (a, b, c) {} }; // eslint-disable-line no-unused-vars
            const stub = createStub(api, "someMethod");

            assert.equal(stub.length, 3);
        });
    });

    describe(".createStubInstance", function () {
        it("stubs existing methods", function () {
            const Class = function () {};
            Class.prototype.method = function () {};

            const stub = createStubInstance(Class);
            stub.method.returns(3);
            assert.equal(3, stub.method());
        });

        it("doesn't stub fake methods", function () {
            const Class = function () {};

            const stub = createStubInstance(Class);
            assert.throw(function () {
                stub.method.returns(3);
            });
        });

        it("doesn't call the constructor", function () {
            const Class = function (a, b) {
                const c = a + b;
                throw c;
            };
            Class.prototype.method = function () {};

            const stub = createStubInstance(Class);
            stub.method(3);
        });

        it("retains non function values", function () {
            const TYPE = "some-value";
            const Class = function () {};
            Class.prototype.type = TYPE;

            const stub = createStubInstance(Class);
            assert.equal(TYPE, stub.type);
        });

        it("has no side effects on the prototype", function () {
            const proto = {
                method: function () {
                    throw "error";
                }
            };
            const Class = function () {};
            Class.prototype = proto;

            const stub = createStubInstance(Class);
            stub.method();
            assert.throw(proto.method);
        });

        it("throws exception for non function params", function () {
            const types = [{}, 3, "hi!"];

            for (let i = 0; i < types.length; i++) {
                // yes, it's silly to create functions in a loop, it's also a test
                assert.throw(function () { // eslint-disable-line no-loop-func
                    createStubInstance(types[i]);
                });
            }
        });
    });

});
