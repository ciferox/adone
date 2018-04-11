const {
    is,
    stream: { pull }
} = adone;

// prefixes a message with a varint
// TODO this is a pull-stream 'creep' (pull stream to add a byte?')
const encode = function (msg, callback) {
    const values = is.buffer(msg) ? [msg] : [Buffer.from(msg)];

    pull(
        pull.values(values),
        pull.lengthPrefixed.encode(),
        pull.collect((err, encoded) => {
            if (err) {
                return callback(err);
            }
            callback(null, encoded[0]);
        })
    );
};

export const writeEncoded = (writer, msg, callback) => {
    encode(msg, (err, msg) => {
        if (err) {
            return callback(err);
        }
        writer.write(msg);
    });
};
