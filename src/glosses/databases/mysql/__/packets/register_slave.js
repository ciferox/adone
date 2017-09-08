// http://dev.mysql.com/doc/internals/en/com-register-slave.html
// note that documentation is incorrect, for example command code is actually 0x15 but documented as 0x14
const {
    database: { mysql }
} = adone;

const {
    c
} = mysql;

const {
    packet
} = adone.private(mysql);

export default class RegisterSlave {
    constructor(opts) {
        this.serverId = opts.serverId || 0;
        this.slaveHostname = opts.slaveHostname || "";
        this.slaveUser = opts.slaveUser || "";
        this.slavePassword = opts.slavePassword || "";
        this.slavePort = opts.slavePort || 0;
        this.replicationRank = opts.replicationRank || 0;
        this.masterId = opts.masterId || 0;
    }

    toPacket() {
        const length = 15 + // TODO: should be ascii?
            Buffer.byteLength(this.slaveHostname, "utf8") +
            Buffer.byteLength(this.slaveUser, "utf8") +
            Buffer.byteLength(this.slavePassword, "utf8") + 3 + 4;
        const buffer = Buffer.allocUnsafe(length);
        const p = new packet.Packet(0, buffer, 0, length);
        p.offset = 4;
        p.writeInt8(c.command.REGISTER_SLAVE);
        p.writeInt32(this.serverId);
        p.writeInt8(Buffer.byteLength(this.slaveHostname, "utf8"));
        p.writeString(this.slaveHostname);
        p.writeInt8(Buffer.byteLength(this.slaveUser, "utf8"));
        p.writeString(this.slaveUser);
        p.writeInt8(Buffer.byteLength(this.slavePassword, "utf8"));
        p.writeString(this.slavePassword);
        p.writeInt16(this.slavePort);
        p.writeInt32(this.replicationRank);
        p.writeInt32(this.masterId);
        return p;
    }
}
