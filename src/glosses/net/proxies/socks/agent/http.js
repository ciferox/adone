const {
    net: {
        proxy: {
            socks
        }
    }
} = adone;

export default class HttpAgent extends adone.std.http.Agent {
    constructor({
        proxyHost = "localhost",
        proxyPort = 1080,
        auths = [socks.auth.None()],
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
            auths,
            localDNS,
            strictLocalDNS
        };
    }

    createConnection(options, callback) {
        const client = new socks.Client(this.clientOptions);
        client.connect({
            host: options.host,
            port: options.port
        });
        client.on("error", callback);
        client.on("connect", (socket) => callback(null, socket));
    }
}
