
const { std: { url: { parse, Url } }, is } = adone;

const fastparse = (str) => {
    if (!is.string(str) || str.charCodeAt(0) !== 0x2f /* / */) {
        return parse(str);
    }

    let pathname = str;
    let query = null;
    let search = null;

    // This takes the regexp from https://github.com/joyent/node/pull/7878
    // Which is /^(\/[^?#\s]*)(\?[^#\s]*)?$/
    // And unrolls it into a for loop
    for (let i = 1; i < str.length; i++) {
        switch (str.charCodeAt(i)) {
            case 0x3f: /* ?  */
                if (is.null(search)) {
                    pathname = str.substring(0, i);
                    query = str.substring(i + 1);
                    search = str.substring(i);
                }
                break;
            case 0x09: /* \t */
            case 0x0a: /* \n */
            case 0x0c: /* \f */
            case 0x0d: /* \r */
            case 0x20: /*    */
            case 0x23: /* #  */
            case 0xa0:
            case 0xfeff:
                return parse(str);
        }
    }

    const url = !is.undefined(Url)
        ? new Url()
        : {};
    url.path = str;
    url.href = str;
    url.pathname = pathname;
    url.query = query;
    url.search = search;

    return url;
};

const fresh = (url, parsedUrl) => is.object(parsedUrl) &&
                                  !is.null(parsedUrl) &&
                                  parsedUrl instanceof Url &&
                                  parsedUrl._raw === url;

const parseURL = (req) => {
    const { url } = req;

    if (is.undefined(url)) {
        // URL is undefined
        return;
    }

    let parsed = req._parsedUrl;

    if (fresh(url, parsed)) {
        // Return cached URL parse
        return parsed;
    }

    // Parse the URL
    parsed = fastparse(url);
    parsed._raw = url;
    req._parsedUrl = parsed;

    return parsed;
};

parseURL.original = (req) => {
    const { originalUrl: url } = req;

    if (!is.string(url)) {
        // Fallback
        return parseURL(req);
    }

    let parsed = req._parsedOriginalUrl;

    if (fresh(url, parsed)) {
        // Return cached URL parse
        return parsed;
    }

    // Parse the URL
    parsed = fastparse(url);
    parsed._raw = url;
    req._parsedOriginalUrl = parsed;

    return parsed;
};

export default parseURL;
