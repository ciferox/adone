export default function enableDestroy(server) {
    const connections = {};

    server.on("connection", (conn) => {
        const key = `${conn.remoteAddress}:${conn.remotePort}`;
        connections[key] = conn;
        conn.on("close", () => {
            delete connections[key];
        });
    });

    server.destroy = function (cb) {
        server.close(cb);
        for (const key in connections) {
            connections[key].destroy();
        }
    };
}
