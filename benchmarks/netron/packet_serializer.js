const {
    is,
    netron: { packet },
    error
} = adone;

const { serializer } = packet;

const encode1 = (packet) => {
    const buf = new adone.collection.ByteArray(adone.collection.ByteArray.DEFAULT_CAPACITY, true);
    const encoded = serializer.encode([packet.flags, packet.id, packet.data], buf);
    return encoded;
};

const decode1 = (buffer) => {
    const result = serializer.decoder.tryDecode(buffer);
    if (result) {
        const rawPacket = result.value;
        if (!is.array(rawPacket) || rawPacket.length !== 3) {
            throw new error.NotValidException("Invalid packet");
        }

        const pkt = new packet.Packet();
        [pkt.flags, pkt.id, pkt.data] = rawPacket;
        return pkt;
    }
    throw new error.NotValidException("Invalid packet");
};


const encode2 = (packet) => {
    const buf = new adone.collection.ByteArray(adone.collection.ByteArray.DEFAULT_CAPACITY, true);
    buf.writeUInt8(packet.flags);
    buf.writeUInt32BE(packet.id);
    serializer.encode(packet.data, buf);
    return buf;
};

const decode2 = (buffer) => {
    const flags = buffer.readUInt8();
    const id = buffer.readUInt32BE();

    const result = serializer.decoder.tryDecode(buffer);
    if (result) {
        const pkt = new packet.Packet();
        pkt.flags = flags;
        pkt.id = id;
        pkt.data = result.value;
        return pkt;
    }
    throw new error.NotValidException("Invalid packet");
};


const encode3 = (packet) => {
    const buf = new adone.collection.ByteArray(adone.collection.ByteArray.DEFAULT_CAPACITY, true);
    serializer.encode(packet.data, buf);
    buf.writeUInt8(packet.flags);
    buf.writeVarint32(packet.id);
    return buf;
};

const decode3 = (buffer) => {
    const result = serializer.decoder.tryDecode(buffer);
    if (result) {
        const pkt = new packet.Packet();
        pkt.flags = buffer.readUInt8();
        pkt.id = buffer.readVarint32();
        pkt.data = result.value;
        return pkt;
    }

    throw new error.NotValidException("Invalid packet");
};


let pkt1;
let rawPkt1;
let rawPkt2;
let rawPkt3;

export const init = () => {
    pkt1 = packet.create(1, 1, 0x30, "adone");
    rawPkt1 = encode1(pkt1);
    console.log("1:", rawPkt1.toBuffer());
    // console.log(decode1(rawPkt1));

    rawPkt2 = encode2(pkt1);
    console.log("2:", rawPkt2.toBuffer());
    // console.log(decode2(rawPkt2));

    rawPkt3 = encode3(pkt1);
    console.log("3:", rawPkt3.toBuffer());
    // console.log(decode3(rawPkt3));
};

export default {
    encode: {
        "(1) mpak"() {
            return encode1(pkt1);
        },
        "(2) mpak only data"() {
            return encode2(pkt1);
        },
        "(3) mpak only data with varints"() {
            return encode3(pkt1);
        }
    },
    decode: {
        "(1) mpak"() {
            rawPkt1.roffset = 0;
            return decode1(rawPkt1);
        },
        "(2) mpak only data"() {
            rawPkt2.roffset = 0;
            return decode2(rawPkt2);
        },
        "(3) mpak only data with varints"() {
            rawPkt3.roffset = 0;
            return decode3(rawPkt3);
        }
    }
};
