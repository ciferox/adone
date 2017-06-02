// http://dev.mysql.com/doc/internals/en/connection-phase-packets.html#packet-Protocol::AuthSwitchRequest
const { database: { mysql: { __ } } } = adone;
const { packet } = __;

export default class AuthSwitchRequestMoreData {
    constructor(data) {
        this.data = data;
    }

    toPacket() {
        const length = 5 + this.data.length;
        const buffer = Buffer.allocUnsafe(length);
        const p = new packet.Packet(0, buffer, 0, length);
        p.offset = 4;
        p.writeInt8(0x01);
        p.writeBuffer(this.data);
        return p;
    }

    static fromPacket(packet) {
        packet.readInt8();  // marker
        const data = packet.readBuffer();
        return new AuthSwitchRequestMoreData(data);
    }

    static verifyMarker(packet) {
        return packet.peekByte() === 0x01;
    }
}
