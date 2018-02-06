const select = require("../select");

const {
    data: { varint },
    net: { p2p: { Connection } },
    util: { once },
    stream: { pull }
} = adone;

const stringify = (buf) => buf.toString().slice(0, -1);

const collectLs = (conn) => {
    const first = true;
    let counter = 0;

    return pull.take((msg) => {
        if (first) {
            varint.decode(msg);
            counter = varint.decode(msg, varint.decode.bytes);
            return true;
        }

        return counter-- > 0;
    });
};


export default class Dialer {
    constructor() {
        this.conn = null;
    }

    /**
     * Perform the multistream handshake.
     *
     * @param {Connection} rawConn - The connection on which to perform the handshake.
     * @param {function(Error)} callback - Called when the handshake completed.
     * @returns {undefined}
     */
    handle(rawConn, callback) {
        callback = once(callback);
        const s = select(adone.net.p2p.multistream.PROTOCOL_ID, (err, conn) => {
            if (err) {
                return callback(err);
            }

            this.conn = new Connection(conn, rawConn);

            callback();
        });

        pull(
            rawConn,
            s,
            rawConn
        );
    }

    /**
     * Select a protocol
     *
     * @param {string} protocol - A string of the protocol that we want to handshake.
     * @param {function(Error, Connection)} callback - `err` is
     * an error object that gets passed if something wrong happ
     * end (e.g: if the protocol selected is not supported by
     * the other end) and conn is the connection handshaked
     * with the other end.
     *
     * @returns {undefined}
     */
    select(protocol, callback) {
        callback = once(callback);
        if (!this.conn) {
            return callback(new Error("multistream handshake has not finalized yet"));
        }

        const s = select(protocol, (err, conn) => {
            if (err) {
                this.conn = new Connection(conn, this.conn);
                return callback(err);
            }
            callback(null, new Connection(conn, this.conn));
        });

        pull(
            this.conn,
            s,
            this.conn
        );
    }

    /**
     * List all available protocols.
     *
     * @param {function(Error, Array<string>)} callback - If
     * something wrong happend `Error` exists, otherwise
     * `protocols` is a list of the supported
     * protocols on the other end.
     *
     * @returns {undefined}
     */
    ls(callback) {
        callback = once(callback);

        const lsStream = select("ls", (err, conn) => {
            if (err) {
                return callback(err);
            }

            pull(
                conn,
                pull.lengthPrefixed.decode(),
                collectLs(conn),
                pull.map(stringify),
                pull.collect((err, list) => {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, list.slice(1));
                })
            );
        }, this.log);

        pull(
            this.conn,
            lsStream,
            this.conn
        );
    }
}
