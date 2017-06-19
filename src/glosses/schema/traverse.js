const { is } = adone;

const escapeJsonPtr = (str) => str.replace(/~/g, "~0").replace(/\//g, "~1");

const _traverse = (opts, cb, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) => {
    if (schema && is.object(schema) && !is.array(schema)) {
        cb(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        for (const key in schema) {
            const sch = schema[key];
            if (is.array(sch)) {
                if (key in traverse.arrayKeywords) {
                    for (let i = 0; i < sch.length; i++) {
                        _traverse(opts, cb, sch[i], `${jsonPtr}/${key}/${i}`, rootSchema, jsonPtr, key, schema, i);
                    }
                }
            } else if (key in traverse.propsKeywords) {
                if (sch && is.object(sch)) {
                    for (const prop in sch) {
                        _traverse(opts, cb, sch[prop], `${jsonPtr}/${key}/${escapeJsonPtr(prop)}`, rootSchema, jsonPtr, key, schema, prop);
                    }
                }
            } else if (key in traverse.keywords || (opts.allKeys && !(key in traverse.skipKeywords))) {
                _traverse(opts, cb, sch, `${jsonPtr}/${key}`, rootSchema, jsonPtr, key, schema);
            }
        }
    }
};

export default function traverse(schema, opts, cb) {
    if (is.function(opts)) {
        [cb, opts] = [opts, {}];
    }
    _traverse(opts, cb, schema, "", schema);
}

traverse.keywords = {
    additionalItems: true,
    items: true,
    contains: true,
    additionalProperties: true,
    propertyNames: true,
    not: true
};

traverse.arrayKeywords = {
    items: true,
    allOf: true,
    anyOf: true,
    oneOf: true
};

traverse.propsKeywords = {
    definitions: true,
    properties: true,
    patternProperties: true,
    dependencies: true
};

traverse.skipKeywords = {
    enum: true,
    const: true,
    required: true,
    maximum: true,
    minimum: true,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    multipleOf: true,
    maxLength: true,
    minLength: true,
    pattern: true,
    format: true,
    maxItems: true,
    minItems: true,
    uniqueItems: true,
    maxProperties: true,
    minProperties: true
};
