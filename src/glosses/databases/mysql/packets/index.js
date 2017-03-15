const { is, lazify } = adone;

const packet = lazify({
    AuthSwitchRequestMoreData: "./auth_switch_request_more_data",
    AuthSwitchRequest: "./auth_switch_request",
    AuthSwitchResponse: "./auth_switch_response",
    BinaryRow: "./binary_row",
    BinlogDump: "./binlog_dump",
    ChangeUser: "./change_user",
    CloseStatement: "./close_statement",
    ColumnDefinition: "./column_definition",
    Execute: "./execute",
    HandshakeResponse: "./handshake_response",
    Handshake: "./handshake",
    Packet: "./packet",
    PrepareStatement: "./prepare_statement",
    PreparedStatementHeader: "./prepared_statement_header",
    Query: "./query",
    RegisterSlave: "./register_slave",
    ResultSetHeader: "./resultset_header",
    SSLRequest: "./ssl_request",
    TextRow: "./text_row",
    parseStatusVars: "./binlog_query_statusvars"
}, null, require);

packet.OK = class OK {
    static toPacket(args, encoding) {
        args = args || {};
        const affectedRows = args.affectedRows || 0;
        const insertId = args.insertId || 0;
        const serverStatus = args.serverStatus || 0;
        const warningCount = args.warningCount || 0;
        const message = args.message || "";

        let length = 9 + packet.Packet.lengthCodedNumberLength(affectedRows);
        length += packet.Packet.lengthCodedNumberLength(insertId);

        const buffer = Buffer.allocUnsafe(length);
        const p = new packet.Packet(0, buffer, 0, length);
        p.offset = 4;
        p.writeInt8(0);
        p.writeLengthCodedNumber(affectedRows);
        p.writeLengthCodedNumber(insertId);
        p.writeInt16(serverStatus);
        p.writeInt16(warningCount);
        p.writeString(message, encoding);
        p._name = "OK";
        return p;
    }
};

packet.EOF = class EOF {
    static toPacket(warnings, statusFlags) {
        if (is.undefined(warnings)) {
            warnings = 0;
        }
        if (is.undefined(statusFlags)) {
            statusFlags = 0;
        }
        const p = new packet.Packet(0, Buffer.allocUnsafe(9), 0, 9);
        p.offset = 4;
        p.writeInt8(0xfe);
        p.writeInt16(warnings);
        p.writeInt16(statusFlags);
        p._name = "EOF";
        return p;
    }
};

packet.Error = class Error {
    static toPacket(args, encoding) {
        const length = 13 + Buffer.byteLength(args.message, "utf8");
        const p = new packet.Packet(0, Buffer.allocUnsafe(length), 0, length);
        p.offset = 4;
        p.writeInt8(0xff);
        p.writeInt16(args.code);
        // TODO: sql state parameter
        p.writeString("#_____", encoding);
        p.writeString(args.message, encoding);
        p._name = "Error";
        return p;
    }
};

export default packet;
