/*!
 * addProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */
import * as $assert from "../..";
import flag from "./flag";
import transferFlags from "./transferFlags";

/**
 * ### addProperty (ctx, name, getter)
 *
 * Adds a property to the prototype of an object.
 *
 *     utils.addProperty(assert.Assertion.prototype, 'foo', function () {
 *       var obj = utils.flag(this, 'object');
 *       assert.getAssertion(obj).to.be.instanceof(Foo);
 *     });
 *
 * Can also be accessed directly from `assert.Assertion`.
 *
 *     assert.Assertion.addProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.foo;
 *
 * @param {Object} ctx object to which the property is added
 * @param {String} name of property to add
 * @param {Function} getter function to be used for name
 * @namespace Utils
 * @name addProperty
 * @api public
 */

export default function (ctx, name, getter = new Function()) {
    Object.defineProperty(ctx, name, {
        get: function addProperty() {
            const keep_ssfi = flag(this, "keep_ssfi");
            const old_ssfi = flag(this, "ssfi");
            if (!keep_ssfi && old_ssfi)
                flag(this, "ssfi", addProperty);

            const result = getter.call(this);
            if (result !== undefined)
                return result;

            const newAssertion = $assert.getAssertion();
            transferFlags(this, newAssertion);
            return newAssertion;
        },
        configurable: true
    });
}