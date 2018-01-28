export default function (lib) {
    const { AssertionError, getAssertion } = lib;

    lib.expect = (value, message) => getAssertion(value, message);

    lib.expect.fail = function (actual, expected, message, operator) {
        if (arguments.length < 2) {
            message = actual;
            actual = undefined;
        }

        message = message || "expect.fail()";

        throw new AssertionError(message, {
            actual,
            expected,
            operator
        }, lib.expect.fail);
    };
}
