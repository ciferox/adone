const {
    net: {
        proxy: {
            shadowsocks
        }
    }
} = adone;

export default class HttpAgent extends adone.std.http.Agent {
    constructor({
        proxyHost = "localhost",
        proxyPort = 1080,
        password,
        iv = null,
        cipher = "aes-256-cbc",
        localDNS = true,
        strictLocalDNS = true,

        keepAlive = false,
        keepAliveMsecs = 1000,
        maxSockets = Infinity,
        maxFreeSockets = 256
    } = {}) {
        super({
            keepAlive,
            keepAliveMsecs,
            maxSockets,
            maxFreeSockets
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
    }

    createConnection(options, callback) {
        const client = new shadowsocks.Client(this.clientOptions);
        client.connect({
            host: options.host,
            port: options.port
        });
        client.on("error", callback);
        client.on("connect", (socket) => callback(null, socket));
    }
}
