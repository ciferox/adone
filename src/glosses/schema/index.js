const { is, x, lazify } = adone;

const JSONSchema = lazify({
    x: "./x",
    $dataMetaSchema: "./data_metaschema",
    traverse: "./traverse"
}, exports, require);

export const __ = lazify({
    compileSchema: "./__/compile",
    resolve: "./__/resolve",
    SchemaObject: "./__/schema_obj",
    formats: "./__/formats",
    ruleModules: "./__/rule_modules",
    rules: "./__/rules",
    util: "./__/util",
    customRuleCode: "./__/dot/custom"
}, null, require);

export const refs = lazify({
    $data: "./refs/$data",
    "json-schema-draft-04": "./refs/json-schema-draft-04",
    "json-schema-draft-06": "./refs/json-schema-draft-06",
    "json-schema-v5": "./refs/json-schema-v5"
}, null, require);

const META_SCHEMA_ID = "http://json-schema.org/draft-06/schema";

const META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
const META_SUPPORT_DATA = ["/properties"];

const defaultSerializer = (data) => adone.data.json.encode(data, { stable: true }).toString("utf8");

const IDENTIFIER = /^[a-z_$][a-z0-9_$\-]*$/i;

const defaultMeta = (self) => {
    const meta = self._opts.meta;
    self._opts.defaultMeta = is.object(meta)
        ? self._getId(meta) || meta
        : self.getSchema(META_SCHEMA_ID)
            ? META_SCHEMA_ID
            : undefined;
    return self._opts.defaultMeta;
};

const _getSchemaFragment = (self, ref) => {
    const res = __.resolve.schema.call(self, { schema: {} }, ref);
    if (res) {
        const schema = res.schema;
        const root = res.root;
        const baseId = res.baseId;
        const validate = __.compileSchema.call(self, schema, root, undefined, baseId);
        self._fragments[ref] = new __.SchemaObject({
            ref,
            fragment: true,
            schema,
            root,
            baseId,
            validate
        });
        return validate;
    }
};

const _getSchemaObj = (self, keyRef) => {
    keyRef = __.resolve.normalizeId(keyRef);
    return self._schemas[keyRef] || self._refs[keyRef] || self._fragments[keyRef];
};

const _removeAllSchemas = (self, schemas, regex) => {
    for (const keyRef in schemas) {
        const schemaObj = schemas[keyRef];
        if (!schemaObj.meta && (!regex || regex.test(keyRef))) {
            self._cache.delete(schemaObj.cacheKey);
            delete schemas[keyRef];
        }
    }
};

const _getId = (schema) => {
    if (schema.$id) {
        adone.warn("schema $id ignored", schema.$id);
    }
    return schema.id;
};


const _get$Id = (schema) => {
    if (schema.id) {
        adone.warn("schema id ignored", schema.id);
    }
    return schema.$id;
};


const _get$IdOrId = (schema) => {
    if (schema.$id && schema.id && schema.$id !== schema.id) {
        throw new Error("schema $id is different from id");
    }
    return schema.$id || schema.id;
};

const chooseGetId = (opts) => {
    switch (opts.schemaId) {
        case "$id": {
            return _get$Id;
        }
        case "id": {
            return _getId;
        }
        default: {
            return _get$IdOrId;
        }
    }
};

const addDraft6MetaSchema = (self) => {
    let $dataSchema;
    if (self._opts.$data) {
        $dataSchema = refs.$data;
        self.addMetaSchema($dataSchema, $dataSchema.$id, true);
    }
    if (self._opts.meta === false) {
        return;
    }
    let metaSchema = refs["json-schema-draft-06"];
    if (self._opts.$data) {
        metaSchema = JSONSchema.$dataMetaSchema(metaSchema, META_SUPPORT_DATA);
    }
    self.addMetaSchema(metaSchema, META_SCHEMA_ID, true);
    self._refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
};

const addInitialSchemas = (self) => {
    const optsSchemas = self._opts.schemas;
    if (!optsSchemas) {
        return;
    }
    if (is.array(optsSchemas)) {
        self.addSchema(optsSchemas);
    } else {
        for (const key in optsSchemas) {
            self.addSchema(optsSchemas[key], key);
        }
    }
};


const addInitialFormats = (self) => {
    for (const name in self._opts.formats) {
        const format = self._opts.formats[name];
        self.addFormat(name, format);
    }
};


const checkUnique = (self, id) => {
    if (self._schemas[id] || self._refs[id]) {
        throw new x.Exists(`schema with key or id "${id}" already exists`);
    }
};


const getMetaSchemaOptions = (self) => {
    const metaOpts = adone.util.clone(self._opts);
    for (let i = 0; i < META_IGNORE_OPTIONS.length; i++) {
        delete metaOpts[META_IGNORE_OPTIONS[i]];
    }
    return metaOpts;
};

const patternGroups = (self) => {
    const defaultMeta = self._opts.defaultMeta;
    const metaSchemaRef = is.string(defaultMeta) === "string"
        ? { $ref: defaultMeta }
        : self.getSchema(META_SCHEMA_ID)
            ? { $ref: META_SCHEMA_ID }
            : {};

    self.addKeyword("patternGroups", {
        // implemented in properties.jst
        metaSchema: {
            type: "object",
            additionalProperties: {
                type: "object",
                required: ["schema"],
                properties: {
                    maximum: {
                        type: "integer",
                        minimum: 0
                    },
                    minimum: {
                        type: "integer",
                        minimum: 0
                    },
                    schema: metaSchemaRef
                },
                additionalProperties: false
            }
        }
    });
    self.RULES.all.properties.implements.push("patternGroups");
};

export class Validator {
    constructor(opts) {
        opts = this._opts = adone.util.clone(opts) || {};
        this._schemas = {};
        this._refs = {};
        this._fragments = {};
        this._formats = __.formats(opts.format);
        const schemaUriFormat = this._schemaUriFormat = this._formats["uri-reference"];
        this._schemaUriFormatFunc = (str) => schemaUriFormat.test(str);
        this._cache = opts.cache || new Map();
        this._loadingSchemas = {};
        this._compilations = [];
        this.RULES = __.rules();
        this._getId = chooseGetId(opts);

        opts.loopRequired = opts.loopRequired || Infinity;
        if (opts.errorDataPath === "property") {
            opts._errorDataPathProperty = true;
        }
        if (is.undefined(opts.serialize)) {
            opts.serialize = defaultSerializer;
        }
        this._metaOpts = getMetaSchemaOptions(this);

        if (opts.formats) {
            addInitialFormats(this);
        }
        addDraft6MetaSchema(this);
        if (is.object(opts.meta)) {
            this.addMetaSchema(opts.meta);
        }
        addInitialSchemas(this);
        if (opts.patternGroups) {
            patternGroups(this);
        }
    }

    validate(schemaKeyRef, data) {
        let v;
        if (is.string(schemaKeyRef)) {
            v = this.getSchema(schemaKeyRef);
            if (!v) {
                throw new x.Unknown(`no schema with key or ref "${schemaKeyRef}"`);
            }
        } else {
            const schemaObj = this._addSchema(schemaKeyRef);
            v = schemaObj.validate || this._compile(schemaObj);
        }

        const valid = v(data);
        if (v.$async === true) {
            return valid;
        }
        this.errors = v.errors;
        return valid;
    }

    compile(schema, _meta) {
        const schemaObj = this._addSchema(schema, undefined, _meta);
        return schemaObj.validate || this._compile(schemaObj);
    }

    addSchema(schema, key, _skipValidation, _meta) {
        if (is.array(schema)) {
            for (const s of schema) {
                this.addSchema(s, undefined, _skipValidation, _meta);
            }
            return;
        }
        const id = this._getId(schema);
        if (!is.undefined(id) && !is.string(id)) {
            throw new x.InvalidArgument("schema id must be string");
        }
        key = __.resolve.normalizeId(key || id);
        checkUnique(this, key);
        this._schemas[key] = this._addSchema(schema, _skipValidation, _meta, true);
    }

    addMetaSchema(schema, key, skipValidation) {
        this.addSchema(schema, key, skipValidation, true);
    }

    validateSchema(schema, throwOrLogError) {
        let $schema = schema.$schema;
        if (!is.undefined($schema) && !is.string($schema)) {
            throw new Error("$schema must be a string");
        }
        $schema = $schema || this._opts.defaultMeta || defaultMeta(this);
        if (!$schema) {
            console.warn("meta-schema not available");
            this.errors = null;
            return true;
        }
        const currentUriFormat = this._formats.uri;
        this._formats.uri = is.function(currentUriFormat)
            ? this._schemaUriFormatFunc
            : this._schemaUriFormat;
        let valid;
        try {
            valid = this.validate($schema, schema);
        } finally {
            this._formats.uri = currentUriFormat;
        }
        if (!valid && throwOrLogError) {
            const message = `schema is invalid: ${this.errorsText()}`;
            if (this._opts.validateSchema === "log") {
                adone.error(message);
            } else {
                throw new x.Exception(message);
            }
        }
        return valid;
    }

    getSchema(keyRef) {
        const schemaObj = _getSchemaObj(this, keyRef);
        switch (typeof schemaObj) {
            case "object": {
                return schemaObj.validate || this._compile(schemaObj);
            }
            case "string": {
                return this.getSchema(schemaObj);
            }
            case "undefined": {
                return _getSchemaFragment(this, keyRef);
            }
        }
    }

    removeSchema(schemaKeyRef) {
        if (schemaKeyRef instanceof RegExp) {
            _removeAllSchemas(this, this._schemas, schemaKeyRef);
            _removeAllSchemas(this, this._refs, schemaKeyRef);
            return;
        }
        switch (typeof schemaKeyRef) {
            case "undefined": {
                _removeAllSchemas(this, this._schemas);
                _removeAllSchemas(this, this._refs);
                this._cache.clear();
                return;
            }
            case "string": {
                const schemaObj = _getSchemaObj(this, schemaKeyRef);
                if (schemaObj) {
                    this._cache.delete(schemaObj.cacheKey);
                }
                delete this._schemas[schemaKeyRef];
                delete this._refs[schemaKeyRef];
                return;
            }
            case "object": {
                const serialize = this._opts.serialize;
                const cacheKey = serialize ? serialize(schemaKeyRef) : schemaKeyRef;
                this._cache.delete(cacheKey);
                let id = this._getId(schemaKeyRef);
                if (id) {
                    id = __.resolve.normalizeId(id);
                    delete this._schemas[id];
                    delete this._refs[id];
                }
            }
        }
    }

    addFormat(name, format) {
        if (is.string(format)) {
            format = new RegExp(format);
        }
        this._formats[name] = format;
    }

    errorsText(errors, options) {
        errors = errors || this.errors;
        if (!errors) {
            return "No errors";
        }
        options = options || {};
        const separator = is.undefined(options.separator) ? ", " : options.separator;
        const dataVar = is.undefined(options.dataVar) ? "data" : options.dataVar;

        let text = "";
        for (const e of errors) {
            if (e) {
                text += `${dataVar + e.dataPath} ${e.message}${separator}`;
            }
        }
        return text.slice(0, -separator.length);
    }

    _addSchema(schema, skipValidation, meta, shouldAddSchema) {
        if (!is.object(schema) && !is.boolean(schema)) {
            throw new x.InvalidArgument("schema should be object or boolean");
        }
        const serialize = this._opts.serialize;
        const cacheKey = serialize ? serialize(schema) : schema;
        const cached = this._cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        shouldAddSchema = shouldAddSchema || this._opts.addUsedSchema !== false;

        const id = __.resolve.normalizeId(this._getId(schema));
        if (id && shouldAddSchema) {
            checkUnique(this, id);
        }

        const willValidate = this._opts.validateSchema !== false && !skipValidation;
        let recursiveMeta;
        if (willValidate && !(recursiveMeta = id && id === __.resolve.normalizeId(schema.$schema))) {
            this.validateSchema(schema, true);
        }

        const localRefs = __.resolve.ids.call(this, schema);

        const schemaObj = new __.SchemaObject({
            id,
            schema,
            localRefs,
            cacheKey,
            meta
        });

        if (id[0] !== "#" && shouldAddSchema) {
            this._refs[id] = schemaObj;
        }
        this._cache.set(cacheKey, schemaObj);

        if (willValidate && recursiveMeta) {
            this.validateSchema(schema, true);
        }

        return schemaObj;
    }

    _compile(schemaObj, root) {
        const callValidate = (...args) => {
            const _validate = schemaObj.validate;
            const result = _validate.apply(null, args);
            callValidate.errors = _validate.errors;
            return result;
        };

        if (schemaObj.compiling) {
            schemaObj.validate = callValidate;
            callValidate.schema = schemaObj.schema;
            callValidate.errors = null;
            callValidate.root = root ? root : callValidate;
            if (schemaObj.schema.$async === true) {
                callValidate.$async = true;
            }
            return callValidate;
        }
        schemaObj.compiling = true;

        let currentOpts;
        if (schemaObj.meta) {
            currentOpts = this._opts;
            this._opts = this._metaOpts;
        }

        let v;
        try {
            v = __.compileSchema.call(this, schemaObj.schema, root, schemaObj.localRefs);
        } finally {
            schemaObj.compiling = false;
            if (schemaObj.meta) {
                this._opts = currentOpts;
            }
        }

        schemaObj.validate = v;
        schemaObj.refs = v.refs;
        schemaObj.refVal = v.refVal;
        schemaObj.root = v.root;
        return v;
    }

    addKeyword(keyword, definition) {
        const RULES = this.RULES;

        if (RULES.keywords[keyword]) {
            throw new x.IllegalState(`Keyword ${keyword} is already defined`);
        }

        if (!IDENTIFIER.test(keyword)) {
            throw new x.InvalidArgument(`Keyword ${keyword} is not a valid identifier`);
        }

        if (definition) {
            if (definition.macro && !is.undefined(definition.valid)) {
                throw new x.IllegalState('"valid" option cannot be used with macro keywords');
            }

            const _addRule = (keyword, dataType, definition) => {
                let ruleGroup;
                for (const rg of RULES) {
                    if (rg.type === dataType) {
                        ruleGroup = rg;
                        break;
                    }
                }

                if (!ruleGroup) {
                    ruleGroup = { type: dataType, rules: [] };
                    RULES.push(ruleGroup);
                }

                const rule = {
                    keyword,
                    definition,
                    custom: true,
                    code: __.customRuleCode,
                    implements: definition.implements
                };
                ruleGroup.rules.push(rule);
                RULES.custom[keyword] = rule;
            };

            const checkDataType = (dataType) => {
                if (!RULES.types[dataType]) {
                    throw new x.Unknown(`Unknown type ${dataType}`);
                }
            };

            const dataType = definition.type;
            if (is.array(dataType)) {
                for (const type of dataType) {
                    checkDataType(type);
                }
                for (const type of dataType) {
                    _addRule(keyword, type, definition);
                }
            } else {
                if (dataType) {
                    checkDataType(dataType);
                }
                _addRule(keyword, dataType, definition);
            }

            const $data = definition.$data === true && this._opts.$data;
            if ($data && !definition.validate) {
                throw new x.IllegalState('$data support: "validate" function is not defined');
            }

            let metaSchema = definition.metaSchema;
            if (metaSchema) {
                if ($data) {
                    metaSchema = {
                        anyOf: [
                            metaSchema,
                            { $ref: "https://raw.githubusercontent.com/epoberezkin/ajv/master/lib/refs/$data.json#" }
                        ]
                    };
                }
                definition.validateSchema = this.compile(metaSchema, true);
            }
        }

        RULES.keywords[keyword] = RULES.all[keyword] = true;
    }

    getKeyword(keyword) {
        /* jshint validthis: true */
        const rule = this.RULES.custom[keyword];
        return rule ? rule.definition : this.RULES.keywords[keyword] || false;
    }

    removeKeyword(keyword) {
        /* jshint validthis: true */
        const RULES = this.RULES;
        delete RULES.keywords[keyword];
        delete RULES.all[keyword];
        delete RULES.custom[keyword];
        for (const rg of RULES) {
            const { rules } = rg;
            for (let j = 0; j < rules.length; j++) {
                if (rules[j].keyword === keyword) {
                    rules.splice(j, 1);
                    break;
                }
            }
        }
    }

    compileAsync(schema, meta, callback) {
        if (!is.function(this._opts.loadSchema)) {
            throw new x.InvalidArgument("options.loadSchema should be a function");
        }

        if (is.function(meta)) {
            [callback, meta] = [meta, undefined];
        }

        const loadMetaSchemaOf = (sch) => {
            const $schema = sch.$schema;
            return $schema && !this.getSchema($schema)
                ? this.compileAsync({ $ref: $schema }, true)
                : Promise.resolve();
        };


        const _compileAsync = (schemaObj) => {
            try {
                return this._compile(schemaObj);
            } catch (e) {
                if (e instanceof JSONSchema.x.MissingRef) {
                    const ref = e.missingSchema;
                    const added = (ref) => this._refs[ref] || this._schemas[ref];
                    if (added(ref)) {
                        throw new Error(`Schema ${ref} is loaded but ${e.missingRef} cannot be resolved`);
                    }

                    let schemaPromise = this._loadingSchemas[ref];
                    if (!schemaPromise) {
                        schemaPromise = this._loadingSchemas[ref] = this._opts.loadSchema(ref);
                        const removePromise = () => {
                            delete this._loadingSchemas[ref];
                        };
                        schemaPromise.then(removePromise, removePromise);
                    }

                    return schemaPromise.then((sch) => {
                        if (!added(ref)) {
                            return loadMetaSchemaOf(sch).then(() => {
                                if (!added(ref)) {
                                    this.addSchema(sch, ref, undefined, meta);
                                }
                            });
                        }
                    }).then(() => {
                        return _compileAsync(schemaObj);
                    });
                }
                throw e;
            }
        };

        const p = loadMetaSchemaOf(schema).then(() => {
            const schemaObj = this._addSchema(schema, undefined, meta);
            return schemaObj.validate || _compileAsync(schemaObj);
        });

        if (callback) {
            p.then((v) => callback(null, v), callback);
        }

        return p;
    }
}
