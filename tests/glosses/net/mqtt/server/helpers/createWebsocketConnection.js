
const Connection = require("mqtt-connection");
const ws = require("websocket-stream");

function createConnection(port) {
    const stream = ws(`ws://localhost:${port}`);
    const conn = new Connection(stream);
    stream.on("connect", () => {
        conn.emit("connected");
    });
    return conn;
}

module.exports = createConnection;
