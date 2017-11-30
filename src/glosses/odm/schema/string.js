import SchemaType from "../schematype";
const CastError = SchemaType.CastError;
const MongooseError = require("../error");
const utils = require("../utils");

const {
    is
} = adone;

const handleSingle = function (val) {
    return this.castForQuery(val);
};

const handleArray = function (val) {
    const _this = this;
    if (!is.array(val)) {
        return [this.castForQuery(val)];
    }
    return val.map((m) => {
        return _this.castForQuery(m);
    });
};

/**
 * String SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */
export default class SchemaString extends SchemaType {
    constructor(key, options) {
        super(key, options, "String", false);
        this.enumValues = [];
        this.regExp = null;
        this.postConstruct();
    }

    /**
     * Adds an enum validator
     *
     * ####Example:
     *
     *     var states = ['opening', 'open', 'closing', 'closed']
     *     var s = new Schema({ state: { type: String, enum: states }})
     *     var M = db.model('M', s)
     *     var m = new M({ state: 'invalid' })
     *     m.save(function (err) {
     *       console.error(String(err)) // ValidationError: `invalid` is not a valid enum value for path `state`.
     *       m.state = 'open'
     *       m.save(callback) // success
     *     })
     *
     *     // or with custom error messages
     *     var enum = {
     *       values: ['opening', 'open', 'closing', 'closed'],
     *       message: 'enum validator failed for path `{PATH}` with value `{VALUE}`'
     *     }
     *     var s = new Schema({ state: { type: String, enum: enum })
     *     var M = db.model('M', s)
     *     var m = new M({ state: 'invalid' })
     *     m.save(function (err) {
     *       console.error(String(err)) // ValidationError: enum validator failed for path `state` with value `invalid`
     *       m.state = 'open'
     *       m.save(callback) // success
     *     })
     *
     * @param {String|Object} [args...] enumeration values
     * @return {SchemaType} this
     * @see Customized Error Messages #error_messages_MongooseError-messages
     * @api public
     */
    enum() {
        if (this.enumValidator) {
            this.validators = this.validators.filter(function (v) {
                return v.validator !== this.enumValidator;
            }, this);
            this.enumValidator = false;
        }

        if (arguments[0] === void 0 || arguments[0] === false) {
            return this;
        }

        let values;
        let errorMessage;

        if (utils.isObject(arguments[0])) {
            values = arguments[0].values;
            errorMessage = arguments[0].message;
        } else {
            values = arguments;
            errorMessage = MongooseError.messages.String.enum;
        }

        for (let i = 0; i < values.length; i++) {
            if (undefined !== values[i]) {
                this.enumValues.push(this.cast(values[i]));
            }
        }

        const vals = this.enumValues;
        this.enumValidator = function (v) {
            return undefined === v || ~vals.indexOf(v);
        };
        this.validators.push({
            validator: this.enumValidator,
            message: errorMessage,
            type: "enum",
            enumValues: vals
        });

        return this;
    }

    /**
     * Adds a lowercase [setter](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set).
     *
     * ####Example:
     *
     *     var s = new Schema({ email: { type: String, lowercase: true }})
     *     var M = db.model('M', s);
     *     var m = new M({ email: 'SomeEmail@example.COM' });
     *     console.log(m.email) // someemail@example.com
     *
     * NOTE: Setters do not run on queries by default. Use the `runSettersOnQuery` option:
     *
     *      // Must use `runSettersOnQuery` as shown below, otherwise `email` will
     *      // **not** be lowercased.
     *      M.updateOne({}, { $set: { email: 'SomeEmail@example.COM' } }, { runSettersOnQuery: true });
     *
     * @api public
     * @return {SchemaType} this
     */
    lowercase(shouldApply) {
        if (arguments.length > 0 && !shouldApply) {
            return this;
        }
        return this.set((v, self) => {
            if (!is.string(v)) {
                v = self.cast(v);
            }
            if (v) {
                return v.toLowerCase();
            }
            return v;
        });
    }

    /**
     * Adds an uppercase [setter](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set).
     *
     * ####Example:
     *
     *     var s = new Schema({ caps: { type: String, uppercase: true }})
     *     var M = db.model('M', s);
     *     var m = new M({ caps: 'an example' });
     *     console.log(m.caps) // AN EXAMPLE
     *
     * NOTE: Setters do not run on queries by default. Use the `runSettersOnQuery` option:
     *
     *      // Must use `runSettersOnQuery` as shown below, otherwise `email` will
     *      // **not** be lowercased.
     *      M.updateOne({}, { $set: { email: 'SomeEmail@example.COM' } }, { runSettersOnQuery: true });
     *
     * @api public
     * @return {SchemaType} this
     */
    uppercase(shouldApply) {
        if (arguments.length > 0 && !shouldApply) {
            return this;
        }
        return this.set((v, self) => {
            if (!is.string(v)) {
                v = self.cast(v);
            }
            if (v) {
                return v.toUpperCase();
            }
            return v;
        });
    }

    /**
     * Adds a trim [setter](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set).
     *
     * The string value will be trimmed when set.
     *
     * ####Example:
     *
     *     var s = new Schema({ name: { type: String, trim: true }})
     *     var M = db.model('M', s)
     *     var string = ' some name '
     *     console.log(string.length) // 11
     *     var m = new M({ name: string })
     *     console.log(m.name.length) // 9
     *
     * NOTE: Setters do not run on queries by default. Use the `runSettersOnQuery` option:
     *
     *      // Must use `runSettersOnQuery` as shown below, otherwise `email` will
     *      // **not** be lowercased.
     *      M.updateOne({}, { $set: { email: 'SomeEmail@example.COM' } }, { runSettersOnQuery: true });
     *
     * @api public
     * @return {SchemaType} this
     */
    trim(shouldTrim) {
        if (arguments.length > 0 && !shouldTrim) {
            return this;
        }
        return this.set((v, self) => {
            if (!is.string(v)) {
                v = self.cast(v);
            }
            if (v) {
                return v.trim();
            }
            return v;
        });
    }

    /**
     * Sets a minimum length validator.
     *
     * ####Example:
     *
     *     var schema = new Schema({ postalCode: { type: String, minlength: 5 })
     *     var Address = db.model('Address', schema)
     *     var address = new Address({ postalCode: '9512' })
     *     address.save(function (err) {
     *       console.error(err) // validator error
     *       address.postalCode = '95125';
     *       address.save() // success
     *     })
     *
     *     // custom error messages
     *     // We can also use the special {MINLENGTH} token which will be replaced with the minimum allowed length
     *     var minlength = [5, 'The value of path `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).'];
     *     var schema = new Schema({ postalCode: { type: String, minlength: minlength })
     *     var Address = mongoose.model('Address', schema);
     *     var address = new Address({ postalCode: '9512' });
     *     address.validate(function (err) {
     *       console.log(String(err)) // ValidationError: The value of path `postalCode` (`9512`) is shorter than the minimum length (5).
     *     })
     *
     * @param {Number} value minimum string length
     * @param {String} [message] optional custom error message
     * @return {SchemaType} this
     * @see Customized Error Messages #error_messages_MongooseError-messages
     * @api public
     */
    minlength(value, message) {
        if (this.minlengthValidator) {
            this.validators = this.validators.filter(function (v) {
                return v.validator !== this.minlengthValidator;
            }, this);
        }

        if (!is.nil(value)) {
            let msg = message || MongooseError.messages.String.minlength;
            msg = msg.replace(/{MINLENGTH}/, value);
            this.validators.push({
                validator: this.minlengthValidator = function (v) {
                    return is.null(v) || v.length >= value;
                },
                message: msg,
                type: "minlength",
                minlength: value
            });
        }

        return this;
    }

    /**
     * Sets a maximum length validator.
     *
     * ####Example:
     *
     *     var schema = new Schema({ postalCode: { type: String, maxlength: 9 })
     *     var Address = db.model('Address', schema)
     *     var address = new Address({ postalCode: '9512512345' })
     *     address.save(function (err) {
     *       console.error(err) // validator error
     *       address.postalCode = '95125';
     *       address.save() // success
     *     })
     *
     *     // custom error messages
     *     // We can also use the special {MAXLENGTH} token which will be replaced with the maximum allowed length
     *     var maxlength = [9, 'The value of path `{PATH}` (`{VALUE}`) exceeds the maximum allowed length ({MAXLENGTH}).'];
     *     var schema = new Schema({ postalCode: { type: String, maxlength: maxlength })
     *     var Address = mongoose.model('Address', schema);
     *     var address = new Address({ postalCode: '9512512345' });
     *     address.validate(function (err) {
     *       console.log(String(err)) // ValidationError: The value of path `postalCode` (`9512512345`) exceeds the maximum allowed length (9).
     *     })
     *
     * @param {Number} value maximum string length
     * @param {String} [message] optional custom error message
     * @return {SchemaType} this
     * @see Customized Error Messages #error_messages_MongooseError-messages
     * @api public
     */
    maxlength(value, message) {
        if (this.maxlengthValidator) {
            this.validators = this.validators.filter(function (v) {
                return v.validator !== this.maxlengthValidator;
            }, this);
        }

        if (!is.nil(value)) {
            let msg = message || MongooseError.messages.String.maxlength;
            msg = msg.replace(/{MAXLENGTH}/, value);
            this.validators.push({
                validator: this.maxlengthValidator = function (v) {
                    return is.null(v) || v.length <= value;
                },
                message: msg,
                type: "maxlength",
                maxlength: value
            });
        }

        return this;
    }

    /**
     * Sets a regexp validator.
     *
     * Any value that does not pass `regExp`.test(val) will fail validation.
     *
     * ####Example:
     *
     *     var s = new Schema({ name: { type: String, match: /^a/ }})
     *     var M = db.model('M', s)
     *     var m = new M({ name: 'I am invalid' })
     *     m.validate(function (err) {
     *       console.error(String(err)) // "ValidationError: Path `name` is invalid (I am invalid)."
     *       m.name = 'apples'
     *       m.validate(function (err) {
     *         assert.ok(err) // success
     *       })
     *     })
     *
     *     // using a custom error message
     *     var match = [ /\.html$/, "That file doesn't end in .html ({VALUE})" ];
     *     var s = new Schema({ file: { type: String, match: match }})
     *     var M = db.model('M', s);
     *     var m = new M({ file: 'invalid' });
     *     m.validate(function (err) {
     *       console.log(String(err)) // "ValidationError: That file doesn't end in .html (invalid)"
     *     })
     *
     * Empty strings, `undefined`, and `null` values always pass the match validator. If you require these values, enable the `required` validator also.
     *
     *     var s = new Schema({ name: { type: String, match: /^a/, required: true }})
     *
     * @param {RegExp} regExp regular expression to test against
     * @param {String} [message] optional custom error message
     * @return {SchemaType} this
     * @see Customized Error Messages #error_messages_MongooseError-messages
     * @api public
     */
    match(regExp, message) {
        // yes, we allow multiple match validators

        const msg = message || MongooseError.messages.String.match;

        const matchValidator = function (v) {
            if (!regExp) {
                return false;
            }

            const ret = ((!is.nil(v) && v !== "")
                ? regExp.test(v)
                : true);
            return ret;
        };

        this.validators.push({
            validator: matchValidator,
            message: msg,
            type: "regexp",
            regexp: regExp
        });
        return this;
    }

    /**
     * Check if the given value satisfies the `required` validator. The value is
     * considered valid if it is a string (that is, not `null` or `undefined`) and
     * has positive length. The `required` validator **will** fail for empty
     * strings.
     *
     * @param {Any} value
     * @param {Document} doc
     * @return {Boolean}
     * @api public
     */
    checkRequired(value, doc) {
        if (SchemaType._isRef(this, value, doc, true)) {
            return Boolean(value);
        }
        return (value instanceof String || is.string(value)) && value.length;
    }

    /**
     * Casts to String
     *
     * @api private
     */
    cast(value, doc, init) {
        if (SchemaType._isRef(this, value, doc, init)) {
            // wait! we may need to cast this to a document

            if (is.nil(value)) {
                return value;
            }

            if (value instanceof adone.odm.Document) {
                value.$__.wasPopulated = true;
                return value;
            }

            // setting a populated path
            if (is.string(value)) {
                return value;
            } else if (is.buffer(value) || !utils.isObject(value)) {
                throw new CastError("string", value, this.path);
            }

            // Handle the case where user directly sets a populated
            // path to a plain object; cast to the Model used in
            // the population query.
            const path = doc.$__fullPath(this.path);
            const owner = doc.ownerDocument ? doc.ownerDocument() : doc;
            const pop = owner.populated(path, true);
            const ret = new pop.options.model(value);
            ret.$__.wasPopulated = true;
            return ret;
        }

        // If null or undefined
        if (is.nil(value)) {
            return value;
        }

        if (!is.undefined(value)) {
            // handle documents being passed
            if (value._id && is.string(value._id)) {
                return value._id;
            }

            // Re: gh-647 and gh-3030, we're ok with casting using `toString()`
            // **unless** its the default Object.toString, because "[object Object]"
            // doesn't really qualify as useful data
            if (value.toString && value.toString !== Object.prototype.toString) {
                return value.toString();
            }
        }

        throw new CastError("string", value, this.path);
    }

    /**
     * Casts contents for queries.
     *
     * @param {String} $conditional
     * @param {any} [val]
     * @api private
     */
    castForQuery($conditional, val) {
        let handler;
        if (arguments.length === 2) {
            handler = this.$conditionalHandlers[$conditional];
            if (!handler) {
                throw new Error(`Can't use ${$conditional} with String.`);
            }
            return handler.call(this, val);
        }
        val = $conditional;
        if (Object.prototype.toString.call(val) === "[object RegExp]") {
            return val;
        }

        return this._castForQuery(val);
    }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaString.schemaName = "String";

SchemaString.prototype.$conditionalHandlers = utils.options(SchemaType.prototype.$conditionalHandlers, {
    $all: handleArray,
    $gt: handleSingle,
    $gte: handleSingle,
    $lt: handleSingle,
    $lte: handleSingle,
    $options: handleSingle,
    $regex: handleSingle,
    $not: handleSingle
});
