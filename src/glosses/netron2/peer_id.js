const {
    is,
    netron2: { crypto }
} = adone;

const toB64Opt = (val) => {
    if (val) {
        return val.toString("base64");
    }
};

export default class PeerId {
    constructor(id, privKey, pubKey) {
        if (!is.buffer(id)) {
            throw new adone.x.NotValid("Invalid id");
        }

        if (privKey && pubKey && !privKey.public.bytes.equals(pubKey.bytes)) {
            throw new adone.x.NotValid("Inconsistent arguments");
        }

        this._id = id;
        this._idB58String = adone.multi.hash.toB58String(this.id);
        this._privKey = privKey;
        this._pubKey = pubKey;
    }

    get id() {
        return this._id;
    }

    set id(val) {
        throw new Error("Id is immutable");
    }

    get privKey() {
        return this._privKey;
    }

    set privKey(privKey) {
        this._privKey = privKey;
    }

    get pubKey() {
        if (this._pubKey) {
            return this._pubKey;
        }

        if (this._privKey) {
            return this._privKey.public;
        }
    }

    set pubKey(pubKey) {
        this._pubKey = pubKey;
    }

    // Return the protobuf version of the public key, matching go ipfs formatting
    marshalPubKey() {
        if (this.pubKey) {
            return crypto.keys.marshalPublicKey(this.pubKey);
        }
    }

    // Return the protobuf version of the private key, matching go ipfs formatting
    marshalPrivKey() {
        if (this.privKey) {
            return crypto.keys.marshalPrivateKey(this.privKey);
        }
    }

    // pretty print
    toPrint() {
        return this.toJSON();
    }

    // return the jsonified version of the key, matching the formatting
    // of go-ipfs for its config file
    toJSON() {
        return {
            id: this.toB58String(),
            privKey: toB64Opt(this.marshalPrivKey()),
            pubKey: toB64Opt(this.marshalPubKey())
        };
    }

    // encode/decode functions
    toHexString() {
        return adone.multi.hash.toHexString(this.id);
    }

    toBytes() {
        return this.id;
    }

    toB58String() {
        return this._idB58String;
    }

    isEqual(id) {
        if (is.buffer(id)) {
            return this.id.equals(id);
        } else if (id.id) {
            return this.id.equals(id.id);
        }
        throw new Error("not valid Id");

    }

    /**
     * Check if this PeerId instance is valid (privKey -> pubKey -> Id)
     */
    isValid() {
        // TODO Needs better checking
        if (!(this.privKey && this.privKey.public && this.privKey.public.bytes && is.buffer(this.pubKey.bytes) && this.privKey.public.bytes.equals(this.pubKey.bytes))) {
            throw new Error("Keys not match");
        }
    }

    // generation
    static create(opts = {}) {
        opts.bits = opts.bits || 2048;

        const privKey = crypto.keys.generateKeyPair("RSA", opts.bits);
        const digest = privKey.public.hash();
        return new PeerId(digest, privKey);
    }

    static createFromHexString(str) {
        return new PeerId(adone.multi.hash.fromHexString(str));
    }

    static createFromBytes(buf) {
        return new PeerId(buf);
    }

    static createFromB58String(str) {
        return new PeerId(adone.multi.hash.fromB58String(str));
    }

    // Public Key input will be a buffer
    static createFromPubKey(key) {
        let buf = key;
        if (is.string(buf)) {
            buf = Buffer.from(key, "base64");
        }

        if (!is.buffer(buf)) {
            throw new Error("Supplied key is neither a base64 string nor a buffer");
        }

        const pubKey = crypto.keys.unmarshalPublicKey(buf);

        const digest = pubKey.hash();
        return new PeerId(digest, null, pubKey);
    }

    // Private key input will be a string
    static createFromPrivKey(key) {
        let buf = key;

        if (is.string(buf)) {
            buf = Buffer.from(key, "base64");
        }

        if (!is.buffer(buf)) {
            throw new Error("Supplied key is neither a base64 string nor a buffer");
        }

        const privKey = crypto.keys.unmarshalPrivateKey(buf);
        const digest = privKey.public.hash();
        return new PeerId(digest, privKey, privKey.public);
    }

    static createFromJSON(obj) {
        const id = adone.multi.hash.fromB58String(obj.id);
        const rawPrivKey = obj.privKey && Buffer.from(obj.privKey, "base64");
        const rawPubKey = obj.pubKey && Buffer.from(obj.pubKey, "base64");
        const pub = rawPubKey && crypto.keys.unmarshalPublicKey(rawPubKey);

        if (rawPrivKey) {
            const priv = crypto.keys.unmarshalPrivateKey(rawPrivKey);
            const privDigest = priv.public.hash();
            let pubDigest;
            if (pub) {
                pubDigest = pub.hash();
            }

            if (pub && !privDigest.equals(pubDigest)) {
                throw new Error("Public and private key do not match");
            }

            if (id && !privDigest.equals(id)) {
                throw new Error("Id and private key do not match");
            }

            return new PeerId(id, priv, pub);
        }
        return new PeerId(id, null, pub);
    }

    static isPeerId(peerId) {
        return Boolean(typeof peerId === "object" && peerId._id && peerId._idB58String);
    }
}
