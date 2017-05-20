const { EventEmitter } = adone;

export default class Command extends EventEmitter {
    constructor() {
        super();
        this.next = null;
    }

    // slow. debug only
    stateName() {
        const state = this.next;
        for (const i in this) {
            if (this[i] == state && i !== "next") {
                return i;
            }
        }
        return "unknown name";
    }

    execute(packet, connection) {
        if (!this.next) {
            this.next = this.start;
            connection._resetSequenceId();
        }

        if (packet && packet.isError()) {
            const err = packet.asError(connection.clientEncoding);
            if (this.onResult) {
                this.onResult(err);
            } else {
                this.emit("error", err);
            }
            return true;
        }

        // TODO: don't return anything from execute, it's ugly and error-prone. Listen for 'end' event in connection
        this.next = this.next(packet, connection);
        if (this.next) {
            return false;
        } 
        this.emit("end");
        return true;
        
    }
}
