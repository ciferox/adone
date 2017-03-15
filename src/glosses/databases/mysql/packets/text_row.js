const { is, database: { mysql: { packet: { Packet } } } } = adone;

export default class TextRow {
    constructor(columns) {
        this.columns = columns || [];
    }

    static fromPacket(packet) {
        // packet.reset(); // set offset to starting point?
        const columns = [];
        while (packet.haveMoreData()) {
            columns.push(packet.readLengthCodedString());
        }
        return new TextRow(columns);
    }

    static toPacket(columns, encoding) {
        const sequenceId = 0; // TODO remove, this is calculated now in connecton
        let length = 0;

        columns.forEach((column) => {
            if (is.nil(column)) {
                ++length;
                return;
            }
            length += Packet.lengthCodedStringLength(column.toString(10), encoding);
        });

        const buffer = Buffer.allocUnsafe(length + 4);
        const packet = new Packet(sequenceId, buffer, 0, length + 4);
        packet.offset = 4;

        columns.forEach((column) => {
            if (is.null(column)) {
                packet.writeNull();
                return;
            }
            if (is.undefined(column)) {
                packet.writeInt8(0);
                return;
            }
            packet.writeLengthCodedString(column.toString(10), encoding);
        });
        return packet;
    }
}
