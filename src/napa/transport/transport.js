import * as functionTransporter from "./function-transporter";
import * as builtinObjectTransporter from "./builtin-object-transporter";

const {
    is
} = adone;

/// <summary> Per-isolate cid => constructor registry. </summary>
const _registry = new Map();

const _builtInTypeWhitelist = new Set();
[
    "ArrayBuffer",
    "Float32Array",
    "Float64Array",
    "Int16Array",
    "Int32Array",
    "Int8Array",
    "SharedArrayBuffer",
    "Uint16Array",
    "Uint32Array",
    "Uint8Array"
].forEach((type) => {
    _builtInTypeWhitelist.add(type);
});

/// <summary> Register a TransportableObject sub-class with a Constructor ID (cid). </summary>
export const register = function (subClass) {
    // Check cid from constructor first, which is for TransportableObject. 
    // Thus we don't need to construct the object to get cid according to Transportable interface. 
    let cid = subClass._cid;
    if (is.nil(cid)) {
        cid = new subClass().cid();
    }
    if (is.nil(cid)) {
        throw new Error(`Class "${subClass.name}" doesn't implement cid(), did you forget put @cid decorator before class declaration?`);
    }
    if (_registry.has(cid)) {
        throw new Error(`Constructor ID (cid) "${cid}" is already registered.`);
    }
    _registry.set(cid, subClass);
};

/// <summary> Marshall transform a JS value to a plain JS value that will be stringified. </summary> 
export const marshallTransform = function (jsValue, context) {
    if (!is.nil(jsValue) && typeof jsValue === "object" && !is.array(jsValue)) {
        const constructorName = Object.getPrototypeOf(jsValue).constructor.name;
        if (constructorName !== "Object") {
            if (is.function(jsValue.cid)) {
                if (is.nil(context)) {
                    throw new Error(`Cannot transport type "${constructorName}" without a transport context.`);
                }
                return (jsValue).marshall(context);
            } else if (_builtInTypeWhitelist.has(constructorName)) {
                const serializedData = builtinObjectTransporter.serializeValue(jsValue);
                if (serializedData) {
                    return { _serialized: serializedData };
                }
                throw new Error(`Failed to serialize object with type of "${constructorName}".`);

            } else {
                throw new Error(`Object type "${constructorName}" is not transportable.`);
            }
        }
    }
    return jsValue;
};

/// <summary> Unmarshall transform a plain JS value to a transportable class instance. </summary>
/// <param name="payload"> Plain Javascript value. </param> 
/// <param name="context"> Transport context. </param>
/// <returns> Transported value. </returns>
const unmarshallTransform = function (payload, context) {
    if (is.nil(payload)) {
        return payload;
    }
    if (!is.undefined(payload._cid)) {
        const cid = payload._cid;
        if (cid === "function") {
            return functionTransporter.load(payload.hash);
        }
        if (is.nil(context)) {
            throw new Error(`Cannot transport type with cid "${cid}" without a transport context.`);
        }
        const subClass = _registry.get(cid);
        if (is.nil(subClass)) {
            throw new Error(`Unrecognized Constructor ID (cid) "${cid}". Please ensure @cid is applied on the class or transport.register is called on the class.`);
        }
        const object = new subClass();
        object.unmarshall(payload, context);
        return object;
    } else if (payload.hasOwnProperty("_serialized")) {
        return builtinObjectTransporter.deserializeValue(payload._serialized);
    }
    return payload;
};

/// <summary> Unmarshall from JSON string to a JavaScript value, which could contain complex/native objects. </summary>
/// <param name="json"> JSON string. </summary>
/// <param name="context"> Transport context to save shared pointers. </param>
/// <returns> Parsed JavaScript value, which could be built-in JavaScript types or deserialized Transportable objects. </returns>
export const unmarshall = function (json, context) {

    if (json === "undefined") {
        return undefined;
    }
    return JSON.parse(json,
        (key, value) => {
            return unmarshallTransform(value, context);
        });
};

/// <summary> Marshall a JavaScript value to JSON. </summary>
/// <param name="jsValue"> JavaScript value to stringify, which maybe built-in JavaScript types or transportable objects. </param>
/// <param name="context"> Transport context to save shared pointers. </param>
/// <returns> JSON string. </returns>
export const marshall = function (jsValue, context) {
    // Function is transportable only as root object. 
    // This is to avoid unexpected marshalling on member functions.
    if (is.function(jsValue)) {
        return `{"_cid": "function", "hash": "${functionTransporter.save(jsValue)}"}`;
    }
    return JSON.stringify(jsValue,
        (key, value) => {
            return marshallTransform(value, context);
        });
};
