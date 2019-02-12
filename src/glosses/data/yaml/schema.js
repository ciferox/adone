const {
    lazify,
    error,
    util,
    data: { yaml }
} = adone;

const compileList = (schema, name, result) => {
    const exclude = [];

    for (const includedSchema of schema.include) {
        result = compileList(includedSchema, name, result);
    }

    for (const currentType of schema[name]) {
        for (const [previousIndex, previousType] of util.enumerate(result)) {
            if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) {
                exclude.push(previousIndex);
            }
        }
        result.push(currentType);
    }

    return result.filter((type, index) => !exclude.includes(index));
};

export class Schema {
    constructor({ include = [], implicit = [], explicit = [] } = {}) {
        this.include = include;
        this.implicit = implicit;
        this.explicit = explicit;

        for (const type of this.implicit) {
            if (type.loadKind && type.loadKind !== "scalar") {
                throw new error.InvalidArgumentException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
            }
        }

        this.compiledImplicit = compileList(this, "implicit", []);
        this.compiledExplicit = compileList(this, "explicit", []);

        this.compiledTypeMap = { scalar: {}, sequence: {}, mapping: {}, fallback: {} };
        for (const type of this.compiledImplicit) {
            this.compiledTypeMap[type.kind][type.tag] = type;
            this.compiledTypeMap.fallback[type.tag] = type;
        }
        for (const type of this.compiledExplicit) {
            this.compiledTypeMap[type.kind][type.tag] = type;
            this.compiledTypeMap.fallback[type.tag] = type;
        }
    }
}

const schema = lazify({
    // Standard YAML's Core schema.
    // http://www.yaml.org/spec/1.2/spec.html#id2804923
    //
    // NOTE: JS-YAML does not support schema-specific tag resolution restrictions.
    // So, Core schema has no distinctions from JSON schema is JS-YAML.
    CORE: () => new Schema({
        include: [
            schema.JSON
        ]
    }),
    // JS-YAML's default schema for `load` function.
    // It is not described in the YAML specification.
    //
    // This schema is based on JS-YAML's default safe schema and includes
    // JavaScript-specific types: !!js/undefined, !!js/regexp and !!js/function.
    //
    // Also this schema is used as default base schema at `Schema.create` function.
    DEFAULT_FULL: () => new Schema({
        include: [
            schema.DEFAULT_SAFE
        ],
        explicit: [
            yaml.type.js.Undefined,
            yaml.type.js.RegExp,
            yaml.type.js.Function
        ]
    }),
    // JS-YAML's default schema for `safeLoad` function.
    // It is not described in the YAML specification.
    //
    // This schema is based on standard YAML's Core schema and includes most of
    // extra types described at YAML tag repository. (http://yaml.org/type/)
    DEFAULT_SAFE: () => new Schema({
        include: [
            schema.CORE
        ],
        implicit: [
            yaml.type.Timestamp,
            yaml.type.Merge
        ],
        explicit: [
            yaml.type.Binary,
            yaml.type.Omap,
            yaml.type.Pairs,
            yaml.type.Set
        ]
    }),
    // Standard YAML's Failsafe schema.
    // http://www.yaml.org/spec/1.2/spec.html#id2802346
    FAILSAFE: () => new Schema({
        explicit: [
            yaml.type.Str,
            yaml.type.Seq,
            yaml.type.Map
        ]
    }),
    // Standard YAML's JSON schema.
    // http://www.yaml.org/spec/1.2/spec.html#id2803231
    //
    // NOTE: JS-YAML does not support schema-specific tag resolution restrictions.
    // So, this schema is not such strict as defined in the YAML specification.
    // It allows numbers in binary notaion, use `Null` and `NULL` as `null`, etc.
    JSON: () => new Schema({
        include: [
            schema.FAILSAFE
        ],
        implicit: [
            yaml.type.Null,
            yaml.type.Bool,
            yaml.type.Int,
            yaml.type.Float
        ]
    })
}, exports, require);

export const create = function (schemas = adone.null, types = adone.null) {
    if (schemas === adone.null && types === adone.null) {
        throw new error.InvalidArgumentException("Wrong number of arguments for schema.create function");
    }

    if (types === adone.null) {
        [schemas, types] = [schema.DEFAULT_FULL, schemas];
    }

    schemas = util.arrify(schemas);
    types = util.arrify(types);

    if (!schemas.every((schema) => schema instanceof Schema)) {
        throw new error.InvalidArgumentException("Specified list of super schemas (or a single Schema object) contains a non-Schema object.");
    }

    if (!types.every((type) => type instanceof yaml.type.Type)) {
        throw new error.InvalidArgumentException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }

    return new Schema({ include: schemas, explicit: types });
};
