const spdy = require("spdy-transport");

const Muxer = require("./muxer");
const SPDY_CODEC = require("./spdy-codec");

const {
    p2p: { stream: { pullStreamToStream: toStream } }
} = adone;

function create(rawConn, isListener) {
    const conn = toStream(rawConn);
    conn.on("end", () => conn.destroy());

    const spdyMuxer = spdy.connection.create(conn, {
        protocol: "spdy",
        isServer: isListener
    });

    return new Muxer(rawConn, spdyMuxer);
}

exports = module.exports = create;
exports.multicodec = SPDY_CODEC;
exports.dialer = (conn) => create(conn, false);
exports.listener = (conn) => create(conn, true);
