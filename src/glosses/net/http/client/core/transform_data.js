import adone from "adone";

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
export default function transformData(data, headers, fns) {
    if (adone.is.null(fns) || adone.is.undefined(fns)) {
        return data;
    }
    fns = adone.util.arrify(fns);
    for (const fn of fns) {
        data = fn(data, headers);
    }
    return data;
}
