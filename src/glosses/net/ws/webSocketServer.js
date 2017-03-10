
const is = adone.is;
import PerMessageDeflate from "./perMessageDeflate";
const WebSocket = adone.net.ws.WebSocket;

/**
 * Close the connection when preconditions are not fulfilled.
 *
 * @param {net.Socket} socket The socket of the upgrade request
 * @param {Number} code The HTTP response status code
 * @param {String} [message] The HTTP response body
 * @api private
 */
function abortConnection(socket, code, message) {
    if (socket.writable) {
        message = message || adone.std.http.STATUS_CODES[code];
        socket.write(
            `HTTP/1.1 ${code} ${adone.std.http.STATUS_CODES[code]}\r\n` +
            "Connection: close\r\n" +
            "Content-type: text/html\r\n" +
            `Content-Length: ${Buffer.byteLength(message)}\r\n` +
            "\r\n" +
            message
        );
    }
    socket.destroy();
}

export default class WebSocketServer extends adone.EventEmitter {
    constructor(options, callback) {
        super();

        options = Object.assign({
            host: "0.0.0.0",
            port: null,
            server: null,
            verifyClient: null,
            handleProtocols: null,
            path: null,
            noServer: false,
            clientTracking: true,
            perMessageDeflate: true,
            maxPayload: 100 * 1024 * 1024,
            backlog: null // use default (511 as implemented in net.js)
        }, options);

        if (is.nil(options.port) && is.nil(options.server) && !options.noServer) {
            throw new TypeError("`port` or a `server` must be provided");
        }

        if (!is.nil(options.port)) {
            this._server = adone.std.http.createServer((req, res) => {
                const body = adone.std.http.STATUS_CODES[426];
                res.writeHead(426, {
                    "Content-Length": body.length,
                    "Content-Type": "text/plain"
                });
                res.end(body);
            });
            this._server.allowHalfOpen = false;
            // maybe use a generic server.listen(options[, callback]) variant here, instead of two overloaded variants?
            if (!is.nil(options.backlog)) {
                this._server.listen(options.port, options.host, options.backlog, callback);
            } else {
                this._server.listen(options.port, options.host, callback);
            }
            this._closeServer = () => this._server && this._server.close();
        } else if (options.server) {
            this._server = options.server;
            if (options.path) {
                // take note of the path, to avoid collisions when multiple websocket servers are
                // listening on the same http server
                if (this._server._webSocketPaths && options.server._webSocketPaths[options.path]) {
                    throw new Error("two instances of WebSocketServer cannot listen on the same http server path");
                }
                if (!this._server._webSocketPaths) this._server._webSocketPaths = {};
                this._server._webSocketPaths[options.path] = 1;
            }
        }

        if (this._server) {
            this._onceServerListening = () => this.emit("listening");
            this._server.once("listening", this._onceServerListening);
            this._onServerError = (error) => this.emit("error", error);
            this._server.on("error", this._onServerError);
            this._onServerUpgrade = (req, socket, upgradeHead) => {
                // copy upgradeHead to avoid retention of large slab buffers used in node core
                const head = new Buffer(upgradeHead.length);
                upgradeHead.copy(head);

                this.handleUpgrade(req, socket, head, (client) => {
                    this.emit(`connection${req.url}`, client);
                    this.emit("connection", client);
                });
            };
            this._server.on("upgrade", this._onServerUpgrade);
        }

        if (options.clientTracking) this.clients = new Set();
        this.options = options;
        this.path = options.path;
    }

    /**
     * Immediately shuts down the connection.
     *
     * @api public
     */
    close(callback) {
        // terminate all associated clients
        let error = null;

        if (this.clients) {
            for (const client of this.clients) {
                try {
                    client.terminate();
                } catch (e) {
                    error = e;
                }
            }
        }

        // remove path descriptor, if any
        if (this.path && this._server._webSocketPaths) {
            delete this._server._webSocketPaths[this.path];
            if (Object.keys(this._server._webSocketPaths).length === 0) {
                delete this._server._webSocketPaths;
            }
        }

        // close the http server if it was internally created
        try {
            if (this._closeServer !== undefined) {
                this._closeServer();
            }
        } finally {
            if (this._server) {
                this._server.removeListener("listening", this._onceServerListening);
                this._server.removeListener("error", this._onServerError);
                this._server.removeListener("upgrade", this._onServerUpgrade);
            }
            delete this._server;
        }
        if (callback) {
            callback(error);
        } else if (error) {
            throw error;
        }
    }

    /**
     * Handle a HTTP Upgrade request.
     *
     * @api public
     */
    handleUpgrade(req, socket, upgradeHead, cb) {
        // check for wrong path
        if (this.options.path) {
            const u = adone.std.url.parse(req.url);
            if (u && u.pathname !== this.options.path) {
                return abortConnection(socket, 400);
            }
        }

        if (!req.headers.upgrade || req.headers.upgrade !== "websocket") {
            return abortConnection(socket, 400);
        }

        // handle premature socket errors
        const errorHandler = () => {
            try {
                socket.destroy();
            } catch (e) { }
        };
        socket.on("error", errorHandler);

        // verify key presence
        if (!req.headers["sec-websocket-key"]) {
            return abortConnection(socket, 400);
        }

        // verify version
        const version = +req.headers["sec-websocket-version"];
        if (version !== 8 && version !== 13) {
            return abortConnection(socket, 400);
        }

        // verify protocol
        const protocols = req.headers["sec-websocket-protocol"];

        // verify client
        const origin = version !== 13 ? req.headers["sec-websocket-origin"] : req.headers["origin"];

        // handle extensions offer
        const extensionsOffer = adone.net.ws.exts.parse(req.headers["sec-websocket-extensions"]);

        // handler to call when the connection sequence completes
        const completeHybiUpgrade2 = (protocol) => {
            // calc key
            const key = adone.std.crypto.createHash("sha1")
                .update(`${req.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, "binary")
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

            let extensions = {};
            try {
                const options = this.options.perMessageDeflate;
                const maxPayload = this.options.maxPayload;
                if (options && extensionsOffer[PerMessageDeflate.extensionName]) {
                    const perMessageDeflate = new PerMessageDeflate(options !== true ? options : {}, true, maxPayload);
                    perMessageDeflate.accept(extensionsOffer[PerMessageDeflate.extensionName]);
                    extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
                }
            } catch (err) {
                return abortConnection(socket, 400);
            }

            if (Object.keys(extensions).length) {
                const serverExtensions = {};
                Object.keys(extensions).forEach((token) => {
                    serverExtensions[token] = [extensions[token].params];
                });
                headers.push(`Sec-WebSocket-Extensions: ${adone.net.ws.exts.format(serverExtensions)}`);
            }

            // allows external modification/inspection of handshake headers
            this.emit("headers", headers);

            socket.setTimeout(0);
            socket.setNoDelay(true);

            try {
                socket.write(headers.concat("", "").join("\r\n"));
            } catch (e) {
                // if the upgrade write fails, shut the connection down hard
                try {
                    socket.destroy();
                } catch (e) { }
                return;
            }

            const client = new WebSocket([req, socket, upgradeHead], {
                protocolVersion: version,
                protocol,
                extensions,
                maxPayload: this.options.maxPayload
            });

            if (this.clients) {
                this.clients.add(client);
                client.on("close", () => this.clients.delete(client));
            }

            // signal upgrade complete
            socket.removeListener("error", errorHandler);
            cb(client);
        };

        // optionally call external protocol selection handler before
        // calling completeHybiUpgrade2
        const completeHybiUpgrade1 = () => {
            // choose from the sub-protocols
            if (this.options.handleProtocols) {
                const protList = (protocols || "").split(/, */);
                let callbackCalled = false;
                this.options.handleProtocols(protList, (result, protocol) => {
                    callbackCalled = true;
                    if (!result) return abortConnection(socket, 401);

                    completeHybiUpgrade2(protocol);
                });
                if (!callbackCalled) {
                    // the handleProtocols handler never called our callback
                    abortConnection(socket, 501, "Could not process protocols");
                }
            } else {
                completeHybiUpgrade2(protocols && protocols.split(/, */)[0]);
            }
        };

        // optionally call external client verification handler
        if (this.options.verifyClient) {
            const info = {
                secure: req.connection.authorized !== undefined || req.connection.encrypted !== undefined,
                origin,
                req
            };
            if (this.options.verifyClient.length === 2) {
                this.options.verifyClient(info, (result, code, message) => {
                    if (!result) return abortConnection(socket, code || 401, message);

                    completeHybiUpgrade1();
                });
                return;
            } else if (!this.options.verifyClient(info)) {
                return abortConnection(socket, 401);
            }
        }

        completeHybiUpgrade1();
    }
}