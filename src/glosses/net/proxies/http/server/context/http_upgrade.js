import BaseContext from "./base";
import { LocalRequest, FakeHTTPResponse, RemoteResponse } from "./http";
import StreamContext from "./stream";
import WebSocketContext from "./websocket";

const {
    net: {
        proxy: {
            http: { tunnel }
        }
    }
} = adone;

export default class HTTPUpgradeContext extends BaseContext {
    constructor(parent, req, localSocket, head, processContext) {
        super("http.upgrade");

        this.parent = parent;
        this.localSocket = localSocket;

        this.remoteResponse = null;
        this._head = head;
        this.localRequest = new LocalRequest(this, req);
        this.processContext = processContext;
        this.__handleWebsocket = false;
        this._clientAddress = this.parent.clientAddress;
        this._clientPort = this.parent.clientAddress;
        this._proxy = null;
    }

    get proxy() {
        return this._proxy;
    }

    set proxy(value) {
        this._proxy = value;
    }

    get clientAddress() {
        return this._clientAddress;
    }

    set clientAddress(value) {
        this._clientAddress = value;
    }

    get clientPort() {
        return this._clientPort;
    }

    set clientPort(value) {
        return this._clientPort = value;
    }

    get handleWebsocket() {
        return this.__handleWebsocket;
    }

    set handleWebsocket(value) {
        this.__handleWebsocket = value;
    }

    get protocol() {
        return this.localRequest.headers.upgrade.toLowerCase();
    }

    async _handleWebsocket() {
        let finishUpgrade;
        const finishPromise = new Promise((resolve, reject) => {
            finishUpgrade = (err) => {
                err ? reject(err) : resolve(err);
            };
        });
        const context = new WebSocketContext(this, this.localRequest, async () => {
            // if this part fails then finish the upgrade and re-throw the error
            try {
                const { localSocket, localRequest } = this;
                const abortConnection = (code, message) => {
                    if (localSocket.writable) {
                        message = message || adone.std.http.STATUS_CODES[code];
                        localSocket.write([
                            `HTTP/1.1 ${code} ${adone.std.http.STATUS_CODES[code]}`,
                            "Connection: close",
                            "Content-type: text/html",
                            `Content-Length: ${Buffer.byteLength(message)}`,
                            "",
                            message
                        ].join("\r\n"));
                        this.response.status = code;
                        this.response.headers = {
                            connection: "close",
                            "content-type": "text/html",
                            "content-length": Buffer.byteLength(message)
                        };
                        this.response.body = message;
                    }
                    localSocket.destroy();
                    throw new Error("Aborted: ${code} ${message}");
                };
                if (!localRequest.headers["sec-websocket-key"]) {
                    abortConnection(400);
                }
                const version = Number(localRequest.headers["sec-websocket-version"]);
                if (version !== 8 && version !== 13) {
                    abortConnection(400);
                }
                const protocols = localRequest.headers["sec-websocket-protocol"];
                const protocol = protocols && protocols.split(/, */)[0];
                // const origin = version !== 13 ? request.headers["sec-websocket-origin"] : request.headers["origin"];
                const extensionsOffer = adone.net.ws.exts.parse(localRequest.headers["sec-websocket-extensions"]);
                const key = adone.std.crypto.createHash("sha1")
                    .update(`${localRequest.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, "binary")
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
                // per-message-deflate?
                localSocket.setTimeout(0);
                localSocket.setNoDelay(true);
                // what if write fails?
                localSocket.write(headers.concat("", "").join("\r\n"));
                finishUpgrade();
                this.remoteResponse = new FakeHTTPResponse(this);
                this.remoteResponse.status = 101;
                this.remoteResponse.headers = {
                    upgrade: "websocket",
                    connection: "Upgrade",
                    "sec-websocket-accept": key
                };
                if (protocol) {
                    this.remoteResponse.headers["sec-websocket-protocol"] = protocol;
                }
                const remote = await new Promise((resolve, reject) => {
                    const { host } = this.localRequest.headers;
                    const url = `${this.localRequest.secure ? "wss" : "ws"}://${host}${this.localRequest.url}`;
                    const options = {
                        perMessageDeflate: "permessage-deflate" in extensionsOffer
                    };
                    const { proxy } = this;
                    if (proxy) {
                        const tunnelOptions = {
                            proxy: {
                                host: proxy.host,
                                port: proxy.port,
                                headers: {
                                    host: `${this.localRequest.hostname}:${this.localRequest.port}`
                                }
                            },
                            protocol: this.localRequest.protocol,
                            method: this.localRequest.method,
                            headers: this.localRequest.headers,
                            rejectUnauthorized: false // ?
                        };
                        options.agent = tunnel[this.localRequest.protocol][proxy.protocol](tunnelOptions);
                    }
                    const socket = new adone.net.ws.WebSocket(url, options);
                    socket.on("error", reject);
                    socket.on("open", () => {
                        socket.removeListener("error", reject);
                        socket.pause();
                        resolve(socket);
                    });
                });
                const local = new adone.net.ws.WebSocket([localRequest.req, localSocket], {
                    protocolVersion: version,
                    protocol,
                    perMessageDeflate: "permessage-deflate" in extensionsOffer
                });
                local.pause();
                finishUpgrade();
                return [local, remote];
            } catch (err) {
                finishUpgrade(err);
                throw err;
            }
        });
        context.clientAddress = this.clientAddress;
        context.clientPort = this.clientPort;
        this.processContext(context);
        await finishPromise;
    }

    async _handleStreaming() {
        await new Promise((resolveUpgrade, rejectUpgrade) => {
            const context = new StreamContext(this, this.localSocket, async () => {
                // no hop-by-hop ?
                const options = {
                    host: this.localRequest.hostname,
                    port: this.localRequest.port,
                    path: this.localRequest.path,
                    method: this.localRequest.method,
                    headers: this.localRequest.headers,
                    rejectUnauthorized: false // optional?
                };
                const { proxy } = this;
                if (proxy) {
                    const tunnelOptions = {
                        proxy: {
                            host: proxy.host,
                            port: proxy.port,
                            headers: {
                                host: `${this.localRequest.hostname}:${this.localRequest.port}`
                            }
                        },
                        protocol: this.localRequest.protocol,
                        method: this.localRequest.method,
                        headers: this.localRequest.headers,
                        rejectUnauthorized: false // ?
                    };
                    options.agent = tunnel[this.localRequest.protocol][proxy.protocol](tunnelOptions);
                }
                const _module = this.localRequest.secure ? adone.std.https : adone.std.http;
                try {
                    const [res, socket] = await new Promise((resolve, reject) => {
                        _module.request(options)
                            .once("upgrade", (res, socket) => resolve([res, socket]))
                            .once("aborted", reject)
                            .once("error", reject)
                            .end(); // this._head?
                    });
                    this.remoteResponse = new RemoteResponse(this, res);
                    const { rawHeaders, statusCode, httpVersion } = res;
                    let headers = [];
                    for (let i = 0, n = rawHeaders.length; i < n; i += 2) {
                        headers.push(`${rawHeaders[i]}: ${rawHeaders[i + 1]}`);
                    }
                    headers = `${headers.join("\r\n")}\r\n\r\n`;
                    this.localSocket.write(`HTTP/${httpVersion} ${statusCode} ${adone.std.http.STATUS_CODES[statusCode]}\r\n${headers}`);
                    this.remoteResponse.body = "";
                    resolveUpgrade();
                    return socket;
                } catch (err) {
                    rejectUpgrade(err);
                    throw err;
                }
            }, this._head);
            context.localSocketTimeout = null;
            context.remoteSocketTimeout = null;
            context.clientAddress = this.clientAddress;
            context.clientPort = this.clientPort;
            this.processContext(context);
        });
    }

    async connect() {
        if (this.handleWebsocket && this.protocol === "websocket") {
            return this._handleWebsocket();
        }
        return this._handleStreaming();
    }
}
