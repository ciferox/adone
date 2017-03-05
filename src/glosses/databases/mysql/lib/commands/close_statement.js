var util = require("util");

var Command = require("./command").default;
var Packets = require("../packets/index.js");

export default class CloseStatement extends Command {
    constructor(id) {
        super();
        this.id = id;
    }
}

CloseStatement.prototype.start = function (packet, connection) {
    connection.writePacket(new Packets.CloseStatement(this.id).toPacket(1));
    return null;
};
