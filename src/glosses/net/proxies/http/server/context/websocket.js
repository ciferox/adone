import BaseContext from "./base";

export default class WSSessionContext extends BaseContext {
    constructor(parent, localRequest, getSockets) {
        super("websocket");

        this.parent = parent;
        this.localRequest = localRequest;
        this.getSockets = getSockets;

        this.local = null;
        this.remote = null;

        this.incomingTransforms = [(context, next) => {
            const { data, flags } = context;
            context.data = flags.binary ? Buffer.from(data) : data;
            context.flags = {
                mask: flags.masked,
                binary: flags.binary
            };
            if ("fin" in flags) {
                context.flags.fin = flags.fin;
            }
            return next();
        }, ({ data, flags }) => {
            // send the message to the local socket
            return new Promise((resolve, reject) => {
                this.local.send(data, flags, (err) => {
                    err ? reject(err) : resolve();
                });
            });
        }];
        this.outgoingTransforms = [(context, next) => {
            const { data, flags } = context;
            context.data = flags.binary ? Buffer.from(data) : data;
            context.flags = {
                mask: flags.masked,
                binary: flags.binary
            };
            if ("fin" in flags) {
                context.flags.fin = flags.fin;
            }
            return next();
        }, ({ data, flags }) => {
            return new Promise((resolve, reject) => {
                this.remote.send(data, flags, (err) => {
                    err ? reject(err) : resolve();
                });
            });
        }];

        this._incomingComposed = adone.net.http.server.helper.compose(this.incomingTransforms);
        this._incoming = (data, flags) => {
            this._incomingComposed({ data, flags }).catch(adone.noop);
        };

        this._outgoingComposed = adone.net.http.server.helper.compose(this.outgoingTransforms);
        this._outgoing = (data, flags) => {
            this._outgoingComposed({ data, flags }).catch(adone.noop); // swallow all the errors
        };

        this.localCloseCode = null;
        this.remoteCloseCode = null;
        this._clientAddress = null;
        this._clientPort = null;
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

    incoming(callback) {
        const a = this.incomingTransforms;
        a.push(callback);
        const l = a.length;
        [a[l - 1], a[l - 2]] = [a[l - 2], a[l - 1]]; // keep the sending mw at the end
        return this;
    }

    outgoing(callback) {
        const a = this.outgoingTransforms;
        a.push(callback);
        const l = a.length;
        [a[l - 1], a[l - 2]] = [a[l - 2], a[l - 1]]; // keep the sending mw at the end
        return this;
    }

    async connect() {
        const [local, remote] = await this.getSockets();
        this.local = local;
        this.remote = remote;
        remote.on("message", this._incoming);
        local.on("message", this._outgoing);

        remote.on("close", () => {
            local.close();
        });
        local.on("close", () => {
            remote.close();
        });
        let remoteRes = new Promise((resolve) => {
            remote
                .on("close", resolve)
                .on("error", (err) => {
                    err.message = `Local: ${err.message}`;
                    resolve(err);
                });
        });
        let localRes = new Promise((resolve) => {
            local
                .on("close", resolve)
                .on("error", (err) => {
                    err.message = `Remote: ${err.message}`;
                    resolve(err);
                });
        });
        local.resume();
        remote.resume();
        [localRes, remoteRes] = await Promise.all([localRes, remoteRes]);
        if (!adone.is.number(localRes)) {
            remote.close();
            throw localRes;
        } else {
            this.localCloseCode = localRes;
        }

        if (!adone.is.number(remoteRes)) {
            local.close();
            throw remoteRes;
        } else {
            this.remoteCloseCode = remoteRes;
        }
    }
}
