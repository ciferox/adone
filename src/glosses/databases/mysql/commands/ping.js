const { database: { mysql: { c, packet, command: { Command } } } } = adone;

// TODO: time statistics?
// usefull for queue size and network latency monitoring
// store created,sent,reply timestamps

export default class Ping extends Command {
    constructor(callback) {
        super();
        this.onResult = callback;
    }

    start(_, connection) {
        const ping = new packet.Packet(0, Buffer.from([1, 0, 0, 0, c.command.PING]), 0, 5);
        connection.writePacket(ping);
        return Ping.prototype.pingResponse;
    }

    pingResponse() {
        // TODO: check it's OK packet. error check already done in caller
        if (this.onResult) {
            process.nextTick(this.onResult.bind(this));
        }
        return null;
    }
}
