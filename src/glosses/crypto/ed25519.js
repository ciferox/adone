const native = adone.nativeAddon("ed25519.node");

const {
    is
} = adone;

export const sign = native.Sign;
export const verify = (msg, sig, key) => {
    if (!is.arrayLikeObject(msg) || !is.arrayLikeObject(sig) || !is.arrayLikeObject(key)) {
        throw new adone.x.InvalidArgument("Verify requires (Buffer, Buffer(64), Buffer(32)");
    }
    return native.Verify(msg, sig, key);
};

export const generateKeyPair = native.MakeKeypair;

export const publicKeyLength = 32;
export const privateKeyLength = 64;
