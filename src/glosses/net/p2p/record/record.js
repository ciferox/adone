const utils = require("./utils");

const {
    is,
    data: { protobuf },
    net: { p2p: { PeerId } }
} = adone;

const pb = protobuf.create(require("./record.proto")).Record;


export default class Record {
    /**
     * @param {Buffer} [key]
     * @param {Buffer} [value]
     * @param {PeerId} [author]
     * @param {Date} [recvtime]
     */
    constructor(key, value, author, recvtime) {
        if (key && !is.buffer(key)) {
            throw new adone.x.NotValid("Key must be a Buffer");
        }

        if (value && !is.buffer(value)) {
            throw new adone.x.NotValid("Value must be a buffer");
        }

        this.key = key;
        this.value = value;
        this.author = author;
        this.timeReceived = recvtime;
        this.signature = null;
    }

    /**
     * Returns the blob protected by the record signature.
     *
     * @returns {Buffer}
     */
    blobForSignature() {
        return Buffer.concat([
            Buffer.from(this.key),
            this.value,
            this.author.id
        ]);
    }

    /**
     * @returns {Buffer}
     */
    serialize() {
        return pb.encode(this.prepareSerialize());
    }

    /**
     * Return the object format ready to be given to the protobuf library.
     *
     * @returns {Object}
     */
    prepareSerialize() {
        return {
            key: this.key,
            value: this.value,
            author: this.author.id,
            signature: this.signature,
            timeReceived: this.timeReceived && utils.toRFC3339(this.timeReceived)
        };
    }
    /**
     * @param {PrivateKey} privKey
     * @param {function(Error, Buffer)} callback
     * @returns {undefined}
     */
    serializeSigned(privKey) {
        const blob = this.blobForSignature();

        const signature = privKey.sign(blob);
        this.signature = signature;

        return this.serialize();
    }

    /**
     * Decode a protobuf encoded record.
     *
     * @param {Buffer} raw
     * @returns {Record}
     */
    static deserialize(raw) {
        const dec = pb.decode(raw);
        return Record.fromDeserialized(dec);
    }

    /**
     * Create a record from the raw object returnde from the
     * protobuf library.
     *
     * @param {Object} obj
     * @returns {Record}
     */
    static fromDeserialized(obj) {
        let recvtime;
        if (obj.timeReceived) {
            recvtime = utils.parseRFC3339(obj.timeReceived);
        }

        let author;
        if (obj.author) {
            author = new PeerId(obj.author);
        }

        const rec = new Record(
            obj.key, obj.value, author, recvtime
        );

        rec.signature = obj.signature;

        return rec;
    }
    /**
     * Verify the signature of a record against the given public key.
     *
     * @param {PublicKey} pubKey
     * @returns {undefined}
     */
    verifySignature(pubKey) {
        const blob = this.blobForSignature();

        const good = pubKey.verify(blob, this.signature);
        if (!good) {
            throw new Error("Invalid record signature");
        }
    }
}
