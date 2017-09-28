const {
    is,
    util,
    meta: { reflect }
} = adone;

export default class Investigator {
    constructor(instance) {
        this.instance = instance;
        this.aClass = instance.constructor;
        this.description = "";
        this._twin = null;
        this._methodMap = new Map();
        this._propMap = new Map();
        this._investigate();
    }

    getName() {
        return this.aClass.name;
    }

    getDescription() {
        return this.description;
    }

    // Methods

    getMethods() {
        return this._methodMap;
    }

    getPublicMethods() {
        if (is.undefined(this._publicMethodMap)) {
            this._publicMethodMap = this._getEntriesWherePropIs(this._methodMap, "private", false);
        }
        return this._publicMethodMap;
    }

    getPrivateMethods() {
        if (is.undefined(this._privateMethodMap)) {
            this._privateMethodMap = this._getEntriesWherePropIs(this._methodMap, "private", true);
        }
        return this._privateMethodMap;
    }

    hasTwin() {
        return !is.null(this._twin);
    }

    getTwin() {
        return this._twin;
    }

    hasMethod(name) {
        return this._methodMap.has(name);
    }

    getMethodMetadata(name) {
        return this._methodMap.get(name);
    }

    getMethodSignature(name) {
        const meta = this.getMethodMetadata(name);
        if (is.undefined(meta)) {
            return null;
        }
        const args = [];
        if (!is.nil(meta.args)) {
            for (const arg of meta.args) {
                args.push(`<${Investigator.getNameOfType(arg[0])}> ${arg[1]}`);
            }
        }
        return `<${Investigator.getNameOfType(meta.type)}> ${name}(${args.join(", ")})`;
    }

    // Properties

    getProperties() {
        return this._propMap;
    }

    getPublicProperties() {
        if (is.undefined(this._publicPropMap)) {
            this._publicPropMap = this._getEntriesWherePropIs(this._propMap, "private", false);
        }
        return this._publicPropMap;
    }

    getPrivateProperties() {
        if (is.undefined(this._privatePropMap)) {
            this._privatePropMap = this._getEntriesWherePropIs(this._propMap, "private", true);
        }
        return this._privatePropMap;
    }

    getReadonlyProperties() {
        if (is.undefined(this._readonlyPropMap)) {
            this._readonlyPropMap = this._getEntriesWherePropIs(this._propMap, "readonly", true);
        }
        return this._readonlyPropMap;
    }

    hasProperty(name) {
        return this._propMap.has(name);
    }

    getPropertyMetadata(name) {
        return this._propMap.get(name);
    }

    getPropertySignature(name) {
        const meta = this.getPropertyMetadata(name);
        if (is.undefined(meta)) {
            return null;
        }
        return `<${Investigator.getNameOfType(meta.type)}> ${name}`;
    }

    toString() {
        let classDef = `// ${this.getDescription()}\nclass ${this.getName()} {\n`;
        if (this.getMethods().size > 0) {
            classDef += "\n// Methods\n";
        }
        if (this.numberOfPublicMethods()) {
            classDef += `\npublic:\n${this._listOfEntriesByType(this._methodMap, false, false, this.getMethodSignature.bind(this))}`;
        }
        if (this.numberOfPrivateMethods()) {
            classDef += `\nprivate:\n${this._listOfEntriesByType(this._methodMap, false, true, this.getMethodSignature.bind(this))}`;

        }
        if (this.numberOfProperties() > 0) {
            classDef += "\n// Properties\n";
        }
        if (this.numberOfPublicProperties()) {
            classDef += `\npublic:\n${this._listOfEntriesByType(this._propMap, true, false, this.getPropertySignature.bind(this))}`;
        }
        if (this.numberOfPrivateProperties()) {
            classDef += `\nprivate:\n${this._listOfEntriesByType(this._propMap, true, true, this.getPropertySignature.bind(this))}`;
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

    static isContextable(obj) {
        let isContextable = false;
        if (is.propertyDefined(obj, "prototype") && is.propertyDefined(obj.prototype, "constructor") && is.number(obj.length) && is.string(obj.name)) {
            isContextable = reflect.getMetadata("meta:contextable", obj);
        } else if (is.propertyDefined(obj, "__proto__") && is.propertyDefined(obj.__proto__, "constructor")) {
            isContextable = reflect.getMetadata("meta:contextable", obj.__proto__.constructor);
        }
        return Boolean(isContextable);
    }

    static hasMethods(obj) {
        let hasMethods = false;
        if (is.propertyDefined(obj, "__proto__") && is.propertyDefined(obj.__proto__, "constructor")) {
            for (const [, val] of util.entries(obj, { all: true })) {
                if (is.function(val)) {
                    hasMethods = true;
                    break;
                }
            }
        }
        return hasMethods;
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


    _numberOfPropWithValue(map, prop, val) {
        let num = 0;
        for (const descr of map.values()) {
            if (descr[prop] === val) {
                ++num;
            }
        }
        return num;
    }

    _getEntriesWherePropIs(map, prop, val) {
        const m = new Map();
        for (const [name, meta] of map) {
            if (meta[prop] === val) {
                m.set(name, meta);
            }
        }
        return m;
    }

    _investigate() {
        const descr = reflect.getMetadata("meta:description", this.aClass);
        if (!is.nil(descr)) {
            this.description = descr;
        }

        const twin = reflect.getMetadata("meta:twin", this.aClass);
        if (!is.nil(twin)) {
            this._twin = twin;
        }

        const privateClass = Boolean(reflect.getMetadata("meta:private", this.aClass));

        const instance = this.instance;
        for (const [key, val] of util.entries(instance, { all: true })) {
            const descr = { private: privateClass, type: undefined };
            let meta = reflect.getMetadata("meta:type", instance, key);
            if (is.nil(meta)) {
                if (is.boolean(val)) {
                    meta = Boolean;
                } else if (is.function(val)) {
                    meta = undefined;
                } else if (is.string(val)) {
                    meta = String;
                } else if (is.array(val)) {
                    meta = Array;
                } else if (is.number(val)) {
                    meta = Number;
                } else if (is.date(val)) {
                    meta = Date;
                } else if (is.error(val)) {
                    meta = Error;
                } else if (is.regexp(val)) {
                    meta = RegExp;
                } else if (is.map(val)) {
                    meta = Map;
                } else if (is.set(val)) {
                    meta = Set;
                } else if (is.symbol(val)) {
                    meta = Symbol;
                } else if (is.promise(val)) {
                    meta = Promise;
                } else if (is.object(val)) {
                    meta = Object;
                }
            }
            descr.type = meta;
            meta = reflect.getMetadata("meta:description", instance, key);
            descr.description = meta;
            meta = reflect.getMetadata("meta:private", instance, key);
            if (is.boolean(meta)) {
                descr.private = meta;
            }

            if (is.function(val)) {
                meta = reflect.getMetadata("meta:type", instance, key);
                descr.type = meta;
                const numOfArgs = val.length;
                if (numOfArgs === 0) {
                    descr.args = [];
                } else {
                    const strFunc = val.toString();
                    let args = /\(\s*([^)]+?)\s*\)/.exec(strFunc);
                    if (args[1]) {
                        args = args[1].split(/\s*,\s*/);
                    }
                    descr.args = args;
                }
                meta = reflect.getMetadata("meta:args", instance, key);
                if (!is.undefined(meta)) {
                    for (const i in meta) {
                        const argInfo = meta[i];
                        if (is.array(argInfo)) {
                            if (argInfo.length === 1) {
                                if (is.string(argInfo[0])) {
                                    descr.args[i] = [undefined, argInfo[0]];
                                } else {
                                    if (is.undefined(descr.args[i])) {
                                        descr.args[i] = [argInfo[0], undefined];
                                    } else {
                                        descr.args[i] = [argInfo[0], descr.args[i]];
                                    }
                                }
                            } else {
                                descr.args[i] = argInfo;
                            }
                        } else {
                            if (is.string(argInfo)) {
                                descr.args[i] = [undefined, argInfo];
                            } else {
                                if (is.undefined(descr.args[i])) {
                                    descr.args[i] = [argInfo, undefined];
                                } else {
                                    descr.args[i] = [argInfo, descr.args[i]];
                                }
                            }
                        }
                    }
                }

                for (let i = 0, argIndex = 0; i < descr.args.length; ++i, ++argIndex) {
                    if (is.array(descr.args[i])) {
                        if (is.undefined((descr.args[i])[1])) {
                            (descr.args[i])[1] = `${Investigator.getNameOfType((descr.args[i])[0]).toLowerCase().substring(0, 3)}Arg${argIndex}`;
                        }
                    } else {
                        (descr.args[i]) = [undefined, descr.args[i]];
                    }
                }
                descr.readonly = true;

                const propMeta = reflect.getMetadata(`meta:method:${key}`, this.aClass);
                if (!is.undefined(propMeta)) {
                    if (is.propertyDefined(propMeta, "type")) {
                        descr.type = propMeta.type;
                    }
                    if (is.propertyDefined(propMeta, "args")) {
                        descr.args = propMeta.args;
                    }
                    if (is.propertyDefined(propMeta, "private")) {
                        descr.private = propMeta.private;
                    }
                    if (is.propertyDefined(propMeta, "description")) {
                        descr.description = propMeta.description;
                    }
                }

                this._methodMap.set(key, descr);
            } else {
                meta = reflect.getMetadata("meta:readonly", instance, key);
                descr.readonly = Boolean(meta);
                descr.default = val;

                const propMeta = reflect.getMetadata(`meta:property:${key}`, this.aClass);
                if (!is.undefined(propMeta)) {
                    if (is.propertyDefined(propMeta, "type")) {
                        descr.type = propMeta.type;
                    }
                    if (is.propertyDefined(propMeta, "private")) {
                        descr.private = propMeta.private;
                    }
                    if (is.propertyDefined(propMeta, "readonly")) {
                        descr.readonly = propMeta.readonly;
                    }
                    if (is.propertyDefined(propMeta, "description")) {
                        descr.description = propMeta.description;
                    }
                }

                const propDescr = Object.getOwnPropertyDescriptor(instance, key);
                if (!is.nil(propDescr) && !propDescr.writable) {
                    descr.readonly = true;
                }

                this._propMap.set(key, descr);
            }
        }
    }
}
