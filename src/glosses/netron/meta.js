const {
    is,
    util,
    meta: { reflect },
    error
} = adone;

const CONTEXTIFY_SYMBOL = Symbol();

export const contextify = (instance, contextInfo) => {
    if (is.class(instance)) {
        throw new error.NotValid("Invalid instance");
    }

    if (is.netronContext(instance)) {
        throw new error.NotValid(`Class '${instance.__proto__.constructor.name}' already declared as netron context`);
    }

    instance[CONTEXTIFY_SYMBOL] = {
        public: true,
        ...contextInfo
    };
    return instance;
};

export const CONTEXT_ANNOTATION = "netron::context";
export const PUBLIC_ANNOTATION = "netron::context::public";
const PROPERTY_ANNOTATION = (name) => `netron::context::property::${name}`;
const METHOD_ANNOTATION = (name) => `netron::context::method::${name}`;

// decorators

const buildMeta = (obj, contextInfo) => {
    const meta = {
        methods: {},
        props: {}
    };

    if (is.plainObject(contextInfo)) {
        const privateNames = adone.util.arrify(contextInfo.private);

        if (contextInfo.public) {
            const publicInfo = contextInfo.public;
            let entries = util.entries(obj, {
                all: true
            });

            meta.info = util.omit(contextInfo, "public");

            // All public methods (private methods start with the underscore)
            if (publicInfo === true) {
                entries = entries.filter((entry) => !entry[0].startsWith("_") && !privateNames.includes(entry[0]));

                for (const [key, value] of entries) {
                    if (is.function(value)) {
                        meta.methods[key] = {
                            value,
                            meta: {}
                        };
                    }
                }
            } else if (is.array(publicInfo)) {
                entries = entries.filter((entry) => !privateNames.includes(entry[0]) && publicInfo.includes(entry[0]));

                for (const [key, value] of entries) {
                    if (is.function(value)) {
                        meta.methods[key] = {
                            value,
                            meta: {}
                        };
                    } else {
                        meta.props[key] = {
                            value,
                            meta: {}
                        };
                    }
                }
            } else if (is.plainObject(publicInfo)) {
                const onlyNames = Object.keys(publicInfo);
                entries = entries.filter((entry) => !privateNames.includes(entry[0]) && onlyNames.includes(entry[0]));

                for (const [key, value] of entries) {
                    if (is.function(value)) {
                        meta.methods[key] = {
                            value,
                            meta: publicInfo[key]
                        };
                    } else {
                        meta.props[key] = {
                            value,
                            meta: publicInfo[key]
                        };
                    }
                }
            }
        }
    }

    meta.info = meta.info || {};

    return meta;
};

export const Context = (info) => (target) => {
    let contextInfo = info;

    if (is.plainObject(info)) {
        if (info.public) {
            const meta = buildMeta(target.prototype, info);
            contextInfo = meta.info;

            // Methods
            for (const [key, info] of Object.entries(meta.methods)) {
                reflect.defineMetadata(METHOD_ANNOTATION(key), info.meta, target);
            }

            // Properties
            for (const [key, info] of Object.entries(meta.props)) {
                reflect.defineMetadata(PROPERTY_ANNOTATION(key), info.meta, target);
            }
        } else {
            // TODO: Force methods to be private if them in private-list.
        }
    }

    reflect.defineMetadata(CONTEXT_ANNOTATION, contextInfo || {}, target);
};

export const Public = (info) => reflect.metadata(PUBLIC_ANNOTATION, info || {});
// export const Property = (name, info) => reflect.metadata(PROPERTY_ANNOTATION(name), info || {});
// export const Method = (name, info) => reflect.metadata(METHOD_ANNOTATION(name), info || {});

export const isDynamicContext = (obj) => is.plainObject(obj[CONTEXTIFY_SYMBOL]);

export const getNameOfType = (type) => {
    if (is.nil(type)) {
        return "undefined";
    }
    return type.name;
};

export const detectType = (target, meta) => {
    if (is.undefined(meta.type)) {
        if (is.nil(target)) {
            return undefined;
        }

        if (is.boolean(target)) {
            return Boolean;
        } else if (is.function(target)) {
            return undefined;
        } else if (is.string(target)) {
            return String;
        } else if (is.array(target)) {
            return Array;
        } else if (is.number(target)) {
            return Number;
        } else if (is.date(target)) {
            return Date;
        } else if (is.error(target)) {
            return Error;
        } else if (is.regexp(target)) {
            return RegExp;
        } else if (is.map(target)) {
            return Map;
        } else if (is.set(target)) {
            return Set;
        } else if (is.symbol(target)) {
            return Symbol;
        } else if (is.promise(target)) {
            return Promise;
        } else if (is.object(target)) {
            return Object;
        }
    }
    return meta.type;
};

export const getMethodInfo = (target, meta) => {
    let args;

    if (!is.nil(target) && target.length > 0) {
        const strFunc = target.toString();
        args = /\(\s*([^)]+?)\s*\)/.exec(strFunc);
        if (args[1]) {
            args = args[1].split(/\s*,\s*/);
        }
    } else {
        args = [];
    }

    if (!is.nil(meta.args)) {
        for (let i = 0; i < meta.args.length; i++) {
            const argInfo = meta.args[i];
            if (is.array(argInfo)) {
                if (argInfo.length === 1) {
                    if (is.string(argInfo[0])) {
                        args[i] = [undefined, argInfo[0]];
                    } else {
                        if (is.undefined(args[i])) {
                            args[i] = [argInfo[0], undefined];
                        } else {
                            args[i] = [argInfo[0], args[i]];
                        }
                    }
                } else {
                    args[i] = argInfo;
                }
            } else {
                if (is.string(argInfo)) {
                    args[i] = [undefined, argInfo];
                } else {
                    if (is.undefined(args[i])) {
                        args[i] = [argInfo, undefined];
                    } else {
                        args[i] = [argInfo, args[i]];
                    }
                }
            }
        }
    }

    for (let i = 0, argIndex = 0; i < args.length; ++i, ++argIndex) {
        if (is.array(args[i])) {
            if (is.undefined((args[i])[1])) {
                (args[i])[1] = `${getNameOfType((args[i])[0]).toLowerCase().substring(0, 3)}Arg${argIndex}`;
            }
        } else {
            (args[i]) = [undefined, args[i]];
        }
    }

    return {
        description: meta.description,
        type: detectType(target, meta),
        args
    };
};

export const getPropertyInfo = (target, meta) => {
    return {
        description: meta.description,
        type: detectType(target, meta),
        readonly: meta.readonly,
        default: is.nil(target) ? undefined : target
    };
};

const _getEntriesWherePropIs = (map, prop, val) => {
    const m = new Map();
    for (const [name, meta] of map) {
        if (meta[prop] === val) {
            m.set(name, meta);
        }
    }
    return m;
};

export class Reflection {
    constructor(instance) {
        this.instance = instance;
        this.class = instance.constructor;
        this.description = "";
        this.methods = new Map();
        this.properties = new Map();
        this._twin = null;
    }

    getName() {
        return this.class.name;
    }

    getDescription() {
        return this.description;
    }

    getMethods() {
        return this.methods;
    }

    hasMethod(name) {
        return this.methods.has(name);
    }

    getMethodMeta(name) {
        return this.methods.get(name);
    }

    hasTwin() {
        return !is.null(this._twin);
    }

    getTwin() {
        return this._twin;
    }

    getMethodSignature(name) {
        const meta = this.getMethodMeta(name);
        if (is.undefined(meta)) {
            return null;
        }
        const args = [];
        if (!is.nil(meta.args)) {
            for (const arg of meta.args) {
                args.push(`<${getNameOfType(arg[0])}> ${arg[1]}`);
            }
        }
        return `<${getNameOfType(meta.type)}> ${name}(${args.join(", ")})`;
    }

    getProperties() {
        return this.properties;
    }

    getReadonlyProperties() {
        if (is.undefined(this._readonlyProperties)) {
            this._readonlyProperties = _getEntriesWherePropIs(this.properties, "readonly", true);
        }
        return this._readonlyProperties;
    }

    hasProperty(name) {
        return this.properties.has(name);
    }

    getPropertyMeta(name) {
        return this.properties.get(name);
    }

    getPropertySignature(name) {
        const meta = this.getPropertyMeta(name);
        if (is.undefined(meta)) {
            return null;
        }
        return `<${getNameOfType(meta.type)}> ${name}`;
    }

    toString() {
        let classDef = `// ${this.getDescription()}\nclass ${this.getName()} {\n`;
        if (this.getMethods().size > 0) {
            classDef += "\n// Methods\n";
        }
        if (this.numberOfPublicMethods()) {
            classDef += `\npublic:\n${this._listOfEntriesByType(this.methods, false, false, this.getMethodSignature.bind(this))}`;
        }
        if (this.numberOfPrivateMethods()) {
            classDef += `\nprivate:\n${this._listOfEntriesByType(this.methods, false, true, this.getMethodSignature.bind(this))}`;

        }
        if (this.numberOfProperties() > 0) {
            classDef += "\n// Properties\n";
        }
        if (this.numberOfPublicProperties()) {
            classDef += `\npublic:\n${this._listOfEntriesByType(this.properties, true, false, this.getPropertySignature.bind(this))}`;
        }
        if (this.numberOfPrivateProperties()) {
            classDef += `\nprivate:\n${this._listOfEntriesByType(this.properties, true, true, this.getPropertySignature.bind(this))}`;
        }
        classDef += "}";
        return classDef;
    }

    _processPropertyMeta(instance, key, value) {
        if (is.function(value)) {
            const methodInfo = {};
            const methodMeta = reflect.getMetadata(PUBLIC_ANNOTATION, instance, key);
            if (!is.undefined(methodMeta)) {
                Object.assign(methodInfo, getMethodInfo(value, methodMeta));
            }

            const exMethodMeta = reflect.getMetadata(METHOD_ANNOTATION(key), this.class);
            if (!is.undefined(exMethodMeta)) {
                adone.lodash.merge(methodInfo, getMethodInfo(null, exMethodMeta));
            }

            if (!is.undefined(methodMeta) || !is.undefined(exMethodMeta)) {
                this.methods.set(key, methodInfo);
            }
        } else {
            const propertyInfo = {};
            const propertyMeta = reflect.getMetadata(PUBLIC_ANNOTATION, instance, key);
            if (!is.undefined(propertyMeta)) {
                Object.assign(propertyInfo, getPropertyInfo(value, propertyMeta));
            }

            const exPropertyMeta = reflect.getMetadata(PROPERTY_ANNOTATION(key), this.class);
            if (!is.undefined(exPropertyMeta)) {
                adone.lodash.merge(propertyInfo, getPropertyInfo(null, exPropertyMeta));
            }

            if (is.nil(propertyInfo.readonly)) {
                const propDescr = Object.getOwnPropertyDescriptor(instance, key);
                if (!is.nil(propDescr)) {
                    propertyInfo.readonly = !propDescr.writable;
                }
            }

            if (!is.undefined(propertyMeta) || !is.undefined(exPropertyMeta)) {
                this.properties.set(key, propertyInfo);
            }
        }
    }

    _listOfEntriesByType(map, isProps, priv, fn) {
        let def = "";
        for (const [prop, meta] of map.entries()) {
            if (meta.private !== priv) {
                continue;
            }
            const descr = meta.description ? `    // ${meta.description}\n` : "";
            let defVal = "";
            let readonly = "";
            if (isProps) {
                defVal = ` = ${meta.default}`;
                if (meta.readonly) {
                    readonly = "<readonly> ";
                }
            }
            def += `${descr}    ${readonly}${fn(prop)}${defVal};\n\n`;
        }
        return def;
    }

    static from(instance) {
        if (!is.netronContext(instance) || is.class(instance)) {
            throw new error.NotValid(`'${instance.__proto__.constructor.name}' is not valid instance of netron context`);
        }

        const r = new Reflection(instance);
        let info;

        if (is.plainObject(instance[CONTEXTIFY_SYMBOL])) {
            const meta = buildMeta(instance, instance[CONTEXTIFY_SYMBOL]);
            // delete instance[CONTEXTIFY_SYMBOL];
            info = meta.info;

            // Methods
            for (const [key, info] of Object.entries(meta.methods)) {
                r.methods.set(key, {
                    ...getMethodInfo(info.value, info.meta)
                });
            }

            // Properties
            for (const [key, info] of Object.entries(meta.props)) {
                r.properties.set(key, {
                    ...getPropertyInfo(info.value, info.meta)
                });
            }
        } else {
            info = reflect.getMetadata(CONTEXT_ANNOTATION, r.class);

            for (const [key, val] of util.entries(instance, { all: true })) {
                r._processPropertyMeta(instance, key, val);
            }
        }

        Object.assign(r, util.pick(info, [
            "description"
        ]));

        if (r.methods.size === 0 && r.properties.size === 0) {
            throw new error.NotValid("'instance' must have at least one method or property");
        }

        return r;
    }
}
