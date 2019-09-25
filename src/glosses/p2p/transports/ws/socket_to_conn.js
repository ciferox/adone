const {
    p2p: { util: { abortableIterator, ipPortToMultiaddr } }
} = adone;

const { CLOSE_TIMEOUT } = require("./constants");

const log = require("debug")("libp2p:websockets:socket");

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
module.exports = (socket, options = {}) => {
    const maConn = {
        async sink(source) {
            if (options.signal) {
                source = abortableIterator(source, options.signal);
            }

            try {
                await socket.sink(source);
            } catch (err) {
                if (err.type !== "aborted") {
                    log(err);
                }
            }
        },

        source: options.signal ? abortableIterator(socket.source, options.signal) : socket.source,

        conn: socket,

        localAddr: undefined,

        // If the remote address was passed, use it - it may have the peer ID encapsulated
        remoteAddr: options.remoteAddr || ipPortToMultiaddr(socket.remoteAddress, socket.remotePort),

        timeline: { open: Date.now() },

        close() {
            return new Promise(async (resolve) => { // eslint-disable-line no-async-promise-executor
                const start = Date.now();

                // Attempt to end the socket. If it takes longer to close than the
                // timeout, destroy it manually.
                const timeout = setTimeout(() => {
                    const { host, port } = maConn.remoteAddr.toOptions();
                    log("timeout closing socket to %s:%s after %dms, destroying it manually",
                        host, port, Date.now() - start);

                    socket.destroy();
                    maConn.timeline.close = Date.now();
                    return resolve();
                }, CLOSE_TIMEOUT);

                await socket.close();

                clearTimeout(timeout);
                maConn.timeline.close = Date.now();

                resolve();
            });
        }
    };

    return maConn;
};
