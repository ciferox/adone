const { database: { mysql }, x } = adone;
const { c, __ } = mysql;
const { packet, command: { Command } } = __;

const flagNames = (flags) => {
    const res = [];
    for (const c in c.client) {
        if (flags & c.client[c]) {
            res.push(c.replace(/_/g, " ").toLowerCase());
        }
    }
    return res;
};

export default class ClientHandshake extends Command {
    constructor(clientFlags) {
        super();
        this.handshake = null;
        this.clientFlags = clientFlags;
    }

    start() {
        return ClientHandshake.prototype.handshakeInit;
    }

    sendSSLRequest(connection) {
        const sslRequest = new packet.SSLRequest(this.clientFlags, connection.config.charsetNumber);
        connection.writePacket(sslRequest.toPacket());
    }

    sendCredentials(connection) {
        if (connection.config.debug) {
            adone.debug("Sending handshake packet: flags:%d=(%s)", this.clientFlags,
                flagNames(this.clientFlags).join(", "));
        }

        this.user = connection.config.user;
        this.password = connection.config.password;
        this.passwordSha1 = connection.config.passwordSha1;
        this.database = connection.config.database;

        const handshakeResponse = new packet.HandshakeResponse({
            flags: this.clientFlags,
            user: this.user,
            database: this.database,
            password: this.password,
            passwordSha1: this.passwordSha1,
            charsetNumber: connection.config.charsetNumber,
            authPluginData1: this.handshake.authPluginData1,
            authPluginData2: this.handshake.authPluginData2,
            compress: connection.config.compress,
            connectAttributes: connection.config.connectAttributes
        });
        connection.writePacket(handshakeResponse.toPacket());
    }

    calculateNativePasswordAuthToken(authPluginData) {
        // TODO: dont split into authPluginData1 and authPluginData2, instead join when 1 & 2 received
        const authPluginData1 = authPluginData.slice(0, 8);
        const authPluginData2 = authPluginData.slice(8, 20);
        let authToken;
        if (this.passwordSha1) {
            authToken = mysql.auth.calculateTokenFromPasswordSha(
                this.passwordSha1,
                authPluginData1,
                authPluginData2
            );
        } else {
            authToken = mysql.auth.calculateToken(this.password, authPluginData1, authPluginData2);
        }
        return authToken;
    }

    handshakeInit(helloPacket, connection) {
        const command = this;

        this.on("error", (e) => {
            connection._fatalError = e;
            connection._protocolError = e;
        });

        this.handshake = packet.Handshake.fromPacket(helloPacket);
        if (connection.config.debug) {
            adone.debug(
                "Server hello packet: capability flags:%d=(%s)",
                this.handshake.capabilityFlags,
                flagNames(this.handshake.capabilityFlags).join(", ")
            );
        }
        connection.serverCapabilityFlags = this.handshake.capabilityFlags;
        connection.serverEncoding = c.charsetEncoding[this.handshake.characterSet];
        connection.connectionId = this.handshake.connectionId;
        const serverSSLSupport = this.handshake.capabilityFlags & c.client.SSL;

        // use compression only if requested by client and supported by server
        connection.config.compress = connection.config.compress &&
                                     (this.handshake.capabilityFlags & c.client.COMPRESS);
        this.clientFlags = this.clientFlags | connection.config.compress;

        if (connection.config.ssl) {
            // client requires SSL but server does not support it
            if (!serverSSLSupport) {
                const err = new x.NotSupported("Server does not support secure connnection");
                err.code = "HANDSHAKE_NO_SSL_SUPPORT";
                err.fatal = true;
                command.emit("error", err);
                return false;
            }
            // send ssl upgrade request and immediately upgrade connection to secure
            this.clientFlags |= c.client.SSL;
            this.sendSSLRequest(connection);
            connection.startTLS((err) => {
                // after connection is secure
                if (err) {
                    // SSL negotiation error are fatal
                    err.code = "HANDSHAKE_SSL_ERROR";
                    err.fatal = true;
                    command.emit("error", err);
                    return;
                }
                // rest of communication is encrypted
                command.sendCredentials(connection);
            });
        } else {
            this.sendCredentials(connection);
        }
        return ClientHandshake.prototype.handshakeResult;
    }

    handshakeResult(p, connection) {
        const marker = p.peekByte();
        if (marker === 0xfe || marker === 1) {
            let asr;
            let asrmd;
            const authSwitchHandlerParams = {};
            if (marker === 1) {
                asrmd = packet.AuthSwitchRequestMoreData.fromPacket(p);
                authSwitchHandlerParams.pluginData = asrmd.data;
            } else {
                asr = packet.AuthSwitchRequest.fromPacket(p);
                authSwitchHandlerParams.pluginName = asr.pluginName;
                authSwitchHandlerParams.pluginData = asr.pluginData;
            }
            if (authSwitchHandlerParams.pluginName === "mysql_native_password") {
                const authToken = this.calculateNativePasswordAuthToken(
                    authSwitchHandlerParams.pluginData
                );
                connection.writePacket(new packet.AuthSwitchResponse(authToken).toPacket());
            } else if (connection.config.authSwitchHandler) {
                connection.config.authSwitchHandler(authSwitchHandlerParams, (err, data) => {
                    if (err) {
                        connection.emit("error", err);
                        return;
                    }
                    connection.writePacket(new packet.AuthSwitchResponse(data).toPacket());
                });
            } else {
                connection.emit(
                    "error",
                    new x.IllegalState("Server requires auth switch, but no auth switch handler provided")
                );
                return null;
            }
            return ClientHandshake.prototype.handshakeResult;
        }

        if (marker !== 0) {
            const err = new x.IllegalState("Unexpected packet during handshake phase");
            if (this.onResult) {
                this.onResult(err);
            } else {
                connection.emit("error", err);
            }
            return null;
        }

        // this should be called from ClientHandshake command only
        // and skipped when called from ChangeUser command
        if (!connection.authorized) {
            connection.authorized = true;
            if (connection.config.compress) {
                mysql.enableCompression(connection);
            }
        }

        if (this.onResult) {
            this.onResult(null);
        }
        return null;
    }
}
