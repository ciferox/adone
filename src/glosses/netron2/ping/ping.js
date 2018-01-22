const constants = require("./constants");

const {
    stream: { pull },
    event,
    std
} = adone;

const PROTOCOL = constants.PROTOCOL;
const PING_LENGTH = constants.PING_LENGTH;

const rnd = (length) => {
    if (!length) {
        length = constants.PING_LENGTH;
    }
    return std.crypto.randomBytes(length);
};


class Ping extends event.Emitter {
    constructor(swarm, peer) {
        super();

        this._stop = false;
        this._shake;
        const self = this;

        adone.log("dialing %s to %s", PROTOCOL, peer.id.asBase58());

        swarm.dial(peer, PROTOCOL, (err, conn) => {
            if (err) {
                return this.emit("error", err);
            }

            const stream = pull.handshake({ timeout: 0 });
            this._shake = stream.handshake;

            pull(
                stream,
                conn,
                stream
            );

            // write and wait to see ping back
            const next = () => {
                const start = new Date();
                const buf = rnd(PING_LENGTH);
                this._shake.write(buf);
                this._shake.read(PING_LENGTH, (err, bufBack) => {
                    const end = new Date();
                    if (err || !buf.equals(bufBack)) {
                        const err = new Error("Received wrong ping ack");
                        return self.emit("error", err);
                    }

                    self.emit("ping", end - start);

                    if (this._stop) {
                        return;
                    }
                    next();
                });
            };

            next();
        });
    }

    stop() {
        if (this._stop || !this._shake) {
            return;
        }

        this._stop = true;

        pull(
            pull.empty(),
            this._shake.rest()
        );
    }
}

module.exports = Ping;
