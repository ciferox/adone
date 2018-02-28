const {
    net: {
        proxy: {
            socks
        }
    }
} = adone;

export default class Agent extends adone.std.http.Agent {
    constructor({
        proxyHost = "localhost",
        proxyPort = 1080,
        auths = [socks.auth.None()],
        localDNS = true,
        strictLocalDNS = true,
        https = false,
        rejectUnauthorized = true,

        keepAlive = false,
        keepAliveMsecs = 1000,
        maxSockets = 5,
        maxFreeSockets = 256
    }) {
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

        this.rejectUnauthorized = rejectUnauthorized;
        this.https = https;
        this.protocol = this.https ? "https:" : "http:";
    }

    createConnection(req, opts, fn) {
        let handler = fn;

        if (this.https) {
            handler = (err, socket) => {
                if (err) {
                    return fn(err);
                }

                const options = {
                    socket,
                    servername: opts.host,
                    rejectUnauthorized: this.rejectUnauthorized
                };

                const cleartext = adone.std.tls.connect(options, function (err) {
                    return fn(err, this);
                });
                cleartext.on("error", fn);

                socket.resume();
            };
        }

        const client = new socks.Client(this.clientOptions);

        client.once("connect", (socket) => {
            client.removeListener("error", handler);
            handler(null, socket);
        });
        client.once("error", handler);

        client.connect({
            port: opts.port,
            host: opts.host
        });
    }

    addRequest(req, opts) {
        let sync = true;

        this.createConnection(req, opts, (err, socket) => {
            const emitErr = () => req.emit("error", err);

            if (err) {
                if (sync) {
                    // need to defer the "error" event, when sync, because by now the `req`
                    // instance hasn't event been passed back to the user yet...
                    process.nextTick(emitErr);
                } else {
                    emitErr();
                }
            } else {
                req.onSocket(socket);
                //have to resume this socket when node 12
                socket.resume();
            }
        });

        sync = false;
    }
}
