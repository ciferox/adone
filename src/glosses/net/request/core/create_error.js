import adone from "adone";

const imports = adone.lazify({
    enhanceError: "./enhance_error"
}, null, require);

/**
 * Create an Error with the specified message, config, error code, and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 @ @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
export default function createError(message, config, code, response) {
    const error = new Error(message);
    return imports.enhanceError(error, config, code, response);
}
