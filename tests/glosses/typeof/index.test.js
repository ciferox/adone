import "./dom";
import "./new_ecmascript_types";
import "./nodejs";
import "./tostringtag_extras";

const {
    typeOf,
    is
} = adone;

describe("Generic", () => {
    it("array", () => {
        assert(typeOf([]) === "Array");
        assert(typeOf(new Array()) === "Array");
    });

    it("regexp", () => {
        assert(typeOf(/a-z/gi) === "RegExp");
        assert(typeOf(new RegExp("a-z")) === "RegExp");
    });

    it("function", () => {
        assert(typeOf(() => { }) === "function");
    });

    it("arguments", function () {
        assert(typeOf(arguments) === "Arguments");
    });

    it("date", () => {
        assert(typeOf(new Date()) === "Date");
    });

    it("number", () => {
        assert(typeOf(1) === "number");
        assert(typeOf(1.234) === "number");
        assert(typeOf(-1) === "number");
        assert(typeOf(-1.234) === "number");
        assert(typeOf(Infinity) === "number");
        assert(typeOf(NaN) === "number");
    });

    it("number objects", () => {
        assert(typeOf(new Number(2)) === "Number");
    });

    it("string", () => {
        assert(typeOf("hello world") === "string");
    });

    it("string objects", () => {
        assert(typeOf(new String("hello")) === "String");
    });

    it("null", () => {
        assert(typeOf(null) === "null");
        assert(typeOf(undefined) !== "null");
    });

    it("undefined", () => {
        assert(typeOf(undefined) === "undefined");
        assert(typeOf(null) !== "undefined");
    });

    it("object", () => {
        function Noop() { }
        assert(typeOf({}) === "Object");
        assert(typeOf(Noop) !== "Object");
        assert(typeOf(new Noop()) === "Object");
        assert(typeOf(new Object()) === "Object");
        assert(typeOf(Object.create(null)) === "Object");
        assert(typeOf(Object.create(Object.prototype)) === "Object");
    });

    // See: https://github.com/chaijs/type-detect/pull/25
    it("object with .undefined property getter", () => {
        const foo = {};
        Object.defineProperty(foo, "undefined", {
            get() {
                throw Error("Should never happen");
            }
        });
        assert(typeOf(foo) === "Object");
    });

    it("boolean", () => {
        assert(typeOf(true) === "boolean");
        assert(typeOf(false) === "boolean");
        assert(typeOf(!0) === "boolean");
    });

    it("boolean object", () => {
        assert(typeOf(new Boolean()) === "Boolean");
    });

    it("error", () => {
        assert(typeOf(new Error()) === "Error");
        assert(typeOf(new TypeError()) === "Error");
        assert(typeOf(new EvalError()) === "Error");
        assert(typeOf(new RangeError()) === "Error");
        assert(typeOf(new ReferenceError()) === "Error");
        assert(typeOf(new SyntaxError()) === "Error");
        assert(typeOf(new TypeError()) === "Error");
        assert(typeOf(new URIError()) === "Error");
    });

    it("Math", () => {
        assert(typeOf(Math) === "Math");
    });

    it("JSON", () => {
        assert(typeOf(JSON) === "JSON");
    });

    describe("Stubbed ES2015 Types", () => {
        const originalObjectToString = Object.prototype.toString;
        const stubObjectToStringOnce = function (staticValue) {
            Object.prototype.toString = function () { // eslint-disable-line no-extend-native
                Object.prototype.toString = originalObjectToString; // eslint-disable-line no-extend-native
                return staticValue;
            };
        };
        function Thing() { }

        it("map", () => {
            stubObjectToStringOnce("[object Map]");
            assert(typeOf(new Thing()) === "Map");
        });

        it("weakmap", () => {
            stubObjectToStringOnce("[object WeakMap]");
            assert(typeOf(new Thing()) === "WeakMap");
        });

        it("set", () => {
            stubObjectToStringOnce("[object Set]");
            assert(typeOf(new Thing()) === "Set");
        });

        it("weakset", () => {
            stubObjectToStringOnce("[object WeakSet]");
            assert(typeOf(new Thing()) === "WeakSet");
        });

        it("symbol", () => {
            stubObjectToStringOnce("[object Symbol]");
            assert(typeOf(new Thing()) === "Symbol");
        });

        it("promise", () => {
            stubObjectToStringOnce("[object Promise]");
            assert(typeOf(new Thing()) === "Promise");
        });

        it("int8array", () => {
            stubObjectToStringOnce("[object Int8Array]");
            assert(typeOf(new Thing()) === "Int8Array");
        });

        it("uint8array", () => {
            stubObjectToStringOnce("[object Uint8Array]");
            assert(typeOf(new Thing()) === "Uint8Array");
        });

        it("uint8clampedarray", () => {
            stubObjectToStringOnce("[object Uint8ClampedArray]");
            assert(typeOf(new Thing()) === "Uint8ClampedArray");
        });

        it("int16array", () => {
            stubObjectToStringOnce("[object Int16Array]");
            assert(typeOf(new Thing()) === "Int16Array");
        });

        it("uint16array", () => {
            stubObjectToStringOnce("[object Uint16Array]");
            assert(typeOf(new Thing()) === "Uint16Array");
        });

        it("int32array", () => {
            stubObjectToStringOnce("[object Int32Array]");
            assert(typeOf(new Thing()) === "Int32Array");
        });

        it("uint32array", () => {
            stubObjectToStringOnce("[object Uint32Array]");
            assert(typeOf(new Thing()) === "Uint32Array");
        });

        it("float32array", () => {
            stubObjectToStringOnce("[object Float32Array]");
            assert(typeOf(new Thing()) === "Float32Array");
        });

        it("float64array", () => {
            stubObjectToStringOnce("[object Float64Array]");
            assert(typeOf(new Thing()) === "Float64Array");
        });

        it("dataview", () => {
            stubObjectToStringOnce("[object DataView]");
            assert(typeOf(new Thing()) === "DataView");
        });

        it("arraybuffer", () => {
            stubObjectToStringOnce("[object ArrayBuffer]");
            assert(typeOf(new Thing()) === "ArrayBuffer");
        });

        it("generatorfunction", () => {
            stubObjectToStringOnce("[object GeneratorFunction]");
            assert(typeOf(new Thing()) === "GeneratorFunction");
        });

        it("generator", () => {
            stubObjectToStringOnce("[object Generator]");
            assert(typeOf(new Thing()) === "Generator");
        });

        it("string iterator", () => {
            stubObjectToStringOnce("[object String Iterator]");
            assert(typeOf(new Thing()) === "String Iterator");
        });

        it("array iterator", () => {
            stubObjectToStringOnce("[object Array Iterator]");
            assert(typeOf(new Thing()) === "Array Iterator");
        });

        it("map iterator", () => {
            stubObjectToStringOnce("[object Map Iterator]");
            assert(typeOf(new Thing()) === "Map Iterator");
        });

        it("set iterator", () => {
            stubObjectToStringOnce("[object Set Iterator]");
            assert(typeOf(new Thing()) === "Set Iterator");
        });

    });

    describe("@@toStringTag Sham", () => {
        const originalObjectToString = Object.prototype.toString;
        before(() => {
            const globalObject = typeof self === "object" ? self : global;
            globalObject.Symbol = globalObject.Symbol || {};
            if (!Symbol.toStringTag) {
                Symbol.toStringTag = "__@@toStringTag__";
            }
            const test = {};
            test[Symbol.toStringTag] = function () {
                return "foo";
            };
            if (Object.prototype.toString(test) !== "[object foo]") {
                Object.prototype.toString = function () { // eslint-disable-line no-extend-native
                    if (typeof this === "object" && is.function(this[Symbol.toStringTag])) {
                        return `[object ${this[Symbol.toStringTag]()}]`;
                    }
                    return originalObjectToString.call(this);
                };
            }
        });

        after(() => {
            Object.prototype.toString = originalObjectToString; // eslint-disable-line no-extend-native
        });

        it("plain object", () => {
            const obj = {};
            obj[Symbol.toStringTag] = function () {
                return "Foo";
            };
            assert(typeOf(obj) === "Foo", 'typeOf(obj) === "Foo"');
        });

    });

    describe("adone specific", () => {
        class A {}

        it("class", () => {
            assert.equal(typeOf(A), "class");
        });

        it("adone", () => {
            assert.equal(typeOf(adone), "adone");
        });
    });
});
