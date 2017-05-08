const { EventEmitter, util } = adone;

export default class Agent extends EventEmitter {
    constructor({
        proxyHost = "localhost",
        proxyPort = 8388,
        password,
        cipher,
        iv = null,
        https = false,
        keepAlive = false,
        keepAliveMsecs = 1000
    } = {}) {
        super();
        this.proxyHost = proxyHost;
        this.proxyPort = proxyPort;
        this.cipher = cipher;
        this.iv = iv;
        this.password = password;
        this.https = https;
        this.keepAlive = keepAlive;
        this.keepAliveMsecs = keepAliveMsecs;

        if (keepAlive) {
            this.freeSockets = {};
            this.on("free", (socket, key) => {
                if (!socket._httpMessage.shouldKeepAlive) {
                    socket.destroy();
                    return;
                }
                if (!this.freeSockets[key]) {
                    this.freeSockets[key] = [];
                }
                this.freeSockets[key].push(socket);
                socket.unref();
            });
        }
    }

    addRequest(req, options) {
        const key = `${options.host}:${options.port}`;
        if (this.keepAlive && this.freeSockets[key]) {
            const socket = this.freeSockets[key].shift();
            if (!this.freeSockets[key].length) {
                delete this.freeSockets[key];
            }
            socket.ref();
            socket._httpMessage = req;
            req.onSocket(socket);
            return;
        }
        this.createConnection(options, (err, socket) => {
            if (err) {
                process.nextTick(() => req.emit("error", err));
                return;
            }
            if (this.keepAlive) {
                socket.on("free", () => {
                    this.emit("free", socket, key);
                });
                socket.once("end", () => {
                    if (!this.freeSockets[key]) {
                        return;
                    }
                    this.freeSockets[key].splice(this.freeSockets[key].indexOf(socket), 1);
                    if (!this.freeSockets[key].length) {
                        delete this.freeSockets[key];
                    }
                });
                socket.setKeepAlive(true, this.keepAliveMsecs);
            }
            socket._httpMessage = req;
            req.onSocket(socket);
        });
    }

    createConnection(options, cb) {
        const client = adone.net.proxy.shadowsocks.createConnection({
            proxyPort: this.proxyPort,
            proxyHost: this.proxyHost,
            cipher: this.cipher,
            iv: this.iv,
            host: options.host,
            port: options.port,
            password: this.password
        })
            .once("connect", (socket) => {
                client.removeListener("error", cb);
                if (this.https) {
                    socket = adone.std.tls.connect({
                        host: options.host,
                        port: options.port,
                        socket
                    });
                }
                cb(null, socket);
            })
            .once("error", cb);
    }

    destroy() {
        for (const sockets of util.values(this.freeSockets)) {
            for (const socket of sockets) {
                socket.destroy();
            }
        }
    }
}
