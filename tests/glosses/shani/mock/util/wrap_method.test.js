/* global it describe assert beforeEach afterEach */

import wrapMethod from "adone/glosses/shani/mock/util/wrap-method";
import createSpy from "adone/glosses/shani/mock/spy";
import createStub from "adone/glosses/shani/mock/stub";

describe("util/wrapMethod", function () {
    let method;
    let getter;
    let setter;
    let object;
    beforeEach(function () {
        method = function () {};
        getter = function () {};
        setter = function () {};
        object = { method };
        Object.defineProperty(object, "property", {
            get: getter,
            set: setter,
            configurable: true
        });
    });

    it("is function", function () {
        assert.isFunction(wrapMethod);
    });

    it("throws if first argument is not object", function () {
        assert.throw(function () {
            wrapMethod();
        }, TypeError);
    });

    it("throws if object defines property but is not function", function () {
        object.prop = 42;

        assert.throw(function () {
            wrapMethod(object, "prop", function () {});
        }, TypeError);
    });

    it("throws Symbol() if object defines property but is not function", function () {
        if (typeof Symbol === "function") {
            const symbol = Symbol();
            const object = {};
            object[symbol] = 42;

            assert.throw(function () {
                wrapMethod(object, symbol, function () {});
            }, "Attempted to wrap number property Symbol() as function");
        }
    });

    it("throws if object does not define property", function () {
        assert.throw(function () {
            wrapMethod(object, "prop", function () {});
        });

        try {
            wrapMethod(object, "prop", function () {});
            throw new Error("Didn't throw");
        } catch (e) {
            assert.match(e.message, /Attempted to wrap .* property .* as function/);
        }
    });

    it("throws if third argument is missing", function () {
        assert.throw(function () {
            wrapMethod(object, "method");
        }, TypeError);
    });

    it("throws if third argument is not a function or a property descriptor", function () {
        assert.throw(function () {
            wrapMethod(object, "method", 1);
        }, TypeError);
    });

    it("replaces object method", function () {
        wrapMethod(object, "method", function () {});

        assert.notDeepEqual(method, object.method);
        assert.isFunction(object.method);
    });

    it("replaces getter", function () {
        wrapMethod(object, "property", { get: function () {} });

        assert.notDeepEqual(getter, Object.getOwnPropertyDescriptor(object, "property").get);
        assert.isFunction(Object.getOwnPropertyDescriptor(object, "property").get);
    });

    it("replaces setter", function () {
        wrapMethod(object, "property", { // eslint-disable-line accessor-pairs
            set: function () {}
        });

        assert.notDeepEqual(setter, Object.getOwnPropertyDescriptor(object, "property").set);
        assert.isFunction(Object.getOwnPropertyDescriptor(object, "property").set);
    });

    it("throws if method is already wrapped", function () {
        wrapMethod(object, "method", function hello() {});

        assert.throw(function () {
            wrapMethod(object, "method", function () {});
        }, TypeError);
    });

    it("throws Symbol if method is already wrapped", function () {
        if (typeof Symbol === "function") {
            const symbol = Symbol();
            const object = {};
            object[symbol] = function () {};
            wrapMethod(object, symbol, function () {});

            assert.throw(function () {
                wrapMethod(object, symbol, function () {});
            }, "Attempted to wrap Symbol() which is already wrapped");
        }
    });

    // С этим проблема: не понятно, куда в случае оборачивания свойства
    // записывать свойство "restore", по которому позже идет определение,
    // произошло ли оборачивание ранее.
    it.skip("throws if property descriptor is already wrapped", function () {
        wrapMethod(object, "property", { get: function () {} });

        assert.throw(function () {
            wrapMethod(object, "property", { get: function () {} });
        }, TypeError);
    });

    it("throws if method is already a spy", function () {
        const object = { method: createSpy() };

        assert.throw(function () {
            wrapMethod(object, "method", function () {});
        }, TypeError);
    });

    it("throws if Symbol method is already a spy", function () {
        if (typeof Symbol === "function") {
            const symbol = Symbol();
            const object = {};
            object[symbol] = createSpy();

            assert.throw(function () {
                wrapMethod(object, symbol, function () {});
            }, "Attempted to wrap Symbol() which is already spied on");
        }
    });

    it("mirrors function properties", function () {
        const object = { method: function () {} };
        object.method.prop = 42;

        wrapMethod(object, "method", function () {});

        assert.equal(object.method.prop, 42);
    });

    it("does not mirror and overwrite existing properties", function () {
        const object = { method: function () {} };
        object.method.called = 42;

        createStub(object, "method");

        assert.isFalse(object.method.called);
    });

    describe("wrapped method", function () {
        beforeEach(function () {
            method = function () {};
            object = { method };
        });

        it("defines restore method", function () {
            wrapMethod(object, "method", function () {});

            assert.isFunction(object.method.restore);
        });

        it("returns wrapper", function () {
            const wrapper = wrapMethod(object, "method", function () {});

            assert.deepEqual(object.method, wrapper);
        });

        it("restore brings back original method", function () {
            wrapMethod(object, "method", function () {});
            object.method.restore();

            assert.deepEqual(object.method, method);
        });
    });

    describe("wrapped prototype method", function () {
        let Type;
        beforeEach(function () {
            Type = function () {};
            Type.prototype.method = function () {};

            object = new Type(); //eslint-disable-line new-cap
        });

        it("wrap adds owned property", function () {
            const wrapper = wrapMethod(object, "method", function () {});

            assert.deepEqual(object.method, wrapper);
            assert(object.hasOwnProperty("method"));
        });

        it("restore removes owned property", function () {
            wrapMethod(object, "method", function () {});
            object.method.restore();

            assert.deepEqual(object.method, Type.prototype.method);
            assert.isFalse(object.hasOwnProperty("method"));
        });
    });
});
