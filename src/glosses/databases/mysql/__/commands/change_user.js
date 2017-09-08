const {
    database: { mysql },
    lazify
} = adone;

const {
    c
} = mysql;

const {
    packet,
    command
} = adone.private(mysql);

const {
    Command
} = command;

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

    start(_, connection) {
        const p = new packet.ChangeUser({
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
        connection.clientEncoding = c.charsetEncoding[this.charsetNumber];
        // reset prepared statements cache as all statements become invalid after changeUser
        connection._statements.clear();
        connection.writePacket(p.toPacket());
        return ChangeUser.prototype.handshakeResult;
    }
}

lazify({
    handshakeResult: () => command.ClientHandshake.prototype.handshakeResult,
    calculateNativePasswordAuthToken: () => command.ClientHandshake.prototype.calculateNativePasswordAuthToken
}, ChangeUser.prototype);
