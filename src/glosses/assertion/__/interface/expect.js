export default function (lib, util) {
    lib.expect = function (val, message) {
        return new lib.Assertion(val, message);
    };

    /**
     * ### .fail([message])
     * ### .fail(actual, expected, [message], [operator])
     *
     * Throw a failure.
     *
     *     expect.fail();
     *     expect.fail("custom error message");
     *     expect.fail(1, 2);
     *     expect.fail(1, 2, "custom error message");
     *     expect.fail(1, 2, "custom error message", ">");
     *     expect.fail(1, 2, undefined, ">");
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
        if (arguments.length < 2) {
            message = actual;
            actual = undefined;
        }

        message = message || "expect.fail()";
        throw new lib.AssertionError(message, {
            actual,
            expected,
            operator
        }, lib.expect.fail);
    };
}
