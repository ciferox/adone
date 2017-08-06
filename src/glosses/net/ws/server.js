const { is } = adone;

const socketError = () => {
    this.destroy();
};

const acceptExtensions = (options, offer) => {
    const pmd = options.perMessageDeflate;
    const extensions = {};

    if (pmd && offer[adone.net.ws.PerMessageDeflate.extensionName]) {
        const perMessageDeflate = new adone.net.ws.PerMessageDeflate(
            pmd !== true ? pmd : {},
            true,
            options.maxPayload
        );

        perMessageDeflate.accept(offer[adone.net.ws.PerMessageDeflate.extensionName]);
        extensions[adone.net.ws.PerMessageDeflate.extensionName] = perMessageDeflate;
    }

    return extensions;
};

const abortConnection = (socket, code, message) => {
    if (socket.writable) {
        message = message || adone.std.http.STATUS_CODES[code];
        socket.write(
            `${`HTTP/1.1 ${code} ${adone.std.http.STATUS_CODES[code]}\r\n` +
            "Connection: close\r\n" +
            "Content-type: text/html\r\n" +
            `Content-Length: ${Buffer.byteLength(message)}\r\n` +
            "\r\n"}${message}`
        );
    }

    socket.removeListener("error", socketError);
    socket.destroy();
};

export default class Server extends adone.EventEmitter {
    constructor(options, callback) {
        super();

        options = Object.assign({
            maxPayload: 100 * 1024 * 1024,
            perMessageDeflate: false,
            handleProtocols: null,
            clientTracking: true,
            verifyClient: null,
            noServer: false,
            backlog: null, // use default (511 as implemented in net.js)
            server: null,
            host: null,
            path: null,
            port: null
        }, options);

        if (is.nil(options.port) && !options.server && !options.noServer) {
            throw new TypeError("Missing or invalid options");
        }

        if (is.exist(options.port)) {
            this._server = adone.std.http.createServer((req, res) => {
                const body = adone.std.http.STATUS_CODES[426];

                res.writeHead(426, {
                    "Content-Length": body.length,
                    "Content-Type": "text/plain"
                });
                res.end(body);
            });
            this._server.allowHalfOpen = false;
            this._server.listen(options.port, options.host, options.backlog, callback);
        } else if (options.server) {
            this._server = options.server;
        }

        if (this._server) {
            this._listeners = {
                listening: () => this.emit("listening"),
                error: (err) => this.emit("error", err),
                upgrade: (req, socket, head) => {
                    this.handleUpgrade(req, socket, head, (client) => {
                        this.emit("connection", client, req);
                    });
                }
            };
            for (const [key, val] of Object.entries(this._listeners)) {
                this._server.on(key, val);
            }
        }

        if (options.clientTracking) {
            this.clients = new Set();
        }
        this.options = options;
    }

    close(cb) {
        //
        // Terminate all associated clients.
        //
        if (this.clients) {
            for (const client of this.clients) {
                client.terminate();
            }
        }

        const server = this._server;

        if (server) {
            for (const [key, val] of Object.entries(this._listeners)) {
                this._server.removeListener(key, val);
            }
            this._server = null;

            //
            // Close the http server if it was internally created.
            //
            if (is.exist(this.options.port)) {
                return server.close(cb);
            }
        }

        if (cb) {
            return cb();
        }
    }

    shouldHandle(req) {
        if (this.options.path && adone.std.url.parse(req.url).pathname !== this.options.path) {
            return false;
        }

        return true;
    }

    handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketError);

        const version = Number(req.headers["sec-websocket-version"]);

        if (
            req.method !== "GET" || req.headers.upgrade.toLowerCase() !== "websocket" ||
            !req.headers["sec-websocket-key"] || (version !== 8 && version !== 13) ||
            !this.shouldHandle(req)
        ) {
            return abortConnection(socket, 400);
        }

        let protocol = (req.headers["sec-websocket-protocol"] || "").split(/, */);

        //
        // Optionally call external protocol selection handler.
        //
        if (this.options.handleProtocols) {
            protocol = this.options.handleProtocols(protocol, req);
            if (protocol === false) {
                return abortConnection(socket, 401);
            }
        } else {
            protocol = protocol[0];
        }

        //
        // Optionally call external client verification handler.
        //
        if (this.options.verifyClient) {
            const info = {
                origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
                secure: Boolean(req.connection.authorized || req.connection.encrypted),
                req
            };

            if (this.options.verifyClient.length === 2) {
                this.options.verifyClient(info, (verified, code, message) => {
                    if (!verified) {
                        return abortConnection(socket, code || 401, message);
                    }

                    this.completeUpgrade(protocol, version, req, socket, head, cb);
                });
                return;
            } else if (!this.options.verifyClient(info)) {
                return abortConnection(socket, 401);
            }
        }

        this.completeUpgrade(protocol, version, req, socket, head, cb);
    }

    completeUpgrade(protocol, version, req, socket, head, cb) {
        //
        // Destroy the socket if the client has already sent a FIN packet.
        //
        if (!socket.readable || !socket.writable) {
            return socket.destroy();
        }

        const key = adone.std.crypto.createHash("sha1")
            .update(req.headers["sec-websocket-key"] + adone.net.ws.constants.GUID, "binary")
            .digest("base64");

        const headers = [
            "HTTP/1.1 101 Switching Protocols",
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Accept: ${key}`
        ];

        if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
        }

        const offer = adone.net.ws.exts.parse(req.headers["sec-websocket-extensions"]);
        let extensions;

        try {
            extensions = acceptExtensions(this.options, offer);
        } catch (err) {
            return abortConnection(socket, 400);
        }

        const props = Object.keys(extensions);

        if (props.length) {
            const serverExtensions = props.reduce((obj, key) => {
                obj[key] = [extensions[key].params];
                return obj;
            }, {});

            headers.push(`Sec-WebSocket-Extensions: ${adone.net.ws.exts.format(serverExtensions)}`);
        }

        //
        // Allow external modification/inspection of handshake headers.
        //
        this.emit("headers", headers, req);

        socket.write(headers.concat("", "").join("\r\n"));

        const client = new adone.net.ws.Client([socket, head], null, {
            maxPayload: this.options.maxPayload,
            protocolVersion: version,
            extensions,
            protocol
        });

        if (this.clients) {
            this.clients.add(client);
            client.on("close", () => this.clients.delete(client));
        }

        socket.removeListener("error", socketError);
        cb(client);
    }
}
