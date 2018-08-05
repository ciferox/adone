/**
 * Normalizes our expected stringified form of a function across versions of node
 * @param {Function} fn The function to stringify
 */
export const normalizedFunctionString = (fn) => fn.toString().replace("function(", "function (");

