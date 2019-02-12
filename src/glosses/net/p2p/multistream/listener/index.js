import select from "../select";
import selectHandler from "./select_handler";
import lsHandler from "./ls_handler";
import matchExact from "./match_exact";

const {
    is,
    net: { p2p: { Connection } },
    stream: { pull }
} = adone;

export default class Listener {
    /**
     * Create a new Listener.
     */
    constructor() {
        this.handlers = {
            ls: {
                handlerFunc: (protocol, conn) => lsHandler(this, conn),
                matchFunc: matchExact

            }
        };
    }

    /**
     * Perform the multistream handshake.
     *
     * @param {Connection} rawConn - The connection on which
     * to perform the handshake.
     * @param {function(Error)} callback - Called when the handshake completed.
     * @returns {undefined}
     */
    handle(rawConn, callback) {
        const selectStream = select(adone.net.p2p.multistream.PROTOCOL_ID, (err, conn) => {
            if (err) {
                return callback(err);
            }

            const shConn = new Connection(conn, rawConn);

            const sh = selectHandler(shConn, this.handlers);

            pull(
                shConn,
                sh,
                shConn
            );

            callback();
        });

        pull(
            rawConn,
            selectStream,
            rawConn
        );
    }

    /**
     * Handle a given `protocol`.
     *
     * @param {string} protocol - A string identifying the protocol.
     * @param {function(string, Connection)} handlerFunc - Will be called if there is a handshake performed on `protocol`.
     * @param {matchHandler} [matchFunc=matchExact]
     * @returns {undefined}
     */
    addHandler(protocol, handlerFunc, matchFunc) {
        if (!is.function(handlerFunc)) {
            throw new adone.error.InvalidArgumentException("Handler must be a function");
        }

        // if (this.handlers[protocol]) {
        //     this.log(`overwriting handler for ${protocol}`);
        // }

        if (!matchFunc) {
            matchFunc = matchExact;
        }

        this.handlers[protocol] = {
            handlerFunc,
            matchFunc
        };
    }

    /**
     * Receives a protocol and a callback and should
     * call `callback(err, result)` where `err` is if
     * there was a error on the matching function, and
     * `result` is a boolean that represents if a
     * match happened.
     *
     * @callback matchHandler
     * @param {string} myProtocol
     * @param {string} senderProtocol
     * @param {function(Error, boolean)} callback
     * @returns {undefined}
     */
}
