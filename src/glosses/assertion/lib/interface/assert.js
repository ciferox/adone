export default function (lib, util) {
    const { getAssertion, AssertionError } = lib;
    const { flag } = util;
    const { is, x } = adone;

    const assert = lib.assert = (express, errmsg) => {
        const test = getAssertion(null, null, lib.assert);
        test.assert(express, errmsg, "[ negation message unavailable ]");
    };

    assert.fail = (actual, expected, message = "assert.fail()", operator) => {
        throw new AssertionError(message, { actual, expected, operator }, assert.fail);
    };

    assert.isOk = (val, msg) => {
        getAssertion(val, msg).is.ok;
    };

    assert.isNotOk = (val, msg) => {
        getAssertion(val, msg).is.not.ok;
    };

    assert.equal = function (act, exp, msg) {
        const test = getAssertion(act, msg, assert.equal);
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
        const test = getAssertion(act, msg, assert.notEqual);
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
        getAssertion(act, msg).to.equal(exp);
    };

    assert.notStrictEqual = (act, exp, msg) => {
        getAssertion(act, msg).to.not.equal(exp);
    };

    assert.deepEqual = assert.deepStrictEqual = (act, exp, msg) => {
        getAssertion(act, msg).to.eql(exp);
    };

    assert.notDeepEqual = (act, exp, msg) => {
        getAssertion(act, msg).to.not.eql(exp);
    };

    assert.isAbove = (val, abv, msg) => {
        getAssertion(val, msg).to.be.above(abv);
    };

    assert.isAtLeast = (val, atlst, msg) => {
        getAssertion(val, msg).to.be.least(atlst);
    };

    assert.isBelow = (val, blw, msg) => {
        getAssertion(val, msg).to.be.below(blw);
    };

    assert.isAtMost = (val, atmst, msg) => {
        getAssertion(val, msg).to.be.most(atmst);
    };

    assert.isTrue = (val, msg) => {
        getAssertion(val, msg).is.true;
    };

    assert.isNotTrue = (val, msg) => {
        getAssertion(val, msg).to.not.equal(true);
    };

    assert.isFalse = (val, msg) => {
        getAssertion(val, msg).is.false;
    };

    assert.isNotFalse = (val, msg) => {
        getAssertion(val, msg).to.not.equal(false);
    };

    assert.isNull = (val, msg) => {
        getAssertion(val, msg).to.equal(null);
    };

    assert.isNotNull = (val, msg) => {
        getAssertion(val, msg).to.not.equal(null);
    };

    assert.isNaN = (val, msg) => {
        getAssertion(val, msg).to.be.NaN;
    };

    assert.isNotNaN = (val, msg) => {
        getAssertion(val, msg).not.to.be.NaN;
    };

    assert.exists = (val, msg) => {
        getAssertion(val, msg).to.exist;
    };

    assert.notExists = (val, msg) => {
        getAssertion(val, msg).to.not.exist;
    };

    assert.isUndefined = (val, msg) => {
        getAssertion(val, msg).to.equal(undefined);
    };

    assert.isDefined = (val, msg) => {
        getAssertion(val, msg).to.not.equal(undefined);
    };

    assert.isFunction = (val, msg) => {
        getAssertion(val, msg).to.be.a("function");
    };

    assert.isNotFunction = (val, msg) => {
        getAssertion(val, msg).to.not.be.a("function");
    };

    assert.isObject = (val, msg) => {
        getAssertion(val, msg).to.be.a("object");
    };

    assert.isNotObject = (val, msg) => {
        getAssertion(val, msg).to.not.be.a("object");
    };

    assert.isArray = (val, msg) => {
        getAssertion(val, msg).to.be.an("array");
    };

    assert.isNotArray = (val, msg) => {
        getAssertion(val, msg).to.not.be.an("array");
    };

    assert.isString = (val, msg) => {
        getAssertion(val, msg).to.be.a("string");
    };

    assert.isNotString = (val, msg) => {
        getAssertion(val, msg).to.not.be.a("string");
    };

    assert.isNumber = (val, msg) => {
        getAssertion(val, msg).to.be.a("number");
    };

    assert.isNotNumber = (val, msg) => {
        getAssertion(val, msg).to.not.be.a("number");
    };

    assert.isFinite = (val, msg) => {
        getAssertion(val, msg).to.be.finite;
    };

    assert.isBoolean = (val, msg) => {
        getAssertion(val, msg).to.be.a("boolean");
    };

    assert.isNotBoolean = (val, msg) => {
        getAssertion(val, msg).to.not.be.a("boolean");
    };

    assert.typeOf = (val, type, msg) => {
        getAssertion(val, msg).to.be.a(type);
    };

    assert.notTypeOf = (val, type, msg) => {
        getAssertion(val, msg).to.not.be.a(type);
    };

    assert.instanceOf = (val, type, msg) => {
        getAssertion(val, msg).to.be.instanceOf(type);
    };

    assert.notInstanceOf = (val, type, msg) => {
        getAssertion(val, msg).to.not.be.instanceOf(type);
    };

    assert.include = (exp, inc, msg) => {
        getAssertion(exp, msg, assert.include).include(inc);
    };

    assert.notInclude = (exp, inc, msg) => {
        getAssertion(exp, msg, assert.notInclude).not.include(inc);
    };

    assert.deepInclude = (exp, inc, msg) => {
        getAssertion(exp, msg, assert.include).deep.include(inc);
    };

    assert.notDeepInclude = (exp, inc, msg) => {
        getAssertion(exp, msg, assert.notInclude).not.deep.include(inc);
    };

    assert.match = (exp, re, msg) => {
        getAssertion(exp, msg).to.match(re);
    };

    assert.notMatch = (exp, re, msg) => {
        getAssertion(exp, msg).to.not.match(re);
    };

    assert.property = (obj, prop, msg) => {
        getAssertion(obj, msg).to.have.property(prop);
    };

    assert.notProperty = (obj, prop, msg) => {
        getAssertion(obj, msg).to.not.have.property(prop);
    };

    assert.propertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg).to.have.property(prop, val);
    };

    assert.notPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg).to.not.have.property(prop, val);
    };

    assert.deepPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg).to.have.deep.property(prop, val);
    };

    assert.notDeepPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg).to.not.have.deep.property(prop, val);
    };

    assert.ownProperty = (obj, prop, msg) => {
        getAssertion(obj, msg).to.have.own.property(prop);
    };

    assert.notOwnProperty = (obj, prop, msg) => {
        getAssertion(obj, msg).to.not.have.own.property(prop);
    };

    assert.ownPropertyVal = (obj, prop, value, msg) => {
        getAssertion(obj, msg).to.have.own.property(prop, value);
    };

    assert.notOwnPropertyVal = (obj, prop, value, msg) => {
        getAssertion(obj, msg).to.not.have.own.property(prop, value);
    };

    assert.deepOwnPropertyVal = (obj, prop, value, msg) => {
        getAssertion(obj, msg).to.have.deep.own.property(prop, value);
    };

    assert.notDeepOwnPropertyVal = (obj, prop, value, msg) => {
        getAssertion(obj, msg).to.not.have.deep.own.property(prop, value);
    };

    assert.nestedProperty = (obj, prop, msg) => {
        getAssertion(obj, msg).to.have.nested.property(prop);
    };

    assert.notNestedProperty = (obj, prop, msg) => {
        getAssertion(obj, msg).to.not.have.nested.property(prop);
    };

    assert.nestedPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg).to.have.nested.property(prop, val);
    };

    assert.notNestedPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg).to.not.have.nested.property(prop, val);
    };

    assert.deepNestedPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg).to.have.deep.nested.property(prop, val);
    };

    assert.notDeepNestedPropertyVal = (obj, prop, val, msg) => {
        getAssertion(obj, msg).to.not.have.deep.nested.property(prop, val);
    };

    assert.lengthOf = (exp, len, msg) => {
        getAssertion(exp, msg).to.have.length(len);
    };

    assert.hasAnyKeys = (obj, keys, msg) => {
        getAssertion(obj, msg).to.have.any.keys(keys);
    };

    assert.hasAllKeys = (obj, keys, msg) => {
        getAssertion(obj, msg).to.have.all.keys(keys);
    };

    assert.containsAllKeys = (obj, keys, msg) => {
        getAssertion(obj, msg).to.contain.all.keys(keys);
    };

    assert.doesNotHaveAnyKeys = (obj, keys, msg) => {
        getAssertion(obj, msg).to.not.have.any.keys(keys);
    };

    assert.doesNotHaveAllKeys = (obj, keys, msg) => {
        getAssertion(obj, msg).to.not.have.all.keys(keys);
    };

    assert.hasAnyDeepKeys = (obj, keys, msg) => {
        getAssertion(obj, msg).to.have.any.deep.keys(keys);
    };

    assert.hasAllDeepKeys = (obj, keys, msg) => {
        getAssertion(obj, msg).to.have.all.deep.keys(keys);
    };

    assert.containsAllDeepKeys = (obj, keys, msg) => {
        getAssertion(obj, msg).to.contain.all.deep.keys(keys);
    };

    assert.doesNotHaveAnyDeepKeys = (obj, keys, msg) => {
        getAssertion(obj, msg).to.not.have.any.deep.keys(keys);
    };

    assert.doesNotHaveAllDeepKeys = (obj, keys, msg) => {
        getAssertion(obj, msg).to.not.have.all.deep.keys(keys);
    };

    assert.throws = (fn, errorLike, errMsgMatcher, msg) => {
        if (is.string(errorLike) || is.regexp(errorLike)) {
            errMsgMatcher = errorLike;
            errorLike = null;
        }
        const assertErr = getAssertion(fn, msg).to.throw(errorLike, errMsgMatcher);
        return flag(assertErr, "object");
    };

    assert.doesNotThrow = (fn, errorLike, errMsgMatcher, msg) => {
        if (is.string(errorLike) || is.regexp(errorLike)) {
            errMsgMatcher = errorLike;
            errorLike = null;
        }
        getAssertion(fn, msg).to.not.throw(errorLike, errMsgMatcher);
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
            default:
                throw new x.InvalidArgument(`Invalid operator "${operator}"`);
        }
        const test = getAssertion(ok, msg);
        test.assert(
            flag(test, "object") === true,
            `expected ${util.inspect(val)} to be ${operator} ${util.inspect(val2)}`,
            `expected ${util.inspect(val)} to not be ${operator} ${util.inspect(val2)}`
        );
    };

    assert.closeTo = (act, exp, delta, msg) => {
        getAssertion(act, msg).to.be.closeTo(exp, delta);
    };

    assert.approximately = (act, exp, delta, msg) => {
        getAssertion(act, msg).to.be.approximately(exp, delta);
    };

    assert.sameMembers = (set1, set2, msg) => {
        getAssertion(set1, msg).to.have.same.members(set2);
    };

    assert.notSameMembers = (set1, set2, msg) => {
        getAssertion(set1, msg).to.not.have.same.members(set2);
    };

    assert.sameDeepMembers = (set1, set2, msg) => {
        getAssertion(set1, msg).to.have.same.deep.members(set2);
    };

    assert.notSameDeepMembers = (set1, set2, msg) => {
        getAssertion(set1, msg).to.not.have.same.deep.members(set2);
    };

    assert.sameOrderedMembers = (set1, set2, msg) => {
        getAssertion(set1, msg).to.have.same.ordered.members(set2);
    };

    assert.notSameOrderedMembers = (set1, set2, msg) => {
        getAssertion(set1, msg).to.not.have.same.ordered.members(set2);
    };

    assert.sameDeepOrderedMembers = (set1, set2, msg) => {
        getAssertion(set1, msg).to.have.same.deep.ordered.members(set2);
    };

    assert.notSameDeepOrderedMembers = (set1, set2, msg) => {
        getAssertion(set1, msg).to.not.have.same.deep.ordered.members(set2);
    };

    assert.includeMembers = (superset, subset, msg) => {
        getAssertion(superset, msg).to.include.members(subset);
    };

    assert.notIncludeMembers = (superset, subset, msg) => {
        getAssertion(superset, msg).to.not.include.members(subset);
    };

    assert.includeDeepMembers = (superset, subset, msg) => {
        getAssertion(superset, msg).to.include.deep.members(subset);
    };

    assert.notIncludeDeepMembers = (superset, subset, msg) => {
        getAssertion(superset, msg).to.not.include.deep.members(subset);
    };

    assert.includeOrderedMembers = (superset, subset, msg) => {
        getAssertion(superset, msg).to.include.ordered.members(subset);
    };

    assert.notIncludeOrderedMembers = (superset, subset, msg) => {
        getAssertion(superset, msg).to.not.include.ordered.members(subset);
    };

    assert.includeDeepOrderedMembers = (superset, subset, msg) => {
        getAssertion(superset, msg).to.include.deep.ordered.members(subset);
    };

    assert.notIncludeDeepOrderedMembers = (superset, subset, msg) => {
        getAssertion(superset, msg).to.not.include.deep.ordered.members(subset);
    };

    assert.oneOf = (inList, list, msg) => {
        getAssertion(inList, msg).to.be.oneOf(list);
    };

    assert.changes = function (fn, obj, prop, msg = adone.null) {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        getAssertion(fn, msg).to.change(obj, prop);
    };

    assert.changesBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg).to.change(obj, prop).by(delta);
    };

    assert.doesNotChange = (fn, obj, prop, msg = adone.null) => {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        return getAssertion(fn, msg).to.not.change(obj, prop);
    };

    assert.changesButNotBy = function (fn, obj, prop, delta = adone.null, msg = adone.null) {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg).to.change(obj, prop).but.not.by(delta);
    };

    assert.increases = (fn, obj, prop, msg = adone.null) => {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        return getAssertion(fn, msg).to.increase(obj, prop);
    };

    assert.increasesBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg).to.increase(obj, prop).by(delta);
    };

    assert.doesNotIncrease = (fn, obj, prop, msg) => {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        return getAssertion(fn, msg).to.not.increase(obj, prop);
    };

    assert.increasesButNotBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg).to.increase(obj, prop).but.not.by(delta);
    };

    assert.decreases = (fn, obj, prop, msg = adone.null) => {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        return getAssertion(fn, msg).to.decrease(obj, prop);
    };

    assert.decreasesBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg).to.decrease(obj, prop).by(delta);
    };

    assert.doesNotDecrease = (fn, obj, prop, msg = adone.null) => {
        if (msg === adone.null && is.function(obj)) {
            [msg, prop] = [prop, null];
        }
        return getAssertion(fn, msg).to.not.decrease(obj, prop);
    };

    assert.doesNotDecreaseBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        return getAssertion(fn, msg).to.not.decrease(obj, prop).by(delta);
    };

    assert.decreasesButNotBy = (fn, obj, prop, delta = adone.null, msg = adone.null) => {
        if (delta === adone.null) {
            if (msg === adone.null) {
                [delta, prop] = [prop, null];
            } else if (is.function(obj)) {
                [delta, prop] = [prop, delta];
            }
        }
        getAssertion(fn, msg).to.decrease(obj, prop).but.not.by(delta);
    };

    assert.ifError = (val) => {
        if (val) {
            throw (val);
        }
    };

    assert.isExtensible = (obj, msg) => {
        getAssertion(obj, msg).to.be.extensible;
    };

    assert.isNotExtensible = (obj, msg) => {
        getAssertion(obj, msg).to.not.be.extensible;
    };

    assert.isSealed = (obj, msg) => {
        getAssertion(obj, msg).to.be.sealed;
    };

    assert.isNotSealed = (obj, msg) => {
        getAssertion(obj, msg).to.not.be.sealed;
    };

    assert.isFrozen = (obj, msg) => {
        getAssertion(obj, msg).to.be.frozen;
    };

    assert.isNotFrozen = (obj, msg) => {
        getAssertion(obj, msg).to.not.be.frozen;
    };

    assert.isEmpty = (val, msg) => {
        getAssertion(val, msg).to.be.empty;
    };

    assert.isNotEmpty = (val, msg) => {
        getAssertion(val, msg).to.not.be.empty;
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
