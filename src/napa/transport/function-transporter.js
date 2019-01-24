////////////////////////////////////////////////////////////////////////
// Module to support function transport.

const {
    is,
    std: { path }
} = adone;

/// <summary> Function hash to function cache. </summary>
const _hashToFunctionCache = {};

/// <summary> Function to hash cache. </summary>
/// <remarks> Function cannot be used as a key in TypeScript. </remarks>
const _functionToHashCache = {};

/// <summary> Marshalled function body cache. </summary>
let _store;

// /// <summary> Interface for function definition that will be saved in store. </summary>
// interface FunctionDef {
//     /// <summary> From which file name the function is defined. </summary>
//     origin;

//     /// <summary> Function body. </summary>
//     body;
// }

/// <summary> Get underlying store to save marshall function body across isolates. </summary>
const getStore = function () {
    if (is.nil(_store)) {
        // Lazy creation function store
        // 1) avoid circular runtime dependency between store and transport.
        // 2) avoid unnecessary cost when function transport is not used.
        _store = require("../store/store-api").getOrCreate("__napajs_marshalled_functions");
    }
    return _store;
};

/// <summary> Cache function with its hash in current isolate. </summary>
const cacheFunction = function (hash, func) {
    _functionToHashCache[func] = hash;
    _hashToFunctionCache[hash] = func;
};

/// <summary> Generate hash for function definition using DJB2 algorithm. 
/// See: https://en.wikipedia.org/wiki/DJB2 
/// </summary>
const getFunctionHash = function (signature) {
    let hash = 5381;
    for (let i = 0; i < signature.length; ++i) {
        hash = (hash * 33) ^ signature.charCodeAt(i);
    }

    /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
    * integers. Since we want the results to be always positive, convert the
    * signed int to an unsigned by doing an unsigned bitshift. */
    return (hash >>> 0).toString(16);
};

/// <summary> Load function from definition. </summary>
const loadFunction = function (def) {
    const moduleId = def.origin;
    const script = `module.exports = ${def.body};`;
    let func = null;

    if (typeof __in_napa === "undefined") {
        // In node, we create a sandbox using Module
        let Module = null;
        if (is.nil(Module)) {
            Module = require("module");
        }
        const module = new Module(moduleId);
        module.filename = moduleId;
        module.paths = Module._nodeModulePaths(path.dirname(def.origin));
        module._compile(script, moduleId);
        func = module.exports;

    } else {
        // In napa, we create a sandbox using require(path, script);
        func = require(moduleId, script);
    }
    func.origin = def.origin;
    return func;
};


/// <summary> Save function and get a hash string to use it later. </summary>
export const save = function (func) {
    let hash = _functionToHashCache[func];
    if (is.nil(hash)) {
        // Should happen only on first marshall of input function in current isolate.
        const origin = func.origin || "";
        const body = func.toString();
        const fullContent = `${origin}:${body}`;
        hash = getFunctionHash(fullContent);
        const def = {
            origin,
            body
        };
        getStore().set(hash, def);
        cacheFunction(hash, func);
    }
    return hash;
};

/// <summary> Load a function with a hash retrieved from `save`. </summary>
export const load = function (hash) {
    let func = _hashToFunctionCache[hash];
    if (is.nil(func)) {
        // Should happen only on first unmarshall of given hash in current isolate..
        const def = getStore().get(hash);
        if (is.nil(def)) {
            throw new Error(`Function hash cannot be found: ${hash}`);
        }
        func = loadFunction(def);
        cacheFunction(hash, func);
    }
    return func;
};
