import BaseContext from "./base";

export default class StreamingContext extends BaseContext {
    constructor(parent, localSocket, getRemoteSocket, head = null) {
        super("stream");

        this.parent = parent;
        this.localSocket = localSocket;
        this.remoteSocket = null;
        this._head = head;
        this._getRemoteSocket = getRemoteSocket;

        // default sockets timeouts
        this._localSocketTimeout = 30000;
        this._remoteSocketTimeout = 30000;

        this._clientAddress = localSocket.remoteAddress;
        this._clientPort = localSocket.remotePort;
        this._localAddress = localSocket.localAddress;
        this._localPort = localSocket.localPort;
        this._remoteAddress = null;
        this._remotePort = null;
        this._incomingSinks = [];
        this._outgoingSinks = [];
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
        this._clientPort = value;
    }

    get localAddress() {
        return this._localAddress;
    }

    get localPort() {
        return this._localPort;
    }

    get remoteAddress() {
        return this._remoteAddress;
    }

    get remotePort() {
        return this._remotePort;
    }

    set localSocketTimeout(value) {
        this._localSocketTimeout = value;
    }

    get localSocketTimeout() {
        return this._localSocketTimeout;
    }

    set remoteSocketTimeout(value) {
        this._remoteSocketTimeout = value;
    }

    get remoteSocketTimeout() {
        return this._remoteSocketTimeout;
    }

    async connect() {
        this.remoteSocket = await this._getRemoteSocket();
        this._remoteAddress = this.remoteSocket.remoteAddress;
        this._remotePort = this.remoteSocket.remotePort;
        const remoteRes = new Promise((resolve) => {
            this.remoteSocket
                .once("error", (err) => {
                    this.localSocket.destroy();
                    resolve(err);
                })
                .once("finish", resolve);
        });
        const localRes = new Promise((resolve) => {
            this.localSocket
                .once("error", (err) => {
                    this.remoteSocket.destroy();
                    resolve(err);
                })
                .once("finish", resolve);
        });
        const done = Promise.all([localRes, remoteRes]);
        const { localSocketTimeout, remoteSocketTimeout } = this;
        if (localSocketTimeout) {
            this.localSocket
                .setTimeout(localSocketTimeout)
                .once("timeout", () => {
                    this.remoteSocket.end();
                });
        }
        if (remoteSocketTimeout) {
            this.remoteSocket
                .setTimeout(remoteSocketTimeout)
                .once("timeout", () => {
                    this.localSocket.end();
                });
        }
        if (this._head && this._head.length) {
            this.remoteSocket.write(this._head);
        }
        this.localSocket.pipe(this.remoteSocket).pipe(this.localSocket);
        for (const [sink, opts] of this._incomingSinks) {
            this.remoteSocket.pipe(sink, opts);
        }
        for (const [sink, opts] of this._outgoingSinks) {
            this.localSocket.pipe(sink, opts);
        }
        const [localSocketError, remoteSocketError] = await done;
        if (localSocketError) {
            throw localSocketError;
        }
        if (remoteSocketError) {
            throw remoteSocketError;
        }
    }

    saveIncoming(sink, opts = {}) {
        this._incomingSinks.push([sink, opts]);
    }

    saveOutgoing(sink, opts = {}) {
        this._outgoingSinks.push([sink, opts]);
    }
}
