const {
    database: { mysql }
} = adone;

const {
    c
} = mysql;

const {
    packet
} = adone.private(mysql);

export default class SSLRequest {
    constructor(flags, charset) {
        this.clientFlags = flags | c.client.SSL;
        this.charset = charset;
    }

    toPacket() {
        const length = 36;
        const buffer = Buffer.allocUnsafe(length);
        const p = new packet.Packet(0, buffer, 0, length);
        buffer.fill(0);
        p.offset = 4;

        p.writeInt32(this.clientFlags);
        p.writeInt32(0); // max packet size. todo: move to config
        p.writeInt8(this.charset);
        return p;
    }
}
