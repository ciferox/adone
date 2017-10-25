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

export default class Execute {
    constructor(id, parameters, charsetNumber) {
        this.id = id;
        this.parameters = parameters;
        this.encoding = c.charsetEncoding[charsetNumber];
    }

    toPacket() {
        // TODO: don't try to calculate packet length in advance, allocate some big buffer in advance (header + 256 bytes?)
        // and copy + reallocate if not enough

        let i;
        // 0 + 4 - length, seqId
        // 4 + 1 - COM_EXECUTE
        // 5 + 4 - stmtId
        // 9 + 1 - flags
        // 10 + 4 - iteration-count (always 1)
        let length = 14;
        if (this.parameters && this.parameters.length > 0) {
            length += Math.floor((this.parameters.length + 7) / 8);
            length += 1; // new-params-bound-flag
            length += 2 * this.parameters.length; // type byte for each parameter if new-params-bound-flag is set
            for (i = 0; i < this.parameters.length; i++) {
                if (!is.null(this.parameters[i])) {
                    if (is.date(this.parameters[i])) {
                        const d = this.parameters[i];
                        // TODO: move to asMysqlDateTime()
                        this.parameters[i] = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
                    }
                    if (is.datetime(this.parameters[i])) {
                        // TODO: move to asMysqlDateTime()
                        this.parameters[i] = this.parameters[i].format("YYYY-M-D H:m:s");
                    }
                    if (is.buffer(this.parameters[i])) {
                        length += packet.Packet.lengthCodedNumberLength(this.parameters[i].length);
                        length += this.parameters[i].length;
                    } else {
                        const str = this.parameters[i].toString();
                        length += packet.Packet.lengthCodedStringLength(str, this.encoding);
                    }
                }
            }
        }

        const buffer = Buffer.allocUnsafe(length);
        const p = new packet.Packet(0, buffer, 0, length);
        p.offset = 4;
        p.writeInt8(c.command.STMT_EXECUTE);
        p.writeInt32(this.id);
        p.writeInt8(c.cursor.NO_CURSOR); // flags
        p.writeInt32(1); // iteration-count, always 1
        if (this.parameters && this.parameters.length > 0) {

            let bitmap = 0;
            let bitValue = 1;
            for (i = 0; i < this.parameters.length; i++) {
                if (is.null(this.parameters[i])) {
                    bitmap += bitValue;
                }
                bitValue *= 2;
                if (bitValue === 256) {
                    p.writeInt8(bitmap);
                    bitmap = 0;
                    bitValue = 1;
                }
            }
            if (bitValue !== 1) {
                p.writeInt8(bitmap);
            }

            // TODO: explain meaning of the flag
            // afaik, if set n*2 bytes with type of parameter are sent before parameters
            // if not, previous execution types are used (TODO prooflink)
            p.writeInt8(1); // new-params-bound-flag

            // TODO: don't typecast always to sting, use parameters type
            for (i = 0; i < this.parameters.length; i++) {
                if (!is.null(this.parameters[i])) {
                    p.writeInt16(c.type.VAR_STRING);
                } else {
                    p.writeInt16(c.type.NULL);
                }
            }

            for (i = 0; i < this.parameters.length; i++) {
                if (!is.null(this.parameters[i])) {
                    if (is.buffer(this.parameters[i])) {
                        p.writeLengthCodedBuffer(this.parameters[i]);
                    } else {
                        p.writeLengthCodedString(this.parameters[i].toString(), this.encoding);
                    }
                }
            }
        }
        return p;
    }
}
