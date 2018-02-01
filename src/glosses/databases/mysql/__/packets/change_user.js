const {
    is,
    exception,
    database: { mysql }
} = adone;

const {
    c
} = mysql;

const {
    packet
} = adone.private(mysql);

export default class ChangeUser {
    constructor(opts) {
        this.flags = opts.flags;
        this.user = opts.user || "";
        this.database = opts.database || "";
        this.password = opts.password || "";
        this.passwordSha1 = opts.passwordSha1;
        this.authPluginData1 = opts.authPluginData1;
        this.authPluginData2 = opts.authPluginData2;
        this.connectAttributes = opts.connectAttrinutes || {};
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
        this.charsetNumber = opts.charsetNumber;
    }

    serializeToBuffer(buffer) {
        const isSet = (flag) => this.flags & c.client[flag];

        const p = new packet.Packet(0, buffer, 0, buffer.length);
        p.offset = 4;

        const encoding = c.charsetEncoding[this.charsetNumber];

        p.writeInt8(c.command.CHANGE_USER);
        p.writeNullTerminatedString(this.user, encoding);
        if (isSet("SECURE_CONNECTION")) {
            p.writeInt8(this.authToken.length);
            p.writeBuffer(this.authToken);
        } else {
            p.writeBuffer(this.authToken);
            p.writeInt8(0);
        }
        p.writeNullTerminatedString(this.database, encoding);
        p.writeInt16(this.charsetNumber);

        if (isSet("PLUGIN_AUTH")) {
            p.writeNullTerminatedString("mysql_native_password", "latin1");
        }

        if (isSet("CONNECT_ATTRS")) {
            const connectAttributes = this.connectAttributes;
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
            throw new exception.IllegalState('"user" connection config property must be a string');
        }

        if (!is.string(this.database)) {
            throw new exception.IllegalState('"database" connection config property must be a string');
        }

        // dry run: calculate resulting packet length
        const p = this.serializeToBuffer(packet.Packet.mockBuffer());
        return this.serializeToBuffer(Buffer.allocUnsafe(p.offset));
    }

    // TODO
    // static fromPacket = function(packet)
    // };
}
