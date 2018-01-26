const {
    is,
    std: {
        util: { inspect },
        url: URL
    },
    util: { querystring: qs },
    shani: {
        util: { nock }
    }
} = adone;

const __ = adone.private(nock);

const {
    util: _util
} = __;

const SEPARATOR = "\n<<<<<<-- cut here -->>>>>>\n";
let recordingInProgress = false;
let _outputs = [];

const getScope = (options) => {
    _util.normalizeRequestOptions(options);

    const scope = [];
    if (options._https_) {
        scope.push("https://");
    } else {
        scope.push("http://");
    }

    scope.push(options.host);

    //  If a non-standard port wasn't specified in options.host, include it from options.port.
    if (!options.host.includes(":") &&
        options.port &&
        ((options._https_ && options.port.toString() !== "443") ||
            (!options._https_ && options.port.toString() !== "80"))) {
        scope.push(":");
        scope.push(options.port);
    }

    return scope.join("");

};

const getMethod = (options) => options.method || "GET";

const getBodyFromChunks = function (chunks, headers) {

    //  If we have headers and there is content-encoding it means that
    //  the body shouldn't be merged but instead persisted as an array
    //  of hex strings so that the responses can be mocked one by one.
    if (_util.isContentEncoded(headers)) {
        return chunks.map((chunk) => {
            if (!is.buffer(chunk)) {
                if (is.string(chunk)) {
                    chunk = Buffer.from(chunk);
                } else {
                    throw new Error("content-encoded responses must all be binary buffers");
                }
            }

            return chunk.toString("hex");
        });
    }

    const mergedBuffer = _util.mergeChunks(chunks);

    //  The merged buffer can be one of three things:
    //    1.  A binary buffer which then has to be recorded as a hex string.
    //    2.  A string buffer which represents a JSON object.
    //    3.  A string buffer which doesn't represent a JSON object.

    if (_util.isBinaryBuffer(mergedBuffer)) {
        return mergedBuffer.toString("hex");
    }
    const maybeStringifiedJson = mergedBuffer.toString("utf8");
    try {
        return JSON.parse(maybeStringifiedJson);
    } catch (err) {
        return maybeStringifiedJson;
    }


};

const generateRequestAndResponseObject = (req, bodyChunks, options, res, dataChunks) => {
    options.path = req.path;
    return {
        scope: getScope(options),
        method: getMethod(options),
        path: options.path,
        body: getBodyFromChunks(bodyChunks),
        status: res.statusCode,
        response: getBodyFromChunks(dataChunks, res.headers),
        rawHeaders: res.rawHeaders || res.headers,
        reqheaders: req._headers
    };

};

const generateRequestAndResponse = (req, bodyChunks, options, res, dataChunks) => {
    const requestBody = getBodyFromChunks(bodyChunks);
    const responseBody = getBodyFromChunks(dataChunks, res.headers);

    // Remove any query params from options.path so they can be added in the query() function
    let path = options.path;
    let queryIndex = 0;
    let queryObj = {};
    if ((queryIndex = req.path.indexOf("?")) !== -1) {
        // Remove the query from the path
        path = path.substring(0, queryIndex);

        // Create the query() object
        const queryStr = req.path.slice(queryIndex + 1);
        queryObj = qs.parse(queryStr);
    }
    // Always encoding the query parameters when recording.
    const encodedQueryObj = {};
    for (const key in queryObj) {
        const formattedPair = _util.formatQueryValue(key, queryObj[key], _util.percentEncode);
        encodedQueryObj[formattedPair[0]] = formattedPair[1];
    }

    const ret = [];
    ret.push("\nnock('");
    ret.push(getScope(options));
    ret.push("', ");
    ret.push(JSON.stringify({ encodedQueryParams: true }));
    ret.push(")\n");
    ret.push("  .");
    ret.push(getMethod(options).toLowerCase());
    ret.push("('");
    ret.push(path);
    ret.push("'");
    if (requestBody) {
        ret.push(", ");
        ret.push(JSON.stringify(requestBody));
    }
    ret.push(")\n");
    if (req.headers) {
        for (const k in req.headers) {
            ret.push(`  .matchHeader(${JSON.stringify(k)}, ${JSON.stringify(req.headers[k])})\n`);
        }
    }

    if (queryIndex !== -1) {
        ret.push("  .query(");
        ret.push(JSON.stringify(encodedQueryObj));
        ret.push(")\n");
    }

    ret.push("  .reply(");
    ret.push(res.statusCode.toString());
    ret.push(", ");
    ret.push(JSON.stringify(responseBody));
    if (res.rawHeaders) {
        ret.push(", ");
        ret.push(inspect(res.rawHeaders));
    } else if (res.headers) {
        ret.push(", ");
        ret.push(inspect(res.headers));
    }
    ret.push(");\n");

    return ret.join("");
};

//  This module variable is used to identify a unique recording ID in order to skip
//  spurious requests that sometimes happen. This problem has been, so far,
//  exclusively detected in nock's unit testing where 'checks if callback is specified'
//  interferes with other tests as its t.end() is invoked without waiting for request
//  to finish (which is the point of the test).
let currentRecordingId = 0;

export const record = (recOptions) => {
    //  Set the new current recording ID and capture its value in this instance of record().
    currentRecordingId = currentRecordingId + 1;
    const thisRecordingId = currentRecordingId;

    //  Trying to start recording with recording already in progress implies an error
    //  in the recording configuration (double recording makes no sense and used to lead
    //  to duplicates in output)
    if (recordingInProgress) {
        throw new Error("Nock recording already in progress");
    }

    recordingInProgress = true;

    //  Originaly the parameters was a dontPrint boolean flag.
    //  To keep the existing code compatible we take that case into account.
    const optionsIsObject = is.object(recOptions);
    const dontPrint = (is.boolean(recOptions) && recOptions) || (optionsIsObject && recOptions.dontPrint);
    const outputObjects = optionsIsObject && recOptions.outputObjects;
    const enableReqheadersRecording = optionsIsObject && recOptions.enableReqheadersRecording;
    // eslint-disable-next-line no-console
    const logging = (optionsIsObject && recOptions.logging) || console.log;
    let useSeparator = true;
    if (optionsIsObject && is.propertyDefined(recOptions, "useSeparator")) {
        useSeparator = recOptions.useSeparator;
    }

    //  To preserve backward compatibility (starting recording wasn't throwing if nock was already active)
    //  we restore any requests that may have been overridden by other parts of nock (e.g. intercept)
    //  NOTE: This is hacky as hell but it keeps the backward compatibility *and* allows correct
    //    behavior in the face of other modules also overriding ClientRequest.
    _util.restoreOverriddenRequests();
    //  We restore ClientRequest as it messes with recording of modules that also override ClientRequest (e.g. xhr2)
    __.intercept.restoreOverriddenClientRequest();

    //  We override the requests so that we can save information on them before executing.
    _util.overrideRequests((proto, overriddenRequest, options, callback) => {

        const bodyChunks = [];

        if (is.string(options)) {
            const url = URL.parse(options);
            options = {
                hostname: url.hostname,
                method: "GET",
                port: url.port,
                path: url.path
            };
        }

        // Node 0.11 https.request calls http.request -- don't want to record things
        // twice.
        if (options._recording) {
            return overriddenRequest(options, callback);
        }
        options._recording = true;

        const dataChunks = [];

        const req = overriddenRequest(options, (res) => {

            if (is.string(options)) {
                options = URL.parse(options);
            }

            //  We put our 'end' listener to the front of the listener array.
            res.once("end", () => {
                let out;
                if (outputObjects) {
                    out = generateRequestAndResponseObject(req, bodyChunks, options, res, dataChunks);
                    if (out.reqheaders) {
                        //  We never record user-agent headers as they are worse than useless -
                        //  they actually make testing more difficult without providing any benefit (see README)
                        _util.deleteHeadersField(out.reqheaders, "user-agent");

                        //  Remove request headers completely unless it was explicitly enabled by the user (see README)
                        if (!enableReqheadersRecording) {
                            delete out.reqheaders;
                        }
                    }
                } else {
                    out = generateRequestAndResponse(req, bodyChunks, options, res, dataChunks);
                }

                //  Check that the request was made during the current recording.
                //  If it hasn't then skip it. There is no other simple way to handle
                //  this as it depends on the timing of requests and responses. Throwing
                //  will make some recordings/unit tests faily randomly depending on how
                //  fast/slow the response arrived.
                //  If you are seeing this error then you need to make sure that all
                //  the requests made during a single recording session finish before
                //  ending the same recording session.
                if (thisRecordingId !== currentRecordingId) {
                    return;
                }

                _outputs.push(out);

                if (!dontPrint) {
                    if (useSeparator) {
                        if (!is.string(out)) {
                            out = JSON.stringify(out, null, 2);
                        }
                        logging(SEPARATOR + out + SEPARATOR);
                    } else {
                        logging(out);
                    }
                }
            });

            let encoding;

            // We need to be aware of changes to the stream's encoding so that we
            // don't accidentally mangle the data.
            const setEncoding = res.setEncoding;
            res.setEncoding = function (newEncoding) {
                encoding = newEncoding;
                return setEncoding.call(this, newEncoding);
            };

            // Replace res.push with our own implementation that stores chunks
            const origResPush = res.push;
            res.push = function (data) {
                if (data) {
                    if (encoding) {
                        data = Buffer.from(data, encoding);
                    }
                    dataChunks.push(data);
                }

                return origResPush.call(res, data);
            };

            if (callback) {
                callback(res, options, callback);
            } else {
                res.resume();
            }

            if (proto === "https") {
                options._https_ = true;
            }

        });

        const oldWrite = req.write;
        req.write = function (data, encoding, cb) {
            if (!is.undefined(data)) {
                if (data) {
                    if (!is.buffer(data)) {
                        data = Buffer.from(data, encoding);
                    }
                    bodyChunks.push(data);
                }
                oldWrite.call(req, data, encoding, cb);
            }
        };

        // in Node 8, res.end() does not call res.write() directly
        if (adone.semver.satisfies(process.version, ">=8")) {
            const oldEnd = req.end;
            req.end = function (data, encoding) {
                if (data) {
                    if (!is.buffer(data)) {
                        data = Buffer.from(data, encoding);
                    }
                    bodyChunks.push(data);
                }
                oldEnd.call(req, data, encoding);
            };
        }

        return req;
    });
};

//  Restores *all* the overridden http/https modules' properties.
export const restore = () => {
    _util.restoreOverriddenRequests();
    __.intercept.restoreOverriddenClientRequest();
    recordingInProgress = false;
};

export const clear = () => {
    _outputs = [];
};

export const outputs = () => _outputs;
