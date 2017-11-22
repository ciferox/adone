const {
    crypto: { jws },
    is
} = adone;

export default function (jwt, options) {
    options = options || {};
    const decoded = jws.decode(jwt, options);
    if (!decoded) {
        return null; 
    }
    let payload = decoded.payload;

    //try parse the payload
    if (is.string(payload)) {
        try {
            const obj = JSON.parse(payload);
            if (is.object(obj)) {
                payload = obj;
            }
        } catch (e) {
            //
        }
    }

    //return header if `complete` option is enabled.  header includes claims
    //such as `kid` and `alg` used to select the key within a JWKS needed to
    //verify the signature
    if (options.complete === true) {
        return {
            header: decoded.header,
            payload,
            signature: decoded.signature
        };
    }
    return payload;
}
