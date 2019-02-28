const {
    assertion: { util: { type } },
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
        assert(type(""[Symbol.iterator]()) === "String Iterator");
    });

    itIf(symbolExists && is.function(Array.prototype[Symbol.iterator]))("array iterator", () => {
        assert(type([][Symbol.iterator]()) === "Array Iterator");
    });

    itIf(is.function(Array.prototype.entries))("array iterator (entries)", () => {
        assert(type([].entries()) === "Array Iterator");
    });

    itIf(mapExists)("map", () => {
        assert(type(new Map()) === "Map");
    });

    itIf(symbolExists && mapExists && is.function(Map.prototype[Symbol.iterator]))("map iterator", () => {
        assert(type(new Map()[Symbol.iterator]()) === "Map Iterator");
    });

    itIf(mapExists && is.function(Map.prototype.entries))("map iterator (entries)", () => {
        assert(type(new Map().entries()) === "Map Iterator");
    });

    itIf(is.function(WeakMap))("weakmap", () => {
        assert(type(new WeakMap()) === "WeakMap");
    });

    itIf(setExists)("set", () => {
        assert(type(new Set()) === "Set");
    });

    itIf(symbolExists && setExists && is.function(Set.prototype[Symbol.iterator]))("set iterator", () => {
        assert(type(new Set()[Symbol.iterator]()) === "Set Iterator");
    });

    itIf(setExists && is.function(Set.prototype.entries))("set iterator", () => {
        assert(type(new Set().entries()) === "Set Iterator");
    });

    itIf(is.function(WeakSet))("weakset", () => {
        assert(type(new WeakSet()) === "WeakSet");
    });

    itIf(is.function(Symbol))("symbol", () => {
        assert(type(Symbol("foo")) === "symbol");
    });

    itIf(is.function(Promise))("promise", () => {
        function noop() { }
        assert(type(new Promise(noop)) === "Promise");
    });

    itIf(is.function(Int8Array))("int8array", () => {
        assert(type(new Int8Array()) === "Int8Array");
    });

    itIf(is.function(Uint8Array))("uint8array", () => {
        assert(type(new Uint8Array()) === "Uint8Array");
    });

    itIf(is.function(Uint8ClampedArray))("uint8clampedarray", () => {
        assert(type(new Uint8ClampedArray()) === "Uint8ClampedArray");
    });

    itIf(is.function(Int16Array))("int16array", () => {
        assert(type(new Int16Array()) === "Int16Array");
    });

    itIf(is.function(Uint16Array))("uint16array", () => {
        assert(type(new Uint16Array()) === "Uint16Array");
    });

    itIf(is.function(Int32Array))("int32array", () => {
        assert(type(new Int32Array()) === "Int32Array");
    });

    itIf(is.function(Uint32Array))("uint32array", () => {
        assert(type(new Uint32Array()) === "Uint32Array");
    });

    itIf(is.function(Float32Array))("float32array", () => {
        assert(type(new Float32Array()) === "Float32Array");
    });

    itIf(is.function(Float64Array))("float64array", () => {
        assert(type(new Float64Array()) === "Float64Array");
    });

    itIf(is.function(DataView))("dataview", () => {
        const arrayBuffer = new ArrayBuffer(1);
        assert(type(new DataView(arrayBuffer)) === "DataView");
    });

    itIf(is.function(ArrayBuffer))("arraybuffer", () => {
        assert(type(new ArrayBuffer(1)) === "ArrayBuffer");
    });

    itIf(supportArrows)("arrow function", () => {
        assert(type(eval("() => {}")) === "function"); // eslint-disable-line no-eval
    });

    itIf(supportGenerators)("generator function", () => {
        assert(type(eval("function * foo () {}; foo")) === "function"); // eslint-disable-line no-eval
    });

    itIf(supportGenerators)("generator", () => {
        assert(type(eval("(function * foo () {}())")) === "Generator"); // eslint-disable-line no-eval
    });

});
