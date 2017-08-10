const definitions = {
    builtins: {
        Symbol: "symbol",
        Promise: "promise",
        Map: "map",
        WeakMap: "weak-map",
        Set: "set",
        WeakSet: "weak-set",
        Observable: "observable",
        setImmediate: "set-immediate",
        clearImmediate: "clear-immediate",
        asap: "asap"
        //parseFloat: "parse-float", // temporary disabled
        //parseInt: "parse-int" // temporary disabled
    },

    methods: {
        Array: {
            concat: "array/concat", // deprecated
            copyWithin: "array/copy-within",
            entries: "array/entries",
            every: "array/every",
            fill: "array/fill",
            filter: "array/filter",
            findIndex: "array/find-index",
            find: "array/find",
            forEach: "array/for-each",
            from: "array/from",
            includes: "array/includes",
            indexOf: "array/index-of",
            //isArray: "array/is-array", // temporary disabled
            join: "array/join",
            keys: "array/keys",
            lastIndexOf: "array/last-index-of",
            map: "array/map",
            of: "array/of",
            pop: "array/pop", // deprecated
            push: "array/push", // deprecated
            reduceRight: "array/reduce-right",
            reduce: "array/reduce",
            reverse: "array/reverse", // deprecated
            shift: "array/shift", // deprecated
            slice: "array/slice", // deprecated
            some: "array/some",
            sort: "array/sort",
            splice: "array/splice",
            unshift: "array/unshift", // deprecated
            values: "array/values"
        },

        JSON: {
            stringify: "json/stringify"
        },

        Object: {
            assign: "object/assign",
            create: "object/create",
            defineProperties: "object/define-properties",
            defineProperty: "object/define-property",
            entries: "object/entries",
            freeze: "object/freeze",
            getOwnPropertyDescriptor: "object/get-own-property-descriptor",
            getOwnPropertyDescriptors: "object/get-own-property-descriptors",
            getOwnPropertyNames: "object/get-own-property-names",
            getOwnPropertySymbols: "object/get-own-property-symbols",
            getPrototypeOf: "object/get-prototype-of",
            isExtensible: "object/is-extensible",
            isFrozen: "object/is-frozen",
            isSealed: "object/is-sealed",
            is: "object/is",
            keys: "object/keys",
            preventExtensions: "object/prevent-extensions",
            seal: "object/seal",
            setPrototypeOf: "object/set-prototype-of",
            values: "object/values"
        },

        RegExp: {
            escape: "regexp/escape" // deprecated
        },

        Math: {
            acosh: "math/acosh",
            asinh: "math/asinh",
            atanh: "math/atanh",
            cbrt: "math/cbrt",
            clz32: "math/clz32",
            cosh: "math/cosh",
            expm1: "math/expm1",
            fround: "math/fround",
            hypot: "math/hypot",
            imul: "math/imul",
            log10: "math/log10",
            log1p: "math/log1p",
            log2: "math/log2",
            sign: "math/sign",
            sinh: "math/sinh",
            tanh: "math/tanh",
            trunc: "math/trunc",
            iaddh: "math/iaddh",
            isubh: "math/isubh",
            imulh: "math/imulh",
            umulh: "math/umulh"
        },

        Symbol: {
            for: "symbol/for",
            hasInstance: "symbol/has-instance",
            isConcatSpreadable: "symbol/is-concat-spreadable",
            iterator: "symbol/iterator",
            keyFor: "symbol/key-for",
            match: "symbol/match",
            replace: "symbol/replace",
            search: "symbol/search",
            species: "symbol/species",
            split: "symbol/split",
            toPrimitive: "symbol/to-primitive",
            toStringTag: "symbol/to-string-tag",
            unscopables: "symbol/unscopables"
        },

        String: {
            at: "string/at",
            codePointAt: "string/code-point-at",
            endsWith: "string/ends-with",
            fromCodePoint: "string/from-code-point",
            includes: "string/includes",
            matchAll: "string/match-all",
            padLeft: "string/pad-left", // deprecated
            padRight: "string/pad-right", // deprecated
            padStart: "string/pad-start",
            padEnd: "string/pad-end",
            raw: "string/raw",
            repeat: "string/repeat",
            startsWith: "string/starts-with",
            trim: "string/trim",
            trimLeft: "string/trim-left",
            trimRight: "string/trim-right",
            trimStart: "string/trim-start",
            trimEnd: "string/trim-end"
        },

        Number: {
            EPSILON: "number/epsilon",
            isFinite: "number/is-finite",
            isInteger: "number/is-integer",
            isNaN: "number/is-nan",
            isSafeInteger: "number/is-safe-integer",
            MAX_SAFE_INTEGER: "number/max-safe-integer",
            MIN_SAFE_INTEGER: "number/min-safe-integer",
            parseFloat: "number/parse-float",
            parseInt: "number/parse-int"
        },

        Reflect: {
            apply: "reflect/apply",
            construct: "reflect/construct",
            defineProperty: "reflect/define-property",
            deleteProperty: "reflect/delete-property",
            enumerate: "reflect/enumerate", // deprecated
            getOwnPropertyDescriptor: "reflect/get-own-property-descriptor",
            getPrototypeOf: "reflect/get-prototype-of",
            get: "reflect/get",
            has: "reflect/has",
            isExtensible: "reflect/is-extensible",
            ownKeys: "reflect/own-keys",
            preventExtensions: "reflect/prevent-extensions",
            setPrototypeOf: "reflect/set-prototype-of",
            set: "reflect/set",
            defineMetadata: "reflect/define-metadata",
            deleteMetadata: "reflect/delete-metadata",
            getMetadata: "reflect/get-metadata",
            getMetadataKeys: "reflect/get-metadata-keys",
            getOwnMetadata: "reflect/get-own-metadata",
            getOwnMetadataKeys: "reflect/get-own-metadata-keys",
            hasMetadata: "reflect/has-metadata",
            hasOwnMetadata: "reflect/has-own-metadata",
            metadata: "reflect/metadata"
        },

        System: {
            global: "system/global"
        },

        Error: {
            isError: "error/is-error" // deprecated
        },

        Date: {
            //now: "date/now" // temporary disabled
        },

        Function: {
            // Warning: /virtual/ method - prototype, not static, version
            //bind: "function/virtual/bind" // temporary disabled
        }
    }
};


export default function ({ types: t }) {
    const getRuntimeModuleName = (opts) => opts.moduleName || "babel-runtime";

    const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

    const HELPER_BLACKLIST = ["interopRequireWildcard", "interopRequireDefault"];

    return {
        pre(file) {
            const moduleName = getRuntimeModuleName(this.opts);

            if (this.opts.helpers !== false) {
                file.set("helperGenerator", (name) => {
                    if (HELPER_BLACKLIST.indexOf(name) < 0) {
                        return file.addImport(`${moduleName}/helpers/${name}`, "default", name);
                    }
                });
            }

            this.setDynamic("regeneratorIdentifier", () => {
                return file.addImport(`${moduleName}/regenerator`, "default", "regeneratorRuntime");
            });
        },

        visitor: {
            ReferencedIdentifier(path, state) {
                const { node, parent, scope } = path;

                if (node.name === "regeneratorRuntime" && state.opts.regenerator !== false) {
                    path.replaceWith(state.get("regeneratorIdentifier"));
                    return;
                }

                if (state.opts.polyfill === false) {
                    return;
                }

                if (t.isMemberExpression(parent)) {
                    return;
                }
                if (!has(definitions.builtins, node.name)) {
                    return;
                }
                if (scope.getBindingIdentifier(node.name)) {
                    return;
                }

                // Symbol() -> _core.Symbol(); new Promise -> new _core.Promise
                const moduleName = getRuntimeModuleName(state.opts);
                path.replaceWith(state.addImport(
                    `${moduleName}/core-js/${definitions.builtins[node.name]}`,
                    "default",
                    node.name
                ));
            },

            // arr[Symbol.iterator]() -> _core.$for.getIterator(arr)
            CallExpression(path, state) {
                if (state.opts.polyfill === false) {
                    return;
                }

                // we can't compile this
                if (path.node.arguments.length) {
                    return;
                }

                const callee = path.node.callee;
                if (!t.isMemberExpression(callee)) {
                    return;
                }
                if (!callee.computed) {
                    return;
                }
                if (!path.get("callee.property").matchesPattern("Symbol.iterator")) {
                    return;
                }

                const moduleName = getRuntimeModuleName(state.opts);
                path.replaceWith(t.callExpression(
                    state.addImport(
                        `${moduleName}/core-js/get-iterator`,
                        "default",
                        "getIterator"
                    ),
                    [callee.object]
                ));
            },

            // Symbol.iterator in arr -> core.$for.isIterable(arr)
            BinaryExpression(path, state) {
                if (state.opts.polyfill === false) {
                    return;
                }

                if (path.node.operator !== "in") {
                    return;
                }
                if (!path.get("left").matchesPattern("Symbol.iterator")) {
                    return;
                }

                const moduleName = getRuntimeModuleName(state.opts);
                path.replaceWith(t.callExpression(
                    state.addImport(
                        `${moduleName}/core-js/is-iterable`,
                        "default",
                        "isIterable"
                    ),
                    [path.node.right]
                ));
            },

            // Array.from -> _core.Array.from
            MemberExpression: {
                enter(path, state) {
                    if (state.opts.polyfill === false) {
                        return;
                    }
                    if (!path.isReferenced()) {
                        return;
                    }

                    const { node } = path;
                    const obj = node.object;
                    const prop = node.property;

                    if (!t.isReferenced(obj, node)) {
                        return;
                    }
                    if (node.computed) {
                        return;
                    }
                    if (!has(definitions.methods, obj.name)) {
                        return;
                    }

                    const methods = definitions.methods[obj.name];
                    if (!has(methods, prop.name)) {
                        return;
                    }

                    // doesn't reference the global
                    if (path.scope.getBindingIdentifier(obj.name)) {
                        return;
                    }

                    // special case Object.defineProperty to not use core-js when using string keys
                    if (obj.name === "Object" && prop.name === "defineProperty" && path.parentPath.isCallExpression()) {
                        const call = path.parentPath.node;
                        if (call.arguments.length === 3 && t.isLiteral(call.arguments[1])) {
                            return;
                        }
                    }

                    const moduleName = getRuntimeModuleName(state.opts);
                    path.replaceWith(state.addImport(
                        `${moduleName}/core-js/${methods[prop.name]}`,
                        "default",
                        `${obj.name}$${prop.name}`
                    ));
                },

                exit(path, state) {
                    if (state.opts.polyfill === false) {
                        return;
                    }
                    if (!path.isReferenced()) {
                        return;
                    }

                    const { node } = path;
                    const obj = node.object;

                    if (!has(definitions.builtins, obj.name)) {
                        return;
                    }
                    if (path.scope.getBindingIdentifier(obj.name)) {
                        return;
                    }

                    const moduleName = getRuntimeModuleName(state.opts);
                    path.replaceWith(t.memberExpression(
                        state.addImport(
                            `${moduleName}/core-js/${definitions.builtins[obj.name]}`,
                            "default",
                            obj.name
                        ),
                        node.property,
                        node.computed
                    ));
                }
            }
        }
    };
}

export { definitions };
