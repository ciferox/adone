// http://dev.mysql.com/doc/internals/en/com-binlog-dump.html#packet-COM_BINLOG_DUMP
// TODO: add flag to constants
// 0x01 - BINLOG_DUMP_NON_BLOCK
// send EOF instead of blocking

const { database: { mysql: { c, __: { packet } } } } = adone;

export default class BinlogDump {
    constructor(opts) {
        this.binlogPos = opts.binlogPos || 0;
        this.serverId = opts.serverId || 0;
        this.flags = opts.flags || 0;
        this.filename = opts.filename || "";
    }

    toPacket() {
        const length = 15 + // TODO: should be ascii?
            Buffer.byteLength(this.filename, "utf8");
        const buffer = Buffer.allocUnsafe(length);
        const p = new packet.Packet(0, buffer, 0, length);
        p.offset = 4;
        p.writeInt8(c.command.BINLOG_DUMP);
        p.writeInt32(this.binlogPos);
        p.writeInt16(this.flags);
        p.writeInt32(this.serverId);
        p.writeString(this.filename);
        return p;
    }
}
