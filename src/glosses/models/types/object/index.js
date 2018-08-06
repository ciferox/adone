import Any from "../any";
import { clone, merge, flatten, mapToObject, applyToDefaults, Topo } from "../../utils";
import { Err } from "../../errors";
const Cast = require("../../cast");

const {
    assert,
    is
} = adone;

const internals = {};

internals.Object = class extends Any {

    constructor() {

        super();
        this._type = "object";
        this._inner.children = null;
        this._inner.renames = [];
        this._inner.dependencies = [];
        this._inner.patterns = [];
    }

    _init(...args) {
        return args.length ? this.keys(...args) : this;
    }

    _base(value, state, options) {

        let target = value;
        const errors = [];
        const finish = () => {

            return {
                value: target,
                errors: errors.length ? errors : null
            };
        };

        if (is.string(value) &&
            options.convert) {

            value = internals.safeParse(value);
        }

        const type = this._flags.func ? "function" : "object";
        if (!value ||
            typeof value !== type ||
            is.array(value)) {

            errors.push(this.createError(`${type}.base`, null, state, options));
            return finish();
        }

        // Skip if there are no other rules to test

        if (!this._inner.renames.length &&
            !this._inner.dependencies.length &&
            !this._inner.children && // null allows any keys
            !this._inner.patterns.length) {

            target = value;
            return finish();
        }

        // Ensure target is a local copy (parsed) or shallow copy

        if (target === value) {
            if (type === "object") {
                target = Object.create(Object.getPrototypeOf(value));
            } else {
                target = function (...args) {

                    return value.apply(this, args);
                };

                target.prototype = clone(value.prototype);
            }

            const valueKeys = Object.keys(value);
            for (let i = 0; i < valueKeys.length; ++i) {
                target[valueKeys[i]] = value[valueKeys[i]];
            }
        } else {
            target = value;
        }

        // Rename keys

        const renamed = {};
        for (let i = 0; i < this._inner.renames.length; ++i) {
            const rename = this._inner.renames[i];

            if (rename.isRegExp) {
                const targetKeys = Object.keys(target);
                const matchedTargetKeys = [];

                for (let j = 0; j < targetKeys.length; ++j) {
                    if (rename.from.test(targetKeys[j])) {
                        matchedTargetKeys.push(targetKeys[j]);
                    }
                }

                const allUndefined = matchedTargetKeys.every((key) => is.undefined(target[key]));
                if (rename.options.ignoreUndefined && allUndefined) {
                    continue;
                }

                if (!rename.options.multiple &&
                    renamed[rename.to]) {

                    errors.push(this.createError("object.rename.regex.multiple", { from: matchedTargetKeys, to: rename.to }, state, options));
                    if (options.abortEarly) {
                        return finish();
                    }
                }

                if (Object.prototype.hasOwnProperty.call(target, rename.to) &&
                    !rename.options.override &&
                    !renamed[rename.to]) {

                    errors.push(this.createError("object.rename.regex.override", { from: matchedTargetKeys, to: rename.to }, state, options));
                    if (options.abortEarly) {
                        return finish();
                    }
                }

                if (allUndefined) {
                    delete target[rename.to];
                } else {
                    target[rename.to] = target[matchedTargetKeys[matchedTargetKeys.length - 1]];
                }

                renamed[rename.to] = true;

                if (!rename.options.alias) {
                    for (let j = 0; j < matchedTargetKeys.length; ++j) {
                        delete target[matchedTargetKeys[j]];
                    }
                }
            } else {
                if (rename.options.ignoreUndefined && is.undefined(target[rename.from])) {
                    continue;
                }

                if (!rename.options.multiple &&
                    renamed[rename.to]) {

                    errors.push(this.createError("object.rename.multiple", { from: rename.from, to: rename.to }, state, options));
                    if (options.abortEarly) {
                        return finish();
                    }
                }

                if (Object.prototype.hasOwnProperty.call(target, rename.to) &&
                    !rename.options.override &&
                    !renamed[rename.to]) {

                    errors.push(this.createError("object.rename.override", { from: rename.from, to: rename.to }, state, options));
                    if (options.abortEarly) {
                        return finish();
                    }
                }

                if (is.undefined(target[rename.from])) {
                    delete target[rename.to];
                } else {
                    target[rename.to] = target[rename.from];
                }

                renamed[rename.to] = true;

                if (!rename.options.alias) {
                    delete target[rename.from];
                }
            }
        }

        // Validate schema

        if (!this._inner.children && // null allows any keys
            !this._inner.patterns.length &&
            !this._inner.dependencies.length) {

            return finish();
        }

        const unprocessed = new Set(Object.keys(target));

        if (this._inner.children) {
            const stripProps = [];

            for (let i = 0; i < this._inner.children.length; ++i) {
                const child = this._inner.children[i];
                const key = child.key;
                const item = target[key];

                unprocessed.delete(key);

                const localState = { key, path: state.path.concat(key), parent: target, reference: state.reference };
                const result = child.schema._validate(item, localState, options);
                if (result.errors) {
                    errors.push(this.createError("object.child", { key, child: child.schema._getLabel(key), reason: result.errors }, localState, options));

                    if (options.abortEarly) {
                        return finish();
                    }
                } else {
                    if (child.schema._flags.strip || (is.undefined(result.value) && result.value !== item)) {
                        stripProps.push(key);
                        target[key] = result.finalValue;
                    } else if (!is.undefined(result.value)) {
                        target[key] = result.value;
                    }
                }
            }

            for (let i = 0; i < stripProps.length; ++i) {
                delete target[stripProps[i]];
            }
        }

        // Unknown keys

        if (unprocessed.size && this._inner.patterns.length) {

            for (const key of unprocessed) {
                const localState = {
                    key,
                    path: state.path.concat(key),
                    parent: target,
                    reference: state.reference
                };
                const item = target[key];

                for (let i = 0; i < this._inner.patterns.length; ++i) {
                    const pattern = this._inner.patterns[i];

                    if (pattern.regex ?
                        pattern.regex.test(key) :
                        !pattern.schema.validate(key).error) {

                        unprocessed.delete(key);

                        const result = pattern.rule._validate(item, localState, options);
                        if (result.errors) {
                            errors.push(this.createError("object.child", {
                                key,
                                child: pattern.rule._getLabel(key),
                                reason: result.errors
                            }, localState, options));

                            if (options.abortEarly) {
                                return finish();
                            }
                        }

                        target[key] = result.value;
                    }
                }
            }
        }

        if (unprocessed.size && (this._inner.children || this._inner.patterns.length)) {
            if ((options.stripUnknown && this._flags.allowUnknown !== true) ||
                options.skipFunctions) {

                const stripUnknown = options.stripUnknown
                    ? (options.stripUnknown === true ? true : Boolean(options.stripUnknown.objects))
                    : false;


                for (const key of unprocessed) {
                    if (stripUnknown) {
                        delete target[key];
                        unprocessed.delete(key);
                    } else if (is.function(target[key])) {
                        unprocessed.delete(key);
                    }
                }
            }

            if ((!is.undefined(this._flags.allowUnknown) ? !this._flags.allowUnknown : !options.allowUnknown)) {

                for (const unprocessedKey of unprocessed) {
                    errors.push(this.createError("object.allowUnknown", { child: unprocessedKey }, {
                        key: unprocessedKey,
                        path: state.path.concat(unprocessedKey)
                    }, options, {}));
                }
            }
        }

        // Validate dependencies

        for (let i = 0; i < this._inner.dependencies.length; ++i) {
            const dep = this._inner.dependencies[i];
            const err = internals[dep.type].call(this, !is.null(dep.key) && target[dep.key], dep.peers, target, { key: dep.key, path: is.null(dep.key) ? state.path : state.path.concat(dep.key) }, options);
            if (err instanceof Err) {
                errors.push(err);
                if (options.abortEarly) {
                    return finish();
                }
            }
        }

        return finish();
    }

    keys(schema) {
        assert(is.nil(schema) || typeof schema === "object", "Object schema must be a valid object");
        assert(!schema || !(schema instanceof Any), "Object schema cannot be a joi schema");

        const obj = this.clone();

        if (!schema) {
            obj._inner.children = null;
            return obj;
        }

        const children = Object.keys(schema);

        if (!children.length) {
            obj._inner.children = [];
            return obj;
        }

        const topo = new Topo();
        if (obj._inner.children) {
            for (let i = 0; i < obj._inner.children.length; ++i) {
                const child = obj._inner.children[i];

                // Only add the key if we are not going to replace it later
                if (!children.includes(child.key)) {
                    topo.add(child, { after: child._refs, group: child.key });
                }
            }
        }

        for (let i = 0; i < children.length; ++i) {
            const key = children[i];
            const child = schema[key];
            try {
                const cast = Cast.schema(this._currentModel, child);
                topo.add({ key, schema: cast }, { after: cast._refs, group: key });
            } catch (castErr) {
                if (castErr.hasOwnProperty("path")) {
                    castErr.path = `${key}.${castErr.path}`;
                } else {
                    castErr.path = key;
                }
                throw castErr;
            }
        }

        obj._inner.children = topo.nodes;

        return obj;
    }

    append(schema) {
        // Skip any changes
        if (is.nil(schema) || Object.keys(schema).length === 0) {
            return this;
        }

        return this.keys(schema);
    }

    unknown(allow) {

        const value = allow !== false;

        if (this._flags.allowUnknown === value) {
            return this;
        }

        const obj = this.clone();
        obj._flags.allowUnknown = value;
        return obj;
    }

    length(limit) {

        assert(is.safeInteger(limit) && limit >= 0, "limit must be a positive integer");

        return this._test("length", limit, function (value, state, options) {

            if (Object.keys(value).length === limit) {
                return value;
            }

            return this.createError("object.length", { limit }, state, options);
        });
    }

    min(limit) {

        assert(is.safeInteger(limit) && limit >= 0, "limit must be a positive integer");

        return this._test("min", limit, function (value, state, options) {

            if (Object.keys(value).length >= limit) {
                return value;
            }

            return this.createError("object.min", { limit }, state, options);
        });
    }

    max(limit) {

        assert(is.safeInteger(limit) && limit >= 0, "limit must be a positive integer");

        return this._test("max", limit, function (value, state, options) {

            if (Object.keys(value).length <= limit) {
                return value;
            }

            return this.createError("object.max", { limit }, state, options);
        });
    }

    pattern(pattern, schema) {
        const isRegExp = pattern instanceof RegExp;
        assert(isRegExp || pattern instanceof Any, "Pattern must be a regex or schema");
        assert(!is.undefined(schema), "Invalid rule");

        if (isRegExp) {
            pattern = new RegExp(pattern.source, pattern.ignoreCase ? "i" : undefined); // Future version should break this and forbid unsupported regex flags
        }

        try {
            schema = Cast.schema(this._currentModel, schema);
        } catch (castErr) {
            if (castErr.hasOwnProperty("path")) {
                castErr.message = `${castErr.message}(${castErr.path})`;
            }

            throw castErr;
        }


        const obj = this.clone();
        if (isRegExp) {
            obj._inner.patterns.push({ regex: pattern, rule: schema });
        }
        else {
            obj._inner.patterns.push({ schema: pattern, rule: schema });
        }
        return obj;
    }

    schema() {

        return this._test("schema", null, function (value, state, options) {

            if (value instanceof Any) {
                return value;
            }

            return this.createError("object.schema", null, state, options);
        });
    }

    with(key, peers) {

        assert(arguments.length === 2, "Invalid number of arguments, expected 2.");

        return this._dependency("with", key, peers);
    }

    without(key, peers) {

        assert(arguments.length === 2, "Invalid number of arguments, expected 2.");

        return this._dependency("without", key, peers);
    }

    xor(...peers) {

        peers = flatten(peers);
        return this._dependency("xor", null, peers);
    }

    or(...peers) {

        peers = flatten(peers);
        return this._dependency("or", null, peers);
    }

    and(...peers) {

        peers = flatten(peers);
        return this._dependency("and", null, peers);
    }

    nand(...peers) {

        peers = flatten(peers);
        return this._dependency("nand", null, peers);
    }

    requiredKeys(...children) {

        children = flatten(children);
        return this.applyFunctionToChildren(children, "required");
    }

    optionalKeys(...children) {

        children = flatten(children);
        return this.applyFunctionToChildren(children, "optional");
    }

    forbiddenKeys(...children) {

        children = flatten(children);
        return this.applyFunctionToChildren(children, "forbidden");
    }

    rename(from, to, options) {

        assert(is.string(from) || from instanceof RegExp, "Rename missing the from argument");
        assert(is.string(to), "Rename missing the to argument");
        assert(to !== from, `Cannot rename key to same name: ${from}`);

        for (let i = 0; i < this._inner.renames.length; ++i) {
            assert(this._inner.renames[i].from !== from, "Cannot rename the same key multiple times");
        }

        const obj = this.clone();

        obj._inner.renames.push({
            from,
            to,
            options: applyToDefaults(internals.renameDefaults, options || {}),
            isRegExp: from instanceof RegExp
        });

        return obj;
    }

    applyFunctionToChildren(children, fn, args, root) {

        children = [].concat(children);
        assert(children.length > 0, "expected at least one children");

        const groupedChildren = internals.groupChildren(children);
        let obj;

        if ("" in groupedChildren) {
            obj = this[fn].apply(this, args);
            delete groupedChildren[""];
        } else {
            obj = this.clone();
        }

        if (obj._inner.children) {
            root = root ? (`${root}.`) : "";

            for (let i = 0; i < obj._inner.children.length; ++i) {
                const child = obj._inner.children[i];
                const group = groupedChildren[child.key];

                if (group) {
                    obj._inner.children[i] = {
                        key: child.key,
                        _refs: child._refs,
                        schema: child.schema.applyFunctionToChildren(group, fn, args, root + child.key)
                    };

                    delete groupedChildren[child.key];
                }
            }
        }

        const remaining = Object.keys(groupedChildren);
        assert(remaining.length === 0, `unknown key(s) ${remaining.join(", ")}`);

        return obj;
    }

    _dependency(type, key, peers) {

        peers = [].concat(peers);
        for (let i = 0; i < peers.length; ++i) {
            assert(is.string(peers[i]), type, "peers must be a string or array of strings");
        }

        const obj = this.clone();
        obj._inner.dependencies.push({ type, key, peers });
        return obj;
    }

    describe(shallow) {

        const description = Any.prototype.describe.call(this);

        if (description.rules) {
            for (let i = 0; i < description.rules.length; ++i) {
                const rule = description.rules[i];
                // Coverage off for future-proof descriptions, only object().assert() is use right now
                if (/* $lab:coverage:off$ */rule.arg &&
                    typeof rule.arg === "object" &&
                    rule.arg.schema &&
                    rule.arg.ref /* $lab:coverage:on$ */) {
                    rule.arg = {
                        schema: rule.arg.schema.describe(),
                        ref: rule.arg.ref.toString()
                    };
                }
            }
        }

        if (this._inner.children &&
            !shallow) {

            description.children = {};
            for (let i = 0; i < this._inner.children.length; ++i) {
                const child = this._inner.children[i];
                description.children[child.key] = child.schema.describe();
            }
        }

        if (this._inner.dependencies.length) {
            description.dependencies = clone(this._inner.dependencies);
        }

        if (this._inner.patterns.length) {
            description.patterns = [];

            for (let i = 0; i < this._inner.patterns.length; ++i) {
                const pattern = this._inner.patterns[i];
                if (pattern.regex) {
                    description.patterns.push({ regex: pattern.regex.toString(), rule: pattern.rule.describe() });
                } else {
                    description.patterns.push({ schema: pattern.schema.describe(), rule: pattern.rule.describe() });
                }
            }
        }

        if (this._inner.renames.length > 0) {
            description.renames = clone(this._inner.renames);
        }

        return description;
    }

    assert(ref, schema, message) {

        ref = Cast.ref(ref);
        assert(ref.isContext || ref.depth > 1, "Cannot use assertions for root level references - use direct key rules instead");
        message = message || "pass the assertion test";

        try {
            schema = Cast.schema(this._currentModel, schema);
        } catch (castErr) {
            if (castErr.hasOwnProperty("path")) {
                castErr.message = `${castErr.message}(${castErr.path})`;
            }

            throw castErr;
        }

        const key = ref.path[ref.path.length - 1];
        const path = ref.path.join(".");

        return this._test("assert", { schema, ref }, function (value, state, options) {

            const result = schema._validate(ref(value), null, options, value);
            if (!result.errors) {
                return value;
            }

            const localState = merge({}, state);
            localState.key = key;
            localState.path = ref.path;
            return this.createError("object.assert", { ref: path, message }, localState, options);
        });
    }

    type(constructor, name = constructor.name) {

        assert(is.function(constructor), "type must be a constructor function");
        const typeData = {
            name,
            ctor: constructor
        };

        return this._test("type", typeData, function (value, state, options) {

            if (value instanceof constructor) {
                return value;
            }

            return this.createError("object.type", { type: typeData.name }, state, options);
        });
    }
};

internals.safeParse = function (value) {

    try {
        return JSON.parse(value);
    } catch (parseErr) { }

    return value;
};


internals.renameDefaults = {
    alias: false, // Keep old value in place
    multiple: false, // Allow renaming multiple keys into the same target
    override: false // Overrides an existing key
};


internals.groupChildren = function (children) {

    children.sort();

    const grouped = {};

    for (let i = 0; i < children.length; ++i) {
        const child = children[i];
        assert(is.string(child), "children must be strings");
        const group = child.split(".")[0];
        const childGroup = grouped[group] = (grouped[group] || []);
        childGroup.push(child.substring(group.length + 1));
    }

    return grouped;
};


internals.keysToLabels = function (schema, keys) {

    const children = schema._inner.children;

    if (!children) {
        return keys;
    }

    const findLabel = function (key) {

        const matchingChild = children.find((child) => child.key === key);
        return matchingChild ? matchingChild.schema._getLabel(key) : key;
    };

    if (is.array(keys)) {
        return keys.map(findLabel);
    }

    return findLabel(keys);
};


internals.with = function (value, peers, parent, state, options) {

    if (is.undefined(value)) {
        return value;
    }

    for (let i = 0; i < peers.length; ++i) {
        const peer = peers[i];
        if (!Object.prototype.hasOwnProperty.call(parent, peer) ||
            is.undefined(parent[peer])) {

            return this.createError("object.with", {
                main: state.key,
                mainWithLabel: internals.keysToLabels(this, state.key),
                peer,
                peerWithLabel: internals.keysToLabels(this, peer)
            }, state, options);
        }
    }

    return value;
};


internals.without = function (value, peers, parent, state, options) {

    if (is.undefined(value)) {
        return value;
    }

    for (let i = 0; i < peers.length; ++i) {
        const peer = peers[i];
        if (Object.prototype.hasOwnProperty.call(parent, peer) &&
            !is.undefined(parent[peer])) {

            return this.createError("object.without", {
                main: state.key,
                mainWithLabel: internals.keysToLabels(this, state.key),
                peer,
                peerWithLabel: internals.keysToLabels(this, peer)
            }, state, options);
        }
    }

    return value;
};


internals.xor = function (value, peers, parent, state, options) {

    const present = [];
    for (let i = 0; i < peers.length; ++i) {
        const peer = peers[i];
        if (Object.prototype.hasOwnProperty.call(parent, peer) &&
            !is.undefined(parent[peer])) {

            present.push(peer);
        }
    }

    if (present.length === 1) {
        return value;
    }

    const context = { peers, peersWithLabels: internals.keysToLabels(this, peers) };

    if (present.length === 0) {
        return this.createError("object.missing", context, state, options);
    }

    return this.createError("object.xor", context, state, options);
};


internals.or = function (value, peers, parent, state, options) {

    for (let i = 0; i < peers.length; ++i) {
        const peer = peers[i];
        if (Object.prototype.hasOwnProperty.call(parent, peer) &&
            !is.undefined(parent[peer])) {
            return value;
        }
    }

    return this.createError("object.missing", {
        peers,
        peersWithLabels: internals.keysToLabels(this, peers)
    }, state, options);
};


internals.and = function (value, peers, parent, state, options) {

    const missing = [];
    const present = [];
    const count = peers.length;
    for (let i = 0; i < count; ++i) {
        const peer = peers[i];
        if (!Object.prototype.hasOwnProperty.call(parent, peer) ||
            is.undefined(parent[peer])) {

            missing.push(peer);
        } else {
            present.push(peer);
        }
    }

    const aon = (missing.length === count || present.length === count);

    if (!aon) {

        return this.createError("object.and", {
            present,
            presentWithLabels: internals.keysToLabels(this, present),
            missing,
            missingWithLabels: internals.keysToLabels(this, missing)
        }, state, options);
    }
};


internals.nand = function (value, peers, parent, state, options) {

    const present = [];
    for (let i = 0; i < peers.length; ++i) {
        const peer = peers[i];
        if (Object.prototype.hasOwnProperty.call(parent, peer) &&
            !is.undefined(parent[peer])) {

            present.push(peer);
        }
    }

    const values = clone(peers);
    const main = values.splice(0, 1)[0];
    const allPresent = (present.length === peers.length);
    return allPresent ? this.createError("object.nand", {
        main,
        mainWithLabel: internals.keysToLabels(this, main),
        peers: values,
        peersWithLabels: internals.keysToLabels(this, values)
    }, state, options) : null;
};


module.exports = new internals.Object();
