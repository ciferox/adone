const {
    is,
    stream: { pull }
} = adone;

export default class State {
    constructor(localId, remoteId, timeout, callback) {
        if (is.function(timeout)) {
            callback = timeout;
            timeout = undefined;
        }

        this.setup();

        this.id.local = localId;
        // TODO use remoteId to verify PeersIdentity
        this.id.remote = remoteId;
        this.key.local = localId.privKey;
        this.timeout = timeout || 60 * 1000;
        callback = callback || (() => { });

        this.secure = pull.defer.duplex();
        this.stream = pull.handshake({ timeout: this.timeout }, callback);
        this.shake = this.stream.handshake;
        delete this.stream.handshake;
    }

    setup() {
        this.id = { local: null, remote: null };
        this.key = { local: null, remote: null };
        this.shake = null;
        this.cleanSecrets();
    }

    // remove all data from the handshake that is not needed anymore
    cleanSecrets() {
        this.shared = {};

        this.ephemeralKey = { local: null, remote: null };
        this.proposal = { in: null, out: null };
        this.proposalEncoded = { in: null, out: null };
        this.protocols = { local: null, remote: null };
        this.exchange = { in: null, out: null };
    }
}
