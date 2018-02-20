const {
    stream: { pull },
    event,
    std
} = adone;

const PROTOCOL = "/ipfs/ping/1.0.0";
const PING_LENGTH = 32;

const rnd = (length) => {
    if (!length) {
        length = PING_LENGTH;
    }
    return std.crypto.randomBytes(length);
};

export default class Ping extends event.Emitter {
    constructor(sw, peer) {
        super();

        this._stop = false;
        this._shake;
        const self = this;

        sw.connect(peer, PROTOCOL).catch((err) => this.emit("error", err)).then((conn) => {
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

    static mount(sw) {
        sw.handle(PROTOCOL, (protocol, conn) => {
            const stream = pull.handshake({ timeout: 0 });
            const shake = stream.handshake;

            // receive and echo back
            const next = () => {
                shake.read(PING_LENGTH, (err, buf) => {
                    if (err === true) {
                        // stream closed
                        return;
                    }
                    if (err) {
                        return adone.logError(err);
                    }

                    shake.write(buf);
                    return next();
                });
            };

            pull(
                conn,
                stream,
                conn
            );

            next();
        });
    }

    static unmount(sw) {
        sw.unhandle(PROTOCOL);
    }
}
