var Command = require("./command").default;
var util = require("util");
var CommandCode = require("../constants/commands");
var Packets = require("../packets");

export default class RegisterSlave extends Command {
    constructor(opts, callback) {
        super();
        this.onResult = callback;
        this.opts = opts;
    }
}

RegisterSlave.prototype.start = function (packet, connection) {
    var packet = new Packets.RegisterSlave(this.opts);
    connection.writePacket(packet.toPacket(1));
    return RegisterSlave.prototype.registerResponse;
};

RegisterSlave.prototype.registerResponse = function (packet) {
    if (this.onResult) {
        process.nextTick(this.onResult.bind(this));
    }
    return null;
};