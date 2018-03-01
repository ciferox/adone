const {
    net: {
        proxy: {
            shadowsocks
        }
    }
} = adone;

export default class HttpsAgent extends adone.std.https.Agent {
    constructor({
        proxyHost = "localhost",
        proxyPort = 1080,
        password,
        iv = null,
        cipher = "aes-256-cbc",
        localDNS = true,
        strictLocalDNS = true,
        rejectUnauthorized = true,

        keepAlive = false,
        keepAliveMsecs = 1000,
        maxSockets = Infinity,
        maxFreeSockets = 256,
        maxCachedSessions = 100
    } = {}) {
        super({
            keepAlive,
            keepAliveMsecs,
            maxSockets,
            maxFreeSockets,
            maxCachedSessions
        });

        this.clientOptions = {
            proxyHost,
            proxyPort,
            password,
            iv,
            cipher,
            localDNS,
            strictLocalDNS
        };

        this.rejectUnauthorized = rejectUnauthorized;
    }

    createConnection(options, callback) {
        const client = new shadowsocks.Client(this.clientOptions);

        client.connect({
            port: options.port,
            host: options.host
        });

        client.on("error", callback);

        client.on("connect", (socket) => {
            let session;

            if (options._agentKey) {
                session = this._getSession(options._agentKey);
            }

            const cleartext = adone.std.tls.connect({
                socket,
                session,
                servername: options.host,
                rejectUnauthorized: this.rejectUnauthorized
            });

            cleartext.on("secureConnect", () => {
                if (options._agentKey) {
                    this._cacheSession(options._agentKey, cleartext.getSession());
                }
                cleartext.removeListener("error", callback);
                callback(null, cleartext);
            });

            cleartext.on("error", callback);

            cleartext.once("close", (err) => {
                if (err) {
                    this._evictSession(options._agentKey);
                }
                socket.destroy(err);
            });
        });
    }
}
