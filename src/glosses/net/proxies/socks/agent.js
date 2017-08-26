export default class Agent extends adone.event.EventEmitter {
    constructor(options, secure, rejectUnauthorized) {
        super();
        this.options = options;
        this.secure = secure || false;
        this.rejectUnauthorized = rejectUnauthorized;

        if (this.rejectUnauthorized === undefined) {
            this.rejectUnauthorized = true;
        }
    }

    createConnection(req, opts, fn) {
        let handler = fn;
        const self = this;

        this.options.target = this.options.target || {};

        if (!this.options.target.host) {
            this.options.target.host = opts.host;
        }

        if (!this.options.target.port) {
            this.options.target.port = opts.port;
        }

        const host = this.options.target.host;

        if (this.secure) {
            handler = function (err, socket, info) {
                if (err) {
                    return fn(err);
                }

                // save encrypted socket
                self.encryptedSocket = socket;

                const options = {
                    socket,
                    servername: host,
                    rejectUnauthorized: self.rejectUnauthorized
                };

                const cleartext = adone.std.tls.connect(options, function (err) {
                    return fn(err, this);
                });
                cleartext.on("error", fn);

                socket.resume();
            };
        }

        adone.net.proxy.socks.Client.createConnection(this.options, handler);
    }

    addRequest(req, host, port, localAddress) {
        let opts;
        if (typeof host === "object") {
            // >= v0.11.x API
            opts = host;
            if (opts.host && opts.path) {
                // if both a `host` and `path` are specified then it's most likely the
                // result of a `url.parse()` call... we need to remove the `path` portion so
                // that `net.connect()` doesn't attempt to open that as a unix socket file.
                delete opts.path;
            }
        } else {
            // <= v0.10.x API
            opts = { host, port };
            if (localAddress !== null) {
                opts.localAddress = localAddress;
            }
        }

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
