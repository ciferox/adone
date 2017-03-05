/*!
 * test utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

import flag from "./flag";

/**
 * # test(object, expression)
 *
 * Test and object for expression.
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} assert.Assertion.prototype.assert arguments
 * @namespace Utils
 * @name test
 */

export default function (obj, args) {
    const negate = flag(obj, "negate");
    const expr = args[0];
    return negate ? !expr : expr;
}
