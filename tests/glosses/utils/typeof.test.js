const { util } = adone;

describe("util", "typeOf", () => {
    it("array", () => {
        assert(util.typeOf([]) === "Array");
        assert(util.typeOf([]) === "Array");
    });

    it("regexp", () => {
        assert(util.typeOf(/a-z/gi) === "RegExp");
        assert(util.typeOf(new RegExp("a-z")) === "RegExp");
    });

    it("function", () => {
        assert(util.typeOf(adone.noop) === "function");
    });

    it("arguments", function () {
        assert(util.typeOf(arguments) === "Arguments");
    });

    it("date", () => {
        assert(util.typeOf(new Date()) === "Date");
    });

    it("number", () => {
        assert(util.typeOf(1) === "number");
        assert(util.typeOf(1.234) === "number");
        assert(util.typeOf(-1) === "number");
        assert(util.typeOf(-1.234) === "number");
        assert(util.typeOf(Infinity) === "number");
        assert(util.typeOf(NaN) === "number");
    });

    it("number objects", () => {
        assert(util.typeOf(new Number(2)) === "Number");
    });

    it("string", () => {
        assert(util.typeOf("hello world") === "string");
    });

    it("string objects", () => {
        assert(util.typeOf(new String("hello")) === "String");
    });

    it("null", () => {
        assert(util.typeOf(null) === "null");
        assert(util.typeOf(undefined) !== "null");
    });

    it("undefined", () => {
        assert(util.typeOf(undefined) === "undefined");
        assert(util.typeOf(null) !== "undefined");
    });

    it("object", () => {
        function Noop() { }
        assert(util.typeOf({}) === "Object");
        assert(util.typeOf(Noop) !== "Object");
        assert(util.typeOf(new Noop()) === "Object");
        assert(util.typeOf(new Object()) === "Object");
        assert(util.typeOf(Object.create(null)) === "Object");
        assert(util.typeOf(Object.create(Object.prototype)) === "Object");
    });

    // See: https://github.com/chaijs/type-detect/pull/25
    it("object with .undefined property getter", () => {
        const foo = {};
        Object.defineProperty(foo, "undefined", {
            get() {
                throw Error("Should never happen");
            }
        });
        assert(util.typeOf(foo) === "Object");
    });

    it("boolean", () => {
        assert(util.typeOf(true) === "boolean");
        assert(util.typeOf(false) === "boolean");
        assert(util.typeOf(!0) === "boolean");
    });

    it("boolean object", () => {
        assert(util.typeOf(new Boolean()) === "Boolean");
    });

    it("error", () => {
        assert(util.typeOf(new Error()) === "Error");
        assert(util.typeOf(new EvalError()) === "Error");
        assert(util.typeOf(new RangeError()) === "Error");
        assert(util.typeOf(new ReferenceError()) === "Error");
        assert(util.typeOf(new SyntaxError()) === "Error");
        assert(util.typeOf(new URIError()) === "Error");
    });

    it("Math", () => {
        assert(util.typeOf(Math) === "Math");
    });

    it("JSON", () => {
        assert(util.typeOf(JSON) === "JSON");
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
            assert(util.typeOf(new Thing()) === "Map");
        });

        it("weakmap", () => {
            stubObjectToStringOnce("[object WeakMap]");
            assert(util.typeOf(new Thing()) === "WeakMap");
        });

        it("set", () => {
            stubObjectToStringOnce("[object Set]");
            assert(util.typeOf(new Thing()) === "Set");
        });

        it("weakset", () => {
            stubObjectToStringOnce("[object WeakSet]");
            assert(util.typeOf(new Thing()) === "WeakSet");
        });

        it("symbol", () => {
            stubObjectToStringOnce("[object Symbol]");
            assert(util.typeOf(new Thing()) === "Symbol");
        });

        it("promise", () => {
            stubObjectToStringOnce("[object Promise]");
            assert(util.typeOf(new Thing()) === "Promise");
        });

        it("int8array", () => {
            stubObjectToStringOnce("[object Int8Array]");
            assert(util.typeOf(new Thing()) === "Int8Array");
        });

        it("uint8array", () => {
            stubObjectToStringOnce("[object Uint8Array]");
            assert(util.typeOf(new Thing()) === "Uint8Array");
        });

        it("uint8clampedarray", () => {
            stubObjectToStringOnce("[object Uint8ClampedArray]");
            assert(util.typeOf(new Thing()) === "Uint8ClampedArray");
        });

        it("int16array", () => {
            stubObjectToStringOnce("[object Int16Array]");
            assert(util.typeOf(new Thing()) === "Int16Array");
        });

        it("uint16array", () => {
            stubObjectToStringOnce("[object Uint16Array]");
            assert(util.typeOf(new Thing()) === "Uint16Array");
        });

        it("int32array", () => {
            stubObjectToStringOnce("[object Int32Array]");
            assert(util.typeOf(new Thing()) === "Int32Array");
        });

        it("uint32array", () => {
            stubObjectToStringOnce("[object Uint32Array]");
            assert(util.typeOf(new Thing()) === "Uint32Array");
        });

        it("float32array", () => {
            stubObjectToStringOnce("[object Float32Array]");
            assert(util.typeOf(new Thing()) === "Float32Array");
        });

        it("float64array", () => {
            stubObjectToStringOnce("[object Float64Array]");
            assert(util.typeOf(new Thing()) === "Float64Array");
        });

        it("dataview", () => {
            stubObjectToStringOnce("[object DataView]");
            assert(util.typeOf(new Thing()) === "DataView");
        });

        it("arraybuffer", () => {
            stubObjectToStringOnce("[object ArrayBuffer]");
            assert(util.typeOf(new Thing()) === "ArrayBuffer");
        });

        it("generatorfunction", () => {
            stubObjectToStringOnce("[object GeneratorFunction]");
            assert(util.typeOf(new Thing()) === "GeneratorFunction");
        });

        it("generator", () => {
            stubObjectToStringOnce("[object Generator]");
            assert(util.typeOf(new Thing()) === "Generator");
        });

        it("string iterator", () => {
            stubObjectToStringOnce("[object String Iterator]");
            assert(util.typeOf(new Thing()) === "String Iterator");
        });

        it("array iterator", () => {
            stubObjectToStringOnce("[object Array Iterator]");
            assert(util.typeOf(new Thing()) === "Array Iterator");
        });

        it("map iterator", () => {
            stubObjectToStringOnce("[object Map Iterator]");
            assert(util.typeOf(new Thing()) === "Map Iterator");
        });

        it("set iterator", () => {
            stubObjectToStringOnce("[object Set Iterator]");
            assert(util.typeOf(new Thing()) === "Set Iterator");
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

            assert(util.typeOf(obj) === "Foo");
        });

    });

    describe("ES2015 Specific", () => {
        it("string iterator", () => {
            assert(util.typeOf(""[Symbol.iterator]()) === "String Iterator");
        });

        it("array iterator", () => {
            assert(util.typeOf([][Symbol.iterator]()) === "Array Iterator");
        });

        it("array iterator (entries)", () => {
            assert(util.typeOf([].entries()) === "Array Iterator");
        });

        it("map", () => {
            assert(util.typeOf(new Map()) === "Map");
        });

        it("map iterator", () => {
            assert(util.typeOf(new Map()[Symbol.iterator]()) === "Map Iterator");
        });

        it("map iterator (entries)", () => {
            assert(util.typeOf(new Map().entries()) === "Map Iterator");
        });

        it("weakmap", () => {
            assert(util.typeOf(new WeakMap()) === "WeakMap");
        });

        it("set", () => {
            assert(util.typeOf(new Set()) === "Set");
        });

        it("set iterator", () => {
            assert(util.typeOf(new Set()[Symbol.iterator]()) === "Set Iterator");
        });

        it("set iterator", () => {
            assert(util.typeOf(new Set().entries()) === "Set Iterator");
        });

        it("weakset", () => {
            assert(util.typeOf(new WeakSet()) === "WeakSet");
        });

        it("symbol", () => {
            assert(util.typeOf(Symbol()) === "symbol");
        });

        it("promise", () => {
            assert(util.typeOf(new Promise(adone.noop)) === "Promise");
        });

        it("int8array", () => {
            assert(util.typeOf(new Int8Array()) === "Int8Array");
        });

        it("uint8array", () => {
            assert(util.typeOf(new Uint8Array()) === "Uint8Array");
        });

        it("uint8clampedarray", () => {
            assert(util.typeOf(new Uint8ClampedArray()) === "Uint8ClampedArray");
        });

        it("int16array", () => {
            assert(util.typeOf(new Int16Array()) === "Int16Array");
        });

        it("uint16array", () => {
            assert(util.typeOf(new Uint16Array()) === "Uint16Array");
        });

        it("int32array", () => {
            assert(util.typeOf(new Int32Array()) === "Int32Array");
        });

        it("uint32array", () => {
            assert(util.typeOf(new Uint32Array()) === "Uint32Array");
        });

        it("float32array", () => {
            assert(util.typeOf(new Float32Array()) === "Float32Array");
        });

        it("float64array", () => {
            assert(util.typeOf(new Float64Array()) === "Float64Array");
        });

        it("dataview", () => {
            const arrayBuffer = new ArrayBuffer(1);
            assert(util.typeOf(new DataView(arrayBuffer)) === "DataView");
        });

        it("arraybuffer", () => {
            assert(util.typeOf(new ArrayBuffer(1)) === "ArrayBuffer");
        });

        it("arrow function", () => {
            assert(util.typeOf(eval("adone.noop")) === "function");
        });

        it("generator function", () => {
            assert(util.typeOf(eval("function * foo () {}; foo")) === "function");
        });

        it("generator", () => {
            assert(util.typeOf(eval("(function * foo () {}())")) === "Generator");
        });
    });

    it("buffer", () => {
        expect(util.typeOf(Buffer.from("123"))).to.be.equal("Buffer");
    });
});
