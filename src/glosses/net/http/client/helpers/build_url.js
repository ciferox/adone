

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
export default function buildURL(url, params, paramsSerializer) {
    if (!params) {
        return url;
    }

    let serializedParams;
    if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
    } else {
        serializedParams = adone.std.querystring.encode(params);
    }

    if (serializedParams) {
        url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
    }

    return url;
}
