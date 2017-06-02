// http://dev.mysql.com/doc/internals/en/connection-phase-packets.html#packet-Protocol::AuthSwitchRequest
const { database: { mysql: { __ } } } = adone;
const { packet } = __;

export default class AuthSwitchRequest {
    constructor(opts) {
        this.pluginName = opts.pluginName;
        this.pluginData = opts.pluginData;
    }

    toPacket() {
        const length = 6 + this.pluginName.length + this.pluginData.length;
        const buffer = Buffer.allocUnsafe(length);
        const p = new packet.Packet(0, buffer, 0, length);
        p.offset = 4;
        p.writeInt8(0xfe);

        // TODO: use server encoding
        p.writeNullTerminatedString(this.pluginName, "cesu8");
        p.writeBuffer(this.pluginData);
        return p;
    }

    static fromPacket(packet) {
        packet.readInt8();  // marker
        // assert marker == 0xfe?

        // TODO: use server encoding
        const name = packet.readNullTerminatedString("cesu8");
        const data = packet.readBuffer();

        return new AuthSwitchRequest({
            pluginName: name,
            pluginData: data
        });
    }
}
