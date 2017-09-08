const {
    database: { mysql }
} = adone;

const {
    packet,
    command: { Command }
} = adone.private(mysql);

export default class CloseStatement extends Command {
    constructor(id) {
        super();
        this.id = id;
    }

    start(_, connection) {
        connection.writePacket(new packet.CloseStatement(this.id).toPacket(1));
        return null;
    }
}
