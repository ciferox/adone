const {
    is
} = adone;

const bettertypeof = (x) => Object.prototype.toString.call(x).match(/\s([a-zA-Z]+)/)[1];
const getProto = (x) => Object.getPrototypeOf(x);
const has = (o, prop) => o.hasOwnProperty(prop);
const isInstance = (Constructor, obj) => obj instanceof Constructor;
const isObject = (o) => typeof o === "object";

const proxify = (val, traps) => new Proxy(val, traps);
const proxifyFn = (fn, apply) => proxify(fn, { apply });
const proxifyModel = (val, model, traps) => proxify(val, Object.assign({ getPrototypeOf: () => model.prototype }, traps));

const mapProps = (o, fn) => Object.keys(o).map(fn);

const merge = (target, src = {}, deep) => {
    for (const key in src) {
        if (deep && is.plainObject(src[key])) {
            const o = {};
            merge(o, target[key], deep);
            merge(o, src[key], deep);
            target[key] = o;
        } else {
            target[key] = src[key];
        }
    }
};

const define = (obj, key, value, enumerable = false) => {
    Object.defineProperty(obj, key, { value, enumerable, writable: true, configurable: true });
};

const setConstructor = (model, constructor) => {
    Object.setPrototypeOf(model, constructor.prototype);
    define(model, "constructor", constructor);
};

const extend = (child, parent, props) => {
    child.prototype = Object.assign(Object.create(parent.prototype, {
        constructor: {
            value: child,
            writable: true,
            configurable: true
        }
    }), props);
    Object.setPrototypeOf(child, parent);
};

const format = (obj, stack = []) => {
    if (stack.length > 15 || stack.includes(obj)) {
        return "...";
    }
    if (adone.is.nil(obj)) {
        return String(obj);
    }
    if (is.string(obj)) {
        return `"${obj}"`;
    }
    if (isInstance(Model, obj)) {
        return obj.toString(stack);
    }

    stack.unshift(obj);

    if (is.function(obj)) {
        return obj.name || obj.toString();
    }
    if (isInstance(Map, obj) || isInstance(Set, obj)) {
        return format([...obj]);
    }
    if (is.array(obj)) {
        return `[${obj.map((item) => format(item, stack)).join(", ")}]`;
    }
    if (obj.toString !== Object.prototype.toString) {
        return obj.toString();
    }
    if (obj && isObject(obj)) {
        const props = Object.keys(obj);
        const indent = "\t".repeat(stack.length);
        return `{${props.map(
            (key) => `\n${indent + key}: ${format(obj[key], stack.slice())}`
        ).join(",")} ${props.length ? `\n${indent.slice(1)}` : ""}}`;
    }

    return String(obj);
};

const formatPath = (path, key) => path ? `${path}.${key}` : key;

const _validate = Symbol();

const parseDefinition = (def) => {
    if (is.plainObject(def)) {
        mapProps(def, (key) => {
            def[key] = parseDefinition(def[key]);
        });
    } else if (!is.array(def)) {
        return [def];
    } else if (def.length === 1) {
        return [...def, undefined, null];
    }

    return def;
};

const formatDefinition = (def, stack) => parseDefinition(def).map((d) => format(d, stack)).join(" or ");

const extendDefinition = (def, newParts = []) => {
    if (!is.array(newParts)) {
        newParts = [newParts];
    }
    if (newParts.length > 0) {
        def = newParts
            .reduce((def, ext) => def.concat(ext), is.array(def) ? def.slice() : [def]) // clone to lose ref
            .filter((value, index, self) => self.indexOf(value) === index); // remove duplicates
    }

    return def;
};

const checkDefinition = (obj, def, path, errors, stack) => {
    const indexFound = stack.indexOf(def);
    if (indexFound !== -1 && stack.indexOf(def, indexFound + 1) !== -1) {
        return obj;
    } //if found twice in call stack, cycle detected, skip validation

    obj = cast(obj, def);

    if (isInstance(Model, def)) {
        def[_validate](obj, path, errors, stack.concat(def));
    } else if (is.plainObject(def)) {
        mapProps(def, (key) => {
            checkDefinition(obj ? obj[key] : undefined, def[key], formatPath(path, key), errors, stack);
        });
    } else {
        const pdef = parseDefinition(def);
        if (pdef.some((part) => checkDefinitionPart(obj, part, path, stack))) {
            return obj;
        }

        stackError(errors, def, obj, path);
    }

    return obj;
};

const checkDefinitionPart = (obj, def, path, stack) => {
    if (adone.is.nil(obj)) {
        return obj === def;
    }
    if (is.plainObject(def) || isInstance(Model, def)) { // object or model as part of union type
        const errors = [];
        checkDefinition(obj, def, path, errors, stack);
        return !errors.length;
    }
    if (isInstance(RegExp, def)) {
        return def.test(obj);
    }
    if (def === Number || def === Date) {
        return obj.constructor === def && !isNaN(obj);
    }
    return obj === def
        || (is.function(def) && isInstance(def, obj))
        || obj.constructor === def;
};

const checkAssertions = (obj, model, path, errors = model.errors) => {
    for (const assertion of model.assertions) {
        let result;
        try {
            result = assertion.call(model, obj);
        } catch (err) {
            result = err;
        }
        if (result !== true) {
            const onFail = is.function(assertion.description) ? assertion.description : (assertionResult, value) =>
                `assertion "${assertion.description}" returned ${format(assertionResult)} `
                + `for ${path ? `${path} =` : "value"} ${format(value)}`;
            stackError(errors, assertion, obj, path, onFail.call(model, result, obj, path));
        }
    }
};

const cast = (obj, defNode = []) => {
    if (!obj || is.plainObject(defNode) || isModelInstance(obj)) {
        return obj;
    } // no value or not leaf or already a model instance

    const def = parseDefinition(defNode);
    const suitableModels = [];

    for (const part of def) {
        if (isInstance(Model, part) && part.test(obj)) {
            suitableModels.push(part);
        }
    }

    if (suitableModels.length === 1) {
        return suitableModels[0](obj);
    } // automatically cast to suitable model when explicit

    if (suitableModels.length > 1) {
        console.warn(`Ambiguous model for value ${format(obj)}, could be ${suitableModels.join(" or ")}`);
    }

    return obj;
};


const initModel = (model, def) => {
    model.definition = def;
    model.assertions = [...model.assertions];
    define(model, "errors", []);
    delete model.name;
};

const extendModel = (child, parent, newProps) => {
    extend(child, parent, newProps);
    child.assertions.push(...parent.assertions);
    return child;
};


export const Model = function (def, params) {
    return is.plainObject(def) ? new ObjectModel(def, params) : new BasicModel(def);
};

Object.assign(Model.prototype, {
    name: "Model",
    assertions: [],

    conventionForConstant: (key) => key.toUpperCase() === key,
    conventionForPrivate: (key) => key[0] === "_",

    toString(stack) {
        return formatDefinition(this.definition, stack);
    },

    as(name) {
        define(this, "name", name);
        return this;
    },

    defaultTo(val) {
        this.default = val;
        return this;
    },

    [_validate](obj, path, errors, stack) {
        checkDefinition(obj, this.definition, path, errors, stack);
        checkAssertions(obj, this, path, errors);
    },

    validate(obj, errorCollector) {
        this[_validate](obj, null, this.errors, []);
        return !unstackErrors(this, errorCollector);
    },

    test(obj) {
        let failed = false;
        const initialErrorCollector = this.errorCollector;

        this.errorCollector = () => {
            failed = true;
        };

        new this(obj); // may trigger this.errorCollector

        this.errorCollector = initialErrorCollector;
        return !failed;
    },

    errorCollector(errors) {
        const e = new TypeError(errors.map((e) => e.message).join("\n"));
        // e.stack = e.stack.replace(/\n.*(.|\n)*.*/, "");
        throw e;
    },

    assert(assertion, description = format(assertion)) {
        define(assertion, "description", description);
        this.assertions = this.assertions.concat(assertion);
        return this;
    }
});

export const BasicModel = function (def) {
    const model = function (val = model.default) {
        return model.validate(val) ? val : undefined;
    };

    setConstructor(model, BasicModel);
    initModel(model, def);
    return model;
};

extend(BasicModel, Model, {
    extend(...newParts) {
        const child = extendModel(new BasicModel(extendDefinition(this.definition, newParts)), this);
        for (const part of newParts) {
            if (isInstance(BasicModel, part)) {
                child.assertions.push(...part.assertions);
            }
        }

        return child;
    }
});


const stackError = (errors, expected, received, path, message) => {
    errors.push({ expected, received, path, message });
};

const unstackErrors = (model, errorCollector = model.errorCollector) => {
    const nbErrors = model.errors.length;
    if (nbErrors > 0) {
        const errors = model.errors.map((err) => {
            if (!err.message) {
                const def = is.array(err.expected) ? err.expected : [err.expected];
                err.message = `expecting ${err.path ? `${err.path} to be ` : ""}${def.map((d) => format(d)).join(" or ")}, got ${!adone.is.nil(err.received) ? `${bettertypeof(err.received)} ` : ""}${format(err.received)}`;
            }
            return err;
        });
        model.errors = [];
        errorCollector.call(model, errors); // throw all errors collected
    }
    return nbErrors;
};

const isModelInstance = (i) => i && isInstance(Model, getProto(i).constructor);

const _constructor = Symbol();

export const ObjectModel = function (def, params) {
    const model = function (obj = model.default) {
        const instance = this;
        if (!isInstance(model, instance)) {
            return new model(obj);
        }
        if (isInstance(model, obj)) {
            return obj;
        }

        merge(instance, model[_constructor](obj), true);
        if (!model.validate(instance)) {
            return;
        }
        return getProxy(model, instance, model.definition);
    };

    Object.assign(model, params);
    extend(model, Object);
    setConstructor(model, ObjectModel);
    initModel(model, def);
    return model;
};

extend(ObjectModel, Model, {
    sealed: false,

    defaults(p) {
        Object.assign(this.prototype, p);
        return this;
    },

    toString(stack) {
        return format(this.definition, stack);
    },

    extend(...newParts) {
        const parent = this;
        const def = Object.assign({}, this.definition);
        const newAssertions = [];
        const proto = {};

        merge(proto, parent.prototype, false);

        for (const part of newParts) {
            if (isInstance(Model, part)) {
                merge(def, part.definition, true);
                newAssertions.push(...part.assertions);
            }
            if (is.function(part)) {
                merge(proto, part.prototype, true);
            }
            if (isObject(part)) {
                merge(def, part, true);
            }
        }

        const submodel = extendModel(new ObjectModel(def), parent, proto);
        submodel.assertions = parent.assertions.concat(newAssertions);

        if (getProto(parent) !== ObjectModel.prototype) { // extended class
            submodel[_constructor] = (obj) => {
                const parentInstance = new parent(obj);
                merge(obj, parentInstance, true); // get modified props from parent class constructor
                return obj;
            };
        }

        return submodel;
    },

    [_constructor]: (o) => o,

    [_validate](obj, path, errors, stack) {
        if (isObject(obj)) {
            const def = this.definition;
            checkDefinition(obj, def, path, errors, stack);
            if (this.sealed) {
                checkUndeclaredProps(obj, def, errors);
            }
        } else {
            stackError(errors, this, obj, path);
        }

        checkAssertions(obj, this, path, errors);
    }
});

const cannot = (msg, model) => {
    model.errors.push({ message: `cannot ${msg}` });
};

const rejectUndeclaredProp = (path, received, errors) => {
    errors.push({
        path,
        received,
        message: `property ${path} is not declared in the sealed model definition`
    });
};

const controlMutation = (model, def, path, o, key, applyMutation) => {
    const newPath = formatPath(path, key);
    const isPrivate = model.conventionForPrivate(key);
    const isConstant = model.conventionForConstant(key);
    const isOwnProperty = has(o, key);
    const initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key);

    if (key in def && (isPrivate || (isConstant && !adone.is.undefined(o[key])))) {
        cannot(`modify ${isPrivate ? "private" : "constant"} ${key}`, model);
    }

    const isInDefinition = has(def, key);
    if (isInDefinition || !model.sealed) {
        applyMutation(newPath);
        isInDefinition && checkDefinition(o[key], def[key], newPath, model.errors, []);
        checkAssertions(o, model, newPath);
    } else {
        rejectUndeclaredProp(newPath, o[key], model.errors);
    }

    const nbErrors = model.errors.length;
    if (nbErrors) {
        if (isOwnProperty) {
            Object.defineProperty(o, key, initialPropDescriptor);
        } else {
            delete o[key];
        } // back to the initial property defined in prototype chain

        unstackErrors(model);
    }

    return !nbErrors;
};


const getProxy = (model, obj, def, path) => !is.plainObject(def) ? cast(obj, def) : proxify(obj, {

    getPrototypeOf: () => path ? Object.prototype : getProto(obj),

    get(o, key) {
        if (!is.string(key)) {
            return Reflect.get(o, key);
        }

        const newPath = formatPath(path, key);
        const defPart = def[key];

        if (key in def && model.conventionForPrivate(key)) {
            cannot(`access to private property ${newPath}`, model);
            unstackErrors(model);
            return;
        }

        if (o[key] && has(o, key) && !is.plainObject(defPart) && !isModelInstance(o[key])) {
            o[key] = cast(o[key], defPart); // cast nested models
        }

        if (is.function(o[key]) && o[key].bind) {
            return o[key].bind(o);
        } // auto-bind methods to original object, so they can access private props

        if (is.plainObject(defPart) && !o[key]) {
            o[key] = {}; // null-safe traversal
        }

        return getProxy(model, o[key], defPart, newPath);
    },

    set(o, key, val) {
        return controlMutation(model, def, path, o, key, (newPath) => Reflect.set(o, key, getProxy(model, val, def[key], newPath)));
    },

    deleteProperty(o, key) {
        return controlMutation(model, def, path, o, key, () => Reflect.deleteProperty(o, key));
    },

    defineProperty(o, key, args) {
        return controlMutation(model, def, path, o, key, () => Reflect.defineProperty(o, key, args));
    },

    has(o, key) {
        return Reflect.has(o, key) && Reflect.has(def, key) && !model.conventionForPrivate(key);
    },

    ownKeys(o) {
        return Reflect.ownKeys(o).filter((key) => Reflect.has(def, key) && !model.conventionForPrivate(key));
    },

    getOwnPropertyDescriptor(o, key) {
        let descriptor;
        if (!model.conventionForPrivate(key)) {
            descriptor = Object.getOwnPropertyDescriptor(def, key);
            if (!adone.is.undefined(descriptor)) {
                descriptor.value = o[key];
            }
        }

        return descriptor;
    }
});

const checkUndeclaredProps = (obj, def, errors, path) => {
    mapProps(obj, (key) => {
        const val = obj[key];
        const subpath = formatPath(path, key);
        if (!has(def, key)) {
            rejectUndeclaredProp(subpath, val, errors);
        } else if (is.plainObject(val)) {
            checkUndeclaredProps(val, def[key], errors, subpath);
        }
    });
};

const setArrayKey = (array, key, value, model) => {
    const path = `Array[${key}]`;
    if (parseInt(key) === Number(key) && key >= 0) {
        value = checkDefinition(value, model.definition, path, model.errors, []);
    }

    const testArray = array.slice();
    testArray[key] = value;
    checkAssertions(testArray, model, path);
    const isSuccess = !unstackErrors(model);
    if (isSuccess) {
        array[key] = value;
    }
    return isSuccess;
};

const ARRAY_MUTATORS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

export const ArrayModel = function (def) {
    const model = function (array = model.default) {
        if (model.validate(array)) {
            return proxifyModel(array, model, {
                get(arr, key) {
                    const val = arr[key];
                    return is.function(val) ? proxifyFn(val, (fn, ctx, args) => {
                        if (ARRAY_MUTATORS.includes(key)) {
                            const testArray = arr.slice();
                            fn.apply(testArray, args);
                            model.validate(testArray);
                        }

                        const returnValue = fn.apply(arr, args);
                        array.forEach((a, i) => arr[i] = cast(a, model.definition));
                        return returnValue;
                    }) : val;
                },

                set(arr, key, val) {
                    return setArrayKey(arr, key, val, model);
                },

                deleteProperty(arr, key) {
                    return !(key in arr) || setArrayKey(arr, key, undefined, model);
                }
            });
        }
    };

    extend(model, Array);
    setConstructor(model, ArrayModel);
    initModel(model, def);
    return model;
};

extend(ArrayModel, Model, {
    toString(stack) {
        return `Array of ${formatDefinition(this.definition, stack)}`;
    },

    [_validate](arr, path, errors, stack) {
        if (is.array(arr)) {
            arr.forEach((a, i) => {
                arr[i] = checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errors, stack);
            });
        } else {
            stackError(errors, this, arr, path);
        }

        checkAssertions(arr, this, path, errors);
    },

    extend(...newParts) {
        return extendModel(new ArrayModel(extendDefinition(this.definition, newParts)), this);
    }
});

export const FunctionModel = function (...argsDef) {
    const model = function (fn = model.default) {
        if (!model.validate(fn)) {
            return;
        }
        return proxifyModel(fn, model, {
            apply(fn, ctx, args) {
                const def = model.definition;

                def.arguments.forEach((argDef, i) => {
                    args[i] = checkDefinition(args[i], argDef, `arguments[${i}]`, model.errors, []);
                });

                checkAssertions(args, model, "arguments");

                let result;
                if (!model.errors.length) {
                    result = Reflect.apply(fn, ctx, args);
                    if ("return" in def) {
                        result = checkDefinition(result, def.return, "return value", model.errors, []);
                    }
                }
                unstackErrors(model);
                return result;
            }
        });
    };

    extend(model, Function);
    setConstructor(model, FunctionModel);
    initModel(model, { arguments: argsDef });

    return model;
};

extend(FunctionModel, Model, {
    toString(stack = []) {
        let out = `Function(${this.definition.arguments.map(
            (argDef) => formatDefinition(argDef, stack.slice())
        ).join(",")})`;

        if ("return" in this.definition) {
            out += ` => ${formatDefinition(this.definition.return, stack)}`;
        }
        return out;
    },

    return(def) {
        this.definition.return = def;
        return this;
    },

    extend(newArgs, newReturns) {
        const args = this.definition.arguments;
        const mixedArgs = newArgs.map((a, i) => extendDefinition(i in args ? args[i] : [], newArgs[i]));
        const mixedReturns = extendDefinition(this.definition.return, newReturns);
        return extendModel(new FunctionModel(...mixedArgs).return(mixedReturns), this);
    },

    [_validate](f, path, errors) {
        if (!is.function(f)) {
            stackError(errors, "Function", f, path);
        }
    }
});

FunctionModel.prototype.assert(function (args) {
    return (args.length > this.definition.arguments.length) ? args : true;
}, function (args) {
    return `expecting ${this.definition.arguments.length} arguments for ${format(this)}, got ${args.length}`;
});

const MAP_MUTATORS = ["set", "delete", "clear"];

export const MapModel = function (key, value) {
    const model = function (iterable = model.default) {
        const castKeyValue = (pair) => ["key", "value"].map((prop, i) => cast(pair[i], model.definition[prop]));
        const map = new Map([...iterable].map(castKeyValue));

        if (!model.validate(map)) {
            return;
        }

        return proxifyModel(map, model, {
            get(map, key) {
                const val = map[key];
                return is.function(val) ? proxifyFn(val, (fn, ctx, args) => {
                    if (key === "set") {
                        args = castKeyValue(args);
                    }

                    if (MAP_MUTATORS.includes(key)) {
                        const testMap = new Map(map);
                        fn.apply(testMap, args);
                        model.validate(testMap);
                    }

                    return fn.apply(map, args);
                }) : val;
            }
        });
    };

    extend(model, Map);
    setConstructor(model, MapModel);
    initModel(model, { key, value });
    return model;
};

extend(MapModel, Model, {
    toString(stack) {
        const { key, value } = this.definition;
        return `Map of ${formatDefinition(key, stack)} : ${formatDefinition(value, stack)}`;
    },

    [_validate](map, path, errors, stack) {
        if (map instanceof Map) {
            path = path || "Map";
            for (const [key, value] of map) {
                checkDefinition(key, this.definition.key, `${path} key`, errors, stack);
                checkDefinition(value, this.definition.value, `${path}[${format(key)}]`, errors, stack);
            }
        } else {
            stackError(errors, this, map, path);
        }

        checkAssertions(map, this, path, errors);
    },

    extend(keyPart, valuePart) {
        const { key, value } = this.definition;
        return extendModel(new MapModel(extendDefinition(key, keyPart), extendDefinition(value, valuePart)), this);
    }
});

const SET_MUTATORS = ["add", "delete", "clear"];

export const SetModel = function (def) {
    const model = function (iterable = model.default) {
        const castValue = (val) => cast(val, model.definition);
        const set = new Set([...iterable].map(castValue));

        if (!model.validate(set)) {
            return;
        }

        return proxifyModel(set, model, {
            get(set, key) {
                const val = set[key];
                return is.function(val) ? proxifyFn(val, (fn, ctx, args) => {
                    if (key === "add") {
                        args[0] = castValue(args[0]);
                    }

                    if (SET_MUTATORS.includes(key)) {
                        const testSet = new Set(set);
                        fn.apply(testSet, args);
                        model.validate(testSet);
                    }

                    return fn.apply(set, args);
                }) : val;
            }
        });
    };

    extend(model, Set);
    setConstructor(model, SetModel);
    initModel(model, def);
    return model;
};

extend(SetModel, Model, {
    toString(stack) {
        return `Set of ${formatDefinition(this.definition, stack)}`;
    },

    [_validate](set, path, errors, stack) {
        if (set instanceof Set) {
            for (const item of set.values()) {
                checkDefinition(item, this.definition, `${path || "Set"} value`, errors, stack);
            }
        } else {
            stackError(errors, this, set, path);
        }
        checkAssertions(set, this, path, errors);
    },

    extend(...newParts) {
        return extendModel(new SetModel(extendDefinition(this.definition, newParts)), this);
    }
});


// export const Primitive = BasicModel([Boolean, Number, String, Symbol]).as("Primitive");

// // Booleans-like
// export const Falsy = BasicModel([Primitive, null, undefined]).assert(function isFalsy(x) {
//     return !x;
// }).as("Falsy");
// export const Truthy = BasicModel([Primitive, Object]).assert(function isTruthy(x) {
//     return Boolean(x);
// }).as("Truthy");

// // Numbers
// export const Integer = BasicModel(Number).assert(is.integer).as("Integer");
// export const SafeInteger = BasicModel(Number).assert(is.safeInteger).as("SafeInteger");
// export const FiniteNumber = BasicModel(Number).assert(is.finite).as("FiniteNumber");
// export const PositiveNumber = BasicModel(Number).assert(function isPositive(n) {
//     return n >= 0;
// }).as("PositiveNumber");
// export const NegativeNumber = BasicModel(Number).assert(function isNegative(n) {
//     return n <= 0;
// }).as("NegativeNumber");
// export const PositiveInteger = PositiveNumber.extend().assert(is.integer).as("PositiveInteger");
// export const NegativeInteger = NegativeNumber.extend().assert(is.integer).as("NegativeInteger");

// // Strings
// export const StringNotBlank = BasicModel(String).assert(function isNotBlank(str) {
//     return str.trim().length > 0;
// }).as("StringNotBlank");
// export const NormalizedString = BasicModel(String).assert(function isNormalized(str) {
//     return str.normalize() === str;
// }).as("NormalizedString");
// export const TrimmedString = BasicModel(String).assert(function isTrimmed(str) {
//     return str.trim() === str;
// }).as("TrimmedString");

// // Dates
// export const PastDate = BasicModel(Date).assert(function isInThePast(date) {
//     return date.getTime() < Date.now();
// }).as("PastDate");
// export const FutureDate = BasicModel(Date).assert(function isInTheFuture(date) {
//     return date.getTime() > Date.now();
// }).as("FutureDate");

// // Arrays
// export const ArrayNotEmpty = BasicModel(Array).assert(function isNotEmpty(arr) {
//     return arr.length > 0;
// }).as("ArrayNotEmpty");
// export const ArrayUnique = BasicModel(Array).assert(function hasNoDuplicates(arr) {
//     return arr.every((x, i) => arr.indexOf(x) === i);
// }).as("ArrayUnique");
// export const ArrayDense = BasicModel(Array).assert(function hasNoHoles(arr) {
//     return arr.filter(() => true).length === arr.length;
// }).as("ArrayDense");
