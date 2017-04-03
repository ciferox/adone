export default function (lib) {
    const { AssertionError, getAssertion } = lib;

    lib.expect = (val, message) => getAssertion(val, message);

    lib.expect.fail = function (actual, expected, message = "expect.fail()", operator) {
        throw new AssertionError(message, {
            actual,
            expected,
            operator
        }, lib.expect.fail);
    };
}
