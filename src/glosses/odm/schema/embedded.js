const $exists = require("./operators/exists");
const EventEmitter = require("events").EventEmitter;
import SchemaType from "../schematype";
const Subdocument = require("../types/subdocument");
const castToNumber = require("./operators/helpers").castToNumber;
const discriminator = require("../services/model/discriminator");
const geospatial = require("./operators/geospatial");

const {
    is
} = adone;

const _createConstructor = function (schema) {
    const _embedded = class extends Subdocument {
        constructor(value, path, parent) {
            super(value, path, parent);
            const _this = this;
            this.$parent = parent;            

            if (parent) {
                parent.on("save", () => {
                    _this.emit("save", _this);
                    _this.constructor.emit("save", _this);
                });

                parent.on("isNew", (val) => {
                    _this.isNew = val;
                    _this.emit("isNew", val);
                    _this.constructor.emit("isNew", val);
                });
            }
        }
    };
    _embedded.prototype.$__setSchema(schema);
    _embedded.schema = schema;
    _embedded.$isSingleNested = true;
    _embedded.prototype.toBSON = function () {
        return this.toObject({
            transform: false,
            retainKeyOrder: true,
            virtuals: false,
            _skipDepopulateTopLevel: true,
            depopulate: true,
            flattenDecimals: false
        });
    };

    // apply methods
    for (const i in schema.methods) {
        _embedded.prototype[i] = schema.methods[i];
    }

    // apply statics
    for (const i in schema.statics) {
        _embedded[i] = schema.statics[i];
    }

    for (const i in EventEmitter.prototype) {
        _embedded[i] = EventEmitter.prototype[i];
    }

    return _embedded;
};

/**
 * Sub-schema schematype constructor
 *
 * @param {Schema} schema
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */
export default class Embedded extends SchemaType {
    constructor(schema, path, options) {
        super(path, options, "Embedded");

        this.caster = _createConstructor(schema);
        this.caster.prototype.$basePath = path;
        this.schema = schema;
        this.$isSingleNested = true;
    }

    /**
     * Casts contents
     *
     * @param {Object} value
     * @api private
     */
    cast(val, doc, init, priorVal) {
        if (val && val.$isSingleNested) {
            return val;
        }

        let Constructor = this.caster;
        const discriminatorKey = Constructor.schema.options.discriminatorKey;
        if (!is.nil(val) &&
            Constructor.discriminators &&
            is.string(val[discriminatorKey]) &&
            Constructor.discriminators[val[discriminatorKey]]) {
            Constructor = Constructor.discriminators[val[discriminatorKey]];
        }

        let subdoc;
        if (init) {
            subdoc = new Constructor(void 0, doc ? doc.$__.selected : void 0, doc);
            subdoc.init(val);
        } else {
            if (Object.keys(val).length === 0) {
                return new Constructor({}, doc ? doc.$__.selected : void 0, doc);
            }

            return new Constructor(val, doc ? doc.$__.selected : void 0, doc, undefined, {
                priorDoc: priorVal
            });
        }

        return subdoc;
    }

    /**
     * Casts contents for query
     *
     * @param {string} [$conditional] optional query operator (like `$eq` or `$in`)
     * @param {any} value
     * @api private
     */
    castForQuery($conditional, val) {
        let handler;
        if (arguments.length === 2) {
            handler = this.$conditionalHandlers[$conditional];
            if (!handler) {
                throw new Error(`Can't use ${$conditional}`);
            }
            return handler.call(this, val);
        }
        val = $conditional;
        if (is.nil(val)) {
            return val;
        }

        if (this.options.runSetters) {
            val = this._applySetters(val);
        }

        return new this.caster(val);
    }

    /**
     * Async validation on this single nested doc.
     *
     * @api private
     */
    doValidate(value, fn, scope) {
        let Constructor = this.caster;
        const discriminatorKey = Constructor.schema.options.discriminatorKey;
        if (!is.nil(value) &&
            Constructor.discriminators &&
            is.string(value[discriminatorKey]) &&
            Constructor.discriminators[value[discriminatorKey]]) {
            Constructor = Constructor.discriminators[value[discriminatorKey]];
        }

        SchemaType.prototype.doValidate.call(this, value, (error) => {
            if (error) {
                return fn(error);
            }
            if (!value) {
                return fn(null);
            }

            if (!(value instanceof Constructor)) {
                value = new Constructor(value);
            }
            value.validate({ __noPromise: true }, fn);
        }, scope);
    }

    /**
     * Synchronously validate this single nested doc
     *
     * @api private
     */
    doValidateSync(value, scope) {
        const schemaTypeError = SchemaType.prototype.doValidateSync.call(this, value, scope);
        if (schemaTypeError) {
            return schemaTypeError;
        }
        if (!value) {
            return;
        }
        return value.validateSync();
    }

    /**
     * Adds a discriminator to this property
     *
     * @param {String} name
     * @param {Schema} schema fields to add to the schema for instances of this sub-class
     * @api public
     */
    discriminator(name, schema) {
        discriminator(this.caster, name, schema);

        this.caster.discriminators[name] = _createConstructor(schema);

        return this.caster.discriminators[name];
    }
}

/*!
 * Special case for when users use a common location schema to represent
 * locations for use with $geoWithin.
 * https://docs.mongodb.org/manual/reference/operator/query/geoWithin/
 *
 * @param {Object} val
 * @api private
 */
Embedded.prototype.$conditionalHandlers.$geoWithin = function (val) {
    return { $geometry: this.castForQuery(val.$geometry) };
};

Embedded.prototype.$conditionalHandlers.$near = Embedded.prototype.$conditionalHandlers.$nearSphere = geospatial.cast$near;
Embedded.prototype.$conditionalHandlers.$within = Embedded.prototype.$conditionalHandlers.$geoWithin = geospatial.cast$within;
Embedded.prototype.$conditionalHandlers.$geoIntersects = geospatial.cast$geoIntersects;
Embedded.prototype.$conditionalHandlers.$minDistance = castToNumber;
Embedded.prototype.$conditionalHandlers.$maxDistance = castToNumber;
Embedded.prototype.$conditionalHandlers.$exists = $exists;
