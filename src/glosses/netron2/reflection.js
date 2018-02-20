const {
    is,
    util,
    meta: { reflect },
    error
} = adone;

export const CONTEXT_ANNOTATION = "netron::context";
export const PUBLIC_ANNOTATION = "netron::context::public";
export const propertyAnnotation = (name) => `netron::context::property::${name}`;
export const methodAnnotation = (name) => `netron::context::method::${name}`;

// decorators
export const DContext = (info) => reflect.metadata(CONTEXT_ANNOTATION, info || {});
export const DPublic = (info) => reflect.metadata(PUBLIC_ANNOTATION, info || {});
export const DProperty = (name, info) => reflect.metadata(propertyAnnotation(name), info || {});
export const DMethod = (name, info) => reflect.metadata(methodAnnotation(name), info || {});

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
                args.push(`<${Reflection.getNameOfType(arg[0])}> ${arg[1]}`);
            }
        }
        return `<${Reflection.getNameOfType(meta.type)}> ${name}(${args.join(", ")})`;
    }

    getProperties() {
        return this.properties;
    }

    getReadonlyProperties() {
        if (is.undefined(this._readonlyProperties)) {
            this._readonlyProperties = Reflection._getEntriesWherePropIs(this.properties, "readonly", true);
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
        return `<${Reflection.getNameOfType(meta.type)}> ${name}`;
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

    static getNameOfType(type) {
        if (is.nil(type)) {
            return "undefined";
        }
        return type.name;
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

    static _getEntriesWherePropIs(map, prop, val) {
        const m = new Map();
        for (const [name, meta] of map) {
            if (meta[prop] === val) {
                m.set(name, meta);
            }
        }
        return m;
    }

    static detectType(target, meta) {
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
    }

    static getMethodInfo(target, meta) {
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
                    (args[i])[1] = `${Reflection.getNameOfType((args[i])[0]).toLowerCase().substring(0, 3)}Arg${argIndex}`;
                }
            } else {
                (args[i]) = [undefined, args[i]];
            }
        }

        return {
            description: meta.description,
            type: Reflection.detectType(target, meta),
            args
        };
    }

    static getPropertyInfo(target, meta) {
        return {
            description: meta.description,
            type: Reflection.detectType(target, meta),
            readonly: meta.readonly,
            default: is.nil(target) ? undefined : target
        };
    }

    static from(instance) {
        if (!is.netron2Context(instance) || is.class(instance)) {
            throw new error.NotValid(`'${instance.__proto__.constructor.name}' is not valid instance of netron context`);
        }

        const r = new Reflection(instance);

        const info = reflect.getMetadata(CONTEXT_ANNOTATION, r.class);
        Object.assign(r, util.pick(info, [
            "description"
        ]));

        for (const [key, val] of util.entries(instance, { all: true })) {
            if (is.function(val)) {
                const methodInfo = {};
                const methodMeta = reflect.getMetadata(PUBLIC_ANNOTATION, instance, key);
                if (!is.undefined(methodMeta)) {
                    Object.assign(methodInfo, Reflection.getMethodInfo(val, methodMeta));
                }

                const exMethodMeta = reflect.getMetadata(methodAnnotation(key), r.class);
                if (!is.undefined(exMethodMeta)) {
                    adone.vendor.lodash.merge(methodInfo, Reflection.getMethodInfo(null, exMethodMeta));
                }

                if (!is.undefined(methodMeta) || !is.undefined(exMethodMeta)) {
                    r.methods.set(key, methodInfo);
                }
            } else {
                const propertyInfo = {};
                const propertyMeta = reflect.getMetadata(PUBLIC_ANNOTATION, instance, key);
                if (!is.undefined(propertyMeta)) {
                    Object.assign(propertyInfo, Reflection.getPropertyInfo(val, propertyMeta));
                }

                const exPropertyMeta = reflect.getMetadata(propertyAnnotation(key), r.class);
                if (!is.undefined(exPropertyMeta)) {
                    adone.vendor.lodash.merge(propertyInfo, Reflection.getPropertyInfo(null, exPropertyMeta));
                }

                if (is.nil(propertyInfo.readonly)) {
                    const propDescr = Object.getOwnPropertyDescriptor(instance, key);
                    if (!is.nil(propDescr)) {
                        propertyInfo.readonly = !propDescr.writable;
                    }
                }

                if (!is.undefined(propertyMeta) || !is.undefined(exPropertyMeta)) {
                    r.properties.set(key, propertyInfo);
                }
            }
        }

        if (r.methods.size === 0 && r.properties.size === 0) {
            throw new error.NotValid("'instance' must have at least one method or property");
        }

        return r;
    }
}
