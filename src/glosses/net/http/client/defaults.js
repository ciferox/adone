

const DEFAULT_CONTENT_TYPE = {
    "Content-Type": "application/x-www-form-urlencoded"
};

function setContentTypeIfUnset(headers, value) {
    if (!adone.is.undefined(headers) && adone.is.undefined(headers["Content-Type"])) {
        headers["Content-Type"] = value;
    }
}

function normalizeHeaderName(headers = {}, normalizedName = null) {
    for (const name of Object.keys(headers)) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
            headers[normalizedName] = headers[name];
            delete headers[name];
        }
    }
}

const adapters = adone.lazify({
    http: "./adapters/http"
}, null, require);

const getDefaultAdapter = () => adapters.http;

const defaults = {
    adapter: getDefaultAdapter(),

    transformRequest: [(data, headers) => {
        normalizeHeaderName(headers, "Content-Type");
        if (adone.is.arrayBuffer(data) || adone.is.stream(data)) {
            return data;
        }
        if (adone.is.arrayBufferView(data)) {
            return data.buffer;
        }
        if (adone.is.object(data)) {
            setContentTypeIfUnset(headers, "application/json;charset=utf-8");
            return JSON.stringify(data);
        }
        return data;
    }],

    transformResponse: [(data) => {
        /*eslint no-param-reassign:0*/
        if (adone.is.string(data)) {  // TODO: check content-type?
            try {
                data = JSON.parse(data);
            } catch (e) { /* Ignore */ }
        }
        return data;
    }],

    timeout: 0,

    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",

    maxContentLength: -1,

    validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
    }
};

defaults.headers = {
    common: {
        Accept: "application/json, text/plain, */*"
    }
};

for (const method of ["delete", "get", "head"]) {
    defaults.headers[method] = {};
}

for (const method of ["post", "put", "patch"]) {
    defaults.headers[method] = adone.vendor.lodash.merge({}, DEFAULT_CONTENT_TYPE);
}

export default defaults;
