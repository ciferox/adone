import handshake from "./handshake";
import State from "./state";

const {
    assert,
    is,
    net: { p2p: { Connection, PeerInfo } },
    stream: { pull },
    util: { once }
} = adone;

export const tag = "/secio/1.0.0";

export const encrypt = function (localId, conn, remoteId, callback) {
    assert(localId, "no local private key provided");
    assert(conn, "no connection for the handshake  provided");

    if (is.function(remoteId)) {
        callback = remoteId;
        remoteId = undefined;
    }

    callback = once(callback || ((err) => {
        if (err) {
            // adone.logError(err);
        }
    }));

    const timeout = 60 * 1000 * 5;

    const state = new State(localId, remoteId, timeout, callback);

    const encryptedConnection = new Connection(undefined, conn);

    const finish = async (err) => {
        if (err) {
            return callback(err);
        }

        encryptedConnection.setInnerConn(new Connection(state.secure, conn));
        try {
            await conn.getPeerInfo();
        } catch (err) {
            // no peerInfo yet, means I'm the receiver
            encryptedConnection.setPeerInfo(new PeerInfo(state.id.remote));
        }

        callback();
    };

    pull(
        conn,
        handshake(state, finish),
        conn
    );

    return encryptedConnection;
};

adone.lazify({
    support: "./support"
}, exports, require);

adone.lazifyPrivate({
    State: "./state",
    handshake: "./handshake"
}, exports, require);
