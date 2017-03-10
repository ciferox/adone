
const { net: { http: { helper: { status } } }, is } = adone;

const x = {};

class HttpError extends adone.x.Exception {}
HttpError.prototype.name = "HttpError";

for (const [code, statusMessage] of status.codes.entries()) {
    if (code < 400) {
        continue;
    }
    const name = statusMessage
        .split(" ").map((x) => `${x[0].toUpperCase()}${x.slice(1)}`).join("")
        .replace(/[^ _0-9a-z]/gi, "");

    const { [name]: Error } = {  // to keep the name
        [name]: class extends HttpError {
            constructor(message = statusMessage) {
                super(message);
            }
        }
    };

    Error.prototype.name = name;
    Error.prototype.status = code;
    Error.prototype.expose = code < 500;  // client error

    x[name] = x[code] = Error;
}

x.HttpError = HttpError;

const create = (statusCode = 500, message, properties) => {
    let err;

    if (is.error(statusCode)) {
        [err, statusCode] = [statusCode, statusCode.status || 500];
    } else if (is.error(message)) {
        [err, message] = [message];
    }

    if (is.object(statusCode)) {
        [statusCode, message, properties] = [500, undefined, statusCode];
    } else if (is.object(message)) {
        [message, properties] = [undefined, message];
    }

    if (is.string(statusCode)) {
        [statusCode, message] = [500, statusCode];
    }

    if (!is.number(statusCode) || (!status.codes.has(statusCode) && (statusCode < 400 || statusCode >= 600))) {
        statusCode = 500;
    }


    // constructor
    const HttpError = x[statusCode] || x[Math.floor(statusCode / 100) * 100];

    if (!err) {
        // create error
        err = HttpError ? new HttpError(message) : new adone.x.Exception(message || status.getMessageByCode(statusCode));
        Error.captureStackTrace(err, create);
    }

    if (!HttpError || !(err instanceof HttpError) || err.status !== statusCode) {
        // add properties to generic error
        err.expose = statusCode < 500;
        err.status = err.statusCode = statusCode;
    }

    if (is.object(properties)) {
        for (const key in properties) {
            if (key !== "status" && key !== "statusCode") {
                err[key] = properties[key];
            }
        }
    }

    return err;
};

x.create = create;

export default x;
