const {
    x,
    math: {
        BigNumber
    },
    crypto,
    util
} = adone;

const bnToBase64 = (bn) => bn
    .toBuffer()
    .toString("base64")
    .replace(/(=*)$/, "") // Remove any trailing '='
    .replace(/\+/g, "-") // 62nd char of encoding
    .replace(/\//g, "_"); // 63rd char of encoding

const base64ToBn = (base64data) => BigNumber.fromBuffer(Buffer.from(base64data, "base64"));

// Convert a PKCS#1 in ASN1 DER format to a JWK key
exports.pkcs1ToJwk = function (bytes) {
    const buf = util.bufferToArrayBuffer(bytes);
    const { result } = crypto.asn1.fromBER(buf);

    if (result.error) {
        throw new x.IllegalState(result.error);
    }

    const key = crypto.pki.privateKeyFromAsn1(result);

    return {
        kty: "RSA",
        n: bnToBase64(key.n),
        e: bnToBase64(key.e),
        d: bnToBase64(key.d),
        p: bnToBase64(key.p),
        q: bnToBase64(key.q),
        dp: bnToBase64(key.dP),
        dq: bnToBase64(key.dQ),
        qi: bnToBase64(key.qInv),
        alg: "RS256",
        kid: "2011-04-29"
    };
};

// Convert a JWK key into PKCS#1 in ASN1 DER format
exports.jwkToPkcs1 = function (jwk) {
    const asn1 = crypto.pki.privateKeyToAsn1({
        n: base64ToBn(jwk.n),
        e: base64ToBn(jwk.e),
        d: base64ToBn(jwk.d),
        p: base64ToBn(jwk.p),
        q: base64ToBn(jwk.q),
        dP: base64ToBn(jwk.dp),
        dQ: base64ToBn(jwk.dq),
        qInv: base64ToBn(jwk.qi)
    });

    return Buffer.from(asn1.toBER());
};

// Convert a PKCIX in ASN1 DER format to a JWK key
exports.pkixToJwk = function (bytes) {
    const buf = util.bufferToArrayBuffer(bytes);
    const { result } = crypto.asn1.fromBER(buf);

    if (result.error) {
        throw new x.IllegalState(result.error);
    }

    const key = crypto.pki.publicKeyFromAsn1(result);

    return {
        kty: "RSA",
        n: bnToBase64(key.n),
        e: bnToBase64(key.e),
        alg: "RS256",
        kid: "2011-04-29"
    };
};

// Convert a JWK key to PKCIX in ASN1 DER format
exports.jwkToPkix = function (jwk) {
    const asn1 = crypto.pki.publicKeyToAsn1({
        n: base64ToBn(jwk.n),
        e: base64ToBn(jwk.e)
    });

    return Buffer.from(asn1.toBER());
};
