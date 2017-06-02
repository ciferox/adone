const { database: { mysql: { __ } } } = adone;
const { packet, command: { Command } } = __;

class BinlogEventHeader {
    constructor(packet) {
        this.timestamp = packet.readInt32();
        this.eventType = packet.readInt8();
        this.serverId = packet.readInt32();
        this.eventSize = packet.readInt32();
        this.logPos = packet.readInt32();
        this.flags = packet.readInt16();
    }
}

class RotateEvent {
    constructor(packet) {
        this.pposition = packet.readInt32();
        // TODO: read uint64 here
        packet.readInt32();  // pos
        this.nextBinlog = packet.readString();
        this.name = "RotateEvent";
    }
}

class FormatDescriptionEvent {
    constructor(packet) {
        this.binlogVersion = packet.readInt16();
        this.serverVersion = packet.readString(50).replace(/\u0000.*/, "");
        this.createTimestamp = packet.readInt32();
        this.eventHeaderLength = packet.readInt8(); // should be 19
        this.eventsLength = packet.readBuffer();
        this.name = "FormatDescriptionEvent";
    }
}

class QueryEvent {
    constructor(packet) {
        this.slaveProxyId = packet.readInt32();
        this.executionTime = packet.readInt32();
        const schemaLength = packet.readInt8();
        this.errorCode = packet.readInt16();
        const statusVarsLength = packet.readInt16();
        const statusVars = packet.readBuffer(statusVarsLength);

        this.schema = packet.readString(schemaLength);
        packet.readInt8(); // should be zero
        this.statusVars = packet.parseStatusVars(statusVars);

        this.query = packet.readString();
        this.name = "QueryEvent";
    }
}

class XidEvent {
    constructor(packet) {
        this.binlogVersion = packet.readInt16();
        this.xid = packet.readInt64();
        this.name = "XidEvent";
    }
}

const eventParsers = [];

eventParsers[2] = QueryEvent;
eventParsers[4] = RotateEvent;
eventParsers[15] = FormatDescriptionEvent;
eventParsers[16] = XidEvent;

export default class BinlogDump extends Command {
    constructor(opts) {
        super();
        this.opts = opts;
    }

    start(_, connection) {
        const p = new packet.BinlogDump(this.opts);
        connection.writePacket(p.toPacket(1));
        return BinlogDump.prototype.binlogData;
    }

    binlogData(packet) {
        // ok - continue consuming events
        // error - error
        // eof - end of binlog
        if (packet.isEOF()) {
            this.emit("eof");
            return null;
        }

        // binlog event header
        packet.readInt8();  // ok
        const header = new BinlogEventHeader(packet);
        const EventParser = eventParsers[header.eventType];
        let event;
        if (EventParser) {
            event = new EventParser(packet);
        } else {
            event = {
                name: "UNKNOWN"
            };
        }
        event.header = header;
        this.emit("event", event);
        return BinlogDump.prototype.binlogData;
    }
}
