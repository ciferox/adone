import Valuable from "./valuable";

const {
    is,
    netron: { Context, Public }
} = adone;

const NETRON_SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
        responseTimeout: {
            type: "number",
            minimum: 10,
            default: 30000
        },
        isSuper: {
            type: "boolean",
            default: true
        },
        connect: {
            type: "object",
            additionalProperties: false,
            properties: {
                retries: {
                    type: "number",
                    minimum: 1,
                    default: 3
                },
                minTimeout: {
                    type: "number",
                    minimum: 100,
                    default: 100
                },
                maxTimeout: {
                    type: "number",
                    minimum: 100,
                    default: 10000
                },
                factor: {
                    type: "number",
                    minimum: 1,
                    default: 2
                },
                randomize: {
                    type: "boolean",
                    default: false
                }
            }
        }
    }
};

const SERVICE_SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
        startTimeout: {
            type: "number",
            minimum: 1000
        },
        stopTimeout: {
            type: "number",
            minimum: 1000
        }
    }
};

const GATE_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["name", "port"],
    properties: {
        name: {
            type: "string"
        },
        port: {
            type: ["integer", "string"]
        },
        startup: {
            type: "boolean",
            default: true
        }
    }
};


const charCodeOfDot = ".".charCodeAt(0);
const reEscapeChar = /\\(\\)?/g;
const rePropName = RegExp(
    // Match anything that isn't a dot or bracket.
    "[^.[\\]]+" + "|" +
    // Or match property names within brackets.
    "\\[(?:" +
    // Match a non-string expression.
    '([^"\'].*)' + "|" +
    // Or match strings (supports escaping characters).
    '(["\'])((?:(?!\\2)[^\\\\]|\\\\.)*?)\\2' +
    ")\\]" + "|" +
    // Or match "" as the space between consecutive dots or empty brackets.
    "(?=(?:\\.|\\[\\])(?:\\.|\\[\\]|$))"
    , "g");

/** Used to match property names within property paths. */
const reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
const reIsPlainProp = /^\w*$/;

const castPath = (path) => {
    if (is.array(path)) {
        return path;
    }

    const type = typeof path;
    if (type === "number" || type === "boolean" || is.nil(path) || is.symbol(path) || reIsPlainProp.test(path) || !reIsDeepProp.test(path)) {
        return [path];
    }

    const result = [];
    if (path.charCodeAt(0) === charCodeOfDot) {
        result.push("");
    }
    path.replace(rePropName, (match, expression, quote, subString) => {
        let key = match;
        if (quote) {
            key = subString.replace(reEscapeChar, "$1");
        } else if (expression) {
            key = expression.trim();
        }
        result.push(key);
    });
    return result;
};


@Context({
    description: "Omnitron configuration"
})
export default class Configuration extends Valuable {
    @Public()
    async getAll() {
        const json = await super.toJSON({
            tags: "none"
        });

        return json.entries;
    }

    async _setVal(key, path, val) {
        const result = await super.get(key);
        adone.vendor.lodash.set(result, path, val);
        return result;
    }

    @Public()
    async set(key, val) {
        const path = castPath(key);
        key = path.shift();
        switch (key) {
            case "netron": {
                if (path.length > 0) {
                    val = await this._setVal(key, path, val);
                }
                if (this.validateNetron && !this.validateNetron(val)) {
                    throw new adone.exception.AggregateException(this.validateNetron.errors);
                }
                break;
            }
            case "service": {
                if (path.length > 0) {
                    val = await this._setVal(key, path, val);
                    adone.log(val);
                }
                if (this.validateService && !this.validateService(val)) {
                    throw new adone.exception.AggregateException(this.validateService.errors);
                }
                break;
            }
            case "gates": {
                let gates;
                if (path.length === 0) {
                    gates = adone.util.arrify(val);
                } else {
                    gates = this.gates;
                    adone.vendor.lodash.set(gates, path, val);
                }
                for (const gate of gates) {
                    if (this.validateService && !this.validateGate(gate)) {
                        throw new adone.exception.AggregateException(this.validateGate.errors);
                    }
                }
                return super.set("gates", gates);
            }
            case "hosts": {
                break;
            }
            default:
                throw new adone.exception.NotExists(`Key not exist: ${key}`);
        }
        return super.set(key, val);
    }

    @Public()
    async get(key) {
        const path = castPath(key);

        const object = await super.get(path.shift());
        if (is.undefined(object)) {
            throw new adone.exception.NotExists(`Key not exist: ${key}`);
        }

        if (path.length === 0) {
            return object;
        }

        const result = adone.vendor.lodash.get(object, path);
        if (is.undefined(result)) {
            throw new adone.exception.NotExists(`Key not exist: ${key}`);
        }
        return result;
    }

    @Public()
    async delete(key) {
        const path = castPath(key);
        key = path.shift();

        if (path.length === 0) {
            if (["service", "netron"].includes(key)) {
                throw new adone.exception.NotAllowed("Operation not allowed");
            }
            return super.delete(key);
        }

        const lastKey = path.pop();
        const result = await super.get(key);
        let subObject;
        if (path.length === 0) {
            subObject = result;
        } else {
            subObject = adone.vendor.lodash.get(result, path);    
        }

        if (is.array(subObject)) {
            subObject.splice(Number.parseInt(lastKey), 1);
        } else {
            delete subObject[lastKey];
        }
        return super.set(key, result);
    }

    @Public()
    hasGate(name) {
        return this.gates.findIndex((g) => g.name === name) >= 0;
    }

    @Public()
    getGate(name) {
        const index = this.gates.findIndex((g) => g.name === name);
        if (index < 0) {
            throw new adone.exception.NotExists(`Gate with name '${name}' is not exist`);
        }

        return this.gates[index];
    }

    @Public()
    getGates() {
        return this.gates;
    }

    @Public()
    addGate(gate) {
        if (!this.validateGate(gate)) {
            throw new adone.exception.AggregateException(this.validateGate.errors);
        }

        if (this.hasGate(gate.name)) {
            throw new adone.exception.Exists(`Gate with name '${gate.name}' is already exist`);
        }

        this.gates.push(gate);

        return super.set("gates", this.gates);
    }

    @Public()
    deleteGate(name) {
        const index = this.gates.findIndex((g) => g.name === name);
        if (index < 0) {
            throw new adone.exception.NotExists(`Gate with name '${name}' is not exist`);
        }

        this.gates.splice(index, 1);
        return this.set("gates", this.gates);
    }

    @Public()
    configureGate(name, options) {
        const gate = this.getGate(name);

        if (is.undefined(options)) {
            return gate;
        }

        options.name = name;

        if (!this.validateGate(gate)) {
            throw new adone.exception.AggregateException(this.validateGate.errors);
        }

        Object.assign(gate, options);
        return this.set("gates", this.gates);
    }

    static async load(valuable) {
        const config = new Configuration(valuable);

        // Defaults
        if (!config.has("gates")) {
            await config.set("gates", []);
        }

        if (!config.has("hosts")) {
            await config.set("hosts", []);
        }

        if (!config.has("service")) {
            await config.set("service", {
                startTimeout: 10000,
                stopTimeout: 10000
            });
        }

        if (!config.has("netron")) {
            await config.set("netron", {
                responseTimeout: 30000,
                isSuper: true,
                connect: {
                    retries: 3,
                    minTimeout: 100,
                    maxTimeout: 10000,
                    factor: 2,
                    randomize: false
                }
            });
        }

        // Initialize validators
        const validator = new adone.schema.Validator({
            coerceTypes: true,
            useDefaults: true
        });
        config.validateGate = validator.compile(GATE_SCHEMA);
        config.validateNetron = validator.compile(NETRON_SCHEMA);
        config.validateService = validator.compile(SERVICE_SCHEMA);

        // Cache some values
        config.gates = await config.get("gates");
        config.hosts = await config.get("hosts");

        return config;
    }
}    