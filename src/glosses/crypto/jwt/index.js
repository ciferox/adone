export class JsonWebTokenError extends Error {
    constructor(message, error) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.name = "JsonWebTokenError";
        this.message = message;
        if (error) {
            this.inner = error;
        }
    }
}

export class NotBeforeError extends JsonWebTokenError {
    constructor(message, date) {
        super(message);
        this.name = "NotBeforeError";
        this.date = date;
    }
}

export class TokenExpiredError extends JsonWebTokenError {
    constructor(message, expiredAt) {
        super(message);
        this.name = "TokenExpiredError";
        this.expiredAt = expiredAt;
    }
}

const {
    is
} = adone;

const ms = require("ms");

export const timespan = function (time, iat) {
    const timestamp = iat || Math.floor(Date.now() / 1000);

    if (is.string(time)) {
        const milliseconds = ms(time);
        if (is.undefined(milliseconds)) {
            return;
        }
        return Math.floor(timestamp + milliseconds / 1000);
    } else if (is.number(time)) {
        return timestamp + time;
    }
};

adone.lazify({
    decode: "./decode",
    verify: "./verify",
    sign: "./sign"
}, exports, require);
