const {
    error
} = adone;

const __ = adone.lazify({
    Packet: "./packet",
    serializer: "./serializer"
}, exports, require);

export const create = (id, impulse, action, data) => {
    const packet = new __.Packet();
    packet.setImpulse(impulse);
    packet.setAction(action);
    packet.id = id;
    packet.data = data;
    return packet;
};

export const encode = (packet) => {
    const buf = new adone.collection.ByteArray(adone.collection.ByteArray.DEFAULT_CAPACITY, true);
    __.serializer.encode(packet.data, buf);
    buf.writeUInt8(packet.flags);
    buf.writeVarint32(packet.id);
    return buf;
};

export const decode = (buffer) => {
    const result = __.serializer.decoder.tryDecode(buffer);
    if (result) {
        const pkt = new __.Packet();
        pkt.flags = buffer.readUInt8();
        pkt.id = buffer.readVarint32();
        pkt.data = result.value;
        return pkt;
    }

    throw new error.NotValidException("Invalid packet");
};
