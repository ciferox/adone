// http://dev.mysql.com/doc/internals/en/connection-phase-packets.html#packet-Protocol::AuthSwitchRequest
const { database: { mysql: { __ } }, is } = adone;
const { packet } = __;

export default class AuthSwitchResponse {
    constructor(data) {
        if (!is.buffer(data)) {
            data = Buffer.from(data);
        }
        this.data = data;
    }

    toPacket() {
        const length = 4 + this.data.length;
        const buffer = Buffer.allocUnsafe(length);
        const p = new packet.Packet(0, buffer, 0, length);
        p.offset = 4;
        p.writeBuffer(this.data);
        return p;
    }

    static fromPacket(packet) {
        const data = packet.readBuffer();
        return new AuthSwitchResponse(data);
    }
}
