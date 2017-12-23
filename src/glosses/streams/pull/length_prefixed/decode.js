const {
    is,
    stream: { pull }
} = adone;

const varint = require("varint");
const Buffer = require("safe-buffer").Buffer;

const MSB = 0x80;
const isEndByte = (byte) => !(byte & MSB);
const MAX_LENGTH = ((1024 * 1024) * 4);

const readMessage = (reader, size, cb) => {
    reader.read(size, (err, msg) => {
        if (err) {
            return cb(err);
        }

        cb(null, msg);
    });
};

const readFixedMessage = (reader, byteLength, maxLength, cb) => {
    if (is.function(maxLength)) {
        cb = maxLength;
        maxLength = MAX_LENGTH;
    }

    reader.read(byteLength, (err, bytes) => {
        if (err) {
            return cb(err);
        }

        const msgSize = bytes.readInt32BE(0);
        if (msgSize > maxLength) {
            return cb(`size longer than max permitted length of ${maxLength}!`);
        }

        readMessage(reader, msgSize, cb);
    });
};

const readVarintMessage = (reader, maxLength, cb) => {
    if (is.function(maxLength)) {
        cb = maxLength;
        maxLength = MAX_LENGTH;
    }

    let rawMsgSize = [];

    // 1. Read the varint
    const readByte = () => {
        reader.read(1, (err, byte) => {
            if (err) {
                return cb(err);
            }

            rawMsgSize.push(byte);

            if (byte && !isEndByte(byte[0])) {
                readByte();
                return;
            }

            const msgSize = varint.decode(Buffer.concat(rawMsgSize));
            if (msgSize > maxLength) {
                return cb(`size longer than max permitted length of ${maxLength}!`);
            }
            readMessage(reader, msgSize, (err, msg) => {
                if (err) {
                    return cb(err);
                }

                rawMsgSize = [];

                cb(null, msg);
            });
        });
    };

    readByte();
};

const decodeFromReader = (reader, opts, cb) => {
    if (is.function(opts)) {
        cb = opts;
        opts = {};
    }

    opts = Object.assign({
        fixed: false,
        bytes: 4
    }, opts || {});

    if (opts.fixed) {
        readFixedMessage(reader, opts.bytes, opts.maxLength, cb);
    } else {
        readVarintMessage(reader, opts.maxLength, cb);
    }
};

export default function decode(opts) {
    const reader = pull.reader();
    const p = pull.pushable((err) => {
        reader.abort(err);
    });

    return (read) => {
        reader(read);
        const next = () => {
            decodeFromReader(reader, opts, (err, msg) => {
                if (err) {
                    return p.end(err);
                }

                p.push(msg);
                next();
            });
        };

        next();
        return p;
    };
}

decode.fromReader = decodeFromReader;
