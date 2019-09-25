const {
    is,
    multiformat: { mafmt, multiaddrToUri },
    p2p: { util: { abortableIterator: { AbortError } } },
    stream: { pull: { ws2: { connect } } }
} = adone;

const withIs = require("class-is");

const log = require("debug")("libp2p:websockets");
const assert = require("assert");

const createListener = require("./listener");
const toConnection = require("./socket_to_conn");
const { CODE_CIRCUIT, CODE_P2P } = require("./constants");

/**
 * @class WebSockets
 */
class WebSockets {
    /**
     * @constructor
     * @param {object} options
     * @param {Upgrader} options.upgrader
     */
    constructor({ upgrader }) {
        assert(upgrader, "An upgrader must be provided. See https://github.com/libp2p/interface-transport#upgrader.");
        this._upgrader = upgrader;
    }

    /**
     * @async
     * @param {Multiaddr} ma
     * @param {object} [options]
     * @param {AbortSignal} [options.signal] Used to abort dial requests
     * @returns {Connection} An upgraded Connection
     */
    async dial(ma, options = {}) {
        log("dialing %s", ma);

        const socket = await this._connect(ma, options);
        const maConn = toConnection(socket, { remoteAddr: ma, signal: options.signal });
        log("new outbound connection %s", maConn.remoteAddr);

        const conn = await this._upgrader.upgradeOutbound(maConn);
        log("outbound connection %s upgraded", maConn.remoteAddr);
        return conn;
    }

    /**
     * @private
     * @param {Multiaddr} ma
     * @param {object} [options]
     * @param {AbortSignal} [options.signal] Used to abort dial requests
     * @returns {Promise<Socket>} Resolves a TCP Socket
     */
    async _connect(ma, options = {}) {
        if (options.signal && options.signal.aborted) {
            throw new AbortError();
        }
        const cOpts = ma.toOptions();
        log("dialing %s:%s", cOpts.host, cOpts.port);

        const rawSocket = connect(multiaddrToUri(ma), Object.assign({ binary: true }, options));

        if (!options.signal) {
            await rawSocket.connected();

            log("connected %s", ma);
            return rawSocket;
        }

        // Allow abort via signal during connect
        let onAbort;
        const abort = new Promise((resolve, reject) => {
            onAbort = () => {
                reject(new AbortError());
                rawSocket.close();
            };

            // Already aborted?
            if (options.signal.aborted) {
                return onAbort();
            }
            options.signal.addEventListener("abort", onAbort);
        });

        try {
            await Promise.race([abort, rawSocket.connected()]);
        } finally {
            options.signal.removeEventListener("abort", onAbort);
        }

        log("connected %s", ma);
        return rawSocket;
    }

    /**
     * Creates a Websockets listener. The provided `handler` function will be called
     * anytime a new incoming Connection has been successfully upgraded via
     * `upgrader.upgradeInbound`.
     * @param {object} [options]
     * @param {http.Server} [options.server] A pre-created Node.js HTTP/S server.
     * @param {function (Connection)} handler
     * @returns {Listener} A Websockets listener
     */
    createListener(options = {}, handler) {
        if (is.function(options)) {
            handler = options;
            options = {};
        }

        return createListener({ handler, upgrader: this._upgrader }, options);
    }

    /**
     * Takes a list of `Multiaddr`s and returns only valid Websockets addresses
     * @param {Multiaddr[]} multiaddrs
     * @returns {Multiaddr[]} Valid Websockets multiaddrs
     */
    filter(multiaddrs) {
        multiaddrs = is.array(multiaddrs) ? multiaddrs : [multiaddrs];

        return multiaddrs.filter((ma) => {
            if (ma.protoNames().includes(CODE_CIRCUIT)) {
                return false;
            }

            return mafmt.WebSockets.matches(ma.decapsulateCode(CODE_P2P)) ||
                mafmt.WebSocketsSecure.matches(ma.decapsulateCode(CODE_P2P));
        });
    }
}

module.exports = withIs(WebSockets, {
    className: "WebSockets",
    symbolName: "@libp2p/js-libp2p-websockets/websockets"
});
