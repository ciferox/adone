const SECURE_CERT = `${__dirname}/../secure/tls-cert.pem`;
const fs = require("fs");
const ws = require("websocket-stream");
const Connection = require("mqtt-connection");

module.exports = function (port) {

    const stream = ws(`wss://localhost:${port}`, [], {
        ca: fs.readFileSync(SECURE_CERT),
        rejectUnauthorized: false
    });

    const conn = new Connection(stream);

    stream.on("connect", () => {
        conn.emit("connected");
    });

    return conn;
};
