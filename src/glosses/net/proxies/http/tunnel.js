const {
    error,
    is,
    event,
    std: { tls, http: _http }
} = adone;

class TunnelingAgent extends event.Emitter {
    constructor(options) {
        super();
        this.options = options || {};
        this.proxyOptions = this.options.proxy || {};
        this.maxSockets = this.options.maxSockets || _http.Agent.defaultMaxSockets;
        this.requests = [];
        this.sockets = [];

        this.on("free", (socket, host, port) => {
            for (let i = 0; i < this.requests.length; ++i) {
                const pending = this.requests[i];
                if (pending.host === host && pending.port === port) {
                    // Detect the request to connect same origin server,
                    // reuse the connection.
                    this.requests.splice(i, 1);
                    pending.request.onSocket(socket);
                    return;
                }
            }
            socket.destroy();
            this.removeSocket(socket);
        });
    }

    addRequest(req, options, port, path) {
        // Legacy API: addRequest(req, host, port, path)
        if (is.string(options)) {
            options = { host: options, port, path };
        }

        if (this.sockets.length >= this.maxSockets) {
            // We are over limit so we'll add it to the queue.
            this.requests.push({ host: options.host, port: options.port, request: req });
            return;
        }

        // If we are under maxSockets create a new one.
        this.createConnection({ host: options.host, port: options.port, request: req });
    }

    createConnection(pending) {
        this.createSocket(pending, (socket) => {
            const onFree = () => this.emit("free", socket, pending.host, pending.port);
            const onCloseOrRemove = () => {
                this.removeSocket(socket);
                socket.removeListener("free", onFree);
                socket.removeListener("close", onCloseOrRemove);
                socket.removeListener("agentRemove", onCloseOrRemove);
            };

            socket.on("free", onFree);
            socket.on("close", onCloseOrRemove);
            socket.on("agentRemove", onCloseOrRemove);
            pending.request.onSocket(socket);
        });
    }

    createSocket(options, cb) {
        const placeholder = {};
        this.sockets.push(placeholder);

        const connectOptions = adone.lodash.merge({}, this.proxyOptions, {
            method: "CONNECT",
            path: `${options.host}:${options.port}`,
            agent: false
        });
        if (connectOptions.proxyAuth) {
            connectOptions.headers = connectOptions.headers || {};
            connectOptions.headers["Proxy-Authorization"] = `Basic ${Buffer.from(connectOptions.proxyAuth).toString("base64")}`;
        }

        const connectReq = this.request(connectOptions);
        connectReq.once("connect", (res, socket) => {
            connectReq.removeAllListeners();
            socket.removeAllListeners();

            if (res.statusCode === 200) {
                this.sockets[this.sockets.indexOf(placeholder)] = socket;
                cb(socket);
            } else {
                const error = new Error(`tunneling socket could not be established, statusCode=${res.statusCode}`);
                error.code = "ECONNRESET";
                options.request.emit("error", error);
                this.removeSocket(placeholder);
            }
        });
        connectReq.once("error", (err) => {
            connectReq.removeAllListeners();

            const error = new error.IllegalState(`tunneling socket could not be established, cause=${err.message}`);
            error.code = "ECONNRESET";
            options.request.emit("error", error);
            this.removeSocket(placeholder);
        });
        connectReq.end();
    }

    removeSocket(socket) {
        const pos = this.sockets.indexOf(socket);
        if (pos === -1) {
            return;
        }

        this.sockets.splice(pos, 1);

        const pending = this.requests.shift();
        if (pending) {
            // If we have pending requests and a socket gets closed a new one
            // needs to be created to take over in the pool for the one that closed.
            this.createConnection(pending);
        }
    }
}

const createSecureSocket = function (options, cb) {
    TunnelingAgent.prototype.createSocket.call(this, options, (socket) => {
        const secureSocket = tls.connect(0, adone.lodash.merge({}, this.options, {
            servername: options.host,
            socket
        }));
        this.sockets[this.sockets.indexOf(socket)] = secureSocket;
        cb(secureSocket);
    });
};

export const https = {
    http: (options) => {
        const agent = new TunnelingAgent(options);
        agent.request = _http.request;
        agent.createSocket = createSecureSocket;
        agent.defaultPort = 443;
        return agent;
    }
};

export const http = {
    http: (options) => {
        const agent = new TunnelingAgent(options);
        agent.request = _http.request;
        return agent;
    }
};
