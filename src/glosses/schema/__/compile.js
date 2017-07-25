const {
    is, x,
    schema: { __, x: schemaX }
} = adone;


const compIndex = function (schema, root, baseId) {
    /* jshint validthis: true */
    for (let i = 0; i < this._compilations.length; i++) {
        const c = this._compilations[i];
        if (c.schema === schema && c.root === root && c.baseId === baseId) {
            return i;
        }
    }
    return -1;
};


const checkCompiling = function (schema, root, baseId) {
    let index = compIndex.call(this, schema, root, baseId);
    if (index >= 0) {
        return { index, compiling: true };
    }
    index = this._compilations.length;
    this._compilations[index] = {
        schema,
        root,
        baseId
    };
    return { index, compiling: false };
};

const endCompiling = function (schema, root, baseId) {
    /* jshint validthis: true */
    const i = compIndex.call(this, schema, root, baseId);
    if (i >= 0) {
        this._compilations.splice(i, 1);
    }
};


const patternCode = (i, patterns) => `var pattern${i} = new RegExp(${__.util.toQuotedString(patterns[i])});`;

const defaultCode = (i) => `var default${i} = defaults[${i}];`;

const refValCode = (i, refVal) => is.undefined(refVal[i]) ? "" : `var refVal${i} = refVal[${i}];`;

const customRuleCode = (i) => `var customRule${i} = customRules[${i}];`;

const vars = (arr, statement) => {
    if (!arr.length) {
        return "";
    }
    let code = "";
    for (let i = 0; i < arr.length; i++) {
        code += statement(i, arr);
    }
    return code;
};

export default function compile(schema, root, localRefs, baseId) {
    const opts = this._opts;
    const refVal = [undefined];
    const refs = {};
    const patterns = [];
    const patternsHash = {};
    const defaults = [];
    const defaultsHash = {};
    const customRules = [];

    root = root || { schema, refVal, refs };

    const c = checkCompiling.call(this, schema, root, baseId);
    const compilation = this._compilations[c.index];
    if (c.compiling) {
        return compilation.callValidate = function callValidate(...args) {
            const validate = compilation.validate;
            const result = validate.apply(null, args);
            callValidate.errors = validate.errors;
            return result;
        };
    }

    const { _formats: formats, RULES } = this;

    const addLocalRef = (ref, v) => {
        const refId = refVal.length;
        refVal[refId] = v;
        refs[ref] = refId;
        return `refVal${refId}`;
    };

    const replaceLocalRef = (ref, v) => {
        const refId = refs[ref];
        refVal[refId] = v;
    };

    const resolvedRef = (refVal, code) => {
        return (is.object(refVal) && !is.function(refVal)) || is.boolean(refVal)
            ? { code, schema: refVal, inline: true }
            : { code, $async: refVal && refVal.$async };
    };

    const removeLocalRef = (ref) => {
        delete refs[ref];
    };

    const resolveRef = (baseId, ref, isRoot) => {
        ref = __.resolve.url(baseId, ref);
        const refIndex = refs[ref];
        let _refVal;
        let refCode;
        if (!is.undefined(refIndex)) {
            _refVal = refVal[refIndex];
            refCode = `refVal[${refIndex}]`;
            return resolvedRef(_refVal, refCode);
        }
        if (!isRoot && root.refs) {
            const rootRefId = root.refs[ref];
            if (!is.undefined(rootRefId)) {
                _refVal = root.refVal[rootRefId];
                refCode = addLocalRef(ref, _refVal);
                return resolvedRef(_refVal, refCode);
            }
        }

        refCode = addLocalRef(ref);
        // eslint-disable-next-line no-use-before-define
        let v = __.resolve.call(this, localCompile, root, ref);
        if (is.undefined(v)) {
            const localSchema = localRefs && localRefs[ref];
            if (localSchema) {
                v = __.resolve.inlineRef(localSchema, opts.inlineRefs)
                    ? localSchema
                    : compile.call(this, localSchema, root, localRefs, baseId);
            }
        }

        if (is.undefined(v)) {

            removeLocalRef(ref);
        } else {
            replaceLocalRef(ref, v);
            return resolvedRef(v, refCode);
        }
    };

    const usePattern = (regexStr) => {
        let index = patternsHash[regexStr];
        if (is.undefined(index)) {
            index = patternsHash[regexStr] = patterns.length;
            patterns[index] = regexStr;
        }
        return `pattern${index}`;
    };

    const useDefault = (value) => {
        switch (typeof value) {
            case "boolean":
            case "number":
                return `${value}`;
            case "string":
                return __.util.toQuotedString(value);
            case "object": {
                if (is.null(value)) {
                    return "null";
                }
                const valueStr = adone.data.json.encodeStable(value).toString();
                let index = defaultsHash[valueStr];
                if (is.undefined(index)) {
                    index = defaultsHash[valueStr] = defaults.length;
                    defaults[index] = value;
                }
                return `default${index}`;
            }
        }
    };

    const useCustomRule = (rule, schema, parentSchema, it) => {
        const validateSchema = rule.definition.validateSchema;
        if (validateSchema && this._opts.validateSchema !== false) {
            const valid = validateSchema(schema);
            if (!valid) {
                const message = `keyword schema is invalid: ${this.errorsText(validateSchema.errors)}`;
                if (this._opts.validateSchema === "log") {
                    console.error(message);
                } else {
                    throw new Error(message);
                }
            }
        }

        const { definition: { compile, inline, macro } } = rule;

        let validate;
        if (compile) {
            validate = compile.call(this, schema, parentSchema, it);
        } else if (macro) {
            validate = macro.call(this, schema, parentSchema, it);
            if (opts.validateSchema !== false) {
                this.validateSchema(validate, true);
            }
        } else if (inline) {
            validate = inline.call(this, it, rule.keyword, schema, parentSchema);
        } else {
            validate = rule.definition.validate;
            if (!validate) {
                return;
            }
        }

        if (is.undefined(validate)) {
            throw new x.Exception(`custom keyword "${rule.keyword}"failed to compile`);
        }

        const index = customRules.length;
        customRules[index] = validate;

        return {
            code: `customRule${index}`,
            validate
        };
    };

    const localCompile = (_schema, _root, localRefs, baseId) => {
        const isRoot = !_root || (_root && _root.schema === _schema);
        if (_root.schema !== root.schema) {
            return compile.call(this, _schema, _root, localRefs, baseId);
        }

        const $async = _schema.$async === true;

        let sourceCode = __.ruleModules.validate({
            isTop: true,
            schema: _schema,
            isRoot,
            baseId,
            root: _root,
            schemaPath: "",
            errSchemaPath: "#",
            errorPath: '""',
            MissingRefError: schemaX.MissingRef,
            RULES,
            validate: __.ruleModules.validate,
            util: __.util,
            resolve: __.resolve,
            resolveRef,
            usePattern,
            useDefault,
            useCustomRule,
            opts,
            formats,
            self: this
        });

        sourceCode = vars(refVal, refValCode) + vars(patterns, patternCode)
            + vars(defaults, defaultCode) + vars(customRules, customRuleCode)
            + sourceCode;

        if (opts.processCode) {
            sourceCode = opts.processCode(sourceCode);
        }
        // console.log('\n\n\n *** \n', JSON.stringify(sourceCode));
        let validate;
        try {
            const makeValidate = adone.std.vm.runInThisContext(
                `(self, RULES, formats, root, refVal, defaults, customRules, equal, ucs2length, ValidationError) => {
                    ${sourceCode}
                }`
            );

            validate = makeValidate(
                this,
                RULES,
                formats,
                root,
                refVal,
                defaults,
                customRules,
                adone.is.deepEqual,
                __.util.ucs2length,
                schemaX.Validation
            );

            refVal[0] = validate;
        } catch (e) {
            adone.error("Error compiling schema, function code:", sourceCode);
            throw e;
        }

        validate.schema = _schema;
        validate.errors = null;
        validate.refs = refs;
        validate.refVal = refVal;
        validate.root = isRoot ? validate : _root;
        if ($async) {
            validate.$async = true;
        }
        if (opts.sourceCode === true) {
            validate.source = {
                code: sourceCode,
                patterns,
                defaults
            };
        }

        return validate;
    };

    try {
        const v = localCompile(schema, root, localRefs, baseId);
        compilation.validate = v;
        const cv = compilation.callValidate;
        if (cv) {
            cv.schema = v.schema;
            cv.errors = null;
            cv.refs = v.refs;
            cv.refVal = v.refVal;
            cv.root = v.root;
            cv.$async = v.$async;
            if (opts.sourceCode) {
                cv.source = v.source;
            }
        }
        return v;
    } finally {
        endCompiling.call(this, schema, root, baseId);
    }
}
