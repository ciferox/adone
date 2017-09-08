const {
    database: { mysql }
} = adone;

const {
    packet,
    command: { Command }
} = adone.private(mysql);

export default class RegisterSlave extends Command {
    constructor(opts, callback) {
        super();
        this.onResult = callback;
        this.opts = opts;
    }

    start(_, connection) {
        const p = new packet.RegisterSlave(this.opts);
        connection.writePacket(p.toPacket(1));
        return RegisterSlave.prototype.registerResponse;
    }

    registerResponse() {
        if (this.onResult) {
            process.nextTick(() => this.onResult());
        }
        return null;
    }
}
