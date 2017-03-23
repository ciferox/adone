/*!
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */



export default function (lib, util) {
    const { getAssertion } = lib;
    const { flag } = util;
    const { is } = adone;
    /*!
     * Module export.
     */

    /**
     * ### assert(expression, message)
     *
     * Write your own test expressions.
     *
     *     assert('foo' !== 'bar', 'foo is not bar');
     *     assert(Array.isArray([]), 'empty arrays are arrays');
     *
     * @param {Mixed} expression to test for truthiness
     * @param {String} message to display on error
     * @name assert
     * @namespace Assert
     * @api public
     */

    const assert = lib.assert = (express, errmsg) => {
        const test = getAssertion(null, null, lib.assert);
        test.assert(express, errmsg, "[ negation message unavailable ]");
    };

    /**
     * ### .fail(actual, expected, [message], [operator])
     *
     * Throw a failure. Node.js `assert` module-compatible.
     *
     * @name fail
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @param {String} operator
     * @namespace Assert
     * @api public
     */

    assert.fail = (actual, expected, message, operator) => {
        message = message || "assert.fail()";
        throw new lib.AssertionError(message, { actual, expected, operator }, assert.fail);
    };

    /**
     * ### .isOk(object, [message])
     *
     * Asserts that `object` is truthy.
     *
     *     assert.isOk('everything', 'everything is ok');
     *     assert.isOk(false, 'this will fail');
     *
     * @name isOk
     * @alias ok
     * @param {Mixed} object to test
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isOk = (val, msg) => void getAssertion(val, msg).is.ok;

    /**
     * ### .isNotOk(object, [message])
     *
     * Asserts that `object` is falsy.
     *
     *     assert.isNotOk('everything', 'this will fail');
     *     assert.isNotOk(false, 'this will pass');
     *
     * @name isNotOk
     * @alias notOk
     * @param {Mixed} object to test
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNotOk = (val, msg) => void getAssertion(val, msg).is.not.ok;

    /**
     * ### .equal(actual, expected, [message])
     *
     * Asserts non-strict equality (`==`) of `actual` and `expected`.
     *
     *     assert.equal(3, '3', '== coerces values to strings');
     *
     * @name equal
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Assert
     * @api public
     */

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

    /**
     * ### .notEqual(actual, expected, [message])
     *
     * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
     *
     *     assert.notEqual(3, 4, 'these numbers are not equal');
     *
     * @name notEqual
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Assert
     * @api public
     */

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

    /**
     * ### .strictEqual(actual, expected, [message])
     *
     * Asserts strict equality (`===`) of `actual` and `expected`.
     *
     *     assert.strictEqual(true, true, 'these booleans are strictly equal');
     *
     * @name strictEqual
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.strictEqual = (act, exp, msg) => void getAssertion(act, msg).to.equal(exp);

    /**
     * ### .notStrictEqual(actual, expected, [message])
     *
     * Asserts strict inequality (`!==`) of `actual` and `expected`.
     *
     *     assert.notStrictEqual(3, '3', 'no coercion for strict equality');
     *
     * @name notStrictEqual
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notStrictEqual = (act, exp, msg) => void getAssertion(act, msg).to.not.equal(exp);

    /**
     * ### .deepEqual(actual, expected, [message])
     *
     * Asserts that `actual` is deeply equal to `expected`.
     *
     *     assert.deepEqual({ tea: 'green' }, { tea: 'green' });
     *
     * @name deepEqual
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @alias deepStrictEqual
     * @namespace Assert
     * @api public
     */

    assert.deepEqual = assert.deepStrictEqual = (act, exp, msg) => void getAssertion(act, msg).to.eql(exp);

    /**
     * ### .notDeepEqual(actual, expected, [message])
     *
     * Assert that `actual` is not deeply equal to `expected`.
     *
     *     assert.notDeepEqual({ tea: 'green' }, { tea: 'jasmine' });
     *
     * @name notDeepEqual
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notDeepEqual = (act, exp, msg) => void getAssertion(act, msg).to.not.eql(exp);

    /**
    * ### .isAbove(valueToCheck, valueToBeAbove, [message])
    *
    * Asserts `valueToCheck` is strictly greater than (>) `valueToBeAbove`.
    *
    *     assert.isAbove(5, 2, '5 is strictly greater than 2');
    *
    * @name isAbove
    * @param {Mixed} valueToCheck
    * @param {Mixed} valueToBeAbove
    * @param {String} message
    * @namespace Assert
    * @api public
    */

    assert.isAbove = (val, abv, msg) => void getAssertion(val, msg).to.be.above(abv);

    /**
    * ### .isAtLeast(valueToCheck, valueToBeAtLeast, [message])
    *
    * Asserts `valueToCheck` is greater than or equal to (>=) `valueToBeAtLeast`.
    *
    *     assert.isAtLeast(5, 2, '5 is greater or equal to 2');
    *     assert.isAtLeast(3, 3, '3 is greater or equal to 3');
    *
    * @name isAtLeast
    * @param {Mixed} valueToCheck
    * @param {Mixed} valueToBeAtLeast
    * @param {String} message
    * @namespace Assert
    * @api public
    */

    assert.isAtLeast = (val, atlst, msg) => void getAssertion(val, msg).to.be.least(atlst);

    /**
    * ### .isBelow(valueToCheck, valueToBeBelow, [message])
    *
    * Asserts `valueToCheck` is strictly less than (<) `valueToBeBelow`.
    *
    *     assert.isBelow(3, 6, '3 is strictly less than 6');
    *
    * @name isBelow
    * @param {Mixed} valueToCheck
    * @param {Mixed} valueToBeBelow
    * @param {String} message
    * @namespace Assert
    * @api public
    */

    assert.isBelow = (val, blw, msg) => void getAssertion(val, msg).to.be.below(blw);

    /**
    * ### .isAtMost(valueToCheck, valueToBeAtMost, [message])
    *
    * Asserts `valueToCheck` is less than or equal to (<=) `valueToBeAtMost`.
    *
    *     assert.isAtMost(3, 6, '3 is less than or equal to 6');
    *     assert.isAtMost(4, 4, '4 is less than or equal to 4');
    *
    * @name isAtMost
    * @param {Mixed} valueToCheck
    * @param {Mixed} valueToBeAtMost
    * @param {String} message
    * @namespace Assert
    * @api public
    */

    assert.isAtMost = (val, atmst, msg) => void getAssertion(val, msg).to.be.most(atmst);

    /**
     * ### .isTrue(value, [message])
     *
     * Asserts that `value` is true.
     *
     *     var teaServed = true;
     *     assert.isTrue(teaServed, 'the tea has been served');
     *
     * @name isTrue
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isTrue = (val, msg) => void getAssertion(val, msg).is.true;

    /**
     * ### .isNotTrue(value, [message])
     *
     * Asserts that `value` is not true.
     *
     *     var tea = 'tasty tea';
     *     assert.isNotTrue(tea, 'great, time for tea!');
     *
     * @name isNotTrue
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNotTrue = (val, msg) => void getAssertion(val, msg).to.not.equal(true);

    /**
     * ### .isFalse(value, [message])
     *
     * Asserts that `value` is false.
     *
     *     var teaServed = false;
     *     assert.isFalse(teaServed, 'no tea yet? hmm...');
     *
     * @name isFalse
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isFalse = (val, msg) => void getAssertion(val, msg).is["false"];

    /**
     * ### .isNotFalse(value, [message])
     *
     * Asserts that `value` is not false.
     *
     *     var tea = 'tasty tea';
     *     assert.isNotFalse(tea, 'great, time for tea!');
     *
     * @name isNotFalse
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNotFalse = (val, msg) => void getAssertion(val, msg).to.not.equal(false);

    /**
     * ### .isNull(value, [message])
     *
     * Asserts that `value` is null.
     *
     *     assert.isNull(err, 'there was no error');
     *
     * @name isNull
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNull = (val, msg) => void getAssertion(val, msg).to.equal(null);

    /**
     * ### .isNotNull(value, [message])
     *
     * Asserts that `value` is not null.
     *
     *     var tea = 'tasty tea';
     *     assert.isNotNull(tea, 'great, time for tea!');
     *
     * @name isNotNull
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNotNull = (val, msg) => void getAssertion(val, msg).to.not.equal(null);

    /**
     * ### .isNaN
     *
     * Asserts that value is NaN.
     *
     *     assert.isNaN(NaN, 'NaN is NaN');
     *
     * @name isNaN
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNaN = (val, msg) => void getAssertion(val, msg).to.be.NaN;

    /**
     * ### .isNotNaN
     *
     * Asserts that value is not NaN.
     *
     *     assert.isNotNaN(4, '4 is not NaN');
     *
     * @name isNotNaN
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */
    assert.isNotNaN = (val, msg) => void getAssertion(val, msg).not.to.be.NaN;

    /**
     * ### .exists
     *
     * Asserts that the target is neither `null` nor `undefined`.
     *
     *     var foo = 'hi';
     *
     *     assert.exists(foo, 'foo is neither `null` nor `undefined`');
     *
     * @name exists
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.exists = (val, msg) => void getAssertion(val, msg).to.exist;

    /**
     * ### .notExists
     *
     * Asserts that the target is either `null` or `undefined`.
     *
     *     var bar = null
     *       , baz;
     *
     *     assert.notExists(bar);
     *     assert.notExists(baz, 'baz is either null or undefined');
     *
     * @name notExists
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notExists = (val, msg) => void getAssertion(val, msg).to.not.exist;

    /**
     * ### .isUndefined(value, [message])
     *
     * Asserts that `value` is `undefined`.
     *
     *     var tea;
     *     assert.isUndefined(tea, 'no tea defined');
     *
     * @name isUndefined
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isUndefined = (val, msg) => void getAssertion(val, msg).to.equal(undefined);

    /**
     * ### .isDefined(value, [message])
     *
     * Asserts that `value` is not `undefined`.
     *
     *     var tea = 'cup of tea';
     *     assert.isDefined(tea, 'tea has been defined');
     *
     * @name isDefined
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isDefined = (val, msg) => void getAssertion(val, msg).to.not.equal(undefined);

    /**
     * ### .isFunction(value, [message])
     *
     * Asserts that `value` is a function.
     *
     *     function serveTea() { return 'cup of tea'; };
     *     assert.isFunction(serveTea, 'great, we can have tea now');
     *
     * @name isFunction
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isFunction = (val, msg) => void getAssertion(val, msg).to.be.a("function");

    /**
     * ### .isNotFunction(value, [message])
     *
     * Asserts that `value` is _not_ a function.
     *
     *     var serveTea = [ 'heat', 'pour', 'sip' ];
     *     assert.isNotFunction(serveTea, 'great, we have listed the steps');
     *
     * @name isNotFunction
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNotFunction = (val, msg) => void getAssertion(val, msg).to.not.be.a("function");

    /**
     * ### .isObject(value, [message])
     *
     * Asserts that `value` is an object of type 'Object' (as revealed by `Object.prototype.toString`).
     * _The assertion does not match subclassed objects._
     *
     *     var selection = { name: 'f', serve: 'with spices' };
     *     assert.isObject(selection, 'tea selection is an object');
     *
     * @name isObject
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isObject = (val, msg) => void getAssertion(val, msg).to.be.a("object");

    /**
     * ### .isNotObject(value, [message])
     *
     * Asserts that `value` is _not_ an object of type 'Object' (as revealed by `Object.prototype.toString`).
     *
     *     var selection = 'tea'
     *     assert.isNotObject(selection, 'tea selection is not an object');
     *     assert.isNotObject(null, 'null is not an object');
     *
     * @name isNotObject
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNotObject = (val, msg) => void getAssertion(val, msg).to.not.be.a("object");

    /**
     * ### .isArray(value, [message])
     *
     * Asserts that `value` is an array.
     *
     *     var menu = [ 'green', 'tea', 'oolong' ];
     *     assert.isArray(menu, 'what kind of tea do we want?');
     *
     * @name isArray
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isArray = (val, msg) => void getAssertion(val, msg).to.be.an("array");

    /**
     * ### .isNotArray(value, [message])
     *
     * Asserts that `value` is _not_ an array.
     *
     *     var menu = 'green|tea|oolong';
     *     assert.isNotArray(menu, 'what kind of tea do we want?');
     *
     * @name isNotArray
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNotArray = (val, msg) => void getAssertion(val, msg).to.not.be.an("array");

    /**
     * ### .isString(value, [message])
     *
     * Asserts that `value` is a string.
     *
     *     var teaOrder = 'tea';
     *     assert.isString(teaOrder, 'order placed');
     *
     * @name isString
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isString = (val, msg) => void getAssertion(val, msg).to.be.a("string");

    /**
     * ### .isNotString(value, [message])
     *
     * Asserts that `value` is _not_ a string.
     *
     *     var teaOrder = 4;
     *     assert.isNotString(teaOrder, 'order placed');
     *
     * @name isNotString
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNotString = (val, msg) => void getAssertion(val, msg).to.not.be.a("string");

    /**
     * ### .isNumber(value, [message])
     *
     * Asserts that `value` is a number.
     *
     *     var cups = 2;
     *     assert.isNumber(cups, 'how many cups');
     *
     * @name isNumber
     * @param {Number} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNumber = (val, msg) => void getAssertion(val, msg).to.be.a("number");

    /**
     * ### .isNotNumber(value, [message])
     *
     * Asserts that `value` is _not_ a number.
     *
     *     var cups = '2 cups please';
     *     assert.isNotNumber(cups, 'how many cups');
     *
     * @name isNotNumber
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNotNumber = (val, msg) => void getAssertion(val, msg).to.not.be.a("number");

    /**
    * ### .isFinite(value, [message])
    *
    * Asserts that `value` is a finite number. Unlike `.isNumber`, this will fail for `NaN` and `Infinity`.
    *
    *     var cups = 2;
    *     assert.isFinite(cups, 'how many cups');
    *
    *     assert.isFinite(NaN); // throws
    *
    * @name isFinite
    * @param {Number} value
    * @param {String} message
    * @namespace Assert
    * @api public
    */

    assert.isFinite = (val, msg) => void getAssertion(val, msg).to.be.finite;

    /**
     * ### .isBoolean(value, [message])
     *
     * Asserts that `value` is a boolean.
     *
     *     var teaReady = true
     *       , teaServed = false;
     *
     *     assert.isBoolean(teaReady, 'is the tea ready');
     *     assert.isBoolean(teaServed, 'has tea been served');
     *
     * @name isBoolean
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isBoolean = (val, msg) => void getAssertion(val, msg).to.be.a("boolean");

    /**
     * ### .isNotBoolean(value, [message])
     *
     * Asserts that `value` is _not_ a boolean.
     *
     *     var teaReady = 'yep'
     *       , teaServed = 'nope';
     *
     *     assert.isNotBoolean(teaReady, 'is the tea ready');
     *     assert.isNotBoolean(teaServed, 'has tea been served');
     *
     * @name isNotBoolean
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.isNotBoolean = (val, msg) => void getAssertion(val, msg).to.not.be.a("boolean");

    /**
     * ### .typeOf(value, name, [message])
     *
     * Asserts that `value`'s type is `name`, as determined by
     * `Object.prototype.toString`.
     *
     *     assert.typeOf({ tea: 'tea' }, 'object', 'we have an object');
     *     assert.typeOf(['tea', 'jasmine'], 'array', 'we have an array');
     *     assert.typeOf('tea', 'string', 'we have a string');
     *     assert.typeOf(/tea/, 'regexp', 'we have a regular expression');
     *     assert.typeOf(null, 'null', 'we have a null');
     *     assert.typeOf(undefined, 'undefined', 'we have an undefined');
     *
     * @name typeOf
     * @param {Mixed} value
     * @param {String} name
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.typeOf = (val, type, msg) => void getAssertion(val, msg).to.be.a(type);

    /**
     * ### .notTypeOf(value, name, [message])
     *
     * Asserts that `value`'s type is _not_ `name`, as determined by
     * `Object.prototype.toString`.
     *
     *     assert.notTypeOf('tea', 'number', 'strings are not numbers');
     *
     * @name notTypeOf
     * @param {Mixed} value
     * @param {String} typeof name
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notTypeOf = (val, type, msg) => void getAssertion(val, msg).to.not.be.a(type);

    /**
     * ### .instanceOf(object, constructor, [message])
     *
     * Asserts that `value` is an instance of `constructor`.
     *
     *     var Tea = function (name) { this.name = name; }
     *       , tea = new Tea('tea');
     *
     *     assert.instanceOf(tea, Tea, 'tea is an instance of tea');
     *
     * @name instanceOf
     * @param {Object} object
     * @param {Constructor} constructor
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.instanceOf = (val, type, msg) => void getAssertion(val, msg).to.be.instanceOf(type);

    /**
     * ### .notInstanceOf(object, constructor, [message])
     *
     * Asserts `value` is not an instance of `constructor`.
     *
     *     var Tea = function (name) { this.name = name; }
     *       , tea = new String('tea');
     *
     *     assert.notInstanceOf(tea, Tea, 'tea is not an instance of tea');
     *
     * @name notInstanceOf
     * @param {Object} object
     * @param {Constructor} constructor
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notInstanceOf = (val, type, msg) => void getAssertion(val, msg).to.not.be.instanceOf(type);

    /**
     * ### .include(haystack, needle, [message])
     *
     * Asserts that `haystack` includes `needle`. Can be used to assert the
     * inclusion of a value in an array, a substring in a string, or a subset of
     * properties in an object.
     *
     *     assert.include([1,2,3], 2, 'array contains value');
     *     assert.include('foobar', 'foo', 'string contains substring');
     *     assert.include({ foo: 'bar', hello: 'universe' }, { foo: 'bar' }, 'object contains property');
     *
     * Strict equality (===) is used. When asserting the inclusion of a value in
     * an array, the array is searched for an element that's strictly equal to the
     * given value. When asserting a subset of properties in an object, the object
     * is searched for the given property keys, checking that each one is present
     * and stricty equal to the given property value. For instance:
     *
     *     var obj1 = {a: 1}
     *       , obj2 = {b: 2};
     *     assert.include([obj1, obj2], obj1);
     *     assert.include({foo: obj1, bar: obj2}, {foo: obj1});
     *     assert.include({foo: obj1, bar: obj2}, {foo: obj1, bar: obj2});
     *
     * @name include
     * @param {Array|String} haystack
     * @param {Mixed} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.include = (exp, inc, msg) => void getAssertion(exp, msg, assert.include).include(inc);

    /**
     * ### .notInclude(haystack, needle, [message])
     *
     * Asserts that `haystack` does not include `needle`. Can be used to assert
     * the absence of a value in an array, a substring in a string, or a subset of
     * properties in an object.
     *
     *     assert.notInclude([1,2,3], 4, 'array doesn't contain value');
     *     assert.notInclude('foobar', 'baz', 'string doesn't contain substring');
     *     assert.notInclude({ foo: 'bar', hello: 'universe' }, { foo: 'baz' }, 'object doesn't contain property');
     *
     * Strict equality (===) is used. When asserting the absence of a value in an
     * array, the array is searched to confirm the absence of an element that's
     * strictly equal to the given value. When asserting a subset of properties in
     * an object, the object is searched to confirm that at least one of the given
     * property keys is either not present or not strictly equal to the given
     * property value. For instance:
     *
     *     var obj1 = {a: 1}
     *       , obj2 = {b: 2};
     *     assert.notInclude([obj1, obj2], {a: 1});
     *     assert.notInclude({foo: obj1, bar: obj2}, {foo: {a: 1}});
     *     assert.notInclude({foo: obj1, bar: obj2}, {foo: obj1, bar: {b: 2}});
     *
     * @name notInclude
     * @param {Array|String} haystack
     * @param {Mixed} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notInclude = (exp, inc, msg) => void getAssertion(exp, msg, assert.notInclude).not.include(inc);

    /**
     * ### .deepInclude(haystack, needle, [message])
     *
     * Asserts that `haystack` includes `needle`. Can be used to assert the
     * inclusion of a value in an array or a subset of properties in an object.
     * Deep equality is used.
     *
     *     var obj1 = {a: 1}
     *       , obj2 = {b: 2};
     *     assert.deepInclude([obj1, obj2], {a: 1});
     *     assert.deepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}});
     *     assert.deepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}, bar: {b: 2}});
     *
     * @name deepInclude
     * @param {Array|String} haystack
     * @param {Mixed} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.deepInclude = (exp, inc, msg) => void getAssertion(exp, msg, assert.include).deep.include(inc);

    /**
     * ### .notDeepInclude(haystack, needle, [message])
     *
     * Asserts that `haystack` does not include `needle`. Can be used to assert
     * the absence of a value in an array or a subset of properties in an object.
     * Deep equality is used.
     *
     *     var obj1 = {a: 1}
     *       , obj2 = {b: 2};
     *     assert.notDeepInclude([obj1, obj2], {a: 9});
     *     assert.notDeepInclude({foo: obj1, bar: obj2}, {foo: {a: 9}});
     *     assert.notDeepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}, bar: {b: 9}});
     *
     * @name notDeepInclude
     * @param {Array|String} haystack
     * @param {Mixed} needle
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notDeepInclude = (exp, inc, msg) => void getAssertion(exp, msg, assert.notInclude).not.deep.include(inc);

    /**
     * ### .match(value, regexp, [message])
     *
     * Asserts that `value` matches the regular expression `regexp`.
     *
     *     assert.match('foobar', /^foo/, 'regexp matches');
     *
     * @name match
     * @param {Mixed} value
     * @param {RegExp} regexp
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.match = (exp, re, msg) => void getAssertion(exp, msg).to.match(re);

    /**
     * ### .notMatch(value, regexp, [message])
     *
     * Asserts that `value` does not match the regular expression `regexp`.
     *
     *     assert.notMatch('foobar', /^foo/, 'regexp does not match');
     *
     * @name notMatch
     * @param {Mixed} value
     * @param {RegExp} regexp
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notMatch = (exp, re, msg) => void getAssertion(exp, msg).to.not.match(re);

    /**
     * ### .property(object, property, [message])
     *
     * Asserts that `object` has a direct or inherited property named by
     * `property`.
     *
     *     assert.property({ tea: { green: 'matcha' }}, 'tea');
     *     assert.property({ tea: { green: 'matcha' }}, 'toString');
     *
     * @name property
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.property = (obj, prop, msg) => void getAssertion(obj, msg).to.have.property(prop);

    /**
     * ### .notProperty(object, property, [message])
     *
     * Asserts that `object` does _not_ have a direct or inherited property named
     * by `property`.
     *
     *     assert.notProperty({ tea: { green: 'matcha' }}, 'coffee');
     *
     * @name notProperty
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notProperty = (obj, prop, msg) => void getAssertion(obj, msg).to.not.have.property(prop);

    /**
     * ### .propertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a direct or inherited property named by
     * `property` with a value given by `value`. Uses a strict equality check
     * (===).
     *
     *     assert.propertyVal({ tea: 'is good' }, 'tea', 'is good');
     *
     * @name propertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.propertyVal = (obj, prop, val, msg) => void getAssertion(obj, msg).to.have.property(prop, val);

    /**
     * ### .notPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a direct or inherited property named
     * by `property` with value given by `value`. Uses a strict equality check
     * (===).
     *
     *     assert.notPropertyVal({ tea: 'is good' }, 'tea', 'is bad');
     *     assert.notPropertyVal({ tea: 'is good' }, 'coffee', 'is good');
     *
     * @name notPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notPropertyVal = (obj, prop, val, msg) => void getAssertion(obj, msg).to.not.have.property(prop, val);

    /**
     * ### .deepPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a direct or inherited property named by
     * `property` with a value given by `value`. Uses a deep equality check.
     *
     *     assert.deepPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'matcha' });
     *
     * @name deepPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.deepPropertyVal = (obj, prop, val, msg) => void getAssertion(obj, msg).to.have.deep.property(prop, val);

    /**
     * ### .notDeepPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a direct or inherited property named
     * by `property` with value given by `value`. Uses a deep equality check.
     *
     *     assert.notDeepPropertyVal({ tea: { green: 'matcha' } }, 'tea', { black: 'matcha' });
     *     assert.notDeepPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'oolong' });
     *     assert.notDeepPropertyVal({ tea: { green: 'matcha' } }, 'coffee', { green: 'matcha' });
     *
     * @name notDeepPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notDeepPropertyVal = (obj, prop, val, msg) => void getAssertion(obj, msg).to.not.have.deep.property(prop, val);

    /**
     * ### .ownProperty(object, property, [message])
     *
     * Asserts that `object` has a direct property named by `property`. Inherited
     * properties aren't checked.
     *
     *     assert.ownProperty({ tea: { green: 'matcha' }}, 'tea');
     *
     * @name ownProperty
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @api public
     */

    assert.ownProperty = (obj, prop, msg) => void getAssertion(obj, msg).to.have.own.property(prop);

    /**
     * ### .notOwnProperty(object, property, [message])
     *
     * Asserts that `object` does _not_ have a direct property named by
     * `property`. Inherited properties aren't checked.
     *
     *     assert.notOwnProperty({ tea: { green: 'matcha' }}, 'coffee');
     *     assert.notOwnProperty({}, 'toString');
     *
     * @name notOwnProperty
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @api public
     */

    assert.notOwnProperty = (obj, prop, msg) => void getAssertion(obj, msg).to.not.have.own.property(prop);

    /**
     * ### .ownPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a direct property named by `property` and a value
     * equal to the provided `value`. Uses a strict equality check (===).
     * Inherited properties aren't checked.
     *
     *     assert.ownPropertyVal({ coffee: 'is good'}, 'coffee', 'is good');
     *
     * @name ownPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @api public
     */

    assert.ownPropertyVal = (obj, prop, value, msg) => void getAssertion(obj, msg).to.have.own.property(prop, value);

    /**
     * ### .notOwnPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a direct property named by `property`
     * with a value equal to the provided `value`. Uses a strict equality check
     * (===). Inherited properties aren't checked.
     *
     *     assert.notOwnPropertyVal({ tea: 'is better'}, 'tea', 'is worse');
     *     assert.notOwnPropertyVal({}, 'toString', Object.prototype.toString);
     *
     * @name notOwnPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @api public
     */

    assert.notOwnPropertyVal = (obj, prop, value, msg) => void getAssertion(obj, msg).to.not.have.own.property(prop, value);

    /**
     * ### .deepOwnPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a direct property named by `property` and a value
     * equal to the provided `value`. Uses a deep equality check. Inherited
     * properties aren't checked.
     *
     *     assert.deepOwnPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'matcha' });
     *
     * @name deepOwnPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @api public
     */

    assert.deepOwnPropertyVal = (obj, prop, value, msg) => void getAssertion(obj, msg).to.have.deep.own.property(prop, value);

    /**
     * ### .notDeepOwnPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a direct property named by `property`
     * with a value equal to the provided `value`. Uses a deep equality check.
     * Inherited properties aren't checked.
     *
     *     assert.notDeepOwnPropertyVal({ tea: { green: 'matcha' } }, 'tea', { black: 'matcha' });
     *     assert.notDeepOwnPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'oolong' });
     *     assert.notDeepOwnPropertyVal({ tea: { green: 'matcha' } }, 'coffee', { green: 'matcha' });
     *     assert.notDeepOwnPropertyVal({}, 'toString', Object.prototype.toString);
     *
     * @name notDeepOwnPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @api public
     */

    assert.notDeepOwnPropertyVal = (obj, prop, value, msg) => void getAssertion(obj, msg).to.not.have.deep.own.property(prop, value);

    /**
     * ### .nestedProperty(object, property, [message])
     *
     * Asserts that `object` has a direct or inherited property named by
     * `property`, which can be a string using dot- and bracket-notation for
     * nested reference.
     *
     *     assert.nestedProperty({ tea: { green: 'matcha' }}, 'tea.green');
     *
     * @name nestedProperty
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.nestedProperty = (obj, prop, msg) => void getAssertion(obj, msg).to.have.nested.property(prop);

    /**
     * ### .notNestedProperty(object, property, [message])
     *
     * Asserts that `object` does _not_ have a property named by `property`, which
     * can be a string using dot- and bracket-notation for nested reference. The
     * property cannot exist on the object nor anywhere in its prototype chain.
     *
     *     assert.notNestedProperty({ tea: { green: 'matcha' }}, 'tea.oolong');
     *
     * @name notNestedProperty
     * @param {Object} object
     * @param {String} property
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notNestedProperty = (obj, prop, msg) => void getAssertion(obj, msg).to.not.have.nested.property(prop);

    /**
     * ### .nestedPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a property named by `property` with value given
     * by `value`. `property` can use dot- and bracket-notation for nested
     * reference. Uses a strict equality check (===).
     *
     *     assert.nestedPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'matcha');
     *
     * @name nestedPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.nestedPropertyVal = (obj, prop, val, msg) => void getAssertion(obj, msg).to.have.nested.property(prop, val);

    /**
     * ### .notNestedPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a property named by `property` with
     * value given by `value`. `property` can use dot- and bracket-notation for
     * nested reference. Uses a strict equality check (===).
     *
     *     assert.notNestedPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'konacha');
     *     assert.notNestedPropertyVal({ tea: { green: 'matcha' }}, 'coffee.green', 'matcha');
     *
     * @name notNestedPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notNestedPropertyVal = (obj, prop, val, msg) => void getAssertion(obj, msg).to.not.have.nested.property(prop, val);

    /**
     * ### .deepNestedPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` has a property named by `property` with a value given
     * by `value`. `property` can use dot- and bracket-notation for nested
     * reference. Uses a deep equality check.
     *
     *     assert.deepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.green', { matcha: 'yum' });
     *
     * @name deepNestedPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.deepNestedPropertyVal = (obj, prop, val, msg) => void getAssertion(obj, msg).to.have.deep.nested.property(prop, val);

    /**
     * ### .notDeepNestedPropertyVal(object, property, value, [message])
     *
     * Asserts that `object` does _not_ have a property named by `property` with
     * value given by `value`. `property` can use dot- and bracket-notation for
     * nested reference. Uses a deep equality check.
     *
     *     assert.notDeepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.green', { oolong: 'yum' });
     *     assert.notDeepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.green', { matcha: 'yuck' });
     *     assert.notDeepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.black', { matcha: 'yum' });
     *
     * @name notDeepNestedPropertyVal
     * @param {Object} object
     * @param {String} property
     * @param {Mixed} value
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notDeepNestedPropertyVal = (obj, prop, val, msg) => void getAssertion(obj, msg).to.not.have.deep.nested.property(prop, val);

    /**
     * ### .lengthOf(object, length, [message])
     *
     * Asserts that `object` has a `length` property with the expected value.
     *
     *     assert.lengthOf([1,2,3], 3, 'array has length of 3');
     *     assert.lengthOf('foobar', 6, 'string has length of 6');
     *
     * @name lengthOf
     * @param {Mixed} object
     * @param {Number} length
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.lengthOf = (exp, len, msg) => void getAssertion(exp, msg).to.have.length(len);

    /**
     * ### .hasAnyKeys(object, [keys], [message])
     *
     * Asserts that `object` has at least one of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.hasAnyKey({foo: 1, bar: 2, baz: 3}, ['foo', 'iDontExist', 'baz']);
     *     assert.hasAnyKey({foo: 1, bar: 2, baz: 3}, {foo: 30, iDontExist: 99, baz: 1337]);
     *     assert.hasAnyKey(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}, 'thisKeyDoesNotExist']);
     *     assert.hasAnyKey(new Set([{foo: 'bar'}, 'anotherKey'], [{foo: 'bar'}, 'thisKeyDoesNotExist']);
     *
     * @name hasAnyKeys
     * @param {Mixed} object
     * @param {Array|Object} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.hasAnyKeys = (obj, keys, msg) => void getAssertion(obj, msg).to.have.any.keys(keys);

    /**
     * ### .hasAllKeys(object, [keys], [message])
     *
     * Asserts that `object` has all and only all of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.hasAllKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'bar', 'baz']);
     *     assert.hasAllKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, bar: 99, baz: 1337]);
     *     assert.hasAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}, 'key']);
     *     assert.hasAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{foo: 'bar'}, 'anotherKey']);
     *
     * @name hasAllKeys
     * @param {Mixed} object
     * @param {String[]} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.hasAllKeys = (obj, keys, msg) => void getAssertion(obj, msg).to.have.all.keys(keys);

    /**
     * ### .containsAllKeys(object, [keys], [message])
     *
     * Asserts that `object` has all of the `keys` provided but may have more keys not listed.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'baz']);
     *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'bar', 'baz']);
     *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, baz: 1337});
     *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, bar: 99, baz: 1337});
     *     assert.containsAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}]);
     *     assert.containsAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}, 'key']);
     *     assert.containsAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{foo: 'bar'}]);
     *     assert.containsAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{foo: 'bar'}, 'anotherKey']);
     *
     * @name containsAllKeys
     * @param {Mixed} object
     * @param {String[]} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.containsAllKeys = (obj, keys, msg) => void getAssertion(obj, msg).to.contain.all.keys(keys);

    /**
     * ### .doesNotHaveAnyKeys(object, [keys], [message])
     *
     * Asserts that `object` has none of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.doesNotHaveAnyKeys({foo: 1, bar: 2, baz: 3}, ['one', 'two', 'example']);
     *     assert.doesNotHaveAnyKeys({foo: 1, bar: 2, baz: 3}, {one: 1, two: 2, example: 'foo'});
     *     assert.doesNotHaveAnyKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{one: 'two'}, 'example']);
     *     assert.doesNotHaveAnyKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{one: 'two'}, 'example']);
     *
     * @name doesNotHaveAnyKeys
     * @param {Mixed} object
     * @param {String[]} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.doesNotHaveAnyKeys = (obj, keys, msg) => void getAssertion(obj, msg).to.not.have.any.keys(keys);

    /**
     * ### .doesNotHaveAllKeys(object, [keys], [message])
     *
     * Asserts that `object` does not have at least one of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.doesNotHaveAllKeys({foo: 1, bar: 2, baz: 3}, ['one', 'two', 'example']);
     *     assert.doesNotHaveAllKeys({foo: 1, bar: 2, baz: 3}, {one: 1, two: 2, example: 'foo'});
     *     assert.doesNotHaveAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{one: 'two'}, 'example']);
     *     assert.doesNotHaveAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{one: 'two'}, 'example']);
     *
     * @name doesNotHaveAllKeys
     * @param {Mixed} object
     * @param {String[]} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.doesNotHaveAllKeys = (obj, keys, msg) => void getAssertion(obj, msg).to.not.have.all.keys(keys);

    /**
     * ### .hasAnyDeepKeys(object, [keys], [message])
     *
     * Asserts that `object` has at least one of the `keys` provided.
     * Since Sets and Maps can have objects as keys you can use this assertion to perform
     * a deep comparison.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     *     assert.hasAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {one: 'one'});
     *     assert.hasAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), [{one: 'one'}, {two: 'two'}]);
     *     assert.hasAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{one: 'one'}, {two: 'two'}]);
     *     assert.hasAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {one: 'one'});
     *     assert.hasAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {three: 'three'}]);
     *     assert.hasAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {two: 'two'}]);
     *
     * @name doesNotHaveAllKeys
     * @param {Mixed} object
     * @param {Array|Object} keys
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.hasAnyDeepKeys = (obj, keys, msg) => void getAssertion(obj, msg).to.have.any.deep.keys(keys);

    /**
      * ### .hasAllDeepKeys(object, [keys], [message])
      *
      * Asserts that `object` has all and only all of the `keys` provided.
      * Since Sets and Maps can have objects as keys you can use this assertion to perform
      * a deep comparison.
      * You can also provide a single object instead of a `keys` array and its keys
      * will be used as the expected set of keys.
      *
      *     assert.hasAllDeepKeys(new Map([[{one: 'one'}, 'valueOne']]), {one: 'one'});
      *     assert.hasAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{one: 'one'}, {two: 'two'}]);
      *     assert.hasAllDeepKeys(new Set([{one: 'one'}]), {one: 'one'});
      *     assert.hasAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {two: 'two'}]);
      *
      * @name hasAllDeepKeys
      * @param {Mixed} object
      * @param {Array|Object} keys
      * @param {String} message
      * @namespace Assert
      * @api public
      */

    assert.hasAllDeepKeys = (obj, keys, msg) => void getAssertion(obj, msg).to.have.all.deep.keys(keys);

    /**
      * ### .containsAllDeepKeys(object, [keys], [message])
      *
      * Asserts that `object` contains all of the `keys` provided.
      * Since Sets and Maps can have objects as keys you can use this assertion to perform
      * a deep comparison.
      * You can also provide a single object instead of a `keys` array and its keys
      * will be used as the expected set of keys.
      *
      *     assert.containsAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {one: 'one'});
      *     assert.containsAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{one: 'one'}, {two: 'two'}]);
      *     assert.containsAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {one: 'one'});
      *     assert.containsAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {two: 'two'}]);
      *
      * @name containsAllDeepKeys
      * @param {Mixed} object
      * @param {Array|Object} keys
      * @param {String} message
      * @namespace Assert
      * @api public
      */

    assert.containsAllDeepKeys = (obj, keys, msg) => void getAssertion(obj, msg).to.contain.all.deep.keys(keys);

    /**
      * ### .doesNotHaveAnyDeepKeys(object, [keys], [message])
      *
      * Asserts that `object` has none of the `keys` provided.
      * Since Sets and Maps can have objects as keys you can use this assertion to perform
      * a deep comparison.
      * You can also provide a single object instead of a `keys` array and its keys
      * will be used as the expected set of keys.
      *
      *     assert.doesNotHaveAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {thisDoesNot: 'exist'});
      *     assert.doesNotHaveAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{twenty: 'twenty'}, {fifty: 'fifty'}]);
      *     assert.doesNotHaveAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {twenty: 'twenty'});
      *     assert.doesNotHaveAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{twenty: 'twenty'}, {fifty: 'fifty'}]);
      *
      * @name doesNotHaveAnyDeepKeys
      * @param {Mixed} object
      * @param {Array|Object} keys
      * @param {String} message
      * @namespace Assert
      * @api public
      */

    assert.doesNotHaveAnyDeepKeys = (obj, keys, msg) => void getAssertion(obj, msg).to.not.have.any.deep.keys(keys);

    /**
      * ### .doesNotHaveAllDeepKeys(object, [keys], [message])
      *
      * Asserts that `object` does not have at least one of the `keys` provided.
      * Since Sets and Maps can have objects as keys you can use this assertion to perform
      * a deep comparison.
      * You can also provide a single object instead of a `keys` array and its keys
      * will be used as the expected set of keys.
      *
      *     assert.doesNotHaveAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {thisDoesNot: 'exist'});
      *     assert.doesNotHaveAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{twenty: 'twenty'}, {one: 'one'}]);
      *     assert.doesNotHaveAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {twenty: 'twenty'});
      *     assert.doesNotHaveAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {fifty: 'fifty'}]);
      *
      * @name doesNotHaveAllDeepKeys
      * @param {Mixed} object
      * @param {Array|Object} keys
      * @param {String} message
      * @namespace Assert
      * @api public
      */

    assert.doesNotHaveAllDeepKeys = (obj, keys, msg) => void getAssertion(obj, msg).to.not.have.all.deep.keys(keys);

    /**
      * ### .throws(fn, [errorLike/string/regexp], [string/regexp], [message])
      *
      * If `errorLike` is an `Error` constructor, asserts that `fn` will throw an error that is an
      * instance of `errorLike`.
      * If `errorLike` is an `Error` instance, asserts that the error thrown is the same
      * instance as `errorLike`.
      * If `errMsgMatcher` is provided, it also asserts that the error thrown will have a
      * message matching `errMsgMatcher`.
      *
      *     assert.throws(fn, 'function throws a reference error');
      *     assert.throws(fn, /function throws a reference error/);
      *     assert.throws(fn, ReferenceError);
      *     assert.throws(fn, errorInstance);
      *     assert.throws(fn, ReferenceError, 'Error thrown must be a ReferenceError and have this msg');
      *     assert.throws(fn, errorInstance, 'Error thrown must be the same errorInstance and have this msg');
      *     assert.throws(fn, ReferenceError, /Error thrown must be a ReferenceError and match this/);
      *     assert.throws(fn, errorInstance, /Error thrown must be the same errorInstance and match this/);
      *
      * @name throws
      * @alias throw
      * @alias Throw
      * @param {Function} fn
      * @param {ErrorConstructor|Error} errorLike
      * @param {RegExp|String} errMsgMatcher
      * @param {String} message
      * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
      * @namespace Assert
      * @api public
      */

    assert.throws = function (fn, errorLike, errMsgMatcher, msg) {
        if (is.string(errorLike) || is.regexp(errorLike)) {
            errMsgMatcher = errorLike;
            errorLike = null;
        }

        const assertErr = getAssertion(fn, msg).to.throw(errorLike, errMsgMatcher);
        return flag(assertErr, "object");
    };

    /**
     * ### .doesNotThrow(fn, [errorLike/string/regexp], [string/regexp], [message])
     *
     * If `errorLike` is an `Error` constructor, asserts that `fn` will _not_ throw an error that is an
     * instance of `errorLike`.
     * If `errorLike` is an `Error` instance, asserts that the error thrown is _not_ the same
     * instance as `errorLike`.
     * If `errMsgMatcher` is provided, it also asserts that the error thrown will _not_ have a
     * message matching `errMsgMatcher`.
     *
     *     assert.doesNotThrow(fn, 'Any Error thrown must not have this message');
     *     assert.doesNotThrow(fn, /Any Error thrown must not match this/);
     *     assert.doesNotThrow(fn, Error);
     *     assert.doesNotThrow(fn, errorInstance);
     *     assert.doesNotThrow(fn, Error, 'Error must not have this message');
     *     assert.doesNotThrow(fn, errorInstance, 'Error must not have this message');
     *     assert.doesNotThrow(fn, Error, /Error must not match this/);
     *     assert.doesNotThrow(fn, errorInstance, /Error must not match this/);
     *
     * @name doesNotThrow
     * @param {Function} fn
     * @param {ErrorConstructor} errorLike
     * @param {RegExp|String} errMsgMatcher
     * @param {String} message
     * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
     * @namespace Assert
     * @api public
     */

    assert.doesNotThrow = function (fn, errorLike, errMsgMatcher, msg) {
        if (is.string(errorLike) || is.regexp(errorLike)) {
            errMsgMatcher = errorLike;
            errorLike = null;
        }

        getAssertion(fn, msg).to.not.throw(errorLike, errMsgMatcher);
    };

    /**
     * ### .operator(val1, operator, val2, [message])
     *
     * Compares two values using `operator`.
     *
     *     assert.operator(1, '<', 2, 'everything is ok');
     *     assert.operator(1, '>', 2, 'this will fail');
     *
     * @name operator
     * @param {Mixed} val1
     * @param {String} operator
     * @param {Mixed} val2
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.operator = function (val, operator, val2, msg) {
        let ok;
        switch (operator) {
            case "==":
                ok = val == val2;  // eslint-disable-line eqeqeq
                break;
            case "===":
                ok = val === val2;
                break;
            case ">":
                ok = val > val2;
                break;
            case ">=":
                ok = val >= val2;
                break;
            case "<":
                ok = val < val2;
                break;
            case "<=":
                ok = val <= val2;
                break;
            case "!=":
                ok = val !== val2;
                break;
            case "!==":
                ok = val !== val2;
                break;
            default:
                throw new Error("Invalid operator \"" + operator + "\"");
        }
        const test = getAssertion(ok, msg);
        test.assert(
            true === flag(test, "object")
            , "expected " + util.inspect(val) + " to be " + operator + " " + util.inspect(val2)
            , "expected " + util.inspect(val) + " to not be " + operator + " " + util.inspect(val2));
    };

    /**
     * ### .closeTo(actual, expected, delta, [message])
     *
     * Asserts that the target is equal `expected`, to within a +/- `delta` range.
     *
     *     assert.closeTo(1.5, 1, 0.5, 'numbers are close');
     *
     * @name closeTo
     * @param {Number} actual
     * @param {Number} expected
     * @param {Number} delta
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.closeTo = (act, exp, delta, msg) => void getAssertion(act, msg).to.be.closeTo(exp, delta);

    /**
     * ### .approximately(actual, expected, delta, [message])
     *
     * Asserts that the target is equal `expected`, to within a +/- `delta` range.
     *
     *     assert.approximately(1.5, 1, 0.5, 'numbers are close');
     *
     * @name approximately
     * @param {Number} actual
     * @param {Number} expected
     * @param {Number} delta
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.approximately = (act, exp, delta, msg) => void getAssertion(act, msg).to.be.approximately(exp, delta);

    /**
     * ### .sameMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` have the same members in any order. Uses a
     * strict equality check (===).
     *
     *     assert.sameMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'same members');
     *
     * @name sameMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.sameMembers = (set1, set2, msg) => void getAssertion(set1, msg).to.have.same.members(set2);

    /**
     * ### .notSameMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` don't have the same members in any order.
     * Uses a strict equality check (===).
     *
     *     assert.notSameMembers([ 1, 2, 3 ], [ 5, 1, 3 ], 'not same members');
     *
     * @name notSameMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notSameMembers = (set1, set2, msg) => void getAssertion(set1, msg).to.not.have.same.members(set2);

    /**
     * ### .sameDeepMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` have the same members in any order. Uses a
     * deep equality check.
     *
     *     assert.sameDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [{ b: 2 }, { a: 1 }, { c: 3 }], 'same deep members');
     *
     * @name sameDeepMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.sameDeepMembers = (set1, set2, msg) => void getAssertion(set1, msg).to.have.same.deep.members(set2);

    /**
     * ### .notSameDeepMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` don't have the same members in any order.
     * Uses a deep equality check.
     *
     *     assert.notSameDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [{ b: 2 }, { a: 1 }, { f: 5 }], 'not same deep members');
     *
     * @name notSameDeepMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notSameDeepMembers = (set1, set2, msg) => void getAssertion(set1, msg).to.not.have.same.deep.members(set2);

    /**
     * ### .sameOrderedMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` have the same members in the same order.
     * Uses a strict equality check (===).
     *
     *     assert.sameOrderedMembers([ 1, 2, 3 ], [ 1, 2, 3 ], 'same ordered members');
     *
     * @name sameOrderedMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.sameOrderedMembers = (set1, set2, msg) => void getAssertion(set1, msg).to.have.same.ordered.members(set2);

    /**
     * ### .notSameOrderedMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` don't have the same members in the same
     * order. Uses a strict equality check (===).
     *
     *     assert.notSameOrderedMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'not same ordered members');
     *
     * @name notSameOrderedMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notSameOrderedMembers = (set1, set2, msg) => void getAssertion(set1, msg).to.not.have.same.ordered.members(set2);

    /**
     * ### .sameDeepOrderedMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` have the same members in the same order.
     * Uses a deep equality check.
     *
     * assert.sameDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { b: 2 }, { c: 3 } ], 'same deep ordered members');
     *
     * @name sameDeepOrderedMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.sameDeepOrderedMembers = (set1, set2, msg) => void getAssertion(set1, msg).to.have.same.deep.ordered.members(set2);

    /**
     * ### .notSameDeepOrderedMembers(set1, set2, [message])
     *
     * Asserts that `set1` and `set2` don't have the same members in the same
     * order. Uses a deep equality check.
     *
     * assert.notSameDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { b: 2 }, { z: 5 } ], 'not same deep ordered members');
     * assert.notSameDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { a: 1 }, { c: 3 } ], 'not same deep ordered members');
     *
     * @name notSameDeepOrderedMembers
     * @param {Array} set1
     * @param {Array} set2
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notSameDeepOrderedMembers = (set1, set2, msg) => void getAssertion(set1, msg).to.not.have.same.deep.ordered.members(set2);

    /**
     * ### .includeMembers(superset, subset, [message])
     *
     * Asserts that `subset` is included in `superset` in any order. Uses a
     * strict equality check (===). Duplicates are ignored.
     *
     *     assert.includeMembers([ 1, 2, 3 ], [ 2, 1, 2 ], 'include members');
     *
     * @name includeMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.includeMembers = (superset, subset, msg) => void getAssertion(superset, msg).to.include.members(subset);

    /**
     * ### .notIncludeMembers(superset, subset, [message])
     *
     * Asserts that `subset` isn't included in `superset` in any order. Uses a
     * strict equality check (===). Duplicates are ignored.
     *
     *     assert.notIncludeMembers([ 1, 2, 3 ], [ 5, 1 ], 'not include members');
     *
     * @name notIncludeMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notIncludeMembers = (superset, subset, msg) => void getAssertion(superset, msg).to.not.include.members(subset);

    /**
     * ### .includeDeepMembers(superset, subset, [message])
     *
     * Asserts that `subset` is included in `superset` in any order. Uses a deep
     * equality check. Duplicates are ignored.
     *
     *     assert.includeDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { a: 1 }, { b: 2 } ], 'include deep members');
     *
     * @name includeDeepMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.includeDeepMembers = (superset, subset, msg) => void getAssertion(superset, msg).to.include.deep.members(subset);

    /**
     * ### .notIncludeDeepMembers(superset, subset, [message])
     *
     * Asserts that `subset` isn't included in `superset` in any order. Uses a
     * deep equality check. Duplicates are ignored.
     *
     *     assert.notIncludeDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { f: 5 } ], 'not include deep members');
     *
     * @name notIncludeDeepMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notIncludeDeepMembers = (superset, subset, msg) => void getAssertion(superset, msg).to.not.include.deep.members(subset);

    /**
     * ### .includeOrderedMembers(superset, subset, [message])
     *
     * Asserts that `subset` is included in `superset` in the same order
     * beginning with the first element in `superset`. Uses a strict equality
     * check (===).
     *
     *     assert.includeOrderedMembers([ 1, 2, 3 ], [ 1, 2 ], 'include ordered members');
     *
     * @name includeOrderedMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.includeOrderedMembers = (superset, subset, msg) => void getAssertion(superset, msg).to.include.ordered.members(subset);

    /**
     * ### .notIncludeOrderedMembers(superset, subset, [message])
     *
     * Asserts that `subset` isn't included in `superset` in the same order
     * beginning with the first element in `superset`. Uses a strict equality
     * check (===).
     *
     *     assert.notIncludeOrderedMembers([ 1, 2, 3 ], [ 2, 1 ], 'not include ordered members');
     *     assert.notIncludeOrderedMembers([ 1, 2, 3 ], [ 2, 3 ], 'not include ordered members');
     *
     * @name notIncludeOrderedMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notIncludeOrderedMembers = (superset, subset, msg) => void getAssertion(superset, msg).to.not.include.ordered.members(subset);

    /**
     * ### .includeDeepOrderedMembers(superset, subset, [message])
     *
     * Asserts that `subset` is included in `superset` in the same order
     * beginning with the first element in `superset`. Uses a deep equality
     * check.
     *
     *     assert.includeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { b: 2 } ], 'include deep ordered members');
     *
     * @name includeDeepOrderedMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.includeDeepOrderedMembers = (superset, subset, msg) => void getAssertion(superset, msg).to.include.deep.ordered.members(subset);

    /**
     * ### .notIncludeDeepOrderedMembers(superset, subset, [message])
     *
     * Asserts that `subset` isn't included in `superset` in the same order
     * beginning with the first element in `superset`. Uses a deep equality
     * check.
     *
     *     assert.notIncludeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { f: 5 } ], 'not include deep ordered members');
     *     assert.notIncludeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { a: 1 } ], 'not include deep ordered members');
     *     assert.notIncludeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { c: 3 } ], 'not include deep ordered members');
     *
     * @name notIncludeDeepOrderedMembers
     * @param {Array} superset
     * @param {Array} subset
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.notIncludeDeepOrderedMembers = (superset, subset, msg) => void getAssertion(superset, msg).to.not.include.deep.ordered.members(subset);

    /**
     * ### .oneOf(inList, list, [message])
     *
     * Asserts that non-object, non-array value `inList` appears in the flat array `list`.
     *
     *     assert.oneOf(1, [ 2, 1 ], 'Not found in list');
     *
     * @name oneOf
     * @param {*} inList
     * @param {Array<*>} list
     * @param {String} message
     * @namespace Assert
     * @api public
     */

    assert.oneOf = (inList, list, msg) => void getAssertion(inList, msg).to.be.oneOf(list);

    /**
     * ### .changes(function, object, property, [message])
     *
     * Asserts that a function changes the value of a property.
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 22 };
     *     assert.changes(fn, obj, 'val');
     *
     * @name changes
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.changes = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && is.function(obj)) {
            msg = prop;
            prop = null;
        }

        getAssertion(fn, msg).to.change(obj, prop);
    };

    /**
    * ### .changesBy(function, object, property, delta, [message])
    *
    * Asserts that a function changes the value of a property by an amount (delta).
    *
    *     var obj = { val: 10 };
    *     var fn = function() { obj.val += 2 };
    *     assert.changesBy(fn, obj, 'val', 2);
    *
    * @name changesBy
    * @param {Function} modifier function
    * @param {Object} object or getter function
    * @param {String} property name _optional_
    * @param {Number} change amount (delta)
    * @param {String} message _optional_
    * @namespace Assert
    * @api public
    */

    assert.changesBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && is.function(obj)) {
            const tmpMsg = delta;
            delta = prop;
            msg = tmpMsg;
        } else if (arguments.length === 3) {
            delta = prop;
            prop = null;
        }

        getAssertion(fn, msg).to.change(obj, prop).by(delta);
    };

    /**
    * ### .doesNotChange(function, object, property, [message])
    *
    * Asserts that a function does not change the value of a property.
    *
    *     var obj = { val: 10 };
    *     var fn = function() { console.log('foo'); };
    *     assert.doesNotChange(fn, obj, 'val');
    *
    * @name doesNotChange
    * @param {Function} modifier function
    * @param {Object} object or getter function
    * @param {String} property name _optional_
    * @param {String} message _optional_
    * @namespace Assert
    * @api public
    */

    assert.doesNotChange = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && is.function(obj)) {
            msg = prop;
            prop = null;
        }

        return getAssertion(fn, msg).to.not.change(obj, prop);
    };

    /**
     * ### .changesButNotBy(function, object, property, delta, [message])
     *
     * Asserts that a function does not change the value of a property or of a function's return value by an amount (delta)
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val += 10 };
     *     assert.changesButNotBy(fn, obj, 'val', 5);
     *
     * @name changesButNotBy
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.changesButNotBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && is.function(obj)) {
            const tmpMsg = delta;
            delta = prop;
            msg = tmpMsg;
        } else if (arguments.length === 3) {
            delta = prop;
            prop = null;
        }

        getAssertion(fn, msg).to.change(obj, prop).but.not.by(delta);
    };

    /**
     * ### .increases(function, object, property, [message])
     *
     * Asserts that a function increases a numeric object property.
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 13 };
     *     assert.increases(fn, obj, 'val');
     *
     * @name increases
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.increases = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && is.function(obj)) {
            msg = prop;
            prop = null;
        }

        return getAssertion(fn, msg).to.increase(obj, prop);
    };

    /**
     * ### .increasesBy(function, object, property, delta, [message])
     *
     * Asserts that a function increases a numeric object property or a function's return value by an amount (delta).
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val += 10 };
     *     assert.increasesBy(fn, obj, 'val', 10);
     *
     * @name increasesBy
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.increasesBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && is.function(obj)) {
            const tmpMsg = delta;
            delta = prop;
            msg = tmpMsg;
        } else if (arguments.length === 3) {
            delta = prop;
            prop = null;
        }

        getAssertion(fn, msg).to.increase(obj, prop).by(delta);
    };

    /**
     * ### .doesNotIncrease(function, object, property, [message])
     *
     * Asserts that a function does not increase a numeric object property.
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 8 };
     *     assert.doesNotIncrease(fn, obj, 'val');
     *
     * @name doesNotIncrease
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.doesNotIncrease = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && is.function(obj)) {
            msg = prop;
            prop = null;
        }

        return getAssertion(fn, msg).to.not.increase(obj, prop);
    };

    /**
     * ### .increasesButNotBy(function, object, property, [message])
     *
     * Asserts that a function does not increase a numeric object property or function's return value by an amount (delta).
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 15 };
     *     assert.increasesButNotBy(fn, obj, 'val', 10);
     *
     * @name increasesButNotBy
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.increasesButNotBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && is.function(obj)) {
            const tmpMsg = delta;
            delta = prop;
            msg = tmpMsg;
        } else if (arguments.length === 3) {
            delta = prop;
            prop = null;
        }

        getAssertion(fn, msg).to.increase(obj, prop).but.not.by(delta);
    };

    /**
     * ### .decreases(function, object, property, [message])
     *
     * Asserts that a function decreases a numeric object property.
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 5 };
     *     assert.decreases(fn, obj, 'val');
     *
     * @name decreases
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.decreases = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && is.function(obj)) {
            msg = prop;
            prop = null;
        }

        return getAssertion(fn, msg).to.decrease(obj, prop);
    };

    /**
     * ### .decreasesBy(function, object, property, delta, [message])
     *
     * Asserts that a function decreases a numeric object property or a function's return value by an amount (delta)
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val -= 5 };
     *     assert.decreasesBy(fn, obj, 'val', 5);
     *
     * @name decreasesBy
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.decreasesBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && is.function(obj)) {
            const tmpMsg = delta;
            delta = prop;
            msg = tmpMsg;
        } else if (arguments.length === 3) {
            delta = prop;
            prop = null;
        }

        getAssertion(fn, msg).to.decrease(obj, prop).by(delta);
    };

    /**
     * ### .doesNotDecrease(function, object, property, [message])
     *
     * Asserts that a function does not decreases a numeric object property.
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 15 };
     *     assert.doesNotDecrease(fn, obj, 'val');
     *
     * @name doesNotDecrease
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.doesNotDecrease = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && is.function(obj)) {
            msg = prop;
            prop = null;
        }

        return getAssertion(fn, msg).to.not.decrease(obj, prop);
    };

    /**
     * ### .doesNotDecreaseBy(function, object, property, delta, [message])
     *
     * Asserts that a function does not decreases a numeric object property or a function's return value by an amount (delta)
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 5 };
     *     assert.doesNotDecreaseBy(fn, obj, 'val', 1);
     *
     * @name doesNotDecrease
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.doesNotDecreaseBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && is.function(obj)) {
            const tmpMsg = delta;
            delta = prop;
            msg = tmpMsg;
        } else if (arguments.length === 3) {
            delta = prop;
            prop = null;
        }

        return getAssertion(fn, msg).to.not.decrease(obj, prop).by(delta);
    };

    /**
     * ### .decreasesButNotBy(function, object, property, delta, [message])
     *
     * Asserts that a function does not decreases a numeric object property or a function's return value by an amount (delta)
     *
     *     var obj = { val: 10 };
     *     var fn = function() { obj.val = 5 };
     *     assert.decreasesButNotBy(fn, obj, 'val', 1);
     *
     * @name decreasesButNotBy
     * @param {Function} modifier function
     * @param {Object} object or getter function
     * @param {String} property name _optional_
     * @param {Number} change amount (delta)
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.decreasesButNotBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && is.function(obj)) {
            const tmpMsg = delta;
            delta = prop;
            msg = tmpMsg;
        } else if (arguments.length === 3) {
            delta = prop;
            prop = null;
        }

        getAssertion(fn, msg).to.decrease(obj, prop).but.not.by(delta);
    };

    /*!
     * ### .ifError(object)
     *
     * Asserts if value is not a false value, and throws if it is a true value.
     * This is added to allow for assert to be a drop-in replacement for Node's
     * assert class.
     *
     *     var err = new Error('I am a custom error');
     *     assert.ifError(err); // Rethrows err!
     *
     * @name ifError
     * @param {Object} object
     * @namespace Assert
     * @api public
     */

    assert.ifError = function (val) {
        if (val) {
            throw (val);
        }
    };

    /**
     * ### .isExtensible(object)
     *
     * Asserts that `object` is extensible (can have new properties added to it).
     *
     *     assert.isExtensible({});
     *
     * @name isExtensible
     * @alias extensible
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.isExtensible = (obj, msg) => void getAssertion(obj, msg).to.be.extensible;

    /**
     * ### .isNotExtensible(object)
     *
     * Asserts that `object` is _not_ extensible.
     *
     *     var nonExtensibleObject = Object.preventExtensions({});
     *     var sealedObject = Object.seal({});
     *     var frozenObject = Object.freeze({});
     *
     *     assert.isNotExtensible(nonExtensibleObject);
     *     assert.isNotExtensible(sealedObject);
     *     assert.isNotExtensible(frozenObject);
     *
     * @name isNotExtensible
     * @alias notExtensible
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.isNotExtensible = (obj, msg) => void getAssertion(obj, msg).to.not.be.extensible;

    /**
     * ### .isSealed(object)
     *
     * Asserts that `object` is sealed (cannot have new properties added to it
     * and its existing properties cannot be removed).
     *
     *     var sealedObject = Object.seal({});
     *     var frozenObject = Object.seal({});
     *
     *     assert.isSealed(sealedObject);
     *     assert.isSealed(frozenObject);
     *
     * @name isSealed
     * @alias sealed
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.isSealed = (obj, msg) => void getAssertion(obj, msg).to.be.sealed;

    /**
     * ### .isNotSealed(object)
     *
     * Asserts that `object` is _not_ sealed.
     *
     *     assert.isNotSealed({});
     *
     * @name isNotSealed
     * @alias notSealed
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.isNotSealed = (obj, msg) => void getAssertion(obj, msg).to.not.be.sealed;

    /**
     * ### .isFrozen(object)
     *
     * Asserts that `object` is frozen (cannot have new properties added to it
     * and its existing properties cannot be modified).
     *
     *     var frozenObject = Object.freeze({});
     *     assert.frozen(frozenObject);
     *
     * @name isFrozen
     * @alias frozen
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.isFrozen = (obj, msg) => void getAssertion(obj, msg).to.be.frozen;

    /**
     * ### .isNotFrozen(object)
     *
     * Asserts that `object` is _not_ frozen.
     *
     *     assert.isNotFrozen({});
     *
     * @name isNotFrozen
     * @alias notFrozen
     * @param {Object} object
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.isNotFrozen = (obj, msg) => void getAssertion(obj, msg).to.not.be.frozen;

    /**
     * ### .isEmpty(target)
     *
     * Asserts that the target does not contain any values.
     * For arrays and strings, it checks the `length` property.
     * For `Map` and `Set` instances, it checks the `size` property.
     * For non-function objects, it gets the count of own
     * enumerable string keys.
     *
     *     assert.isEmpty([]);
     *     assert.isEmpty('');
     *     assert.isEmpty(new Map);
     *     assert.isEmpty({});
     *
     * @name isEmpty
     * @alias empty
     * @param {Object|Array|String|Map|Set} target
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.isEmpty = (val, msg) => void getAssertion(val, msg).to.be.empty;

    /**
     * ### .isNotEmpty(target)
     *
     * Asserts that the target contains values.
     * For arrays and strings, it checks the `length` property.
     * For `Map` and `Set` instances, it checks the `size` property.
     * For non-function objects, it gets the count of own
     * enumerable string keys.
     *
     *     assert.isNotEmpty([1, 2]);
     *     assert.isNotEmpty('34');
     *     assert.isNotEmpty(new Set([5, 6]));
     *     assert.isNotEmpty({ key: 7 });
     *
     * @name isNotEmpty
     * @alias notEmpty
     * @param {Object|Array|String|Map|Set} target
     * @param {String} message _optional_
     * @namespace Assert
     * @api public
     */

    assert.isNotEmpty = (val, msg) => void getAssertion(val, msg).to.not.be.empty;

    /*!
     * Aliases.
     */
    const aliases = [
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
    ];
    for (const [name, alias] of aliases) {
        assert[alias] = assert[name];
    }
}