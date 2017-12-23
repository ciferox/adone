const {
    is,
    stream: { pull }
} = adone;

class State {
    constructor(id, key, timeout, cb) {
        if (is.function(timeout)) {
            cb = timeout;
            timeout = undefined;
        }

        this.setup();
        this.id.local = id;
        this.key.local = key;
        this.timeout = timeout || 60 * 1000;
        cb = cb || (() => { });

        this.secure = pull.defer.duplex();
        this.stream = pull.handshake({ timeout: this.timeout }, cb);
        this.shake = this.stream.handshake;
        delete this.stream.handshake;
    }

    setup() {
        this.id = {
            local: null,
            remote: null
        };

        this.key = {
            local: null,
            remote: null
        };

        this.shake = null;

        this.cleanSecrets();
    }

    // remove all data from the handshake that is not needed anymore
    cleanSecrets() {
        this.shared = {};

        this.ephemeralKey = {
            local: null,
            remote: null
        };

        this.proposal = {
            in: null,
            out: null
        };

        this.proposalEncoded = {
            in: null,
            out: null
        };

        this.protocols = {
            local: null,
            remote: null
        };

        this.exchange = {
            in: null,
            out: null
        };
    }
}

module.exports = State;
