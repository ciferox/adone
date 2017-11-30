import ArrayType from "./array";
const CastError = require("../error/cast");
const EventEmitter = require("events").EventEmitter;
const MongooseDocumentArray = require("../types/documentarray");
import SchemaType from "../schematype";
const Subdocument = require("../types/embedded");
const discriminator = require("../services/model/discriminator");
const util = require("util");
const utils = require("../utils");

const {
    is
} = adone;

const _createConstructor = function (schema, options) {
    // compile an embedded document for this schema
    class EmbeddedDocument extends Subdocument {
    }

    EmbeddedDocument.prototype.$__setSchema(schema);
    EmbeddedDocument.schema = schema;
    EmbeddedDocument.$isArraySubdocument = true;

    // apply methods
    for (const i in schema.methods) {
        EmbeddedDocument.prototype[i] = schema.methods[i];
    }

    // apply statics
    for (const i in schema.statics) {
        EmbeddedDocument[i] = schema.statics[i];
    }

    for (const i in EventEmitter.prototype) {
        EmbeddedDocument[i] = EventEmitter.prototype[i];
    }

    EmbeddedDocument.options = options;

    return EmbeddedDocument;
};

/*!
 * Scopes paths selected in a query to this array.
 * Necessary for proper default application of subdocument values.
 *
 * @param {DocumentArray} array - the array to scope `fields` paths
 * @param {Object|undefined} fields - the root fields selected in the query
 * @param {Boolean|undefined} init - if we are being created part of a query result
 */
const scopePaths = function (array, fields, init) {
    if (!(init && fields)) {
        return undefined;
    }

    const path = `${array.path}.`;
    const keys = Object.keys(fields);
    let i = keys.length;
    const selected = {};
    let hasKeys;
    let key;
    let sub;

    while (i--) {
        key = keys[i];
        if (key.indexOf(path) === 0) {
            sub = key.substring(path.length);
            if (sub === "$") {
                continue;
            }
            if (sub.indexOf("$.") === 0) {
                sub = sub.substr(2);
            }
            hasKeys || (hasKeys = true);
            selected[sub] = fields[key];
        }
    }

    return hasKeys && selected || undefined;
};

/**
 * SubdocsArray SchemaType constructor
 *
 * @param {String} key
 * @param {Schema} schema
 * @param {Object} options
 * @inherits SchemaArray
 * @api public
 */
export default class DocumentArray extends ArrayType {
    constructor(key, schema, options) {
        super(key, _createConstructor(schema, options), options);

        this.schema = schema;
        this.$isMongooseDocumentArray = true;
        const fn = this.defaultValue;

        if (!("defaultValue" in this) || fn !== void 0) {
            this.default(function () {
                // Leave it up to `cast()` to convert this to a documentarray
                return adone.util.arrify(fn.call(this));
            });
        }
    }

    discriminator(name, schema) {
        if (is.function(name)) {
            name = utils.getFunctionName(name);
        }

        schema = discriminator(this.casterConstructor, name, schema);

        const EmbeddedDocument = _createConstructor(schema);
        EmbeddedDocument.baseCasterConstructor = this.casterConstructor;

        try {
            Object.defineProperty(EmbeddedDocument, "name", {
                value: name
            });
        } catch (error) {
            // Ignore error, only happens on old versions of node
        }

        this.casterConstructor.discriminators[name] = EmbeddedDocument;

        return this.casterConstructor.discriminators[name];
    }

    /**
     * Performs local validations first, then validations on each embedded doc
     *
     * @api private
     */
    doValidate(array, fn, scope, options) {
        const _this = this;
        SchemaType.prototype.doValidate.call(this, array, (err) => {
            if (err) {
                return fn(err);
            }

            let count = array && array.length;
            let error;

            if (!count) {
                return fn();
            }
            if (options && options.updateValidator) {
                return fn();
            }
            if (!array.isMongooseDocumentArray) {
                array = new MongooseDocumentArray(array, _this.path, scope);
            }

            // handle sparse arrays, do not use array.forEach which does not
            // iterate over sparse elements yet reports array.length including
            // them :(

            function callback(err) {
                if (err) {
                    error = err;
                }
                --count || fn(error);
            }

            for (let i = 0, len = count; i < len; ++i) {
                // sidestep sparse entries
                let doc = array[i];
                if (!doc) {
                    --count || fn(error);
                    continue;
                }

                // If you set the array index directly, the doc might not yet be
                // a full fledged mongoose subdoc, so make it into one.
                if (!(doc instanceof Subdocument)) {
                    doc = array[i] = new _this.casterConstructor(doc, array, undefined,
                        undefined, i);
                }

                // HACK: use $__original_validate to avoid promises so bluebird doesn't
                // complain
                if (doc.$__original_validate) {
                    doc.$__original_validate({ __noPromise: true }, callback);
                } else {
                    doc.validate({ __noPromise: true }, callback);
                }
            }
        }, scope);
    }

    /**
     * Performs local validations first, then validations on each embedded doc.
     *
     * ####Note:
     *
     * This method ignores the asynchronous validators.
     *
     * @return {MongooseError|undefined}
     * @api private
     */
    doValidateSync(array, scope) {
        const schemaTypeError = SchemaType.prototype.doValidateSync.call(this, array, scope);
        if (schemaTypeError) {
            return schemaTypeError;
        }

        const count = array && array.length;
        let resultError = null;

        if (!count) {
            return;
        }

        // handle sparse arrays, do not use array.forEach which does not
        // iterate over sparse elements yet reports array.length including
        // them :(

        for (let i = 0, len = count; i < len; ++i) {
            // only first error
            if (resultError) {
                break;
            }
            // sidestep sparse entries
            let doc = array[i];
            if (!doc) {
                continue;
            }

            // If you set the array index directly, the doc might not yet be
            // a full fledged mongoose subdoc, so make it into one.
            if (!(doc instanceof Subdocument)) {
                doc = array[i] = new this.casterConstructor(doc, array, undefined,
                    undefined, i);
            }

            const subdocValidateError = doc.validateSync();

            if (subdocValidateError) {
                resultError = subdocValidateError;
            }
        }

        return resultError;
    }

    /**
     * Casts contents
     *
     * @param {Object} value
     * @param {adone.odm.Document} document that triggers the casting
     * @api private
     */
    cast(value, doc, init, prev, options) {
        let selected;
        let subdoc;
        let i;
        const _opts = { transform: false, virtuals: false };

        if (!is.array(value)) {
            // gh-2442 mark whole array as modified if we're initializing a doc from
            // the db and the path isn't an array in the document
            if (Boolean(doc) && init) {
                doc.markModified(this.path);
            }
            return this.cast([value], doc, init, prev);
        }

        if (!(value && value.isMongooseDocumentArray) &&
            (!options || !options.skipDocumentArrayCast)) {
            value = new MongooseDocumentArray(value, this.path, doc);
            if (prev && prev._handlers) {
                for (const key in prev._handlers) {
                    doc.removeListener(key, prev._handlers[key]);
                }
            }
        } else if (value && value.isMongooseDocumentArray) {
            // We need to create a new array, otherwise change tracking will
            // update the old doc (gh-4449)
            value = new MongooseDocumentArray(value, this.path, doc);
        }

        i = value.length;

        while (i--) {
            if (!value[i]) {
                continue;
            }

            let Constructor = this.casterConstructor;
            if (Constructor.discriminators &&
                is.string(value[i][Constructor.schema.options.discriminatorKey]) &&
                Constructor.discriminators[value[i][Constructor.schema.options.discriminatorKey]]) {
                Constructor = Constructor.discriminators[value[i][Constructor.schema.options.discriminatorKey]];
            }

            // Check if the document has a different schema (re gh-3701)
            if ((value[i] instanceof adone.odm.Document) &&
                value[i].schema !== Constructor.schema) {
                value[i] = value[i].toObject({ transform: false, virtuals: false });
            }
            if (!(value[i] instanceof Subdocument) && value[i]) {
                if (init) {
                    if (doc) {
                        selected || (selected = scopePaths(this, doc.$__.selected, init));
                    } else {
                        selected = true;
                    }

                    subdoc = new Constructor(null, value, true, selected, i);
                    value[i] = subdoc.init(value[i]);
                } else {
                    if (prev && (subdoc = prev.id(value[i]._id))) {
                        subdoc = prev.id(value[i]._id);
                    }

                    if (prev && subdoc && utils.deepEqual(subdoc.toObject(_opts), value[i])) {
                        // handle resetting doc with existing id and same data
                        subdoc.set(value[i]);
                        // if set() is hooked it will have no return value
                        // see gh-746
                        value[i] = subdoc;
                    } else {
                        try {
                            subdoc = new Constructor(value[i], value, undefined,
                                undefined, i);
                            // if set() is hooked it will have no return value
                            // see gh-746
                            value[i] = subdoc;
                        } catch (error) {
                            const valueInErrorMessage = util.inspect(value[i]);
                            throw new CastError("embedded", valueInErrorMessage,
                                value._path, error);
                        }
                    }
                }
            }
        }

        return value;
    }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
DocumentArray.schemaName = "DocumentArray";
