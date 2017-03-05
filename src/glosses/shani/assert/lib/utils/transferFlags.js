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

export default function (assertion, object, includeAll) {
    const f = assertion[flags] || (assertion[flags] = Object.create(null));

    if (!object[flags]) {
        object[flags] = Object.create(null);
    }

    includeAll = arguments.length === 3 ? includeAll : true;

    for (const flag in f) {
        if (includeAll ||
            (flag !== "object" && flag !== "ssfi" && flag !== "message")) {
            object[flags][flag] = f[flag];
        }
    }
}
