import { SafeString } from "./runtime";

const { is } = adone;

const tests = {
    /**
     * Returns `true` if the object is a function, otherwise `false`.
     * @param { any } value
     * @returns { boolean }
     */
    callable(value) {
        return is.function(value);
    },

    /**
     * Returns `true` if the object is strictly not `undefined`.
     * @param { any } value
     * @returns { boolean }
     */
    defined(value) {
        return !is.undefined(value);
    },

    /**
     * Returns `true` if the operand (one) is divisble by the test's argument
     * (two).
     * @param { number } one
     * @param { number } two
     * @returns { boolean }
     */
    divisibleby(one, two) {
        return (one % two) === 0;
    },

    /**
     * Returns true if the string has been escaped (i.e., is a SafeString).
     * @param { any } value
     * @returns { boolean }
     */
    escaped(value) {
        return value instanceof SafeString;
    },

    /**
     * Returns `true` if the arguments are strictly equal.
     * @param { any } one
     * @param { any } two
     */
    equalto(one, two) {
        return one === two;
    },

    /**
     * Returns `true` if the value is evenly divisible by 2.
     * @param { number } value
     * @returns { boolean }
     */
    even(value) {
        return value % 2 === 0;
    },

    /**
     * Returns `true` if the value is falsy - if I recall correctly, '', 0, false,
     * undefined, NaN or null. I don't know if we should stick to the default JS
     * behavior or attempt to replicate what Python believes should be falsy (i.e.,
     * empty arrays, empty dicts, not 0...).
     * @param { any } value
     * @returns { boolean }
     */
    falsy(value) {
        return !value;
    },

    /**
     * Returns `true` if the operand (one) is greater or equal to the test's
     * argument (two).
     * @param { number } one
     * @param { number } two
     * @returns { boolean }
     */
    ge(one, two) {
        return one >= two;
    },

    /**
     * Returns `true` if the operand (one) is greater than the test's argument
     * (two).
     * @param { number } one
     * @param { number } two
     * @returns { boolean }
     */
    greaterthan(one, two) {
        return one > two;
    },

    /**
     * Returns `true` if the operand (one) is less than or equal to the test's
     * argument (two).
     * @param { number } one
     * @param { number } two
     * @returns { boolean }
     */
    le(one, two) {
        return one <= two;
    },

    /**
     * Returns `true` if the operand (one) is less than the test's passed argument
     * (two).
     * @param { number } one
     * @param { number } two
     * @returns { boolean }
     */
    lessthan(one, two) {
        return one < two;
    },

    /**
     * Returns `true` if the string is lowercased.
     * @param { string } value
     * @returns { boolean }
     */
    lower(value) {
        return value.toLowerCase() === value;
    },

    /**
     * Returns `true` if the operand (one) is less than or equal to the test's
     * argument (two).
     * @param { number } one
     * @param { number } two
     * @returns { boolean }
     */
    ne(one, two) {
        return one !== two;
    },

    /**
     * Returns true if the value is strictly equal to `null`.
     * @param { any }
     * @returns { boolean }
     */
    null(value) {
        return is.null(value);
    },

    /**
     * Returns true if value is a number.
     * @param { any }
     * @returns { boolean }
     */
    number(value) {
        return is.number(value);
    },

    /**
     * Returns `true` if the value is *not* evenly divisible by 2.
     * @param { number } value
     * @returns { boolean }
     */
    odd(value) {
        return value % 2 === 1;
    },

    /**
     * Returns `true` if the value is a string, `false` if not.
     * @param { any } value
     * @returns { boolean }
     */
    string(value) {
        return is.string(value);
    },

    /**
     * Returns `true` if the value is not in the list of things considered falsy:
     * '', null, undefined, 0, NaN and false.
     * @param { any } value
     * @returns { boolean }
     */
    truthy(value) {
        return Boolean(value);
    },

    /**
     * Returns `true` if the value is undefined.
     * @param { any } value
     * @returns { boolean }
     */
    undefined(value) {
        return is.undefined(value);
    },

    /**
     * Returns `true` if the string is uppercased.
     * @param { string } value
     * @returns { boolean }
     */
    upper(value) {
        return value.toUpperCase() === value;
    },

    /**
     * If ES6 features are available, returns `true` if the value implements the
     * `Symbol.iterator` method. If not, it's a string or Array.
     * @param { any } value
     * @returns { boolean }
     */
    iterable(value) {
        return Boolean(value[Symbol.iterator]);
    },

    /**
     * If ES6 features are available, returns `true` if the value is an object hash
     * or an ES6 Map. Otherwise just return if it's an object hash.
     * @param { any } value
     * @returns { boolean }
     */
    mapping(value) {
        // only maps and object hashes
        const bool = !is.nil(value)
            && typeof value === "object"
            && !is.array(value);
        return bool && !(value instanceof Set);
    }
};

// Aliases
tests.eq = tests.equalto;
tests.sameas = tests.equalto;
tests.gt = tests.greaterthan;
tests.lt = tests.lessthan;

export default tests;
