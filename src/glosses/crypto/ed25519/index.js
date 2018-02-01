const {
    is
} = adone;

const native = adone.nativeAddon(adone.std.path.join(__dirname, "native", "ed25519.node"));

adone.asNamespace(exports);

export const sign = native.Sign;
export const verify = (msg, sig, key) => {
    if (!is.arrayLikeObject(msg) || !is.arrayLikeObject(sig) || !is.arrayLikeObject(key)) {
        throw new adone.exception.InvalidArgument("Verify requires (Buffer, Buffer(64), Buffer(32)");
    }
    return native.Verify(msg, sig, key);
};

export const generateKeyPair = native.MakeKeypair;

export const publicKeyLength = 32;
export const privateKeyLength = 64;
