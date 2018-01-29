const util = require("./util");
const writeEncoded = util.writeEncoded;

const {
    stream: { pull }
} = adone;

const select = (multicodec, callback, log) => {
    const stream = pull.handshake({
        timeout: 60 * 1000
    }, callback);

    const shake = stream.handshake;

    log(`writing multicodec: ${multicodec}`);
    writeEncoded(shake, Buffer.from(`${multicodec}\n`), callback);

    pull.lengthPrefixed.decodeFromReader(shake, (err, data) => {
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
