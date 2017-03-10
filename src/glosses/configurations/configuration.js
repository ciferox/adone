
const { is } = adone;

export default class Configuration {
    constructor() {
        Object.defineProperty(this, "_", {
            value: {
            }
        });
    }

    load(/*confPath, key*/) {
        throw new adone.x.NotImplemented("Method load() is not implemented");
    }

    save(/*confPath, key*/) {
        throw new adone.x.NotImplemented("Method save() is not implemented");
    }

    get(key) {
        this._checkKey(key);
        return adone.vendor.lodash.get(this, key);
    }

    has(key) {
        this._checkKey(key);
        return adone.vendor.lodash.has(this, key);
    }

    set(key, value) {
        this._checkKey(key);
        return adone.vendor.lodash.set(this, key, value);
    }

    delete(key) {
        this._checkKey(key);
        return adone.vendor.lodash.unset(this, key);
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
            obj = this;
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
            throw new adone.x.InvalidArgument("Invalid type of key");
        }

        if (is.nil(parts) || parts.length === 0 || !parts[0]) {
            throw new adone.x.InvalidArgument("Invalid type of key");
        }
        if (parts[0] === "_") {
            throw new TypeError("Cannot access to value of reserved key");
        }
        return parts;
    }
}
adone.tag.set(Configuration, adone.tag.CONFIGURATION);
