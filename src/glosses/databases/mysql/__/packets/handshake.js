const { std: { crypto }, database: { mysql: { __: { packet } } } } = adone;

export default class Handshake {
    constructor(args) {
        this.protocolVersion = args.protocolVersion;
        this.serverVersion = args.serverVersion;
        this.capabilityFlags = args.capabilityFlags;
        this.connectionId = args.connectionId;
        this.authPluginData1 = args.authPluginData1;
        this.authPluginData2 = args.authPluginData2;
        this.characterSet = args.characterSet;
        this.statusFlags = args.statusFlags;
    }

    setScrambleData(cb) {
        crypto.randomBytes(20, (err, data) => {
            if (err) {
                cb(err);
                return;
            }
            this.authPluginData1 = data.slice(0, 8);
            this.authPluginData2 = data.slice(8, 20);
            cb();
        });
    }

    toPacket(sequenceId) {
        const length = 68 + Buffer.byteLength(this.serverVersion, "utf8");
        // zero fill, 10 bytes filler later needs to contain zeros
        const buffer = Buffer.alloc(length + 4, 0);
        const p = new packet.Packet(sequenceId, buffer, 0, length + 4);
        p.offset = 4;
        p.writeInt8(this.protocolVersion);
        p.writeString(this.serverVersion, "cesu8");
        p.writeInt8(0);
        p.writeInt32(this.connectionId);
        p.writeBuffer(this.authPluginData1);
        p.writeInt8(0);
        const capabilityFlagsBuffer = Buffer.allocUnsafe(4);
        capabilityFlagsBuffer.writeUInt32LE(this.capabilityFlags, 0);
        p.writeBuffer(capabilityFlagsBuffer.slice(0, 2));
        p.writeInt8(this.characterSet);
        p.writeInt16(this.statusFlags);
        p.writeBuffer(capabilityFlagsBuffer.slice(2, 4));
        p.writeInt8(21); // authPluginDataLength
        p.skip(10);
        p.writeBuffer(this.authPluginData2);
        p.writeInt8(0);
        p.writeString("mysql_native_password", "latin1");
        p.writeInt8(0);
        return p;
    }

    static fromPacket(packet) {
        const args = {};
        args.protocolVersion = packet.readInt8();
        args.serverVersion = packet.readNullTerminatedString("cesu8");
        args.connectionId = packet.readInt32();
        args.authPluginData1 = packet.readBuffer(8);
        packet.skip(1);
        const capabilityFlagsBuffer = Buffer.allocUnsafe(4);
        capabilityFlagsBuffer[0] = packet.readInt8();
        capabilityFlagsBuffer[1] = packet.readInt8();
        if (packet.haveMoreData()) {
            args.characterSet = packet.readInt8();
            args.statusFlags = packet.readInt16();
            // upper 2 bytes
            capabilityFlagsBuffer[2] = packet.readInt8();
            capabilityFlagsBuffer[3] = packet.readInt8();
            args.capabilityFlags = capabilityFlagsBuffer.readUInt32LE(0);
            args.authPluginDataLength = packet.readInt8();
            packet.skip(10);
        } else {
            args.capabilityFlags = capabilityFlagsBuffer.readUInt16LE(0);
        }
        // var len = Math.max(12, args.authPluginDataLength - 8);
        args.authPluginData2 = packet.readBuffer(12);

        // TODO: expose combined authPluginData1 + authPluginData2 as authPluginData
        //
        // TODO
        // if capabilities & CLIENT_PLUGIN_AUTH {
        //   string[NUL]    auth-plugin name
        //  }
        return new Handshake(args);
    }
}
