const xtend = require("xtend");

const {
    crypto: { jws },
    is,
    vendor: { lodash: { once, includes } }
} = adone;

const signOptionsSchema = {
    expiresIn: {
        isValid(value) {
            return is.integer(value) || is.string(value);
        }, message: '"expiresIn" should be a number of seconds or string representing a timespan'
    },
    notBefore: {
        isValid(value) {
            return is.integer(value) || is.string(value);
        }, message: '"notBefore" should be a number of seconds or string representing a timespan'
    },
    audience: {
        isValid(value) {
            return is.string(value) || is.array(value);
        }, message: '"audience" must be a string or array'
    },
    algorithm: { isValid: includes.bind(null, ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "HS256", "HS384", "HS512", "none"]), message: '"algorithm" must be a valid string enum value' },
    header: { isValid: is.plainObject, message: '"header" must be an object' },
    encoding: { isValid: is.string, message: '"encoding" must be a string' },
    issuer: { isValid: is.string, message: '"issuer" must be a string' },
    subject: { isValid: is.string, message: '"subject" must be a string' },
    jwtid: { isValid: is.string, message: '"jwtid" must be a string' },
    noTimestamp: { isValid: is.boolean, message: '"noTimestamp" must be a boolean' },
    keyid: { isValid: is.string, message: '"keyid" must be a string' }
};

const registeredClaimsSchema = {
    iat: { isValid: is.number, message: '"iat" should be a number of seconds' },
    exp: { isValid: is.number, message: '"exp" should be a number of seconds' },
    nbf: { isValid: is.number, message: '"nbf" should be a number of seconds' }
};

const validate = (schema, allowUnknown, object, parameterName) => {
    if (!is.plainObject(object)) {
        throw new Error(`Expected "${parameterName}" to be a plain object.`);
    }
    Object.keys(object).forEach((key) => {
        const validator = schema[key];
        if (!validator) {
            if (!allowUnknown) {
                throw new Error(`"${key}" is not allowed in "${parameterName}"`);
            }
            return;
        }
        if (!validator.isValid(object[key])) {
            throw new Error(validator.message);
        }
    });
};

const validateOptions = (options) => validate(signOptionsSchema, false, options, "options");

const validatePayload = (payload) => validate(registeredClaimsSchema, true, payload, "payload");

const optionsToPayload = {
    audience: "aud",
    issuer: "iss",
    subject: "sub",
    jwtid: "jti"
};

const optionsForObjects = [
    "expiresIn",
    "notBefore",
    "noTimestamp",
    "audience",
    "issuer",
    "subject",
    "jwtid"
];

export default function (payload, secretOrPrivateKey, options, callback) {
    if (is.function(options)) {
        callback = options;
        options = {};
    } else {
        options = options || {};
    }

    const isObjectPayload = is.object(payload) &&
        !is.buffer(payload);

    const header = xtend({
        alg: options.algorithm || "HS256",
        typ: isObjectPayload ? "JWT" : undefined,
        kid: options.keyid
    }, options.header);

    const failure = (err) => {
        if (callback) {
            return callback(err);
        }
        throw err;
    };

    if (!secretOrPrivateKey && options.algorithm !== "none") {
        return failure(new Error("secretOrPrivateKey must have a value"));
    }

    if (is.undefined(payload)) {
        return failure(new Error("payload is required"));
    } else if (isObjectPayload) {
        try {
            validatePayload(payload);
        } catch (error) {
            return failure(error);
        }
        payload = xtend(payload);
    } else {
        const invalidOptions = optionsForObjects.filter((opt) => {
            return !is.undefined(options[opt]);
        });

        if (invalidOptions.length > 0) {
            return failure(new Error(`invalid ${invalidOptions.join(",")} option for ${typeof payload} payload`));
        }
    }

    if (!is.undefined(payload.exp) && !is.undefined(options.expiresIn)) {
        return failure(new Error('Bad "options.expiresIn" option the payload already has an "exp" property.'));
    }

    if (!is.undefined(payload.nbf) && !is.undefined(options.notBefore)) {
        return failure(new Error('Bad "options.notBefore" option the payload already has an "nbf" property.'));
    }

    try {
        validateOptions(options);
    } catch (error) {
        return failure(error);
    }

    const timestamp = payload.iat || Math.floor(Date.now() / 1000);

    if (!options.noTimestamp) {
        payload.iat = timestamp;
    } else {
        delete payload.iat;
    }

    if (!is.undefined(options.notBefore)) {
        payload.nbf = adone.crypto.jwt.timespan(options.notBefore);
        if (is.undefined(payload.nbf)) {
            return failure(new Error('"notBefore" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
        }
    }

    if (!is.undefined(options.expiresIn) && is.object(payload)) {
        payload.exp = adone.crypto.jwt.timespan(options.expiresIn, timestamp);
        if (is.undefined(payload.exp)) {
            return failure(new Error('"expiresIn" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
        }
    }

    Object.keys(optionsToPayload).forEach((key) => {
        const claim = optionsToPayload[key];
        if (!is.undefined(options[key])) {
            if (!is.undefined(payload[claim])) {
                return failure(new Error(`Bad "options.${key}" option. The payload already has an "${claim}" property.`));
            }
            payload[claim] = options[key];
        }
    });

    const encoding = options.encoding || "utf8";

    if (is.function(callback)) {
        callback = callback && once(callback);

        jws.createSign({
            header,
            privateKey: secretOrPrivateKey,
            payload,
            encoding
        }).once("error", callback)
            .once("done", (signature) => {
                callback(null, signature);
            });
    } else {
        return jws.sign({ header, payload, secret: secretOrPrivateKey, encoding });
    }
}
