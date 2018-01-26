const {
    is,
    util: { querystring: qs }
} = adone;

const deepEqualExtended = (spec, body) => {
    if (spec && spec.constructor === RegExp) {
        return spec.test(body);
    }
    if (spec && (spec.constructor === Object || spec.constructor === Array) && body) {
        const keys = Object.keys(spec);
        const bodyKeys = Object.keys(body);
        if (keys.length !== bodyKeys.length) {
            return false;
        }
        for (let i = 0; i < keys.length; i++) {
            if (!deepEqualExtended(spec[keys[i]], body[keys[i]])) {
                return false;
            }
        }
        return true;
    }
    return is.deepEqual(spec, body);
};


export default function matchBody(spec, body) {
    if (is.undefined(spec)) {
        return true;
    }
    const options = this || {};

    if (is.buffer(body)) {
        body = body.toString();
    }

    const contentType = options.headers && (options.headers["Content-Type"] ||
        options.headers["content-type"]);

    const isMultipart = contentType && contentType.toString().match(/multipart/);

    // try to transform body to json
    let json;
    if (is.object(spec)) {
        try {
            json = JSON.parse(body);
        } catch (err) {
            //
        }
        if (!is.undefined(json)) {
            body = json;
        } else {
            if (contentType && contentType.toString().match(/application\/x-www-form-urlencoded/)) {
                body = qs.parse(body);
            }
        }
    }

    if (is.function(spec)) {
        return spec.call(this, body);
    }

    //strip line endings from both so that we get a match no matter what OS we are running on
    //if Content-Type does not contains 'multipart'
    if (!isMultipart && is.string(body)) {
        body = body.replace(/\r?\n|\r/g, "");
    }

    if (spec instanceof RegExp) {
        if (is.string(body)) {
            return body.match(spec);
        }
        return qs.stringify(body).match(spec);

    }

    if (!isMultipart && is.string(spec)) {
        spec = spec.replace(/\r?\n|\r/g, "");
    }

    return deepEqualExtended(spec, body);
}
