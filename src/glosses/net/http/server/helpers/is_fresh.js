const CACHE_CONTROL_NO_CACHE_REGEXP = /(?:^|,)\s*?no-cache\s*?(?:,|$)/;
const TOKEN_LIST_REGEXP = / *, */;

const isFresh = (reqHeaders, resHeaders) => {
    // fields
    const modifiedSince = reqHeaders["if-modified-since"];
    const noneMatch = reqHeaders["if-none-match"];

    // unconditional request
    if (!modifiedSince && !noneMatch) {
        return false;
    }

    // Always return stale when Cache-Control: no-cache
    // to support end-to-end reload requests
    // https://tools.ietf.org/html/rfc2616#section-14.9.4
    const cacheControl = reqHeaders["cache-control"];
    if (cacheControl && CACHE_CONTROL_NO_CACHE_REGEXP.test(cacheControl)) {
        return false;
    }

    // if-none-match
    if (noneMatch && noneMatch !== "*") {
        const etag = resHeaders.etag;
        const etagStale = !etag || noneMatch.split(TOKEN_LIST_REGEXP).every((match) => {
            return match !== etag && match !== `W/${etag}` && `W/${match}` !== etag;
        });

        if (etagStale) {
            return false;
        }
    }

    // if-modified-since
    if (modifiedSince) {
        const lastModified = resHeaders["last-modified"];
        const modifiedStale = !lastModified || Date.parse(lastModified) > Date.parse(modifiedSince);

        if (modifiedStale) {
            return false;
        }
    }

    return true;
};

export default isFresh;
