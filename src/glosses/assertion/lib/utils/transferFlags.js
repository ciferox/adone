/*!
 * transferFlags utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### transferFlags(assertion, object, includeAll = true)
 *
 * Transfer all the flags for `assertion` to `object`. If
 * `includeAll` is set to `false`, then the base
 * assertion flags (namely `object`, `ssfi`, and `message`)
 * will not be transferred.
 *
 *
 *     var newAssertion = getAssertion();
 *     utils.transferFlags(assertion, newAssertion);
 *
 *     var anotherAsseriton = getAssertion(myObj);
 *     utils.transferFlags(assertion, anotherAssertion, false);
 *
 * @param {Assertion} assertion the assertion to transfer the flags from
 * @param {Object} object the object to transfer the flags to; usually a new assertion
 * @param {Boolean} includeAll
 * @namespace Utils
 * @name transferFlags
 * @api private
 */

const flags = Symbol.for("shani:assert:flags");

export default function (assertion, object, includeAll = true) {
    const f = assertion[flags] || (assertion[flags] = Object.create(null));

    if (!object[flags]) {
        object[flags] = Object.create(null);
    }

    const tmp = {};

    if (!includeAll) {
        // omg
        tmp.ssfi = assertion[flags].ssfi;
        tmp.object = assertion[flags].object;
        tmp.message = assertion[flags].message;
    }

    object[flags] = Object.create(f);

    if (!includeAll) {
        // omg
        object[flags].ssfi = tmp.ssfi;
        object[flags].object = tmp.object;
        object[flags].message = tmp.message;
    }
}
