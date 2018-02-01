const {
    is
} = adone;

export class Base {
    constructor() {
        this.raw = {};
    }

    load(/*confPath, key*/) {
        throw new adone.exception.NotImplemented("Method load() is not implemented");
    }

    save(/*confPath, key*/) {
        throw new adone.exception.NotImplemented("Method save() is not implemented");
    }

    get(key) {
        this._checkKey(key);
        return adone.vendor.lodash.get(this.raw, key);
    }

    has(key) {
        this._checkKey(key);
        return adone.vendor.lodash.has(this.raw, key);
    }

    set(key, value) {
        this._checkKey(key);
        return adone.vendor.lodash.set(this.raw, key, value);
    }

    delete(key) {
        this._checkKey(key);
        return adone.vendor.lodash.unset(this.raw, key);
    }

    clear() {
        this.raw = {};
    }

    assign(...args) {
        if (args.length < 1) {
            return false;
        }

        let key;
        if (is.string(args[0]) || is.array(args[0])) {
            key = args.shift();
        }
        const obj = this.getObject(key);
        if (!is.object(obj)) {
            return this.set(key, adone.vendor.lodash.assign(...args));
        }
        
        for (let i = args.length; --i >= 0; ) {
            if (is.configuration(args[i])) {
                args[i] = args[i].raw;
            }
        }

        return adone.vendor.lodash.assign(obj, ...args);
    }

    merge(...args) {
        if (args.length < 1) {
            return false;
        }

        let key;
        if (is.string(args[0]) || is.array(args[0])) {
            key = args.shift();
        }
        const obj = this.getObject(key);
        if (!is.object(obj)) {
            return this.set(key, adone.vendor.lodash.assign(...args));
        }
        
        for (let i = args.length; --i >= 0; ) {
            if (is.configuration(args[i])) {
                args[i] = args[i].raw;
            }
        }
        
        return adone.vendor.lodash.merge(obj, ...args);
    }

    keys(key) {
        return adone.vendor.lodash.keys(this.getObject(key));
    }

    values(key) {
        return adone.vendor.lodash.values(this.getObject(key));
    }

    entries(key) {
        return adone.vendor.lodash.toPairs(this.getObject(key));
    }

    getObject(key) {
        let obj;
        if ((is.string(key) && key !== "") || is.array(key)) {
            obj = this.get(key);
        } else {
            obj = this.raw;
        }
        return obj;
    }

    _checkKey(key) {
        let parts;
        if (is.string(key)) {
            parts = key.split(".");
        } else if (is.array(key)) {
            parts = key;
        } else {
            throw new adone.exception.InvalidArgument("Invalid type of key");
        }

        if (is.nil(parts) || parts.length === 0 || !parts[0]) {
            throw new adone.exception.InvalidArgument("Invalid type of key");
        }
        return parts;
    }
}
adone.tag.add(Base, "CONFIGURATION");

const lazy = adone.lazify({
    Generic: "./generic",
    Adone: "./adone",
    Npm: "./npm",
    Jsconfig: "./jsconfig"
}, adone.asNamespace(exports), require);

export const load = async (path, name, options) => {
    const config = new lazy.Generic(options);
    await config.load(path, name, options);
    return config;
};
