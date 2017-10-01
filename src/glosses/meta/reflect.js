const {
    is
} = adone;

adone.asNamespace(exports);

// feature test for Symbol support
const toPrimitiveSymbol = typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : "@@toPrimitive";
const iteratorSymbol = typeof Symbol.iterator !== "undefined" ? Symbol.iterator : "@@iterator";
// Load global or shim versions of Map, Set, and WeakMap
const functionPrototype = Object.getPrototypeOf(Function);
// [[Metadata]] internal slot
// https://rbuckton.github.io/reflect-metadata/#ordinary-object-internal-methods-and-internal-slots
const Metadata = new WeakMap();

const decorateConstructor = (decorators, target) => {
    for (let i = decorators.length - 1; i >= 0; --i) {
        const decorator = decorators[i];
        const decorated = decorator(target);
        if (!is.undefined(decorated) && !is.null(decorated)) {
            if (!is.function(decorated)) {
                throw new TypeError();
            }
            target = decorated;
        }
    }
    return target;
};


// 6 ECMAScript Data Typ0es and Values
// https://tc39.github.io/ecma262/#sec-ecmascript-data-types-and-values
const getType = (x) => {
    if (x === null) {
        return 1;
    }
    switch (typeof x) {
        case "undefined": return 0;
        case "boolean": return 2;
        case "string": return 3;
        case "symbol": return 4;
        case "number": return 5;
        case "object": return x === null ? 1 /* Null */ : 6;
        default: return 6;
    }
};

// 7.1.1.1 ordinaryToPrimitive(O, hint)
// https://tc39.github.io/ecma262/#sec-ordinarytoprimitive
const ordinaryToPrimitive = (obj, hint) => {
    if (hint === "string") {
        const toString = obj.toString;
        if (is.function(toString)) {
            const result = toString.call(obj);
            if (!is.object(result)) {
                return result;
            }
        }
        const valueOf = obj.valueOf;
        if (is.function(valueOf)) {
            const result = valueOf.call(obj);
            if (!is.object(result)) {
                return result;
            }
        }
    } else {
        const valueOf = obj.valueOf;
        if (is.function(valueOf)) {
            const result = valueOf.call(obj);
            if (!is.object(result)) {
                return result;
            }
        }
        const toString = obj.toString;
        if (is.function(toString)) {
            const result = toString.call(obj);
            if (!is.object(result)) {
                return result;
            }
        }
    }
    throw new TypeError();
};

// 7.1.2 toBoolean(argument)
// https://tc39.github.io/ecma262/2016/#sec-toboolean
const toBoolean = (argument) => Boolean(argument);

// 7.1.12 toString(argument)
// https://tc39.github.io/ecma262/#sec-tostring
const toString = (argument) => String(argument);

// 7.2.7 isPropertyKey(argument)
// https://tc39.github.io/ecma262/#sec-ispropertykey
const isPropertyKey = (argument) => {
    switch (getType(argument)) {
        case 3 /* String */: return true;
        case 4 /* Symbol */: return true;
        default: return false;
    }
};

// 7.3 Operations on Objects
// https://tc39.github.io/ecma262/#sec-operations-on-objects
// 7.3.9 getMethod(V, P)
// https://tc39.github.io/ecma262/#sec-getmethod
const getMethod = (V, P) => {
    const func = V[P];
    if (func === undefined || func === null) {
        return undefined;
    }
    if (!is.function(func)) {
        throw new TypeError();
    }
    return func;
};

// 7.1 Type Conversion
// https://tc39.github.io/ecma262/#sec-type-conversion
// 7.1.1 toPrimitive(input [, PreferredType])
// https://tc39.github.io/ecma262/#sec-toprimitive
const toPrimitive = (input, PreferredType) => {
    switch (getType(input)) {
        case 0 /* Undefined */: return input;
        case 1 /* Null */: return input;
        case 2 /* Boolean */: return input;
        case 3 /* String */: return input;
        case 4 /* Symbol */: return input;
        case 5 /* Number */: return input;
    }
    const hint = PreferredType === 3 /* String */ ? "string" : PreferredType === 5 /* Number */ ? "number" : "default";
    const exoticToPrim = getMethod(input, toPrimitiveSymbol);
    if (exoticToPrim !== undefined) {
        const result = exoticToPrim.call(input, hint);
        if (is.object(result)) {
            throw new TypeError();
        }
        return result;
    }
    return ordinaryToPrimitive(input, hint === "default" ? "number" : hint);
};

// 7.1.14 toPropertyKey(argument)
// https://tc39.github.io/ecma262/#sec-topropertykey
const toPropertyKey = (argument) => {
    const key = toPrimitive(argument, 3 /* String */);
    if (is.symbol(key)) {
        return key;
    }
    return toString(key);
};

const decorateProperty = (decorators, target, propertyKey, descriptor) => {
    for (let i = decorators.length - 1; i >= 0; --i) {
        const decorator = decorators[i];
        const decorated = decorator(target, propertyKey, descriptor);
        if (!is.undefined(decorated) && !is.null(decorated)) {
            if (!is.object(decorated)) {
                throw new TypeError();
            }
            descriptor = decorated;
        }
    }
    return descriptor;
};

const getOrCreateMetadataMap = (O, P, Create) => {
    let targetMetadata = Metadata.get(O);
    if (is.undefined(targetMetadata)) {
        if (!Create) {
            return undefined;
        }
        targetMetadata = new Map();
        Metadata.set(O, targetMetadata);
    }
    let metadataMap = targetMetadata.get(P);
    if (is.undefined(metadataMap)) {
        if (!Create) {
            return undefined;
        }
        metadataMap = new Map();
        targetMetadata.set(P, metadataMap);
    }
    return metadataMap;
};

// 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
const ordinaryHasOwnMetadata = (MetadataKey, O, P) => {
    const metadataMap = getOrCreateMetadataMap(O, P, /*Create*/ false);
    if (is.undefined(metadataMap)) {
        return false;
    }
    return toBoolean(metadataMap.has(MetadataKey));
};

// 9.1 Ordinary Object Internal Methods and Internal Slots
// https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots
// 9.1.1.1 ordinaryGetPrototypeOf(O)
// https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
const ordinaryGetPrototypeOf = (O) => {
    const proto = Object.getPrototypeOf(O);
    if (typeof O !== "function" || O === functionPrototype) {
        return proto;
    }
    // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
    // Try to determine the superclass constructor. Compatible implementations
    // must either set __proto__ on a subclass constructor to the superclass constructor,
    // or ensure each class has a valid `constructor` property on its prototype that
    // points back to the constructor.
    // If this is not the same as Function.[[Prototype]], then this is definately inherited.
    // This is the case when in ES6 or when using __proto__ in a compatible browser.
    if (proto !== functionPrototype) {
        return proto;
    }
    // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
    const prototype = O.prototype;
    const prototypeProto = prototype && Object.getPrototypeOf(prototype);
    if (prototypeProto == null || prototypeProto === Object.prototype) {
        return proto;
    }
    // If the constructor was not a function, then we cannot determine the heritage.
    const constructor = prototypeProto.constructor;
    if (typeof constructor !== "function") {
        return proto;
    }
    // If we have some kind of self-reference, then we cannot determine the heritage.
    if (constructor === O) {
        return proto;
    }
    // we have a pretty good guess at the heritage.
    return constructor;
};


// 3.1.1.1 ordinaryHasMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinaryhasmetadata
const ordinaryHasMetadata = (MetadataKey, O, P) => {
    const hasOwn = ordinaryHasOwnMetadata(MetadataKey, O, P);
    if (hasOwn) {
        return true;
    }
    const parent = ordinaryGetPrototypeOf(O);
    if (!is.null(parent)) {
        return ordinaryHasMetadata(MetadataKey, parent, P);
    }
    return false;
};

// 3.1.4.1 ordinaryGetOwnMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
const ordinaryGetOwnMetadata = (MetadataKey, O, P) => {
    const metadataMap = getOrCreateMetadataMap(O, P, /*Create*/ false);
    if (is.undefined(metadataMap)) {
        return undefined;
    }
    return metadataMap.get(MetadataKey);
};


// 3.1.3.1 ordinaryGetMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarygetmetadata
const ordinaryGetMetadata = (MetadataKey, O, P) => {
    const hasOwn = ordinaryHasOwnMetadata(MetadataKey, O, P);
    if (hasOwn) {
        return ordinaryGetOwnMetadata(MetadataKey, O, P);
    }
    const parent = ordinaryGetPrototypeOf(O);
    if (!is.null(parent)) {
        return ordinaryGetMetadata(MetadataKey, parent, P);
    }
    return undefined;
};

// 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
const ordinaryDefineOwnMetadata = (MetadataKey, MetadataValue, O, P) => {
    const metadataMap = getOrCreateMetadataMap(O, P, /*Create*/ true);
    metadataMap.set(MetadataKey, MetadataValue);
};

// 7.4 Operations on Iterator Objects
// https://tc39.github.io/ecma262/#sec-operations-on-iterator-objects
const getIterator = (obj) => {
    const method = getMethod(obj, iteratorSymbol);
    if (!is.function(method)) {
        throw new TypeError();
    } // from Call
    const iterator = method.call(obj);
    if (!is.object(iterator)) {
        throw new TypeError();
    }
    return iterator;
};

// 7.4.5 iteratorStep(iterator)
// https://tc39.github.io/ecma262/#sec-iteratorstep
const iteratorStep = (iterator) => {
    const result = iterator.next();
    return result.done ? false : result;
};

// 7.4.4 iteratorValue(iterResult)
// https://tc39.github.io/ecma262/2016/#sec-iteratorvalue
const iteratorValue = (iterResult) => iterResult.value;

// 7.4.6 iteratorClose(iterator, completion)
// https://tc39.github.io/ecma262/#sec-iteratorclose
const iteratorClose = (iterator) => {
    const f = iterator.return;
    if (f) {
        f.call(iterator);
    }
};

// 3.1.7.1 ordinaryOwnMetadataKeys(O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
const ordinaryOwnMetadataKeys = (O, P) => {
    const keys = [];
    const metadataMap = getOrCreateMetadataMap(O, P, /*Create*/ false);
    if (is.undefined(metadataMap)) {
        return keys;
    }
    const keysObj = metadataMap.keys();
    const iterator = getIterator(keysObj);
    let k = 0;
    while (true) {
        const next = iteratorStep(iterator);
        if (!next) {
            keys.length = k;
            return keys;
        }
        const nextValue = iteratorValue(next);
        try {
            keys[k] = nextValue;
        } catch (e) {
            try {
                iteratorClose(iterator);
            } finally {
                throw e;
            }
        }
        k++;
    }
};

// 3.1.6.1 ordinaryMetadataKeys(O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarymetadatakeys
const ordinaryMetadataKeys = (O, P) => {
    const ownKeys = ordinaryOwnMetadataKeys(O, P);
    const parent = ordinaryGetPrototypeOf(O);
    if (parent === null) {
        return ownKeys;
    }
    const parentKeys = ordinaryMetadataKeys(parent, P);
    if (parentKeys.length <= 0) {
        return ownKeys;
    }
    if (ownKeys.length <= 0) {
        return parentKeys;
    }
    const set = new Set();
    const keys = [];
    for (let i = 0, ownKeys1 = ownKeys; i < ownKeys1.length; i++) {
        const key = ownKeys1[i];
        const hasKey = set.has(key);
        if (!hasKey) {
            set.add(key);
            keys.push(key);
        }
    }
    for (let a = 0, parentKeys1 = parentKeys; a < parentKeys1.length; a++) {
        const key = parentKeys1[a];
        const hasKey = set.has(key);
        if (!hasKey) {
            set.add(key);
            keys.push(key);
        }
    }
    return keys;
};


/**
 * Applies a set of decorators to a property of a target object.
 * @param decorators An array of decorators.
 * @param target The target object.
 * @param propertyKey (Optional) The property key to decorate.
 * @param attributes (Optional) The property descriptor for the target key.
 * @remarks Decorators are applied in reverse order.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     Example = Reflect.decorate(decoratorsArray, Example);
 *
 *     // property (on constructor)
 *     Reflect.decorate(decoratorsArray, Example, "staticProperty");
 *
 *     // property (on prototype)
 *     Reflect.decorate(decoratorsArray, Example.prototype, "property");
 *
 *     // method (on constructor)
 *     Object.defineProperty(Example, "staticMethod",
 *         Reflect.decorate(decoratorsArray, Example, "staticMethod",
 *             Object.getOwnPropertyDescriptor(Example, "staticMethod")));
 *
 *     // method (on prototype)
 *     Object.defineProperty(Example.prototype, "method",
 *         Reflect.decorate(decoratorsArray, Example.prototype, "method",
 *             Object.getOwnPropertyDescriptor(Example.prototype, "method")));
 *
 */
export const decorate = (decorators, target, propertyKey, attributes) => {
    if (!is.undefined(propertyKey)) {
        if (!is.array(decorators)) {
            throw new TypeError();
        }
        if (!is.object(target)) {
            throw new TypeError();
        }
        if (!is.object(attributes) && !is.undefined(attributes) && !is.null(attributes)) {
            throw new TypeError();
        }
        if (is.null(attributes)) {
            attributes = undefined;
        }
        propertyKey = toPropertyKey(propertyKey);
        return decorateProperty(decorators, target, propertyKey, attributes);
    } 
    if (!is.array(decorators)) {
        throw new TypeError();
    }
    if (!is.function(target)) {
        throw new TypeError();
    }
    return decorateConstructor(decorators, target);
    
};

// 4.1.2 Reflect.metadata(metadataKey, metadataValue)
// https://rbuckton.github.io/reflect-metadata/#reflect.metadata
/**
 * A default metadata decorator factory that can be used on a class, class member, or parameter.
 * @param metadataKey The key for the metadata entry.
 * @param metadataValue The value for the metadata entry.
 * @returns A decorator function.
 * @remarks
 * If `metadataKey` is already defined for the target and target key, the
 * metadataValue for that key will be overwritten.
 * @example
 *
 *     // constructor
 *     @Reflect.metadata(key, value)
 *     class Example {
 *     }
 *
 *     // property (on constructor, TypeScript only)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         static staticProperty;
 *     }
 *
 *     // property (on prototype, TypeScript only)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         property;
 *     }
 *
 *     // method (on constructor)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         static staticMethod() { }
 *     }
 *
 *     // method (on prototype)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         method() { }
 *     }
 *
 */
export const metadata = (metadataKey, metadataValue) => {
    return function decorator(target, propertyKey) {
        if (!is.object(target)) {
            throw new TypeError();
        }
        if (!is.undefined(propertyKey) && !isPropertyKey(propertyKey)) {
            throw new TypeError();
        }
        ordinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
    };
};

/**
 * Define a unique metadata entry on the target.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param metadataValue A value that contains attached metadata.
 * @param target The target object on which to define metadata.
 * @param propertyKey (Optional) The property key for the target.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     Reflect.defineMetadata("custom:annotation", options, Example);
 *
 *     // property (on constructor)
 *     Reflect.defineMetadata("custom:annotation", options, Example, "staticProperty");
 *
 *     // property (on prototype)
 *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "property");
 *
 *     // method (on constructor)
 *     Reflect.defineMetadata("custom:annotation", options, Example, "staticMethod");
 *
 *     // method (on prototype)
 *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "method");
 *
 *     // decorator factory as metadata-producing annotation.
 *     function MyAnnotation(options): Decorator {
 *         return (target, key?) => Reflect.defineMetadata("custom:annotation", options, target, key);
 *     }
 *
 */
export const defineMetadata = (metadataKey, metadataValue, target, propertyKey) => {
    if (!is.object(target)) {
        throw new TypeError();
    }
    if (!is.undefined(propertyKey)) {
        propertyKey = toPropertyKey(propertyKey);
    }
    return ordinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
};

/**
 * Gets a value indicating whether the target object or its prototype chain has the provided metadata key defined.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns `true` if the metadata key was defined on the target object or its prototype chain; otherwise, `false`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.hasMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.hasMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.hasMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "method");
 *
 */
export const hasMetadata = (metadataKey, target, propertyKey) => {
    if (!is.object(target)) {
        throw new TypeError();
    }
    if (!is.undefined(propertyKey)) {
        propertyKey = toPropertyKey(propertyKey);
    }
    return ordinaryHasMetadata(metadataKey, target, propertyKey);
};

/**
 * Gets a value indicating whether the target object has the provided metadata key defined.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns `true` if the metadata key was defined on the target object; otherwise, `false`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "method");
 *
 */
export const hasOwnMetadata = (metadataKey, target, propertyKey) => {
    if (!is.object(target)) {
        throw new TypeError();
    }
    if (!is.undefined(propertyKey)) {
        propertyKey = toPropertyKey(propertyKey);
    }
    return ordinaryHasOwnMetadata(metadataKey, target, propertyKey);
};

/**
 * Gets the metadata value for the provided metadata key on the target object or its prototype chain.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *   
 *   result = Reflect.getMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "method");
 *
 */
export const getMetadata = (metadataKey, target, propertyKey) => {
    if (!is.object(target)) {
        throw new TypeError();
    }
    if (!is.undefined(propertyKey)) {
        propertyKey = toPropertyKey(propertyKey);
    }
    return ordinaryGetMetadata(metadataKey, target, propertyKey);
};

/**
 * Gets the metadata value for the provided metadata key on the target object.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getOwnMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "method");
 *
 */
export const getOwnMetadata = (metadataKey, target, propertyKey) => {
    if (!is.object(target)) {
        throw new TypeError();
    }
    if (!is.undefined(propertyKey)) {
        propertyKey = toPropertyKey(propertyKey);
    }
    return ordinaryGetOwnMetadata(metadataKey, target, propertyKey);
};

/**
 * Gets the metadata keys defined on the target object or its prototype chain.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns An array of unique metadata keys.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getMetadataKeys(Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getMetadataKeys(Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getMetadataKeys(Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getMetadataKeys(Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getMetadataKeys(Example.prototype, "method");
 *
 */
export const getMetadataKeys = (target, propertyKey) => {
    if (!is.object(target)) {
        throw new TypeError();
    }
    if (!is.undefined(propertyKey)) {
        propertyKey = toPropertyKey(propertyKey);
    }
    return ordinaryMetadataKeys(target, propertyKey);
};

/**
 * Gets the unique metadata keys defined on the target object.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns An array of unique metadata keys.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getOwnMetadataKeys(Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getOwnMetadataKeys(Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getOwnMetadataKeys(Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getOwnMetadataKeys(Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getOwnMetadataKeys(Example.prototype, "method");
 *
 */
export const getOwnMetadataKeys = (target, propertyKey) => {
    if (!is.object(target)) {
        throw new TypeError();
    }
    if (!is.undefined(propertyKey)) {
        propertyKey = toPropertyKey(propertyKey);
    }
    return ordinaryOwnMetadataKeys(target, propertyKey);
};

/**
 * Deletes the metadata entry from the target object with the provided key.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns `true` if the metadata entry was found and deleted; otherwise, false.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.deleteMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "method");
 *
 */
export const deleteMetadata = (metadataKey, target, propertyKey) => {
    if (!is.object(target)) {
        throw new TypeError();
    }
    if (!is.undefined(propertyKey)) {
        propertyKey = toPropertyKey(propertyKey);
    }
    const metadataMap = getOrCreateMetadataMap(target, propertyKey, /*Create*/ false);
    if (is.undefined(metadataMap)) {
        return false;
    }
    if (!metadataMap.delete(metadataKey)) {
        return false;
    }
    if (metadataMap.size > 0) {
        return true;
    }
    const targetMetadata = Metadata.get(target);
    targetMetadata.delete(propertyKey);
    if (targetMetadata.size > 0) {
        return true;
    }
    Metadata.delete(target);
    return true;
};
