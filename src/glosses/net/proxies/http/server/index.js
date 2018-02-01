const {
    is,
    exception
} = adone;

import HTTPContext from "./context/http";
import HTTPConnectContext from "./context/http_connect";

export default class Server {
    constructor({ https = null, getInternalPort = () => 0 } = {}) {
        this.server = new adone.std.http.Server();
        this.middlewares = [];
        this.sockets = [];
        const composed = adone.net.http.server.helper.compose(this.middlewares);
        const processContext = (context) => composed(context);
        this.authenticate = adone.truly;

        this.server
            .on("request", async (req, res) => {
                const authenticated = await this.authenticate(req, "request");
                if (!authenticated) {
                    res.writeHead(407);
                    res.end();
                    return;
                }
                processContext(new HTTPContext(req, res));
            })
            .on("connect", async (req, socket, head) => {
                const authenticated = await this.authenticate(req, "connect");
                if (!authenticated) {
                    socket.destroy();
                    return;
                }
                processContext(new HTTPConnectContext(req, socket, head, processContext, https, getInternalPort));
            })
            .on("connection", (socket) => {
                this._addSocket(socket);
                socket.on("error", (/*err*/) => {
                    this._removeSocket(socket);
                }).on("close", () => {
                    this._removeSocket(socket);
                });
            });
    }

    _addSocket(socket) {
        this.sockets.push(socket);
    }

    _removeSocket(socket) {
        const i = this.sockets.indexOf(socket);
        if (i > -1) {
            this.sockets.splice(i, 1);
        }
    }

    authenticate() {

    }

    use(middleware) {
        if (!is.function(middleware)) {
            throw new exception.InvalidArgument("middleware must be a function");
        }
        this.middlewares.push(middleware);
        return this;
    }

    async bind(options = {}) {
        const port = is.number(options.port) ? options.port : (is.string(options.port) ? options.port : 0);
        const host = options.host;
        let backlog;
        if (is.number(options.backlog)) {
            backlog = options.backlog;
        } else {
            backlog = 511;
        }
        return new Promise((resolve, reject) => {
            this.server.once("error", reject);
            this.server.listen(port, host, backlog, () => {
                this.server.removeListener("error", reject);
                resolve(this);
            });
        });
    }

    async unbind() {
        if (!is.null(this.server)) {
            // Force close all active connections
            for (const socket of this.sockets) {
                socket.end();
                socket.destroy();
            }

            await new Promise((resolve) => {
                this.server.close(resolve);
            });

            this.server = null;
            this.secure = null;
        }
    }

    address() {
        return this.server.address();
    }

    async close() {
        await new Promise((resolve) => {
            this.server.close(resolve);
        });
    }
}
