const { EventEmitter, std: { net }, database: { mysql } } = adone;

// TODO: inherit Server from net.Server
export default class Server extends EventEmitter {
    constructor() {
        super();
        this.connections = [];
        this._server = net.createServer(this._handleConnection.bind(this));
    }

    _handleConnection(socket) {
        const connectionConfig = new mysql.__.ConnectionConfig({ stream: socket, isServer: true });
        const connection = new mysql.Connection({ config: connectionConfig });
        this.emit("connection", connection);
    }

    listen(port, ...args) {
        this._port = port;
        this._server.listen(port, ...args);
        return this;
    }

    close(cb) {
        this._server.close(cb);
    }

    address() {
        return this._server.address();
    }
}
