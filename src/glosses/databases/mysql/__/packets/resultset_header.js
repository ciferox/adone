// TODO: rename to OK packet
// https://dev.mysql.com/doc/internals/en/packet-OK_Packet.html
const {
    is,
    database: { mysql }
} = adone;

const {
    c
} = mysql;

const {
    packet
} = adone.private(mysql);

export default class ResultSetHeader {
    constructor(packet, connection) {
        const bigNumberStrings = connection.config.bigNumberStrings;
        const encoding = connection.serverEncoding;

        const flags = connection._handshakePacket.capabilityFlags;

        const isSet = (flag) => flags & c.client[flag];

        if (packet.buffer[packet.offset] !== 0) {
            this.fieldCount = packet.readLengthCodedNumber();
            if (is.null(this.fieldCount)) {
                this.infileName = packet.readString(undefined, encoding);
            }
            return;
        }

        this.fieldCount = packet.readInt8(); // skip OK byte
        this.affectedRows = packet.readLengthCodedNumber(bigNumberStrings);
        this.insertId = packet.readLengthCodedNumberSigned(bigNumberStrings);
        this.info = "";


        if (isSet("PROTOCOL_41")) {
            this.serverStatus = packet.readInt16();
            this.warningStatus = packet.readInt16();
        } else if (isSet("TRANSACTIONS")) {
            this.serverStatus = packet.readInt16();
        }

        let stateChanges = null;
        if (isSet("SESSION_TRACK") && packet.offset < packet.end) {
            this.info = packet.readLengthCodedString(encoding);
            if (this.serverStatus && c.serverStatus.SERVER_SESSION_STATE_CHANGED) {

                // session change info record - see
                // https://dev.mysql.com/doc/internals/en/packet-OK_Packet.html#cs-sect-packet-ok-sessioninfo

                const len = packet.offset < packet.end ? packet.readLengthCodedNumber() : 0;
                const end = packet.offset + len;

                if (len > 0) {
                    stateChanges = {
                        systemVariables: {},
                        schema: null,
                        // gtids: {},
                        trackStateChange: null
                    };
                }

                while (packet.offset < end) {
                    const type = packet.readInt8();
                    const len = packet.readLengthCodedNumber();
                    const stateEnd = packet.offset + len;
                    const key = packet.readLengthCodedString(encoding);
                    if (type === 0) {
                        const val = packet.readLengthCodedString(encoding);
                        stateChanges.systemVariables[key] = val;
                        if (key === "character_set_client") {
                            const charsetNumber = c.encodingCharset[val];
                            connection.config.charsetNumber = charsetNumber;
                        }
                    } else if (type === 1) {
                        // TODO double check it's supposed to be the only value, not a list.
                        stateChanges.schema = key;
                    } else if (type === 2) {
                        stateChanges.trackStateChange = packet.readLengthCodedString(encoding);
                    } else {
                        // GTIDs (type == 3) or unknown type - just skip for now
                    }
                    packet.offset = stateEnd;
                }
            }
        } else {
            this.info = packet.readString(undefined, encoding);
        }

        if (stateChanges) {
            this.stateChanges = stateChanges;
        }

        const m = this.info.match(/\schanged:\s*(\d+)/i);
        if (!is.null(m)) {
            this.changedRows = parseInt(m[1], 10);
        }
    }

    // TODO: should be consistent instance member, but it's just easier here to have just function
    static toPacket(fieldCount, insertId) {
        let length = 4 + packet.Packet.lengthCodedNumberLength(fieldCount);
        if (!is.undefined(insertId)) {
            length += packet.Packet.lengthCodedNumberLength(insertId);
        }
        const buffer = Buffer.allocUnsafe(length);
        const p = new packet.Packet(0, buffer, 0, length);
        p.offset = 4;
        p.writeLengthCodedNumber(fieldCount);
        if (!is.undefined(insertId)) {
            p.writeLengthCodedNumber(insertId);
        }
        return p;
    }
}
