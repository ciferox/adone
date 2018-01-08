const debug = require("debug");
const log = debug("libp2p:secio");
log.error = debug("libp2p:secio:error");

const handshake = require("./handshake");
const State = require("./state");

const {
    assert,
    is,
    netron2: { Connection, PeerInfo },
    stream: { pull },
    util: { once }
} = adone;

module.exports = {
    tag: "/secio/1.0.0",
    encrypt(localId, conn, remoteId, callback) {
        assert(localId, "no local private key provided");
        assert(conn, "no connection for the handshake  provided");

        if (is.function(remoteId)) {
            callback = remoteId;
            remoteId = undefined;
        }

        callback = once(callback || ((err) => {
            if (err) {
                log.error(err);
            }
        }));

        const timeout = 60 * 1000 * 5;

        const state = new State(localId, remoteId, timeout, callback);

        const encryptedConnection = new Connection(undefined, conn);

        const finish = function (err) {
            if (err) {
                return callback(err);
            }

            conn.getPeerInfo((err, peerInfo) => {
                encryptedConnection.setInnerConn(state.secure);

                if (err) { // no peerInfo yet, means I'm the receiver
                    encryptedConnection.setPeerInfo(new PeerInfo(state.id.remote));
                }

                callback();
            });
        };

        pull(
            conn,
            handshake(state, finish),
            conn
        );

        return encryptedConnection;
    },
    support: require("./support")
};