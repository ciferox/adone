/*!
 * message composition utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */


import flag from "./flag";
import getActual from "./getActual";
import objDisplay from "./objDisplay";

/**
 * ### .getMessage(object, message, negateMessage)
 *
 * Construct the error message based on flags
 * and template tags. Template tags will return
 * a stringified inspection of the object referenced.
 *
 * Message template tags:
 * - `#{this}` current asserted object
 * - `#{act}` actual value
 * - `#{exp}` expected value
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} assert.Assertion.prototype.assert arguments
 * @namespace Utils
 * @name getMessage
 * @api public
 */

export default function (obj, args) {
    const negate = flag(obj, "negate");
    const val = flag(obj, "object");
    const expected = args[3];
    const actual = getActual(obj, args);
    let msg = negate ? args[2] : args[1];
    const flagMsg = flag(obj, "message");

    if (adone.is.function(msg)) {
        msg = msg();
    }
    msg = msg || "";
    msg = msg
        .replace(/#\{this\}/g, () => objDisplay(val))
        .replace(/#\{act\}/g, () => objDisplay(actual))
        .replace(/#\{exp\}/g, () => objDisplay(expected));

    return flagMsg ? `${flagMsg}: ${msg}` : msg;
}
