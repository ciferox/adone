/**
 * !
 * Module dependencies
 */

const flag = require("./flag");
const getActual = require("./get_actual");
const objDisplay = require("./obj_display");

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
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 * @namespace Utils
 * @name getMessage
 * @api public
 */

module.exports = function getMessage(obj, args) {
    const negate = flag(obj, "negate");
    const val = flag(obj, "object");
    const expected = args[3];
    const actual = getActual(obj, args);
    let msg = negate ? args[2] : args[1];
    const flagMsg = flag(obj, "message");

    // eslint-disable-next-line adone/no-typeof
    if (typeof msg === "function") {
        msg = msg();
    }
    msg = msg || "";
    msg = msg
        .replace(/#\{this\}/g, () => {
            return objDisplay(val);
        })
        .replace(/#\{act\}/g, () => {
            return objDisplay(actual);
        })
        .replace(/#\{exp\}/g, () => {
            return objDisplay(expected);
        });

    return flagMsg ? `${flagMsg}: ${msg}` : msg;
};
