const { is, x, std: { url }, schema: { __: { util, SchemaObject } } } = adone;

const _getFullPath = (p) => {
    const protocolSeparator = p.protocol || p.href.startsWith("//") ? "//" : "";
    return `${(p.protocol || "") + protocolSeparator + (p.host || "") + (p.path || "")}#`;
};

const checkNoRef = (schema) => {
    if (is.array(schema)) {
        for (const item of schema) {
            if (is.object(item) && !checkNoRef(item)) {
                return false;
            }
        }
    } else {
        for (const key in schema) {
            if (key === "$ref") {
                return false;
            }
            const item = schema[key];
            if (is.object(item) && !checkNoRef(item)) {
                return false;
            }
        }
    }
    return true;
};

const SIMPLE_INLINED = util.toHash([
    "type", "format", "pattern",
    "maxLength", "minLength",
    "maxProperties", "minProperties",
    "maxItems", "minItems",
    "maximum", "minimum",
    "uniqueItems", "multipleOf",
    "required", "enum"
]);

const countKeys = (schema) => {
    let count = 0;
    if (is.array(schema)) {
        for (const item of schema) {
            if (is.object(item)) {
                count += countKeys(item);
            }
            if (count === Infinity) {
                return Infinity;
            }
        }
    } else {
        for (const key in schema) {
            if (key === "$ref") {
                return Infinity;
            }
            if (SIMPLE_INLINED[key]) {
                count++;
            } else {
                const item = schema[key];
                if (is.object(item)) {
                    count += countKeys(item) + 1;
                }
                if (count === Infinity) {
                    return Infinity;
                }
            }
        }
    }
    return count;
};

const inlineRef = (schema, limit) => {
    if (limit === false) {
        return false;
    }
    if (is.undefined(limit) || limit === true) {
        return checkNoRef(schema);
    } else if (limit) {
        return countKeys(schema) <= limit;
    }
};

const TRAILING_SLASH_HASH = /#\/?$/;
const normalizeId = (id) => id ? id.replace(TRAILING_SLASH_HASH, "") : "";

const getFullPath = (id, normalize) => {
    if (normalize !== false) {
        id = normalizeId(id);
    }
    const p = url.parse(id, false, true);
    return _getFullPath(p);
};

const resolveUrl = (baseId, id) => {
    id = normalizeId(id);
    return url.resolve(baseId, id);
};

const PREVENT_SCOPE_CHANGE = util.toHash(["properties", "patternProperties", "enum", "dependencies", "definitions"]);
const getJsonPointer = function (parsedRef, baseId, schema, root) {
    parsedRef.hash = parsedRef.hash || "";
    if (!parsedRef.hash.startsWith("#/")) {
        return;
    }
    const parts = parsedRef.hash.split("/");

    for (let i = 1; i < parts.length; i++) {
        let part = parts[i];
        if (part) {
            part = util.unescapeFragment(part);
            schema = schema[part];
            if (is.undefined(schema)) {
                break;
            }
            if (!PREVENT_SCOPE_CHANGE[part]) {
                const id = this._getId(schema);
                if (id) {
                    baseId = resolveUrl(baseId, id);
                }
                if (schema.$ref) {
                    const $ref = resolveUrl(baseId, schema.$ref);
                    // eslint-disable-next-line no-use-before-define
                    const res = resolveSchema.call(this, root, $ref);
                    if (res) {
                        schema = res.schema;
                        root = res.root;
                        baseId = res.baseId;
                    }
                }
            }
        }
    }
    if (!is.undefined(schema) && schema !== root.schema) {
        return { schema, root, baseId };
    }
};

const resolveSchema = function (root, ref) {
    const p = url.parse(ref, false, true);
    const refPath = _getFullPath(p);
    let baseId = getFullPath(this._getId(root.schema));
    if (refPath !== baseId) {
        const id = normalizeId(refPath);
        let refVal = this._refs[id];
        if (is.string(refVal)) {
            // eslint-disable-next-line no-use-before-define
            return resolveRecursive.call(this, root, refVal, p);
        } else if (refVal instanceof SchemaObject) {
            if (!refVal.validate) {
                this._compile(refVal);
            }
            root = refVal;
        } else {
            refVal = this._schemas[id];
            if (refVal instanceof SchemaObject) {
                if (!refVal.validate) {
                    this._compile(refVal);
                }
                if (id === normalizeId(ref)) {
                    return { schema: refVal, root, baseId };
                }
                root = refVal;
            } else {
                return;
            }
        }
        if (!root.schema) {
            return;
        }
        baseId = getFullPath(this._getId(root.schema));
    }
    return getJsonPointer.call(this, p, baseId, root.schema, root);
};

const resolveRecursive = function (root, ref, parsedRef) {
    const res = resolveSchema.call(this, root, ref);
    if (res) {
        const { schema } = res;
        let { baseId } = res;
        ({ root } = res);
        const id = this._getId(schema);
        if (id) {
            baseId = resolveUrl(baseId, id);
        }
        return getJsonPointer.call(this, parsedRef, baseId, schema, root);
    }
};

const resolveIds = function (schema) {
    /* eslint no-shadow: 0 */
    /* jshint validthis: true */
    const id = normalizeId(this._getId(schema));
    const localRefs = {};

    const _resolveIds = (schema, fullPath, baseId) => {
        if (is.array(schema)) {
            for (let i = 0; i < schema.length; i++) {
                _resolveIds(schema[i], `${fullPath}/${i}`, baseId);
            }
        } else if (schema && is.object(schema)) {
            let id = this._getId(schema);
            if (is.string(id)) {
                id = baseId = normalizeId(baseId ? url.resolve(baseId, id) : id);

                let refVal = this._refs[id];
                if (is.string(refVal)) {
                    refVal = this._refs[refVal];
                }
                if (refVal && refVal.schema) {
                    if (!is.deepEqual(schema, refVal.schema)) {
                        throw new x.IllegalState(`id "${id}" resolves to more than one schema`);
                    }
                } else if (id !== normalizeId(fullPath)) {
                    if (id[0] === "#") {
                        if (localRefs[id] && !is.deepEqual(schema, localRefs[id])) {
                            throw new x.IllegalState(`id "${id}" resolves to more than one schema`);
                        }
                        localRefs[id] = schema;
                    } else {
                        this._refs[id] = fullPath;
                    }
                }
            }
            for (const key in schema) {
                _resolveIds(schema[key], `${fullPath}/${util.escapeFragment(key)}`, baseId);
            }
        }
    };

    _resolveIds(schema, getFullPath(id, false), id);
    return localRefs;
};

export default function resolve(compile, root, ref) {
    let refVal = this._refs[ref];
    if (is.string(refVal)) {
        if (this._refs[refVal]) {
            refVal = this._refs[refVal];
        } else {
            return resolve.call(this, compile, root, refVal);
        }
    }

    refVal = refVal || this._schemas[ref];
    if (refVal instanceof SchemaObject) {
        return inlineRef(refVal.schema, this._opts.inlineRefs)
            ? refVal.schema
            : refVal.validate || this._compile(refVal);
    }

    const res = resolveSchema.call(this, root, ref);
    let schema;
    let v;
    let baseId;
    if (res) {
        schema = res.schema;
        root = res.root;
        baseId = res.baseId;
    }

    if (schema instanceof SchemaObject) {
        v = schema.validate || compile.call(this, schema.schema, root, undefined, baseId);
    } else if (!is.undefined(schema)) {
        v = inlineRef(schema, this._opts.inlineRefs)
            ? schema
            : compile.call(this, schema, root, undefined, baseId);
    }

    return v;
}

resolve.normalizeId = normalizeId;
resolve.fullPath = getFullPath;
resolve.url = resolveUrl;
resolve.ids = resolveIds;
resolve.inlineRef = inlineRef;
resolve.schema = resolveSchema;
