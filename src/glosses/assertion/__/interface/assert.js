export default function (lib, util) {
    const { getAssertion, AssertionError } = lib;
    const { flag } = util;
    const { is } = adone;

    const assert = lib.assert = (express, errmsg) => {
        const test = getAssertion(null, null, lib.assert, true);
        test.assert(express, errmsg, "[ negation message unavailable ]");
    };

    assert.fail = (actual, expected, message = "assert.fail()", operator) => {
        throw new AssertionError(message, { actual, expected, operator }, assert.fail);
    };

    assert.isOk = (val, msg) => {
        getAssertion(val, msg, assert.isOk, true).is.ok;
    };

    assert.isNotOk = (val, msg) => {
        getAssertion(val, msg, assert.isNotOk, true).is.not.ok;
    };

    assert.equal = function (act, exp, msg) {
        const test = getAssertion(act, msg, assert.equal, true);
        test.assert(
            exp == flag(test, "object"),  // eslint-disable-line eqeqeq
            "expected #{this} to equal #{exp}",
            "expected #{this} to not equal #{act}",
            exp,
            act,
            true
        );
    };

    assert.notEqual = function (act, exp, msg) {
        const test = getAssertion(act, msg, assert.notEqual, true);
        test.assert(
            exp !== flag(test, "object"),
            "expected #{this} to not equal #{exp}",
            "expected #{this} to equal #{act}",
            exp,
            act,
            true
        );
    };

    assert.strictEqual = (act, exp, msg) => {
        getAssertion(act, msg, assert.strictEqual, true).to.equal(exp);
    };

    assert.notStrictEqual = (act, exp, msg) => {
        getAssertion(act, msg, assert.notStrictEqual, true).to.not.equal(exp);
    };

    assert.deepEqual = assert.deepStrictEqual = (act, exp, msg) => {
        getAssertion(act, msg, assert.deepEqual, true).to.eql(exp);
    };

    assert.equalArrays = (act, exp, msg) => {
        getAssertion(act, msg, assert.equalArrays, true).to.eqlArray(exp);
    };

    assert.notDeepEqual = (act, exp, msg) => {
        getAssertion(act, msg, assert.notDeepEqual, true).to.not.eql(exp);
    };

    assert.isAbove = (val, abv, msg) => {
        getAssertion(val, msg, assert.isAbove, true).to.be.above(abv);
    };

    assert.isAtLeast = (val, atlst, msg) => {
        getAssertion(val, msg, assert.isAtLeast, true).to.be.least(atlst);
    };

    assert.isBelow = (val, blw, msg) => {
        getAssertion(val, msg, assert.isBelow, true).to.be.below(blw);
    };

    assert.isAtMost = (val, atmst, msg) => {
        getAssertion(val, msg, assert.isAtMost, true).to.be.most(atmst);
    };

    assert.isTrue = (val, msg) => {
        getAssertion(val, msg, assert.isTrue, true).is.true;
    };

    assert.isNotTrue = (val, msg) => {
        getAssertion(val, msg, assert.isNotTrue, true).to.not.equal(true);
    };

    assert.isFalse = (val, msg) => {
        getAssertion(val, msg, assert.isFalse, true).is.false;
    };

    assert.isNotFalse = (val, msg) => {
        getAssertion(val, msg, assert.isNotFalse, true).to.not.equal(false);
    };

    assert.isNull = (val, msg) => {
        getAssertion(val, msg, assert.isNull, true).to.equal(null);
    };

    assert.isNotNull = (val, msg) => {
        getAssertion(val, msg, assert.isNotNull, true).to.not.equal(null);
    };

    assert.isNaN = (val, msg) => {
        getAssertion(val, msg, assert.isNaN, true).to.be.NaN;
    };

    assert.isNotNaN = (val, msg) => {
        getAssertion(val, msg, assert.isNotNaN, true).not.to.be.NaN;
    };

    assert.exists = (val, msg) => {
        getAssertion(val, msg, assert.exists, true).to.exist;
    };

    assert.notExists = (val, msg) => {
        getAssertion(val, msg, assert.notExists, true).to.not.exist;
    };

    assert.isUndefined = (val, msg) => {
        getAssertion(val, msg, assert.isUndefined, true).to.equal(undefined);
    };

    assert.isDefined = (val, msg) => {
        getAssertion(val, msg, assert.isDefined, true).to.not.equal(undefined);
    };

    assert.isFunction = (val, msg) => {
        getAssertion(val, msg, assert.isFunction, true).to.be.a("function");
    };

    assert.isNotFunction = (val, msg) => {
        getAssertion(val, msg, assert.isNotFunction, true).to.not.be.a("function");
    };

    assert.isObject = (val, msg) => {
        getAssertion(val, msg, assert.isObject, true).to.be.a("object");
    };

    assert.isNotObject = (val, msg) => {
        getAssertion(val, msg, assert.isNotObject, true).to.not.be.a("object");
    };

    assert.isArray = (val, msg) => {
        getAssertion(val, msg, assert.isArray, true).to.be.an("array");
    };

    assert.isNotArray = (val, msg) => {
        getAssertion(val, msg, assert.isNotArray, true).to.not.be.an("array");
    };

    assert.isString = (val, msg) => {
        getAssertion(val, msg, assert.isString, true).to.be.a("string");
    };

    assert.isNotString = (val, msg) => {
        getAssertion(val, msg, assert.isNotString, true).to.not.be.a("string");
    };

    assert.isNumber = (val, msg) => {
        getAssertion(val, msg, assert.isNumber, true).to.be.a("number");
    };

    assert.isNotNumber = (val, msg) => {
        getAssertion(val, msg, assert.isNotNumber, true).to.not.be.a("number");
    };

    assert.isFinite = (val, msg) => {
        getAssertion(val, msg, assert.isFinite, true).to.be.finite;
    };

    assert.isBoolean = (val, msg) => {
        getAssertion(val, msg, assert.isBoolean, true).to.be.a("boolean");
    };

    assert.isNotBoolean = (val, msg) => {
        getAssertion(val, msg, assert.isNotBoolean, true).to.not.be.a("boolean");
    };

    assert.typeOf = (val, type, msg) => {
        getAssertion(val, msg, assert.typeOf, true).to.be.a(type);
    };

    assert.notTypeOf = (val, type, msg) => {
        getAssertion(val, msg, assert.notTypeOf, true).to.not.be.a(type);
    };

    assert.instanceOf = (val, type, msg) => {
        getAssertion(val, msg, assert.instanceOf, true).to.be.instanceOf(type);
    };

    assert.notInstanceOf = (val, type, msg) => {
        getAssertion(val, msg, assert.notInstanceOf, true).to.not.be.instanceOf(type);
    };

    assert.include = (exp, inc, msg) => {
        getAssertion(exp, msg, assert.include, true).include(inc);
    };

    assert.notInclude = (exp, inc, msg) => {
        getAssertion(exp, msg, assert.notInclude, true).not.include(inc);
    };

    assert.deepInclude = (exp, inc, msg) => {
        getAssertion(exp, msg, assert.deepInclude, true).deep.include(inc);
    };

    assert.notDeepInclude = (exp, inc, msg) => {
        getAssertion(exp, msg, assert.notDeepInclude, true).not.deep.include(inc);
    };

    assert.nestedInclude = function (exp, inc, msg) {
        getAssertion(exp, msg, assert.nestedInclude, true).nested.include(inc);
    };

    assert.notNestedInclude = function (exp, inc, msg) {
        getAssertion(exp, msg, assert.notNestedInclude, true).not.nested.include(inc);
    };

    assert.deepNestedInclude = function (exp, inc, msg) {
        getAssertion(exp, msg, assert.deepNestedInclude, true).deep.nested.include(inc);
    };

    assert.notDeepNestedInclude = function (exp, inc, msg) {
        getAssertion(exp, msg, assert.notDeepNestedInclude, true).not.deep.nested.include(inc);
    };

    assert.ownInclude = function (exp, inc, msg) {
        getAssertion(exp, msg, assert.ownInclude, true).own.include(inc);
    };

    assert.notOwnInclude = function (exp, inc, msg) {
        getAssertion(exp, msg, assert.notOwnInclude, true).not.own.include(inc);
    };

    assert.deepOwnInclude = function (exp, inc, msg) {
        getAssertion(exp, msg, assert.deepOwnInclude, true).deep.own.include(inc);
    };

    assert.notDeepOwnInclude = function (exp, inc, msg) {
        getAssertion(exp, msg, assert.notDeepOwnInclude, true).not.deep.own.include(inc);
    };

    assert.match = (exp, re, msg) => {
        getAssertion(exp, msg, assert.match, true).to.match(re);
    };

    assert.notMatch = (exp, re, msg) => {
        getAssertion(exp, msg, assert.notMatch, true).to.not.match(re);
    };

    assert.property = (obj, prop, msg) => {
        getAssertion(obj, msg, assert.property, true).to.have.property(prop);
    };

    assert.notProperty = (obj, prop, msg) => {
        getAssertion(obj, msg, assert.notProperty, true).to.not.have.property(prop);
    };

    assert.propertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg, assert.propertyVal, true).to.have.property(prop, val);
    };

    assert.notPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg, assert.notPropertyVal, true).to.not.have.property(prop, val);
    };

    assert.deepPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg, assert.deepPropertyVal, true).to.have.deep.property(prop, val);
    };

    assert.notDeepPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg, assert.notDeepPropertyVal, true).to.not.have.deep.property(prop, val);
    };

    assert.ownProperty = (obj, prop, msg) => {
        getAssertion(obj, msg, assert.ownProperty, true).to.have.own.property(prop);
    };

    assert.notOwnProperty = (obj, prop, msg) => {
        getAssertion(obj, msg, assert.notOwnProperty, true).to.not.have.own.property(prop);
    };

    assert.ownPropertyVal = (obj, prop, value, msg) => {
        getAssertion(obj, msg, assert.ownPropertyVal, true).to.have.own.property(prop, value);
    };

    assert.notOwnPropertyVal = (obj, prop, value, msg) => {
        getAssertion(obj, msg, assert.notOwnPropertyVal, true).to.not.have.own.property(prop, value);
    };

    assert.deepOwnPropertyVal = (obj, prop, value, msg) => {
        getAssertion(obj, msg, assert.deepOwnPropertyVal, true).to.have.deep.own.property(prop, value);
    };

    assert.notDeepOwnPropertyVal = (obj, prop, value, msg) => {
        getAssertion(obj, msg, assert.notDeepOwnPropertyVal, true).to.not.have.deep.own.property(prop, value);
    };

    assert.nestedProperty = (obj, prop, msg) => {
        getAssertion(obj, msg, assert.nestedProperty, true).to.have.nested.property(prop);
    };

    assert.notNestedProperty = (obj, prop, msg) => {
        getAssertion(obj, msg, assert.notNestedProperty, true).to.not.have.nested.property(prop);
    };

    assert.nestedPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg, assert.nestedPropertyVal, true).to.have.nested.property(prop, val);
    };

    assert.notNestedPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg, assert.notNestedPropertyVal, true).to.not.have.nested.property(prop, val);
    };

    assert.deepNestedPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg, assert.deepNestedPropertyVal, true).to.have.deep.nested.property(prop, val);
    };

    assert.notDeepNestedPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg, assert.notDeepNestedPropertyVal, true).to.not.have.deep.nested.property(prop, val);
    };

    assert.lengthOf = (exp, len, msg) => {
        getAssertion(exp, msg, assert.lengthOf, true).to.have.lengthOf(len);
    };

    assert.hasAnyKeys = (obj, keys, msg) => {
        getAssertion(obj, msg, assert.hasAnyKeys, true).to.have.any.keys(keys);
    };

    assert.hasAllKeys = (obj, keys, msg) => {
        getAssertion(obj, msg, assert.hasAllKeys, true).to.have.all.keys(keys);
    };

    assert.containsAllKeys = (obj, keys, msg) => {
        getAssertion(obj, msg, assert.containsAllKeys, true).to.contain.all.keys(keys);
    };

    assert.doesNotHaveAnyKeys = (obj, keys, msg) => {
        getAssertion(obj, msg, assert.doesNotHaveAnyKeys, true).to.not.have.any.keys(keys);
    };

    assert.doesNotHaveAllKeys = (obj, keys, msg) => {
        getAssertion(obj, msg, assert.doesNotHaveAllKeys, true).to.not.have.all.keys(keys);
    };

    assert.hasAnyDeepKeys = (obj, keys, msg) => {
        getAssertion(obj, msg, assert.hasAnyDeepKeys, true).to.have.any.deep.keys(keys);
    };

    assert.hasAllDeepKeys = (obj, keys, msg) => {
        getAssertion(obj, msg, assert.hasAllDeepKeys, true).to.have.all.deep.keys(keys);
    };

    assert.containsAllDeepKeys = (obj, keys, msg) => {
        getAssertion(obj, msg, assert.containsAllDeepKeys, true).to.contain.all.deep.keys(keys);
    };

    assert.doesNotHaveAnyDeepKeys = (obj, keys, msg) => {
        getAssertion(obj, msg, assert.doesNotHaveAnyDeepKeys, true).to.not.have.any.deep.keys(keys);
    };

    assert.doesNotHaveAllDeepKeys = (obj, keys, msg) => {
        getAssertion(obj, msg, assert.doesNotHaveAllDeepKeys, true).to.not.have.all.deep.keys(keys);
    };

    assert.throws = (fn, errorLike, errMsgMatcher, msg) => {
        if (is.string(errorLike) || is.regexp(errorLike)) {
            errMsgMatcher = errorLike;
            errorLike = null;
        }
        const assertErr = getAssertion(fn, msg, assert.throws, true).to.throw(errorLike, errMsgMatcher);
        return flag(assertErr, "object");  // maybe promise
    };

    assert.doesNotThrow = (fn, errorLike, errMsgMatcher, msg) => {
        if (is.string(errorLike) || is.regexp(errorLike)) {
            errMsgMatcher = errorLike;
            errorLike = null;
        }
        const _assert = getAssertion(fn, msg, assert.doesNotThrow, true).to.not.throw(errorLike, errMsgMatcher);
        return flag(_assert, "object");  // maybe promise
    };

    assert.operator = (val, operator, val2, msg) => {
        let ok;
        switch (operator) {
            case "==": {
                ok = val == val2;  // eslint-disable-line eqeqeq
                break;
            }
            case "===": {
                ok = val === val2;
                break;
            }
            case ">": {
                ok = val > val2;
                break;
            }
            case ">=": {
                ok = val >= val2;
                break;
            }
            case "<": {
                ok = val < val2;
                break;
            }
            case "<=": {
                ok = val <= val2;
                break;
            }
            case "!=": {
                ok = val !== val2;
                break;
            }
            case "!==": {
                ok = val !== val2;
                break;
            }
            default: {
                msg = msg ? `${msg}: ` : msg;
                throw new AssertionError(`${msg}Invalid operator "${operator}"`, undefined, assert.operator);
            }
        }
        const test = getAssertion(ok, msg, assert.operator, true);
        test.assert(
            flag(test, "object") === true,
            `expected ${util.inspect(val)} to be ${operator} ${util.inspect(val2)}`,
            `expected ${util.inspect(val)} to not be ${operator} ${util.inspect(val2)}`
        );
    };

    assert.closeTo = (act, exp, delta, msg) => {
        getAssertion(act, msg, assert.closeTo, true).to.be.closeTo(exp, delta);
    };

    assert.approximately = (act, exp, delta, msg) => {
        getAssertion(act, msg, assert.approximately, true).to.be.approximately(exp, delta);
    };

    assert.sameMembers = (set1, set2, msg) => {
        getAssertion(set1, msg, assert.sameMembers, true).to.have.same.members(set2);
    };

    assert.notSameMembers = (set1, set2, msg) => {
        getAssertion(set1, msg, assert.notSameMembers, true).to.not.have.same.members(set2);
    };

    assert.sameDeepMembers = (set1, set2, msg) => {
        getAssertion(set1, msg, assert.sameDeepMembers, true).to.have.same.deep.members(set2);
    };

    assert.notSameDeepMembers = (set1, set2, msg) => {
        getAssertion(set1, msg, assert.notSameDeepMembers, true).to.not.have.same.deep.members(set2);
    };

    assert.sameOrderedMembers = (set1, set2, msg) => {
        getAssertion(set1, msg, assert.sameOrderedMembers, true).to.have.same.ordered.members(set2);
    };

    assert.notSameOrderedMembers = (set1, set2, msg) => {
        getAssertion(set1, msg, assert.notSameOrderedMembers, true).to.not.have.same.ordered.members(set2);
    };

    assert.sameDeepOrderedMembers = (set1, set2, msg) => {
        getAssertion(set1, msg, assert.sameDeepOrderedMembers, true).to.have.same.deep.ordered.members(set2);
    };

    assert.notSameDeepOrderedMembers = (set1, set2, msg) => {
        getAssertion(set1, msg, assert.notSameDeepOrderedMembers, true).to.not.have.same.deep.ordered.members(set2);
    };

    assert.includeMembers = (superset, subset, msg) => {
        getAssertion(superset, msg, assert.includeMembers, true).to.include.members(subset);
    };

    assert.notIncludeMembers = (superset, subset, msg) => {
        getAssertion(superset, msg, assert.notIncludeMembers, true).to.not.include.members(subset);
    };

    assert.includeDeepMembers = (superset, subset, msg) => {
        getAssertion(superset, msg, assert.includeDeepMembers, true).to.include.deep.members(subset);
    };

    assert.notIncludeDeepMembers = (superset, subset, msg) => {
        getAssertion(superset, msg, assert.notIncludeDeepMembers, true).to.not.include.deep.members(subset);
    };

    assert.includeOrderedMembers = (superset, subset, msg) => {
        getAssertion(superset, msg, assert.includeOrderedMembers, true).to.include.ordered.members(subset);
    };

    assert.notIncludeOrderedMembers = (superset, subset, msg) => {
        getAssertion(superset, msg, assert.notIncludeOrderedMembers, true).to.not.include.ordered.members(subset);
    };

    assert.includeDeepOrderedMembers = (superset, subset, msg) => {
        getAssertion(superset, msg, assert.includeDeepOrderedMembers, true).to.include.deep.ordered.members(subset);
    };

    assert.notIncludeDeepOrderedMembers = (superset, subset, msg) => {
        getAssertion(superset, msg, assert.notIncludeDeepOrderedMembers, true).
            to.not.include.deep.ordered.members(subset);
    };

    assert.oneOf = (inList, list, msg) => {
        getAssertion(inList, msg, assert.oneOf, true).to.be.oneOf(list);
    };

    assert.changes = function (fn, obj, prop, msg = adone.null) {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        getAssertion(fn, msg, assert.changes, true).to.change(obj, prop);
    };

    assert.changesBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg, assert.changesBy, true).to.change(obj, prop).by(delta);
    };

    assert.doesNotChange = (fn, obj, prop, msg = adone.null) => {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        return getAssertion(fn, msg, assert.doesNotChange, true).to.not.change(obj, prop);
    };

    assert.changesButNotBy = function (fn, obj, prop, delta = adone.null, msg = adone.null) {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg, assert.changesButNotBy, true).to.change(obj, prop).but.not.by(delta);
    };

    assert.increases = (fn, obj, prop, msg = adone.null) => {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        return getAssertion(fn, msg, assert.increases, true).to.increase(obj, prop);
    };

    assert.increasesBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg, assert.increasesBy, true).to.increase(obj, prop).by(delta);
    };

    assert.doesNotIncrease = (fn, obj, prop, msg) => {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        return getAssertion(fn, msg, assert.doesNotIncrease, true).to.not.increase(obj, prop);
    };

    assert.increasesButNotBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg, assert.increasesButNotBy, true).to.increase(obj, prop).but.not.by(delta);
    };

    assert.decreases = (fn, obj, prop, msg = adone.null) => {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        return getAssertion(fn, msg, assert.decreases, true).to.decrease(obj, prop);
    };

    assert.decreasesBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg, assert.decreases, true).to.decrease(obj, prop).by(delta);
    };

    assert.doesNotDecrease = (fn, obj, prop, msg = adone.null) => {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        return getAssertion(fn, msg, assert.doesNotDecrease, true).to.not.decrease(obj, prop);
    };

    assert.doesNotDecreaseBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        return getAssertion(fn, msg, assert.doesNotDecreaseBy, true).to.not.decrease(obj, prop).by(delta);
    };

    assert.decreasesButNotBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg, assert.decreasesButNotBy, true).to.decrease(obj, prop).but.not.by(delta);
    };

    assert.ifError = (val) => {
        if (val) {
            throw (val);
        }
    };

    assert.isExtensible = (obj, msg) => {
        getAssertion(obj, msg, assert.isExtensible, true).to.be.extensible;
    };

    assert.isNotExtensible = (obj, msg) => {
        getAssertion(obj, msg, assert.isNotExtensible, true).to.not.be.extensible;
    };

    assert.isSealed = (obj, msg) => {
        getAssertion(obj, msg, assert.isSealed, true).to.be.sealed;
    };

    assert.isNotSealed = (obj, msg) => {
        getAssertion(obj, msg, assert.isNotSealed, true).to.not.be.sealed;
    };

    assert.isFrozen = (obj, msg) => {
        getAssertion(obj, msg, assert.isFrozen, true).to.be.frozen;
    };

    assert.isNotFrozen = (obj, msg) => {
        getAssertion(obj, msg, assert.isNotFrozen, true).to.not.be.frozen;
    };

    assert.isEmpty = (val, msg) => {
        getAssertion(val, msg, assert.isEmpty, true).to.be.empty;
    };

    assert.isNotEmpty = (val, msg) => {
        getAssertion(val, msg, assert.isNotEmpty, true).to.not.be.empty;
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
