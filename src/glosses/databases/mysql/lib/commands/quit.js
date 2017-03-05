var util = require("util");

var Command = require("./command.js").default;
var CommandCode = require("../constants/commands.js");
var Packet = require("../packets/packet.js");

export default class Quit extends Command {
    constructor(callback) {
        super();
        this.done = callback;
    }
}

Quit.prototype.start = function (packet, connection) {
    connection._closing = true;
    var quit = new Packet(0, Buffer.from([1, 0, 0, 0, CommandCode.QUIT]), 0, 5);
    if (this.done) {
        this.done();
    }
    connection.writePacket(quit);
    return null;
};