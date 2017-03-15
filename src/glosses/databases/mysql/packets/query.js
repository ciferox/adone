const { database: { mysql: { c, packet: { Packet }, stringParser } } } = adone;

export default class Query {
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
        packet.writeInt8(c.command.QUERY);
        packet.writeBuffer(buf);
        return packet;
    }
}
