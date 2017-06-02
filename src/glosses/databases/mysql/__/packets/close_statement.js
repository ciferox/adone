const { database: { mysql: { c, __: { packet } } } } = adone;

export default class CloseStatement {
    constructor(id) {
        this.id = id;
    }

    toPacket() {
        const p = new packet.Packet(0, Buffer.allocUnsafe(9), 0, 9);
        p.offset = 4;
        p.writeInt8(c.command.STMT_CLOSE);
        p.writeInt32(this.id);
        return p;
    }
}
