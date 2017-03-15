const { database: { mysql: { c, stringParser, packet: { Packet } } } } = adone;

export default class PrepareStatement {
    constructor(sql, charsetNumber) {
        this.query = sql;
        this.charsetNumber = charsetNumber;
        this.encoding = c.charsetEncoding[charsetNumber];
    }

    toPacket() {
        const buf = stringParser.encode(this.query, this.encoding);
        const length = 5 + buf.length;

        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeInt8(c.command.STMT_PREPARE);
        packet.writeBuffer(buf);
        return packet;
    }
}
