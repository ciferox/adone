const debug = require("debug");

const {
    async: { map },
    crypto: { Identity },
    data: { base32 },
    datastore: { Key },
    net: { p2p: { record: { Record } } },
    multi,
    util: { xorDistance }
} = adone;

/**
 * Creates a DHT ID by hashing a given buffer.
 *
 * @param {Buffer} buf
 * @returns {void}
 */
exports.convertBuffer = (buf) => multi.hash.digest(buf, "sha2-256");

/**
 * Creates a DHT ID by hashing a Peer ID
 *
 * @param {Identity} peer
 * @returns {void}
 */
exports.convertPeerId = (peer) => multi.hash.digest(peer.id, "sha2-256");

/**
 * Convert a buffer to their SHA2-256 hash.
 *
 * @param {Buffer} buf
 * @returns {Key}
 */
exports.bufferToKey = (buf) => {
    return new Key(`/${exports.encodeBase32(buf)}`, false);
};

/**
 * Generate the key for a public key.
 *
 * @param {Identity} peer
 * @returns {Buffer}
 */
exports.keyForPublicKey = (peer) => {
    return Buffer.concat([
        Buffer.from("/pk/"),
        peer.id
    ]);
};

exports.isPublicKeyKey = (key) => {
    return key.slice(0, 4).toString() === "/pk/";
};

exports.fromPublicKeyKey = (key) => {
    return new Identity(key.slice(4));
};

/**
 * Get the current time as timestamp.
 *
 * @returns {number}
 */
exports.now = () => {
    return Date.now();
};

/**
 * Encode a given buffer into a base32 string.
 * @param {Buffer} buf
 * @returns {string}
 */
exports.encodeBase32 = (buf) => {
    const enc = new base32.Encoder();
    return enc.write(buf).finalize();
};

/**
 * Decode a given base32 string into a buffer.
 * @param {string} raw
 * @returns {Buffer}
 */
exports.decodeBase32 = (raw) => {
    const dec = new base32.Decoder();
    return Buffer.from(dec.write(raw).finalize());
};

/**
 * Sort peers by distance to the given `id`.
 *
 * @param {Array<Identity>} peers
 * @param {Buffer} target
 * @param {function(Error, )} callback
 * @returns {void}
 */
exports.sortClosestPeers = (peers, target, callback) => {
    map(peers, (peer, cb) => {
        try {
            const id = exports.convertPeerId(peer);

            cb(null, {
                peer,
                distance: xorDistance.create(id, target)
            });
        } catch (err) {
            cb(err);
        }
    }, (err, distances) => {
        if (err) {
            return callback(err);
        }

        callback(null, distances.sort(exports.xorCompare).map((d) => d.peer));
    });
};

/**
 * Compare function to sort an array of elements which have a distance property which is the xor distance to a given element.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
exports.xorCompare = (a, b) => {
    return xorDistance.compare(a.distance, b.distance);
};

/**
 * Create a new put record, encodes and signs it if enabled.
 *
 * @param {Buffer} key
 * @param {Buffer} value
 * @param {Identity} peer
 * @param {bool} sign - Should the record be signed
 * @param {function(Error, Buffer)} callback
 * @returns {void}
 */
exports.createPutRecord = (key, value, peer, sign) => {
    const rec = new Record(key, value, peer);

    if (sign) {
        return rec.serializeSigned(peer.privKey);
    }

    return rec.serialize();
};

/**
 * Creates a logger for the given subsystem
 *
 * @param {Identity} [id]
 * @param {string} [subsystem]
 * @returns {debug}
 *
 * @private
 */
exports.logger = (id, subsystem) => {
    const name = ["libp2p", "dht"];
    if (subsystem) {
        name.push(subsystem);
    }
    if (id) {
        name.push(`${id.asBase58().slice(0, 8)}`);
    }
    const logger = debug(name.join(":"));
    logger.error = debug(name.concat(["error"]).join(":"));

    return logger;
};
