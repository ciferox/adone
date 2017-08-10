export default function (lib) {
    const { AssertionError, getAssertion } = lib;

    lib.expect = (value, message) => getAssertion(value, message);

    lib.expect.fail = (actual, expected, message = "expect.fail()", operator) => {
        throw new AssertionError(message, {
            actual,
            expected,
            operator
        }, lib.expect.fail);
    };
}
