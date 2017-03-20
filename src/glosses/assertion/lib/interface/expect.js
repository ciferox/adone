/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

export default function (lib) {
    lib.expect = (val, message) => lib.getAssertion(val, message);

    /**
     * ### .fail(actual, expected, [message], [operator])
     *
     * Throw a failure.
     *
     * @name fail
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @param {String} operator
     * @namespace BDD
     * @api public
     */

    lib.expect.fail = function (actual, expected, message, operator) {
        message = message || "expect.fail()";
        throw new lib.AssertionError(message, {
            actual,
            expected, 
            operator
        }, lib.expect.fail);
    };
}
