const waterfall = require("async/waterfall");

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

    /*
     * Check if this PeerId instance is valid (privKey -> pubKey -> Id)
     */
    isValid(callback) {
        // TODO Needs better checking
        if (this.privKey &&
            this.privKey.public &&
            this.privKey.public.bytes &&
            is.buffer(this.pubKey.bytes) &&
            this.privKey.public.bytes.equals(this.pubKey.bytes)) {
            return callback();
        }
        callback(new Error("Keys not match"));
    }

    // generation
    static create(opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }
        opts = opts || {};
        opts.bits = opts.bits || 2048;

        waterfall([
            (cb) => crypto.keys.generateKeyPair("RSA", opts.bits, cb),
            (privKey, cb) => privKey.public.hash((err, digest) => {
                cb(err, digest, privKey);
            })
        ], (err, digest, privKey) => {
            if (err) {
                return callback(err);
            }

            callback(null, new PeerId(digest, privKey));
        });
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
    static createFromPubKey(key, callback) {
        if (!is.function(callback)) {
            throw new Error("callback is required");
        }

        let pubKey;

        try {
            let buf = key;
            if (is.string(buf)) {
                buf = Buffer.from(key, "base64");
            }

            if (!is.buffer(buf)) {
                throw new Error("Supplied key is neither a base64 string nor a buffer");
            }

            pubKey = crypto.keys.unmarshalPublicKey(buf);
        } catch (err) {
            return callback(err);
        }

        pubKey.hash((err, digest) => {
            if (err) {
                return callback(err);
            }

            callback(null, new PeerId(digest, null, pubKey));
        });
    }

    // Private key input will be a string
    static createFromPrivKey(key, callback) {
        if (!is.function(callback)) {
            throw new Error("callback is required");
        }

        let buf = key;

        try {
            if (is.string(buf)) {
                buf = Buffer.from(key, "base64");
            }

            if (!is.buffer(buf)) {
                throw new Error("Supplied key is neither a base64 string nor a buffer");
            }
        } catch (err) {
            return callback(err);
        }

        waterfall([
            (cb) => crypto.keys.unmarshalPrivateKey(buf, cb),
            (privKey, cb) => privKey.public.hash((err, digest) => {
                cb(err, digest, privKey);
            })
        ], (err, digest, privKey) => {
            if (err) {
                return callback(err);
            }

            callback(null, new PeerId(digest, privKey, privKey.public));
        });
    }

    static createFromJSON(obj, callback) {
        if (!is.function(callback)) {
            throw new Error("callback is required");
        }

        let id;
        let rawPrivKey;
        let rawPubKey;
        let pub;

        try {
            id = adone.multi.hash.fromB58String(obj.id);
            rawPrivKey = obj.privKey && Buffer.from(obj.privKey, "base64");
            rawPubKey = obj.pubKey && Buffer.from(obj.pubKey, "base64");
            pub = rawPubKey && crypto.keys.unmarshalPublicKey(rawPubKey);
        } catch (err) {
            return callback(err);
        }

        if (rawPrivKey) {
            waterfall([
                (cb) => crypto.keys.unmarshalPrivateKey(rawPrivKey, cb),
                (priv, cb) => priv.public.hash((err, digest) => {
                    cb(err, digest, priv);
                }),
                (privDigest, priv, cb) => {
                    if (pub) {
                        pub.hash((err, pubDigest) => {
                            cb(err, privDigest, priv, pubDigest);
                        });
                    } else {
                        cb(null, privDigest, priv);
                    }
                }
            ], (err, privDigest, priv, pubDigest) => {
                if (err) {
                    return callback(err);
                }

                if (pub && !privDigest.equals(pubDigest)) {
                    return callback(new Error("Public and private key do not match"));
                }

                if (id && !privDigest.equals(id)) {
                    return callback(new Error("Id and private key do not match"));
                }

                callback(null, new PeerId(id, priv, pub));
            });
        } else {
            callback(null, new PeerId(id, null, pub));
        }
    }

    static isPeerId(peerId) {
        return Boolean(typeof peerId === "object" && peerId._id && peerId._idB58String);
    }
}
