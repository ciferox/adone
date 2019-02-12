import { writeEncoded } from "./util";

const {
    stream: { pull }
} = adone;

export default (multicodec, callback) => {
    const stream = pull.handshake({
        timeout: 60 * 1000
    }, callback);

    const shake = stream.handshake;

    writeEncoded(shake, Buffer.from(`${multicodec}\n`), callback);

    pull.lengthPrefixed.decodeFromReader(shake, (err, data) => {
        if (err) {
            return callback(err);
        }
        const protocol = data.toString().slice(0, -1);

        if (protocol !== multicodec) {
            return callback(new adone.error.NotSupportedException(`"${multicodec}" not supported`), shake.rest());
        }

        callback(null, shake.rest());
    });

    return stream;
}
