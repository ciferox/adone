/**
 * !
 * Return a function that will copy properties from
 * one object to another excluding any originally
 * listed. Returned function will create a new `{}`.
 *
 * @param {String} excluded properties ...
 * @return {Function}
 */

const exclude = function () {
    const excludes = [].slice.call(arguments);

    const excludeProps = function (res, obj) {
        Object.keys(obj).forEach((key) => {
            if (!~excludes.indexOf(key)) {
                res[key] = obj[key];
            }
        });
    };

    return function extendExclude() {
        const args = [].slice.call(arguments);
        let i = 0;
        const res = {};

        for (; i < args.length; i++) {
            excludeProps(res, args[i]);
        }

        return res;
    };
};

/**
 * ### AssertionError
 *
 * An extension of the JavaScript `Error` constructor for
 * assertion and validation scenarios.
 *
 * @param {String} message
 * @param {Object} properties to include (optional)
 * @param {callee} start stack function (optional)
 */

export default class AssertionError extends Error {
    constructor(message, _props, ssf) {
        super();
        const extend = exclude("name", "message", "stack", "constructor", "toJSON");
        const props = extend(_props || {});

        // default values
        this.message = message || "Unspecified AssertionError";
        this.showDiff = false;

        // copy from properties
        for (const key in props) {
            this[key] = props[key];
        }

        // capture stack trace
        ssf = ssf || AssertionError;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ssf);
        } else {
            try {
                throw new Error();
            } catch (e) {
                this.stack = e.stack;
            }
        }
    }

    /**
     * Allow errors to be converted to JSON for static transfer.
     *
     * @param {Boolean} include stack (default: `true`)
     * @return {Object} object that can be `JSON.stringify`
     */
    toJSON(stack) {
        const extend = exclude("constructor", "toJSON", "stack");
        const props = extend({ name: this.name }, this);

        // include stack if exists and not turned off
        if (stack !== false && this.stack) {
            props.stack = this.stack;
        }

        return props;
    }

}

AssertionError.prototype.name = "AssertionError";
