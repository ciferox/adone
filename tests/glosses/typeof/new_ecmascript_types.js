const {
    typeOf,
    is
} = adone;

const symbolExists = is.function(Symbol);
const setExists = is.function(Set);
const mapExists = is.function(Map);
let supportArrows = false;
let supportGenerators = false;
try {
    eval("function * foo () {}; foo"); // eslint-disable-line no-eval
    supportGenerators = true;
} catch (error) {
    supportGenerators = false;
}
try {
    eval("() => {}"); // eslint-disable-line no-eval
    supportArrows = true;
} catch (error) {
    supportArrows = false;
}
const itIf = (condition) => condition ? it : it.skip;

describe("ES2015 Specific", () => {
    itIf(symbolExists && is.function(String.prototype[Symbol.iterator]))("string iterator", () => {
        assert(typeOf(""[Symbol.iterator]()) === "String Iterator");
    });

    itIf(symbolExists && is.function(Array.prototype[Symbol.iterator]))("array iterator", () => {
        assert(typeOf([][Symbol.iterator]()) === "Array Iterator");
    });

    itIf(is.function(Array.prototype.entries))("array iterator (entries)", () => {
        assert(typeOf([].entries()) === "Array Iterator");
    });

    itIf(mapExists)("map", () => {
        assert(typeOf(new Map()) === "Map");
    });

    itIf(symbolExists && mapExists && is.function(Map.prototype[Symbol.iterator]))("map iterator", () => {
        assert(typeOf(new Map()[Symbol.iterator]()) === "Map Iterator");
    });

    itIf(mapExists && is.function(Map.prototype.entries))("map iterator (entries)", () => {
        assert(typeOf(new Map().entries()) === "Map Iterator");
    });

    itIf(is.function(WeakMap))("weakmap", () => {
        assert(typeOf(new WeakMap()) === "WeakMap");
    });

    itIf(setExists)("set", () => {
        assert(typeOf(new Set()) === "Set");
    });

    itIf(symbolExists && setExists && is.function(Set.prototype[Symbol.iterator]))("set iterator", () => {
        assert(typeOf(new Set()[Symbol.iterator]()) === "Set Iterator");
    });

    itIf(setExists && is.function(Set.prototype.entries))("set iterator", () => {
        assert(typeOf(new Set().entries()) === "Set Iterator");
    });

    itIf(is.function(WeakSet))("weakset", () => {
        assert(typeOf(new WeakSet()) === "WeakSet");
    });

    itIf(is.function(Symbol))("symbol", () => {
        assert(typeOf(Symbol("foo")) === "symbol");
    });

    itIf(is.function(Promise))("promise", () => {
        function noop() { }
        assert(typeOf(new Promise(noop)) === "Promise");
    });

    itIf(is.function(Int8Array))("int8array", () => {
        assert(typeOf(new Int8Array()) === "Int8Array");
    });

    itIf(is.function(Uint8Array))("uint8array", () => {
        assert(typeOf(new Uint8Array()) === "Uint8Array");
    });

    itIf(is.function(Uint8ClampedArray))("uint8clampedarray", () => {
        assert(typeOf(new Uint8ClampedArray()) === "Uint8ClampedArray");
    });

    itIf(is.function(Int16Array))("int16array", () => {
        assert(typeOf(new Int16Array()) === "Int16Array");
    });

    itIf(is.function(Uint16Array))("uint16array", () => {
        assert(typeOf(new Uint16Array()) === "Uint16Array");
    });

    itIf(is.function(Int32Array))("int32array", () => {
        assert(typeOf(new Int32Array()) === "Int32Array");
    });

    itIf(is.function(Uint32Array))("uint32array", () => {
        assert(typeOf(new Uint32Array()) === "Uint32Array");
    });

    itIf(is.function(Float32Array))("float32array", () => {
        assert(typeOf(new Float32Array()) === "Float32Array");
    });

    itIf(is.function(Float64Array))("float64array", () => {
        assert(typeOf(new Float64Array()) === "Float64Array");
    });

    itIf(is.function(DataView))("dataview", () => {
        const arrayBuffer = new ArrayBuffer(1);
        assert(typeOf(new DataView(arrayBuffer)) === "DataView");
    });

    itIf(is.function(ArrayBuffer))("arraybuffer", () => {
        assert(typeOf(new ArrayBuffer(1)) === "ArrayBuffer");
    });

    itIf(supportArrows)("arrow function", () => {
        assert(typeOf(eval("() => {}")) === "function"); // eslint-disable-line no-eval
    });

    itIf(supportGenerators)("generator function", () => {
        assert(typeOf(eval("function * foo () {}; foo")) === "function"); // eslint-disable-line no-eval
    });

    itIf(supportGenerators)("generator", () => {
        assert(typeOf(eval("(function * foo () {}())")) === "Generator"); // eslint-disable-line no-eval
    });

});
