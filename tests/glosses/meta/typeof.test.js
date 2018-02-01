const { meta: { typeOf } } = adone;

describe("meta", "typeOf", () => {
    it("array", () => {
        assert(typeOf([]) === "Array");
        assert(typeOf([]) === "Array");
    });

    it("regexp", () => {
        assert(typeOf(/a-z/gi) === "RegExp");
        assert(typeOf(new RegExp("a-z")) === "RegExp");
    });

    it("function", () => {
        assert(typeOf(adone.noop) === "function");
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
        assert(typeOf(new EvalError()) === "Error");
        assert(typeOf(new RangeError()) === "Error");
        assert(typeOf(new ReferenceError()) === "Error");
        assert(typeOf(new SyntaxError()) === "Error");
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
        function stubObjectToStringOnce(staticValue) {
            Object.prototype.toString = function () {
                Object.prototype.toString = originalObjectToString;
                return staticValue;
            };
        }
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
            global.Symbol = global.Symbol || {};
            if (!global.Symbol.toStringTag) {
                global.Symbol.toStringTag = "__@@toStringTag__";
            }
            const test = {};
            test[Symbol.toStringTag] = function () {
                return "foo";
            };
            if (Object.prototype.toString(test) !== "[object foo]") {
                Object.prototype.toString = function () {
                    if (typeof this === "object" && typeof this[Symbol.toStringTag] === "function") {
                        return `[object ${this[Symbol.toStringTag]()}]`;
                    }
                    return originalObjectToString.call(this);
                };
            }
        });

        after(() => {
            Object.prototype.toString = originalObjectToString;
        });


        it("plain object", () => {
            const obj = {};
            obj[Symbol.toStringTag] = function () {
                return "Foo";
            };

            assert(typeOf(obj) === "Foo");
        });

    });

    describe("ES2015 Specific", () => {
        it("string iterator", () => {
            assert(typeOf(""[Symbol.iterator]()) === "String Iterator");
        });

        it("array iterator", () => {
            assert(typeOf([][Symbol.iterator]()) === "Array Iterator");
        });

        it("array iterator (entries)", () => {
            assert(typeOf([].entries()) === "Array Iterator");
        });

        it("map", () => {
            assert(typeOf(new Map()) === "Map");
        });

        it("map iterator", () => {
            assert(typeOf(new Map()[Symbol.iterator]()) === "Map Iterator");
        });

        it("map iterator (entries)", () => {
            assert(typeOf(new Map().entries()) === "Map Iterator");
        });

        it("weakmap", () => {
            assert(typeOf(new WeakMap()) === "WeakMap");
        });

        it("set", () => {
            assert(typeOf(new Set()) === "Set");
        });

        it("set iterator", () => {
            assert(typeOf(new Set()[Symbol.iterator]()) === "Set Iterator");
        });

        it("set iterator", () => {
            assert(typeOf(new Set().entries()) === "Set Iterator");
        });

        it("weakset", () => {
            assert(typeOf(new WeakSet()) === "WeakSet");
        });

        it("symbol", () => {
            assert(typeOf(Symbol()) === "symbol");
        });

        it("promise", () => {
            assert(typeOf(new Promise(adone.noop)) === "Promise");
        });

        it("int8array", () => {
            assert(typeOf(new Int8Array()) === "Int8Array");
        });

        it("uint8array", () => {
            assert(typeOf(new Uint8Array()) === "Uint8Array");
        });

        it("uint8clampedarray", () => {
            assert(typeOf(new Uint8ClampedArray()) === "Uint8ClampedArray");
        });

        it("int16array", () => {
            assert(typeOf(new Int16Array()) === "Int16Array");
        });

        it("uint16array", () => {
            assert(typeOf(new Uint16Array()) === "Uint16Array");
        });

        it("int32array", () => {
            assert(typeOf(new Int32Array()) === "Int32Array");
        });

        it("uint32array", () => {
            assert(typeOf(new Uint32Array()) === "Uint32Array");
        });

        it("float32array", () => {
            assert(typeOf(new Float32Array()) === "Float32Array");
        });

        it("float64array", () => {
            assert(typeOf(new Float64Array()) === "Float64Array");
        });

        it("dataview", () => {
            const arrayBuffer = new ArrayBuffer(1);
            assert(typeOf(new DataView(arrayBuffer)) === "DataView");
        });

        it("arraybuffer", () => {
            assert(typeOf(new ArrayBuffer(1)) === "ArrayBuffer");
        });

        it("arrow function", () => {
            assert(typeOf(eval("adone.noop")) === "function");
        });

        it("generator function", () => {
            assert(typeOf(eval("function * foo () {}; foo")) === "function");
        });

        it("generator", () => {
            assert(typeOf(eval("(function * foo () {}())")) === "Generator");
        });
    });

    it("buffer", () => {
        expect(typeOf(Buffer.from("123"))).to.be.equal("Buffer");
    });
});
