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
            minimum: 10
        },
        isSuper: {
            type: "boolean"
        },
        connect: {
            type: "object",
            additionalProperties: false,
            properties: {
                retries: {
                    type: "number",
                    minimum: 1
                },
                minTimeout: {
                    type: "number",
                    minimum: 100
                },
                maxTimeout: {
                    type: "number",
                    minimum: 100
                },
                factor: {
                    type: "number",
                    minimum: 1

                },
                randomize: {
                    type: "boolean"
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

const STATUSES = [
    "off",
    "on"
];

const GATE_SCHEMA = {
    type: "object",
    additionalProperties: false,
    requires: ["name", "port"],
    properties: {
        name: {
            type: "string"
        },
        port: {
            type: ["integer", "string"]
        },
        status: {
            type: "string",
            default: "on",
            enum: STATUSES
        }
    }
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

    @Public()
    set(key, val) {
        // lodash.set(this.config.raw, key, this._validateAndGet(key, value));
        switch (key) {
            case "netron": {
                if (this.validateNetron && !this.validateNetron(val)) {
                    throw new adone.x.AggregateException(this.validateNetron.errors);
                }
                break;
            }
            case "service": {
                if (this.validateService && !this.validateService(val)) {
                    throw new adone.x.AggregateException(this.validateService.errors);
                }
                break;
            }
            case "gates": {
                const gates = adone.util.arrify(val);
                for (const gate of gates) {
                    if (this.validateService && !this.validateGate(gate)) {
                        throw new adone.x.AggregateException(this.validateGate.errors);
                    }
                }
                return super.set("gates", gates);
            }
        }
        return super.set(key, val);
    }

    @Public()
    get(key) {
        // const value = lodash.get(this.config.raw, key);
        // if (is.undefined(value)) {
        //     throw new adone.x.Unknown(`Unknown property: ${key}`);
        // }

        return super.get(key);
    }

    @Public()
    delete(key) {
        // const value = lodash.get(this.config.raw, key);
        // if (is.undefined(value)) {
        //     throw new adone.x.Unknown(`Unknown property: ${key}`);
        // }

        // const parts = key.split(".");
        // if (parts.length === 1) {
        //     delete this.config.raw[key];
        // } else {
        //     const subKey = parts.pop();
        //     const obj = lodash.get(this.config.raw, parts);
        //     delete obj[subKey];
        // }

        return super.delete(key);
    }

    @Public()
    hasGate(name) {
        return this.gates.findIndex((g) => g.name === name) >= 0;
    }

    @Public()
    getGate(name) {
        const index = this.gates.findIndex((g) => g.name === name);
        if (index < 0) {
            throw new adone.x.NotExists(`Gate with name '${name}' is not exist`);
        }

        return this.gates[index];
    }

    @Public()
    getGates(status) {
        if (is.string(status)) {
            // Local gate always is enabled.
            return this.gates.filter((g) => g.status === status || g.name === "local");
        }
        return this.gates;
    }

    @Public()
    addGate(gate) {
        if (!this.validateGate(gate)) {
            throw new adone.x.AggregateException(this.validateGate.errors);
        }

        if (this.hasGate(gate.name)) {
            throw new adone.x.Exists(`Gate with name '${gate.name}' is already exist`);
        }

        this.gates.push(gate);

        return super.set("gates", this.gates);
    }

    @Public()
    deleteGate(name) {
        const index = this.gates.findIndex((g) => g.name === name);
        if (index < 0) {
            throw new adone.x.NotExists(`Gate with name '${name}' is not exist`);
        }

        this.gates.splice(index, 1);
        return this.set("gates", this.gates);
    }

    @Public()
    offGate(name) {
        const gate = this.getGate(name);
        gate.status = "off";
        return this.set("gates", this.gates);
    }

    @Public()
    onGate(name) {
        const gate = this.getGate(name);
        gate.status = "on";
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
