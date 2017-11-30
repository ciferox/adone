import Subsystem from "../subsystem";

const {
    application: {
        DCliCommand
    },
    is,
    omnitron,
    runtime: { term },
    vendor: { lodash }
} = adone;

const SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
        gc: { type: "boolean" },
        netron: {
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
        },
        service: {
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
        }
    }
};

export default class Config extends Subsystem {
    async initialize() {
        this.config = await omnitron.Configuration.load({ defaults: false });
        const validator = new adone.schema.Validator({
            coerceTypes: true
        });
        this.validate = validator.compile(SCHEMA);
    }

    @DCliCommand({
        name: "set",
        help: "Set property value",
        arguments: [
            {
                name: "key",
                type: String,
                help: "Path to property"
            },
            {
                name: "value",
                type: String,
                help: "Property value"
            }
        ]
    })
    async setCommand(args) {
        try {
            const key = args.get("key");
            const value = args.get("value");

            lodash.set(this.config.raw, key, this._validateAndGet(key, value));
            await this.config.save();
            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/red-fg}\n`);
            return 1;
        }
    }

    @DCliCommand({
        name: "get",
        help: "Get property value",
        arguments: [
            {
                name: "key",
                type: String,
                help: "Path to property"
            }
        ]
    })
    async getCommand(args) {
        try {
            const key = args.get("key");
            const value = lodash.get(this.config.raw, key);
            if (is.undefined(value)) {
                throw new adone.x.Unknown(`Unknown property: ${key}`);
            }
            adone.log(adone.text.pretty.json(value));
            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/red-fg}\n`);
            return 1;
        }
    }

    @DCliCommand({
        name: ["delete", "del"],
        help: "Delete property",
        arguments: [
            {
                name: "key",
                type: String,
                help: "Path to property"
            }
        ]
    })
    async deleteCommand(args) {
        const key = args.get("key");
        const value = lodash.get(this.config.raw, key);
        if (is.undefined(value)) {
            throw new adone.x.Unknown(`Unknown property: ${key}`);
        }

        const parts = key.split(".");
        if (parts.length === 1) {
            delete this.config.raw[key];
        } else {
            const subKey = parts.pop();
            const obj = lodash.get(this.config.raw, parts);
            delete obj[subKey];
        }

        await this.config.save();
        return 0;
    }

    @DCliCommand({
        name: "list",
        help: "Show configuration",
        options: [
            {
                name: "--default",
                help: "Shwo default configuration instead of real"
            }
        ]
    })
    async listCommand(args, opts) {
        let config;
        if (opts.has("default")) {
            config = omnitron.Configuration.DEFAULT;
        } else {
            config = this.config.raw;
        }
        adone.log(adone.text.pretty.json(config));
        return 0;
    }

    @DCliCommand({
        name: "schema",
        help: "Show configuration schema"
    })
    async schemaCommand() {
        adone.log(adone.text.pretty.json(SCHEMA));
        return 0;
    }

    @DCliCommand({
        name: "edit",
        help: "Open config in editor",
        options: [
            {
                name: ["--editor", "-e"],
                type: String,
                nargs: "?",
                help: "open file immediately in the editor"
            }
        ]
    })
    async editCommand(args, opts) {
        await (new adone.util.Editor({
            path: omnitron.Configuration.path,
            editor: opts.get("editor")
        })).spawn({
            detached: true
        });

        return 0;
    }

    _validateAndGet(key, value) {
        const holder = {};

        const confValue = lodash.get(this.config.raw, key);
        if (!is.primitive(confValue)) {
            throw new adone.x.NotAllowed("Can not change the value of a non-primitive property");
        }

        lodash.set(holder, key, value);
        if (!this.validate(holder)) {
            throw new adone.x.NotValid(adone.text.capitalize(this.validate.errors[0].message));
        }
        return lodash.get(holder, key);
    }
}
