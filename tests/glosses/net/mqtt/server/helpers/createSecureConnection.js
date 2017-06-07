const SECURE_CERT = `${__dirname}/../secure/tls-cert.pem`;
const fs = require("fs");
const tls = require("tls");
const Connection = require("mqtt-connection");

module.exports = function (port, host, callback) {
    let netClient;
    const tlsOpts = {};
    if (typeof port === "undefined") {
        // createConnection();
        port = defaultPort;
        host = defaultHost;
        callback = function () { };
    } else if (typeof port === "function") {
        // createConnection(function(){});
        callback = port;
        port = defaultPort;
        host = defaultHost;
    } else if (typeof host === "function") {
        // createConnection(1883, function(){});
        callback = host;
        host = defaultHost;
    } else if (typeof callback !== "function") {
        // createConnection(1883, 'localhost');
        callback = function () { };
    }

    tlsOpts.rejectUnauthorized = false;
    tlsOpts.cert = fs.readFileSync(SECURE_CERT);

    netClient = tls.connect(port, host, tlsOpts, () => {
        if (process.env.NODE_DEBUG) {
            if (tls_client.authorized) {
                console.log("Connection authorized by a Certificate Authority.");
            } else {
                console.log(`Connection not authorized: ${tls_client.authorizationError}`);
            }
        }
    });

    const mqttConn = new Connection(netClient);

    netClient.on("close", mqttConn.emit.bind(mqttConn, "close"));

    netClient.on("secureConnect", () => {
        mqttConn.emit("connected");
    });

    mqttConn.once("connected", () => {
        callback(null, mqttConn);
    });

    return mqttConn;
};
