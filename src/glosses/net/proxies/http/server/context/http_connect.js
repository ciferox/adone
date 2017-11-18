import BaseContext from "./base";
import HTTPContext, { LocalRequest } from "./http";
import StreamContext from "./stream";
import HTTPUpgradeContext from "./http_upgrade";

const {
    is,
    x
} = adone;

export default class HTTPConnectContext extends BaseContext {
    constructor(req, socket, head, processContext, https, getInternalPort) {
        super("http.connect");

        this.localRequest = new LocalRequest(this, req);
        this._head = head;
        this.localSocket = socket;
        this.remoteSocket = null;
        this.processContext = processContext;
        this._decryptHTTPS = false;
        this.__handleUpgrade = false;
        this.https = https;
        this.getInternalPort = getInternalPort;
        this._established = false;
        this._clientAddress = socket.remoteAddress;
        this._clientPort = socket.remotePort;
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

    get decryptHTTPS() {
        return this._decryptHTTPS;
    }

    set decryptHTTPS(value) {
        this._decryptHTTPS = value;
    }

    get handleUpgrade() {
        return this.__handleUpgrade;
    }

    set handleUpgrade(value) {
        this.__handleUpgrade = value;
    }

    sendEstablished() {
        if (this._established) {
            return;
        }
        this._established = true;
        this.localSocket.write(`HTTP/${this.localRequest.httpVersion} 200 OK\r\n\r\n`);
    }

    _handleStreaming() {
        return new Promise((resolveConnect, rejectConnect) => {
            const context = new StreamContext(this, this.localSocket, async () => {
                const { proxy } = this;
                let remoteSocket;
                if (proxy) {
                    remoteSocket = await new Promise((resolve, reject) => {
                        adone.std.http.request({
                            host: proxy.host,
                            port: proxy.port,
                            method: "CONNECT",
                            path: this.localRequest.url
                        })
                            .once("connect", (res, socket) => {
                                if (res.statusCode !== 200) {
                                    reject(new x.IllegalState(`Cannot establish a connection with the proxy, statusCode = ${res.statusCode}`));
                                } else {
                                    resolve(socket);
                                }
                            })
                            .once("aborted", reject)
                            .end();
                    }).then((socket) => {
                        resolveConnect();
                        return socket;
                    }, (err) => {
                        rejectConnect(err);
                        return Promise.reject(err);
                    });
                } else {
                    const [host, port] = this.localRequest.url.split(":");
                    remoteSocket = adone.std.net.connect(port, host);
                    await new Promise((resolve, reject) => {
                        remoteSocket
                            .on("connect", resolve)
                            .on("error", reject);
                    }).then(resolveConnect, (err) => {
                        rejectConnect(err);
                        return Promise.reject(err);
                    });
                }
                await this.sendEstablished();
                return remoteSocket;
            }, this._head);
            context.clientAddress = this.clientAddress;
            context.clientPort = this.clientPort;
            this.processContext(context);
        });
    }

    async _handleHTTPS() {
        const { key, cert } = await this.https.getInternalCert();
        const intercepter = new adone.std.https.Server({
            key,
            cert,
            SNICallback: (serverName, callback) => {
                this.https.getCertificate(serverName)
                    .then(({ key, cert }) => {
                        return adone.std.tls.createSecureContext({ key, cert });
                    }).then((ctx) => {
                        callback(null, ctx);
                    }, callback);
            }
        });
        const internalPort = await this.getInternalPort("https");
        await new Promise((resolve, reject) => {
            intercepter.listen(internalPort, () => {
                intercepter.removeListener("error", reject);
                resolve();
            }).once("error", reject);
        });
        await new Promise((resolve, reject) => {
            const requestHandler = (request, response) => {
                intercepter.removeListener("clientError", reject);
                intercepter.removeListener("error", reject);
                const context = new HTTPContext(request, response, this);
                context.clientAddress = this.clientAddress;
                context.clientPort = this.clientPort;
                resolve(); // it calls multiple times, does it matter?
                this.processContext(context);
            };

            intercepter
                .on("request", requestHandler)
                .on("clientError", reject);
            if (this.handleUpgrade) {
                intercepter.on("upgrade", (request, socket, head) => {
                    const context = new HTTPUpgradeContext(this, request, socket, head, this.processContext);
                    context.clientAddress = this.clientAddress;
                    context.clientPort = this.clientPort;
                    resolve(); // it calls multiple times, does it matter?
                    this.processContext(context);
                });
            }
            let port = intercepter.address();
            if (is.object(port)) {
                port = port.port;
            }
            const internalSocket = adone.std.net.connect(port, () => {
                this.sendEstablished();
                internalSocket.pipe(this.localSocket).pipe(internalSocket);
            });
            internalSocket.once("error", () => {
                internalSocket.destroy();
                this.localSocket.destroy();
            });
            this.localSocket.once("error", () => {
                internalSocket.destroy();
                this.localSocket.destroy();
            });
            internalSocket.on("close", () => {
                intercepter.close();
            });
        });
    }

    async _handleUpgrade() {
        const intercepter = new adone.std.http.Server();
        const internalAddress = await this.getInternalPort("upgrade");
        await new Promise((resolve, reject) => {
            intercepter.listen(internalAddress, () => {
                intercepter.removeListener("error", reject);
                resolve();
            }).once("error", reject);
        });
        let port = intercepter.address();
        if (is.object(port)) {
            port = port.port;
        }
        await new Promise((resolve, reject) => {
            intercepter.once("upgrade", (request, socket, head) => {
                intercepter.removeListener("clientError", reject);
                const context = new HTTPUpgradeContext(this, request, socket, head, this.processContext);
                context.clientAddress = this.clientAddress;
                context.clientPort = this.clientPort;
                resolve();
                this.processContext(context);
            }).once("clientError", reject);
            //
            const internalSocket = adone.std.net.connect(port, () => {
                internalSocket.pipe(this.localSocket).pipe(internalSocket);
            });
            internalSocket.once("error", () => {
                internalSocket.destroy();
                this.localSocket.destroy();
            });
            this.localSocket.once("error", () => {
                internalSocket.destroy();
                this.localSocket.destroy();
            });
            internalSocket.on("close", () => {
                intercepter.close();
            });
        });
    }

    async connect() {
        if (!this.decryptHTTPS && !this.handleUpgrade) {
            return this._handleStreaming();
        }
        if (this.handleUpgrade) {
            // read the first chunk to understand if it is an update request
            const chunk = await new Promise((resolve, reject) => {
                this.sendEstablished(); // we will never receive the first chunk without this
                this.localSocket.once("data", (chunk) => {
                    this.localSocket.pause();
                    this.localSocket.removeListener("error", reject);
                    resolve(chunk);
                }).once("error", reject);
            });
            this.localSocket.unshift(chunk);

            if (/upgrade\s*:/i.test(chunk.toString())) {
                return this._handleUpgrade();
            }
        }
        if (this.decryptHTTPS) {
            return this._handleHTTPS();
        }
        return this._handleStreaming();
    }
}
