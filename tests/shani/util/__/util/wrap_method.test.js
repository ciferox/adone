describe("shani", "util", "__", "util", "wrapMethod", () => {
    const { error } = adone;
    const { __: { util: { wrapMethod } }, spy: createSpy, stub: createStub } = adone.shani.util;

    beforeEach(function () {
        this.method = function () { };
        this.getter = function () { };
        this.setter = function () { };
        this.object = { method: this.method };
        Object.defineProperty(this.object, "property", {
            get: this.getter,
            set: this.setter,
            configurable: true
        });
    });

    it("is function", () => {
        assert.isFunction(wrapMethod);
    });

    it("throws if first argument is not object", () => {
        assert.throws(() => {
            wrapMethod();
        }, error.InvalidArgumentException);
    });

    it("throws if object defines property but is not function", function () {
        this.object.prop = 42;
        const object = this.object;

        assert.throws(() => {
            wrapMethod(object, "prop", () => { });
        }, TypeError);
    });

    it("throws Symbol() if object defines property but is not function", () => {
        if (typeof Symbol === "function") {
            const symbol = Symbol();
            const object = {};
            object[symbol] = 42;

            assert.throws(() => {
                wrapMethod(object, symbol, () => { });
            }, "Attempted to wrap number property Symbol() as function");
        }
    });

    it("throws if object does not define property", function () {
        const object = this.object;

        assert.throws(() => {
            wrapMethod(object, "prop", () => { });
        });

        assert.throws(
            () => {
                wrapMethod(object, "prop", () => { });
            },
            /Attempted to wrap .* property .* as function/
        );
    });

    it("throws if third argument is missing", function () {
        const object = this.object;

        assert.throws(() => {
            wrapMethod(object, "method");
        }, TypeError);
    });

    it("throws if third argument is not a function or a property descriptor", function () {
        const object = this.object;

        assert.throws(() => {
            wrapMethod(object, "method", 1);
        }, TypeError);
    });

    it("replaces object method", function () {
        wrapMethod(this.object, "method", () => { });

        assert.notEqual(this.method, this.object.method);
        assert.isFunction(this.object.method);
    });

    it("replaces getter", function () {
        wrapMethod(this.object, "property", { get() { } });

        assert.notEqual(this.getter, Object.getOwnPropertyDescriptor(this.object, "property").get);
        assert.isFunction(Object.getOwnPropertyDescriptor(this.object, "property").get);
    });

    it("replaces setter", function () {
        wrapMethod(this.object, "property", { // eslint-disable-line accessor-pairs
            set() { }
        });

        assert.notEqual(this.setter, Object.getOwnPropertyDescriptor(this.object, "property").set);
        assert.isFunction(Object.getOwnPropertyDescriptor(this.object, "property").set);
    });

    it("throws if method is already wrapped", function () {
        wrapMethod(this.object, "method", () => { });

        assert.throws(() => {
            wrapMethod(this.object, "method", () => { });
        }, TypeError);
    });

    it("throws Symbol if method is already wrapped", () => {
        const symbol = Symbol();
        const object = {};
        object[symbol] = function () { };
        wrapMethod(object, symbol, () => { });

        assert.throws(() => {
            wrapMethod(object, symbol, () => { });
        }, "Attempted to wrap Symbol() which is already wrapped");
    });

    it.skip("throws if property descriptor is already wrapped", function () {
        wrapMethod(this.object, "property", { get() { } });
        console.log("__");
        assert.throws(() => {
            wrapMethod(this.object, "property", { get() { } });
        }, TypeError);
    });

    it("throws if method is already a spy", () => {
        const object = { method: createSpy() };

        assert.throws(() => {
            wrapMethod(object, "method", () => { });
        }, TypeError);
    });

    it("throws if Symbol method is already a spy", () => {
        const symbol = Symbol();
        const object = {};
        object[symbol] = createSpy();

        assert.throws(() => {
            wrapMethod(object, symbol, () => { });
        }, "Attempted to wrap Symbol() which is already spied on");
    });

    describe("originating stack traces", () => {
        beforeEach(function () {
            this.oldError = Error;
            this.oldTypeError = TypeError;

            let i = 0;

            Error = TypeError = function () { // eslint-disable-line no-native-reassign, no-undef
                this.stack = `:STACK${++i}:`;
            };
        });

        afterEach(function () {
            Error = this.oldError; // eslint-disable-line no-native-reassign, no-undef
            TypeError = this.oldTypeError; // eslint-disable-line no-native-reassign, no-undef
        });

        it("throws with stack trace showing original wrapMethod call", () => {
            const object = { method() { } };
            wrapMethod(object, "method", () => {
                return "original";
            });

            const err = assert.throws(
                () => {
                    wrapMethod(object, "method", () => { });
                }
            );
            assert.equal(err.stack, ":STACK2:\n--------------\n:STACK1:");
        });
    });

    it("mirrors function properties", () => {
        const object = { method() { } };
        object.method.prop = 42;

        wrapMethod(object, "method", () => { });

        assert.equal(object.method.prop, 42);
    });

    it("does not mirror and overwrite existing properties", () => {
        const object = { method() { } };
        object.method.called = 42;

        createStub(object, "method");

        assert.isFalse(object.method.called);
    });

    describe("wrapped method", () => {
        beforeEach(function () {
            this.method = function () { };
            this.object = { method: this.method };
        });

        it("defines restore method", function () {
            wrapMethod(this.object, "method", () => { });

            assert.isFunction(this.object.method.restore);
        });

        it("returns wrapper", function () {
            const wrapper = wrapMethod(this.object, "method", () => { });

            assert.equal(this.object.method, wrapper);
        });

        it("restore brings back original method", function () {
            wrapMethod(this.object, "method", () => { });
            this.object.method.restore();

            assert.equal(this.object.method, this.method);
        });
    });

    describe("wrapped prototype method", () => {
        beforeEach(function () {
            this.type = function () { };
            this.type.prototype.method = function () { };

            this.object = new this.type(); //eslint-disable-line new-cap
        });

        it("wrap adds owned property", function () {
            const wrapper = wrapMethod(this.object, "method", () => { });

            assert.equal(this.object.method, wrapper);
            assert(this.object.hasOwnProperty("method"));
        });

        it("restore removes owned property", function () {
            wrapMethod(this.object, "method", () => { });
            this.object.method.restore();

            assert.equal(this.object.method, this.type.prototype.method);
            assert.isFalse(this.object.hasOwnProperty("method"));
        });
    });
});
