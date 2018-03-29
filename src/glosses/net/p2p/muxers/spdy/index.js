const {
    net: { spdy },
    stream: { pull }
} = adone;

const Muxer = require("./muxer");
const SPDY_CODEC = "/spdy/3.1.0";

const create = function (rawConn, isServer) {
    const conn = pull.toStream(rawConn);
    // Let it flow, let it flooow
    // conn.resume(); // cause a bug with spdy

    conn.on("end", () => {
        // Cleanup and destroy the connection when it ends
        // as the converted stream doesn't emit 'close'
        // but .destroy will trigger a 'close' event.
        conn.destroy();
    });

    const spdyMuxer = spdy.Connection.create(conn, {
        protocol: "spdy",
        isServer
    });

    const muxer = new Muxer(rawConn, spdyMuxer);
    // Avoid uncaught errors cause by unstable connections
    muxer.on("error", adone.noop);

    return muxer;
};

exports = module.exports = create;
exports.multicodec = SPDY_CODEC;
exports.dialer = (conn) => create(conn, false);
exports.listener = (conn) => create(conn, true);
