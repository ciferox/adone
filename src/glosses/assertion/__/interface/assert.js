export default function (lib, util) {
    const { getAssertion, AssertionError } = lib;
    const { flag } = util;
    const { is } = adone;

    const assert = lib.assert = (value, mesasge) => {
        const test = getAssertion(null, null, lib.assert, true);
        test.assert(value, mesasge, "[ negation m unavailable ]");
    };

    /**
     * Throws an exception, like node.js
     */
    assert.fail = (actual, expected, message = "assert.fail()", operator) => {
        throw new AssertionError(message, { actual, expected, operator }, assert.fail);
    };

    /**
     * Asserts that value is truthy
     */
    assert.isOk = (value, message) => {
        getAssertion(value, message, assert.isOk, true).is.ok;
    };

    /**
     * Asserts that value is not truthy
     */
    assert.isNotOk = (value, message) => {
        getAssertion(value, message, assert.isNotOk, true).is.not.ok;
    };

    /**
     * Asserts non-strict equality (==)
     */
    assert.equal = (actual, expected, message) => {
        const test = getAssertion(actual, message, assert.equal, true);
        test.assert(
            expected == flag(test, "object"), // eslint-disable-line eqeqeq
            "expected #{this} to equal #{exp}",
            "expected #{this} to not equal #{act}",
            expected,
            actual,
            true
        );
    };

    /**
     * Asserts non-struct inequality (!=)
     */
    assert.notEqual = (actual, expected, message) => {
        const test = getAssertion(actual, message, assert.notEqual, true);
        test.assert(
            expected != flag(test, "object"), // eslint-disable-line eqeqeq
            "expected #{this} to not equal #{exp}",
            "expected #{this} to equal #{act}",
            expected,
            actual,
            true
        );
    };

    /**
     * Asserts strict equality (==)
     */
    assert.strictEqual = (actual, expected, message) => {
        getAssertion(actual, message, assert.strictEqual, true).to.equal(expected);
    };

    /**
     * Asserts strict inequality (!==)
     */
    assert.notStrictEqual = (actual, expected, message) => {
        getAssertion(actual, message, assert.notStrictEqual, true).to.not.equal(expected);
    };

    /**
     * Asserts that actual is deeply equal to expected
     */
    assert.deepEqual = assert.deepStrictEqual = (actual, expected, message) => {
        getAssertion(actual, message, assert.deepEqual, true).to.eql(expected);
    };

    /**
     * Asserts that actual and expected have the same length and the same members (===)
     */
    assert.equalArrays = (actual, expected, message) => {
        getAssertion(actual, message, assert.equalArrays, true).to.eqlArray(expected);
    };

    /**
     * Asserts that actual is not deeply equal to expected
     */
    assert.notDeepEqual = (actual, expected, message) => {
        getAssertion(actual, message, assert.notDeepEqual, true).to.not.eql(expected);
    };

    /**
     * Asserts that value > above
     */
    assert.isAbove = (value, above, message) => {
        getAssertion(value, message, assert.isAbove, true).to.be.above(above);
    };

    /**
     * Asserts that value >= atLeast
     */
    assert.isAtLeast = (value, atLeast, message) => {
        getAssertion(value, message, assert.isAtLeast, true).to.be.least(atLeast);
    };

    /**
     * Asserts that value < below
     */
    assert.isBelow = (value, below, message) => {
        getAssertion(value, message, assert.isBelow, true).to.be.below(below);
    };

    /**
     * Asserts that value <= atMost
     */
    assert.isAtMost = (value, atMost, message) => {
        getAssertion(value, message, assert.isAtMost, true).to.be.most(atMost);
    };

    /**
     * Asserts that value is true
     */
    assert.isTrue = (value, message) => {
        getAssertion(value, message, assert.isTrue, true).is.true;
    };

    /**
     * Asserts that value is not true
     */
    assert.isNotTrue = (value, message) => {
        getAssertion(value, message, assert.isNotTrue, true).to.not.equal(true);
    };

    /**
     * Asserts that value is false
     */
    assert.isFalse = (value, message) => {
        getAssertion(value, message, assert.isFalse, true).is.false;
    };

    /**
     * Asserts that value is not false
     */
    assert.isNotFalse = (value, message) => {
        getAssertion(value, message, assert.isNotFalse, true).to.not.equal(false);
    };

    /**
     * Asserts that value is null
     */
    assert.isNull = (value, message) => {
        getAssertion(value, message, assert.isNull, true).to.equal(null);
    };

    /**
     * Asserts that value is not null
     */
    assert.isNotNull = (value, message) => {
        getAssertion(value, message, assert.isNotNull, true).to.not.equal(null);
    };

    /**
     * Asserts that value is NaN
     */
    assert.isNaN = (value, message) => {
        getAssertion(value, message, assert.isNaN, true).to.be.NaN;
    };

    /**
     * Asserts that value is not NaN
     */
    assert.isNotNaN = (value, message) => {
        getAssertion(value, message, assert.isNotNaN, true).not.to.be.NaN;
    };

    /**
     * Asserts that value neither null nor undefined
     */
    assert.exists = (value, message) => {
        getAssertion(value, message, assert.exists, true).to.exist;
    };

    /**
     * Asserts that value either null or undefined
     */
    assert.notExists = (value, message) => {
        getAssertion(value, message, assert.notExists, true).to.not.exist;
    };

    /**
     * Asserts that value is undefined
     */
    assert.isUndefined = (value, message) => {
        getAssertion(value, message, assert.isUndefined, true).to.equal(undefined);
    };

    /**
     * Asserts that value is not undefined
     */
    assert.isDefined = (value, message) => {
        getAssertion(value, message, assert.isDefined, true).to.not.equal(undefined);
    };

    /**
     * Asserts that value is a function
     */
    assert.isFunction = (value, message) => {
        getAssertion(value, message, assert.isFunction, true).to.be.a("function");
    };

    /**
     * Asserts that value is not a function
     */
    assert.isNotFunction = (value, message) => {
        getAssertion(value, message, assert.isNotFunction, true).to.not.be.a("function");
    };

    /**
     * Asserts that value is an object of type Object
     */
    assert.isObject = (value, message) => {
        getAssertion(value, message, assert.isObject, true).to.be.a("object");
    };

    /**
     * Asserts that value is not an object of type Object
     */
    assert.isNotObject = (value, message) => {
        getAssertion(value, message, assert.isNotObject, true).to.not.be.a("object");
    };

    /**
     * Asserts that value is an array
     */
    assert.isArray = (value, message) => {
        getAssertion(value, message, assert.isArray, true).to.be.an("array");
    };

    /**
     * Asserts that value is not an array
     */
    assert.isNotArray = (value, message) => {
        getAssertion(value, message, assert.isNotArray, true).to.not.be.an("array");
    };

    /**
     * Asserts that value is a string
     */
    assert.isString = (value, message) => {
        getAssertion(value, message, assert.isString, true).to.be.a("string");
    };

    /**
     * Asserts that value is not a string
     */
    assert.isNotString = (value, message) => {
        getAssertion(value, message, assert.isNotString, true).to.not.be.a("string");
    };

    /**
     * Asserts that value is a number
     */
    assert.isNumber = (value, message) => {
        getAssertion(value, message, assert.isNumber, true).to.be.a("number");
    };

    /**
     * Asserts that value is not a number
     */
    assert.isNotNumber = (value, message) => {
        getAssertion(value, message, assert.isNotNumber, true).to.not.be.a("number");
    };

    /**
     * Asserts that value is a finite number
     */
    assert.isFinite = (value, message) => {
        getAssertion(value, message, assert.isFinite, true).to.be.finite;
    };

    /**
     * Asserts that value is a boolean
     */
    assert.isBoolean = (value, message) => {
        getAssertion(value, message, assert.isBoolean, true).to.be.a("boolean");
    };

    /**
     * Asserts that value is not a boolean
     */
    assert.isNotBoolean = (value, message) => {
        getAssertion(value, message, assert.isNotBoolean, true).to.not.be.a("boolean");
    };

    /**
     * Asserts that value's type is `type`
     */
    assert.typeOf = (value, type, message) => {
        getAssertion(value, message, assert.typeOf, true).to.be.a(type);
    };

    /**
     * Assert that value's type is not `type`
     */
    assert.notTypeOf = (value, type, message) => {
        getAssertion(value, message, assert.notTypeOf, true).to.not.be.a(type);
    };

    /**
     * Asserts that value is an instance of constructor
     */
    assert.instanceOf = (value, type, message) => {
        getAssertion(value, message, assert.instanceOf, true).to.be.instanceOf(type);
    };

    /**
     * Asserts that value is not an instance of constructor
     */
    assert.notInstanceOf = (value, type, message) => {
        getAssertion(value, message, assert.notInstanceOf, true).to.not.be.instanceOf(type);
    };

    /**
     * Asserts that expected includes value
     */
    assert.include = (expected, value, message) => {
        getAssertion(expected, message, assert.include, true).include(value);
    };

    /**
     * Asserts that expected does not include value
     */
    assert.notInclude = (expected, value, message) => {
        getAssertion(expected, message, assert.notInclude, true).not.include(value);
    };

    /**
     * Asserts that expected includes value
     */
    assert.deepInclude = (expected, value, message) => {
        getAssertion(expected, message, assert.deepInclude, true).deep.include(value);
    };

    /**
     * Asserts that expected does not include value
     */
    assert.notDeepInclude = (expecte, include, message) => {
        getAssertion(expecte, message, assert.notDeepInclude, true).not.deep.include(include);
    };

    /**
     * Asserts that expected includes value
     * Enables the use of dot- and bracket-notation for referencing nested properties
     */
    assert.nestedInclude = (expected, value, message) => {
        getAssertion(expected, message, assert.nestedInclude, true).nested.include(value);
    };

    /**
     * Asserts that expected does not include inc
     * Enables the use of dot- and bracket-notation for referencing nested properties
     */
    assert.notNestedInclude = (expected, value, message) => {
        getAssertion(expected, message, assert.notNestedInclude, true).not.nested.include(value);
    };

    /**
     * Assert that expected includes value
     */
    assert.deepNestedInclude = (expected, value, message) => {
        getAssertion(expected, message, assert.deepNestedInclude, true).deep.nested.include(value);
    };

    /**
     * Assert that expected includes value
     */
    assert.notDeepNestedInclude = (expected, value, message) => {
        getAssertion(expected, message, assert.notDeepNestedInclude, true).not.deep.nested.include(value);
    };

    /**
     * Assert that expected includes value
     */
    assert.ownInclude = (expected, value, message) => {
        getAssertion(expected, message, assert.ownInclude, true).own.include(value);
    };

    /**
     * Assert that expected does not include value
     */
    assert.notOwnInclude = (expected, value, message) => {
        getAssertion(expected, message, assert.notOwnInclude, true).not.own.include(value);
    };

    /**
     * Assert that expected includes value
     */
    assert.deepOwnInclude = (expected, value, message) => {
        getAssertion(expected, message, assert.deepOwnInclude, true).deep.own.include(value);
    };

    /**
     * Assert that expected does not include value
     */
    assert.notDeepOwnInclude = (expected, value, message) => {
        getAssertion(expected, message, assert.notDeepOwnInclude, true).not.deep.own.include(value);
    };

    /**
     * Asserts that expected matches the regular expression regExp
     */
    assert.match = (expected, regExp, message) => {
        getAssertion(expected, message, assert.match, true).to.match(regExp);
    };

    /**
     * Asserts that expected does not match the regular expression regExp
     */
    assert.notMatch = (expected, regExp, message) => {
        getAssertion(expected, message, assert.notMatch, true).to.not.match(regExp);
    };

    /**
     * Asserts that object has a property named `property`
     */
    assert.property = (object, property, message) => {
        getAssertion(object, message, assert.property, true).to.have.property(property);
    };

    /**
     * Asserts that object does not have a property named `property`
     */
    assert.notProperty = (object, property, message) => {
        getAssertion(object, message, assert.notProperty, true).to.not.have.property(property);
    };

    /**
     * Asserts that object has a property named `property` with value `value` (===)
     */
    assert.propertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.propertyVal, true).to.have.property(property, value);
    };

    /**
     * Asserts that object does not have a property named `property` with value `value` (===)
     */
    assert.notPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.notPropertyVal, true).to.not.have.property(property, value);
    };

    /**
     * Asserts that object has a property named `property` with a value `value`
     */
    assert.deepPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.deepPropertyVal, true).to.have.deep.property(property, value);
    };

    /**
     * Asserts that object does not have a property named `property` with value `value`
     */
    assert.notDeepPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.notDeepPropertyVal, true).to.not.have.deep.property(property, value);
    };

    /**
     * Asserts that object has an owned property named `property`
     */
    assert.ownProperty = (object, proeprty, message) => {
        getAssertion(object, message, assert.ownProperty, true).to.have.own.property(proeprty);
    };

    /**
     * Asserts that object does not have an owned property named `property`
     */
    assert.notOwnProperty = (object, property, message) => {
        getAssertion(object, message, assert.notOwnProperty, true).to.not.have.own.property(property);
    };

    /**
     * Asserts that object has an owned property named `property` with value `value`(===)
     */
    assert.ownPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.ownPropertyVal, true).to.have.own.property(property, value);
    };

    /**
     * Asserts that object does not have an owned property named `property` with value `value`(===)
     */
    assert.notOwnPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.notOwnPropertyVal, true).to.not.have.own.property(property, value);
    };

    /**
     * Asserts that object has an owned property named `property` with value `value`
     */
    assert.deepOwnPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.deepOwnPropertyVal, true).to.have.deep.own.property(property, value);
    };

    /**
     * Asserts that object does not have an owned property named `property` with value `value`(===)
     */
    assert.notDeepOwnPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.notDeepOwnPropertyVal, true).to.not.have.deep.own.property(property, value);
    };

    /**
     * Asserts that object has a property named `property`
     */
    assert.nestedProperty = (object, property, message) => {
        getAssertion(object, message, assert.nestedProperty, true).to.have.nested.property(property);
    };

    /**
     * Asserts that object does not have a property named `property`
     */
    assert.notNestedProperty = (object, property, message) => {
        getAssertion(object, message, assert.notNestedProperty, true).to.not.have.nested.property(property);
    };

    /**
     * Asserts that object has a property named `property` with value `value`(===)
     */
    assert.nestedPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.nestedPropertyVal, true).to.have.nested.property(property, value);
    };

    /**
     * Asserts that object does not have a property named `property` with value `value`(===)
     */
    assert.notNestedPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.notNestedPropertyVal, true).to.not.have.nested.property(property, value);
    };

    /**
     * Asserts that object has a property named `property` with value `value`
     */
    assert.deepNestedPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.deepNestedPropertyVal, true).to.have.deep.nested.property(property, value);
    };

    /**
     * Asserts that object does not have a property named `property` with value `value`
     */
    assert.notDeepNestedPropertyVal = (object, property, value, message) => {
        getAssertion(object, message, assert.notDeepNestedPropertyVal, true).to.not.have.deep.nested.property(property, value);
    };

    /**
     * Asserts that expected has a length property with value `length`
     */
    assert.lengthOf = (expected, length, message) => {
        getAssertion(expected, message, assert.lengthOf, true).to.have.lengthOf(length);
    };

    /**
     * Asserts that object has at least one key from `keys`
     */
    assert.hasAnyKeys = (object, keys, message) => {
        getAssertion(object, message, assert.hasAnyKeys, true).to.have.any.keys(keys);
    };

    /**
     * Asserts that object has all and only all of the keys provided
     */
    assert.hasAllKeys = (object, keys, message) => {
        getAssertion(object, message, assert.hasAllKeys, true).to.have.all.keys(keys);
    };

    /**
     * Asserts that object has all the keys provided but maybe more
     */
    assert.containsAllKeys = (object, keys, message) => {
        getAssertion(object, message, assert.containsAllKeys, true).to.contain.all.keys(keys);
    };

    /**
     * Asserts that object does not have any provided key
     */
    assert.doesNotHaveAnyKeys = (object, keys, message) => {
        getAssertion(object, message, assert.doesNotHaveAnyKeys, true).to.not.have.any.keys(keys);
    };

    /**
     * Asserts that object does not have all the keys provided
     */
    assert.doesNotHaveAllKeys = (object, keys, message) => {
        getAssertion(object, message, assert.doesNotHaveAllKeys, true).to.not.have.all.keys(keys);
    };

    /**
     * Asserts that object has at least one of the keys provided
     */
    assert.hasAnyDeepKeys = (object, keys, message) => {
        getAssertion(object, message, assert.hasAnyDeepKeys, true).to.have.any.deep.keys(keys);
    };

    /**
     * Asserts that object has all and only all of the keys provided
     */
    assert.hasAllDeepKeys = (object, keys, message) => {
        getAssertion(object, message, assert.hasAllDeepKeys, true).to.have.all.deep.keys(keys);
    };

    /**
     * Asserts that object has all the keys provided but maybe more
     */
    assert.containsAllDeepKeys = (object, keys, message) => {
        getAssertion(object, message, assert.containsAllDeepKeys, true).to.contain.all.deep.keys(keys);
    };

    /**
     * Asserts that object does not have any provided key
     */
    assert.doesNotHaveAnyDeepKeys = (object, keys, message) => {
        getAssertion(object, message, assert.doesNotHaveAnyDeepKeys, true).to.not.have.any.deep.keys(keys);
    };

    /**
     * Asserts that object does not have all the keys provided
     */
    assert.doesNotHaveAllDeepKeys = (object, keys, message) => {
        getAssertion(object, message, assert.doesNotHaveAllDeepKeys, true).to.not.have.all.deep.keys(keys);
    };

    /**
     * Asserts that a function or an async functions throws an error
     */
    assert.throws = (fn, errorLike, errMsgMatcher, message) => {
        if (is.string(errorLike) || is.regexp(errorLike)) {
            errMsgMatcher = errorLike;
            errorLike = null;
        }
        const assertErr = getAssertion(fn, message, assert.throws, true).to.throw(errorLike, errMsgMatcher);
        return flag(assertErr, "object"); // maybe promise
    };

    /**
     * Asserts that a function or an async function does not throw an error
     */
    assert.doesNotThrow = (fn, errorLike, errMsgMatcher, message) => {
        if (is.string(errorLike) || is.regexp(errorLike)) {
            errMsgMatcher = errorLike;
            errorLike = null;
        }
        const _assert = getAssertion(fn, message, assert.doesNotThrow, true).to.not.throw(errorLike, errMsgMatcher);
        return flag(_assert, "object"); // maybe promise
    };

    /**
     * Compares two values using operator
     */
    assert.operator = (a, operator, b, message) => {
        let ok;
        switch (operator) {
            case "==": {
                ok = a == b; // eslint-disable-line eqeqeq
                break;
            }
            case "===": {
                ok = a === b;
                break;
            }
            case ">": {
                ok = a > b;
                break;
            }
            case ">=": {
                ok = a >= b;
                break;
            }
            case "<": {
                ok = a < b;
                break;
            }
            case "<=": {
                ok = a <= b;
                break;
            }
            case "!=": {
                ok = a !== b;
                break;
            }
            case "!==": {
                ok = a !== b;
                break;
            }
            default: {
                message = message ? `${message}: ` : message;
                throw new AssertionError(`${message}Invalid operator "${operator}"`, undefined, assert.operator);
            }
        }
        const test = getAssertion(ok, message, assert.operator, true);
        test.assert(
            flag(test, "object") === true,
            `expected ${util.inspect(a)} to be ${operator} ${util.inspect(b)}`,
            `expected ${util.inspect(a)} to not be ${operator} ${util.inspect(b)}`
        );
    };

    /**
     * Asserts that actual is expected +/- delta
     */
    assert.closeTo = (actual, expected, delta, message) => {
        getAssertion(actual, message, assert.closeTo, true).to.be.closeTo(expected, delta);
    };

    /**
     * Asserts that actual is expect +/- delta
     */
    assert.approximately = (actual, expected, delta, message) => {
        getAssertion(actual, message, assert.approximately, true).to.be.approximately(expected, delta);
    };

    /**
     * Asserts that arrays have the same members in any order (===)
     */
    assert.sameMembers = (set1, set2, message) => {
        getAssertion(set1, message, assert.sameMembers, true).to.have.same.members(set2);
    };

    /**
     * Asserts that arrays do not have the same members in any order (===)
     */
    assert.notSameMembers = (set1, set2, message) => {
        getAssertion(set1, message, assert.notSameMembers, true).to.not.have.same.members(set2);
    };

    /**
     * Asserts that arrays have the same members in any order
     */
    assert.sameDeepMembers = (set1, set2, message) => {
        getAssertion(set1, message, assert.sameDeepMembers, true).to.have.same.deep.members(set2);
    };

    /**
     * Asserts that arrays do not have the same members in any order
     */
    assert.notSameDeepMembers = (set1, set2, message) => {
        getAssertion(set1, message, assert.notSameDeepMembers, true).to.not.have.same.deep.members(set2);
    };

    /**
     * Asserts that arrays have the same members in the same order (===)
     */
    assert.sameOrderedMembers = (set1, set2, message) => {
        getAssertion(set1, message, assert.sameOrderedMembers, true).to.have.same.ordered.members(set2);
    };

    /**
     * Asserts that arrays do not have the same members in the same order (===)
     */
    assert.notSameOrderedMembers = (set1, set2, message) => {
        getAssertion(set1, message, assert.notSameOrderedMembers, true).to.not.have.same.ordered.members(set2);
    };

    /**
     * Asserts that arrays have the same members in the same order
     */
    assert.sameDeepOrderedMembers = (set1, set2, message) => {
        getAssertion(set1, message, assert.sameDeepOrderedMembers, true).to.have.same.deep.ordered.members(set2);
    };

    /**
     * Asserts that arrays do not have the same members in the same order
     */
    assert.notSameDeepOrderedMembers = (set1, set2, message) => {
        getAssertion(set1, message, assert.notSameDeepOrderedMembers, true).to.not.have.same.deep.ordered.members(set2);
    };

    /**
     * Asserts that subset is included in superset in any order (===)
     */
    assert.includeMembers = (superset, subset, message) => {
        getAssertion(superset, message, assert.includeMembers, true).to.include.members(subset);
    };

    /**
     * Asserts that subset is not included in superset in any order (===)
     */
    assert.notIncludeMembers = (superset, subset, message) => {
        getAssertion(superset, message, assert.notIncludeMembers, true).to.not.include.members(subset);
    };

    /**
     * Asserts that subset is included in superset in any order
     */
    assert.includeDeepMembers = (superset, subset, message) => {
        getAssertion(superset, message, assert.includeDeepMembers, true).to.include.deep.members(subset);
    };

    /**
     * Asserts that subset is not included in superset in any order
     */
    assert.notIncludeDeepMembers = (superset, subset, message) => {
        getAssertion(superset, message, assert.notIncludeDeepMembers, true).to.not.include.deep.members(subset);
    };

    /**
     * Asserts that subset is included in superset in the same order (===)
     */
    assert.includeOrderedMembers = (superset, subset, message) => {
        getAssertion(superset, message, assert.includeOrderedMembers, true).to.include.ordered.members(subset);
    };

    /**
     * Asserts that subset is not included in superset in the same order (===)
     */
    assert.notIncludeOrderedMembers = (superset, subset, message) => {
        getAssertion(superset, message, assert.notIncludeOrderedMembers, true).to.not.include.ordered.members(subset);
    };

    /**
     * Asserts that subset is included in superset in the same order
     */
    assert.includeDeepOrderedMembers = (superset, subset, message) => {
        getAssertion(superset, message, assert.includeDeepOrderedMembers, true).to.include.deep.ordered.members(subset);
    };

    /**
     * Asserts that subset is not included in superset in the same order
     */
    assert.notIncludeDeepOrderedMembers = (superset, subset, message) => {
        getAssertion(superset, message, assert.notIncludeDeepOrderedMembers, true).
            to.not.include.deep.ordered.members(subset);
    };

    /**
     * Asserts that list includes value
     */
    assert.oneOf = (value, list, message) => {
        getAssertion(value, message, assert.oneOf, true).to.be.oneOf(list);
    };

    /**
     * Asserts that a function changes the value of a property
     */
    assert.changes = (fn, object, property, message = adone.null) => {
        if (message === adone.null && is.function(object)) {
            [message, property] = [property, null];
        }
        getAssertion(fn, message, assert.changes, true).to.change(object, property);
    };

    /**
     * Asserts that a function changes the value of a property by delta
     */
    assert.changesBy = (fn, object, property, delta = adone.null, message = adone.null) => {
        if (delta === adone.null) {
            if (message === adone.null) {
                [delta, property] = [property, null];
            } else if (is.function(object)) {
                [delta, property] = [property, delta];
            }
        }
        getAssertion(fn, message, assert.changesBy, true).to.change(object, property).by(delta);
    };

    /**
     * Asserts that a function does not changes the value of a property
     */
    assert.doesNotChange = (fn, object, property, message = adone.null) => {
        if (message === adone.null && is.function(object)) {
            [message, property] = [property, null];
        }
        getAssertion(fn, message, assert.doesNotChange, true).to.not.change(object, property);
    };

    /**
     * Asserts that a function does not change the value of a property or of a function’s return value by delta
     */
    assert.changesButNotBy = (fn, object, property, delta = adone.null, message = adone.null) => {
        if (delta === adone.null) {
            if (message === adone.null) {
                [delta, property] = [property, null];
            } else if (is.function(object)) {
                [delta, property] = [property, delta];
            }
        }
        getAssertion(fn, message, assert.changesButNotBy, true).to.change(object, property).but.not.by(delta);
    };

    /**
     * Asserts that a function increases a numeric object property
     */
    assert.increases = (fn, object, property, message = adone.null) => {
        if (message === adone.null && is.function(object)) {
            [message, property] = [property, null];
        }
        getAssertion(fn, message, assert.increases, true).to.increase(object, property);
    };

    /**
     * Asserts that a function increases a numeric object property or a function’s return value by delta
     */
    assert.increasesBy = (fn, object, property, delta = adone.null, message = adone.null) => {
        if (delta === adone.null) {
            if (message === adone.null) {
                [delta, property] = [property, null];
            } else if (is.function(object)) {
                [delta, property] = [property, delta];
            }
        }
        getAssertion(fn, message, assert.increasesBy, true).to.increase(object, property).by(delta);
    };

    /**
     * Asserts that a function does not increase a numeric object property
     */
    assert.doesNotIncrease = (fn, object, property, message) => {
        if (message === adone.null && is.function(object)) {
            [message, property] = [property, null];
        }
        getAssertion(fn, message, assert.doesNotIncrease, true).to.not.increase(object, property);
    };

    /**
     * Asserts that a function does not increase a numeric object property or function’s return value by delta
     */
    assert.increasesButNotBy = (fn, object, property, delta = adone.null, message = adone.null) => {
        if (delta === adone.null) {
            if (message === adone.null) {
                [delta, property] = [property, null];
            } else if (is.function(object)) {
                [delta, property] = [property, delta];
            }
        }
        getAssertion(fn, message, assert.increasesButNotBy, true).to.increase(object, property).but.not.by(delta);
    };

    /**
     * Asserts that a function decreases the value of a property
     */
    assert.decreases = (fn, object, property, message = adone.null) => {
        if (message === adone.null && is.function(object)) {
            [message, property] = [property, null];
        }
        getAssertion(fn, message, assert.decreases, true).to.decrease(object, property);
    };

    /**
     * Asserts that a function decreases the value of a property by delta
     */
    assert.decreasesBy = (fn, object, property, delta = adone.null, message = adone.null) => {
        if (delta === adone.null) {
            if (message === adone.null) {
                [delta, property] = [property, null];
            } else if (is.function(object)) {
                [delta, property] = [property, delta];
            }
        }
        getAssertion(fn, message, assert.decreases, true).to.decrease(object, property).by(delta);
    };

    /**
     * Asserts that a function does not decrease the value of a property
     */
    assert.doesNotDecrease = (fn, object, property, message = adone.null) => {
        if (message === adone.null && is.function(object)) {
            [message, property] = [property, null];
        }
        getAssertion(fn, message, assert.doesNotDecrease, true).to.not.decrease(object, property);
    };

    /**
     * Asserts that a function does not decrease the value of a property or a function's return value by delta
     */
    assert.doesNotDecreaseBy = (fn, object, property, delta = adone.null, message = adone.null) => {
        if (delta === adone.null) {
            if (message === adone.null) {
                [delta, property] = [property, null];
            } else if (is.function(object)) {
                [delta, property] = [property, delta];
            }
        }
        getAssertion(fn, message, assert.doesNotDecreaseBy, true).to.not.decrease(object, property).by(delta);
    };

    /**
     * Asserts that a function does not decreases a numeric object property or a function’s return value by delta
     */
    assert.decreasesButNotBy = (fn, object, property, delta = adone.null, message = adone.null) => {
        if (delta === adone.null) {
            if (message === adone.null) {
                [delta, property] = [property, null];
            } else if (is.function(object)) {
                [delta, property] = [property, delta];
            }
        }
        getAssertion(fn, message, assert.decreasesButNotBy, true).to.decrease(object, property).but.not.by(delta);
    };

    /**
     * Throws an error if value is truthy
     */
    assert.ifError = (value) => {
        if (value) {
            throw (value);
        }
    };

    /**
     * Asserts that object is extensible
     */
    assert.isExtensible = (object, message) => {
        getAssertion(object, message, assert.isExtensible, true).to.be.extensible;
    };

    /**
     * Asserts that object is not extensible
     */
    assert.isNotExtensible = (object, message) => {
        getAssertion(object, message, assert.isNotExtensible, true).to.not.be.extensible;
    };

    /**
     * Asserts that object is sealed
     */
    assert.isSealed = (object, message) => {
        getAssertion(object, message, assert.isSealed, true).to.be.sealed;
    };

    /**
     * Asserts that object is not sealed
     */
    assert.isNotSealed = (object, message) => {
        getAssertion(object, message, assert.isNotSealed, true).to.not.be.sealed;
    };

    /**
     * Asserts that object is frozen
     */
    assert.isFrozen = (object, message) => {
        getAssertion(object, message, assert.isFrozen, true).to.be.frozen;
    };

    /**
     * Asserts that object is not frozen
     */
    assert.isNotFrozen = (object, message) => {
        getAssertion(object, message, assert.isNotFrozen, true).to.not.be.frozen;
    };

    /**
     * Asserts that value is empty
     */
    assert.isEmpty = (value, message) => {
        getAssertion(value, message, assert.isEmpty, true).to.be.empty;
    };

    /**
     * Asserts that value is not empty
     */
    assert.isNotEmpty = (value, message) => {
        getAssertion(value, message, assert.isNotEmpty, true).to.not.be.empty;
    };

    for (const [name, alias] of [
        ["isOk", "ok"],
        ["isNotOk", "notOk"],
        ["throws", "throw"],
        ["throws", "Throw"],
        ["isExtensible", "extensible"],
        ["isNotExtensible", "notExtensible"],
        ["isSealed", "sealed"],
        ["isNotSealed", "notSealed"],
        ["isFrozen", "frozen"],
        ["isNotFrozen", "notFrozen"],
        ["isEmpty", "empty"],
        ["isNotEmpty", "notEmpty"]
    ]) {
        assert[alias] = assert[name];
    }
}
