
const { std: { url: { parse, Url } }, is } = adone;

const simplePathRegExp = /^(\/\/?(?!\/)[^?#\s]*)(\?[^#\s]*)?$/;

const fastparse = (str) => {
    if (is.string(str)) {
        // Try fast path regexp
        const simplePath = simplePathRegExp.exec(str);
        if (simplePath) {
            // Construct simple URL
            const pathname = simplePath[1];
            const search = simplePath[2] || null;
            const url = new Url();
            url.path = str;
            url.href = str;
            url.pathname = pathname;
            url.search = search;
            url.query = search && search.substr(1);
            return url;
        }
    }

    return parse(str);
};

const fresh = (url, parsedUrl) => is.object(parsedUrl) && !is.null(parsedUrl) && parsedUrl instanceof Url && parsedUrl._raw === url;

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
