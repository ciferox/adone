const {
    is,
    crypto: { formatEcdsa },
    std: { util, crypto }
} = adone;

const MSG_INVALID_ALGORITHM = '"%s" is not a valid algorithm.\n  Supported algorithms are:\n  "HS256", "HS384", "HS512", "RS256", "RS384", "RS512" and "none".';
const MSG_INVALID_SECRET = "secret must be a string or buffer";
const MSG_INVALID_VERIFIER_KEY = "key must be a string or a buffer";
const MSG_INVALID_SIGNER_KEY = "key must be a string, a buffer or an object";

const typeError = function (template) {
    const args = [].slice.call(arguments, 1);
    const errMsg = util.format.bind(util, template).apply(null, args);
    return new TypeError(errMsg);
};

const bufferOrString = (obj) => is.buffer(obj) || is.string(obj);

const normalizeInput = (thing) => {
    if (!bufferOrString(thing)) {
        thing = JSON.stringify(thing);
    }
    return thing;
};

const signerFactories = {
    hs(bits) {
        return function sign(thing, secret) {
            if (!bufferOrString(secret)) {
                throw typeError(MSG_INVALID_SECRET);
            }
            thing = normalizeInput(thing);
            const hmac = crypto.createHmac(`sha${bits}`, secret);
            const sig = (hmac.update(thing), hmac.digest("base64"));
            return adone.data.base64url.escape(sig);
        };
    },
    rs(bits) {
        return function sign(thing, privateKey) {
            if (!bufferOrString(privateKey) && !(typeof privateKey === "object")) {
                throw typeError(MSG_INVALID_SIGNER_KEY);
            }
            thing = normalizeInput(thing);
            // Even though we are specifying "RSA" here, this works with ECDSA
            // keys as well.
            const signer = crypto.createSign(`RSA-SHA${bits}`);
            const sig = (signer.update(thing), signer.sign(privateKey, "base64"));
            return adone.data.base64url.escape(sig);
        };
    },
    es(bits) {
        const inner = signerFactories.rs(bits);
        return function sign() {
            let signature = inner.apply(null, arguments);
            signature = formatEcdsa.derToJose(signature, `ES${bits}`);
            return signature;
        };
    },
    none() {
        return function sign() {
            return "";
        };
    }
};
const verifierFactories = {
    hs(bits) {
        return function verify(thing, signature, secret) {
            const computedSig = signerFactories.hs(bits)(thing, secret);
            return Buffer.from(signature).equals(Buffer.from(computedSig));
        };
    },
    rs(bits) {
        return function verify(thing, signature, publicKey) {
            if (!bufferOrString(publicKey)) {
                throw typeError(MSG_INVALID_VERIFIER_KEY);
            }
            thing = normalizeInput(thing);
            signature = adone.data.base64url.unescape(signature);
            const verifier = crypto.createVerify(`RSA-SHA${bits}`);
            verifier.update(thing);
            return verifier.verify(publicKey, signature, "base64");
        };
    },
    es(bits) {
        const inner = verifierFactories.rs(bits);
        return function verify(thing, signature, publicKey) {
            signature = formatEcdsa.joseToDer(signature, `ES${bits}`).toString("base64");
            const result = inner(thing, signature, publicKey);
            return result;
        };
    },
    none() {
        return function verify(thing, signature) {
            return signature === "";
        };
    }
};

export default function (algorithm) {
    const match = algorithm.match(/^(RS|ES|HS)(256|384|512)$|^(none)$/i);
    if (!match) {
        throw typeError(MSG_INVALID_ALGORITHM, algorithm);
    }
    const algo = (match[1] || match[3]).toLowerCase();
    const bits = match[2];

    return {
        sign: signerFactories[algo](bits),
        verify: verifierFactories[algo](bits)
    };
}
