const {
    is,
    model,
    netron2: { meta: { Context, Public } },
    vault
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


const serviceSchema = model.object({
    startTimeout: model.number().min(1000),
    stopTimeout: model.number().min(1000)
});

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

/**
 *  Used to match property names within property paths.
 */
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
    public: true,
    private: ["initialize", "uninitialize"],
    description: "Omnitron configuration"
})
export default class Configuration extends vault.Valuable {
    @Public()
    async getAll() {
        const json = await super.toJSON({
            tags: "none"
        });

        return json.entries;
    }

    async _setVal(key, path, val) {
        const result = await super.get(key);
        adone.lodash.set(result, path, val);
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
                    throw new adone.error.AggregateException(this.validateNetron.errors);
                }
                break;
            }
            case "service": {
                if (path.length > 0) {
                    val = await this._setVal(key, path, val);
                    console.log(val);
                }
                val = await serviceSchema.validate(val);
                break;
            }
            case "networks": {
                let networks;
                if (path.length === 0) {
                    networks = adone.util.arrify(val);
                } else {
                    networks = this.networks;
                    adone.lodash.set(networks, path, val);
                }
                for (const gate of networks) {
                    if (this.validateGate && !this.validateGate(gate)) {
                        throw new adone.error.AggregateException(this.validateGate.errors);
                    }
                }
                return super.set("networks", networks);
            }
            case "hosts": {
                break;
            }
            default:
                throw new adone.error.NotExists(`Key not exist: ${key}`);
        }
        return super.set(key, val);
    }

    @Public()
    async get(key) {
        const path = castPath(key);

        const object = await super.get(path.shift());
        if (is.undefined(object)) {
            throw new adone.error.NotExists(`Key not exist: ${key}`);
        }

        if (path.length === 0) {
            return object;
        }

        const result = adone.lodash.get(object, path);
        if (is.undefined(result)) {
            throw new adone.error.NotExists(`Key not exist: ${key}`);
        }
        return result;
    }

    @Public()
    async delete(key) {
        const path = castPath(key);
        key = path.shift();

        if (path.length === 0) {
            if (["service", "netron"].includes(key)) {
                throw new adone.error.NotAllowed("Operation not allowed");
            }
            return super.delete(key);
        }

        const lastKey = path.pop();
        const result = await super.get(key);
        let subObject;
        if (path.length === 0) {
            subObject = result;
        } else {
            subObject = adone.lodash.get(result, path);
        }

        if (is.array(subObject)) {
            subObject.splice(Number.parseInt(lastKey), 1);
        } else {
            delete subObject[lastKey];
        }
        return super.set(key, result);
    }

    async initialize() {
        if (!this.has("hosts")) {
            await this.set("hosts", []);
        }

        if (!this.has("service")) {
            await this.set("service", {
                startTimeout: 10000,
                stopTimeout: 10000
            });
        }

        if (!this.has("netron")) {
            await this.set("netron", {
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
        this.validateGate = validator.compile(GATE_SCHEMA);
        this.validateNetron = validator.compile(NETRON_SCHEMA);

        // Cache some values
        this.hosts = await this.get("hosts");

        return this;
    }

    uninitialize() {

    }
}    
