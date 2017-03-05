var util = require("util");

var Command = require("./command.js").default;
var Packets = require("../packets/index.js");
var ClientConstants = require("../constants/client.js");
var ClientHandshake = require("./client_handshake.js").default;
var CharsetToEncoding = require("../constants/charset_encodings.js");

export default class ChangeUser extends Command {
    constructor(options, callback) {
        super();
        this.onResult = callback;
        this.user = options.user;
        this.password = options.password;
        this.database = options.database;
        this.passwordSha1 = options.passwordSha1;
        this.charsetNumber = options.charsetNumber;
        this.currentConfig = options.currentConfig;
    }
}

ChangeUser.prototype.handshakeResult = ClientHandshake.prototype.handshakeResult;
ChangeUser.prototype.calculateNativePasswordAuthToken = ClientHandshake.prototype.calculateNativePasswordAuthToken;

ChangeUser.prototype.start = function (packet, connection) {
    var packet = new Packets.ChangeUser({
        flags: connection.config.clientFlags,
        user: this.user,
        database: this.database,
        charsetNumber: this.charsetNumber,
        password: this.password,
        passwordSha1: this.passwordSha1,
        authPluginData1: connection._handshakePacket.authPluginData1,
        authPluginData2: connection._handshakePacket.authPluginData2
    });
    this.currentConfig.user = this.user;
    this.currentConfig.password = this.password;
    this.currentConfig.database = this.database;
    this.currentConfig.charsetNumber = this.charsetNumber;
    connection.clientEncoding = CharsetToEncoding[this.charsetNumber];
    // reset prepared statements cache as all statements become invalid after changeUser
    connection._statements.reset();
    connection.writePacket(packet.toPacket());
    return ChangeUser.prototype.handshakeResult;
};