const Connection = require("mqtt-connection");

function createConnection(port) {
    const stream = adone.std.net.createConnection(port);
    const conn = new Connection(stream);
    stream.on("connect", () => {
        conn.emit("connected");
    });
    return conn;
}

module.exports = createConnection;
