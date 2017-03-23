/*!
 * Flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */
import inspect from "./inspect";
import config from "../config";

/**
 * ### .objDisplay (object)
 *
 * Determines if an object or an array matches
 * criteria to be inspected in-line for error
 * messages or should be truncated.
 *
 * @param {Mixed} javascript object to inspect
 * @name objDisplay
 * @namespace Utils
 * @api public
 */

export default function (obj) {
    const str = inspect(obj);
    const type = Object.prototype.toString.call(obj);

    if (config.truncateThreshold && str.length >= config.truncateThreshold) {
        if (type === "[object Function]") {
            return !obj.name || obj.name === ""
                ? "[Function]"
                : "[Function: " + obj.name + "]";
        } else if (type === "[object Array]") {
            return "[ Array(" + obj.length + ") ]";
        } else if (type === "[object Object]") {
            const keys = Object.keys(obj);
            const kstr = keys.length > 2
                    ? keys.splice(0, 2).join(", ") + ", ..."
                    : keys.join(", ");
            return "{ Object (" + kstr + ") }";
        } else {
            return str;
        }
    } else {
        return str;
    }
}