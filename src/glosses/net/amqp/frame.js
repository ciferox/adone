const {
    defs: {
        constants,
        decode
    }
} = adone.private(adone.net.amqp);

export const PROTOCOL_HEADER = `AMQP${String.fromCharCode(0, 0, 9, 1)}`;

/*
  Frame format:

  0      1         3             7                size+7 size+8
  +------+---------+-------------+ +------------+ +-----------+
  | type | channel | size        | | payload    | | frame-end |
  +------+---------+-------------+ +------------+ +-----------+
  octet   short     long            size octets    octet

  In general I want to know those first three things straight away, so I
  can discard frames early.

*/

// framing constants
const FRAME_METHOD = constants.FRAME_METHOD;
const FRAME_HEARTBEAT = constants.FRAME_HEARTBEAT;
const FRAME_HEADER = constants.FRAME_HEADER;
const FRAME_BODY = constants.FRAME_BODY;
const FRAME_END = constants.FRAME_END;

// %%% TESTME possibly better to cons the first bit and write the
// second directly, in the absence of IO lists
export const makeBodyFrame = (channel, payload) => {
    // FRAME_BODY | channel:16 | size:32 | payload:size | FRAME_END
    const buf = new adone.collection.ByteArray(1 + 16 + 32 + payload.length + 1);
    buf.writeUInt8(FRAME_BODY);
    buf.writeUInt16BE(channel);
    buf.writeUInt32BE(payload.length);
    buf.write(payload);
    buf.writeUInt8(FRAME_END);
    buf.flip();
    return buf.toBuffer();
};


export const parseFrame = (bin, max) => {
    // type:8 | channel:16 | size:32 | rest/binary
    if (bin.length < 7) {
        return false;
    }
    const buf = adone.collection.ByteArray.wrap(bin);
    const type = buf.readUInt8();
    const channel = buf.readUInt16BE();
    const size = buf.readUInt32BE();
    const rest = buf.toBuffer();
    if (size > max) {
        throw new Error("Frame size exceeds frame max");
    }
    if (rest.length <= size) {
        return false;
    }
    if (rest[size] !== FRAME_END) {
        throw new Error("Invalid frame");
    }
    return {
        type,
        channel,
        size,
        payload: rest.slice(0, size),
        rest: rest.slice(size + 1)
    };
};

export const HEARTBEAT = { channel: 0 };

export const decodeFrame = (frame) => {
    const payload = frame.payload;
    switch (frame.type) {
        case FRAME_METHOD: {
            // id:32 | args/binary
            const buf = adone.collection.ByteArray.wrap(payload);
            const id = buf.readUInt32BE();
            const args = buf.toBuffer();
            const fields = decode(id, args);
            return { id, channel: frame.channel, fields };
        }
        case FRAME_HEADER: {
            // class:16 | _weight:16 | size:64 | flagsAndfields/binary
            const buf = adone.collection.ByteArray.wrap(payload);
            const id = buf.readUInt16BE();
            buf.skip(2); // _weight
            const size = buf.readUInt64BE().toNumber(); // safe?
            const flagsAndfields = buf.toBuffer();
            const fields = decode(id, flagsAndfields);
            return {
                id,
                channel: frame.channel,
                size,
                fields
            };
        }
        case FRAME_BODY:
            return { channel: frame.channel, content: frame.payload };
        case FRAME_HEARTBEAT:
            return HEARTBEAT;
        default:
            throw new Error(`Unknown frame type ${frame.type}`);
    }
};

// encoded heartbeat
export const HEARTBEAT_BUF = Buffer.from([
    constants.FRAME_HEARTBEAT,
    0, 0, 0, 0, // size = 0
    0, 0, // channel = 0
    constants.FRAME_END
]);
