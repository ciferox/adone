const {
    is,
    util
} = adone;

/**
 * Normalizes the request options so that it always has `host` property.
 *
 * @param  {Object} options - a parsed options object of the request
 */
export const normalizeRequestOptions = (options) => {
    options.proto = options.proto || (options._https_ ? "https" : "http");
    options.port = options.port || ((options.proto === "http") ? 80 : 443);
    if (options.host) {
        if (!options.hostname) {
            if (options.host.split(":").length === 2) {
                options.hostname = options.host.split(":")[0];
            } else {
                options.hostname = options.host;
            }
        }
    }
    options.host = `${options.hostname || "localhost"}:${options.port}`;

    /// lowercase host names
    ["hostname", "host"].forEach((attr) => {
        if (options[attr]) {
            options[attr] = options[attr].toLowerCase();
        }
    });

    return options;
};

/**
 * Returns true if the data contained in buffer is binary which in this case means
 * that it cannot be reconstructed from its utf8 representation.
 *
 * @param  {Object} buffer - a Buffer object
 */
export const isBinaryBuffer = (buffer) => {

    if (!is.buffer(buffer)) {
        return false;
    }

    //  Test if the buffer can be reconstructed verbatim from its utf8 encoding.
    const utfEncodedBuffer = buffer.toString("utf8");
    const reconstructedBuffer = Buffer.from(utfEncodedBuffer, "utf8");
    const compareBuffers = (lhs, rhs) => {
        if (lhs.length !== rhs.length) {
            return false;
        }

        for (let i = 0; i < lhs.length; ++i) {
            if (lhs[i] !== rhs[i]) {
                return false;
            }
        }

        return true;
    };

    //  If the buffers are *not* equal then this is a "binary buffer"
    //  meaning that it cannot be faitfully represented in utf8.
    return !compareBuffers(buffer, reconstructedBuffer);

};

/**
 * If the chunks are Buffer objects then it returns a single Buffer object with the data from all the chunks.
 * If the chunks are strings then it returns a single string value with data from all the chunks.
 *
 * @param  {Array} chunks - an array of Buffer objects or strings
 */
export const mergeChunks = (chunks) => {

    if (chunks.length === 0) {
        return Buffer.allocUnsafe(0);
    }

    //  We assume that all chunks are Buffer objects if the first is buffer object.
    const areBuffers = is.buffer(chunks[0]);

    if (!areBuffers) {
        //  When the chunks are not buffers we assume that they are strings.
        return chunks.join("");
    }

    //  Merge all the buffers into a single Buffer object.
    return Buffer.concat(chunks);

};

//  Array where all information about all the overridden requests are held.
let requestOverride = {};

/**
 * Overrides the current `request` function of `http` and `https` modules with
 * our own version which intercepts issues HTTP/HTTPS requests and forwards them
 * to the given `newRequest` function.
 *
 * @param  {Function} newRequest - a function handling requests; it accepts four arguments:
 *   - proto - a string with the overridden module's protocol name (either `http` or `https`)
 *   - overriddenRequest - the overridden module's request function already bound to module's object
 *   - options - the options of the issued request
 *   - callback - the callback of the issued request
 */
export const overrideRequests = (newRequest) => {
    ["http", "https"].forEach((proto) => {
        const moduleName = proto; // 1 to 1 match of protocol and module is fortunate :)
        const module = adone.std[moduleName];
        const overriddenRequest = module.request;
        const overriddenGet = module.get;

        if (requestOverride[moduleName]) {
            throw new Error(`Module's request already overridden for ${moduleName} protocol.`);
        }

        //  Store the properties of the overridden request so that it can be restored later on.
        requestOverride[moduleName] = {
            module,
            request: overriddenRequest,
            get: overriddenGet
        };

        module.request = (options, callback) => {
            return newRequest(proto, overriddenRequest.bind(module), options, callback);
        };

        if (adone.semver.satisfies(process.version, ">=8")) {
            module.get = (options, callback) => {
                const req = newRequest(proto, overriddenRequest.bind(module), options, callback);
                req.end();
                return req;
            };
        }
    });
};

/**
 * Restores `request` function of `http` and `https` modules to values they
 * held before they were overridden by us.
 */
export const restoreOverriddenRequests = () => {
    for (const override of Object.values(requestOverride)) {
        if (override) {
            override.module.request = override.request;
            override.module.get = override.get;
        }
    }
    requestOverride = {};
};

/**
 * Get high level information about request as string
 * @param  {Object} options
 * @param  {string} options.method
 * @param  {string} options.port
 * @param  {string} options.proto
 * @param  {string} options.hostname
 * @param  {string} options.path
 * @param  {Object} options.headers
 * @param  {string|object} body
 * @return {string}
 */
export const stringifyRequest = (options, body) => {
    const method = options.method || "GET";

    let port = Number(options.port);

    if (!port) {
        port = options.proto === "https" ? 443 : 80;
    }

    if (options.proto === "https" && port === 443 ||
        options.proto === "http" && port === 80) {
        port = "";
    }

    if (port) {
        port = `:${port}`;
    }

    const path = options.path ? options.path : "";

    const log = {
        method,
        url: `${options.proto}://${options.hostname}${port}${path}`,
        headers: options.headers
    };

    if (body) {
        log.body = body;
    }

    return JSON.stringify(log, null, 2);
};

export const isContentEncoded = (headers) => {
    const contentEncoding = is.object(headers) && headers["content-encoding"];
    return is.string(contentEncoding) && contentEncoding !== "";
};

export const contentEncoding = (headers, encoder) => {
    const contentEncoding = is.object(headers) && headers["content-encoding"];
    return contentEncoding === encoder;
};

export const isJSONContent = (headers) => {
    let contentType = is.object(headers) && headers["content-type"];
    if (is.array(contentType)) {
        contentType = contentType[0];
    }
    contentType = (contentType || "").toLocaleLowerCase();

    return contentType.startsWith("application/json");
};

export const headersFieldNamesToLowerCase = (headers) => {
    if (!is.object(headers)) {
        return headers;
    }

    //  For each key in the headers, delete its value and reinsert it with lower-case key.
    //  Keys represent headers field names.
    const lowerCaseHeaders = {};
    for (const [fieldName, fieldVal] of Object.entries(headers)) {
        const lowerCaseFieldName = fieldName.toLowerCase();
        if (!is.undefined(lowerCaseHeaders[lowerCaseFieldName])) {
            throw new Error(`Failed to convert header keys to lower case due to field name conflict: ${lowerCaseFieldName}`);
        }
        lowerCaseHeaders[lowerCaseFieldName] = fieldVal;
    }

    return lowerCaseHeaders;
};

/**
 * @param {string[]} headers
 */
export const headersFieldsArrayToLowerCase = (headers) => {
    return util.unique(headers.map((fieldName) => {
        return fieldName.toLowerCase();
    }));
};

export const headersArrayToObject = (rawHeaders) => {
    if (!is.array(rawHeaders)) {
        return rawHeaders;
    }

    const headers = {};

    for (let i = 0, len = rawHeaders.length; i < len; i = i + 2) {
        const key = rawHeaders[i];
        const value = rawHeaders[i + 1];

        if (headers[key]) {
            headers[key] = is.array(headers[key]) ? headers[key] : [headers[key]];
            headers[key].push(value);
        } else {
            headers[key] = value;
        }
    }

    return headers;
};

/**
 * Deletes the given `fieldName` property from `headers` object by performing
 * case-insensitive search through keys.
 *
 * @headers   {Object} headers - object of header field names and values
 * @fieldName {String} field name - string with the case-insensitive field name
 */
export const deleteHeadersField = (headers, fieldNameToDelete) => {

    if (!is.object(headers) || !is.string(fieldNameToDelete)) {
        return;
    }

    const lowerCaseFieldNameToDelete = fieldNameToDelete.toLowerCase();

    //  Search through the headers and delete all values whose field name matches the given field name.
    for (const fieldName of Object.keys(headers)) {
        const lowerCaseFieldName = fieldName.toLowerCase();
        if (lowerCaseFieldName === lowerCaseFieldNameToDelete) {
            delete headers[fieldName];
            //  We don't stop here but continue in order to remove *all* matching field names
            //  (even though if seen regorously there shouldn't be any)
        }
    }
};

export const percentDecode = (str) => {
    try {
        return decodeURIComponent(str.replace(/\+/g, " "));
    } catch (e) {
        return str;
    }
};

export const percentEncode = (str) => {
    return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
        return `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
    });
};

export const matchStringOrRegexp = (target, pattern) => {
    const str = (!is.undefined(target) && target.toString && target.toString()) || "";

    return is.regexp(pattern) ? str.match(pattern) : str === String(pattern);
};

// return [newKey, newValue]
export const formatQueryValue = (key, value, stringFormattingFn) => {
    switch (adone.typeOf(value)) {
        case "number":
        case "boolean": {
            value = value.toString();
            break;
        }
        case "undefined":
        case "null": {
            value = "";
            break;
        }
        case "string": {
            if (stringFormattingFn) {
                value = stringFormattingFn(value);
            }
            break;
        }
        case "Array": {
            const tmpArray = new Array(value.length);
            for (let i = 0; i < value.length; ++i) {
                tmpArray[i] = formatQueryValue(i, value[i], stringFormattingFn)[1];
            }
            value = tmpArray;
            break;
        }
        case "Object": {
            const tmpObj = {};
            for (const [subKey, subVal] of Object.entries(value)) {
                const subPair = formatQueryValue(subKey, subVal, stringFormattingFn);
                tmpObj[subPair[0]] = subPair[1];
            }
            value = tmpObj;
            break;
        }
    }

    if (stringFormattingFn) {
        key = stringFormattingFn(key);
    }
    return [key, value];
};
