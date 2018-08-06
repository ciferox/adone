import Any from "./types/any";
import { Err } from "./errors";
import { schema as castSchema } from "./cast";
import { flatten } from "./utils";

const Settings = require("./types/any/settings");

const {
    assert,
    is
} = adone;

const callWithDefaults = function (schema, args) {
    assert(this, "Must be invoked on a Joi instance.");

    if (this._defaults) {
        schema = this._defaults(schema);
    }

    schema._currentModel = this;

    return schema._init(...args);
};

const any = new Any();

const root = any.clone();
Any.prototype._currentModel = root;
root._currentModel = root;

const __ = adone.lazifyPrivate({
    alternatives: "./types/alternatives",
    array: "./types/array",
    boolean: "./types/boolean",
    binary: "./types/binary",
    date: "./types/date",
    func: "./types/func",
    number: "./types/number",
    object: "./types/object",
    string: "./types/string",
    Lazy: "./types/lazy",
    Any: "./types/any",
    Set: "./set",
    Ref: "./ref"
}, root, require);

adone.lazify({
    extra: "./extra"
}, root, require);

root.any = function (...args) {
    assert(args.length === 0, "model.any() does not allow arguments.");

    return callWithDefaults.call(this, any, args);
};

root.alternatives = root.alt = function (...args) {
    return callWithDefaults.call(this, __.alternatives, args);
};

root.array = function (...args) {
    assert(args.length === 0, "model.array() does not allow arguments.");

    return callWithDefaults.call(this, __.array, args);
};

root.boolean = root.bool = function (...args) {
    assert(args.length === 0, "model.boolean() does not allow arguments.");

    return callWithDefaults.call(this, __.boolean, args);
};

root.binary = function (...args) {
    assert(args.length === 0, "model.binary() does not allow arguments.");

    return callWithDefaults.call(this, __.binary, args);
};

root.date = function (...args) {
    assert(args.length === 0, "model.date() does not allow arguments.");

    return callWithDefaults.call(this, __.date, args);
};

root.func = function (...args) {
    assert(args.length === 0, "model.func() does not allow arguments.");

    return callWithDefaults.call(this, __.func, args);
};

root.number = function (...args) {
    assert(args.length === 0, "model.number() does not allow arguments.");

    return callWithDefaults.call(this, __.number, args);
};

root.object = function (...args) {
    return callWithDefaults.call(this, __.object, args);
};

root.string = function (...args) {
    assert(args.length === 0, "model.string() does not allow arguments.");

    return callWithDefaults.call(this, __.string, args);
};

root.ref = function (...args) {
    return __.Ref.create(...args);
};

root.isRef = function (ref) {

    return __.Ref.isRef(ref);
};

root.validate = function (value, ...args /*, [schema], [options], callback */) {

    const last = args[args.length - 1];
    const callback = is.function(last) ? last : null;

    const count = args.length - (callback ? 1 : 0);
    if (count === 0) {
        return any.validate(value, callback);
    }

    const options = count === 2 ? args[1] : undefined;
    const schema = root.compile(args[0]);

    return schema._validateWithOptions(value, options, callback);
};

root.describe = function (...args) {

    const schema = args.length ? root.compile(args[0]) : any;
    return schema.describe();
};

root.compile = function (schema) {

    try {
        return castSchema(this, schema);
    } catch (err) {
        if (err.hasOwnProperty("path")) {
            err.message = `${err.message}(${err.path})`;
        }
        throw err;
    }
};

root.assert = function (value, schema, message) {

    root.attempt(value, schema, message);
};

root.attempt = function (value, schema, message) {

    const result = root.validate(value, schema);
    const error = result.error;
    if (error) {
        if (!message) {
            if (is.function(error.annotate)) {
                error.message = error.annotate();
            }
            throw error;
        }

        if (!(message instanceof Error)) {
            if (is.function(error.annotate)) {
                error.message = `${message} ${error.annotate()}`;
            }
            throw error;
        }

        throw message;
    }

    return result.value;
};

root.reach = function (schema, path) {

    assert(schema && schema instanceof Any, "you must provide a joi schema");
    assert(is.array(path) || is.string(path), "path must be a string or an array of strings");

    const reach = (sourceSchema, schemaPath) => {

        if (!schemaPath.length) {
            return sourceSchema;
        }

        const children = sourceSchema._inner.children;
        if (!children) {
            return;
        }

        const key = schemaPath.shift();
        for (let i = 0; i < children.length; ++i) {
            const child = children[i];
            if (child.key === key) {
                return reach(child.schema, schemaPath);
            }
        }
    };

    const schemaPath = is.string(path) ? (path ? path.split(".") : []) : path.slice();

    return reach(schema, schemaPath);
};

root.lazy = function (fn) {
    return __.Lazy.set(fn);
};

root.defaults = function (fn) {

    assert(is.function(fn), "Defaults must be a function");

    let model = Object.create(this.any());
    model = fn(model);

    assert(model && model instanceof this.constructor, "defaults() must return a schema");

    Object.assign(model, this, model.clone()); // Re-add the types from `this` but also keep the settings from joi's potential new defaults

    model._defaults = (schema) => {

        if (this._defaults) {
            schema = this._defaults(schema);
            assert(schema instanceof this.constructor, "defaults() must return a schema");
        }

        schema = fn(schema);
        assert(schema instanceof this.constructor, "defaults() must return a schema");
        return schema;
    };

    return model;
};

root.extend = function (...args) {
    const extensions = flatten(args);
    assert(extensions.length > 0, "You need to provide at least one extension");

    this.assert(extensions, root.extensionsSchema);

    const joi = Object.create(this.any());
    Object.assign(joi, this);

    for (let i = 0; i < extensions.length; ++i) {
        let extension = extensions[i];

        if (is.function(extension)) {
            extension = extension(joi);
        }

        this.assert(extension, root.extensionSchema);

        const base = (extension.base || this.any()).clone(); // Cloning because we're going to override language afterwards
        const ctor = base.constructor;
        const type = class extends ctor { // eslint-disable-line no-loop-func

            constructor() {

                super();
                if (extension.base) {
                    Object.assign(this, base);
                }

                this._type = extension.name;

                if (extension.language) {
                    this._settings = Settings.concat(this._settings, {
                        language: {
                            [extension.name]: extension.language
                        }
                    });
                }
            }

        };

        if (extension.coerce) {
            type.prototype._coerce = function (value, state, options) {

                if (ctor.prototype._coerce) {
                    const baseRet = ctor.prototype._coerce.call(this, value, state, options);

                    if (baseRet.errors) {
                        return baseRet;
                    }

                    value = baseRet.value;
                }

                const ret = extension.coerce.call(this, value, state, options);
                if (ret instanceof Err) {
                    return { value, errors: ret };
                }

                return { value: ret };
            };
        }
        if (extension.pre) {
            type.prototype._base = function (value, state, options) {

                if (ctor.prototype._base) {
                    const baseRet = ctor.prototype._base.call(this, value, state, options);

                    if (baseRet.errors) {
                        return baseRet;
                    }

                    value = baseRet.value;
                }

                const ret = extension.pre.call(this, value, state, options);
                if (ret instanceof Err) {
                    return { value, errors: ret };
                }

                return { value: ret };
            };
        }

        if (extension.rules) {
            for (let j = 0; j < extension.rules.length; ++j) {
                const rule = extension.rules[j];
                const ruleArgs = rule.params ?
                    (rule.params instanceof Any ? rule.params._inner.children.map((k) => k.key) : Object.keys(rule.params)) :
                    [];
                const validateArgs = rule.params ? castSchema(this, rule.params) : null;

                type.prototype[rule.name] = function (...rArgs) { // eslint-disable-line no-loop-func

                    if (rArgs.length > ruleArgs.length) {
                        throw new Error("Unexpected number of arguments");
                    }

                    let hasRef = false;
                    let arg = {};

                    for (let k = 0; k < ruleArgs.length; ++k) {
                        arg[ruleArgs[k]] = rArgs[k];
                        if (!hasRef && __.Ref.isRef(rArgs[k])) {
                            hasRef = true;
                        }
                    }

                    if (validateArgs) {
                        arg = joi.attempt(arg, validateArgs);
                    }

                    let schema;
                    if (rule.validate) {
                        const validate = function (value, state, options) {

                            return rule.validate.call(this, arg, value, state, options);
                        };

                        schema = this._test(rule.name, arg, validate, {
                            description: rule.description,
                            hasRef
                        });
                    } else {
                        schema = this.clone();
                    }

                    if (rule.setup) {
                        const newSchema = rule.setup.call(schema, arg);
                        if (!is.undefined(newSchema)) {
                            assert(newSchema instanceof Any, `Setup of extension model.${this._type}().${rule.name}() must return undefined or a Joi object`);
                            schema = newSchema;
                        }
                    }

                    return schema;
                };
            }
        }

        if (extension.describe) {
            type.prototype.describe = function () {

                const description = ctor.prototype.describe.call(this);
                return extension.describe.call(this, description);
            };
        }

        const instance = new type();
        joi[extension.name] = function (...extArgs) {
            return callWithDefaults.call(this, instance, extArgs);
        };
    }

    return joi;
};

root.extensionSchema = __.object.keys({
    base: __.object.type(Any, "Joi object"),
    name: __.string.required(),
    coerce: __.func.arity(3),
    pre: __.func.arity(3),
    language: __.object,
    describe: __.func.arity(1),
    rules: __.array.items(__.object.keys({
        name: __.string.required(),
        setup: __.func.arity(1),
        validate: __.func.arity(4),
        params: [
            __.object.pattern(/.*/, __.object.type(Any, "Joi object")),
            __.object.type(__.object.constructor, "Joi object")
        ],
        description: [__.string, __.func.arity(1)]
    }).or("setup", "validate"))
}).strict();

root.extensionsSchema = __.array.items([__.object, __.func.arity(1)]).strict();

export default root;
