const {
    is,
    error,
    database: { mysql }
} = adone;

const {
    c
} = mysql;

const {
    packet
} = adone.private(mysql);

export default class HandshakeResponse {
    constructor(handshake) {
        this.user = handshake.user || "";
        this.database = handshake.database || "";
        this.password = handshake.password || "";
        this.passwordSha1 = handshake.passwordSha1;
        this.authPluginData1 = handshake.authPluginData1;
        this.authPluginData2 = handshake.authPluginData2;
        this.compress = handshake.compress;
        this.clientFlags = handshake.flags;
        // TODO: pre-4.1 auth support
        let authToken;
        if (this.passwordSha1) {
            authToken = mysql.auth.calculateTokenFromPasswordSha(
                this.passwordSha1,
                this.authPluginData1,
                this.authPluginData2
            );
        } else {
            authToken = mysql.auth.calculateToken(
                this.password,
                this.authPluginData1,
                this.authPluginData2
            );
        }
        this.authToken = authToken;
        this.charsetNumber = handshake.charsetNumber;
        this.encoding = c.charsetEncoding[handshake.charsetNumber];
        this.connectAttributes = handshake.connectAttributes;
    }

    serializeResponse(buffer) {
        const isSet = (flag) => this.clientFlags & c.client[flag];
        const p = new packet.Packet(0, buffer, 0, buffer.length);
        p.offset = 4;
        p.writeInt32(this.clientFlags);
        p.writeInt32(0); // max packet size. todo: move to config
        p.writeInt8(this.charsetNumber);
        p.skip(23);

        const encoding = this.encoding;
        p.writeNullTerminatedString(this.user, encoding);

        if (isSet("PLUGIN_AUTH_LENENC_CLIENT_DATA")) {
            p.writeLengthCodedNumber(this.authToken.length);
            p.writeBuffer(this.authToken);
        } else if (isSet("SECURE_CONNECTION")) {
            p.writeInt8(this.authToken.length);
            p.writeBuffer(this.authToken);
        } else {
            p.writeBuffer(this.authToken);
            p.writeInt8(0);
        } if (isSet("CONNECT_WITH_DB")) {
            p.writeNullTerminatedString(this.database, encoding);
        }
        if (isSet("PLUGIN_AUTH")) {
            // TODO: pass from config
            p.writeNullTerminatedString("mysql_native_password", "latin1");
        }
        if (isSet("CONNECT_ATTRS")) {
            const connectAttributes = this.connectAttributes || {};
            const attrNames = Object.keys(connectAttributes);
            let keysLength = 0;
            for (let k = 0; k < attrNames.length; ++k) {
                keysLength += packet.Packet.lengthCodedStringLength(attrNames[k], encoding);
                keysLength += packet.Packet.lengthCodedStringLength(
                    connectAttributes[attrNames[k]],
                    encoding
                );
            }
            p.writeLengthCodedNumber(keysLength);
            for (let k = 0; k < attrNames.length; ++k) {
                p.writeLengthCodedString(attrNames[k], encoding);
                p.writeLengthCodedString(connectAttributes[attrNames[k]], encoding);
            }
        }
        return p;
    }

    toPacket() {
        if (!is.string(this.user)) {
            throw new error.IllegalStateException('"user" connection config prperty must be a string');
        }
        if (!is.string(this.database)) {
            throw new error.IllegalStateException('"database" connection config prperty must be a string');
        }
        // dry run: calculate resulting packet length
        const p = this.serializeResponse(packet.Packet.mockBuffer());
        return this.serializeResponse(Buffer.allocUnsafe(p.offset));
    }

    static fromPacket(packet) {
        const args = {};
        args.clientFlags = packet.readInt32();

        const isSet = (flag) => args.clientFlags & c.client[flag];

        args.maxPacketSize = packet.readInt32();
        args.charsetNumber = packet.readInt8();
        const encoding = c.charsetEncoding[args.charsetNumber];
        args.encoding = encoding;
        packet.skip(23);
        args.user = packet.readNullTerminatedString(encoding);
        let authTokenLength;
        if (isSet("PLUGIN_AUTH_LENENC_CLIENT_DATA")) {
            authTokenLength = packet.readLengthCodedNumber(encoding);
            args.authToken = packet.readBuffer(authTokenLength);
        } else if (isSet("SECURE_CONNECTION")) {
            authTokenLength = packet.readInt8();
            args.authToken = packet.readBuffer(authTokenLength);
        } else {
            args.authToken = packet.readNullTerminatedString(encoding);
        } if (isSet("CONNECT_WITH_DB")) {
            args.database = packet.readNullTerminatedString(encoding);
        }
        if (isSet("PLUGIN_AUTH")) {
            args.authPluginName = packet.readNullTerminatedString(encoding);
        }
        if (isSet("CONNECT_ATTRS")) {
            const keysLength = packet.readLengthCodedNumber(encoding);
            const keysEnd = packet.offset + keysLength;
            const attrs = {};
            while (packet.offset < keysEnd) {
                const t = packet.readLengthCodedString(encoding);
                attrs[t] = packet.readLengthCodedString(encoding);
            }
            args.connectAttributes = attrs;
        }
        return args;
    }
}
