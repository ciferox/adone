/*!
 * message composition utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */
const { is, assertion: $assert } = adone;
const { __: { util } } = $assert;

export default function getMessage(obj, args) {
    const negate = util.flag(obj, "negate");
    const val = util.flag(obj, "object");
    const expected = args[3];
    const actual = util.getActual(obj, args);
    let msg = negate ? args[2] : args[1];
    const flagMsg = util.flag(obj, "message");

    if (is.function(msg)) {
        msg = msg();
    }
    msg = msg || "";
    msg = msg
        .replace(/#\{this\}/g, () => {
            return util.objDisplay(val);
        })
        .replace(/#\{act\}/g, () => {
            return util.objDisplay(actual);
        })
        .replace(/#\{exp\}/g, () => {
            return util.objDisplay(expected);
        });

    return flagMsg ? `${flagMsg}: ${msg}` : msg;
}
