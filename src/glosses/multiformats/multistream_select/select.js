const util = require("./util");
const writeEncoded = util.writeEncoded;

const {
    stream: { pull2: { handshake, lengthPrefixed } }
} = adone;

const select = function (multicodec, callback, log) {
    const stream = handshake({
        timeout: 60 * 1000
    }, callback);

    const shake = stream.handshake;

    log(`writing multicodec: ${multicodec}`);
    writeEncoded(shake, Buffer.from(`${multicodec}\n`), callback);

    lengthPrefixed.decodeFromReader(shake, (err, data) => {
        if (err) {
            return callback(err);
        }
        const protocol = data.toString().slice(0, -1);

        if (protocol !== multicodec) {
            return callback(new Error(`"${multicodec}" not supported`), shake.rest());
        }

        log(`received ack: ${protocol}`);
        callback(null, shake.rest());
    });

    return stream;
};

module.exports = select;
