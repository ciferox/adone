const imports = adone.lazify({
    createError: "./create_error"
}, null, require);

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
export default function settle(resolve, reject, response) {
    const validateStatus = response.config.validateStatus;
    // Note: status is not exposed by XDomainRequest
    if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
    } else {
        reject(imports.createError(
            `Request failed with status code ${response.status}`,
            response.config,
            null,
            response
        ));
    }
}
