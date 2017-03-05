/**
 * Parse extensions header value
 */
export function parse(value) {
    value = value || "";

    const extensions = {};

    value.split(",").forEach(function (v) {
        const params = v.split(";");
        const token = params.shift().trim();
        const paramsList = extensions[token] = extensions[token] || [];
        const parsedParams = {};

        params.forEach(function (param) {
            const parts = param.trim().split("=");
            const key = parts[0];
            let value = parts[1];
            if (value === undefined) {
                value = true;
            } else {
                // unquote value
                if (value[0] === "\"") {
                    value = value.slice(1);
                }
                if (value[value.length - 1] === "\"") {
                    value = value.slice(0, value.length - 1);
                }
            }
            (parsedParams[key] = parsedParams[key] || []).push(value);
        });

        paramsList.push(parsedParams);
    });

    return extensions;
}

/**
 * Format extensions header value
 */
export function format(value) {
    return Object.keys(value).map(function (token) {
        let paramsList = value[token];
        if (!Array.isArray(paramsList)) {
            paramsList = [paramsList];
        }
        return paramsList.map(function (params) {
            return [token].concat(Object.keys(params).map(function (k) {
                let p = params[k];
                if (!Array.isArray(p)) p = [p];
                return p.map(function (v) {
                    return v === true ? k : k + "=" + v;
                }).join("; ");
            })).join("; ");
        }).join(", ");
    }).join(", ");
}
