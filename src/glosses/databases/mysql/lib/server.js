import adone from "../../..";
import Connection from "./connection";

const { std: { net }, EventEmitter } = adone;

var ConnectionConfig = require("./connection_config");

// TODO: inherit Server from net.Server
export default class Server extends EventEmitter {
    constructor() {
        super();
        this.connections = [];
        this._server = net.createServer(this._handleConnection.bind(this));
    }

    _handleConnection(socket) {
        var connectionConfig = new ConnectionConfig({stream: socket, isServer: true});
        var connection = new Connection({config: connectionConfig});
        this.emit("connection", connection);
    }

    listen(port) {
        this._port = port;
        this._server.listen.apply(this._server, arguments);
        return this;
    }

    close(cb) {
        this._server.close(cb);
    }
}