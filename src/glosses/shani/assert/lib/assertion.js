/*!
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

import config from "./config";

export default function (lib, util) {
    /*!
     * Module dependencies.
     */

    const AssertionError = lib.AssertionError;
    const flag = util.flag;

    /*!
     * Module export.
     */
    lib.Assertion = Assertion;
    lib.getAssertion = (obj, msg, stack) => util.proxify(new Assertion(obj, msg, stack));

    /*!
     * Assertion Constructor
     *
     * Creates object for chaining.
     *
     * @api private
     */

    function Assertion(obj, msg, stack) {
        flag(this, "ssfi", stack || Assertion);
        flag(this, "object", obj);
        flag(this, "message", msg);
    }

    Object.defineProperty(Assertion, "includeStack", {
        get() {
            console.warn("Assertion.includeStack is deprecated, use assert.config.includeStack instead.");
            return config.includeStack;
        },
        set(value) {
            console.warn("Assertion.includeStack is deprecated, use assert.config.includeStack instead.");
            config.includeStack = value;
        }
    });



    Object.defineProperty(Assertion, "showDiff", {
        get() {
            console.warn("Assertion.showDiff is deprecated, use assert.config.showDiff instead.");
            return config.showDiff;
        },
        set(value) {
            console.warn("Assertion.showDiff is deprecated, use assert.config.showDiff instead.");
            config.showDiff = value;
        }
    });

    Assertion.addProperty = function (name, fn) {
        util.addProperty(this.prototype, name, fn);
    };

    Assertion.addMethod = function (name, fn) {
        util.addMethod(this.prototype, name, fn);
    };

    Assertion.addChainableMethod = function (name, fn, chainingBehavior) {
        util.addChainableMethod(this.prototype, name, fn, chainingBehavior);
    };

    Assertion.overwriteProperty = function (name, fn) {
        util.overwriteProperty(this.prototype, name, fn);
    };

    Assertion.overwriteMethod = function (name, fn) {
        util.overwriteMethod(this.prototype, name, fn);
    };

    Assertion.overwriteChainableMethod = function (name, fn, chainingBehavior) {
        util.overwriteChainableMethod(this.prototype, name, fn, chainingBehavior);
    };

    /**
     * ### .assert(expression, message, negateMessage, expected, actual, showDiff)
     *
     * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
     *
     * @name assert
     * @param {Philosophical} expression to be tested
     * @param {String|Function} message or function that returns message to display if expression fails
     * @param {String|Function} negatedMessage or function that returns negatedMessage to display if negated expression fails
     * @param {Mixed} expected value (remember to check for negation)
     * @param {Mixed} actual (optional) will default to `this.obj`
     * @param {Boolean} showDiff (optional) when set to `true`, assert will display a diff in addition to the message if expression fails
     * @api private
     */

    Assertion.prototype.assert = function (expr, msg, negateMsg, expected, _actual, showDiff) {
        const ok = util.test(this, arguments);
        if (false !== showDiff) showDiff = true;
        if (undefined === expected && undefined === _actual) showDiff = false;
        if (true !== config.showDiff) showDiff = false;

        if (!ok) {
            msg = util.getMessage(this, arguments);
            const actual = util.getActual(this, arguments);
            throw new AssertionError(msg, {
                actual,
                expected,
                showDiff
            }, (config.includeStack) ? this.assert : flag(this, "ssfi"));
        }
    };

    /*!
     * ### ._obj
     *
     * Quick reference to stored `actual` value for plugin developers.
     *
     * @api private
     */

    Object.defineProperty(Assertion.prototype, "_obj", {
        get() {
            return flag(this, "object");
        },
        set(val) {
            flag(this, "object", val);
        }
    });
}
