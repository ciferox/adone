const xtend = require("xtend");

const {
    crypto: { jws },
    is
} = adone;

export default function (jwtString, secretOrPublicKey, options, callback) {
    if ((is.function(options)) && !callback) {
        callback = options;
        options = {};
    }

    if (!options) {
        options = {};
    }

    //clone this object since we are going to mutate it.
    options = xtend(options);
    let done;

    if (callback) {
        done = callback;
    } else {
        done = function (err, data) {
            if (err) {
                throw err;
            }
            return data;
        };
    }

    if (options.clockTimestamp && !is.number(options.clockTimestamp)) {
        return done(new adone.crypto.jwt.JsonWebTokenError("clockTimestamp must be a number"));
    }

    const clockTimestamp = options.clockTimestamp || Math.floor(Date.now() / 1000);

    if (!jwtString) {
        return done(new adone.crypto.jwt.JsonWebTokenError("jwt must be provided"));
    }

    if (!is.string(jwtString)) {
        return done(new adone.crypto.jwt.JsonWebTokenError("jwt must be a string"));
    }

    const parts = jwtString.split(".");

    if (parts.length !== 3) {
        return done(new adone.crypto.jwt.JsonWebTokenError("jwt malformed"));
    }

    const hasSignature = parts[2].trim() !== "";

    if (!hasSignature && secretOrPublicKey) {
        return done(new adone.crypto.jwt.JsonWebTokenError("jwt signature is required"));
    }

    if (hasSignature && !secretOrPublicKey) {
        return done(new adone.crypto.jwt.JsonWebTokenError("secret or public key must be provided"));
    }

    if (!hasSignature && !options.algorithms) {
        options.algorithms = ["none"];
    }

    if (!options.algorithms) {
        options.algorithms = ~secretOrPublicKey.toString().indexOf("BEGIN CERTIFICATE") ||
            ~secretOrPublicKey.toString().indexOf("BEGIN PUBLIC KEY") ?
            ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"] :
            ~secretOrPublicKey.toString().indexOf("BEGIN RSA PUBLIC KEY") ?
                ["RS256", "RS384", "RS512"] :
                ["HS256", "HS384", "HS512"];

    }

    let decodedToken;
    try {
        decodedToken = jws.decode(jwtString);
    } catch (err) {
        return done(err);
    }

    if (!decodedToken) {
        return done(new adone.crypto.jwt.JsonWebTokenError("invalid token"));
    }

    const header = decodedToken.header;

    if (!~options.algorithms.indexOf(header.alg)) {
        return done(new adone.crypto.jwt.JsonWebTokenError("invalid algorithm"));
    }

    let valid;

    try {
        valid = jws.verify(jwtString, header.alg, secretOrPublicKey);
    } catch (e) {
        return done(e);
    }

    if (!valid) {
        return done(new adone.crypto.jwt.JsonWebTokenError("invalid signature"));
    }

    let payload;

    try {
        payload = adone.crypto.jwt.decode(jwtString);
    } catch (err) {
        return done(err);
    }

    if (!is.undefined(payload.nbf) && !options.ignoreNotBefore) {
        if (!is.number(payload.nbf)) {
            return done(new adone.crypto.jwt.JsonWebTokenError("invalid nbf value"));
        }
        if (payload.nbf > clockTimestamp + (options.clockTolerance || 0)) {
            return done(new adone.crypto.jwt.NotBeforeError("jwt not active", new Date(payload.nbf * 1000)));
        }
    }

    if (!is.undefined(payload.exp) && !options.ignoreExpiration) {
        if (!is.number(payload.exp)) {
            return done(new adone.crypto.jwt.JsonWebTokenError("invalid exp value"));
        }
        if (clockTimestamp >= payload.exp + (options.clockTolerance || 0)) {
            return done(new adone.crypto.jwt.TokenExpiredError("jwt expired", new Date(payload.exp * 1000)));
        }
    }

    if (options.audience) {
        const audiences = is.array(options.audience) ? options.audience : [options.audience];
        const target = is.array(payload.aud) ? payload.aud : [payload.aud];

        const match = target.some((targetAudience) => {
            return audiences.some((audience) => {
                return audience instanceof RegExp ? audience.test(targetAudience) : audience === targetAudience;
            });
        });

        if (!match) {
            return done(new adone.crypto.jwt.JsonWebTokenError(`jwt audience invalid. expected: ${audiences.join(" or ")}`));
        }
    }

    if (options.issuer) {
        const invalidIssuer =
            (is.string(options.issuer) && payload.iss !== options.issuer) ||
            (is.array(options.issuer) && options.issuer.indexOf(payload.iss) === -1);

        if (invalidIssuer) {
            return done(new adone.crypto.jwt.JsonWebTokenError(`jwt issuer invalid. expected: ${options.issuer}`));
        }
    }

    if (options.subject) {
        if (payload.sub !== options.subject) {
            return done(new adone.crypto.jwt.JsonWebTokenError(`jwt subject invalid. expected: ${options.subject}`));
        }
    }

    if (options.jwtid) {
        if (payload.jti !== options.jwtid) {
            return done(new adone.crypto.jwt.JsonWebTokenError(`jwt jwtid invalid. expected: ${options.jwtid}`));
        }
    }

    if (options.maxAge) {
        if (!is.number(payload.iat)) {
            return done(new adone.crypto.jwt.JsonWebTokenError("iat required when maxAge is specified"));
        }

        const maxAgeTimestamp = adone.crypto.jwt.timespan(options.maxAge, payload.iat);
        if (is.undefined(maxAgeTimestamp)) {
            return done(new adone.crypto.jwt.JsonWebTokenError('"maxAge" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
        }
        if (clockTimestamp >= maxAgeTimestamp + (options.clockTolerance || 0)) {
            return done(new adone.crypto.jwt.TokenExpiredError("maxAge exceeded", new Date(maxAgeTimestamp * 1000)));
        }
    }

    return done(null, payload);
}
